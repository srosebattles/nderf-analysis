import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfessionalKind, type Encounter, type Tradition } from '../codebook-schema.ts';
import { MARIAN_TABLE, marianItems, marianMismatch, tableColumns } from './marian.ts';

// Only the fields marianItems reads; the rest of an Encounter doesn't matter here.
const encounter = (o: { titles?: string[]; content?: { kind: string; words: string }[]; rosarySeen?: boolean }) =>
  ({
    identity: (o.titles ?? []).length ? [{ category: 'mary', words: o.titles }] : [{ category: 'being_of_light', words: ['a light'] }],
    confessionalContent: o.content ?? [],
    visualDetails: o.rosarySeen ? [{ feature: 'rosary', senses: ['seen'] }] : [],
  }) as unknown as Encounter;
const ids = (e: Encounter) => marianItems(e).matched.map((m) => m.id).sort();
const lutheran: Tradition = { family: 'protestant', protestantFamily: 'lutheran', body: null };
const baptist: Tradition = { family: 'protestant', protestantFamily: 'baptist', body: null };

test('the table: unique ids, and one entry for each content kind it classifies', () => {
  assert.equal(new Set(MARIAN_TABLE.map((e) => e.id)).size, MARIAN_TABLE.length);
  for (const kind of ConfessionalKind.options.filter((k) => k !== 'apparition_title' && k !== 'other_devotion')) {
    assert.equal(MARIAN_TABLE.filter((e) => e.match.kind === 'content' && e.match.contentKind === kind).length, 1, kind);
  }
});

test('titles match whole words, every matching entry counts, and the rest is unclassified', () => {
  assert.deepEqual(ids(encounter({ titles: ['Our Lady of  Guadalupe'] })), ['guadalupe', 'our_lady']);
  assert.deepEqual(ids(encounter({ titles: ['the Blessed Virgin Mary'] })), ['blessed_virgin', 'mary']);
  assert.deepEqual(ids(encounter({ titles: ['Theotokos'] })), ['mother_of_god']);
  assert.deepEqual(marianItems(encounter({ titles: ['the Immaculate'] })).unclassified, ['the Immaculate']);
  assert.deepEqual(ids(encounter({ titles: ['Marylou'] })), []); // not the word "Mary"
  // Content counts on any encounter, and a rosary seen counts as rosary content.
  assert.deepEqual(ids(encounter({ content: [{ kind: 'intercedes', words: 'she prays for you' }], rosarySeen: true })), ['intercedes', 'rosary']);
  assert.deepEqual(marianItems(encounter({ content: [{ kind: 'other_devotion', words: 'a holy medal' }] })).unclassified, ['a holy medal']);
});

test('mismatch: by tradition, both views, and only when every candidate column rejects', () => {
  const both = (e: Encounter, t: Tradition) =>
    (['confessional', 'lived'] as const).map((v) => marianMismatch(marianItems(e), tableColumns(t), v));
  assert.deepEqual(both(encounter({ titles: ['the Blessed Virgin Mary'] }), baptist), ['mismatch', 'mismatch']);
  assert.deepEqual(both(encounter({ titles: ['the Blessed Virgin Mary'] }), lutheran), ['compatible', 'compatible']);
  assert.deepEqual(both(encounter({ content: [{ kind: 'intercedes', words: 'she prays for you' }] }), lutheran), ['compatible', 'compatible']);
  assert.deepEqual(both(encounter({ content: [{ kind: 'invoked', words: 'I asked her prayers' }] }), lutheran), ['mismatch', 'mismatch']);
  assert.deepEqual(both(encounter({ titles: ['the Ever-Virgin'] }), lutheran), ['compatible', 'mismatch']);
  assert.deepEqual(both(encounter({ titles: ['Maryam'] }), { family: 'muslim', branch: null, detail: null }), ['compatible', 'compatible']);
  assert.deepEqual(both(encounter({ titles: ['Our Lady of Zeitoun'] }), { family: 'orthodox', branch: null }), ['compatible', 'compatible']);
  assert.deepEqual(both(encounter({ titles: ['Our Lady of Lourdes'] }), { family: 'orthodox', branch: null }), ['mismatch', 'mismatch']);
  assert.deepEqual(both(encounter({ titles: ['Mary'] }), { family: 'hindu', detail: null }), ['not_applicable', 'not_applicable']);
  // Unclassified titles never make a mismatch.
  assert.deepEqual(both(encounter({ titles: ['the Immaculate'] }), baptist), ['compatible', 'compatible']);
});
