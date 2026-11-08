// Pre-registered rules that compute area 3's analysis-time views from coded and derived
// records. Nothing here is coded by the LLM; the definitions are in DECISIONS.md, area 3.

import {
  type Certainty, type CodedRecord, type DerivedRecord, type Encounter, type Evidence, JESUS_KEYWORDS_BROAD,
  JESUS_KEYWORDS_NARROW, type JesusKeyword, ResolvedEncounter, ResolvedJesus, UNIDENTIFIED_CATEGORIES,
} from './codebook-schema.ts';

export const AREA3_RULE_VERSION = '0.1';

const strongest = (certainties: Certainty[]): Certainty | null =>
  (['asserted', 'hedged', 'resemblance'] as const).find((c) => certainties.includes(c)) ?? null;

export function resolveEncounter(e: Encounter, ruleVersion = AREA3_RULE_VERSION): ResolvedEncounter {
  const evidence: Evidence[] = [...e.evidence, ...e.identity.flatMap((c) => c.evidence)];
  const inNarrative = evidence.some((ev) => ev.source.kind === 'narrative');
  const items = new Map<string, { part: number; qaIndex: number }>();
  for (const ev of evidence) {
    if (ev.source.kind === 'qa') items.set(`${ev.source.part}:${ev.source.qaIndex}`, { part: ev.source.part, qaIndex: ev.source.qaIndex });
  }
  if (!inNarrative && items.size === 0) throw new Error(`${e.encounterId}: no narrative or questionnaire evidence`);

  const neverIdentified = e.identity.every((c) => UNIDENTIFIED_CATEGORIES.includes(c.category));
  const maryClaims = e.identity.filter((c) => c.category === 'mary');
  const confessional =
    e.confessionalContent.length > 0 || e.visualDetails.some((d) => d.feature === 'rosary' || d.feature === 'scapular');
  const marianLevel =
    maryClaims.length > 0 ? (confessional ? 'three' : 'two') : neverIdentified && e.apparentSex === 'female' ? 'one' : 'none';

  return ResolvedEncounter.parse({
    encounterId: e.encounterId,
    ruleVersion,
    neverIdentified,
    reportedIn: !inNarrative ? 'questionnaire_only' : items.size > 0 ? 'both' : 'narrative_only',
    questionnaireItems: [...items.values()],
    marianLevel,
    marianLevelOneNarrow: marianLevel === 'one' && e.maternalLanguage !== null,
    maryClaimCertainty: strongest(maryClaims.map((c) => c.certainty)),
  });
}

/** qualifyingEpisodeIds: from ResolvedAccount. */
export function resolveJesus(
  derived: DerivedRecord,
  coded: CodedRecord,
  qualifyingEpisodeIds: readonly string[],
  ruleVersion = AREA3_RULE_VERSION,
): ResolvedJesus {
  if (derived.accountId !== coded.accountId) throw new Error('derived and coded records are for different accounts');
  const qualifies = (episodeId: string | null | undefined) => episodeId != null && qualifyingEpisodeIds.includes(episodeId);

  const hits = derived.parts.flatMap((p) => p.jesusKeywordHits);
  const keywordRung = (ownWordsOnly: boolean) => {
    const any = (list: readonly JesusKeyword[]) =>
      hits.some((h) => list.includes(h.keyword) && h.narrative + h.answers + (ownWordsOnly ? 0 : h.questionWording) > 0);
    return { narrow: any(JESUS_KEYWORDS_NARROW), broad: any(JESUS_KEYWORDS_BROAD) };
  };

  const encounterEpisode = new Map(coded.encounters.map((e) => [e.encounterId, e.episodeId]));
  const doctrineEpisode = new Map(coded.doctrinalStatements.map((d) => [d.doctrineId, d.episodeId]));
  const notAReference = ['idiom_or_exclamation', 'church_name', 'name_of_person_or_place'];
  const affirmative = (withAmbiguous: boolean) =>
    coded.jesusMentions.filter(
      (m) =>
        m.polarity === 'affirmative' &&
        !notAReference.includes(m.kind) &&
        (m.refersTo === 'jesus' || (withAmbiguous && m.refersTo === 'ambiguous')),
    );
  const aboutExperience = (withAmbiguous: boolean) =>
    affirmative(withAmbiguous).some((m) =>
      m.kind === 'encounter' || m.kind === 'talk_with_another_being'
        ? qualifies(encounterEpisode.get(m.encounterId ?? ''))
        : m.kind === 'doctrinal_statement'
          ? qualifies(doctrineEpisode.get(m.doctrineId ?? ''))
          : m.when === 'during' && qualifies(m.episodeId),
    );

  // Each encounter rung narrows the same claim further.
  const claims = coded.encounters
    .filter((e) => qualifies(e.episodeId))
    .flatMap((e) => e.identity.filter((c) => c.category === 'jesus'));
  const notResemblance = claims.filter((c) => c.certainty !== 'resemblance');
  const inNarrative = notResemblance.filter((c) => c.evidence.some((ev) => ev.source.kind === 'narrative'));
  const during = inNarrative.filter((c) => c.when === 'during');
  const strictest = during.filter(
    (c) => c.certainty === 'asserted' && (c.how.includes('announced') || c.how.includes('recognized')),
  );

  return ResolvedJesus.parse({
    accountId: coded.accountId,
    ruleVersion,
    keywordWebsite: keywordRung(false),
    keywordOwnWords: keywordRung(true),
    anyCodedEntry: coded.jesusMentions.length > 0,
    affirmativeMention: { jesusOnly: affirmative(false).length > 0, withAmbiguous: affirmative(true).length > 0 },
    mentionAboutExperience: { jesusOnly: aboutExperience(false), withAmbiguous: aboutExperience(true) },
    encounterClaim: claims.length > 0,
    excludingResemblance: notResemblance.length > 0,
    claimInNarrative: inNarrative.length > 0,
    identifiedDuring: during.length > 0,
    announcedOrRecognizedDuringAsserted: strictest.length > 0,
    announcedOrRecognizedDuringAssertedThroughout: strictest.some((c) => !c.hedgedElsewhere),
  });
}
