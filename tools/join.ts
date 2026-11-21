// Joins the main coder's pass A and pass B runs into first-run records (pipeline/join.ts):
//
//   npm run join -- <path to nderf-raw-data> --pass-a <run ID> --pass-b <run ID> --out <name>
//
// Writes <data>/first-run/<name>.jsonl (one record per page; private, since records hold the
// episode and encounter labels) and <data>/first-run/<name>.reruns.json (pages to rerun, and why).
// Prints counts only.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { joinFirstRun } from '../pipeline/join.ts';

const argv = process.argv.slice(2);
const value = (name: string) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : undefined);
const [dataDir] = argv;
const passA = value('pass-a');
const passB = value('pass-b');
const out = value('out');
if (!dataDir || !passA || !passB || !out) {
  console.error('usage: npm run join -- <data> --pass-a <run ID> --pass-b <run ID> --out <name>');
  process.exit(1);
}

const { records, reruns } = joinFirstRun(dataDir, passA, passB);
const dir = join(dataDir, 'first-run');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${out}.jsonl`), records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : ''));
writeFileSync(join(dir, `${out}.reruns.json`), JSON.stringify({ passA, passB, reruns }, null, 2) + '\n');
const flagged = records.filter((r) => r.needsPassARerun).length;
console.log(`${records.length} records joined (${flagged} flagged for a pass A rerun); ${reruns.length} rerun entries`);
for (const r of reruns) console.log(`  ${r.pass} ${r.accountId}: ${r.reason}`);
