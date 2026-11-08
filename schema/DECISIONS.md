# Codebook decisions

Decisions behind [codebook-schema.ts](codebook-schema.ts), schema v1 draft (November 2026).
Everything here was decided from the data's structure and metadata (field coverage,
questionnaire wording, menu values, editor tags) before any account text was read.

## Conventions

- **Three layers stay separate:** what the experiencer wrote, NDERF's editorial layer
  (classification, tags, summaries, the exceptional flag, Greyson score, the search site's
  AI-inferred country and age band), and our coding. NDERF's values are inputs and are never
  overwritten.
- **Missingness has three kinds:** "not asked" (the item isn't on that questionnaire form),
  "not stated," and "stated none."
- **Every coded value records its source** (narrative, a specific questionnaire item, a tag)
  and whether it was explicit or inferred, as character offsets into the private text.
- **Rule-based and LLM-coded values live in separate files,** so either can be redone without
  the other. Pre-registered rules (country, religion, eligibility) run on top of both and
  aren't stored.
- **The LLM sees only what the experiencer wrote,** not NDERF's classification, tags, or
  summary, so agreement with NDERF's labels can be measured.
- **No account text in this repository.** The LLM's quotes are converted to offsets and dropped;
  raw responses stay in the private data repository. Strings copied from accounts are capped
  at four words, and a check before each commit confirms that no five-word sequence from any
  narrative or free-text answer appears in committed files. NDERF's question wording and menu
  labels are form text, not account text, and may be quoted.
- **Coded data is published here, including the sensitive flags** (suicide attempt, overdose,
  recreational drugs). It describes accounts that are already public, in our words, not theirs.

## Area 1: eligibility and provenance

- **Unit:** a page is one experiencer; it holds one or more episodes, and each submission on
  the page links to the episode(s) it describes.
- **Questionnaire form** is assigned from the items present, not from dates, because forms
  overlap in time (posting lags submission, and some accounts were reposted):

  | Form | What identifies it | Parts | First posted (5th–95th percentile) |
  |---|---|---|---|
  | none | no questionnaire | 220 | 1999–2022 |
  | A | orientation field, no "deceased or religious spirits" item, "The experience included" checklist | ~740 | 2001–2012 |
  | B | orientation field, spirits item, no checklist | 519 | 2004–2007 |
  | C | orientation field, spirits item, checklist | 1,486 | 2007–2011 |
  | D | affiliation menu, named-religious-figures item, before/after belief items | 1,425 | 2011–2017 |
  | E | menu and named-figures item, no checklist or before/after items | 980 | 2018–2025 |
  | F | short form: no spirits item; "deceased (or alive) beings" becomes "deceased beings" | 379 | 2025–2026 |

  The affiliation menu and the named-figures item arrived together in form D, so comparisons
  of religion and named-figure encounters across forms are confounded with the prompt. Form is
  a stratification variable.
- **What counts as an NDE is decided by circumstance, not content.** The Greyson NDE Scale
  scores what the experience contained, and two of its sixteen items are encounter items, so
  gating on it (or on NDERF's labels, if they depend on it) would favor accounts with
  encounters. Neither is used as a filter. The other Greyson items also co-occur with
  encounters, so a reduced scale doesn't fix this either.
- **What counts is decided by circumstance, and the goal is ruling out induced experiences.**
  (Revised after trial-coding the first fifty practice accounts.) An experience counts if it
  happened during an illness, injury, or medical emergency, or under a threat to life with no
  injury (fear-death experiences count), and nothing else produced it. Recreational drugs,
  meditation or spiritual practice, sleep or dreams, and anesthesia with no reported
  complication are inducers: those experiences form the comparison group. Experiences with
  no threat and no inducer (premonitions, someone else's death) are excluded. We classify the
  reported event, not its credibility: a complication the experiencer reports counts.
- **Flagged, not excluded:** overdoses (alcohol counts as a drug), suicide attempts, and a
  psychoactive medication given as the experience began during a real illness or injury
  (e.g. ketamine for a procedure). Sensitivity analyses drop flagged episodes.
- **Closeness to death is a covariate, not a gate:** bodily crisis, minor (fainting, a knock
  with brief unconsciousness, a near-drowning with self-rescue), threat only, or unclear.
  Evidence for a bodily crisis must be a described bodily event, not experiential content;
  a bare "I died" with no physical event described is unclear. Cardiac arrest is flagged,
  with its basis (clinician or witness, checkbox, self-report, hedged, medically induced),
  for a strictest-definition sensitivity analysis.
- **Pages with several experiences:** every experience of the experiencer's own is recorded,
  including later OBEs and dreams; other people's experiences described on the page are not.
  Only qualifying experiences count. A being counts for the person if it appears in any
  qualifying experience. Prior religion is resolved as of the first qualifying experience.
  Pages with more than one qualifying experience are flagged and dropped in a sensitivity
  analysis. A repeated identical experience is one episode, flagged recurrent.
- **Child** means twelve or younger at the experience; teens are not children for this
  purpose. A stated age is recorded when given.
- **Firsthand** means the experiencer, alone or with help (interviewed, transcribed, or typed by
  someone else). Reports by relatives or clinicians are not firsthand and are excluded from the
  primary analysis. Reporter is recorded per experience, since one page can mix both.
- **Gender** is copied from NDERF's structured field (no LLM needed).
- **Country** is recorded as claims with a role (origin, residence, experience location,
  unspecified) and a source. One country per person is resolved for the culture analysis:
  origin > unspecified (a plain "From X" tag) > residence. Experience location is recorded but
  never used, since where it happened says little about how someone was raised. Within a role,
  the experiencer's own statement > NDERF's tag > search-app quick facts > the search site's
  AI-inferred country. With no country from any of these, the person is "presumed US" (where
  tags and the AI country overlap, eighty-eight percent of untagged accounts are US), unless
  the account was translated from another language, in which case it's unknown. The resolved
  country keeps its source, so stated, AI-inferred, and presumed US stay separate; stated US
  will be small, since Americans rarely say they're American. Culture is analyzed through
  country-level groupings defined in the pre-registration.
- **Ethnicity** isn't asked anywhere by NDERF. Explicit heritage statements are coded in
  area 2; they are selective and can be prompted by the experience itself, so they supplement
  country and language rather than define groups.

## Area 2: religious background

- **Statements, then resolution.** Each explicit statement about the experiencer's religion is
  recorded with its tradition, kind (identification, upbringing, attendance, left), time,
  practice level, source, and context. Prior and current affiliation are resolved by rule.
- **Explicit only.** Never inferred from what was seen, country, heritage, vocabulary
  ("Allah"), or practices ("Mass," "the rosary," speaking in tongues), which risks
  misclassifying liturgical Protestants and eclectic private devotion. Attending a named
  church or group counts. Statements about other individuals aren't coded; statements about
  the household the person was raised in count as upbringing ("we were Lutheran," "my family
  practiced Catholicism").
- **Religion is coded the same way at every age.** Children can have religious faith.
- **Upbringing counts as the person's religion** unless the menu or a statement places a
  different affiliation, or none, at the time of the experience. Lapsed, nominal, or
  non-practicing doesn't override it. "Left the church" with nothing else resolves to unknown.
  Precedence: menu (if informative) > explicit statements about before or at the experience >
  upbringing, resolved as of the first qualifying experience. "Do not know," "No comment,"
  and an untouched "Select" aren't informative, so statements and upbringing fill in (marked
  as such). "Other Christian" is informative and outranks upbringing. An affiliation or
  attendance stated for the same time as the menu answer is added to it (Catholic plus Edgar
  Cayce meetings). Conflicts are flagged, not silently resolved.
- **Categories.** Christian means Trinitarian: Catholic, Orthodox, Protestant, and
  Christian-unspecified. Latter-day Saints and Jehovah's Witnesses are separate categories;
  other non-Trinitarian groups share one. Protestants are coded by family (Lutheran, Baptist,
  Pentecostal, …) and by body only when named (LCMS, PCA); there is no evangelical/mainline
  split, since denominations don't map cleanly onto it. A bare "nondenominational" is the
  nondenominational Protestant family; self-labels with no church named ("born again,
  spirit-filled") are Christian-unspecified, with the wording kept. "Spiritual but not
  religious" goes with "nothing in particular (religious)." Pluralist answers that name no
  tradition ("truth in all traditions") are "several, unspecified"; named traditions are coded
  individually. A movement that grows out of one tradition goes under it (a Sai Baba devotee
  under Hindu); syncretic esoteric movements (Theosophy, Edgar Cayce, the Urantia Book) go
  under New Age.
- **Orientation is not affiliation.** Forms A–C's Liberal/Moderate/Conservative answer is kept
  as theological orientation. Form D's items on importance of religious life and belief in God
  before the experience are kept as their own variables.
- **Statements prompted by the encounter** (offered to explain something in the experience,
  wherever they appear) are flagged, and a sensitivity analysis drops them from backfill.
  Flagging is by context, not by questionnaire item: the "consistent with your earthly
  beliefs" item is where people most naturally describe what they believed before. This
  matters most for forms A–C, where text is the only source of affiliation.

## Open

- Whether zod becomes the source of truth for these types, so LLM output is validated at
  runtime.
- Area 3 (encounters), not started.
