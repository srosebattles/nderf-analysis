// Pre-registered table for area 4: the sources (widely read accounts and works of fiction), the
// dates that split the accounts into groups, the names that identify a source when an account
// mentions it, and each source's idiosyncratic details. Built from published reviews and
// reporting, never by searching accounts. Frozen with the codebook. Rules: DECISIONS.md, area 4.
import { z } from 'zod';
import { normalizeName } from './named-figures.ts';

export const MEDIA_SOURCES_TABLE_VERSION = '0.1-draft';

// ─── Dates and citations ────────────────────────────────────────────────────────────────

/** A year, a month, or a day. */
export const PartialDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).refine((d) => {
  const [y, m, day] = d.split('-').map(Number);
  if (m !== undefined && (m < 1 || m > 12)) return false;
  if (day !== undefined) {
    const date = new Date(Date.UTC(y, m - 1, day));
    return date.getUTCMonth() === m - 1 && date.getUTCDate() === day;
  }
  return true;
}, { message: 'not a real year, month, or day' });

/** A cut falls on the stated period's first day: '2010-11' cuts at 2010-11-01, '2003' at 2003-01-01. */
export const cutDate = (d: string): string => (d.length === 4 ? `${d}-01-01` : d.length === 7 ? `${d}-01` : d);

/** A page or publication confirming a date or a detail. Listed only after it has been read in full. */
export const Citation = z.strictObject({
  outlet: z.string().min(1),
  title: z.string().min(1),
  author: z.string().nullable(),
  published: PartialDate.nullable(),
  url: z.url(),
});
export type Citation = z.infer<typeof Citation>;

const independent = (citations: Citation[]) => new Set(citations.map((c) => c.outlet)).size >= 2;

export const DatedEvent = z.strictObject({
  event: z.string().min(1), // 'book published', 'film released in the US'
  date: PartialDate,
  citations: z.array(Citation),
  note: z.string(),
}).refine((e) => independent(e.citations), { message: 'a date needs two independent citations' });
export type DatedEvent = z.infer<typeof DatedEvent>;

// ─── Details ────────────────────────────────────────────────────────────────────────────

/** computed: from area 3's codes, by a named rule. word_rule: coined words, matched in the derived
 *  file after the freeze. checklist: area 4's own coding pass, for everything else. */
export const DetailRoute = z.enum(['computed', 'word_rule', 'checklist']);
export type DetailRoute = z.infer<typeof DetailRoute>;

export const Detail = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  /** Our short label, for reading the table. Never shown to the coder. */
  label: z.string().min(1),
  route: DetailRoute,
  /** What counts. For checklist details this is the wording the coder sees, so it never names the
   *  source or says why the detail is listed. */
  fullMatch: z.string().min(1),
  /** Counted only in a sensitivity analysis; null when nothing short of a full match tells us anything. */
  partialMatch: z.string().nullable(),
  /** word_rule only: the words, matched whole and case-insensitive. */
  words: z.array(z.string().min(1)),
  /** computed only: the name of the rule that computes it from area 3's codes. */
  computedRule: z.string().nullable(),
  /** Reported separately, since details about beings bear on the main question. */
  aboutBeings: z.boolean(),
  /** Which older sources were checked, and which parts of the detail fail on their own. */
  traceability: z.string().min(1),
  citations: z.array(Citation),
}).superRefine((d, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message: `${d.id}: ${message}` });
  if (!independent(d.citations)) issue('a detail needs two independent citations');
  if ((d.route === 'word_rule') !== (d.words.length > 0)) issue('words are given exactly for word rules');
  if ((d.route === 'computed') !== (d.computedRule !== null)) issue('computedRule is given exactly for computed details');
});
export type Detail = z.infer<typeof Detail>;

// ─── Sources ────────────────────────────────────────────────────────────────────────────

export const MediaSource = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: z.string().min(1),
  medium: z.enum(['book', 'book_chapter', 'film', 'tv_series', 'painting', 'web_posting']),
  /** related_work: tied to a source but public before it. Matched by name only; no details. */
  role: z.enum(['source', 'related_work']),
  relatedTo: z.string().nullable(),
  /** How readers met it: as a true account, or as fiction. */
  presentedAs: z.enum(['true', 'fiction']),
  /** Fiction, or an account its own subject retracted. */
  invented: z.boolean(),
  firstWideAvailability: DatedEvent,
  /** Later boosts (a film, a bestseller-list peak), pre-registered with the first date. */
  boosts: z.array(DatedEvent),
  /** Matched by rule against exposure titles and authors, named works, and area 4's media list. */
  names: z.strictObject({
    titles: z.array(z.string().min(1)).min(1),
    people: z.array(z.string().min(1)),
  }),
  /** The source's own account on NDERF, if it is in the corpus: left out of its own test. */
  ownNderfAccountIds: z.array(z.string()),
  details: z.array(Detail),
  note: z.string(),
}).superRefine((s, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message: `${s.id}: ${message}` });
  if ((s.role === 'related_work') !== (s.relatedTo !== null)) issue('relatedTo is given exactly for related works');
  if (s.role === 'related_work' && s.details.length > 0) issue('related works have no details');
  if (s.presentedAs === 'fiction' && !s.invented) issue('fiction is invented');
  const first = cutDate(s.firstWideAvailability.date);
  s.boosts.forEach((b) => {
    if (cutDate(b.date) <= first) issue(`boost "${b.event}" must come after first wide availability`);
  });
});
export type MediaSource = z.infer<typeof MediaSource>;

// ─── The table ──────────────────────────────────────────────────────────────────────────

const cite = (outlet: string, title: string, author: string | null, published: string | null, url: string): Citation =>
  ({ outlet, title, author, published, url });

// Citations used more than once.
const NOZAKI = cite('Christian Research Institute (Equip)', "Heaven is Real…But Is Colton's Heaven For Real?", 'Warren Nozaki', '2011-08-04',
  'https://www.equip.org/articles/heaven-is-real-but-is-coltons-heaven-for-real/');
const ROHANE = cite('Christianity Today', "You Probably Love (or Hate) 'Heaven Is For Real' for All the Wrong Reasons", 'Kyle Rohane', '2014-04-24',
  'https://www.christianitytoday.com/2014/04/heaven-is-for-real-fact-or-fable/');
const ELLIS = cite('God Reports', "For the Burpo family, 'Heaven is for Real'", 'Mark Ellis', '2011-11-23', 'https://www.godreports.com/?p=832');
const LEONARD = cite('IOL (from the Daily Mail)', 'The boy who says he went to heaven', 'Tom Leonard', '2014-05-10',
  'https://iol.co.za/news/2014-05-10-the-boy-who-says-he-went-to-heaven/');

export const MEDIA_SOURCES: readonly MediaSource[] = z.array(MediaSource).parse([
  {
    id: 'heaven-is-for-real',
    title: 'Heaven Is for Real',
    medium: 'book',
    role: 'source',
    relatedTo: null,
    presentedAs: 'true',
    invented: false,
    firstWideAvailability: {
      event: 'book published (Thomas Nelson)',
      date: '2010-10-31',
      citations: [
        cite('NetGalley', 'Heaven is for Real', null, null, 'https://www.netgalley.com/catalog/book/12066'),
        cite("Lynn Vincent's author site", 'Heaven is for Real', null, null, 'https://lynnvincent.com/?p=166'),
      ],
      note: 'Wikipedia gives November 2, 2010. The earlier date is used, so that nothing counted as told before could have borrowed.',
    },
    boosts: [{
      event: 'film released in the US',
      date: '2014-04-16',
      citations: [
        cite('Wikipedia', 'Heaven Is for Real (film)', null, null, 'https://en.wikipedia.org/wiki/Heaven_Is_for_Real_(film)'),
        cite('Box Office Mojo', 'Heaven Is for Real (2014)', null, null, 'https://www.boxofficemojo.com/title/tt1929263/'),
      ],
      note: 'Box Office Mojo gives it as the earliest release, domestic and EMEA.',
    }],
    names: {
      // "Heaven Is for Real for Kids" and the film share the title, so the first entry covers them.
      titles: ['Heaven Is for Real', 'Heaven Changes Everything'],
      people: ['Burpo', 'Todd Burpo', 'Colton Burpo', 'Sonja Burpo', 'Colton', 'Lynn Vincent'],
    },
    ownNderfAccountIds: [],
    details: [
      {
        id: 'hifr-horse',
        label: "Jesus's horse of many colors",
        route: 'checklist',
        fullMatch: 'A horse that belongs to Jesus or that he rides, described as rainbow-colored or as having many colors.',
        partialMatch: 'A horse described as rainbow-colored or as having many colors, not tied to Jesus.',
        words: [], computedRule: null,
        aboutBeings: true,
        traceability: 'Christ on a white horse is Revelation 19, and a rainbow around the throne is Revelation 4; neither counts. Only a many-colored horse belonging to Jesus is the book\'s.',
        citations: [
          NOZAKI,
          cite('Catholic World Report', 'Jesus and His Rainbow Horse', 'Nick Olszyk', '2014-04-24',
            'https://www.catholicworldreport.com/2014/04/24/jesus-and-his-rainbow-horse/'),
        ],
      },
      {
        id: 'hifr-holy-spirit-blue',
        label: 'The Holy Spirit appears blue',
        route: 'checklist',
        fullMatch: 'The Holy Spirit appears blue or bluish.',
        partialMatch: null,
        words: [], computedRule: null,
        aboutBeings: true,
        traceability: 'Christian art shows the Holy Spirit as a white dove; no tradition found makes the Spirit blue.',
        citations: [NOZAKI, ROHANE],
      },
      {
        id: 'hifr-markers',
        label: 'Jesus\'s wounds called "markers"',
        route: 'checklist',
        fullMatch: 'The marks on Jesus\'s hands or feet are called "markers."',
        partialMatch: null,
        words: [], computedRule: null,
        aboutBeings: true,
        traceability: 'The wounds themselves are in the Gospels and in all Christian art; only the word is the book\'s.',
        citations: [
          ROHANE,
          cite('CBN', "'Heaven is for Real's' First Family: The Burpos", null, null, 'https://cbn.com/article/heaven/heaven-reals-first-family-burpos'),
        ],
      },
      {
        id: 'hifr-throne',
        label: "God's throne with Jesus at the right and Gabriel at the left",
        route: 'checklist',
        fullMatch: 'God is enthroned, with Jesus at his right and the angel Gabriel at his left.',
        partialMatch: 'The angel Gabriel at the left of God\'s throne, without Jesus at the right.',
        words: [], computedRule: null,
        aboutBeings: true,
        traceability: 'Jesus at God\'s right hand is scripture. Jewish tradition puts Gabriel at the left: the bedtime Shema asks for Michael at one\'s right and Gabriel at the left, and a midrash places four angels around the throne (sources differ on where it puts Gabriel). Only the combination is the book\'s.',
        citations: [NOZAKI, ELLIS],
      },
      {
        id: 'hifr-elevator',
        label: 'Jesus moves up and down like an elevator',
        route: 'checklist',
        fullMatch: 'Jesus moves straight up and down, likened to an elevator or a lift.',
        partialMatch: 'Jesus is the only one without wings among winged beings, with no likeness to an elevator.',
        words: [], computedRule: null,
        aboutBeings: true,
        traceability: 'Christ rising (the Ascension) is scripture, and the dead having wings is a folk image; the elevator is the book\'s.',
        citations: [
          LEONARD,
          cite('The Philippine Star', 'What Colton saw in heaven', 'Pit M. Maliksi', '2015-04-04',
            'https://www.philstar.com/entertainment/2015/04/04/1440408/what-colton-saw-heaven'),
        ],
      },
      {
        id: 'hifr-homework',
        label: 'Homework in heaven',
        route: 'checklist',
        fullMatch: 'The person is given homework or assignments while in heaven.',
        partialMatch: 'Jesus is the person\'s teacher in heaven, with no homework.',
        words: [], computedRule: null,
        aboutBeings: false,
        traceability: 'Being taught in heaven isn\'t new, and area 3 already codes a being who teaches; homework is the book\'s.',
        citations: [ELLIS, LEONARD],
      },
    ],
    note: 'Rejected as not specific enough: a dead relative recognized afterward from a photo of them young; a sibling lost in a miscarriage whom the experiencer didn\'t know about; Jesus\'s purple sash and white robe. Rejected because older sources have them: everyone in heaven having wings; Mary kneeling before the throne; Jesus\'s brown hair and blue-green eyes; angels with swords.',
  },
  {
    id: 'akiane-prince-of-peace',
    title: 'Prince of Peace (painting by Akiane Kramarik)',
    medium: 'painting',
    role: 'related_work',
    relatedTo: 'heaven-is-for-real',
    presentedAs: 'true',
    invented: false,
    firstWideAvailability: {
      event: 'painted, at age eight',
      date: '2002-07',
      citations: [
        cite('Official Akiane Gallery', 'The Story of Akiane Kramarik', null, null, 'https://akiane.com/my-story/'),
        cite('CBS News Chicago', "After Years In Darkness, Akiane Kramarik's Famous Painting Of Jesus Brought 'Into The Light Again'", null, '2019-12-13',
          'https://www.cbsnews.com/chicago/news/akiane-kramarik-prince-of-peace'),
        cite('Wikipedia', 'Akiane', null, null, 'https://en.wikipedia.org/wiki/Akiane'),
      ],
      note: 'No source gives the year. She was born in July 1994 and painted it at eight, so July 2002 is the earliest it could have existed. She appeared on Oprah Winfrey\'s show at eight or nine (sources differ). Only the validity check uses this date.',
    },
    boosts: [],
    names: { titles: ['Prince of Peace'], people: ['Akiane Kramarik', 'Akiane'] },
    ownNderfAccountIds: [],
    details: [],
    note: 'The boy in Heaven Is for Real picked this painting as the Jesus he saw. "Prince of Peace" is also a biblical title (Isaiah 9:6), but names are matched only in fields that name a work, never in running text.',
  },
]);

{
  const ids = [...MEDIA_SOURCES.map((s) => s.id), ...MEDIA_SOURCES.flatMap((s) => s.details.map((d) => d.id))];
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`id "${dup}" is used twice`);
  for (const s of MEDIA_SOURCES) {
    if (s.relatedTo !== null && MEDIA_SOURCES.find((t) => t.id === s.relatedTo)?.role !== 'source') {
      throw new Error(`${s.id}: relatedTo must name a source in the table`);
    }
  }
}

/** Names that could mean more than one source. They resolve to nothing; the analysis reports them. */
export const AMBIGUOUS_NAMES: Readonly<Record<string, string>> = {
  'heaven is real': 'Heaven Is for Real misremembered, or the Newsweek cover story for Proof of Heaven ("Heaven Is Real")',
};

// ─── Lookup ─────────────────────────────────────────────────────────────────────────────

/** A name occurs in a field when it appears there as whole words, after both are normalized like
 *  named figures (lowercase, accents and punctuation stripped, a leading "the" dropped), so a field
 *  that adds words around a title still names its source. */
const KEYS: { key: string; id: string }[] = [];
for (const s of MEDIA_SOURCES) {
  for (const name of [...s.names.titles, ...s.names.people]) {
    const key = normalizeName(name);
    if (key in AMBIGUOUS_NAMES) throw new Error(`name "${key}" is listed as ambiguous`);
    const other = KEYS.find((k) => k.key === key && k.id !== s.id);
    if (other) throw new Error(`name "${key}" is in two sources: ${other.id} and ${s.id}`);
    KEYS.push({ key, id: s.id });
  }
}

const occurs = (key: string, field: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(field);

export type SourceMatch = { found: string[] } | { ambiguous: string } | { unlisted: true };

/** Every source a field names (a title, an author, a named work). A field can name more than one. */
export function matchSources(field: string): SourceMatch {
  const f = normalizeName(field);
  const found = [...new Set(KEYS.filter((k) => occurs(k.key, f)).map((k) => k.id))];
  if (found.length > 0) return { found };
  const ambiguous = Object.keys(AMBIGUOUS_NAMES).find((k) => occurs(k, f));
  return ambiguous ? { ambiguous: AMBIGUOUS_NAMES[ambiguous] } : { unlisted: true };
}

export const sourceById = (id: string): MediaSource | undefined => MEDIA_SOURCES.find((s) => s.id === id);
