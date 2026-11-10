// Health check for the derived file (derive/):
//
//   npm run check:derive -- <path to nderf-raw-data>
//
// Builds every account's derived record, validates it against the schema, and prints how well
// the rules read the pages: how many parts fall on each questionnaire form; for each item, how
// many parts asked it, left it blank, or gave an answer that opens with no known option; how
// precisely the experience date could be read; how NDERF's labels, tags, and search-site
// entries were read (its own wording, listed where no rule fits); and question wordings
// (NDERF's form text) that look like a tracked item but match no pattern.
//
// It never prints which options were picked, so it can run before the codebook is frozen
// without showing anything about what accounts contain, and it never prints account text. It
// writes nothing.

import { DerivedRecord } from '../schema/codebook-schema.ts';
import { deriveAccount } from '../derive/account.ts';
import { classTokens, placesInTag } from '../derive/editorial.ts';
import { readAccounts, readSearchListing } from '../derive/load.ts';
import { itemOf, normalizeLabel } from '../derive/questionnaire.ts';
import { matchSearchEntries } from '../derive/search-site.ts';

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('usage: npm run check:derive -- <path to nderf-raw-data>');
  process.exit(1);
}

const LOOKS_TRACKED = /beings|spirits|religio|deceased|knowledge of near|reality of your|shared this|life[- ]threatening|accurately do you remember|experience included|mystical being/;
/** Asked about, but not recorded by the schema. */
const NOT_TRACKED = /^what importance do you place on your religious\/spiritual life after/;

const bump = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by);
const list = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join('; ') || 'none';

type Tally = { asked: number; blank: number; unrecognized: number };
const forms = new Map<string, number>();
const items = new Map<string, Tally>();
const unmatched = new Map<string, number>();
const precisions = new Map<string, number>();
const dateFlags = new Map<string, number>();
const claimSources = new Map<string, number>();
const translated = new Map<string, number>();
const unfitLabels = new Map<string, number>();
const unknownPlaces = new Map<string, number>();
const failures: string[] = [];
let parts = 0;
let lifeThreatNoAnswer = 0;
let lifeThreatNoSeverity = 0;
let formFlagged = 0;
let formANothingTicked = 0;
let noFirstPosting = 0;
let withLanguage = 0;
let withAgeBand = 0;
let withCountryAi = 0;
let withSiteDate = 0;
let withGreyson = 0;

const tally = (name: string, finding: { status: string; value?: unknown }) => {
  if (finding.status === 'not_asked') return;
  const t = items.get(name) ?? { asked: 0, blank: 0, unrecognized: 0 };
  t.asked += 1;
  if (finding.status === 'not_stated') t.blank += 1;
  const value = finding.value as unknown;
  if (value === 'unrecognized' || (typeof value === 'object' && value !== null && (value as { option?: string }).option === 'unrecognized')) t.unrecognized += 1;
  items.set(name, t);
};

const accounts = readAccounts(dataDir);
const entries = readSearchListing(dataDir);
const matches = matchSearchEntries(accounts, entries);
const matchedBy = new Map<string, number>();
for (const m of matches.values()) bump(matchedBy, m.by);

for (const account of accounts) {
  let record: DerivedRecord;
  try {
    record = deriveAccount(account, matches.get(account.id)?.entry ?? null);
  } catch (e) {
    failures.push(`${account.id}: ${(e as Error).message.split('\n')[0].slice(0, 160)}`);
    continue;
  }
  if (record.posting.firstPosted === null) noFirstPosting += 1;
  const n = record.nderf;
  if (n.ageBand !== null) withAgeBand += 1;
  if (n.countryAi !== null) withCountryAi += 1;
  if (n.experienceDate !== null) withSiteDate += 1;
  if (n.greysonScore !== null) withGreyson += 1;
  for (const c of record.tagClaims.countries) bump(claimSources, `${c.source}${c.country === null ? ', no code' : ''}`);
  if (record.tagClaims.language !== null) {
    withLanguage += 1;
    bump(translated, record.tagClaims.language.translated);
  }
  for (const label of [n.classificationRaw.page, ...n.classificationRaw.listings]) {
    if (label !== null && classTokens(label).includes('other') && !/\bothers?\b/i.test(label)) bump(unfitLabels, label);
  }
  for (const listing of account.listings ?? []) {
    for (const place of listing.tag ? placesInTag(listing.tag) : []) if (!place.known) bump(unknownPlaces, place.raw);
  }

  record.parts.forEach((d, index) => {
    const part = account.parts[index];
    parts += 1;
    bump(precisions, d.backgroundDate.precision);
    for (const f of d.backgroundDate.flags) bump(dateFlags, f);
    bump(forms, d.questionnaire.form);
    if (d.questionnaire.flags.length > 0) formFlagged += 1;
    if (d.questionnaire.form === 'A' && !part.qa.some((x) => itemOf(x.question) === 'checklist')) formANothingTicked += 1;
    for (const [name, f] of Object.entries({ ...d.beingItems, ...d.provenanceItems, ...d.religionField })) tally(name, f);
    tally('lifeThreat', d.lifeThreat);
    if (d.lifeThreat.status === 'present') {
      if (d.lifeThreat.value.answer === null) lifeThreatNoAnswer += 1;
      if (d.lifeThreat.value.severity === null) lifeThreatNoSeverity += 1;
    }
    for (const q of new Set(part.qa.map((x) => normalizeLabel(x.question)))) {
      if (itemOf(q) === null && LOOKS_TRACKED.test(q) && !NOT_TRACKED.test(q)) bump(unmatched, q);
    }
  });
}

console.log(`${accounts.length} accounts, ${parts} parts; ${failures.length} accounts whose record fails the schema.`);
for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
console.log('\nQuestionnaire form:');
for (const form of ['none', 'A', 'B', 'C', 'D', 'E', 'F', 'irregular']) console.log(`  ${form.padEnd(10)} ${String(forms.get(form) ?? 0).padStart(5)}`);
console.log(`\n${formANothingTicked} form A parts have nothing ticked on the checklist; ${formFlagged} form B parts are flagged as possibly form C with nothing ticked.`);
console.log('\nItem                          asked  blank  unrecognized');
for (const [name, t] of items) {
  console.log(`  ${name.padEnd(27)} ${String(t.asked).padStart(5)}  ${String(t.blank).padStart(5)}  ${String(t.unrecognized).padStart(5)}  (${((100 * t.unrecognized) / Math.max(1, t.asked - t.blank)).toFixed(1)}%)`);
}
console.log(`\nLife-threat item: ${lifeThreatNoAnswer} answered with no leading Yes, No, or Uncertain; ${lifeThreatNoSeverity} with no severity option.`);
console.log(`\nExperience date, by precision: ${list(precisions)}.`);
console.log(`Date flags: ${list(dateFlags)}.`);
console.log(`${noFirstPosting} accounts have no usable posting date.`);
console.log(`\nSearch site: ${entries.length} entries; ${matches.size} accounts matched (${list(matchedBy)}). Of all accounts, ${withAgeBand} have an age band, ${withCountryAi} an AI-inferred country, ${withSiteDate} a search-site experience date, and ${withGreyson} a Greyson score.`);
console.log(`Country claims by source: ${list(claimSources)}.`);
console.log(`${withLanguage} accounts have a language tag (translated: ${list(translated)}).`);
console.log(`Classification labels that fit no rule (NDERF's wording): ${list(unfitLabels)}.`);
console.log(`Places named in tags that aren't in the table: ${list(unknownPlaces)}.`);
console.log('\nQuestion wordings that look like a tracked item but match no pattern:');
for (const [q, k] of [...unmatched].sort((a, b) => b[1] - a[1])) console.log(`  ${String(k).padStart(4)}  ${q.slice(0, 170)}`);
