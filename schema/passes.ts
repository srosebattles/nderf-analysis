// Which fields of the main coded record wait for a later pass (DECISIONS.md, "What the first run
// codes, and what waits"). The schema in codebook-schema.ts is everything the project wants to
// know; the first run codes what the main question, the Jesus ladder, and area 4 read, and
// anything else that needs every account. What waits is detail that can be coded on only the
// accounts the first run flags. Every field not listed here belongs to the first run. Nothing is removed from the schema: a
// later pass fills its fields in on the encounters and episodes the first run recorded.
//
// Paths are into CodedRecord: `encounters[].vital.timeSinceDeath` is that field on every
// encounter. A listed path covers everything beneath it.

import { z } from 'zod';
import { CodedRecord } from './codebook-schema.ts';

export interface LaterPass {
  id: string;
  label: string;
  /** Which accounts the pass runs on, in words. Every later pass runs only on accounts the first
   *  run flags, and an account is flagged when either coding model's first run flags it. A pass
   *  that would need every account belongs in the first run instead. */
  runsOn: string;
  /** The fields this pass owns. No field is owned by two passes. */
  fields: readonly string[];
  /** Fields another later pass owns, which this pass also codes for its own accounts because its
   *  computed views read them. The owning pass, when it runs, leaves those as coded. */
  alsoCodes: readonly string[];
}

export const LATER_PASSES: readonly LaterPass[] = [
  {
    id: 'marian',
    label: 'Mary in detail',
    runsOn: 'An encounter with a Mary claim, or an unidentified female being who is part of the experience.',
    fields: ['encounters[].confessionalContent', 'encounters[].maternalLanguage'],
    // Mary's levels (resolve-area3.ts) also read whether she interacts and whether a rosary or scapular is seen.
    alsoCodes: ['encounters[].actions', 'encounters[].communication', 'encounters[].visualDetails'],
  },
  {
    id: 'appearance',
    label: 'What beings look like',
    runsOn: 'Any encounter.',
    fields: ['encounters[].representation', 'encounters[].visualDetails', 'encounters[].places'],
    alsoCodes: [],
  },
  {
    id: 'people',
    label: 'People in detail',
    runsOn: 'An encounter with a person known in life, a relative never met, a child not yet born, or an animal.',
    fields: [
      'encounters[].vital.deathLearned', 'encounters[].vital.diedSoonAfter', 'encounters[].vital.futureChild',
      'encounters[].vital.timeSinceDeath', 'encounters[].vital.apparentAge', 'encounters[].vital.apparentCondition',
      'encounters[].livingPersonExplanation', 'encounters[].animal',
      'encounters[].identity[].tie.friendTypes', 'encounters[].identity[].tie.closeness',
    ],
    alsoCodes: [],
  },
  {
    id: 'conduct',
    label: 'What beings do',
    runsOn: 'Any encounter.',
    fields: [
      'encounters[].disposition', 'encounters[].actions', 'encounters[].christSpecificContent',
      'encounters[].communication', 'encounters[].response', 'encounters[].deniedAsBeing', 'encounters[].deniedIdentities',
    ],
    alsoCodes: [],
  },
  {
    id: 'hostile_and_distress',
    label: 'Hostile beings and distress',
    runsOn: 'An encounter with a hostile-being claim, or an episode whose tone is distressing or mixed.',
    fields: ['encounters[].hostileIconography', 'encounters[].invocation', 'episodes[].distressingContent'],
    // The invocation rule reads disposition.
    alsoCodes: ['encounters[].disposition'],
  },
];

/** The later pass that owns a field, or null when the first run codes it. A path beneath a listed
 *  field belongs to that field's pass. */
export function laterPassOf(path: string): string | null {
  const owner = LATER_PASSES.find((p) => p.fields.some((f) => path === f || path.startsWith(`${f}.`) || path.startsWith(`${f}[]`)));
  return owner?.id ?? null;
}

/** The schema at a path into `root`, or null when the path names nothing: a typo here would
 *  otherwise leave a field in the first run by accident. */
export function schemaAt(path: string, root: z.ZodType = CodedRecord): z.ZodType | null {
  const unwrap = (s: z.ZodType): z.ZodType =>
    s instanceof z.ZodNullable || s instanceof z.ZodOptional ? unwrap(s.unwrap() as z.ZodType) : s;
  let at: z.ZodType = root;
  for (const segment of path.split('.')) {
    const list = segment.endsWith('[]');
    const key = list ? segment.slice(0, -2) : segment;
    const here = unwrap(at);
    if (!(here instanceof z.ZodObject) || !(key in here.shape)) return null;
    at = here.shape[key] as z.ZodType;
    if (list) {
      const array = unwrap(at);
      if (!(array instanceof z.ZodArray)) return null;
      at = array.element as z.ZodType;
    }
  }
  return at;
}
