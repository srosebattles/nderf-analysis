import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DerivedPart, NON_TRADITION_OPTIONS, NderfReligionOption } from '../schema/codebook-schema.ts';
import type { ScrapedPart, ScrapedQA } from './input.ts';
import { assignForm, deriveQuestionnaire, itemOf, lengthsOf, matchOption, normalizeLabel, parseLifeThreat, traditionOf } from './questionnaire.ts';

// Question wording and menu labels are NDERF's form text. Everything a person might have typed
// is invented.
const Q = {
  lifeThreat: 'At the time of your experience, was there an associated life-threatening event?',
  anyBeings: 'Did you see any beings in your experience?',
  spirits: 'Did you see deceased or religious spirits?',
  deceasedOrAlive: 'Did you encounter or become aware of any deceased (or alive) beings?',
  deceasedOnly: 'Did you encounter or become aware of any deceased beings?',
  mystical: 'Did you seem to encounter a mystical being or presence, or hear an unidentifiable voice?',
  named: 'Did you encounter or become aware of any beings who previously lived on earth who are described by name in religions (for example: Jesus, Muhammad, Buddha, etc.)?',
  checklist: 'The experience included:',
  knowledge: 'Did you have any knowledge of near death experience (NDE) prior to your experience?',
  shared: 'Have you ever shared this experience with others?',
  realityAfter: 'What did you believe about the reality of your experience shortly (days to weeks) after it happened?',
  realityNow: 'What do you believe about the reality of your experience now?',
  memory: 'How accurately do you remember the experience in comparison to other life events that occurred around the time of the experience?',
  religionPrior: 'What was your religion prior to your experience?',
  religionNow: 'What is your religion now?',
  practices: 'Have your religious practices changed since your experience?',
  importance: 'What importance did you place on your religious/spiritual life prior to your experience?',
  god: 'Did you believe in the existence of God prior to your experience?',
  afterlife: 'Did you believe in an afterlife prior to your experience?',
};
const qa = (question: string, response: string): ScrapedQA => ({ section: null, question, response, answer: null, comment: null });
const part = (items: ScrapedQA[], narrative = 'Seven invented words make up this narrative.'): ScrapedPart => ({ heading: null, narrative, background: {}, qa: items });
const Shape = DerivedPart.pick({ questionnaire: true, lifeThreat: true, beingItems: true, provenanceItems: true, religionField: true, lengths: true });
const derive = (items: ScrapedQA[]) => {
  const d = deriveQuestionnaire(part(items), 0);
  const parsed = Shape.safeParse(d);
  assert.ok(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues));
  return d;
};
const valueOf = <T>(f: { status: string; value?: T }) => (f.status === 'present' ? f.value : f.status);

test('labels compare without regard to case, spacing around hyphens, or encoding debris', () => {
  assert.equal(normalizeLabel('Christian - Catholic'), normalizeLabel('Christian- Catholic'));
  assert.equal(normalizeLabel('  Surgery-related '), 'surgery-related');
  assert.equal(normalizeLabel('God probably existsÂ'), 'god probably exists');
  assert.equal(normalizeLabel('Jehovah’s Witness'), "jehovah's witness");
});

test('a response opens with a menu option only at a word boundary, and the longest label wins', () => {
  const options = [['Moderate', 'm'], ['No', 'n'], ['No comment', 'nc']] as const;
  assert.deepEqual(matchOption('Moderate', options), { value: 'm', rest: '' });
  assert.deepEqual(matchOption('Moderate. Grew up near a chapel', options), { value: 'm', rest: 'grew up near a chapel' });
  assert.equal(matchOption('Moderately observant', options), null);
  assert.equal(matchOption('No comment', options)?.value, 'nc');
  assert.equal(matchOption('No: never', options)?.value, 'n');
  assert.equal(matchOption("'No comment' thanks", options)?.rest, 'thanks');
  assert.equal(matchOption('Nothing', options), null);
});

test('questions are recognized through their small changes of wording', () => {
  assert.equal(itemOf(Q.lifeThreat), 'lifeThreat');
  assert.equal(itemOf('At the time of your experience was there an associated life-threatening event?'), 'lifeThreat');
  assert.equal(itemOf('Did you have any knowledge of near-death experience (NDE) prior to your experience?'), 'priorNdeKnowledge');
  assert.equal(itemOf(Q.deceasedOrAlive), 'deceasedOrAlive');
  assert.equal(itemOf(Q.deceasedOnly), 'deceasedOnly');
  assert.equal(itemOf('Have your religious practices changed?'), 'practicesChanged');
  assert.equal(itemOf('What occurred during your experience included:'), 'checklist');
  // Asked on form D but not recorded by the schema.
  assert.equal(itemOf('What importance do you place on your religious/spiritual life after your experience?'), null);
  assert.equal(itemOf('Did you see an unearthly light?'), null);
});

test('the life-threat item: answer, ticked causes from the front, and the severity option', () => {
  assert.deepEqual(parseLifeThreat("Yes Accident 'Life threatening event, but not clinical death'"), {
    answer: 'yes', causes: ['Accident'], severity: 'life_threatening_not_clinical_death',
  });
  assert.deepEqual(parseLifeThreat('Uncertain. Accident. Direct head injury. Clinical death (cessation of breathing or heart function or brain function). A kayak tipped.'), {
    answer: 'uncertain', causes: ['Accident', 'Direct head injury'], severity: 'clinical_death',
  });
  // Two ticked causes printed with no space between them.
  assert.deepEqual(parseLifeThreat('Yes AccidentAllergic reaction Other bee stings'), { answer: 'yes', causes: ['Accident', 'Allergic reaction'], severity: null });
  // Typed words between the causes and the severity option.
  assert.deepEqual(parseLifeThreat('Yes Illness a burst appendix Illness, trauma or other condition not considered life threatening'), {
    answer: 'yes', causes: ['Illness'], severity: 'not_life_threatening',
  });
  // Older forms give the cause with no Yes or No.
  assert.deepEqual(parseLifeThreat('Surgery-related'), { answer: null, causes: ['Surgery-related'], severity: null });
  // A cause word inside what the person typed is not a ticked box.
  assert.deepEqual(parseLifeThreat('Yes Accidentally swallowed a marble'), { answer: 'yes', causes: [], severity: null });
  assert.deepEqual(parseLifeThreat('Yes a boating mishap, then an illness'), { answer: 'yes', causes: [], severity: null });
  assert.deepEqual(parseLifeThreat('No'), { answer: 'no', causes: [], severity: null });
});

test('menu options map to our traditions, and to none exactly where the schema says so', () => {
  assert.deepEqual(traditionOf('christian_mormon'), { family: 'latter_day_saints' });
  assert.deepEqual(traditionOf('christian_jehovahs_witness'), { family: 'jehovahs_witnesses' });
  assert.deepEqual(traditionOf('christian_other'), { family: 'christian_unspecified' });
  assert.deepEqual(traditionOf('unaffiliated_nothing_religious'), { family: 'unaffiliated', kind: 'nothing_religious' });
  for (const option of NderfReligionOption.options) {
    assert.equal(traditionOf(option) === null, NON_TRADITION_OPTIONS.includes(option), option);
  }
});

const FORM_B = [
  qa(Q.lifeThreat, 'Yes Illness'), qa(Q.anyBeings, 'I actually saw them'), qa(Q.spirits, 'I sensed their presence A lamplighter.'),
  qa(Q.deceasedOrAlive, 'Uncertain'), qa(Q.mystical, 'I encountered a definite being, or a voice clearly of mystical or unearthly origin'),
  qa(Q.knowledge, 'No'), qa(Q.shared, 'Yes. Told my cousin.'), qa(Q.realityAfter, 'Experience was definately not real'),
  qa(Q.realityNow, 'Experience was probably real.'), qa(Q.religionPrior, 'Moderate Chapel on holidays'), qa(Q.religionNow, 'Liberal'),
  qa(Q.practices, 'Yes'),
];

test('an orientation form: options, free text, and items the form lacks', () => {
  const d = derive(FORM_B);
  assert.equal(d.questionnaire.form, 'B');
  assert.deepEqual(d.questionnaire.itemsAsked, {
    religionField: 'orientation', namedReligiousFigures: false, deceasedOrReligiousSpirits: true, deceasedBeings: 'deceased_or_alive',
    mysticalBeing: true, anyBeings: true, experienceIncludedChecklist: false, lifeThreat: true,
  });
  assert.equal(valueOf(d.beingItems.anyBeings), 'saw');
  assert.equal(valueOf(d.beingItems.deceasedOrReligiousSpirits), 'sensed');
  assert.equal(valueOf(d.beingItems.deceasedBeings), 'uncertain');
  assert.equal(valueOf(d.beingItems.mysticalBeing), 'definite_being_or_voice');
  assert.equal(valueOf(d.beingItems.namedReligiousFigures), 'not_asked');
  assert.equal(valueOf(d.beingItems.checklistUnearthlyBeings), 'not_asked');
  assert.equal(valueOf(d.provenanceItems.realityShortlyAfter), 'definitely_not_real');
  assert.equal(valueOf(d.provenanceItems.realityNow), 'probably_real');
  assert.equal(valueOf(d.provenanceItems.memoryAccuracy), 'not_asked');
  assert.deepEqual(valueOf(d.religionField.prior), { format: 'orientation', orientation: 'moderate', hasFreeText: true });
  assert.deepEqual(valueOf(d.religionField.now), { format: 'orientation', orientation: 'liberal', hasFreeText: false });
  assert.equal(valueOf(d.religionField.priorBeliefInGod), 'not_asked');
  // Evidence points at the question the answer came from.
  assert.deepEqual(d.beingItems.anyBeings.status === 'present' && d.beingItems.anyBeings.evidence, [
    { source: { kind: 'qa', part: 0, qaIndex: 1 }, basis: 'explicit' },
  ]);
});

test('the checklist prints one question per box ticked', () => {
  const d = derive([...FORM_B, qa(Q.checklist, 'Light'), qa(Q.checklist, 'Presence of deceased persons')]);
  assert.equal(d.questionnaire.form, 'C');
  assert.equal(valueOf(d.beingItems.checklistDeceasedPersons), true);
  assert.equal(valueOf(d.beingItems.checklistUnearthlyBeings), false);
  assert.deepEqual(d.beingItems.checklistUnearthlyBeings.status === 'present' && d.beingItems.checklistUnearthlyBeings.evidence, []);
});

test('form A has no spirits item, and may have no religion item at all', () => {
  const a = [qa(Q.lifeThreat, 'Accident'), qa(Q.deceasedOrAlive, 'No'), qa(Q.checklist, 'Tunnel')];
  assert.equal(derive([...a, qa(Q.religionNow, 'Conservative/fundamentalist')]).questionnaire.form, 'A');
  const none = derive(a);
  assert.equal(none.questionnaire.form, 'A');
  assert.equal(none.questionnaire.itemsAsked.religionField, 'absent');
  assert.equal(valueOf(none.religionField.prior), 'not_asked');
});

const FORM_E = [
  qa(Q.lifeThreat, 'No'), qa(Q.anyBeings, 'Neither'), qa(Q.spirits, 'No'), qa(Q.deceasedOrAlive, 'Yes'), qa(Q.named, 'Uncertain. Hard to say.'),
  qa(Q.memory, 'I remember the experience more accurately than other life events that occurred around the time of th'),
  qa(Q.religionPrior, 'Christian - Other Christian'), qa(Q.religionNow, 'Unaffiliated- Nothing in particular- Religious unaffiliated. Still pray.'),
];

test('the affiliation menu, the forms that carry it, and the items that came with it', () => {
  const e = derive(FORM_E);
  assert.equal(e.questionnaire.form, 'E');
  assert.equal(e.questionnaire.itemsAsked.religionField, 'affiliation_menu');
  assert.deepEqual(valueOf(e.religionField.prior), { format: 'menu', option: 'christian_other', tradition: { family: 'christian_unspecified' }, hasFreeText: false });
  assert.deepEqual(valueOf(e.religionField.now), {
    format: 'menu', option: 'unaffiliated_nothing_religious', tradition: { family: 'unaffiliated', kind: 'nothing_religious' }, hasFreeText: true,
  });
  assert.equal(valueOf(e.beingItems.namedReligiousFigures), 'uncertain');
  assert.equal(valueOf(e.provenanceItems.memoryAccuracy), 'more'); // the label is cut short on some pages

  const d = derive([...FORM_E, qa(Q.importance, 'Slightly important to me'), qa(Q.god, 'God probably does not exist'), qa(Q.afterlife, 'Unknown'), qa(Q.checklist, 'Void')]);
  assert.equal(d.questionnaire.form, 'D');
  assert.equal(valueOf(d.religionField.priorImportance), 'slightly');
  assert.equal(valueOf(d.religionField.priorBeliefInGod), 'probably_not');
  assert.equal(valueOf(d.religionField.priorBeliefInAfterlife), 'unknown'); // NDERF's own option, not a failure to match

  const f = derive([qa(Q.lifeThreat, 'Yes'), qa(Q.anyBeings, 'Saw them'), qa(Q.deceasedOnly, 'No'), qa(Q.named, 'No'), qa(Q.religionPrior, 'Hindu'), qa('Have your religious practices changed?', 'No')]);
  assert.equal(f.questionnaire.form, 'F');
  assert.equal(f.questionnaire.itemsAsked.deceasedBeings, 'deceased_only');
  assert.equal(valueOf(f.beingItems.deceasedBeings), 'no');
  assert.deepEqual(valueOf(f.religionField.prior), { format: 'menu', option: 'hindu', tradition: { family: 'hindu', detail: null }, hasFreeText: false });
});

test('blank and unmatched answers stay apart from options, and a typed word does not mark a menu form', () => {
  const d = derive([
    qa(Q.lifeThreat, '  '), qa(Q.anyBeings, 'Shapes, maybe'), qa(Q.spirits, 'No'), qa(Q.shared, ''), qa(Q.practices, 'Somewhat'),
    qa(Q.religionPrior, 'Jewish'), qa(Q.religionNow, 'Moderate'),
  ]);
  assert.equal(d.lifeThreat.status, 'not_stated');
  assert.equal(valueOf(d.beingItems.anyBeings), 'unrecognized');
  assert.equal(d.provenanceItems.sharedWithOthers.status, 'not_stated');
  assert.equal(valueOf(d.religionField.practicesChanged), 'unrecognized');
  // "Jewish" typed on an orientation form is free text for the coder, not the menu's option.
  assert.equal(d.questionnaire.itemsAsked.religionField, 'orientation');
  assert.deepEqual(valueOf(d.religionField.prior), { format: 'menu', option: 'unrecognized', tradition: null, hasFreeText: true });
  assert.deepEqual(valueOf(d.religionField.now), { format: 'orientation', orientation: 'moderate', hasFreeText: false });
  // With neither answer telling, the named-figures item shows the form had the menu.
  const menuForm = derive([qa(Q.named, 'No'), qa(Q.spirits, 'No'), qa(Q.religionPrior, 'Jewish'), qa(Q.religionNow, 'Raised in several')]);
  assert.equal(menuForm.questionnaire.itemsAsked.religionField, 'affiliation_menu');
  assert.equal((valueOf(menuForm.religionField.prior) as { option: string }).option, 'jewish');
  assert.equal((valueOf(menuForm.religionField.now) as { option: string }).option, 'unrecognized');
});

test('pages with no questionnaire, and forms that fit no definition', () => {
  const none = deriveQuestionnaire(part([]), 0);
  assert.equal(none.questionnaire.form, 'none');
  assert.equal(none.lifeThreat.status, 'not_asked');
  assert.equal(derive([qa(Q.lifeThreat, 'Yes'), qa(Q.deceasedOrAlive, 'No')]).questionnaire.form, 'irregular');
  const items = derive(FORM_E).questionnaire.itemsAsked;
  assert.equal(assignForm(part(FORM_E), { ...items, namedReligiousFigures: false }, false), 'irregular');
});

test('lengths count the narrative and the free text the scraper split off', () => {
  const p = part(
    [
      { section: null, question: Q.shared, response: 'Yes Told my cousin', answer: 'Yes', comment: 'Told my cousin' },
      { section: null, question: Q.lifeThreat, response: 'No', answer: 'No', comment: null },
      { section: null, question: 'Anything else to add?', response: 'Only this', answer: null, comment: null },
    ],
    'Four words of narrative.',
  );
  assert.deepEqual(lengthsOf(p), { narrativeWords: 4, questionnaireFreeTextWords: 5, totalWords: 9 });
});
