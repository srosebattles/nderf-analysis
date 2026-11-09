// The questionnaire side of the derived file, by rule and with no model: which form a part was
// submitted on, which items it asked, and the menu option picked on each item the schema records
// (DECISIONS.md, areas 1 to 3). Everything here reads NDERF's form text (question wording and
// menu labels) and the position of a menu answer at the start of a response; it never
// interprets what a person wrote. A comment after a menu answer is left for the coder.
//
// The keyword counts (Jesus keywords, area 4's word rules) are not here: they run only after
// the codebook is frozen.

import type {
  BeingItemAnswers, DerivedReligionFields, Evidence, Finding, ItemsAsked, LifeThreatAnswer, Lengths, NderfReligionOption,
  ProvenanceItemAnswers, QuestionnaireForm, ReligionFieldValue, Tradition,
} from '../schema/codebook-schema.ts';
import type { ScrapedPart, ScrapedQA } from './input.ts';

// ─── Comparing form text ────────────────────────────────────────────────────────────────

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** A comparable form of a question or menu label: lowercase, single spaces, straight
 *  apostrophes, and no spaces around hyphens (the religion menu is written both
 *  "Christian- Catholic" and "Christian - Catholic"). A stray "Â" or "┬" ending a word is debris
 *  from a mis-decoded non-breaking space on a few pages. */
export const normalizeLabel = (s: string): string =>
  squash(s.normalize('NFKC').replace(/[Â┬]+(?=\s|$)/g, ''))
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s*-\s*/g, '-');

type Options<T> = readonly (readonly [label: string, value: T])[];

const startsWithLabel = (text: string, label: string): boolean =>
  text.startsWith(label) && !/[\p{L}\p{N}]/u.test(text.charAt(label.length));

/** The menu option a response opens with, if any: the longest label that begins the response
 *  and ends at a word boundary ("Moderate" doesn't match "Moderately religious"). `rest` is
 *  what follows, in comparable form, with the punctuation that closes the label removed. */
export function matchOption<T>(response: string, options: Options<T>): { value: T; rest: string } | null {
  const text = normalizeLabel(response).replace(/^['"]\s*/, '');
  let best: { value: T; length: number } | null = null;
  for (const [label, value] of options) {
    const l = normalizeLabel(label);
    if (startsWithLabel(text, l) && (best === null || l.length > best.length)) best = { value, length: l.length };
  }
  if (best === null) return null;
  return { value: best.value, rest: text.slice(best.length).replace(/^['"]?\s*[.:;,]?\s*/, '') };
}

// ─── The items ──────────────────────────────────────────────────────────────────────────

/** NDERF's wording for each item, in comparable form. The wording drifted a little over the
 *  years ("near death" and "near-death", a missing comma), so these are patterns. */
export const ITEM_PATTERNS = {
  lifeThreat: /^at the tim\.?e of (your|this) experience,? was there an associated life[- ]threatening event/,
  anyBeings: /^did you see any beings in your experience/,
  deceasedOrReligiousSpirits: /^did you see deceased or religious spirits/,
  deceasedOrAlive: /^did you encounter or become aware of any deceased \(or alive\) beings/,
  deceasedOnly: /^did you encounter or become aware of any deceased beings/,
  mysticalBeing: /^did you seem to encounter a mystical being or presence/,
  namedReligiousFigures: /^did you encounter or become aware of any beings who previously lived on earth who are described by name in religions/,
  checklist: /^(the experience included|experience included|what occurred during your experience included:)/,
  priorNdeKnowledge: /^did you have any knowledge of near[- ]death experience \(nde\) prior to your experience/,
  sharedWithOthers: /^have you (ever )?shared this experience with others/,
  realityShortlyAfter: /^what did you believe about the reality of your experience shortly/,
  realityNow: /^what do you believe about the reality of your experience (now|at the current time)/,
  memoryAccuracy: /^how accurately do you remember the experience in comparison to other life events/,
  religionPrior: /^what was your religion pri?or to your experience/,
  religionNow: /^what is your religion now/,
  practicesChanged: /^have your religious practices changed/,
  priorImportance: /^what importance did you place on your religious\/spiritual life prior to your experience/,
  priorBeliefInGod: /^did you believe in the existence of god prior to your experience/,
  priorBeliefInAfterlife: /^did you believe in an afterlife prior to your experience/,
} as const;
export type ItemKey = keyof typeof ITEM_PATTERNS;

/** Which tracked item a question is, or null. */
export function itemOf(question: string): ItemKey | null {
  const q = normalizeLabel(question);
  for (const key of Object.keys(ITEM_PATTERNS) as ItemKey[]) if (ITEM_PATTERNS[key].test(q)) return key;
  return null;
}

// ─── Menu options ───────────────────────────────────────────────────────────────────────

const YES_NO_UNCERTAIN = [['Yes', 'yes'], ['No', 'no'], ['Uncertain', 'uncertain']] as const;

const SAW_SENSED = [
  ['I actually saw them', 'saw'], ['Saw them', 'saw'],
  ['I sensed their presence', 'sensed'], ['Sensed their presence', 'sensed'],
  ['Neither', 'neither'], ['No', 'no'],
] as const;

/** The first label is the older forms' wording, which runs on ("…or unearthly origin"). */
const MYSTICAL_BEING = [
  ['I encountered a definite being, or a voice clearly of mystical or unearthly', 'definite_being_or_voice'],
  ['Definite being, or voice clearly of mystical or other-worldly origin', 'definite_being_or_voice'],
  ['I heard a voice I could not identify', 'unidentifiable_voice'], ['Unidentifiable voice', 'unidentifiable_voice'],
  ['Neither', 'neither'], ['No', 'no'],
] as const;

/** "definately" is NDERF's own spelling on some forms. */
const REALITY = [
  ['Experience was definitely real', 'definitely_real'], ['Experience was definately real', 'definitely_real'],
  ['Experience was probably real', 'probably_real'],
  ['Experience was probably not real', 'probably_not_real'],
  ['Experience was definitely not real', 'definitely_not_real'], ['Experience was definately not real', 'definitely_not_real'],
] as const;

/** These labels are long and some pages cut them short, so the opening words that tell the
 *  options apart are what is matched. */
const MEMORY_ACCURACY = [
  ['I remember the experience more accurately than other life events', 'more'],
  ['I remember the experience as accurately as other life events', 'as'],
  ['I remember the experience less accurately than other life events', 'less'],
  ['I do not know how my remembrance of the experience compares', 'do_not_know'],
] as const;

const IMPORTANCE = [
  ['Not important to me', 'not'], ['Slightly important to me', 'slightly'], ['Moderately important to me', 'moderately'],
  ['Greatly important to me', 'greatly'], ['Unknown', 'unknown'],
] as const;

const BELIEF_IN_GOD = [
  ['God definitely exists', 'definitely'], ['God probably exists', 'probably'], ['I was uncertain if God exists', 'uncertain'],
  ['God probably does not exist', 'probably_not'], ['God does not exist', 'does_not'], ['Unknown', 'unknown'],
] as const;

const BELIEF_IN_AFTERLIFE = [
  ['An afterlife definitely exists', 'definitely'], ['An afterlife probably exists', 'probably'],
  ['I was uncertain if an afterlife exists', 'uncertain'], ['An afterlife probably does not exist', 'probably_not'],
  ['An afterlife does not exist', 'does_not'], ['Unknown', 'unknown'],
] as const;

const CHECKLIST_UNEARTHLY_BEINGS = [['Presence of unearthly beings', true]] as const;
const CHECKLIST_DECEASED_PERSONS = [['Presence of deceased persons', true]] as const;

const ORIENTATION = [
  ['Liberal', 'liberal'], ['Moderate', 'moderate'], ['Conservative/fundamentalist', 'conservative_fundamentalist'],
] as const;

const RELIGION_MENU: Options<NderfReligionOption> = [
  ['Christian- Catholic', 'christian_catholic'], ['Christian- Protestant', 'christian_protestant'],
  ['Christian- Other Christian', 'christian_other'], ['Christian- Mormon', 'christian_mormon'],
  ['Christian- Jehovahs Witness', 'christian_jehovahs_witness'], ["Christian- Jehovah's Witness", 'christian_jehovahs_witness'],
  ['Muslim', 'muslim'], ['Jewish', 'jewish'], ['Hindu', 'hindu'], ['Buddhist', 'buddhist'],
  ['Native American religion', 'native_american'],
  ['Other faiths- New age', 'other_new_age'], ['Other faiths- Unitarian and other liberal faiths', 'other_unitarian_liberal'],
  ['Other or several faiths', 'other_or_several'],
  ['Unaffiliated- Atheist', 'unaffiliated_atheist'], ['Unaffiliated- Agnostic', 'unaffiliated_agnostic'],
  ['Unaffiliated- Nothing in particular- Religious unaffiliated', 'unaffiliated_nothing_religious'],
  ['Unaffiliated- Nothing in particular- Secular unaffiliated', 'unaffiliated_nothing_secular'],
  ['Do not know', 'do_not_know'], ['No comment', 'no_comment'], ['Select', 'select'],
];

/** Menu labels no orientation form could contain by chance: a single typed word such as
 *  "Jewish" on an older form is free text, not a menu answer, so it doesn't mark the form. */
const DISTINCTIVE_MENU_OPTIONS = RELIGION_MENU.filter(([, v]) => !['muslim', 'jewish', 'hindu', 'buddhist', 'select'].includes(v));

/** NDERF's menu option as our tradition (DECISIONS.md, area 2); null for the options that carry none. */
export function traditionOf(option: NderfReligionOption): Tradition | null {
  switch (option) {
    case 'christian_catholic': return { family: 'catholic', rite: null };
    case 'christian_protestant': return { family: 'protestant', protestantFamily: 'unspecified', body: null };
    case 'christian_other': return { family: 'christian_unspecified' };
    case 'christian_mormon': return { family: 'latter_day_saints' };
    case 'christian_jehovahs_witness': return { family: 'jehovahs_witnesses' };
    case 'muslim': return { family: 'muslim', branch: null, detail: null };
    case 'jewish': return { family: 'jewish', movement: null };
    case 'hindu': return { family: 'hindu', detail: null };
    case 'buddhist': return { family: 'buddhist', detail: null };
    case 'native_american': return { family: 'indigenous', detail: null };
    case 'other_new_age': return { family: 'new_age', detail: null };
    case 'other_unitarian_liberal': return { family: 'unitarian_universalist', detail: null };
    case 'unaffiliated_atheist': return { family: 'unaffiliated', kind: 'atheist' };
    case 'unaffiliated_agnostic': return { family: 'unaffiliated', kind: 'agnostic' };
    case 'unaffiliated_nothing_religious': return { family: 'unaffiliated', kind: 'nothing_religious' };
    case 'unaffiliated_nothing_secular': return { family: 'unaffiliated', kind: 'nothing_secular' };
    case 'do_not_know': case 'no_comment': case 'select': case 'other_or_several': case 'unrecognized': return null;
  }
}

// ─── The life-threat item ───────────────────────────────────────────────────────────────

/** The item's sub-menu of causes, as NDERF labels them. */
export const LIFE_THREAT_CAUSES = [
  'Accident', 'Illness', 'Surgery-related', 'Heart attack', 'Allergic reaction', 'Childbirth', 'Criminal attack',
  'Direct head injury', 'Drowning', 'Drug or medication overdose', 'Suicide attempt', 'While under general anesthesia',
] as const;
const CAUSE_OPTIONS: Options<string> = LIFE_THREAT_CAUSES.map((c) => [c, c] as const);

const SEVERITY: Options<NonNullable<LifeThreatAnswer['severity']>> = [
  ['Clinical death (cessation of breathing or heart function or brain function)', 'clinical_death'],
  ['Life threatening event, but not clinical death', 'life_threatening_not_clinical_death'],
  ['Illness, trauma or other condition not considered life threatening', 'not_life_threatening'],
];

/** The response is the menu answer, then any causes ticked, then a severity option, each run
 *  together with whatever the person typed: "Yes Accident Direct head injury. Life threatening
 *  event, but not clinical death. <their words>". Causes are read only from the front, where the
 *  menu puts them, so the same word typed later in a sentence isn't taken for a ticked box; two
 *  ticked causes are sometimes printed with no space between them. A typed cause, and the
 *  severity option "Other", are left for the coder. */
export function parseLifeThreat(response: string): LifeThreatAnswer {
  const opening = matchOption(response, YES_NO_UNCERTAIN);
  let rest = opening ? opening.rest : normalizeLabel(response);
  const causes: string[] = [];
  for (;;) {
    const cause = matchOption(rest, CAUSE_OPTIONS) ?? gluedCause(rest);
    if (cause === null || causes.includes(cause.value)) break;
    causes.push(cause.value);
    rest = cause.rest;
  }
  let severity: LifeThreatAnswer['severity'] = null;
  let at = Infinity;
  for (const [label, value] of SEVERITY) {
    const i = rest.indexOf(normalizeLabel(label));
    if (i >= 0 && i < at) [at, severity] = [i, value];
  }
  return { answer: opening?.value ?? null, causes, severity };
}

/** A cause printed with no space before the next cause: "AccidentDirect head injury". */
function gluedCause(text: string): { value: string; rest: string } | null {
  for (const cause of LIFE_THREAT_CAUSES) {
    const label = normalizeLabel(cause);
    if (!text.startsWith(label)) continue;
    const rest = text.slice(label.length);
    if (matchOption(rest, CAUSE_OPTIONS) !== null) return { value: cause, rest };
  }
  return null;
}

// ─── One part ───────────────────────────────────────────────────────────────────────────

export interface DerivedQuestionnaire {
  questionnaire: { form: QuestionnaireForm; itemsAsked: ItemsAsked };
  lifeThreat: Finding<LifeThreatAnswer>;
  beingItems: BeingItemAnswers;
  provenanceItems: ProvenanceItemAnswers;
  religionField: DerivedReligionFields;
  lengths: Lengths;
}

const words = (s: string | null | undefined): number => (s ?? '').trim().split(/\s+/).filter(Boolean).length;

/** Narrative words, and the questionnaire's free text as the scraper splits it: each answer's
 *  comment, or the whole response when it has no leading menu answer. */
export function lengthsOf(part: ScrapedPart): Lengths {
  const narrativeWords = words(part.narrative);
  const questionnaireFreeTextWords = part.qa.reduce((n, q) => n + words(q.comment ?? (q.answer === null ? q.response : '')), 0);
  return { narrativeWords, questionnaireFreeTextWords, totalWords: narrativeWords + questionnaireFreeTextWords };
}

/** Forms are told apart by the items present, never by dates (DECISIONS.md, area 1). */
export function assignForm(part: ScrapedPart, items: ItemsAsked, hasBeforeAfterItems: boolean): QuestionnaireForm {
  if (part.qa.length === 0) return 'none';
  const { religionField, deceasedOrReligiousSpirits: spirits, experienceIncludedChecklist: checklist, namedReligiousFigures: named } = items;
  if (items.deceasedBeings === 'deceased_only' && !spirits) return 'F';
  // Form A has no religion-before item, and some form A parts carry no religion item at all.
  if (religionField !== 'affiliation_menu' && !spirits && checklist) return 'A';
  if (religionField === 'orientation') {
    if (spirits && !checklist) return 'B';
    if (spirits && checklist) return 'C';
  }
  if (religionField === 'affiliation_menu' && named) {
    if (hasBeforeAfterItems) return 'D';
    if (!checklist) return 'E';
  }
  return 'irregular';
}

export function deriveQuestionnaire(part: ScrapedPart, partIndex: number): DerivedQuestionnaire {
  // The first question of each kind; the checklist prints one question per box ticked.
  const first = new Map<ItemKey, { qa: ScrapedQA; qaIndex: number }>();
  const ticked: { qa: ScrapedQA; qaIndex: number }[] = [];
  part.qa.forEach((qa, qaIndex) => {
    const key = itemOf(qa.question);
    if (key === null) return;
    if (key === 'checklist') ticked.push({ qa, qaIndex });
    if (!first.has(key)) first.set(key, { qa, qaIndex });
  });
  const evidence = (qaIndex: number): Evidence[] => [{ source: { kind: 'qa', part: partIndex, qaIndex }, basis: 'explicit' }];

  /** not_asked: the item isn't on this part's form. not_stated: asked and left blank. Otherwise
   *  the option the response opens with, or 'unrecognized' when it opens with none. */
  const menu = <T>(key: ItemKey, options: Options<T>): Finding<T | 'unrecognized'> => {
    const item = first.get(key);
    if (!item) return { status: 'not_asked' };
    if (squash(item.qa.response) === '') return { status: 'not_stated' };
    return { status: 'present', value: matchOption(item.qa.response, options)?.value ?? 'unrecognized', evidence: evidence(item.qaIndex) };
  };
  const box = (options: Options<true>): Finding<boolean> => {
    if (ticked.length === 0) return { status: 'not_asked' };
    const hit = ticked.find((t) => matchOption(t.qa.response, options) !== null);
    return { status: 'present', value: hit !== undefined, evidence: hit ? evidence(hit.qaIndex) : [] };
  };

  // Orientation or affiliation menu: the two share one question, so the answers decide, and
  // where neither answer shows it, the items that arrived with the menu do.
  const religionItems = [first.get('religionPrior'), first.get('religionNow')].filter((i) => i !== undefined);
  const opensWith = (options: Options<unknown>) => religionItems.some((i) => matchOption(i.qa.response, options) !== null);
  const religionKind: ItemsAsked['religionField'] =
    religionItems.length === 0 ? 'absent'
    : opensWith(ORIENTATION) ? 'orientation'
    : opensWith(DISTINCTIVE_MENU_OPTIONS) ? 'affiliation_menu'
    : first.has('namedReligiousFigures') || first.has('deceasedOnly') ? 'affiliation_menu'
    : 'orientation';

  const religion = (key: ItemKey): Finding<ReligionFieldValue> => {
    const item = first.get(key);
    if (!item) return { status: 'not_asked' };
    if (squash(item.qa.response) === '') return { status: 'not_stated' };
    const unrecognized: ReligionFieldValue = { format: 'menu', option: 'unrecognized', tradition: null, hasFreeText: true };
    let value: ReligionFieldValue = unrecognized;
    if (religionKind === 'orientation') {
      const m = matchOption(item.qa.response, ORIENTATION);
      if (m) value = { format: 'orientation', orientation: m.value, hasFreeText: m.rest !== '' };
    } else {
      const m = matchOption(item.qa.response, RELIGION_MENU);
      if (m) value = { format: 'menu', option: m.value, tradition: traditionOf(m.value), hasFreeText: m.rest !== '' };
    }
    return { status: 'present', value, evidence: evidence(item.qaIndex) };
  };

  const lifeThreatItem = first.get('lifeThreat');
  const lifeThreat: Finding<LifeThreatAnswer> = !lifeThreatItem
    ? { status: 'not_asked' }
    : squash(lifeThreatItem.qa.response) === ''
      ? { status: 'not_stated' }
      : { status: 'present', value: parseLifeThreat(lifeThreatItem.qa.response), evidence: evidence(lifeThreatItem.qaIndex) };

  const itemsAsked: ItemsAsked = {
    religionField: religionKind,
    namedReligiousFigures: first.has('namedReligiousFigures'),
    deceasedOrReligiousSpirits: first.has('deceasedOrReligiousSpirits'),
    deceasedBeings: first.has('deceasedOrAlive') ? 'deceased_or_alive' : first.has('deceasedOnly') ? 'deceased_only' : 'absent',
    mysticalBeing: first.has('mysticalBeing'),
    anyBeings: first.has('anyBeings'),
    experienceIncludedChecklist: ticked.length > 0,
    lifeThreat: first.has('lifeThreat'),
  };
  const hasBeforeAfterItems = first.has('priorBeliefInGod') || first.has('priorBeliefInAfterlife') || first.has('priorImportance');

  return {
    questionnaire: { form: assignForm(part, itemsAsked, hasBeforeAfterItems), itemsAsked },
    lifeThreat,
    beingItems: {
      anyBeings: menu('anyBeings', SAW_SENSED),
      deceasedOrReligiousSpirits: menu('deceasedOrReligiousSpirits', SAW_SENSED),
      deceasedBeings: menu(first.has('deceasedOrAlive') ? 'deceasedOrAlive' : 'deceasedOnly', YES_NO_UNCERTAIN),
      mysticalBeing: menu('mysticalBeing', MYSTICAL_BEING),
      namedReligiousFigures: menu('namedReligiousFigures', YES_NO_UNCERTAIN),
      checklistUnearthlyBeings: box(CHECKLIST_UNEARTHLY_BEINGS),
      checklistDeceasedPersons: box(CHECKLIST_DECEASED_PERSONS),
    },
    provenanceItems: {
      priorNdeKnowledge: menu('priorNdeKnowledge', YES_NO_UNCERTAIN),
      sharedWithOthers: menu('sharedWithOthers', YES_NO_UNCERTAIN),
      realityShortlyAfter: menu('realityShortlyAfter', REALITY),
      realityNow: menu('realityNow', REALITY),
      memoryAccuracy: menu('memoryAccuracy', MEMORY_ACCURACY),
    },
    religionField: {
      prior: religion('religionPrior'),
      now: religion('religionNow'),
      practicesChanged: menu('practicesChanged', YES_NO_UNCERTAIN),
      priorImportance: menu('priorImportance', IMPORTANCE),
      priorBeliefInGod: menu('priorBeliefInGod', BELIEF_IN_GOD),
      priorBeliefInAfterlife: menu('priorBeliefInAfterlife', BELIEF_IN_AFTERLIFE),
    },
    lengths: lengthsOf(part),
  };
}
