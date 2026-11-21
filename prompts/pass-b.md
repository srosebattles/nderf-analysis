# Pass B: the beings met, as a census

The schema gives every field and its allowed values. This file covers only what the schema
can't: what counts, what doesn't, and the values whose meaning isn't plain from their names.
This pass records every being the person perceives in their own experiences, and who each was
taken to be. How beings look, what they do or say, and how the person responded are coded in
later passes; leave them out. So are doctrine and mentions of Jesus that aren't about a being
met.

## The episodes

- After the account, an earlier pass lists the person's experiences as episodes, each with an
  ID and a short label. Every encounter belongs to one of them: `episodeId` is that episode's
  ID, and `encounterId` is the episode ID, "/e", and a number (`A0042#1/e1`, `A0042#1/e2`).
- If a being appears in an experience the list leaves out, don't invent an episode. Record that
  experience in `missingEpisodes`, in a few words of your own, with its evidence.
- Each encounter's `label` is a few words of your own saying which being it is ("the
  grandmother at the gate"), different for each: later passes use it to tell them apart.

## What counts as an encounter

- Any being the person perceives during an episode, by any means: `seen`, `heard`,
  `sensed_presence`, `touched`, or `mind_to_mind`, as many as apply. The person's own body never
  counts.
- `credited_only`: a being credited with something that happened within the experience but never
  perceived (sent back with nothing seen or heard; a pull the person later puts down to a deity),
  or one only inferred from something else in it (a crack of sound taken to be a demon's whip,
  which is also a `hedged` claim). It stands alone. A belief about something outside the
  experience is not an encounter: that God saved them in the accident, or gave them words to say
  afterward.
- `not_stated`, also alone, only for a being in an experience the text doesn't describe, one
  mentioned only in passing ("there were angels on other occasions too"). When the text describes
  the being or what it did, record the ways that description gives.
- A force is a being only when the text gives it a will or a voice, or calls it a being or a
  presence. "A presence urging me to return" is an encounter; "I was pulled back" isn't. A
  hostile phenomenon with no agent (a storm of light striking from every side) isn't a being
  unless the text gives it intent (it chases, mocks, speaks).
- Only literal reports. "Music like a choir of angels" describes a sound; "I heard angels
  singing" reports angels, heard. A literal report with a qualifier ("I think the trees were
  speaking") is a `hedged` claim. When it's truly unclear, record nothing.
- Something normally inanimate that communicates with the person or acts toward them (a stream
  that speaks and asks them to follow) is an `animate_object_or_landscape`. Surroundings that are
  merely alive were recorded by the earlier pass, not here.
- People inside a scene the person watches (a life review, a past life, a preview of the
  future) aren't encounters, unless one turns and interacts with them, or a being beside them
  shows them the scene. A future child who greets them is met.
- Ordinary perception before the experience starts or after it ends isn't an encounter.
- A questionnaire box ticked with nothing described creates no encounter. Encounters hold only
  what is described, in the narrative or in an answer's comment.

## Where the being was

`presence`:
- `physically_present`: really there in the physical setting, usually perceived from out of the
  body (staff working on the body, a relative at the bedside, a friend glimpsed elsewhere in the
  building);
- `part_of_experience`: met within the experience. Another dying person's spirit seen leaving
  their body is this. A living person can be either;
- `unclear`: a voice calling the person's name just as they return, when the text doesn't say
  whose it was; a stranger met just after returning, presented as more than ordinary.

## One entry, or several

- One entry for each individual given an identity or a description of its own; the rest of a
  group is one entry with a `count`. A crowd with one known person singled out is two entries.
  Physically present people of one kind (the medical staff) are one group.
- `count` `one_or_more`: the text can't say whether one being or several is meant, such as a
  voice the person calls "he" in one place and "they" in another.
- Beings the text doesn't equate are separate entries, even when they might be the same (a
  figure on a throne, a guide, and an ancestor who leads the way).
- One entry per episode. `sameBeingAs` links an encounter to one in another episode only when
  the text says it was the same individual ("the same being," "him again"). "A being of light"
  in two episodes is the same kind of being, not necessarily the same one.

## Identity

Every encounter has at least one claim in `identity`.
- A being never identified gets one of the unidentified categories: `being_of_light`,
  `voice_or_presence`, `guide`, `council_or_robed_figures`, `orb`, `unrecognized_human`, or
  `unidentified_being`.
- One being can carry several claims (a being of light later named Jesus is one encounter with
  two claims). One claim per referent per timing: a name used throughout plus one answer saying
  the being was recognized at once is one claim, timed `during`.
- `words`: the term or terms as written ("the Lord," "a man in white").
- **The referent comes only from the text, never from the person's background.** "God" stays
  `god`, even in a Christian's account. A second claim, `jesus`, only when the text gives grounds:
  the person equates them, it's called the Son, or it bears a marker unique to him, such as the
  wounds of the crucifixion.
- A remark about the referent rather than the being met (that a figure from one tradition can
  look like one from another) is not a claim.
- The question wording ("for example: Jesus, Muhammad, Buddha") is the archive's, never a claim.
- A personal name such as Jesús, Isa, or Salvador, or a surname such as Christ, isn't Jesus. But
  "Jesús" in a passage left in Spanish, or "Isa" in a Muslim's account, may be.

`when`, strictly:
- `during` only when the text tells the act of identifying as part of the experience (knowing,
  recognizing, being told);
- `after` only when it places it later (didn't know at the time; a photo or article seen later);
- otherwise `not_stated`, including for relatives and for names simply used in telling the story
  ("then Jesus said"). A present-tense conviction ("I'm sure it was") doesn't say when it formed.

`how`, only when the text gives it as the way the person knew (describing a beard and a robe
isn't saying the being was known by them):
- `announced`: the being, or another being, said or conveyed who it was (during only);
- `recognized`: as someone already familiar, known in life or felt known;
- `appearance`: by how it looked; afterward, a photo or painting seen later;
- `knowing`: "just knew," "felt it was." This is how they knew, not a hedge;
- `reasoned`: worked out from doctrine, from what the being did, or from what happened;
- `told_by_person` and `reading_or_media`: after only;
- `not_stated` stands alone.

`certainty`:
- `hedged`: "I think," "might have been," "of some sort," an either-or list of two or three
  identities, an identity offered as a question ("Was it my angel?"), a label the person marks
  as their own word ("lights, which I called angels"), an "Uncertain" menu answer on the item
  whose comment gives the name, or choosing a word ("I would describe it as");
- `resemblance`: "looked like," "reminded me of," unless the person goes on to say it was that
  being;
- when passages differ, take the strongest any of them states, keep the others in `evidence`,
  and set `hedgedElsewhere`.

Leave out of identity anything about how the expectation or memory came about (a devotional
object addressed daily beforehand, an encounter remembered only after a television program).
The earlier pass recorded those.

## Categories

- **Angels** are their own category, whatever the tradition: Michael is never filed under a
  church.
- **Named figures** (saints, biblical figures, other traditions' figures, historical figures,
  celebrities) are `named_figure`. Their `name` is the standard spelling from the list of
  canonical names below when it's the same person, so that every spelling and title of one
  figure groups together; otherwise it's the name as the text gives it, in standard English
  form.
- A **saint** is any departed Christian whom a Christian community holds in reverence, with or
  without any calendar or canonization: a Baptist church's deep respect for Billy Graham makes
  him a saint for this purpose as much as Rome's canonization makes Padre Pio one. A name that could
  be several people (a bare "Saint Teresa" or "Francis") gets the full name only when the context
  decides it. A named angel or hostile being keeps its own category and takes its `name` from the
  same list.
- `suggestedSubcategory` is only a suggestion; a table decides. Saints go by when they died,
  never by who canonized them: anyone who died before 1054, and Western saints who died before
  about 1517 (Francis of Assisi), are `early_or_medieval_saint`; Eastern saints who died after
  1054 are `orthodox_saint`; Western saints after about 1517 (Padre Pio) are
  `post_reformation_catholic_saint`; Protestant figures after about 1517 are
  `protestant_saint_or_luminary`.
- `living_religious_leader`: a religious leader still living then, not known personally, of any
  tradition.
- **Medical staff and patients.** The person's own doctor, nurse, therapist, or carer, known to
  them, and a patient the person cared for, are `friend_or_acquaintance`. Staff the person
  doesn't know are `unrecognized_human`, usually one group.
- **People known in ordinary life** are `family`, `relative_never_met`, `friend_or_acquaintance`,
  `clergy_known_personally`, or `known_person_relationship_not_stated` ("people I knew"). They
  are recorded by their relationship, never by their personal name, so that nobody can be
  identified: `name` stays null, and copied `words` leave the name out ("my aunt," not "my aunt
  Ruth"). They need `vital`. An `unrecognized_human` gets no `name` either; a name the being
  gives itself goes in `words`.
  - `tie` is given for exactly these four: `family`, `relative_never_met`,
    `friend_or_acquaintance`, and `clergy_known_personally`, and is null for every other
    category. A friend's `tie` is still given, with `relationship` null and `religiousRole` null
    unless they were clergy: what kind of friend waits for a later pass.
  - `tie.relationship` for family and relatives never met: the role, the sex from a gendered
    word or pronouns (never from a name), the number of "greats," the side, and the link. A child
    who died before birth or was not yet born is a child or sibling by role.
  - Three or more greats (a great-great-great-grandfather) is `relative_never_met` unless the
    text says they met.
  - `clergy_known_personally` is someone known through that role (one's own pastor, a school
    chaplain) and needs a `religiousRole`. A relative or friend who was clergy stays family or a
    friend, with the `religiousRole` recorded too.
  - Kinship words for beings never known in life ("my soul family," friends known forever but
    never seen) don't make them family or friends: they are unidentified beings, with the words.
  - Someone else's child met before conception is `friend_or_acquaintance`.
- A person's "ghost" or "spirit" is an `unrecognized_human` whose vital status is dead; one not
  described as human-shaped is an `unidentified_being`.
- An ordinary animal, hostile or not, is an `animal`; a monstrous or demonic beast is a
  `hostile_being`.
- `self_double`: a being the person identifies as themselves in some form (a double, a higher
  self), appearing as a separate being, hedged when they waver. A being that only looks like them
  isn't this.
- `other`, for anything none of the categories fits, with the words.

## Vital status

For people known in life and animals, and for anyone else whose status the text gives.
- `status` is as of the experience, as the person reports it, including what they learned
  afterward.
- `experiencerKnew`: `knew` when the text says so or the death plainly comes earlier in their
  own story; `did_not_know` only when the text says so (they learned afterward, or were
  surprised because they believed the person alive); otherwise `not_stated`.

## Other fields

- `familiarity` is about ordinary life. Meeting the being in an earlier experience is
  `sameBeingAs` instead.
- `apparentSex` comes from the description or pronouns, never from a name or from the pronouns
  conventionally used for God.
- `imageComparisons`: the being compared to a painting, statue, film, or illustration; `work`
  names it when the text does.

## Mistakes to avoid

- Coding a being as Jesus because the person is Christian. A Christian's "God" is `god`; it is
  also `jesus` only when the text identifies the being as Jesus.
- Timing an identity `during` because the story is told in order.
- Taking "felt it was" for a hedge.
- Filing an angel under a church.
- Using a Catholic-centered idea of a saint: reverence by a Christian community makes one, not
  canonization or a calendar, and when a saint died, not who recognized them, decides
  `suggestedSubcategory`.
- Coding the question wording's examples as beings.
- Making a simile, or a ticked box with nothing described, an encounter.
- Merging beings the text doesn't equate, or linking episodes the text doesn't link.
- Recording the personal name of anyone known in ordinary life, in `name` or in `words`.
- Copying more than six words into a field with copied words.
