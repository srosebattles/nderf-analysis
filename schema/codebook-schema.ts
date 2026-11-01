// Output schema for coding NDERF accounts. v1 DRAFT: areas 1 (eligibility and provenance) and
// 2 (religious background) are designed; area 3 (encounters) is not started.
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

export const SCHEMA_VERSION = 'v1-draft';
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
  flags: Array<'two_digit_year' | 'day_month_ambiguous' | 'after_posting' | 'unparsed' | 'raw_omitted'>;
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
  /** The experiencer's own checkbox. 'other' covers cause answers like 'Accident'. */
  lifeThreatCheckbox: Finding<'yes' | 'no' | 'uncertain' | 'other'>;
  backgroundDate: ParsedDate;
  gender: string | null; // Background field as written ('Female', 'Male')
  religionField: DerivedReligionFields;
  lengths: Lengths;
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
  reporter: Reporter;
  parts: CodedPart[];
  episodes: Episode[];
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

export interface Episode {
  episodeId: string; // `${accountId}#1`
  /** PROVISIONAL: which episode counts when a page describes several. */
  isIndexEpisode: boolean;
  /** On multi-episode pages, which episode the questionnaire answers describe. */
  questionnaireRefersTo: 'this_episode' | 'several_episodes' | 'unclear';
  /** Only when the text dates this episode and Background can't (no date, or several episodes). */
  textDate: Finding<ParsedDate>;
  /** Twelve or younger at the experience; teens are 'no'. Religion is coded the same way at
   *  every age. Without a number: "little", elementary school or younger, or a plain "as a
   *  child" -> 'yes'; teenager or high school -> 'no'; middle school or junior high -> 'unclear'. */
  child: 'yes' | 'no' | 'unclear';
  statedAge: Finding<number>; // only when a number is given
  proximity: Proximity;
  sharedDeath: boolean; // the crisis was someone else's
  describesExperience: 'yes' | 'partial' | 'no';
  experienceToldIn: { narrative: boolean; questionnaire: boolean };
}

/** Exists only to decide whether the experience counts. Circumstance, never content:
 *  evidence must point at described bodily events (arrest, bleeding, injury, resuscitation,
 *  what clinicians said), not at the experience (a sense of dying, being sent back). A bare
 *  "I died" with no physical event described is 'unclear'. */
export interface Proximity {
  /** 'grey_zone' cases are mapped by the grey-zone rulings at analysis time, so a ruling can
   *  change without recoding. */
  crisisLevel: 'bodily_crisis' | 'near_miss' | 'no_threat' | 'grey_zone' | 'unclear';
  greyZone: GreyZone | null; // set iff crisisLevel is 'grey_zone'
  nonCrisisKind: NonCrisisKind | null; // set iff crisisLevel is 'no_threat'
  timing: 'during_crisis' | 'after_crisis' | 'unrelated' | 'unclear';
  overdose: 'accidental' | 'intentional' | 'unclear' | null;
  suicideAttempt: boolean;
  medicalDrugsDuringCrisis: boolean;
  /** For a strictest-definition sensitivity analysis. */
  cardiacArrestReported: boolean;
  evidence: Evidence[];
}

/** PROVISIONAL: rulings pending. */
export type GreyZone =
  | 'syncope' | 'seizure' | 'high_fever' | 'serious_illness_no_acute_event'
  | 'coma_unstated_cause' | 'childbirth_uncomplicated';

export type NonCrisisKind =
  | 'sleep_or_dream' | 'meditation_or_prayer' | 'recreational_drugs' | 'routine_anesthesia'
  | 'spontaneous' | 'other';

// ─── Area 2: religious background ───────────────────────────────────────────────────────

/** Coded from text. Menu answers are in DerivedReligionFields (rules). */
export interface Background {
  religionStatements: ReligionStatement[];
  heritageStatements: HeritageStatement[];
}

/** One explicit statement about the experiencer's own religion. Statements about other
 *  people ("my grandmother was Catholic") are not coded; "we were Lutheran" is. Never
 *  inferred from what was seen, country, heritage, vocabulary ("Allah"), or practices
 *  ("Mass", "the rosary"). Attending a named church counts. */
export interface ReligionStatement {
  traditions: Tradition[]; // several for "several faiths" or dual belonging
  kind: 'identification' | 'upbringing' | 'attendance' | 'left';
  when: 'childhood' | 'before_experience' | 'at_experience' | 'after_experience' | 'now' | 'unspecified';
  practice: 'devout' | 'nominal' | 'lapsed' | 'non_practicing' | null; // doesn't change affiliation
  term: string; // as written, capped at MAX_COPIED_WORDS: 'Pentecostal church'
  source: 'religion_field_text' | 'narrative' | 'other_item';
  context: 'background' | 'explaining_experience' | 'other';
  /** Set by rule: the statement sits inside an encounter-related questionnaire item. */
  encounterAdjacentItem: boolean;
  evidence: Evidence[];
}

/** Christian here means Trinitarian. Latter-day Saints, Jehovah's Witnesses, and other
 *  non-Trinitarian groups are separate families. */
export type Tradition =
  | { family: 'catholic'; rite: 'latin' | 'eastern' | null }
  | { family: 'orthodox'; branch: 'eastern' | 'oriental' | null }
  | { family: 'protestant'; protestantFamily: ProtestantFamily; body: string | null } // 'LCMS', 'PCA'; never guessed
  | { family: 'christian_unspecified' } // bare "Christian", or menu "Other Christian" with no text
  | { family: 'latter_day_saints' }
  | { family: 'jehovahs_witnesses' }
  | { family: 'other_nontrinitarian'; group: string | null } // one bucket: Christian Science, Oneness Pentecostal, …
  | { family: 'jewish'; movement: string | null }
  | { family: 'muslim'; branch: 'sunni' | 'shia' | 'other' | null; detail: string | null }
  | { family: OtherTraditionFamily; detail: string | null }
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
  // tradition is null for do_not_know, no_comment, select, other_or_several, unrecognized

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
  /** PROVISIONAL precedence: origin > unspecified > residence > experience_location >
   *  presumed_us (no country from any source) > unknown. */
  country: { code: CountryCode | null; basis: CountryRole | 'presumed_us' | 'unknown' };
  countryGroups: string[]; // ids of CountryGroup definitions it falls in
  language: { original: LanguageCode; basis: 'stated' | 'presumed_english'; translated: boolean | null };
}

/** Defined in the pre-registration, e.g. a Marian-devotional-culture group. */
export interface CountryGroup {
  id: string;
  label: string;
  members: CountryCode[];
  rationale: string;
}

/** Prior: menu if informative > explicit statement about before or at the experience
 *  (including the religion field's free text) > upbringing. Upbringing counts as the person's
 *  religion unless the menu or a statement places a different affiliation, or none, at the
 *  time of the experience. Lapsed or nominal doesn't override. "Left the church" with nothing
 *  else resolves to unknown, not unaffiliated.
 *  Now: menu > 'now' statements. */
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

export interface ResolvedEpisode {
  episodeId: string;
  ruleVersion: string;
  gapYears: number | null; // first posting year minus experience year
  /** PROVISIONAL: firsthand = experiencer or experiencer_assisted. */
  firsthand: boolean;
  /** PROVISIONAL: near-miss episodes as their own set rather than excluded. */
  analysisSet: 'primary' | 'near_miss' | 'comparison_non_crisis' | 'excluded';
  exclusionReasons: Array<
    | 'not_firsthand' | 'grey_zone_ruled_out' | 'crisis_unrelated_in_time' | 'shared_death'
    | 'no_experience_described' | 'not_index_episode' | 'unclear'
  >;
  flags: Array<'overdose' | 'suicide_attempt' | 'multi_episode_page' | 'translated'>;
}
