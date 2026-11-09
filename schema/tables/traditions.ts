// Tradition columns shared by the pre-registered tables, and the mapping from area 2's
// coded traditions onto them.
import { z } from 'zod';
import type { Tradition } from '../codebook-schema.ts';

export const HomeTradition = z.enum([
  'catholic', 'eastern_orthodox', 'oriental_orthodox',
  'lutheran', 'anglican', 'reformed', 'methodist', 'other_protestant',
  'latter_day_saints', 'jehovahs_witnesses', 'other_nontrinitarian',
  'jewish', 'muslim_sunni', 'muslim_shia',
  'hindu', 'buddhist', 'sikh', 'bahai', 'chinese_folk_or_taoist', 'new_age',
  /** Non-religious historical figures and celebrities. No experiencer maps here. */
  'secular',
]);
export type HomeTradition = z.infer<typeof HomeTradition>;

export const PROTESTANT: readonly HomeTradition[] = ['lutheran', 'anglican', 'reformed', 'methodist', 'other_protestant'];
export const ORTHODOX: readonly HomeTradition[] = ['eastern_orthodox', 'oriental_orthodox'];
/** Christian means Trinitarian, as in area 2. */
export const CHRISTIAN: readonly HomeTradition[] = ['catholic', ...ORTHODOX, ...PROTESTANT];
/** Everyone who reads the Bible as scripture: Christians and the non-Trinitarian families. */
export const BIBLE_READERS: readonly HomeTradition[] = [...CHRISTIAN, 'latter_day_saints', 'jehovahs_witnesses', 'other_nontrinitarian'];
export const MUSLIM: readonly HomeTradition[] = ['muslim_sunni', 'muslim_shia'];

/** The columns that may describe a tradition coded in area 2. More than one when area 2 leaves
 *  it open (Orthodox with no branch, Protestant with no family, a bare "Christian", Muslim with no
 *  branch); a table then treats an item as outside the tradition only if it is outside every
 *  candidate. Empty: no column applies (several traditions unnamed, unaffiliated, and families
 *  with no column: Unitarian Universalist, Shinto, indigenous, pagan, other). */
export function columnsFor(t: Tradition): HomeTradition[] {
  switch (t.family) {
    case 'catholic': return ['catholic'];
    case 'orthodox': return t.branch === 'eastern' ? ['eastern_orthodox'] : t.branch === 'oriental' ? ['oriental_orthodox'] : [...ORTHODOX];
    case 'protestant':
      switch (t.protestantFamily) {
        case 'lutheran': return ['lutheran'];
        case 'anglican': return ['anglican'];
        case 'reformed_presbyterian': return ['reformed'];
        case 'methodist_wesleyan': return ['methodist'];
        case 'unspecified': return [...PROTESTANT];
        default: return ['other_protestant'];
      }
    case 'christian_unspecified': return [...CHRISTIAN];
    case 'latter_day_saints': return ['latter_day_saints'];
    case 'jehovahs_witnesses': return ['jehovahs_witnesses'];
    case 'other_nontrinitarian': return ['other_nontrinitarian'];
    case 'jewish': return ['jewish'];
    case 'muslim': return t.branch === 'sunni' ? ['muslim_sunni'] : t.branch === 'shia' ? ['muslim_shia'] : [...MUSLIM];
    case 'hindu': return ['hindu'];
    case 'buddhist': return ['buddhist'];
    case 'sikh': return ['sikh'];
    case 'bahai': return ['bahai'];
    case 'chinese_folk_or_taoist': return ['chinese_folk_or_taoist'];
    case 'new_age': return ['new_age'];
    default: return [];
  }
}
