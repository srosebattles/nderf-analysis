// Health check for the rule-based parsers of the derived file (derive/):
//
//   npm run check:derive -- <path to nderf-raw-data>
//
// Runs the parsers over every part and prints how well they read the pages: how many parts fall
// on each questionnaire form; for each item, how many parts asked it, left it blank, or gave an
// answer that opens with no known option; how precisely the experience date could be read; how
// NDERF's classification labels and editor tags were read (its own wording, listed where no rule
// fits); and question wordings (NDERF's form text) that look like a tracked item but match no
// pattern.
//
// It never prints which options were picked, so it can run before the codebook is frozen
// without showing anything about what accounts contain, and it never prints account text.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CountryClaim, DerivedPart, LanguageClaim, NderfEditorial } from '../schema/codebook-schema.ts';
import type { ScrapedAccount } from '../derive/input.ts';

type Listed = ScrapedAccount;
import { deriveBackground, derivePosting } from '../derive/dates.ts';
import { classTokens, deriveEditorial, deriveTagClaims, placesInTag } from '../derive/editorial.ts';
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
let flagged = 0;
let formANothingTicked = 0;
const precisions = new Map<string, number>();
const dateFlags = new Map<string, number>();
let noFirstPosting = 0;
let accounts = 0;
let editorialInvalid = 0;
let withCountry = 0;
let withLanguage = 0;
const translated = new Map<string, number>();
const unfitLabels = new Map<string, number>();
const unknownPlaces = new Map<string, number>();

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
    const account = JSON.parse(line) as Listed;
    const posting = derivePosting(account.posted_dates ?? [], account.fetched_at ?? null, account.quick_facts ?? null);
    if (posting.firstPosted === null) noFirstPosting += 1;
    accounts += 1;
    const editorial = deriveEditorial(account);
    const claims = deriveTagClaims(account);
    if (!NderfEditorial.safeParse(editorial).success || claims.countries.some((c) => !CountryClaim.safeParse(c).success) || (claims.language !== null && !LanguageClaim.safeParse(claims.language).success)) editorialInvalid += 1;
    if (claims.countries.length > 0) withCountry += 1;
    if (claims.language !== null) {
      withLanguage += 1;
      translated.set(claims.language.translated, (translated.get(claims.language.translated) ?? 0) + 1);
    }
    for (const label of [editorial.classificationRaw.page, ...editorial.classificationRaw.listings]) {
      if (label !== null && classTokens(label).includes('other') && !/\bothers?\b/i.test(label)) unfitLabels.set(label, (unfitLabels.get(label) ?? 0) + 1);
    }
    for (const listing of account.listings ?? []) {
      for (const place of listing.tag ? placesInTag(listing.tag) : []) if (!place.known) unknownPlaces.set(place.raw, (unknownPlaces.get(place.raw) ?? 0) + 1);
    }
    account.parts.forEach((part, index) => {
      parts += 1;
      const { backgroundDate } = deriveBackground(part, posting.firstPosted, index === 0 ? (account.quick_facts ?? null) : null);
      precisions.set(backgroundDate.precision, (precisions.get(backgroundDate.precision) ?? 0) + 1);
      for (const f of backgroundDate.flags) dateFlags.set(f, (dateFlags.get(f) ?? 0) + 1);
      const d = deriveQuestionnaire(part, index, posting.firstPosted);
      if (d.questionnaire.flags.length > 0) flagged += 1;
      if (d.questionnaire.form === 'A' && !part.qa.some((x) => itemOf(x.question) === 'checklist')) formANothingTicked += 1;
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
console.log(`\n${formANothingTicked} form A parts have nothing ticked on the checklist; ${flagged} form B parts are flagged as possibly form C with nothing ticked.`);
console.log('\nItem                          asked  blank  unrecognized');
for (const [name, t] of items) {
  console.log(`  ${name.padEnd(27)} ${String(t.asked).padStart(5)}  ${String(t.blank).padStart(5)}  ${String(t.unrecognized).padStart(5)}  (${((100 * t.unrecognized) / Math.max(1, t.asked - t.blank)).toFixed(1)}%)`);
}
console.log(`\nLife-threat item: ${lifeThreatNoAnswer} answered with no leading Yes, No, or Uncertain; ${lifeThreatNoSeverity} with no severity option.`);
console.log(`\nExperience date, by precision: ${[...precisions].map(([k, n]) => `${k} ${n}`).join(', ')}.`);
console.log(`Date flags: ${[...dateFlags].map(([k, n]) => `${k} ${n}`).join(', ')}.`);
console.log(`${noFirstPosting} accounts have no usable posting date.`);
const list = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join('; ') || 'none';
console.log(`\nNDERF's editorial layer, ${accounts} accounts: ${editorialInvalid} fail the schema; ${withCountry} have a country in a tag; ${withLanguage} have a language tag (translated: ${list(translated)}).`);
console.log(`Classification labels that fit no rule (NDERF's wording): ${list(unfitLabels)}.`);
console.log(`Places named in tags that aren't in the table: ${list(unknownPlaces)}.`);
console.log('\nQuestion wordings that look like a tracked item but match no pattern:');
for (const [q, n] of [...unmatched].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${q.slice(0, 170)}`);
