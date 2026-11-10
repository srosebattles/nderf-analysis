// Runs a coding pass in-session, through Claude Code's non-interactive mode on its logged-in
// subscription (pipeline/run-pass.ts), and prints what it cost in time and tokens:
//
//   npm run pass -- <path to nderf-raw-data> --pass probe-religion --model claude-sonnet-5-5 \
//     --effort low --practice [--limit 5] [--run-id <id>] [--concurrency 1] [--dry-run]
//
// --dry-run prints what would be sent (sizes only, never account text) and calls nothing.
// Only the practice pages can be run before the freeze.

import { readFileSync } from 'node:fs';
import { readAccounts } from '../derive/load.ts';
import { neutralKey, renderForCoder } from '../pipeline/coder-input.ts';
import { PROBE_RELIGION } from '../pipeline/probe-pass.ts';
import { type LogLine, type PassDefinition, runPass } from '../pipeline/run-pass.ts';

const PASSES: Record<string, PassDefinition> = { [PROBE_RELIGION.id]: PROBE_RELIGION as PassDefinition };

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const value = (name: string) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : undefined);
const dataDir = argv[0];
const pass = PASSES[value('pass') ?? ''];
const model = value('model');
const effort = (value('effort') ?? 'low') as 'low' | 'medium' | 'high' | 'xhigh' | 'max';
if (!dataDir || !pass || !model || !flag('practice')) {
  console.error(`usage: npm run pass -- <data> --pass <${Object.keys(PASSES).join('|')}> --model <full model ID> [--effort low] --practice [--limit n] [--run-id id] [--concurrency n] [--dry-run]`);
  process.exit(1);
}

const practice = JSON.parse(readFileSync(new URL('../samples/practice.json', import.meta.url), 'utf8')) as { rounds: { ids: string[] }[] };
const ids = practice.rounds.flatMap((r) => r.ids).slice(0, Number(value('limit') ?? Infinity));
const byId = new Map(readAccounts(dataDir).map((a) => [a.id, a]));
const accounts = ids.map((id) => {
  const a = byId.get(id);
  if (!a) throw new Error(`practice page ${id} is not in the data`);
  return a;
});

const kb = (s: string | object) => `${(Buffer.byteLength(typeof s === 'string' ? s : JSON.stringify(s)) / 1024).toFixed(1)} KB`;
console.log(`pass ${pass.id} ${pass.version}; model ${model}, effort ${effort}; ${accounts.length} practice pages`);
console.log(`system prompt ${kb(pass.systemPrompt)}, JSON Schema ${kb(pass.jsonSchema)}`);
const sizes = accounts.map((a, i) => Buffer.byteLength(renderForCoder(a, neutralKey(i)).text)).sort((x, y) => x - y);
console.log(`coder input per page: median ${(sizes[Math.floor(sizes.length / 2)] / 1024).toFixed(1)} KB, largest ${(sizes[sizes.length - 1] / 1024).toFixed(1)} KB`);
if (flag('dry-run')) process.exit(0);

const runId = value('run-id') ?? `${pass.id}-${model}-${effort}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
const lines: LogLine[] = await runPass(pass, accounts, {
  dataDir, runId, model, effort, concurrency: Number(value('concurrency') ?? 1),
  onAccount: (l) => console.log(`${l.key} ${l.ok ? 'ok' : `FAILED: ${l.problem}`} (${l.attempts} call${l.attempts > 1 ? 's' : ''}, ${l.outputTokens} tokens out, ${(l.durationMs / 1000).toFixed(0)} s)`),
});
const sum = (k: keyof LogLine) => lines.reduce((n, l) => n + (l[k] as number), 0);
console.log(`\nrun ${runId}: ${lines.filter((l) => l.ok).length} of ${lines.length} coded, ${sum('attempts')} calls`);
console.log(`tokens: ${sum('inputTokens')} in, ${sum('cacheReadTokens')} cache read, ${sum('cacheWriteTokens')} cache write, ${sum('outputTokens')} out (${sum('thinkingTokens')} thinking)`);
console.log(`time: ${(sum('durationMs') / 60000).toFixed(1)} minutes; at API list prices this would have cost $${sum('listCostUsd').toFixed(2)}`);
