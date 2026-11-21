# Pass C: doctrine, and every mention of Jesus

The schema gives every field and its allowed values. This file covers only what the schema
can't: what counts, what doesn't, and the values whose meaning isn't plain from their names.
This pass records two things: what the account states about God, salvation, and the afterlife
(doctrinal statements), and every place the person's own words mention Jesus. The beings met
were recorded by an earlier pass; don't record beings here.

Code the whole page. Most doctrine is the person's own view, given anywhere on the page, and
many mentions of Jesus involve no being at all, so a page with no beings can still have both.

## The episodes and encounters

- After the account, earlier passes list the person's experiences as episodes (an ID and a short
  label) and the beings met in them as encounters: an ID, a short label, and in brackets who the
  being was taken to be, such as [voice_or_presence] or [god, jesus]. Use these IDs for
  `episodeId` and `encounterId`. Never invent one.
- If a statement or mention needs a being the list leaves out (a being who conveys a doctrine, or
  one the text calls Jesus), leave that statement or mention out, and record the being in
  `missingEncounters`: its episode, a few words of your own, and evidence. If it needs an
  experience the episode list leaves out, leave it out and record the experience in
  `missingEpisodes`.
- Every encounter listed with jesus in its brackets needs a mention of kind `encounter`,
  `refersTo` `jesus`, `affirmative`, linked to it, with the words that name or identify him and
  evidence for each place they appear. It stays `affirmative` even when the person was unsure,
  or asked "Was it Jesus?": the earlier pass recorded the doubt.
- If the text calls a listed being Jesus and its brackets don't say jesus, code the mention as the
  text gives it, linked to that encounter.

## Doctrinal statements

A doctrinal statement is a proposition about God, salvation, or the afterlife that the account
states as true or false, whether the person says it or a being conveys it to them. Telling
events, however vivid, never makes one.

- **Describing is not stating.** A cold grey plain where unseen things moan is a description and
  isn't coded here. "It was hell," "now I know hell is real," or "hell is inward, nowhere you
  could walk to" interprets it, and is a statement about hell.
- `life_after_death` only when the account states it as a claim ("the self outlasts its
  body"), never because the experience itself implies it.
- That God exists, or that the person believes in God, is not a doctrinal statement.
- Personal devotion ("I sing to Jesus at dawn," "Jesus walks beside me") is not a doctrinal statement unless it
  states one of the propositions on the list (that Jesus is God, or that his death atoned for
  sin).
- Moral and practical teachings ("be kind," "stop worrying about money") aren't doctrine, even
  when a being taught them. `other` is only for a claim about God, salvation, or the afterlife
  that the list misses (an invented example: "only the gentle can stay here").

The doctrines whose names need a word:
- `exclusivism`: Christ, or one faith, is the only way. `religious_pluralism`: every religion
  leads to God or holds truth. `religion_human_made_or_unnecessary`: religion is a human
  invention, or not needed. A passage can state more than one; record each.
- `reincarnation`: rebirth or past lives. `preexistence_of_souls`: souls exist before
  conception or birth.
- `universal_salvation`: everyone is saved in the end; nobody is lost.
- `trinity`: the Godhead itself, its three persons and how they relate. A statement that Jesus
  is or isn't God ("Jesus was only a wise teacher") is `divinity_of_jesus`. `atonement`: his
  death atones for sin.
- `self_as_divine`: the self is divine, or one with God.
- `departed_aware_of_earthly_events`: the dead know what happens on earth.
  `departed_intercede`: the dead pray for or help the living.
- `judgment_after_death`: judgment after death, by God or a being; "we judge ourselves" is
  `reinterprets`, "there is no judgment" is `denies`. `final_judgment`: a judgment at the end of
  time. `general_resurrection`: the dead raised at the end of time.
- `hell_exists`: whether hell exists, with `hellQualities` for whatever the statement says it is
  like, as many as apply. `purgatory`: a temporary state of cleansing after death.

`stance`:
- `reinterprets`: neither a clean yes nor a clean no ("the resurrection was spiritual, not
  bodily").

`certainty` is `hedged` for "I think," "maybe," "or something like it," as for identities.

`source`:
- `conveyed_by_being`: a being in the experience said or conveyed it. Give the `encounterId`, and
  its episode as `episodeId`.
- `shown`: shown during the experience, as a scene, with no being speaking.
- `understood`: the person understood or knew it during the experience, with no being conveying
  it.
- `experiencer_view_before`: what the person believed before the experience. People often say
  so when asked whether the experience fit their beliefs.
- `experiencer_view_after`: their own view afterward, including now.
- `not_stated`: the text doesn't say when the view was held or how it came.
- During means during, strictly: only when the text tells it as part of the experience (shown,
  told, understood then). Questionnaire items that begin "During your experience, did you gain
  information about…" don't decide it, since answers often drift into what the person believes
  now: an answer that only states a belief in the present tense is `experiencer_view_after`.
- `episodeId` is given for `conveyed_by_being`, `shown`, and `understood`; otherwise it is null.

One statement, several places:
- The same proposition can be two statements: conveyed by a being during the experience, and
  stated again as the person's own view afterward. Record both.
- The same doctrine with the same stance, source, being, and episode, stated in several places,
  is one statement, with every place in `evidence`. Its `certainty` is the strongest any passage
  states.

## Every mention of Jesus

Only the person's own words, in the narrative and in their answers. Never the question wording
(one question names Jesus among its examples), and never text that isn't the person's.

Which words count:
- Jesus, Christ, Isa, Yeshua, the Son (of God), the Lamb, and a capitalized Savior mean Jesus
  (`refersTo` `jesus`) unless the text says otherwise.
- "Lord" and "Messiah" alone, and a lowercase "savior" (which can mean a human rescuer), are
  `ambiguous`, unless the text ties them to Jesus ("the Lord Jesus"), which makes them `jesus`.
  Where capitals can't tell (the start of a sentence, a passage in capitals), context decides, or
  the mention is `ambiguous`.
- A title the text ties to someone else is `not_jesus`, under whatever kind fits: "the Lord" for
  a named figure of another tradition ("Lord Shiva"), or for an impersonal Absolute ("the Lord,
  the one Mind of the universe"). Tied only to God, it stays `ambiguous`, since a Christian's
  "God" can mean Christ.
- New Age terms built on Christ ("Christ consciousness," "my Christ self") are kind `other`,
  `ambiguous`.
- Derived words (Christian, Christmas, Christianity) don't count. "God" alone is never a mention
  of Jesus, whoever the person is.
- **Context, not the word, decides.** Jesús and Salvador are common given names, Isa is a common
  Muslim given name (and short for Isabel), Christ and "de Jesús" are surnames, and El Salvador is
  a country. Used for a person or a place, the word is a mention of kind
  `name_of_person_or_place`, `refersTo` `not_jesus`. But "Jesús" in a passage left in Spanish
  ("vi a Jesús en la luz"), or "Isa" in a Muslim's account of the prophet, can mean Jesus himself.
  When the context can't tell, it is `ambiguous`.

`kind`:
- `encounter`: Jesus, or a title, naming a being met in the experience; linked to that encounter.
- `talk_with_another_being`: a being in the experience speaks of Jesus, or the person asks a
  being about him; linked to the being they talk with.
- `prayer_or_invocation`: praying to Jesus or calling on his name, whenever it happens.
- `own_faith_or_belief`: the person's own faith in or view of Jesus, before or after.
- `doctrinal_statement`: the words are part of a doctrinal statement recorded above; linked to
  it, and not recorded again as own faith.
- `someone_elses`: another person's faith, words, or experience (a relative's devotion, what a
  minister said, a book about Jesus).
- `idiom_or_exclamation`: "Jesus!", "for Christ's sake".
- `church_name`: a church named for him ("Christ the King Parish").
- One passage can hold mentions of two kinds, such as a being met and a doctrine about him.

`when`:
- A mention linked to an encounter, or to a being's talk about Jesus, is `during`, with that
  encounter's episode as `episodeId`, even when the being was identified later.
- A mention linked to a doctrinal statement takes the statement's timing: `during`, with its
  episode, for one conveyed, shown, or understood; `before` or `after` for the person's own view;
  `not_stated` when its source is.
- Any other mention made during an experience (a prayer said in it) is `during`, with its
  `episodeId`. A present-tense statement of faith is `after`. Otherwise `episodeId` is null.

`polarity`: `negated` for a denial ("that was not Jesus," "Jesus means nothing to me"); `question`
for one asked ("did Jesus send you?", asked of a being).

One entry per kind, time, referent, polarity, link, and place: the narrative, or the
questionnaire as a whole. Put every passage with the same of these in one entry's `evidence`, so
a being called Jesus throughout the narrative is one entry, and again one for all the answers
that name him.

## Mistakes to avoid

- Counting the question wording's examples as mentions.
- Coding a Christian's "God" as a mention of Jesus.
- Taking a person named Jesús, Isa, or Salvador for Jesus; or dismissing "Jesús" left in
  Spanish, or "Isa" in a Muslim's account, as only a name.
- Coding a description of a terrible place as a statement about hell.
- Inferring `life_after_death` from the experience itself.
- Timing an answer to a "During your experience" item `during` when it states present belief.
- Recording moral teachings, or belief in God, as doctrine.
- Leaving an encounter listed with jesus without its linked mention.
- Linking to an episode or encounter that isn't listed.
- Copying more than six words into `words`.
