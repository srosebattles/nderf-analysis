// Pre-registered rules that compute area 1's analysis-time views from coded and derived records:
// which episodes qualify, their flags, and the first qualifying episode. Nothing here is coded by
// the LLM; the definitions are in DECISIONS.md, area 1 ("Which episodes qualify, as resolved").
// Country and language come with their own rules.

import {
  type CodedPart, type ConditionStatement, type DerivedPart, type DerivedRecord, type Episode, HALLUCINATION_FLAG_CONDITIONS,
  ResolvedEpisode,
} from './codebook-schema.ts';

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

/** The life-threat item's cause that sets the overdose flag (pass A pilot, November 2026). */
export const OVERDOSE_CAUSE = 'Drug or medication overdose';

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

export function resolveEpisodes(coded: EpisodeRuleInput, derived: DerivedEpisodeInput, ruleVersion = AREA1_RULE_VERSION): ResolvedEpisodes {
  if (derived.accountId !== coded.accountId) throw new Error('derived and coded records are for different accounts');
  const posted = derived.posting.firstPosted ? Number(derived.posting.firstPosted.slice(0, 4)) : null;

  const overdoseFromCause = new Set<string>();
  for (const part of derived.parts) {
    if (part.lifeThreat.status === 'present' && part.lifeThreat.value.causes.includes(OVERDOSE_CAUSE)) {
      for (const e of describedByQuestionnaire(coded, part.index)) overdoseFromCause.add(e.episodeId);
    }
  }
  const hallucination = new Set(
    coded.conditions
      .filter((c) => HALLUCINATION_FLAG_CONDITIONS.includes(c.condition) && FLAG_TIMINGS.includes(c.when))
      .flatMap((c) => c.episodeIds),
  );

  const episodes = coded.episodes.map((e) => {
    const c = e.circumstance;
    const flags: ResolvedEpisode['flags'] = [];
    if (c.overdose !== null || overdoseFromCause.has(e.episodeId)) flags.push('overdose');
    if (c.suicideAttempt) flags.push('suicide_attempt');
    if (c.psychoactiveMedicationAtOnset) flags.push('psychoactive_medication_at_onset');
    if (e.recurrent) flags.push('recurrent');
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
