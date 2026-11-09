import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Area4CodedRecord, Area4DerivedPart, CHECKLIST_ITEMS, ChecklistHit, MediaMention, WORD_RULE_DETAIL_IDS, checkAgainstMain } from './area4-schema.ts';

// Fixture account and wording are invented; 1example_x_nde exists nowhere.
const ID = '1example_x_nde';
const SHA = 'a'.repeat(64);
const ev = [{ source: { kind: 'narrative', part: 0 }, basis: 'explicit' }];
const run = { codebookVersion: 'v4-draft', promptVersion: 'area4-0.1', model: 'model-a', runId: 'run-1', codedAt: '2026-11-09T12:00:00Z' };
const shown = CHECKLIST_ITEMS.map((i) => i.id).reverse(); // any order, each once
const hit = { itemId: 'hifr-horse', match: 'full', kind: 'own_experience', episodeId: `${ID}#1`, tiedToWork: null, evidence: ev };
const record = { accountId: ID, sourceSha256: SHA, run, checklistShown: shown, hits: [hit], media: [] };

test('the checklist covers every checklist detail and every decoy, and only those', () => {
  const ids = CHECKLIST_ITEMS.map((i) => i.id);
  assert.ok(ids.includes('hifr-horse') && ids.includes('decoy-empty-birdcages'));
  assert.ok(!ids.includes('urantia-coined-names')); // a word rule, never on the checklist
  assert.ok(!ids.includes('five-people-blue-skin')); // computed from area 3
  assert.equal(Area4CodedRecord.safeParse(record).success, true);
  assert.equal(Area4CodedRecord.safeParse({ ...record, checklistShown: shown.slice(1) }).success, false); // one missing
  assert.equal(Area4CodedRecord.safeParse({ ...record, checklistShown: [...shown, shown[0]] }).success, false); // one twice
});

test('a hit names a known item, a partial match only where the item has one, and an episode exactly for own experience', () => {
  assert.equal(ChecklistHit.safeParse(hit).success, true);
  assert.equal(ChecklistHit.safeParse({ ...hit, itemId: 'no-such-item' }).success, false);
  assert.equal(ChecklistHit.safeParse({ ...hit, match: 'partial' }).success, true); // the horse has a partial match
  assert.equal(ChecklistHit.safeParse({ ...hit, itemId: 'hifr-holy-spirit-blue', match: 'partial' }).success, false); // it has none
  assert.equal(ChecklistHit.safeParse({ ...hit, kind: 'mention' }).success, false); // a mention has no episode
  assert.equal(ChecklistHit.safeParse({ ...hit, kind: 'mention', episodeId: null }).success, true);
  assert.equal(ChecklistHit.safeParse({ ...hit, episodeId: null }).success, false);
  const tied = { words: 'a paperback about the afterlife', evidence: ev };
  assert.equal(ChecklistHit.safeParse({ ...hit, tiedToWork: tied }).success, true);
  assert.equal(ChecklistHit.safeParse({ ...hit, tiedToWork: { ...tied, words: 'one two three four five six seven' } }).success, false); // over the cap
});

test('one hit per item, kind, and episode', () => {
  assert.equal(Area4CodedRecord.safeParse({ ...record, hits: [hit, hit] }).success, false);
  assert.equal(Area4CodedRecord.safeParse({ ...record, hits: [hit, { ...hit, kind: 'mention', episodeId: null }] }).success, true);
});

test('unnamed media are recorded only when the person compares their experience to them', () => {
  const named = { words: 'an invented film title', medium: 'film_or_tv', relation: 'read_or_seen', when: 'before_experience', evidence: ev };
  assert.equal(MediaMention.safeParse(named).success, true);
  assert.equal(MediaMention.safeParse({ ...named, words: null }).success, false);
  assert.equal(MediaMention.safeParse({ ...named, words: null, relation: 'compares_experience_to' }).success, true);
});

test('an area 4 record is checked against the main record from the same run', () => {
  const main = { accountId: ID, sourceSha256: SHA, episodes: [{ episodeId: `${ID}#1` }] };
  const parsed = Area4CodedRecord.parse(record);
  assert.deepEqual(checkAgainstMain(parsed, main), []);
  assert.equal(checkAgainstMain(parsed, { ...main, episodes: [{ episodeId: `${ID}#2` }] }).length, 1);
  assert.equal(checkAgainstMain(parsed, { ...main, sourceSha256: 'b'.repeat(64) }).length, 1);
});

test('the derived file counts every word-rule detail in every part, zeros included', () => {
  const counts = WORD_RULE_DETAIL_IDS.map((detailId) => ({ detailId, narrative: 0, answers: 0 }));
  assert.ok(WORD_RULE_DETAIL_IDS.includes('urantia-coined-names'));
  assert.equal(Area4DerivedPart.safeParse({ index: 0, wordRules: counts }).success, true);
  assert.equal(Area4DerivedPart.safeParse({ index: 0, wordRules: counts.slice(1) }).success, false);
});
