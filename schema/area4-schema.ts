// Output schema for area 4 (DECISIONS.md, area 4): its own coding pass and its rule-based counts.
// Kept apart from the main coded record, in files of its own, joined on accountId:
//   coded/<codebookVersion>/area4-<runId>.jsonl   the area 4 pass (LLM), quotes stripped
//   derived/area4.jsonl                            word-rule counts (rules only), run after the freeze
// The area 4 pass runs after the main passes and is given their list of episodes, so a hit can
// name its episode; the main coder never sees area 4's checklist. Item ids are the table's; the
// prompt shows the coder neutral codes and the pipeline maps them back, so no id hints at a source.
// Word rules also run over the names area 3 copies for every being; that happens at resolve time,
// from the main coded record, not here.

import { z } from 'zod';
import { CodingRun, CopiedText, Evidence } from './codebook-schema.ts';
import { DECOYS, MEDIA_SOURCES } from './tables/media-sources.ts';

const obj = z.strictObject;
const Index = z.number().int().nonnegative();

/** Every item the checklist shows: each checklist-route detail and each decoy. */
export const CHECKLIST_ITEMS: readonly { id: string; hasPartial: boolean; decoy: boolean }[] = [
  ...MEDIA_SOURCES.flatMap((s) => s.details.filter((d) => d.route === 'checklist'))
    .map((d) => ({ id: d.id, hasPartial: d.partialMatch !== null, decoy: false })),
  ...DECOYS.map((d) => ({ id: d.id, hasPartial: d.partialMatch !== null, decoy: true })),
];
const ITEMS = new Map(CHECKLIST_ITEMS.map((i) => [i.id, i]));

/** Every word-rule detail, counted by rule in the derived file. */
export const WORD_RULE_DETAIL_IDS: readonly string[] = MEDIA_SOURCES.flatMap((s) => s.details.filter((d) => d.route === 'word_rule').map((d) => d.id));

// ─── The area 4 pass (LLM) ──────────────────────────────────────────────────────────────

export const ChecklistHit = obj({
  itemId: z.string(),
  /** full: every part of the item's full match. partial: the item's partial match (only for items that have one). */
  match: z.enum(['full', 'partial']),
  /** own_experience: part of the person's own experience. mention: someone else's account, or the
   *  detail brought up without claiming it ("unlike that boy, I saw no…"). Only own experience counts
   *  in the main test; mentions belong to the direct measure. */
  kind: z.enum(['own_experience', 'mention']),
  /** The episode it belongs to, from the main pass's list; given exactly for own experience. */
  episodeId: z.string().nullable(),
  /** The person ties it to a book, film, or other work nearby: the work's name as written, or null
   *  when the work is unnamed ("like in the movies"). */
  tiedToWork: obj({ words: CopiedText.nullable(), evidence: z.array(Evidence).min(1) }).nullable(),
  evidence: z.array(Evidence).min(1),
}).superRefine((h, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const item = ITEMS.get(h.itemId);
  if (!item) return issue(`unknown checklist item "${h.itemId}"`);
  if (h.match === 'partial' && !item.hasPartial) issue(`"${h.itemId}" has no partial match`);
  if ((h.kind === 'own_experience') !== (h.episodeId !== null)) issue('episodeId is given exactly for own experience');
});
export type ChecklistHit = z.infer<typeof ChecklistHit>;

/** Every work the person names or compares their experience to, in any genre, on the source list
 *  or off it. Unnamed media count only when compared to ("just like the near-death books I'd
 *  read"); media used figuratively, for how something looked ("my life played like a movie")
 *  are not recorded. */
export const MediaMention = obj({
  /** Title or creator as written; null for unnamed media. */
  words: CopiedText.nullable(),
  medium: z.enum(['book', 'film_or_tv', 'article', 'online', 'painting_or_image', 'music', 'talk_or_conference', 'other', 'not_stated']),
  relation: z.enum(['read_or_seen', 'compares_experience_to', 'other']),
  when: z.enum(['before_experience', 'between_experience_and_telling', 'not_stated']),
  evidence: z.array(Evidence).min(1),
}).refine((m) => m.words !== null || m.relation === 'compares_experience_to', {
  message: 'unnamed media are recorded only when the person compares their experience to them',
});
export type MediaMention = z.infer<typeof MediaMention>;

export const Area4CodedRecord = obj({
  accountId: z.string().min(1),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/), // must match the derived and main coded records
  run: CodingRun,
  /** Every checklist item, in the random order shown for this account. */
  checklistShown: z.array(z.string()),
  /** Empty: no item found. One entry per item and kind, with every passage as evidence. */
  hits: z.array(ChecklistHit),
  media: z.array(MediaMention),
}).superRefine((r, ctx) => {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  const shown = new Set(r.checklistShown);
  if (shown.size !== r.checklistShown.length) issue('each item is shown once', ['checklistShown']);
  const missing = CHECKLIST_ITEMS.filter((i) => !shown.has(i.id)).map((i) => i.id);
  const extra = r.checklistShown.filter((id) => !ITEMS.has(id));
  if (missing.length > 0) issue(`items not shown: ${missing.join(', ')}`, ['checklistShown']);
  if (extra.length > 0) issue(`unknown items shown: ${extra.join(', ')}`, ['checklistShown']);
  const keys = r.hits.map((h) => `${h.itemId}|${h.kind}|${h.episodeId ?? ''}`);
  if (new Set(keys).size !== keys.length) issue('one hit per item, kind, and episode: merge the evidence', ['hits']);
});
export type Area4CodedRecord = z.infer<typeof Area4CodedRecord>;

/** Checks an area 4 record against the main coded record from the same coding run: the same
 *  account and page version, and every hit's episode one of the main record's. Returns the
 *  problems found (empty when consistent). */
export function checkAgainstMain(
  a: Area4CodedRecord,
  main: { accountId: string; sourceSha256: string; episodes: readonly { episodeId: string }[] },
): string[] {
  const problems: string[] = [];
  if (a.accountId !== main.accountId) problems.push('different accounts');
  if (a.sourceSha256 !== main.sourceSha256) problems.push('different page versions (sourceSha256)');
  const episodes = new Set(main.episodes.map((e) => e.episodeId));
  for (const h of a.hits) {
    if (h.episodeId !== null && !episodes.has(h.episodeId)) problems.push(`hit on ${h.itemId} names unknown episode ${h.episodeId}`);
  }
  return problems;
}

// ─── Word-rule counts (rules only) ──────────────────────────────────────────────────────

/** Matches of one word-rule detail in one part, by wordRuleHits: the narrative (raw, as for the
 *  Jesus keywords) and the experiencer's free-text answers. Question wording is never searched. */
export const WordRuleCount = obj({
  detailId: z.string(),
  narrative: Index,
  answers: Index,
});
export type WordRuleCount = z.infer<typeof WordRuleCount>;

export const Area4DerivedPart = obj({
  index: Index,
  /** One entry per word-rule detail, zeros included. */
  wordRules: z.array(WordRuleCount).refine(
    (counts) => counts.length === WORD_RULE_DETAIL_IDS.length && WORD_RULE_DETAIL_IDS.every((id) => counts.some((c) => c.detailId === id)),
    { message: 'one entry per word-rule detail' },
  ),
});
export type Area4DerivedPart = z.infer<typeof Area4DerivedPart>;

export const Area4DerivedRecord = obj({
  accountId: z.string().min(1),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/),
  deriveVersion: z.string(),
  parts: z.array(Area4DerivedPart),
});
export type Area4DerivedRecord = z.infer<typeof Area4DerivedRecord>;
