import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import type { ScrapedAccount } from '../derive/input.ts';
import { claudeCodeArgs, forClaudeCode, readResult } from './claude-code.ts';
import { neutralKey, renderForCoder, restoreAccountId } from './coder-input.ts';
import { type PassDefinition, runPass } from './run-pass.ts';

const FAKE = new URL('./fixtures/fake-claude.mjs', import.meta.url).pathname;
const MODEL = 'claude-sonnet-5-5';
// Invented accounts.
const ACCOUNT: ScrapedAccount = {
  id: '1example_x_probable_nde', sha256: null, page_classification: 'Probable NDE',
  listings: [{ type_label: 'Probable NDE', tag: 'Exceptional Experience. From Norway.' }],
  parts: [{ heading: null, narrative: 'A lantern, a bridge, and then nothing.', background: { Gender: 'Female' }, qa: [{ section: null, question: 'Did you see an unearthly light?', response: 'Yes  Dim and blue', answer: 'Yes', comment: 'Dim and blue' }] }],
};

test('the coder sees only the experiencer\'s words and NDERF\'s questions, under a neutral key', () => {
  const { key, text } = renderForCoder(ACCOUNT, neutralKey(6));
  assert.equal(key, 'A0007');
  assert.match(text, /^ACCOUNT A0007/);
  assert.match(text, /--- narrative:0 ---\nA lantern, a bridge, and then nothing\./);
  assert.match(text, /--- qa:0:0 ---\nQ: Did you see an unearthly light\?\nA: Yes {2}Dim and blue/);
  for (const hidden of ['probable', 'Probable', 'Exceptional', 'Norway', '1example', 'Female']) assert.ok(!text.includes(hidden), hidden);
});

test('the neutral key is put back only where it starts an ID', () => {
  const coded = { episodes: [{ episodeId: 'A0007#1' }], encounterId: 'A0007#1/e2', words: 'A0007 is a code', other: 'A00070#1' };
  assert.deepEqual(restoreAccountId(coded, 'A0007', '1example_x_nde'), {
    episodes: [{ episodeId: '1example_x_nde#1' }], encounterId: '1example_x_nde#1/e2', words: 'A0007 is a code', other: 'A00070#1',
  });
});

test('the call is pinned, tool-less, and keeps the account off the command line', () => {
  const args = claudeCodeArgs({ model: MODEL, effort: 'low', systemPrompt: 'Code it.', jsonSchema: { type: 'object' } });
  const after = (flag: string) => args[args.indexOf(flag) + 1];
  assert.deepEqual([after('--model'), after('--effort'), after('--tools'), after('--output-format')], [MODEL, 'low', '', 'json']);
  for (const flag of ['-p', '--safe-mode', '--strict-mcp-config', '--no-session-persistence']) assert.ok(args.includes(flag), flag);
  assert.ok(!args.includes('--fallback-model'));
  const marked = claudeCodeArgs({ model: MODEL, effort: 'low', systemPrompt: 'x', jsonSchema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' } });
  assert.equal(marked[marked.indexOf('--json-schema') + 1], '{"type":"object"}');
});

test('a schema both checks accept: tuples become fixed-length lists, formats and the draft marker go', () => {
  const span = { type: 'array', prefixItems: [{ type: 'integer', minimum: 0 }, { type: 'integer', minimum: 0 }] };
  const pair = { type: 'array', prefixItems: [{ type: 'number' }, { type: 'string' }], items: false };
  assert.deepEqual(forClaudeCode({ $schema: 'x', type: 'object', properties: { span, pair, day: { type: 'string', format: 'date' } } }), {
    type: 'object',
    properties: {
      span: { type: 'array', items: { type: 'integer', minimum: 0 }, minItems: 2, maxItems: 2 },
      pair: { type: 'array', items: { anyOf: [{ type: 'number' }, { type: 'string' }] }, minItems: 2, maxItems: 2 },
      day: { type: 'string' },
    },
  });
  assert.throws(() => claudeCodeArgs({ model: MODEL, effort: 'low', systemPrompt: 'x'.repeat(140_000), jsonSchema: {} }), /too large/);
});

test('a result is rejected when another model served it, the call failed, or nothing came back', () => {
  const result = (over: object) => JSON.stringify({ subtype: 'success', is_error: false, structured_output: { a: 1 }, modelUsage: { [MODEL]: { costUSD: 0.02 } }, ...over });
  assert.equal(readResult(result({}), MODEL, 5).ok, true);
  assert.equal(readResult(result({}), MODEL, 5).listCostUsd, 0.02);
  assert.match(readResult(result({ modelUsage: { [MODEL]: {}, 'claude-opus-5-5': {} } }), MODEL, 5).problem ?? '', /served by/);
  assert.match(readResult(result({ is_error: true, subtype: 'error_during_execution' }), MODEL, 5).problem ?? '', /call failed/);
  assert.match(readResult(result({ stop_reason: 'refusal' }), MODEL, 5).problem ?? '', /declined/);
  assert.match(readResult(result({ structured_output: undefined }), MODEL, 5).problem ?? '', /no structured output/);
  assert.match(readResult('not json', MODEL, 5).problem ?? '', /not JSON/);
});

const PASS: PassDefinition<{ episodeId: string; count: number }> = {
  id: 'test-pass', version: '0', systemPrompt: 'Code the account.',
  schema: z.strictObject({ episodeId: z.string().startsWith('1example'), count: z.number().int().min(1) }),
  jsonSchema: { type: 'object' },
};
const runIn = (script: object[]) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'run-pass-test-'));
  process.env.FAKE_CLAUDE_SCRIPT = JSON.stringify(script);
  process.env.FAKE_CLAUDE_COUNTER = join(dataDir, 'counter');
  process.env.FAKE_CLAUDE_ECHO = join(dataDir, 'echo');
  return { dataDir, run: () => runPass(PASS, [ACCOUNT], { dataDir, runId: 'r1', model: MODEL, effort: 'low', executable: FAKE }) };
};

test('a run keeps the answer, the raw result, and a log line; the account text goes in on stdin', async () => {
  const { dataDir, run } = runIn([{ output: { episodeId: 'A0001#1', count: 2 } }]);
  const [line] = await run();
  assert.deepEqual([line.ok, line.attempts, line.problem, line.outputTokens], [true, 1, null, 20]);
  const dir = join(dataDir, 'llm-raw', 'r1');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, `${ACCOUNT.id}.coded.json`), 'utf8')), { episodeId: '1example_x_probable_nde#1', count: 2 });
  assert.ok(existsSync(join(dir, `${ACCOUNT.id}.1.json`)));
  const { args, stdin } = JSON.parse(readFileSync(join(dataDir, 'echo.0'), 'utf8'));
  assert.match(stdin, /A lantern, a bridge/);
  assert.ok(!args.join(' ').includes('lantern'));
  assert.equal(args[args.indexOf('--system-prompt') + 1], 'Code the account.'); // the same for every account, so it caches
  assert.match(stdin, /^ACCOUNT A0001/);
  // Resumable: a second run skips the account.
  assert.deepEqual(await run(), []);
});

test('an invalid answer is retried once with its problems; a second failure keeps nothing', async () => {
  const fixed = runIn([{ output: { episodeId: 'A0001#1', count: 0 } }, { output: { episodeId: 'A0001#1', count: 3 } }]);
  const [line] = await fixed.run();
  assert.deepEqual([line.ok, line.attempts, line.outputTokens], [true, 2, 40]);
  const retry = JSON.parse(readFileSync(join(fixed.dataDir, 'echo.1'), 'utf8')).stdin;
  assert.match(retry, /broke these rules:\n- count:/);

  const failed = runIn([{ output: { episodeId: 'A0001#1', count: 0 } }]);
  const [bad] = await failed.run();
  assert.deepEqual([bad.ok, bad.attempts], [false, 2]);
  assert.ok(!existsSync(join(failed.dataDir, 'llm-raw', 'r1', `${ACCOUNT.id}.coded.json`)));
});

test('a call another model served is not accepted', async () => {
  const { run } = runIn([{ model: 'claude-opus-5-5', output: { episodeId: 'A0001#1', count: 1 } }]);
  const [line] = await run();
  assert.equal(line.ok, false);
  assert.match(line.problem ?? '', /served by claude-opus-5-5/);
});
