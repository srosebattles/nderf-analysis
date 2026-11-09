// Renders the named-figures table as Markdown for review: schema/tables/NAMED_FIGURES.md.
//   node tools/render-named-figures.ts          (writes the file)
// A test checks that the file matches the table, so it can't go stale.
import fs from 'node:fs';
import { NAMED_FIGURES, NAMED_FIGURES_TABLE_VERSION, LIVING_AS_OF, type NamedEntry } from '../schema/tables/named-figures.ts';
import { CHRISTIAN, MUSLIM, ORTHODOX, PROTESTANT, type HomeTradition } from '../schema/tables/traditions.ts';

export const OUTPUT = new URL('../schema/tables/NAMED_FIGURES.md', import.meta.url);

const LABEL: Record<HomeTradition, string> = {
  catholic: 'Catholic', eastern_orthodox: 'Eastern Orthodox', oriental_orthodox: 'Oriental Orthodox',
  lutheran: 'Lutheran', anglican: 'Anglican', reformed: 'Reformed', methodist: 'Methodist', other_protestant: 'other Protestant',
  latter_day_saints: 'Latter-day Saints', jehovahs_witnesses: "Jehovah's Witnesses", other_nontrinitarian: 'other non-Trinitarian',
  jewish: 'Jewish', muslim_sunni: 'Sunni', muslim_shia: 'Shia', hindu: 'Hindu', buddhist: 'Buddhist', sikh: 'Sikh',
  bahai: "Baha'i", chinese_folk_or_taoist: 'Chinese folk or Taoist', new_age: 'New Age', secular: 'secular',
};

/** Homes in words, with the usual groups collapsed. */
function homes(list: readonly HomeTradition[]): string {
  let rest = [...list];
  const parts: string[] = [];
  const take = (group: readonly HomeTradition[], label: string) => {
    if (group.every((g) => rest.includes(g))) {
      parts.push(label);
      rest = rest.filter((r) => !group.includes(r));
    }
  };
  take(CHRISTIAN, 'all Christian');
  take(PROTESTANT, 'all Protestant');
  take(ORTHODOX, 'both Orthodox');
  take(MUSLIM, 'Muslim');
  return [...parts, ...rest.map((r) => LABEL[r])].join(', ');
}

const SECTIONS: [string, (e: NamedEntry) => boolean][] = [
  ['Early and medieval saints', (e) => e.subcategory === 'early_or_medieval_saint'],
  ['Orthodox saints', (e) => e.subcategory === 'orthodox_saint'],
  ['Post-Reformation Catholic saints', (e) => e.subcategory === 'post_reformation_catholic_saint'],
  ['Protestant saints and luminaries', (e) => e.subcategory === 'protestant_saint_or_luminary'],
  ['Biblical figures', (e) => e.subcategory === 'biblical_figure'],
  ['Muhammad, the Imams, and other Muslim figures', (e) => e.subcategory === 'muhammad' || e.subcategory === 'shia_imam' ||
    (e.subcategory === 'other_religious_figure' && e.homes.some((h) => h.startsWith('muslim')))],
  ['The Buddha and bodhisattvas', (e) => e.subcategory === 'buddha_or_bodhisattva'],
  ['Hindu deities', (e) => e.subcategory === 'hindu_deity'],
  ['Yama and his messengers', (e) => e.subcategory === 'yama_or_messengers'],
  ['Sikh Gurus', (e) => e.subcategory === 'sikh_figure'],
  ['Latter-day Saint figures', (e) => e.subcategory === 'latter_day_saint_figure'],
  ["Baha'i figures", (e) => e.subcategory === 'bahai_figure'],
  ['Modern gurus and teachers', (e) => e.subcategory === 'modern_guru_or_teacher'],
  ['Jewish figures after the Bible', (e) => e.subcategory === 'other_religious_figure' && e.homes[0] === 'jewish'],
  ['Hindu and Sikh saints and poets', (e) => e.subcategory === 'other_religious_figure' && e.homes[0] === 'hindu'],
  ['Chinese folk and Taoist figures', (e) => e.subcategory === 'other_religious_figure' && e.homes[0] === 'chinese_folk_or_taoist'],
  ['New Age and esoteric figures', (e) => e.subcategory === 'other_religious_figure' && e.homes[0] === 'new_age'],
  ['Other religious figures and leaders', (e) => e.subcategory === 'other_religious_figure' &&
    !['jewish', 'hindu', 'chinese_folk_or_taoist', 'new_age'].includes(e.homes[0]) && !e.homes.some((h) => h.startsWith('muslim'))],
  ['Named angels', (e) => e.kind === 'angel'],
  ['Named hostile beings', (e) => e.kind === 'hostile_being'],
  ['Non-religious historical figures and celebrities', (e) => e.subcategory === 'non_religious_historical_figure'],
];

const died = (d: NamedEntry['died']) =>
  typeof d === 'number' ? (d < 0 ? `about ${-d} BCE` : String(d)) : d === 'not_applicable' ? '' : d;
const cell = (s: string) => s.replace(/\|/g, '\\|');

export function render(): string {
  const lines = [
    '# Named figures: review view',
    '',
    `Generated from \`named-figures.ts\` (table version ${NAMED_FIGURES_TABLE_VERSION}; living status as of ${LIVING_AS_OF})`,
    'by `node tools/render-named-figures.ts`. Edit the table, not this file. Rules are in',
    '[DECISIONS.md](../DECISIONS.md). "Homes" are the traditions in whose mainstream teaching or devotion the',
    'figure is revered.',
    '',
  ];
  const placed = new Set<NamedEntry>();
  for (const [title, test] of SECTIONS) {
    const rows = NAMED_FIGURES.filter(test);
    rows.forEach((r) => placed.add(r));
    lines.push(`## ${title} (${rows.length})`, '', '| Name | Died | Homes | Also matches | Note |', '|---|---|---|---|---|');
    for (const e of rows) {
      lines.push(`| ${cell(e.canonicalName)} | ${died(e.died)} | ${homes(e.homes)} | ${cell(e.aliases.join(', '))} | ${cell(e.note)} |`);
    }
    lines.push('');
  }
  const missed = NAMED_FIGURES.filter((e) => !placed.has(e));
  if (missed.length) throw new Error(`not in any section: ${missed.map((e) => e.canonicalName).join(', ')}`);
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.writeFileSync(OUTPUT, render());
  console.log(`wrote ${OUTPUT.pathname}`);
}
