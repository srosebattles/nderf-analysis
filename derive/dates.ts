// Dates and gender for the derived file, by rule: the experience date a person entered under
// Background Information (free text in many formats), NDERF's posting dates, and the gender field.
// Nothing here reads the narrative or an answer.

import { type ParsedDate, MAX_COPIED_WORDS, type Posting } from '../schema/codebook-schema.ts';
import type { ScrapedPart } from './input.ts';

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** Lowercase, with accents removed, so "février" and "fevrier" compare alike. */
const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// ─── Month and season names ─────────────────────────────────────────────────────────────

/** English names and abbreviations, and the names in the languages most accounts were
 *  translated from, since a translated page sometimes keeps the date as it was written. */
const MONTH_NAMES: readonly (readonly string[])[] = [
  ['january', 'jan', 'enero', 'janvier', 'januari', 'januar', 'gennaio', 'janeiro'],
  ['february', 'feb', 'febrero', 'fevrier', 'februari', 'februar', 'febbraio', 'fevereiro'],
  ['march', 'mar', 'marzo', 'mars', 'maart', 'marz', 'maerz', 'marco'],
  ['april', 'apr', 'abril', 'avril', 'aprile'],
  ['may', 'mayo', 'mai', 'mei', 'maggio', 'maio'],
  ['june', 'jun', 'junio', 'juin', 'juni', 'giugno', 'junho'],
  ['july', 'jul', 'julio', 'juillet', 'juli', 'luglio', 'julho'],
  ['august', 'aug', 'agosto', 'aout', 'augustus'],
  ['september', 'sep', 'sept', 'septiembre', 'setiembre', 'septembre', 'settembre', 'setembro'],
  ['october', 'oct', 'octubre', 'octobre', 'oktober', 'ottobre', 'outubro'],
  ['november', 'nov', 'noviembre', 'novembre', 'novembro'],
  ['december', 'dec', 'diciembre', 'decembre', 'dezember', 'dicembre', 'dezembro'],
];
const MONTHS = new Map(MONTH_NAMES.flatMap((names, i) => names.map((n) => [n, i + 1] as const)));
const SEASONS = new Set(['spring', 'summer', 'fall', 'autumn', 'winter']);

/** Words that make a bare year approximate: "about 1985", "the late 1970s", "1985?". */
const APPROXIMATE = /\b(circa|ca|about|around|approx\w*|roughly|early|mid|late|maybe|probably|sometime|somewhere|or so|i think|not sure|unsure|guess\w*|estimate\w*)\b|[~?]|\d{2}\s?'?s\b/;

const FIRST_YEAR = 1900;
const isYear = (n: number, latest: number) => n >= FIRST_YEAR && n <= latest;
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// ─── The experience date ────────────────────────────────────────────────────────────────

type Flag = ParsedDate['flags'][number];

/** Parses the Background date as written. `firstPosted` (an ISO date) bounds it: an experience
 *  can't come after its page was posted, which settles two-digit years and flags a date that
 *  does. Conventions, each of which a flag records:
 *  - "3/4/1990" is read month first, as NDERF's forms are American, and flagged ambiguous; a
 *    first number over twelve makes it day first, and so does a month-first reading that would
 *    fall after the posting when the day-first reading doesn't.
 *  - A zero day or month ("09/00/2013") means that part wasn't given.
 *  - A span ("1979-1980", "1979 or 1980") takes its first year, as approximate. Several dates
 *    ("1975 & 2004") usually mean several episodes: the earliest year is kept and the coder
 *    dates each episode from the text.
 *  - Text with no year that can be read stays unparsed; nothing is guessed. */
export function parseExperienceDate(written: string | null | undefined, firstPosted: string | null = null): ParsedDate {
  const empty = { year: null, month: null, day: null } as const;
  const cleaned = squash(written ?? '');
  if (cleaned === '') return { raw: null, ...empty, precision: 'none', flags: [] };

  const flags = new Set<Flag>();
  const raw = wordCount(cleaned) <= MAX_COPIED_WORDS ? cleaned : null;
  if (raw === null) flags.add('raw_omitted');
  const postedYear = firstPosted ? Number(firstPosted.slice(0, 4)) : null;
  const latestYear = postedYear ?? new Date().getUTCFullYear();
  const text = plain(cleaned).replace(/^['"‘’“”]+|['"‘’“”]+$/g, '').replace(/(\d)(st|nd|rd|th)\b/g, '$1');

  /** A two-digit year is the latest century that doesn't put the experience after the posting. */
  const fullYear = (yy: number): number => {
    flags.add('two_digit_year');
    const recent = 2000 + yy;
    return recent <= latestYear ? recent : 1900 + yy;
  };

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  let season = false;

  const years = [...text.matchAll(/(?<!\d)(\d{4})(?!\d)/g)].map((m) => ({ value: Number(m[1]), index: m.index })).filter((y) => isYear(y.value, 2100));
  const distinctYears = [...new Set(years.map((y) => y.value))];
  // "3/4/1990", "3-4-90", "3.4.1990"; or the whole field as three numbers with spaces, "3 4 90".
  const numeric =
    text.match(/(?<!\d)(\d{1,2})\s?[\/\-.]\s?(\d{1,2})\s?[\/\-.]\s?(\d{4}|\d{2})(?!\d)/) ?? text.match(/^(\d{1,2}) (\d{1,2}) (\d{4}|\d{2})$/);
  // Run together with no separators: "10071954", "20040319", "072413".
  const compact = text.match(/^(\d{8}|\d{6})$/)?.[1] ?? null;
  const iso = text.match(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
  const monthYear = text.match(/(?<!\d)(\d{1,2})\s?[\/\-.]\s?(\d{4})(?!\d)/);
  const monthShortYear = text.match(/^(\d{1,2})\s?[\/\-.]\s?(\d{2})$/);
  const tokens = text.match(/\d+|[a-z]+/g) ?? [];
  const monthAt = tokens.findIndex((t) => MONTHS.has(t));

  if (distinctYears.length > 1) {
    // A span, or several dates. What sits between the first two years tells them apart.
    const [a, b] = years;
    const between = text.slice(a.index + 4, b.index).trim();
    const span = /^(-|–|—|\/|to|or|through|thru|until)$/.test(between) || (between === 'and' && /\bbetween\b/.test(text.slice(0, a.index)));
    flags.add(span ? 'range' : 'multiple_dates');
    year = span ? a.value : Math.min(...distinctYears);
  } else if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (compact) {
    const n = (from: number, to: number) => Number(compact.slice(from, to));
    const real = (y: number, m: number, d: number) => isYear(y, 2100) && m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m);
    if (compact.length === 8 && real(n(0, 4), n(4, 6), n(6, 8))) [year, month, day] = [n(0, 4), n(4, 6), n(6, 8)];
    else if (compact.length === 8 && real(n(4, 8), n(0, 2), n(2, 4))) [year, month, day] = [n(4, 8), n(0, 2), n(2, 4)];
    else if (compact.length === 6 && real(fullYear(n(4, 6)), n(0, 2), n(2, 4))) [year, month, day] = [fullYear(n(4, 6)), n(0, 2), n(2, 4)];
    else flags.add('unparsed');
  } else if (numeric) {
    const [a, b] = [Number(numeric[1]), Number(numeric[2])];
    year = numeric[3].length === 4 ? Number(numeric[3]) : fullYear(Number(numeric[3]));
    if (a > 12 && b > 12) flags.add('unparsed');
    else if (a > 12) [day, month] = [a, b];
    else {
      [month, day] = [a, b];
      if (b <= 12 && a !== b && a !== 0 && b !== 0) {
        flags.add('day_month_ambiguous');
        // Month first would put the experience after the posting, and day first wouldn't.
        const iso = (m: number, d: number) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (firstPosted !== null && iso(a, b) > firstPosted && iso(b, a) <= firstPosted) [month, day] = [b, a];
      }
    }
  } else if (monthAt >= 0) {
    month = MONTHS.get(tokens[monthAt]) ?? null;
    const numbers = tokens.map((t, i) => ({ value: Number(t), i, digits: t.length })).filter((n) => !Number.isNaN(n.value));
    const yearToken = numbers.find((n) => n.digits === 4);
    const small = numbers.filter((n) => n.digits <= 2);
    // The day is the one- or two-digit number next to the month name, after it or before it.
    // "14th of March" and "14 de marzo" put one small word between them.
    const before = ['of', 'de', 'du'].includes(tokens[monthAt - 1] ?? '') ? monthAt - 2 : monthAt - 1;
    const isDay = (n: { value: number }) => n.value >= 1 && n.value <= 31;
    const dayToken = small.find((n) => n.i === monthAt + 1 && isDay(n)) ?? small.find((n) => n.i === before && isDay(n));
    if (yearToken) {
      year = yearToken.value;
      day = dayToken?.value ?? null;
    } else {
      // No four-digit year: a small number that isn't the day is the year ("June 5 87",
      // "September of 08"), as is one too large to be a day ("June 87").
      const yy = small.find((n) => n !== dayToken) ?? small.find((n) => n.value > 31);
      if (yy) {
        year = fullYear(yy.value);
        day = dayToken && dayToken !== yy ? dayToken.value : null;
      } else {
        day = dayToken?.value ?? null;
      }
    }
  } else if (monthYear) {
    [month, year] = [Number(monthYear[1]), Number(monthYear[2])];
  } else if (monthShortYear) {
    [month, year] = [Number(monthShortYear[1]), fullYear(Number(monthShortYear[2]))];
  } else if (distinctYears.length === 1) {
    year = distinctYears[0];
    season = tokens.some((t) => SEASONS.has(t));
  } else {
    // No four-digit year at all: a decade ("the late 70's") or a season with a short year
    // ("spring of 73").
    const decade = text.match(/(?<!\d)(\d0)\s?'?s\b/);
    const short = tokens.filter((t) => /^\d{2}$/.test(t));
    if (decade) year = fullYear(Number(decade[1]));
    else if (tokens.some((t) => SEASONS.has(t)) && short.length === 1) [year, season] = [fullYear(Number(short[0])), true];
  }

  // A zero, or a number no calendar has, means that part wasn't given or can't be trusted.
  if (month !== null && (month < 1 || month > 12)) {
    if (month !== 0) flags.add('unparsed');
    [month, day] = [null, null];
  }
  if (day !== null && (month === null || year === null ? day < 1 || day > 31 : day < 1 || day > daysIn(year, month))) {
    if (day !== 0) flags.add('unparsed');
    day = null;
  }
  if (year !== null && !isYear(year, 2100)) {
    flags.add('unparsed');
    [year, month, day] = [null, null, null];
  }

  if (year === null) {
    if (month !== null) flags.add('no_year');
    else flags.add('unparsed');
    return { raw, year: null, month, day, precision: 'none', flags: [...flags] };
  }

  const approximate = APPROXIMATE.test(text) || flags.has('range');
  const precision: ParsedDate['precision'] =
    flags.has('multiple_dates') ? 'year'
    : day !== null && month !== null ? 'day'
    : month !== null ? 'month'
    : approximate ? 'approximate'
    : season ? 'season'
    : 'year';
  if (flags.has('multiple_dates') || flags.has('range')) [month, day] = [null, null];

  if (firstPosted !== null) {
    const earliest = `${String(year).padStart(4, '0')}-${String(month ?? 1).padStart(2, '0')}-${String(day ?? 1).padStart(2, '0')}`;
    if (earliest > firstPosted) flags.add('after_posting');
  }
  return { raw, year, month, day, precision, flags: [...flags] };
}

// ─── One part's Background Information ──────────────────────────────────────────────────

/** The experience date and gender as entered. The labels vary by era ("Date NDE Occurred",
 *  "Date of NDE"); search-app pages keep both under quick facts instead. A second, different
 *  date field on the same part is flagged as several dates. */
export function deriveBackground(
  part: ScrapedPart,
  firstPosted: string | null = null,
  quickFacts: Record<string, string> | null = null,
): { backgroundDate: ParsedDate; gender: string | null } {
  const fields = Object.entries(part.background ?? {});
  const dates = fields.filter(([label]) => /^date\b/i.test(label)).map(([, value]) => squash(value)).filter(Boolean);
  const written = dates[0] ?? quickFacts?.['Date Experienced'] ?? null;
  const backgroundDate = parseExperienceDate(written, firstPosted);
  if (new Set(dates).size > 1 && !backgroundDate.flags.includes('multiple_dates')) backgroundDate.flags.push('multiple_dates');
  const gender = fields.find(([label]) => /^gender\b/i.test(label))?.[1] ?? quickFacts?.['Gender'] ?? null;
  return { backgroundDate, gender: gender === null ? null : squash(gender) || null };
}

// ─── Posting dates ──────────────────────────────────────────────────────────────────────

/** NDERF's first listings are from 1998. */
export const FIRST_POSTING_YEAR = 1998;

const usDate = (s: string | undefined): string | null => {
  const m = s?.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
};

/** `postedDates` are the scraper's ISO dates from the index listings. A year before NDERF
 *  existed, or after the crawl, is a typo on the listing (one is dated 1009): it stays in
 *  allPosted as written, is flagged, and never counts as the first posting. */
export function derivePosting(postedDates: readonly string[], fetchedAt: string | null, quickFacts: Record<string, string> | null = null): Posting {
  const crawlYear = fetchedAt ? Number(fetchedAt.slice(0, 4)) : Infinity;
  const plausible = (d: string) => Number(d.slice(0, 4)) >= FIRST_POSTING_YEAR && Number(d.slice(0, 4)) <= crawlYear;
  const allPosted = [...postedDates].sort();
  return {
    firstPosted: allPosted.find(plausible) ?? null,
    allPosted,
    submitted: usDate(quickFacts?.['Date Submitted']),
    flags: allPosted.every(plausible) ? [] : ['implausible_year'],
  };
}
