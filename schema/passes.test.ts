import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConditionType, HALLUCINATION_FLAG_CONDITIONS } from './codebook-schema.ts';
import { LATER_CONDITION_TYPES, LATER_CONDITION_TYPES_PASS, LATER_PASSES, laterPassOf, schemaAt } from './passes.ts';

test('every listed field exists in the coded record', () => {
  for (const pass of LATER_PASSES) {
    for (const path of [...pass.fields, ...pass.alsoCodes]) {
      assert.ok(schemaAt(path) !== null, `${pass.id}: no such field ${path}`);
    }
  }
  assert.equal(schemaAt('encounters[].noSuchField'), null);
  assert.equal(schemaAt('encounters.identity'), null); // a list needs []
});

test('pass ids are unique, and no field waits for two passes', () => {
  const ids = LATER_PASSES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  const fields = LATER_PASSES.flatMap((p) => p.fields);
  assert.equal(new Set(fields).size, fields.length);
  // No listed field sits beneath another listed field.
  for (const f of fields) {
    assert.ok(!fields.some((g) => g !== f && (f.startsWith(`${g}.`) || f.startsWith(`${g}[]`))), `${f} is inside another listed field`);
  }
});

test('a pass also codes only fields that another later pass owns', () => {
  for (const pass of LATER_PASSES) {
    for (const path of pass.alsoCodes) {
      const owner = laterPassOf(path);
      assert.ok(owner !== null && owner !== pass.id, `${pass.id}: ${path} should be owned by another later pass`);
    }
  }
});

test('a path beneath a listed field belongs to that field\'s pass', () => {
  assert.equal(laterPassOf('encounters[].visualDetails'), 'appearance');
  assert.equal(laterPassOf('encounters[].visualDetails[].colors'), 'appearance');
  assert.equal(laterPassOf('encounters[].vital.apparentAge.statedYears'), 'people');
  assert.equal(laterPassOf('encounters[].vital.status'), null);
  assert.equal(laterPassOf('encounters[].identity[].tie.relationship'), null);
});

test('the first run codes everything the main question, the Jesus ladder, and area 4 read', () => {
  const firstRun = [
    // Eligibility and background.
    'parts', 'episodes[].reporter', 'episodes[].circumstance', 'episodes[].child', 'episodes[].age', 'episodes[].textDate',
    'episodes[].describesExperience', 'episodes[].tone', 'episodes[].surroundingsAlive', 'nonExperiencerText', 'textClaims',
    'background.religionStatements', 'background.heritageStatements', 'conditions',
    // The census of encounters.
    'encounters[].perceivedBy', 'encounters[].presence', 'encounters[].count', 'encounters[].identity',
    'encounters[].identity[].tie.relationship', 'encounters[].identity[].tie.religiousRole', 'encounters[].familiarity',
    'encounters[].vital.status', 'encounters[].vital.experiencerKnew', 'encounters[].apparentSex',
    'encounters[].imageComparisons', 'encounters[].sameBeingAs',
    // The Jesus ladder reads the mentions and, through them, the doctrinal statements.
    'jesusMentions', 'doctrinalStatements',
    // Area 4's direct measure, and what selects accounts for the later passes.
    'provenance.exposures', 'provenance.priorDevotion', 'provenance.memory', 'provenance.influenceStatements',
  ];
  for (const path of firstRun) {
    assert.ok(schemaAt(path) !== null, `no such field ${path}`);
    assert.equal(laterPassOf(path), null, `${path} should be in the first run`);
  }
});

test('the Marian pass supplies everything Mary\'s levels read beyond the first run', () => {
  const marian = LATER_PASSES.find((p) => p.id === 'marian');
  assert.ok(marian);
  const supplied = [...marian.fields, ...marian.alsoCodes];
  // resolveEncounter reads these (resolve-area3.ts).
  for (const key of ['confessionalContent', 'maternalLanguage', 'visualDetails', 'actions', 'communication']) {
    assert.ok(supplied.includes(`encounters[].${key}`), `the Marian pass doesn't code ${key}`);
  }
  for (const key of ['identity', 'apparentSex', 'presence']) assert.equal(laterPassOf(`encounters[].${key}`), null);
});

test('condition types split cleanly between the first run and the later pass', () => {
  assert.equal(LATER_CONDITION_TYPES.length + HALLUCINATION_FLAG_CONDITIONS.length, ConditionType.options.length);
  assert.ok(LATER_CONDITION_TYPES.every((c) => !HALLUCINATION_FLAG_CONDITIONS.includes(c)));
  assert.ok(LATER_CONDITION_TYPES.includes('autism') && LATER_CONDITION_TYPES.includes('other_mental_health'));
  assert.ok(LATER_PASSES.some((p) => p.id === LATER_CONDITION_TYPES_PASS));
});
