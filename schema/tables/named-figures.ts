// Pre-registered table: named figures, living religious leaders, named angels, and named
// hostile beings, with each one's subcategory and home traditions. Built from the requirements,
// the practice pages, and general knowledge, never by searching other accounts. Frozen with the
// codebook; names added later go in a logged addendum. Rules are in DECISIONS.md.
import { z } from 'zod';
import { NamedFigureSubcategory } from '../codebook-schema.ts';
import { BIBLE_READERS, CHRISTIAN, HomeTradition, MUSLIM, ORTHODOX, PROTESTANT } from './traditions.ts';

export const NAMED_FIGURES_TABLE_VERSION = '0.1-draft';
/** Living status is as of this date; checked again at the freeze. */
export const LIVING_AS_OF = '2026-11';

type H = HomeTradition;
type Sub = z.infer<typeof NamedFigureSubcategory>;

/** A year (negative for BCE), 'alive', 'unknown' (a saint with no reliable date), or
 *  'not_applicable' (deities, bodhisattvas, angels, mythic and scriptural figures). */
export const Died = z.union([z.number().int().min(-3000).max(2100), z.enum(['alive', 'unknown', 'not_applicable'])]);
export type Died = z.infer<typeof Died>;

export const NamedEntry = z.strictObject({
  canonicalName: z.string().min(1),
  /** Other names and spellings, matched after normalizing (see normalizeName). */
  aliases: z.array(z.string().min(1)),
  /** figure: a named figure or (while alive) a living religious leader; angel and hostile_being
   *  keep their own encounter categories and only take a name and home from the table. */
  kind: z.enum(['figure', 'angel', 'hostile_being']),
  subcategory: NamedFigureSubcategory.nullable(),
  died: Died,
  homes: z.array(HomeTradition).min(1),
  note: z.string(),
}).superRefine((e, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message: `${e.canonicalName}: ${message}` });
  if ((e.kind === 'figure') !== (e.subcategory !== null)) issue('a subcategory is given exactly for figures');
  const year = typeof e.died === 'number' ? e.died : null;
  // The saints rule: grouped by when they died, never by who canonized them or when.
  switch (e.subcategory) {
    case 'early_or_medieval_saint':
      if (!(year !== null ? year < 1517 : e.died === 'unknown')) issue('early or medieval saints died before 1517');
      break;
    case 'post_reformation_catholic_saint':
    case 'protestant_saint_or_luminary':
      if (!(year !== null ? year >= 1517 : e.died === 'alive')) issue('died after about 1517');
      break;
    case 'orthodox_saint':
      if (year !== null && year <= 451) issue('Orthodox saints died after the split their branch dates from');
      break;
  }
  if (e.subcategory === 'non_religious_historical_figure' && (e.homes.length !== 1 || e.homes[0] !== 'secular')) {
    issue('non-religious figures have the secular home only');
  }
});
export type NamedEntry = z.infer<typeof NamedEntry>;

// ─── Helpers ────────────────────────────────────────────────────────────────────────────

interface Opts { aliases?: string[]; note?: string; homes?: readonly H[] }
const entry = (kind: NamedEntry['kind'], subcategory: Sub | null, canonicalName: string, died: Died, homes: readonly H[], o: Opts = {}): NamedEntry =>
  ({ canonicalName, aliases: o.aliases ?? [], kind, subcategory, died, homes: [...(o.homes ?? homes)], note: o.note ?? '' });
const fig = (subcategory: Sub) => (name: string, died: Died, homes: readonly H[], o?: Opts) => entry('figure', subcategory, name, died, homes, o);

/** Shared-heritage saints: their homes follow from when they died and which split divides them.
 *  Before Chalcedon (451): every Christian column. 451 to 1054, Chalcedonian: Catholic, Eastern
 *  Orthodox, and Protestants. Western saints 1054 to about 1517: Catholic and Protestants. */
const sharedHomes = (died: Died): H[] => {
  const y = typeof died === 'number' ? died : null;
  if (y !== null && y <= 451) return [...CHRISTIAN];
  if (y !== null && y <= 1054) return ['catholic', 'eastern_orthodox', ...PROTESTANT];
  return ['catholic', ...PROTESTANT]; // Western, 1054 to about 1517 (override for anyone else)
};
const early = (name: string, died: Died, o: Opts = {}) => entry('figure', 'early_or_medieval_saint', name, died, sharedHomes(died), o);
const eo = (name: string, died: number, o?: Opts) => entry('figure', 'orthodox_saint', name, died, ['eastern_orthodox'], o);
const oo = (name: string, died: number, o?: Opts) => entry('figure', 'orthodox_saint', name, died, ['oriental_orthodox'], o);
const rc = (name: string, died: number, o?: Opts) => entry('figure', 'post_reformation_catholic_saint', name, died, ['catholic'], o);
const prot = (name: string, died: Died, homes: readonly H[], o?: Opts) => entry('figure', 'protestant_saint_or_luminary', name, died, homes, o);
const bib = fig('biblical_figure');
const ABRAHAMIC: H[] = ['jewish', ...BIBLE_READERS, ...MUSLIM];
const HEBREW_BIBLE: H[] = ['jewish', ...BIBLE_READERS];
const other = fig('other_religious_figure');
const guru = fig('modern_guru_or_teacher');
const deity = (name: string, o?: Opts) => entry('figure', 'hindu_deity', name, 'not_applicable', ['hindu'], o);
const imam = (name: string, died: Died, homes: readonly H[], o?: Opts) => entry('figure', 'shia_imam', name, died, homes, o);
const sikh = (name: string, died: number, o?: Opts) => entry('figure', 'sikh_figure', name, died, ['sikh'], o);
const secular = (name: string, died: Died, o?: Opts) => entry('figure', 'non_religious_historical_figure', name, died, ['secular'], o);
const angel = (name: string, homes: readonly H[], o?: Opts) => entry('angel', null, name, 'not_applicable', homes, o);
const hostile = (name: string, homes: readonly H[], o?: Opts) => entry('hostile_being', null, name, 'not_applicable', homes, o);
const TOBIT: H[] = ['jewish', 'catholic', ...ORTHODOX, 'lutheran', 'anglican'];

// ─── The table ──────────────────────────────────────────────────────────────────────────

export const NAMED_FIGURES: readonly NamedEntry[] = z.array(NamedEntry).parse([
  // ── Early and medieval saints (shared heritage) ──
  early('Polycarp', 155),
  early('Ignatius of Antioch', 108),
  early('Justin Martyr', 165),
  early('Irenaeus', 202),
  early('Perpetua', 203),
  early('Cyprian', 258),
  early('Valentine', 269),
  early('Sebastian', 288),
  early('George', 303, { aliases: ['saint george'] }),
  early('Agnes', 304),
  early('Lucy', 304, { aliases: ['saint lucia'] }),
  early('Catherine of Alexandria', 305),
  early('Nicholas of Myra', 343, { aliases: ['saint nicholas', 'nicholas of bari'] }),
  early('Anthony the Great', 356, { aliases: ['anthony of egypt'] }),
  early('Athanasius', 373),
  early('Ephrem the Syrian', 373),
  early('Basil the Great', 379),
  early('Monica', 387),
  early('Gregory of Nazianzus', 390, { aliases: ['gregory the theologian'] }),
  early('Gregory of Nyssa', 395),
  early('Ambrose', 397),
  early('Martin of Tours', 397),
  early('John Chrysostom', 407),
  early('Jerome', 420),
  early('Augustine of Hippo', 430, { aliases: ['saint augustine'] }),
  early('Cyril of Alexandria', 444),
  early('Germanus of Auxerre', 448),
  early('Patrick', 461, { aliases: ['saint patrick'] }),
  early('Leo the Great', 461, { note: 'Oriental Orthodox reject his Tome; not a shared saint for them.' }),
  early('Brigid of Kildare', 525, { aliases: ['saint brigid', 'saint bridget of ireland'] }),
  early('Scholastica', 543),
  early('Benedict of Nursia', 547, { aliases: ['saint benedict'] }),
  early('Germanus of Paris', 576),
  early('David of Wales', 589, { aliases: ['saint david'] }),
  early('Columba', 597),
  early('Gregory the Great', 604, { aliases: ['pope gregory the great'] }),
  early('Columbanus', 615),
  early('Isidore of Seville', 636),
  early('Aidan of Lindisfarne', 651),
  early('Maximus the Confessor', 662),
  early('Hilda of Whitby', 680),
  early('Cuthbert', 687),
  early('Bede', 735, { aliases: ['the venerable bede'] }),
  early('John of Damascus', 749),
  early('Boniface', 754),
  early('Cyril the Apostle to the Slavs', 869, { aliases: ['cyril and methodius'] }),
  early('Methodius', 885),
  early('Wenceslaus', 935),
  early('Olga of Kyiv', 969),
  early('Vladimir the Great', 1015, { aliases: ['vladimir of kyiv'] }),
  early('Symeon the New Theologian', 1022),
  early('Edward the Confessor', 1066),
  early('Margaret of Scotland', 1093),
  early('Anselm of Canterbury', 1109),
  early('Bernard of Clairvaux', 1153),
  early('Thomas Becket', 1170),
  early('Hildegard of Bingen', 1179),
  early('Dominic', 1221, { aliases: ['saint dominic'] }),
  early('Francis of Assisi', 1226, {
    aliases: ['saint francis'],
    note: 'A bare "Saint Francis" means Assisi by strong convention; Xavier and de Sales are written out. A bare "Francis" is ambiguous.',
  }),
  early('Anthony of Padua', 1231, { note: 'A bare "Saint Anthony" is ambiguous with Anthony the Great; context decides.' }),
  early('Elizabeth of Hungary', 1231),
  early('Clare of Assisi', 1253, { aliases: ['saint clare'] }),
  early('Thomas Aquinas', 1274),
  early('Bonaventure', 1274),
  early('Bridget of Sweden', 1373, { aliases: ['birgitta of sweden'] }),
  early('Catherine of Siena', 1380),
  early('Julian of Norwich', 1416, { note: 'Never formally canonized; commemorated in Anglican and Lutheran calendars and honored by Catholics.' }),
  early('Vincent Ferrer', 1419),
  early('Joan of Arc', 1431, { note: 'Died 1431, canonized 1920: dated by death.' }),
  early('Bernardino of Siena', 1444),
  early('Rita of Cascia', 1457),
  early('Nicholas of Flue', 1487, { aliases: ['brother klaus'] }),
  early('Francis of Paola', 1507),
  entry('figure', 'early_or_medieval_saint', 'Anne', 'unknown', ['catholic', ...ORTHODOX, 'anglican'], {
    aliases: ['saint anne', 'saint ann'],
    note: 'Mother of Mary, from tradition (the Protoevangelium of James), not scripture.',
  }),
  entry('figure', 'early_or_medieval_saint', 'Joachim', 'unknown', ['catholic', ...ORTHODOX, 'anglican'], { note: 'Father of Mary, from tradition.' }),

  // ── Orthodox saints (Eastern after 1054; Oriental after 451) ──
  eo('Sava of Serbia', 1236),
  eo('Alexander Nevsky', 1263),
  eo('Gregory Palamas', 1359),
  eo('Sergius of Radonezh', 1392),
  eo('Andrei Rublev', 1430),
  eo('Mark of Ephesus', 1444),
  eo('Nil Sorsky', 1508),
  eo('Tikhon of Zadonsk', 1783),
  eo('Paisius Velichkovsky', 1794),
  eo('Xenia of Saint Petersburg', 1803),
  eo('Seraphim of Sarov', 1833),
  eo('Herman of Alaska', 1837),
  eo('Innocent of Alaska', 1879),
  eo('Ambrose of Optina', 1891),
  eo('John of Kronstadt', 1908),
  eo('Elizabeth the New Martyr', 1918, { aliases: ['elizabeth feodorovna'] }),
  eo('Nektarios of Aegina', 1920),
  eo('Tikhon of Moscow', 1925),
  eo('Silouan the Athonite', 1938),
  eo('Matrona of Moscow', 1952),
  eo('Luke of Crimea', 1961),
  eo('John of Shanghai and San Francisco', 1966, { aliases: ['john maximovitch'] }),
  eo('Porphyrios of Kafsokalyvia', 1991),
  eo('Paisios the Athonite', 1994, { aliases: ['paisios of mount athos'] }),
  oo('Shenoute the Archimandrite', 465),
  oo('Severus of Antioch', 538),
  oo('Yared', 571),
  oo('Jacob Baradaeus', 578),
  entry('figure', 'orthodox_saint', 'Gregory of Narek', 1003, ['oriental_orthodox', 'catholic'], {
    note: 'Armenian; declared a Doctor of the Church by Rome in 2015, so Catholic too.',
  }),
  oo('Nerses Shnorhali', 1173),
  oo('Tekle Haymanot', 1313),
  oo('Abraam of Fayoum', 1914),
  oo('Kyrillos VI', 1971, { aliases: ['pope kyrillos'] }),

  // ── Post-Reformation Catholic saints ──
  rc('Thomas More', 1535, { homes: ['catholic', 'anglican'], note: 'Commemorated with John Fisher in the Church of England\'s calendar.' }),
  rc('Juan Diego', 1548, { note: 'The visionary of Guadalupe.' }),
  rc('Francis Xavier', 1552),
  rc('Ignatius of Loyola', 1556),
  rc('Teresa of Avila', 1582),
  rc('Charles Borromeo', 1584),
  rc('John of the Cross', 1591),
  rc('Philip Neri', 1595),
  rc('Rose of Lima', 1617),
  rc('Francis de Sales', 1622),
  rc('Martin de Porres', 1639),
  rc('Peter Claver', 1654),
  rc('Vincent de Paul', 1660),
  rc('Kateri Tekakwitha', 1680),
  rc('Margaret Mary Alacoque', 1690),
  rc('Gerard Majella', 1755),
  rc('Elizabeth Ann Seton', 1821),
  rc('Dominic Savio', 1857),
  rc('John Vianney', 1859, { aliases: ['cure of ars'] }),
  rc('Catherine Laboure', 1876),
  rc('Bernadette Soubirous', 1879, { aliases: ['bernadette of lourdes'] }),
  rc('John Bosco', 1888, { aliases: ['don bosco'] }),
  rc('Damien of Molokai', 1889, { aliases: ['father damien'] }),
  rc('John Henry Newman', 1890, { note: 'An Anglican for half his life, and honored by many Anglicans; home kept Catholic.' }),
  rc('Therese of Lisieux', 1897, { aliases: ['the little flower'] }),
  rc('Charbel Makhlouf', 1898, { aliases: ['saint charbel'] }),
  rc('Gemma Galgani', 1903),
  rc('Frances Xavier Cabrini', 1917, { aliases: ['mother cabrini'] }),
  rc('Pier Giorgio Frassati', 1925),
  rc('Andre Bessette', 1937, { aliases: ['brother andre'] }),
  rc('Faustina Kowalska', 1938, { aliases: ['saint faustina'] }),
  rc('Maximilian Kolbe', 1941),
  rc('Teresa Benedicta of the Cross', 1942, { aliases: ['edith stein'] }),
  rc('Katharine Drexel', 1955),
  rc('John XXIII', 1963, { aliases: ['pope john xxiii'] }),
  rc('Pio of Pietrelcina', 1968, { aliases: ['padre pio'], note: 'A living religious leader for experiences before 1968.' }),
  rc('Josemaria Escriva', 1975),
  rc('Paul VI', 1978, { aliases: ['pope paul vi'] }),
  rc('Oscar Romero', 1980, { note: 'Commemorated in some Anglican calendars; home kept Catholic.' }),
  rc('Teresa of Calcutta', 1997, { aliases: ['mother teresa'], note: 'A living religious leader for experiences before 1997.' }),
  rc('John Paul II', 2005, { aliases: ['pope john paul ii'], note: 'A living religious leader for experiences before 2005.' }),
  rc('Carlo Acutis', 2006, { note: 'Canonized 2025.' }),

  // ── Protestant saints and luminaries ──
  prot('Ulrich Zwingli', 1531, ['reformed']),
  prot('William Tyndale', 1536, PROTESTANT, { note: 'Bible translator honored across Protestantism; in Anglican calendars.' }),
  prot('Martin Luther', 1546, PROTESTANT, { note: 'Honored across Protestantism as the first Reformer.' }),
  prot('Hugh Latimer', 1555, ['anglican']),
  prot('Nicholas Ridley', 1555, ['anglican']),
  prot('Thomas Cranmer', 1556, ['anglican']),
  prot('Philip Melanchthon', 1560, ['lutheran']),
  prot('Menno Simons', 1561, ['other_protestant']),
  prot('John Calvin', 1564, ['reformed']),
  prot('John Knox', 1572, ['reformed']),
  prot('Martin Chemnitz', 1586, ['lutheran']),
  prot('Richard Hooker', 1600, ['anglican']),
  prot('Johann Arndt', 1621, ['lutheran']),
  prot('Lancelot Andrewes', 1626, ['anglican']),
  prot('George Herbert', 1633, ['anglican']),
  prot('Johann Gerhard', 1637, ['lutheran']),
  prot('Paul Gerhardt', 1676, ['lutheran']),
  prot('John Bunyan', 1688, ['other_protestant', 'anglican'], { note: 'A Baptist; commemorated in the Church of England\'s calendar.' }),
  prot('George Fox', 1691, ['other_protestant'], { note: 'Founder of the Quakers.' }),
  prot('Johann Sebastian Bach', 1750, ['lutheran', 'anglican'], {
    note: 'Religious by the calendar rule: commemorated in Lutheran and Episcopal calendars.',
  }),
  prot('Jonathan Edwards', 1758, ['reformed']),
  prot('Nicolaus Zinzendorf', 1760, ['other_protestant', 'lutheran'], { note: 'Moravian, from Lutheran Pietism.' }),
  prot('George Whitefield', 1770, ['methodist', 'anglican', 'other_protestant']),
  prot('Charles Wesley', 1788, ['methodist', 'anglican']),
  prot('John Wesley', 1791, ['methodist', 'anglican'], { note: 'An Anglican priest; commemorated in the Church of England\'s calendar.' }),
  prot('John Newton', 1807, ['anglican', 'other_protestant'], { note: 'Author of "Amazing Grace"; honored by evangelicals generally.' }),
  prot('Francis Asbury', 1816, ['methodist']),
  prot('William Wilberforce', 1833, ['anglican', 'other_protestant'], {
    note: 'Religious by the calendar rule (Church of England); honored by evangelicals generally.',
  }),
  prot('William Carey', 1834, ['other_protestant']),
  prot('Soren Kierkegaard', 1855, ['lutheran'], { note: 'Known as much for philosophy as for faith; religious by his theological work.' }),
  prot('David Livingstone', 1873, ['reformed', 'other_protestant']),
  prot('C. F. W. Walther', 1887, ['lutheran'], { aliases: ['walther'] }),
  prot('Charles Spurgeon', 1892, ['other_protestant']),
  prot('Dwight L. Moody', 1899, ['other_protestant']),
  prot('Hudson Taylor', 1905, ['other_protestant']),
  prot('Fanny Crosby', 1915, ['methodist', 'other_protestant']),
  prot('William J. Seymour', 1922, ['other_protestant']),
  prot('Aimee Semple McPherson', 1944, ['other_protestant']),
  prot('Dietrich Bonhoeffer', 1945, PROTESTANT, { note: 'In Lutheran and Anglican calendars; honored across Protestantism.' }),
  prot('Smith Wigglesworth', 1947, ['other_protestant']),
  prot('Amy Carmichael', 1951, ['other_protestant']),
  prot('Jim Elliot', 1956, ['other_protestant']),
  prot('C. S. Lewis', 1963, ['anglican', 'other_protestant'], {
    note: 'Religious by the calendar rule (Episcopal Church) and his apologetics; widely read by Catholics too.',
  }),
  prot('Martin Luther King Jr.', 1968, ['other_protestant', 'anglican', 'lutheran'], {
    note: 'A Baptist minister; religious by the calendar rule (Episcopal and ELCA calendars). Flag for review.',
  }),
  prot('Kathryn Kuhlman', 1976, ['other_protestant']),
  prot('Corrie ten Boom', 1983, ['reformed', 'other_protestant']),
  prot('Oral Roberts', 2009, ['other_protestant']),
  prot('Billy Graham', 2018, ['other_protestant'], { note: 'A living religious leader for experiences before 2018.' }),
  prot('Desmond Tutu', 2021, ['anglican'], { note: 'A living religious leader for experiences before 2021.' }),

  // ── Biblical figures ──
  bib('Adam', 'not_applicable', ABRAHAMIC),
  bib('Eve', 'not_applicable', ABRAHAMIC, { aliases: ['hawwa'], note: 'Named in Islamic tradition, not in the Qur\'an.' }),
  bib('Enoch', 'not_applicable', ABRAHAMIC, { note: 'Muslim home by the common identification with Idris.' }),
  bib('Noah', 'not_applicable', ABRAHAMIC, { aliases: ['nuh'] }),
  bib('Abraham', 'not_applicable', [...ABRAHAMIC, 'bahai'], { aliases: ['ibrahim'] }),
  bib('Sarah', 'not_applicable', HEBREW_BIBLE),
  bib('Isaac', 'not_applicable', ABRAHAMIC, { aliases: ['ishaq'] }),
  bib('Ishmael', 'not_applicable', ABRAHAMIC, { aliases: ['ismail'], note: 'Honored chiefly in Islam.' }),
  bib('Jacob', 'not_applicable', ABRAHAMIC, { aliases: ['yaqub', 'israel the patriarch'] }),
  bib('Rachel', 'not_applicable', HEBREW_BIBLE),
  bib('Joseph son of Jacob', 'not_applicable', ABRAHAMIC, { aliases: ['yusuf'] }),
  bib('Moses', 'not_applicable', [...ABRAHAMIC, 'bahai'], { aliases: ['musa', 'moshe'] }),
  bib('Aaron', 'not_applicable', ABRAHAMIC, { aliases: ['harun'] }),
  bib('Miriam', 'not_applicable', HEBREW_BIBLE),
  bib('Ruth', 'not_applicable', HEBREW_BIBLE),
  bib('Samuel', 'not_applicable', HEBREW_BIBLE),
  bib('David', 'not_applicable', ABRAHAMIC, { aliases: ['king david', 'dawud'] }),
  bib('Solomon', 'not_applicable', ABRAHAMIC, { aliases: ['king solomon', 'sulayman'] }),
  bib('Elijah', 'not_applicable', ABRAHAMIC, { aliases: ['elias', 'ilyas'] }),
  bib('Elisha', 'not_applicable', ABRAHAMIC, { aliases: ['alyasa'] }),
  bib('Isaiah', 'not_applicable', HEBREW_BIBLE),
  bib('Jeremiah', 'not_applicable', HEBREW_BIBLE),
  bib('Ezekiel', 'not_applicable', HEBREW_BIBLE),
  bib('Daniel', 'not_applicable', HEBREW_BIBLE),
  bib('Job', 'not_applicable', ABRAHAMIC, { aliases: ['ayyub'] }),
  bib('Jonah', 'not_applicable', ABRAHAMIC, { aliases: ['yunus'] }),
  bib('Esther', 'not_applicable', HEBREW_BIBLE),
  bib('Zechariah father of John the Baptist', 'not_applicable', [...BIBLE_READERS, ...MUSLIM], { aliases: ['zakariya'] }),
  bib('Elizabeth mother of John the Baptist', 'not_applicable', BIBLE_READERS),
  bib('John the Baptist', 'not_applicable', [...BIBLE_READERS, ...MUSLIM], { aliases: ['yahya'] }),
  bib('Joseph husband of Mary', 'not_applicable', BIBLE_READERS, {
    aliases: ['saint joseph'],
    note: 'Devotion to him as a patron is chiefly Catholic; as a biblical figure he is shared.',
  }),
  bib('Peter', 'not_applicable', BIBLE_READERS, { aliases: ['saint peter', 'simon peter'] }),
  bib('Andrew', 'not_applicable', BIBLE_READERS, { aliases: ['saint andrew'] }),
  bib('James son of Zebedee', 'not_applicable', BIBLE_READERS, { aliases: ['james the great'] }),
  bib('John the Apostle', 'not_applicable', BIBLE_READERS, { aliases: ['john the evangelist', 'john the beloved'] }),
  bib('Philip the Apostle', 'not_applicable', BIBLE_READERS),
  bib('Bartholomew', 'not_applicable', BIBLE_READERS),
  bib('Thomas the Apostle', 'not_applicable', BIBLE_READERS, { aliases: ['doubting thomas'] }),
  bib('Matthew', 'not_applicable', BIBLE_READERS),
  bib('Jude', 'not_applicable', BIBLE_READERS, {
    aliases: ['saint jude', 'jude thaddeus'],
    note: 'Devotion to him as patron of lost causes is chiefly Catholic; as an apostle he is shared.',
  }),
  bib('Paul', 'not_applicable', BIBLE_READERS, { aliases: ['saint paul', 'paul the apostle'] }),
  bib('Mark', 'not_applicable', BIBLE_READERS),
  bib('Luke', 'not_applicable', BIBLE_READERS),
  bib('Stephen', 'not_applicable', BIBLE_READERS, { aliases: ['saint stephen'] }),
  bib('Mary Magdalene', 'not_applicable', BIBLE_READERS),
  bib('Lazarus', 'not_applicable', BIBLE_READERS),

  // ── Muhammad, the Imams, and other Muslim figures ──
  entry('figure', 'muhammad', 'Muhammad', 632, [...MUSLIM, 'bahai'], { aliases: ['the prophet muhammad', 'mohammed'] }),
  imam('Ali ibn Abi Talib', 661, MUSLIM, { aliases: ['imam ali'], note: 'Revered by Sunnis as the fourth caliph.' }),
  imam('Hasan ibn Ali', 670, MUSLIM),
  imam('Husayn ibn Ali', 680, MUSLIM, { aliases: ['imam husayn', 'imam hussein'] }),
  imam('Ali Zayn al-Abidin', 713, ['muslim_shia']),
  imam('Muhammad al-Baqir', 733, ['muslim_shia']),
  imam('Jafar al-Sadiq', 765, MUSLIM, { note: 'Revered by Sunnis as a scholar and teacher of their jurists.' }),
  imam('Musa al-Kazim', 799, ['muslim_shia']),
  imam('Ali al-Rida', 818, ['muslim_shia'], { aliases: ['imam reza'] }),
  imam('Muhammad al-Jawad', 835, ['muslim_shia']),
  imam('Ali al-Hadi', 868, ['muslim_shia']),
  imam('Hasan al-Askari', 874, ['muslim_shia']),
  imam('Muhammad al-Mahdi', 'not_applicable', ['muslim_shia'], { aliases: ['the twelfth imam', 'imam mahdi'], note: 'In occultation, in Twelver belief.' }),
  other('Fatimah', 632, MUSLIM, { aliases: ['fatima zahra'], note: 'Daughter of Muhammad. Not to be confused with the Marian apparition at Fatima.' }),
  other('Abbas ibn Ali', 680, ['muslim_shia']),
  other('Abu Bakr', 634, ['muslim_sunni']),
  other('Umar ibn al-Khattab', 644, ['muslim_sunni']),
  other('Khidr', 'not_applicable', MUSLIM, { aliases: ['al-khidr'] }),
  other('Rumi', 1273, MUSLIM, { note: 'A Sufi poet, revered in Sunni and Shia lands alike; widely read in New Age circles too.' }),
  other('Ruhollah Khomeini', 1989, ['muslim_shia'], { aliases: ['ayatollah khomeini'], note: 'A living religious leader for experiences before 1989.' }),

  // ── The Buddha and bodhisattvas ──
  entry('figure', 'buddha_or_bodhisattva', 'Gautama Buddha', -480, ['buddhist', 'hindu', 'bahai'], {
    aliases: ['the buddha', 'buddha', 'shakyamuni', 'siddhartha gautama'],
    note: 'Died about 480 BCE. Much Vaishnava tradition counts him an avatar of Vishnu.',
  }),
  entry('figure', 'buddha_or_bodhisattva', 'Guanyin', 'not_applicable', ['buddhist', 'chinese_folk_or_taoist'], {
    aliases: ['kuan yin', 'kwan yin', 'quan yin', 'avalokiteshvara', 'kannon', 'chenrezig'],
  }),
  entry('figure', 'buddha_or_bodhisattva', 'Amitabha', 'not_applicable', ['buddhist'], { aliases: ['amida'] }),
  entry('figure', 'buddha_or_bodhisattva', 'Maitreya', 'not_applicable', ['buddhist', 'new_age'], { note: 'Also a Theosophical figure.' }),
  entry('figure', 'buddha_or_bodhisattva', 'Ksitigarbha', 'not_applicable', ['buddhist', 'chinese_folk_or_taoist'], {
    aliases: ['dizang', 'jizo'],
    note: 'Bodhisattva of the hells and protector of dead children.',
  }),
  entry('figure', 'buddha_or_bodhisattva', 'Manjushri', 'not_applicable', ['buddhist']),
  entry('figure', 'buddha_or_bodhisattva', 'Tara', 'not_applicable', ['buddhist'], { aliases: ['green tara', 'white tara'] }),
  entry('figure', 'buddha_or_bodhisattva', 'Medicine Buddha', 'not_applicable', ['buddhist'], { aliases: ['bhaisajyaguru'] }),
  entry('figure', 'buddha_or_bodhisattva', 'Padmasambhava', 'unknown', ['buddhist'], { aliases: ['guru rinpoche'] }),

  // ── Hindu deities ──
  deity('Krishna', { homes: ['hindu', 'bahai'], note: 'The Baha\'i Faith counts Krishna among God\'s messengers.' }),
  deity('Vishnu'),
  deity('Shiva'),
  deity('Ganesha', { aliases: ['ganesh', 'ganapati'] }),
  deity('Rama', { aliases: ['lord ram', 'ram'] }),
  deity('Sita'),
  deity('Hanuman'),
  deity('Durga'),
  deity('Kali'),
  deity('Lakshmi'),
  deity('Saraswati'),
  deity('Parvati'),
  deity('Radha'),
  deity('Brahma'),
  deity('Murugan', { aliases: ['kartikeya', 'skanda'] }),
  deity('Ayyappan'),
  deity('Jagannath'),
  deity('Narasimha'),

  // ── Yama and his messengers ──
  entry('figure', 'yama_or_messengers', 'Yama', 'not_applicable', ['hindu', 'buddhist', 'chinese_folk_or_taoist'], {
    aliases: ['yamaraj', 'yamaraja', 'yanluo', 'yanluo wang', 'enma'],
    note: 'King of the dead in Hindu tradition; king of the underworld in Buddhist and Chinese folk tradition.',
  }),
  entry('figure', 'yama_or_messengers', 'Yamadutas', 'not_applicable', ['hindu'], { aliases: ['yamaduta', "yama's messengers"] }),
  entry('figure', 'yama_or_messengers', 'Chitragupta', 'not_applicable', ['hindu'], { note: 'Keeper of the ledger of deeds.' }),
  entry('figure', 'yama_or_messengers', 'Ox-Head and Horse-Face', 'not_applicable', ['chinese_folk_or_taoist', 'buddhist'], {
    note: 'Guardians who fetch the dead to the underworld.',
  }),

  // ── Sikh Gurus ──
  sikh('Guru Nanak', 1539, { note: 'Also honored by some Hindus.' }),
  sikh('Guru Angad', 1552),
  sikh('Guru Amar Das', 1574),
  sikh('Guru Ram Das', 1581),
  sikh('Guru Arjan', 1606),
  sikh('Guru Hargobind', 1644),
  sikh('Guru Har Rai', 1661),
  sikh('Guru Har Krishan', 1664),
  sikh('Guru Tegh Bahadur', 1675),
  sikh('Guru Gobind Singh', 1708),

  // ── Latter-day Saint figures (not Christian, in this project's terms) ──
  entry('figure', 'latter_day_saint_figure', 'Joseph Smith', 1844, ['latter_day_saints']),
  entry('figure', 'latter_day_saint_figure', 'Moroni', 'not_applicable', ['latter_day_saints'], {
    note: 'Called an angel in Latter-day Saint teaching; a coder\'s angel claim with this name resolves here.',
  }),
  entry('figure', 'latter_day_saint_figure', 'Brigham Young', 1877, ['latter_day_saints']),
  entry('figure', 'latter_day_saint_figure', 'Nephi', 'not_applicable', ['latter_day_saints']),

  // ── Baha'i figures ──
  entry('figure', 'bahai_figure', 'The Bab', 1850, ['bahai']),
  entry('figure', 'bahai_figure', "Baha'u'llah", 1892, ['bahai'], { aliases: ['bahaullah'] }),
  entry('figure', 'bahai_figure', "'Abdu'l-Baha", 1921, ['bahai'], { aliases: ['abdul baha', 'abdul-baha'] }),
  entry('figure', 'bahai_figure', 'Shoghi Effendi', 1957, ['bahai']),

  // ── Modern gurus and teachers ──
  guru('Ramakrishna', 1886, ['hindu']),
  guru('Helena Blavatsky', 1891, ['new_age'], { aliases: ['madame blavatsky'] }),
  guru('Lahiri Mahasaya', 1895, ['hindu']),
  guru('Swami Vivekananda', 1902, ['hindu']),
  guru('Shirdi Sai Baba', 1918, ['hindu'], { note: 'Also has Muslim devotees. A bare "Sai Baba" is ambiguous.' }),
  guru('Rudolf Steiner', 1925, ['new_age']),
  guru('Sri Yukteswar', 1936, ['hindu']),
  guru('Edgar Cayce', 1945, ['new_age']),
  guru('Ramana Maharshi', 1950, ['hindu']),
  guru('Sri Aurobindo', 1950, ['hindu']),
  guru('Paramahansa Yogananda', 1952, ['hindu', 'new_age'], { aliases: ['yogananda'] }),
  guru('Mahavatar Babaji', 'not_applicable', ['hindu', 'new_age'], { aliases: ['babaji'], note: 'Deathless in his followers\' teaching.' }),
  guru('Meher Baba', 1969, ['new_age'], { note: 'His following is its own; nearest column chosen.' }),
  guru('Neem Karoli Baba', 1973, ['hindu', 'new_age']),
  guru('A. C. Bhaktivedanta Swami Prabhupada', 1977, ['hindu'], { aliases: ['prabhupada'] }),
  guru('Anandamayi Ma', 1982, ['hindu']),
  guru('Jiddu Krishnamurti', 1986, ['new_age']),
  guru('Osho', 1990, ['new_age'], { aliases: ['bhagwan shree rajneesh', 'rajneesh'] }),
  guru('Sri Chinmoy', 2007, ['hindu', 'new_age']),
  guru('Maharishi Mahesh Yogi', 2008, ['hindu', 'new_age']),
  guru('Sathya Sai Baba', 2011, ['hindu'], { note: 'A bare "Sai Baba" is ambiguous.' }),
  guru('Ram Dass', 2019, ['new_age']),
  guru('Thich Nhat Hanh', 2022, ['buddhist']),
  guru('Tenzin Gyatso, the 14th Dalai Lama', 'alive', ['buddhist'], { aliases: ['the dalai lama', 'dalai lama'] }),
  guru('Mata Amritanandamayi', 'alive', ['hindu'], { aliases: ['amma', 'ammachi'] }),
  other('Kuthumi', 'not_applicable', ['new_age'], { note: 'An Ascended Master of Theosophy.' }),
  other('El Morya', 'not_applicable', ['new_age'], { note: 'An Ascended Master of Theosophy.' }),
  other('Saint Germain, the Ascended Master', 'not_applicable', ['new_age'], {
    note: 'Not Germanus of Paris or of Auxerre; a bare "Saint Germain" is ambiguous.',
  }),

  // ── Other religious leaders (living ones are living religious leaders) ──
  other('Shenouda III', 2012, ['oriental_orthodox'], { aliases: ['pope shenouda'] }),
  other('Benedict XVI', 2022, ['catholic'], { aliases: ['pope benedict'] }),
  other('Francis (pope)', 2025, ['catholic'], { aliases: ['pope francis'] }),
  other('Leo XIV', 'alive', ['catholic'], { aliases: ['pope leo'] }),
  other('Bartholomew I', 'alive', ['eastern_orthodox'], { aliases: ['ecumenical patriarch bartholomew'] }),
  other('Kirill of Moscow', 'alive', ['eastern_orthodox'], { aliases: ['patriarch kirill'] }),
  other('Tawadros II', 'alive', ['oriental_orthodox'], { aliases: ['pope tawadros'] }),

  // ── Named angels ──
  angel('Michael', ['jewish', ...BIBLE_READERS, ...MUSLIM], { aliases: ['archangel michael', 'saint michael', 'mikail'] }),
  angel('Gabriel', ['jewish', ...BIBLE_READERS, ...MUSLIM], { aliases: ['archangel gabriel', 'jibril', 'jibreel', 'jibrail'] }),
  angel('Raphael', TOBIT, {
    aliases: ['archangel raphael'],
    note: 'Named only in Tobit: Catholic and Orthodox scripture; read and commemorated by Lutherans and Anglicans, not other Protestants.',
  }),
  angel('Uriel', ['eastern_orthodox', 'oriental_orthodox', 'jewish', 'new_age'], {
    note: 'Among the Orthodox archangels; strongly venerated in Ethiopia (1 Enoch); popular in New Age angelology.',
  }),
  angel('Selaphiel', ['eastern_orthodox']),
  angel('Jegudiel', ['eastern_orthodox']),
  angel('Barachiel', ['eastern_orthodox']),
  angel('Metatron', ['jewish', 'new_age'], { note: 'From Jewish mystical tradition; popular in New Age angelology.' }),
  angel('Sandalphon', ['jewish', 'new_age']),
  angel('Azrael', [...MUSLIM, 'new_age'], { aliases: ['izrail', 'azrail'], note: 'The angel of death by name in Islamic tradition.' }),
  angel('Israfil', MUSLIM),
  angel('Munkar', MUSLIM, { note: 'With Nakir, questions the dead in the grave.' }),
  angel('Nakir', MUSLIM),
  angel('Chamuel', ['new_age']),
  angel('Jophiel', ['new_age']),
  angel('Zadkiel', ['jewish', 'new_age']),
  angel('Ariel', ['new_age']),

  // ── Named hostile beings ──
  hostile('Satan', ['jewish', ...BIBLE_READERS, ...MUSLIM], {
    aliases: ['the devil', 'devil', 'shaytan', 'iblis'],
    note: 'In Jewish thought the satan is an accuser, not God\'s rival; kept as a home since the figure is shared.',
  }),
  hostile('Lucifer', BIBLE_READERS),
  hostile('Beelzebub', BIBLE_READERS),
  hostile('Asmodeus', TOBIT),
  hostile('Lilith', ['jewish', 'new_age']),
  hostile('Mara', ['buddhist']),

  // ── Non-religious historical figures and celebrities ──
  secular('William Shakespeare', 1616),
  secular('Wolfgang Amadeus Mozart', 1791),
  secular('George Washington', 1799),
  secular('Napoleon Bonaparte', 1821),
  secular('Ludwig van Beethoven', 1827),
  secular('Abraham Lincoln', 1865, { aliases: ['lincoln'] }),
  secular('Nikola Tesla', 1943),
  secular('Mahatma Gandhi', 1948, { aliases: ['gandhi'], note: 'Known mainly for independence and nonviolence, not on a church calendar. Flag for review.' }),
  secular('Albert Einstein', 1955, { aliases: ['einstein'] }),
  secular('Marilyn Monroe', 1962),
  secular('John F. Kennedy', 1963, { aliases: ['jfk', 'president kennedy'] }),
  secular('Winston Churchill', 1965),
  secular('Elvis Presley', 1977, { aliases: ['elvis'] }),
  secular('John Lennon', 1980),
  secular('Diana, Princess of Wales', 1997, { aliases: ['princess diana'] }),
  secular('Michael Jackson', 2009),
]);

/** Names that could mean more than one table entry. They resolve to nothing: the coder must
 *  write the full name, and context decides. */
export const AMBIGUOUS_NAMES: Readonly<Record<string, string>> = {
  'sai baba': 'Shirdi Sai Baba or Sathya Sai Baba',
  'saint germain': 'the Ascended Master, Germanus of Paris, or Germanus of Auxerre',
  'saint teresa': 'Teresa of Avila, Therese of Lisieux, or Teresa of Calcutta',
  'saint therese': 'Therese of Lisieux or Teresa of Avila',
  'saint catherine': 'Catherine of Siena or Catherine of Alexandria',
  'saint thomas': 'Thomas the Apostle, Thomas Aquinas, Thomas More, or Thomas Becket',
  'saint anthony': 'Anthony of Padua or Anthony the Great',
  'saint john': 'John the Apostle or John the Baptist (or another John)',
  'saint james': 'James son of Zebedee or another James',
  'saint gregory': 'one of several Gregorys',
  'saint elizabeth': 'Elizabeth mother of John the Baptist, Elizabeth of Hungary, Elizabeth Ann Seton, or Elizabeth the New Martyr',
  francis: 'Francis of Assisi or Pope Francis',
  joseph: 'Joseph son of Jacob, Joseph husband of Mary, or Joseph Smith',
  john: 'one of several Johns',
  james: 'one of several Jameses',
  mary: 'Mary is her own category, not a named figure',
  jesus: 'Jesus is his own category, not a named figure',
};

// ─── Lookup ─────────────────────────────────────────────────────────────────────────────

/** Lowercase; strip accents; "St." to "saint"; drop a leading "the"; collapse spaces and
 *  punctuation other than apostrophes and hyphens. */
export const normalizeName = (name: string): string =>
  name
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\bst\.?\s/g, 'saint ')
    .replace(/[^\p{L}\p{N}' -]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '');

const INDEX = new Map<string, NamedEntry>();
for (const e of NAMED_FIGURES) {
  for (const key of [e.canonicalName, ...e.aliases].map(normalizeName)) {
    if (INDEX.has(key) && INDEX.get(key) !== e) throw new Error(`name "${key}" is in two entries`);
    if (key in AMBIGUOUS_NAMES) throw new Error(`name "${key}" is listed as ambiguous`);
    INDEX.set(key, e);
  }
}

export type Lookup = { found: NamedEntry } | { ambiguous: string } | { unlisted: true };
export function lookupFigure(name: string): Lookup {
  const key = normalizeName(name);
  if (key in AMBIGUOUS_NAMES) return { ambiguous: AMBIGUOUS_NAMES[key] };
  const found = INDEX.get(key);
  return found ? { found } : { unlisted: true };
}

/** A religious figure alive at the time of the experience is a living religious leader,
 *  whatever the coder chose; the year of death decides. */
export function livingReligiousLeaderAt(e: NamedEntry, experienceYear: number): boolean {
  if (e.kind !== 'figure' || e.subcategory === 'non_religious_historical_figure') return false;
  return e.died === 'alive' || (typeof e.died === 'number' && e.died > experienceYear);
}

/** Outside the experiencer's tradition: no candidate column is among the figure's homes.
 *  Not applicable when area 2 gives no column. */
export function outsideTradition(e: NamedEntry, columns: readonly HomeTradition[]): boolean | 'not_applicable' {
  if (columns.length === 0) return 'not_applicable';
  return !columns.some((c) => e.homes.includes(c));
}
