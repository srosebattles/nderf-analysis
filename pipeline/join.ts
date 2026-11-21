// Joins the main coder's passes A and B into one first-run record per page (DECISIONS.md, How
// the coding runs): pass A's fields and pass B's side by side, with a header saying what coded
// each, every link between them checked. The second model's passes aren't joined; they are
// compared with the main coder's pass by pass.
//
// A page is left out, and listed for a rerun, when either pass has no coded record for it or the
// joined record fails its checks. A page whose pass B found an experience pass A left out is
// joined, flagged, and listed for a pass A rerun.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FirstRunRecord, type PassCoding } from '../schema/first-run.ts';
import type { LogLine } from './run-pass.ts';

export interface Rerun { accountId: string; pass: 'pass-a' | 'pass-b'; reason: string }

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

export function joinFirstRun(dataDir: string, passARunId: string, passBRunId: string): { records: FirstRunRecord[]; reruns: Rerun[] } {
  const a = readRun(dataDir, passARunId);
  const b = readRun(dataDir, passBRunId);
  if (a.manifest.pass !== 'pass-a') throw new Error(`${passARunId} is a ${a.manifest.pass} run, not pass A`);
  if (b.manifest.pass !== 'pass-b') throw new Error(`${passBRunId} is a ${b.manifest.pass} run, not pass B`);
  if (b.manifest.inputs?.episodesFrom !== passARunId) {
    throw new Error(`pass B run ${passBRunId} took its episodes from ${b.manifest.inputs?.episodesFrom ?? 'nowhere'}, not ${passARunId}`);
  }
  const records: FirstRunRecord[] = [];
  const reruns: Rerun[] = [];
  for (const accountId of a.manifest.accounts) {
    const passA = coded(a, accountId);
    const passB = coded(b, accountId);
    if (!passA) {
      reruns.push({ accountId, pass: 'pass-a', reason: 'no coded pass A record' });
      continue;
    }
    if (!passB) {
      reruns.push({ accountId, pass: 'pass-b', reason: 'no coded pass B record' });
      continue;
    }
    const missing = (passB.missingEpisodes as unknown[]).length > 0;
    const candidate = {
      accountId, coding: { passA: coding(a, accountId), passB: coding(b, accountId) }, ...passA, ...passB, needsPassARerun: missing,
    };
    const parsed = FirstRunRecord.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      reruns.push({ accountId, pass: 'pass-b', reason: `the joined record fails its checks: ${first}` });
      continue;
    }
    records.push(parsed.data);
    if (missing) reruns.push({ accountId, pass: 'pass-a', reason: 'pass B found an experience pass A left out' });
  }
  return { records, reruns };
}
