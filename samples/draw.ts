// Draws the practice and holdout samples of account IDs. IDs only: nothing here reads or
// writes account text.
//
//   node samples/draw.ts <path to the nderf-raw-data repository>
//
// Every account is ranked by the SHA-256 hash (hex) of `${SEED}:${id}`, lowest first. The
// ranking doesn't depend on file order or a seedable random generator, so it can be reproduced
// in any language. Practice rounds take IDs from the top of the ranking and grow downward;
// the holdout is reserved from the bottom, so the two can never overlap.
//
// The ranking is saved, not just the seed: if a later crawl adds accounts, the saved ranking
// stays the frame for these samples.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SEED = '20261101';
/** Cumulative practice-set size after each round. Add a number to expand. */
const PRACTICE_ROUNDS = [50];
/** Reserved from the bottom of the ranking. Never read before the codebook is frozen. */
const HOLDOUT_SIZE = 200;

/** Pages that aren't accounts. The one "page has moved" notice points to an account that is
 *  crawled under its own URL, so including it could count that account twice. */
const EXCLUDE_WARNING = /^no account content/;

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('usage: node samples/draw.ts <path to nderf-raw-data>');
  process.exit(1);
}

const accountsDir = join(dataDir, 'accounts');
const ids: string[] = [];
const excluded: Array<{ id: string; reason: string }> = [];
for (const file of readdirSync(accountsDir).filter((f) => f.endsWith('.jsonl')).sort()) {
  for (const line of readFileSync(join(accountsDir, file), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const { id, warnings } = JSON.parse(line) as { id: string; warnings: string[] };
    const reason = warnings.find((w) => EXCLUDE_WARNING.test(w));
    if (reason) excluded.push({ id, reason });
    else ids.push(id);
  }
}
if (new Set(ids).size !== ids.length) throw new Error('duplicate account IDs');

const rank = (id: string) => createHash('sha256').update(`${SEED}:${id}`).digest('hex');
const keyed = ids.map((id) => ({ id, key: rank(id) }));
keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
const ranking = keyed.map((k) => k.id);

const practiceTotal = PRACTICE_ROUNDS.at(-1) ?? 0;
if (practiceTotal + HOLDOUT_SIZE > ranking.length) throw new Error('samples would overlap');

const dataCommit = execFileSync('git', ['-C', dataDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const frame = { dataRepository: 'nderf-raw-data', dataCommit, accounts: ranking.length, excluded };
const method = 'Rank by SHA-256 hex of `${seed}:${id}`, ascending.';

const write = (name: string, value: unknown) =>
  writeFileSync(new URL(name, import.meta.url), JSON.stringify(value, null, 2) + '\n');

write('ranking.json', { seed: SEED, method, frame, ranking });
write('practice.json', {
  seed: SEED,
  note: 'Taken from the top of ranking.json. Free to read.',
  rounds: PRACTICE_ROUNDS.map((size, i) => ({
    round: i + 1,
    ids: ranking.slice(i === 0 ? 0 : PRACTICE_ROUNDS[i - 1], size),
  })),
});
write('holdout.json', {
  seed: SEED,
  note: 'Taken from the bottom of ranking.json. Not to be read before the codebook is frozen.',
  ids: ranking.slice(ranking.length - HOLDOUT_SIZE),
});

console.log(`frame: ${ranking.length} accounts (${excluded.length} excluded) at data commit ${dataCommit.slice(0, 7)}`);
console.log(`practice: ${practiceTotal} in ${PRACTICE_ROUNDS.length} round(s); holdout: ${HOLDOUT_SIZE}`);
