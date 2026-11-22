// A pass's output can come from more than one run: a rerun of some pages, then the run it patches.
// Later passes and the join take such a list as comma-separated run IDs, newest first ("a3,a2"),
// and for each page use the first run in the list that attempted it. A page a run attempted and
// failed has no record from the list, even if an older run coded it: the older record was coded
// on another prompt, and falling back to it would hide the failure.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The run IDs in a list, newest first. */
export const runIdsOf = (list: string): string[] => list.split(',').map((id) => id.trim()).filter(Boolean);

/** The pages a run attempted, from its log. */
function attempted(dataDir: string, runId: string): Set<string> {
  const log = join(dataDir, 'llm-raw', runId, 'log.jsonl');
  if (!existsSync(log)) return new Set();
  return new Set(readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as { accountId: string }).accountId));
}

/** The run in a list that answers for a page, and its coded record (null when that run attempted
 *  the page and failed), or null when no run in the list attempted it. */
export function codedFrom(dataDir: string, list: string, accountId: string): { runId: string; coded: unknown } | null {
  for (const runId of runIdsOf(list)) {
    const file = join(dataDir, 'llm-raw', runId, `${accountId}.coded.json`);
    if (existsSync(file)) return { runId, coded: JSON.parse(readFileSync(file, 'utf8')) };
    if (attempted(dataDir, runId).has(accountId)) return { runId, coded: null };
  }
  return null;
}
