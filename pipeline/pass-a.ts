// Pass A of the first run (DECISIONS.md, "How the coding runs"): parts and episodes,
// eligibility, text that isn't the experiencer's, country and language in the text, religion
// and heritage, conditions, provenance, and a longing to return.

import { readFileSync } from 'node:fs';
import type { ScrapedAccount } from '../derive/input.ts';
import { PassA, wireJsonSchema } from '../schema/first-run.ts';
import { locateQuotes } from './locate.ts';
import type { PassDefinition } from './run-pass.ts';

const prompt = (name: string) => readFileSync(new URL(`../prompts/${name}`, import.meta.url), 'utf8');

/** The shared conventions, then the pass's own instructions, sent unchanged. */
export const PASS_A_PROMPT = `${prompt('common.md').trim()}\n\n${prompt('pass-a.md').trim()}\n`;

/** Checks only the account can answer: every part coded once, and episode IDs that begin with
 *  this account's ID. Then quotes become offsets. */
export function preparePassA(answer: unknown, account: ScrapedAccount): { value: unknown; problems: string[] } {
  const problems: string[] = [];
  const a = answer as { parts?: { index?: number }[]; episodes?: { episodeId?: string }[] };
  const coded = (a.parts ?? []).map((p) => p.index).sort();
  const expected = account.parts.map((_, i) => i);
  if (JSON.stringify(coded) !== JSON.stringify(expected)) problems.push(`parts: the account has ${account.parts.length} part(s), numbered from 0; give one entry for each`);
  for (const e of a.episodes ?? []) {
    if (typeof e.episodeId === 'string' && !e.episodeId.startsWith(`${account.id}#`)) problems.push(`episodes: ${e.episodeId} must begin with the account key and "#"`);
  }
  const located = locateQuotes(answer, account);
  return { value: located.value, problems: [...problems, ...located.problems] };
}

export const PASS_A: PassDefinition<PassA> = {
  id: 'pass-a',
  version: '0.2-draft',
  systemPrompt: PASS_A_PROMPT,
  schema: PassA,
  jsonSchema: wireJsonSchema(PassA),
  prepare: preparePassA,
};
