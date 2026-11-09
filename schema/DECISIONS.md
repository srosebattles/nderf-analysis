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
  conditions, psychiatric medication, and a longing to return after the experience, including
  suicidal thoughts tied to it). It describes accounts that are already public, in
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
  primary analysis. Reporter is recorded per experience, since one page can mix both. A
  relative's relationship to the experiencer uses area 3's kinship parts (role, sex, side,
  link).
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
below is in the schema (v4 draft); trial coding comes next.

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
  - "I would describe it as" is a hedge: choosing a word, not saying who it was.
  - An identity offered as a question ("Was it my angel?") is a hedged claim.
  - A label marked as the experiencer's own word ("lights, which I called angels"; "angels,
    or whatever you'd call them") is hedged, with the words kept.
  - When passages differ, the claim takes the strongest certainty any of them states, and the
    hedged passages stay in evidence. A yes-or-no "hedged elsewhere" records that some passage
    was weaker, so the strictest Jesus rung can be reported both ways.
- **Kept out of identity:** priming before the experience (a devotional object addressed daily
  beforehand) and memories recovered after exposure (an encounter remembered only after a TV
  program). They describe how the expectation or memory came about, not how the being was
  identified, and belong to provenance (below).

### What counts as an encounter, and what one entry is

- **An encounter is any being the person perceives during an episode, by any means,** with
  one or more ways it was perceived: seen, heard, sensed as a presence, touched, or mind to
  mind. The person's own body never counts (a separate double of oneself is a question for the
  being categories). A being only credited with something in the experience and never
  perceived (a pull later put down to a deity's love; being sent back with nothing seen or
  heard) also gets an entry, marked "credited only," so it can be counted or dropped. Who sends
  people back is one of the roles. So does a being the experiencer only infers from something
  else (a crack of sound taken to be a demon's whip): a hedged claim, credited only.
- **A force isn't treated as a being unless the text gives it a will or a voice,** or calls it a being or
  presence. "A presence urging me to return" is an encounter; "I was pulled back" is
  not. The same goes for a hostile phenomenon with no agent (hail of light striking from every
  side): distressing content (torment), not orbs, unless the text gives it intent (it chases,
  mocks, speaks) or calls it a being. "Orb" then means orbs presented as beings.
- **Only literal reports are coded; similes are not encounters.** Figurative: "like," "as
  if," "as though," "seemed to," or "felt like" with nothing more, and stock metaphors ("the
  sea was calling me"). Literal: a plain statement that it happened, reported speech with
  content, or a described exchange. A literal report with a qualifier ("I think the trees
  were speaking") is a hedged claim. When it's truly unclear, nothing is coded, and the two
  models' disagreement shows the case. So "music like a choir of angels" describes a sound,
  while "I heard angels singing" claims angels (heard). A checkbox saying "beings" on a page
  with only a simile is a disagreement, computed like any other.
- **Something normally inanimate that communicates with the experiencer or acts toward
  them,** reported literally (an invented example: a stream that speaks and asks them to
  follow), is an encounter in its own category, among the controls. One passage can hold
  both kinds of report: "the river spoke to me" is coded, "the river seemed to wash me
  clean" is not (no "heals").
- **Surroundings described as alive or aware,** with nothing interacting with the experiencer
  ("everything there was alive"), are a yes-or-no flag on the episode, with the words and
  evidence, under the same literal-report test. They're a known motif, but not encounters.
- **People inside a scene the experiencer watches are not encounters:** a life review, a past
  life, a preview of the future. They're memories or visions, not beings met. Two exceptions:
  a figure in the scene who turns to the experiencer and interacts with them, and a being
  beside the experiencer who shows them the scene. A future child who greets the experiencer
  directly is met, and is an encounter.
- **Physical presence is coded, because some cases are ambiguous.** People in the physical
  setting are not of interest, but whether a person was really there or met within the
  experience isn't always clear. Each encounter is coded: physically present (perceived during
  the experience, usually from out of the body), part of the experience, or unclear. A living
  person can be either: a living friend glimpsed at work elsewhere in the building is
  physically present; a living spouse seen among figures beyond the light is part of the
  experience. A stranger met just after returning to the body and presented as more than
  ordinary is unclear. Another dying person's spirit seen leaving their body is part of the
  experience: the body is there, but what is seen can only be seen within the experience. A
  voice calling the experiencer's name just as they return is unclear unless the text says
  whose it was (a doctor's is physically present; one from the light is part of the
  experience). Ordinary perception before the experience starts or after it ends is
  not an encounter. This is separate from where an experiential being appears (a deceased
  relative standing by the bed versus an otherworldly place), which comes with descriptions.
- **One entry per individual given an identity or a description of its own;** the rest stay in
  a group entry with a count: an exact number, several, many, unspecified, or one or more (a
  voice written as "he/they"). A crowd with one known person singled out is two entries.
  Physically present people of one kind (medical staff) are one group entry.
- **Beings the text doesn't equate are separate entries,** even when they might be the same
  (a figure on a throne, a guide, and an ancestor who leads the way). Merging would be a
  judgment the text doesn't make; analysis can still read them together.
- **One entry per episode,** since episodes qualify separately, with an optional link only when
  the text says it was the same individual ("the same being," "him again"). "A being of light"
  in both episodes is the same kind of being, not necessarily the same one: no link.

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
  light, a voice or felt presence with no form, guides, councils or robed figures, orbs,
  unrecognized humans, and other unidentified beings (an "entity" none of these describes)
  are identity claims in an "unidentified" group. A being of light later
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
    category. One's own body never counts. The category is for a being the experiencer
    identifies as themselves in some form, hedged when they waver ("it wasn't me, but I call
    it my higher self"); a being that only looks like them gets the representation
    "personal likeness," with whatever claim fits.
  - A person's "ghost" or "spirit" is an unrecognized human with vital status dead,
    since the word says so; one not described as human-shaped is an unidentified being.
  - Someone else's child met before conception (a friend's son) is a friend or acquaintance,
    type other, with the words; vital status and the later birth are recorded as for the
    experiencer's own future children.
  - An ordinary animal behaving with hostility is an animal (role: hostile beast); a monstrous
    or demonic beast is a hostile being.
  - Something normally inanimate that communicates or acts (sand, water, a tree) is an
    animate object or landscape, among the controls (extraterrestrials, folkloric beings,
    fictional characters, mechanical beings).
  - Anything else is "other," with the words kept.
- **Named figures get their subcategory from a pre-registered table, not from the model.** The
  model gives each named figure a canonical name (our spelling, not copied text, so variant
  spellings and titles of one figure group together). The table maps each name to a
  subcategory (early or medieval saint, Orthodox saint, post-Reformation Catholic saint,
  Protestant saint or luminary, biblical figure, a tradition's figures, non-religious
  historical figure) and to its traditions, which can be several (Jesus is also Isa; Mary,
  Maryam; Moses, Musa).
- **Saints are grouped by when they lived and which split divides them, not by who canonized
  them.** An early or medieval saint is shared heritage: anyone who died before the East-West
  schism (1054), church fathers included, and Western saints who died between 1054 and the
  Reformation (about 1517), such as St. Francis, whom Protestants claim as fully as Catholics.
  Eastern saints who died after 1054 (Gregory Palamas, Seraphim of Sarov), or for the Oriental
  Orthodox after Chalcedon (451), are Orthodox saints; Western saints after about 1517 (Padre
  Pio) are post-Reformation Catholic saints; Protestant figures after about 1517 are Protestant
  saints or luminaries. Dating is by death, not canonization (Joan of Arc died in 1431 and was
  canonized in 1920). Figures near a line, and pre-Reformation figures only Protestants claim
  (Hus, Wycliffe), are decided once per name in the table. Which traditions claim a figure is
  the table's, not the subcategory's.
- **Whether a figure is religious or secular is decided once per name:** known mainly for
  faith (theologian, martyr, missionary) or commemorated on a church calendar counts as
  religious. A name not in the table gets the model's suggested subcategory, is flagged for
  review, and is added. The table's traditions feed the cross-tradition analysis.
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
  acquaintance, unspecified (just "my friend"), or other, with the words kept. Clinical or
  paid care is split by direction: their patient (the experiencer was their clinician or paid
  carer, as in many shared-death accounts) or their clinician or carer (the experiencer's own
  doctor, nurse, therapist, or paid carer). Anyone else known through work who isn't a
  coworker or mentor (a client, a customer, an employer) is "other professional." Unpaid care
  within a family stays with family, where closeness covers it; a chaplain is clergy. Medical
  staff seen at the scene are usually strangers: a group of unrecognized people, no tie.
- **People known in life whose relationship isn't stated** ("people I knew") have their own
  category, since they could be family or friends. Like family and friends, they need vital
  status and never get a canonical name.
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
  Familiarity is about ordinary life. Meeting the being before in an earlier experience (a
  childhood vision, a meditation) is the link between episodes: the earlier experience is an
  episode of its own, with an encounter linked as the same being, and the episodes' dates or
  ages give the order. So "I knew the light from meditation" needs a small episode and a
  linked encounter.
- **A relative never met can be implied by kinship:** from three greats up
  (great-great-great-grandparent and beyond), "never met" is implied unless the text says
  they met. With fewer, the text decides; if it's silent, the relative is family with
  familiarity "not stated."
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
  child appearing grown), ageless, or not stated, with a stated age recorded when given. A
  child who died before birth and appears as an infant is "as when they died"; a toddler or
  older is "older." The question is whether they grew up in the afterlife.
- **Apparent condition, for the deceased,** only when the text contrasts it with life or
  death: healed or whole (walking when paralysed in life, well when they died ill), as at
  death (injured or ill), or not stated. A common motif that apparent age doesn't capture.
- **Living people met as part of the experience:** how the experiencer explains it (higher
  self, bilocation, a dream element, the person was also near death or ill at the time, other,
  or no explanation offered), with the words kept.

### Representation and place

- **Representation level, for every encounter, the most specific that applies:** not
  described (named or mentioned with no visual description, including voices and formless
  presences; the ways it was perceived say whether it was seen); light or formless (a light,
  glow, orb, mist, or energy with no figure); generic figure (no features specific to anyone:
  robes, a beard, a hood, a body of light); personal likeness (looking like a particular
  person or animal: a relative as they looked in life, or a being that looks like the
  experiencer); or iconographically specific (features tied to a particular
  figure, tradition, or role: wounds, a crown of thorns, a halo, wings, many arms, an animal
  head, a trident, a monastic habit, horns and a pitchfork). A bearded figure in a robe is
  generic.
- **Visual details: the words, plus a coded feature.** One entry per feature per encounter,
  with the words (up to six), the colors when stated (in the order described, so eyes that
  turn from grey to green keep both), how it was perceived (seen, felt, or heard: claws felt
  in the dark count), and evidence for every place it is mentioned. Representation is a
  visual judgment, so only seen details bear on it: a being with only felt details is still
  "not described. Features come from a starter list grouped by the figures they point to (Christ,
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

  Colors: white, black or dark, gold, silver, blue, red, purple, brown, grey, green, pale, tan
  or olive, blond, other. "Other" features are exempt from one-per-feature, since two can be
  unrelated (a lantern, and a ribbon tied to it). Whether clothing is unusual for a figure (modern dress on Jesus or Mary,
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
  encounter where it appears: rosary, scapular, purgatory, novena, intercession (she prays
  for someone) or invocation (someone prays to her or asks her prayers), an apparition title,
  or other devotion, with the words kept. The traditions draw their line between intercession
  and invocation, so they're coded apart. Visible rosaries and scapulars also count through the
  visual features. Which traditions each item fits is decided in a pre-registered table (below),
  never by the coder. Titles need this most: "Mother of God" is not
  Catholic-specific (the Orthodox Theotokos; the Formula of Concord, Solid Declaration VIII),
  while apparition titles (Guadalupe, Fatima, Lourdes) are. Level one is computed from
  unidentified female beings who are part of the experience and interact with the
  experiencer (an action toward them, or some communication), so a passer-by in the scenery
  doesn't count. Unrecognized humans stay in: "a woman in white who comforted me" is the
  central case. Plus one coded flag for maternal language, with the words
  kept: the text describes her as motherly ("motherly," "like a mother"), or she addresses
  the experiencer as her child ("my son," "my child"). Tenderness alone (a caress) doesn't
  count. The flag lets the pre-registration define level one broadly (any such being) or
  narrowly (one with maternal language).
- **Hostile iconography types are coded directly for hostile beings,** more than one allowed:
  folkloric; scriptural (serpent, dragon, roaring lion, or a deceptive "angel of light," only
  when the text says a being of light deceived or turned hostile); shadow beings; mocking or
  grotesque human-like spirits; amorphous creatures; an unseen terrifying presence. The visual
  features hold the specifics. Coding the type directly also catches a comparison with no
  features listed (looking like a cartoon devil).
- **Animals:** role, one or more (own pet, someone else's pet, working or farm animal,
  scenery, animal-form guide, companion (stays with or comforts the experiencer, as a deer walking
  beside them), or hostile beast); species (dog, cat, horse, bird, small pet,
  reptile or amphibian, or other, with the words kept); and the pet's name if given. Whether
  the experiencer knew it had died is vital status; whether it communicated comes from the
  communication fields, which apply to every being.

### Disposition, actions, communication, and response

- **Disposition toward the experiencer, for every encounter, one or more:** loving, neutral or
  instructive, hostile, ambiguous and unsettling, or not stated (alone: a bystander, a figure
  who never notices them). More than one, because a being can change (stern, then loving).
- **Actions, one or more, each with evidence:** welcomes or greets; comforts or shows
  affection; guides or escorts; blocks the way; sends back or discusses returning; conveys a
  purpose or mission; reviews or judges the experiencer's life (a book, a ledger, weighing);
  forgives; teaches; reveals knowledge (theological, cosmic, or about the future); answers
  questions; heals; warns; gives instructions or requests (including Mary's); attacks or
  torments; rescues or protects; shows knowledge of earthly events since their death (a
  deceased relative mentioning a birth or a wedding that came after); or other.
  "Sends back" records every reason given: not your time, unfinished purpose, others need
  you, a mistake (the "wrong person" motif), offered a choice, or none given (alone). A being
  can give two (a choice, and a spouse who needs them). "Gives instructions or
  requests" records what was asked, one or more, with the words kept: pray; a specific devotion
  (the rosary, a novena); join, return to, or leave a church or religion; how to live; pass a
  message on to others; care for a particular person; a practical action, what to do now to
  survive or reach safety ("breathe," "go left"); or other. It applies to any being, so
  Mary's requests can be compared with Jesus's or a deceased relative's.
- **Communication mode, for every being:** spoken words, mind to mind, instant knowing,
  showing (images or scenes), no communication, or not stated, kept consistent with the ways
  the being was perceived. A voice placed in the head or mind ("as if inside my head," "in
  my mind," "telepathic," "without words") is mind to mind, even when the text says "heard,"
  which is just the ordinary verb; spoken words are a voice with no such marker. Both are
  recorded only when the text gives both modes.
- **The experiencer's denial that it was a being** is kept when they still describe an
  exchange with it ("I met no being, only the Presence," "it wasn't a person, more like…"),
  with the words. The encounter is coded as usual; non-dual accounts are likely to do this.
- **Denied identities** are kept on the encounter: "Are you God?" "No." Each records the
  category (and canonical name for a named figure), who denied it (the being or the
  experiencer), and the words. Claims stay positive; a Jesus denial is also a negated Jesus
  mention.
- **The experiencer's response, one or more:** awe, fear, awareness of sin, worship, love or
  joy, peace, or arguing or resisting (pleading to stay is common).
- **Names invoked against hostile beings,** for hostile encounters that are part of the
  experience or unclear, never physically present people (a human attacker at the scene):
  whether the experiencer invoked a name or prayed;
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
  - certainty: asserted or hedged ("I think," "or something like it"), as for identity claims;
  - the source: conveyed by a being during the experience (linked to that encounter), shown
    during the experience (a scene, no being speaking), understood during the experience with
    no being, the experiencer's own view before the experience, their own view afterward, or
    not stated. A before-and-after pair on one doctrine shows a changed belief directly;
  - evidence.

  "During" follows the strict rule for identity timing. Questionnaire items that begin "During
  your experience, did you gain information about…" don't decide it: answers often drift into
  present belief, so the text decides, and the evidence records the item for analysis.
- **Starter list:** life after death (only when stated as a claim, never inferred from the
  experience itself; denials and reinterpretations are the informative cases); virgin birth of Jesus; resurrection of Jesus; a general resurrection at
  the end of time (taught in classical forms of all three Abrahamic faiths, read non-literally
  by Reform Judaism and the Bahá'í Faith, hence "reinterprets"); exclusivism (Christ, or one
  faith, is the only way); religious pluralism (all religions lead to God or hold truth);
  religion as human-made or unnecessary (not the same as pluralism); reincarnation or past
  lives; pre-existence of souls (rejected by Christian orthodoxy, affirmed in LDS teaching and
  some New Age writing; it bears on children met before conception); universal salvation; the
  Trinity (statements about the Godhead itself; "Jesus was only a teacher" is the divinity of
  Jesus); divinity of Jesus; atonement; the self as divine; the departed
  are aware of people and events on earth (soul sleep, taught by Seventh-day Adventists and
  Jehovah's Witnesses, denies it outright); the departed pray or intercede for the living.
  Judgment after death, by God or a being ("reinterprets" covers "you judge yourself"); a
  final judgment at the end of time; hell exists; purgatory. Grows during trial coding; frozen
  before the holdout.
- **"Other" is only for claims about God, salvation, or the afterlife** that the list misses
  (an invented example: "only the gentle can stay here"). Moral and practical teachings stay
  in the encounter's actions (teaches; instructions on how to live), with their content
  uncoded.
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
  other), or neutral or unclear. "Mixed" needs a distressing phase that's described, a
  stretch of the experience; a moment's alarm (at seeing one's own body) inside a pleasant
  experience stays pleasant. Distress after returning to the body doesn't count.
- **Distressing content is described, never labeled "hell" by the coder,** using the three
  types of Greyson and Bush (1992), under neutral names, more than one allowed: frightening
  versions of the usual features (their "inverse" type: a tunnel or light experienced as
  terrifying); void or nothingness; torment or hostile beings (their "hellish" type). Hostile
  beings are also encounters; this covers distressing episodes with no beings at all.
- **The experiencer's own label for the experience or a place in it,** with the words kept:
  heaven or paradise, hell or hellish, purgatory, the void, other, or none; and when it was applied (during,
  afterward, or not stated). Torment content with no "hell" label is then countable: the
  cases a reader would call hellish where the experiencer declined the word.

### Every mention of Jesus

- **One list for the whole account, separate from encounters but linked to them,** so nested
  definitions can run from "any mention" down to "explicitly identified during the
  experience." Each entry records:
  - the words;
  - what it refers to: Jesus, ambiguous, or not Jesus (names only);
  - the kind: an encounter with Jesus (linked); talk about Jesus with another being (linked);
    prayer or invocation; the experiencer's own faith or belief; a doctrinal statement
    (linked); someone else's faith, words, or experience; an idiom or exclamation; the name of
    a church; the name of a person or place; or other;
  - when: before the experience, during, after, or not stated;
  - polarity: affirmative, negated, or a question;
  - evidence.

  One entry per kind, time, and place (the narrative or the questionnaire), with every passage
  as evidence, so a long encounter isn't dozens of rows; which items it appears in is still
  computed from the evidence. A mention made during an experience
  names its episode (a prayer said during it has no encounter to link to), and a linked
  encounter or doctrinal statement must be in the same episode. Every encounter with a Jesus
  claim has an affirmative mention linked to it, which keeps the nested definitions nested. Only the experiencer's text, never
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
- **The text can also tie a title to someone else.** "The Lord" tied to a named non-Christian
  figure ("Lord Krishna") or to an impersonal Absolute ("Supreme Consciousness," "the
  Universe") refers to someone other than Jesus. Tied only to "God," it stays ambiguous,
  since a Christian's "God" can mean Christ. The experiencer's background never decides it.
- **New Age terms built on "Christ"** ("Christ consciousness," a "Christ self") are mentions
  of kind other, ambiguous: outside the Jesus-only rungs, counted in the ones with ambiguous
  titles. A being such a term names (a higher "Presence" that acts) is a self-double only if
  the text calls it the experiencer's self or higher self; otherwise it's "other," with the
  words, since recognizing the teaching behind the term takes outside knowledge.
- **Context, not the word, decides.** Jesús and Salvador are common given names, Isa is a
  common Muslim given name (and short for Isabel), Christ and "de Jesús" are surnames, and El
  Salvador is a country. Used for a person or a place, the word is recorded as the name of a
  person or place, referring to someone other than Jesus, and excluded from every rung of the
  ladder, like idioms and church names; and the person is coded as who they are: an uncle
  named Jesús is family, never Jesus. Recording names lets them be counted against the
  keyword hits, which can't tell a name from a reference. Yet "Jesús" in
  Spanish a translator left untranslated, or "Isa" in a Muslim's account, can mean Jesus
  himself. When context can't tell, the mention is ambiguous. No practice page has such a
  name, so the coding prompt needs an example.
- **Keyword hits, counted by rule** in the derived file, reproduce a naive search exactly.
  For each part and each pre-registered keyword: whole-word matches in the narrative (raw,
  including any editor's note inside it), in the experiencer's answers, and in NDERF's question
  wording. Two lists: narrow (Jesus, Christ, as King searched) and broad (adding Jesús, Cristo,
  Christos, Isa, Yeshua, Savior, Saviour, Messiah). Christos, like Jesús and Isa, is also a
  given name; the broad rung accepts such collisions and the coded rungs sort them out. Matching is whole words, case-insensitive, with
  accents kept distinct and possessives counted ("Christ" doesn't match "Christian"); the
  matcher is defined once, in the schema, and tested. Question wording matters: on every form
  D–F page the named-figures item says "for example: Jesus," so a search of the website's
  pages hits all of them. Like the rest of the derived file, this runs with the pipeline,
  not before the codebook is frozen.
- **Nested definitions, computed at analysis and pre-registered,** loosest to strictest: a
  website-style keyword search, question wording included (rule); a keyword search of the
  experiencer's own words (rule); every coded entry, names, idioms, and church names included;
  any affirmative mention of Jesus himself, with and without the ambiguous titles; a
  mention about the experience itself, in a qualifying episode; an encounter with a Jesus
  claim; the same, excluding resemblance only; the claim stated in the narrative; identified
  during the experience; announced or recognized during, and asserted. Miller's own frame,
  his first 141 cases, can probably be identified from NDERF's running numbers in the index
  metadata, and is read only after the codebook is frozen.

### Computed views (resolve-area3.ts)

Computed by pre-registered rules from the coded and derived records, never coded; defined in
code and tested, as the other areas' resolved views are.

- **Per encounter:** whether the being was never identified (no claim outside the
  unidentified group); where it was reported (narrative only, questionnaire only, or both, and
  which items), from the encounter's evidence and its claims'; and Mary's level: one (broad:
  an unidentified female being, part of the experience, who interacts with the experiencer;
  narrow: also with maternal language), two (a Mary
  claim), or three (a Mary claim with confessional content, from the list or a rosary or
  scapular among the visual details), with the strongest certainty among the Mary claims so
  resemblance-only can be dropped. Whether level-three content is Catholic-specific is a
  further step, using the pre-registered table.
- **Per account, the Jesus ladder:** which rungs it reaches. Keyword hits on the page and in
  the experiencer's own words (each for the narrow and broad lists); any coded entry; an
  affirmative mention of Jesus himself, and one about the experience in a qualifying episode
  (each with and without the ambiguous titles); then an encounter in a qualifying episode with
  a Jesus claim, narrowed step by step for the same claim (not resemblance only; stated in the
  narrative; identified during; announced or recognized, and asserted). The view checks that
  each rung implies the looser ones. The keyword rungs are mechanical and can disagree with
  the coded ones either way (a person's name; "the Lamb," which no keyword matches).

### For the coding prompt: mistakes an unguided model is likely to make

Each of these has a rule above; the coding prompt must state them explicitly, with examples,
and trial coding should check them.

- Treating "saint" as Roman Catholic: filing St. Francis or Augustine as Catholic, or a
  Protestant luminary (Bonhoeffer, Wilberforce) as a secular historical figure. Saints are
  grouped by when they lived; the table decides.
- Filing an archangel under a tradition (Michael as Catholic). Angels are their own category.
- Inferring the referent from the experiencer's religion (a Christian's "God" coded as Jesus).
  The referent comes only from the text.
- Timing identity as "during" because the story is told in sequence ("then Jesus said"). Only
  the act of identifying, told as part of the experience, makes it "during."
- Taking "felt it was" for a hedge. It is how the person knew (knowing), not uncertainty.
- Labeling distressing content "hell." The coder describes; only the experiencer's own label
  is recorded as one.
- Inferring a condition from strange content, a medication, or someone else calling the
  experience a hallucination.
- Counting question wording ("for example: Jesus, Muhammad, Buddha") as a mention of Jesus.
- Taking a person named Jesús, Isa, or Salvador (or a surname such as Christ) for Jesus, in a
  mention or an encounter; or, the other way, dismissing "Jesús" in untranslated Spanish, or
  "Isa" in a Muslim's account, as only a name.

### Choices made while writing the schema

These weren't settled in the clusters above; they were needed to write the schema. All ten
were reviewed and approved in November 2026, after trial coding.

- **Canonical names are never given to people known in ordinary life** (family, relatives
  never met, friends, clergy known personally, unrecognized humans), for privacy: their
  relationship identifies them. Named figures and living religious leaders need one.
- **Vital status is required for people known in life and animals,** and optional for anyone
  else (a celebrity who had just died, say).
- **A relationship's link can be "not stated"** (a plain "a relative").
- **Menu answers that match no known option are "unrecognized,"** as with the religion menu.
- **Revelation is the action "reveals knowledge" with a kind** (theological, cosmic, or about
  the future), not a separate content marker, so it isn't coded twice.
- **Disposition needs at least one value ("not stated" included, since trial coding); the
  experiencer's response may be empty** (nothing stated), since many encounters, such as
  bystanders, have no stated response.
- **Consistency rules:** "credited only" stands alone and allows no communication; "spoken"
  needs "heard" among the ways perceived, and "mind to mind" needs "mind to mind"; "none,"
  "not stated," and an "unclear" place stand alone; one visual detail per feature ("other"
  excepted); a pleasant episode has no distressing content.
- **Names invoked are recorded exactly when the disposition includes hostile** and the
  encounter isn't physically present (narrowed after trial coding).
- **In a Peak in Darien case, when the death happened** is around the same time (hours or
  days from the experience), earlier, or not stated.
- **Condition statements name the episodes their timing is relative to.**

### Provenance: how the memory came to be told

- **Four questionnaire items are recorded by rule** in the derived file, per part: prior
  knowledge of NDEs ("Did you have any knowledge of near death experience (NDE) prior to your
  experience?"), whether it was shared ("Have you ever shared this experience with others?"),
  belief in its reality shortly after and now (definitely real, probably real, probably not
  real, definitely not real), and memory accuracy compared with other events of the time
  (more, as, or less accurately). Comments after the answers are read by the coder like any
  other text.
- **Exposure** is a coded statement linked to its episodes, limited to books, films, talks,
  accounts, and other media about NDEs, the afterlife, or spiritual beings (a religious
  upbringing is background; unrelated content, such as a survival tip from TV, isn't
  exposure): the medium (book, film or TV,
  article, talk or conference, another person's account, online, or other); the title if
  named, with the words kept, which gives area 4 a direct measure; the author, speaker, or
  presenter if named (public figures only: a friend who told their own experience is never
  named; a study group on an author's work names that author); when (before the
  experience, between the experience and this telling, or not stated); and whether the person
  says it changed how they understood or remembered the experience.
- **Devotion to a specific figure before the experience,** with the figure's category and
  canonical name (a statuette of a saint addressed daily beforehand), so prior devotion to a
  figure can be tested as a predictor of meeting it, more finely than affiliation.
- **Memory history,** each with a trigger where one applies (media, therapy or hypnosis,
  other people, spontaneous, or not stated): remembered all along; recovered later; or only
  later understood to have been an NDE. More than one can apply (part recovered and the whole
  recognized after the same TV program). Nothing stated: no entries. "Recovered later" needs
  explicit remembering ("then I remembered the rest"); understanding that grows over time
  isn't a memory event, and an ambiguous "the picture keeps filling in" isn't coded.
- **Prior tellings:** public (talks, podcasts, books, support groups such as IANDS, media,
  other, with the words kept), private only, or this is the first telling. Plus a flag when
  the person says their telling varies or their memory is uncertain.
- **Reception:** others' reactions (dismissed as a hallucination, a dream, imagination, drugs
  or medication, demonic, or other; ridiculed; believed or supported; kept quiet for fear of a
  reaction; shock or disbelief; or other), each with who (a clinician, family, a friend,
  clergy, other, or not stated) and the listener's words as reported (required for "other"); disclaimers about the
  telling ("I know how this sounds"), with the words kept; and the experiencer's own natural
  explanations, with the words and a stance (considers, endorses, or rejects), plus an earlier
  stance when the text says it changed (accepted a hallucination explanation for years,
  rejects it now).
- **Whether prior knowledge shaped it, in the experiencer's view:** denies influence ("I'd
  read about NDEs, but it had no influence"), grants influence, or unsure, with the words.
  Likely common in answers to the prior-knowledge item, and distinct from a natural
  explanation.
- **Predispositions, explicit only:** meditation or contemplative practice; visionary or
  psychic experiences through life; or other; before the experience, after, both, or not
  stated, with the words. Lifelong experiences aren't discrete episodes, so the episode link
  can't hold them; a discrete earlier experience is still an episode.
- **A longing to return, after the experience (sensitive):** a longing to return; suicidal
  thoughts tied to returning; or an explicit denial of suicidal thoughts, with the words.
  Explicit only, never inferred, and published like the other sensitive flags. It's an
  aftereffect rather than part of the encounter question, kept because it's cheap and
  rarely recorded elsewhere.

## Pre-registered tables

Built before the holdout is read and frozen with the codebook. The coder never classifies;
these tables do, at analysis time. Each lives in `schema/tables/`, validated and tested.

### Marian titles and confessional content (`tables/marian.ts`)

- **Each item lists how well it fits each tradition,** not a yes/no "Catholic-specific," and a
  mismatch is computed against the experiencer's own tradition from area 2. "Catholic-specific"
  is just the items that fit Catholics alone. This handles cases a yes/no can't: an Orthodox
  experiencer meeting Mary as intercessor isn't a mismatch, but meeting the Immaculate
  Conception is; a Muslim meeting the Virgin Mary isn't one at all.
- **Columns,** aligned with area 2: Catholic, Eastern Orthodox, Oriental Orthodox, Lutheran,
  Anglican, Reformed, Methodist, other Protestant, Muslim. Reformed and Methodist are their own
  columns because their classical teaching differs from other Protestants' (Ever-Virgin).
- **Each cell is one of three values:**
  - yes: the tradition's teaching holds or allows it, and its clergy and best-educated laity
    normally hold it ("Mother of God" for Lutherans and Anglicans);
  - official only: its confessions, formularies, or classical divines hold or allow it, but
    it's disputed even among clergy and educated laity today (Ever-Virgin for Lutherans,
    Anglicans, Reformed, and Methodists: the Smalcald Articles and the Formula of Concord;
    Pearson's *Exposition of the Creed*; the Second Helvetic Confession; Wesley's *Letter to a
    Roman Catholic*);
  - no: rejected, or foreign to the tradition's teaching and practice.

  Minority movements (Anglo-Catholic use of the rosary) don't change a cell. "Holds or allows"
  because a mismatch is about what a tradition excludes, not what it requires: Mary praying for
  a particular person fits Lutheran and Anglican teaching, while invoking her doesn't.
- **The mismatch is pre-registered both ways:** official only counted as compatible (the
  confessional view) and as a mismatch (the lived-religion view).
- **Matching:** content kinds come from the encounter's coded content (a rosary seen counts);
  titles are matched, whole words and case-insensitive, in the words of Mary claims and of
  apparition titles. Every matching entry counts, so "Our Lady of Guadalupe" is both "Our
  Lady" and Guadalupe. An encounter is a mismatch if any item it matches is rejected by the
  experiencer's tradition.
- **Area 2 traditions map to columns;** where area 2 leaves it open (Orthodox with no branch,
  Protestant with no family, a bare "Christian"), every candidate column is tried and an item
  is a mismatch only if all of them reject it. For traditions with no column (Hindu,
  Latter-day Saints, unaffiliated), the table doesn't apply: Mary in those accounts is a
  cross-tradition question.
- **Titles and devotions the table doesn't cover** are added before the freeze. After it, they
  are reported as unclassified and never counted as a mismatch, with a sensitivity check that
  counts them.
- **Judgment calls recorded in the table's notes:** a bare "immaculate" is left out (Orthodox
  hymnody and some Anglican divines use it of her); Co-Redemptrix stays Catholic despite *Mater
  Populi Fidelis* (2025) calling it always inappropriate, since it's Catholic devotional
  language either way and nearly every account predates the note; Zeitoun fits Oriental
  Orthodox (approved by the Coptic Church) and isn't foreign to Catholics; "Our Lady" fits
  Muslims too (Sayyidatuna Maryam); Ever-Virgin is "no" for Muslims (the Qur'an affirms the
  virginal conception and her chastity but says nothing of afterward).

### Named figures (`tables/named-figures.ts`)

- **Maps each canonical name to a subcategory and home traditions;** the coder writes the name
  and only suggests a subcategory. It covers named figures, living religious leaders, named
  angels, and named hostile beings (angels and hostile beings keep their own categories and
  take only a name and homes from it). A readable view, generated from the table and checked
  by a test, is in [tables/NAMED_FIGURES.md](tables/NAMED_FIGURES.md).
- **Columns:** canonical name; aliases; kind; subcategory; year of death (or alive, unknown,
  or not applicable); homes; note.
- **Homes** are the traditions in whose mainstream teaching or devotion the figure is revered,
  using the same columns as the Marian table plus the non-Trinitarian families, Jewish, Sunni,
  Shia, Hindu, Buddhist, Sikh, Baha'i, Chinese folk or Taoist, New Age, and secular. A figure is
  outside the experiencer's tradition when none of the area 2 candidate columns is among its
  homes; unaffiliated experiencers are reported separately.
- **Shared-heritage saints get their homes from the two splits:** died before Chalcedon (451),
  every Christian column; 451 to 1054, Catholic, Eastern Orthodox, and Protestants (not
  Oriental Orthodox: Leo the Great); Western saints from 1054 to about 1517, Catholic and
  Protestants (not Orthodox: Francis of Assisi).
- **Living religious leader or named figure is decided by the year of death** against the
  experience's date, not by the coder (Padre Pio is a living religious leader for experiences
  before 1968, a saint after).
- **Religious or secular, decided once per name:** known mainly for faith, or on a church
  calendar, is religious (Bach, C. S. Lewis, Wilberforce, Martin Luther King Jr.); otherwise
  secular (Gandhi).
- **Ambiguous names** ("Saint Teresa," "Sai Baba," a bare "Francis" or "Joseph") resolve to no
  one: the coder writes the full name, and context decides.
- **The coder sees the canonical names,** not subcategories or homes, and uses one when it's the
  same person; otherwise writes the name as the text gives it, in standard form.
- **Names not in the table:** before the freeze, they're added. After it, they're classified by
  these written rules without looking at the experiencer's background, in a logged addendum,
  and every analysis is reported with and without them. Living status is checked again at the
  freeze.

## Open

- Area 3: designed, in the schema (v4 draft), and trial-coded on practice round 1 (all fifty
  pages in notes, five as full JSON records in the private repository). The snags were
  settled in clusters and written in. The full schema exports to about 80 KB of JSON Schema,
  so the coding prompt may need to code in passes.
- Pre-registered tables: the Marian table is done; the named-figures table is drafted (about
  400 names), with the four Christian sections and their judgment calls approved and the rest
  under review; the visual-feature map comes after it.
- Area 4 and beyond, planned: idiosyncratic details from widely read NDE accounts (for
  example, *Heaven Is for Real*), to look for cultural influence from those accounts on later
  ones. Vocabulary that looks borrowed from a specific text, with no stated exposure, is left
  to area 4's pre-registered details, never guessed at by the coder. Candidate source noted
  from trial coding: the *Urantia Book*.
