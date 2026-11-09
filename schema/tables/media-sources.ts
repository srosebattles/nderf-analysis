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

/** The rules computed details use, in words. Each is pre-registered here and implemented, from
 *  area 3's codes, in the area 4 resolver. */
export const COMPUTED_RULES: Readonly<Record<string, string>> = {
  angelGroupOf150: 'An encounter that has an angel claim, counted as a group of exactly 150.',
};

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
  /** word_rule only: the words or phrases, matched by wordRuleHits. */
  words: z.array(z.string().min(1)),
  /** word_rule only: ordinary words within reach of a long rule word, which never count
   *  ("midway" for "midwayer"). Found with an English word list; see DECISIONS.md. */
  neverMatch: z.array(z.string().min(1)),
  /** computed only: the name of the rule that computes it from area 3's codes. */
  computedRule: z.string().nullable(),
  /** Reported separately, since details about beings bear on the main question. */
  aboutBeings: z.boolean(),
  /** Which older sources were checked, and which parts of the detail fail on their own. */
  traceability: z.string().min(1),
  citations: z.array(Citation).min(1),
  /** What remains to check, for a detail still waiting for its second source; null once
   *  confirmed. None may remain at the freeze (unconfirmedDetails). */
  pendingCheck: z.string().min(1).nullable(),
}).superRefine((d, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message: `${d.id}: ${message}` });
  if (d.pendingCheck === null && !independent(d.citations)) issue('a confirmed detail needs two independent citations');
  if ((d.route === 'word_rule') !== (d.words.length > 0)) issue('words are given exactly for word rules');
  if (d.route !== 'word_rule' && d.neverMatch.length > 0) issue('neverMatch is for word rules only');
  if ((d.route === 'computed') !== (d.computedRule !== null)) issue('computedRule is given exactly for computed details');
  if (d.computedRule !== null && !(d.computedRule in COMPUTED_RULES)) issue(`unknown computed rule "${d.computedRule}"`);
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
  /** Practice pages that suggested this source. They stay in its counts; the write-up says so. */
  suggestedByAccountIds: z.array(z.string()),
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

const INTROVIGNE = cite('Dialogue: A Journal of Mormon Thought', 'Embraced by the Church? Betty Eadie, Near-Death Experiences, and Mormonism',
  'Massimo Introvigne', '1996', 'https://dialoguejournal.com/wp-content/uploads/sbi/articles/Dialogue_V29N03_107.pdf');
const A_HIGH_FIVE = cite('Publishers Weekly', 'A High Five', 'Daisy Maryles', '2004-12-13', 'https://www2.publishersweekly.com/pw/print/20041213/32259-a-high-five.html');
const FIVE_PEOPLE_LITCHARTS = cite('LitCharts', 'The Five People You Meet in Heaven Summary', null, null,
  'https://www.litcharts.com/lit/the-five-people-you-meet-in-heaven/summary');
const FIVE_PEOPLE_WIKIPEDIA = cite('Wikipedia', 'The Five People You Meet in Heaven', null, null, 'https://en.wikipedia.org/wiki/The_Five_People_You_Meet_in_Heaven');
const SHACK_WIKIPEDIA = cite('Wikipedia', 'The Shack (Young novel)', null, null, 'https://en.wikipedia.org/wiki/The_Shack_(Young_novel)');
const CHALLIES = cite('Challies.com', 'The Bestsellers: The Shack', 'Tim Challies', '2014-06-01', 'https://www.challies.com/articles/the-bestsellers-the-shack');
const DH_REACTOR = cite('Reactor', 'The Harry Potter Reread: The Deathly Hallows, Chapters 35 and 36', 'Emmet Asher-Perrin', '2016-05-20',
  'https://reactormag.com/the-harry-potter-reread-the-deathly-hallows-chapters-35-and-36/');
const DH_WIKIBOOKS = cite('Wikibooks', "Muggles' Guide to Harry Potter: Deathly Hallows, Chapter 35", null, null,
  'https://en.wikibooks.org/wiki/Muggles%27_Guide_to_Harry_Potter/Books/Deathly_Hallows/Chapter_35');
const HANEGRAAFF = cite('Christian Research Institute (Equip)', 'The Boy Who Came Back from Heaven: The Story Behind the Story', 'Hank Hanegraaff', '2014-04-23',
  'https://www.equip.org/articles/boy-came-back-heaven');
const GRAHAM = cite('Slate', '"I Did Not Die. I Did Not Go to Heaven."', 'Ruth Graham', '2019-07-09',
  'https://slate.com/human-interest/2019/07/the-boy-who-came-back-from-heaven-christian-book-scandal.html');
const PROOF_HUFFPOST = cite('HuffPost', 'Eben Alexander, Harvard Neurosurgeon, Describes Heaven After Near-Death Experience (VIDEO)', 'Cavan Sieczkowski', '2012-10-09',
  'https://www.huffpost.com/2012/10/09/eben-alexander-harvard-neurosurgeon-proof-of-heaven-afterlife-coma_n_1951475.html');
const BOYD = cite('ReKnew', 'Review of Proof of Heaven (Eben Alexander)', 'Greg Boyd', '2012-10-30', 'https://reknew.org/2012/10/review-of-proof-of-heaven-eben-alexander/');
const CHOW = cite('timothychow.net', "Review of Proof of Heaven: A Neurosurgeon's Journey into the Afterlife", null, '2018-06', 'https://timothychow.net/reviews/alexander.html');
const RUFFLES = cite('Society for Psychical Research', "Proof of Heaven: A Neurosurgeon's Journey into the Afterlife, by Eben Alexander", 'Tom Ruffles', null,
  'https://www.spr.ac.uk/node/8493');

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
    suggestedByAccountIds: [],
    details: [
      {
        id: 'hifr-horse',
        label: "Jesus's horse of many colors",
        route: 'checklist',
        fullMatch: 'A horse that belongs to Jesus or that he rides, described as rainbow-colored or as having many colors.',
        partialMatch: 'A horse described as rainbow-colored or as having many colors, not tied to Jesus.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
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
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
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
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
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
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
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
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
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
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
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
    suggestedByAccountIds: [],
    details: [],
    note: 'The boy in Heaven Is for Real picked this painting as the Jesus he saw. "Prince of Peace" is also a biblical title (Isaiah 9:6), but names are matched only in fields that name a work, never in running text.',
  },
  {
    id: 'urantia-book',
    title: 'The Urantia Book',
    medium: 'book',
    role: 'source',
    relatedTo: null,
    presentedAs: 'true',
    invented: false,
    firstWideAvailability: {
      event: 'first printing (Urantia Foundation)',
      date: '1955-10-12',
      citations: [
        cite('Urantia Foundation', 'Who We Are', null, null, 'https://urantia.org/urantia-foundation'),
        cite('Wikipedia', 'The Urantia Book', null, null, 'https://en.wikipedia.org/wiki/The_Urantia_Book'),
      ],
      note: "Before NDERF's first posting: the weaker experienced-before-versus-after comparison only.",
    },
    boosts: [],
    names: { titles: ['The Urantia Book', 'Urantia'], people: [] },
    ownNderfAccountIds: [],
    suggestedByAccountIds: ['1alejandro_m_nde'],
    details: [{
      id: 'urantia-coined-names',
      label: "The book's coined names",
      route: 'word_rule',
      fullMatch: 'Any of the words.',
      partialMatch: null,
      words: [
        'Nebadon', 'Salvington', 'Jerusem', 'Edentia', 'Uversa', 'Orvonton', 'Havona', 'Norlatiadek', 'Satania',
        'Divinington', 'Caligastia', 'Thought Adjuster', 'Thought Adjusters', 'Mystery Monitor', 'Mystery Monitors',
        'morontia', 'morontial', 'midwayer', 'midwayers',
      ],
      neverMatch: [
        'salpingion', 'fronton', 'boronia', 'gomontia', 'montia', 'morenita', 'moronic', 'moronity', 'strontia',
        'midway', 'midways', 'mislayer', 'mislayers', 'missayer',
      ],
      computedRule: null,
      pendingCheck: null,
      aboutBeings: false,
      traceability: 'Coined by the book; most are explained in a Urantia Book Fellowship study of its coined words. Some name beings (Thought Adjuster, midwayer, Caligastia), most name places. Left out because they are older: Melchizedek, "Ancients of Days" (Daniel), "morning stars" (Job), "dominions" (Colossians).',
      citations: [
        cite('Urantia Foundation', 'Term List and Pronunciation Guide for The Urantia Book', null, '2023',
          'https://urantia.org/sites/default/files/study-materials/terms-and-pronunciation/Term-and-Pronunciation-List-for-The-Urantia-Book-2023-en.pdf'),
        cite('Urantia Book Fellowship (archive)', 'A Glossary and Synopsis of The Urantia Book', null, null,
          'https://archive.urantiabook.org/archive/studyaid/glossary_1965.htm'),
        cite('Urantia Book Fellowship (archive)', 'Etymology of Coined Words in The Urantia Book', 'Chris Halvorson', null,
          'https://archive.urantiabook.org/studies/Halvorson/UrantiaBookEtymology.pdf'),
      ],
    }],
    note: 'Suggested by a practice page whose vocabulary resembles the book\'s without naming it. That page stays in the counts, and the write-up says so.',
  },
  {
    id: 'embraced-by-the-light',
    title: 'Embraced by the Light',
    medium: 'book',
    role: 'source',
    relatedTo: null,
    presentedAs: 'true',
    invented: false,
    firstWideAvailability: {
      event: 'first printing (Gold Leaf Press)',
      date: '1992-12',
      citations: [
        cite('Christian Research Institute (Equip)', 'Embraced by the Light', 'Richard Abanes', '2009-04-16', 'https://www.equip.org/?p=4162'),
        INTROVIGNE,
      ],
      note: "Introvigne gives 1992; Abanes gives the first printing as December 1992. Before NDERF's first posting: the weaker comparison only.",
    },
    boosts: [],
    names: { titles: ['Embraced by the Light'], people: ['Betty Eadie', 'Betty J. Eadie', 'Eadie'] },
    ownNderfAccountIds: [],
    suggestedByAccountIds: [],
    details: [
      {
        id: 'eadie-three-monks',
        label: 'Three monks as the experience begins',
        route: 'checklist',
        fullMatch: 'Three men who look like monks meet the person just after they leave the body.',
        partialMatch: 'Monk-like figures meet the person, but not three, or not at the start.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: "Single monk-like figures appear in other accounts; three together, as the experience begins, are the book's.",
        citations: [
          INTROVIGNE,
          cite('Christian Research Institute (Equip)', 'Deceived by the Light: A Christian Response to "Embraced by the Light"', 'Douglas Groothuis', '2014-04-15',
            'https://www.equip.org/articles/deceived-by-the-light/'),
        ],
      },
      {
        id: 'eadie-prayers-as-light',
        label: 'Prayers rising from earth as light',
        route: 'checklist',
        fullMatch: 'Prayers are seen rising from earth as beams or threads of light, with angels answering them.',
        partialMatch: 'Prayers are seen as light, without angels answering them.',
        words: [], neverMatch: [], computedRule: null,
        pendingCheck: 'A second source: a page reference in the book, to be checked by hand before the pipeline runs.',
        aboutBeings: true,
        traceability: "Prayers rising like incense are Revelation 8 and Psalm 141; as beams of light, with angels answering each one, they are the book's.",
        citations: [
          cite('Shortform', 'PDF Summary: Embraced by the Light, by Betty J. Eadie', null, null,
            'https://www.shortform.com/pdf/embraced-by-the-light-pdf-betty-j-eadie'),
        ],
      },
      {
        id: 'eadie-looms',
        label: 'A room of looms',
        route: 'checklist',
        fullMatch: 'A room where spirits weave cloth or clothing on looms, for new arrivals or for others.',
        partialMatch: 'Spirits weaving, with no looms.',
        words: [], neverMatch: [], computedRule: null,
        pendingCheck: 'A second source: a page reference in the book, to be checked by hand before the pipeline runs.',
        aboutBeings: true,
        traceability: 'No tradition found.',
        citations: [
          cite('Grace Evangelical Society', 'Embraced by the Light (book review)', 'Brad McCoy', null, 'https://faithalone.org/?p=16324'),
        ],
      },
    ],
    note: 'Left out: a council of twelve men who send her back (the twelve apostles judging, Matthew 19:28, and for Latter-day Saints the Quorum of the Twelve); a "library of the mind" (compared by Introvigne to the Akashic records of earlier esoteric writing); pre-mortal spirits choosing their lives and the "veil of forgetfulness" (Latter-day Saint teaching).',
  },
  {
    id: 'five-people-you-meet-in-heaven',
    title: 'The Five People You Meet in Heaven',
    medium: 'book',
    role: 'source',
    relatedTo: null,
    presentedAs: 'fiction',
    invented: true,
    firstWideAvailability: {
      event: 'book published (Hyperion)',
      date: '2003-09',
      citations: [
        cite('Wikipedia', 'Mitch Albom', null, null, 'https://en.wikipedia.org/wiki/Mitch%20Albom'),
        A_HIGH_FIVE,
      ],
      note: 'Wikipedia gives September 2003; Publishers Weekly says the first printing was announced then. Few accounts were posted before it (about 200).',
    },
    boosts: [{
      event: 'ABC television film premiered',
      date: '2004-12-05',
      citations: [A_HIGH_FIVE, cite("Mitch Albom's site", 'Film', null, null, 'https://www.mitchalbom.com/film/')],
      note: "Albom's site gives December 2004; Publishers Weekly gives December 5.",
    }],
    names: { titles: ['The Five People You Meet in Heaven'], people: ['Mitch Albom', 'Albom'] },
    ownNderfAccountIds: [],
    suggestedByAccountIds: [],
    details: [
      {
        id: 'five-people-blue-skin',
        label: 'A man with blue skin',
        // On the checklist since the visual details moved to a later pass (DECISIONS.md, "What the
        // first run codes, and what waits"); until then it was computed from the blue-skin feature.
        route: 'checklist',
        fullMatch: "A human being with blue skin, who is not a deity or other religious figure, and whose color isn't explained by how they died.",
        partialMatch: null,
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: 'Blue skin otherwise points to Hindu deities (the visual-feature map), which the wording leaves out, as it does a person whose color comes from the manner of death.',
        citations: [FIVE_PEOPLE_LITCHARTS, FIVE_PEOPLE_WIKIPEDIA],
      },
      {
        id: 'five-people-lessons',
        label: 'Five people, each with a lesson',
        route: 'checklist',
        fullMatch: 'The person meets exactly five people from their life, some of them strangers, each explaining a lesson or how their lives were connected.',
        partialMatch: 'The person meets people from their life who each explain how their lives were connected, with no count of five.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: "Meeting the dead is standard; exactly five, each with a lesson, is the book's.",
        citations: [FIVE_PEOPLE_LITCHARTS, FIVE_PEOPLE_WIKIPEDIA],
      },
    ],
    note: "Left out: traveling through shifting colors before the first meeting (one source); each person's heaven as a place from their own life (an old idea); the war scenes (too tied to the story's plot).",
  },
  {
    id: 'the-shack',
    title: 'The Shack',
    medium: 'book',
    role: 'source',
    relatedTo: null,
    presentedAs: 'fiction',
    invented: true,
    firstWideAvailability: {
      event: 'book self-published (Windblown Media)',
      date: '2007-05',
      citations: [
        SHACK_WIKIPEDIA,
        cite('The Globe and Mail', 'God (and self-publishing) made this man rich', 'James Adams', '2009-05-20',
          'https://www.theglobeandmail.com/arts/books-and-media/god-and-self-publishing-made-this-man-rich/article1197859/'),
      ],
      note: 'Wikipedia gives May 2007; The Globe and Mail, the spring of 2007.',
    },
    boosts: [{
      event: 'film released in the US',
      date: '2017-03',
      citations: [
        cite('Wikipedia', 'The Shack (2017 film)', null, null, 'https://en.wikipedia.org/wiki/The_Shack_(2017_film)'),
        cite('TheWrap', "'The Shack' Review: Octavia Spencer Isn't Foundation Enough for This Phony Sap-Fest", 'Dan Callahan', '2017-03-02',
          'https://www.thewrap.com/the-shack-review-octavia-spencer-sam-worthington'),
      ],
      note: "Wikipedia gives March 3, 2017; TheWrap's review ran the day before.",
    }],
    names: { titles: ['The Shack'], people: ['William Paul Young', 'William P. Young', 'Wm. Paul Young'] },
    ownNderfAccountIds: [],
    suggestedByAccountIds: [],
    details: [
      {
        id: 'shack-god-as-black-woman',
        label: 'God the Father as a Black woman',
        route: 'checklist',
        fullMatch: 'God (the Father) appears as a Black or African American woman.',
        partialMatch: 'God appears as a woman.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: 'God as a woman alone has older sources (Divine Mother traditions, Goddess spirituality, maternal images of God in Isaiah), and "Papa" alone is "Abba" (Romans 8).',
        citations: [SHACK_WIKIPEDIA, CHALLIES],
      },
      {
        id: 'shack-spirit-as-asian-woman',
        label: 'The Holy Spirit as an Asian woman',
        route: 'checklist',
        fullMatch: 'The Holy Spirit appears as an Asian woman, or is called Sarayu.',
        partialMatch: 'The Holy Spirit appears as a woman.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: 'A feminine Spirit has older roots (early Syriac Christianity). "Sarayu" is not a word rule: it is also a sacred river in Hindu tradition and a common Indian given name.',
        citations: [SHACK_WIKIPEDIA, CHALLIES],
      },
      {
        id: 'shack-god-as-native-american-man',
        label: 'God as an older Native American man',
        route: 'checklist',
        fullMatch: 'God (the Father) appears as an older Native American man.',
        partialMatch: null,
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: "For Native American experiencers the Creator as an elder may come from their own tradition; it counts all the same, and the analysis can look at it by tradition.",
        citations: [
          SHACK_WIKIPEDIA,
          cite('The Irish Times', 'The Shack review: A vision of heaven that feels like purgatory', 'Tara Brady', '2017-06-08',
            'https://www.irishtimes.com/culture/film/the-shack-review-a-vision-of-heaven-that-feels-like-purgatory-1.3109579'),
        ],
      },
      {
        id: 'shack-elousia',
        label: '"Elousia"',
        route: 'word_rule',
        fullMatch: 'The word "Elousia."',
        partialMatch: null,
        words: ['Elousia'],
        neverMatch: [],
        computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: 'Coined in the book, from Hebrew and Greek words for God and being.',
        citations: [
          SHACK_WIKIPEDIA,
          cite('LitCharts', 'The Shack Character Analysis', null, null, 'https://www.litcharts.com/lit/the-shack/characters'),
        ],
      },
    ],
    note: 'Left out: Wisdom as a woman who makes him sit in judgment (Wisdom personified is Proverbs 8; no page confirmed the judgment seat); his dead daughter seen by a waterfall (no page confirmed it); Jesus as a Middle Eastern carpenter (the Gospels).',
  },
  {
    id: 'deathly-hallows',
    title: 'Harry Potter and the Deathly Hallows',
    medium: 'book_chapter',
    role: 'source',
    relatedTo: null,
    presentedAs: 'fiction',
    invented: true,
    firstWideAvailability: {
      event: 'book released',
      date: '2007-07-21',
      citations: [
        cite('Wikipedia', 'Harry Potter and the Deathly Hallows', null, null, 'https://en.wikipedia.org/wiki/Harry_Potter_and_the_Deathly_Hallows'),
        cite('Lawrence Journal-World (AP)', "'Potter' makes sales records disappear", 'Hillel Italie', '2007-07-23',
          'https://www2.ljworld.com/news/2007/jul/23/potter_makes_sales_records_disappear/'),
      ],
      note: 'The AP story says it was released on Saturday, July 21.',
    },
    boosts: [{
      event: 'film (Part 2) released in the UK and US',
      date: '2011-07-15',
      citations: [
        cite('Wikipedia', 'Harry Potter and the Deathly Hallows – Part 2', null, null,
          'https://en.wikipedia.org/wiki/Harry_Potter_and_the_Deathly_Hallows_%E2%80%93_Part_2'),
        cite('Deep Focus Review', 'Harry Potter and the Deathly Hallows: Part 2 (2011)', 'Brian Eggert', '2011-07-15', 'https://www.deepfocusreview.com/?p=3644'),
      ],
      note: '',
    }],
    names: {
      titles: ['Harry Potter and the Deathly Hallows', 'Deathly Hallows', 'Harry Potter'],
      people: ['J. K. Rowling', 'Rowling'],
    },
    ownNderfAccountIds: [],
    suggestedByAccountIds: [],
    details: [
      {
        id: 'deathly-hallows-creature',
        label: 'A flayed, infant-like creature',
        route: 'checklist',
        fullMatch: 'A small, flayed or raw-skinned, infant-like creature, whimpering or suffering, which the person is told cannot be helped.',
        partialMatch: 'The same creature, without being told it cannot be helped.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: 'No tradition found.',
        citations: [DH_REACTOR, DH_WIKIBOOKS],
      },
      {
        id: 'deathly-hallows-station',
        label: 'A railway station as the in-between place',
        route: 'checklist',
        fullMatch: 'The in-between place appears as a railway station, bright, clean, and empty, or in white mist.',
        partialMatch: 'A train that will take the person onward, with no station.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: false,
        traceability: 'Trains to glory are an old gospel-song image, so a train alone is only partial.',
        citations: [
          DH_REACTOR, DH_WIKIBOOKS,
          cite('Harry Potter Lexicon', "DH35: King's Cross", null, null, 'https://www.hp-lexicon.org/?p=1672'),
        ],
      },
    ],
    note: 'The details are from chapter 35, "King\'s Cross." Any mention of Harry Potter counts as naming this source, which is generous: a comparison may be to another scene. Left out: clothes appearing when wished for (thought creating things is common in NDE accounts); being offered a return or a way onward (standard NDE content).',
  },
  {
    id: 'boy-who-came-back-from-heaven',
    title: 'The Boy Who Came Back from Heaven',
    medium: 'book',
    role: 'source',
    relatedTo: null,
    presentedAs: 'true',
    invented: true,
    firstWideAvailability: {
      event: 'book published (Tyndale)',
      date: '2010-03',
      citations: [
        cite('Christianity Today', "The 'Boy Who Came Back from Heaven' Retracts Story", 'Sarah Eekhoff Zylstra', '2015-01-15',
          'https://www.christianitytoday.com/2015/01/boy-who-came-back-from-heaven-retraction'),
        cite('Wikipedia', 'The Boy Who Came Back from Heaven', null, null, 'https://en.wikipedia.org/wiki/The_Boy_Who_Came_Back_from_Heaven'),
      ],
      note: 'Christianity Today says March 2010; Wikipedia gives July 2, 2010. The earlier date is used. Alex Malarkey retracted the story on January 13, 2015, and Tyndale withdrew the book (Wikipedia).',
    },
    boosts: [],
    names: { titles: ['The Boy Who Came Back from Heaven'], people: ['Malarkey', 'Alex Malarkey', 'Kevin Malarkey'] },
    ownNderfAccountIds: [],
    suggestedByAccountIds: [],
    details: [
      {
        id: 'malarkey-moldy-teeth',
        label: "The devil's moldy teeth",
        route: 'checklist',
        fullMatch: 'The devil, or a demon, has moldy teeth.',
        partialMatch: 'The devil has no ears, or hair made of fire, without moldy teeth.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: "The three heads also reported are Dante's Satan, so they are not used. Moldy teeth are the book's.",
        citations: [
          cite('Psi Encyclopedia (Society for Psychical Research)', "'The Boy Who Came Back from Heaven' (recanted NDE)", 'K. M. Wehrstein', '2018-01-22',
            'https://psi-encyclopedia.spr.ac.uk/articles/boy-who-came-back-heaven-recanted-nde/'),
          HANEGRAAFF, GRAHAM,
        ],
      },
      {
        id: 'malarkey-150-angels',
        label: '150 angels',
        route: 'computed',
        fullMatch: 'Exactly 150 angels.',
        partialMatch: null,
        words: [], neverMatch: [], computedRule: 'angelGroupOf150', pendingCheck: null,
        aboutBeings: true,
        traceability: 'No scriptural or traditional count of 150; the numbers in Revelation are 144,000 and "ten thousand times ten thousand."',
        citations: [HANEGRAAFF, GRAHAM],
      },
    ],
    note: 'Believed when read, invented in fact: the cleanest test of borrowing. Left out, with only one source each: unearthly music that sounded terrible; muscular angels like wrestlers; hell seen through an opening from heaven; cities that dwarf New York; green demons with long fingernails.',
  },
  {
    id: 'proof-of-heaven',
    title: 'Proof of Heaven',
    medium: 'book',
    role: 'source',
    relatedTo: null,
    presentedAs: 'true',
    invented: false,
    firstWideAvailability: {
      event: 'Newsweek cover story published online',
      date: '2012-10',
      citations: [
        cite('Why Evolution Is True', 'OMG: Newsweek touts the afterlife as real', null, '2012-10-08',
          'https://whyevolutionistrue.com/2012/10/08/omg-newsweek-touts-the-afterlife-as-real/'),
        PROOF_HUFFPOST,
      ],
      note: 'The excerpt was online by October 7 or 8, 2012; the print issue is dated October 15.',
    },
    boosts: [{
      event: 'book published (Simon & Schuster)',
      date: '2012-10-23',
      citations: [cite('Wikipedia', 'Proof of Heaven', null, null, 'https://en.wikipedia.org/wiki/Proof_of_Heaven'), PROOF_HUFFPOST],
      note: '',
    }],
    names: { titles: ['Proof of Heaven'], people: ['Eben Alexander'] },
    ownNderfAccountIds: [],
    suggestedByAccountIds: [],
    details: [
      {
        id: 'proof-butterfly',
        label: 'Riding a butterfly',
        route: 'checklist',
        fullMatch: "The person rides on a butterfly or on a butterfly's wing.",
        partialMatch: null,
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: false,
        traceability: "Butterflies as souls are old symbolism, but riding one is the book's. In the book a girl rides with him; she is not required.",
        citations: [BOYD, CHOW, RUFFLES],
      },
      {
        id: 'proof-three-part-message',
        label: 'A three-part message',
        route: 'checklist',
        fullMatch: 'A wordless message in three parts: the person is loved and cherished, has nothing to fear, and can do nothing wrong.',
        partialMatch: 'The person is told there is nothing they can do wrong, without the other two parts.',
        words: [], neverMatch: [], computedRule: null, pendingCheck: null,
        aboutBeings: true,
        traceability: 'Being loved, and having nothing to fear, are common in NDE accounts on their own, so only the three together count.',
        citations: [BOYD, CHOW],
      },
      {
        id: 'proof-earthworm',
        label: '"Earthworm\'s-eye view"',
        route: 'word_rule',
        fullMatch: 'The phrase "earthworm\'s-eye view," with or without the hyphen, apostrophe, or s.',
        partialMatch: null,
        words: ["earthworm's-eye view", 'earthworm-eye view'],
        neverMatch: [],
        computedRule: null, pendingCheck: null,
        aboutBeings: false,
        traceability: '"Worm\'s-eye view" is an ordinary idiom and is not matched; the earthworm form is the book\'s.',
        citations: [CHOW, RUFFLES],
      },
    ],
    note: 'Left out: "Om" as his name for God (the sacred syllable of Hindu and Buddhist practice); recognizing the girl afterward from a photo of a sister he never knew (the kind of detail rejected for Heaven Is for Real); the "Spinning Melody" (no page found); the "Orb" (one source).',
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

// ─── Decoys ─────────────────────────────────────────────────────────────────────────────

/** A made-up detail that no known source has, mixed into the checklist at random and worded like
 *  the real ones, so the coder can't tell them apart. Its hit rate measures the coder's false
 *  positives plus coincidence. Each was searched on the web first (with NDERF's own sites
 *  excluded, so no account text came back), and the nearest things found are recorded. */
export const Decoy = z.strictObject({
  id: z.string().regex(/^decoy(-[a-z0-9]+)+$/),
  label: z.string().min(1),
  fullMatch: z.string().min(1),
  partialMatch: z.string().nullable(),
  aboutBeings: z.boolean(),
  /** The nearest things the web search found, and why they don't make the decoy a real detail. */
  nearestFound: z.string().min(1),
  searched: PartialDate,
});
export type Decoy = z.infer<typeof Decoy>;

export const DECOYS: readonly Decoy[] = z.array(Decoy).parse([
  {
    id: 'decoy-name-tag',
    label: 'A name tag in a script the person can read but does not know',
    fullMatch: 'The person is given or wears their own name tag or badge, with their name on it in a script or language they do not know but can read.',
    partialMatch: 'The person is given or wears their own name tag or badge in the otherworldly part of the experience, with no unfamiliar script.',
    aboutBeings: false,
    nearestFound: 'Afterlife waiting rooms with tickets or badges (Beetlejuice; a short story). The wording keeps clear of a new name written on a white stone (Revelation 2:17) and names written in a book (Revelation 20), and of staff name tags in a hospital.',
    searched: '2026-11-09',
  },
  {
    id: 'decoy-white-hedgehog',
    label: 'A white hedgehog as a guide',
    fullMatch: "A white hedgehog, not the person's own pet, leads or guides them.",
    partialMatch: "A hedgehog of another color, not the person's own pet, leads or guides them.",
    aboutBeings: true,
    nearestFound: 'Dream-meaning and spirit-animal sites that give hedgehogs general meanings. White hedgehogs are kept as pets, hence the exclusion; animal guides in general are real, hence the hedgehog.',
    searched: '2026-11-09',
  },
  {
    id: 'decoy-hockey-stick',
    label: 'A man who will not put down his hockey stick',
    fullMatch: 'A man refuses to put down his hockey stick or skates when an angel or other being tells him he must, to enter a paradise.',
    partialMatch: null,
    aboutBeings: true,
    nearestFound: 'Hockey-in-heaven jokes, and a satirical piece in which a famous player arrives in heaven and plays pond hockey. Refusing to let go of something in order to enter heaven is the structure of C. S. Lewis\'s The Great Divorce, so nothing looser than the equipment counts.',
    searched: '2026-11-09',
  },
  {
    id: 'decoy-empty-birdcages',
    label: 'Dark figures carrying empty birdcages',
    fullMatch: 'Shadowy or dark figures carry empty birdcages.',
    partialMatch: null,
    aboutBeings: true,
    nearestFound: 'Birds as souls of the dead, in widespread folklore, which is why a partial match on birds would be inflated; nothing has figures carrying empty cages.',
    searched: '2026-11-09',
  },
  {
    id: 'decoy-paper-staircase',
    label: 'A staircase of folded paper',
    fullMatch: 'A staircase made of folded paper.',
    partialMatch: null,
    aboutBeings: false,
    nearestFound: 'An origami fold called the Devil\'s Staircase, and stock paper-art of stairways to heaven; neither is a story or belief about an afterlife.',
    searched: '2026-11-09',
  },
  {
    id: 'decoy-bicycle-tunnel',
    label: 'A bicycle in the tunnel',
    fullMatch: 'The person rides a bicycle through the tunnel, or toward the light.',
    partialMatch: null,
    aboutBeings: false,
    nearestFound: 'A tunnel ride likened to a fairground ride, and fiction about cycling in heaven; nothing with a bicycle in the tunnel.',
    searched: '2026-11-09',
  },
  {
    id: 'decoy-moth-of-light',
    label: 'A giant moth of light that speaks in colors',
    fullMatch: 'A giant moth made of light speaks or communicates with the person through colors.',
    partialMatch: null,
    aboutBeings: true,
    nearestFound: 'Moth folklore (souls of the dead in Celtic tradition) and spirit-animal sites, which is why a moth alone is no partial match; nothing has one made of light that communicates in colors.',
    searched: '2026-11-09',
  },
]);

{
  const detailIds = new Set(MEDIA_SOURCES.flatMap((s) => s.details.map((d) => d.id)));
  const ids = DECOYS.map((d) => d.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i || detailIds.has(id));
  if (dup) throw new Error(`decoy id "${dup}" is used twice`);
}

/** Names that could mean more than one source. They resolve to nothing; the analysis reports them. */
export const AMBIGUOUS_NAMES: Readonly<Record<string, string>> = {
  'heaven is real': 'Heaven Is for Real misremembered, or the Newsweek cover story for Proof of Heaven ("Heaven Is Real")',
};

// ─── Word rules ─────────────────────────────────────────────────────────────────────────

/** A single rule word this long or longer may differ by up to WORD_RULE_MAX_EDITS letters. */
export const WORD_RULE_MIN_FUZZY_LENGTH = 8;
export const WORD_RULE_MAX_EDITS = 2;

/** Lowercase, apostrophes removed, hyphens and other punctuation separating words. */
const wordTokens = (s: string): string[] =>
  s.normalize('NFC').toLowerCase().replace(/['\u2018\u2019]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [];

/** Optimal string alignment distance: insertions, deletions, substitutions, and swapped neighbors. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** The pre-registered word rule (DECISIONS.md, area 4), run in the derived file after the freeze.
 *  Text and rule words are compared in lowercase with apostrophes removed; hyphens separate words.
 *  A single rule word of eight letters or more matches a word within two edits of it, unless that
 *  word is in the detail's neverMatch list; shorter words, and phrases of more than one word,
 *  must match exactly. Returns each match, once per position in the text. */
export function wordRuleHits(text: string, rule: Pick<Detail, 'words' | 'neverMatch'>): string[] {
  const tokens = wordTokens(text);
  const never = new Set(rule.neverMatch.flatMap(wordTokens));
  const hits = new Map<number, string>();
  for (const phrase of rule.words.map(wordTokens)) {
    if (phrase.length === 1 && phrase[0].length >= WORD_RULE_MIN_FUZZY_LENGTH) {
      tokens.forEach((t, i) => {
        if (!never.has(t) && editDistance(t, phrase[0]) <= WORD_RULE_MAX_EDITS) hits.set(i, t);
      });
    } else {
      for (let i = 0; i + phrase.length <= tokens.length; i++) {
        if (phrase.every((w, k) => tokens[i + k] === w)) hits.set(i, tokens.slice(i, i + phrase.length).join(' '));
      }
    }
  }
  return [...hits.entries()].sort((a, b) => a[0] - b[0]).map(([, w]) => w);
}

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

/** Details still waiting for their second source. The freeze requires this to be empty. */
export const unconfirmedDetails = (): { sourceId: string; detailId: string; pendingCheck: string }[] =>
  MEDIA_SOURCES.flatMap((s) => s.details.flatMap((d) => (d.pendingCheck === null ? [] : [{ sourceId: s.id, detailId: d.id, pendingCheck: d.pendingCheck }])));
