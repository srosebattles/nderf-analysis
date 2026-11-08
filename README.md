# nderf-analysis

Analysis of near-death experience accounts from [NDERF](https://www.nderf.org), collected with
[nderf-scraped](https://github.com/srosebattles/nderf-scraped).

## Steps so far

1. [Literature search](LITERATURE_SEARCH.md): the prompt I gave an AI model and the bibliography it
   returned, recorded before I've read any of the sources. I'll use them to help form the
   hypotheses and methods before pre-registering.
2. [Codebook schema](schema/codebook-schema.ts) (draft, in zod) and the
   [decisions](schema/DECISIONS.md) behind it: the output format for coding accounts, designed
   from the data's structure and metadata before reading any account text, then revised after
   trial-coding the first practice round. Covers eligibility, provenance, and religious
   background; encounters come next.
3. [Practice set and holdout](samples/), drawn with a fixed seed before any coding: practice
   rounds are read freely while the codebook is built; the holdout stays unread until it is
   frozen.

## Development

Needs Node 22.18+ (it runs the TypeScript directly).

```bash
npm install
npm run typecheck
npm test
npm run check:overlap -- ../nderf-raw-data   # before each commit: no account text in tracked files
```
