// Reads the private data repository: the scraper's parsed accounts and the search site's raw
// listing. Nothing here interprets them.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ScrapedAccount, SearchEntry } from './input.ts';

export function readAccounts(dataDir: string): ScrapedAccount[] {
  const dir = join(dataDir, 'accounts');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .flatMap((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter((line) => line.trim() !== '').map((line) => JSON.parse(line) as ScrapedAccount));
}

/** The search site's listing as the crawler saved it, page by page. */
export function readSearchListing(dataDir: string): SearchEntry[] {
  const dir = join(dataDir, 'raw', 'search.nderf.org', 'api', 'listing');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => (JSON.parse(readFileSync(join(dir, f), 'utf8')) as { results?: SearchEntry[] }).results ?? []);
}
