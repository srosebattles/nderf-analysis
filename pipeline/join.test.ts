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

const PASS_C = { doctrinalStatements: [], jesusMentions: [], missingEncounters: [], missingEpisodes: [] };
const jesusMention = (encounterId = `${ID}#1/e1`) => ({
  words: 'Jesus', refersTo: 'jesus', kind: 'encounter', encounterId, doctrineId: null, episodeId: `${ID}#1`, when: 'during',
  polarity: 'affirmative', evidence,
});

function setUp(passB: object | null, episodesFrom = 'a1', passC: object | null = PASS_C, cInputs: object = { episodesFrom: 'a1', encountersFrom: 'b1' }) {
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
  run('c1', 'pass-c', passC, cInputs);
  return data;
}
const joined = (data: string) => joinFirstRun(data, 'a1', 'b1', 'c1');

test('passes A to C join into one record, with what coded each', () => {
  const { records, reruns } = joined(setUp({ encounters: [encounter()], missingEpisodes: [] }));
  assert.deepEqual(reruns, []);
  assert.equal(records.length, 1);
  assert.equal(records[0].encounters[0].episodeId, `${ID}#1`);
  assert.deepEqual(records[0].coding.passB, { runId: 'b1', passVersion: '0.1', model: 'model-x', effort: 'high', claudeCodeVersion: '9.9.9', truncated: [] });
  assert.equal(records[0].coding.passC.runId, 'c1');
  assert.deepEqual([records[0].needsPassARerun, records[0].needsPassBRerun], [false, false]);
});

test('a later pass run on another run\'s episodes or encounters is refused', () => {
  assert.throws(() => joined(setUp({ encounters: [], missingEpisodes: [] }, 'a0')), /took its episodes from a0/);
  assert.throws(() => joined(setUp({ encounters: [], missingEpisodes: [] }, 'a1', PASS_C, { episodesFrom: 'a1', encountersFrom: 'b0' })), /pass C run c1/);
});

test('a page missing a pass, or failing the links, is listed for a rerun, not joined', () => {
  const missing = joined(setUp(null));
  assert.deepEqual([missing.records.length, missing.reruns[0].pass], [0, 'pass-b']);
  const missingC = joined(setUp({ encounters: [], missingEpisodes: [] }, 'a1', null));
  assert.deepEqual([missingC.records.length, missingC.reruns[0].pass], [0, 'pass-c']);
  const unlinked = joined(setUp({ encounters: [encounter(`${ID}#7`)], missingEpisodes: [] }));
  assert.equal(unlinked.records.length, 0);
  assert.match(unlinked.reruns[0].reason, /doesn't have/);
  // A Jesus claim in pass B with no linked mention in pass C fails pass C's link.
  const jesus = { ...encounter(), identity: [{ ...encounter().identity[0], category: 'jesus', words: ['Jesus'] }] };
  const noMention = joined(setUp({ encounters: [jesus], missingEpisodes: [] }));
  assert.deepEqual([noMention.records.length, noMention.reruns[0].pass], [0, 'pass-c']);
  assert.match(noMention.reruns[0].reason, /needs an affirmative mention/);
  assert.equal(joined(setUp({ encounters: [jesus], missingEpisodes: [] }, 'a1', { ...PASS_C, jesusMentions: [jesusMention()] })).records.length, 1);
  // A statement conveyed by a being pass B doesn't have.
  const statement = {
    doctrineId: `${ID}/d1`, doctrine: 'reincarnation', words: 'many lifetimes', stance: 'affirms', certainty: 'asserted',
    source: 'conveyed_by_being', episodeId: `${ID}#1`, encounterId: `${ID}#1/e4`, hellQualities: [], evidence,
  };
  const ghost = joined(setUp({ encounters: [encounter()], missingEpisodes: [] }, 'a1', { ...PASS_C, doctrinalStatements: [statement] }));
  assert.deepEqual([ghost.records.length, ghost.reruns[0].pass], [0, 'pass-c']);
});

test('what a later pass found missing is joined, flagged, and listed for the earlier pass', () => {
  const dream = { description: 'a dream years later', evidence };
  const fromB = joined(setUp({ encounters: [], missingEpisodes: [dream] }));
  assert.equal(fromB.records[0].needsPassARerun, true);
  assert.deepEqual(fromB.reruns.map((r) => r.pass), ['pass-a']);
  const fromC = joined(setUp({ encounters: [], missingEpisodes: [] }, 'a1', { ...PASS_C, missingEpisodes: [dream] }));
  assert.equal(fromC.records[0].needsPassARerun, true);
  assert.match(fromC.reruns[0].reason, /pass C found an experience/);
  const being = { episodeId: `${ID}#1`, description: 'a guide who spoke', evidence };
  const beingC = joined(setUp({ encounters: [], missingEpisodes: [] }, 'a1', { ...PASS_C, missingEncounters: [being] }));
  assert.deepEqual([beingC.records[0].needsPassARerun, beingC.records[0].needsPassBRerun], [false, true]);
  assert.deepEqual(beingC.reruns.map((r) => r.pass), ['pass-b']);
  // A mention calling a being Jesus that pass B gave no Jesus claim: kept, flagged for pass B.
  const unclaimed = joined(setUp({ encounters: [encounter()], missingEpisodes: [] }, 'a1', { ...PASS_C, jesusMentions: [jesusMention()] }));
  assert.equal(unclaimed.records[0].needsPassBRerun, true);
  assert.match(unclaimed.reruns[0].reason, /no Jesus claim/);
});
