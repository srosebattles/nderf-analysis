// Pre-registered table: which traditions each Marian title and item of confessional content
// fits. Decided before the holdout is read and frozen with the codebook; the coder never
// classifies. Rules and reasons are in DECISIONS.md ("Pre-registered tables").
import { z } from 'zod';
import { type ConfessionalKind, type Encounter, type Tradition, ConfessionalKind as ConfessionalKindSchema, countKeyword } from '../codebook-schema.ts';

export const MARIAN_TABLE_VERSION = '1.0';

/** Columns, aligned with area 2's traditions. */
export const TableTradition = z.enum([
  'catholic', 'eastern_orthodox', 'oriental_orthodox', 'lutheran', 'anglican', 'reformed', 'methodist',
  'other_protestant', 'muslim',
]);
export type TableTradition = z.infer<typeof TableTradition>;

/** yes: the tradition's teaching holds or allows it, and its clergy and best-educated laity
 *  normally hold it. official_only: its confessions, formularies, or classical divines hold or
 *  allow it, but it's disputed even among clergy and educated laity today. no: rejected, or
 *  foreign to the tradition's teaching and practice. Minority movements (Anglo-Catholic use of
 *  the rosary) don't change a cell. */
export const Fit = z.enum(['yes', 'official_only', 'no']);
export type Fit = z.infer<typeof Fit>;

export const MarianEntry = z.strictObject({
  id: z.string().regex(/^[a-z_]+$/),
  /** Content is coded on the encounter (a rosary seen counts too); a title is matched, whole
   *  words and case-insensitive, in the words of Mary claims and of apparition titles. */
  match: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('content'), contentKind: ConfessionalKindSchema }),
    z.strictObject({ kind: z.literal('title'), patterns: z.array(z.string().regex(/^[\p{Ll}\p{N} '-]+$/u)).min(1) }),
  ]),
  fit: z.record(TableTradition, Fit),
  note: z.string(),
});
export type MarianEntry = z.infer<typeof MarianEntry>;

const CHRISTIAN = TableTradition.options.filter((t) => t !== 'muslim');
const ORTHODOX: TableTradition[] = ['eastern_orthodox', 'oriental_orthodox'];
const row = (yes: TableTradition[], officialOnly: TableTradition[] = []) =>
  Object.fromEntries(
    TableTradition.options.map((t) => [t, yes.includes(t) ? 'yes' : officialOnly.includes(t) ? 'official_only' : 'no']),
  ) as Record<TableTradition, Fit>;
const content = (id: string, contentKind: ConfessionalKind, fit: Record<TableTradition, Fit>, note: string): MarianEntry =>
  ({ id, match: { kind: 'content', contentKind }, fit, note });
const title = (id: string, patterns: string[], fit: Record<TableTradition, Fit>, note: string): MarianEntry =>
  ({ id, match: { kind: 'title', patterns }, fit, note });
const catholicOnly = row(['catholic']);

export const MARIAN_TABLE: readonly MarianEntry[] = z.array(MarianEntry).parse([
  // ── Confessional content ──
  content('rosary', 'rosary', catholicOnly,
    'The Dominican rosary, whose prayers invoke her. Orthodox prayer ropes and Anglican prayer beads are other devotions.'),
  content('scapular', 'scapular', catholicOnly, ''),
  content('purgatory', 'purgatory', catholicOnly,
    'Rejected by the Orthodox as defined in the West, and by the Reformation churches (Smalcald Articles II.II).'),
  content('novena', 'novena', catholicOnly, ''),
  content('intercedes', 'intercedes', row(['catholic', ...ORTHODOX, 'lutheran', 'anglican'], ['methodist']),
    'She prays for someone, an individual included. Lutheran and Anglican teaching allows it; invoking her is what they ' +
    'exclude. Methodist Article XIV, like Anglican XXII, rejects invocation, not intercession (official only; less ' +
    'certain). Calvin argues against it (Institutes III.20).'),
  content('invoked', 'invoked', row(['catholic', ...ORTHODOX]), 'Someone prays to her or asks for her prayers.'),

  // ── Titles shared widely ──
  title('mary', ['mary', 'maryam', 'mother of jesus', 'virgin mary'], row([...CHRISTIAN, 'muslim']),
    'The Qur\'an affirms the virginal conception (3:47, 19:20).'),
  title('blessed_virgin', ['blessed virgin'], row(['catholic', ...ORTHODOX, 'lutheran', 'anglican'], ['methodist']),
    'Luke 1:48; Lutheran and Anglican liturgical usage; Wesley\'s usage.'),
  title('mother_of_god', ['mother of god', 'theotokos', 'god-bearer', 'godbearer'],
    row(['catholic', ...ORTHODOX, 'lutheran', 'anglican'], ['reformed', 'methodist']),
    'Ephesus (431) and the Chalcedonian Definition; Formula of Concord, SD VIII. Held by Lutheran and Anglican clergy ' +
    'and educated laity, so yes for them.'),
  title('ever_virgin', ['ever-virgin', 'ever virgin', 'perpetual virgin'],
    row(['catholic', ...ORTHODOX], ['lutheran', 'anglican', 'reformed', 'methodist']),
    'Smalcald Articles I.4 (Latin) and SD VIII; Pearson, Exposition of the Creed (1659); Second Helvetic Confession, ' +
    'ch. 11; Wesley, Letter to a Roman Catholic (1749). Disputed today even among Protestant clergy. Muslim: not ' +
    'taught; the Qur\'an affirms the virginal conception and her chastity (66:12) but says nothing of afterward.'),
  title('our_lady', ['our lady'], row(['catholic', ...ORTHODOX, 'anglican', 'muslim']),
    'A usage title. Arabic-speaking Muslims say Sayyidatuna Maryam, "our lady Mary."'),
  title('panagia', ['panagia', 'all-holy'], row(['catholic', ...ORTHODOX]), 'Eastern usage; Eastern Catholics share it.'),
  title('queen_of_heaven', ['queen of heaven', 'queen of angels', 'queen of the angels'], row(['catholic', ...ORTHODOX]), ''),

  // ── Catholic titles ──
  title('immaculate_conception', ['immaculate conception', 'immaculate heart'], catholicOnly,
    'A bare "immaculate" is not listed: Orthodox hymnody and some Anglican divines use it of her.'),
  title('mediatrix', ['mediatrix', 'co-mediatrix'], catholicOnly,
    'Mater Populi Fidelis (2025) allows it only with care.'),
  title('co_redemptrix', ['co-redemptrix', 'coredemptrix', 'co-redeemer'], catholicOnly,
    'Mater Populi Fidelis (2025) calls the title always inappropriate. Kept yes for Catholics: it is Catholic devotional ' +
    'language either way, used by popes before 2025, and nearly every account predates the note.'),
  title('litany_titles', ['star of the sea', 'stella maris', 'mystical rose', 'mother of mercy', 'our lady of sorrows',
    'sorrowful mother', 'mother of sorrows', 'blessed mother'], catholicOnly,
    'Litany of Loreto, Salve Regina, the Seven Sorrows, and Catholic popular usage ("the Blessed Mother").'),

  // ── Apparitions ──
  title('guadalupe', ['guadalupe'], catholicOnly, ''),
  title('lourdes', ['lourdes'], catholicOnly, ''),
  title('fatima', ['fatima', 'fátima'], catholicOnly, ''),
  title('knock', ['lady of knock'], catholicOnly, ''),
  title('la_salette', ['la salette'], catholicOnly, ''),
  title('akita', ['lady of akita'], catholicOnly, ''),
  title('kibeho', ['kibeho'], catholicOnly, ''),
  title('banneux', ['banneux'], catholicOnly, ''),
  title('beauraing', ['beauraing'], catholicOnly, ''),
  title('medjugorje', ['medjugorje', 'queen of peace'], catholicOnly,
    'Rome allowed devotion in 2024 without ruling the apparitions supernatural.'),
  title('zeitoun', ['zeitoun', 'zeitun', 'zaytun'], row(['catholic', 'oriental_orthodox']),
    'Approved by the Coptic Orthodox Church (1968). Rome never ruled, so it isn\'t foreign to Catholics.'),
]);

// ─── Matching ───────────────────────────────────────────────────────────────────────────

export interface MarianItems {
  /** Every table entry the encounter matches; a title can match more than one ("Our Lady of Guadalupe"). */
  matched: MarianEntry[];
  /** Titles no pattern matches, and other devotions: reported, never counted as a mismatch. */
  unclassified: string[];
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const titleEntries = MARIAN_TABLE.filter((e) => e.match.kind === 'title');
const matchTitle = (words: string) =>
  titleEntries.filter((e) => e.match.kind === 'title' && e.match.patterns.some((p) => countKeyword(squash(words), p) > 0));

export function marianItems(e: Encounter): MarianItems {
  const matched = new Map<string, MarianEntry>();
  const unclassified: string[] = [];
  const titles = [
    ...e.identity.filter((c) => c.category === 'mary').flatMap((c) => c.words),
    ...e.confessionalContent.filter((c) => c.kind === 'apparition_title').map((c) => c.words),
  ];
  for (const words of titles) {
    const hits = matchTitle(words);
    // A bare "Mary" claim word matches the shared entry; anything else unmatched is reported.
    if (hits.length === 0) unclassified.push(words);
    for (const h of hits) matched.set(h.id, h);
  }
  const kinds = new Set<ConfessionalKind>(e.confessionalContent.map((c) => c.kind));
  for (const d of e.visualDetails) {
    if ((d.feature === 'rosary' || d.feature === 'scapular') && d.senses.includes('seen')) kinds.add(d.feature);
  }
  for (const kind of kinds) {
    const entry = MARIAN_TABLE.find((t) => t.match.kind === 'content' && t.match.contentKind === kind);
    if (entry) matched.set(entry.id, entry);
  }
  unclassified.push(...e.confessionalContent.filter((c) => c.kind === 'other_devotion').map((c) => c.words));
  return { matched: [...matched.values()], unclassified };
}

// ─── Mismatch against the experiencer's tradition ───────────────────────────────────────

/** The columns that may describe a tradition from area 2. More than one when area 2 leaves it
 *  open (Orthodox with no branch, Protestant with no family, a bare "Christian"); then an item is
 *  a mismatch only if every candidate column rejects it. Empty: the table doesn't apply (Hindu,
 *  Latter-day Saints, unaffiliated, …); Mary in those accounts is a cross-tradition question. */
export function tableColumns(t: Tradition): TableTradition[] {
  switch (t.family) {
    case 'catholic': return ['catholic'];
    case 'orthodox': return t.branch === 'eastern' ? ['eastern_orthodox'] : t.branch === 'oriental' ? ['oriental_orthodox'] : ORTHODOX;
    case 'protestant':
      switch (t.protestantFamily) {
        case 'lutheran': return ['lutheran'];
        case 'anglican': return ['anglican'];
        case 'reformed_presbyterian': return ['reformed'];
        case 'methodist_wesleyan': return ['methodist'];
        case 'unspecified': return ['lutheran', 'anglican', 'reformed', 'methodist', 'other_protestant'];
        default: return ['other_protestant'];
      }
    case 'christian_unspecified': return [...CHRISTIAN];
    case 'muslim': return ['muslim'];
    default: return [];
  }
}

/** confessional: official_only counts as compatible. lived: it counts as a mismatch. Both are
 *  pre-registered and reported. */
export type MismatchView = 'confessional' | 'lived';

export function marianMismatch(items: MarianItems, columns: TableTradition[], view: MismatchView): 'mismatch' | 'compatible' | 'not_applicable' {
  if (columns.length === 0) return 'not_applicable';
  const fits = (f: Fit) => f === 'yes' || (f === 'official_only' && view === 'confessional');
  const rejected = (entry: MarianEntry) => columns.every((col) => !fits(entry.fit[col]));
  return items.matched.some(rejected) ? 'mismatch' : 'compatible';
}
