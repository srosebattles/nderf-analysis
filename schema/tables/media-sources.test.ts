import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatedEvent, Detail, MEDIA_SOURCES, MediaSource, PartialDate, cutDate, editDistance, matchSources, sourceById, unconfirmedDetails, wordRuleHits } from './media-sources.ts';
import { normalizeName } from './named-figures.ts';

const cite = (outlet: string) => ({ outlet, title: 'a review', author: null, published: '2011', url: 'https://example.org/review' });
const event = { event: 'book published', date: '2010-11', citations: [cite('A'), cite('B')], note: '' };
const detail = {
  id: 'invented-detail', label: 'x', route: 'checklist', fullMatch: 'a staircase of folded paper', partialMatch: null,
  words: [], neverMatch: [], computedRule: null, aboutBeings: false, traceability: 'x', citations: [cite('A'), cite('B')], pendingCheck: null,
};
const source = {
  id: 'invented-source', title: 'x', medium: 'book', role: 'source', relatedTo: null, presentedAs: 'true', invented: false,
  firstWideAvailability: event, boosts: [], names: { titles: ['x'], people: [] }, ownNderfAccountIds: [], suggestedByAccountIds: [],
  details: [], note: '',
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

test('a detail waiting for its second source may have one citation, and the freeze check lists it', () => {
  assert.equal(Detail.safeParse({ ...detail, citations: [cite('A')], pendingCheck: 'a page reference' }).success, true);
  assert.equal(Detail.safeParse({ ...detail, citations: [], pendingCheck: 'a page reference' }).success, false);
  const pending = unconfirmedDetails().map((p) => p.detailId).sort();
  assert.deepEqual(pending, ['eadie-looms', 'eadie-prayers-as-light'], 'update this list as details are confirmed; it must be empty at the freeze');
});

test('each route carries exactly what it needs', () => {
  assert.equal(Detail.safeParse({ ...detail, route: 'word_rule' }).success, false);
  assert.equal(Detail.safeParse({ ...detail, route: 'word_rule', words: ['Nebadon'] }).success, true);
  assert.equal(Detail.safeParse({ ...detail, words: ['Nebadon'] }).success, false);
  assert.equal(Detail.safeParse({ ...detail, route: 'computed' }).success, false);
  assert.equal(Detail.safeParse({ ...detail, route: 'computed', computedRule: 'someRule' }).success, false); // not a known rule
  assert.equal(Detail.safeParse({ ...detail, route: 'computed', computedRule: 'personWithBlueSkin' }).success, true);
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
  assert.deepEqual(found('Proof of Heaven by Eben Alexander'), ['proof-of-heaven']);
  assert.deepEqual(found('the Harry Potter books'), ['deathly-hallows']);
  assert.deepEqual(found('Embraced by the Light'), ['embraced-by-the-light']);
  assert.deepEqual(found('The Shack'), ['the-shack']);
  assert.deepEqual(found('Mitch Albom'), ['five-people-you-meet-in-heaven']);
  assert.deepEqual(found('The Urantia Book'), ['urantia-book']);
  assert.deepEqual(found('Kevin Malarkey'), ['boy-who-came-back-from-heaven']);
  assert.deepEqual(found('Heaven Is for Real and Proof of Heaven').sort(), ['heaven-is-for-real', 'proof-of-heaven']);
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

test('word rules: long words allow two edits, shorter words and phrases match exactly, and ordinary words never count', () => {
  assert.equal(editDistance('salvington', 'salvingtom'), 1);
  assert.equal(editDistance('nebadon', 'nebdaon'), 1); // swapped neighbors count once
  const urantia = sourceById('urantia-book')!.details[0];
  const hits = (text: string) => wordRuleHits(text, urantia);
  assert.deepEqual(hits('a voice from Salvington'), ['salvington']);
  assert.deepEqual(hits('a voice from Salvingtom'), ['salvingtom']); // one letter off, ten letters long
  assert.deepEqual(hits('a voice from Salgton'), []); // three letters off
  assert.deepEqual(hits('Havona, not Havana'), ['havona']);
  assert.deepEqual(hits('Satan and Satania'), ['satania']);
  assert.deepEqual(hits('my Thought Adjuster'), ['thought adjuster']);
  assert.deepEqual(hits('my thought adjusted itself'), []);
  assert.deepEqual(hits('midway through, the midwayers'), ['midwayers']);
  assert.deepEqual(hits('una morenita; a morontial body'), ['morontial']); // counted once, though two rule words reach it
  const earthworm = sourceById('proof-of-heaven')!.details.find((d) => d.id === 'proof-earthworm')!;
  for (const text of ["an earthworm's-eye view", 'an earthworms eye view', 'an earthworm-eye view', 'an Earthworm Eye View']) {
    assert.equal(wordRuleHits(text, earthworm).length, 1, text);
  }
  assert.deepEqual(wordRuleHits("a worm's-eye view", earthworm), []);
});

test('a practice page that suggested a source is recorded on it', () => {
  assert.deepEqual(sourceById('urantia-book')!.suggestedByAccountIds, ['1alejandro_m_nde']);
});
