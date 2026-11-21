// Pass C of the first run (DECISIONS.md, "How the coding runs"): doctrinal statements and every
// mention of Jesus. Both coding models are given the main coder's pass A episodes and pass B
// encounters, so agreement isn't muddied by episodes or encounters split differently, and the
// joined record has one list of each. Each encounter is shown with its label and the categories
// of its identity claims, so the coder can link a title such as "the Lord" to the right being and
// knows which encounters carry a Jesus claim, each of which needs a linked mention.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ScrapedAccount } from '../derive/input.ts';
import { PassC, wireJsonSchema } from '../schema/first-run.ts';
import { locateQuotes } from './locate.ts';
import { episodesFrom, renderEpisodes } from './pass-b.ts';
import type { PassDefinition } from './run-pass.ts';

const prompt = (name: string) => readFileSync(new URL(`../prompts/${name}`, import.meta.url), 'utf8');

/** The shared conventions, then the pass's own instructions, sent unchanged. */
export const PASS_C_PROMPT = `${prompt('common.md').trim()}\n\n${prompt('pass-c.md').trim()}\n`;

interface EpisodeRef { episodeId: string; label: string }
export interface EncounterRef { encounterId: string; label: string; categories: string[] }

/** The encounters a pass B run coded for an account, or null when it coded none for it. */
export function encountersFrom(dataDir: string, runId: string, accountId: string): EncounterRef[] | null {
  const file = join(dataDir, 'llm-raw', runId, `${accountId}.coded.json`);
  if (!existsSync(file)) return null;
  const coded = JSON.parse(readFileSync(file, 'utf8')) as { encounters: { encounterId: string; label: string; identity: { category: string }[] }[] };
  return coded.encounters.map((e) => ({ encounterId: e.encounterId, label: e.label, categories: [...new Set(e.identity.map((c) => c.category))] }));
}

/** The encounter list as the coder sees it, under the neutral key. */
export function renderEncounters(encounters: readonly EncounterRef[], accountId: string, key: string): string {
  const lines = encounters.map((e) => `${key}${e.encounterId.slice(accountId.length)}: ${e.label} [${e.categories.join(', ')}]`);
  return `=== ENCOUNTERS (from an earlier pass: each being's ID, a label, and [who it was taken to be]) ===\n${lines.length ? lines.join('\n') : '(none)'}\n`;
}

/** Checks only the earlier passes' lists can answer: statements and mentions link to listed
 *  episodes and encounters, and every encounter with a Jesus claim has an affirmative mention of
 *  kind encounter linked to it. (Pass C's schema checks that a linked encounter is in the same
 *  episode, from its ID.) Then quotes become offsets. */
export function preparePassC(
  answer: unknown, account: ScrapedAccount, episodes: readonly EpisodeRef[], encounters: readonly EncounterRef[],
): { value: unknown; problems: string[] } {
  const problems: string[] = [];
  const episodeIds = new Set(episodes.map((e) => e.episodeId));
  const encounterIds = new Set(encounters.map((e) => e.encounterId));
  const a = answer as {
    doctrinalStatements?: { episodeId?: string | null; encounterId?: string | null }[];
    jesusMentions?: { kind?: string; refersTo?: string; polarity?: string; episodeId?: string | null; encounterId?: string | null }[];
    missingEncounters?: { episodeId?: string }[];
  };
  const episodeOk = (id: unknown, path: string) => {
    if (typeof id === 'string' && !episodeIds.has(id)) problems.push(`${path}: ${id} isn't one of the episodes listed; use one of them, or record the experience in missingEpisodes and leave this entry out`);
  };
  const encounterOk = (id: unknown, path: string) => {
    if (typeof id === 'string' && !encounterIds.has(id)) problems.push(`${path}: ${id} isn't one of the encounters listed; use one of them, or record the being in missingEncounters and leave this entry out`);
  };
  (a.doctrinalStatements ?? []).forEach((d, i) => {
    episodeOk(d.episodeId, `doctrinalStatements.${i}.episodeId`);
    encounterOk(d.encounterId, `doctrinalStatements.${i}.encounterId`);
  });
  (a.jesusMentions ?? []).forEach((m, i) => {
    episodeOk(m.episodeId, `jesusMentions.${i}.episodeId`);
    encounterOk(m.encounterId, `jesusMentions.${i}.encounterId`);
  });
  (a.missingEncounters ?? []).forEach((m, i) => episodeOk(m.episodeId, `missingEncounters.${i}.episodeId`));
  for (const e of encounters) {
    if (!e.categories.includes('jesus')) continue;
    const linked = (a.jesusMentions ?? []).some((m) => m.kind === 'encounter' && m.encounterId === e.encounterId && m.refersTo === 'jesus' && m.polarity === 'affirmative');
    if (!linked) problems.push(`jesusMentions: encounter ${e.encounterId} is listed as jesus, so it needs a mention of kind encounter, refersTo jesus, affirmative, linked to it`);
    const unsure = (a.jesusMentions ?? []).findIndex((m) => m.kind === 'encounter' && m.encounterId === e.encounterId && m.polarity !== 'affirmative');
    if (unsure >= 0) problems.push(`jesusMentions.${unsure}.polarity: encounter ${e.encounterId} is listed as jesus, so its mention is affirmative; the earlier pass's claim records any doubt`);
  }
  const located = locateQuotes(answer, account);
  return { value: located.value, problems: [...problems, ...located.problems] };
}

/** The pass B run must have coded its encounters in the same pass A run's episodes. */
function checkInputs(dataDir: string, episodesRunId: string, encountersRunId: string): void {
  const manifest = join(dataDir, 'llm-raw', encountersRunId, 'run.json');
  if (!existsSync(manifest)) throw new Error(`no run ${encountersRunId} in ${dataDir}`);
  const held = JSON.parse(readFileSync(manifest, 'utf8')) as { pass: string; inputs?: Record<string, string> };
  if (held.pass !== 'pass-b') throw new Error(`${encountersRunId} is a ${held.pass} run, not pass B`);
  if (held.inputs?.episodesFrom !== episodesRunId) {
    throw new Error(`pass B run ${encountersRunId} took its episodes from ${held.inputs?.episodesFrom ?? 'nowhere'}, not ${episodesRunId}`);
  }
}

/** Pass C, given the pass A run whose episodes, and the pass B run whose encounters, it links to. */
export function passC(dataDir: string, episodesRunId: string, encountersRunId: string): PassDefinition<PassC> {
  let checked = false;
  const lists = (account: ScrapedAccount) => {
    if (!checked) {
      checkInputs(dataDir, episodesRunId, encountersRunId);
      checked = true;
    }
    const episodes = episodesFrom(dataDir, episodesRunId, account.id);
    if (!episodes) throw new Error(`pass A run ${episodesRunId} has no coded record for ${account.id}`);
    const encounters = encountersFrom(dataDir, encountersRunId, account.id);
    if (!encounters) throw new Error(`pass B run ${encountersRunId} has no coded record for ${account.id}`);
    return { episodes, encounters };
  };
  return {
    id: 'pass-c',
    version: '0.1-draft',
    systemPrompt: PASS_C_PROMPT,
    schema: PassC,
    jsonSchema: wireJsonSchema(PassC),
    context: (account, key) => {
      const { episodes, encounters } = lists(account);
      return `${renderEpisodes(episodes, account.id, key)}\n${renderEncounters(encounters, account.id, key)}`;
    },
    inputs: { episodesFrom: episodesRunId, encountersFrom: encountersRunId },
    prepare: (answer, account) => {
      const { episodes, encounters } = lists(account);
      return preparePassC(answer, account, episodes, encounters);
    },
  };
}
