// Renders the visual-feature map as Markdown for review: schema/tables/VISUAL_FEATURES.md.
//   node tools/render-visual-features.ts          (writes the file)
// A test checks that the file matches the map, so it can't go stale.
import fs from 'node:fs';
import { VISUAL_FEATURE_MAP, VISUAL_FEATURES_TABLE_VERSION } from '../schema/tables/visual-features.ts';

export const OUTPUT = new URL('../schema/tables/VISUAL_FEATURES.md', import.meta.url);
const words = (s: string) => s.replace(/_/g, ' ');

export function render(): string {
  const lines = [
    '# Visual features: review view',
    '',
    `Generated from \`visual-features.ts\` (table version ${VISUAL_FEATURES_TABLE_VERSION}) by`,
    '`node tools/render-visual-features.ts`. Edit the map, not this file. Rules are in',
    '[DECISIONS.md](../DECISIONS.md). Flowers follow their kind: a lotus is Buddhist or Hindu on any figure,',
    'roses on Mary are Marian, anything else points to nothing.',
    '',
    '| Feature | Points to | Except on |',
    '|---|---|---|',
  ];
  for (const [feature, row] of Object.entries(VISUAL_FEATURE_MAP)) {
    const except = Object.entries(row.except ?? {}).map(([g, p]) => `${words(g)}: ${words(p)}`).join('; ');
    lines.push(`| ${words(feature)} | ${words(row.default)} | ${except} |`);
  }
  return lines.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.writeFileSync(OUTPUT, render());
  console.log(`wrote ${OUTPUT.pathname}`);
}
