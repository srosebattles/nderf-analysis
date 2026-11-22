import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { codedFrom, runIdsOf } from './runs.ts';

// Invented runs of invented accounts.
test('a list of runs: each page from the newest run that attempted it, never past a failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runs-'));
  try {
    const run = (id: string, attempted: string[], coded: string[]) => {
      mkdirSync(join(dir, 'llm-raw', id), { recursive: true });
      writeFileSync(join(dir, 'llm-raw', id, 'log.jsonl'), attempted.map((a) => JSON.stringify({ accountId: a })).join('\n') + '\n');
      for (const a of coded) writeFileSync(join(dir, 'llm-raw', id, `${a}.coded.json`), JSON.stringify({ from: id }));
    };
    run('a1', ['p1', 'p2', 'p3'], ['p1', 'p2', 'p3']);
    run('a2', ['p2', 'p3'], ['p2']);
    assert.deepEqual(runIdsOf(' a2, a1 '), ['a2', 'a1']);
    assert.deepEqual(codedFrom(dir, 'a2,a1', 'p1'), { runId: 'a1', coded: { from: 'a1' } });
    assert.deepEqual(codedFrom(dir, 'a2,a1', 'p2'), { runId: 'a2', coded: { from: 'a2' } });
    assert.deepEqual(codedFrom(dir, 'a2,a1', 'p3'), { runId: 'a2', coded: null }); // the rerun failed: no fallback
    assert.equal(codedFrom(dir, 'a2', 'p1'), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
