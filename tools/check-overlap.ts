// Five-word overlap check, to run before each commit:
//
//   npm run check:overlap -- <path to nderf-raw-data> [files…]
//
// Lists every five-word sequence from the given files (default: all tracked .ts and .md files)
// that also appears in some account's narrative or free-text answer. It prints only the
// matching sequences, which are our own text, and how many accounts contain each; it never
// prints account text. Ordinary phrases ("at the time of the") will match, so read the list:
// anything that isn't plainly generic wording needs rewriting before it is committed.

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Account {
  parts: Array<{ narrative: string; qa: Array<{ answer: string | null; comment: string | null; response: string }> }>;
}

const words = (s: string) =>
  s.toLowerCase().normalize('NFKC').replace(/[’‘]/g, "'").match(/[\p{L}\p{N}']+/gu) ?? [];
const fiveGrams = (ws: string[]) => ws.slice(0, Math.max(0, ws.length - 4)).map((_, i) => ws.slice(i, i + 5).join(' '));

const [dataDir, ...given] = process.argv.slice(2);
if (!dataDir) {
  console.error('usage: npm run check:overlap -- <path to nderf-raw-data> [files…]');
  process.exit(1);
}
const files = given.length
  ? given
  : execFileSync('git', ['ls-files', '--', '*.ts', '*.md'], { encoding: 'utf8' }).split('\n').filter(Boolean);

const ours = new Map<string, string>();
for (const file of files) for (const g of fiveGrams(words(readFileSync(file, 'utf8')))) ours.set(g, file);

// Free text only: the narrative, plus each answer's comment (or the whole response when it has
// no leading menu answer). Menu labels and question wording are form text, not account text.
const hits = new Map<string, number>();
const accountsDir = join(dataDir, 'accounts');
for (const name of readdirSync(accountsDir).filter((f) => f.endsWith('.jsonl'))) {
  for (const line of readFileSync(join(accountsDir, name), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const account = JSON.parse(line) as Account;
    const texts = account.parts.flatMap((p) => [
      p.narrative,
      ...p.qa.map((q) => q.comment ?? (q.answer === null ? q.response : '')),
    ]);
    const found = new Set(texts.flatMap((t) => fiveGrams(words(t))).filter((g) => ours.has(g)));
    for (const g of found) hits.set(g, (hits.get(g) ?? 0) + 1);
  }
}

console.log(`${files.length} files, ${ours.size} five-word sequences checked, ${hits.size} found in accounts.`);
for (const [g, n] of [...hits].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(n).padStart(5)} accounts | ${g} | ${ours.get(g)}`);
}
