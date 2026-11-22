// Pre-registered rules that resolve area 2's religion, prior and now, from the derived record's
// menu answers and the coded religion statements. Nothing here is coded by the LLM; the
// definitions are in DECISIONS.md, area 2 ("Resolving religion").

import {
  type CodedPart, type DerivedPart, type Episode, type ReligionFieldValue, type ReligionStatement, ResolvedReligion,
  type Tradition,
} from './codebook-schema.ts';
import { anchorEpisodeId, anchorPartIndex, type DerivedEpisodeInput, type EpisodeRuleInput, type ResolvedEpisodes } from './resolve-area1.ts';

export const AREA2_RULE_VERSION = '0.1';

/** What the religion rules read from the coded record (full or first-run). */
export interface ReligionRuleInput {
  accountId: string;
  parts: readonly CodedPart[];
  episodes: readonly (EpisodeRuleInput['episodes'][number] & Pick<Episode, 'child'>)[];
  background: { religionStatements: readonly ReligionStatement[] };
}

/** What the religion rules read from the derived record. */
export interface DerivedReligionInput {
  accountId: string;
  parts: readonly (Pick<DerivedPart, 'index' | 'religionField'> & DerivedEpisodeInput['parts'][number])[];
}

export interface ReligionOptions {
  /** Leave out statements offered to explain the experience: the sensitivity analysis. */
  withoutEncounterPrompted?: boolean;
  ruleVersion?: string;
}

/** Families of Christian and non-Trinitarian churches: two different ones can't both hold. */
const CHURCHES: readonly Tradition['family'][] = ['catholic', 'orthodox', 'protestant', 'latter_day_saints', 'jehovahs_witnesses', 'other_nontrinitarian'];

const same = (a: Tradition, b: Tradition) => JSON.stringify(a) === JSON.stringify(b);
const kindOf = (t: Tradition) => (t.family === 'unaffiliated' ? t.kind : null);
const protestantFamilyOf = (t: Tradition) => (t.family === 'protestant' ? t.protestantFamily : null);

/** `b` names a more specific version of `a`: a church for "Other Christian" (or a bare
 *  "Christian"), a Protestant family for an unspecified Protestant, a kind of no religion for an
 *  unspecified one. */
function narrows(a: Tradition, b: Tradition): boolean {
  if (a.family === 'christian_unspecified') return CHURCHES.includes(b.family);
  if (a.family === 'protestant' && b.family === 'protestant') return a.protestantFamily === 'unspecified' && b.protestantFamily !== 'unspecified';
  if (a.family === 'unaffiliated' && b.family === 'unaffiliated') return a.kind === null && b.kind !== null;
  return false;
}

/** Both can't be true of one person at one time (DECISIONS.md, area 2): no religion against a
 *  religion; two different churches; two different kinds of no religion. */
export function conflicts(a: Tradition, b: Tradition): boolean {
  if ((a.family === 'unaffiliated') !== (b.family === 'unaffiliated')) return true;
  if (a.family === 'unaffiliated') return kindOf(a) !== null && kindOf(b) !== null && kindOf(a) !== kindOf(b);
  if (CHURCHES.includes(a.family) && CHURCHES.includes(b.family)) {
    if (a.family !== b.family) return true;
    const pa = protestantFamilyOf(a), pb = protestantFamilyOf(b);
    return pa !== null && pb !== null && pa !== 'unspecified' && pb !== 'unspecified' && pa !== pb;
  }
  return false;
}

/** Attendance sets an affiliation only when it names a church or group: a bare "church" doesn't. */
const counts = (s: ReligionStatement) => s.kind !== 'attendance' || s.traditions.some((t) => t.family !== 'christian_unspecified');

type Affiliation = ResolvedReligion['prior'];

/** Combines traditions that speak for one time: a more specific one replaces a broad one, a bare
 *  "Christian" never overrides a named church, others are added. Null when two conflict. */
function combine(traditions: readonly Tradition[]): Tradition[] | null {
  const out: Tradition[] = [];
  for (const t of traditions) {
    if (out.some((o) => conflicts(o, t))) return null;
    const broader = out.findIndex((o) => narrows(o, t));
    if (broader >= 0) out[broader] = t;
    else if (!out.some((o) => same(o, t) || narrows(t, o))) out.push(t);
  }
  return out;
}

/** The practice stated with the resolved traditions, when the statements agree on one. */
function practiceOf(used: readonly ReligionStatement[]): Affiliation['practice'] {
  const values = [...new Set(used.map((s) => s.practice).filter((p) => p !== null))];
  return values.length === 1 ? values[0] : null;
}

function resolveAffiliation(menu: ReligionFieldValue | null, atTime: readonly ReligionStatement[], fallback: readonly ReligionStatement[]): Affiliation {
  const left = atTime.some((s) => s.kind === 'left');
  const held = atTime.filter((s) => s.kind !== 'left');
  const prompted = (used: readonly ReligionStatement[]) => used.some((s) => s.context === 'explaining_experience');
  const informative = menu?.format === 'menu' && menu.tradition !== null ? menu.tradition : null;

  if (informative) {
    // The menu wins. Statements about the same time add a tradition, make the menu's more
    // specific, or conflict with it (flagged); a bare "Christian" never overrides it.
    let traditions: Tradition[] = [informative];
    let conflict = false;
    const used: ReligionStatement[] = [];
    const changed: ReligionStatement[] = [];
    for (const s of held) {
      for (const t of s.traditions) {
        if (conflicts(informative, t)) { conflict = true; continue; }
        used.push(s);
        const next = combine([...traditions, t]);
        if (next === null) { conflict = true; continue; }
        if (JSON.stringify(next) !== JSON.stringify(traditions)) changed.push(s);
        traditions = next;
      }
    }
    return { status: 'resolved', traditions, basis: 'menu', practice: practiceOf(used), conflict, usesEncounterPromptedStatement: prompted(changed) };
  }

  const fromStatements = (statements: readonly ReligionStatement[], basis: Affiliation['basis']): Affiliation | null => {
    if (statements.length === 0) return null;
    const traditions = combine(statements.flatMap((s) => s.traditions));
    if (traditions === null) return { status: 'unknown', traditions: [], basis: null, practice: null, conflict: true, usesEncounterPromptedStatement: prompted(statements) };
    return { status: 'resolved', traditions, basis, practice: practiceOf(statements), conflict: false, usesEncounterPromptedStatement: prompted(statements) };
  };
  const statementBasis = held.every((s) => s.source === 'religion_field_text') ? 'religion_field_text' : 'explicit_statement';
  const resolved = fromStatements(held, statementBasis) ?? (left ? null : fromStatements(fallback, 'upbringing'));
  if (resolved) return resolved;
  const status = menu?.format === 'menu' && (menu.option === 'do_not_know' || menu.option === 'no_comment') ? menu.option : 'unknown';
  return { status, traditions: [], basis: null, practice: null, conflict: false, usesEncounterPromptedStatement: false };
}

/** Prior religion as of the first qualifying episode (on a page with none, the first comparison
 *  episode, else the first episode), and religion now. */
export function resolveReligion(
  coded: ReligionRuleInput, derived: DerivedReligionInput, episodes: ResolvedEpisodes, opts: ReligionOptions = {},
): ResolvedReligion {
  if (derived.accountId !== coded.accountId) throw new Error('derived and coded records are for different accounts');
  const anchorId = anchorEpisodeId(coded, derived, episodes);
  const anchor = coded.episodes.find((e) => e.episodeId === anchorId);
  const part = anchorPartIndex(coded, anchorId);
  const fields = derived.parts.find((p) => p.index === part)?.religionField;
  const menuOf = (f: NonNullable<typeof fields>['prior'] | undefined) => (f?.status === 'present' ? f.value : null);

  const statements = coded.background.religionStatements
    .filter((s) => !(opts.withoutEncounterPrompted && s.context === 'explaining_experience'))
    .filter(counts);
  // Childhood statements count toward the experience's own moment only when it happened in
  // childhood; otherwise they, and any upbringing, are the fallback.
  const inChildhood = anchor?.child.value === 'yes';
  const priorTime = statements.filter((s) =>
    inChildhood ? ['childhood', 'before_experience', 'at_experience'].includes(s.when) : ['before_experience', 'at_experience'].includes(s.when) && s.kind !== 'upbringing');
  const upbringing = inChildhood ? [] : statements.filter((s) => s.when === 'childhood' || (s.kind === 'upbringing' && !['after_experience', 'now'].includes(s.when)));
  const now = statements.filter((s) => s.when === 'now');
  const nowTime = now.length > 0 ? now : statements.filter((s) => s.when === 'after_experience');

  const prior = menuOf(fields?.prior);
  return ResolvedReligion.parse({
    accountId: coded.accountId,
    ruleVersion: opts.ruleVersion ?? AREA2_RULE_VERSION,
    prior: resolveAffiliation(prior, priorTime, upbringing),
    now: resolveAffiliation(menuOf(fields?.now), nowTime, []),
    orientation: prior?.format === 'orientation' ? prior.orientation : null,
  });
}
