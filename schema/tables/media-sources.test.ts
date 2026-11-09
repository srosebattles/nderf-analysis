import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatedEvent, Detail, MEDIA_SOURCES, MediaSource, PartialDate, cutDate, matchSources } from './media-sources.ts';
import { normalizeName } from './named-figures.ts';

const cite = (outlet: string) => ({ outlet, title: 'a review', author: null, published: '2011', url: 'https://example.org/review' });
const event = { event: 'book published', date: '2010-11', citations: [cite('A'), cite('B')], note: '' };
const detail = {
  id: 'invented-detail', label: 'x', route: 'checklist', fullMatch: 'a staircase of folded paper', partialMatch: null,
  words: [], computedRule: null, aboutBeings: false, traceability: 'x', citations: [cite('A'), cite('B')],
};
const source = {
  id: 'invented-source', title: 'x', medium: 'book', role: 'source', relatedTo: null, presentedAs: 'true', invented: false,
  firstWideAvailability: event, boosts: [], names: { titles: ['x'], people: [] }, ownNderfAccountIds: [], details: [], note: '',
};

test('dates are real years, months, or days, and a cut falls on the period\'s first day', () => {
  assert.equal(PartialDate.safeParse('2010-11').success, true);
  assert.equal(PartialDate.safeParse('2014-04-16').success, true);
  assert.equal(PartialDate.safeParse('2010-13').success, false);
  assert.equal(PartialDate.safeParse('2014-02-30').success, false);
  assert.equal(cutDate('2010-11'), '2010-11-01');
  assert.equal(cutDate('2003'), '2003-01-01');
  assert.equal(cutDate('2014-04-16'), '2014-04-16');
});

test('every date and every detail needs two independent citations', () => {
  assert.equal(DatedEvent.safeParse(event).success, true);
  assert.equal(DatedEvent.safeParse({ ...event, citations: [cite('A'), cite('A')] }).success, false);
  assert.equal(Detail.safeParse(detail).success, true);
  assert.equal(Detail.safeParse({ ...detail, citations: [cite('A')] }).success, false);
});

test('each route carries exactly what it needs', () => {
  assert.equal(Detail.safeParse({ ...detail, route: 'word_rule' }).success, false);
  assert.equal(Detail.safeParse({ ...detail, route: 'word_rule', words: ['Nebadon'] }).success, true);
  assert.equal(Detail.safeParse({ ...detail, words: ['Nebadon'] }).success, false);
  assert.equal(Detail.safeParse({ ...detail, route: 'computed' }).success, false);
  assert.equal(Detail.safeParse({ ...detail, route: 'computed', computedRule: 'someRule' }).success, true);
});

test('related works have no details, fiction is invented, and boosts come after the first date', () => {
  assert.equal(MediaSource.safeParse(source).success, true);
  assert.equal(MediaSource.safeParse({ ...source, role: 'related_work' }).success, false);
  assert.equal(MediaSource.safeParse({ ...source, role: 'related_work', relatedTo: 'y', details: [detail] }).success, false);
  assert.equal(MediaSource.safeParse({ ...source, presentedAs: 'fiction' }).success, false);
  assert.equal(MediaSource.safeParse({ ...source, boosts: [{ ...event, event: 'film', date: '2010-11' }] }).success, false);
  assert.equal(MediaSource.safeParse({ ...source, boosts: [{ ...event, event: 'film', date: '2014-04-16' }] }).success, true);
});

test('names resolve by whole words; ambiguous and unlisted names resolve to no source', () => {
  const found = (field: string) => {
    const m = matchSources(field);
    assert.ok('found' in m, `${field} should name a source`);
    return m.found;
  };
  assert.deepEqual(found('Heaven Is for Real'), ['heaven-is-for-real']);
  assert.deepEqual(found('Heaven Is for Real (2014 film)'), ['heaven-is-for-real']);
  assert.deepEqual(found('Heaven Is for Real for Kids'), ['heaven-is-for-real']);
  assert.deepEqual(found("Todd Burpo's book"), ['heaven-is-for-real']);
  assert.deepEqual(found('Akiane'), ['akiane-prince-of-peace']);
  assert.ok('ambiguous' in matchSources('Heaven Is Real'));
  assert.ok('unlisted' in matchSources('Life After Life'));
  assert.ok('unlisted' in matchSources('Heavenly Realms'));
});

test('checklist wording never names a source', () => {
  const names = MEDIA_SOURCES.flatMap((s) => [...s.names.titles, ...s.names.people]).map(normalizeName);
  for (const d of MEDIA_SOURCES.flatMap((s) => s.details).filter((d) => d.route === 'checklist')) {
    for (const wording of [d.fullMatch, d.partialMatch ?? '']) {
      const w = normalizeName(wording);
      for (const n of names) assert.ok(!new RegExp(`(?<![\\p{L}\\p{N}])${n}(?![\\p{L}\\p{N}])`, 'u').test(w), `${d.id} names "${n}"`);
    }
  }
});

test('the review view (MEDIA_SOURCES.md) matches the table', async () => {
  const fs = await import('node:fs');
  const { OUTPUT, render } = await import('../../tools/render-media-sources.ts');
  assert.equal(fs.readFileSync(OUTPUT, 'utf8'), render(), 'run: node tools/render-media-sources.ts');
});
