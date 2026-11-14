import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScrapedAccount } from '../derive/input.ts';
import { findQuote, locateQuotes } from './locate.ts';

// An invented account.
const ACCOUNT: ScrapedAccount = {
  id: '1example_x_nde', sha256: null,
  parts: [{
    heading: null, background: {},
    narrative: 'Editor’s note: lightly edited.\nThe ferry tilted   and I slid\ninto the cold “green” water.',
    qa: [{ section: null, question: 'Q?', response: 'Yes  My aunt called it a dream.', answer: 'Yes', comment: 'My aunt called it a dream.' }],
  }],
};
const narrative = ACCOUNT.parts[0].narrative;

test('a quote is found whatever the spacing, case, or style of quotation marks', () => {
  const span = findQuote(narrative, 'the ferry tilted and I slid into the cold "green" water');
  assert.ok(span);
  assert.equal(narrative.slice(span[0], span[1]), 'The ferry tilted   and I slid\ninto the cold “green” water');
  assert.equal(findQuote(narrative, 'the ferry sank'), null); // not paraphrase
  assert.equal(findQuote(narrative, '   '), null);
});

test('evidence quotes become offsets; text that isn\'t the experiencer\'s becomes a span', () => {
  const answer = {
    reactions: [{ reaction: 'dismissed', evidence: [{ source: { kind: 'qa', part: 0, qaIndex: 0 }, quote: 'my aunt called it a dream', basis: 'explicit' }] }],
    nonExperiencerText: [{ source: { kind: 'narrative', part: 0 }, startQuote: "Editor's note", endQuote: 'lightly edited.', kind: 'editor_note' }],
  };
  const { value, problems } = locateQuotes(answer, ACCOUNT);
  assert.deepEqual(problems, []);
  assert.deepEqual(value, {
    reactions: [{ reaction: 'dismissed', evidence: [{ source: { kind: 'qa', part: 0, qaIndex: 0 }, span: [5, 30], basis: 'explicit' }] }],
    nonExperiencerText: [{ source: { kind: 'narrative', part: 0 }, span: [0, 30], kind: 'editor_note' }],
  });
  assert.equal(ACCOUNT.parts[0].qa[0].response.slice(5, 30), 'My aunt called it a dream');
});

test('a quote that can\'t be found, or a place that doesn\'t exist, is a problem for the retry', () => {
  const { problems } = locateQuotes({
    a: [{ source: { kind: 'narrative', part: 0 }, quote: 'a warm sea', basis: 'explicit' }],
    b: [{ source: { kind: 'qa', part: 0, qaIndex: 9 }, quote: 'Yes', basis: 'explicit' }],
    c: [{ source: { kind: 'narrative', part: 0 }, startQuote: 'water', endQuote: 'The ferry', kind: 'boilerplate' }], // out of order
  }, ACCOUNT);
  assert.equal(problems.length, 3);
  assert.match(problems[0], /^a\.0: the quote "a warm sea" isn't in narrative:0/);
  assert.match(problems[1], /^b\.0: there is no qa:0:9/);
  assert.match(problems[2], /^c\.0: the opening or closing words/);
});
