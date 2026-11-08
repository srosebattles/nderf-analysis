// Fixtures are invented: '1example_x_nde' is not a real account, and no text here comes from one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CodedRecord, DerivedRecord, ResolvedAccount, ResolvedEpisode, ReligionFieldValue,
  type CodedRecord as CodedRecordType, type DerivedRecord as DerivedRecordType, type Evidence,
} from './codebook-schema.ts';

const SHA = 'a'.repeat(64);
const narrative = (start: number, end: number): Evidence => ({
  source: { kind: 'narrative', part: 0 },
  span: [start, end],
  basis: 'explicit',
});

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
      describesExperience: 'yes',
      experienceToldIn: { narrative: true, questionnaire: true },
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

test('rejects copied text longer than four words', () => {
  const bad = withChange(coded, (c) => { c.background.religionStatements[0].term = 'one two three four five'; });
  assert.equal(CodedRecord.safeParse(bad).success, false);
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
