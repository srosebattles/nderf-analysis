import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DerivedRecord } from '../schema/codebook-schema.ts';
import { DERIVE_VERSION, deriveAccount } from './account.ts';
import type { ScrapedAccount } from './input.ts';

// An invented account in the scraper's format: NDERF's form text, invented answers.
const SHA = 'a'.repeat(64);
// As the scraper splits them: a menu answer with no comment.
const qa = (question: string, response: string) => ({ section: null, question, response, answer: response, comment: null });
const ACCOUNT: ScrapedAccount = {
  id: '1example_x_nde',
  sha256: SHA,
  url: 'https://www.nderf.org/Experiences/1example_x_nde.htm',
  page_classification: 'Probable NDE',
  exceptional: false,
  posted_dates: ['2012-04-02'],
  fetched_at: '2026-10-20T08:00:00Z',
  listings: [{ type_label: 'Probable NDE', tag: 'From Norway. Original in Norwegian, translated to English by Ola.', nderf_numbers: [9999] }],
  parts: [
    {
      heading: 'Experience Description 9999',
      narrative: 'Five invented words of narrative.',
      background: { Gender: 'Female', 'Date NDE Occurred': '3/14/1987' },
      qa: [
        qa('At the time of your experience, was there an associated life-threatening event?', 'Yes Illness Clinical death (cessation of breathing or heart function or brain function)'),
        qa('Did you see any beings in your experience?', 'Neither'),
        qa('Did you see deceased or religious spirits?', 'No'),
        qa('Did you encounter or become aware of any deceased (or alive) beings?', 'No'),
        qa('What was your religion prior to your experience?', 'Christian- Protestant'),
        qa('Did you encounter or become aware of any beings who previously lived on earth who are described by name in religions (for example: Jesus, Muhammad, Buddha, etc.)?', 'No'),
        qa('What importance did you place on your religious/spiritual life prior to your experience?', 'Moderately important to me'),
        qa('Did you believe in the existence of God prior to your experience?', 'God definitely exists'),
      ],
    },
    { heading: 'Experience Description', narrative: 'A later note in three words.', background: {}, qa: [] },
  ],
};

test('one record per account, valid against the schema', () => {
  const r = deriveAccount(ACCOUNT, { ENTRYNUM: 9999, AGE: 'Adult', COUNTRY_AI: 'Norway', metadata: { greyson: 12 } });
  assert.ok(DerivedRecord.safeParse(r).success);
  assert.equal(r.accountId, '1example_x_nde');
  assert.equal(r.sourceSha256, SHA);
  assert.equal(r.deriveVersion, DERIVE_VERSION);
  assert.deepEqual(r.posting, { firstPosted: '2012-04-02', allPosted: ['2012-04-02'], submitted: null, flags: [] });
  assert.deepEqual(r.nderf.classificationTokens, ['probable_nde']);
  assert.deepEqual([r.nderf.ageBand, r.nderf.countryAi, r.nderf.greysonScore], ['Adult', 'Norway', 12]);
  assert.deepEqual(r.tagClaims.countries.map((c) => [c.source, c.country]), [['nderf_tag', 'NO'], ['nderf_country_ai', 'NO']]);
  assert.deepEqual(r.tagClaims.language && [r.tagClaims.language.originalLanguage, r.tagClaims.language.translated], ['no', 'yes']);

  const [first, second] = r.parts;
  assert.equal(first.questionnaire.form, 'D');
  assert.deepEqual([first.backgroundDate.year, first.backgroundDate.month, first.backgroundDate.day], [1987, 3, 14]);
  assert.equal(first.gender, 'Female');
  assert.deepEqual(first.lifeThreat.status === 'present' && first.lifeThreat.value, { answer: 'yes', causes: ['Illness'], severity: 'clinical_death' });
  assert.equal(first.jesusKeywordHits, null); // counted only after the freeze
  assert.equal(second.questionnaire.form, 'none');
  assert.equal(second.backgroundDate.precision, 'none');
  assert.deepEqual(r.lengths, { narrativeWords: 11, questionnaireFreeTextWords: 0, totalWords: 11 });
});

test('with no search-site entry, its fields are empty', () => {
  const r = deriveAccount(ACCOUNT);
  assert.deepEqual([r.nderf.ageBand, r.nderf.countryAi, r.nderf.greysonScore, r.nderf.formVersion], [null, null, null, null]);
  assert.deepEqual(r.tagClaims.countries.map((c) => c.source), ['nderf_tag']);
});

test('a page whose record would fail the schema throws, and nothing is written', () => {
  assert.throws(() => deriveAccount({ ...ACCOUNT, sha256: null }));
});
