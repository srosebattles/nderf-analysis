# Pass A: episodes, eligibility, background, and provenance

The schema gives every field and its allowed values. This file covers only what the schema
can't: what counts, what doesn't, and the values whose meaning isn't plain from their names.
Beings met in the experience, doctrine, and mentions of Jesus are coded in later passes;
leave them out here.

## Parts and episodes

- Give one `parts` entry per part. A `retelling` tells the same experience again; a `follow_up` is
  a later note on one already told; `sole` is for a page with one part.
- Every experience of the person's own is an episode, including ones mentioned only in passing:
  a childhood experience, a later out-of-body experience, a dream, a vision. Another person's
  experience on the page is never an episode. The same experience repeated with the same
  trigger is one episode, marked `recurrent`.
- An experience the text only says happened is still an episode, with `describesExperience`
  `no`. Each experience the text tells apart is its own episode; a bare count with nothing to
  tell them apart ("twice more since then") is one episode, marked `recurrent`.
- Number episodes in the order the page first mentions them. Each `label` is a few words of
  your own saying which experience it is ("the car accident at nine"), different for each:
  later passes use it to tell the episodes apart.
- `reporter`: `experiencer_assisted` means the person is the source, but someone else
  interviewed them, transcribed it, or typed it. For a `relative`, `relationship` is the
  reporter's relationship to the person (a mother telling her son's experience: `parent`,
  `female`). Sex comes from a gendered word or pronouns, never from a name; `greats` counts the
  "greats" ("great-great-grandfather" is 2).
- `textDate` is `present` when the text dates this episode and the background date can't (there
  is none, or the page has several episodes), and also when the text dates the page's only
  episode differently from the date entered; then add the flag `conflicts_with_text`. Otherwise
  it is `not_stated`. Never set `after_posting`, which is set later.
- `child`: twelve or younger. A number decides, stated or computed ("a month before I turned
  nine"), and `child` must agree with it. Without a number, use your best judgment from any cue
  in the text: being a little kid or in elementary school points to `yes`; being married, a
  parent, working, at university, in the military, or driving at the time is `no`. `unclear` only
  when either is plausible (middle school, a vague "too young to understand").
- `age` only when the text gives a number, or one can be computed from dates in the text.

## Circumstance

This rules out experiences produced by something other than a near-death situation. Classify
the event as reported, not its credibility.

- `illness_or_injury` includes an overdose, childbirth complications, and a complication under
  anesthesia that the person reports, even one they only overheard or learned of afterward.
  `threat_without_injury` is a threat to life with no injury (a fear-death experience).
- `inducer`:
  - `recreational_drugs`: a drug taken for its effect, alcohol included, with the experience
    beginning while the person was intoxicated. If the drug then caused an emergency, record
    the emergency too;
  - `anesthesia_without_complication`: under anesthesia with no complication reported;
  - an overdose, alcohol poisoning included, is never an inducer: it is `illness_or_injury` with
    the `overdose` flag.
- `psychoactiveMedicationAtOnset`: a psychoactive medication given as the experience began,
  during a real illness or injury (ketamine for a procedure).
- `closeness` comes from the body's side only:
  - `bodily_crisis` needs a described bodily event, such as cardiac arrest, not breathing, heavy
    bleeding, a serious injury, resuscitation, or what clinicians said. A bodily event the person
    reports counts even if nobody saw it or no injury was found afterward. Its evidence points
    at those events, never at the experience;
  - `minor`: fainting, a knock with brief unconsciousness, or a near-drowning with no bodily event
    described, whoever got the person out of the water;
  - a bare "I died" with no physical event described is `unclear`.
- `cardiacArrest.basis`:
  - `checkbox`: only the life-threat item's menu option for clinical death, which is a menu
    answer you may use. When that option is ticked, cardiac arrest is reported;
  - `hedged`: "maybe my heart stopped";
  - `medically_induced`: stopped on purpose by clinicians, for surgery or to reset its rhythm;
  - when several apply, give the strongest the text gives: `clinician_or_witness`, then
    `self_report`, then `checkbox`, then `hedged`.
- `timing`: `after` means in recovery, later; `unrelated` means no link in time to the threat.
- `psychiatricMedication` is psychiatric medication the person was on when the experience
  happened, when stated. It is separate from a medication given as the experience began.

## How the experience is told

- `describesExperience` is `partial` when just a portion of the experience, or a summary, is given.
- `tone` is `mixed` only when a distressing phase is described: a stretch of the experience, not
  a moment's alarm (such as at seeing one's own body). Distress after returning to the body
  doesn't count.
- `experiencerLabels` records only a label the person uses ("I was in hell"). Never apply one
  yourself: a frightening place the person doesn't call hell gets no label.
- `surroundingsAlive` is true when the setting itself (land, water, plants, the light) is reported
  literally as alive or aware, with nothing communicating with the person or acting toward them.
  Something that communicates or acts is a being, for the next pass. "As if the trees were
  breathing" doesn't count.

## Text that isn't the person's

List every editor's note, reader's comment, transcription or translation credit, and piece of
boilerplate inside a narrative or answer, by its opening and closing words copied exactly.

## Country and language

- Only countries the person states for themselves, never for a relative. "I lived in" is
  `residence` (and `experience_location` too, if it happened there); "grew up in" or "raised in"
  is `origin`; a plain "I'm from" is `unspecified`; where the experience happened is
  `experience_location`.
- `language` is null unless the person says what language they wrote in, or that the account was
  translated. `translator` is always null.

## Religion and heritage

What counts:
- The person's own identification, upbringing, attendance, or leaving.
- The household they were raised in counts as upbringing ("we were Lutheran").
- Attending a named church or group counts.
- Religion is coded the same way at every age.

What doesn't:
- **Menu answers.** The religion items open with a menu answer ("Christian- Catholic",
  "Unaffiliated- Agnostic") that is already recorded. Never record it as a statement; record
  only what the person wrote after it or elsewhere. A comment that only restates the menu
  ("same as before") is not a statement either. A comment that only qualifies the menu's
  tradition (how often they went, how seriously they took it) is one: the menu's tradition, the
  comment as `term`, and its `practice`.
- **Orientation.** "Liberal", "Moderate", and "Conservative/fundamentalist" on older
  questionnaires are theological orientation, recorded by rule, never a religion statement. But
  the words typed after the label are the person's own answer, and these questionnaires have no
  other religion item, so a named affiliation or stance there is always coded ("Conservative
  Nazarene" is a Nazarene identification; "Moderate agnostic" is agnostic). A bare "none" or
  "nil" after the label is not coded: it may mean only that they had nothing to add.
- **Inference.** Never infer religion from what was seen, country, heritage, vocabulary
  ("Allah"), or practices ("Mass", "the rosary", speaking in tongues).
- **Other people's religion** ("my grandmother was Catholic"), except the household.

Values that need a definition:
- `christian_unspecified`: a bare "Christian", or a self-label with no church named ("born
  again"). Christian means Trinitarian: `latter_day_saints` and `jehovahs_witnesses` are their own
  families, never Christian, and other non-Trinitarian churches (Christian Science, Oneness
  Pentecostal) are `other_nontrinitarian`, with the group's name. A bare "nondenominational" is
  the `nondenominational` Protestant family.
- A movement that grows out of one tradition goes under it, with the movement as `detail` (a Sai
  Baba devotee is `hindu`). Syncretic esoteric movements (Theosophy, Edgar Cayce, the Urantia
  Book) are `new_age`.
- `several_unspecified`: a pluralist answer that names no tradition. When traditions are named,
  code each.
- `nothing_religious` includes "spiritual but not religious".
- `practice` never changes the tradition.
- `kind` is about the person. `upbringing` is only the household they were raised in; "I was
  never religious" or "Anglican out of family habit" is an `identification` (the second
  `nominal`). `left` is leaving a religion, never a faith that grew stronger.
- A belief (in reincarnation, in an afterlife) is not a tradition and not a statement.
- `source` `religion_field_text` is a comment on the religion items.
- `context` `explaining_experience`: offered to explain something in the experience, wherever it
  appears. The item about earthly beliefs is where this is most common.

A past-life identity is not heritage.

## Conditions

Only when stated, by the person, a clinician as reported, or family. Never infer a condition from
the experience's content, from a medication, or from someone calling the experience a
hallucination.

- Conditions are mental health conditions, the neurological conditions the schema lists, and
  neurodevelopmental conditions. Never a physical illness, and never the illness or injury behind
  the experience, with one exception: sleep apnea is always recorded, as `sleep_apnea`, even
  when it caused the experience.
- `other_linked_to_hallucinations` needs the text itself to tie the condition to hallucinations.
- Calling oneself an alcoholic or an addict is `substance_use_disorder`, `self_identified`.
- Neurodevelopmental conditions are recorded by the label used, and co-occurring conditions are
  separate entries. `basis` `self_identified` is "I'm pretty sure I have"; `when` is relative to
  the episodes listed.

## Provenance

One answer often holds several entries of different kinds (a telling, two reactions, and a
disclaimer); record every one, not just the first. They turn up most in the answers about
sharing the experience, what the person knew beforehand, and whether it was real.

- `exposures` are only media on near-death experiences, the afterlife, or spiritual beings. A
  religious upbringing is background, and unrelated content isn't exposure. `person` names a
  public figure only, never a private person such as a friend who told their own experience.
- `priorDevotion` is devotion to a specific figure before the experience (praying daily to a
  saint). A named figure needs its standard English `name` ("Francis of Assisi").
- `memory`: `recovered_later` needs explicit remembering ("then I remembered the rest"); a memory
  that keeps filling in doesn't count. `trigger` is given only for `recovered_later` and
  `recognized_as_nde_later`.
- `priorTellings`: only from words the person wrote. The Yes or No on the item about sharing the
  experience is recorded by rule; never turn it alone into an entry. `venues` are given only for
  `public` tellings.
- `reactions`: doubt or disbelief is `dismissed`, with `dismissedAs` `other` when no explanation
  is given; `dismissedAs` is given only for `dismissed`. A mixed reaction is one entry for each
  part ("my cousins scoffed, but my aunt was delighted" is `dismissed` and
  `believed_or_supported`). `words` are required when either value is `other`.
- `predispositions` are lifelong or ongoing (years of meditation, visions all through life). A
  discrete earlier experience is an episode instead.
- `influenceStatements` are the person's own view of whether what they knew beforehand shaped
  the experience.

## A longing to return

Only after returning to the body; wanting to stay while still in the experience doesn't count.
Explicit only, never inferred.

## Mistakes to avoid

- Recording a religion menu answer as a statement.
- Recording "Liberal", "Moderate", or "Conservative/fundamentalist" as a religion, or skipping
  the affiliation typed after it.
- Inferring religion from vocabulary, a practice, a country, or what was seen.
- Calling Latter-day Saints, Jehovah's Witnesses, or Christian Science Christian.
- Inferring a condition from strange content, a medication, or someone calling the experience a
  hallucination, or recording a physical illness as one.
- Giving an age of thirteen or more and calling the person a child.
- Making a telling from a bare Yes or No, or a longing to return from wanting to stay.
- Taking a bare "I died" for a bodily crisis.
- Treating an overdose as an inducer.
- Making another person's experience on the page an episode.
- Copying more than six words into a field with copied words.
