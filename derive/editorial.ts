// NDERF's editorial layer for the derived file, by rule: its classification of each account, its
// editor tags, and the countries and languages those tags name. All of this is NDERF's wording
// about an account, kept as an input and never as a gate (DECISIONS.md, Conventions); none of it
// is the experiencer's text.
//
// The search site's own fields (age band, AI-inferred country, and the rest) come from
// search-site.ts and are passed in.

import {
  type CountryClaim, type CountryRole, type Evidence, type LanguageClaim, type NderfClassToken, type NderfEditorial,
  NderfClassToken as ClassTokens,
} from '../schema/codebook-schema.ts';
import type { ScrapedAccount, SearchEntry } from './input.ts';
import { searchSiteFields } from './search-site.ts';

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

// ─── Classification ─────────────────────────────────────────────────────────────────────

/** What each piece of a label says, in the order the tokens are listed. NDERF writes labels by
 *  hand, so they vary ("Secondhand", "Second-hand"; "NDE-Like", "NDE-like Experience"). */
const CLASS_RULES: readonly (readonly [RegExp, NderfClassToken])[] = [
  [/nde[- ]like/, 'nde_like'],
  [/\bprobable\b.*\bndes?\b|^probable$/, 'probable_nde'],
  [/\bpossible\b.*\bndes?\b|^possible$/, 'possible_nde'],
  [/\bndes?\b/, 'nde'],
  [/\bfdes?\b/, 'fde'],
  [/\bstes?\b/, 'ste'],
  [/\badcs?\b/, 'adc'],
  [/\bshared death\b|\bsdes?\b/, 'sde'],
  [/\bshared\b/, 'shared'],
  [/second[- ]?hand/, 'secondhand'],
  [/second[- ]person/, 'second_person'],
  [/\bsobes?\b/, 'sobe'],
  [/\bobes?\b/, 'obe'],
  [/an[ae]sth?esia/, 'anesthesia'],
  [/\bdrugs?\b|ketamine|medication overdose/, 'drug'],
  [/\bdream\b/, 'dream'],
  [/\bicu\b/, 'icu'],
  [/pre-?birth|birth rememb/, 'prebirth'],
  [/\bneles?\b/, 'nele'],
  [/\bdbv\b/, 'dbv'],
  [/\bsmr\b/, 'smr'],
  [/\bprayers?\b/, 'prayer'],
  [/\bmeditation\b/, 'meditation'],
  [/\bothers?\b/, 'other'],
];

/** The tokens one raw label carries: "Secondhand Probable NDE" is secondhand and probable_nde;
 *  "NDE;Drug Experience" is nde and drug. A piece that fits no rule is 'other'. */
export function classTokens(label: string): NderfClassToken[] {
  const found = new Set<NderfClassToken>();
  for (const piece of squash(label).toLowerCase().split(/\s*(?:;|,|&|\/|\band\b|\bor\b|\bvs\.?)\s*/).filter(Boolean)) {
    let matched = false;
    for (const [pattern, token] of CLASS_RULES) {
      // "NDE-like" isn't an NDE label, a shared death experience isn't just "shared", and a
      // "probable NDE" isn't also a plain one.
      if (!pattern.test(piece)) continue;
      if (token === 'nde' && /nde[- ]like|\b(probable|possible)\b/.test(piece)) continue;
      if (token === 'shared' && /\bshared death\b/.test(piece)) continue;
      if (token === 'obe' && /\bsobes?\b/.test(piece)) continue;
      found.add(token);
      matched = true;
    }
    if (!matched) found.add('other');
  }
  return ClassTokens.options.filter((t) => found.has(t));
}

/** A label that offers alternatives: "NDE vs. Dream", "NDE or FDE". */
const isHedged = (label: string) => /\bvs\.?(\s|$)|\bor\b/i.test(label);

const CONTENT_WARNING = /trigger warning|reader discretion|\bcaution\b|disturbing|mature readers|graphic|adult content|\bwarning\b/i;
const NON_WESTERN = /non-?\s?western/i;

/** `entry` is the account's search-site entry, if it has one (matchSearchEntries). */
export function deriveEditorial(account: ScrapedAccount, entry: SearchEntry | null = null): NderfEditorial {
  const listings = (account.listings ?? []).map((l) => l.type_label).filter((l): l is string => l !== null && squash(l) !== '');
  const searchSite = account.search_listing?.classification ?? [];
  const page = account.page_classification ? squash(account.page_classification) : null;
  const labels = [...(page ? [page] : []), ...listings, ...searchSite];
  const tokens = new Set(labels.flatMap(classTokens));
  const site = searchSiteFields(entry, account.quick_facts ?? null);
  const tagsRaw = [...new Set((account.listings ?? []).map((l) => l.tag).filter((t): t is string => t !== null && squash(t) !== '').map(squash))];
  return {
    classificationRaw: { page, listings, searchSite },
    classificationTokens: ClassTokens.options.filter((t) => tokens.has(t)),
    classificationHedged: labels.some(isHedged),
    exceptional: account.exceptional === true,
    tagsRaw,
    contentWarning: tagsRaw.some((t) => CONTENT_WARNING.test(t)),
    nonWesternLabel: tagsRaw.some((t) => NON_WESTERN.test(t)),
    ...site,
    greysonScore: account.greyson_score ?? site.greysonScore,
    experienceDate: site.experienceDate ?? account.search_listing?.experienced?.find((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) ?? null,
  };
}

// ─── Countries named in tags ────────────────────────────────────────────────────────────

/** Every place NDERF names, as NDERF spells it (misspellings included), to ISO 3166-1: in its
 *  tags, its search app's quick facts, and its search site's AI-inferred country. A part of a
 *  country maps to the country (a US state to the US); null is a place with no single code (a
 *  former country, a town that could be in several). */
const PLACES: Readonly<Record<string, string | null>> = {
  algeria: 'DZ', algiers: 'DZ', argentina: 'AR', australia: 'AU', tasmania: 'AU', austria: 'AT', bangladesh: 'BD', belarus: 'BY',
  belgium: 'BE', bolivia: 'BO', brazil: 'BR', bulgaria: 'BG', canada: 'CA', chile: 'CL', 'easter island': 'CL', china: 'CN',
  'northern china': 'CN', colombia: 'CO', columbia: 'CO', 'costa rica': 'CR', croatia: 'HR', cuba: 'CU', cyprus: 'CY',
  'czech republic': 'CZ', 'democratic republic of congo': 'CD', denmark: 'DK', 'dominican republic': 'DO', ecuador: 'EC',
  equador: 'EC', quito: 'EC', egypt: 'EG', 'el salvador': 'SV', estonia: 'EE', ethiopia: 'ET', finland: 'FI', france: 'FR',
  'french guianna': 'GF', 'french guiana': 'GF', germany: 'DE', bavaria: 'DE', ghana: 'GH', 'ghana africa': 'GH', greece: 'GR',
  guatemala: 'GT', guatamala: 'GT', guyana: 'GY', 'hong kong': 'HK', hungary: 'HU', india: 'IN', indonesia: 'ID', iran: 'IR',
  iraq: 'IQ', ireland: 'IE', israel: 'IL', isreal: 'IL', "isr'l": 'IL', italy: 'IT', japan: 'JP', jordan: 'JO', kenya: 'KE',
  korea: 'KR', 'south korea': 'KR', kuwait: 'KW', lebanon: 'LB', libya: 'LY', lithuania: 'LT', luxembourg: 'LU', madagascar: 'MG',
  malaysia: 'MY', malta: 'MT', mexico: 'MX', mongolia: 'MN', morocco: 'MA', netherlands: 'NL', holland: 'NL', 'new zealand': 'NZ',
  nigeria: 'NG', norway: 'NO', oman: 'OM', pakistan: 'PK', palestine: 'PS', 'palestine-jerusalem': 'PS', panama: 'PA',
  paraguay: 'PY', peru: 'PE', philippines: 'PH', phillipines: 'PH', poland: 'PL', portugal: 'PT', portugual: 'PT', azores: 'PT',
  'puerto rico': 'PR', qatar: 'QA', romania: 'RO', russia: 'RU', rwanda: 'RW', 'saudi arabia': 'SA', singapore: 'SG',
  slovakia: 'SK', slovenia: 'SI', 'south africa': 'ZA', spain: 'ES', 'canary islands': 'ES', sudan: 'SD', sweden: 'SE',
  switzerland: 'CH', syria: 'SY', taiwan: 'TW', thailand: 'TH', trinidad: 'TT', 'trinidad and tobago': 'TT', tunisia: 'TN',
  turkey: 'TR', uae: 'AE', 'united arab emirates': 'AE', uk: 'GB', 'united kingdom': 'GB', 'united kingsom': 'GB', england: 'GB',
  scotland: 'GB', wales: 'GB', 'great britain': 'GB', ukraine: 'UA', uruguay: 'UY', uzbekistan: 'UZ', venezuela: 'VE',
  vietnam: 'VN', yemen: 'YE', usa: 'US', 'united states': 'US',
  // Further names in the search site's AI-inferred country.
  afghanistan: 'AF', gambia: 'GM', grenada: 'GD', moldova: 'MD', nepal: 'NP', serbia: 'RS', 'isle of man': 'IM',
  'northern ireland': 'GB', 'russian federation': 'RU', 'iran, islamic republic of': 'IR',
  'united states minor outlying islands': 'UM', alabama: 'US', illinois: 'US', texas: 'US', utah: 'US',
  'netherlands antilles': null, 'serbia and montenegro': null, antarctica: null, clinton: null, mesa: null, peebles: null, silex: null,
  // Named, but no one country today.
  europe: null, czechoslovakia: null, yugoslavia: null, jerusalem: null,
};

const ROLE_WORDS: readonly (readonly [RegExp, CountryRole])[] = [
  [/^(originally|initially) from$|^born in$|^raised in$/, 'origin'],
  [/^from$/, 'unspecified'],
  [/^(living|lives|resides) in$|^moved to$/, 'residence'],
  [/^(happened|occurred) in$/, 'experience_location'],
];
const PLACE_PHRASE = /\b(originally from|initially from|from|living in|lives in|resides in|happened in|occurred in|born in|raised in|moved to)\s+(?:the\s+)?/gi;
/** Where a place name ends: punctuation, or the words that start the next thing a tag says. */
const PLACE_END = /\s*(?:[.;,(!]|\s-|\boriginal(?:ly)?\b|\btranslated\b|\bwhere\b|\bnow\b|\bliving\b|\bnarrative\b|\bin\b|\bexperience\b|\binitially\b|\bmultimedia\b|\bnon-western\b|\bbut\b|\band lives\b|\band shared\b|\bwho\b|\bcurrently\b|$)/i;

/** The ISO code for a place NDERF names, or null when it names no single country or isn't in
 *  the table. */
export const countryCode = (place: string): string | null => PLACES[place.trim().toLowerCase()] ?? null;

export interface TagPlace { raw: string; country: string | null; role: CountryRole; known: boolean }

/** The places one tag names. "From" after "translated" names a language, not a place. A name
 *  not in the table is returned as unknown, for the health check to list; it makes no claim. */
export function placesInTag(tag: string): TagPlace[] {
  const text = squash(tag).replace(/\bU\.\s?K\.?/g, 'UK').replace(/\bU\.\s?S\.?(\s?A\.?)?/g, 'USA');
  const out: TagPlace[] = [];
  for (const m of text.matchAll(PLACE_PHRASE)) {
    if (/translat\w*\s*$/i.test(text.slice(0, m.index))) continue;
    const rest = text.slice(m.index + m[0].length);
    const raw = rest.slice(0, rest.search(PLACE_END)).trim();
    if (raw === '') continue;
    const role = ROLE_WORDS.find(([pattern]) => pattern.test(m[1].toLowerCase()))?.[1] ?? 'unspecified';
    const key = raw.toLowerCase();
    out.push({ raw, country: PLACES[key] ?? null, role, known: key in PLACES });
  }
  return out;
}

// ─── Languages named in tags ────────────────────────────────────────────────────────────

/** Languages as NDERF's tags name them, to ISO 639-1. */
const LANGUAGES: Readonly<Record<string, string>> = {
  english: 'en', spanish: 'es', castellano: 'es', french: 'fr', italian: 'it', german: 'de', dutch: 'nl', portuguese: 'pt',
  chinese: 'zh', 'traditional chinese': 'zh', 'simplified chinese': 'zh', arabic: 'ar', swedish: 'sv', persian: 'fa', farsi: 'fa',
  russian: 'ru', polish: 'pl', danish: 'da', turkish: 'tr', korean: 'ko', czech: 'cs', romanian: 'ro', finnish: 'fi',
  croatian: 'hr', hrvatski: 'hr', hungarian: 'hu', tagalog: 'tl', ukrainian: 'uk', japanese: 'ja', hebrew: 'he', norwegian: 'no',
  greek: 'el', indonesian: 'id', hindi: 'hi', thai: 'th', vietnamese: 'vi', bulgarian: 'bg', serbian: 'sr', slovak: 'sk',
  slovenian: 'sl', estonian: 'et', lithuanian: 'lt', urdu: 'ur', bengali: 'bn', malay: 'ms', afrikaans: 'af', catalan: 'ca',
};
const LANGUAGE_PHRASE = /\b(?:original(?:ly)?(?: written)? in|translated from(?: the)?|narrative in|in)\s+((?:traditional |simplified )?\p{L}+)/giu;
const TRANSLATOR = /\btranslat\w*(?:\s+(?:to|into|in)\s+english)?(?:\s+from\s+\p{L}+)?\s+by\s+([^.;,()]+)/iu;

/** What one tag says about language: the original language if it names one we know, whether it
 *  says the account was translated, and the translator as NDERF names them. */
export function languageInTag(tag: string): { language: string | null; translated: boolean; translator: string | null } | null {
  const text = squash(tag);
  let language: string | null = null;
  for (const m of text.matchAll(LANGUAGE_PHRASE)) {
    const code = LANGUAGES[m[1].toLowerCase()];
    // "Translated to English" and "in English" name the language of the page, not the original.
    if (code !== undefined && !(code === 'en' && !/\b(original(?:ly)?(?: written)?|narrative) in\s*$/i.test(text.slice(0, m.index + m[0].length - m[1].length)))) {
      language = code;
      break;
    }
  }
  const translated = /\btranslat/i.test(text);
  if (language === null && !translated) return null;
  const by = text.match(TRANSLATOR)?.[1]?.trim() ?? null;
  return { language, translated, translator: by !== null && by.split(/\s+/).length <= 5 ? by : null };
}

// ─── Claims for one account ─────────────────────────────────────────────────────────────

/** Country and language claims from every listing's tag. A place counts once per role; the
 *  language claim joins what the tags say (an original language from one, a translator from
 *  another). `translated` is 'yes' only when a tag says so, 'no' only when a tag says the
 *  narrative is in English, and otherwise 'unknown': "Original in Spanish" alone doesn't say
 *  who put it into English. */
export function deriveTagClaims(account: ScrapedAccount): { countries: CountryClaim[]; language: LanguageClaim | null } {
  const countries = new Map<string, CountryClaim>();
  let language: string | null = null;
  let translated = false;
  let translator: string | null = null;
  const languageEvidence: Evidence[] = [];
  (account.listings ?? []).forEach((listing, listingIndex) => {
    if (!listing.tag) return;
    const evidence: Evidence = { source: { kind: 'tag', listingIndex }, basis: 'explicit' };
    for (const place of placesInTag(listing.tag)) {
      if (!place.known) continue;
      const key = `${place.raw.toLowerCase()}|${place.role}`;
      const claim = countries.get(key);
      if (claim) claim.evidence.push(evidence);
      else countries.set(key, { country: place.country, raw: place.raw, role: place.role, source: 'nderf_tag', evidence: [evidence] });
    }
    const said = languageInTag(listing.tag);
    if (said) {
      language ??= said.language;
      translated ||= said.translated;
      translator ??= said.translator;
      languageEvidence.push(evidence);
    }
  });
  const languageClaim: LanguageClaim | null = languageEvidence.length === 0 ? null : {
    originalLanguage: language,
    translated: translated ? 'yes' : language === 'en' ? 'no' : 'unknown',
    translator,
    source: 'nderf_tag',
    evidence: languageEvidence,
  };
  return { countries: [...countries.values()], language: languageClaim };
}
