// A probe, not a coding pass: a small, real slice of the schema (area 2's religion and heritage
// statements), with a short draft prompt, for measuring what running in-session costs in time
// and plan usage, and how well structured output holds a real piece of the schema. Its prompt
// is not the pre-registered one, and nothing it codes is kept as data.

import { z } from 'zod';
import { Background } from '../schema/codebook-schema.ts';
import type { PassDefinition } from './run-pass.ts';

export const PROBE_RELIGION: PassDefinition<z.infer<typeof Background>> = {
  id: 'probe-religion',
  version: '0.1-probe',
  schema: Background,
  jsonSchema: z.toJSONSchema(Background, { unrepresentable: 'any' }),
  systemPrompt: [
    'You code near-death experience accounts for a research project. The account below is labeled by',
    'place: narrative:<part> for a narrative, qa:<part>:<item> for a questionnaire item. Record only',
    "explicit statements about the experiencer's own religion (religionStatements) and their own",
    'ethnicity, race, ancestry, or national origin (heritageStatements). Rules:',
    '- Explicit only. Never infer religion from what was seen, from country or heritage, from vocabulary',
    '  such as "Allah", or from practices such as Mass or the rosary. Attending a named church counts.',
    '- Statements about the household the person was raised in are upbringing. Statements about other',
    '  individuals are not coded.',
    '- Christian means Trinitarian. Latter-day Saints and Jehovah\'s Witnesses have their own families.',
    '- Copied words ("term") are at most six words, copied exactly.',
    '- context is explaining_experience when the statement is offered to explain something in the',
    '  experience, wherever it appears.',
    '- Evidence: source.kind narrative with part, or qa with part and qaIndex, as the labels give them.',
    '  basis is explicit. Leave span out.',
    "- The account's key is on its first line; use it wherever an ID begins with the account."
  ].join('\n'),
};
