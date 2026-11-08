# Codebook decisions

Decisions behind [codebook-schema.ts](codebook-schema.ts), schema v3 draft (November 2026).
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
- **The schema is written in zod,** the single source for both the TypeScript types and the
  runtime check. Every record, rule-based or LLM-coded, must pass it before it is written:
  objects are strict (an invented field fails), cross-field rules are refinements, and copied
  text is capped. A response that fails is retried once with the error fed back, then logged
  for review; nothing invalid is written.
- **Rule-based and LLM-coded values live in separate files,** so either can be redone without
  the other. Pre-registered rules (country, religion, eligibility) run on top of both and
  aren't stored.
- **The LLM sees only what the experiencer wrote,** not NDERF's classification, tags, or
  summary, so agreement with NDERF's labels can be measured.
- **No account text in this repository.** The LLM's quotes are converted to offsets and dropped;
  raw responses stay in the private data repository. Strings copied from accounts are capped
  at six words. The cap is a limit, not a target: copy the term, name, or title as written,
  not the sentence around it. A check before each commit confirms that no five-word sequence
  from any narrative or free-text answer appears in our prose and code (which never hold
  copied text; examples are invented), and no seven-word sequence, one longer than the cap,
  appears in data files, which catches a passage split across several copied strings. NDERF's
  question wording and menu labels are form text, not account text, and may be quoted.
- **The cap was raised from four words to six** (November 2026). Four-word sequences are
  already mostly unique to one account (sixty-nine percent in the practice pages, against
  ninety-five percent for six), and the account ID is published with the coded data, so the
  cap was never what made the data hard to trace; what it guarantees is that we publish
  labels, not passages. Exact wording stays recoverable privately from evidence positions.
  Six words fits multi-word titles, chains of relatives, and church names that four cut off.
- **Coded data is published here, including the sensitive flags** (suicide attempt, overdose,
  recreational drugs, conditions that can produce hallucinations, other mental health
  conditions, and psychiatric medication). It describes accounts that are already public, in
  our words, not theirs.

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
- **Conditions that can produce hallucinations or delusions are recorded, and flagged, not
  excluded** (added while designing area 3). Each stated condition is a statement with:
  - its type: psychotic disorder (schizophrenia, schizoaffective, delusional disorder, brief
    psychosis); bipolar disorder; depression with psychotic features; delirium, including
    "ICU psychosis"; dementia; seizure disorder; sleep disorder with hallucinations
    (narcolepsy, sleep paralysis); substance-induced psychosis; other, where the text links
    a condition to hallucinations; or other mental health condition (depression, anxiety,
    PTSD, and the like);
  - when it applied: before the experience, at the time, present at the time but recognized
    later, began after, or not stated;
  - who said so: the experiencer, a clinician as reported, or family;
  - the basis: diagnosed, self-identified, or not stated ("I was diagnosed with" and "I'm
    pretty sure I have" are different claims);
  - the words.

  Recorded only when stated: never inferred from the experience's content, from a medication,
  or from someone calling the experience a hallucination. Delirium and seizure disorders are
  neurological rather than psychiatric but are the same confound; delirium is the standard
  skeptical explanation for experiences in intensive care. The flag is resolved per episode at
  analysis time from every type except "other mental health condition," present before or at
  the experience. A sensitivity analysis drops flagged episodes.
- **Neurodevelopmental conditions are recorded by the label used,** outside the flag: autism
  (including Asperger's, PDD-NOS, "on the spectrum"); ADHD (including ADD); intellectual
  disability or developmental delay (often a provisional childhood label); specific learning
  disability (dyslexia, dyscalculia); or other neurodevelopmental, with the words kept. They
  are not mental illnesses, so they don't go under "other mental health condition." Not
  lumped, because diagnostic boundaries have shifted (Asperger's folded into autism in DSM-5,
  2013; autism and ADHD couldn't be diagnosed together under DSM-IV; girls once diagnosed with
  ADHD are now often diagnosed autistic): the label as stated keeps that history, and analysis
  can group them, alongside the experiencer's age and the year, if it wants to. Co-occurring
  conditions are separate statements. Recording them changes nothing about eligibility or how
  the rest of an account is coded.
- **Psychiatric medication being taken at the time** is recorded (antipsychotic, mood
  stabilizer, antidepressant, sedative, or other, with the words), separately from a
  psychoactive medication given as the experience began. Explicit only.
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

## Area 3: encounters (in progress)

What to capture is set out in [area3-requirements.md](area3-requirements.md); how it is modeled
is decided here. Designed one cluster at a time, after reading practice round 1. Everything
below is in the schema (v4 draft) except provenance, which is still open; trial coding comes
after.

### Identity: how and when a being was identified

- **Identity is a list of claims on each encounter,** not one field. One being can carry
  several identities (a figure called God throughout, whom a questionnaire answer then
  reasons was Jesus; a Theosophical master named together with the saint he is said to have
  been), and a single field would have to drop all but one. An empty list means the being was
  never identified.
- **Each claim records** the words used (copied, within the cap), the referent we code
  them as (vocabulary: next cluster), when, how, certainty, and evidence. Evidence already says
  whether the claim is in the narrative or in which questionnaire item, so "named only in the
  named-figures item" is computed, not coded.
- **One claim per referent per timing.** A name used throughout, plus one answer saying the
  being was recognized at once, is one claim, timed during. Recognized during and confirmed
  afterward from a photo is two claims.
- **When: during, after, or not stated, coded strictly.** During only when the text tells the
  act of identifying as part of the experience (knowing, recognizing, being told). After only
  when it places it later (didn't know at the time; a later article or photo). Otherwise not
  stated, including for relatives and for names simply used in telling the story ("then
  Jesus said"). Narratives are written in hindsight, and forcing a choice would push guesses
  toward during. A present-tense conviction ("I'm sure it was") doesn't say when it formed.
  Presuming that people known in life were recognized on sight is an analysis-time rule, not
  coding. Not stated is expected to be the largest group.
- **How,** one or more, and only when the text gives it as the way the person knew (describing
  a beard and a robe isn't saying the being was known by them):

  | How | Meaning | Timing |
  |---|---|---|
  | announced | the being, or another being, said or conveyed who it was | during only |
  | recognized | recognized as someone already familiar: known in life, or felt known | either |
  | appearance | by how it looked: features, wounds, likeness to a picture or statue; afterward, a photo seen later | either |
  | knowing | knew or felt who it was with no means given ("just knew," "felt it was") | either |
  | reasoned | worked out from doctrine, from what the being did, or from what happened | either |
  | told by a person | someone in ordinary life identified it (a relative, clergy, a psychic) | after only |
  | reading or media | from reading, TV, or film | after only |
  | not stated | no means given | either |

- **Certainty:** asserted; hedged ("I think," "might have been," "of some sort," either-or
  lists that offer two or three identities, or an "Uncertain" menu answer on the item whose comment
  gives the name); or resemblance only ("looked like," "reminded me of"), unless the person
  goes on to say it was that being. Resemblances are kept as claims, so hedged recognitions
  can be counted or dropped. "Felt it was" is how (knowing), not a hedge. A remark about the
  referent rather than the being met (that a figure from one tradition can look like one from
  another) is not a claim.
- **Kept out of identity:** priming before the experience (a devotional object addressed daily
  beforehand) and memories recovered after exposure (an encounter remembered only after a TV
  program). They describe how the expectation or memory came about, not how the being was
  identified, and belong to a provenance field (still open).

### What counts as an encounter, and what one entry is

- **An encounter is any being the person perceives during an episode, by any means,** with
  one or more ways it was perceived: seen, heard, sensed as a presence, touched, or mind to
  mind. The person's own body never counts (a separate double of oneself is a question for the
  being categories). A being only credited with something in the experience and never
  perceived (a pull later put down to a deity's love; being sent back with nothing seen or
  heard) also gets an entry, marked "credited only," so it can be counted or dropped. Who sends
  people back is one of the roles.
- **Physical presence is coded, because some cases are ambiguous.** People in the physical
  setting are not of interest, but whether a person was really there or met within the
  experience isn't always clear. Each encounter is coded: physically present (perceived during
  the experience, usually from out of the body), part of the experience, or unclear. A living
  person can be either: a living friend glimpsed at work elsewhere in the building is
  physically present; a living spouse seen among figures beyond the light is part of the
  experience. A stranger met just after returning to the body and presented as more than
  ordinary is unclear. Ordinary perception before the experience starts or after it ends is
  not an encounter. This is separate from where an experiential being appears (a deceased
  relative standing by the bed versus an otherworldly place), which comes with descriptions.
- **One entry per individual given an identity or a description of its own;** the rest stay in
  a group entry with a count: an exact number, several, many, unspecified, or one or more (a
  voice written as "he/they"). A crowd with one known person singled out is two entries.
  Physically present people of one kind (medical staff) are one group entry.
- **One entry per episode,** since episodes qualify separately, with an optional link when the
  text says the same being was met in another episode.

### Checkbox answers, and where each encounter is reported

- **Menu answers to the being items are recorded by rule** in the derived file, per part: the
  option picked for "Did you see any beings in your experience?", "Did you see deceased or
  religious spirits?", the deceased (or alive) beings item, the mystical-being item, and the
  named-figures item, and whether the checklist's "Presence of unearthly beings" and "Presence
  of deceased persons" were ticked. These are fixed options, so no LLM is needed.
- **Encounters hold only what is described,** in the narrative or in an answer's comment. A box
  ticked with nothing described creates no encounter. Keeping the two independent lets their
  disagreement (King 2022, and Greyson's reply) be computed by comparing them: beings ticked
  but none described, or beings described where the item was answered "No."
- **Where an encounter is reported** (narrative only, questionnaire only and in which items, or
  both) is computed from its evidence, not coded.

### Who is encountered: categories

- **Every encounter gets at least one category, including unidentified beings.** Beings of
  light, a voice or felt presence with no form, guides, councils or robed figures, orbs, and
  unrecognized humans are identity claims in an "unidentified" group. A being of light later
  named Jesus is one encounter with two claims. "Never identified" means no claim outside the
  unidentified group. (This replaced a proposal to type unidentified beings only from their
  descriptions, which would have dropped categories the requirements ask for.)
- **The category list** is the one in [area3-requirements.md](area3-requirements.md), placed
  as follows:
  - Vital status and what the experiencer knew are attributes, not categories, so living and
    deceased people share categories.
  - Angels are their own category regardless of tradition (Michael is never filed as
    Catholic). Biblical figures are a shared category.
  - Clergy or religious the experiencer knew personally are a category under people, apart
    from saints and luminaries.
  - Living religious leaders not known personally are one category, regardless of tradition.
  - Children who died before birth (miscarried, stillborn, or aborted) and children not yet
    born are family, by role.
  - The experiencer's own double or higher self, appearing as a separate being, is a
    category. One's own body never counts.
  - An ordinary animal behaving with hostility is an animal (role: hostile beast); a monstrous
    or demonic beast is a hostile being.
  - Anything else is "other," with the words kept.
- **Named figures get their subcategory from a pre-registered table, not from the model.** The
  model gives each named figure a canonical name (our spelling, not copied text, so variant
  spellings and titles of one figure group together). The table maps each name to a
  subcategory (early or medieval saint, post-Reformation Catholic or Orthodox saint,
  Protestant saint or luminary, biblical figure, a tradition's figures, non-religious
  historical figure) and to its traditions, which can be several (Jesus is also Isa; Mary,
  Maryam; Moses, Musa). Saints are grouped by when they lived, not by who canonized them: one
  who died before the Reformation (about 1517), church fathers included, is an early or
  medieval saint, shared heritage that Protestants claim as fully as Catholics (St. Francis).
  Dating is by death, not canonization (Joan of Arc died in 1431 and was canonized in 1920).
  Figures near the line, and pre-Reformation figures only Protestants claim (Hus, Wycliffe),
  are decided once per name in the table. Which traditions claim a figure is the table's,
  not the subcategory's. Whether a
  figure is religious or secular is decided once per name: known mainly for faith
  (theologian, martyr, missionary) or commemorated on a church calendar counts as religious.
  A name not in the table gets the model's suggested subcategory, is flagged for review, and
  is added. The table's traditions feed the cross-tradition analysis.
- **The referent comes only from the text, never from the experiencer's background.** The term
  is always recorded. Coding a Christian's "God" as Christ because they are Christian would put
  prior religion into the encounter coding, and the cross-tradition comparison would partly
  measure our own assumption. "God" stays God. When the text gives grounds that the figure is
  Christ (the person equates them, the figure bears wounds, it is called the Son), that is a
  second claim, Jesus, with how it was established.

### People in detail: relationships

- **A relationship is built from parts, not one long list,** so counts can be as granular as
  needed (grandmothers versus grandfathers) without well over a hundred entries:
  - base role: parent, child, sibling, grandparent, grandchild, aunt or uncle, niece or nephew,
    cousin, spouse, partner, godparent, godchild, ancestor (unspecified), or relative
    (unspecified);
  - sex: female, male, or not stated, from a gendered word or pronouns in the text, never from
    a name;
  - greats: how many ("fifth great-grandfather" is five);
  - side: maternal, paternal, or not stated;
  - link: blood, half, step, in-law, adoptive, foster, by marriage, or former (an ex-spouse or
    ex-partner);
  - the words as written.

  Finer detail (a second cousin once removed) stays only in the words. Children who died
  before birth or were not yet born are children or siblings by role; the rest is vital
  status.
- **Friends and acquaintances get one or more types:** childhood friend, school friend or
  classmate, close friend, coworker, military comrade, neighbor, mentor or teacher,
  acquaintance, or other, with the words kept.
- **Clergy known personally get a religious role:** priest, pastor or minister, deacon, nun or
  religious sister, monk or religious brother, rabbi, imam, or other. A relative or friend who
  was also clergy stays family or friend, with the religious role recorded alongside. "Clergy
  known personally" means people known through that role: one's own pastor, a school chaplain,
  a sister who taught one.
- **Kinship words for beings never known in life don't make them family or friends.** Figures
  called friends known forever though never seen before, or a "soul family," are unidentified
  beings (robed figures, a council, or other), with the words kept. A specific relative never
  met, such as an ancestor, is still family.

### People in detail: vital status and what the experiencer knew

- **Vital status,** for people and animals, at the time of the experience, as the experiencer
  reports it (including what they learned afterward): alive; dead; died before birth
  (miscarriage, stillbirth, or abortion, which one if stated); in the womb at the time; not
  yet conceived; not yet born, timing unclear; or not stated. "Died before birth" rather than
  "never born," and "not yet conceived" rather than a label such as "pre-existing soul":
  vital status records a timing the text reports, not a belief about what the being is, and a
  child already in the womb is kept apart from one conceived later. The experiencer's own
  framing (a soul waiting to come) stays in the words.
- **What the experiencer knew at the time:** "knew" when the text says so, or when the death
  plainly comes earlier in their own story; "didn't know" only when the text says so (they
  learned afterward, or were surprised because they believed the person alive); otherwise "not
  stated." Dead and not known to be dead is the Peak in Darien case. For it, how the death was
  learned (told by family, news or an obituary, records or genealogy, or other) and when it
  happened relative to the experience, as reported. A flag marks a person alive at the time
  who, as reported, died soon after.
- **Future children:** whether the text reports that the child was later born, and whether
  anything foretold matched (a name, the sex).

### People in detail: familiarity, closeness, age, and living people

No questionnaire form asks about relatives, friends, or pets, and only one page in the archive
has an item on the age of the deceased, so all of this comes from the text.

- **Prior familiarity, for every encounter:** knew personally; knew of (from stories, photos,
  pictures, or teaching); claims no prior knowledge ("never heard of," "knew nothing about"),
  with the words kept; or not stated. Only from the text, never from the person's background:
  a Christian meeting Jesus is "not stated" unless the text says how they knew of him.
- **Closeness, for every relative and friend, only when stated:** whether they were a
  formative presence (raised the experiencer or shared their childhood household), and
  attachment language (closer than the role suggests, close, distant, or estranged or in
  conflict), with the words kept. Not limited to step-relations and in-laws: a grandparent who
  raised the experiencer is the same information. Estrangement is included because
  reconciliation is likely a theme of its own.
- **Time since death and apparent age, for deceased people and animals.** Time since death is
  a number of years or a range, stated or computed from dates in the text (marked as which),
  or else: shortly before (days or weeks), within a year, some years with no number, before
  the experiencer was born, or not stated. Apparent age: as when they died, younger, older (a
  child appearing grown), ageless, or not stated, with a stated age recorded when given.
- **Living people met as part of the experience:** how the experiencer explains it (higher
  self, bilocation, a dream element, the person was also near death or ill at the time, other,
  or no explanation offered), with the words kept.

### Representation and place

- **Representation level, for every encounter, the most specific that applies:** not
  described (named or mentioned with no visual description, including voices and formless
  presences; the ways it was perceived say whether it was seen); light or formless (a light,
  glow, orb, mist, or energy with no figure); generic figure (no features specific to anyone:
  robes, a beard, a hood, a body of light); personal likeness (a person or animal described as
  looking like themselves); or iconographically specific (features tied to a particular
  figure, tradition, or role: wounds, a crown of thorns, a halo, wings, many arms, an animal
  head, a trident, a monastic habit, horns and a pitchfork). A bearded figure in a robe is
  generic.
- **Visual details: the words, plus a coded feature.** One entry per feature per encounter,
  with the words (up to six), a color when stated, and evidence for every place it is
  mentioned. Features come from a starter list grouped by the figures they point to (Christ,
  angels, saints and clergy, South Asian traditions, hostile beings, general), plus "other"
  with the words kept. The list grows during trial coding and is frozen before the holdout.
  Two consistency rules: "not described" has no details, and "iconographically specific" needs
  at least one feature outside the general group (or "other"). What a feature points to is
  decided at analysis time by a fixed map, never by the coder, so the hostile group can be
  split into folkloric and scriptural imagery there. Expressions (smiling) belong to
  disposition; beings around a figure are encounters of their own.
- **The feature list so far.** Grouped for reading only; the analysis map is keyed on the pair
  of figure category and feature, because a feature can mean different things on different
  figures (a serpent under Mary's feet versus a serpent as the being; Michael's sword versus a
  sword piercing Mary's heart).
  - Christ: wounds, crown of thorns, cross, sacred heart, lamb.
  - Mary: mantle or veil, crown of stars, crescent moon, rosary, scapular, immaculate heart,
    holding an infant.
  - Christ and Mary: rays (from the heart, the hands, or around the figure).
  - Angels: wings, sword, trumpet, armor, scales.
  - Saints and clergy: halo, monastic habit, clerical dress.
  - South Asian traditions: many arms, animal head, blue skin, trident, rope or noose, ledger.
  - Buddhist: vase.
  - Hostile beings: horns, red skin, pitchfork, hooves, tail (folkloric); serpent, dragon,
    lion (scriptural); claws.
  - General: robe, beard, hood, throne, book, staff, crown, body of light; flowers, with a kind
    (rose, lily, lotus, other, or not stated) so one feature serves any figure; hair color, eye
    color, and skin tone (only as stated); face not visible; head covering; hands in prayer;
    blessing gesture; modern clothing; period clothing.
  - Other, with the words kept.

  Colors: white, black or dark, gold, blue, red, purple, brown, grey, green, pale, tan or
  olive, blond, other. Whether clothing is unusual for a figure (modern dress on Jesus or Mary,
  but not on a deceased grandmother) is decided at analysis time, not by the coder.
- **Comparisons to images and media, for every encounter:** the kind (painting or picture,
  statue or icon, film or TV, book or illustration, or other), and the specific work if named
  (words kept) or "general" if not. This gives area 4 a direct measure of media influence.
- **Where the being appeared, more than one place allowed:** earthly surroundings (by the body
  or elsewhere on earth), transitional (a tunnel, darkness, a void), otherworldly, or unclear.
  Transitional can be folded into otherworldly at analysis for a two-way split.
- **Apparent sex, for every being:** female, male, neither or both, or not stated, from the
  description or pronouns; never from a name, and never from the pronouns conventionally used
  for God. Needed for Mary's first level (an unnamed radiant woman) and for unidentified beings.

### Mary, hostile beings, and animals

- **Mary's three levels, mostly computed.** Any encounter with a Mary claim is at least level
  two. Level three is a Mary encounter with confessional content, recorded as a list on any
  encounter where it appears: rosary, scapular, purgatory, novena, intercession, an apparition
  title, or other devotion, with the words kept. Visible rosaries and scapulars also count
  through the visual features. Which content is Catholic-specific is decided per item in an
  analysis-time table, never by the coder. Titles need this most: "Mother of God" is not
  Catholic-specific (the Orthodox Theotokos; the Formula of Concord, Solid Declaration VIII),
  while apparition titles (Guadalupe, Fatima, Lourdes) are. Level one is computed from
  unidentified female beings, plus one coded flag for maternal language ("motherly," "like a
  mother"), with the words kept, so the pre-registration can define it broadly (any
  unidentified female being) or narrowly (one described in maternal terms).
- **Hostile iconography types are coded directly for hostile beings,** more than one allowed:
  folkloric; scriptural (serpent, dragon, roaring lion, or a deceptive "angel of light," only
  when the text says a being of light deceived or turned hostile); shadow beings; mocking or
  grotesque human-like spirits; amorphous creatures; an unseen terrifying presence. The visual
  features hold the specifics. Coding the type directly also catches a comparison with no
  features listed (looking like a cartoon devil).
- **Animals:** role, one or more (own pet, someone else's pet, working or farm animal,
  scenery, animal-form guide, or hostile beast); species (dog, cat, horse, bird, small pet,
  reptile or amphibian, or other, with the words kept); and the pet's name if given. Whether
  the experiencer knew it had died is vital status; whether it communicated comes from the
  communication fields, which apply to every being.

### Disposition, actions, communication, and response

- **Disposition, for every encounter, one or more:** loving, neutral or instructive, hostile,
  or ambiguous and unsettling. More than one, because a being can change (stern, then loving).
- **Actions, one or more, each with evidence:** welcomes or greets; comforts or shows
  affection; guides or escorts; blocks the way; sends back or discusses returning; conveys a
  purpose or mission; reviews or judges the experiencer's life (a book, a ledger, weighing);
  forgives; teaches; reveals knowledge (theological, cosmic, or about the future); answers
  questions; heals; warns; gives instructions or requests (including Mary's); attacks or
  torments; rescues or protects; shows knowledge of earthly events since their death (a
  deceased relative mentioning a birth or a wedding that came after); or other.
  "Sends back" records the reason given: not your time, unfinished purpose, others need you,
  a mistake (the "wrong person" motif), offered a choice, or none given.
- **Communication mode, for every being:** spoken words, mind to mind, instant knowing,
  showing (images or scenes), no communication, or not stated, kept consistent with the ways
  the being was perceived.
- **The experiencer's response, one or more:** awe, fear, awareness of sin, worship, love or
  joy, peace, or arguing or resisting (pleading to stay is common).
- **Names invoked against hostile beings:** whether the experiencer invoked a name or prayed;
  which name (the words and the referent: Jesus, God, Mary, or other); and the effect
  (dispelled, no effect, or not stated). An invocation of Jesus also counts as a Jesus mention.
- **No separate check against King's (2024) six themes for Jesus encounters.** The actions
  record what each being did, so King's themes can be analyzed from them if wanted.

### Doctrinal statements

- **Doctrine is its own list, linked to encounters,** not nested inside them, so statements
  with no being and the experiencer's later commentary are kept apart rather than lost. The
  same proposition can appear twice: conveyed by a being during the experience, and again as
  the experiencer's own view in a later answer. Each statement records:
  - the doctrine, from a pre-registered list, or "other" with the words kept;
  - the stance: affirms, denies, or reinterprets (neither a clean yes nor a clean no: "the
    resurrection is spiritual, not bodily");
  - the source: conveyed by a being during the experience (linked to that encounter), shown
    during the experience (a scene, no being speaking), understood during the experience with
    no being, the experiencer's own view afterward, or not stated;
  - evidence.

  "During" follows the strict rule for identity timing. Questionnaire items that begin "During
  your experience, did you gain information about…" don't decide it: answers often drift into
  present belief, so the text decides, and the evidence records the item for analysis.
- **Starter list:** virgin birth of Jesus; resurrection of Jesus; a general resurrection at
  the end of time (taught in classical forms of all three Abrahamic faiths, read non-literally
  by Reform Judaism and the Bahá'í Faith, hence "reinterprets"); exclusivism (Christ, or one
  faith, is the only way); religious pluralism (all religions lead to God or hold truth);
  religion as human-made or unnecessary (not the same as pluralism); reincarnation or past
  lives; universal salvation; divinity of Jesus; atonement; the self as divine; the departed
  are aware of people and events on earth (soul sleep, taught by Seventh-day Adventists and
  Jehovah's Witnesses, denies it outright); the departed pray or intercede for the living.
  Judgment after death, by God or a being ("reinterprets" covers "you judge yourself"); a
  final judgment at the end of time; hell exists; purgatory. Grows during trial coding; frozen
  before the holdout.
- **Hell is split into three things, kept apart:** what the experience contained (distressing
  content, on the episode, below), what the experiencer calls it (below), and the doctrine
  here, for stated propositions only. When a statement says what hell is like, it records the
  qualities stated, as many as apply, because they aren't exclusive: eternal; temporary or
  remedial; ends in annihilation; self-chosen; imposed or sentenced; torment; separation or
  absence of God or love; a state of mind. Describing a hellish place is not a doctrinal
  statement; interpreting it ("it was hell") is.
- **Encounters keep only content that belongs to the encounter:** Christ-specific content
  (wounds or the cross, forgiveness of sins, worship, reference to the Father, judgment) and
  revelation. Pluralist, exclusivist, and reincarnation claims live in the doctrine list.

### Distressing content and what the experiencer calls it

- **Each episode gets an overall tone:** pleasant, distressing, mixed (turned from one to the
  other), or neutral or unclear.
- **Distressing content is described, never labeled "hell" by the coder,** using the three
  types of Greyson and Bush (1992), under neutral names, more than one allowed: frightening
  versions of the usual features (their "inverse" type: a tunnel or light experienced as
  terrifying); void or nothingness; torment or hostile beings (their "hellish" type). Hostile
  beings are also encounters; this covers distressing episodes with no beings at all.
- **The experiencer's own label for the experience or a place in it,** with the words kept:
  hell or hellish, purgatory, the void, other, or none; and when it was applied (during,
  afterward, or not stated). Torment content with no "hell" label is then countable: the
  cases a reader would call hellish where the experiencer declined the word.

### Every mention of Jesus

- **One list for the whole account, separate from encounters but linked to them,** so nested
  definitions can run from "any mention" down to "explicitly identified during the
  experience." Each entry records:
  - the words;
  - what it refers to: Jesus, or ambiguous;
  - the kind: an encounter with Jesus (linked); talk about Jesus with another being (linked);
    prayer or invocation; the experiencer's own faith or belief; a doctrinal statement
    (linked); someone else's faith, words, or experience; an idiom or exclamation; the name of
    a church; or other;
  - when: before the experience, during, after, or not stated;
  - polarity: affirmative, negated, or a question;
  - evidence.

  One entry per kind, time, and place (the narrative or a given item), with every passage as
  evidence, so a long encounter isn't dozens of rows. Only the experiencer's text, never
  question wording: the named-figures item itself names Jesus, so a raw search of the pages
  would match every form D–F page.
- **Which words count.** Jesus, Christ, Isa, Yeshua, the Son (of God), the Lamb, and a
  capitalized "Savior" mean Jesus unless the text indicates otherwise. "Lord" and "Messiah"
  alone, and a lowercase "savior" (which can mean a human rescuer), are ambiguous unless the
  text ties them to Jesus ("the Lord Jesus"); "Messiah" in a Jewish account needn't mean Jesus.
  Where capitalization can't tell (the start of a sentence, all capitals), context decides,
  or the mention is ambiguous. Capitalization may be NDERF's or a translator's; the words are
  kept, so analysis can test the rule. Derived words (Christian, Christmas) don't count. In
  encounters, "the Lord" alone stays God with its words kept, and it also appears here as an
  ambiguous mention.
- **Nested definitions, computed at analysis and pre-registered,** loosest to strictest: any
  affirmative mention (not idioms or church names), with and without the ambiguous titles; a
  mention about the experience itself, in a qualifying episode; an encounter with a Jesus
  claim; the same, excluding resemblance only; the claim stated in the narrative; identified
  during the experience; announced or recognized during, and asserted. Miller's own frame,
  his first 141 cases, can probably be identified from NDERF's running numbers in the index
  metadata, and is read only after the codebook is frozen.

### Choices made while writing the schema (for review)

These weren't settled in the clusters above; they were needed to write the schema.

- **Canonical names are never given to people known in ordinary life** (family, relatives
  never met, friends, clergy known personally, unrecognized humans), for privacy: their
  relationship identifies them. Named figures and living religious leaders need one.
- **Vital status is required for people known in life and animals,** and optional for anyone
  else (a celebrity who had just died, say).
- **A relationship's link can be "not stated"** (a plain "a relative").
- **Menu answers that match no known option are "unrecognized,"** as with the religion menu.
- **Revelation is the action "reveals knowledge" with a kind** (theological, cosmic, or about
  the future), not a separate content marker, so it isn't coded twice.
- **Disposition needs at least one value; the experiencer's response may be empty** (nothing
  stated), since many encounters, such as bystanders, have no stated response.
- **Consistency rules:** "credited only" stands alone and allows no communication; "spoken"
  needs "heard" among the ways perceived, and "mind to mind" needs "mind to mind"; "none,"
  "not stated," and an "unclear" place stand alone; one visual detail per feature; a pleasant
  episode has no distressing content.
- **Names invoked are recorded exactly when the disposition includes hostile.**
- **In a Peak in Darien case, when the death happened** is around the same time, earlier, or
  not stated.
- **Condition statements name the episodes their timing is relative to.**

## Open

- Area 3: everything above is settled and in the schema (v4 draft). Still to design:
  provenance (how the memory came to be told, disclaimers about the telling, others dismissing
  the experience as a hallucination, and the experiencer's own natural explanations). Then
  trial coding on practice round 1. The full schema exports to about 80 KB of JSON Schema, so
  the coding prompt may need to code in passes.
- Area 4 and beyond, planned: idiosyncratic details from widely read NDE accounts (for
  example, *Heaven Is for Real*), to look for cultural influence from those accounts on later
  ones.
