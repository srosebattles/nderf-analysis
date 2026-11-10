// Runs one coding call through Claude Code's non-interactive mode (`claude -p`), on the
// subscription Claude Code is logged in with, instead of the API. One fresh process per call,
// so nothing carries over from one account to the next:
//
// - the coding prompt replaces Claude Code's own system prompt (--system-prompt);
// - no tools (--tools ""), no MCP servers, no settings files, no CLAUDE.md or other
//   customizations (--safe-mode), nothing saved to disk afterward (--no-session-persistence);
// - the model and effort are pinned, with no fallback model; the result reports which model
//   served the call, and a call any other model touched is rejected;
// - the answer comes back as structured output against the pass's JSON Schema (--json-schema),
//   and the caller validates it again with zod, which also checks the cross-field rules.
//
// The account text goes in on stdin, never on the command line. The call runs in an empty
// working directory.

import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface ClaudeCodeCall {
  model: string; // a full model ID, e.g. 'claude-sonnet-5-5'
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  systemPrompt: string;
  jsonSchema: object;
  userText: string;
  /** The executable, for tests; default `claude`. */
  executable?: string;
  timeoutMs?: number;
}

export interface ClaudeCodeResult {
  ok: boolean;
  /** Why the call was rejected, when ok is false. */
  problem: string | null;
  structuredOutput: unknown;
  /** The models that served the call, from Claude Code's own report. */
  models: string[];
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; thinkingTokens: number };
  /** What the call would cost at API list prices: what the subscription saves. */
  listCostUsd: number;
  durationMs: number;
  /** Claude Code's whole result, for the private raw-output store. */
  raw: unknown;
}

/** A JSON Schema both of Claude Code's checks accept: its own validator, which knows only draft
 *  7, and the API's, which wants draft 2020-12. zod writes 2020-12, so three things change, all
 *  of which zod checks again afterward:
 *  - the "$schema" marker is dropped;
 *  - a tuple ("prefixItems", which draft 7 lacks; draft 7's own form is invalid in 2020-12)
 *    becomes a list of the same length whose items may be any of the tuple's item types;
 *  - "format" is dropped, since Claude Code's validator rejects formats it doesn't know. */
export function forClaudeCode(schema: object): object {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '$schema' || k === 'format') continue;
      if (k === 'prefixItems' && Array.isArray(v)) {
        const distinct = [...new Map(v.map((item) => [JSON.stringify(walk(item)), walk(item)])).values()];
        out.items = distinct.length === 1 ? distinct[0] : { anyOf: distinct };
        out.minItems = v.length;
        out.maxItems = v.length;
        continue;
      }
      if (k === 'items' && 'prefixItems' in node) continue;
      if ((k === 'minItems' || k === 'maxItems') && 'prefixItems' in node) continue;
      out[k] = walk(v);
    }
    return out;
  };
  return walk(schema) as object;
}

/** Each command-line argument is capped by the operating system (128 KiB on Linux). */
const MAX_ARGUMENT_BYTES = 128 * 1024;

export function claudeCodeArgs(call: Pick<ClaudeCodeCall, 'model' | 'effort' | 'systemPrompt' | 'jsonSchema'>): string[] {
  const schema = JSON.stringify(forClaudeCode(call.jsonSchema));
  for (const [name, value] of [['system prompt', call.systemPrompt], ['JSON Schema', schema]] as const) {
    if (Buffer.byteLength(value) >= MAX_ARGUMENT_BYTES) throw new Error(`${name} is too large for one argument (${Buffer.byteLength(value)} bytes)`);
  }
  return [
    '-p',
    '--model', call.model,
    '--effort', call.effort,
    '--system-prompt', call.systemPrompt,
    '--json-schema', schema,
    '--output-format', 'json',
    '--tools', '',
    '--safe-mode',
    '--strict-mcp-config',
    '--setting-sources', '',
    '--no-session-persistence',
  ];
}

type Usage = { inputTokens?: number; outputTokens?: number; cacheReadInputTokens?: number; cacheCreationInputTokens?: number; thinkingTokens?: number; costUSD?: number };

/** Reads Claude Code's JSON result and decides whether to accept it. */
export function readResult(stdout: string, model: string, durationMs: number): ClaudeCodeResult {
  const empty = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, thinkingTokens: 0 };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(stdout);
  } catch {
    return { ok: false, problem: 'output is not JSON', structuredOutput: null, models: [], usage: empty, listCostUsd: 0, durationMs, raw: stdout.slice(0, 2000) };
  }
  const modelUsage = (raw.modelUsage ?? {}) as Record<string, Usage>;
  const models = Object.keys(modelUsage);
  const sum = (k: keyof Usage) => models.reduce((n, m) => n + (modelUsage[m][k] ?? 0), 0);
  const usage = {
    inputTokens: sum('inputTokens'), outputTokens: sum('outputTokens'), cacheReadTokens: sum('cacheReadInputTokens'),
    cacheWriteTokens: sum('cacheCreationInputTokens'), thinkingTokens: sum('thinkingTokens'),
  };
  const problem =
    raw.is_error === true || raw.subtype !== 'success' ? `call failed (${String(raw.subtype ?? 'error')}${raw.api_error_status ? `, ${String(raw.api_error_status)}` : ''})`
    : raw.stop_reason === 'refusal' ? 'the model declined'
    : models.length === 0 ? 'no model reported'
    : models.some((m) => m !== model) ? `served by ${models.join(', ')}, not ${model}`
    : raw.structured_output === undefined || raw.structured_output === null ? 'no structured output'
    : null;
  return { ok: problem === null, problem, structuredOutput: raw.structured_output ?? null, models, usage, listCostUsd: sum('costUSD'), durationMs, raw };
}

export function runClaudeCode(call: ClaudeCodeCall): Promise<ClaudeCodeResult> {
  const args = claudeCodeArgs(call);
  const cwd = mkdtempSync(join(tmpdir(), 'nderf-coder-'));
  const started = Date.now();
  return new Promise((resolve) => {
    const child = execFile(call.executable ?? 'claude', args, { cwd, timeout: call.timeoutMs ?? 15 * 60_000, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      rmSync(cwd, { recursive: true, force: true });
      const result = readResult(stdout, call.model, Date.now() - started);
      if (error && result.ok) resolve({ ...result, ok: false, problem: `exited with an error: ${error.message.split('\n')[0]}` });
      else if (!result.ok && stdout.trim() === '') {
        // The command line holds the prompt and schema, so report Claude Code's own message, not the command.
        const said = stderr.trim().split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400);
        resolve({ ...result, problem: `no output (${said || (error ? `exit code ${String(error.code)}` : 'nothing on stderr')})` });
      }
      else resolve(result);
    });
    child.stdin?.end(call.userText);
  });
}
