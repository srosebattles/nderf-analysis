// Runs one coding pass over a list of accounts, one fresh Claude Code call per account
// (claude-code.ts), and keeps everything the run produced in the private data repository:
//
//   <data>/llm-raw/<runId>/run.json                   what was run: pass, model, effort, hashes
//   <data>/llm-raw/<runId>/<accountId>.<n>.json       each attempt's full result (contains quotes)
//   <data>/llm-raw/<runId>/log.jsonl                  one line per account: outcome, tokens, time,
//                                                     and the Claude Code version that coded it
//
// An answer is validated with the pass's zod schema, cross-field rules included. One that fails
// is retried once, in a fresh call, with the problems listed. If the retry's only remaining
// problem is copied text over the cap, each such copy is cut to its first MAX_COPIED_WORDS words
// and the record is kept, with the cut fields listed in its log line (`truncated`). Otherwise a
// second failure is logged and nothing is kept as coded. A run is resumable: accounts already in
// the log are skipped. A call that fails outright (a usage limit, a network error) stops the run
// without logging the account, so resuming codes it again.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { z } from 'zod';
import type { ScrapedAccount } from '../derive/input.ts';
import { MAX_COPIED_WORDS } from '../schema/codebook-schema.ts';
import { type ClaudeCodeCall, type ClaudeCodeResult, runClaudeCode } from './claude-code.ts';
import { neutralKey, renderForCoder, restoreAccountId } from './coder-input.ts';

export interface PassDefinition<T = unknown> {
  id: string;
  version: string;
  /** The coder's instructions, the same for every account so that they are cached from one call
   *  to the next. The account's neutral key opens the account text. */
  systemPrompt: string;
  /** Validates the answer, cross-field rules included. */
  schema: z.ZodType<T>;
  /** What the model is constrained to: the schema's shape and allowed values. */
  jsonSchema: object;
  /** What an earlier pass found, added after the account text (pass B gets pass A's episodes).
   *  It must use the neutral key, never the account ID. */
  context?: (account: ScrapedAccount, key: string) => string;
  /** Where that context comes from (an earlier run's ID), recorded in the manifest so a resumed
   *  run can't change it. */
  inputs?: Record<string, string>;
  /** Turns the coder's answer (with the account ID put back) into the form the schema checks,
   *  such as quotes into offsets, and lists problems the coder should fix on a retry. */
  prepare?: (answer: unknown, account: ScrapedAccount) => { value: unknown; problems: string[] };
}

export interface RunOptions {
  dataDir: string;
  runId: string;
  model: string;
  effort: ClaudeCodeCall['effort'];
  /** How many calls at once. Subscription limits make one or two the sensible range. */
  concurrency?: number;
  executable?: string;
  /** Called once per account with what happened. */
  onAccount?: (line: LogLine) => void;
}

export interface LogLine {
  accountId: string;
  key: string;
  /** Claude Code's version for this account's calls (`claude --version`). */
  claudeCodeVersion: string;
  ok: boolean;
  /** Fields whose copied text the pipeline cut to the cap on the retry, as paths into the record. */
  truncated: string[];
  attempts: number;
  problem: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  thinkingTokens: number;
  listCostUsd: number;
  durationMs: number;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** The run stopped because a call failed outright; resuming picks up where it stopped. */
export class RunStopped extends Error {}
const CALL_FAILED = /^(call failed|no output|exited with an error|output is not JSON)/;

const OVER_CAP = `copied text must be at most ${MAX_COPIED_WORDS} words`;

/** Cuts the copied text at each path to its first MAX_COPIED_WORDS words, in a copy of the value. */
export function cutCopies(value: unknown, paths: (string | number)[][]): unknown {
  const copy = structuredClone(value);
  for (const path of paths) {
    let node = copy as Record<string | number, unknown>;
    for (const key of path.slice(0, -1)) node = node[key] as Record<string | number, unknown>;
    const last = path[path.length - 1];
    const text = node[last];
    if (typeof text === 'string') node[last] = text.trim().split(/\s+/).slice(0, MAX_COPIED_WORDS).join(' ');
  }
  return copy;
}

/** The problems a zod error lists, one per line, for the retry. */
const listIssues = (error: z.ZodError) => error.issues.slice(0, 40).map((i) => `- ${i.path.join('.') || '(top level)'}: ${i.message}`).join('\n');

export async function runPass(pass: PassDefinition, accounts: readonly ScrapedAccount[], opts: RunOptions): Promise<LogLine[]> {
  const dir = join(opts.dataDir, 'llm-raw', opts.runId);
  mkdirSync(dir, { recursive: true });
  // Claude Code's version isn't controlled (a cloud session gets whatever its image has), so it
  // is recorded instead: on every log line, and in the manifest as each version a run has seen.
  // What decides the coding (prompt, schema, model, effort) can't change partway.
  const claudeCodeVersion = execFileSync(opts.executable ?? 'claude', ['--version'], { encoding: 'utf8' }).trim();
  const manifest = {
    runId: opts.runId, pass: pass.id, passVersion: pass.version, model: opts.model, effort: opts.effort,
    systemPromptSha256: sha256(pass.systemPrompt), jsonSchemaSha256: sha256(JSON.stringify(pass.jsonSchema)),
    inputs: pass.inputs ?? {},
    accounts: accounts.map((a) => a.id),
  };
  const manifestFile = join(dir, 'run.json');
  if (existsSync(manifestFile)) {
    const held = JSON.parse(readFileSync(manifestFile, 'utf8'));
    for (const k of ['pass', 'passVersion', 'model', 'effort', 'systemPromptSha256', 'jsonSchemaSha256'] as const) {
      if (held[k] !== manifest[k]) throw new Error(`run ${opts.runId} was started with a different ${k}; start a new run`);
    }
    if (JSON.stringify(held.inputs ?? {}) !== JSON.stringify(manifest.inputs)) {
      throw new Error(`run ${opts.runId} was started with different inputs; start a new run`);
    }
    const seen: string[] = held.claudeCodeVersions ?? [];
    if (!seen.includes(claudeCodeVersion)) {
      writeFileSync(manifestFile, JSON.stringify({ ...held, claudeCodeVersions: [...seen, claudeCodeVersion] }, null, 2) + '\n');
    }
  } else {
    writeFileSync(manifestFile, JSON.stringify({ ...manifest, claudeCodeVersions: [claudeCodeVersion], started: new Date().toISOString() }, null, 2) + '\n');
  }
  const logFile = join(dir, 'log.jsonl');
  const done = new Set(existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as LogLine).accountId) : []);

  const codeOne = async (account: ScrapedAccount, position: number): Promise<LogLine> => {
    const { key, text: accountText } = renderForCoder(account, neutralKey(position));
    const text = pass.context ? `${accountText}\n${pass.context(account, key)}` : accountText;
    const total = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, thinkingTokens: 0, listCostUsd: 0, durationMs: 0 };
    let userText = text;
    let problem: string | null = null;
    let attempts = 0;
    let ok = false;
    let truncated: string[] = [];
    while (attempts < 2 && !ok) {
      attempts += 1;
      const result: ClaudeCodeResult = await runClaudeCode({ model: opts.model, effort: opts.effort, systemPrompt: pass.systemPrompt, jsonSchema: pass.jsonSchema, userText, executable: opts.executable });
      writeFileSync(join(dir, `${account.id}.${attempts}.json`), JSON.stringify({ key, result: result.raw }, null, 2) + '\n');
      for (const k of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'thinkingTokens'] as const) total[k] += result.usage[k];
      total.listCostUsd += result.listCostUsd;
      total.durationMs += result.durationMs;
      if (!result.ok) {
        problem = result.problem;
        // A call that failed outright (often a usage limit) stops the run, leaving this account
        // unlogged so a resumed run codes it. A call the wrong model served isn't the coder's
        // mistake to fix either; it is logged as a failure.
        if (CALL_FAILED.test(problem ?? '')) throw new RunStopped(`${account.id}: ${problem}`);
        continue;
      }
      const restored = restoreAccountId(result.structuredOutput, key, account.id);
      const prepared = pass.prepare ? pass.prepare(restored, account) : { value: restored, problems: [] };
      let parsed = pass.schema.safeParse(prepared.value);
      const issues = [...prepared.problems.map((p) => `- ${p}`), ...(parsed.success ? [] : [listIssues(parsed.error)])];
      // On the retry, copied text over the cap is the one problem the pipeline fixes itself.
      if (!parsed.success && attempts === 2 && prepared.problems.length === 0 && parsed.error.issues.every((i) => i.message === OVER_CAP)) {
        const paths = parsed.error.issues.map((i) => i.path as (string | number)[]);
        const cut = pass.schema.safeParse(cutCopies(prepared.value, paths));
        if (cut.success) {
          parsed = cut;
          truncated = paths.map((p) => p.join('.'));
        }
      }
      if (parsed.success && prepared.problems.length === 0) {
        ok = true;
        problem = null;
        writeFileSync(join(dir, `${account.id}.coded.json`), JSON.stringify(parsed.data, null, 2) + '\n');
      } else {
        problem = `invalid: ${prepared.problems.length + (parsed.success ? 0 : parsed.error.issues.length)} problem(s)`;
        userText = `${text}\nYour previous answer for this account broke these rules:\n${issues.join('\n')}\n\nYour previous answer:\n${JSON.stringify(result.structuredOutput)}\n\nCode the account again, following every rule.\n`;
      }
    }
    return { accountId: account.id, key, claudeCodeVersion, ok, truncated, attempts, problem, ...total };
  };

  const lines: LogLine[] = [];
  const queue = accounts.map((a, i) => [a, i] as const).filter(([a]) => !done.has(a.id));
  let stopped: RunStopped | null = null;
  const worker = async () => {
    for (let next = stopped ? undefined : queue.shift(); next; next = stopped ? undefined : queue.shift()) {
      let line: LogLine;
      try {
        line = await codeOne(...next);
      } catch (e) {
        if (!(e instanceof RunStopped)) throw e;
        stopped = e;
        return;
      }
      appendFileSync(logFile, JSON.stringify(line) + '\n');
      lines.push(line);
      opts.onAccount?.(line);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 1) }, worker));
  if (stopped) throw Object.assign(stopped, { lines });
  return lines;
}
