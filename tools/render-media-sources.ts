// Renders area 4's sources-and-details table as Markdown for review: schema/tables/MEDIA_SOURCES.md.
//   node tools/render-media-sources.ts          (writes the file)
// A test checks that the file matches the table, so it can't go stale.
import fs from 'node:fs';
import { AMBIGUOUS_NAMES, COMPUTED_RULES, type Citation, type DatedEvent, MEDIA_SOURCES, MEDIA_SOURCES_TABLE_VERSION } from '../schema/tables/media-sources.ts';

export const OUTPUT = new URL('../schema/tables/MEDIA_SOURCES.md', import.meta.url);

const cell = (s: string) => s.replace(/\|/g, '\\|');
const citation = (c: Citation) =>
  `[${cell(c.outlet)}${c.published ? `, ${c.published}` : ''}](${c.url})`;
const dated = (e: DatedEvent) =>
  `${e.date}, ${e.event} (${e.citations.map(citation).join('; ')})${e.note ? `. ${e.note}` : ''}`;
const ROUTE = { computed: 'computed from area 3', word_rule: 'word rule', checklist: 'checklist' } as const;

export function render(): string {
  const lines = [
    '# Area 4 sources and details: review view',
    '',
    `Generated from \`media-sources.ts\` (table version ${MEDIA_SOURCES_TABLE_VERSION}) by`,
    '`node tools/render-media-sources.ts`. Edit the table, not this file. Rules are in',
    '[DECISIONS.md](../DECISIONS.md), area 4. For checklist details, the full and partial matches are the',
    'wording the coder sees; only full matches count in the main test. A detail marked pending is still waiting for',
    'its second source, and none may remain at the freeze.',
  ];
  for (const s of MEDIA_SOURCES) {
    lines.push('', `## ${s.title}`, '');
    const kind = s.role === 'related_work' ? `related work (of ${s.relatedTo}), matched by name only` : 'source';
    lines.push(`- **Kind:** ${s.medium.replace(/_/g, ' ')}; ${kind}; presented as ${s.presentedAs === 'true' ? 'a true account' : 'fiction'}${s.invented ? '; invented' : ''}.`);
    lines.push(`- **First widely available:** ${dated(s.firstWideAvailability)}`);
    for (const b of s.boosts) lines.push(`- **Boost:** ${dated(b)}`);
    lines.push(`- **Names matched:** ${[...s.names.titles, ...s.names.people].join('; ')}`);
    if (s.ownNderfAccountIds.length > 0) lines.push(`- **Own NDERF page, left out of its own test:** ${s.ownNderfAccountIds.join(', ')}`);
    if (s.note) lines.push(`- **Note:** ${s.note}`);
    if (s.details.length === 0) continue;
    lines.push('', '| Detail | Route | Full match | Partial match | About beings | Traceability | Confirmed by |', '|---|---|---|---|---|---|---|');
    for (const d of s.details) {
      const route = d.route === 'word_rule' ? `word rule: ${d.words.join(', ')}` : d.route === 'computed' ? `computed: ${d.computedRule}` : ROUTE[d.route];
      const label = d.pendingCheck === null ? d.label : `${d.label} (**pending:** ${d.pendingCheck})`;
      lines.push(`| ${cell(label)} | ${cell(route)} | ${cell(d.fullMatch)} | ${cell(d.partialMatch ?? 'none')} | ${d.aboutBeings ? 'yes' : 'no'} | ${cell(d.traceability)} | ${d.citations.map(citation).join('; ')} |`);
    }
  }
  lines.push('', '## Ambiguous names', '', 'These resolve to no source.', '');
  for (const [name, why] of Object.entries(AMBIGUOUS_NAMES)) lines.push(`- "${name}": ${why}`);
  lines.push('', '## Computed rules', '', 'Pre-registered here; implemented from area 3\'s codes in the area 4 resolver.', '');
  for (const [name, rule] of Object.entries(COMPUTED_RULES)) lines.push(`- **${name}:** ${rule}`);
  return lines.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.writeFileSync(OUTPUT, render());
  console.log(`wrote ${OUTPUT.pathname}`);
}
