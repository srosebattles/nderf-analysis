// Joins the main coder's passes A, B, and C into one first-run record per page (DECISIONS.md, How
// the coding runs): each pass's fields side by side, with a header saying what coded each, every
// link between them checked. The second model's passes aren't joined; they are compared with the
// main coder's pass by pass.
//
// A page is left out, and listed for a rerun, when a pass has no coded record for it or the
// joined record fails its checks. A page where a later pass found something an earlier pass left
// out (an experience, a being, a Jesus claim) is joined, flagged, and listed for a rerun of the
// earlier pass; every pass after it reruns too, since its links point into the earlier pass.
//
// Each pass can be a list of runs, newest first (a rerun of some pages, then the run it patches;
// runs.ts): each page takes its record from the first run in the list that attempted it, and its
// header names that run.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FirstRunRecord, mentionsWithoutJesusClaim, type PassCoding } from '../schema/first-run.ts';
import type { LogLine } from './run-pass.ts';
import { runIdsOf } from './runs.ts';

export interface Rerun { accountId: string; pass: 'pass-a' | 'pass-b' | 'pass-c'; reason: string }

interface Run {
  id: string;
  manifest: { pass: string; passVersion: string; model: string; effort: string; inputs?: Record<string, string>; accounts: string[] };
  log: Map<string, LogLine>;
  dir: string;
}

function readRun(dataDir: string, runId: string): Run {
  const dir = join(dataDir, 'llm-raw', runId);
  const manifestFile = join(dir, 'run.json');
  if (!existsSync(manifestFile)) throw new Error(`no run ${runId} in ${dataDir}`);
  const logFile = join(dir, 'log.jsonl');
  const lines = existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as LogLine) : [];
  return { id: runId, manifest: JSON.parse(readFileSync(manifestFile, 'utf8')), log: new Map(lines.map((l) => [l.accountId, l])), dir };
}

/** The runs in a list, newest first, all of one pass. */
function readRuns(dataDir: string, list: string, pass: keyof typeof PASS_NAME): Run[] {
  const runs = runIdsOf(list).map((id) => readRun(dataDir, id));
  if (runs.length === 0) throw new Error(`no ${PASS_NAME[pass]} run given`);
  for (const r of runs) if (r.manifest.pass !== pass) throw new Error(`${r.id} is a ${r.manifest.pass} run, not ${PASS_NAME[pass]}`);
  return runs;
}

/** The run in a list that answers for a page: the first that attempted it. */
const runFor = (runs: Run[], accountId: string): Run | null => runs.find((r) => r.log.has(accountId)) ?? null;

function coding(run: Run, accountId: string): PassCoding {
  const line = run.log.get(accountId)!;
  return {
    runId: run.id, passVersion: run.manifest.passVersion, model: run.manifest.model, effort: run.manifest.effort,
    claudeCodeVersion: line.claudeCodeVersion ?? 'not recorded', truncated: line.truncated ?? [],
  };
}

const coded = (run: Run, accountId: string): Record<string, unknown> | null => {
  const file = join(run.dir, `${accountId}.coded.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
};

const PASS_NAME = { 'pass-a': 'pass A', 'pass-b': 'pass B', 'pass-c': 'pass C' } as const;

/** Pass C's fields, whose two lists of what was missing sit apart from pass B's in the record. */
const PASS_C_LISTS = new Set(['doctrinalStatements', 'jesusMentions', 'passCMissing']);

export function joinFirstRun(dataDir: string, passARunId: string, passBRunId: string, passCRunId: string): { records: FirstRunRecord[]; reruns: Rerun[] } {
  const as = readRuns(dataDir, passARunId, 'pass-a');
  const bs = readRuns(dataDir, passBRunId, 'pass-b');
  const cs = readRuns(dataDir, passCRunId, 'pass-c');
  for (const b of bs) {
    if (b.manifest.inputs?.episodesFrom !== passARunId) {
      throw new Error(`pass B run ${b.id} took its episodes from ${b.manifest.inputs?.episodesFrom ?? 'nowhere'}, not ${passARunId}`);
    }
  }
  for (const c of cs) {
    if (c.manifest.inputs?.episodesFrom !== passARunId || c.manifest.inputs?.encountersFrom !== passBRunId) {
      throw new Error(`pass C run ${c.id} took its episodes and encounters from ${c.manifest.inputs?.episodesFrom ?? 'nowhere'} and ${c.manifest.inputs?.encountersFrom ?? 'nowhere'}, not ${passARunId} and ${passBRunId}`);
    }
  }
  const records: FirstRunRecord[] = [];
  const reruns: Rerun[] = [];
  // Every page any pass A run was given, the oldest run's order first.
  const accounts = [...new Set([...as].reverse().flatMap((r) => r.manifest.accounts))];
  for (const accountId of accounts) {
    const a = runFor(as, accountId);
    const b = runFor(bs, accountId);
    const c = runFor(cs, accountId);
    const passA = a && coded(a, accountId);
    const passB = b && coded(b, accountId);
    const passC = c && coded(c, accountId);
    const absent = !passA ? 'pass-a' : !passB ? 'pass-b' : !passC ? 'pass-c' : null;
    if (absent || !a || !b || !c || !passA || !passB || !passC) {
      const pass = absent ?? 'pass-a';
      reruns.push({ accountId, pass, reason: `no coded ${PASS_NAME[pass]} record` });
      continue;
    }
    const { missingEncounters, missingEpisodes: missingForC, ...passCFields } = passC as Record<string, unknown[]>;
    const missingForB = (passB.missingEpisodes as unknown[]).length > 0;
    const unclaimed = mentionsWithoutJesusClaim({ encounters: passB.encounters as never, jesusMentions: passCFields.jesusMentions as never });
    const candidate = {
      accountId,
      coding: { passA: coding(a, accountId), passB: coding(b, accountId), passC: coding(c, accountId) },
      ...passA, ...passB, ...passCFields,
      passCMissing: { encounters: missingEncounters, episodes: missingForC },
      needsPassARerun: missingForB || missingForC.length > 0,
      needsPassBRerun: missingEncounters.length > 0 || unclaimed.length > 0,
    };
    const parsed = FirstRunRecord.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      const ofC = parsed.error.issues.every((i) => PASS_C_LISTS.has(String(i.path[0])) || i.message.startsWith('pass C:'));
      reruns.push({ accountId, pass: ofC ? 'pass-c' : 'pass-b', reason: `the joined record fails its checks: ${first}` });
      continue;
    }
    records.push(parsed.data);
    if (missingForB) reruns.push({ accountId, pass: 'pass-a', reason: 'pass B found an experience pass A left out' });
    if (missingForC.length > 0) reruns.push({ accountId, pass: 'pass-a', reason: 'pass C found an experience pass A left out' });
    if (missingEncounters.length > 0) reruns.push({ accountId, pass: 'pass-b', reason: 'pass C found a being pass B left out' });
    if (unclaimed.length > 0) reruns.push({ accountId, pass: 'pass-b', reason: 'pass C calls a being Jesus that pass B gave no Jesus claim' });
  }
  return { records, reruns };
}
