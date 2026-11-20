// Overlap check, to run before each commit:
//
//   npm run check:overlap -- <path to nderf-raw-data> [files…]
//
// Lists every word sequence from the given files (default: every .ts, .md, and .jsonl file git
// tracks or would track, so new files are checked before their first commit) that also
// appears in some account's narrative or free-text answer. Two windows:
//
// - Prose and code (.ts, .md, anything not .jsonl): five words. None of these should ever hold
//   copied text, and examples in comments and fixtures are invented.
// - Data files (.jsonl): one word longer than MAX_COPIED_WORDS. Each copied string is already
//   capped by the schema, but a list of copied strings sits side by side in the JSON with no
//   keys between them, so a passage split across several strings shows up here as a longer run.
//
// It prints only the matching sequences, which are our own text, and how many accounts contain
// each; it never prints account text. Ordinary phrases ("at the time of the") will match, so
// read the list: anything that isn't plainly generic wording needs rewriting before it is
// committed.
//
// NDERF's own form text is left out: question wording and menu labels are not account text and
// may be quoted, but they turn up in responses wherever the scraper couldn't split a menu label
// from the comment after it. Sequences that are form text (tools/form-text.ts) are counted and
// not listed, which also keeps the check from showing how often a menu option was picked.

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MENU_LABELS } from '../derive/questionnaire.ts';
import { MAX_COPIED_WORDS } from '../schema/codebook-schema.ts';
import { formTextMatcher, words } from './form-text.ts';

const PROSE_WINDOW = 5;
const DATA_WINDOW = MAX_COPIED_WORDS + 1;
const windowFor = (file: string) => (file.endsWith('.jsonl') ? DATA_WINDOW : PROSE_WINDOW);

interface Account {
  parts: Array<{ narrative: string; qa: Array<{ question: string; answer: string | null; comment: string | null; response: string }> }>;
}

const nGrams = (ws: string[], n: number) =>
  ws.slice(0, Math.max(0, ws.length - n + 1)).map((_, i) => ws.slice(i, i + n).join(' '));

const [dataDir, ...given] = process.argv.slice(2);
if (!dataDir) {
  console.error('usage: npm run check:overlap -- <path to nderf-raw-data> [files…]');
  process.exit(1);
}
const files = given.length
  ? given
  : // Tracked files plus new, untracked ones (ignored files excluded), so a file is checked
    // before its first commit, not only after it.
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.ts', '*.md', '*.jsonl'], {
      encoding: 'utf8',
    }).split('\n').filter(Boolean);

/** window -> sequence -> the file it came from */
const ours = new Map<number, Map<string, string>>();
for (const file of files) {
  const n = windowFor(file);
  const seqs = ours.get(n) ?? new Map<string, string>();
  for (const g of nGrams(words(readFileSync(file, 'utf8')), n)) seqs.set(g, file);
  ours.set(n, seqs);
}

// Free text only: the narrative, plus each answer's comment (or the whole response when it has
// no leading menu answer). Menu labels and question wording are form text, not account text.
const hits = new Map<string, { n: number; accounts: number }>();
const questions = new Set<string>();
const accountsDir = join(dataDir, 'accounts');
for (const name of readdirSync(accountsDir).filter((f) => f.endsWith('.jsonl'))) {
  for (const line of readFileSync(join(accountsDir, name), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const account = JSON.parse(line) as Account;
    for (const p of account.parts) for (const q of p.qa) questions.add(q.question);
    const texts = account.parts.flatMap((p) => [
      p.narrative,
      ...p.qa.map((q) => q.comment ?? (q.answer === null ? q.response : '')),
    ]);
    for (const [n, seqs] of ours) {
      const found = new Set(texts.flatMap((t) => nGrams(words(t), n)).filter((g) => seqs.has(g)));
      for (const g of found) {
        const hit = hits.get(g) ?? { n, accounts: 0 };
        hit.accounts += 1;
        hits.set(g, hit);
      }
    }
  }
}

const isFormText = formTextMatcher(questions, MENU_LABELS);
const listed = [...hits].filter(([g]) => !isFormText(g));
const checked = [...ours].map(([n, seqs]) => `${seqs.size} ${n}-word`).join(', ');
console.log(`${files.length} files, ${checked} sequences checked, ${listed.length} found in accounts.`);
console.log(`${hits.size - listed.length} more are NDERF's question wording or menu labels (form text) and are not listed.`);
for (const [g, { n, accounts }] of listed.sort((a, b) => b[1].accounts - a[1].accounts)) {
  console.log(`${String(accounts).padStart(5)} accounts | ${n} words | ${g} | ${ours.get(n)?.get(g)}`);
}
