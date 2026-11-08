// Output schema for coding NDERF accounts. v2 DRAFT: areas 1 (eligibility and provenance) and
// 2 (religious background) are designed, and area 1 was revised after trial-coding the first
// fifty practice accounts; area 3 (encounters) is not started.
// Written before any account text was read. Decisions and open questions: DECISIONS.md.
// "PROVISIONAL" marks a choice not yet made; those are listed under "Open" in DECISIONS.md.
//
// Files, joined on accountId:
//   derived/accounts.jsonl                  rules only; regenerated whenever the parser changes
//   coded/<codebookVersion>/<runId>.jsonl   LLM output, quotes stripped; one folder per codebook version
//   (private) nderf-raw-data/llm-raw/<runId>/   raw LLM responses, which contain quotes
// The Resolved* views at the bottom are computed from both by pre-registered rules, not stored.
//
// No account text in this repository. Strings copied from accounts are capped at
// MAX_COPIED_WORDS, and a check before each commit confirms that no five-word sequence from any
// narrative or free-text answer appears in committed files. (NDERF's question wording and menu
// labels are form text, not account text.)

export const SCHEMA_VERSION = 'v2-draft';
export const MAX_COPIED_WORDS = 4;

// ─── Shared building blocks ─────────────────────────────────────────────────────────────

export type IsoDate = string; // 'YYYY-MM-DD'
export type CountryCode = string; // ISO 3166-1 alpha-2: 'US', 'MX', 'GB'
export type LanguageCode = string; // ISO 639-1: 'en', 'es', 'fa'

/** Where a value came from, pointing into nderf-raw-data's accounts/*.jsonl and search listing. */
export type SourceRef =
  | { kind: 'narrative'; part: number }
  | { kind: 'qa'; part: number; qaIndex: number }
  | { kind: 'background'; part: number; field: string }
  | { kind: 'tag'; listingIndex: number }
  | { kind: 'search_listing'; field: 'AGE' | 'COUNTRY_AI' | 'EXPDATE' | 'metadata.greyson' | 'form_version' }
  | { kind: 'quick_facts'; field: string };

export interface Evidence {
  source: SourceRef;
  /** [start, end) character offsets into the narrative, or into the qa item's `response`.
   *  The LLM returns a short quote; the pipeline locates it, stores the offsets, and drops the
   *  quote. A quote that can't be found fails validation, which catches invented evidence. */
  span?: [number, number];
  basis: 'explicit' | 'inferred';
}

/** Keeps "not asked" apart from "not stated" and "said none". */
export type Finding<T> =
  | { status: 'present'; value: T; evidence: Evidence[] }
  | { status: 'stated_none'; evidence: Evidence[] }
  | { status: 'not_stated' }
  | { status: 'not_asked' }; // the item wasn't on this part's questionnaire form

export interface ParsedDate {
  raw: string | null; // as written; null with 'raw_omitted' when longer than MAX_COPIED_WORDS
  year: number | null;
  month: number | null;
  day: number | null;
  precision: 'day' | 'month' | 'season' | 'year' | 'approximate' | 'none';
  /** 'multiple_dates' usually means several episodes on one page. */
  flags: Array<
    | 'two_digit_year' | 'day_month_ambiguous' | 'after_posting' | 'unparsed' | 'raw_omitted'
    | 'range' | 'multiple_dates' | 'no_year' | 'conflicts_with_text'
  >;
}

export interface Lengths {
  narrativeWords: number;
  questionnaireFreeTextWords: number; // response text after the leading menu answer
  totalWords: number;
}

/** Plain "From X" tags are 'unspecified'; "Originally from X" is 'origin'. */
export type CountryRole = 'origin' | 'residence' | 'experience_location' | 'unspecified';

export interface CountryClaim {
  country: CountryCode | null; // null when the text can't be mapped
  raw: string; // 'the UK', 'England', 'Persia' (capped at MAX_COPIED_WORDS)
  role: CountryRole;
  source: 'nderf_tag' | 'nderf_country_ai' | 'nderf_quick_facts' | 'self_report';
  evidence: Evidence[];
}

export interface LanguageClaim {
  originalLanguage: LanguageCode | null;
  translated: 'yes' | 'no' | 'unknown';
  translator: string | null; // as NDERF names them
  source: 'nderf_tag' | 'self_report';
  evidence: Evidence[];
}

// ─── File 1: derived/accounts.jsonl (rules only) ────────────────────────────────────────

export interface DerivedRecord {
  accountId: string;
  sourceSha256: string; // of the raw page; a change means offsets may no longer line up
  deriveVersion: string;
  nderf: NderfEditorial;
  posting: Posting;
  parts: DerivedPart[];
  tagClaims: { countries: CountryClaim[]; language: LanguageClaim | null };
  lengths: Lengths; // whole account
}

/** NDERF's editorial layer, kept as inputs. Never a gate for eligibility, never overwritten. */
export interface NderfEditorial {
  classificationRaw: { page: string | null; listings: string[]; searchSite: string[] };
  classificationTokens: NderfClassToken[]; // 'Probable NDE;Drug Experience' -> probable_nde, drug
  classificationHedged: boolean; // 'NDE vs. Dream', 'NDE or FDE'
  exceptional: boolean;
  tagsRaw: string[]; // NDERF's one-line editor tags
  contentWarning: boolean; // tags such as 'Trigger warning…' or 'Reader discretion advised'
  nonWesternLabel: boolean; // NDERF's own label; not our culture variable
  // Search site only (~780 recent accounts matched by number):
  greysonScore: number | null;
  ageBand: NderfAgeBand | null;
  countryAi: string | null;
  experienceDate: IsoDate | null;
  formVersion: '1.0' | '1.1' | null;
}

export type NderfClassToken =
  | 'nde' | 'probable_nde' | 'possible_nde' | 'nde_like' | 'fde' | 'ste' | 'adc' | 'sde'
  | 'shared' | 'secondhand' | 'second_person' | 'obe' | 'sobe' | 'anesthesia' | 'drug'
  | 'dream' | 'icu' | 'prebirth' | 'nele' | 'dbv' | 'smr' | 'prayer' | 'meditation' | 'other';

export type NderfAgeBand =
  | 'Baby' | 'Toddler' | 'Young Child' | 'Older Child' | 'College Age' | 'Adult' | 'Older';

export interface Posting {
  firstPosted: IsoDate | null;
  allPosted: IsoDate[];
  submitted: IsoDate | null; // quick_facts only (eighteen search-app pages)
  flags: Array<'implausible_year'>; // e.g. a listing dated 1009
}

export interface DerivedPart {
  index: number;
  questionnaire: { form: QuestionnaireForm; itemsAsked: ItemsAsked };
  /** The experiencer's own answer, parsed by rule, including the sub-menu of causes and
   *  severity most forms add. Sometimes the only place the cause appears. */
  lifeThreat: Finding<LifeThreatAnswer>;
  backgroundDate: ParsedDate;
  gender: string | null; // Background field as written ('Female', 'Male')
  religionField: DerivedReligionFields;
  lengths: Lengths;
}

export interface LifeThreatAnswer {
  answer: 'yes' | 'no' | 'uncertain' | null;
  causes: string[]; // sub-menu labels as written: 'Accident', 'Drug or medication overdose', …
  severity: 'clinical_death' | 'life_threatening_not_clinical_death' | 'not_life_threatening' | null;
}

/** Assigned from the items present on the page, never from dates: forms overlap in time
 *  because posting lags submission. Definitions in DECISIONS.md. */
export type QuestionnaireForm = 'none' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'irregular';

/** Which prompts were on the form. Whether they were asked, never what was answered. */
export interface ItemsAsked {
  religionField: 'orientation' | 'affiliation_menu' | 'absent';
  namedReligiousFigures: boolean; // "…described by name in religions (for example: Jesus…)"
  deceasedOrReligiousSpirits: boolean;
  deceasedBeings: 'deceased_or_alive' | 'deceased_only' | 'absent';
  mysticalBeing: boolean;
  anyBeings: boolean;
  experienceIncludedChecklist: boolean;
  lifeThreat: boolean;
}

// ─── File 2: coded/<codebookVersion>/<runId>.jsonl (LLM) ────────────────────────────────
// The LLM sees only what the experiencer wrote (narrative and questionnaire), never NDERF's
// classification, tags, or summary, so its coding is independent of NDERF's.

export interface CodedRecord {
  accountId: string;
  sourceSha256: string; // must match the derived record, or the join fails loudly
  run: CodingRun;
  parts: CodedPart[];
  episodes: Episode[];
  /** Text inside a narrative or answer that isn't the experiencer's (an editor's note, a
   *  reader's comment, a transcription credit, a copyright notice or link). Never coded. */
  nonExperiencerText: Array<{
    source: SourceRef;
    span: [number, number];
    kind: 'editor_note' | 'reader_comment' | 'transcription_credit' | 'boilerplate';
  }>;
  textClaims: { countries: CountryClaim[]; language: LanguageClaim | null }; // source: 'self_report'
  background: Background;
  // encounters: Encounter[];        area 3
  // jesusMentions: JesusMention[];  area 3
}

export interface CodingRun {
  codebookVersion: string;
  promptVersion: string;
  model: string;
  runId: string;
  codedAt: string; // ISO timestamp
}

export interface Reporter {
  role: 'experiencer' | 'experiencer_assisted' | 'relative' | 'clinician' | 'other' | 'unknown';
  relationship: string | null; // for relatives; will reuse area 3's kinship vocabulary
  assistance: 'interviewed' | 'transcribed' | 'typed_by_other' | 'other' | null;
  evidence: Evidence[];
}

export interface CodedPart {
  index: number;
  relation: 'sole' | 'first_telling' | 'retelling' | 'follow_up' | 'separate_experience';
  episodeIds: string[];
}

/** Every experience of the experiencer's own on the page is an episode, including later OBEs,
 *  dreams, and visions mentioned in passing; whether it counts is decided by rule at analysis
 *  time (ResolvedEpisode). Other people's experiences described on the page are never episodes. */
export interface Episode {
  episodeId: string; // `${accountId}#1`
  /** Per episode: one page can mix firsthand experiences with a relative's, told secondhand. */
  reporter: Reporter;
  /** On multi-episode pages, which episode the questionnaire answers describe. */
  questionnaireRefersTo: 'this_episode' | 'several_episodes' | 'unclear';
  /** The same experience repeated with the same trigger (e.g. at every therapy session). */
  recurrent: boolean;
  /** Only when the text dates this episode and Background can't (no date, or several episodes). */
  textDate: Finding<ParsedDate>;
  /** Twelve or younger at the experience; teens are 'no'. A number decides, stated or computed
   *  from dates (a birth year, or "a month before I turned nine"). Without one: "little", elementary school
   *  or younger, or a plain "as a child" -> 'yes'; teenager or high school -> 'no'; middle
   *  school or junior high -> 'unclear'. Religion is coded the same way at every age. */
  child: { value: 'yes' | 'no' | 'unclear'; evidence: Evidence[] };
  /** A range when the person gives one: "six or seven" -> [6, 7]. */
  age: Finding<{ years: number | [number, number]; basis: 'stated' | 'computed' }>;
  circumstance: Circumstance;
  describesExperience: 'yes' | 'partial' | 'no';
  experienceToldIn: { narrative: boolean; questionnaire: boolean };
}

/** Exists to rule out experiences produced by something other than a near-death situation.
 *  How close the person came to death is a covariate, not a gate. Classifies the reported
 *  event, not its credibility: a complication the experiencer reports counts as reported. */
export interface Circumstance {
  /** What was happening to the experiencer's own body or safety. A fear-death experience
   *  (a threat with no illness or injury) is 'threat_without_injury' and counts. */
  context: 'illness_or_injury' | 'threat_without_injury' | 'someone_elses_death' | 'none' | 'unclear';
  /** Something other than a near-death situation that produced the experience. A known
   *  inducer moves the episode to the comparison group. An overdose is not an inducer: it is
   *  an illness_or_injury context with the overdose flag. */
  inducer: 'none' | 'recreational_drugs' | 'meditation_or_practice' | 'sleep_or_dream'
         | 'anesthesia_without_complication' | 'unclear';
  // Flags. None of them excludes.
  overdose: 'accidental' | 'intentional' | 'unclear' | null; // alcohol counts as a drug
  suicideAttempt: boolean;
  /** A psychoactive medication given as the experience began, during a real illness or
   *  injury (e.g. ketamine for a procedure). */
  psychoactiveMedicationAtOnset: boolean;
  /** Covariate; 'unclear' is a fine answer. Evidence for 'bodily_crisis' must point at
   *  described bodily events (arrest, bleeding, injury, resuscitation, what clinicians said),
   *  not at the experience (a sense of dying, being sent back). A bare "I died" with no
   *  physical event described is 'unclear'. 'minor': e.g. fainting, a knock with brief
   *  unconsciousness, a near-drowning with self-rescue. */
  closeness: 'bodily_crisis' | 'minor' | 'threat_only' | 'unclear';
  /** For a strictest-definition sensitivity analysis. */
  cardiacArrest: {
    reported: boolean;
    basis: 'clinician_or_witness' | 'checkbox' | 'self_report' | 'hedged' | 'medically_induced' | null;
  };
  timing: 'during' | 'after' | 'unrelated' | 'unclear';
  evidence: Evidence[];
}

// ─── Area 2: religious background ───────────────────────────────────────────────────────

/** Coded from text. Menu answers are in DerivedReligionFields (rules). */
export interface Background {
  religionStatements: ReligionStatement[];
  heritageStatements: HeritageStatement[];
}

/** One explicit statement about the experiencer's own religion. Statements about other
 *  individuals ("my grandmother was Catholic") are not coded. Statements about the household
 *  the person was raised in are upbringing: "we were Lutheran", "my family practiced
 *  Catholicism". Never inferred from what was seen, country, heritage, vocabulary ("Allah"),
 *  or practices ("Mass", "the rosary", speaking in tongues, "spirit-filled"). Attending a
 *  named church or group counts. */
export interface ReligionStatement {
  traditions: Tradition[]; // several for "several faiths", dual belonging, or a group attended alongside
  kind: 'identification' | 'upbringing' | 'attendance' | 'left';
  when: 'childhood' | 'before_experience' | 'at_experience' | 'after_experience' | 'now' | 'unspecified';
  practice: 'devout' | 'nominal' | 'lapsed' | 'non_practicing' | null; // doesn't change affiliation
  term: string; // as written, capped at MAX_COPIED_WORDS: 'Pentecostal church'
  source: 'religion_field_text' | 'narrative' | 'other_item';
  /** 'explaining_experience' marks a statement offered to explain something in the experience,
   *  wherever it appears; the sensitivity analysis drops these from backfill. Which
   *  questionnaire item a statement sits in doesn't matter: the "consistent with your earthly
   *  beliefs" item is where people most naturally describe what they believed before. */
  context: 'background' | 'explaining_experience' | 'other';
  evidence: Evidence[];
}

/** Christian here means Trinitarian. Latter-day Saints, Jehovah's Witnesses, and other
 *  non-Trinitarian groups are separate families. */
export type Tradition =
  | { family: 'catholic'; rite: 'latin' | 'eastern' | null }
  | { family: 'orthodox'; branch: 'eastern' | 'oriental' | null }
  | { family: 'protestant'; protestantFamily: ProtestantFamily; body: string | null } // 'LCMS', 'PCA'; never guessed
  /** Bare "Christian"; menu "Other Christian" with no text about the same time; self-labels
   *  with no church named ("born again, spirit-filled", term kept). A bare "nondenominational"
   *  is protestant / nondenominational instead. */
  | { family: 'christian_unspecified' }
  | { family: 'latter_day_saints' }
  | { family: 'jehovahs_witnesses' }
  | { family: 'other_nontrinitarian'; group: string | null } // one bucket: Christian Science, Oneness Pentecostal, …
  | { family: 'jewish'; movement: string | null }
  | { family: 'muslim'; branch: 'sunni' | 'shia' | 'other' | null; detail: string | null }
  /** A movement that grows out of one tradition goes under it, with the movement as detail
   *  (a Sai Baba devotee -> hindu, 'Sai Baba'). Syncretic esoteric movements (Theosophy,
   *  Edgar Cayce, the Urantia Book) -> new_age, with detail. */
  | { family: OtherTraditionFamily; detail: string | null }
  /** Pluralist answers that name no tradition (e.g. that every faith holds part of the
   *  truth). When traditions are named, each is coded instead. */
  | { family: 'several_unspecified' }
  | { family: 'unaffiliated'; kind: 'atheist' | 'agnostic' | 'nothing_religious' | 'nothing_secular' | null };
  // "spiritual but not religious" -> unaffiliated / nothing_religious

/** No evangelical/mainline split: denominations don't map cleanly onto it. */
export type ProtestantFamily =
  | 'lutheran' | 'reformed_presbyterian' | 'anglican' | 'methodist_wesleyan' | 'baptist'
  | 'pentecostal_charismatic' | 'anabaptist' | 'restorationist' | 'adventist' | 'holiness'
  | 'quaker' | 'united' | 'nondenominational' | 'other' | 'unspecified';

export type OtherTraditionFamily =
  | 'hindu' | 'buddhist' | 'sikh' | 'bahai' | 'chinese_folk_or_taoist' | 'shinto'
  | 'indigenous' | 'pagan' | 'new_age' | 'unitarian_universalist' | 'other';

/** Per part, by rule. */
export interface DerivedReligionFields {
  prior: Finding<ReligionFieldValue>; // 'not_asked' when the form lacks the item
  now: Finding<ReligionFieldValue>;
  practicesChanged: Finding<'yes' | 'no' | 'uncertain'>;
  /** Form D only. Answered after the experience, about before it. */
  priorImportance: Finding<'not' | 'slightly' | 'moderately' | 'greatly' | 'unknown'>;
  priorBeliefInGod: Finding<'definitely' | 'probably' | 'uncertain' | 'probably_not' | 'does_not' | 'unknown'>;
  priorBeliefInAfterlife: Finding<'definitely' | 'probably' | 'uncertain' | 'probably_not' | 'does_not' | 'unknown'>;
}

/** Forms A–C offer theological orientation, not affiliation; forms D–F offer an affiliation menu. */
export type ReligionFieldValue =
  | { format: 'orientation'; orientation: 'liberal' | 'moderate' | 'conservative_fundamentalist'; hasFreeText: boolean }
  | { format: 'menu'; option: NderfReligionOption; tradition: Tradition | null; hasFreeText: boolean };
  // tradition is null for do_not_know, no_comment, select, other_or_several, unrecognized;
  // for other_or_several the free text decides (named traditions, several_unspecified, or
  // spiritual-but-not-religious -> nothing_religious)

/** NDERF's menu, named after NDERF's labels; mapped to our Tradition by rule
 *  (christian_mormon -> latter_day_saints, christian_jehovahs_witness -> jehovahs_witnesses). */
export type NderfReligionOption =
  | 'christian_catholic' | 'christian_protestant' | 'christian_other' | 'christian_mormon'
  | 'christian_jehovahs_witness' | 'muslim' | 'jewish' | 'hindu' | 'buddhist'
  | 'native_american' | 'other_new_age' | 'other_unitarian_liberal' | 'other_or_several'
  | 'unaffiliated_atheist' | 'unaffiliated_agnostic' | 'unaffiliated_nothing_religious'
  | 'unaffiliated_nothing_secular' | 'do_not_know' | 'no_comment' | 'select' | 'unrecognized';

/** Explicit self-description of ethnicity, race, ancestry, or national origin. NDERF doesn't
 *  ask about ethnicity, so this is the only source besides country and language. */
export interface HeritageStatement {
  term: string; // as written, capped at MAX_COPIED_WORDS: 'Mexican-American'
  aspects: Array<'ethnicity' | 'race' | 'ancestry' | 'national_origin'>;
  countries: CountryCode[]; // when it names one, so country grouping can use ancestry too
  /** Guards against mentions prompted by the encounter (e.g. explaining a family background
   *  because of a figure seen in the experience). */
  context: 'background' | 'explaining_experience' | 'other';
  evidence: Evidence[];
}

// ─── Analysis-time views (computed by pre-registered rules; not coded) ──────────────────

export interface ResolvedAccount {
  accountId: string;
  ruleVersion: string;
  /** Role precedence: origin > unspecified > residence. Experience location is recorded but
   *  never used as the person's country. Within a role, the experiencer's own statement > NDERF
   *  tag > search-app quick facts > NDERF's AI-inferred country. With no country from any of
   *  these: presumed US, unless the account was translated from another language (unknown). */
  country: {
    code: CountryCode | null;
    role: Exclude<CountryRole, 'experience_location'> | null;
    /** Keeps a US the person or NDERF's tag states apart from an AI-inferred or presumed one. */
    source: 'self_report' | 'nderf_tag' | 'nderf_quick_facts' | 'nderf_country_ai' | 'presumed_us' | 'unknown';
  };
  countryGroups: string[]; // ids of CountryGroup definitions it falls in
  language: { original: LanguageCode; basis: 'stated' | 'presumed_english'; translated: boolean | null };
  /** Person level: a being counts if it appears in ANY qualifying episode. Experiences that
   *  don't qualify are recorded but never counted. */
  qualifyingEpisodeIds: string[];
  /** Prior religion is resolved as of this episode. */
  firstQualifyingEpisodeId: string | null;
  /** Flagged for a sensitivity analysis that drops these pages. */
  multipleQualifyingEpisodes: boolean;
}

/** Defined in the pre-registration, e.g. a Marian-devotional-culture group. */
export interface CountryGroup {
  id: string;
  label: string;
  members: CountryCode[];
  rationale: string;
}

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
export interface ResolvedReligion {
  accountId: string;
  ruleVersion: string;
  prior: ResolvedAffiliation;
  now: ResolvedAffiliation;
  orientation: 'liberal' | 'moderate' | 'conservative_fundamentalist' | null; // forms A–C only
}

export interface ResolvedAffiliation {
  status: 'resolved' | 'unknown' | 'do_not_know' | 'no_comment';
  traditions: Tradition[];
  basis: 'menu' | 'religion_field_text' | 'explicit_statement' | 'upbringing' | null;
  practice: ReligionStatement['practice'];
  /** Menu and an explicit statement about the same time disagree; flagged, not silently resolved. */
  conflict: boolean;
  /** Depends on a statement made to explain the experience (sensitivity analysis drops these). */
  usesEncounterPromptedStatement: boolean;
}

/** primary: firsthand, context illness_or_injury or threat_without_injury, inducer 'none',
 *  not unrelated in time, and an experience described. comparison: the same, but with a known
 *  inducer. excluded: everything else (no threat, someone else's death, not firsthand, …). */
export interface ResolvedEpisode {
  episodeId: string;
  ruleVersion: string;
  gapYears: number | null; // first posting year minus experience year
  /** firsthand = experiencer or experiencer_assisted (interviewed, transcribed, typed by
   *  someone else). Reports by relatives or clinicians are not firsthand. */
  firsthand: boolean;
  analysisSet: 'primary' | 'comparison' | 'excluded';
  exclusionReasons: Array<
    | 'not_firsthand' | 'no_threat' | 'someone_elses_death' | 'unrelated_in_time'
    | 'no_experience_described' | 'unclear'
  >;
  /** Flags never exclude; sensitivity analyses drop flagged episodes. */
  flags: Array<
    | 'overdose' | 'suicide_attempt' | 'psychoactive_medication_at_onset' | 'recurrent' | 'translated'
  >;
}
