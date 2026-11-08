// Output schema for coding NDERF accounts, in zod: the single source for both the TypeScript
// types (z.infer) and the runtime check every record must pass before it is written.
// v3 DRAFT: areas 1 (eligibility and provenance) and 2 (religious background) are designed,
// and area 1 was revised after trial-coding the first fifty practice accounts; area 3
// (encounters) is not started. Decisions, their reasons, and open questions: DECISIONS.md.
//
// Files, joined on accountId:
//   derived/accounts.jsonl                  rules only; regenerated whenever the parser changes
//   coded/<codebookVersion>/<runId>.jsonl   LLM output, quotes stripped; one folder per codebook version
//   (private) nderf-raw-data/llm-raw/<runId>/   raw LLM responses, which contain quotes
// The Resolved* views at the bottom are computed from both by pre-registered rules, not stored.
//
// No account text in this repository. Strings copied from accounts are capped at
// MAX_COPIED_WORDS (enforced below), and `npm run check:overlap` confirms before each commit
// that no five-word sequence from any narrative or free-text answer appears in committed files.
// (NDERF's question wording and menu labels are form text, not account text.)
//
// Objects are strict: an unexpected key fails validation, which catches an LLM inventing fields.
// Cross-field rules are refinements; they run at validation time but don't carry over into an
// exported JSON Schema (z.toJSONSchema), which gives the model only the shape and allowed values.

import { z } from 'zod';

export const SCHEMA_VERSION = 'v3-draft';
export const MAX_COPIED_WORDS = 4;

const obj = z.strictObject;
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Text copied from an account: at most MAX_COPIED_WORDS words. */
export const CopiedText = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= MAX_COPIED_WORDS, {
    message: `copied text must be at most ${MAX_COPIED_WORDS} words`,
  });

const Index = z.number().int().nonnegative();

// ─── Shared building blocks ─────────────────────────────────────────────────────────────

export const IsoDate = z.iso.date(); // 'YYYY-MM-DD'
export type IsoDate = z.infer<typeof IsoDate>;
export const CountryCode = z.string().regex(/^[A-Z]{2}$/); // ISO 3166-1 alpha-2: 'US', 'MX', 'GB'
export type CountryCode = z.infer<typeof CountryCode>;
export const LanguageCode = z.string().regex(/^[a-z]{2}$/); // ISO 639-1: 'en', 'es', 'fa'
export type LanguageCode = z.infer<typeof LanguageCode>;

/** Where a value came from, pointing into nderf-raw-data's accounts/*.jsonl and search listing. */
export const SourceRef = z.discriminatedUnion('kind', [
  obj({ kind: z.literal('narrative'), part: Index }),
  obj({ kind: z.literal('qa'), part: Index, qaIndex: Index }),
  obj({ kind: z.literal('background'), part: Index, field: z.string() }),
  obj({ kind: z.literal('tag'), listingIndex: Index }),
  obj({
    kind: z.literal('search_listing'),
    field: z.enum(['AGE', 'COUNTRY_AI', 'EXPDATE', 'metadata.greyson', 'form_version']),
  }),
  obj({ kind: z.literal('quick_facts'), field: z.string() }),
]);
export type SourceRef = z.infer<typeof SourceRef>;

/** [start, end) character offsets into the narrative, or into the qa item's `response`. */
export const Span = z.tuple([Index, Index]).refine(([start, end]) => start < end, {
  message: 'span must have start < end',
});

export const Evidence = obj({
  source: SourceRef,
  /** The LLM returns a short quote; the pipeline locates it, stores the offsets, and drops the
   *  quote. A quote that can't be found fails validation, which catches invented evidence. */
  span: Span.optional(),
  basis: z.enum(['explicit', 'inferred']),
});
export type Evidence = z.infer<typeof Evidence>;

/** Keeps "not asked" apart from "not stated" and "said none". */
export const finding = <T extends z.ZodType>(value: T) =>
  z.discriminatedUnion('status', [
    obj({ status: z.literal('present'), value, evidence: z.array(Evidence) }),
    obj({ status: z.literal('stated_none'), evidence: z.array(Evidence) }),
    obj({ status: z.literal('not_stated') }),
    obj({ status: z.literal('not_asked') }), // the item wasn't on this part's questionnaire form
  ]);
export type Finding<T> =
  | { status: 'present'; value: T; evidence: Evidence[] }
  | { status: 'stated_none'; evidence: Evidence[] }
  | { status: 'not_stated' }
  | { status: 'not_asked' };

export const ParsedDate = obj({
  /** As written; null with 'raw_omitted' when longer than MAX_COPIED_WORDS. */
  raw: CopiedText.nullable(),
  year: z.number().int().nullable(),
  month: z.number().int().min(1).max(12).nullable(),
  day: z.number().int().min(1).max(31).nullable(),
  precision: z.enum(['day', 'month', 'season', 'year', 'approximate', 'none']),
  /** 'multiple_dates' usually means several episodes on one page. */
  flags: z.array(
    z.enum([
      'two_digit_year', 'day_month_ambiguous', 'after_posting', 'unparsed', 'raw_omitted',
      'range', 'multiple_dates', 'no_year', 'conflicts_with_text',
    ]),
  ),
}).refine((d) => !d.flags.includes('raw_omitted') || d.raw === null, {
  message: "raw must be null when flagged 'raw_omitted'",
});
export type ParsedDate = z.infer<typeof ParsedDate>;

export const Lengths = obj({
  narrativeWords: Index,
  questionnaireFreeTextWords: Index, // response text after the leading menu answer
  totalWords: Index,
});
export type Lengths = z.infer<typeof Lengths>;

/** Plain "From X" tags are 'unspecified'; "Originally from X" is 'origin'. */
export const CountryRole = z.enum(['origin', 'residence', 'experience_location', 'unspecified']);
export type CountryRole = z.infer<typeof CountryRole>;

export const CountryClaim = obj({
  country: CountryCode.nullable(), // null when the text can't be mapped
  raw: CopiedText, // 'the UK', 'England', 'Persia'
  role: CountryRole,
  source: z.enum(['nderf_tag', 'nderf_country_ai', 'nderf_quick_facts', 'self_report']),
  evidence: z.array(Evidence),
});
export type CountryClaim = z.infer<typeof CountryClaim>;

export const LanguageClaim = obj({
  originalLanguage: LanguageCode.nullable(),
  translated: z.enum(['yes', 'no', 'unknown']),
  translator: z.string().nullable(), // as NDERF names them
  source: z.enum(['nderf_tag', 'self_report']),
  evidence: z.array(Evidence),
});
export type LanguageClaim = z.infer<typeof LanguageClaim>;

// ─── Area 2 building blocks (used by both files) ────────────────────────────────────────

/** No evangelical/mainline split: denominations don't map cleanly onto it. */
export const ProtestantFamily = z.enum([
  'lutheran', 'reformed_presbyterian', 'anglican', 'methodist_wesleyan', 'baptist',
  'pentecostal_charismatic', 'anabaptist', 'restorationist', 'adventist', 'holiness',
  'quaker', 'united', 'nondenominational', 'other', 'unspecified',
]);
export type ProtestantFamily = z.infer<typeof ProtestantFamily>;

export const OtherTraditionFamily = z.enum([
  'hindu', 'buddhist', 'sikh', 'bahai', 'chinese_folk_or_taoist', 'shinto',
  'indigenous', 'pagan', 'new_age', 'unitarian_universalist', 'other',
]);
export type OtherTraditionFamily = z.infer<typeof OtherTraditionFamily>;

/** Christian here means Trinitarian. Latter-day Saints, Jehovah's Witnesses, and other
 *  non-Trinitarian groups are separate families. */
export const Tradition = z.union([
  obj({ family: z.literal('catholic'), rite: z.enum(['latin', 'eastern']).nullable() }),
  obj({ family: z.literal('orthodox'), branch: z.enum(['eastern', 'oriental']).nullable() }),
  /** body only when named ('LCMS', 'PCA'); never guessed. */
  obj({ family: z.literal('protestant'), protestantFamily: ProtestantFamily, body: CopiedText.nullable() }),
  /** Bare "Christian"; menu "Other Christian" with no text about the same time; self-labels
   *  with no church named ("born again, spirit-filled", term kept). A bare "nondenominational"
   *  is protestant / nondenominational instead. */
  obj({ family: z.literal('christian_unspecified') }),
  obj({ family: z.literal('latter_day_saints') }),
  obj({ family: z.literal('jehovahs_witnesses') }),
  /** One bucket: Christian Science, Oneness Pentecostal, … */
  obj({ family: z.literal('other_nontrinitarian'), group: CopiedText.nullable() }),
  obj({ family: z.literal('jewish'), movement: CopiedText.nullable() }),
  obj({
    family: z.literal('muslim'),
    branch: z.enum(['sunni', 'shia', 'other']).nullable(),
    detail: CopiedText.nullable(),
  }),
  /** A movement that grows out of one tradition goes under it, with the movement as detail
   *  (a Sai Baba devotee -> hindu, 'Sai Baba'). Syncretic esoteric movements (Theosophy,
   *  Edgar Cayce, the Urantia Book) -> new_age, with detail. */
  obj({ family: OtherTraditionFamily, detail: CopiedText.nullable() }),
  /** Pluralist answers that name no tradition (e.g. that every faith holds part of the
   *  truth). When traditions are named, each is coded instead. */
  obj({ family: z.literal('several_unspecified') }),
  /** "Spiritual but not religious" -> nothing_religious. */
  obj({
    family: z.literal('unaffiliated'),
    kind: z.enum(['atheist', 'agnostic', 'nothing_religious', 'nothing_secular']).nullable(),
  }),
]);
export type Tradition = z.infer<typeof Tradition>;

/** NDERF's menu, named after NDERF's labels; mapped to our Tradition by rule
 *  (christian_mormon -> latter_day_saints, christian_jehovahs_witness -> jehovahs_witnesses). */
export const NderfReligionOption = z.enum([
  'christian_catholic', 'christian_protestant', 'christian_other', 'christian_mormon',
  'christian_jehovahs_witness', 'muslim', 'jewish', 'hindu', 'buddhist',
  'native_american', 'other_new_age', 'other_unitarian_liberal', 'other_or_several',
  'unaffiliated_atheist', 'unaffiliated_agnostic', 'unaffiliated_nothing_religious',
  'unaffiliated_nothing_secular', 'do_not_know', 'no_comment', 'select', 'unrecognized',
]);
export type NderfReligionOption = z.infer<typeof NderfReligionOption>;

/** Menu options that carry no tradition. For other_or_several the free text decides (named
 *  traditions, several_unspecified, or spiritual-but-not-religious -> nothing_religious). */
export const NON_TRADITION_OPTIONS: readonly NderfReligionOption[] = [
  'do_not_know', 'no_comment', 'select', 'other_or_several', 'unrecognized',
];

/** Forms A–C offer theological orientation, not affiliation; forms D–F offer an affiliation menu. */
export const ReligionFieldValue = z.discriminatedUnion('format', [
  obj({
    format: z.literal('orientation'),
    orientation: z.enum(['liberal', 'moderate', 'conservative_fundamentalist']),
    hasFreeText: z.boolean(),
  }),
  obj({
    format: z.literal('menu'),
    option: NderfReligionOption,
    tradition: Tradition.nullable(),
    hasFreeText: z.boolean(),
  }).refine((v) => NON_TRADITION_OPTIONS.includes(v.option) === (v.tradition === null), {
    message: 'tradition must be null exactly for the menu options that carry none',
  }),
]);
export type ReligionFieldValue = z.infer<typeof ReligionFieldValue>;

const Belief = z.enum(['definitely', 'probably', 'uncertain', 'probably_not', 'does_not', 'unknown']);

/** Per part, by rule. */
export const DerivedReligionFields = obj({
  prior: finding(ReligionFieldValue), // 'not_asked' when the form lacks the item
  now: finding(ReligionFieldValue),
  practicesChanged: finding(z.enum(['yes', 'no', 'uncertain'])),
  /** Form D only. Answered after the experience, about before it. */
  priorImportance: finding(z.enum(['not', 'slightly', 'moderately', 'greatly', 'unknown'])),
  priorBeliefInGod: finding(Belief),
  priorBeliefInAfterlife: finding(Belief),
});
export type DerivedReligionFields = z.infer<typeof DerivedReligionFields>;

// ─── File 1: derived/accounts.jsonl (rules only) ────────────────────────────────────────

export const NderfClassToken = z.enum([
  'nde', 'probable_nde', 'possible_nde', 'nde_like', 'fde', 'ste', 'adc', 'sde',
  'shared', 'secondhand', 'second_person', 'obe', 'sobe', 'anesthesia', 'drug',
  'dream', 'icu', 'prebirth', 'nele', 'dbv', 'smr', 'prayer', 'meditation', 'other',
]);
export type NderfClassToken = z.infer<typeof NderfClassToken>;

export const NderfAgeBand = z.enum([
  'Baby', 'Toddler', 'Young Child', 'Older Child', 'College Age', 'Adult', 'Older',
]);
export type NderfAgeBand = z.infer<typeof NderfAgeBand>;

/** NDERF's editorial layer, kept as inputs. Never a gate for eligibility, never overwritten. */
export const NderfEditorial = obj({
  classificationRaw: obj({
    page: z.string().nullable(),
    listings: z.array(z.string()),
    searchSite: z.array(z.string()),
  }),
  classificationTokens: z.array(NderfClassToken), // 'Probable NDE;Drug Experience' -> probable_nde, drug
  classificationHedged: z.boolean(), // 'NDE vs. Dream', 'NDE or FDE'
  exceptional: z.boolean(),
  tagsRaw: z.array(z.string()), // NDERF's one-line editor tags
  contentWarning: z.boolean(), // tags such as 'Trigger warning…' or 'Reader discretion advised'
  nonWesternLabel: z.boolean(), // NDERF's own label; not our culture variable
  // Search site only (~780 recent accounts matched by number):
  greysonScore: z.number().int().min(0).max(32).nullable(),
  ageBand: NderfAgeBand.nullable(),
  countryAi: z.string().nullable(),
  experienceDate: IsoDate.nullable(),
  formVersion: z.enum(['1.0', '1.1']).nullable(),
});
export type NderfEditorial = z.infer<typeof NderfEditorial>;

export const Posting = obj({
  firstPosted: IsoDate.nullable(),
  allPosted: z.array(IsoDate),
  submitted: IsoDate.nullable(), // quick_facts only (eighteen search-app pages)
  flags: z.array(z.enum(['implausible_year'])), // e.g. a listing dated 1009
});
export type Posting = z.infer<typeof Posting>;

/** Assigned from the items present on the page, never from dates: forms overlap in time
 *  because posting lags submission. Definitions in DECISIONS.md. */
export const QuestionnaireForm = z.enum(['none', 'A', 'B', 'C', 'D', 'E', 'F', 'irregular']);
export type QuestionnaireForm = z.infer<typeof QuestionnaireForm>;

/** Which prompts were on the form. Whether they were asked, never what was answered. */
export const ItemsAsked = obj({
  religionField: z.enum(['orientation', 'affiliation_menu', 'absent']),
  namedReligiousFigures: z.boolean(), // "…described by name in religions (for example: Jesus…)"
  deceasedOrReligiousSpirits: z.boolean(),
  deceasedBeings: z.enum(['deceased_or_alive', 'deceased_only', 'absent']),
  mysticalBeing: z.boolean(),
  anyBeings: z.boolean(),
  experienceIncludedChecklist: z.boolean(),
  lifeThreat: z.boolean(),
});
export type ItemsAsked = z.infer<typeof ItemsAsked>;

export const LifeThreatAnswer = obj({
  answer: z.enum(['yes', 'no', 'uncertain']).nullable(),
  causes: z.array(z.string()), // sub-menu labels as written: 'Accident', 'Drug or medication overdose', …
  severity: z.enum(['clinical_death', 'life_threatening_not_clinical_death', 'not_life_threatening']).nullable(),
});
export type LifeThreatAnswer = z.infer<typeof LifeThreatAnswer>;

export const DerivedPart = obj({
  index: Index,
  questionnaire: obj({ form: QuestionnaireForm, itemsAsked: ItemsAsked }),
  /** The experiencer's own answer, parsed by rule, including the sub-menu of causes and
   *  severity most forms add. Sometimes the only place the cause appears. */
  lifeThreat: finding(LifeThreatAnswer),
  backgroundDate: ParsedDate,
  gender: z.string().nullable(), // Background field as written ('Female', 'Male')
  religionField: DerivedReligionFields,
  lengths: Lengths,
});
export type DerivedPart = z.infer<typeof DerivedPart>;

export const DerivedRecord = obj({
  accountId: z.string().min(1),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/), // of the raw page; a change means offsets may no longer line up
  deriveVersion: z.string(),
  nderf: NderfEditorial,
  posting: Posting,
  parts: z.array(DerivedPart),
  tagClaims: obj({ countries: z.array(CountryClaim), language: LanguageClaim.nullable() }),
  lengths: Lengths, // whole account
});
export type DerivedRecord = z.infer<typeof DerivedRecord>;

// ─── File 2: coded/<codebookVersion>/<runId>.jsonl (LLM) ────────────────────────────────
// The LLM sees only what the experiencer wrote (narrative and questionnaire), never NDERF's
// classification, tags, or summary, so its coding is independent of NDERF's.

export const CodingRun = obj({
  codebookVersion: z.string(),
  promptVersion: z.string(),
  model: z.string(),
  runId: z.string(),
  codedAt: z.iso.datetime(),
});
export type CodingRun = z.infer<typeof CodingRun>;

export const Reporter = obj({
  role: z.enum(['experiencer', 'experiencer_assisted', 'relative', 'clinician', 'other', 'unknown']),
  relationship: CopiedText.nullable(), // for relatives; will reuse area 3's kinship vocabulary
  assistance: z.enum(['interviewed', 'transcribed', 'typed_by_other', 'other']).nullable(),
  evidence: z.array(Evidence),
});
export type Reporter = z.infer<typeof Reporter>;

export const CodedPart = obj({
  index: Index,
  relation: z.enum(['sole', 'first_telling', 'retelling', 'follow_up', 'separate_experience']),
  episodeIds: z.array(z.string()),
});
export type CodedPart = z.infer<typeof CodedPart>;

/** Exists to rule out experiences produced by something other than a near-death situation.
 *  How close the person came to death is a covariate, not a gate. Classifies the reported
 *  event, not its credibility: a complication the experiencer reports counts as reported. */
export const Circumstance = obj({
  /** What was happening to the experiencer's own body or safety. A fear-death experience
   *  (a threat with no illness or injury) is 'threat_without_injury' and counts. */
  context: z.enum(['illness_or_injury', 'threat_without_injury', 'someone_elses_death', 'none', 'unclear']),
  /** Something other than a near-death situation that produced the experience. A known
   *  inducer moves the episode to the comparison group. An overdose is not an inducer: it is
   *  an illness_or_injury context with the overdose flag. */
  inducer: z.enum([
    'none', 'recreational_drugs', 'meditation_or_practice', 'sleep_or_dream',
    'anesthesia_without_complication', 'unclear',
  ]),
  // Flags. None of them excludes.
  overdose: z.enum(['accidental', 'intentional', 'unclear']).nullable(), // alcohol counts as a drug
  suicideAttempt: z.boolean(),
  /** A psychoactive medication given as the experience began, during a real illness or
   *  injury (e.g. ketamine for a procedure). */
  psychoactiveMedicationAtOnset: z.boolean(),
  /** Covariate; 'unclear' is a fine answer. Evidence for 'bodily_crisis' must point at
   *  described bodily events (arrest, bleeding, injury, resuscitation, what clinicians said),
   *  not at the experience (a sense of dying, being sent back). A bare "I died" with no
   *  physical event described is 'unclear'. 'minor': e.g. fainting, a knock with brief
   *  unconsciousness, a near-drowning with self-rescue. */
  closeness: z.enum(['bodily_crisis', 'minor', 'threat_only', 'unclear']),
  /** For a strictest-definition sensitivity analysis. */
  cardiacArrest: obj({
    reported: z.boolean(),
    basis: z.enum(['clinician_or_witness', 'checkbox', 'self_report', 'hedged', 'medically_induced']).nullable(),
  }).refine((c) => c.reported === (c.basis !== null), {
    message: 'cardiacArrest.basis is required exactly when reported is true',
  }),
  timing: z.enum(['during', 'after', 'unrelated', 'unclear']),
  evidence: z.array(Evidence),
})
  .refine((c) => c.overdose === null || c.context === 'illness_or_injury', {
    message: 'an overdose flag needs an illness_or_injury context',
  })
  .refine((c) => !c.psychoactiveMedicationAtOnset || c.context === 'illness_or_injury', {
    message: 'psychoactiveMedicationAtOnset needs an illness_or_injury context',
  });
export type Circumstance = z.infer<typeof Circumstance>;

export const Age = obj({
  /** A range when the person gives one: "six or seven" -> [6, 7]. */
  years: z.union([
    z.number().min(0).max(120),
    z.tuple([z.number().min(0).max(120), z.number().min(0).max(120)]).refine(([a, b]) => a < b, {
      message: 'an age range must be ascending',
    }),
  ]),
  basis: z.enum(['stated', 'computed']),
});
export type Age = z.infer<typeof Age>;

/** Every experience of the experiencer's own on the page is an episode, including later OBEs,
 *  dreams, and visions mentioned in passing; whether it counts is decided by rule at analysis
 *  time (ResolvedEpisode). Other people's experiences described on the page are never episodes. */
export const Episode = obj({
  episodeId: z.string(), // `${accountId}#1`
  /** Per episode: one page can mix firsthand experiences with a relative's, told secondhand. */
  reporter: Reporter,
  /** On multi-episode pages, which episode the questionnaire answers describe. */
  questionnaireRefersTo: z.enum(['this_episode', 'several_episodes', 'unclear']),
  /** The same experience repeated with the same trigger (e.g. at every therapy session). */
  recurrent: z.boolean(),
  /** Only when the text dates this episode and Background can't (no date, or several episodes). */
  textDate: finding(ParsedDate),
  /** Twelve or younger at the experience; teens are 'no'. A number decides, stated or computed
   *  from dates (a birth year, or "a month before I turned nine"). Without one: "little",
   *  elementary school or younger, or a plain "as a child" -> 'yes'; teenager or high school ->
   *  'no'; middle school or junior high -> 'unclear'. Religion is coded the same way at every age. */
  child: obj({ value: z.enum(['yes', 'no', 'unclear']), evidence: z.array(Evidence) }),
  age: finding(Age),
  circumstance: Circumstance,
  describesExperience: z.enum(['yes', 'partial', 'no']),
  experienceToldIn: obj({ narrative: z.boolean(), questionnaire: z.boolean() }),
});
export type Episode = z.infer<typeof Episode>;

/** One explicit statement about the experiencer's own religion. Statements about other
 *  individuals ("my grandmother was Catholic") are not coded. Statements about the household
 *  the person was raised in are upbringing: "we were Lutheran", "my family practiced
 *  Catholicism". Never inferred from what was seen, country, heritage, vocabulary ("Allah"),
 *  or practices ("Mass", "the rosary", speaking in tongues, "spirit-filled"). Attending a
 *  named church or group counts. */
export const ReligionStatement = obj({
  /** Several for "several faiths", dual belonging, or a group attended alongside. */
  traditions: z.array(Tradition).min(1),
  kind: z.enum(['identification', 'upbringing', 'attendance', 'left']),
  when: z.enum(['childhood', 'before_experience', 'at_experience', 'after_experience', 'now', 'unspecified']),
  practice: z.enum(['devout', 'nominal', 'lapsed', 'non_practicing']).nullable(), // doesn't change affiliation
  term: CopiedText, // as written: 'Pentecostal church'
  source: z.enum(['religion_field_text', 'narrative', 'other_item']),
  /** 'explaining_experience' marks a statement offered to explain something in the experience,
   *  wherever it appears; the sensitivity analysis drops these from backfill. Which
   *  questionnaire item a statement sits in doesn't matter: the "consistent with your earthly
   *  beliefs" item is where people most naturally describe what they believed before. */
  context: z.enum(['background', 'explaining_experience', 'other']),
  evidence: z.array(Evidence),
});
export type ReligionStatement = z.infer<typeof ReligionStatement>;

/** Explicit self-description of ethnicity, race, ancestry, or national origin. NDERF doesn't
 *  ask about ethnicity, so this is the only source besides country and language. */
export const HeritageStatement = obj({
  term: CopiedText, // as written: 'Mexican-American'
  aspects: z.array(z.enum(['ethnicity', 'race', 'ancestry', 'national_origin'])).min(1),
  countries: z.array(CountryCode), // when it names one, so country grouping can use ancestry too
  /** Guards against mentions prompted by the encounter (e.g. explaining a family background
   *  because of a figure seen in the experience). */
  context: z.enum(['background', 'explaining_experience', 'other']),
  evidence: z.array(Evidence),
});
export type HeritageStatement = z.infer<typeof HeritageStatement>;

/** Area 2, coded from text. Menu answers are in DerivedReligionFields (rules). */
export const Background = obj({
  religionStatements: z.array(ReligionStatement),
  heritageStatements: z.array(HeritageStatement),
});
export type Background = z.infer<typeof Background>;

export const CodedRecord = obj({
  accountId: z.string().min(1),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/), // must match the derived record, or the join fails loudly
  run: CodingRun,
  parts: z.array(CodedPart),
  episodes: z.array(Episode),
  /** Text inside a narrative or answer that isn't the experiencer's (an editor's note, a
   *  reader's comment, a transcription credit, a copyright notice or link). Never coded. */
  nonExperiencerText: z.array(
    obj({
      source: SourceRef,
      span: Span,
      kind: z.enum(['editor_note', 'reader_comment', 'transcription_credit', 'boilerplate']),
    }),
  ),
  textClaims: obj({ countries: z.array(CountryClaim), language: LanguageClaim.nullable() }), // source: 'self_report'
  background: Background,
  // encounters: area 3
  // jesusMentions: area 3
}).superRefine((r, ctx) => {
  const ids = r.episodes.map((e) => e.episodeId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', message: 'episodeIds must be unique', path: ['episodes'] });
  }
  r.episodes.forEach((e, i) => {
    if (!e.episodeId.startsWith(`${r.accountId}#`)) {
      ctx.addIssue({ code: 'custom', message: 'episodeId must start with `${accountId}#`', path: ['episodes', i, 'episodeId'] });
    }
  });
  r.parts.forEach((p, i) =>
    p.episodeIds.forEach((id, j) => {
      if (!ids.includes(id)) {
        ctx.addIssue({ code: 'custom', message: `part refers to unknown episode ${id}`, path: ['parts', i, 'episodeIds', j] });
      }
    }),
  );
});
export type CodedRecord = z.infer<typeof CodedRecord>;

// ─── Analysis-time views (computed by pre-registered rules; not coded) ──────────────────

/** Defined in the pre-registration, e.g. a Marian-devotional-culture group. */
export const CountryGroup = obj({
  id: z.string(),
  label: z.string(),
  members: z.array(CountryCode),
  rationale: z.string(),
});
export type CountryGroup = z.infer<typeof CountryGroup>;

export const ResolvedAccount = obj({
  accountId: z.string().min(1),
  ruleVersion: z.string(),
  /** Role precedence: origin > unspecified > residence. Experience location is recorded but
   *  never used as the person's country. Within a role, the experiencer's own statement > NDERF
   *  tag > search-app quick facts > NDERF's AI-inferred country. With no country from any of
   *  these: presumed US, unless the account was translated from another language (unknown). */
  country: obj({
    code: CountryCode.nullable(),
    role: z.enum(['origin', 'residence', 'unspecified']).nullable(),
    /** Keeps a US the person or NDERF's tag states apart from an AI-inferred or presumed one. */
    source: z.enum(['self_report', 'nderf_tag', 'nderf_quick_facts', 'nderf_country_ai', 'presumed_us', 'unknown']),
  })
    .refine((c) => (c.source === 'unknown') === (c.code === null), {
      message: "country code is null exactly when source is 'unknown'",
    })
    .refine((c) => c.source !== 'presumed_us' || (c.code === 'US' && c.role === null), {
      message: "presumed_us means code 'US' and no role",
    }),
  countryGroups: z.array(z.string()), // ids of CountryGroup definitions it falls in
  language: obj({
    original: LanguageCode,
    basis: z.enum(['stated', 'presumed_english']),
    translated: z.boolean().nullable(),
  }),
  /** Person level: a being counts if it appears in ANY qualifying episode. Experiences that
   *  don't qualify are recorded but never counted. */
  qualifyingEpisodeIds: z.array(z.string()),
  /** Prior religion is resolved as of this episode. */
  firstQualifyingEpisodeId: z.string().nullable(),
  /** Flagged for a sensitivity analysis that drops these pages. */
  multipleQualifyingEpisodes: z.boolean(),
})
  .refine(
    (a) =>
      a.firstQualifyingEpisodeId === null
        ? a.qualifyingEpisodeIds.length === 0
        : a.qualifyingEpisodeIds.includes(a.firstQualifyingEpisodeId),
    { message: 'firstQualifyingEpisodeId must be one of qualifyingEpisodeIds (null when there are none)' },
  )
  .refine((a) => a.multipleQualifyingEpisodes === a.qualifyingEpisodeIds.length > 1, {
    message: 'multipleQualifyingEpisodes must match the number of qualifying episodes',
  });
export type ResolvedAccount = z.infer<typeof ResolvedAccount>;

export const ResolvedAffiliation = obj({
  status: z.enum(['resolved', 'unknown', 'do_not_know', 'no_comment']),
  traditions: z.array(Tradition),
  basis: z.enum(['menu', 'religion_field_text', 'explicit_statement', 'upbringing']).nullable(),
  practice: ReligionStatement.shape.practice,
  /** Menu and an explicit statement about the same time disagree; flagged, not silently resolved. */
  conflict: z.boolean(),
  /** Depends on a statement made to explain the experience (sensitivity analysis drops these). */
  usesEncounterPromptedStatement: z.boolean(),
}).refine((a) => (a.status === 'resolved') === (a.traditions.length > 0 && a.basis !== null), {
  message: "status is 'resolved' exactly when there are traditions and a basis",
});
export type ResolvedAffiliation = z.infer<typeof ResolvedAffiliation>;

/** Prior, as of the first qualifying episode: menu if informative > explicit statement about
 *  before or at that experience (including the religion field's free text) > upbringing.
 *  - Upbringing counts as the person's religion unless the menu or a statement places a
 *    different affiliation, or none, at the time of the experience. Lapsed or nominal doesn't
 *    override. "Left the church" with nothing else resolves to unknown, not unaffiliated.
 *  - "Do not know", "No comment", and an untouched "Select" are not informative: statements
 *    and upbringing fill in (basis says so). Status do_not_know / no_comment only when nothing does.
 *  - "Other Christian" is informative (christian_unspecified) and outranks upbringing; free
 *    text about the same time can make it more specific.
 *  - An affiliation or attendance stated for the same time as the menu answer is added to it,
 *    not a conflict (Catholic + attending Edgar Cayce meetings).
 *  Now: menu > 'now' statements, same rules. */
export const ResolvedReligion = obj({
  accountId: z.string().min(1),
  ruleVersion: z.string(),
  prior: ResolvedAffiliation,
  now: ResolvedAffiliation,
  orientation: z.enum(['liberal', 'moderate', 'conservative_fundamentalist']).nullable(), // forms A–C only
});
export type ResolvedReligion = z.infer<typeof ResolvedReligion>;

/** primary: firsthand, context illness_or_injury or threat_without_injury, inducer 'none',
 *  not unrelated in time, and an experience described. comparison: the same, but with a known
 *  inducer. excluded: everything else (no threat, someone else's death, not firsthand, …). */
export const ResolvedEpisode = obj({
  episodeId: z.string(),
  ruleVersion: z.string(),
  gapYears: z.number().int().nullable(), // first posting year minus experience year
  /** firsthand = experiencer or experiencer_assisted (interviewed, transcribed, typed by
   *  someone else). Reports by relatives or clinicians are not firsthand. */
  firsthand: z.boolean(),
  analysisSet: z.enum(['primary', 'comparison', 'excluded']),
  exclusionReasons: z.array(
    z.enum(['not_firsthand', 'no_threat', 'someone_elses_death', 'unrelated_in_time', 'no_experience_described', 'unclear']),
  ),
  /** Flags never exclude; sensitivity analyses drop flagged episodes. */
  flags: z.array(z.enum(['overdose', 'suicide_attempt', 'psychoactive_medication_at_onset', 'recurrent', 'translated'])),
}).refine((e) => (e.analysisSet === 'excluded') === (e.exclusionReasons.length > 0), {
  message: 'exclusionReasons are given exactly when the episode is excluded',
});
export type ResolvedEpisode = z.infer<typeof ResolvedEpisode>;
