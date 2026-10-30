# Literature search

Before forming hypotheses or pre-registering anything, I asked an AI model to search for published
literature relevant to this project. This page records the exact prompt I gave it and the
bibliography it returned, so it's clear what I had in hand before the hypotheses were written.

## Where things stand

- **I haven't looked into any of these sources yet.** When the bibliography was added to this page,
  I hadn't opened, read, or checked any of the sources in it. The one exception is J. Steve
  Miller's book, which prompted the project, as the prompt explains.
- **The bibliography is unverified.** It's the model's output, reproduced as returned. I haven't
  checked that each source exists, that the links work, or that the summaries match what the
  sources actually say.
- **What it's for.** I'm going to use these sources to help form the hypotheses and methods, and
  only then pre-register. Nothing has been pre-registered yet.

## Search details

| | |
| --- | --- |
| Model | Claude Opus 5.5 (Anthropic) |
| Date run | 2026-10-30 |
| Added to this repository | 2026-10-30 |

The git history shows when this page was added and any changes made to it since.

## Prompt

The text is exactly as sent. The only additions are Markdown formatting: quote markers, and line
breaks after two section labels so they display on their own lines.

> I'm planning a hobby research project and need help finding published literature to review BEFORE I pre-register my hypotheses. Please search thoroughly, but your job is to report what the literature found, not to write my hypotheses for me.
>
> BACKGROUND\
> I'm a software engineer with a biology degree, not a trained researcher. The project uses LLM-assisted coding of about 5,900 self-reported near-death experience (NDE) accounts I've collected from NDERF (nderf.org), posted 1998–2026, to study who experiencers report meeting: deceased relatives, friends, living people, pets and other animals, Jesus, Mary, other saints and religious figures, non-religious historical figures, hostile beings, and "control" categories like extraterrestrials. Key design features: coding whether each figure was identified during the experience or only afterward; comparing rates by the experiencer's prior religious affiliation; and testing whether distinctive details from popular books (e.g., the rainbow horse in "Heaven Is for Real," 2010) appear in accounts only after publication.
>
> The project was prompted by J. Steve Miller's "Is Christianity Compatible with Near Death Experiences?", which argues Jesus appears disproportionately in NDEs, based partly on 100 consecutive NDERF cases compared against structural features like altered time sense. I think his method can't distinguish cultural conditioning from other explanations, and I want a design that can test it more fairly.
>
> Known data constraints: NDERF's religion field before ~2010 mostly records religiosity (liberal/moderate/conservative) rather than tradition; about 2011–2012 the questionnaire added an item asking whether the experiencer met beings "described by name in religions (for example: Jesus, Muhammad, Buddha)"; the sample is heavily Western; the public text is lightly edited.
>
> QUESTIONS TO SEARCH (one or more searches each)
> 1. Has anyone besides Miller quantified how often Jesus or other named religious figures appear in NDEs, especially conditioned on the experiencer's religion or culture?
> 2. Cross-cultural NDE studies (India, China, Japan, Iran/Muslim populations, indigenous societies): which figures appear, and how are beings of light identified? Including Kellehear, Pasricha & Stevenson, Kreps, and Iranian NDE studies.
> 3. Deceased vs. living persons encountered in NDEs and deathbed visions: baseline ratios (e.g., Osis & Haraldsson, "At the Hour of Death"; Emily Williams Kelly 2001 in Death Studies), plus "Peak in Darien" cases (Greyson).
> 4. Marian or saint encounters in NDEs or deathbed visions, ideally comparing Catholic and Protestant experiencers.
> 5. Animals or pets in NDEs, and any work on Rainbow Bridge imagery.
> 6. Whether popular NDE books or films measurably changed later accounts (media contamination, memory reconstruction).
> 7. Distressing NDE prevalence and underreporting (Greyson, Bush), as a calibration point for reporting bias.
> 8. Questionnaire or demand effects: whether prompting about specific figures or features changes NDE reports.
> 9. Any survey of what religious people expect to see or whom they expect to meet at death, ideally by denomination.
> 10. Computational or text-mining analyses of NDE narratives (e.g., latent semantic analysis, the Liège group), especially any using NDERF.
> 11. Jeffrey Long's published statistical analyses of the NDERF archive, and what his questionnaire versions asked.
>
> 12. Any AI-assisted analysis already done on the NDERF archive, especially by Jeffrey Long or NDERF itself: published papers, conference presentations, blog posts, or site documentation describing how NDERF uses AI (e.g., the AI-generated topic tags on search.nderf.org, AI-assisted editing or presentation of accounts in the search database, or any LLM-based summaries or statistics). I've seen unsourced claims that NDERF uses retrieval-based chat tools and has run LLM analyses of its corpus; please only report what you can confirm from a primary source, and say plainly if you can't find documentation.
>
> RULES
> - Only report sources you actually found in this session. Give a full citation and a link. If you can't verify that a source exists or that it says what you think, say so explicitly; do not fill gaps from memory.
> - Do not report specific statistics unless they come from a source you retrieved; quote the number with its sample size.
> - Distinguish peer-reviewed work from popular books and advocacy sites, and note the authors' known positions where relevant.
> - Note whether each source is freely accessible (much of the Journal of Near-Death Studies archive may be free via the University of North Texas digital library).
> - Do not read or summarize individual NDERF accounts themselves. I'm protecting my pre-registration, so I only want published analyses, not counts or content from the archive.
> - If a question has essentially no literature, say so plainly. Gaps are useful to me.
>
> OUTPUT\
> An annotated bibliography grouped by the numbered questions. For each source: citation, link, sample and method, key relevant findings, and one line on how it could bear on expectations for my study (without stating my hypotheses for me). End with a short list of the five to eight sources most worth reading in full, and a list of the questions where you found little or nothing.

## Bibliography

The model's output, exactly as returned except that each heading is moved down two levels to
fit under this one.

### NDE Encounter Figures: Annotated Bibliography

Oct 30, 2026 · @Sarah Rose Battles

#### Scope and conventions

Every source below was located by search in this session; nothing is filled in from memory. Statistics appear only when they were on a page I actually retrieved, and each entry says how far I could check it.

Tags used in each entry:

- **Type:** peer-reviewed article, scholarly book, popular book, survey report, or website/advocacy
- **Access:** free full text, abstract only, or paywalled
- **Checked:** "opened" means I read the page or PDF; "citation only" means I confirmed the source exists but could not read what it says

Author positions are noted where they bear on interpretation. Per your instructions, no individual NDERF accounts were opened or summarized, and no counts were drawn from the archive itself.

#### Q1. Rates of Jesus and other named religious figures

I found one published frequency count for Jesus in an NDERF-derived sample (Tressoldi & Long), and no study that reports named-figure rates broken down by the experiencer's prior *tradition* with usable group sizes. Everything else is qualitative or secondhand.

**Tressoldi, P., & Long, J. (2023).** God's characteristics as reported by near-death experiencers. *Qeios*, preprint v1. [doi:10.32388/2TI1T7](https://www.qeios.com/read/2TI1T7)

- *Type and access:* preprint with open peer review on Qeios; I found no later journal version. Free; opened. Long founded NDERF; the paper frames NDEs as a resource for studying "God's nature."
- *Sample and method:* In May 2023 the authors keyword-searched NDERF for "God" and then "Jesus" (4,640 records) plus the 2022 archive (sixty-nine records). Of 4,709 records, 303 met their criteria: first-hand, "probable" or "possible" NDE, any NDE Scale score, and a described encounter with God or Jesus. Coding was single-word extraction (Light, Love, Oneness, Human form, etc.); no inferential statistics.
- *Findings:* Among the 303, God was encountered 84.5% of the time and Jesus 14.8%. Jesus was described in human form more often than God (70.1% vs. 29.9% of human-form mentions). The human-form share is given inconsistently as 13.9% (abstract), 14.7% (Table 2, 67 mentions), and 15.2% (discussion). Groups: religious n = 237, not religious n = 34, undeclared n = 32; 83.8% were US residents.
- *Note on religion coding:* The religion table mixes religiosity labels with traditions (e.g., "Christian" 51, "Catholic" 49, "Moderate" 36, "Liberal" 23, "Fundamentalist" 22), which matches the NDERF field problem you already flagged.
- *Bearing:* A keyword-gated denominator, so it cannot serve as an archive-wide base rate, but it is the closest published NDERF figure for Jesus versus God.
- *Pre-registration caution:* the paper and its open dataset ([figshare](https://doi.org/10.6084/m9.figshare.23585265.v3)) quote NDERF accounts by ID.

**King, R. A. (2024).** The Jesus personage in near-death experiences: A reflexive thematic analysis. *Journal of Anomalous Experience and Cognition, 4*(2), 225–247. [doi:10.31156/jaex.26134](https://journals.lub.lu.se/jaex/article/download/26134/23595/71440)

- *Type and access:* peer-reviewed, open access (CC-BY); opened. King directs an independent "NDE OBE Research Project."
- *Sample and method:* Seventy-nine first-hand accounts (seventy-three NDERF, six IANDS) found by searching "Jesus" or "Christ"; single-coder reflexive thematic analysis. He states it is not a frequency study. Inclusion required an OBE, a visual form, and a "reasonable belief" that the figure was Jesus formed *during and/or afterwards*; presence-only, voice-only, and formless-light cases were excluded.
- *Findings:* Appearance varied widely (hair, eye color, clothing, setting). Facial features were reported in at least thirty-six cases. A few experiencers explicitly said they recognized the figure by its resemblance to specific paintings, the Shroud of Turin, or a film. The figure discussed returning to life in sixty-five of seventy-nine.
- *Bearing:* Shows that published coding has merged during-experience and after-the-fact identification, the very distinction your design separates; the "recognized from a picture" cases are a precedent for a code.
- *Pre-registration caution:* names and quotes specific NDERF cases.

**Long, J., & Perry, P. (2016).** *God and the afterlife.* HarperOne.

- *Type and access:* popular book; citation only. Per Tressoldi & Long, its "God study" analyzed 420 NDERF accounts scoring 7+ on the Greyson NDE Scale, with 65% of those describing God reporting love. Publisher copy claims a base of 3,000 people; I could not check either figure in the book.

**Lai, C. F., et al. (2007).** Impact of near-death experiences on dialysis patients: A multicenter collaborative study. *American Journal of Kidney Diseases, 50*(1), 124–132. [PubMed 17591532](https://pubmed.ncbi.nlm.nih.gov/17591532)

- *Type and access:* peer-reviewed; abstract opened, full text paywalled.
- *Findings:* 710 dialysis patients in Taipei; 45 patients reported 51 NDEs. Religious participation correlated with NDE score. The abstract gives no figure-encounter rates. King (2024) cites it as reporting that 27.5% (fourteen) met a supreme being, always from their own religion; I could not verify that against the full text.
- *Bearing:* One of very few non-Western clinical samples with a religion-matched figure claim, if the secondhand figure holds.

**Sabom, M. (1998).** *Light and death.* Zondervan.

- *Type and access:* popular book by a cardiologist writing from an evangelical position; citation only. King (2024, p. 226) reports Sabom's observation that Christians more often named the being "Jesus," "Christ," or "Lord," while those who simply believed in God said "God," "Supreme Being," or "Source" (Sabom p. 213). No counts were given in King's summary.

**Miller, J. S. (2023).** *Is Christianity compatible with deathbed and near-death experiences?*

- *Type and access:* popular apologetics book; I confirmed the title and an August 2023 date from [Goodreads](https://www.goodreads.com/work/quotes/199539354) and a [summary page](https://elevatesociety.com/is-christianity-compatible-with-deathbed-and-near-death-experiences/) but could not access its methods. Miller writes as a Christian apologist (e.g., with Gray in the [Evangelical Philosophical Society](https://www.epsociety.org/?p=2821)), and Long endorsed Miller's 2012 book.

#### Q2. Cross-cultural studies and the identity of beings

The cross-cultural literature consistently reports that *which* beings appear tracks the experiencer's tradition (Yama's messengers in India, Yama or the Buddha in Thailand, Shia Imams in Iran), while the presence of beings at all is common across cultures. Samples are small (eight to thirty people), usually solicited, and rarely report counts per figure.

**Kellehear, A. (1993).** Culture, biology, and the near-death experience: A reappraisal. *Journal of Nervous and Mental Disease, 181*(3), 148–156. [Record](https://researchportal.northumbria.ac.uk/en/publications/culture-biology-and-the-near-death-experience-a-reappraisal/)

- *Type and access:* peer-reviewed; abstract line only; paywalled. Kellehear is a sociologist who treats NDEs as culturally shaped responses to crisis.
- *Findings:* The abstract states that life review and tunnel appear culture-bound, largely confined to societies dominated by historic religions.
- *Bearing:* Separates features that vary by culture from those that do not; useful when deciding which features can serve as culture-neutral comparators.

**Kellehear, A. (2008).** Census of non-Western near-death experiences to 2005: Overview of the current data. *Journal of Near-Death Studies, 26*(4), 249–265. [Record](https://researchportal.northumbria.ac.uk/en/publications/census-of-non-western-near-death-experiences-to-2005-overview-of-/) · expanded as a chapter in Holden, Greyson & James (Eds.), *The Handbook of Near-Death Experiences* (2009), pp. 135–158. [Record](https://researchportal.bath.ac.uk/en/publications/census-of-non-western-near-death-experiences-to-2005-observations/)

- *Type and access:* peer-reviewed review; abstract only (the JNDS issue may be free on UNT, but I did not open it). An [IANDS talk summary](https://discover.library.unt.edu/catalog/b3195988) says it examined tunnel, OBE, life review, and supernatural beings across all published non-Western accounts to 2005.
- *Bearing:* The most complete census of non-Western cases; worth checking whether it tabulates beings by culture.

**Pasricha, S., & Stevenson, I. (1986).** Near-death experiences in India: A preliminary report. *Journal of Nervous and Mental Disease, 174*(3), 165–170. [doi:10.1097/00005053-198603000-00007](https://med.virginia.edu/perceptual-studies/book-publication/near-death-experiences-in-india-a-preliminary-report/)

- *Type and access:* peer-reviewed; one-line abstract only (UVA DOPS page). Both authors worked in survival research at UVA.
- *Findings:* Sixteen Indian cases that "differ significantly" from Western ones. Secondary sources ([SPR Psi Encyclopedia](https://psi-encyclopedia.spr.ac.uk/articles/satwant-pasricha)) describe the characteristic return motif: an underling of Yama fetched the wrong person. Pasricha's later South India surveys (*Journal of Scientific Exploration*, 1993 and 1995) and a 2008 JNDS paper (26(4), 267–282) are cited elsewhere but I did not open them.
- *Bearing:* The canonical case for culture-specific escorts and identities.

**Blackmore, S. J. (1993).** Near-death experiences in India: They have tunnels too. *Journal of Near-Death Studies, 11*(4), 205–217. [Free PDF (UNT)](https://digital.library.unt.edu/ark:/67531/metadc799366/m2/1/high_res_d/vol11-no4-205.pdf)

- *Type and access:* peer-reviewed; free; opened. Blackmore is a skeptical psychologist.
- *Sample and method:* A newspaper ad asked only about "a close brush with death," deliberately not mentioning NDEs or tunnels. Of nineteen replies, eight described NDEs.
- *Findings:* Summarizing Osis & Haraldsson, she notes that the commonest visions were of dead people or religious figures, largely according to religious background, and that the "mistaken identity" return story recurred.
- *Bearing:* A neutral-wording solicitation design you can contrast with NDERF's feature-prompting questionnaire (see Q8).

**Murphy, T. (2001).** Near-death experiences in Thailand. *Journal of Near-Death Studies, 19*(3), 161–178. [UNT record](https://digital.library.unt.edu/ark:/67531/metadc799340/) · [doi:10.1023/A:1026413705216](https://link.springer.com/article/10.1023/A:1026413705216)

- *Type and access:* peer-reviewed; free on UNT; abstract opened. Murphy is an independent researcher.
- *Findings:* Thai NDEs lacked the most-noted Western episodes but shared consistent local features: harbingers of death, hell visions, the Lord of the underworld (Yama), and merit-making. I did not see the sample size.

**Ohkado, M., & Greyson, B. (2014).** A comparative analysis of Japanese and Western NDEs. *Journal of Near-Death Studies, 32*(4). [UVA DOPS page](https://med.virginia.edu/perceptual-studies/participate/join-our-research-team/join-our-research-visiting-researchers-and-scholars/)

- *Type and access:* peer-reviewed; abstract only (the PDF link would not load for me). Both authors work in survival research.
- *Findings (secondary):* The [Psi Encyclopedia](https://psi-encyclopedia.spr.ac.uk/articles/ohkado-masayuki/) summarizes it as finding cultural differences in how Japanese experiencers interpreted and interacted with light and heaven imagery, and an absence of life reviews.
- *See also:* Ito & Miura (2016) under Q10, a small text-mining study of Japanese narratives.

**Kreps, J. I. (2009).** The search for Muslim near-death experiences. *Journal of Near-Death Studies, 28*(2), 67–86.

- *Type and access:* guest editorial; citation only (described in the [editor's foreword](https://digital.library.unt.edu/ark:/67531/metadc1505506/m2/1/high_res_d/28-2_5_Editor_s_Foreword.pdf)). Kreps is a physician writing from a Sufi perspective. He found no NDEs through solicitations in Pakistan and Kashmir and concluded Muslim NDEs are rare.

**Nahm, M., & Nicolay, J. (2010).** Essential features of eight published Muslim near-death experiences. *Journal of Near-Death Studies, 29*(1), 255–263. [UNT record](https://digital.library.unt.edu/ark:/67531/metadc461743/)

- *Type and access:* peer-reviewed brief report; free; abstract opened. Translates eight cases a physician collected in Muslim countries (1958–1964, published in Italian) and argues Muslim NDEs are not rare.

**Fracasso, C., Aleyasin, S. A., Friedman, H., & Young, M. S. (2010).** Near-death experiences among a sample of Iranian Muslims. *Journal of Near-Death Studies, 29*(1), 265–272. [Free PDF (UNT)](https://digital.library.unt.edu/ark:/67531/metadc461762/m2/1/high_res_d/29-1%20Final%204%20Fracasso.pdf)

- *Type and access:* peer-reviewed brief report; free; opened.
- *Sample and method:* Thirty Muslims in Arak, recruited by class announcements and snowballing, completed a Persian Greyson NDE Scale; nineteen (63%) scored 7+. The Persian scale's reliability was poor (alpha .54 overall, .13–.52 on subscales), so the authors declined further statistics.
- *Findings (n = 19):* 62% encountered a light; 32% heard the voice of a definite mystical being; 26% saw "deceased relatives or religious (holy) spirits"; 21% sensed their presence.
- *Bearing:* The Greyson item lumps the dead with religious figures, so studies built on it cannot separate the two.

**Ghasemiannejad Jahromi, A., & Long, J. (2020).** The phenomenology of Iranian near-death experiences. *Journal of Near-Death Studies, 38*(3), 180–200. [Free PDF (UNT)](https://digital.library.unt.edu/ark:/67531/metadc1778676/m2/1/high_res_d/03_Jahromi_JNDS_Fall_20_38-3.pdf)

- *Type and access:* peer-reviewed; free; opened. Co-authored by NDERF's founder.
- *Sample and method:* Seventeen Shia Muslims (from twenty recruited via a Farsi NDE website for Ghasemiannejad et al., 2014, JNDS 33(1), 30–42), interviewed in Farsi; inductive thematic analysis.
- *Findings:* Eight of seventeen met beings; three met or referred to Shia religious figures. One of these was a living religious leader; another felt a luminous figure "might be" an Imam but was not told. Ten of seventeen reported some distressing content. Only two met beings who were alive at the time. The authors propose a universal "deep structure" with culturally supplied identities.
- *Bearing:* Concrete precedents for three codes in your scheme: a living religious figure, an inferred (not announced) identity, and religion-matched figures.

**Shushan, G. (2018).** *Near-death experience in indigenous religions.* Oxford University Press. [Catalog record](https://catalogue.bnf.fr/ark:/12148/cb455758090) · [Review by Matlock, JNDS 36(4), free](https://digital.library.unt.edu/ark:/67531/metadc1727997/m2/1/high_res_d/36-4_7._BR_Matlock.pdf)

- *Type and access:* scholarly monograph (paywalled); review opened. Uses historical explorer, missionary, and ethnographic records from North America, Africa, and Oceania. The review notes NDEs were rarely reported in some regions and that Shushan argues NDEs are universal but interpreted regionally.
- *Bearing:* The main source for indigenous cases; historical rather than modern self-report.

**Belanti, J., Perera, M., & Jagadheesan, K. (2008).** Phenomenology of near-death experiences: A cross-cultural perspective. *Transcultural Psychiatry, 45*(1), 121–133. [doi:10.1177/1363461507088001](https://journals.sagepub.com/doi/10.1177/1363461507088001)

- *Type and access:* peer-reviewed narrative review; abstract only; paywalled. Concludes there are common themes alongside reported cultural differences.

#### Q3. Deceased versus living persons; Peak in Darien

The best published baseline is Kelly (2001): in a self-referred UVA collection, recognized deceased persons appeared in 13% of NDEs, living persons in about 4%, and religious figures in about 11% of those who saw any unrecognized figure. Deathbed-vision studies report the same predominance of the dead, with religious figures more prominent in India.

**Kelly, E. W. (2001).** Near-death experiences with reports of meeting deceased people. *Death Studies, 25*(3), 229–249. [Free PDF (UVA)](https://med.virginia.edu/perceptual-studies/wp-content/uploads/sites/360/2017/01/KEL13-NDEwithReports-of-Meeting-Deceased-People.pdf%20)

- *Type and access:* peer-reviewed; free; opened. Kelly (UVA DOPS) argues the survival hypothesis deserves more serious consideration.
- *Sample and method:* 553 mostly self-reported NDEs from the US, Canada, and Australia, gathered by people who had heard of the UVA research. The seventy-four cases with recognized deceased persons were compared with 200 cases that had medical records; chi-square tests.
- *Findings:*
  - Seventy-four of 553 cases (13%) involved recognized deceased persons; she notes Ring reported 8% and the Fenwicks 39%.
  - Of 129 identified deceased people, only six (5%) were friends or acquaintances; parents were 33% and grandparents 31%. Ten of sixty-one (16%) were people the experiencer had never met.
  - Of 274 cases, eleven saw recognized *living* persons; two saw animals, both deceased pets.
  - Of 161 who saw unrecognized or non-deceased figures, eighteen (11%) identified one as a religious figure, "usually Jesus"; many saw a being of light they identified with God.
  - Deceased-person cases were more often near death (twenty-eight of thirty-seven with records) and more often followed sudden events.
- *Note:* Ghasemiannejad Jahromi & Long (2020) cite this paper as finding "only 39%" emotionally close relationships; Kelly's table shows 39% *very* close plus 28% close (sixty-one relationships with data).
- *Bearing:* The closest published template for your deceased, living, religious, and animal categories, with denominators.

**Osis, K., & Haraldsson, E. (1977).** *At the hour of death.* Avon (3rd ed., Hastings House, 1997). Also Osis & Haraldsson (1977), Deathbed observations by physicians and nurses: A cross-cultural survey, *Journal of the American Society for Psychical Research, 71*, 237–259; and Osis (1961), *Deathbed Observations by Physicians and Nurses* (Parapsychology Foundation).

- *Type and access:* book and society journal; not opened. Both authors were parapsychologists who read their data as supporting survival.
- *Findings, per Haraldsson's own summary* ([Psi Encyclopedia](https://psi-encyclopedia.spr.ac.uk/articles/deathbed-visions-research)): 435 Indian and 442 US doctors and nurses were interviewed. Visions were mostly of deceased relatives and less often of religious beings; in India, religious beings appeared more often than persons, including Yama's messengers whom patients resisted. The share of visions with a "take-away" purpose is given as 69% (US) and 79% (India), though copies of the page disagree on which figure belongs to which sample.
- *Caveat:* These are secondhand clinician reports of patients' statements; critics have pointed to that double memory filter.
- *Bearing:* The classic cross-cultural deceased-versus-religious-figure contrast; check the book's tables before relying on any figure.

**Greyson, B. (2010).** Seeing dead people not known to have died: "Peak in Darien" experiences. *Anthropology and Humanism.*

- *Type and access:* peer-reviewed; I could not locate or open the article, so volume and pages are unconfirmed. It is cited as Greyson (2010) in the [Psi Encyclopedia](https://psi-encyclopedia.spr.ac.uk/articles/bruce-greyson/), and Greyson describes such cases in [interviews](https://news.virginia.edu/node/364111). Greyson is a survival-sympathetic psychiatrist.

**King, R. A. (2024).** 'Peak-in-Darien' encounters with the deceased in near-death experiences. *Journal of the Society for Psychical Research, 88*(2), 65ff. [Abstract (EBSCO)](https://www.ebsco.com/articles/psychology/118d7707-bfca-51fc-a1d8-f8a916be6e8b/peak-in-darien-encounters-with-the-deceased-in-near-death-experiences)

- *Type and access:* society journal; abstract only. Defines two types (a known person not yet known to be dead; a never-met deceased person identified afterward from photos or relatives) and sets out alternative explanations.
- *Bearing:* The second type is by definition identified *after* the experience, so it maps directly onto your during/after variable.

**Kerr, C. W., Donnelly, J. P., Wright, S. T., et al. (2014).** End-of-life dreams and visions: A longitudinal study of hospice patients' experiences. *Journal of Palliative Medicine, 17*(3). [doi:10.1089/jpm.2013.0371](https://researchconnect.buffalo.edu/en/publications/end-of-life-dreams-and-visions-a-longitudinal-study-of-hospice-pa/)

- *Type and access:* peer-reviewed; abstract only. Kerr is a hospice physician.
- *Sample and findings:* Sixty-six hospice inpatients interviewed (2011–2012). The most common content was deceased friends or relatives and *living* friends or relatives. Visions of the deceased, including animals and pets, were rated more comforting, and became more prevalent as death approached. In [press coverage](https://hospicebuffalo.com/news/in-the-news/what-deathbed-visions-teach-us-about-living), Kerr describes religious themes as very rare.
- *Bearing:* A prospective, patient-reported comparison that, unlike NDE archives, includes many living persons.

**Kellehear, A. (2020).** *Visitors at the end of life: Finding meaning and purpose in near-death phenomena.* Columbia University Press. [Catalog](https://wellcomecollection.org/works/ddr9e4t6)

- *Type and access:* scholarly book; catalog only. Compares deathbed "visitors" (dead family, friends, strangers) across cultures, including Papua New Guinea.

#### Q4. St. Mary and other saints; Catholic versus Protestant

I found no study that counts encounters with St. Mary or other saints in NDEs or deathbed visions, and none that compares Catholic and Protestant experiencers on this point. The claim that Catholics more often meet St. Mary and the saints circulates as an assertion without data.

**Introvigne, M. (1996).** Embraced by the church? Betty Eadie, near-death experiences, and Mormonism. *Dialogue: A Journal of Mormon Thought, 29*(3), 99–119. [Free PDF](https://dialoguejournal.com/wp-content/uploads/sbi/articles/Dialogue_V29N03_107.pdf)

- *Type and access:* scholarly journal essay; free; opened. Introvigne is a sociologist of new religious movements.
- *Relevant content:* States that it is "more common for Roman Catholics to meet the Virgin Mary and the saints." The footnote (Moody, *Life After Life*, p. 46) supports only the preceding, general point that identification of the being of light varies with religious background; no counts are given.
- *Bearing:* Shows the Catholic/St. Mary expectation is folk knowledge in the literature, not a measured rate.
- *See also Q6:* the same essay documents textual changes between printings of a bestselling NDE book.

**Kelly (2001)** (see Q3) reports that eighteen of 161 experiencers who saw non-deceased figures identified a religious figure, "usually Jesus," with no breakdown by figure or by denomination.

**Tressoldi & Long (2023)** (see Q1) list forty-nine Catholics in their religion table but coded only God and Jesus, so St. Mary and the saints fall outside their scheme.

**Greyson (2023)** (see Q7) is the only source I found that reports *any* NDE variable split by Catholic versus Protestant: in unpublished UVA data, distressing NDEs occurred in 13% of Catholics and 9% of Protestants (not significant). He also relays that Catholic-heavy samples report more hellish-type distressing NDEs. Neither concerns St. Mary or the saints.

**Author not shown (n.d.).** Deathbed visions: A study of hospice palliative care volunteers' experiences, perspectives, and reactions. Mount Allison University. [Repository](https://mta.scholaris.ca/items/df3c602b-5b54-4e9f-bd7f-989a47c44794)

- *Type and access:* student thesis; abstract only; the record I saw did not show the author or year. Eleven volunteers recounted twenty patients' visions; deceased family members were the most reported visitors. No religious breakdown.

**Religious Experience Research Centre (n.d.).** *Seventy-four Christian experiences: A comparative study of experiences from four different traditions.* [CORE record](https://core.ac.uk/works/48553089)

- *Type and access:* RERC working paper; introduction only, author not shown. Interviews members of Catholic, "middle-of-the-road," Evangelical, and Charismatic churches and asks whether some traditions more often see visions of St. Mary or of Jesus. These are general religious experiences, not NDEs, and I could not see results.
- *Bearing:* The only tradition-by-tradition comparison of Marian visions I found, outside the NDE context.

#### Q5. Animals, pets, and Rainbow Bridge imagery

The only published count I found is Kelly's: two of 274 NDEs included animals, both deceased pets. No study I found tests whether Rainbow Bridge imagery appears in NDE accounts, though the poem's origin is now dated, which makes such a test possible.

**Kelly (2001)** (see Q3): Two of 274 experiencers saw animals, both deceased pets. One participant who saw her deceased mother said she had been disappointed not to see her pets. Kelly uses this scarcity as evidence against a simple expectation account.

**Greyson, B. (2024).** Animals and near-death experiences. *Journal of Near-Death Studies.* [Abstract (Newswise)](https://www.newswise.com/articles/animals-and-near-death-experiences)

- *Type and access:* journal article (listed among [UVA DOPS publications](https://med.virginia.edu/perceptual-studies/publications/academic-publications)); abstract only; volume and pages not confirmed.
- *Content:* Argues from reports of deceased pets in human NDEs that animal consciousness may survive death, and from animal behavior that animals may have NDEs. The abstract gives no counts.
- *Bearing:* A survival-oriented review; check its reference list for any pet-encounter counts.

**Kerr et al. (2014)** (see Q3): In hospice patients' end-of-life dreams and visions, those featuring the deceased, explicitly including animals and pets, were rated more comforting.

**Dean, A. (2022).** The Rainbow Bridge: Imagining 'animal heaven.' *Journal for the Study of Religious Experience, 8*(1), 85–107. [Free (JSRE)](https://rerc-journal.tsd.ac.uk/index.php/religiousexp/article/view/122)

- *Type and access:* peer-reviewed, open access; abstract opened.
- *Sample and method:* Ethnography of online pet-loss communities (sample size not given in the abstract).
- *Findings:* The Rainbow Bridge serves three functions: a temporary pet paradise, a preparation of pets for "the real Heaven," and relief of human grief. Dean treats it as an emerging, semi-systematized belief.
- *Bearing:* Documents how the belief functions in the communities that hold it; the specific images you would code as markers come from the poem itself.

**Daly, N. (2023, February).** Report on the authorship of the "Rainbow Bridge" text. *National Geographic.* [Article](https://nationalgeographic.com/animals/article/rainbow-bridge-poem-pet-death-mourning-origin-revealed)

- *Type and access:* journalism; opened via search excerpt. Reports historian Paul Koudounaris's identification of the author as Edna Clyne-Rekhy, who wrote it in Scotland in 1959 after her dog's death and shared it without her name.
- *Bearing:* Fixes the text's origin, but I found no reliable dated history of when it became widespread (sources mention a "Dear Abby" printing without a date). A diffusion test would need that date from another source.

#### Q6. Media influence and memory reconstruction

The only direct before/after test I found is Athappilly et al. (2006), which compared twenty-four pre-1975 accounts with twenty-four later ones and found only tunnels increased. No study I found tests whether a book-specific detail (such as the rainbow horse) enters accounts after publication; that design appears to be new.

**Athappilly, G. K., Greyson, B., & Stevenson, I. (2006).** Do prevailing societal models influence reports of near-death experiences? A comparison of accounts reported before and after 1975. *Journal of Nervous and Mental Disease, 194*(3), 218–222. [doi:10.1097/01.nmd.0000202513.65079.1e](https://med.virginia.edu/perceptual-studies/?p=1674)

- *Type and access:* peer-reviewed; abstract opened; paywalled. UVA DOPS authors.
- *Sample and method:* Frequencies of Moody's fifteen features in twenty-four accounts collected before 1975 versus twenty-four later accounts matched on demographic and situational variables.
- *Findings:* Only tunnel phenomena were more frequent after 1975; the other fourteen features did not differ. The authors read this as evidence against strong cultural shaping.
- *Bearing:* The closest precedent for your pre/post design, but with small samples, a single cut-point, and generic features rather than distinctive, traceable details.

**Greyson, B. (2007).** Consistency of near-death experience accounts over two decades: Are reports embellished over time? *Resuscitation, 73*(3), 407–411. [doi:10.1016/j.resuscitation.2006.10.013](https://www.newdualism.org/nde-papers/Greyson/Greyson-Resuscitation_2007-73-407-411.pdf)

- *Type and access:* peer-reviewed; a PDF copy exists on an advocacy mirror; I saw only excerpts.
- *Findings:* Seventy-two NDErs retook the Greyson NDE Scale a mean of 19.1 years later with no significant change. In a [2007 letter](https://med.virginia.edu/perceptual-studies/wp-content/uploads/sites/360/2017/01/NDE56_RE-to-Augustins-Does-Paranormal-Perception-Occur-in-NDE.pdf), Greyson adds that encounters with mystical presences or deceased spirits declined slightly, not significantly, over that interval.
- *Bearing:* Measures stability of scale scores, not whether new specific details are added.

**Introvigne (1996)** (see Q4): Documents that the bestselling *Embraced by the Light* was edited between printings (for example, LDS-specific wording about Jesus and "spirit children" was softened for national editions). Introvigne concludes that the NDE literature itself has become one of the conditioning influences on later accounts.

**Author not shown (2023).** \[Study of fifty years of English-language nonfiction NDE books.\] *OMEGA: Journal of Death and Dying.* [doi:10.1177/00302228231209859](https://doi.org/10.1177/00302228231209859)

- *Type and access:* peer-reviewed; abstract only (seen via a mirror that did not show the author). Classifies NDE books into subgenres and concludes public knowledge of NDEs has been greatly shaped by published experiencer accounts; book output did not fall once the internet arrived.
- *Bearing:* A ready-made inventory for choosing which books to treat as "exposures."

**Greyson, B. (n.d.).** "False positive" claims of near-death experiences and "false negative" denials of near-death experiences. *Death Studies.* [UVA abstract](https://med.virginia.edu/perceptual-studies/book-publication/false-positive-claims-of-near-death-experiences-and-false-negative-denials-of-near-death-experiences/)

- *Type and access:* peer-reviewed; abstract only; year not shown on the page. Reports that prior knowledge of NDEs influences how often people claim an NDE their experience does not support, and how often they deny one it does.
- *Bearing:* Prior exposure may shape *who* submits an account, not only *what* is in it.

**Moore, L. E., & Greyson, B. (2017).** Characteristics of memories for near-death experiences. *Consciousness and Cognition, 51*, 116–124. [Free PDF (UVA)](https://med.virginia.edu/perceptual-studies/wp-content/uploads/sites/360/2017/03/NDE-85-MCQ-ConCog.pdf)

- *Type and access:* peer-reviewed; free; abstract opened. With 122 NDErs, the NDE memory scored higher on the Memory Characteristics Questionnaire than a real event, which scored higher than an imagined one. Liège studies report similar results (Thonnard et al., 2013, [PLOS ONE](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3609762/); Cassol et al., 2020, [Frontiers in Psychology](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.00888/epub)).
- *Bearing:* Self-rated vividness is high across these samples, so it is unlikely to separate original from later-assimilated content.

**French, C. C. (2001).** Dying to know the truth: Visions of a dying brain, or false memories? *The Lancet, 358*(9298), 2010–2011. [Record](https://research.gold.ac.uk/id/eprint/5137)

- *Type and access:* commentary by a skeptical psychologist; abstract only. Raises false-memory reconstruction as an alternative account.

**Popular and journalistic context (not research):** An [Aeon essay](https://aeon.co/essays/explaining-the-boom-in-kitschy-books-about-visiting-heaven) (author not shown in the excerpt) describes the "heaven tourism" genre's decline after Alex Malarkey publicly recanted *The Boy Who Came Back from Heaven*, and a 2014 Southern Baptist resolution criticizing the genre. A [New Republic piece](https://newrepublic.com/article/122790/falling-asleep-afterlife) notes Loren Pankratz's bibliography of nineteenth- and early-twentieth-century heaven-visit books, a possible historical baseline.

**Grave, C. (2025).** Radiant love and knowledge: Near-death experiences in modern America. University of North Dakota undergraduate poster. [Record](https://commons.und.edu/as-showcase/25)

- *Type and access:* student poster; abstract only. Compares American accounts and media depictions of the being of light before and after Moody; concludes the feature is not culturally shaped. Low evidential weight.

#### Q7. Distressing NDEs and underreporting

Most published estimates put distressing NDEs at 11–22% of NDEs, against outliers of 1% and "more than half." Greyson's 2023 review also reports an unpublished breakdown by religion, the only denomination-level figure I found anywhere in this search.

**Greyson, B. (2023).** The darker side of near-death experiences. *Journal of Scientific Exploration, 37*(4), 683–698. [doi:10.31275/20232843](https://med.virginia.edu/perceptual-studies/wp-content/uploads/sites/360/2024/01/Roehrs2024_Terminal-Lucidity-in-a-Pediatric-Oncology-Clinic.pdf)

- *Type and access:* peer-reviewed essay; open access; opened (the UVA file is misnamed but contains this article).
- *Prevalence estimates it compiles:* Garfield (1979) 22% of thirty-six; Lindley et al. (1981) 20% of fifty-five; Atwater (1992) up to 15% of 700+; Gibson (1996) 18% of sixty-eight; Rommer (2000, 2002) 18%; Cassol et al. (2019) 14% of 123. Outliers: 1% (Gallup & Proctor 1982; Ring 1984; Charland-Verville et al. 2014) and Rawlings's "more than half," which Greyson treats as unsupported and religiously motivated.
- *Unpublished UVA database (n = 546):* 437 pleasant, fifty-one neutral, fifty-eight (11%) distressing. The pleasant share is printed as both 80% and 76%; 437 of 546 is 80%.
- *By religion (n = 443, unpublished):* distressing in 13% of Catholics, 9% of Protestants, 8% of Jews, 6% of atheists, and 6% of agnostics; not significant. Distressing NDEs were 17% among those who fought for control versus 6% among those who let go.
- *Instrument bias:* Both the Weighted Core Experience Index and the Greyson NDE Scale weight pleasant emotions and omit unpleasant ones, which he suggests contributed to underrepresentation.
- *Religion and type:* He notes that Rommer's database (three times as many Catholics as Protestants) and Cassol's mostly Catholic European sample both found hellish NDEs more common, consistent with Ring's view that hellish NDEs are culturally elaborated inverted NDEs.
- *Bearing:* Gives a published range for checking whether a self-selected archive under- or over-represents distressing accounts, and is directly relevant to Q4's Catholic/Protestant question.

**Greyson, B., & Bush, N. E. (1992).** Distressing near-death experiences. *Psychiatry, 55*, 95–110. doi:10.1080/00332747.1992.11024583

- *Type and access:* peer-reviewed; citation only (described in Greyson 2023). Fifty distressing accounts yielding three types: inverted, void, and hellish.

**Bush, N. E., & Greyson, B. (2014).** Distressing near-death experiences: The basics. *Missouri Medicine, 111*(6), 486–491. [Free (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6173534)

- *Type and access:* clinical review; free; opened. Bush is past president of IANDS. Describes the three types and three common response patterns (warning, reductionism, long existential struggle). Greyson's 2023 reference list gives different page numbers; I used PMC's.

**Cassol, H., Martial, C., Annen, J., et al. (2019).** A systematic analysis of distressing near-death experience accounts. *Memory, 27*, 1122–1129. [Liège record](https://www.coma.uliege.be/publications/vivid-memories-from-hell-a-systematic-analysis-of-distressing-near-death-experience-accounts) · [ORBi](https://orbi.uliege.be/handle/2268/238014)

- *Type and access:* peer-reviewed; I saw only the record. Per Greyson (2023): seventeen of 123 (14%) were distressing (eight inverted, eight hellish, one void); four of the seventeen followed suicide attempts, versus one of 106 pleasant NDEs; distressing memories were as vivid as pleasant ones. Classification relied on the experiencer's rated emotion at the time.

**Ghasemiannejad Jahromi & Long (2020)** (see Q2): Ten of seventeen Iranian Shia experiencers reported some distressing content, though only two NDEs were predominantly or exclusively distressing. The authors suggest the gap partly reflects how Western studies dichotomize valence.

**Ait Melloul, A., Kinnunen, K., & Cardeña, E. (n.d.).** The phenomenology of distressing near-death experiences and their aftereffects. *Journal of Anomalous Experience and Cognition.* [Free PDF](https://journals.lub.lu.se/jaex/article/download/25433/23596/71441)

- *Type and access:* peer-reviewed; free; excerpt seen (volume and year not confirmed). Interpretative phenomenological analysis of eight thick distressing narratives drawn from the IANDS database; describes "hybrid" pleasant-distressing NDEs.

#### Q8. Questionnaire and demand effects

I found no experiment that varies whether experiencers are prompted about specific figures. The closest evidence is observational: on NDERF itself, a third of respondents who ticked the strongest life-review option did not describe a life review in their narrative, and a 2024 review found that published NDE content tends to echo questionnaire wording.

**King, R. A. (2022).** Life reviews, the Greyson scale, and false positives. *Journal of the Society for Psychical Research, 86*(1), 1–18. Described in **Greyson, B. (2023).** Correspondence: "Life reviews, the NDE Scale, and false positives." *JSPR, 87*(3), 184–186. [Free PDF (UVA)](https://med.virginia.edu/perceptual-studies/wp-content/uploads/sites/360/2025/11/Greyson2023_Correspondence_Life-reviews-the-NDE-Scale-and-false-positives.pdf)

- *Type and access:* society journal; King's article citation only, Greyson's letter opened.
- *King's findings (per Greyson):* Among 136 NDERF reports whose authors chose the strongest life-review option ("My past flashed before me, out of my control"), forty-three (32%) narratives did not mention a life review. In three internet surveys of the public, about 60% read that sentence as a revival of memories and about 40% as simply being close to death, or were unsure.
- *Greyson's check:* Of eighty-five UVA respondents who chose the same option, sixty-one (74%) described a life review in their narrative and twenty-two (26%) did not. Targeted follow-up questions drew a life review from thirteen of those twenty-two, leaving nine (11%). He recommends follow-up questioning rather than relying on either checkbox or narrative alone.
- *Bearing:* The only published measurement I found of NDERF checkbox-versus-narrative disagreement, and a direct precedent for comparing a figure item with narrative text.

**Kovoor, J. G., Santhosh, S., Stretton, B., et al. (2024).** Near-death experiences after cardiac arrest: A scoping review. *Discover Mental Health, 4*, Article 19. [doi:10.1007/s44192-024-00072-7](https://researchnow.flinders.edu.au/en/publications/near-death-experiences-after-cardiac-arrest-a-scoping-review/)

- *Type and access:* peer-reviewed, open access (CC-BY); abstract opened.
- *Findings:* Eleven prospective cardiac-arrest interview studies (n = 28–344). Reported NDE content tended to reflect the questionnaire's language rather than participants' own words.
- *Bearing:* Independent support for treating structured-item content and free-text content as different measurements.

**Greyson (2023)** (see Q7): The Weighted Core Experience Index and the Greyson NDE Scale weight pleasant emotions and omit unpleasant ones, which may have suppressed reports of distressing NDEs.

**Fracasso et al. (2010)** (see Q2): The Greyson NDE Scale item asks about "deceased relatives or religious (holy) spirits" in a single item.

**Martial, C., Simon, J., Puttaert, N., et al. (2020).** The Near-Death Experience Content (NDE-C) scale: Development and psychometric validation. *Consciousness and Cognition, 86*, 103049. [Free PDF (UVA)](https://med.virginia.edu/perceptual-studies/wp-content/uploads/sites/360/2020/11/Nov-2020-NDE-C-CC.pdf) · [Scale form](https://www.coma.uliege.be/wp-content/uploads/2025/04/nde-c-eng.pdf)

- *Type and access:* peer-reviewed; scale form opened. Its entity item asks about "a presence and/or an entity (who might be deceased)," again merging categories. A [UVA summary](https://www.uvahealth.com/news/scientists-aim-to-improve-how-we-understand-near-death-experiences) of a later Rasch comparison reports that the NDE-C's new items did not fit the established hierarchy consistently.
- *Bearing:* Neither standard instrument separates deceased persons, religious figures, and unidentified beings.

**Kondziella, D., Dreier, J. P., & Olsen, M. H. (2019).** Prevalence of near-death experiences and REM sleep intrusion in 1034 adults from 35 countries. *bioRxiv* preprint. [PDF](https://www.biorxiv.org/content/early/2019/01/28/532341.full.pdf)

- *Type and access:* preprint (a later journal version may exist; I did not confirm one); free; excerpt opened. Of 1,034 crowdsourced adults, 289 (28%) said they had had an NDE; those meeting the Greyson cutoff (n = 106) were about 10%. The authors also added a question on unpleasant experiences that the standard scale lacks.
- *Bearing:* Shows how far self-labeled "NDEs" exceed scale-defined ones when the term is used in the prompt.

**Knoblauch, H., Schmied, I., & Schnettler, B. (2001).** Different kinds of near-death experience: A report on a survey of near-death experiences in Germany. *Journal of Near-Death Studies, 20*(1), 15–29. [doi:10.1023/A:1011112727078](https://publications.igpp.de/index.cgi/bibliography/T5UNMGBH)

- *Type and access:* peer-reviewed; citation plus a related German-language [working-paper abstract](https://www.ssoar.info/ssoar/handle/document/663). A representative German sample found more than 4% reporting an NDE, no exclusive link to clinical death, and systematic East/West German differences. The NDE Scale was not used.
- *Bearing:* A population-based contrast to self-selected archives.

**Blackmore (1993)** (see Q2): Solicited Indian accounts without mentioning NDEs or tunnels, the clearest example of a deliberately non-leading prompt.

#### Q9. What religious people expect to meet at death

The best denominator data are Pew's 2021 US survey, which asks about meeting God, reuniting with loved ones, and reuniting with pets, but not about Jesus by name, St. Mary, or other saints. I found no survey that asks whom people expect to *meet* broken down by denomination.

**Pew Research Center (2021, November 23).** Views on the afterlife. In *Few Americans blame God or say faith has been shaken amid pandemic, other tragedies.* [Web page](https://www.pewresearch.org/religion/2021/11/23/views-on-the-afterlife/) · [Topline PDF](https://www.pewresearch.org/wp-content/uploads/sites/20/2021/11/PF_11.23.21_problem_of_evil_topline.pdf)

- *Type and access:* nonpartisan survey report; free; page opened (topline not opened). 6,485 US adults, September 20–26, 2021, weighted panel.
- *Heaven traits (share of all US adults saying "definitely" or "probably"):* free from suffering about 70%; reunited with deceased loved ones 65%; can meet God 62%; perfectly healthy bodies 60%; reunited with pets or animals 48%; can see Earth 44%; can become angels 43%; relationships with the living 25%.
- *Denominational findings in the text:* Catholics more than Protestants say one can feel the presence of the dead (86% vs. 71%), get help from them (68% vs. 49%), or communicate with them (57% vs. 46%). Belief that an out-of-body NDE is possible: Protestants 82%, Catholics 83%, unaffiliated 55%.
- *Bearing:* Usable priors for the deceased, God, and pet categories; the topline may carry per-denomination splits for each heaven trait, which I did not verify.

**Pew Research Center (2023).** Survey on interactions with deceased family members (Tevington & Corichi). Reported by [CNN](https://edition.cnn.com/2023/08/27/us/dreams-dead-relatives-study-trnd) and [ABC17](https://abc17news.com/?p=1209015).

- *Type and access:* survey; I saw only news coverage, not the Pew report. 5,079 US adults; 53% reported ever being visited by a dead relative in a dream "or some other form." Past-year contact of any of three kinds was reported by 58% of Catholics, 56% of historically Black Protestants, 52% of mainline Protestants, and 35% of evangelicals.
- *Bearing:* Suggests baseline familiarity with deceased-relative contact differs by tradition before any NDE.

**Kellehear, A., & Irwin, H. (1990).** Five minutes after death: A study of beliefs and expectations. *Journal of Near-Death Studies, 9*(2), 77–90. [doi:10.1007/BF01074208](https://link.springer.com/doi/10.1007/BF01074208)

- *Type and access:* peer-reviewed; abstract only. Of 508 respondents, a substantial minority expected to experience the main elements of an NDE in the first five minutes after death. I did not see a breakdown by denomination or by figure.
- *Bearing:* The only study I found that asks about expectations for the moment of death itself rather than the afterlife generally.

**Greyson, B., & Stevenson, I. (1980).** The phenomenology of near-death experiences. *American Journal of Psychiatry, 137*(10), 1193–1196. [Free PDF (UVA)](https://med.virginia.edu/perceptual-studies/wp-content/uploads/sites/360/2017/01/STE13_phenomenology-AJP.pdf)

- *Type and access:* peer-reviewed; free; excerpts seen. Seventy-eight self-selected NDErs (58% Protestant, 18% Catholic). Before their NDE, 50% had expected dying to be painful and only 3% expected it to be pleasant.
- *Bearing:* An early example of recording prior expectations alongside religious affiliation.

**Jensen, L. A. (2021).** Afterlife beliefs among evangelical and mainline Protestant children, adolescents, and adults: A cultural–developmental study in the U.S. [doi:10.1037/rel0000424](https://commons.clarku.edu/faculty_psychology/821)

- *Type and access:* peer-reviewed (an APA religion journal, per the DOI); abstract only. Interviews with 120 people; evangelicals and mainline Protestants differed on every analysis of afterlife belief, and descriptions of the afterlife were highly diverse.

**Polling context:** A 2021 [Church Times leader](https://churchtimes.co.uk/articles/2021/7-may/comment/leader-comment/leader-comment-beyond-the-grave) reports a Maru poll in which 47% of Americans, and 30% of Britons and Canadians, expected to meet someone they knew after death. I did not see the poll itself.

#### Q10. Computational and text-mining analyses

The published computational work uses latent semantic analysis (LSA) on the UVA and Liège collections, not NDERF. I found no published topic-model, classifier, or LLM coding study of the NDERF archive; NDERF-based papers so far rely on keyword search plus manual reading.

**Lange, R., Greyson, B., & Houran, J. (2015).** Using computational linguistics to understand near-death experiences: Concurrent validity for the Near Death Experience Scale. *Psychology of Consciousness: Theory, Research, and Practice, 2*(1), 79–89. doi:10.1037/cns0000040

- *Type and access:* peer-reviewed; citation only (described in the 2017 note below).
- *Method and findings:* LSA on 863 accounts from Greyson's UVA collection, 588 with NDE Scale scores. Linguistic patterns separated low from high scorers with 64% accuracy, driven mainly by seven factors (p < .001), which the authors said "defy a coherent conceptualization."

**Houran, J., Lange, R., & Greyson, B. (2017).** Research note: Exploring linguistic patterns in NDE accounts. *Journal of the Society for Psychical Research, 81*(4), 228–240. [Free PDF (UVA)](https://med.virginia.edu/perceptual-studies/wp-content/uploads/sites/360/2017/12/Exploring-linguistic-patterns-in-NDE-accounts-JSPR.pdf)

- *Type and access:* society journal; free; opened.
- *Content:* Lists the top-loading words on the seven LSA factors; religious terms (God, Christ, Lord, angel, demon, heaven, church) load alongside mundane ones. Describes the corpus: 67% female; 46% Protestant, 22% Catholic, 23% other religion, 9% atheist or agnostic; 80% pleasant, 11% unpleasant. Notes that LSA discards word order.
- *Bearing:* A worked LSA precedent on a comparable self-referred corpus, with a published religion breakdown for comparison.

**Martial, C., Cassol, H., Charland-Verville, V., et al. (2019).** Neurochemical models of near-death experiences: A large-scale study based on the semantic similarity of written reports. *Consciousness and Cognition, 69*, 52–69. [doi:10.1016/j.concog.2019.01.011](https://repositorio.uca.edu.ar/bitstream/123456789/14227/1/neurochemical-models-near-death.pdf)

- *Type and access:* peer-reviewed; free preprint opened. Liège and UVA authors, with Erowid's founders.
- *Sample and method:* 625 NDE narratives (about 624,000 words) from UVA and Liège, versus about 15,000 Erowid drug reports across 165 substances. NLTK lemmatization, tf-idf, LSA (20 singular values, robustness 5–145), PCA, and word2vec-based labeling.
- *Findings:* Ketamine reports were most similar to NDE narratives, followed by Salvia divinorum and serotonergic psychedelics. One principal component, labeled "disease / religion," captured religious and ceremonial vocabulary. The authors stress the analysis cannot validate or refute neurochemical models.
- *Bearing:* A reproducible pipeline (preprocessing choices, censoring of context words, dimension robustness checks) you could mirror or contrast with LLM coding.

**Martial, C., Cassol, H., Antonopoulos, G., et al. (2017).** Temporality of features in near-death experience narratives. *Frontiers in Human Neuroscience, 11*, 311. [Free (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5469194/)

- *Type and access:* peer-reviewed, open access; abstract opened. Coded the order of features in narratives; the most frequent sequence was OBE, tunnel, bright light, peace, but no prototypical sequence held across the sample.

**Ito, T., & Miura, F. (2016).** Characteristics of Japanese near-death experience: Text mining analysis of narratives. *Journal of International Society of Life Information Science, 34*(2), 120–125. [J-STAGE](https://www.jstage.jst.go.jp/article/islis/34/2/34_120/_article)

- *Type and access:* society journal research presentation; open access; abstract opened. Word-frequency and correspondence analysis of twenty-two narratives taken from a 2001 Japanese book; twelve of twenty-two mentioned both a river and flowers, contrasted with Western tunnel-and-light imagery.

**Greyson, B., Long, J., Holden, J. M., et al. (2025).** The veridical Near-Death Experience Scale: Construction and a first validation with human and artificial raters. *Frontiers in Psychology, 16.* [doi:10.3389/fpsyg.2025.1661390](https://public-pages-files-2025.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1661390/text)

- *Type and access:* peer-reviewed, open access; abstract opened. Thirteen experts built the scale by Delphi method; eleven human raters and three LLM-based raters then scored seventeen cases. In fourteen of seventeen (82.3%), human-AI agreement exceeded 75% when adjacent evidence levels were pooled.
- *Bearing:* The first NDE paper I found that formally compares LLM and human raters; the source of the seventeen cases was not stated in the abstract. See Q12.

#### Q11. Jeffrey Long's NDERF analyses and questionnaire versions

Long's peer-reviewed NDERF analyses are few; most of his archive statistics appear in two popular books. I could not reach NDERF's own pages with my tools, so I found no primary documentation of questionnaire versions; the only dated change I could confirm secondhand is a 2011 addition asking about encounters with God.

**Long, J. (2014).** Near-death experiences: Evidence for their reality. *Missouri Medicine, 111*(5), 372–380. [PMC6172100](https://pmc.ncbi.nlm.nih.gov/articles/PMC6172100/)

- *Type and access:* journal article (state medical association journal), free; I saw substantial excerpts but the full page was blocked by a CAPTCHA.
- *Methods as stated:* Sequentially shared accounts; single, first-hand, in English; NDE Scale score 7+. Over 3,700 NDEs were then posted; the questionnaire was available in more than twenty languages; nearly all submitters permit posting.
- *Findings in excerpts:* 287 NDEs had OBEs with enough detail to assess; a study of thirty-one people included fourteen blind from birth, nine of whom described vision. It also cites a review of 617 sequentially shared NDERF accounts.
- *Bearing:* Long's clearest published statement of NDERF inclusion rules; framed as evidence for survival.

**Long, J., & Perry, P. (2010).** *Evidence of the afterlife: The science of near-death experiences.* HarperOne.

- *Type and access:* popular bestseller; excerpts only. Says more than 1,300 NDErs answered "over one hundred questions" in NDERF's first ten years. Its "family reunions" argument holds that experiencers meet mostly the deceased rather than the living, and its "children's experiences" argument claims young children's NDEs rule out cultural conditioning ([Long's own summary](https://www.newdualism.org/nde-papers/Long/Long-_2012--1-2.pdf)). Neither claim comes with figure-level counts in what I saw.

**Adams, R. (2019).** \[Review of the book *God and the afterlife*, by J. Long with P. Perry\]. *Journal of Near-Death Studies, 37*(1), 52–55. [Free PDF (UNT)](https://digital.library.unt.edu/ark:/67531/metadc1752562/m2/1/high_res_d/37-1_Final_6._BR_Adams.pdf)

- *Type and access:* book review; free; opened. The reviewer is sympathetic but notes unclear methodology.
- *Content:* The 2010 book drew on over 3,000 NDERF reports from 1998 to about 2009. In 2011 the website survey was apparently modified to ask specifically about encounters with God; of over 1,300 NDEs registered 2011–2014, 420 answered yes.
- *Bearing:* Independent confirmation that a figure-specific prompt entered the NDERF form around 2011, close to the change you already noted.

**Long & Perry (2016)** and **Tressoldi & Long (2023)**: see Q1.

**Ghasemiannejad, Long, et al. (2014)** and **Ghasemiannejad Jahromi & Long (2020)**: see Q2. These use Farsi-website recruitment and interviews, not the NDERF archive.

**Long, J. (2022).** Evidence for survival of consciousness in near-death experiences: Decades of science and new insights. Bigelow Institute for Consciousness Studies essay.

- *Type and access:* contest essay (runner-up; Long later became a BICS director per [this report](https://ruickbie.com/tag/jeffrey-long/)); not opened. Tressoldi & Long cite it for a survey in which 782 of 834 NDErs (93.8%) said their NDE was definitely real.

**Long, J., & Woollacott, M. (2024).** Long-term transformational effects of near-death experiences. *Explore, 20*(5), 103030. doi:10.1016/j.explore.2024.103030

- *Type and access:* peer-reviewed; citation only (via [Psychology Today](https://www.psychologytoday.com/us/blog/understanding-grief/202411/can-being-close-to-death-transform-your-life)). Compares life changes after NDEs with life-threatening events without NDEs; I could not confirm the data source.

**Holden, J. M., Long, J., & MacLurg, B. J. (2009).** Characteristics of Western near-death experiencers. In Holden, Greyson & James (Eds.), *The Handbook of Near-Death Experiences.* Praeger. [Table of contents](https://library.usi.edu/record/331183)

- *Type and access:* scholarly handbook chapter; citation only.

**King (2022) and Greyson (2023):** see Q8 for the only published comparison of NDERF checkbox answers with the accompanying narratives.

**Not found:** I searched for a Long-authored pre/post-1975 comparison of NDERF accounts and found none, and I found no published description of the questionnaire's item history beyond the 2011 change. Interviews give inconsistent item counts ("over one hundred" in the 2010 book; "more than 60" in a [Guideposts interview](https://guideposts.org/?p=110936)).

#### Q12. Documented AI use on or with NDERF

I could confirm two things from primary sources: an NDERF-partnered pilot that uses AI to structure selected medical reports for physician review, and a 2025 paper (co-authored by Long) that compared LLM raters with human raters. I could not confirm AI-generated topic tags on search.nderf.org, AI-assisted editing of accounts, retrieval-based chat tools, or any LLM analysis of the whole corpus.

**Future of Inquiry Institute (2026).** NDERF AI: AI-assisted medical review infrastructure for near-death experience reports. Project brief. [futureofinquiry.org/nderf-ai](https://www.futureofinquiry.org/nderf-ai/)

- *Type and access:* collaborator's project page (not peer-reviewed); opened. It links to a separate "NDERF AI" site that my tools could not open.
- *What it states:* The institute is collaborating with NDERF and Long on a "mechanism-neutral" workflow. The current pilot covers *selected* "Category A" reports involving cardiac arrest, resuscitation, or medically extreme contexts. AI separates claim extraction, medical context, verification status, and ordinary information pathways before physicians review the interpretation; raw public report text and claim-provenance anchors are retained.
- *What it does not state:* model names, number of reports, dates, outputs released, or any publication.
- *Bearing:* Primary evidence that NDERF has partnered on LLM-assisted processing of a subset of accounts; it does not document tagging, editing, or chat on NDERF itself.

**Greyson, Long, et al. (2025)** (see Q10): Three LLM-based raters scored seventeen candidate veridical NDE cases alongside eleven humans, agreeing within adjacent evidence levels in fourteen of seventeen cases. The abstract does not say whether the cases came from NDERF.

**search.nderf.org, AI tags, and chat tools:** I found no NDERF documentation, paper, presentation, or blog post describing AI-generated topic tags, AI-assisted editing or presentation of accounts, retrieval-based chat, or LLM-generated statistics. My tools could not load nderf.org pages directly, so absence here means "not found," not "does not exist." You would need to check the site's own help or about pages.

**A caution about secondary sources used in this document:** The SPR [Psi Encyclopedia](https://psi-encyclopedia.spr.ac.uk/articles/deathbed-visions-research/), which I used for several author and study summaries, states that it uses AI in editing and that its article summaries and highlights are AI-generated. I relied on the signed article bodies, not those summaries.

#### Most worth reading in full

1. **Kelly (2001), Death Studies** (Q3): the only published denominators for deceased, living, religious, and animal figures in one NDE collection. Free.
2. **King (2022) with Greyson's 2023 letter, JSPR** (Q8): direct evidence that NDERF checkbox answers and narratives diverge, with a follow-up correction method.
3. **Athappilly, Greyson & Stevenson (2006), J Nerv Ment Dis** (Q6): the existing pre/post-exposure design your book-detail test would extend.
4. **Greyson (2023), J Scientific Exploration** (Q7): a compiled prevalence range for distressing NDEs, plus the only Catholic/Protestant split I found. Free.
5. **Martial et al. (2019), Consciousness and Cognition** (Q10): a documented text-analysis pipeline on 625 narratives, useful as a methods foil for LLM coding. Free preprint.
6. **Ghasemiannejad Jahromi & Long (2020), JNDS** (Q2): concrete examples of living, inferred, and tradition-specific figure identities. Free.
7. **Pew Research Center (2021), Views on the afterlife** (Q9): US priors for meeting God, loved ones, and pets, with denominational context. Free.
8. **Tressoldi & Long (2023), Qeios** (Q1): the only NDERF-derived Jesus-versus-God figure; read with the pre-registration caution noted there.

#### Where I found little or nothing

- **Q1:** No study reports Jesus or other named-figure rates conditioned on the experiencer's prior *tradition*; the closest splits are religious versus non-religious.
- **Q4:** No counts of St. Mary or other saints in NDEs or deathbed visions, and no Catholic/Protestant comparison of figures. The Catholic/St. Mary claim appears only as an unsourced assertion.
- **Q5:** One count of pets (Kelly, two of 274); no study of Rainbow Bridge imagery in NDE accounts, and no reliable dated history of the poem's spread.
- **Q6:** No test of whether a distinctive detail from a specific book or film appears in accounts after publication.
- **Q8:** No experiment varying prompts about specific figures; evidence is observational only.
- **Q9:** No survey asks whom people expect to *meet* (Jesus, St. Mary, saints, pets) broken down by denomination.
- **Q10:** No published topic-model, classifier, or LLM analysis of the NDERF archive.
- **Q11:** No primary documentation of NDERF questionnaire versions; only a secondhand note of a 2011 God item.
- **Q12:** No documentation of AI-generated tags on search.nderf.org, AI-assisted editing, or chat tools; only the Future of Inquiry pilot and the 2025 vNDE paper.
