import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formTextMatcher } from './form-text.ts';

// Invented stand-ins for NDERF's wording, so the rule is tested on its own.
const QUESTIONS = ['Did the lantern seem brighter than usual on that evening?'];
const LABELS = ['Yes', 'Brighter than any lantern I own', 'Much dimmer, but not gone out entirely', 'Rowing'];
const isFormText = formTextMatcher(QUESTIONS, LABELS);

test('a run of words inside one question or one label is form text', () => {
  assert.equal(isFormText('lantern seem brighter than usual'), true);
  assert.equal(isFormText('brighter than any lantern i'), true);
  assert.equal(isFormText('dimmer but not gone out'), true);
});

test('so is the end of one label running into the next, as ticked boxes are printed', () => {
  assert.equal(isFormText('i own much dimmer but'), true); // end of one, start of another
  assert.equal(isFormText('yes rowing much dimmer but'), true); // whole labels, then a start
  assert.equal(isFormText("yes 'brighter than any lantern"), true); // a label printed in quotation marks
  assert.equal(isFormText("gone out entirely' rowing yes"), true);
});

test('anything a person could have typed around or between form text is not', () => {
  assert.equal(isFormText('yes the oars slipped away'), false);
  assert.equal(isFormText('brighter than any lantern anywhere'), false); // leaves the label
  assert.equal(isFormText('usual on that evening yes'), false); // a question never runs into an answer
  assert.equal(isFormText('lantern i own it flickered'), false);
  assert.equal(isFormText('rowing rowing gently down there'), false);
  assert.equal(isFormText('seem brighter than any lantern'), false); // spliced from a question and a label
});
