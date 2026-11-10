// Runs one coding pass over a list of accounts, one fresh Claude Code call per account
// (claude-code.ts), and keeps everything the run produced in the private data repository:
//
//   <data>/llm-raw/<runId>/run.json                   what was run: pass, model, effort, hashes
//   <data>/llm-raw/<runId>/<accountId>.<n>.json       each attempt's full result (contains quotes)
//   <data>/llm-raw/<runId>/log.jsonl                  one line per account: outcome, tokens, time
//
// An answer is validated with the pass's zod schema, cross-field rules included. One that fails
// is retried once, in a fresh call, with the problems listed; one that fails again is logged and
// nothing is kept as coded. A run is resumable: accounts already in the log are skipped.

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { z } from 'zod';
import type { ScrapedAccount } from '../derive/input.ts';
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
  ok: boolean;
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

/** The problems a zod error lists, one per line, for the retry. */
const listIssues = (error: z.ZodError) => error.issues.slice(0, 40).map((i) => `- ${i.path.join('.') || '(top level)'}: ${i.message}`).join('\n');

export async function runPass(pass: PassDefinition, accounts: readonly ScrapedAccount[], opts: RunOptions): Promise<LogLine[]> {
  const dir = join(opts.dataDir, 'llm-raw', opts.runId);
  mkdirSync(dir, { recursive: true });
  const manifest = {
    runId: opts.runId, pass: pass.id, passVersion: pass.version, model: opts.model, effort: opts.effort,
    systemPromptSha256: sha256(pass.systemPrompt), jsonSchemaSha256: sha256(JSON.stringify(pass.jsonSchema)),
    accounts: accounts.map((a) => a.id),
  };
  const manifestFile = join(dir, 'run.json');
  if (existsSync(manifestFile)) {
    const held = JSON.parse(readFileSync(manifestFile, 'utf8'));
    for (const k of ['pass', 'passVersion', 'model', 'effort', 'systemPromptSha256', 'jsonSchemaSha256'] as const) {
      if (held[k] !== manifest[k]) throw new Error(`run ${opts.runId} was started with a different ${k}; start a new run`);
    }
  } else {
    writeFileSync(manifestFile, JSON.stringify({ ...manifest, started: new Date().toISOString() }, null, 2) + '\n');
  }
  const logFile = join(dir, 'log.jsonl');
  const done = new Set(existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as LogLine).accountId) : []);

  const codeOne = async (account: ScrapedAccount, position: number): Promise<LogLine> => {
    const { key, text } = renderForCoder(account, neutralKey(position));
    const total = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, thinkingTokens: 0, listCostUsd: 0, durationMs: 0 };
    let userText = text;
    let problem: string | null = null;
    let attempts = 0;
    let ok = false;
    while (attempts < 2 && !ok) {
      attempts += 1;
      const result: ClaudeCodeResult = await runClaudeCode({ model: opts.model, effort: opts.effort, systemPrompt: pass.systemPrompt, jsonSchema: pass.jsonSchema, userText, executable: opts.executable });
      writeFileSync(join(dir, `${account.id}.${attempts}.json`), JSON.stringify({ key, result: result.raw }, null, 2) + '\n');
      for (const k of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'thinkingTokens'] as const) total[k] += result.usage[k];
      total.listCostUsd += result.listCostUsd;
      total.durationMs += result.durationMs;
      if (!result.ok) {
        problem = result.problem;
        // A call the wrong model served, or that failed outright, isn't the coder's mistake to fix.
        continue;
      }
      const parsed = pass.schema.safeParse(restoreAccountId(result.structuredOutput, key, account.id));
      if (parsed.success) {
        ok = true;
        problem = null;
        writeFileSync(join(dir, `${account.id}.coded.json`), JSON.stringify(parsed.data, null, 2) + '\n');
      } else {
        problem = `invalid: ${parsed.error.issues.length} problem(s)`;
        userText = `${text}\nYour previous answer for this account broke these rules:\n${listIssues(parsed.error)}\n\nYour previous answer:\n${JSON.stringify(result.structuredOutput)}\n\nCode the account again, following every rule.\n`;
      }
    }
    return { accountId: account.id, key, ok, attempts, problem, ...total };
  };

  const lines: LogLine[] = [];
  const queue = accounts.map((a, i) => [a, i] as const).filter(([a]) => !done.has(a.id));
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const line = await codeOne(...next);
      appendFileSync(logFile, JSON.stringify(line) + '\n');
      lines.push(line);
      opts.onAccount?.(line);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 1) }, worker));
  return lines;
}
