import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CountryClaim, LanguageClaim, NderfEditorial } from '../schema/codebook-schema.ts';
import type { ScrapedAccount } from './input.ts';
import { classTokens, deriveEditorial, deriveTagClaims, languageInTag, placesInTag } from './editorial.ts';

// Labels and tags are written the way NDERF writes them; the names in them are invented.
const account = (over: Partial<ScrapedAccount>): ScrapedAccount => ({ id: '1example_x_nde', sha256: null, parts: [], ...over });
const listing = (type_label: string | null, tag: string | null = null) => ({ type_label, tag });

test('classification labels become tokens, however NDERF wrote them', () => {
  assert.deepEqual(classTokens('NDE'), ['nde']);
  assert.deepEqual(classTokens('NDEs'), ['nde']);
  assert.deepEqual(classTokens('Probable NDE'), ['probable_nde']);
  assert.deepEqual(classTokens('PROBABLE'), ['probable_nde']);
  assert.deepEqual(classTokens('Possible NDEs'), ['possible_nde']);
  assert.deepEqual(classTokens('NDE-Like Experience'), ['nde_like']);
  assert.deepEqual(classTokens('Secondhand Probable NDE'), ['probable_nde', 'secondhand']);
  assert.deepEqual(classTokens('Second-hand NDE'), ['nde', 'secondhand']);
  assert.deepEqual(classTokens('Second-Person NDE'), ['nde', 'second_person']);
  assert.deepEqual(classTokens('Shared NDE'), ['nde', 'shared']);
  assert.deepEqual(classTokens('Shared Death Experience'), ['sde']);
  assert.deepEqual(classTokens('NDE;Drug Experience'), ['nde', 'drug']);
  assert.deepEqual(classTokens('Probable NDE;Drug Experience'), ['probable_nde', 'drug']);
  assert.deepEqual(classTokens('NDE-like;STE'), ['nde_like', 'ste']);
  assert.deepEqual(classTokens('NDE and Probable NDE'), ['nde', 'probable_nde']);
  assert.deepEqual(classTokens('FDE and NDE'), ['nde', 'fde']);
  assert.deepEqual(classTokens('SOBE'), ['sobe']);
  assert.deepEqual(classTokens('OBE Dream'), ['obe', 'dream']);
  assert.deepEqual(classTokens('ANESTHESIA'), ['anesthesia']);
  assert.deepEqual(classTokens('Pre-Birth'), ['prebirth']);
  assert.deepEqual(classTokens('ICU Psychosis'), ['icu']);
  assert.deepEqual(classTokens('Premonition'), ['other']); // fits no rule
  assert.deepEqual(classTokens('NDE and Premonition'), ['nde', 'other']);
});

test('the editorial layer: raw labels kept, tokens joined, flags from the tags', () => {
  const e = deriveEditorial(account({
    page_classification: 'NDE or FDE',
    exceptional: true,
    listings: [listing('NDE', 'Exceptional Experience. From Norway.'), listing('Probable NDE', 'Caution: Graphic violence.'), listing(null, 'Exceptional Experience. From Norway.')],
  }));
  assert.ok(NderfEditorial.safeParse(e).success);
  assert.deepEqual(e.classificationRaw, { page: 'NDE or FDE', listings: ['NDE', 'Probable NDE'], searchSite: [] });
  assert.deepEqual(e.classificationTokens, ['nde', 'probable_nde', 'fde']);
  assert.equal(e.classificationHedged, true);
  assert.equal(e.exceptional, true);
  assert.deepEqual(e.tagsRaw, ['Exceptional Experience. From Norway.', 'Caution: Graphic violence.']);
  assert.equal(e.contentWarning, true);
  assert.equal(e.nonWesternLabel, false);

  const plain = deriveEditorial(account({ page_classification: 'STE', listings: [listing('STE', 'Non-Western NDE from Kenya.')] }));
  assert.deepEqual([plain.classificationHedged, plain.exceptional, plain.contentWarning, plain.nonWesternLabel], [false, false, false, true]);
  assert.deepEqual(deriveEditorial(account({})).classificationTokens, []);
  const added = deriveEditorial(account({ greyson_score: 14, search_listing: { classification: ['NDE'], experienced: [null, '2019-03-14'] } }));
  assert.deepEqual([added.greysonScore, added.experienceDate, added.classificationRaw.searchSite], [14, '2019-03-14', ['NDE']]);
});

test('places in a tag, each with the role the tag gives it', () => {
  const places = (tag: string) => placesInTag(tag).map((p) => [p.raw, p.country, p.role, p.known]);
  assert.deepEqual(places('From Canada'), [['Canada', 'CA', 'unspecified', true]]);
  assert.deepEqual(places('From the Netherlands. Original in Dutch, translated to English by Wim.'), [['Netherlands', 'NL', 'unspecified', true]]);
  assert.deepEqual(places('Exceptional Experience from New Zealand.'), [['New Zealand', 'NZ', 'unspecified', true]]);
  assert.deepEqual(places('From U.K.'), [['UK', 'GB', 'unspecified', true]]);
  assert.deepEqual(places('From Scotland'), [['Scotland', 'GB', 'unspecified', true]]);
  assert.deepEqual(places('From Columbia. Original in Spanish'), [['Columbia', 'CO', 'unspecified', true]]); // NDERF's spelling
  assert.deepEqual(places('Non-Western NDE. Originally from Algeria, living in France.'), [['Algeria', 'DZ', 'origin', true], ['France', 'FR', 'residence', true]]);
  assert.deepEqual(places('From Peru. Experience happened in Chile.'), [['Peru', 'PE', 'unspecified', true], ['Chile', 'CL', 'experience_location', true]]);
  assert.deepEqual(places('From Europe'), [['Europe', null, 'unspecified', true]]); // named, but no one country
  // "From" after "translated" names a language, and an unknown name makes no claim.
  assert.deepEqual(places('Translated from Persian by Dara.'), []);
  assert.deepEqual(places('From Atlantis'), [['Atlantis', null, 'unspecified', false]]);
  assert.deepEqual(places('Exceptional Experience.'), []);
});

test('language in a tag: the original, whether it was translated, and by whom', () => {
  assert.deepEqual(languageInTag('From France. Original in French, translated to English by Odile.'), { language: 'fr', translated: true, translator: 'Odile' });
  assert.deepEqual(languageInTag('Original in Farsi'), { language: 'fa', translated: false, translator: null });
  assert.deepEqual(languageInTag('Original in Traditional Chinese, translated by Wei L.'), { language: 'zh', translated: true, translator: 'Wei L' });
  assert.deepEqual(languageInTag('Translated from Persian by Dara.'), { language: 'fa', translated: true, translator: 'Dara' });
  assert.deepEqual(languageInTag('From Turkey. Translated to English by Emre'), { language: null, translated: true, translator: 'Emre' });
  assert.deepEqual(languageInTag('Originally from Hungary. Narrative in English.'), { language: 'en', translated: false, translator: null });
  assert.equal(languageInTag('From Canada'), null);
  assert.equal(languageInTag('Exceptional Experience.'), null);
});

test('claims for an account join its listings, with the tag as evidence', () => {
  const claims = deriveTagClaims(account({
    listings: [listing('NDE', 'From Mexico. Original in Spanish'), listing('NDE', null), listing('NDE', 'Exceptional Experience. From Mexico. Translated to English by Rocio.')],
  }));
  assert.ok(claims.countries.every((c) => CountryClaim.safeParse(c).success));
  assert.ok(LanguageClaim.safeParse(claims.language).success);
  const tag = (listingIndex: number) => ({ source: { kind: 'tag', listingIndex }, basis: 'explicit' });
  assert.deepEqual(claims.countries, [{ country: 'MX', raw: 'Mexico', role: 'unspecified', source: 'nderf_tag', evidence: [tag(0), tag(2)] }]);
  assert.deepEqual(claims.language, { originalLanguage: 'es', translated: 'yes', translator: 'Rocio', source: 'nderf_tag', evidence: [tag(0), tag(2)] });

  // "Original in Spanish" alone doesn't say it was translated; "Narrative in English" says it wasn't.
  assert.equal(deriveTagClaims(account({ listings: [listing('NDE', 'Original in Spanish')] })).language?.translated, 'unknown');
  assert.equal(deriveTagClaims(account({ listings: [listing('NDE', 'From Hungary. Narrative in English.')] })).language?.translated, 'no');
  assert.deepEqual(deriveTagClaims(account({ listings: [listing('NDE', 'From Atlantis')] })), { countries: [], language: null });
  assert.deepEqual(deriveTagClaims(account({})), { countries: [], language: null });
});
