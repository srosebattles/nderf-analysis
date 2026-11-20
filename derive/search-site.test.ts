import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CountryClaim } from '../schema/codebook-schema.ts';
import type { ScrapedAccount, SearchEntry } from './input.ts';
import { matchSearchEntries, searchSiteCountryClaims, searchSiteFields } from './search-site.ts';

// Invented accounts and entries.
const SITE = 'https://www.nderf.org';
const account = (id: string, over: Partial<ScrapedAccount> = {}): ScrapedAccount => ({
  id, sha256: null, parts: [], url: `${SITE}/Experiences/${id}.htm`, posted_dates: ['2023-05-01'], listings: [], ...over,
});
const entry = (over: Partial<SearchEntry>): SearchEntry => ({ ENTRYNUM: 0, POSTDATE: ['2023-05-02T00:00:00.000Z'], ...over });

test('an entry matches the account whose page it links to', () => {
  const a = account('1example_x_nde');
  const m = matchSearchEntries([a, account('1example_y_nde')], [entry({ ENTRYNUM: 31234, URL: `${SITE.replace('https', 'http')}/Experiences/1example_x_nde.htm` })]);
  assert.deepEqual([...m.keys()], ['1example_x_nde']);
  assert.equal(m.get('1example_x_nde')?.by, 'url');
});

test('otherwise by number, only when one account has it and the postings are within a year', () => {
  const a = account('1example_x_nde', { listings: [{ type_label: 'NDE', tag: null, nderf_numbers: [31234] }] });
  const b = account('example_z_nde_29999');
  const m = matchSearchEntries([a, b], [
    entry({ ENTRYNUM: '31234', URL: 'https://search.nderf.org/experience/31234' }),
    entry({ ENTRYNUM: 1, experiences: [{ ENTRYNUM: 29999 }] }), // the number in the page's own URL
  ]);
  assert.equal(m.get('1example_x_nde')?.by, 'number');
  assert.equal(m.get('example_z_nde_29999')?.by, 'number');
  // Posted more than a year apart: the numbers of the two sites don't always line up.
  assert.equal(matchSearchEntries([a], [entry({ ENTRYNUM: 31234, POSTDATE: ['2025-01-01T00:00:00.000Z'] })]).size, 0);
  // Two accounts with the number: no match.
  const twin = account('1example_w_nde', { listings: [{ type_label: 'NDE', tag: null, nderf_numbers: [31234] }] });
  assert.equal(matchSearchEntries([a, twin], [entry({ ENTRYNUM: 31234 })]).size, 0);
});

test('an account with several entries keeps a link over a number, then the closest posting', () => {
  const a = account('1example_x_nde', { listings: [{ type_label: 'NDE', tag: null, nderf_numbers: [31234] }] });
  const byNumber = entry({ ENTRYNUM: 31234, AGE: 'Adult' });
  const byUrl = entry({ ENTRYNUM: 9, URL: a.url, AGE: 'Older', POSTDATE: ['2023-11-01T00:00:00.000Z'] });
  assert.equal(matchSearchEntries([a], [byNumber, byUrl]).get(a.id)?.entry, byUrl);
  const far = entry({ ENTRYNUM: 31234, POSTDATE: ['2023-12-01T00:00:00.000Z'] });
  assert.equal(matchSearchEntries([a], [far, byNumber]).get(a.id)?.entry, byNumber);
});

test('the fields the search site gives, with the page\'s quick facts first', () => {
  const e = entry({ AGE: 'College Age', COUNTRY_AI: ' Canada ', form_version: '1.1', EXPDATE: [null, '2019-03-14T00:00:00.000Z'], metadata: { greyson: 17 } });
  assert.deepEqual(searchSiteFields(e), { ageBand: 'College Age', countryAi: 'Canada', experienceDate: '2019-03-14', formVersion: '1.1', greysonScore: 17 });
  assert.equal(searchSiteFields(e, { Age: 'Older' }).ageBand, 'Older');
  assert.deepEqual(searchSiteFields(entry({ AGE: 'Grown-up', COUNTRY_AI: '', form_version: '2.0', metadata: { greyson: 40 } })), {
    ageBand: null, countryAi: null, experienceDate: null, formVersion: null, greysonScore: null,
  });
  assert.deepEqual(searchSiteFields(null), { ageBand: null, countryAi: null, experienceDate: null, formVersion: null, greysonScore: null });
});

test('country claims from quick facts and the AI-inferred country, ranked by their source', () => {
  const claims = searchSiteCountryClaims(account('search-1', { quick_facts: { Country: 'United Kingdom' } }), entry({ COUNTRY_AI: 'Russian Federation' }));
  assert.ok(claims.every((c) => CountryClaim.safeParse(c).success));
  assert.deepEqual(claims.map((c) => [c.source, c.raw, c.country, c.role, c.evidence[0].basis]), [
    ['nderf_quick_facts', 'United Kingdom', 'GB', 'unspecified', 'explicit'],
    ['nderf_country_ai', 'Russian Federation', 'RU', 'unspecified', 'inferred'],
  ]);
  const code = (ai: string) => searchSiteCountryClaims(account('1example_x_nde'), entry({ COUNTRY_AI: ai })).map((c) => c.country);
  assert.deepEqual(code('Texas'), ['US']); // a US state
  assert.deepEqual(code('Serbia and Montenegro'), [null]); // no longer one country
  assert.deepEqual(code('U'), []); // a truncated value names no place
  assert.deepEqual(code('Unknown'), []);
});
