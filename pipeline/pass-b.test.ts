import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { ScrapedAccount } from '../derive/input.ts';
import { PassB } from '../schema/first-run.ts';
import { canonicalNameList, PASS_B_PROMPT, passB, preparePassB, renderEpisodes } from './pass-b.ts';

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

test('every field and value the pass\'s own prompt names exists in the schema', () => {
  // The shared conventions (common.md) name fields some passes lack; pass A's test checks them.
  const own = readFileSync(new URL('../prompts/pass-b.md', import.meta.url), 'utf8');
  const known = schemaNames(passB('/nowhere', 'run').jsonSchema);
  const named = [...own.matchAll(/`([a-z][A-Za-z0-9_.]*)`/g)].flatMap((m) => m[1].split('.'));
  assert.deepEqual([...new Set(named)].filter((n) => !known.has(n)), []);
  assert.ok(PASS_B_PROMPT.includes(own.trim()));
});

test('the coder sees the canonical names, never subcategories or homes', () => {
  const list = canonicalNameList();
  assert.match(list, /Francis of Assisi/);
  assert.ok(!/early_or_medieval_saint|post_reformation/.test(list));
  assert.ok(PASS_B_PROMPT.includes(list));
});

test('the coder is never shown the fields that wait for later passes', () => {
  const shown = JSON.stringify(passB('/nowhere', 'run').jsonSchema);
  for (const waits of ['"visualDetails"', '"disposition"', '"communication"', '"timeSinceDeath"', '"friendTypes"', '"closeness"', '"invocation"']) {
    assert.ok(!shown.includes(waits), waits);
  }
  assert.ok(shown.includes('"quote"') && !shown.includes('"span"'));
});

test('the episode list is shown under the neutral key', () => {
  const text = renderEpisodes([{ episodeId: '1example_x_nde#1', label: 'the ferry accident' }], '1example_x_nde', 'A0003');
  assert.match(text, /A0003#1: the ferry accident/);
  assert.ok(!text.includes('1example'));
  assert.match(renderEpisodes([], '1example_x_nde', 'A0003'), /\(none\)/);
});

// An invented account and a minimal valid answer for it.
const ACCOUNT: ScrapedAccount = {
  id: '1example_x_nde', sha256: null,
  parts: [{ heading: null, background: {}, narrative: 'A tall woman in grey stood by the ferry rail and called my name.', qa: [] }],
};
const EPISODES = [{ episodeId: '1example_x_nde#1', label: 'the ferry accident' }, { episodeId: '1example_x_nde#2', label: 'a dream years later' }];
const evidence = [{ source: { kind: 'narrative', part: 0 }, quote: 'A tall woman in grey', basis: 'explicit' }];
const claim = (over: object = {}) => ({
  words: ['a tall woman'], category: 'unrecognized_human', name: null, suggestedSubcategory: null, tie: null,
  when: 'not_stated', how: ['not_stated'], certainty: 'asserted', hedgedElsewhere: false, evidence, ...over,
});
const encounter = (over: object = {}) => ({
  encounterId: '1example_x_nde#1/e1', episodeId: '1example_x_nde#1', sameBeingAs: null, label: 'the woman at the rail',
  perceivedBy: ['seen', 'heard'], presence: 'part_of_experience', count: { kind: 'individual', n: null },
  identity: [claim()], familiarity: { value: 'not_stated', words: null, evidence: [] }, vital: null,
  apparentSex: 'female', imageComparisons: [], evidence, ...over,
});
const answer = (encounters: object[]) => ({ encounters, missingEpisodes: [] });
const check = (a: object) => {
  const { value, problems } = preparePassB(a, ACCOUNT, EPISODES);
  return problems.length === 0 && PassB.safeParse(value).success;
};

test('a valid answer passes', () => {
  const { value, problems } = preparePassB(answer([encounter()]), ACCOUNT, EPISODES);
  assert.deepEqual(problems, []);
  const parsed = PassB.safeParse(value);
  assert.ok(parsed.success, JSON.stringify(!parsed.success && parsed.error.issues));
});

test('pass B\'s rules', () => {
  // An encounter must be in one of pass A's episodes.
  assert.match(preparePassB(answer([encounter({ episodeId: '1example_x_nde#9', encounterId: '1example_x_nde#9/e1' })]), ACCOUNT, EPISODES).problems[0], /isn't one of the episodes/);
  // IDs follow the episode; labels differ; sameBeingAs crosses episodes.
  assert.equal(check(answer([encounter({ encounterId: '1example_x_nde#2/e1' })])), false);
  assert.equal(check(answer([encounter(), encounter({ encounterId: '1example_x_nde#1/e2', label: 'The woman at the rail' })])), false);
  assert.equal(check(answer([encounter(), encounter({ encounterId: '1example_x_nde#1/e2', label: 'b', sameBeingAs: '1example_x_nde#1/e1' })])), false);
  assert.equal(check(answer([encounter(), encounter({ encounterId: '1example_x_nde#2/e1', episodeId: '1example_x_nde#2', label: 'b', sameBeingAs: '1example_x_nde#1/e1' })])), true);
  // The encounter's own rules that the first run keeps.
  assert.equal(check(answer([encounter({ perceivedBy: ['credited_only', 'seen'] })])), false);
  assert.equal(check(answer([encounter({ identity: [claim(), claim()] })])), false); // one claim per referent per timing
  const aunt = claim({ category: 'family', tie: { relationship: { role: 'aunt_or_uncle', sex: 'female', greats: 0, side: 'not_stated', link: 'not_stated', words: 'my aunt' }, religiousRole: null } });
  assert.equal(check(answer([encounter({ identity: [aunt] })])), false); // vital status required
  const vital = { status: 'dead', diedBeforeBirth: null, experiencerKnew: 'knew', evidence: [] };
  assert.equal(check(answer([encounter({ identity: [aunt], vital })])), true);
  // Fields that wait for a later pass are rejected, not ignored.
  assert.equal(check(answer([encounter({ identity: [{ ...aunt, tie: { ...aunt.tie, friendTypes: [] } }], vital })])), false);
  assert.equal(check(answer([encounter({ identity: [aunt], vital: { ...vital, timeSinceDeath: null } })])), false);
  assert.equal(check(answer([encounter({ disposition: ['loving'] })])), false);
});
