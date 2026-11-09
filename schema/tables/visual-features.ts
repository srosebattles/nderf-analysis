// Pre-registered table: what each coded visual feature points to, keyed on the figure and the
// feature together (a serpent under Mary's feet is Marian imagery, not a hostile serpent).
// A descriptive variable: it never touches the Jesus ladder, which follows what the text claims.
// Rules are in DECISIONS.md ("Pre-registered tables").
import { z } from 'zod';
import { type BeingCategory, type Encounter, type IdentityClaim, type VisualDetail, VisualFeature, UNIDENTIFIED_CATEGORIES } from '../codebook-schema.ts';
import { lookupFigure } from './named-figures.ts';

export const VISUAL_FEATURES_TABLE_VERSION = '1.0';

export const PointsTo = z.enum([
  'christ', 'mary', 'angel', 'christian_saint_or_clergy',
  'monastic', // Christian or Buddhist: "dressed like a monk" doesn't say which
  'hindu', 'yama',
  'buddhist', // the vase (Guanyin's)
  'buddhist_or_hindu', // the lotus
  'devil_folkloric', 'devil_scriptural',
  'holy_general', // the halo, and rays on anyone but Jesus and Mary: several traditions use them
  'judgment', // scales, a ledger
  'unclear', // an ambiguous combination, never a guess
  'nothing', // general features: a robe, a beard, hair color
]);
export type PointsTo = z.infer<typeof PointsTo>;

/** Who the figure is, from its most specific claim (resemblance-only claims don't count). */
export const FigureGroup = z.enum([
  'mary', 'jesus', 'god', 'angel',
  'hindu_deity', 'yama', 'buddhist_figure', 'christian_saint', 'other_named', // named figures, by the named-figures table
  'hostile_being', 'animal',
  'known_person', // people known in ordinary life, including clergy known personally
  'unidentified', // the unidentified group, the controls, and anything else
]);
export type FigureGroup = z.infer<typeof FigureGroup>;

type F = z.infer<typeof VisualFeature>;
type Row = { default: PointsTo; except?: Partial<Record<FigureGroup, PointsTo>> };

const ANIMAL_PARTS_ON_ANIMALS: Partial<Record<FigureGroup, PointsTo>> = { animal: 'nothing' };
/** What a known person wore or carried in life says who they were, not which tradition the
 *  iconography comes from (a deceased aunt in her habit, a grandfather's cross). */
const OWN_LIKENESS: Partial<Record<FigureGroup, PointsTo>> = { known_person: 'nothing' };

export const VISUAL_FEATURE_MAP: Readonly<Record<F, Row>> = {
  wounds: { default: 'christ' },
  crown_of_thorns: { default: 'christ' },
  cross: { default: 'christ', except: { christian_saint: 'christian_saint_or_clergy', angel: 'christian_saint_or_clergy', ...OWN_LIKENESS } },
  sacred_heart: { default: 'christ' },
  lamb: { default: 'christ', except: { ...ANIMAL_PARTS_ON_ANIMALS } },

  mantle_or_veil: { default: 'unclear', except: { mary: 'mary', ...OWN_LIKENESS } },
  crown_of_stars: { default: 'mary' },
  crescent_moon: { default: 'unclear', except: { mary: 'mary', hindu_deity: 'hindu' } },
  rosary: { default: 'mary' },
  scapular: { default: 'mary' },
  immaculate_heart: { default: 'mary' },
  holding_infant: { default: 'unclear', except: { mary: 'mary', christian_saint: 'christian_saint_or_clergy', ...OWN_LIKENESS } },
  rays: { default: 'holy_general', except: { jesus: 'christ', mary: 'mary' } },

  wings: { default: 'angel', except: { hostile_being: 'devil_folkloric', hindu_deity: 'hindu', ...ANIMAL_PARTS_ON_ANIMALS } },
  sword: { default: 'angel', except: { hostile_being: 'nothing', christian_saint: 'christian_saint_or_clergy', hindu_deity: 'hindu', ...OWN_LIKENESS } },
  trumpet: { default: 'angel' },
  armor: { default: 'angel', except: { hostile_being: 'nothing', hindu_deity: 'hindu', ...OWN_LIKENESS } },
  scales: { default: 'judgment', except: { angel: 'angel' } },

  halo: { default: 'holy_general' },
  monastic_habit: { default: 'monastic', except: { ...OWN_LIKENESS } },
  clerical_dress: { default: 'christian_saint_or_clergy', except: { ...OWN_LIKENESS } },

  many_arms: { default: 'hindu', except: { hostile_being: 'unclear' } },
  animal_head: { default: 'hindu', except: { hostile_being: 'unclear', ...ANIMAL_PARTS_ON_ANIMALS } },
  blue_skin: { default: 'hindu', except: { hostile_being: 'unclear' } },
  trident: { default: 'hindu', except: { hostile_being: 'devil_folkloric' } },
  rope_or_noose: { default: 'yama', except: { ...OWN_LIKENESS } },
  ledger: { default: 'judgment', except: { yama: 'yama' } },

  vase: { default: 'buddhist' },

  horns: { default: 'devil_folkloric', except: { ...ANIMAL_PARTS_ON_ANIMALS } },
  red_skin: { default: 'devil_folkloric' },
  pitchfork: { default: 'devil_folkloric' },
  hooves: { default: 'devil_folkloric', except: { ...ANIMAL_PARTS_ON_ANIMALS } },
  tail: { default: 'devil_folkloric', except: { ...ANIMAL_PARTS_ON_ANIMALS } },
  claws: { default: 'unclear', except: { hostile_being: 'devil_folkloric', ...ANIMAL_PARTS_ON_ANIMALS } },
  // As the being, or beside it: the figure decides (St. George's dragon, Mary's serpent).
  serpent: { default: 'unclear', except: { hostile_being: 'devil_scriptural', mary: 'mary', hindu_deity: 'hindu', ...ANIMAL_PARTS_ON_ANIMALS } },
  dragon: { default: 'unclear', except: { hostile_being: 'devil_scriptural', christian_saint: 'christian_saint_or_clergy', angel: 'angel', ...ANIMAL_PARTS_ON_ANIMALS } },
  lion: { default: 'unclear', except: { hostile_being: 'devil_scriptural', jesus: 'christ', christian_saint: 'christian_saint_or_clergy', hindu_deity: 'hindu', ...ANIMAL_PARTS_ON_ANIMALS } },

  robe: { default: 'nothing' },
  beard: { default: 'nothing' },
  hood: { default: 'nothing' },
  throne: { default: 'nothing' },
  book: { default: 'nothing' },
  staff: { default: 'nothing' },
  crown: { default: 'nothing', except: { mary: 'mary', jesus: 'christ' } },
  body_of_light: { default: 'nothing' },
  flowers: { default: 'nothing' }, // decided by flowerKind: see pointsTo
  hair_color: { default: 'nothing' },
  eye_color: { default: 'nothing' },
  skin_tone: { default: 'nothing' },
  face_not_visible: { default: 'nothing' },
  head_covering: { default: 'nothing' },
  hands_in_prayer: { default: 'nothing' },
  blessing_gesture: { default: 'nothing' },
  modern_clothing: { default: 'nothing' },
  period_clothing: { default: 'nothing' },
  other: { default: 'unclear' }, // only the words say what it is
};

// ─── Figure group ───────────────────────────────────────────────────────────────────────

const KNOWN_PEOPLE: readonly BeingCategory[] = [
  'family', 'relative_never_met', 'friend_or_acquaintance', 'clergy_known_personally', 'known_person_relationship_not_stated',
];
const PRIORITY: readonly FigureGroup[] = [
  'mary', 'jesus', 'god', 'angel', 'hindu_deity', 'yama', 'buddhist_figure', 'christian_saint', 'other_named',
  'hostile_being', 'animal', 'known_person', 'unidentified',
];
const CHRISTIAN_SAINTS = new Set([
  'early_or_medieval_saint', 'orthodox_saint', 'post_reformation_catholic_saint', 'protestant_saint_or_luminary', 'biblical_figure',
]);

function groupOfClaim(c: IdentityClaim): FigureGroup {
  switch (c.category) {
    case 'mary': return 'mary';
    case 'jesus': return 'jesus';
    case 'god': case 'holy_spirit': return 'god';
    case 'angel': return 'angel';
    case 'hostile_being': return 'hostile_being';
    case 'animal': return 'animal';
    case 'named_figure': case 'living_religious_leader': {
      const r = c.name ? lookupFigure(c.name) : null;
      const sub = r && 'found' in r ? r.found.subcategory : null;
      if (sub === 'hindu_deity') return 'hindu_deity';
      if (sub === 'yama_or_messengers') return 'yama';
      if (sub === 'buddha_or_bodhisattva') return 'buddhist_figure';
      if (sub !== null && CHRISTIAN_SAINTS.has(sub)) return 'christian_saint';
      return 'other_named';
    }
    default:
      if (KNOWN_PEOPLE.includes(c.category)) return 'known_person';
      if (UNIDENTIFIED_CATEGORIES.includes(c.category)) return 'unidentified';
      return 'unidentified';
  }
}

/** The most specific claim decides: a being of light later named Jesus uses Jesus's row. */
export function figureGroup(e: Pick<Encounter, 'identity'>): FigureGroup {
  const groups = e.identity.filter((c) => c.certainty !== 'resemblance').map(groupOfClaim);
  return PRIORITY.find((g) => groups.includes(g)) ?? 'unidentified';
}

// ─── Lookup ─────────────────────────────────────────────────────────────────────────────

export function pointsTo(group: FigureGroup, d: Pick<VisualDetail, 'feature' | 'flowerKind'>): PointsTo {
  if (d.feature === 'flowers') {
    if (d.flowerKind === 'lotus') return 'buddhist_or_hindu';
    if (d.flowerKind === 'rose' && group === 'mary') return 'mary';
    return 'nothing';
  }
  const row = VISUAL_FEATURE_MAP[d.feature];
  return row.except?.[group] ?? row.default;
}

/** Every detail of an encounter with what it points to; felt and heard details included. */
export function encounterIconography(e: Pick<Encounter, 'identity' | 'visualDetails'>) {
  const group = figureGroup(e);
  return { group, details: e.visualDetails.map((d) => ({ feature: d.feature, pointsTo: pointsTo(group, d) })) };
}
