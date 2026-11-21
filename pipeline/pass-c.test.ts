import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { ScrapedAccount } from '../derive/input.ts';
import { PassC } from '../schema/first-run.ts';
import { encountersFrom, PASS_C_PROMPT, passC, preparePassC, renderEncounters } from './pass-c.ts';

/** Every value and every field name in a JSON Schema. */
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

test("every field and value the pass's own prompt names exists in the schema", () => {
  const own = readFileSync(new URL('../prompts/pass-c.md', import.meta.url), 'utf8');
  const known = schemaNames(passC('/nowhere', 'a', 'b').jsonSchema);
  const named = [...own.matchAll(/`([a-z][A-Za-z0-9_.]*)`/g)].flatMap((m) => m[1].split('.'));
  assert.deepEqual([...new Set(named)].filter((n) => !known.has(n)), []);
  assert.ok(PASS_C_PROMPT.includes(own.trim()));
});

test('the coder gives quotes, never offsets', () => {
  const shown = JSON.stringify(passC('/nowhere', 'a', 'b').jsonSchema);
  assert.ok(shown.includes('"quote"') && !shown.includes('"span"'));
});

test('the encounter list is shown under the neutral key, with the categories of its claims', () => {
  const text = renderEncounters(
    [{ encounterId: '1example_x_nde#1/e2', label: 'the robed man at the bridge', categories: ['god', 'jesus'] }], '1example_x_nde', 'A0003',
  );
  assert.match(text, /A0003#1\/e2: the robed man at the bridge \[god, jesus\]/);
  assert.ok(!text.includes('1example'));
  assert.match(renderEncounters([], '1example_x_nde', 'A0003'), /\(none\)/);
});

// An invented account and a minimal valid answer for it.
const ACCOUNT: ScrapedAccount = {
  id: '1example_x_nde', sha256: null,
  parts: [{
    heading: null, background: {},
    narrative: 'On the copper bridge a robed man waited, and the lantern called him Jesus. He hummed that no soul stays lost forever.',
    qa: [{ question: 'What are your beliefs now?', response: 'Maybe we all wear many lifetimes, and at dusk I whisper to Jesus.' }],
  }],
};
const EP = '1example_x_nde#1';
const EPISODES = [{ episodeId: EP, label: 'the ferry accident' }, { episodeId: '1example_x_nde#2', label: 'a dream years later' }];
const ENCOUNTERS = [
  { encounterId: `${EP}/e1`, label: 'the robed man at the bridge', categories: ['council_or_robed_figures', 'jesus'] },
  { encounterId: '1example_x_nde#2/e1', label: 'the dream voice', categories: ['voice_or_presence'] },
];
const narrative = (quote: string) => ({ source: { kind: 'narrative', part: 0 }, quote, basis: 'explicit' });
const answer = (qaQuote: string) => ({ source: { kind: 'qa', part: 0, qaIndex: 0 }, quote: qaQuote, basis: 'explicit' });
const doctrine = (over: object = {}) => ({
  doctrineId: '1example_x_nde/d1', doctrine: 'universal_salvation', words: 'no soul stays lost forever', stance: 'affirms', certainty: 'asserted',
  source: 'conveyed_by_being', episodeId: EP, encounterId: `${EP}/e1`, hellQualities: [], evidence: [narrative('He hummed that no soul stays lost forever')], ...over,
});
const mention = (over: object = {}) => ({
  words: 'Jesus', refersTo: 'jesus', kind: 'encounter', encounterId: `${EP}/e1`, doctrineId: null, episodeId: EP, when: 'during',
  polarity: 'affirmative', evidence: [narrative('the lantern called him Jesus')], ...over,
});
const prayer = mention({
  words: 'whisper to Jesus', kind: 'prayer_or_invocation', encounterId: null, episodeId: null, when: 'after', evidence: [answer('at dusk I whisper to Jesus')],
});
const answerWith = (over: object = {}) => ({
  doctrinalStatements: [
    doctrine(),
    doctrine({
      doctrineId: '1example_x_nde/d2', doctrine: 'reincarnation', words: 'we all wear many lifetimes', certainty: 'hedged',
      source: 'experiencer_view_after', episodeId: null, encounterId: null, evidence: [answer('Maybe we all wear many lifetimes')],
    }),
  ],
  jesusMentions: [mention(), prayer],
  missingEncounters: [],
  missingEpisodes: [],
  ...over,
});
const prepared = (a: object) => preparePassC(a, ACCOUNT, EPISODES, ENCOUNTERS);
const check = (a: object) => {
  const { value, problems } = prepared(a);
  return problems.length === 0 && PassC.safeParse(value).success;
};

test('a valid answer passes', () => {
  const { value, problems } = prepared(answerWith());
  assert.deepEqual(problems, []);
  const parsed = PassC.safeParse(value);
  assert.ok(parsed.success, JSON.stringify(!parsed.success && parsed.error.issues));
  assert.equal(check(answerWith({ doctrinalStatements: [], jesusMentions: [mention()] })), true);
});

test('links go only to the episodes and encounters listed', () => {
  const problems = (a: object) => prepared(a).problems.join('\n');
  assert.match(problems(answerWith({ doctrinalStatements: [doctrine({ encounterId: `${EP}/e7` })], jesusMentions: [mention()] })), /isn't one of the encounters listed/);
  assert.match(problems(answerWith({ jesusMentions: [mention(), { ...prayer, when: 'during', episodeId: '1example_x_nde#9' }] })), /isn't one of the episodes listed/);
  assert.match(problems(answerWith({ missingEncounters: [{ episodeId: '1example_x_nde#9', description: 'a woman at the gate', evidence: [narrative('a robed man waited')] }] })), /isn't one of the episodes/);
  assert.equal(check(answerWith({ missingEncounters: [{ episodeId: EP, description: 'a woman at the gate', evidence: [narrative('a robed man waited')] }] })), true);
  // A linked encounter is in the statement's or the mention's own episode.
  assert.equal(check(answerWith({ doctrinalStatements: [doctrine({ encounterId: '1example_x_nde#2/e1' })], jesusMentions: [mention()] })), false);
  assert.equal(check(answerWith({ jesusMentions: [mention(), mention({ kind: 'talk_with_another_being', encounterId: '1example_x_nde#2/e1' })] })), false);
});

test('an encounter listed as jesus needs an affirmative mention linked to it', () => {
  assert.match(prepared(answerWith({ jesusMentions: [prayer] })).problems.join('\n'), /is listed as jesus, so it needs a mention/);
  assert.match(prepared(answerWith({ jesusMentions: [mention({ polarity: 'question' }), prayer] })).problems.join('\n'), /is listed as jesus/);
  // A second, unsure mention of the same encounter in another place is still refused.
  assert.equal(check(answerWith({ jesusMentions: [mention(), prayer, mention({ polarity: 'question', evidence: [answer('at dusk I whisper to Jesus')] })] })), false);
});

test("pass C's own rules", () => {
  // A mention's timing follows what it links to.
  assert.equal(check(answerWith({ jesusMentions: [mention({ when: 'after', episodeId: null }), prayer] })), false);
  const doctrineMention = mention({ kind: 'doctrinal_statement', encounterId: null, doctrineId: '1example_x_nde/d2', episodeId: null, evidence: [answer('we all wear many lifetimes')] });
  assert.equal(check(answerWith({ jesusMentions: [mention(), prayer, { ...doctrineMention, when: 'after' }] })), true);
  assert.equal(check(answerWith({ jesusMentions: [mention(), prayer, { ...doctrineMention, when: 'during', episodeId: EP }] })), false);
  // Doctrine IDs: the account key, "/d", and a number; unique.
  assert.equal(check(answerWith({ doctrinalStatements: [doctrine({ doctrineId: '1example_x_nde#1/d1' })] })), false);
  assert.equal(check(answerWith({ doctrinalStatements: [doctrine(), doctrine()] })), false);
  // The full schema's own rules come along: conveyed by a being needs the being.
  assert.equal(check(answerWith({ doctrinalStatements: [doctrine({ encounterId: null })] })), false);
  assert.equal(check(answerWith({ jesusMentions: [mention(), prayer, { ...prayer }] })), false); // one entry per kind, time, and place
  assert.equal(check(answerWith({ jesusMentions: [mention(), { ...prayer, refersTo: 'not_jesus' }] })), false); // not_jesus is for names
});

test('the pass B run must have used the same pass A run, and every page needs both', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pass-c-'));
  try {
    const run = (id: string, manifest: object, coded?: object) => {
      mkdirSync(join(dir, 'llm-raw', id), { recursive: true });
      writeFileSync(join(dir, 'llm-raw', id, 'run.json'), JSON.stringify(manifest));
      if (coded) writeFileSync(join(dir, 'llm-raw', id, `${ACCOUNT.id}.coded.json`), JSON.stringify(coded));
    };
    run('a1', { pass: 'pass-a' }, { episodes: EPISODES });
    run('b1', { pass: 'pass-b', inputs: { episodesFrom: 'a1' } }, {
      encounters: [{ encounterId: `${EP}/e1`, label: 'the robed man at the bridge', identity: [{ category: 'jesus' }, { category: 'jesus' }, { category: 'god' }] }],
    });
    run('b2', { pass: 'pass-b', inputs: { episodesFrom: 'a0' } });
    assert.deepEqual(encountersFrom(dir, 'b1', ACCOUNT.id), [{ encounterId: `${EP}/e1`, label: 'the robed man at the bridge', categories: ['jesus', 'god'] }]);
    const context = passC(dir, 'a1', 'b1').context!(ACCOUNT, 'A0001');
    assert.match(context, /A0001#1: the ferry accident/);
    assert.match(context, /A0001#1\/e1: the robed man at the bridge \[jesus, god\]/);
    assert.throws(() => passC(dir, 'a1', 'b2').context!(ACCOUNT, 'A0001'), /took its episodes from a0/);
    assert.throws(() => passC(dir, 'a1', 'a1').context!(ACCOUNT, 'A0001'), /not pass B/);
    assert.throws(() => passC(dir, 'a1', 'b1').context!({ ...ACCOUNT, id: '2example_x_nde' }, 'A0001'), /no coded record/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
