// Pre-registered rules that compute area 1's analysis-time views from coded and derived records:
// which episodes qualify, their flags, and the first qualifying episode; the original language
// and whether the page was translated; and the person's country. Nothing here is coded by the
// LLM; the definitions are in DECISIONS.md, area 1 ("Which episodes qualify, as resolved" and
// "Country and language, as resolved").

import {
  type CodedPart, type ConditionStatement, type CountryClaim, type DerivedPart, type DerivedRecord, type Episode,
  HALLUCINATION_FLAG_CONDITIONS, type LanguageClaim, type PriorTelling, ResolvedAccount, ResolvedEpisode,
} from './codebook-schema.ts';
import type { z } from 'zod';

export const AREA1_RULE_VERSION = '0.1';

/** What the episode rules read, the same in the full coded record and the first-run record. */
export interface EpisodeRuleInput {
  accountId: string;
  parts: readonly CodedPart[];
  episodes: readonly Pick<
    Episode, 'episodeId' | 'reporter' | 'questionnaireRefersTo' | 'recurrent' | 'textDate' | 'age' | 'circumstance' | 'describesExperience'
  >[];
  conditions: readonly ConditionStatement[];
}

/** What the episode rules read from the derived record. */
export interface DerivedEpisodeInput {
  accountId: string;
  posting: Pick<DerivedRecord['posting'], 'firstPosted'>;
  parts: readonly Pick<DerivedPart, 'index' | 'backgroundDate' | 'lifeThreat'>[];
}

export interface ResolvedEpisodes {
  episodes: ResolvedEpisode[];
  /** Primary episodes only: a being counts for the person if it appears in any of them. */
  qualifyingEpisodeIds: string[];
  /** Prior religion, the experience date, and area 4's timing are resolved as of this episode. */
  firstQualifyingEpisodeId: string | null;
  /** Flagged for a sensitivity analysis that drops these pages. */
  multipleQualifyingEpisodes: boolean;
}

/** The life-threat item's causes that set the overdose flag (pass A pilot, November 2026) and
 *  the suicide-attempt flag (November 22, 2026), since the coder may never see that menu. */
export const OVERDOSE_CAUSE = 'Drug or medication overdose';
export const SUICIDE_CAUSE = 'Suicide attempt';

/** Conditions count toward the hallucination flag when stated as present before or at the
 *  experience, or with no time given (erring toward dropping more in the sensitivity analysis). */
const FLAG_TIMINGS: readonly ConditionStatement['when'][] = ['before', 'at_the_time', 'at_the_time_recognized_later', 'not_stated'];

const KNOWN_INDUCERS: readonly string[] = ['recreational_drugs', 'meditation_or_practice', 'sleep_or_dream', 'anesthesia_without_complication'];

type Ep = EpisodeRuleInput['episodes'][number];

/** An episode's year: its own text date, or the background date of a part that holds only it. */
export function episodeYear(e: Ep, coded: Pick<EpisodeRuleInput, 'parts'>, derived: Pick<DerivedEpisodeInput, 'parts'>): number | null {
  if (e.textDate.status === 'present' && e.textDate.value.year !== null) return e.textDate.value.year;
  for (const part of coded.parts) {
    if (part.episodeIds.length !== 1 || part.episodeIds[0] !== e.episodeId) continue;
    const year = derived.parts.find((p) => p.index === part.index)?.backgroundDate.year ?? null;
    if (year !== null) return year;
  }
  return null;
}

/** An episode's age for ordering: a stated or computed age, the lower end of a range. */
const ageOf = (e: Ep): number | null => (e.age.status !== 'present' ? null : typeof e.age.value.years === 'number' ? e.age.value.years : e.age.value.years[0]);

/** The earliest of some episodes that the text places in time: two episodes compare by year when
 *  both have one, else by age when both have one; when the order can't be told, the one the page
 *  mentions first. Null for none. */
export function earliestEpisode<E extends Ep>(candidates: readonly E[], coded: Pick<EpisodeRuleInput, 'parts'>, derived: Pick<DerivedEpisodeInput, 'parts'>): E | null {
  const before = (a: Ep, b: Ep): boolean => {
    const ya = episodeYear(a, coded, derived), yb = episodeYear(b, coded, derived);
    if (ya !== null && yb !== null) return ya < yb;
    const aa = ageOf(a), ab = ageOf(b);
    return aa !== null && ab !== null && aa < ab;
  };
  return candidates.find((e) => !candidates.some((o) => o !== e && before(o, e))) ?? candidates[0] ?? null;
}

function setOf(e: Ep): Pick<ResolvedEpisode, 'firsthand' | 'analysisSet' | 'exclusionReasons'> {
  const c = e.circumstance;
  const firsthand = e.reporter.role === 'experiencer' || e.reporter.role === 'experiencer_assisted';
  const reasons = new Set<ResolvedEpisode['exclusionReasons'][number]>();
  if (!firsthand) reasons.add(e.reporter.role === 'unknown' ? 'unclear' : 'not_firsthand');
  if (e.describesExperience === 'no') reasons.add('no_experience_described');
  const known = KNOWN_INDUCERS.includes(c.inducer);
  // Comparison: firsthand and described, with a known inducer, whatever the context or timing.
  if (!known) {
    if (c.context === 'unclear' || c.inducer === 'unclear') reasons.add('unclear');
    if (c.context === 'someone_elses_death') reasons.add('someone_elses_death');
    if (c.context === 'none') reasons.add('no_threat');
    if (c.timing === 'unrelated') reasons.add('unrelated_in_time');
  }
  const exclusionReasons = [...reasons];
  return { firsthand, exclusionReasons, analysisSet: exclusionReasons.length > 0 ? 'excluded' : known ? 'comparison' : 'primary' };
}

/** The episodes of a part that its questionnaire answers describe. */
const describedByQuestionnaire = (coded: EpisodeRuleInput, partIndex: number) => {
  const ids = coded.parts.find((p) => p.index === partIndex)?.episodeIds ?? [];
  return coded.episodes.filter((e) => ids.includes(e.episodeId) && (e.questionnaireRefersTo === 'this_episode' || e.questionnaireRefersTo === 'several_episodes'));
};

export interface EpisodeOptions {
  /** The page was translated (resolveLanguage): every episode gets the flag. */
  translated?: boolean;
  ruleVersion?: string;
}

export function resolveEpisodes(coded: EpisodeRuleInput, derived: DerivedEpisodeInput, opts: EpisodeOptions = {}): ResolvedEpisodes {
  const ruleVersion = opts.ruleVersion ?? AREA1_RULE_VERSION;
  if (derived.accountId !== coded.accountId) throw new Error('derived and coded records are for different accounts');
  const posted = derived.posting.firstPosted ? Number(derived.posting.firstPosted.slice(0, 4)) : null;

  const fromCause = (cause: string) => {
    const ids = new Set<string>();
    for (const part of derived.parts) {
      if (part.lifeThreat.status === 'present' && part.lifeThreat.value.causes.includes(cause)) {
        for (const e of describedByQuestionnaire(coded, part.index)) ids.add(e.episodeId);
      }
    }
    return ids;
  };
  const overdoseFromCause = fromCause(OVERDOSE_CAUSE);
  const suicideFromCause = fromCause(SUICIDE_CAUSE);
  const hallucination = new Set(
    coded.conditions
      .filter((c) => HALLUCINATION_FLAG_CONDITIONS.includes(c.condition) && FLAG_TIMINGS.includes(c.when))
      .flatMap((c) => c.episodeIds),
  );

  const episodes = coded.episodes.map((e) => {
    const c = e.circumstance;
    const flags: ResolvedEpisode['flags'] = [];
    if (c.overdose !== null || overdoseFromCause.has(e.episodeId)) flags.push('overdose');
    if (c.suicideAttempt || suicideFromCause.has(e.episodeId)) flags.push('suicide_attempt');
    if (c.psychoactiveMedicationAtOnset) flags.push('psychoactive_medication_at_onset');
    if (e.recurrent) flags.push('recurrent');
    if (opts.translated) flags.push('translated');
    if (hallucination.has(e.episodeId)) flags.push('hallucination_linked_condition');
    const year = episodeYear(e, coded, derived);
    return ResolvedEpisode.parse({
      episodeId: e.episodeId,
      ruleVersion,
      gapYears: posted !== null && year !== null ? posted - year : null,
      ...setOf(e),
      flags,
    });
  });

  const primary = coded.episodes.filter((_, i) => episodes[i].analysisSet === 'primary');
  const first = earliestEpisode(primary, coded, derived);

  return {
    episodes,
    qualifyingEpisodeIds: primary.map((e) => e.episodeId),
    firstQualifyingEpisodeId: first?.episodeId ?? null,
    multipleQualifyingEpisodes: primary.length > 1,
  };
}

/** The episode prior religion and the questionnaire's page-level answers are read as of: the
 *  first qualifying episode; on a page with none, the earliest comparison episode, else the
 *  first episode. Undefined on a page with no episodes. */
export function anchorEpisodeId(coded: Pick<EpisodeRuleInput, 'parts' | 'episodes'>, derived: Pick<DerivedEpisodeInput, 'parts'>, resolved: ResolvedEpisodes): string | undefined {
  const comparison = coded.episodes.filter((e) => resolved.episodes.find((r) => r.episodeId === e.episodeId)?.analysisSet === 'comparison');
  return resolved.firstQualifyingEpisodeId ?? earliestEpisode(comparison, coded, derived)?.episodeId ?? coded.episodes[0]?.episodeId;
}

/** The part whose questionnaire speaks for the page: the one holding the anchor episode. */
export function anchorPartIndex(coded: Pick<EpisodeRuleInput, 'parts'>, anchorId: string | undefined): number | undefined {
  return (coded.parts.find((p) => anchorId !== undefined && p.episodeIds.includes(anchorId)) ?? coded.parts[0])?.index;
}

// ─── Language and country ────────────────────────────────────────────────────────────────

type Language = ResolvedAccount['language'];
type Country = ResolvedAccount['country'];

/** The original language and whether the page was translated: the person's own words, else
 *  NDERF's tag, else presumed English. Translated when either says so. */
export function resolveLanguage(own: LanguageClaim | null, tag: LanguageClaim | null): Language {
  const claims = [own, tag].filter((c) => c !== null);
  if (claims.length === 0) return { original: 'en', basis: 'presumed_english', translated: false };
  const original = own?.originalLanguage ?? tag?.originalLanguage ?? null;
  const said = claims.map((c) => c.translated);
  const translated = said.includes('yes') ? true : said.includes('no') || original === 'en' ? false : null;
  return { original, basis: 'stated', translated };
}

const ROLES = ['origin', 'unspecified', 'residence'] as const;
const STATED_SOURCES = ['self_report', 'nderf_tag', 'nderf_quick_facts'] as const;

/** The person's country: by role (origin, then a plain "from", then residence), and within a role
 *  by source (their own words, NDERF's tag, the search app's quick facts); NDERF's AI-inferred
 *  country only when none of those names one. Where the experience happened is never used, and a
 *  claim naming no particular country is skipped. When the deciding claims disagree, the country
 *  is unknown, flagged. With nothing: presumed US, unless the page was translated or its original
 *  language isn't English. */
export function resolveCountry(claims: readonly CountryClaim[], language: Language): Country {
  const usable = claims.filter((c) => c.country !== null && c.role !== 'experience_location');
  const decide = (found: readonly CountryClaim[]): Country | null => {
    if (found.length === 0) return null;
    const codes = [...new Set(found.map((c) => c.country))];
    const role = found[0].role as Exclude<CountryClaim['role'], 'experience_location'>;
    return codes.length === 1
      ? { code: codes[0], role, source: found[0].source, conflict: false }
      : { code: null, role, source: 'unknown', conflict: true };
  };
  for (const role of ROLES) {
    for (const source of STATED_SOURCES) {
      const found = decide(usable.filter((c) => c.role === role && c.source === source));
      if (found) return found;
    }
  }
  for (const role of ROLES) {
    const found = decide(usable.filter((c) => c.role === role && c.source === 'nderf_country_ai'));
    if (found) return found;
  }
  const english = language.original === 'en' && language.translated !== true;
  return english ? { code: 'US', role: null, source: 'presumed_us', conflict: false } : { code: null, role: null, source: 'unknown', conflict: false };
}

/** What the account-level rules read, beyond the episode rules. */
export interface AccountRuleInput extends EpisodeRuleInput {
  textClaims: { countries: readonly CountryClaim[]; language: LanguageClaim | null };
  provenance: { priorTellings: readonly Pick<z.infer<typeof PriorTelling>, 'kind'>[] };
}
export interface DerivedAccountInput extends DerivedEpisodeInput {
  tagClaims: { countries: readonly CountryClaim[]; language: LanguageClaim | null };
  parts: readonly (DerivedEpisodeInput['parts'][number] & { provenanceItems: Pick<DerivedPart['provenanceItems'], 'sharedWithOthers'> })[];
}

/** Whether the person had told the experience before: their own words decide whenever a telling
 *  is coded, since the box may have been misread (pass A pilot, November 2026); otherwise the box. */
export function resolveSharedBefore(tellings: readonly Pick<z.infer<typeof PriorTelling>, 'kind'>[], box: DerivedPart['provenanceItems']['sharedWithOthers'] | undefined): ResolvedAccount['sharedBeforeTelling'] {
  if (tellings.some((t) => t.kind !== 'first_telling')) return { value: 'yes', source: 'words' };
  if (tellings.length > 0) return { value: 'no', source: 'words' };
  if (box?.status === 'present') return { value: box.value, source: 'box' };
  return { value: box?.status === 'not_asked' ? 'not_asked' : 'not_stated', source: null };
}

/** Area 1's whole resolved view of an account: the episodes, then the account. Country groups
 *  are filled in once the pre-registration defines them. */
export function resolveAccount(
  coded: AccountRuleInput, derived: DerivedAccountInput, ruleVersion = AREA1_RULE_VERSION,
): { account: ResolvedAccount; episodes: ResolvedEpisodes } {
  const language = resolveLanguage(coded.textClaims.language, derived.tagClaims.language);
  const episodes = resolveEpisodes(coded, derived, { translated: language.translated === true, ruleVersion });
  const part = anchorPartIndex(coded, anchorEpisodeId(coded, derived, episodes));
  const account = ResolvedAccount.parse({
    accountId: coded.accountId,
    ruleVersion,
    country: resolveCountry([...coded.textClaims.countries, ...derived.tagClaims.countries], language),
    countryGroups: [],
    language,
    sharedBeforeTelling: resolveSharedBefore(coded.provenance.priorTellings, derived.parts.find((p) => p.index === part)?.provenanceItems.sharedWithOthers),
    qualifyingEpisodeIds: episodes.qualifyingEpisodeIds,
    firstQualifyingEpisodeId: episodes.firstQualifyingEpisodeId,
    multipleQualifyingEpisodes: episodes.multipleQualifyingEpisodes,
  });
  return { account, episodes };
}
