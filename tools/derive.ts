// Writes the derived file (one record per account, by rule; derive/account.ts):
//
//   npm run derive -- <path to nderf-raw-data> --practice
//
// Before the codebook is frozen, records are written only for the practice pages
// (samples/practice.json, every round), into the private data repository at
// derived/practice.jsonl. The full file is generated at the freeze, with the pipeline
// (DECISIONS.md, Open). Every record is validated before anything is written.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveAccount } from '../derive/account.ts';
import { readAccounts, readSearchListing } from '../derive/load.ts';
import { matchSearchEntries } from '../derive/search-site.ts';

const [dataDir, ...flags] = process.argv.slice(2);
if (!dataDir || !flags.includes('--practice')) {
  console.error('usage: npm run derive -- <path to nderf-raw-data> --practice');
  console.error('Only the practice pages are derived before the freeze.');
  process.exit(1);
}

const practice = JSON.parse(readFileSync(new URL('../samples/practice.json', import.meta.url), 'utf8')) as { rounds: { ids: string[] }[] };
const ids = practice.rounds.flatMap((r) => r.ids);
const accounts = readAccounts(dataDir);
const byId = new Map(accounts.map((a) => [a.id, a]));
const missing = ids.filter((id) => !byId.has(id));
if (missing.length > 0) throw new Error(`practice pages not in the data: ${missing.join(', ')}`);

// Matching looks across every account, so a number shared with a page outside the sample still counts.
const matches = matchSearchEntries(accounts, readSearchListing(dataDir));
const records = ids.map((id) => deriveAccount(byId.get(id)!, matches.get(id)?.entry ?? null));

const out = join(dataDir, 'derived', 'practice.jsonl');
mkdirSync(join(dataDir, 'derived'), { recursive: true });
writeFileSync(out, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`wrote ${records.length} records to ${out}`);
