// The first run's passes (DECISIONS.md, "How the coding runs"): what each pass returns, checked
// with zod, and the form the coder is shown, in which evidence is a quote rather than offsets.
// Pass A so far; passes B to D follow the same pattern.
//
// The first run codes only some of the main record's fields (passes.ts lists the ones that
// wait), so some of its objects are first-run versions: the episode without its distressing
// content, which waits, and with a label that carries it to later passes. Labels describe the
// account, so they stay in the private raw output and never go into published coded data.

import { z } from 'zod';
import {
  Background, CodedPart, ConditionStatement, CountryClaim, Episode, Evidence, LanguageClaim, NonExperiencerText, Provenance,
  CodedRecord,
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
  });
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
