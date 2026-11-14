// Turns the coder's quotes into character offsets (DECISIONS.md, Conventions: "The LLM returns a
// short quote; the pipeline locates it, stores the offsets, and drops the quote. A quote that
// can't be found fails validation, which catches invented evidence.")
//
// Offsets are [start, end) into the narrative, or into the questionnaire item's response, as
// the scraper parsed them. A quote matches whatever the spacing, letter case, or style of
// quotation marks, apostrophes, and dashes; otherwise it must be exact.

import type { ScrapedAccount } from '../derive/input.ts';

type Place = { kind: 'narrative'; part: number } | { kind: 'qa'; part: number; qaIndex: number };

const FOLD: Record<string, string> = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-' };

/** The text reduced for matching, with each reduced character's position in the original. */
function reduce(text: string): { reduced: string; at: number[] } {
  let reduced = '';
  const at: number[] = [];
  let space = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c)) {
      space = reduced.length > 0;
      continue;
    }
    if (space) {
      reduced += ' ';
      at.push(i);
      space = false;
    }
    reduced += (FOLD[c] ?? c).toLowerCase();
    at.push(i);
  }
  return { reduced, at };
}

export function placeText(account: ScrapedAccount, place: Place): string | null {
  const part = account.parts[place.part];
  if (!part) return null;
  if (place.kind === 'narrative') return part.narrative;
  return part.qa[place.qaIndex]?.response ?? null;
}

/** The [start, end) offsets of a quote in a text, or null. With `from`, the search starts there. */
export function findQuote(text: string, quote: string, from = 0): [number, number] | null {
  const t = reduce(text);
  const q = reduce(quote).reduced;
  if (q === '') return null;
  const startAt = t.at.findIndex((i) => i >= from);
  if (startAt < 0) return null;
  const k = t.reduced.indexOf(q, startAt);
  if (k < 0) return null;
  return [t.at[k], t.at[k + q.length - 1] + 1];
}

const placeName = (p: Place) => (p.kind === 'narrative' ? `narrative:${p.part}` : `qa:${p.part}:${p.qaIndex}`);
const isPlace = (v: unknown): v is Place =>
  !!v && typeof v === 'object' && ((v as Place).kind === 'narrative' || (v as Place).kind === 'qa') && Number.isInteger((v as Place).part);

/** Replaces every quote in a coder's answer with offsets: evidence `{ source, quote, basis }`
 *  becomes `{ source, span, basis }`, and text that isn't the experiencer's
 *  `{ source, startQuote, endQuote, kind }` becomes `{ source, span, kind }`. Returns the problems
 *  for any quote that can't be found, worded for the coder's retry. */
export function locateQuotes(value: unknown, account: ScrapedAccount): { value: unknown; problems: string[] } {
  const problems: string[] = [];
  const walk = (node: unknown, path: string): unknown => {
    if (Array.isArray(node)) return node.map((x, i) => walk(x, `${path}.${i}`));
    if (!node || typeof node !== 'object') return node;
    const o = node as Record<string, unknown>;
    if (isPlace(o.source) && (typeof o.quote === 'string' || typeof o.startQuote === 'string')) {
      const text = placeText(account, o.source);
      const where = placeName(o.source);
      if (text === null) {
        problems.push(`${path.slice(1)}: there is no ${where} in this account`);
        return o;
      }
      if (typeof o.quote === 'string') {
        const span = findQuote(text, o.quote);
        if (!span) problems.push(`${path.slice(1)}: the quote ${JSON.stringify(o.quote)} isn't in ${where}; copy the words exactly`);
        const { quote: _q, ...rest } = o;
        return span ? { source: rest.source, span, ...Object.fromEntries(Object.entries(rest).filter(([k]) => k !== 'source')) } : o;
      }
      const start = findQuote(text, String(o.startQuote));
      const end = start ? findQuote(text, String(o.endQuote), start[0]) : null;
      if (!start || !end) {
        problems.push(`${path.slice(1)}: the opening or closing words aren't in ${where} in that order; copy them exactly`);
        return o;
      }
      const { startQuote: _s, endQuote: _e, ...rest } = o;
      return { source: rest.source, span: [start[0], end[1]], ...Object.fromEntries(Object.entries(rest).filter(([k]) => k !== 'source')) };
    }
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v, `${path}.${k}`)]));
  };
  return { value: walk(value, ''), problems };
}
