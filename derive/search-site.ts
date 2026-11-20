// The search site's own fields for the accounts it lists (about the newest thousand): NDERF's
// age band, its AI-inferred country, the experience date, the questionnaire's form version, and
// the Greyson score. All are NDERF's editorial layer, kept as inputs (DECISIONS.md,
// Conventions). The site's snippet of each account and its summary are never read.

import type { CountryClaim, NderfAgeBand, NderfEditorial } from '../schema/codebook-schema.ts';
import { NderfAgeBand as AgeBands } from '../schema/codebook-schema.ts';
import { countryCode } from './editorial.ts';
import type { ScrapedAccount, SearchEntry } from './input.ts';

const DAY_MS = 864e5;
/** The scraper's own window for matching an entry to a static listing by name. */
const MATCH_WINDOW_DAYS = 365;

const https = (url: string | null | undefined) => (url ?? '').trim().replace(/^http:/, 'https:');
const isoDay = (s: string | null | undefined) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const entryNumbers = (e: SearchEntry) => [e.ENTRYNUM, ...(e.experiences ?? []).map((x) => x.ENTRYNUM)].map(Number).filter((n) => Number.isFinite(n));
const entryPosted = (e: SearchEntry) => isoDay(e.POSTDATE?.find((d) => isoDay(d) !== null)) ?? isoDay(e.experiences?.find((x) => isoDay(x.POSTDATE) !== null)?.POSTDATE);
const numbersInUrl = (url: string) => (url.match(/[_/](\d{3,})(?:\.html?)?\/?$/) ?? []).slice(1).map(Number);

/** Days between an entry's posting and the account's nearest posting; Infinity when either is unknown. */
function postingGap(account: ScrapedAccount, entry: SearchEntry): number {
  const posted = entryPosted(entry);
  if (posted === null) return Infinity;
  return Math.min(Infinity, ...(account.posted_dates ?? []).map((d) => Math.abs(Date.parse(d) - Date.parse(posted)) / DAY_MS));
}

export type MatchKind = 'url' | 'number';
export interface SearchMatch { entry: SearchEntry; by: MatchKind }

/** Matches each account to at most one search-site entry:
 *  1. by URL, when the entry links to the account's own page;
 *  2. otherwise by number, when exactly one account carries one of the entry's numbers (in a
 *     listing, its URL, or the scraper's record of it) and their postings are at most 365 days
 *     apart. The two sites' numbers don't always line up, so a number alone isn't enough.
 *  Matching by name, as the scraper does to find accounts the archive is missing, isn't used:
 *  it's for finding pages, not for attaching NDERF's fields to one. An account with several
 *  entries keeps a URL match over a number match, then the entry posted closest to it. */
export function matchSearchEntries(accounts: readonly ScrapedAccount[], entries: readonly SearchEntry[]): Map<string, SearchMatch> {
  const byUrl = new Map(accounts.filter((a) => a.url).map((a) => [https(a.url), a]));
  const byNumber = new Map<number, Set<ScrapedAccount>>();
  for (const a of accounts) {
    const numbers = [
      ...(a.listings ?? []).flatMap((l) => l.nderf_numbers ?? []),
      ...numbersInUrl(a.url ?? ''),
      ...(a.search_listing?.entry_number !== undefined ? [a.search_listing.entry_number] : []),
    ];
    for (const n of new Set(numbers)) {
      const set = byNumber.get(n) ?? new Set<ScrapedAccount>();
      set.add(a);
      byNumber.set(n, set);
    }
  }
  const matches = new Map<string, SearchMatch & { gap: number }>();
  const keep = (account: ScrapedAccount, entry: SearchEntry, by: MatchKind) => {
    const gap = postingGap(account, entry);
    const held = matches.get(account.id);
    const better = !held || (by === 'url' && held.by === 'number') || (by === held.by && gap < held.gap);
    if (better) matches.set(account.id, { entry, by, gap });
  };
  for (const entry of entries) {
    const linked = byUrl.get(https(entry.URL));
    if (linked) {
      keep(linked, entry, 'url');
      continue;
    }
    const candidates = new Set(entryNumbers(entry).flatMap((n) => [...(byNumber.get(n) ?? [])]));
    if (candidates.size !== 1) continue;
    const [account] = candidates;
    if (postingGap(account, entry) <= MATCH_WINDOW_DAYS) keep(account, entry, 'number');
  }
  return new Map([...matches].map(([id, { entry, by }]) => [id, { entry, by }]));
}

/** The editorial fields the search site gives. The search-app page's own quick facts, when
 *  there are any, come first. */
export function searchSiteFields(
  entry: SearchEntry | null,
  quickFacts: Record<string, string> | null = null,
): Pick<NderfEditorial, 'ageBand' | 'countryAi' | 'experienceDate' | 'formVersion' | 'greysonScore'> {
  const band = (s: string | null | undefined): NderfAgeBand | null => {
    const parsed = AgeBands.safeParse(s?.trim());
    return parsed.success ? parsed.data : null;
  };
  const country = entry?.COUNTRY_AI?.trim();
  const version = entry?.form_version?.trim();
  const greyson = entry?.metadata?.greyson;
  return {
    ageBand: band(quickFacts?.['Age']) ?? band(entry?.AGE),
    countryAi: country ? country : null,
    experienceDate: isoDay(entry?.EXPDATE?.find((d) => isoDay(d) !== null)) ?? isoDay(entry?.experiences?.find((x) => isoDay(x.EXPDATE) !== null)?.EXPDATE),
    formVersion: version === '1.0' || version === '1.1' ? version : null,
    greysonScore: typeof greyson === 'number' && Number.isInteger(greyson) && greyson >= 0 && greyson <= 32 ? greyson : null,
  };
}

/** Values that name no place: blanks, "unknown", and single letters (the site truncates some). */
const NO_PLACE = /^(|unknown|n\/a|\p{L})$/iu;

/** Country claims from the search-app page's quick facts and the search site's AI-inferred
 *  country, which rank below the experiencer's own words and NDERF's tags (DECISIONS.md,
 *  area 1). Both are kept as given; a name that maps to no one country (a town, a former
 *  country) keeps a null code. */
export function searchSiteCountryClaims(account: ScrapedAccount, entry: SearchEntry | null): CountryClaim[] {
  const claims: CountryClaim[] = [];
  const quick = account.quick_facts?.['Country']?.trim();
  if (quick && !NO_PLACE.test(quick)) {
    claims.push({ country: countryCode(quick), raw: quick, role: 'unspecified', source: 'nderf_quick_facts', evidence: [{ source: { kind: 'quick_facts', field: 'Country' }, basis: 'explicit' }] });
  }
  const ai = entry?.COUNTRY_AI?.trim();
  if (ai && !NO_PLACE.test(ai)) {
    claims.push({ country: countryCode(ai), raw: ai, role: 'unspecified', source: 'nderf_country_ai', evidence: [{ source: { kind: 'search_listing', field: 'COUNTRY_AI' }, basis: 'inferred' }] });
  }
  return claims;
}
