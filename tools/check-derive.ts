// Health check for the rule-based questionnaire parser (derive/questionnaire.ts):
//
//   npm run check:derive -- <path to nderf-raw-data>
//
// Runs the parser over every part and prints how well it reads the forms: how many parts fall
// on each questionnaire form, and for each item how many parts asked it, left it blank, or gave
// an answer that opens with no known option. It also lists question wordings (NDERF's form
// text) that look like a tracked item but match no pattern.
//
// It never prints which options were picked, so it can run before the codebook is frozen
// without showing anything about what accounts contain, and it never prints account text.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DerivedPart } from '../schema/codebook-schema.ts';
import type { ScrapedAccount } from '../derive/input.ts';
import { deriveQuestionnaire, itemOf, normalizeLabel } from '../derive/questionnaire.ts';

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('usage: npm run check:derive -- <path to nderf-raw-data>');
  process.exit(1);
}

// The parser's output must fit the part of the schema it fills.
const Shape = DerivedPart.pick({ questionnaire: true, lifeThreat: true, beingItems: true, provenanceItems: true, religionField: true, lengths: true });
const LOOKS_TRACKED = /beings|spirits|religio|deceased|knowledge of near|reality of your|shared this|life[- ]threatening|accurately do you remember|experience included|mystical being/;
/** Asked about, but not recorded by the schema. */
const NOT_TRACKED = /^what importance do you place on your religious\/spiritual life after/;

type Tally = { asked: number; blank: number; unrecognized: number };
const forms = new Map<string, number>();
const items = new Map<string, Tally>();
const unmatched = new Map<string, number>();
let parts = 0;
let invalid = 0;
let lifeThreatNoAnswer = 0;
let lifeThreatNoSeverity = 0;

const tally = (name: string, finding: { status: string; value?: unknown }) => {
  if (finding.status === 'not_asked') return;
  const t = items.get(name) ?? { asked: 0, blank: 0, unrecognized: 0 };
  t.asked += 1;
  if (finding.status === 'not_stated') t.blank += 1;
  const value = finding.value as unknown;
  if (value === 'unrecognized' || (typeof value === 'object' && value !== null && (value as { option?: string }).option === 'unrecognized')) t.unrecognized += 1;
  items.set(name, t);
};

const accountsDir = join(dataDir, 'accounts');
for (const file of readdirSync(accountsDir).filter((f) => f.endsWith('.jsonl')).sort()) {
  for (const line of readFileSync(join(accountsDir, file), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const account = JSON.parse(line) as ScrapedAccount;
    account.parts.forEach((part, index) => {
      parts += 1;
      const d = deriveQuestionnaire(part, index);
      if (!Shape.safeParse(d).success) invalid += 1;
      forms.set(d.questionnaire.form, (forms.get(d.questionnaire.form) ?? 0) + 1);
      for (const [name, f] of Object.entries({ ...d.beingItems, ...d.provenanceItems, ...d.religionField })) tally(name, f);
      tally('lifeThreat', d.lifeThreat);
      if (d.lifeThreat.status === 'present') {
        if (d.lifeThreat.value.answer === null) lifeThreatNoAnswer += 1;
        if (d.lifeThreat.value.severity === null) lifeThreatNoSeverity += 1;
      }
      for (const q of new Set(part.qa.map((x) => normalizeLabel(x.question)))) {
        if (itemOf(q) === null && LOOKS_TRACKED.test(q) && !NOT_TRACKED.test(q)) unmatched.set(q, (unmatched.get(q) ?? 0) + 1);
      }
    });
  }
}

console.log(`${parts} parts; ${invalid} whose derived values fail the schema.`);
console.log('\nQuestionnaire form:');
for (const form of ['none', 'A', 'B', 'C', 'D', 'E', 'F', 'irregular']) console.log(`  ${form.padEnd(10)} ${String(forms.get(form) ?? 0).padStart(5)}`);
console.log('\nItem                          asked  blank  unrecognized');
for (const [name, t] of items) {
  console.log(`  ${name.padEnd(27)} ${String(t.asked).padStart(5)}  ${String(t.blank).padStart(5)}  ${String(t.unrecognized).padStart(5)}  (${((100 * t.unrecognized) / Math.max(1, t.asked - t.blank)).toFixed(1)}%)`);
}
console.log(`\nLife-threat item: ${lifeThreatNoAnswer} answered with no leading Yes, No, or Uncertain; ${lifeThreatNoSeverity} with no severity option.`);
console.log('\nQuestion wordings that look like a tracked item but match no pattern:');
for (const [q, n] of [...unmatched].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${q.slice(0, 170)}`);
