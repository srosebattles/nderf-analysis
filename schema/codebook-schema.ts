// Output schema for coding NDERF accounts, in zod: the single source for both the TypeScript
// types (z.infer) and the runtime check every record must pass before it is written.
// v4 DRAFT: areas 1 (eligibility and provenance) and 2 (religious background) are designed and
// were revised after trial-coding the first fifty practice accounts. Area 3 (encounters,
// doctrinal statements, mentions of Jesus, and how the memory came to be told) is designed but
// not yet trial-coded. Decisions, their reasons, and open questions: DECISIONS.md.
//
// Files, joined on accountId:
//   derived/accounts.jsonl                  rules only; regenerated whenever the parser changes
//   coded/<codebookVersion>/<runId>.jsonl   LLM output, quotes stripped; one folder per codebook version
//   (private) nderf-raw-data/llm-raw/<runId>/   raw LLM responses, which contain quotes
// The Resolved* views at the bottom are computed from both by pre-registered rules, not stored.
//
// No account text in this repository. Strings copied from accounts are capped at
// MAX_COPIED_WORDS (enforced below), and `npm run check:overlap` confirms before each commit
// that no five-word sequence from any narrative or free-text answer appears in our prose and
// code, and no sequence one word longer than the cap appears in data files.
// (NDERF's question wording and menu labels are form text, not account text.)
//
// Objects are strict: an unexpected key fails validation, which catches an LLM inventing fields.
// Cross-field rules are refinements; they run at validation time but don't carry over into an
// exported JSON Schema (z.toJSONSchema), which gives the model only the shape and allowed values.

import { z } from 'zod';

export const SCHEMA_VERSION = 'v4-draft';
/** A limit, not a target: copy the term, name, or title as written, not the sentence around it.
 *  Raised from four to six in November 2026 (DECISIONS.md, Conventions). */
export const MAX_COPIED_WORDS = 6;

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

const SawSensed = z.enum(['saw', 'sensed', 'neither', 'no', 'unrecognized']);
const YesNoUncertain = z.enum(['yes', 'no', 'uncertain', 'unrecognized']);

/** The option picked on each item about beings, parsed by rule ('not_asked' when the item isn't
 *  on the form). Encounters hold only what is described, so comparing these with the coded
 *  encounters measures checkbox-narrative disagreement; a box ticked with nothing described
 *  creates no encounter. */
export const BeingItemAnswers = obj({
  /** "Did you see any beings in your experience?": "I actually saw them" / "Saw them" -> saw;
   *  "I sensed their presence" -> sensed. */
  anyBeings: finding(SawSensed),
  deceasedOrReligiousSpirits: finding(SawSensed), // "Did you see deceased or religious spirits?"
  /** "…any deceased (or alive) beings?" or, on form F, "…any deceased beings?" (ItemsAsked says which). */
  deceasedBeings: finding(YesNoUncertain),
  mysticalBeing: finding(z.enum(['definite_being_or_voice', 'unidentifiable_voice', 'neither', 'no', 'unrecognized'])),
  namedReligiousFigures: finding(YesNoUncertain), // "…described by name in religions (for example: Jesus…)"
  /** "The experience included:" checklist, forms A and C. */
  checklistUnearthlyBeings: finding(z.boolean()), // "Presence of unearthly beings" ticked
  checklistDeceasedPersons: finding(z.boolean()), // "Presence of deceased persons" ticked
});
export type BeingItemAnswers = z.infer<typeof BeingItemAnswers>;

const Reality = z.enum(['definitely_real', 'probably_real', 'probably_not_real', 'definitely_not_real', 'unrecognized']);

/** Provenance items with fixed answers, parsed by rule. Comments after the answers are read by
 *  the coder like any other text. */
export const ProvenanceItemAnswers = obj({
  /** "Did you have any knowledge of near death experience (NDE) prior to your experience?" */
  priorNdeKnowledge: finding(YesNoUncertain),
  sharedWithOthers: finding(YesNoUncertain), // "Have you ever shared this experience with others?"
  realityShortlyAfter: finding(Reality), // "…shortly (days to weeks) after it happened?"
  realityNow: finding(Reality),
  /** Compared with other life events around the time of the experience. */
  memoryAccuracy: finding(z.enum(['more', 'as', 'less', 'unrecognized'])),
});
export type ProvenanceItemAnswers = z.infer<typeof ProvenanceItemAnswers>;

/** Pre-registered keywords for a naive search, the loosest rungs of the Jesus ladder. Narrow:
 *  what King (2024) searched. Broad: adds spellings and titles. Kept separate, never merged,
 *  so analysis can combine them as it likes. */
export const JESUS_KEYWORDS_NARROW = ['jesus', 'christ'] as const;
export const JESUS_KEYWORDS_BROAD = [
  ...JESUS_KEYWORDS_NARROW, 'jesús', 'cristo', 'christos', 'isa', 'yeshua', 'savior', 'saviour', 'messiah',
] as const;
export type JesusKeyword = (typeof JESUS_KEYWORDS_BROAD)[number];

/** The pre-registered matching rule: whole words, case-insensitive, accents kept distinct
 *  ("Jesús" is not "Jesus"). A letter or digit on either side blocks a match, so "Christ"
 *  doesn't match "Christian"; an apostrophe doesn't, so "Christ's" counts. Mechanical on
 *  purpose: it reproduces a naive search, names and idioms included. */
export const countKeyword = (text: string, keyword: string): number =>
  text.normalize('NFC').match(new RegExp(`(?<![\\p{L}\\p{N}])${keyword.normalize('NFC')}(?![\\p{L}\\p{N}])`, 'giu'))?.length ?? 0;

/** Keyword hits on one part, counted by rule. Narrative is the raw narrative, including any
 *  editor's note inside it; answers are the experiencer's free text in the questionnaire (the
 *  comment, or the whole response when it has no menu answer); question wording is NDERF's.
 *  A search of the website's pages sees all three; on every form D–F page the named-figures
 *  item's own wording contains "Jesus". */
export const KeywordHits = obj({
  keyword: z.enum(JESUS_KEYWORDS_BROAD),
  narrative: Index,
  answers: Index,
  questionWording: Index,
});
export type KeywordHits = z.infer<typeof KeywordHits>;

export const DerivedPart = obj({
  index: Index,
  questionnaire: obj({ form: QuestionnaireForm, itemsAsked: ItemsAsked }),
  /** The experiencer's own answer, parsed by rule, including the sub-menu of causes and
   *  severity most forms add. Sometimes the only place the cause appears. */
  lifeThreat: finding(LifeThreatAnswer),
  beingItems: BeingItemAnswers,
  provenanceItems: ProvenanceItemAnswers,
  /** One entry per keyword in JESUS_KEYWORDS_BROAD, zeros included. */
  jesusKeywordHits: z.array(KeywordHits).refine(
    (hits) => hits.length === JESUS_KEYWORDS_BROAD.length && JESUS_KEYWORDS_BROAD.every((k) => hits.some((h) => h.keyword === k)),
    { message: 'one entry per keyword in JESUS_KEYWORDS_BROAD' },
  ),
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

/** Built from parts, so counts can be as granular as needed (grandmothers versus grandfathers).
 *  Finer detail (a second cousin once removed) stays only in the words. */
export const Relationship = obj({
  role: z.enum([
    'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'aunt_or_uncle', 'niece_or_nephew', 'cousin',
    'spouse', 'partner', 'godparent', 'godchild', 'ancestor_unspecified', 'relative_unspecified',
  ]),
  sex: z.enum(['female', 'male', 'not_stated']), // from a gendered word or pronouns, never from a name
  greats: z.number().int().min(0), // "fifth great-grandfather" is 5
  side: z.enum(['maternal', 'paternal', 'not_stated']),
  link: z.enum(['blood', 'half', 'step', 'in_law', 'adoptive', 'foster', 'by_marriage', 'former', 'not_stated']),
  words: CopiedText,
});
export type Relationship = z.infer<typeof Relationship>;

export const Reporter = obj({
  role: z.enum(['experiencer', 'experiencer_assisted', 'relative', 'clinician', 'other', 'unknown']),
  /** For a relative: how the reporter is related to the experiencer (the experiencer's mother
   *  reporting: parent, female), in area 3's kinship parts. */
  relationship: Relationship.nullable(),
  assistance: z.enum(['interviewed', 'transcribed', 'typed_by_other', 'other']).nullable(),
  evidence: z.array(Evidence),
}).refine((r) => (r.role === 'relative') === (r.relationship !== null), {
  message: 'relationship is given exactly for a relative',
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

/** Psychiatric medication being taken when the experience happened. Separate from
 *  psychoactiveMedicationAtOnset (a drug given as the experience began). Explicit only. */
export const PsychiatricMedication = obj({
  kind: z.enum(['antipsychotic', 'mood_stabilizer', 'antidepressant', 'sedative', 'other']),
  words: CopiedText,
  evidence: z.array(Evidence).min(1),
});
export type PsychiatricMedication = z.infer<typeof PsychiatricMedication>;

/** Greyson and Bush's (1992) three types under neutral names: 'frightening_usual_features' is
 *  their "inverse" type, 'torment_or_hostile_beings' their "hellish" type. The coder describes
 *  content and never labels it "hell"; the experiencer's own label is separate. */
export const DistressingContent = obj({
  type: z.enum(['frightening_usual_features', 'void', 'torment_or_hostile_beings']),
  evidence: z.array(Evidence).min(1),
});
export type DistressingContent = z.infer<typeof DistressingContent>;

/** What the experiencer calls the experience or a place in it. None stated: an empty list. */
export const ExperiencerLabel = obj({
  label: z.enum(['heaven_or_paradise', 'hell_or_hellish', 'purgatory', 'void', 'other']),
  words: CopiedText,
  when: z.enum(['during', 'after', 'not_stated']),
  evidence: z.array(Evidence).min(1),
});
export type ExperiencerLabel = z.infer<typeof ExperiencerLabel>;

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
  psychiatricMedication: z.array(PsychiatricMedication), // empty: none stated
  describesExperience: z.enum(['yes', 'partial', 'no']),
  experienceToldIn: obj({ narrative: z.boolean(), questionnaire: z.boolean() }),
  /** 'mixed': turned from one to the other, with a distressing phase described (a stretch of
   *  the experience, not a moment's fear). Distress after returning to the body doesn't count. */
  tone: z.enum(['pleasant', 'distressing', 'mixed', 'neutral_or_unclear']),
  distressingContent: z.array(DistressingContent),
  experiencerLabels: z.array(ExperiencerLabel),
  /** The setting itself (land, water, plants, the light filling the place) reported literally
   *  as alive, aware, or conscious, with nothing interacting with the experiencer. Anything that
   *  communicates with them or acts toward them is an encounter (animate_object_or_landscape).
   *  Similes ("as if the trees were breathing") don't count. */
  surroundingsAlive: obj({ value: z.boolean(), words: CopiedText.nullable(), evidence: z.array(Evidence) }),
}).refine((e) => e.tone !== 'pleasant' || e.distressingContent.length === 0, {
  message: 'a pleasant episode has no distressing content',
}).refine((e) => e.surroundingsAlive.value === (e.surroundingsAlive.words !== null && e.surroundingsAlive.evidence.length > 0), {
  message: 'surroundingsAlive has words and evidence exactly when true',
});
export type Episode = z.infer<typeof Episode>;

/** Conditions that can produce hallucinations or delusions are flagged (never excluded); "other
 *  mental health condition" and the neurodevelopmental labels are recorded outside the flag.
 *  Neurodevelopmental conditions are recorded by the label used, because diagnostic boundaries
 *  have shifted (DECISIONS.md, area 1). */
export const ConditionType = z.enum([
  // Can produce hallucinations or delusions: these raise the flag.
  'psychotic_disorder', // schizophrenia, schizoaffective, delusional disorder, brief psychosis
  'bipolar_disorder',
  'depression_with_psychotic_features',
  'delirium', // including "ICU psychosis"
  'dementia',
  'seizure_disorder',
  'sleep_disorder_with_hallucinations', // narcolepsy, sleep paralysis
  'substance_induced_psychosis',
  'other_linked_to_hallucinations', // the text links the condition to hallucinations
  // Outside the flag.
  'other_mental_health', // depression, anxiety, PTSD, and the like
  'autism', // including Asperger's, PDD-NOS, "on the spectrum"
  'adhd', // including ADD
  'intellectual_disability_or_developmental_delay',
  'specific_learning_disability', // dyslexia, dyscalculia
  'other_neurodevelopmental',
]);
export type ConditionType = z.infer<typeof ConditionType>;

export const HALLUCINATION_FLAG_CONDITIONS: readonly ConditionType[] = [
  'psychotic_disorder', 'bipolar_disorder', 'depression_with_psychotic_features', 'delirium', 'dementia',
  'seizure_disorder', 'sleep_disorder_with_hallucinations', 'substance_induced_psychosis', 'other_linked_to_hallucinations',
];

/** One stated condition. Recorded only when stated: never inferred from the experience's content,
 *  from a medication, or from someone calling the experience a hallucination. */
export const ConditionStatement = obj({
  condition: ConditionType,
  words: CopiedText,
  /** Relative to the episodes in episodeIds. */
  when: z.enum(['before', 'at_the_time', 'at_the_time_recognized_later', 'began_after', 'not_stated']),
  episodeIds: z.array(z.string()).min(1),
  statedBy: z.enum(['experiencer', 'clinician_as_reported', 'family']),
  basis: z.enum(['diagnosed', 'self_identified', 'not_stated']),
  evidence: z.array(Evidence).min(1),
});
export type ConditionStatement = z.infer<typeof ConditionStatement>;

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

// ─── Area 3: encounters ─────────────────────────────────────────────────────────────────
// What to capture: area3-requirements.md. How it is modeled, and why: DECISIONS.md, area 3.

const has = <T>(list: readonly T[], value: T) => list.includes(value);

/** "During" only when the text tells the act of identifying as part of the experience; "after"
 *  only when it places it later; otherwise not stated, including for relatives and for names
 *  simply used in telling the story. */
export const IdentityTiming = z.enum(['during', 'after', 'not_stated']);
export type IdentityTiming = z.infer<typeof IdentityTiming>;

/** How identity was established, only when the text gives it as the way the person knew
 *  (describing a beard isn't saying the being was known by it). */
export const IdentityBasis = z.enum([
  'announced', // the being, or another being, said or conveyed who it was (during only)
  'recognized', // as someone already familiar: known in life, or felt known
  'appearance', // by how it looked; afterward, a photo or painting seen later
  'knowing', // knew or felt who it was with no means given ("felt it was" is this, not a hedge)
  'reasoned', // worked out from doctrine, from what the being did, or from what happened
  'told_by_person', // someone in ordinary life identified it (after only)
  'reading_or_media', // (after only)
  'not_stated',
]);

/** 'hedged' includes either-or lists and an "Uncertain" menu answer on the item whose comment
 *  gives the name; 'resemblance' is "looked like" or "reminded me of" with no claim that it was. */
export const Certainty = z.enum(['asserted', 'hedged', 'resemblance']);
export type Certainty = z.infer<typeof Certainty>;

export const BeingCategory = z.enum([
  // People. Vital status is an attribute, so living and deceased people share these.
  // relative_never_met is implied from three greats up (great-great-great-grandparent) unless
  // the text says they met; with fewer, the text decides.
  'family', 'relative_never_met', 'friend_or_acquaintance', 'clergy_known_personally',
  /** Known in life, relationship not stated ("people I knew"): could be family or friends. */
  'known_person_relationship_not_stated',
  // God and Christian figures. "God" stays God, with its words kept.
  'god', 'jesus', 'holy_spirit', 'mary', 'angel',
  /** Saints, Protestant luminaries, church fathers, biblical figures, other traditions' figures,
   *  and non-religious historical figures and celebrities. The subcategory and traditions come
   *  from a pre-registered table keyed by canonical name; the coder only suggests one. */
  'named_figure',
  'living_religious_leader', // not known personally, any tradition
  // Unidentified (a being with no claim outside this group was never identified).
  'being_of_light', 'voice_or_presence', 'guide', 'council_or_robed_figures', 'orb', 'unrecognized_human',
  'unidentified_being', // a being or entity none of the others describes
  'hostile_being', // the devil, demons, other hostile beings; a monstrous or demonic beast
  'animal', // an ordinary animal, hostile or not
  // Controls
  'extraterrestrial', 'folkloric_being', 'fictional_character', 'mechanical_being',
  /** Something normally inanimate (sand, water, a tree) that communicates with the experiencer
   *  or acts toward them, reported literally. Merely alive surroundings: the episode's flag. */
  'animate_object_or_landscape',
  /** A being the experiencer identifies as themselves in some form (a double, a higher self),
   *  appearing as a separate being; one's own body never counts. Merely looking like the
   *  experiencer is representation personal_likeness. */
  'self_double',
  'other',
]);
export type BeingCategory = z.infer<typeof BeingCategory>;

export const UNIDENTIFIED_CATEGORIES: readonly BeingCategory[] = [
  'being_of_light', 'voice_or_presence', 'guide', 'council_or_robed_figures', 'orb', 'unrecognized_human',
  'unidentified_being',
];
/** People known through ordinary life. They never get a canonical name, for privacy. */
const PRIVATE_PERSON_CATEGORIES: readonly BeingCategory[] = [
  'family', 'relative_never_met', 'friend_or_acquaintance', 'clergy_known_personally',
  'known_person_relationship_not_stated', 'unrecognized_human',
];
/** Vital status is required for these. */
const VITAL_CATEGORIES: readonly BeingCategory[] = [
  'family', 'relative_never_met', 'friend_or_acquaintance', 'clergy_known_personally',
  'known_person_relationship_not_stated', 'animal',
];

/** The coder's suggestion only; the pre-registered table decides. Religious versus secular is
 *  decided once per name: known mainly for faith, or on a church calendar, counts as religious.
 *
 *  Saints are grouped by when they lived and which split divides them, never by who canonized
 *  them or when. An unguided model is likely to get this wrong (treating "saint" as Roman
 *  Catholic, filing St. Francis as Catholic), so the coding prompt must spell it out:
 *  - early_or_medieval_saint: shared heritage. Any saint who died before the East-West schism
 *    (1054), church fathers included, and Western saints who died between 1054 and the
 *    Reformation (about 1517), such as St. Francis.
 *  - orthodox_saint: Eastern saints who died after 1054 (Gregory Palamas, Seraphim of Sarov);
 *    for the Oriental Orthodox, after Chalcedon (451).
 *  - post_reformation_catholic_saint: Western saints who died after about 1517 (Padre Pio).
 *  - protestant_saint_or_luminary: Protestant figures after about 1517 (Bonhoeffer, Wesley).
 *  Dating is by death, not canonization (Joan of Arc died in 1431, canonized in 1920). Figures
 *  near a line, and pre-Reformation figures only Protestants claim (Hus, Wycliffe), are decided
 *  per name in the table. Which traditions claim a figure (often several) is the table's, not
 *  the subcategory's. Angels are their own category, never saints (Michael isn't Catholic). */
export const NamedFigureSubcategory = z.enum([
  'early_or_medieval_saint', 'orthodox_saint', 'post_reformation_catholic_saint', 'protestant_saint_or_luminary',
  'biblical_figure',
  'muhammad', 'shia_imam', 'buddha_or_bodhisattva', 'hindu_deity', 'yama_or_messengers', 'sikh_figure',
  'latter_day_saint_figure', 'bahai_figure', 'modern_guru_or_teacher', 'other_religious_figure',
  'non_religious_historical_figure',
]);
export type NamedFigureSubcategory = z.infer<typeof NamedFigureSubcategory>;

/** Our own spelling, not copied text, so variant spellings and titles of one figure group together. */
export const CanonicalName = z.string().min(1).max(80);


export const FriendType = z.enum([
  'childhood_friend', 'school_friend_or_classmate', 'close_friend', 'coworker', 'military_comrade',
  'neighbor', 'mentor_or_teacher', 'acquaintance', 'unspecified',
  // Clinical or paid care, by direction. Unpaid care within a family stays with family.
  'patient_of_experiencer', // the experiencer was their clinician or paid carer
  'clinician_or_carer_of_experiencer', // their own doctor, nurse, therapist, or paid carer
  'other_professional', // a client, customer, employer: known through work, not a coworker or mentor
  'other',
]);

export const ReligiousRole = z.enum([
  'priest', 'pastor_or_minister', 'deacon', 'nun_or_religious_sister', 'monk_or_religious_brother',
  'rabbi', 'imam', 'other',
]);

/** Only when stated, for any relative or friend (not only step-relations and in-laws). */
export const Closeness = obj({
  formative: z.boolean(), // raised the experiencer, or shared their childhood household
  attachment: z.enum(['closer_than_role', 'close', 'distant', 'estranged_or_in_conflict', 'not_stated']),
  words: CopiedText.nullable(),
  evidence: z.array(Evidence).min(1),
}).refine((c) => c.formative || c.attachment !== 'not_stated', {
  message: 'closeness is recorded only when something is stated',
});

/** How a person known in ordinary life relates to the experiencer. */
export const PersonTie = obj({
  relationship: Relationship.nullable(), // family, relative never met
  friendTypes: z.array(FriendType), // friend or acquaintance
  /** Clergy known personally; also a relative or friend who was clergy. */
  religiousRole: ReligiousRole.nullable(),
  closeness: Closeness.nullable(),
});
export type PersonTie = z.infer<typeof PersonTie>;

/** One identity a being carries. One claim per referent per timing: a name used throughout plus
 *  one answer saying the being was recognized at once is one claim, timed during. */
export const IdentityClaim = obj({
  words: z.array(CopiedText).min(1), // as written: 'the Lord', 'a being of light'
  category: BeingCategory,
  name: CanonicalName.nullable(),
  suggestedSubcategory: NamedFigureSubcategory.nullable(),
  tie: PersonTie.nullable(),
  when: IdentityTiming,
  how: z.array(IdentityBasis).min(1),
  /** The strongest certainty any passage states; hedged passages stay in evidence. */
  certainty: Certainty,
  /** Some passage states this claim less certainly (hedged, or only a resemblance). */
  hedgedElsewhere: z.boolean(),
  evidence: z.array(Evidence).min(1),
}).superRefine((c, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (c.hedgedElsewhere && c.certainty === 'resemblance') issue('nothing is weaker than a resemblance');
  if (c.how.includes('announced') && c.when !== 'during') issue("'announced' is during only");
  if ((c.how.includes('told_by_person') || c.how.includes('reading_or_media')) && c.when !== 'after') {
    issue("'told_by_person' and 'reading_or_media' are after only");
  }
  if (c.how.includes('not_stated') && c.how.length > 1) issue("'not_stated' can't be combined with another basis");
  const named = c.category === 'named_figure' || c.category === 'living_religious_leader';
  if (named && c.name === null) issue(`${c.category} needs a canonical name`);
  if (has(PRIVATE_PERSON_CATEGORIES, c.category) && c.name !== null) issue(`${c.category} never gets a canonical name`);
  if ((c.category === 'named_figure') !== (c.suggestedSubcategory !== null)) {
    issue('suggestedSubcategory is given exactly for named_figure');
  }
  const t = c.tie;
  const needsTie = ['family', 'relative_never_met', 'friend_or_acquaintance', 'clergy_known_personally'].includes(c.category);
  if (needsTie !== (t !== null)) issue('tie is given exactly for family, relatives never met, friends, and clergy known personally');
  if (t) {
    const kin = c.category === 'family' || c.category === 'relative_never_met';
    if (kin !== (t.relationship !== null)) issue('relationship is given exactly for family and relatives never met');
    if ((c.category === 'friend_or_acquaintance') !== (t.friendTypes.length > 0)) issue('friendTypes are given exactly for friends');
    if (c.category === 'clergy_known_personally' && t.religiousRole === null) issue('clergy known personally need a religious role');
  }
});
export type IdentityClaim = z.infer<typeof IdentityClaim>;

/** For deceased people and animals. */
export const TimeSinceDeath = z.discriminatedUnion('kind', [
  obj({
    kind: z.literal('years'),
    years: z.union([
      z.number().min(0).max(300),
      z.tuple([z.number().min(0).max(300), z.number().min(0).max(300)]).refine(([a, b]) => a < b, {
        message: 'a range must be ascending',
      }),
    ]),
    basis: z.enum(['stated', 'computed']),
  }),
  obj({ kind: z.literal('shortly_before') }), // days or weeks
  obj({ kind: z.literal('within_a_year') }),
  obj({ kind: z.literal('some_years') }), // years, with no number
  obj({ kind: z.literal('before_experiencer_born') }),
  obj({ kind: z.literal('not_stated') }),
]);

/** Vital status at the time of the experience, as the experiencer reports it (including what
 *  they learned afterward). "Died before birth" and "not yet conceived" record a timing the text
 *  reports, not a belief about what the being is. */
export const Vital = obj({
  status: z.enum([
    'alive', 'dead', 'died_before_birth', 'in_womb', 'not_yet_conceived', 'not_yet_born_timing_unclear', 'not_stated',
  ]),
  diedBeforeBirth: z.enum(['miscarriage', 'stillbirth', 'abortion', 'not_stated']).nullable(),
  /** 'knew' when the text says so or the death plainly comes earlier in their own story;
   *  'did_not_know' only when the text says so. */
  experiencerKnew: z.enum(['knew', 'did_not_know', 'not_stated']),
  /** Peak in Darien (dead, not known to be dead): how the death was learned, and when it happened. */
  deathLearned: obj({
    how: z.enum(['told_by_family', 'news_or_obituary', 'records_or_genealogy', 'other', 'not_stated']),
    deathTiming: z.enum(['around_the_same_time', 'earlier', 'not_stated']),
  }).nullable(),
  diedSoonAfter: z.boolean(), // alive at the time and, as reported, died soon after
  futureChild: obj({
    laterBorn: z.enum(['yes', 'no', 'not_stated']),
    foretoldMatched: z.array(z.enum(['name', 'sex', 'other'])),
  }).nullable(),
  timeSinceDeath: TimeSinceDeath.nullable(),
  apparentAge: obj({
    /** A child who died before birth appearing as an infant is as_when_died; a toddler or older is older. */
    relative: z.enum(['as_when_died', 'younger', 'older', 'ageless', 'not_stated']),
    statedYears: z.number().min(0).max(150).nullable(),
  }).nullable(),
  /** Only when the text contrasts it with life or death: whole where they were paralysed, ill,
   *  or injured; or appearing as they were at death. Given exactly when apparentAge is. */
  apparentCondition: z.enum(['healed_or_whole', 'as_at_death', 'not_stated']).nullable(),
  evidence: z.array(Evidence),
}).superRefine((v, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const unborn = ['in_womb', 'not_yet_conceived', 'not_yet_born_timing_unclear'].includes(v.status);
  if ((v.status === 'died_before_birth') !== (v.diedBeforeBirth !== null)) issue('diedBeforeBirth is given exactly for died_before_birth');
  if ((v.status === 'dead' && v.experiencerKnew === 'did_not_know') !== (v.deathLearned !== null)) {
    issue('deathLearned is given exactly when dead and not known to be dead');
  }
  if (v.diedSoonAfter && v.status !== 'alive') issue('diedSoonAfter needs status alive');
  if (unborn !== (v.futureChild !== null)) issue('futureChild is given exactly for children not yet born');
  if ((v.status === 'dead') !== (v.timeSinceDeath !== null)) issue('timeSinceDeath is given exactly for the dead');
  if ((v.status === 'dead' || v.status === 'died_before_birth') !== (v.apparentAge !== null)) {
    issue('apparentAge is given exactly for the dead and those who died before birth');
  }
  if ((v.apparentAge !== null) !== (v.apparentCondition !== null)) issue('apparentCondition is given exactly when apparentAge is');
});
export type Vital = z.infer<typeof Vital>;

/** Starter list; grows during trial coding and is frozen before the holdout. Grouped for
 *  reading only: what a feature points to is decided at analysis time by a map keyed on figure
 *  category and feature together (a serpent under Mary's feet is not a serpent as the being). */
export const VisualFeature = z.enum([
  'wounds', 'crown_of_thorns', 'cross', 'sacred_heart', 'lamb', // Christ
  'mantle_or_veil', 'crown_of_stars', 'crescent_moon', 'rosary', 'scapular', 'immaculate_heart', 'holding_infant', // Mary
  'rays', // Christ and Mary
  'wings', 'sword', 'trumpet', 'armor', 'scales', // angels
  'halo', 'monastic_habit', 'clerical_dress', // saints and clergy
  'many_arms', 'animal_head', 'blue_skin', 'trident', 'rope_or_noose', 'ledger', // South Asian traditions
  'vase', // Buddhist
  'horns', 'red_skin', 'pitchfork', 'hooves', 'tail', 'serpent', 'dragon', 'lion', 'claws', // hostile
  // general
  'robe', 'beard', 'hood', 'throne', 'book', 'staff', 'crown', 'body_of_light', 'flowers',
  'hair_color', 'eye_color', 'skin_tone', 'face_not_visible', 'head_covering', 'hands_in_prayer',
  'blessing_gesture', 'modern_clothing', 'period_clothing',
  'other',
]);
export type VisualFeature = z.infer<typeof VisualFeature>;

export const GENERAL_VISUAL_FEATURES: readonly VisualFeature[] = [
  'robe', 'beard', 'hood', 'throne', 'book', 'staff', 'crown', 'body_of_light', 'flowers',
  'hair_color', 'eye_color', 'skin_tone', 'face_not_visible', 'head_covering', 'hands_in_prayer',
  'blessing_gesture', 'modern_clothing', 'period_clothing',
];

export const Color = z.enum([
  'white', 'black_or_dark', 'gold', 'silver', 'blue', 'red', 'purple', 'brown', 'grey', 'green', 'pale', 'tan_or_olive', 'blond', 'other',
]);

/** One per feature per encounter ("other" excepted); every place it is mentioned goes in evidence. Expressions
 *  ("smiling") belong to disposition; beings around a figure are encounters of their own. */
export const VisualDetail = obj({
  feature: VisualFeature,
  /** How it was perceived; features felt or heard in the dark count too. */
  senses: z.array(z.enum(['seen', 'felt', 'heard'])).min(1),
  words: CopiedText,
  colors: z.array(Color), // only when stated, in the order described (eyes grey, then green); none: empty
  flowerKind: z.enum(['rose', 'lily', 'lotus', 'other', 'not_stated']).nullable(),
  evidence: z.array(Evidence).min(1),
}).refine((d) => (d.feature === 'flowers') === (d.flowerKind !== null), {
  message: 'flowerKind is given exactly for flowers',
});
export type VisualDetail = z.infer<typeof VisualDetail>;

export const EncounterAction = obj({
  action: z.enum([
    'welcomes', 'comforts', 'guides_or_escorts', 'blocks_the_way', 'sends_back', 'conveys_purpose',
    'reviews_or_judges_life', 'forgives', 'teaches', 'reveals_knowledge', 'answers_questions', 'heals',
    'warns', 'gives_instructions_or_requests', 'attacks_or_torments', 'rescues_or_protects',
    'shows_knowledge_of_earthly_events_since_death', 'other',
  ]),
  /** For sends_back (which includes discussing returning): every reason given; none given: ['none_given']. */
  sendBackReasons: z.array(z.enum([
    'not_your_time', 'unfinished_purpose', 'others_need_you', 'mistake', 'offered_a_choice', 'none_given',
  ])),
  /** For reveals_knowledge. */
  revelationKind: z.enum(['theological', 'cosmic', 'future']).nullable(),
  /** For gives_instructions_or_requests: what the being asked, one or more, from any being. */
  instructionKinds: z.array(z.enum([
    'pray', 'specific_devotion', 'join_return_to_or_leave_religion', 'how_to_live', 'pass_on_message',
    'care_for_person',
    'practical_action', // what to do now to survive or get to safety ("breathe", "go left")
    'other',
  ])),
  instructionWords: CopiedText.nullable(),
  evidence: z.array(Evidence).min(1),
})
  .refine((a) => (a.action === 'sends_back') === (a.sendBackReasons.length > 0), {
    message: 'sendBackReasons are given exactly for sends_back',
  })
  .refine((a) => !a.sendBackReasons.includes('none_given') || a.sendBackReasons.length === 1, {
    message: "'none_given' can't be combined with a reason",
  })
  .refine((a) => (a.action === 'gives_instructions_or_requests') === (a.instructionKinds.length > 0), {
    message: 'instructionKinds are given exactly for gives_instructions_or_requests',
  })
  .refine((a) => a.action === 'gives_instructions_or_requests' || a.instructionWords === null, {
    message: 'instructionWords are for gives_instructions_or_requests only',
  })
  .refine((a) => (a.action === 'reveals_knowledge') === (a.revelationKind !== null), {
    message: 'revelationKind is given exactly for reveals_knowledge',
  });
export type EncounterAction = z.infer<typeof EncounterAction>;

export const AnimalDetails = obj({
  roles: z.array(z.enum([
    'own_pet', 'others_pet', 'working_or_farm', 'scenery', 'animal_form_guide',
    'companion', // stays with or comforts the experiencer, not a pet or guide
    'hostile_beast',
  ])).min(1),
  species: z.enum(['dog', 'cat', 'horse', 'bird', 'small_pet', 'reptile_or_amphibian', 'other']),
  words: CopiedText,
  petName: CopiedText.nullable(),
  evidence: z.array(Evidence).min(1),
});
export type AnimalDetails = z.infer<typeof AnimalDetails>;

/** Only for a hostile encounter. A Jesus invocation also goes in jesusMentions. */
export const Invocation = obj({
  invoked: z.enum(['yes', 'no', 'not_stated']), // a name invoked, or a prayer
  names: z.array(obj({ words: CopiedText, referent: z.enum(['jesus', 'god', 'mary', 'other']) })),
  effect: z.enum(['dispelled', 'no_effect', 'not_stated']),
  evidence: z.array(Evidence),
}).refine((i) => i.invoked === 'yes' || (i.names.length === 0 && i.effect === 'not_stated'), {
  message: 'names and an effect need invoked: yes',
});

/** One being, or a group, met in one episode. Holds only what is described in the narrative or
 *  an answer's comment: a box ticked with nothing described creates no encounter. */
export const Encounter = obj({
  encounterId: z.string(), // `${episodeId}/e1`
  episodeId: z.string(),
  /** An encounter in another episode that the text says is the same being. */
  sameBeingAs: z.string().nullable(),
  /** 'credited_only': credited with something in the experience but never perceived. */
  perceivedBy: z.array(z.enum(['seen', 'heard', 'sensed_presence', 'touched', 'mind_to_mind', 'credited_only'])).min(1),
  /** Whether a person was really there (usually seen from out of the body) or met within the experience. */
  presence: z.enum(['physically_present', 'part_of_experience', 'unclear']),
  /** An individual given an identity or description of its own, or a group. */
  count: obj({
    kind: z.enum(['individual', 'exact', 'several', 'many', 'unspecified', 'one_or_more']), // one_or_more: "he/they"
    n: z.number().int().min(2).nullable(),
  }).refine((c) => (c.kind === 'exact') === (c.n !== null), { message: 'n is given exactly for an exact count' }),
  /** At least one. A being with no claim outside UNIDENTIFIED_CATEGORIES was never identified. */
  identity: z.array(IdentityClaim).min(1),
  /** Only from the text, never from the person's background; about ordinary life. Meeting the
   *  being in an earlier experience is sameBeingAs, linking an encounter in that episode. */
  familiarity: obj({
    value: z.enum(['knew_personally', 'knew_of', 'claims_no_prior_knowledge', 'not_stated']),
    words: CopiedText.nullable(),
    evidence: z.array(Evidence),
  }),
  vital: Vital.nullable(),
  /** A living person met as part of the experience: how the experiencer explains it. */
  livingPersonExplanation: obj({
    kind: z.enum(['higher_self', 'bilocation', 'dream_element', 'also_near_death_or_ill', 'other', 'none_offered']),
    words: CopiedText.nullable(),
    evidence: z.array(Evidence),
  }).nullable(),
  /** From the description or pronouns; never from a name or the pronouns conventionally used for God. */
  apparentSex: z.enum(['female', 'male', 'neither_or_both', 'not_stated']),
  /** Described as motherly, or addressing the experiencer as her child ("my son"); tenderness
   *  alone doesn't count. */
  maternalLanguage: obj({ words: CopiedText, evidence: z.array(Evidence).min(1) }).nullable(),
  /** The most specific that applies. A bearded figure in a robe is a generic figure.
   *  personal_likeness: looks like a particular person or animal, the experiencer included. */
  representation: z.enum(['not_described', 'light_or_formless', 'generic_figure', 'personal_likeness', 'iconographic']),
  visualDetails: z.array(VisualDetail),
  /** work: the named work, or null for a general comparison. */
  imageComparisons: z.array(obj({
    kind: z.enum(['painting_or_picture', 'statue_or_icon', 'film_or_tv', 'book_or_illustration', 'other']),
    work: CopiedText.nullable(),
    evidence: z.array(Evidence).min(1),
  })),
  places: z.array(z.enum(['earthly', 'transitional', 'otherworldly', 'unclear'])).min(1),
  /** On any encounter where it appears; which items are Catholic-specific is decided at analysis. */
  confessionalContent: z.array(obj({
    kind: z.enum(['rosary', 'scapular', 'purgatory', 'novena', 'intercession', 'apparition_title', 'other_devotion']),
    words: CopiedText,
    evidence: z.array(Evidence).min(1),
  })),
  hostileIconography: z.array(z.enum([
    'folkloric', 'scriptural', 'shadow_being', 'mocking_or_grotesque', 'amorphous_creature', 'unseen_presence',
  ])),
  animal: AnimalDetails.nullable(),
  /** Toward the experiencer. 'not_stated' (alone): none shown or stated (a bystander, a figure
   *  who never notices them). */
  disposition: z.array(z.enum(['loving', 'neutral_or_instructive', 'hostile', 'ambiguous_or_unsettling', 'not_stated'])).min(1),
  actions: z.array(EncounterAction),
  christSpecificContent: z.array(obj({
    kind: z.enum(['wounds_or_cross', 'forgiveness_of_sins', 'worship', 'reference_to_the_father', 'judgment']),
    evidence: z.array(Evidence).min(1),
  })),
  /** A voice placed in the head or mind ("as if inside my head", "in my mind", "telepathic",
   *  "without words") is mind_to_mind, even when the text says "heard"; that's the ordinary
   *  verb. spoken is for a voice with no such marker. Both only when the text gives both modes. */
  communication: z.array(z.enum(['spoken', 'mind_to_mind', 'instant_knowing', 'showing', 'none', 'not_stated'])).min(1),
  response: z.array(z.enum([
    'awe', 'fear', 'awareness_of_sin', 'worship', 'love_or_joy', 'peace', 'arguing_or_resisting',
  ])), // empty: none stated
  invocation: Invocation.nullable(),
  /** The experiencer says it wasn't a being (or wasn't a person), though they describe an
   *  exchange with it ("I met no being, only the Presence"). Kept, not acted on. */
  deniedAsBeing: obj({ words: CopiedText, evidence: z.array(Evidence).min(1) }).nullable(),
  /** Identities denied outright ("Are you God?" "No."), by the being or by the experiencer.
   *  Jesus denials are also negated Jesus mentions. */
  deniedIdentities: z.array(obj({
    category: BeingCategory,
    name: CanonicalName.nullable(), // as for claims: named figures only
    by: z.enum(['being', 'experiencer']),
    words: CopiedText,
    evidence: z.array(Evidence).min(1),
  })),
  evidence: z.array(Evidence).min(1), // where the encounter is reported
}).superRefine((e, ctx) => {
  const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: 'custom', message, path });
  const categories = e.identity.map((c) => c.category);
  const any = (list: readonly BeingCategory[]) => categories.some((c) => list.includes(c));

  if (e.perceivedBy.includes('credited_only') && e.perceivedBy.length > 1) {
    issue("'credited_only' means never perceived, so it stands alone", ['perceivedBy']);
  }
  const keys = e.identity.map((c) => `${c.category}|${c.name ?? ''}|${c.when}`);
  if (new Set(keys).size !== keys.length) issue('one claim per referent per timing', ['identity']);

  if (any(VITAL_CATEGORIES) && e.vital === null) issue('vital status is required for people known in life and animals', ['vital']);
  const livingInExperience = e.vital?.status === 'alive' && e.presence === 'part_of_experience' && !categories.includes('animal');
  if (livingInExperience !== (e.livingPersonExplanation !== null)) {
    issue('livingPersonExplanation is given exactly for a living person met as part of the experience', ['livingPersonExplanation']);
  }

  // Representation is a visual judgment: only seen details bear on it.
  const seen = e.visualDetails.filter((d) => d.senses.includes('seen'));
  if (e.representation === 'not_described' && seen.length > 0) {
    issue("'not_described' can't have seen details", ['visualDetails']);
  }
  if (e.representation === 'iconographic' && !seen.some((d) => !GENERAL_VISUAL_FEATURES.includes(d.feature))) {
    issue("'iconographic' needs a seen feature outside the general group (or 'other')", ['representation']);
  }
  const features = e.visualDetails.map((d) => d.feature).filter((f) => f !== 'other');
  if (new Set(features).size !== features.length) issue('one visual detail per feature, except other', ['visualDetails']);
  if (e.places.includes('unclear') && e.places.length > 1) issue("'unclear' stands alone", ['places']);

  if (e.hostileIconography.length > 0 && !categories.includes('hostile_being')) {
    issue('hostile iconography is for hostile beings', ['hostileIconography']);
  }
  if (categories.includes('animal') !== (e.animal !== null)) issue('animal details are given exactly for animals', ['animal']);
  const invocable = e.disposition.includes('hostile') && e.presence !== 'physically_present';
  if (invocable !== (e.invocation !== null)) {
    issue('invocation is recorded exactly for hostile encounters not physically present', ['invocation']);
  }
  if (e.disposition.includes('not_stated') && e.disposition.length > 1) issue("'not_stated' stands alone", ['disposition']);

  e.deniedIdentities.forEach((d, i) => {
    if (has(PRIVATE_PERSON_CATEGORIES, d.category) && d.name !== null) issue(`${d.category} never gets a canonical name`, ['deniedIdentities', i]);
    if ((d.category === 'named_figure' || d.category === 'living_religious_leader') && d.name === null) {
      issue(`a denied ${d.category} needs a canonical name`, ['deniedIdentities', i]);
    }
  });

  const c = e.communication;
  if ((c.includes('none') || c.includes('not_stated')) && c.length > 1) issue("'none' and 'not_stated' stand alone", ['communication']);
  if (c.includes('spoken') && !e.perceivedBy.includes('heard')) issue("'spoken' needs 'heard' among the ways perceived", ['communication']);
  if (c.includes('mind_to_mind') && !e.perceivedBy.includes('mind_to_mind')) {
    issue("'mind_to_mind' needs 'mind_to_mind' among the ways perceived", ['communication']);
  }
  if (e.perceivedBy.includes('credited_only') && !(c.includes('none') || c.includes('not_stated'))) {
    issue('a being credited only, never perceived, has no communication', ['communication']);
  }
});
export type Encounter = z.infer<typeof Encounter>;

// ─── Area 3: doctrinal statements ───────────────────────────────────────────────────────

/** Starter list; grows during trial coding and is frozen before the holdout. */
export const Doctrine = z.enum([
  'life_after_death', // stated as a claim, never inferred from the experience itself
  'virgin_birth', 'resurrection_of_jesus', 'general_resurrection', 'exclusivism', 'religious_pluralism',
  'religion_human_made_or_unnecessary', 'reincarnation', 'preexistence_of_souls', 'universal_salvation',
  'trinity', // the Godhead itself; "Jesus was only a teacher" is divinity_of_jesus
  'divinity_of_jesus', 'atonement',
  'self_as_divine', 'departed_aware_of_earthly_events', 'departed_intercede', 'judgment_after_death',
  'final_judgment', 'hell_exists', 'purgatory',
  /** Only for claims about God, salvation, or the afterlife the list misses. Moral and
   *  practical teachings stay in the encounter's actions, with their content uncoded. */
  'other',
]);
export type Doctrine = z.infer<typeof Doctrine>;

/** A stated proposition, not a description: describing a hellish place is not a doctrinal
 *  statement; interpreting it ("it was hell") is. The same proposition can appear twice: conveyed
 *  by a being during the experience, and as the experiencer's own view in a later answer. */
export const DoctrinalStatement = obj({
  doctrineId: z.string(), // `${accountId}/d1`
  doctrine: Doctrine,
  words: CopiedText,
  /** 'reinterprets': neither a clean yes nor a clean no ("the resurrection is spiritual"). */
  stance: z.enum(['affirms', 'denies', 'reinterprets']),
  /** As for identity claims, without "resemblance": "I think", "or something like it". */
  certainty: Certainty.exclude(['resemblance']),
  /** "During" follows the strict rule for identity timing; a questionnaire item's framing
   *  ("During your experience, did you gain information…") doesn't decide it. */
  source: z.enum(['conveyed_by_being', 'shown', 'understood', 'experiencer_view_before', 'experiencer_view_after', 'not_stated']),
  episodeId: z.string().nullable(), // the experience it was conveyed, shown, or understood in
  encounterId: z.string().nullable(), // the being that conveyed it
  /** For hell_exists, as many as are stated. */
  hellQualities: z.array(z.enum([
    'eternal', 'temporary_or_remedial', 'ends_in_annihilation', 'self_chosen', 'imposed_or_sentenced',
    'torment', 'separation_or_absence', 'state_of_mind',
  ])),
  evidence: z.array(Evidence).min(1),
}).superRefine((d, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if ((d.source === 'conveyed_by_being') !== (d.encounterId !== null)) issue('encounterId is given exactly when conveyed by a being');
  if (['conveyed_by_being', 'shown', 'understood'].includes(d.source) && d.episodeId === null) {
    issue('a statement conveyed, shown, or understood during an experience needs its episodeId');
  }
  if (d.hellQualities.length > 0 && d.doctrine !== 'hell_exists') issue('hellQualities are for hell_exists only');
});
export type DoctrinalStatement = z.infer<typeof DoctrinalStatement>;

// ─── Area 3: every mention of Jesus ─────────────────────────────────────────────────────

// ─── Area 3: provenance (how the memory came to be told) ───────────────────────────────

const EpisodeIds = z.array(z.string()).min(1);
const Trigger = z.enum(['media', 'therapy_or_hypnosis', 'other_people', 'spontaneous', 'not_stated']);

export const Exposure = obj({
  episodeIds: EpisodeIds,
  medium: z.enum(['book', 'film_or_tv', 'article', 'talk_or_conference', 'another_persons_account', 'online', 'other']),
  title: CopiedText.nullable(), // if named: area 4's direct measure
  /** An author, speaker, or presenter, if named. Public figures only; never a private person
   *  (a friend who told their own experience stays null). */
  person: CopiedText.nullable(),
  when: z.enum(['before_experience', 'between_experience_and_telling', 'not_stated']),
  /** The person says it changed how they understood or remembered the experience. */
  changedUnderstanding: z.boolean(),
  evidence: z.array(Evidence).min(1),
});
export type Exposure = z.infer<typeof Exposure>;

/** Devotion to a specific figure before the experience (a statuette of a saint addressed
 *  daily), so prior devotion can be tested as a predictor of meeting that figure. */
export const PriorDevotion = obj({
  episodeIds: EpisodeIds,
  category: BeingCategory,
  name: CanonicalName.nullable(),
  words: CopiedText,
  evidence: z.array(Evidence).min(1),
}).refine((d) => d.category !== 'named_figure' || d.name !== null, { message: 'a named figure needs a canonical name' });

/** More than one can apply; nothing stated means no entries. */
export const MemoryEvent = obj({
  episodeIds: EpisodeIds,
  kind: z.enum(['remembered_all_along', 'recovered_later', 'recognized_as_nde_later']),
  trigger: Trigger.nullable(),
  evidence: z.array(Evidence).min(1),
}).refine((m) => (m.kind === 'remembered_all_along') === (m.trigger === null), {
  message: 'a trigger is given exactly for recovered_later and recognized_as_nde_later',
});

export const PriorTelling = obj({
  episodeIds: EpisodeIds,
  kind: z.enum(['public', 'private_only', 'first_telling']),
  venues: z.array(z.enum(['talks', 'podcasts', 'books', 'support_groups', 'media', 'other'])),
  words: CopiedText.nullable(),
  evidence: z.array(Evidence).min(1),
}).refine((t) => (t.kind === 'public') === (t.venues.length > 0), { message: 'venues are given exactly for public tellings' });

export const Reaction = obj({
  episodeIds: EpisodeIds,
  reaction: z.enum(['dismissed', 'ridiculed', 'believed_or_supported', 'kept_quiet_for_fear', 'shock_or_disbelief', 'other']),
  dismissedAs: z.enum(['hallucination', 'dream', 'imagination', 'drugs_or_medication', 'demonic', 'other']).nullable(),
  /** The listener's words or explanation as reported; required when either value is "other". */
  words: CopiedText.nullable(),
  who: z.enum(['clinician', 'family', 'friend', 'clergy', 'other', 'not_stated']),
  evidence: z.array(Evidence).min(1),
}).refine((r) => (r.reaction === 'dismissed') === (r.dismissedAs !== null), { message: 'dismissedAs is given exactly for dismissed' })
  .refine((r) => (r.reaction !== 'other' && r.dismissedAs !== 'other') || r.words !== null, { message: 'words are required for other' });

const ExplanationStance = z.enum(['considers', 'endorses', 'rejects']);
export const NaturalExplanation = obj({
  episodeIds: EpisodeIds,
  words: CopiedText,
  /** Now, or as of the telling. */
  stance: ExplanationStance,
  /** An earlier stance, when the text says it changed ("for years I took it for a hallucination"). */
  earlierStance: ExplanationStance.nullable(),
  evidence: z.array(Evidence).min(1),
}).refine((n) => n.earlierStance !== n.stance, { message: 'an earlier stance differs from the current one' });

/** Explicit only. Lifelong experiences aren't episodes, so they're recorded here. */
export const Predisposition = obj({
  episodeIds: EpisodeIds,
  kind: z.enum(['meditation_or_contemplative_practice', 'lifelong_visionary_or_psychic_experiences', 'other']),
  when: z.enum(['before', 'after', 'before_and_after', 'not_stated']), // relative to the episodes
  words: CopiedText,
  evidence: z.array(Evidence).min(1),
});

/** The person's own view of whether prior knowledge (reading, teaching, media) shaped the
 *  experience: "I'd read about NDEs, but it had no influence." */
export const InfluenceStatement = obj({
  episodeIds: EpisodeIds,
  stance: z.enum(['denies_influence', 'grants_influence', 'unsure']),
  words: CopiedText,
  evidence: z.array(Evidence).min(1),
});

/** Sensitive, explicit only, never inferred; published like the other sensitive flags. */
export const LongingToReturn = obj({
  episodeIds: EpisodeIds,
  kind: z.enum(['longing_to_return', 'suicidal_thoughts_tied_to_returning', 'denies_suicidal_thoughts']),
  words: CopiedText,
  evidence: z.array(Evidence).min(1),
});

export const Provenance = obj({
  exposures: z.array(Exposure),
  priorDevotion: z.array(PriorDevotion),
  memory: z.array(MemoryEvent),
  priorTellings: z.array(PriorTelling),
  /** The person says their telling varies or their memory is uncertain. */
  tellingVaries: z.array(obj({ episodeIds: EpisodeIds, evidence: z.array(Evidence).min(1) })),
  reactions: z.array(Reaction),
  disclaimers: z.array(obj({ words: CopiedText, evidence: z.array(Evidence).min(1) })), // "I know how this sounds"
  naturalExplanations: z.array(NaturalExplanation),
  predispositions: z.array(Predisposition),
  influenceStatements: z.array(InfluenceStatement),
});
export type Provenance = z.infer<typeof Provenance>;

/** The narrative of a part, or one questionnaire item: the "place" of a Jesus mention. */
/** For Jesus mentions: the narrative, or the questionnaire as a whole (not item by item). */
export const placeOf = (s: SourceRef) =>
  s.kind === 'narrative' ? `narrative:${s.part}` : s.kind === 'qa' ? `questionnaire:${s.part}` : `${s.kind}:${JSON.stringify(s)}`;

/** Jesus, Christ, Isa, Yeshua, the Son (of God), the Lamb, and a capitalized "Savior" refer to
 *  Jesus unless the text indicates otherwise. "Lord" and "Messiah" alone, and a lowercase
 *  "savior," are ambiguous unless the text ties them to Jesus, or to someone else: "the Lord"
 *  tied to a named non-Christian figure ("Lord Krishna") or an impersonal Absolute ("Supreme
 *  Consciousness") is not_jesus; tied only to "God" it stays ambiguous. New Age terms built on
 *  Christ ("Christ consciousness") are kind other, ambiguous. Derived words (Christian) don't
 *  count. Only the experiencer's text, never question wording or the person's background. One
 *  entry per kind, time, and place (the narrative, or the questionnaire), with every passage
 *  there as evidence.
 *
 *  Context, not the word, decides. Jesús and Salvador are common given names, Isa is a common
 *  Muslim given name (and short for Isabel), Christ and "de Jesús" are surnames, and El Salvador
 *  is a country. Used for a person or a place, the word is recorded as name_of_person_or_place,
 *  refersTo 'not_jesus' (excluded from every rung of the ladder, like idioms and church names,
 *  but countable against the keyword hits), and the person is coded as who they are: an uncle
 *  named Jesús is family. Yet "Jesús" in untranslated Spanish, or "Isa" in a Muslim's account,
 *  can mean Jesus himself. When context can't tell: 'ambiguous'. */
export const JesusMention = obj({
  words: CopiedText,
  refersTo: z.enum(['jesus', 'ambiguous', 'not_jesus']), // not_jesus: name_of_person_or_place only
  kind: z.enum([
    'encounter', 'talk_with_another_being', 'prayer_or_invocation', 'own_faith_or_belief',
    'doctrinal_statement', 'someone_elses', 'idiom_or_exclamation', 'church_name', 'name_of_person_or_place', 'other',
  ]),
  encounterId: z.string().nullable(), // for 'encounter' and 'talk_with_another_being'
  doctrineId: z.string().nullable(), // for 'doctrinal_statement'
  /** The experience a mention made during it belongs to (required for 'during'). A linked
   *  encounter or doctrinal statement must be in the same episode. */
  episodeId: z.string().nullable(),
  when: z.enum(['before', 'during', 'after', 'not_stated']),
  polarity: z.enum(['affirmative', 'negated', 'question']),
  evidence: z.array(Evidence).min(1),
}).superRefine((m, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const linksEncounter = m.kind === 'encounter' || m.kind === 'talk_with_another_being';
  if (linksEncounter !== (m.encounterId !== null)) issue('encounterId is given exactly for encounter and talk_with_another_being');
  if ((m.kind === 'doctrinal_statement') !== (m.doctrineId !== null)) issue('doctrineId is given exactly for doctrinal_statement');
  if ((m.kind === 'name_of_person_or_place') !== (m.refersTo === 'not_jesus')) {
    issue("refersTo 'not_jesus' is exactly for name_of_person_or_place");
  }
  if (m.when === 'during' && m.episodeId === null) issue('a mention made during an experience needs its episodeId');
  const places = new Set(m.evidence.map((ev) => placeOf(ev.source)));
  if (places.size > 1) issue('one entry per place: all its evidence is in the narrative, or all in the questionnaire');
});
export type JesusMention = z.infer<typeof JesusMention>;


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
  /** Area 1: stated conditions (flag resolved per episode at analysis time). */
  conditions: z.array(ConditionStatement),
  // Area 3
  encounters: z.array(Encounter),
  doctrinalStatements: z.array(DoctrinalStatement),
  jesusMentions: z.array(JesusMention),
  provenance: Provenance,
  /** After the experience (sensitive). */
  longingToReturn: z.array(LongingToReturn),
}).superRefine((r, ctx) => {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  const ids = r.episodes.map((e) => e.episodeId);
  if (new Set(ids).size !== ids.length) issue('episodeIds must be unique', ['episodes']);
  r.episodes.forEach((e, i) => {
    if (!e.episodeId.startsWith(`${r.accountId}#`)) issue('episodeId must start with `${accountId}#`', ['episodes', i, 'episodeId']);
  });
  r.parts.forEach((p, i) =>
    p.episodeIds.forEach((id, j) => {
      if (!ids.includes(id)) issue(`part refers to unknown episode ${id}`, ['parts', i, 'episodeIds', j]);
    }),
  );
  r.conditions.forEach((c, i) =>
    c.episodeIds.forEach((id, j) => {
      if (!ids.includes(id)) issue(`condition refers to unknown episode ${id}`, ['conditions', i, 'episodeIds', j]);
    }),
  );
  r.longingToReturn.forEach((l, i) =>
    l.episodeIds.forEach((id, j) => {
      if (!ids.includes(id)) issue(`longingToReturn refers to unknown episode ${id}`, ['longingToReturn', i, 'episodeIds', j]);
    }),
  );
  for (const list of [
    'exposures', 'priorDevotion', 'memory', 'priorTellings', 'tellingVaries', 'reactions', 'naturalExplanations',
    'predispositions', 'influenceStatements',
  ] as const) {
    r.provenance[list].forEach((entry, i) =>
      entry.episodeIds.forEach((id, j) => {
        if (!ids.includes(id)) issue(`provenance refers to unknown episode ${id}`, ['provenance', list, i, 'episodeIds', j]);
      }),
    );
  }

  // Encounters belong to an episode; their ids carry it.
  const encounterEpisode = new Map(r.encounters.map((e) => [e.encounterId, e.episodeId]));
  if (encounterEpisode.size !== r.encounters.length) issue('encounterIds must be unique', ['encounters']);
  r.encounters.forEach((e, i) => {
    if (!ids.includes(e.episodeId)) issue(`encounter refers to unknown episode ${e.episodeId}`, ['encounters', i, 'episodeId']);
    if (!e.encounterId.startsWith(`${e.episodeId}/`)) issue('encounterId must start with `${episodeId}/`', ['encounters', i, 'encounterId']);
    if (e.sameBeingAs !== null) {
      const other = encounterEpisode.get(e.sameBeingAs);
      if (other === undefined) issue(`sameBeingAs refers to unknown encounter ${e.sameBeingAs}`, ['encounters', i, 'sameBeingAs']);
      else if (other === e.episodeId) issue('sameBeingAs links encounters in different episodes', ['encounters', i, 'sameBeingAs']);
    }
  });

  const doctrineIds = r.doctrinalStatements.map((d) => d.doctrineId);
  if (new Set(doctrineIds).size !== doctrineIds.length) issue('doctrineIds must be unique', ['doctrinalStatements']);
  r.doctrinalStatements.forEach((d, i) => {
    if (!d.doctrineId.startsWith(`${r.accountId}/d`)) issue('doctrineId must start with `${accountId}/d`', ['doctrinalStatements', i, 'doctrineId']);
    if (d.episodeId !== null && !ids.includes(d.episodeId)) {
      issue(`doctrinal statement refers to unknown episode ${d.episodeId}`, ['doctrinalStatements', i, 'episodeId']);
    }
    if (d.encounterId !== null) {
      const episode = encounterEpisode.get(d.encounterId);
      if (episode === undefined) issue(`doctrinal statement refers to unknown encounter ${d.encounterId}`, ['doctrinalStatements', i, 'encounterId']);
      else if (episode !== d.episodeId) issue("the encounter must be in the statement's episode", ['doctrinalStatements', i, 'encounterId']);
    }
  });

  const mentionKeys = new Set<string>();
  const doctrineEpisode = new Map(r.doctrinalStatements.map((d) => [d.doctrineId, d.episodeId]));
  r.jesusMentions.forEach((m, i) => {
    if (m.encounterId !== null && !encounterEpisode.has(m.encounterId)) {
      issue(`mention refers to unknown encounter ${m.encounterId}`, ['jesusMentions', i, 'encounterId']);
    }
    if (m.doctrineId !== null && !doctrineIds.includes(m.doctrineId)) {
      issue(`mention refers to unknown doctrinal statement ${m.doctrineId}`, ['jesusMentions', i, 'doctrineId']);
    }
    if (m.episodeId !== null && !ids.includes(m.episodeId)) {
      issue(`mention refers to unknown episode ${m.episodeId}`, ['jesusMentions', i, 'episodeId']);
    }
    const linkedEpisode = m.encounterId !== null ? encounterEpisode.get(m.encounterId) : m.doctrineId !== null ? doctrineEpisode.get(m.doctrineId) : undefined;
    if (m.episodeId !== null && linkedEpisode !== undefined && linkedEpisode !== null && linkedEpisode !== m.episodeId) {
      issue("a mention's episode must match its linked encounter or doctrinal statement", ['jesusMentions', i, 'episodeId']);
    }
    const key = [m.kind, m.when, m.refersTo, m.polarity, m.encounterId, m.doctrineId, placeOf(m.evidence[0].source)].join('|');
    if (mentionKeys.has(key)) issue('one entry per kind, time, and place: merge the evidence', ['jesusMentions', i]);
    mentionKeys.add(key);
  });
  // Every encounter with a Jesus claim has an affirmative mention linked to it, so the nested
  // definitions stay nested.
  r.encounters.forEach((e, i) => {
    if (!e.identity.some((c) => c.category === 'jesus')) return;
    const linked = r.jesusMentions.some(
      (m) => m.kind === 'encounter' && m.encounterId === e.encounterId && m.refersTo === 'jesus' && m.polarity === 'affirmative',
    );
    if (!linked) issue('an encounter with a Jesus claim needs an affirmative mention of kind encounter linked to it', ['encounters', i]);
  });
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
  flags: z.array(z.enum([
    'overdose', 'suicide_attempt', 'psychoactive_medication_at_onset', 'recurrent', 'translated',
    /** A condition in HALLUCINATION_FLAG_CONDITIONS present before or at the experience. */
    'hallucination_linked_condition',
  ])),
}).refine((e) => (e.analysisSet === 'excluded') === (e.exclusionReasons.length > 0), {
  message: 'exclusionReasons are given exactly when the episode is excluded',
});
export type ResolvedEpisode = z.infer<typeof ResolvedEpisode>;

// ─── Area 3 analysis-time views (computed in resolve-area3.ts; never coded) ─────────────

/** One per encounter. */
export const ResolvedEncounter = obj({
  encounterId: z.string(),
  ruleVersion: z.string(),
  /** No claim outside UNIDENTIFIED_CATEGORIES. */
  neverIdentified: z.boolean(),
  /** From the encounter's evidence and its claims' evidence. */
  reportedIn: z.enum(['narrative_only', 'questionnaire_only', 'both']),
  questionnaireItems: z.array(obj({ part: Index, qaIndex: Index })),
  /** Mary's level. One (broad): an unidentified female being, part of the experience, who
   *  interacts with the experiencer (an action, or some communication). Two: a Mary claim. Three: a Mary
   *  claim with confessional content (the list, or a rosary or scapular among the visual
   *  details). Which content is Catholic-specific is a further, table-based step. */
  marianLevel: z.enum(['none', 'one', 'two', 'three']),
  /** Level one, narrow: also with maternal language. */
  marianLevelOneNarrow: z.boolean(),
  /** The strongest certainty among Mary claims (null with none), so resemblance-only can be dropped. */
  maryClaimCertainty: Certainty.nullable(),
})
  .refine((r) => !r.marianLevelOneNarrow || r.marianLevel === 'one', { message: 'the narrow level one needs level one' })
  .refine((r) => (r.marianLevel === 'two' || r.marianLevel === 'three') === (r.maryClaimCertainty !== null), {
    message: 'maryClaimCertainty is given exactly for levels two and three',
  })
  .refine((r) => (r.reportedIn === 'narrative_only') === (r.questionnaireItems.length === 0), {
    message: 'questionnaireItems are listed exactly when the questionnaire reports the encounter',
  });
export type ResolvedEncounter = z.infer<typeof ResolvedEncounter>;

const KeywordRung = obj({ narrow: z.boolean(), broad: z.boolean() })
  .refine((k) => !k.narrow || k.broad, { message: 'the broad list contains the narrow one' });
const MentionRung = obj({ jesusOnly: z.boolean(), withAmbiguous: z.boolean() })
  .refine((m) => !m.jesusOnly || m.withAmbiguous, { message: 'counting ambiguous titles can only add' });

/** One per account: which rungs of the Jesus ladder it reaches, loosest first. Each rung
 *  implies every looser one in its group; the keyword rungs are mechanical and can disagree with
 *  the coded ones either way (a keyword name; "the Lamb," which no keyword matches). */
export const ResolvedJesus = obj({
  accountId: z.string().min(1),
  ruleVersion: z.string(),
  /** Whole-word keyword hits anywhere on the page, NDERF's question wording included. */
  keywordWebsite: KeywordRung,
  /** Keyword hits in the experiencer's own words: narrative and answers. */
  keywordOwnWords: KeywordRung,
  /** Any coded entry, names, idioms, and church names included. */
  anyCodedEntry: z.boolean(),
  /** An affirmative mention of Jesus himself (not an idiom, church name, or person's name). */
  affirmativeMention: MentionRung,
  /** …about the experience itself, in a qualifying episode: an encounter or talk with a being,
   *  a doctrinal statement from the experience, or a mention made during it. */
  mentionAboutExperience: MentionRung,
  /** An encounter in a qualifying episode with a Jesus claim; each later rung narrows the same claim. */
  encounterClaim: z.boolean(),
  excludingResemblance: z.boolean(),
  claimInNarrative: z.boolean(),
  identifiedDuring: z.boolean(),
  announcedOrRecognizedDuringAsserted: z.boolean(),
  /** The strictest rung, with no passage hedging the claim anywhere. */
  announcedOrRecognizedDuringAssertedThroughout: z.boolean(),
}).superRefine((j, ctx) => {
  const implies = (a: boolean, b: boolean, message: string) => {
    if (a && !b) ctx.addIssue({ code: 'custom', message });
  };
  implies(j.keywordOwnWords.narrow, j.keywordWebsite.narrow, 'own words are part of the page (narrow)');
  implies(j.keywordOwnWords.broad, j.keywordWebsite.broad, 'own words are part of the page (broad)');
  implies(j.affirmativeMention.withAmbiguous, j.anyCodedEntry, 'a mention is a coded entry');
  implies(j.mentionAboutExperience.jesusOnly, j.affirmativeMention.jesusOnly, 'nested: about the experience');
  implies(j.mentionAboutExperience.withAmbiguous, j.affirmativeMention.withAmbiguous, 'nested: about the experience');
  implies(j.encounterClaim, j.mentionAboutExperience.jesusOnly, 'every Jesus claim has a linked mention');
  implies(j.excludingResemblance, j.encounterClaim, 'nested: excluding resemblance');
  implies(j.claimInNarrative, j.excludingResemblance, 'nested: in the narrative');
  implies(j.identifiedDuring, j.claimInNarrative, 'nested: identified during');
  implies(j.announcedOrRecognizedDuringAsserted, j.identifiedDuring, 'nested: announced or recognized');
  implies(j.announcedOrRecognizedDuringAssertedThroughout, j.announcedOrRecognizedDuringAsserted, 'nested: asserted throughout');
});
export type ResolvedJesus = z.infer<typeof ResolvedJesus>;
