import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Encounter } from '../codebook-schema.ts';
import { encounterIconography, figureGroup, pointsTo } from './visual-features.ts';

const claim = (category: string, o: object = {}) => ({ category, name: null, certainty: 'asserted', ...o });
const enc = (claims: object[], details: [string, string?][] = []) =>
  ({
    identity: claims,
    visualDetails: details.map(([feature, flowerKind]) => ({ feature, flowerKind: flowerKind ?? null, senses: ['seen'] })),
  }) as unknown as Encounter;

test('the most specific claim decides the figure; resemblance-only claims do not count', () => {
  assert.equal(figureGroup(enc([claim('being_of_light'), claim('jesus', { certainty: 'hedged' })])), 'jesus');
  assert.equal(figureGroup(enc([claim('unrecognized_human'), claim('named_figure', { name: 'Francis of Assisi', certainty: 'resemblance' })])), 'unidentified');
  assert.equal(figureGroup(enc([claim('named_figure', { name: 'Shiva' })])), 'hindu_deity');
  assert.equal(figureGroup(enc([claim('named_figure', { name: 'St. George' })])), 'christian_saint');
  assert.equal(figureGroup(enc([claim('hostile_being'), claim('animal')])), 'hostile_being');
  assert.equal(figureGroup(enc([claim('family')])), 'known_person');
});

test('the same feature points to different things on different figures', () => {
  const serpent = { feature: 'serpent', flowerKind: null } as const;
  assert.equal(pointsTo('hostile_being', serpent), 'devil_scriptural');
  assert.equal(pointsTo('mary', serpent), 'mary');
  assert.equal(pointsTo('animal', serpent), 'nothing');
  assert.equal(pointsTo('unidentified', serpent), 'unclear');
  assert.equal(pointsTo('christian_saint', { feature: 'dragon', flowerKind: null }), 'christian_saint_or_clergy');
  assert.equal(pointsTo('jesus', { feature: 'rays', flowerKind: null }), 'christ');
  assert.equal(pointsTo('unidentified', { feature: 'rays', flowerKind: null }), 'holy_general');
  assert.equal(pointsTo('known_person', { feature: 'holding_infant', flowerKind: null }), 'nothing');
  assert.equal(pointsTo('known_person', { feature: 'monastic_habit', flowerKind: null }), 'nothing');
  assert.equal(pointsTo('unidentified', { feature: 'wounds', flowerKind: null }), 'christ');
  assert.equal(pointsTo('hostile_being', { feature: 'wings', flowerKind: null }), 'devil_folkloric');
});

test('flowers follow their kind', () => {
  const { details } = encounterIconography(enc([claim('mary')], [['flowers', 'rose'], ['flowers', 'lotus'], ['flowers', 'lily']]));
  assert.deepEqual(details.map((d) => d.pointsTo), ['mary', 'buddhist_or_hindu', 'nothing']);
  assert.equal(pointsTo('unidentified', { feature: 'flowers', flowerKind: 'rose' }), 'nothing');
});

test('the review view (VISUAL_FEATURES.md) matches the map', async () => {
  const fs = await import('node:fs');
  const { OUTPUT, render } = await import('../../tools/render-visual-features.ts');
  assert.equal(fs.readFileSync(OUTPUT, 'utf8'), render(), 'run: node tools/render-visual-features.ts');
});
