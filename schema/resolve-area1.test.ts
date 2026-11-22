// Fixtures are invented: '1example_x_nde' is not a real account, and no text here comes from one.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ConditionStatement } from './codebook-schema.ts';
import { type DerivedEpisodeInput, type EpisodeRuleInput, OVERDOSE_CAUSE, resolveEpisodes } from './resolve-area1.ts';

const ID = '1example_x_nde';
type Ep = EpisodeRuleInput['episodes'][number];
const evidence = [{ source: { kind: 'narrative' as const, part: 0 }, span: [0, 10] as [number, number], basis: 'explicit' as const }];

const episode = (n: number, over: Partial<Ep> = {}, circ: Partial<Ep['circumstance']> = {}): Ep => ({
  episodeId: `${ID}#${n}`,
  reporter: { role: 'experiencer', relationship: null, assistance: null, evidence: [] },
  questionnaireRefersTo: 'this_episode',
  recurrent: false,
  textDate: { status: 'not_stated' },
  age: { status: 'not_stated' },
  describesExperience: 'yes',
  ...over,
  circumstance: {
    context: 'illness_or_injury', inducer: 'none', overdose: null, suicideAttempt: false, psychoactiveMedicationAtOnset: false,
    closeness: 'unclear', cardiacArrest: { reported: false, basis: null }, timing: 'during', evidence, ...circ,
  },
});
const coded = (episodes: Ep[], conditions: ConditionStatement[] = [], parts?: EpisodeRuleInput['parts']): EpisodeRuleInput => ({
  accountId: ID,
  parts: parts ?? [{ index: 0, relation: 'sole', episodeIds: episodes.map((e) => e.episodeId) }],
  episodes,
  conditions,
});
const derived = (year: number | null = null, causes: string[] = []): DerivedEpisodeInput => ({
  accountId: ID,
  posting: { firstPosted: '2010-05-01' },
  parts: [{
    index: 0,
    backgroundDate: { raw: null, year, month: null, day: null, precision: year === null ? 'none' : 'year', flags: [] },
    lifeThreat: { status: 'present', value: { answer: 'yes', causes, severity: null }, evidence: [] },
  }],
});
const yearDate = (year: number) => ({ status: 'present' as const, value: { raw: String(year), year, month: null, day: null, precision: 'year' as const, flags: [] }, evidence });
const age = (years: number) => ({ status: 'present' as const, value: { years, basis: 'stated' as const }, evidence });

test('primary: firsthand, a threat with no inducer, not unrelated in time, described at least in part', () => {
  const r = resolveEpisodes(coded([
    episode(1),
    episode(2, { reporter: { role: 'experiencer_assisted', relationship: null, assistance: 'transcribed', evidence: [] }, describesExperience: 'partial' }, { context: 'threat_without_injury', timing: 'after' }),
    episode(3, {}, { timing: 'unclear' }),
  ]), derived());
  assert.deepEqual(r.episodes.map((e) => e.analysisSet), ['primary', 'primary', 'primary']);
  assert.deepEqual([r.qualifyingEpisodeIds.length, r.multipleQualifyingEpisodes], [3, true]);
});

test('comparison: a known inducer, whatever the context or timing; unclear enters neither set', () => {
  const r = resolveEpisodes(coded([
    episode(1, {}, { context: 'none', inducer: 'meditation_or_practice', timing: 'unrelated' }),
    episode(2, {}, { inducer: 'recreational_drugs', overdose: 'accidental' }),
    episode(3, {}, { inducer: 'unclear' }),
    episode(4, {}, { context: 'unclear' }),
    episode(5, { reporter: { role: 'unknown', relationship: null, assistance: null, evidence: [] } }),
  ]), derived());
  assert.deepEqual(r.episodes.map((e) => e.analysisSet), ['comparison', 'comparison', 'excluded', 'excluded', 'excluded']);
  assert.deepEqual(r.episodes.slice(2).map((e) => e.exclusionReasons), [['unclear'], ['unclear'], ['unclear']]);
  assert.deepEqual([r.qualifyingEpisodeIds, r.firstQualifyingEpisodeId, r.multipleQualifyingEpisodes], [[], null, false]);
});

test('excluded, with every reason that applies', () => {
  const parent = { role: 'parent' as const, sex: 'female' as const, greats: 0, side: 'not_stated' as const, link: 'blood' as const, words: 'my mother' };
  const r = resolveEpisodes(coded([
    episode(1, { reporter: { role: 'relative', relationship: parent, assistance: null, evidence: [] }, describesExperience: 'no' }),
    episode(2, {}, { context: 'someone_elses_death' }),
    episode(3, {}, { context: 'none', timing: 'unrelated' }),
    episode(4, {}, { timing: 'unrelated' }),
    episode(5, { describesExperience: 'no' }, { inducer: 'sleep_or_dream' }),
  ]), derived());
  assert.deepEqual(r.episodes.map((e) => e.exclusionReasons), [
    ['not_firsthand', 'no_experience_described'], ['someone_elses_death'], ['no_threat', 'unrelated_in_time'], ['unrelated_in_time'],
    ['no_experience_described'],
  ]);
  assert.equal(r.episodes[0].firsthand, false);
});

test('flags: overdose from the code or the life-threat cause, the hallucination flag by timing, and the coded flags', () => {
  const condition = (when: ConditionStatement['when'], n: number, type: ConditionStatement['condition'] = 'delirium'): ConditionStatement => ({
    condition: type, words: 'confused in the ward', when, episodeIds: [`${ID}#${n}`], statedBy: 'experiencer', basis: 'not_stated', evidence,
  });
  const episodes = [
    episode(1, { recurrent: true }, { suicideAttempt: true, psychoactiveMedicationAtOnset: true }),
    episode(2, { questionnaireRefersTo: 'unclear' }),
    episode(3),
    episode(4),
  ];
  const conditions = [condition('not_stated', 1), condition('began_after', 2), condition('before', 3, 'other_mental_health'), condition('at_the_time_recognized_later', 4)];
  const r = resolveEpisodes(coded(episodes, conditions), derived(null, [OVERDOSE_CAUSE]));
  assert.deepEqual(r.episodes.map((e) => e.flags), [
    ['overdose', 'suicide_attempt', 'psychoactive_medication_at_onset', 'recurrent', 'hallucination_linked_condition'],
    [], // the questionnaire's cause doesn't reach an episode it may not describe
    ['overdose'],
    ['overdose', 'hallucination_linked_condition'],
  ]);
});

test('the first qualifying episode: by year when both have one, else by age, else the first mentioned', () => {
  // Ages put the second first; the third can't be placed, so it doesn't displace it.
  const byAge = resolveEpisodes(coded([episode(1, { age: age(9), textDate: yearDate(2003) }), episode(2, { age: age(4) }), episode(3)]), derived());
  assert.equal(byAge.firstQualifyingEpisodeId, `${ID}#2`);
  const byYear = resolveEpisodes(coded([episode(1, { textDate: yearDate(2004) }), episode(2, { textDate: yearDate(1990) })]), derived());
  assert.equal(byYear.firstQualifyingEpisodeId, `${ID}#2`);
  const unknown = resolveEpisodes(coded([episode(1), episode(2, { textDate: yearDate(1990) })]), derived());
  assert.equal(unknown.firstQualifyingEpisodeId, `${ID}#1`);
});

test('an episode takes the background date only from a part that holds it alone; the gap is posting minus that year', () => {
  const alone = resolveEpisodes(coded([episode(1)]), derived(1999));
  assert.equal(alone.episodes[0].gapYears, 11);
  const shared = resolveEpisodes(coded([episode(1), episode(2)]), derived(1999));
  assert.deepEqual(shared.episodes.map((e) => e.gapYears), [null, null]);
  const own = resolveEpisodes(coded([episode(1, { textDate: yearDate(2005) }), episode(2)]), derived(1999));
  assert.deepEqual(own.episodes.map((e) => e.gapYears), [5, null]);
});
