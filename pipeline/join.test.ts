import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { joinFirstRun } from './join.ts';

// Invented records, as the runs store them (quotes already turned into offsets).
const ID = '1example_x_nde';
const evidence = [{ source: { kind: 'narrative', part: 0 }, span: [0, 10], basis: 'explicit' }];
const episode = (n: number) => ({
  episodeId: `${ID}#${n}`, label: `episode ${n}`,
  reporter: { role: 'experiencer', relationship: null, assistance: null, evidence: [] },
  questionnaireRefersTo: 'this_episode', recurrent: false, textDate: { status: 'not_stated' },
  child: { value: 'unclear', evidence: [] }, age: { status: 'not_stated' },
  circumstance: {
    context: 'illness_or_injury', inducer: 'none', overdose: null, suicideAttempt: false, psychoactiveMedicationAtOnset: false,
    closeness: 'unclear', cardiacArrest: { reported: false, basis: null }, timing: 'during', evidence,
  },
  psychiatricMedication: [], describesExperience: 'yes', experienceToldIn: { narrative: true, questionnaire: false },
  tone: 'neutral_or_unclear', experiencerLabels: [], surroundingsAlive: { value: false, words: null, evidence: [] },
});
const PASS_A = {
  parts: [{ index: 0, relation: 'sole', episodeIds: [`${ID}#1`] }],
  episodes: [episode(1)],
  nonExperiencerText: [], textClaims: { countries: [], language: null },
  background: { religionStatements: [], heritageStatements: [] }, conditions: [],
  provenance: { exposures: [], priorDevotion: [], memory: [], priorTellings: [], tellingVaries: [], reactions: [], disclaimers: [], naturalExplanations: [], predispositions: [], influenceStatements: [] },
  longingToReturn: [],
};
const encounter = (episodeId = `${ID}#1`) => ({
  encounterId: `${episodeId}/e1`, episodeId, sameBeingAs: null, label: 'the woman at the rail',
  perceivedBy: ['seen'], presence: 'part_of_experience', count: { kind: 'individual', n: null },
  identity: [{
    words: ['a tall woman'], category: 'unrecognized_human', name: null, suggestedSubcategory: null, tie: null,
    when: 'not_stated', how: ['not_stated'], certainty: 'asserted', hedgedElsewhere: false, evidence,
  }],
  familiarity: { value: 'not_stated', words: null, evidence: [] }, vital: null, apparentSex: 'female', imageComparisons: [], evidence,
});

function setUp(passB: object | null, episodesFrom = 'a1') {
  const data = mkdtempSync(join(tmpdir(), 'join-test-'));
  const run = (id: string, pass: string, coded: object | null, inputs: object) => {
    const dir = join(data, 'llm-raw', id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'run.json'), JSON.stringify({ pass, passVersion: '0.1', model: 'model-x', effort: 'high', inputs, accounts: [ID] }));
    writeFileSync(join(dir, 'log.jsonl'), JSON.stringify({ accountId: ID, ok: coded !== null, claudeCodeVersion: '9.9.9', truncated: [] }) + '\n');
    if (coded) writeFileSync(join(dir, `${ID}.coded.json`), JSON.stringify(coded));
  };
  run('a1', 'pass-a', PASS_A, {});
  run('b1', 'pass-b', passB, { episodesFrom });
  return data;
}

test('passes A and B join into one record, with what coded each', () => {
  const { records, reruns } = joinFirstRun(setUp({ encounters: [encounter()], missingEpisodes: [] }), 'a1', 'b1');
  assert.deepEqual(reruns, []);
  assert.equal(records.length, 1);
  assert.equal(records[0].encounters[0].episodeId, `${ID}#1`);
  assert.deepEqual(records[0].coding.passB, { runId: 'b1', passVersion: '0.1', model: 'model-x', effort: 'high', claudeCodeVersion: '9.9.9', truncated: [] });
  assert.equal(records[0].needsPassARerun, false);
});

test('a pass B run on another pass A run\'s episodes is refused', () => {
  assert.throws(() => joinFirstRun(setUp({ encounters: [], missingEpisodes: [] }, 'a0'), 'a1', 'b1'), /took its episodes from a0/);
});

test('a page missing a pass, or failing the links, is listed for a rerun, not joined', () => {
  const missing = joinFirstRun(setUp(null), 'a1', 'b1');
  assert.deepEqual([missing.records.length, missing.reruns[0].pass], [0, 'pass-b']);
  const unlinked = joinFirstRun(setUp({ encounters: [encounter(`${ID}#7`)], missingEpisodes: [] }), 'a1', 'b1');
  assert.equal(unlinked.records.length, 0);
  assert.match(unlinked.reruns[0].reason, /doesn't have/);
});

test('a page whose pass B found a missing episode is joined, flagged, and listed for pass A', () => {
  const { records, reruns } = joinFirstRun(setUp({ encounters: [], missingEpisodes: [{ description: 'a dream years later', evidence }] }), 'a1', 'b1');
  assert.equal(records[0].needsPassARerun, true);
  assert.deepEqual(reruns.map((r) => r.pass), ['pass-a']);
});
