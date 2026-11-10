// What the coder sees for one account: only what the experiencer wrote, with NDERF's question
// wording so answers make sense (DECISIONS.md, Conventions). Never NDERF's classification, tags,
// summary, posting dates, or the account ID, which carries NDERF's classification in its name
// ("…_probable_nde"). The coder gets a neutral key instead, and the runner maps it back.
//
// Every passage is labeled with the place the schema's evidence points to (`narrative:<part>`,
// `qa:<part>:<qaIndex>`), so a quote can be located afterward.

import type { ScrapedAccount } from '../derive/input.ts';

export interface CoderInput {
  /** The neutral key the coder uses in place of the account ID (in episode IDs and the like). */
  key: string;
  text: string;
}

const tidy = (s: string) => s.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

export function renderForCoder(account: ScrapedAccount, key: string): CoderInput {
  const blocks: string[] = [`ACCOUNT ${key}`];
  account.parts.forEach((part, p) => {
    if (account.parts.length > 1) blocks.push(`=== PART ${p} ===`);
    blocks.push(`--- narrative:${p} ---\n${tidy(part.narrative) || '(no narrative)'}`);
    part.qa.forEach((q, i) => {
      blocks.push(`--- qa:${p}:${i} ---\nQ: ${tidy(q.question)}\nA: ${tidy(q.response) || '(blank)'}`);
    });
  });
  return { key, text: blocks.join('\n\n') + '\n' };
}

/** A neutral key for an account's position in a run: A0001, A0002, … */
export const neutralKey = (position: number) => `A${String(position + 1).padStart(4, '0')}`;

/** Puts the account ID back wherever the coder used the neutral key at the start of an ID
 *  ("A0007#1" -> "1example_x_nde#1"). Only whole strings that are the key or start with it
 *  followed by "#" or "/" are changed. */
export function restoreAccountId<T>(value: T, key: string, accountId: string): T {
  const fix = (v: unknown): unknown => {
    if (typeof v === 'string') return v === key ? accountId : /^[#/]/.test(v.slice(key.length)) && v.startsWith(key) ? accountId + v.slice(key.length) : v;
    if (Array.isArray(v)) return v.map(fix);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x)]));
    return v;
  };
  return fix(value) as T;
}
