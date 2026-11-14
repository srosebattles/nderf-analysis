# Pass A: episodes, eligibility, background, and provenance

This pass codes the account's parts and episodes; for each episode, who reported it and the
circumstances it happened in; text that isn't the person's; the person's country and
language; their religion and heritage; conditions they state; how the memory came to be
told; and any longing to return. Beings met during the experience, doctrine, and mentions of
Jesus are coded in later passes: leave them out here.

## Parts

One entry per part, with its `index` (0 for the first). `relation`:

- `sole`: the page has only one part;
- `first_telling`: the first of several parts that tell the same experience;
- `retelling`: the same experience told again;
- `follow_up`: a later note about an experience already told;
- `separate_experience`: a different experience.

`episodeIds` lists the episodes the part describes.

## Episodes

Every experience of the person's own on the page is an episode: the main one, and any other
they describe or mention, however briefly (an experience in childhood, a later out-of-body
experience, a dream, a vision). Another person's experience described on the page is never an
episode. The same experience repeated with the same trigger (at every treatment, say) is one
episode with `recurrent` true.

- `episodeId`: the key, `#`, and a number, in the order the page first mentions them
  (`A0042#1`, `A0042#2`).
- `label`: a few words of your own saying which experience it is ("the car accident at nine",
  "a dream years later"). At most eighty characters, and different for every episode. Later
  passes use it to tell the episodes apart.

### Who reported it

`reporter.role`:

- `experiencer`: the person it happened to wrote it;
- `experiencer_assisted`: the person is the source, but someone else interviewed them,
  transcribed it, or typed it; `assistance` says which: `interviewed`, `transcribed`,
  `typed_by_other`, or `other` (otherwise `assistance` is null);
- `relative`: a relative tells the person's experience;
- `clinician`: a doctor or nurse tells it;
- `other` or `unknown`.

For a relative, `relationship` is the reporter's relationship to the person the experience
happened to (a mother telling her son's experience: `parent`, `female`); otherwise
`relationship` is null. A relationship is built from parts:

- `role`: `parent`, `child`, `sibling`, `grandparent`, `grandchild`, `aunt_or_uncle`,
  `niece_or_nephew`, `cousin`, `spouse`, `partner`, `godparent`, `godchild`,
  `ancestor_unspecified`, or `relative_unspecified`;
- `sex`: `female`, `male`, or `not_stated`, from a gendered word or pronouns, never from a name;
- `greats`: how many "greats" ("great-great-grandfather" is 2; a grandfather is 0);
- `side`: `maternal`, `paternal`, or `not_stated`;
- `link`: `blood`, `half`, `step`, `in_law`, `adoptive`, `foster`, `by_marriage`, `former` (an
  ex-spouse or ex-partner), or `not_stated`;
- `words`: the words used.

### Which episode the questionnaire describes

`questionnaireRefersTo`: `this_episode` (the answers describe this one, always the case when
there is one episode), `several_episodes` (the answers mix them or say they cover more than
one), or `unclear`.

### When it happened

The background line gives the date the person entered. `textDate` is `present` only when the
text dates this episode and the background date can't: there is none, or the page has several
episodes and the date entered can only be one of them. Otherwise it is `not_stated`. It is
never `not_asked`. A date has:

- `raw`: the date as written, at most six words; null if longer, with the flag `raw_omitted`;
- `year`, `month`, `day`: numbers, or null for any part not given;
- `precision`: `day`, `month`, `season`, `year`, `approximate` (a span, "about", "the late
  seventies"), or `none`;
- `flags`, any that apply: `two_digit_year`, `day_month_ambiguous` ("3/4/1990"), `range`,
  `multiple_dates`, `no_year`, `unparsed` (a year can't be read), and `conflicts_with_text` (the
  text's date disagrees with the date entered). Never set `after_posting`; it is set later.

### Child, and age

`child.value`:

- `yes`: twelve or younger at the experience;
- `no`: thirteen or older;
- `unclear`.

A number decides, stated or computed from dates ("a month before I turned nine"). Without a
number: "little", elementary school or younger, or a plain "as a child" is `yes`; a teenager or
high school is `no`; middle school or junior high is `unclear`.

`age` is `present` when the text gives the age or lets it be computed:
- `years`: a number, or an ascending pair for a range ("six or seven" is [6, 7]);
- `basis`: `stated` or `computed`.

Otherwise `age` is `not_stated`.

### Circumstance

This rules out experiences produced by something other than a near-death situation. Classify
the event as reported, not its credibility: a complication the person reports counts as
reported.

`context`, what was happening to the person's own body or safety:

- `illness_or_injury`: an illness, injury, or medical emergency, including an overdose,
  childbirth complications, and a complication under anesthesia that the person reports (even
  one they only overheard or learned of afterward);
- `threat_without_injury`: a threat to life with no injury, such as a near-fall or a near-miss on
  the road (a fear-death experience);
- `someone_elses_death`: it happened at another person's death or while with someone dying;
- `none`: no threat at all (a premonition, a spontaneous vision);
- `unclear`.

`inducer`, something other than a near-death situation that produced the experience:

- `none`;
- `recreational_drugs`: a drug taken for its effect, alcohol included, with the experience
  beginning while the person was intoxicated;
- `meditation_or_practice`;
- `sleep_or_dream`;
- `anesthesia_without_complication`: under anesthesia with no complication reported;
- `unclear`.

An overdose is not an inducer: it is `illness_or_injury` with the overdose flag. If drugs were
taken for their effect and then caused a medical emergency, record both the inducer and the
emergency.

Flags, none of which excludes the episode:

- `overdose`: `accidental`, `intentional`, `unclear`, or null for none. Alcohol counts as a drug.
  An overdose needs the `illness_or_injury` context.
- `suicideAttempt`: true when the person calls it a suicide attempt.
- `psychoactiveMedicationAtOnset`: true when a psychoactive medication was given as the
  experience began, during a real illness or injury (ketamine for a procedure, for example).
  This also needs the `illness_or_injury` context.

`closeness`, how close the person came to death, from the body's side only:

- `bodily_crisis`: a described bodily event, such as cardiac arrest, not breathing, heavy
  bleeding, a serious injury, resuscitation, or what clinicians said;
- `minor`: fainting, a knock with brief unconsciousness, a near-drowning the person got out of
  themselves;
- `threat_only`: no injury at all;
- `unclear`, including a bare "I died" with no physical event described.

Evidence for `bodily_crisis` must point at the bodily events, never at the experience (a sense
of dying, a command to return).

`cardiacArrest`: `reported` true or false, and when true a `basis`:

- `clinician_or_witness`: a clinician or witness, as reported, said the heart stopped;
- `checkbox`: only the questionnaire's life-threat item, answered with its menu option for
  clinical death, a menu answer you may use here;
- `self_report`: the person says their heart stopped;
- `hedged`: "maybe my heart stopped", "(arrest?)";
- `medically_induced`: stopped on purpose for surgery.

`timing`, when the experience happened relative to the threat:

- `during`;
- `after` (in recovery days later, say);
- `unrelated` (no link in time);
- `unclear`.

`evidence` for the circumstance points at what describes the event.

### Medication being taken

`psychiatricMedication` lists psychiatric medication the person was taking when the experience
happened, only when stated:

- `kind`: `antipsychotic`, `mood_stabilizer`, `antidepressant`, `sedative`, or `other`;
- `words`;
- `evidence`.

It is separate from a medication given as the experience began.

### What is told, and where

`describesExperience`:

- `yes`: the experience itself is described;
- `partial`: only part of it, or only a summary;
- `no`: it is mentioned but not described.

`experienceToldIn`: whether the experience itself is described in the narrative, and whether
in the questionnaire.

### Tone and the person's own labels

`tone`:

- `pleasant`;
- `distressing`;
- `mixed`: it turned from one to the other, with a distressing phase that is described (a
  stretch of the experience). A moment's alarm, such as at seeing one's own body, inside a
  pleasant experience stays `pleasant`;
- `neutral_or_unclear`.

Distress after returning to the body doesn't count toward the tone.

`experiencerLabels` lists what the person calls the experience or a place in it, in their own
words:

- `label`: `heaven_or_paradise`, `hell_or_hellish`, `purgatory`, `void`, or `other`;
- `words`;
- `when`: `during` (named during the experience), `after`, or `not_stated`.

Record only a label the person uses. Never apply one yourself: a frightening place the person
doesn't call hell gets no label.

### Surroundings reported as alive

`surroundingsAlive.value` is true when the setting itself (land, water, plants, the light filling
the place) is reported literally as alive, aware, or conscious, with nothing communicating
with the person or acting toward them; then give the `words` and `evidence`. Something that
communicates or acts is a being, coded in the next pass, not here. "As if the trees were
breathing" is a figure of speech and doesn't count. When false, `words` is null and `evidence`
is empty.

## Text that isn't the person's

`nonExperiencerText` lists every passage inside a narrative or answer that the person didn't
write, with its place, its opening words (`startQuote`) and closing words (`endQuote`),
copied exactly, and its `kind`:

- `editor_note`: the archive's editor's note or summary;
- `reader_comment`: a reader's comment;
- `transcription_credit`: who transcribed, typed, or translated it;
- `boilerplate`: a copyright notice, a link, a standard sign-off.

## The person's country and language

`textClaims.countries` lists countries the person states for themselves, never for a relative:

- `country`: the ISO 3166-1 two-letter code in capitals (`US`, `MX`, `GB`), or null when the
  words can't be mapped;
- `raw`: the words as written ("the UK", "Persia"), at most six;
- `role`: `origin` (born, raised, or originally from), `residence` (lives in),
  `experience_location` (where the experience happened, which says little about the person), or
  `unspecified` (a plain "I'm from" with nothing more);
- `source`: always `self_report`;
- `evidence`.

`textClaims.language` is null unless the person says what language they wrote in, or that the
account was translated. Then:

- `originalLanguage`: the ISO 639-1 code (`es`, `fa`), or null if not named;
- `translated`: `yes`, `no`, or `unknown`;
- `translator`: null;
- `source`: `self_report`;
- `evidence`.

## Religion and heritage

`background.religionStatements` lists every explicit statement about the person's own religion.

**What counts.**
- The person's own identification, upbringing, attendance, or leaving a religion.
- Statements about the household they were raised in count as upbringing ("we were
  Lutheran").
- Attending a named church or group counts.
- Statements about other individuals ("my grandmother was Catholic") are not coded.

**What doesn't count.**
- Religion is never inferred from what was seen in the experience, from country or heritage,
  from vocabulary ("Allah"), or from practices ("Mass", "the rosary", speaking in tongues).
- **Menu answers are already recorded.** The religion items open with a menu answer such as
  "Christian- Catholic" or "Unaffiliated- Agnostic". Never record that menu answer as a
  statement. Record only what the person wrote after it, or elsewhere.
- **Orientation is not religion.** Older questionnaires ask for "Liberal", "Moderate", or
  "Conservative/fundamentalist". Those answers are recorded by rule as theological orientation
  and are never a religion statement. A comment after them can be one.
- Religion is coded the same way at every age; children can have faith of their own.

Each statement has:

- `traditions`: one or more (several for "several faiths", or a group attended alongside), each a
  `family` with its detail:
  - `catholic`, with `rite` `latin`, `eastern`, or null;
  - `orthodox`, with `branch` `eastern`, `oriental`, or null;
  - `protestant`, with a `protestantFamily` and the `body` only when named ("LCMS"), else null.
    The families: `lutheran`, `reformed_presbyterian`, `anglican`, `methodist_wesleyan`,
    `baptist`, `pentecostal_charismatic`, `anabaptist`, `restorationist`, `adventist`,
    `holiness`, `quaker`, `united`, `nondenominational` (a bare "nondenominational"), `other`, or
    `unspecified`;
  - `christian_unspecified`: a bare "Christian", or a self-label with no church named ("born
    again, spirit-filled"). Christian means Trinitarian;
  - `latter_day_saints` and `jehovahs_witnesses` are their own families, never Christian;
  - `other_nontrinitarian`, with the `group` named (Christian Science, Oneness Pentecostal) or
    null;
  - `jewish`, with the `movement` or null;
  - `muslim`, with `branch` `sunni`, `shia`, `other`, or null, and any `detail`;
  - `hindu`, `buddhist`, `sikh`, `bahai`, `chinese_folk_or_taoist`, `shinto`, `indigenous`,
    `pagan`, `new_age`, `unitarian_universalist`, or `other`, each with a `detail` or null. A
    movement that grows out of one tradition goes under it, with the movement as detail (a Sai
    Baba devotee: `hindu`). Syncretic esoteric movements (Theosophy, Edgar Cayce, the Urantia
    Book) are `new_age`;
  - `several_unspecified`: a pluralist answer naming no tradition ("truth in every faith");
  - `unaffiliated`, with `kind` `atheist`, `agnostic`, `nothing_religious` ("spiritual but not
    religious"), `nothing_secular`, or null.
- `kind`: `identification`, `upbringing`, `attendance`, or `left`;
- `when`: `childhood`, `before_experience`, `at_experience`, `after_experience`, `now`, or
  `unspecified`;
- `practice`: `devout`, `nominal`, `lapsed`, `non_practicing`, or null. It never changes the
  tradition;
- `term`: the words used, at most six;
- `source`: `religion_field_text` (a comment on the religion items), `narrative`, or
  `other_item`;
- `context`:
  - `background`;
  - `explaining_experience`: offered to explain something in the experience, wherever it
    appears. The item about earthly beliefs is where this is most
    common;
  - `other`;
- `evidence`.

`background.heritageStatements` lists explicit statements of the person's own ethnicity, race,
ancestry, or national origin:

- `term`;
- `aspects`: `ethnicity`, `race`, `ancestry`, `national_origin`;
- `countries`: two-letter codes it names;
- `context`, as for religion;
- `evidence`.

A past-life identity is not heritage.

## Conditions

`conditions` lists conditions the person, a clinician as they report it, or family states. Only
when stated: never inferred from the experience's content, from a medication, or from someone
calling the experience a hallucination.

- `condition`:
  - Conditions that can produce hallucinations: `psychotic_disorder`, `bipolar_disorder`,
    `depression_with_psychotic_features`, `delirium` (including "ICU psychosis"), `dementia`,
    `seizure_disorder`, `sleep_disorder_with_hallucinations`, `substance_induced_psychosis`, and
    `other_linked_to_hallucinations` (the text links a condition to hallucinations).
  - Other mental health: `other_mental_health` (depression, anxiety, PTSD, and the like).
  - Neurodevelopmental, by the label used: `autism` (Asperger's, "on the spectrum"), `adhd`,
    `intellectual_disability_or_developmental_delay`, `specific_learning_disability`, and
    `other_neurodevelopmental`.

  Co-occurring conditions are separate entries.
- `words`;
- `when`, relative to the episodes in `episodeIds`: `before`, `at_the_time`,
  `began_after`, `at_the_time_recognized_later`, or `not_stated`;
- `statedBy`: `experiencer`, `clinician_as_reported`, or `family`;
- `basis`: `diagnosed`, `self_identified` ("I'm pretty sure I have"), or `not_stated`;
- `evidence`.

## Provenance: how the memory came to be told

Each entry names the episodes it is about (`episodeIds`, at least one).

### Exposures

`provenance.exposures` lists books, films, talks, other people's accounts, and other media on
near-death experiences, the afterlife, or spiritual beings that the person says they met. A
religious upbringing is background, not exposure, and unrelated content isn't exposure.

- `medium`: `book`, `film_or_tv`, `article`, `talk_or_conference`, `another_persons_account`,
  `online`, or `other`;
- `title`: if named, at most six words, or null;
- `person`: the author, speaker, or presenter if named and a public figure. Never a private
  person, such as a friend who told their own experience;
- `when`: `before_experience`, `between_experience_and_telling`, or `not_stated`;
- `changedUnderstanding`: true when the person says it changed how they understood or remembered
  the experience;
- `evidence`.

### Prior devotion

`provenance.priorDevotion` lists devotion to a specific figure before the experience (praying
daily to a saint, keeping a statue they spoke to).

- `category`, the kind of being. Usually `god`, `jesus`, `holy_spirit`, `mary`, `angel`,
  `named_figure` (a saint, a prophet, another tradition's figure), or `living_religious_leader`.
  The full list, shared with later passes: `family`, `relative_never_met`,
  `friend_or_acquaintance`, `clergy_known_personally`, `known_person_relationship_not_stated`,
  `god`, `jesus`, `holy_spirit`, `mary`, `angel`, `named_figure`, `living_religious_leader`,
  `being_of_light`, `voice_or_presence`, `guide`, `council_or_robed_figures`, `orb`,
  `unrecognized_human`, `unidentified_being`, `hostile_being`, `animal`, `extraterrestrial`,
  `folkloric_being`, `fictional_character`, `mechanical_being`, `animate_object_or_landscape`,
  `self_double`, and `other`;
- `name`: the figure's standard name in English ("Francis of Assisi"), required for a named
  figure, else null;
- `words`;
- `evidence`.

### Memory

`provenance.memory` lists what the person says about how they remembered it:

- `kind`:
  - `remembered_all_along`;
  - `recovered_later`: explicit remembering ("then I remembered the rest"). A memory that
    keeps filling in, or understanding that grows, doesn't count;
  - `recognized_as_nde_later`: only later did they understand the experience as near-death;
- `trigger`, for `recovered_later` and `recognized_as_nde_later` only: `media`,
  `therapy_or_hypnosis`, `other_people`, `spontaneous`, or `not_stated`. For
  `remembered_all_along` it is null;
- `evidence`.

More than one can apply.

### Prior tellings

`provenance.priorTellings`:

- `kind`:
  - `public`, with `venues`: `talks`, `podcasts`, `books`, `support_groups`, `media`, or
    `other`;
  - `private_only`, with no venues;
  - `first_telling`, with no venues;
- `words` (or null);
- `evidence`.

`provenance.tellingVaries` lists where the person says their telling varies or their memory is
uncertain.

### Reactions

`provenance.reactions` lists how others reacted:

- `reaction`: `dismissed`, `ridiculed`, `believed_or_supported`, `kept_quiet_for_fear`,
  `shock_or_disbelief`, or `other`;
- `dismissedAs`, for `dismissed` only: `hallucination`, `dream`, `imagination`,
  `drugs_or_medication`, `demonic`, or `other`. Otherwise null;
- `words`: the listener's words or explanation as reported, required when either value is
  `other`;
- `who`: `clinician`, `family`, `friend`, `clergy`, `other`, or `not_stated`;
- `evidence`.

### Disclaimers, explanations, and predispositions

- `provenance.disclaimers` lists the person's disclaimers about telling it ("I know how this
  sounds"), with the `words`.
- `provenance.naturalExplanations` lists natural explanations the person raises:
  - `words`;
  - `stance` now: `considers`, `endorses`, or `rejects`;
  - `earlierStance`, when the text says it changed, else null.
- `provenance.predispositions`, explicit only:
  - `kind`: `meditation_or_contemplative_practice`, `lifelong_visionary_or_psychic_experiences`,
    or `other`;
  - `when`: `before`, `after`, `before_and_after`, or `not_stated`;
  - `words`.

  A discrete earlier experience is an episode, not a predisposition.
- `provenance.influenceStatements` lists the person's own view of whether prior knowledge shaped
  the experience: `stance` `denies_influence`, `grants_influence`, or `unsure`, with the
  `words`.

## A longing to return

`longingToReturn` lists, explicit only and never inferred:

- `kind`:
  - `longing_to_return` after the experience;
  - `suicidal_thoughts_tied_to_returning`;
  - `denies_suicidal_thoughts`;
- `words`;
- `evidence`.

## Mistakes to avoid

- Recording a religion menu answer ("Christian- Protestant", "Buddhist") as a statement.
- Recording "Liberal", "Moderate", or "Conservative/fundamentalist" as a religion.
- Inferring religion from vocabulary, a practice, a country, or what was seen.
- Calling Latter-day Saints or Jehovah's Witnesses Christian.
- Coding a relative's religion as the person's, except the household they were raised in.
- Inferring a condition from strange content, a medication, or someone calling the experience a
  hallucination.
- Taking a bare "I died" for a bodily crisis.
- Treating an overdose as an inducer.
- Treating surgery under anesthesia as a complication when none is reported, or the reverse.
- Making another person's experience on the page an episode.
- Copying more than six words into a field with copied words.
