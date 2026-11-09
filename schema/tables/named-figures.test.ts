import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Tradition } from '../codebook-schema.ts';
import { NAMED_FIGURES, NamedEntry, livingReligiousLeaderAt, lookupFigure, outsideTradition } from './named-figures.ts';
import { columnsFor } from './traditions.ts';

const get = (name: string) => {
  const r = lookupFigure(name);
  assert.ok('found' in r, `${name} should be found`);
  return r.found;
};

test('names resolve through aliases, accents, and "St."; ambiguous and unlisted names resolve to nothing', () => {
  assert.equal(get('St. Francis').canonicalName, 'Francis of Assisi');
  assert.equal(get('Padre Pio').canonicalName, 'Pio of Pietrelcina');
  assert.equal(get('Kwan Yin').canonicalName, 'Guanyin');
  assert.equal(get('Jibril').canonicalName, 'Gabriel');
  assert.equal(get('Thérèse of Lisieux').canonicalName, 'Therese of Lisieux');
  assert.equal(get('C.S. Lewis').canonicalName, 'C. S. Lewis');
  assert.equal(get('the Devil').canonicalName, 'Satan');
  assert.ok('ambiguous' in lookupFigure('Sai Baba'));
  assert.ok('ambiguous' in lookupFigure('Saint Teresa'));
  assert.ok('ambiguous' in lookupFigure('Francis'));
  assert.ok('unlisted' in lookupFigure('Someone Unheard Of'));
});

test('the saints rule is enforced on the table: dated by death, grouped by the splits', () => {
  const base = { aliases: [], kind: 'figure', homes: ['catholic'], note: '' };
  assert.equal(NamedEntry.safeParse({ ...base, canonicalName: 'x', subcategory: 'early_or_medieval_saint', died: 1600 }).success, false);
  assert.equal(NamedEntry.safeParse({ ...base, canonicalName: 'x', subcategory: 'post_reformation_catholic_saint', died: 1400 }).success, false);
  assert.equal(NamedEntry.safeParse({ ...base, canonicalName: 'x', subcategory: 'non_religious_historical_figure', died: 1900 }).success, false);
  assert.deepEqual(get('Augustine of Hippo').homes.includes('oriental_orthodox'), true); // before Chalcedon
  assert.deepEqual(get('Leo the Great').homes.includes('oriental_orthodox'), false); // after it
  assert.deepEqual(get('Francis of Assisi').homes.includes('eastern_orthodox'), false); // Western, after 1054
  assert.ok(get('Francis of Assisi').homes.includes('other_protestant')); // shared heritage
  assert.equal(NAMED_FIGURES.length > 200, true);
});

test('living religious leaders are decided by the year of death, not the coder', () => {
  assert.equal(livingReligiousLeaderAt(get('John Paul II'), 1995), true);
  assert.equal(livingReligiousLeaderAt(get('John Paul II'), 2015), false);
  assert.equal(livingReligiousLeaderAt(get('the Dalai Lama'), 2020), true);
  assert.equal(livingReligiousLeaderAt(get('Abraham Lincoln'), 1850), false); // not religious
  assert.equal(livingReligiousLeaderAt(get('Gabriel'), 2000), false); // not a person
});

test('outside the experiencer\'s tradition', () => {
  const t = (x: Tradition) => columnsFor(x);
  const baptist = t({ family: 'protestant', protestantFamily: 'baptist', body: null });
  const lutheran = t({ family: 'protestant', protestantFamily: 'lutheran', body: null });
  assert.equal(outsideTradition(get('Francis of Assisi'), baptist), false);
  assert.equal(outsideTradition(get('Francis of Assisi'), t({ family: 'orthodox', branch: 'eastern' })), true);
  assert.equal(outsideTradition(get('Raphael'), lutheran), false);
  assert.equal(outsideTradition(get('Raphael'), baptist), true);
  assert.equal(outsideTradition(get('Moses'), t({ family: 'muslim', branch: null, detail: null })), false);
  assert.equal(outsideTradition(get('Gautama Buddha'), t({ family: 'hindu', detail: null })), false);
  assert.equal(outsideTradition(get('Kuthumi'), t({ family: 'catholic', rite: null })), true);
  assert.equal(outsideTradition(get('Jafar al-Sadiq'), t({ family: 'muslim', branch: 'sunni', detail: null })), false);
  assert.equal(outsideTradition(get('Musa al-Kazim'), t({ family: 'muslim', branch: 'sunni', detail: null })), true);
  assert.equal(outsideTradition(get('Moses'), t({ family: 'unaffiliated', kind: 'atheist' })), 'not_applicable');
});

test('the review view (NAMED_FIGURES.md) matches the table', async () => {
  const fs = await import('node:fs');
  const { OUTPUT, render } = await import('../../tools/render-named-figures.ts');
  assert.equal(fs.readFileSync(OUTPUT, 'utf8'), render(), 'run: node tools/render-named-figures.ts');
});
