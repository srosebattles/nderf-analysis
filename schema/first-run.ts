// The first run's passes (DECISIONS.md, "How the coding runs"): what each pass returns, checked
// with zod, and the form the coder is shown, in which evidence is a quote rather than offsets.
// Passes A to C so far; pass D follows the same pattern.
//
// The first run codes only some of the main record's fields (passes.ts lists the ones that
// wait), so some of its objects are first-run versions: the episode without its distressing
// content, which waits, and with a label that carries it to later passes. Labels describe the
// account, so they stay in the private raw output and never go into published coded data.

import { z } from 'zod';
import {
  Background, CHILD_AGREES_WITH_AGE, childAgreesWithAge, CodedPart, CodedRecord, ConditionStatement, CountryClaim, DoctrinalStatement,
  doctrineAndMentionIssues, Encounter, encounterCoreIssues, Episode, Evidence, IdentityClaim, identityClaimIssues, JesusMention,
  LanguageClaim, NonExperiencerText, PersonTie, Provenance, Vital,
} from './codebook-schema.ts';

const obj = z.strictObject;

/** A short label in the coder's own words, to tell episodes (or encounters) apart in later
 *  passes: "the car accident at nine", "a dream years later". */
export const Label = z.string().min(1).max(80);

const { distressingContent: _waits, ...episodeShape } = Episode.shape;

/** An episode as the first run codes it: without distressing content (a later pass) and with a
 *  label. The main record's rule that a pleasant episode has no distressing content moves to the
 *  later pass with the field. */
export const FirstRunEpisode = obj({ ...episodeShape, label: Label })
  .refine((e) => e.surroundingsAlive.value === (e.surroundingsAlive.words !== null && e.surroundingsAlive.evidence.length > 0), {
    message: 'surroundingsAlive has words and evidence exactly when true',
  })
  .refine(childAgreesWithAge, CHILD_AGREES_WITH_AGE);
export type FirstRunEpisode = z.infer<typeof FirstRunEpisode>;

/** Pass A: parts and episodes, eligibility, text that isn't the experiencer's, country and
 *  language in the text, religion and heritage, conditions, provenance, and a longing to return. */
export const PassA = obj({
  parts: z.array(CodedPart).min(1),
  episodes: z.array(FirstRunEpisode),
  nonExperiencerText: z.array(NonExperiencerText),
  /** Only the experiencer's own statements; NDERF's tags are read by rule in the derived file. */
  textClaims: obj({
    countries: z.array(CountryClaim.extend({ source: z.literal('self_report') })),
    language: LanguageClaim.extend({ source: z.literal('self_report') }).nullable(),
  }),
  background: Background,
  conditions: z.array(ConditionStatement),
  provenance: Provenance,
  longingToReturn: CodedRecord.shape.longingToReturn,
}).superRefine((r, ctx) => {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  const ids = r.episodes.map((e) => e.episodeId);
  if (new Set(ids).size !== ids.length) issue('episodeIds must be unique', ['episodes']);
  const prefixes = new Set(ids.map((id) => id.split('#')[0]));
  if (prefixes.size > 1 || ids.some((id) => !/^[^#]+#\d+$/.test(id))) issue('episodeIds are the account key, "#", and a number', ['episodes']);
  const labels = r.episodes.map((e) => e.label.toLowerCase());
  if (new Set(labels).size !== labels.length) issue('each episode needs its own label', ['episodes']);
  const known = (id: string, path: (string | number)[]) => {
    if (!ids.includes(id)) issue(`refers to unknown episode ${id}`, path);
  };
  const indexes = r.parts.map((p) => p.index);
  if (new Set(indexes).size !== indexes.length) issue('one entry per part', ['parts']);
  r.parts.forEach((p, i) => p.episodeIds.forEach((id, j) => known(id, ['parts', i, 'episodeIds', j])));
  r.conditions.forEach((c, i) => c.episodeIds.forEach((id, j) => known(id, ['conditions', i, 'episodeIds', j])));
  r.longingToReturn.forEach((l, i) => l.episodeIds.forEach((id, j) => known(id, ['longingToReturn', i, 'episodeIds', j])));
  for (const list of Object.keys(r.provenance) as (keyof typeof r.provenance)[]) {
    (r.provenance[list] as { episodeIds?: string[] }[]).forEach((entry, i) =>
      (entry.episodeIds ?? []).forEach((id, j) => known(id, ['provenance', list, i, 'episodeIds', j])));
  }
});
export type PassA = z.infer<typeof PassA>;

// ─── Pass B: the encounters, as a census ────────────────────────────────────────────────

/** A person's tie without friend types and closeness, which wait for the people pass. */
const { friendTypes: _friendTypes, closeness: _closeness, ...tieShape } = PersonTie.shape;
export const FirstRunPersonTie = obj(tieShape);

export const FirstRunIdentityClaim = obj({ ...IdentityClaim.shape, tie: FirstRunPersonTie.nullable() })
  .superRefine((c, ctx) => identityClaimIssues(c).forEach((message) => ctx.addIssue({ code: 'custom', message })));
export type FirstRunIdentityClaim = z.infer<typeof FirstRunIdentityClaim>;

/** Vital status and whether the experiencer knew; the rest (how a death was learned, time since
 *  death, apparent age and condition, a death soon after, future children) waits for the people
 *  pass. */
const {
  deathLearned: _dl, diedSoonAfter: _dsa, futureChild: _fc, timeSinceDeath: _tsd, apparentAge: _aa, apparentCondition: _ac,
  ...vitalShape
} = Vital.shape;
export const FirstRunVital = obj(vitalShape).refine((v) => (v.status === 'died_before_birth') === (v.diedBeforeBirth !== null), {
  message: 'diedBeforeBirth is given exactly for died_before_birth',
});

/** The fields of an encounter the first run codes (passes.ts lists the ones that wait). */
const FIRST_RUN_ENCOUNTER_FIELDS = [
  'encounterId', 'episodeId', 'sameBeingAs', 'perceivedBy', 'presence', 'count', 'familiarity', 'apparentSex', 'imageComparisons',
  'evidence',
] as const;
const pick = <K extends keyof typeof Encounter.shape>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, Encounter.shape[k]])) as Pick<typeof Encounter.shape, K>;

/** An encounter as the first run codes it, with a label that carries it to later passes. Only
 *  the cross-field rules on these fields come along; the rest wait with their fields. */
export const FirstRunEncounter = obj({
  ...pick(FIRST_RUN_ENCOUNTER_FIELDS),
  identity: z.array(FirstRunIdentityClaim).min(1),
  vital: FirstRunVital.nullable(),
  label: Label,
}).superRefine((e, ctx) => {
  for (const [message, path] of encounterCoreIssues(e)) ctx.addIssue({ code: 'custom', message, path });
});
export type FirstRunEncounter = z.infer<typeof FirstRunEncounter>;

/** An experience pass B found a being in that pass A's episodes don't include. Pass B can't add
 *  an episode (DECISIONS.md, How the coding runs); the page goes on a list to rerun pass A. */
export const MissingEpisode = obj({ description: Label, evidence: z.array(Evidence).min(1) });

/** Pass B: every being met, in pass A's episodes. Whether each encounter's episode is one of
 *  those is checked by the pipeline, which knows the episode list (pipeline/pass-b.ts). */
export const PassB = obj({
  encounters: z.array(FirstRunEncounter),
  missingEpisodes: z.array(MissingEpisode),
}).superRefine((r, ctx) => {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  const ids = r.encounters.map((e) => e.encounterId);
  if (new Set(ids).size !== ids.length) issue('encounterIds must be unique', ['encounters']);
  r.encounters.forEach((e, i) => {
    const prefix = `${e.episodeId}/e`;
    if (!e.encounterId.startsWith(prefix) || !/^\d+$/.test(e.encounterId.slice(prefix.length))) {
      issue('an encounterId is its episodeId, "/e", and a number', ['encounters', i, 'encounterId']);
    }
    if (e.sameBeingAs !== null) {
      const other = r.encounters.find((o) => o.encounterId === e.sameBeingAs);
      if (!other) issue(`sameBeingAs refers to unknown encounter ${e.sameBeingAs}`, ['encounters', i, 'sameBeingAs']);
      else if (other.episodeId === e.episodeId) issue('sameBeingAs links encounters in different episodes', ['encounters', i, 'sameBeingAs']);
    }
  });
  const labels = r.encounters.map((e) => e.label.toLowerCase());
  if (new Set(labels).size !== labels.length) issue('each encounter needs its own label', ['encounters']);
});
export type PassB = z.infer<typeof PassB>;

// ─── Pass C: doctrinal statements and every mention of Jesus ────────────────────────────

/** A being pass C found conveying a doctrine, or called Jesus, that pass B's encounters don't
 *  include. Pass C can't add an encounter (DECISIONS.md, How the coding runs): the statement or
 *  mention that needs it is left out, and the page goes on a list to rerun pass B. */
export const MissingEncounter = obj({ episodeId: z.string(), description: Label, evidence: z.array(Evidence).min(1) });

/** The episode an encounter ID names: `A0042#1/e2` is in `A0042#1`. Pass C knows the encounters
 *  only by ID; the pipeline checks the IDs against pass B's list (pipeline/pass-c.ts). */
const episodeOfEncounterId = (id: string) => (/^[^#/]+#\d+\/e\d+$/.test(id) ? id.slice(0, id.lastIndexOf('/')) : undefined);

/** Pass C: doctrinal statements and every mention of Jesus, linked to pass A's episodes and pass
 *  B's encounters. Neither type reads a field that waits for a later pass, so both are the full
 *  schema's. Whether the episodes and encounters linked to exist, and whether every encounter
 *  with a Jesus claim has its mention, is checked by the pipeline, which knows the lists. */
export const PassC = obj({
  doctrinalStatements: z.array(DoctrinalStatement),
  jesusMentions: z.array(JesusMention),
  missingEncounters: z.array(MissingEncounter),
  missingEpisodes: z.array(MissingEpisode),
}).superRefine((r, ctx) => {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  const ids = r.doctrinalStatements.map((d) => d.doctrineId);
  if (ids.some((id) => !/^[^#/]+\/d\d+$/.test(id)) || new Set(ids.map((id) => id.split('/')[0])).size > 1) {
    issue('a doctrineId is the account key, "/d", and a number', ['doctrinalStatements']);
  }
  const links = doctrineAndMentionIssues(r.doctrinalStatements, r.jesusMentions, {
    encounterEpisode: episodeOfEncounterId,
    episodeExists: () => true,
  });
  for (const [message, path] of links) issue(message, path);
});
export type PassC = z.infer<typeof PassC>;

// ─── What the coder is shown ────────────────────────────────────────────────────────────

/** Where a passage is, as the account's labels give it. The coder sees only narratives and
 *  questionnaire items, so evidence can point only there. */
const WirePlace = z.discriminatedUnion('kind', [
  obj({ kind: z.literal('narrative'), part: z.number().int().min(0) }),
  obj({ kind: z.literal('qa'), part: z.number().int().min(0), qaIndex: z.number().int().min(0) }),
]);

/** Evidence as the coder gives it: the place, and words copied exactly from it. The pipeline
 *  finds the words, stores character offsets as `span`, and drops the quote. */
export const WireEvidence = obj({ source: WirePlace, quote: z.string().min(1), basis: Evidence.shape.basis });

/** Text that isn't the experiencer's, as the coder gives it: its opening and closing words. */
export const WireNonExperiencerText = obj({
  source: WirePlace,
  startQuote: z.string().min(1),
  endQuote: z.string().min(1),
  kind: NonExperiencerText.shape.kind,
});

const jsonOf = (schema: z.ZodType) => {
  const { $schema: _draft, ...rest } = z.toJSONSchema(schema, { unrepresentable: 'any' }) as Record<string, unknown>;
  return rest;
};

/** The JSON Schema the coder's answer is constrained to: the pass's schema, with evidence and
 *  text that isn't the experiencer's in the forms above. */
export function wireJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const swaps = new Map<unknown, Record<string, unknown>>([
    [Evidence, jsonOf(WireEvidence)],
    [NonExperiencerText, jsonOf(WireNonExperiencerText)],
  ]);
  return z.toJSONSchema(schema, {
    unrepresentable: 'any',
    override: (ctx) => {
      const swap = swaps.get(ctx.zodSchema);
      if (!swap) return;
      for (const key of Object.keys(ctx.jsonSchema)) delete (ctx.jsonSchema as Record<string, unknown>)[key];
      Object.assign(ctx.jsonSchema, structuredClone(swap));
    },
  }) as Record<string, unknown>;
}

// ─── The first-run record: passes A and B joined ────────────────────────────────────────

/** What coded one pass of a record: its run, and the settings and versions recorded there. */
export const PassCoding = obj({
  runId: z.string().min(1),
  passVersion: z.string().min(1),
  model: z.string().min(1),
  effort: z.string().min(1),
  claudeCodeVersion: z.string().min(1),
  /** Fields whose copied text the pipeline cut to the cap on the retry. */
  truncated: z.array(z.string()),
});
export type PassCoding = z.infer<typeof PassCoding>;

const passAFields = PassA.shape;
const passBFields = PassB.shape;

/** One page's first run, for the main coder only (the second model is compared pass by pass):
 *  pass A's fields and pass B's, side by side as in the full schema, with a header saying what
 *  coded each pass. Private, since it holds the episode and encounter labels. Pass C joins it
 *  later. Each pass's own rules are checked again, and so are the links between them. */
export const FirstRunRecord = obj({
  accountId: z.string().min(1),
  coding: obj({ passA: PassCoding, passB: PassCoding }),
  ...passAFields,
  ...passBFields,
  /** Pass B found a being in an experience pass A left out: the page is rerun through pass A. */
  needsPassARerun: z.boolean(),
}).superRefine((r, ctx) => {
  const forward = (pass: string, result: z.ZodSafeParseResult<unknown>) => {
    if (!result.success) for (const i of result.error.issues) ctx.addIssue({ code: 'custom', message: `${pass}: ${i.message}`, path: i.path });
  };
  const pick = (shape: Record<string, unknown>) => Object.fromEntries(Object.keys(shape).map((k) => [k, (r as Record<string, unknown>)[k]]));
  forward('pass A', PassA.safeParse(pick(passAFields)));
  forward('pass B', PassB.safeParse(pick(passBFields)));
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  const episodes = new Set(r.episodes.map((e) => e.episodeId));
  r.episodes.forEach((e, i) => {
    if (!e.episodeId.startsWith(`${r.accountId}#`)) issue(`episode ${e.episodeId} isn't this account's`, ['episodes', i, 'episodeId']);
  });
  r.encounters.forEach((e, i) => {
    if (!episodes.has(e.episodeId)) issue(`encounter ${e.encounterId} is in episode ${e.episodeId}, which pass A doesn't have`, ['encounters', i, 'episodeId']);
  });
  if (r.needsPassARerun !== (r.missingEpisodes.length > 0)) issue('needsPassARerun is true exactly when pass B found a missing episode', ['needsPassARerun']);
});
export type FirstRunRecord = z.infer<typeof FirstRunRecord>;
