import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ParsedDate, Posting } from '../schema/codebook-schema.ts';
import { deriveBackground, derivePosting, parseExperienceDate } from './dates.ts';

// Every date here is invented.
const parse = (written: string | null, firstPosted: string | null = '2015-06-01') => {
  const d = parseExperienceDate(written, firstPosted);
  assert.ok(ParsedDate.safeParse(d).success, JSON.stringify(d));
  return d;
};
const ymd = (written: string, firstPosted?: string | null) => {
  const d = parse(written, firstPosted);
  return [d.year, d.month, d.day, d.precision, [...d.flags].sort().join(',')];
};

test('full dates in words and in numbers', () => {
  assert.deepEqual(ymd('March 14, 1987'), [1987, 3, 14, 'day', '']);
  assert.deepEqual(ymd("'March 14, 1987'"), [1987, 3, 14, 'day', '']);
  assert.deepEqual(ymd('14 March 1987'), [1987, 3, 14, 'day', '']);
  assert.deepEqual(ymd('14th of March, 1987'), [1987, 3, 14, 'day', '']);
  assert.deepEqual(ymd('Sept. 3. 1987'), [1987, 9, 3, 'day', '']);
  assert.deepEqual(ymd('Mar-14-1987'), [1987, 3, 14, 'day', '']);
  assert.deepEqual(ymd('1987-03-14'), [1987, 3, 14, 'day', '']);
  assert.deepEqual(ymd('03141987'), [1987, 3, 14, 'day', '']);
  assert.deepEqual(ymd('19870314'), [1987, 3, 14, 'day', '']);
  assert.deepEqual(ymd('25/12/1987'), [1987, 12, 25, 'day', '']); // a first number over twelve is the day
  assert.deepEqual(ymd('12.25.1987'), [1987, 12, 25, 'day', '']);
});

test('an ambiguous numeric date is read month first and flagged, unless only day first fits the posting', () => {
  assert.deepEqual(ymd('3/4/1990'), [1990, 3, 4, 'day', 'day_month_ambiguous']);
  assert.deepEqual(ymd('4/4/1990'), [1990, 4, 4, 'day', '']);
  // Posted 2 May 2014: November 3 would be after the posting, 11 March is not.
  assert.deepEqual(ymd('11/3/2014', '2014-05-02'), [2014, 3, 11, 'day', 'day_month_ambiguous']);
});

test('partial dates: a missing day or month, seasons, and bare years', () => {
  assert.deepEqual(ymd('09/00/2013'), [2013, 9, null, 'month', '']);
  assert.deepEqual(ymd('00/00/1987'), [1987, null, null, 'year', '']);
  assert.deepEqual(ymd('10/1990'), [1990, 10, null, 'month', '']);
  assert.deepEqual(ymd('June 1977'), [1977, 6, null, 'month', '']);
  assert.deepEqual(ymd('junio de 1977'), [1977, 6, null, 'month', '']);
  assert.deepEqual(ymd('14 de junio de 1977'), [1977, 6, 14, 'day', '']);
  assert.deepEqual(ymd('Février 1977'), [1977, 2, null, 'month', '']);
  assert.deepEqual(ymd('Spring 1977'), [1977, null, null, 'season', '']);
  assert.deepEqual(ymd('1977'), [1977, null, null, 'year', '']);
  assert.deepEqual(ymd('about 1977'), [1977, null, null, 'approximate', '']);
  assert.deepEqual(ymd('1977?'), [1977, null, null, 'approximate', '']);
});

test('a two-digit year is the latest century that keeps the experience before the posting', () => {
  assert.deepEqual(ymd('7/25/91'), [1991, 7, 25, 'day', 'two_digit_year']);
  assert.deepEqual(ymd('7/25/09'), [2009, 7, 25, 'day', 'two_digit_year']);
  assert.deepEqual(ymd('7/25/09', '2005-01-01'), [1909, 7, 25, 'day', 'two_digit_year']);
  assert.deepEqual(ymd('5 17 91'), [1991, 5, 17, 'day', 'two_digit_year']);
  assert.deepEqual(ymd('051791'), [1991, 5, 17, 'day', 'two_digit_year']);
  assert.deepEqual(ymd('June 87'), [1987, 6, null, 'month', 'two_digit_year']);
  assert.deepEqual(ymd('June 5, 87'), [1987, 6, 5, 'day', 'two_digit_year']);
  assert.deepEqual(ymd('September of 08'), [2008, 9, null, 'month', 'two_digit_year']);
  assert.deepEqual(ymd("late 70's"), [1970, null, null, 'approximate', 'two_digit_year']);
  assert.deepEqual(ymd("Spring of 73'"), [1973, null, null, 'season', 'two_digit_year']);
});

test('spans take their first year as approximate; several dates keep the earliest year', () => {
  assert.deepEqual(ymd('1981-1982'), [1981, null, null, 'approximate', 'range']);
  assert.deepEqual(ymd('1981 or 1982'), [1981, null, null, 'approximate', 'range']);
  assert.deepEqual(ymd('between 1981 and 1982'), [1981, null, null, 'approximate', 'range']);
  assert.deepEqual(ymd('2004 & 1975'), [1975, null, null, 'year', 'multiple_dates']);
  assert.deepEqual(ymd('June 1975 and May 2004'), [1975, null, null, 'year', 'multiple_dates']);
});

test('what can\'t be read is left unread, never guessed', () => {
  assert.deepEqual(ymd('unknown'), [null, null, null, 'none', 'unparsed']);
  assert.deepEqual(ymd('eleven years old'), [null, null, null, 'none', 'unparsed']);
  assert.deepEqual(ymd('about 20 years ago'), [null, null, null, 'none', 'unparsed']);
  assert.deepEqual(ymd('13/32/1990'), [1990, null, null, 'year', 'unparsed']); // no such month or day
  assert.deepEqual(ymd('02/30/1990'), [1990, 2, null, 'month', 'unparsed']); // no such day
  assert.deepEqual(ymd('June 23'), [null, 6, 23, 'none', 'no_year']);
  assert.deepEqual(ymd('10/28/1019'), [null, null, null, 'none', 'unparsed']); // a typo for a year
  assert.deepEqual(parse(null), { raw: null, year: null, month: null, day: null, precision: 'none', flags: [] });
  assert.deepEqual(parse('   '), { raw: null, year: null, month: null, day: null, precision: 'none', flags: [] });
});

test('a date after the posting is flagged, and a long entry is not copied', () => {
  assert.deepEqual(ymd('2019', '2015-06-01'), [2019, null, null, 'year', 'after_posting']);
  assert.deepEqual(ymd('June 2015', '2015-06-01'), [2015, 6, null, 'month', '']);
  assert.deepEqual(ymd('2019', null), [2019, null, null, 'year', '']);
  assert.equal(parse('March 14, 1987').raw, 'March 14, 1987');
  const long = parse('it was some time in the winter of 1987 I believe');
  assert.equal(long.raw, null);
  assert.deepEqual([long.year, long.precision, [...long.flags].sort().join(',')], [1987, 'season', 'raw_omitted']);
});

test('the Background fields, under either label, and the search-app quick facts', () => {
  const part = (background: Record<string, string>) => ({ heading: null, narrative: '', background, qa: [] });
  assert.deepEqual(deriveBackground(part({ Gender: 'Female', 'Date NDE Occurred': '10/1990' })), {
    backgroundDate: { raw: '10/1990', year: 1990, month: 10, day: null, precision: 'month', flags: [] }, gender: 'Female',
  });
  assert.equal(deriveBackground(part({ 'Date of NDE': 'Spring 1977' })).backgroundDate.precision, 'season');
  assert.deepEqual(deriveBackground(part({})), { backgroundDate: { raw: null, year: null, month: null, day: null, precision: 'none', flags: [] }, gender: null });
  // As written, tidied only for spacing.
  assert.equal(deriveBackground(part({ Gender: ' male\n' })).gender, 'male');
  // A second, different date on the same part.
  assert.deepEqual(deriveBackground(part({ 'Date NDE Occurred': '1990', 'Date NDE Occurred (2)': '1999' })).backgroundDate.flags, ['multiple_dates']);
  const quick = deriveBackground(part({}), '2024-01-01', { Gender: 'Male', 'Date Experienced': '3/14/2019', 'Date Submitted': '12/5/2023' });
  assert.deepEqual([quick.gender, quick.backgroundDate.year, quick.backgroundDate.month, quick.backgroundDate.day], ['Male', 2019, 3, 14]);
});

test('posting dates: the first plausible one, with typos kept and flagged', () => {
  const check = (p: Posting) => { assert.ok(Posting.safeParse(p).success); return p; };
  assert.deepEqual(check(derivePosting(['2019-12-22', '2026-10-26'], '2026-10-28T10:00:00Z')), {
    firstPosted: '2019-12-22', allPosted: ['2019-12-22', '2026-10-26'], submitted: null, flags: [],
  });
  assert.deepEqual(check(derivePosting(['1009-11-21', '2010-11-21'], '2026-10-28T10:00:00Z')), {
    firstPosted: '2010-11-21', allPosted: ['1009-11-21', '2010-11-21'], submitted: null, flags: ['implausible_year'],
  });
  assert.deepEqual(check(derivePosting(['1009-11-21'], '2026-10-28T10:00:00Z')).firstPosted, null);
  assert.deepEqual(check(derivePosting([], null)), { firstPosted: null, allPosted: [], submitted: null, flags: [] });
  assert.equal(check(derivePosting(['2024-02-01'], null, { 'Date Submitted': '12/5/2023' })).submitted, '2023-12-05');
});
