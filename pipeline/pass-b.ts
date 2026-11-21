// Pass B of the first run (DECISIONS.md, "How the coding runs"): the encounters, as a census,
// in the episodes pass A found. Both coding models are given the main coder's pass A episodes, so
// that encounter agreement isn't muddied by episodes split differently, and the joined record has
// one episode list.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ScrapedAccount } from '../derive/input.ts';
import { PassB, wireJsonSchema } from '../schema/first-run.ts';
import { NAMED_FIGURES } from '../schema/tables/named-figures.ts';
import { locateQuotes } from './locate.ts';
import type { PassDefinition } from './run-pass.ts';

const prompt = (name: string) => readFileSync(new URL(`../prompts/${name}`, import.meta.url), 'utf8');

/** The canonical names the coder uses for named figures, angels, and hostile beings, from the
 *  pre-registered table: names only, never subcategories or homes (DECISIONS.md, Named figures). */
export function canonicalNameList(): string {
  const names = (kind: string) => NAMED_FIGURES.filter((e) => e.kind === kind).map((e) => e.canonicalName).join('; ');
  return [
    '## Canonical names',
    '',
    'The standard spelling of each public figure, angel, and hostile being in the table. Use it, exactly as given here, for any being on this list.',
    '',
    `Figures: ${names('figure')}.`,
    '',
    `Angels: ${names('angel')}.`,
    '',
    `Hostile beings: ${names('hostile_being')}.`,
  ].join('\n');
}

/** The shared conventions, the pass's own instructions, then the canonical names, sent unchanged. */
export const PASS_B_PROMPT = `${prompt('common.md').trim()}\n\n${prompt('pass-b.md').trim()}\n\n${canonicalNameList()}\n`;

interface EpisodeRef { episodeId: string; label: string }

/** The episodes a pass A run coded for an account, or null when it coded none for it. */
export function episodesFrom(dataDir: string, runId: string, accountId: string): EpisodeRef[] | null {
  const file = join(dataDir, 'llm-raw', runId, `${accountId}.coded.json`);
  if (!existsSync(file)) return null;
  const coded = JSON.parse(readFileSync(file, 'utf8')) as { episodes: EpisodeRef[] };
  return coded.episodes.map(({ episodeId, label }) => ({ episodeId, label }));
}

/** The episode list as the coder sees it, under the neutral key. */
export function renderEpisodes(episodes: readonly EpisodeRef[], accountId: string, key: string): string {
  const lines = episodes.map((e) => `${key}${e.episodeId.slice(accountId.length)}: ${e.label}`);
  return `=== EPISODES (from an earlier pass) ===\n${lines.length ? lines.join('\n') : '(none)'}\n`;
}

/** Checks only the account can answer: every encounter in one of pass A's episodes. Then quotes
 *  become offsets. */
export function preparePassB(answer: unknown, account: ScrapedAccount, episodes: readonly EpisodeRef[]): { value: unknown; problems: string[] } {
  const problems: string[] = [];
  const known = new Set(episodes.map((e) => e.episodeId));
  const a = answer as { encounters?: { episodeId?: string }[] };
  (a.encounters ?? []).forEach((e, i) => {
    if (typeof e.episodeId === 'string' && !known.has(e.episodeId)) {
      problems.push(`encounters.${i}.episodeId: ${e.episodeId} isn't one of the episodes listed; use one of them, or record the experience in missingEpisodes`);
    }
  });
  const located = locateQuotes(answer, account);
  return { value: located.value, problems: [...problems, ...located.problems] };
}

/** Pass B, given the pass A run whose episodes it codes encounters in. */
export function passB(dataDir: string, episodesRunId: string): PassDefinition<PassB> {
  const episodes = (account: ScrapedAccount) => {
    const found = episodesFrom(dataDir, episodesRunId, account.id);
    if (!found) throw new Error(`pass A run ${episodesRunId} has no coded record for ${account.id}`);
    return found;
  };
  return {
    id: 'pass-b',
    version: '0.2-draft',
    systemPrompt: PASS_B_PROMPT,
    schema: PassB,
    jsonSchema: wireJsonSchema(PassB),
    context: (account, key) => renderEpisodes(episodes(account), account.id, key),
    inputs: { episodesFrom: episodesRunId },
    prepare: (answer, account) => preparePassB(answer, account, episodes(account)),
  };
}
