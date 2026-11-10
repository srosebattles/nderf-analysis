#!/usr/bin/env node
// Stands in for `claude -p` in tests. Reads the arguments and stdin, and answers as the test
// asks through FAKE_CLAUDE_SCRIPT: a JSON list of answers, one per call, kept in a counter file.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const script = JSON.parse(process.env.FAKE_CLAUDE_SCRIPT ?? '[]');
const counter = process.env.FAKE_CLAUDE_COUNTER;
const n = counter && existsSync(counter) ? Number(readFileSync(counter, 'utf8')) : 0;
if (counter) writeFileSync(counter, String(n + 1));
const args = process.argv.slice(2);
const stdin = readFileSync(0, 'utf8');
if (process.env.FAKE_CLAUDE_ECHO) writeFileSync(`${process.env.FAKE_CLAUDE_ECHO}.${n}`, JSON.stringify({ args, stdin }));
const step = script[Math.min(n, script.length - 1)] ?? {};
const model = step.model ?? args[args.indexOf('--model') + 1];
process.stdout.write(JSON.stringify({
  type: 'result', subtype: step.subtype ?? 'success', is_error: step.is_error ?? false, stop_reason: step.stop_reason ?? 'tool_use',
  structured_output: step.output,
  modelUsage: { [model]: { inputTokens: 10, outputTokens: 20, cacheReadInputTokens: 30, cacheCreationInputTokens: 40, thinkingTokens: 5, costUSD: 0.01 } },
}));
