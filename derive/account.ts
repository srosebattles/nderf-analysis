// One derived record per account (codebook-schema.ts, DerivedRecord), by rule and with no model:
// the questionnaire, dates, NDERF's editorial layer, and the claims in NDERF's tags, for every
// part. The Jesus keyword counts are left null; they, and area 4's word-rule counts, run only
// after the codebook is frozen.

import { DerivedRecord, type Lengths } from '../schema/codebook-schema.ts';
import { deriveBackground, derivePosting } from './dates.ts';
import { deriveEditorial, deriveTagClaims } from './editorial.ts';
import type { ScrapedAccount, SearchEntry } from './input.ts';
import { deriveQuestionnaire } from './questionnaire.ts';
import { searchSiteCountryClaims } from './search-site.ts';

/** Bumped whenever a rule here changes what a record holds. */
export const DERIVE_VERSION = '0.1';

const sum = (lengths: Lengths[]): Lengths => ({
  narrativeWords: lengths.reduce((n, l) => n + l.narrativeWords, 0),
  questionnaireFreeTextWords: lengths.reduce((n, l) => n + l.questionnaireFreeTextWords, 0),
  totalWords: lengths.reduce((n, l) => n + l.totalWords, 0),
});

/** `entry` is the account's search-site entry, if matchSearchEntries found one. The record is
 *  validated against the schema; a record that fails throws. */
export function deriveAccount(account: ScrapedAccount, entry: SearchEntry | null = null, deriveVersion = DERIVE_VERSION): DerivedRecord {
  const quickFacts = account.quick_facts ?? null;
  const posting = derivePosting(account.posted_dates ?? [], account.fetched_at ?? null, quickFacts);
  const parts = account.parts.map((part, index) => {
    const { questionnaire, lifeThreat, beingItems, provenanceItems, religionField, lengths } = deriveQuestionnaire(part, index, posting.firstPosted);
    // Quick facts are the search-app page's own, so they stand in only for its first part.
    const { backgroundDate, gender } = deriveBackground(part, posting.firstPosted, index === 0 ? quickFacts : null);
    return { index, questionnaire, lifeThreat, beingItems, provenanceItems, jesusKeywordHits: null, backgroundDate, gender, religionField, lengths };
  });
  const tags = deriveTagClaims(account);
  return DerivedRecord.parse({
    accountId: account.id,
    sourceSha256: account.sha256,
    deriveVersion,
    nderf: deriveEditorial(account, entry),
    posting,
    parts,
    tagClaims: { countries: [...tags.countries, ...searchSiteCountryClaims(account, entry)], language: tags.language },
    lengths: sum(parts.map((p) => p.lengths)),
  });
}
