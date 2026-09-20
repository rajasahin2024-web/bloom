/* ═══ BLOOM — skill content: reading, listening, writing, speaking, placement ═══ */

/* ── READING ──
   IELTS question types: mcq, tfng, ynng, headings, matching, completion */
const READING = [
  {
    id:'r-bees', exam:'ielts-a', level:'B2', band:6.5, mins:20, words:742,
    title:'The Return of the Urban Bee',
    topic:'Environment', source:'Adapted for Bloom · Academic Reading Passage 1',
    intro:'You should spend about 20 minutes on Questions 1–10, which are based on the passage below.',
    paras:[
      { k:'A', t:'For most of the twentieth century, the honeybee was a creature of the countryside. Hives sat at the edges of orchards and rape fields, and beekeeping was understood as a rural occupation, tied to the rhythm of agricultural flowering. In the last two decades, however, that assumption has quietly reversed. Surveys in London, Berlin, Paris and Tokyo all record substantially higher hive densities inside city boundaries than in the farmland surrounding them.' },
      { k:'B', t:'The reason is not that cities are gentle places for insects. It is that modern arable farming has become remarkably hostile to them. A field of a single crop offers an enormous quantity of nectar for perhaps three weeks and almost nothing for the remaining forty-nine. Hedgerows, which once supplied the gaps in that calendar, have been removed at scale to accommodate larger machinery. Set against this, the disorder of a city becomes an advantage: window boxes, cemeteries, railway embankments and neglected car parks between them flower from March until October.' },
      { k:'C', t:'Temperature reinforces the effect. The urban heat island — the tendency of dense built-up areas to hold several degrees more warmth than their surroundings — extends the flowering season at both ends. Dr Helena Voss, who has monitored colonies across three German cities since 2011, found that urban hives began foraging on average eleven days earlier in spring and continued nine days later into autumn than rural colonies only forty kilometres away. Over a season, that difference in foraging days translated into a measurable increase in stored honey.' },
      { k:'D', t:'Enthusiasm has, however, outrun evidence. As rooftop beekeeping became fashionable among corporations seeking visible environmental credentials, hive numbers in some districts rose faster than the flowers available to support them. Voss is blunt about the consequence. "A honeybee colony is livestock, not wildlife," she says. "Putting three hives on a roof in a district with no forage is the equivalent of grazing cattle on concrete, and the animals that suffer are the wild bees already living there."' },
      { k:'E', t:'That distinction matters more than most city dwellers realise. Britain has around 270 bee species, of which only one is the domesticated honeybee; the remainder are solitary bees and bumblebees that nest in dead wood, bare soil and hollow stems. These species are, on many measures, the more efficient pollinators, and they are also the ones in steepest decline. Where honeybee colonies are stocked densely, competition for a fixed quantity of nectar demonstrably reduces the body size and reproductive success of nearby solitary bees.' },
      { k:'F', t:'The policy conclusion drawn by a growing number of urban ecologists is therefore counter-intuitive. Rather than installing more hives, cities should be planting more forage and leaving more mess: unmown verges, standing dead wood, patches of bare earth for ground-nesting species. Amsterdam, which has pursued exactly this approach since 2015 while capping new hive permits, has recorded a rise in wild bee species richness even as its honeybee population has remained flat. The lesson, Voss argues, is that a city can be genuinely good for bees — but only if it stops confusing beekeeping with conservation.' },
    ],
    qs:[
      { type:'headings', instr:'Questions 1–6: The passage has six paragraphs, A–F. Choose the correct heading for each paragraph from the list below.',
        bank:['i. A warming city lengthens the working year','ii. The historical decline of rural beekeeping','iii. An unexpected shift in where bees now live','iv. Why farmland has become a poor habitat','v. The economics of urban honey production','vi. Confusing a farmed animal with a wild one','vii. The overlooked majority of bee species','viii. What cities should do instead','ix. Training new urban beekeepers'],
        items:[
          { q:'Paragraph A', a:'iii', e:'Paragraph A establishes that hive densities are now higher in cities than in farmland — an unexpected reversal.' },
          { q:'Paragraph B', a:'iv', e:'The paragraph explains monoculture and hedgerow removal, making farmland hostile.' },
          { q:'Paragraph C', a:'i', e:'The urban heat island extends the foraging season at both ends.' },
          { q:'Paragraph D', a:'vi', e:'Voss\'s quotation makes exactly this point: a colony is livestock, not wildlife.' },
          { q:'Paragraph E', a:'vii', e:'269 of 270 British species are not honeybees, and they are declining fastest.' },
          { q:'Paragraph F', a:'viii', e:'The paragraph sets out the alternative policy: plant forage, cap hives.' },
        ] },
      { type:'tfng', instr:'Questions 7–10: Do the following statements agree with the information given in the passage? Write TRUE, FALSE or NOT GIVEN.',
        items:[
          { q:'Hive densities in Tokyo are higher inside the city than in the surrounding farmland.', a:'TRUE', e:'Paragraph A names Tokyo among cities recording higher urban hive densities.' },
          { q:'Hedgerows were removed primarily to increase crop yields.', a:'NOT GIVEN', e:'The passage says hedgerows were removed to accommodate larger machinery, but never states the primary motive was yield.' },
          { q:'Urban colonies in Voss\'s study foraged for roughly twenty extra days per year.', a:'TRUE', e:'Eleven days earlier plus nine days later gives twenty additional foraging days.' },
          { q:'Amsterdam has increased the number of beekeeping permits it issues since 2015.', a:'FALSE', e:'Paragraph F states Amsterdam has capped new hive permits.' },
        ] },
    ],
  },
  {
    id:'r-sleep', exam:'ielts-a', level:'C1', band:7.5, mins:20, words:698,
    title:'The Late Chronotype Problem',
    topic:'Health', source:'Adapted for Bloom · Academic Reading Passage 2',
    intro:'You should spend about 20 minutes on Questions 1–9, which are based on the passage below.',
    paras:[
      { k:'A', t:'Human beings do not all sleep on the same schedule, and the variation is neither laziness nor habit. Chronotype — the timing of an individual\'s internal circadian clock — is substantially heritable, with twin studies attributing roughly half the variance to genetics. Roughly one adult in five is a genuine late chronotype, whose body will not release melatonin until well after midnight regardless of how early the alarm is set.' },
      { k:'B', t:'The mismatch between this internal clock and the external demands of school and work has acquired a clinical name: social jetlag. It is measured as the difference between the midpoint of sleep on free days and on working days. A person who sleeps from midnight to eight at the weekend but from eleven to six on weekdays carries ninety minutes of social jetlag — the physiological equivalent, researchers argue, of flying across a time zone and back every week of their lives.' },
      { k:'C', t:'The consequences are not confined to tiredness. Cohort studies have linked chronic social jetlag to elevated body mass index, insulin resistance and depressive symptoms, with effect sizes that persist after controlling for total sleep duration. In other words, it is not only how long people sleep that matters, but whether they sleep at the hours their biology expects.' },
      { k:'D', t:'Adolescence complicates the picture further, because the circadian clock shifts later during puberty in almost every population studied and does not shift back until the early twenties. A teenager asked to sit an examination at eight in the morning is, in circadian terms, being tested in the middle of their biological night. When Seattle public schools delayed their start time from 07:50 to 08:45 in 2016, researchers recorded a thirty-four-minute increase in median sleep duration and a rise in final grades, alongside a fall in reported absences.' },
      { k:'E', t:'Yet the policy has spread slowly, and the obstacles are logistical rather than scientific. School bus fleets are typically shared across age groups on staggered routes; parental working hours are fixed; after-school sport competes for daylight. Critics also note that the Seattle study could not fully separate the effect of extra sleep from that of a generally better-resourced district, though subsequent replications in Singapore and the Netherlands have reported comparable gains.' },
      { k:'F', t:'For adults, the remedies are individual rather than institutional. Bright morning light advances the clock; evening screen light delays it. Consistency matters more than duration: a fixed wake time, held even at weekends, will gradually pull a late chronotype earlier, whereas a weekend lie-in re-establishes the drift within days. None of this converts a night owl into a morning lark. It merely narrows the gap between what the body wants and what the timetable demands.' },
    ],
    qs:[
      { type:'mcq', instr:'Questions 1–4: Choose the correct letter, A, B, C or D.',
        items:[
          { q:'According to the passage, chronotype is', o:['entirely determined by lifestyle habits.','roughly half attributable to genetic factors.','fixed permanently at birth.','identical across all adults.'], c:1, e:'Paragraph A: twin studies attribute roughly half the variance to genetics.' },
          { q:'Social jetlag is calculated by comparing', o:['total sleep on weekdays and weekends.','the midpoint of sleep on free and working days.','bedtime on Friday and Monday.','melatonin levels before and after travel.'], c:1, e:'Paragraph B defines it precisely as the difference between sleep midpoints.' },
          { q:'The health findings described in Paragraph C are notable because they', o:['apply only to adolescents.','disappear when sleep duration is controlled for.','remain significant even after controlling for sleep duration.','have not been replicated.'], c:2, e:'The paragraph stresses effects persist after controlling for total sleep duration.' },
          { q:'What does the writer suggest about the Seattle findings?', o:['They have been contradicted by later studies.','They were flawed and have been withdrawn.','They may be confounded but are supported by later work elsewhere.','They apply only to examination performance.'], c:2, e:'Paragraph E raises the confound, then cites Singapore and the Netherlands replications.' },
        ] },
      { type:'completion', instr:'Questions 5–9: Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.',
        items:[
          { q:'The circadian clock shifts later during ______, and does not return until the early twenties.', a:'puberty', e:'Paragraph D: "the circadian clock shifts later during puberty".' },
          { q:'Seattle recorded a rise in final grades and a fall in reported ______.', a:'absences', e:'Paragraph D names the fall in reported absences.' },
          { q:'The barriers to later school start times are described as ______ rather than scientific.', a:'logistical', e:'Paragraph E: "the obstacles are logistical rather than scientific".' },
          { q:'Bright morning light ______ the internal clock.', a:'advances', e:'Paragraph F: "Bright morning light advances the clock".' },
          { q:'For adults, ______ matters more than sleep duration.', a:'consistency', e:'Paragraph F: "Consistency matters more than duration".' },
        ] },
    ],
  },
  {
    id:'r-gt-housing', exam:'ielts-g', level:'B1', band:5.5, mins:15, words:412,
    title:'Tenancy Information for New Residents',
    topic:'Everyday life', source:'Bloom · General Training Section 1',
    intro:'Questions 1–8: Read the notice below and answer the questions.',
    paras:[
      { k:'1', t:'WELCOME TO RIVERBANK COURT. This notice explains the arrangements every new tenant needs to know during the first month of a tenancy. Please keep it somewhere accessible; a further copy is available from the site office on weekdays between 09:00 and 16:30.' },
      { k:'2', t:'RENT AND DEPOSITS. Rent is payable monthly in advance, on or before the first working day of each month, by standing order only. Cash is not accepted at the site office under any circumstances. Your deposit, equal to five weeks\' rent, is held in a government-approved protection scheme and will be returned within ten working days of the final inspection, less any agreed deductions.' },
      { k:'3', t:'REPAIRS. Report all repairs through the online portal. Emergencies — defined as a total loss of heating, water or electricity, or any situation posing a risk to safety — are attended within four hours, day or night. Routine repairs such as dripping taps or faulty door handles are completed within fifteen working days. Tenants who arrange their own contractors without written approval will be charged for the work.' },
      { k:'4', t:'REFUSE AND RECYCLING. General waste bins are emptied on Tuesdays; recycling is collected on alternate Fridays. Cardboard must be flattened. Bulky items such as mattresses and furniture will not be taken by the standard collection and must be booked separately through the council, for which a fee applies.' },
      { k:'5', t:'PARKING AND VISITORS. Each flat is allocated one permit. Visitor parking is limited to four hours and requires a paper voucher displayed on the dashboard; vouchers are issued free from the site office. Vehicles parked without a valid permit or voucher may be clamped by the management company.' },
    ],
    qs:[
      { type:'tfng', instr:'Questions 1–4: Do the following statements agree with the information in the notice? Write TRUE, FALSE or NOT GIVEN.',
        items:[
          { q:'Tenants may pay their rent in cash at the site office.', a:'FALSE', e:'Section 2 states cash is not accepted under any circumstances.' },
          { q:'The deposit is equal to one month\'s rent.', a:'FALSE', e:'The deposit is five weeks\' rent, not one month.' },
          { q:'Most tenants receive their full deposit back.', a:'NOT GIVEN', e:'The notice explains the process but says nothing about how many tenants get the full amount.' },
          { q:'A heating failure counts as an emergency repair.', a:'TRUE', e:'Section 3 defines total loss of heating as an emergency.' },
        ] },
      { type:'completion', instr:'Questions 5–8: Complete the sentences. Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.',
        items:[
          { q:'Emergency repairs are attended within ______ hours.', a:'four', e:'Section 3: "attended within four hours, day or night".' },
          { q:'Recycling is collected on alternate ______.', a:'Fridays', e:'Section 4 gives alternate Fridays for recycling.' },
          { q:'Each flat receives ______ parking permit.', a:'one', e:'Section 5: "Each flat is allocated one permit".' },
          { q:'Visitor parking is limited to ______ hours.', a:'four', e:'Section 5 sets a four-hour visitor limit.' },
        ] },
    ],
  },
];

/* ── LISTENING ──
   Simulated audio: the transcript is revealed only after answering,
   with a scripted "playback" timeline so the practice stays honest. */
const LISTENING = [
  {
    id:'l-library', exam:'ielts-a', part:1, level:'B1', band:5.5, secs:210,
    title:'Enrolling at the City Library',
    kind:'Conversation · everyday context',
    speakers:['Librarian','Amina'],
    script:[
      { s:0, w:'Librarian', t:'Good morning, City Central Library. How can I help?' },
      { s:1, w:'Amina', t:'Hello, I would like to join the library, please. I have just moved into the area.' },
      { s:0, w:'Librarian', t:'Of course. Can I take your full name?' },
      { s:1, w:'Amina', t:'Amina Bakr. That is B-A-K-R.' },
      { s:0, w:'Librarian', t:'Thank you. And your address?' },
      { s:1, w:'Amina', t:'Flat 4, 62 Wilmslow Road.' },
      { s:0, w:'Librarian', t:'Sixty-two Wilmslow Road, flat four. And a contact number?' },
      { s:1, w:'Amina', t:'It is oh-seven-nine-double-four, three-one-two, eight-oh-six.' },
      { s:0, w:'Librarian', t:'Lovely. Now, standard membership is free, but there is a three-pound charge if you would like the reference collection added.' },
      { s:1, w:'Amina', t:'Yes, please, I will take that. How many books can I borrow at once?' },
      { s:0, w:'Librarian', t:'Twelve items, for three weeks, and you can renew twice online unless somebody has reserved the title.' },
      { s:1, w:'Amina', t:'And is there a fine if I am late?' },
      { s:0, w:'Librarian', t:'Twenty pence a day per item, capped at eight pounds. One last thing — the library closes early on Wednesdays, at half past four.' },
    ],
    qs:[
      { type:'completion', instr:'Questions 1–6: Complete the membership form. Write ONE WORD OR A NUMBER for each answer.',
        items:[
          { q:'Surname: ______', a:'Bakr', e:'She spells it out: B-A-K-R.' },
          { q:'Address: Flat 4, ______ Wilmslow Road', a:'62', e:'"Flat 4, 62 Wilmslow Road", confirmed back by the librarian.' },
          { q:'Reference collection charge: £______', a:'3', e:'"a three-pound charge if you would like the reference collection".' },
          { q:'Maximum items on loan: ______', a:'12', e:'"Twelve items, for three weeks".' },
          { q:'Daily fine per item: ______ pence', a:'20', e:'"Twenty pence a day per item".' },
          { q:'Wednesday closing time: ______', a:'4.30', e:'"closes early on Wednesdays, at half past four".' },
        ] },
    ],
  },
  {
    id:'l-lecture', exam:'ielts-a', part:4, level:'C1', band:7.5, secs:265,
    title:'Lecture: The Economics of Water Pricing',
    kind:'Academic monologue',
    speakers:['Lecturer'],
    script:[
      { s:0, w:'Lecturer', t:'Right, in today\'s session I want to look at why water is almost universally underpriced, and what happens when a city finally corrects that.' },
      { s:0, w:'Lecturer', t:'The starting point is that water has an unusual cost structure. Around eighty-five per cent of the cost of supplying it is fixed — reservoirs, treatment plants, the pipe network. The marginal cost of the next litre through an existing pipe is close to zero.' },
      { s:0, w:'Lecturer', t:'That creates an obvious political temptation. If the marginal cost is nearly nothing, why charge for volume at all? Many utilities historically did not: they levied a flat annual fee and metered nothing.' },
      { s:0, w:'Lecturer', t:'The predictable consequence is that consumption is insensitive to scarcity. In unmetered systems, per-capita use tends to run thirty to forty per cent above metered equivalents in the same climate.' },
      { s:0, w:'Lecturer', t:'The standard corrective is what economists call an increasing block tariff. The first block — enough for drinking, cooking and basic hygiene, usually set around fifty litres per person per day — is priced very low or given free. Each subsequent block costs progressively more.' },
      { s:0, w:'Lecturer', t:'Cape Town is the case study everybody now cites. During the drought that peaked in 2018, the city combined steeply rising block tariffs with individual household consumption data published online. Residential demand fell by roughly half in under two years, and — this is the part that surprises people — it did not rebound fully when the rains returned.' },
      { s:0, w:'Lecturer', t:'The lesson is that price change accompanied by visible information produces durable behaviour change, whereas price change alone tends to produce a temporary one. That distinction is what I would like you to focus on in the reading for next week.' },
    ],
    qs:[
      { type:'mcq', instr:'Questions 1–3: Choose the correct letter, A, B or C.',
        items:[
          { q:'What proportion of water supply costs are fixed?', o:['About 50 per cent','About 85 per cent','Close to zero'], c:1, e:'"Around eighty-five per cent of the cost … is fixed".' },
          { q:'Unmetered households typically use', o:['30–40% more than metered ones.','the same as metered ones.','30–40% less than metered ones.'], c:0, e:'"per-capita use tends to run thirty to forty per cent above metered equivalents".' },
          { q:'What surprised observers about Cape Town?', o:['Demand fell only slightly.','Demand did not fully rebound afterwards.','Tariffs had to be abandoned.'], c:1, e:'"it did not rebound fully when the rains returned".' },
        ] },
      { type:'completion', instr:'Questions 4–6: Complete the notes. Write NO MORE THAN TWO WORDS OR A NUMBER.',
        items:[
          { q:'The corrective policy is called an increasing ______ tariff.', a:'block', e:'"what economists call an increasing block tariff".' },
          { q:'The first block is usually around ______ litres per person per day.', a:'50', e:'"usually set around fifty litres per person per day".' },
          { q:'Durable change requires price change plus visible ______.', a:'information', e:'"price change accompanied by visible information produces durable behaviour change".' },
        ] },
    ],
  },
  {
    id:'l-tour', exam:'ielts-a', part:2, level:'B2', band:6.5, secs:190,
    title:'Museum Orientation Talk',
    kind:'Monologue · social context',
    speakers:['Guide'],
    script:[
      { s:0, w:'Guide', t:'Welcome to the Maritime Museum. Before we begin, a few practical points about the building.' },
      { s:0, w:'Guide', t:'We are standing in the entrance hall. Directly ahead of you, past the ticket desk, is the Great Hall, which houses the full-scale reconstruction of the trading vessel. That is the one exhibit everybody photographs.' },
      { s:0, w:'Guide', t:'To your left, through the double doors, is the Navigation Gallery. Please note it is closed for re-lighting until the fourteenth of next month.' },
      { s:0, w:'Guide', t:'To your right you will find the cafe, which serves hot food until two o\'clock, and beyond it the education suite, which is reserved for school groups on weekday mornings.' },
      { s:0, w:'Guide', t:'The cloakroom is downstairs, opposite the lifts. Large bags must be left there — nothing bigger than a small rucksack is allowed in the galleries.' },
      { s:0, w:'Guide', t:'Finally, photography is permitted throughout except in the temporary exhibition on the upper floor, where the loan agreement forbids it. Flash is never allowed anywhere in the building.' },
    ],
    qs:[
      { type:'matching', instr:'Questions 1–5: Match each area with the correct description. Choose from the list A–G.',
        bank:['A. Closed for maintenance','B. Reserved for school groups on weekday mornings','C. Houses the vessel reconstruction','D. Serves hot food until 2 p.m.','E. Located downstairs opposite the lifts','F. Free entry after 4 p.m.','G. Open only at weekends'],
        items:[
          { q:'Great Hall', a:'C', e:'"the Great Hall, which houses the full-scale reconstruction of the trading vessel".' },
          { q:'Navigation Gallery', a:'A', e:'"closed for re-lighting until the fourteenth of next month".' },
          { q:'Cafe', a:'D', e:'"serves hot food until two o\'clock".' },
          { q:'Education suite', a:'B', e:'"reserved for school groups on weekday mornings".' },
          { q:'Cloakroom', a:'E', e:'"downstairs, opposite the lifts".' },
        ] },
      { type:'tfng', instr:'Questions 6–7: TRUE, FALSE or NOT GIVEN.',
        items:[
          { q:'Photography is banned in the temporary exhibition.', a:'TRUE', e:'"permitted throughout except in the temporary exhibition".' },
          { q:'Flash photography is allowed in the Great Hall.', a:'FALSE', e:'"Flash is never allowed anywhere in the building".' },
        ] },
    ],
  },
];

/* ── WRITING PROMPTS ── */
const WRITING_T1 = [
  { id:'w1-line', kind:'Line graph', level:'B2', topic:'Transport',
    prompt:'The graph below shows the number of journeys made by four modes of transport in a European city between 2005 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    plate:'Line graph · car, bus, rail and cycle journeys, 2005–2025 (millions per year)',
    data:{ years:[2005,2010,2015,2020,2025], series:[
      { n:'Car',   v:[48,52,49,38,34], c:'var(--coral)' },
      { n:'Bus',   v:[22,20,19,14,17], c:'var(--amber)' },
      { n:'Rail',  v:[14,18,24,19,31], c:'var(--sky)'   },
      { n:'Cycle', v:[3,5,11,18,27],   c:'var(--leaf-500)' } ] },
    keyFeatures:['Car journeys fell throughout, with the sharpest drop between 2015 and 2020.','Cycling rose ninefold and by 2025 had almost overtaken car use.','Rail dipped in 2020 before recovering to become the second most used mode.','Bus was the only mode that both fell and then partially recovered without exceeding its starting level.'],
    model:'The line graph compares the annual number of journeys made by car, bus, rail and bicycle in a European city over a twenty-year period from 2005.\n\nOverall, private car use declined steadily across the period, while cycling grew dramatically from a negligible base. Rail travel also expanded substantially, whereas bus journeys were the only mode to end the period below their 2005 figure without a clear upward trend.\n\nIn 2005 the car dominated, accounting for 48 million journeys, more than twice the figure for buses. Car use rose marginally to 52 million by 2010 before falling consistently thereafter, reaching just 34 million in 2025. Cycling followed the opposite trajectory. From only 3 million journeys in 2005 it climbed slowly to 11 million in 2015, then surged to 27 million by 2025, nearly matching car use.\n\nRail journeys rose from 14 million to 24 million between 2005 and 2015 before dipping to 19 million in 2020, a decline that was more than reversed over the following five years to reach a peak of 31 million. Bus use, by contrast, contracted from 22 million to a low of 14 million in 2020 and recovered only partially, finishing at 17 million.',
    band:8, wordsMin:150 },
  { id:'w1-process', kind:'Process diagram', level:'C1', topic:'Manufacturing',
    prompt:'The diagram below shows how recycled paper is produced. Summarise the information by selecting and reporting the main features.',
    plate:'Process diagram · seven-stage recycled paper production',
    steps:['Collection of waste paper','Sorting by grade','Pulping with water and chemicals','Screening to remove contaminants','De-inking by flotation','Bleaching and refining','Pressing, drying and reeling'],
    keyFeatures:['The process is linear with seven stages and no feedback loop.','It begins with collection and ends with the finished reel.','Two cleaning stages — screening and de-inking — occur consecutively.','Water and chemicals are the two external inputs.'],
    model:'The diagram illustrates the seven stages involved in manufacturing paper from recycled waste, beginning with collection and culminating in a finished reel.\n\nOverall, the process is entirely linear, with no material returned to an earlier stage, and it can be divided into three broad phases: gathering and sorting, cleaning, and final production. Two external inputs are required, namely water and chemicals.\n\nAt the outset, waste paper is collected and transported to the processing facility, where it is sorted by grade so that materials of similar quality are handled together. The sorted paper is then pulped, a stage in which water and chemicals are added to break the fibres down into a slurry.\n\nOnce pulped, the material undergoes two consecutive cleaning stages. It is first screened to remove contaminants such as staples and plastic, after which ink is separated from the fibres by flotation. The cleaned pulp is subsequently bleached and refined to achieve the required colour and consistency. In the final stage, the pulp is pressed to remove excess water, dried, and wound onto reels ready for distribution.',
    band:8.5, wordsMin:150 },
  { id:'w1-letter', kind:'Letter (General Training)', level:'B2', topic:'Complaint',
    prompt:'You recently bought a laptop from an online retailer, but it developed a fault within two weeks. Write a letter to the company. In your letter: explain what you bought and when; describe the problem; say what you would like them to do.\n\nBegin your letter: Dear Sir or Madam,',
    keyFeatures:['Semi-formal register throughout, no contractions.','All three bullet points covered with roughly equal weight.','Clear purpose stated in the opening sentence.','Closing with "Yours faithfully" because the recipient is unnamed.'],
    model:'Dear Sir or Madam,\n\nI am writing to report a fault with a laptop purchased from your website and to request a replacement.\n\nOn 14 August I ordered a Vantage Pro 14 laptop, order number VP-88431, which was delivered three days later. The machine performed normally for the first fortnight.\n\nSince last Tuesday, however, the screen has flickered persistently and the device now shuts down without warning, typically after twenty minutes of use. I have reinstalled the operating system and updated the display drivers, as suggested in your online troubleshooting guide, but neither measure has resolved the problem. As I rely on the laptop for my university coursework, this has caused considerable disruption.\n\nGiven that the fault appeared well within the warranty period, I would be grateful if you could arrange a replacement unit rather than a repair, together with a prepaid label for returning the faulty machine. If a replacement is not available, I would accept a full refund.\n\nI look forward to your reply within seven working days.\n\nYours faithfully,\nAmina Bakr',
    band:8, wordsMin:150 },
];

const WRITING_T2 = [
  { id:'w2-tech', type:'Opinion (agree/disagree)', level:'B2', topic:'Technology',
    prompt:'Some people believe that technology has made our lives more complicated rather than simpler. To what extent do you agree or disagree?',
    plan:['Position: partially agree — technology simplifies tasks but complicates attention and expectations.','Body 1: genuine simplification — banking, navigation, translation, remote work.','Body 2: new complexity — always-on expectations, information overload, maintenance burden.','Conclusion: net effect depends on how deliberately technology is used.'],
    ideas:['Mobile banking removed queuing but introduced fraud risk and constant notifications.','Translation apps opened travel but weaken language learning motivation.','Remote work removes commuting yet erases the boundary between office and home.'],
    band:7.5, wordsMin:250 },
  { id:'w2-edu', type:'Discussion (both views)', level:'B2', topic:'Education',
    prompt:'Some people think children should begin formal education at the age of four. Others believe they should not start until they are seven. Discuss both views and give your own opinion.',
    plan:['Intro: paraphrase, state that both positions rest on different definitions of "education".','Body 1: early start — literacy gap closes, working parents supported, Nordic counter-evidence.','Body 2: later start — play-based development, Finland starts at seven and outperforms.','Opinion: structured play until six, formal literacy from six or seven.'],
    ideas:['Finland begins formal schooling at seven yet leads PISA rankings.','Early formal instruction disadvantages summer-born children in the same cohort.','Childcare access is a socioeconomic argument, not a pedagogical one.'],
    band:7.5, wordsMin:250 },
  { id:'w2-env', type:'Problem / solution', level:'C1', topic:'Environment',
    prompt:'Air pollution in large cities is becoming increasingly serious. What are the causes of this problem, and what measures could be taken to address it?',
    plan:['Intro: define scope — particulates and nitrogen dioxide in dense urban areas.','Causes: private vehicle dependence, construction dust, domestic and industrial burning.','Solutions: congestion pricing, electrified public transport, enforced emission standards.','Conclusion: pricing plus provision, not one alone.'],
    ideas:['London\'s ULEZ cut roadside NO₂ by roughly a quarter within its first year.','Delhi\'s winter peaks are driven partly by agricultural stubble burning outside the city.','Retrofitting bus fleets is faster than replacing private vehicles.'],
    band:8, wordsMin:250 },
  { id:'w2-work', type:'Advantages / disadvantages', level:'B2', topic:'Work',
    prompt:'More and more people are working from home rather than in an office. Do the advantages of this development outweigh the disadvantages?',
    plan:['Intro: frame as a permanent shift, not a temporary one.','Advantages: commuting time recovered, wider talent pool, lower overheads.','Disadvantages: weaker collaboration, blurred boundaries, isolation for junior staff.','Verdict: advantages outweigh for experienced staff, not for new entrants.'],
    ideas:['Average commute recovered per year can exceed 200 hours.','Junior employees lose the incidental learning that comes from overhearing senior colleagues.','Hybrid arrangements attempt to capture both, with mixed evidence.'],
    band:7.5, wordsMin:250 },
  { id:'w2-two', type:'Two-part question', level:'C1', topic:'Society',
    prompt:'In many countries the gap between rich and poor is widening. Why is this happening, and what problems does it cause for society?',
    plan:['Intro: acknowledge the trend, signal the two questions.','Causes: skill-biased technological change, asset price inflation, weakening of collective bargaining.','Problems: reduced social mobility, political polarisation, public health costs.','Conclusion: the causes are structural, so the remedies must be too.'],
    ideas:['Automation raises returns to graduate skills while depressing routine wages.','Property price growth transfers wealth to existing owners, not earners.','Wilkinson and Pickett link inequality to worse health outcomes at every income level.'],
    band:8, wordsMin:250 },
];

/* ── SPEAKING ── */
const SPEAKING_P1 = [
  { topic:'Your hometown', qs:['Where is your hometown?','What do you like most about it?','Has it changed much since you were a child?','Would you like to live there in the future?'] },
  { topic:'Work or study', qs:['Do you work or are you a student?','Why did you choose that subject or job?','What is the most difficult part of it?','What would you like to do in five years?'] },
  { topic:'Free time', qs:['What do you usually do in your free time?','Do you prefer spending free time alone or with others?','Has the way you spend free time changed recently?','Is it important to have hobbies?'] },
  { topic:'Food', qs:['What kind of food do you enjoy?','Do you prefer eating at home or in restaurants?','Have your eating habits changed in recent years?','Is traditional food important in your country?'] },
  { topic:'Technology', qs:['How often do you use your phone?','What app do you use most?','Do you think you spend too much time online?','How has technology changed how you study?'] },
];
const SPEAKING_P2 = [
  { id:'cue-person', card:'Describe a person who has influenced you.', bullets:['who this person is','how you know them','what they have done','and explain why they have influenced you'], topic:'People', band:7,
    vocab:['role model','instil (a value)','look up to','turning point','shape my outlook'],
    tip:'Spend your one minute of preparation writing four nouns, not full sentences — you will speak more naturally.' },
  { id:'cue-place', card:'Describe a place you like to visit in your free time.', bullets:['where it is','how often you go there','what you do there','and explain why you enjoy it'], topic:'Places', band:6.5,
    vocab:['tucked away','a stone\'s throw from','unwind','buzzing atmosphere','get away from it all'],
    tip:'Anchor the description in one specific visit — a story is easier to extend than a general description.' },
  { id:'cue-skill', card:'Describe a skill you would like to learn.', bullets:['what the skill is','how you would learn it','how difficult it might be','and explain why you want to learn it'], topic:'Learning', band:7,
    vocab:['pick up (a skill)','a steep learning curve','get to grips with','from scratch','stick with it'],
    tip:'Use the second conditional throughout ("If I had more time, I would…") — it lifts your grammar range.' },
  { id:'cue-change', card:'Describe a change that improved your life.', bullets:['what the change was','when it happened','how it affected you','and explain why it was an improvement'], topic:'Experience', band:7.5,
    vocab:['out of my comfort zone','in hindsight','a blessing in disguise','settle into','pay off'],
    tip:'Past perfect for the "before" state, past simple for the change — the contrast shows grammatical control.' },
  { id:'cue-tech', card:'Describe a piece of technology you find useful.', bullets:['what it is','how long you have had it','how you use it','and explain why it is useful to you'], topic:'Technology', band:6.5,
    vocab:['indispensable','streamline','at my fingertips','user-friendly','can\'t do without'],
    tip:'Avoid listing features. Describe one occasion when it genuinely solved a problem for you.' },
];
const SPEAKING_P3 = [
  { for:'cue-person', topic:'Influence and role models', qs:['Do you think young people today have good role models?','Is the influence of celebrities on teenagers positive or negative?','How has the idea of a role model changed in the age of social media?','Should schools teach children about the people who influence them?'] },
  { for:'cue-place', topic:'Public space', qs:['Why do people need green spaces in cities?','Should governments spend more on public parks?','Do you think cities are becoming less pleasant places to live?','How might public spaces change in the next twenty years?'] },
  { for:'cue-skill', topic:'Learning through life', qs:['Is it harder to learn new skills as an adult?','Should employers pay for their staff to learn new skills?','Are practical skills more valuable than academic knowledge?','How has online learning changed skill acquisition?'] },
  { for:'cue-change', topic:'Change and adaptation', qs:['Do people generally resist change?','Is change happening faster now than in the past?','How do older and younger generations differ in adapting to change?','Should governments do more to help people adapt to economic change?'] },
  { for:'cue-tech', topic:'Technology in society', qs:['Has technology made people less patient?','Which technology has changed daily life the most?','Do you think technology will reduce or increase inequality?','Should there be limits on how much children use technology?'] },
];

/* ── PLACEMENT TEST ── 6 stages, adaptive-feel scoring */
const PLACEMENT = {
  grammar:[
    { q:'She ___ to London three times this year.', o:['go','went','has been','is going'], c:2, lv:'B1' },
    { q:'If I ___ more time, I would take a language course.', o:['have','had','will have','am having'], c:1, lv:'B2' },
    { q:'The report, ___ was published last week, criticises the policy.', o:['that','which','who','what'], c:1, lv:'B2' },
    { q:'Neither of the proposals ___ acceptable to the committee.', o:['are','were','is','have been'], c:2, lv:'C1' },
    { q:'Rarely ___ such a dramatic improvement in air quality.', o:['we have seen','have we seen','we saw','did we saw'], c:1, lv:'C1' },
    { q:'He suggested ___ the meeting until Friday.', o:['to postpone','postponing','postpone','that postpone'], c:1, lv:'B2' },
    { q:'I ___ my keys — I cannot find them anywhere.', o:['lost','have lost','was losing','had lost'], c:1, lv:'B1' },
    { q:'By the time we arrived, the lecture ___.', o:['already started','has already started','had already started','was already starting'], c:2, lv:'B2' },
  ],
  vocabulary:[
    { q:'The government hopes to ___ the effects of the drought.', o:['mitigate','migrate','meditate','mediate'], c:0, lv:'C1' },
    { q:'Choose the closest meaning to "sedentary".', o:['very active','involving much sitting','settled in one place permanently','sedimentary'], c:1, lv:'C1' },
    { q:'Sales ___ sharply after the advertising campaign.', o:['plummeted','surged','plateaued','fluctuated'], c:1, lv:'B2' },
    { q:'A ___ is a small difference that is barely significant.', o:['marginal one','substantial one','dramatic one','profound one'], c:0, lv:'B2' },
    { q:'"To put off a decision" means to ___ it.', o:['cancel','postpone','announce','reverse'], c:1, lv:'B1' },
    { q:'Renewable energy is the opposite of ___.', o:['clean energy','fossil fuels','solar power','wind power'], c:1, lv:'B1' },
    { q:'Which word best completes: "Social media is a double-edged ___"?', o:['knife','sword','blade','coin'], c:1, lv:'C1' },
  ],
  reading:[
    { passage:'Urban allotments — small plots rented to residents for growing food — have seen a sharp revival. Waiting lists in some British cities now exceed eight years. Advocates cite mental health benefits and food security; critics point out that the land involved could house thousands of families, and that allotment holders skew older and wealthier than the population as a whole.',
      items:[
        { q:'What is the writer\'s main purpose?', o:['To recommend renting an allotment','To present competing views on allotments','To criticise city councils','To describe how to grow food'], c:1, lv:'B2' },
        { q:'"Skew older and wealthier" suggests allotment holders are', o:['a representative sample of the population.','disproportionately older and richer.','younger than average.','all retired.'], c:1, lv:'C1' },
        { q:'TRUE / FALSE / NOT GIVEN: Waiting lists exceed eight years in every British city.', o:['TRUE','FALSE','NOT GIVEN'], c:1, lv:'B2' },
      ] },
    { passage:'The office thermostat has become an unexpected front in workplace equality. Standard temperature guidelines were derived in the 1960s from the metabolic rate of a forty-year-old, seventy-kilogram man. Subsequent research indicates that the resting metabolic rate of women is on average up to thirty per cent lower, meaning that a temperature comfortable for male colleagues can leave female ones genuinely cold.',
      items:[
        { q:'The guidelines are criticised because they were based on', o:['modern office buildings.','a narrow physical profile.','outdoor temperatures.','employee surveys.'], c:1, lv:'B2' },
        { q:'What does the passage imply about office temperature?', o:['It should be lowered further.','It affects men and women differently.','It has no measurable effect.','It is set by employees.'], c:1, lv:'B1' },
      ] },
  ],
  listening:[
    { script:'Right, the trip leaves from the north entrance at quarter past seven, not the main gate — that changed last week. Bring your own lunch; the cafe at the site closed in March. And the return coach gets in around six, though traffic on the ring road can add half an hour.',
      items:[
        { q:'Where does the trip leave from?', o:['The main gate','The north entrance','The ring road','The site cafe'], c:1, lv:'B1' },
        { q:'What time does the coach return?', o:['6.00','6.30','7.15','5.30'], c:0, lv:'B1' },
        { q:'Why must participants bring lunch?', o:['It is cheaper','The site cafe has closed','The trip is long','It is a rule'], c:1, lv:'B2' },
      ] },
  ],
  writing:{ prompt:'In about 80–120 words, describe a change you would like to see in your city and explain why. Write in full sentences — this is scored for grammar, vocabulary and organisation.', min:60 },
  speaking:{ prompt:'Speak for about 60 seconds: "Describe something you are looking forward to and explain why." You can record yourself or type what you would say.', min:40 },
};

/* ── MOCK TEST DEFINITIONS ── */
const MOCKS = [
  { id:'m-full-ac', exam:'ielts-a', kind:'full', name:'IELTS Academic — Full Mock 1', mins:165, parts:['Listening · 4 sections','Reading · 3 passages','Writing · Task 1 + Task 2','Speaking · 3 parts'], level:'B2–C1', desc:'A complete sitting under exam conditions, scored section by section with a predicted overall band.' },
  { id:'m-full-gt', exam:'ielts-g', kind:'full', name:'IELTS General Training — Full Mock 1', mins:165, parts:['Listening · 4 sections','Reading · 3 sections','Writing · Letter + Essay','Speaking · 3 parts'], level:'B1–B2', desc:'General Training format with everyday reading texts and a letter task.' },
  { id:'m-listen', exam:'ielts-a', kind:'section', name:'Listening Section Test', mins:30, parts:['4 recordings','40 questions'], level:'B1–C1', desc:'All four listening parts, from a everyday conversation to an academic lecture.' },
  { id:'m-read', exam:'ielts-a', kind:'section', name:'Academic Reading Section Test', mins:60, parts:['3 passages','40 questions'], level:'B2–C1', desc:'Three passages of increasing difficulty with the full range of question types.' },
  { id:'m-write', exam:'ielts-a', kind:'section', name:'Writing Section Test', mins:60, parts:['Task 1 · 20 min','Task 2 · 40 min'], level:'B2–C1', desc:'Both tasks under timed conditions, evaluated against all four band descriptors.' },
  { id:'m-speak', exam:'ielts-a', kind:'section', name:'Speaking Mock Interview', mins:14, parts:['Part 1 · 5 min','Part 2 · 4 min','Part 3 · 5 min'], level:'B1–C1', desc:'Full three-part interview with fluency, pronunciation and lexical analysis.' },
  { id:'m-mini', exam:'ielts-a', kind:'mini', name:'15-Minute Warm-Up', mins:15, parts:['1 reading passage','10 questions'], level:'B1–B2', desc:'A short daily test to keep your reading speed up between full mocks.' },
  { id:'m-toefl', exam:'toefl', kind:'full', name:'TOEFL iBT — Full Mock', mins:116, parts:['Reading','Listening','Speaking','Writing'], level:'B2–C1', desc:'Four sections in the official order with a 0–120 scaled score estimate.' },
  { id:'m-pte', exam:'pte', kind:'full', name:'PTE Academic — Full Mock', mins:120, parts:['Speaking & Writing','Reading','Listening'], level:'B2–C1', desc:'Integrated-skills format with an automated 10–90 score estimate.' },
  { id:'m-det', exam:'duolingo', kind:'full', name:'Duolingo English Test — Adaptive Mock', mins:60, parts:['Adaptive section','Writing sample','Speaking sample'], level:'B1–C1', desc:'One-hour adaptive simulation returning a 10–160 estimate.' },
];
