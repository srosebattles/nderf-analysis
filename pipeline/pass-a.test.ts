import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScrapedAccount } from '../derive/input.ts';
import { PassA } from '../schema/first-run.ts';
import { PASS_A, PASS_A_PROMPT, preparePassA } from './pass-a.ts';

/** Every value and every field name in the schema the coder is shown. */
function schemaNames(schema: unknown): Set<string> {
  const names = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (Array.isArray(n.enum)) for (const v of n.enum) if (typeof v === 'string') names.add(v);
    if (typeof n.const === 'string') names.add(n.const);
    if (n.properties && typeof n.properties === 'object') for (const k of Object.keys(n.properties)) names.add(k);
    Object.values(n).forEach(walk);
  };
  walk(schema);
  return names;
}

test('every field and value the prompt names exists in the schema', () => {
  // The schema gives the coder every field and value; the prompt explains only some, by name.
  // A name the schema doesn't have means the prompt has gone stale.
  const known = schemaNames(PASS_A.jsonSchema);
  const named = [...PASS_A_PROMPT.matchAll(/`([a-z][A-Za-z0-9_.]*)`/g)].flatMap((m) => m[1].split('.'));
  const stale = [...new Set(named)].filter((n) => !known.has(n) && n !== 'null');
  assert.deepEqual(stale, []);
});

test('the coder is shown quotes, never offsets, and only places it can see', () => {
  const shown = JSON.stringify(PASS_A.jsonSchema);
  assert.ok(!shown.includes('"span"'));
  assert.ok(shown.includes('"quote"') && shown.includes('"startQuote"'));
  for (const hidden of ['"background"', '"tag"', '"search_listing"', '"quick_facts"']) assert.ok(!shown.includes(`"const":${hidden}`), hidden);
  assert.ok(Buffer.byteLength(PASS_A.systemPrompt) < 128 * 1024 && Buffer.byteLength(shown) < 128 * 1024);
});

// An invented account and a minimal valid answer for it.
const ACCOUNT: ScrapedAccount = {
  id: '1example_x_nde', sha256: null,
  parts: [{ heading: null, background: {}, narrative: 'The ferry tilted and I slid into the cold water.', qa: [] }],
};
const evidence = (quote: string) => [{ source: { kind: 'narrative', part: 0 }, quote, basis: 'explicit' }];
const episode = (n: number, label: string) => ({
  episodeId: `1example_x_nde#${n}`, label,
  reporter: { role: 'experiencer', relationship: null, assistance: null, evidence: [] },
  questionnaireRefersTo: 'this_episode', recurrent: false, textDate: { status: 'not_stated' },
  child: { value: 'unclear', evidence: [] }, age: { status: 'not_stated' },
  circumstance: {
    context: 'illness_or_injury', inducer: 'none', overdose: null, suicideAttempt: false, psychoactiveMedicationAtOnset: false,
    closeness: 'unclear', cardiacArrest: { reported: false, basis: null }, timing: 'during', evidence: evidence('slid into the cold water'),
  },
  psychiatricMedication: [], describesExperience: 'yes', experienceToldIn: { narrative: true, questionnaire: false },
  tone: 'neutral_or_unclear', experiencerLabels: [], surroundingsAlive: { value: false, words: null, evidence: [] },
});
const ANSWER = {
  parts: [{ index: 0, relation: 'sole', episodeIds: ['1example_x_nde#1'] }],
  episodes: [episode(1, 'the ferry accident')],
  nonExperiencerText: [], textClaims: { countries: [], language: null },
  background: { religionStatements: [], heritageStatements: [] }, conditions: [],
  provenance: { exposures: [], priorDevotion: [], memory: [], priorTellings: [], tellingVaries: [], reactions: [], disclaimers: [], naturalExplanations: [], predispositions: [], influenceStatements: [] },
  longingToReturn: [],
};

test('a valid answer is prepared and passes', () => {
  const { value, problems } = preparePassA(ANSWER, ACCOUNT);
  assert.deepEqual(problems, []);
  const parsed = PassA.safeParse(value);
  assert.ok(parsed.success, JSON.stringify(!parsed.success && parsed.error.issues));
  assert.deepEqual(parsed.data.episodes[0].circumstance.evidence[0].span, [23, 47]); // 'slid into the cold water'
});

test('pass A\'s own rules', () => {
  const check = (answer: object) => PassA.safeParse(preparePassA(answer, ACCOUNT).value).success;
  assert.equal(check({ ...ANSWER, episodes: [episode(1, 'a'), episode(1, 'b')] }), false); // duplicate IDs
  assert.equal(check({ ...ANSWER, episodes: [episode(1, 'same'), episode(2, 'Same')] }), false); // labels must differ
  assert.equal(check({ ...ANSWER, parts: [{ index: 0, relation: 'sole', episodeIds: ['1example_x_nde#7'] }] }), false); // unknown episode
  const tagged = { ...ANSWER, textClaims: { countries: [{ country: 'NO', raw: 'Norway', role: 'origin', source: 'nderf_tag', evidence: evidence('cold water') }], language: null } };
  assert.equal(check(tagged), false); // the coder's claims are self-reports only
  assert.equal(check({ ...ANSWER, episodes: [{ ...episode(1, 'x'), label: 'x'.repeat(81) }] }), false);
  // Child must agree with a coded age: twelve or under yes, thirteen or over no, a range across unclear.
  const aged = (years: number | [number, number], child: string) => ({
    ...ANSWER,
    episodes: [{ ...episode(1, 'x'), child: { value: child, evidence: [] }, age: { status: 'present', value: { years, basis: 'stated' }, evidence: evidence('cold water') } }],
  });
  assert.equal(check(aged(13, 'yes')), false);
  assert.equal(check(aged(13, 'no')), true);
  assert.equal(check(aged(12, 'yes')), true);
  assert.equal(check(aged([12, 13], 'unclear')), true);
  assert.equal(check(aged([14, 16], 'unclear')), false);
});

test('checks only the account can answer: every part once, IDs from this account', () => {
  assert.match(preparePassA({ ...ANSWER, parts: [] }, ACCOUNT).problems[0], /has 1 part/);
  assert.match(preparePassA({ ...ANSWER, episodes: [{ ...episode(1, 'x'), episodeId: '1other_nde#1' }] }, ACCOUNT).problems[0], /must begin with/);
});
