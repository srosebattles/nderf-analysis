// Fixtures are invented: '1example_x_nde' is not a real account, and no text here comes from one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CodedRecord, DerivedRecord, HALLUCINATION_FLAG_CONDITIONS, JESUS_KEYWORDS_BROAD, ResolvedAccount, ResolvedEpisode,
  ReligionFieldValue, countKeyword,
  type CodedRecord as CodedRecordType, type DerivedRecord as DerivedRecordType, type Evidence,
} from './codebook-schema.ts';
import { Encounter, ResolvedJesus as ResolvedJesusSchema } from './codebook-schema.ts';
import { resolveEncounter, resolveJesus } from './resolve-area3.ts';

const SHA = 'a'.repeat(64);
const narrative = (start: number, end: number): Evidence => ({
  source: { kind: 'narrative', part: 0 },
  span: [start, end],
  basis: 'explicit',
});
/** A questionnaire item; with a span, a passage in its response. */
const qa = (qaIndex: number, span?: [number, number]): Evidence => ({
  source: { kind: 'qa', part: 0, qaIndex },
  ...(span ? { span } : {}),
  basis: 'explicit',
});
const EP = '1example_x_nde#1';

const derived: DerivedRecordType = {
  accountId: '1example_x_nde',
  sourceSha256: SHA,
  deriveVersion: '0.1.0',
  nderf: {
    classificationRaw: { page: 'NDE', listings: ['NDE'], searchSite: [] },
    classificationTokens: ['nde'],
    classificationHedged: false,
    exceptional: false,
    tagsRaw: ['From Mexico. Original in Spanish, translated to English by Ana.'],
    contentWarning: false,
    nonWesternLabel: false,
    greysonScore: null,
    ageBand: null,
    countryAi: null,
    experienceDate: null,
    formVersion: null,
  },
  posting: { firstPosted: '2014-03-02', allPosted: ['2014-03-02'], submitted: null, flags: [] },
  parts: [
    {
      index: 0,
      questionnaire: {
        form: 'D',
        itemsAsked: {
          religionField: 'affiliation_menu', namedReligiousFigures: true, deceasedOrReligiousSpirits: true,
          deceasedBeings: 'deceased_or_alive', mysticalBeing: true, anyBeings: true,
          experienceIncludedChecklist: true, lifeThreat: true,
        },
      },
      lifeThreat: {
        status: 'present',
        value: { answer: 'yes', causes: ['Accident'], severity: 'clinical_death' },
        evidence: [{ source: { kind: 'qa', part: 0, qaIndex: 0 }, basis: 'explicit' }],
      },
      backgroundDate: { raw: '06/1987', year: 1987, month: 6, day: null, precision: 'month', flags: [] },
      gender: 'Female',
      religionField: {
        prior: {
          status: 'present',
          value: { format: 'menu', option: 'christian_other', tradition: { family: 'christian_unspecified' }, hasFreeText: true },
          evidence: [],
        },
        now: { status: 'present', value: { format: 'menu', option: 'other_or_several', tradition: null, hasFreeText: true }, evidence: [] },
        practicesChanged: { status: 'present', value: 'yes', evidence: [] },
        priorImportance: { status: 'present', value: 'moderately', evidence: [] },
        priorBeliefInGod: { status: 'present', value: 'probably', evidence: [] },
        priorBeliefInAfterlife: { status: 'not_stated' },
      },
      lengths: { narrativeWords: 512, questionnaireFreeTextWords: 640, totalWords: 1152 },
      beingItems: {
        anyBeings: { status: 'present', value: 'saw', evidence: [qa(20)] },
        deceasedOrReligiousSpirits: { status: 'present', value: 'saw', evidence: [qa(21)] },
        deceasedBeings: { status: 'present', value: 'yes', evidence: [qa(22)] },
        mysticalBeing: { status: 'present', value: 'definite_being_or_voice', evidence: [qa(23)] },
        namedReligiousFigures: { status: 'present', value: 'uncertain', evidence: [qa(24)] },
        checklistUnearthlyBeings: { status: 'present', value: true, evidence: [qa(25)] },
        checklistDeceasedPersons: { status: 'present', value: false, evidence: [qa(25)] },
      },
      provenanceItems: {
        priorNdeKnowledge: { status: 'present', value: 'no', evidence: [qa(44)] },
        sharedWithOthers: { status: 'present', value: 'yes', evidence: [qa(45)] },
        realityShortlyAfter: { status: 'present', value: 'probably_real', evidence: [qa(46)] },
        realityNow: { status: 'present', value: 'definitely_real', evidence: [qa(47)] },
        memoryAccuracy: { status: 'not_asked' },
      },
      jesusKeywordHits: JESUS_KEYWORDS_BROAD.map((keyword) => ({
        keyword, narrative: keyword === 'jesus' ? 1 : 0, answers: keyword === 'jesus' ? 1 : 0, questionWording: keyword === 'jesus' ? 1 : 0,
      })),
    },
  ],
  tagClaims: {
    countries: [{ country: 'MX', raw: 'Mexico', role: 'unspecified', source: 'nderf_tag', evidence: [] }],
    language: { originalLanguage: 'es', translated: 'yes', translator: 'Ana', source: 'nderf_tag', evidence: [] },
  },
  lengths: { narrativeWords: 512, questionnaireFreeTextWords: 640, totalWords: 1152 },
};

const coded: CodedRecordType = {
  accountId: '1example_x_nde',
  sourceSha256: SHA,
  run: { codebookVersion: '0.3', promptVersion: '0.3.1', model: 'test-model', runId: 'test-run', codedAt: '2026-11-20T14:02:11Z' },
  parts: [{ index: 0, relation: 'sole', episodeIds: ['1example_x_nde#1'] }],
  episodes: [
    {
      episodeId: '1example_x_nde#1',
      reporter: { role: 'experiencer', relationship: null, assistance: null, evidence: [] },
      questionnaireRefersTo: 'this_episode',
      recurrent: false,
      textDate: { status: 'not_stated' },
      child: { value: 'no', evidence: [narrative(88, 101)] },
      age: { status: 'present', value: { years: 34, basis: 'stated' }, evidence: [narrative(88, 101)] },
      circumstance: {
        context: 'illness_or_injury',
        inducer: 'none',
        overdose: null,
        suicideAttempt: false,
        psychoactiveMedicationAtOnset: false,
        closeness: 'bodily_crisis',
        cardiacArrest: { reported: true, basis: 'clinician_or_witness' },
        timing: 'during',
        evidence: [narrative(140, 212)],
      },
      psychiatricMedication: [],
      describesExperience: 'yes',
      experienceToldIn: { narrative: true, questionnaire: true },
      tone: 'mixed',
      distressingContent: [{ type: 'void', evidence: [narrative(220, 260)] }],
      experiencerLabels: [],
    },
  ],
  nonExperiencerText: [],
  textClaims: { countries: [], language: null },
  background: {
    religionStatements: [
      {
        traditions: [{ family: 'protestant', protestantFamily: 'pentecostal_charismatic', body: null }],
        kind: 'attendance',
        when: 'before_experience',
        practice: null,
        term: 'Pentecostal church',
        source: 'religion_field_text',
        context: 'background',
        evidence: [{ source: { kind: 'qa', part: 0, qaIndex: 14 }, span: [22, 40], basis: 'explicit' }],
      },
    ],
    heritageStatements: [],
  },
  conditions: [
    {
      condition: 'seizure_disorder', words: 'epilepsy diagnosed at twenty', when: 'began_after',
      episodeIds: [EP], statedBy: 'experiencer', basis: 'diagnosed', evidence: [qa(40, [0, 28])],
    },
  ],
  encounters: [
    {
      // A grandmother who raised the experiencer, recognized at once, sending them back.
      encounterId: `${EP}/e1`,
      episodeId: EP,
      sameBeingAs: null,
      perceivedBy: ['seen', 'heard'],
      presence: 'part_of_experience',
      count: { kind: 'individual', n: null },
      identity: [
        {
          words: ["my mother's mother"],
          category: 'family',
          name: null,
          suggestedSubcategory: null,
          tie: {
            relationship: { role: 'grandparent', sex: 'female', greats: 0, side: 'maternal', link: 'blood', words: "my mother's mother" },
            friendTypes: [],
            religiousRole: null,
            closeness: { formative: true, attachment: 'close', words: 'she raised me', evidence: [narrative(10, 23)] },
          },
          when: 'during',
          how: ['recognized'],
          certainty: 'asserted',
          evidence: [narrative(300, 318)],
        },
      ],
      familiarity: { value: 'knew_personally', words: null, evidence: [] },
      vital: {
        status: 'dead', diedBeforeBirth: null, experiencerKnew: 'knew', deathLearned: null, diedSoonAfter: false,
        futureChild: null, timeSinceDeath: { kind: 'years', years: 12, basis: 'computed' },
        apparentAge: { relative: 'younger', statedYears: null }, evidence: [narrative(10, 23)],
      },
      livingPersonExplanation: null,
      apparentSex: 'female',
      maternalLanguage: null,
      representation: 'personal_likeness',
      visualDetails: [
        { feature: 'flowers', words: 'holding white lilies', colors: ['white'], flowerKind: 'lily', evidence: [narrative(320, 340)] },
      ],
      imageComparisons: [],
      places: ['otherworldly'],
      confessionalContent: [],
      hostileIconography: [],
      animal: null,
      disposition: ['loving'],
      actions: [
        { action: 'welcomes', sendBackReasons: [], revelationKind: null, instructionKinds: [], instructionWords: null, evidence: [narrative(341, 360)] },
        { action: 'sends_back', sendBackReasons: ['not_your_time'], revelationKind: null, instructionKinds: [], instructionWords: null, evidence: [narrative(361, 390)] },
      ],
      christSpecificContent: [],
      communication: ['spoken'],
      response: ['love_or_joy'],
      invocation: null,
      evidence: [narrative(300, 390)],
    },
    {
      // A being of light, taken afterward to be Jesus from a painting, with some hesitation.
      encounterId: `${EP}/e2`,
      episodeId: EP,
      sameBeingAs: null,
      perceivedBy: ['seen', 'mind_to_mind'],
      presence: 'part_of_experience',
      count: { kind: 'individual', n: null },
      identity: [
        {
          words: ['a being of light'], category: 'being_of_light', name: null, suggestedSubcategory: null, tie: null,
          when: 'not_stated', how: ['not_stated'], certainty: 'asserted', evidence: [narrative(400, 416)],
        },
        {
          words: ['Jesus'], category: 'jesus', name: null, suggestedSubcategory: null, tie: null,
          when: 'after', how: ['appearance'], certainty: 'hedged', evidence: [qa(24, [9, 14])],
        },
      ],
      familiarity: { value: 'not_stated', words: null, evidence: [] },
      vital: null,
      livingPersonExplanation: null,
      apparentSex: 'male',
      maternalLanguage: null,
      representation: 'light_or_formless',
      visualDetails: [],
      imageComparisons: [{ kind: 'painting_or_picture', work: null, evidence: [qa(24, [15, 40])] }],
      places: ['otherworldly'],
      confessionalContent: [],
      hostileIconography: [],
      animal: null,
      disposition: ['loving'],
      actions: [
        { action: 'forgives', sendBackReasons: [], revelationKind: null, instructionKinds: [], instructionWords: null, evidence: [narrative(430, 450)] },
        { action: 'reveals_knowledge', sendBackReasons: [], revelationKind: 'theological', instructionKinds: [], instructionWords: null, evidence: [narrative(450, 470)] },
      ],
      christSpecificContent: [{ kind: 'forgiveness_of_sins', evidence: [narrative(430, 450)] }],
      communication: ['mind_to_mind'],
      response: ['awe', 'awareness_of_sin'],
      invocation: null,
      evidence: [narrative(400, 470)],
    },
  ],
  doctrinalStatements: [
    {
      doctrineId: '1example_x_nde/d1', doctrine: 'judgment_after_death', words: 'we judge ourselves',
      stance: 'reinterprets', source: 'conveyed_by_being', episodeId: EP, encounterId: `${EP}/e2`,
      hellQualities: [], evidence: [narrative(450, 470)],
    },
    {
      doctrineId: '1example_x_nde/d2', doctrine: 'hell_exists', words: 'hell is a choice',
      stance: 'reinterprets', source: 'experiencer_view_after', episodeId: null, encounterId: null,
      hellQualities: ['self_chosen'], evidence: [qa(30, [0, 16])],
    },
  ],
  jesusMentions: [
    {
      words: 'Jesus', refersTo: 'jesus', kind: 'encounter', encounterId: `${EP}/e2`, doctrineId: null,
      episodeId: EP, when: 'after', polarity: 'affirmative', evidence: [qa(24, [9, 14])],
    },
    {
      words: 'prayed to Jesus', refersTo: 'jesus', kind: 'prayer_or_invocation', encounterId: null, doctrineId: null,
      episodeId: null, when: 'before', polarity: 'affirmative', evidence: [narrative(120, 135)],
    },
  ],
  provenance: {
    exposures: [
      {
        episodeIds: [EP], medium: 'film_or_tv', title: null, person: null, when: 'between_experience_and_telling',
        changedUnderstanding: true, evidence: [qa(45, [4, 30])],
      },
    ],
    priorDevotion: [],
    memory: [
      { episodeIds: [EP], kind: 'recognized_as_nde_later', trigger: 'media', evidence: [qa(45, [4, 30])] },
    ],
    priorTellings: [
      { episodeIds: [EP], kind: 'private_only', venues: [], words: null, evidence: [qa(45, [31, 60])] },
    ],
    tellingVaries: [],
    reactions: [
      { episodeIds: [EP], reaction: 'dismissed', dismissedAs: 'dream', words: null, who: 'family', evidence: [qa(45, [61, 90])] },
    ],
    disclaimers: [],
    naturalExplanations: [
      { episodeIds: [EP], words: 'maybe just low oxygen', stance: 'considers', evidence: [qa(47, [5, 26])] },
    ],
  },
};

/** A deep copy with one change applied. */
const withChange = <T>(value: T, change: (copy: any) => void): unknown => {
  const copy = structuredClone(value);
  change(copy);
  return copy;
};

test('valid fixtures pass', () => {
  assert.equal(DerivedRecord.safeParse(derived).success, true, JSON.stringify(DerivedRecord.safeParse(derived).error?.issues));
  assert.equal(CodedRecord.safeParse(coded).success, true, JSON.stringify(CodedRecord.safeParse(coded).error?.issues));
});

test('rejects an unexpected key (an LLM inventing a field)', () => {
  assert.equal(CodedRecord.safeParse(withChange(coded, (c) => { c.episodes[0].mood = 'calm'; })).success, false);
});

test('rejects a value outside an enum', () => {
  assert.equal(
    CodedRecord.safeParse(withChange(coded, (c) => { c.episodes[0].circumstance.closeness = 'very_close'; })).success,
    false,
  );
});

test('rejects an overdose flag without an illness or injury context', () => {
  const bad = withChange(coded, (c) => {
    c.episodes[0].circumstance.context = 'none';
    c.episodes[0].circumstance.overdose = 'accidental';
  });
  assert.equal(CodedRecord.safeParse(bad).success, false);
});

test('rejects a cardiac arrest reported without a basis', () => {
  const bad = withChange(coded, (c) => { c.episodes[0].circumstance.cardiacArrest.basis = null; });
  assert.equal(CodedRecord.safeParse(bad).success, false);
});

test('accepts copied text of six words and rejects seven', () => {
  const term = (t: string) => withChange(coded, (c) => { c.background.religionStatements[0].term = t; });
  assert.equal(CodedRecord.safeParse(term('one two three four five six')).success, true);
  assert.equal(CodedRecord.safeParse(term('one two three four five six seven')).success, false);
});

test('rejects an episode id from another account, and a part pointing at a missing episode', () => {
  assert.equal(CodedRecord.safeParse(withChange(coded, (c) => { c.episodes[0].episodeId = 'other#1'; })).success, false);
  assert.equal(CodedRecord.safeParse(withChange(coded, (c) => { c.parts[0].episodeIds = ['1example_x_nde#2']; })).success, false);
});

test('rejects a descending age range and accepts an ascending one', () => {
  const ages = (years: unknown) => withChange(coded, (c) => { c.episodes[0].age.value.years = years; });
  assert.equal(CodedRecord.safeParse(ages([7, 6])).success, false);
  assert.equal(CodedRecord.safeParse(ages([6, 7])).success, true);
});

test('menu options that carry no tradition must have tradition null, and the rest must not', () => {
  assert.equal(
    ReligionFieldValue.safeParse({ format: 'menu', option: 'do_not_know', tradition: { family: 'christian_unspecified' }, hasFreeText: false }).success,
    false,
  );
  assert.equal(
    ReligionFieldValue.safeParse({ format: 'menu', option: 'christian_catholic', tradition: null, hasFreeText: false }).success,
    false,
  );
});

test('resolved views enforce their consistency rules', () => {
  const account = {
    accountId: '1example_x_nde',
    ruleVersion: '0.1',
    country: { code: 'US', role: null, source: 'presumed_us' },
    countryGroups: [],
    language: { original: 'en', basis: 'presumed_english', translated: null },
    qualifyingEpisodeIds: ['1example_x_nde#1'],
    firstQualifyingEpisodeId: '1example_x_nde#1',
    multipleQualifyingEpisodes: false,
  };
  assert.equal(ResolvedAccount.safeParse(account).success, true);
  assert.equal(ResolvedAccount.safeParse({ ...account, multipleQualifyingEpisodes: true }).success, false);
  assert.equal(ResolvedAccount.safeParse({ ...account, country: { code: 'MX', role: null, source: 'presumed_us' } }).success, false);

  const episode = {
    episodeId: '1example_x_nde#1', ruleVersion: '0.1', gapYears: 27, firsthand: true,
    analysisSet: 'excluded', exclusionReasons: [], flags: [],
  };
  assert.equal(ResolvedEpisode.safeParse(episode).success, false);
  assert.equal(ResolvedEpisode.safeParse({ ...episode, exclusionReasons: ['no_threat'] }).success, true);
});

// ─── Area 1 additions and area 3 ────────────────────────────────────────────────────────

const parses = (change: (c: any) => void) => CodedRecord.safeParse(withChange(coded, change)).success;

test('identity timing rules: announced is during only; told by a person and reading are after only', () => {
  assert.equal(parses((c) => { c.encounters[0].identity[0].how = ['announced']; }), true);
  assert.equal(parses((c) => { c.encounters[0].identity[0].how = ['announced']; c.encounters[0].identity[0].when = 'after'; }), false);
  assert.equal(parses((c) => { c.encounters[1].identity[1].how = ['reading_or_media']; }), true);
  assert.equal(parses((c) => { c.encounters[1].identity[1].how = ['told_by_person']; c.encounters[1].identity[1].when = 'during'; }), false);
  assert.equal(parses((c) => { c.encounters[1].identity[1].how = ['appearance', 'not_stated']; }), false);
});

test('one claim per referent per timing; the same referent at another timing is a second claim', () => {
  const second = (when: string) => (c: any) => {
    c.encounters[1].identity.push({ ...structuredClone(c.encounters[1].identity[1]), when, how: ['knowing'] });
  };
  assert.equal(parses(second('after')), false);
  assert.equal(parses(second('during')), true);
});

test('people known in ordinary life: ties are required, and they never get a canonical name', () => {
  assert.equal(parses((c) => { c.encounters[0].identity[0].tie.relationship = null; }), false);
  assert.equal(parses((c) => { c.encounters[0].identity[0].name = 'Rosa'; }), false);
  assert.equal(parses((c) => {
    Object.assign(c.encounters[0].identity[0], { category: 'friend_or_acquaintance' });
    Object.assign(c.encounters[0].identity[0].tie, { relationship: null, friendTypes: [] });
  }), false);
  assert.equal(parses((c) => {
    Object.assign(c.encounters[0].identity[0], { category: 'friend_or_acquaintance' });
    Object.assign(c.encounters[0].identity[0].tie, { relationship: null, friendTypes: ['childhood_friend'] });
  }), true);
  assert.equal(parses((c) => { c.encounters[0].identity[0].tie.closeness = { formative: false, attachment: 'not_stated', words: null, evidence: [narrative(1, 2)] }; }), false);
});

test('named figures need a canonical name and a suggested subcategory', () => {
  const figure = (name: string | null, sub: string | null) => (c: any) => {
    Object.assign(c.encounters[1].identity[1], { category: 'named_figure', name, suggestedSubcategory: sub });
  };
  assert.equal(parses(figure('Francis of Assisi', 'early_or_medieval_saint')), true);
  assert.equal(parses(figure(null, 'early_or_medieval_saint')), false);
  assert.equal(parses(figure('Francis of Assisi', null)), false);
});

test('visual details agree with the representation level', () => {
  assert.equal(parses((c) => { c.encounters[0].representation = 'not_described'; }), false);
  assert.equal(parses((c) => { c.encounters[0].representation = 'iconographic'; }), false); // flowers are general
  assert.equal(parses((c) => {
    c.encounters[0].representation = 'iconographic';
    c.encounters[0].visualDetails.push({ feature: 'wounds', words: 'marks on his hands', colors: [], flowerKind: null, evidence: [narrative(1, 9)] });
  }), true);
  assert.equal(parses((c) => { c.encounters[0].visualDetails[0].flowerKind = null; }), false);
  assert.equal(parses((c) => { c.encounters[0].visualDetails.push(structuredClone(c.encounters[0].visualDetails[0])); }), false);
});

test('ways perceived and communication stay consistent', () => {
  assert.equal(parses((c) => { c.encounters[0].perceivedBy = ['seen', 'credited_only']; }), false);
  assert.equal(parses((c) => { c.encounters[0].perceivedBy = ['seen']; }), false); // spoken needs heard
  assert.equal(parses((c) => { c.encounters[1].perceivedBy = ['seen']; }), false); // mind to mind needs mind to mind
  assert.equal(parses((c) => { c.encounters[1].perceivedBy = ['credited_only']; c.encounters[1].communication = ['not_stated']; }), true);
  assert.equal(parses((c) => { c.encounters[1].communication = ['none', 'showing']; }), false);
  assert.equal(parses((c) => { c.encounters[0].count = { kind: 'exact', n: null }; }), false);
  assert.equal(parses((c) => { c.encounters[0].count = { kind: 'exact', n: 3 }; }), true);
});

test('vital status: what each status requires', () => {
  const vital = (patch: object) => (c: any) => Object.assign(c.encounters[0].vital, patch);
  assert.equal(parses((c) => { c.encounters[0].vital = null; }), false); // family needs vital status
  assert.equal(parses(vital({ timeSinceDeath: null })), false);
  assert.equal(parses(vital({ experiencerKnew: 'did_not_know' })), false); // Peak in Darien needs deathLearned
  assert.equal(parses(vital({ experiencerKnew: 'did_not_know', deathLearned: { how: 'told_by_family', deathTiming: 'around_the_same_time' } })), true);
  assert.equal(parses(vital({ status: 'died_before_birth', timeSinceDeath: null })), false); // which kind, if stated
  assert.equal(parses(vital({ status: 'died_before_birth', diedBeforeBirth: 'miscarriage', timeSinceDeath: null })), true);
  assert.equal(parses(vital({ status: 'not_yet_conceived', timeSinceDeath: null, apparentAge: null })), false); // futureChild
  assert.equal(parses(vital({
    status: 'not_yet_conceived', timeSinceDeath: null, apparentAge: null,
    futureChild: { laterBorn: 'yes', foretoldMatched: ['name'] },
  })), true);
});

test('a living person met as part of the experience needs an explanation, and only then', () => {
  const living = (c: any) => Object.assign(c.encounters[0].vital, { status: 'alive', timeSinceDeath: null, apparentAge: null });
  assert.equal(parses(living), false);
  assert.equal(parses((c) => {
    living(c);
    c.encounters[0].livingPersonExplanation = { kind: 'none_offered', words: null, evidence: [] };
  }), true);
  assert.equal(parses((c) => {
    living(c);
    c.encounters[0].presence = 'physically_present';
    c.encounters[0].livingPersonExplanation = { kind: 'none_offered', words: null, evidence: [] };
  }), false);
});

test('actions, hostile beings, and animals carry their own details', () => {
  assert.equal(parses((c) => { c.encounters[0].actions[1].sendBackReasons = []; }), false);
  assert.equal(parses((c) => { c.encounters[1].actions[1].revelationKind = null; }), false);
  assert.equal(parses((c) => { c.encounters[0].disposition = ['hostile']; }), false); // invocation required
  assert.equal(parses((c) => {
    c.encounters[0].disposition = ['hostile'];
    c.encounters[0].invocation = { invoked: 'yes', names: [{ words: 'Jesus', referent: 'jesus' }], effect: 'dispelled', evidence: [narrative(5, 9)] };
  }), true);
  assert.equal(parses((c) => { c.encounters[0].hostileIconography = ['shadow_being']; }), false); // not a hostile being
  assert.equal(parses((c) => { c.encounters[1].identity[1].category = 'animal'; }), false); // animal details required
});

test('doctrinal statements link to the being that conveyed them, in the same episode', () => {
  assert.equal(parses((c) => { c.doctrinalStatements[0].encounterId = null; }), false);
  assert.equal(parses((c) => { c.doctrinalStatements[0].encounterId = `${EP}/e9`; }), false);
  assert.equal(parses((c) => { c.doctrinalStatements[0].episodeId = null; }), false);
  assert.equal(parses((c) => { c.doctrinalStatements[0].hellQualities = ['eternal']; }), false); // not about hell
  assert.equal(parses((c) => { c.doctrinalStatements[1].doctrineId = 'other/d2'; }), false);
});

test('Jesus mentions: links resolve, and each kind, time, and place is one entry', () => {
  assert.equal(parses((c) => { c.jesusMentions[0].encounterId = null; }), false);
  assert.equal(parses((c) => { c.jesusMentions[0].encounterId = `${EP}/e9`; }), false);
  assert.equal(parses((c) => { c.jesusMentions[1].evidence.push(qa(31, [0, 5])); }), false); // two places
  assert.equal(parses((c) => { c.jesusMentions[1].evidence.push(narrative(600, 605)); }), true); // same place
  assert.equal(parses((c) => { c.jesusMentions.push(structuredClone(c.jesusMentions[1])); }), false);
});

test('ids and links across the record', () => {
  assert.equal(parses((c) => { c.encounters[1].encounterId = 'other#1/e2'; }), false);
  assert.equal(parses((c) => { c.encounters[1].encounterId = `${EP}/e1`; }), false); // duplicate
  assert.equal(parses((c) => { c.encounters[1].sameBeingAs = `${EP}/e1`; }), false); // same episode
  assert.equal(parses((c) => { c.conditions[0].episodeIds = ['1example_x_nde#2']; }), false);
  assert.equal(parses((c) => { c.episodes[0].tone = 'pleasant'; }), false); // has distressing content
});

test('the hallucination flag excludes other mental health conditions and neurodevelopmental labels', () => {
  for (const outside of ['other_mental_health', 'autism', 'adhd', 'intellectual_disability_or_developmental_delay'] as const) {
    assert.equal(HALLUCINATION_FLAG_CONDITIONS.includes(outside), false);
  }
  assert.equal(HALLUCINATION_FLAG_CONDITIONS.includes('delirium'), true);
});

test('provenance: triggers, venues, and dismissals go with their kinds; episodes must exist', () => {
  assert.equal(parses((c) => { c.provenance.memory[0].trigger = null; }), false);
  assert.equal(parses((c) => { c.provenance.memory[0] = { ...c.provenance.memory[0], kind: 'remembered_all_along', trigger: null }; }), true);
  assert.equal(parses((c) => { c.provenance.priorTellings[0].kind = 'public'; }), false); // venues required
  assert.equal(parses((c) => { Object.assign(c.provenance.priorTellings[0], { kind: 'public', venues: ['podcasts'] }); }), true);
  assert.equal(parses((c) => { c.provenance.reactions[0].dismissedAs = null; }), false);
  assert.equal(parses((c) => {
    c.provenance.priorDevotion.push({ episodeIds: [EP], category: 'named_figure', name: null, words: 'a saint on my shelf', evidence: [narrative(1, 5)] });
  }), false);
  assert.equal(parses((c) => { c.provenance.exposures[0].episodeIds = ['1example_x_nde#2']; }), false);
});

test('keyword matching: whole words, any case, accents distinct, possessives count', () => {
  const text = "Christ's light. CHRIST! A Christian hymn. Jesús, my uncle, and Jesus. Isabel and Isa.";
  assert.equal(countKeyword(text, 'christ'), 2); // not Christian
  assert.equal(countKeyword(text, 'jesus'), 1); // not Jesús
  assert.equal(countKeyword(text, 'jesús'), 1);
  assert.equal(countKeyword(text, 'isa'), 1); // not Isabel
});

test('keyword hits list every broad keyword exactly once', () => {
  const dropOne = withChange(derived, (d) => { d.parts[0].jesusKeywordHits.pop(); });
  assert.equal(DerivedRecord.safeParse(dropOne).success, false);
});

test('a name such as Jesús is recorded as a name, never as Jesus', () => {
  const name = { words: 'my uncle Jesús', kind: 'name_of_person_or_place', encounterId: null, doctrineId: null,
    episodeId: null, when: 'before', polarity: 'affirmative', evidence: [narrative(700, 714)] };
  assert.equal(parses((c) => { c.jesusMentions.push({ ...name, refersTo: 'not_jesus' }); }), true);
  assert.equal(parses((c) => { c.jesusMentions.push({ ...name, refersTo: 'jesus' }); }), false);
  assert.equal(parses((c) => { c.jesusMentions[1].refersTo = 'not_jesus'; }), false);
});

test("a relative's report uses the kinship parts, and only a relative's", () => {
  const mother = { role: 'parent', sex: 'female', greats: 0, side: 'not_stated', link: 'blood', words: 'his mother' };
  assert.equal(parses((c) => { c.episodes[0].reporter.role = 'relative'; }), false);
  assert.equal(parses((c) => { Object.assign(c.episodes[0].reporter, { role: 'relative', relationship: mother }); }), true);
  assert.equal(parses((c) => { c.episodes[0].reporter.relationship = mother; }), false); // the experiencer
});

test('instructions record what was asked, and only on gives_instructions_or_requests', () => {
  const ask = { action: 'gives_instructions_or_requests', sendBackReasons: [], revelationKind: null,
    instructionKinds: ['pray', 'pass_on_message'], instructionWords: 'tell them to pray', evidence: [narrative(380, 399)] };
  assert.equal(parses((c) => { c.encounters[0].actions.push(ask); }), true);
  assert.equal(parses((c) => { c.encounters[0].actions.push({ ...ask, instructionKinds: [] }); }), false);
  assert.equal(parses((c) => { c.encounters[0].actions[0].instructionKinds = ['pray']; }), false);
});

test('mentions made during an experience name their episode; Jesus claims need a linked mention', () => {
  assert.equal(parses((c) => { c.jesusMentions[1].when = 'during'; }), false);
  assert.equal(parses((c) => { Object.assign(c.jesusMentions[1], { when: 'during', episodeId: EP }); }), true);
  assert.equal(parses((c) => { c.jesusMentions[0].episodeId = '1example_x_nde#2'; }), false);
  assert.equal(parses((c) => { c.jesusMentions.shift(); }), false); // the Jesus claim in e2 loses its mention
});

// ─── Area 3 resolved views ──────────────────────────────────────────────────────────────

const encounter = (i: number, change: (e: any) => void = () => {}) => Encounter.parse(withChange(coded.encounters[i], change));

test('resolveEncounter: never identified, and where the encounter is reported', () => {
  const grandmother = resolveEncounter(encounter(0));
  assert.equal(grandmother.neverIdentified, false);
  assert.equal(grandmother.reportedIn, 'narrative_only');
  const light = resolveEncounter(encounter(1));
  assert.equal(light.reportedIn, 'both'); // the Jesus claim is in an answer
  assert.deepEqual(light.questionnaireItems, [{ part: 0, qaIndex: 24 }]);
  assert.equal(resolveEncounter(encounter(1, (e) => { e.identity.pop(); })).neverIdentified, true);
});

test("resolveEncounter: Mary's levels", () => {
  const unnamedWoman = (e: any) => { e.identity.pop(); e.apparentSex = 'female'; };
  assert.equal(resolveEncounter(encounter(1, unnamedWoman)).marianLevel, 'one');
  assert.equal(resolveEncounter(encounter(1, unnamedWoman)).marianLevelOneNarrow, false);
  const motherly = resolveEncounter(encounter(1, (e) => {
    unnamedWoman(e);
    e.maternalLanguage = { words: 'like a mother', evidence: [narrative(417, 429)] };
  }));
  assert.equal(motherly.marianLevelOneNarrow, true);
  const mary = (e: any) => Object.assign(e.identity[1], { category: 'mary', words: ['the Virgin Mary'] });
  const named = resolveEncounter(encounter(1, mary));
  assert.deepEqual([named.marianLevel, named.maryClaimCertainty], ['two', 'hedged']);
  assert.equal(resolveEncounter(encounter(1, (e) => {
    mary(e);
    e.visualDetails.push({ feature: 'rosary', words: 'holding a rosary', colors: [], flowerKind: null, evidence: [narrative(417, 433)] });
  })).marianLevel, 'three');
  assert.equal(resolveEncounter(encounter(0)).marianLevel, 'none');
});

test('resolveJesus: the ladder, rung by rung', () => {
  const j = resolveJesus(derived, coded, [EP]);
  assert.deepEqual(j.keywordWebsite, { narrow: true, broad: true });
  assert.deepEqual(j.keywordOwnWords, { narrow: true, broad: true });
  assert.equal(j.anyCodedEntry, true);
  assert.deepEqual(j.mentionAboutExperience, { jesusOnly: true, withAmbiguous: true });
  assert.equal(j.encounterClaim, true);
  assert.equal(j.excludingResemblance, true); // hedged, not resemblance
  assert.equal(j.claimInNarrative, false); // the claim is only in an answer
  assert.equal(j.announcedOrRecognizedDuringAsserted, false);

  const notQualifying = resolveJesus(derived, coded, []);
  assert.equal(notQualifying.affirmativeMention.jesusOnly, true); // any mention, anywhere
  assert.equal(notQualifying.mentionAboutExperience.jesusOnly, false);
  assert.equal(notQualifying.encounterClaim, false);

  const recognizedDuring = withChange(coded, (c) => {
    Object.assign(c.encounters[1].identity[1], { when: 'during', how: ['recognized'], certainty: 'asserted', evidence: [narrative(417, 422)] });
  }) as CodedRecordType;
  assert.equal(resolveJesus(derived, recognizedDuring, [EP]).announcedOrRecognizedDuringAsserted, true);

  const questionWordingOnly = withChange(derived, (d) => {
    for (const h of d.parts[0].jesusKeywordHits) { h.narrative = 0; h.answers = 0; }
  }) as DerivedRecordType;
  const naive = resolveJesus(questionWordingOnly, coded, [EP]);
  assert.deepEqual([naive.keywordWebsite.narrow, naive.keywordOwnWords.narrow], [true, false]);
});

test('the resolved Jesus ladder must be nested', () => {
  const j = resolveJesus(derived, coded, [EP]);
  assert.equal(ResolvedJesusSchema.safeParse({ ...j, identifiedDuring: true }).success, false); // not in the narrative
  assert.equal(ResolvedJesusSchema.safeParse({ ...j, keywordWebsite: { narrow: true, broad: false } }).success, false);
});

test('practice-round additions: send-back reasons, repeated "other" details, reactions, known people', () => {
  const sendBack = (reasons: string[]) => parses((c) => { (c.encounters[0].actions[1] as { sendBackReasons: string[] }).sendBackReasons = reasons; });
  assert.equal(sendBack(['offered_a_choice', 'others_need_you']), true);
  assert.equal(sendBack(['none_given', 'mistake']), false);

  const other = (words: string) => ({ feature: 'other' as const, words, colors: [], flowerKind: null, evidence: [narrative(320, 340)] });
  assert.equal(parses((c) => { c.encounters[0].visualDetails.push(other('a lantern'), other('a ribbon')); }), true);
  assert.equal(parses((c) => {
    const lilies = c.encounters[0].visualDetails[0];
    c.encounters[0].visualDetails.push({ ...lilies, words: 'more lilies' });
  }), false);
  assert.equal(parses((c) => { c.encounters[0].visualDetails[0].colors = ['white', 'silver']; }), true);

  assert.equal(parses((c) => { Object.assign(c.provenance.reactions[0], { reaction: 'other', dismissedAs: null }); }), false);
  assert.equal(parses((c) => { Object.assign(c.provenance.reactions[0], { reaction: 'other', dismissedAs: null, words: 'said nothing at all' }); }), true);
  assert.equal(parses((c) => { c.provenance.reactions[0].dismissedAs = 'other'; }), false);
  assert.equal(parses((c) => { Object.assign(c.provenance.reactions[0], { dismissedAs: 'drugs_or_medication' }); }), true);

  const known = (o: object) => parses((c) => {
    Object.assign(c.encounters[0].identity[0], { category: 'known_person_relationship_not_stated', tie: null }, o);
  });
  assert.equal(known({}), true);
  assert.equal(known({ name: 'Someone Known' }), false); // a private person never gets a canonical name
  assert.equal(parses((c) => {
    Object.assign(c.encounters[0].identity[0], { category: 'known_person_relationship_not_stated', tie: null });
    c.encounters[0].vital = null;
  }), false); // vital status is required
});
