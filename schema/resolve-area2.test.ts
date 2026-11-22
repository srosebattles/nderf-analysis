// Fixtures are invented: '1example_x_nde' is not a real account, and no text here comes from one.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ReligionFieldValue, ReligionStatement, Tradition } from './codebook-schema.ts';
import { resolveEpisodes } from './resolve-area1.ts';
import { conflicts, type DerivedReligionInput, type ReligionRuleInput, resolveReligion } from './resolve-area2.ts';

const ID = '1example_x_nde';
const evidence = [{ source: { kind: 'narrative' as const, part: 0 }, span: [0, 10] as [number, number], basis: 'explicit' as const }];
type Ep = ReligionRuleInput['episodes'][number];
const episode = (n: number, child: 'yes' | 'no' | 'unclear' = 'no', inducer: Ep['circumstance']['inducer'] = 'none'): Ep => ({
  episodeId: `${ID}#${n}`,
  reporter: { role: 'experiencer', relationship: null, assistance: null, evidence: [] },
  questionnaireRefersTo: 'this_episode', recurrent: false, textDate: { status: 'not_stated' }, age: { status: 'not_stated' },
  describesExperience: 'yes', child: { value: child, evidence: [] },
  circumstance: {
    context: 'illness_or_injury', inducer, overdose: null, suicideAttempt: false, psychoactiveMedicationAtOnset: false,
    closeness: 'unclear', cardiacArrest: { reported: false, basis: null }, timing: 'during', evidence,
  },
});

const catholic: Tradition = { family: 'catholic', rite: null };
const protestant = (pf: 'unspecified' | 'baptist' | 'lutheran' = 'unspecified'): Tradition => ({ family: 'protestant', protestantFamily: pf, body: null });
const christian: Tradition = { family: 'christian_unspecified' };
const none = (kind: 'atheist' | 'agnostic' | 'nothing_religious' | null = null): Tradition => ({ family: 'unaffiliated', kind });
const newAge: Tradition = { family: 'new_age', detail: 'a study circle' };
const hindu: Tradition = { family: 'hindu', detail: null };

const said = (traditions: Tradition[], kind: ReligionStatement['kind'], when: ReligionStatement['when'], over: Partial<ReligionStatement> = {}): ReligionStatement => ({
  traditions, kind, when, practice: null, term: 'a few words', source: 'religion_field_text', context: 'background', evidence, ...over,
});
const menu = (option: string, tradition: Tradition | null): ReligionFieldValue => ({ format: 'menu', option: option as never, tradition, hasFreeText: true });
const orientation: ReligionFieldValue = { format: 'orientation', orientation: 'moderate', hasFreeText: true };

function resolve(statements: ReligionStatement[], prior: ReligionFieldValue | null, now: ReligionFieldValue | null = null, episodes: Ep[] = [episode(1)], opts = {}) {
  const coded: ReligionRuleInput = { accountId: ID, parts: [{ index: 0, relation: 'sole', episodeIds: episodes.map((e) => e.episodeId) }], episodes, background: { religionStatements: statements } };
  const field = (v: ReligionFieldValue | null) => (v ? { status: 'present' as const, value: v, evidence: [] } : { status: 'not_asked' as const });
  const derived: DerivedReligionInput = {
    accountId: ID,
    parts: [{
      index: 0,
      backgroundDate: { raw: null, year: null, month: null, day: null, precision: 'none', flags: [] },
      lifeThreat: { status: 'not_asked' },
      religionField: {
        prior: field(prior), now: field(now), practicesChanged: { status: 'not_asked' }, priorImportance: { status: 'not_asked' },
        priorBeliefInGod: { status: 'not_asked' }, priorBeliefInAfterlife: { status: 'not_asked' },
      },
    }],
  };
  return resolveReligion(coded, derived, resolveEpisodes({ ...coded, conditions: [] }, { ...derived, posting: { firstPosted: null } }), opts);
}

test('which differences conflict: no religion against a religion, two churches, two kinds of no religion', () => {
  assert.equal(conflicts(catholic, none('atheist')), true);
  assert.equal(conflicts(catholic, protestant('lutheran')), true);
  assert.equal(conflicts(protestant('baptist'), protestant('lutheran')), true);
  assert.equal(conflicts(none('agnostic'), none('atheist')), true);
  assert.equal(conflicts(catholic, newAge), false);
  assert.equal(conflicts(catholic, christian), false);
  assert.equal(conflicts(protestant(), protestant('baptist')), false);
  assert.equal(conflicts(none(), none('atheist')), false);
});

test('the menu wins; statements about that time add, narrow, or conflict (flagged)', () => {
  const added = resolve([said([newAge], 'attendance', 'before_experience')], menu('christian_catholic', catholic));
  assert.deepEqual([added.prior.traditions, added.prior.basis, added.prior.conflict], [[catholic, newAge], 'menu', false]);
  const narrowed = resolve([said([protestant('baptist')], 'identification', 'before_experience')], menu('christian_protestant', protestant()));
  assert.deepEqual(narrowed.prior.traditions, [protestant('baptist')]);
  const bare = resolve([said([christian], 'identification', 'before_experience', { practice: 'nominal' })], menu('christian_protestant', protestant()));
  assert.deepEqual([bare.prior.traditions, bare.prior.practice], [[protestant()], 'nominal']);
  const clash = resolve([said([none('atheist')], 'identification', 'before_experience')], menu('unaffiliated_nothing_religious', none('nothing_religious')));
  assert.deepEqual([clash.prior.traditions, clash.prior.conflict], [[none('nothing_religious')], true]);
});

test('with no informative menu: statements about that time, then upbringing; a conflict among statements is unknown', () => {
  const fromText = resolve([said([catholic], 'identification', 'before_experience'), said([hindu], 'upbringing', 'childhood')], orientation);
  assert.deepEqual([fromText.prior.traditions, fromText.prior.basis, fromText.orientation], [[catholic], 'religion_field_text', 'moderate']);
  const upbringing = resolve([said([hindu], 'upbringing', 'childhood', { source: 'narrative' })], menu('do_not_know', null));
  assert.deepEqual([upbringing.prior.traditions, upbringing.prior.basis], [[hindu], 'upbringing']);
  const leftIt = resolve([said([hindu], 'upbringing', 'childhood'), said([hindu], 'left', 'before_experience')], null);
  assert.deepEqual([leftIt.prior.status, leftIt.prior.traditions], ['unknown', []]);
  const clash = resolve([said([catholic], 'identification', 'before_experience'), said([none('agnostic')], 'identification', 'at_experience')], null);
  assert.deepEqual([clash.prior.status, clash.prior.conflict], ['unknown', true]);
  assert.equal(resolve([], menu('do_not_know', null)).prior.status, 'do_not_know');
  assert.equal(resolve([], menu('other_or_several', null)).prior.status, 'unknown');
});

test('attendance counts only when it names a church or group; untimed statements decide nothing', () => {
  assert.equal(resolve([said([christian], 'attendance', 'before_experience', { practice: 'nominal' })], orientation).prior.status, 'unknown');
  assert.deepEqual(resolve([said([protestant('baptist')], 'attendance', 'before_experience')], orientation).prior.traditions, [protestant('baptist')]);
  assert.equal(resolve([said([catholic], 'identification', 'unspecified')], orientation).prior.status, 'unknown');
});

test('childhood statements speak for the time of a childhood experience; otherwise they are the fallback', () => {
  const statements = [said([none('nothing_religious')], 'identification', 'childhood'), said([catholic], 'upbringing', 'childhood')];
  const asChild = resolve(statements, null, null, [episode(1, 'yes')]);
  assert.deepEqual([asChild.prior.status, asChild.prior.conflict], ['unknown', true]);
  const asAdult = resolve([said([catholic], 'upbringing', 'childhood')], null, null, [episode(1, 'no')]);
  assert.deepEqual([asAdult.prior.traditions, asAdult.prior.basis], [[catholic], 'upbringing']);
  const child = resolve([said([catholic], 'upbringing', 'childhood')], null, null, [episode(1, 'yes')]);
  assert.deepEqual([child.prior.traditions, child.prior.basis], [[catholic], 'religion_field_text']);
});

test('now: the menu, then statements timed now, then statements about after the experience', () => {
  const later = resolve([said([hindu], 'identification', 'after_experience')], null, orientation);
  assert.deepEqual(later.now.traditions, [hindu]);
  const current = resolve([said([hindu], 'identification', 'after_experience'), said([newAge], 'identification', 'now')], null, orientation);
  assert.deepEqual(current.now.traditions, [newAge]);
  assert.deepEqual(resolve([], null, menu('christian_catholic', catholic)).now.traditions, [catholic]);
});

test('a statement offered to explain the experience is flagged when it decides, and can be left out', () => {
  const statements = [said([none('atheist')], 'identification', 'before_experience', { context: 'explaining_experience', source: 'narrative' })];
  const used = resolve(statements, null);
  assert.deepEqual([used.prior.traditions, used.prior.usesEncounterPromptedStatement], [[none('atheist')], true]);
  assert.equal(resolve(statements, null, null, [episode(1)], { withoutEncounterPrompted: true }).prior.status, 'unknown');
  // Agreeing with the menu decides nothing, so nothing is flagged.
  assert.equal(resolve(statements, menu('unaffiliated_atheist', none('atheist'))).prior.usesEncounterPromptedStatement, false);
});

test('prior religion is read from the part holding the first qualifying episode, or else a comparison episode', () => {
  const r = resolve([said([catholic], 'upbringing', 'childhood')], null, null, [episode(1, 'no', 'sleep_or_dream'), episode(2, 'yes', 'sleep_or_dream')]);
  // No qualifying episode: the first comparison episode anchors it, an adult's, so childhood is the fallback.
  assert.equal(r.prior.basis, 'upbringing');
});
