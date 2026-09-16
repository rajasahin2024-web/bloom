/* ═══ BLOOM — vocabulary & grammar content banks ═══ */

/* ── VOCABULARY ──
   w word · p IPA · pos · d definition · e example · syn · ant · col collocations
   t topic · lv CEFR · band (target band the word signals) */
const VOCAB_TOPICS = [
  { id:'education',   name:'Education',            ic:'fa-graduation-cap' },
  { id:'environment', name:'Environment',          ic:'fa-leaf' },
  { id:'technology',  name:'Technology',           ic:'fa-microchip' },
  { id:'health',      name:'Health & Lifestyle',   ic:'fa-heart-pulse' },
  { id:'work',        name:'Work & Business',      ic:'fa-briefcase' },
  { id:'society',     name:'Society & Culture',    ic:'fa-people-group' },
  { id:'describing',  name:'Describing Trends',    ic:'fa-chart-line' },
  { id:'linking',     name:'Linking & Cohesion',   ic:'fa-link' },
  { id:'idioms',      name:'Idioms & Phrasal Verbs',ic:'fa-comment-dots' },
];

const VOCAB = [
  /* EDUCATION */
  { w:'curriculum', p:'/kəˈrɪkjələm/', pos:'noun', t:'education', lv:'B2', band:7, d:'The subjects and content taught in a school or on a course.', e:'The national curriculum places heavy emphasis on mathematics.', syn:['syllabus','programme of study'], ant:[], col:['national curriculum','core curriculum','curriculum design'] },
  { w:'rote learning', p:'/rəʊt ˈlɜːnɪŋ/', pos:'noun', t:'education', lv:'C1', band:7.5, d:'Memorising information by repetition, without understanding it.', e:'Rote learning may raise test scores but rarely produces real understanding.', syn:['memorisation','learning by heart'], ant:['critical thinking'], col:['rely on rote learning','move beyond rote learning'] },
  { w:'tuition fees', p:'/tjuˈɪʃn fiːz/', pos:'noun', t:'education', lv:'B2', band:6.5, d:'The money charged for teaching at a school or university.', e:'Rising tuition fees deter students from low-income families.', syn:['course fees'], ant:[], col:['rising tuition fees','waive tuition fees','subsidise tuition fees'] },
  { w:'vocational', p:'/vəʊˈkeɪʃənl/', pos:'adjective', t:'education', lv:'C1', band:7, d:'Relating to training for a particular job or trade.', e:'Vocational training equips school leavers with employable skills.', syn:['practical','occupational'], ant:['academic','theoretical'], col:['vocational training','vocational qualification'] },
  { w:'lifelong learning', p:'/ˈlaɪflɒŋ ˈlɜːnɪŋ/', pos:'noun', t:'education', lv:'B2', band:7, d:'Continuing to study and learn throughout adult life.', e:'Rapid technological change has made lifelong learning a necessity.', syn:['continuous education'], ant:[], col:['promote lifelong learning','a culture of lifelong learning'] },
  { w:'academic integrity', p:'/ˌækəˈdemɪk ɪnˈteɡrəti/', pos:'noun', t:'education', lv:'C1', band:7.5, d:'Honesty and responsibility in academic work.', e:'Universities enforce academic integrity through plagiarism software.', syn:['scholarly honesty'], ant:['plagiarism'], col:['uphold academic integrity','breach of academic integrity'] },

  /* ENVIRONMENT */
  { w:'sustainable', p:'/səˈsteɪnəbl/', pos:'adjective', t:'environment', lv:'B2', band:6.5, d:'Able to continue over time without damaging the environment.', e:'Cities must invest in sustainable transport systems.', syn:['eco-friendly','viable long term'], ant:['unsustainable','wasteful'], col:['sustainable development','sustainable energy','environmentally sustainable'] },
  { w:'carbon footprint', p:'/ˈkɑːbən ˈfʊtprɪnt/', pos:'noun', t:'environment', lv:'B2', band:7, d:'The total greenhouse gas produced by a person or activity.', e:'Air travel dramatically increases an individual\'s carbon footprint.', syn:['carbon emissions','environmental impact'], ant:[], col:['reduce your carbon footprint','a low carbon footprint'] },
  { w:'deforestation', p:'/ˌdiːfɒrɪˈsteɪʃn/', pos:'noun', t:'environment', lv:'B2', band:7, d:'The clearing of forests on a large scale.', e:'Deforestation in the tropics accelerates species loss.', syn:['forest clearance'], ant:['reforestation','afforestation'], col:['rampant deforestation','curb deforestation'] },
  { w:'renewable energy', p:'/rɪˈnjuːəbl ˈenədʒi/', pos:'noun', t:'environment', lv:'B2', band:6.5, d:'Energy from sources that are naturally replenished, such as wind or sun.', e:'Denmark now generates half its electricity from renewable energy.', syn:['clean energy','green energy'], ant:['fossil fuels'], col:['invest in renewable energy','shift to renewable energy'] },
  { w:'mitigate', p:'/ˈmɪtɪɡeɪt/', pos:'verb', t:'environment', lv:'C1', band:7.5, d:'To make something bad less severe.', e:'Planting urban trees helps mitigate the heat-island effect.', syn:['alleviate','lessen','reduce'], ant:['aggravate','intensify'], col:['mitigate the impact','mitigate climate change','mitigate risk'] },
  { w:'biodiversity', p:'/ˌbaɪəʊdaɪˈvɜːsəti/', pos:'noun', t:'environment', lv:'C1', band:7, d:'The variety of plant and animal life in a habitat.', e:'Wetlands support extraordinary biodiversity.', syn:['ecological variety'], ant:[], col:['loss of biodiversity','protect biodiversity','biodiversity hotspot'] },

  /* TECHNOLOGY */
  { w:'automation', p:'/ˌɔːtəˈmeɪʃn/', pos:'noun', t:'technology', lv:'B2', band:7, d:'The use of machines to do work previously done by people.', e:'Automation has eliminated many routine manufacturing jobs.', syn:['mechanisation'], ant:['manual labour'], col:['increasing automation','automation of jobs'] },
  { w:'digital divide', p:'/ˈdɪdʒɪtl dɪˈvaɪd/', pos:'noun', t:'technology', lv:'C1', band:7.5, d:'The gap between those with and without access to technology.', e:'Remote schooling exposed the digital divide between rural and urban pupils.', syn:['technology gap'], ant:[], col:['bridge the digital divide','widen the digital divide'] },
  { w:'surveillance', p:'/səˈveɪləns/', pos:'noun', t:'technology', lv:'C1', band:7.5, d:'Close observation, especially of suspected people.', e:'Critics argue that mass surveillance erodes personal freedom.', syn:['monitoring','observation'], ant:[], col:['under surveillance','mass surveillance','surveillance camera'] },
  { w:'obsolete', p:'/ˈɒbsəliːt/', pos:'adjective', t:'technology', lv:'C1', band:7.5, d:'No longer used or useful because something newer exists.', e:'Fax machines became obsolete within a decade.', syn:['outdated','antiquated'], ant:['current','cutting-edge'], col:['render obsolete','technologically obsolete'] },
  { w:'user-friendly', p:'/ˌjuːzə ˈfrendli/', pos:'adjective', t:'technology', lv:'B1', band:6, d:'Easy to use or understand.', e:'The app succeeded because its interface was genuinely user-friendly.', syn:['intuitive','accessible'], ant:['complicated','cumbersome'], col:['user-friendly design','a user-friendly interface'] },

  /* HEALTH */
  { w:'sedentary', p:'/ˈsedntri/', pos:'adjective', t:'health', lv:'C1', band:7.5, d:'Involving a lot of sitting and little exercise.', e:'A sedentary lifestyle is linked to cardiovascular disease.', syn:['inactive','desk-bound'], ant:['active'], col:['sedentary lifestyle','sedentary work'] },
  { w:'well-being', p:'/welˈbiːɪŋ/', pos:'noun', t:'health', lv:'B2', band:6.5, d:'The state of being comfortable, healthy and happy.', e:'Employers increasingly invest in staff well-being.', syn:['welfare','wellness'], ant:[], col:['mental well-being','promote well-being'] },
  { w:'preventative', p:'/prɪˈventətɪv/', pos:'adjective', t:'health', lv:'C1', band:7, d:'Intended to stop something bad from happening.', e:'Preventative healthcare reduces long-term treatment costs.', syn:['preventive','precautionary'], ant:['reactive','curative'], col:['preventative measures','preventative medicine'] },
  { w:'life expectancy', p:'/laɪf ɪkˈspektənsi/', pos:'noun', t:'health', lv:'B2', band:6.5, d:'The average number of years a person is expected to live.', e:'Life expectancy in Japan exceeds eighty-four years.', syn:['average lifespan'], ant:[], col:['rising life expectancy','life expectancy at birth'] },
  { w:'obesity', p:'/əʊˈbiːsəti/', pos:'noun', t:'health', lv:'B2', band:6.5, d:'The condition of being extremely overweight.', e:'Childhood obesity has tripled in three decades.', syn:['excess weight'], ant:[], col:['tackle obesity','the obesity epidemic','childhood obesity'] },

  /* WORK */
  { w:'remote working', p:'/rɪˈməʊt ˈwɜːkɪŋ/', pos:'noun', t:'work', lv:'B2', band:6.5, d:'Doing your job from home or outside the office.', e:'Remote working has cut commuting time for millions.', syn:['telecommuting','working from home'], ant:['office-based work'], col:['shift to remote working','remote working policy'] },
  { w:'work–life balance', p:'/wɜːk laɪf ˈbæləns/', pos:'noun', t:'work', lv:'B2', band:7, d:'The division of time between working and personal life.', e:'Long hours make a healthy work–life balance almost impossible.', syn:[], ant:[], col:['achieve work–life balance','poor work–life balance'] },
  { w:'redundancy', p:'/rɪˈdʌndənsi/', pos:'noun', t:'work', lv:'C1', band:7.5, d:'Loss of a job because it is no longer needed.', e:'Restructuring led to two hundred redundancies.', syn:['layoff','job loss'], ant:['recruitment'], col:['face redundancy','voluntary redundancy'] },
  { w:'entrepreneurial', p:'/ˌɒntrəprəˈnɜːriəl/', pos:'adjective', t:'work', lv:'C1', band:7.5, d:'Showing the skill and willingness to start new businesses.', e:'The city fosters an entrepreneurial culture among graduates.', syn:['enterprising','business-minded'], ant:[], col:['entrepreneurial spirit','entrepreneurial mindset'] },
  { w:'incentive', p:'/ɪnˈsentɪv/', pos:'noun', t:'work', lv:'B2', band:7, d:'Something that encourages a person to do something.', e:'Tax breaks act as an incentive for green investment.', syn:['inducement','motivation'], ant:['deterrent'], col:['financial incentive','provide an incentive','strong incentive'] },

  /* SOCIETY */
  { w:'urbanisation', p:'/ˌɜːbənaɪˈzeɪʃn/', pos:'noun', t:'society', lv:'C1', band:7, d:'The movement of people from rural areas into cities.', e:'Rapid urbanisation has strained public services.', syn:['urban growth'], ant:['rural depopulation'], col:['rapid urbanisation','unplanned urbanisation'] },
  { w:'social cohesion', p:'/ˈsəʊʃl kəʊˈhiːʒn/', pos:'noun', t:'society', lv:'C1', band:8, d:'The bonds that hold a community together.', e:'Shared public spaces strengthen social cohesion.', syn:['community bonds','solidarity'], ant:['fragmentation'], col:['promote social cohesion','undermine social cohesion'] },
  { w:'inequality', p:'/ˌɪnɪˈkwɒləti/', pos:'noun', t:'society', lv:'B2', band:6.5, d:'An unfair difference in wealth, status or opportunity.', e:'Income inequality has widened over the last generation.', syn:['disparity','imbalance'], ant:['equality','parity'], col:['income inequality','address inequality','stark inequality'] },
  { w:'demographic', p:'/ˌdeməˈɡræfɪk/', pos:'adjective', t:'society', lv:'C1', band:7.5, d:'Relating to the structure of a population.', e:'Japan faces a serious demographic challenge as its population ages.', syn:['population-related'], ant:[], col:['demographic shift','demographic change','ageing demographic'] },
  { w:'cultural heritage', p:'/ˈkʌltʃərəl ˈherɪtɪdʒ/', pos:'noun', t:'society', lv:'B2', band:7, d:'The traditions, buildings and objects a society inherits.', e:'Restoring old quarters preserves a city\'s cultural heritage.', syn:['tradition','legacy'], ant:[], col:['preserve cultural heritage','rich cultural heritage'] },

  /* DESCRIBING TRENDS — Task 1 */
  { w:'surge', p:'/sɜːdʒ/', pos:'verb / noun', t:'describing', lv:'B2', band:7, d:'To rise suddenly and sharply.', e:'Online sales surged between 2018 and 2021.', syn:['soar','rocket','shoot up'], ant:['plummet','plunge'], col:['surge dramatically','a sharp surge','surge to a peak'] },
  { w:'plummet', p:'/ˈplʌmɪt/', pos:'verb', t:'describing', lv:'C1', band:7.5, d:'To fall very quickly and by a large amount.', e:'Car ownership plummeted after the fuel tax was introduced.', syn:['plunge','nosedive','tumble'], ant:['surge','soar'], col:['plummet sharply','plummet to a low'] },
  { w:'plateau', p:'/ˈplætəʊ/', pos:'verb / noun', t:'describing', lv:'C1', band:7.5, d:'To stop rising and stay at the same level.', e:'Enrolment rose until 2015, then plateaued at around 4,000.', syn:['level off','stabilise'], ant:['fluctuate'], col:['plateau at','reach a plateau'] },
  { w:'fluctuate', p:'/ˈflʌktʃueɪt/', pos:'verb', t:'describing', lv:'B2', band:7, d:'To rise and fall irregularly.', e:'Rainfall fluctuated between 40 mm and 90 mm across the year.', syn:['vary','oscillate'], ant:['remain stable'], col:['fluctuate wildly','fluctuate between'] },
  { w:'marginal', p:'/ˈmɑːdʒɪnl/', pos:'adjective', t:'describing', lv:'C1', band:7.5, d:'Very small in scale or importance.', e:'There was only a marginal increase in male participation.', syn:['slight','negligible'], ant:['substantial','dramatic'], col:['a marginal rise','marginally higher'] },
  { w:'account for', p:'/əˈkaʊnt fɔː/', pos:'phrasal verb', t:'describing', lv:'B2', band:7, d:'To form a particular part or amount of a total.', e:'Coal accounted for nearly half of all electricity generated.', syn:['make up','constitute','represent'], ant:[], col:['account for the majority','account for X per cent'] },
  { w:'respectively', p:'/rɪˈspektɪvli/', pos:'adverb', t:'describing', lv:'C1', band:7.5, d:'In the same order as the items already mentioned.', e:'Spain and Italy recorded 22% and 18% respectively.', syn:['in that order'], ant:[], col:['X and Y respectively'] },

  /* LINKING */
  { w:'nevertheless', p:'/ˌnevəðəˈles/', pos:'adverb', t:'linking', lv:'B2', band:7, d:'In spite of what has just been said.', e:'The policy is expensive; nevertheless, it has broad public support.', syn:['nonetheless','even so'], ant:[], col:['Nevertheless, …'] },
  { w:'consequently', p:'/ˈkɒnsɪkwəntli/', pos:'adverb', t:'linking', lv:'B2', band:6.5, d:'As a result of something.', e:'Fuel prices rose; consequently, freight costs increased.', syn:['as a result','therefore','hence'], ant:[], col:['Consequently, …'] },
  { w:'in contrast', p:'/ɪn ˈkɒntrɑːst/', pos:'phrase', t:'linking', lv:'B1', band:6, d:'Used to show a clear difference.', e:'Urban wages rose steadily. In contrast, rural incomes stagnated.', syn:['by comparison','conversely'], ant:['similarly'], col:['In contrast, …','in sharp contrast to'] },
  { w:'notwithstanding', p:'/ˌnɒtwɪθˈstændɪŋ/', pos:'preposition', t:'linking', lv:'C2', band:8, d:'Despite something.', e:'Notwithstanding the cost, the scheme was approved.', syn:['despite','in spite of'], ant:[], col:['notwithstanding the fact that'] },
  { w:'to a certain extent', p:'/tuː ə ˈsɜːtn ɪkˈstent/', pos:'phrase', t:'linking', lv:'B2', band:7, d:'Partly, but not completely.', e:'To a certain extent, I agree with this view.', syn:['partly','up to a point'], ant:['entirely'], col:['agree to a certain extent'] },

  /* IDIOMS & PHRASAL VERBS */
  { w:'get to grips with', p:'/ɡet tə ɡrɪps wɪð/', pos:'idiom', t:'idioms', lv:'C1', band:7.5, d:'To begin to understand and deal with something difficult.', e:'It took me a month to get to grips with academic writing.', syn:['come to terms with','master'], ant:[], col:['get to grips with a problem'] },
  { w:'a steep learning curve', p:'/ə stiːp ˈlɜːnɪŋ kɜːv/', pos:'idiom', t:'idioms', lv:'B2', band:7, d:'A situation where you must learn a lot very quickly.', e:'Moving abroad was a steep learning curve for me.', syn:[], ant:[], col:['face a steep learning curve'] },
  { w:'put off', p:'/pʊt ɒf/', pos:'phrasal verb', t:'idioms', lv:'B1', band:6, d:'To postpone; or to discourage someone.', e:'I kept putting off my speaking practice until the week before the test.', syn:['postpone','delay','deter'], ant:['bring forward'], col:['put off a decision','be put off by'] },
  { w:'take up', p:'/teɪk ʌp/', pos:'phrasal verb', t:'idioms', lv:'B1', band:6, d:'To start doing something regularly; or to occupy space or time.', e:'She took up swimming to manage her stress.', syn:['begin','start'], ant:['give up'], col:['take up a hobby','take up too much time'] },
  { w:'in the long run', p:'/ɪn ðə lɒŋ rʌn/', pos:'idiom', t:'idioms', lv:'B2', band:6.5, d:'Over a long period in the future.', e:'Investing in public transport pays off in the long run.', syn:['ultimately','eventually'], ant:['in the short term'], col:['benefit in the long run'] },
  { w:'a double-edged sword', p:'/ə ˌdʌbl edʒd sɔːd/', pos:'idiom', t:'idioms', lv:'C1', band:7.5, d:'Something with both clear advantages and serious drawbacks.', e:'Social media is a double-edged sword for young people.', syn:['a mixed blessing'], ant:[], col:['prove to be a double-edged sword'] },
];

/* ── GRAMMAR ACADEMY ── */
const GRAMMAR_UNITS = [
  { id:'foundation', name:'Foundation', lv:'A2–B1' },
  { id:'core',       name:'Core Grammar', lv:'B1–B2' },
  { id:'advanced',   name:'Advanced Structures', lv:'B2–C1' },
  { id:'writing',    name:'Grammar for Writing', lv:'B2–C1' },
];

/* concept → explanation → examples → practice */
const GRAMMAR = [
  { id:'articles', unit:'foundation', name:'Articles: a, an, the', lv:'A2', mins:12,
    concept:'English marks nouns as specific ("the") or non-specific ("a/an"), and many languages do not. This is the single most common error for South Asian and East Asian learners.',
    rules:[
      'Use <b>a/an</b> the first time you mention a singular countable noun: <i>I saw a dog.</i>',
      'Use <b>the</b> when both speaker and listener know which one: <i>The dog was barking.</i>',
      'Use <b>no article</b> for plural or uncountable nouns in general statements: <i>Dogs bark. Water is essential.</i>',
      'Use <b>the</b> with superlatives, unique things and named rivers/oceans: <i>the best, the sun, the Ganges.</i>',
    ],
    examples:[
      { bad:'I want to become engineer.', good:'I want to become an engineer.', why:'Singular countable job title needs an article.' },
      { bad:'The pollution is a serious problem in the cities.', good:'Pollution is a serious problem in cities.', why:'General statements about uncountable and plural nouns take no article.' },
      { bad:'She is best student in class.', good:'She is the best student in the class.', why:'Superlatives take "the"; "the class" is a specific known class.' },
    ],
    quiz:[
      { q:'___ education system in Finland is widely admired.', o:['A','An','The','—'], c:2, e:'A specific, known system, so "the".' },
      { q:'Governments should invest more in ___ renewable energy.', o:['a','an','the','—'], c:3, e:'Uncountable noun used in a general sense — no article.' },
      { q:'He works as ___ university lecturer.', o:['a','an','the','—'], c:0, e:'"University" begins with a /j/ consonant sound, so "a", not "an".' },
      { q:'___ children in developing countries often lack textbooks.', o:['A','The','—','An'], c:2, e:'General plural statement — no article.' },
      { q:'This is ___ most convincing argument in the essay.', o:['a','an','the','—'], c:2, e:'Superlatives always take "the".' },
    ] },

  { id:'tenses', unit:'foundation', name:'Present Perfect vs Past Simple', lv:'B1', mins:14,
    concept:'Past simple places an action at a finished time. Present perfect links the past to now — the time is unfinished, unstated, or the result still matters.',
    rules:[
      'Past simple + a finished time expression: <i>yesterday, in 2019, last month, when I was a child.</i>',
      'Present perfect + unfinished or unspecified time: <i>since, for, already, yet, ever, never, recently.</i>',
      'Never combine present perfect with a finished time: <s>I have gone yesterday.</s>',
      'Use present perfect for experience with no stated time: <i>I have visited London twice.</i>',
    ],
    examples:[
      { bad:'I have finished my degree in 2023.', good:'I finished my degree in 2023.', why:'"In 2023" is a finished time, so past simple.' },
      { bad:'I live here since 2020.', good:'I have lived here since 2020.', why:'"Since" signals an action continuing to now — present perfect.' },
      { bad:'Did you ever try Thai food?', good:'Have you ever tried Thai food?', why:'"Ever" asks about life experience with no time reference.' },
    ],
    quiz:[
      { q:'Technology ___ dramatically over the last decade.', o:['changed','has changed','was changing','change'], c:1, e:'"Over the last decade" is unfinished time — present perfect.' },
      { q:'The government ___ the new policy in March 2024.', o:['has introduced','introduces','introduced','had introduced'], c:2, e:'A specific finished date requires past simple.' },
      { q:'I ___ never ___ abroad before this trip.', o:['did / go','have / been','was / going','am / going'], c:1, e:'"Never … before" describes life experience — present perfect.' },
      { q:'She ___ for that company since she graduated.', o:['works','worked','has worked','is working'], c:2, e:'"Since" + still true now — present perfect.' },
    ] },

  { id:'sva', unit:'foundation', name:'Subject–Verb Agreement', lv:'B1', mins:10,
    concept:'The verb must match the subject in number. Errors cluster around plural nouns that look singular, long subjects, and "there is/are".',
    rules:[
      'Singular subject → verb + s in present simple: <i>The student writes.</i>',
      'Plural subject → base verb: <i>The students write.</i>',
      '<b>People, police, children</b> are plural: <i>People are…</i> not <s>People is…</s>',
      'Ignore words between subject and verb: <i>The number of students <b>is</b> rising.</i>',
      '"A number of" is plural; "the number of" is singular.',
    ],
    examples:[
      { bad:'People is becoming more dependent on technology.', good:'People are becoming more dependent on technology.', why:'"People" is an irregular plural.' },
      { bad:'The list of applicants have grown.', good:'The list of applicants has grown.', why:'The subject is "the list", not "applicants".' },
      { bad:'There is many reasons for this trend.', good:'There are many reasons for this trend.', why:'"Reasons" is plural, so "there are".' },
    ],
    quiz:[
      { q:'The government ___ introduced several reforms.', o:['have','has','are','were'], c:1, e:'In IELTS writing, treat "government" as singular for consistency.' },
      { q:'A number of studies ___ this conclusion.', o:['supports','support','has supported','is supporting'], c:1, e:'"A number of" takes a plural verb.' },
      { q:'Neither of the arguments ___ convincing.', o:['are','were','is','have been'], c:2, e:'"Neither of" is singular.' },
      { q:'There ___ a variety of factors involved.', o:['are','is','were','have'], c:1, e:'The head noun is "a variety", which is singular.' },
    ] },

  { id:'conditionals', unit:'core', name:'Conditionals', lv:'B2', mins:16,
    concept:'Conditionals express how likely or real a situation is. IELTS Writing Task 2 rewards accurate second and third conditionals when discussing hypotheticals.',
    rules:[
      '<b>Zero:</b> If + present, present — general truths. <i>If water reaches 100 °C, it boils.</i>',
      '<b>First:</b> If + present, will — likely future. <i>If governments act, emissions will fall.</i>',
      '<b>Second:</b> If + past, would — unreal present or unlikely future. <i>If I had more time, I would study abroad.</i>',
      '<b>Third:</b> If + past perfect, would have — unreal past. <i>If they had invested earlier, the crisis would have been avoided.</i>',
      'Never write <s>If I will…</s> — the "if" clause does not take "will".',
    ],
    examples:[
      { bad:'If the government will raise taxes, consumption will fall.', good:'If the government raises taxes, consumption will fall.', why:'No "will" in the if-clause of a first conditional.' },
      { bad:'If I would be rich, I would travel.', good:'If I were rich, I would travel.', why:'Second conditional uses past simple (or "were") in the if-clause.' },
      { bad:'If they invested earlier, they would have avoided the loss.', good:'If they had invested earlier, they would have avoided the loss.', why:'Unreal past needs past perfect.' },
    ],
    quiz:[
      { q:'If cities ___ public transport, congestion would ease.', o:['will improve','improved','have improved','improves'], c:1, e:'Second conditional — hypothetical present.' },
      { q:'If she ___ harder, she would have passed.', o:['studied','had studied','has studied','would study'], c:1, e:'Third conditional — unreal past.' },
      { q:'Ice melts if the temperature ___ above zero.', o:['will rise','rose','rises','had risen'], c:2, e:'Zero conditional — general truth.' },
      { q:'If the policy ___ next year, thousands will benefit.', o:['will pass','passes','passed','would pass'], c:1, e:'First conditional — no "will" after "if".' },
    ] },

  { id:'passive', unit:'core', name:'Passive Voice', lv:'B2', mins:12,
    concept:'The passive moves the focus from the doer to the action. Academic writing uses it to sound objective and to describe processes — essential for Task 1 process diagrams.',
    rules:[
      'Form: <b>be + past participle</b>. <i>The data were collected in 2023.</i>',
      'Use when the doer is unknown, obvious or unimportant: <i>The bottles are washed and sterilised.</i>',
      'Add "by + agent" only when it matters: <i>The report was written by an independent panel.</i>',
      'Do not overuse it — a whole essay in the passive reads heavy and lowers your fluency score.',
    ],
    examples:[
      { bad:'The clay is mix with water and then it shape.', good:'The clay is mixed with water and then shaped.', why:'Both verbs need the past participle after "is".' },
      { bad:'This problem must solve immediately.', good:'This problem must be solved immediately.', why:'Modal + passive requires "be" + participle.' },
      { bad:'The survey conducted last year.', good:'The survey was conducted last year.', why:'The auxiliary "was" is missing.' },
    ],
    quiz:[
      { q:'In the first stage, the raw materials ___ into a furnace.', o:['feed','are fed','feeding','have fed'], c:1, e:'Process description — present simple passive.' },
      { q:'The results ___ published next month.', o:['will','will be','are being','have'], c:1, e:'Future passive: will be + participle.' },
      { q:'Several changes ___ since the report was released.', o:['have made','has been made','have been made','were making'], c:2, e:'Present perfect passive, plural subject.' },
      { q:'The bridge ___ by a Japanese firm in 1998.', o:['designed','was designed','is designed','has designed'], c:1, e:'Finished past time, agent named — past passive.' },
    ] },

  { id:'relative', unit:'core', name:'Relative Clauses', lv:'B2', mins:13,
    concept:'Relative clauses add information without starting a new sentence — the fastest way to raise sentence variety in Writing Task 2.',
    rules:[
      '<b>Defining</b> clauses identify which one, and take no commas: <i>Students who study abroad often mature quickly.</i>',
      '<b>Non-defining</b> clauses add extra information, always with commas and never "that": <i>My hometown, which lies on the coast, attracts tourists.</i>',
      'Use <b>who</b> for people, <b>which</b> for things, <b>whose</b> for possession, <b>where</b> for places.',
      '"Which" can refer to a whole clause: <i>Fees have risen, which discourages applicants.</i>',
    ],
    examples:[
      { bad:'The city, that I grew up in, has changed.', good:'The city, which I grew up in, has changed.', why:'Non-defining clauses cannot use "that".' },
      { bad:'People which live in cities pay more rent.', good:'People who live in cities pay more rent.', why:'"Who" is required for people.' },
      { bad:'Students whose are motivated succeed.', good:'Students who are motivated succeed.', why:'"Whose" shows possession, not identity.' },
    ],
    quiz:[
      { q:'Countries ___ invest in education tend to grow faster.', o:['which','who','that','where'], c:2, e:'Defining clause about countries — "that" or "which"; here "that" is most natural.' },
      { q:'Tokyo, ___ is the largest city in the world, faces housing shortages.', o:['that','which','where','who'], c:1, e:'Non-defining clause — "which", after a comma.' },
      { q:'This is the school ___ my mother studied.', o:['which','that','where','whose'], c:2, e:'Referring to a place as a location — "where".' },
      { q:'Employees ___ contracts expire soon have been notified.', o:['who','whose','which','that'], c:1, e:'Possession — "whose contracts".' },
    ] },

  { id:'modals', unit:'core', name:'Modals & Hedging', lv:'B2', mins:11,
    concept:'Examiners reward cautious, precise claims. Hedging with modals turns an overstated sentence into an academic one.',
    rules:[
      'Certainty scale: <b>will > is likely to > may/might/could > is unlikely to</b>.',
      'Use <b>should</b> for recommendations: <i>Governments should subsidise public transport.</i>',
      'Use <b>must / have to</b> sparingly — they sound absolute.',
      'Hedge sweeping claims: <i>Technology <b>tends to</b> isolate people</i> instead of <i>Technology isolates people.</i>',
    ],
    examples:[
      { bad:'All teenagers are addicted to their phones.', good:'Many teenagers may become overly dependent on their phones.', why:'Absolute claims are easy to attack; hedged claims read as academic.' },
      { bad:'This will definitely solve the problem.', good:'This is likely to alleviate the problem considerably.', why:'Hedging plus precise vocabulary raises the band.' },
      { bad:'Government must banning private cars.', good:'Governments could consider restricting private car use.', why:'Modal + base form, and a softer recommendation.' },
    ],
    quiz:[
      { q:'Which is the most appropriately hedged claim?', o:['Social media destroys friendships.','Social media may weaken face-to-face friendships.','Social media never affects friendships.','Social media always harms teenagers.'], c:1, e:'"May weaken" is measured and defensible.' },
      { q:'Governments ___ prioritise renewable energy over coal.', o:['should','will','must not','can\'t'], c:0, e:'"Should" is the standard recommendation modal.' },
      { q:'A rise in fuel duty ___ reduce private car use.', o:['is definitely','could well','will surely','must'], c:1, e:'"Could well" is confident but hedged.' },
    ] },

  { id:'complex', unit:'advanced', name:'Complex & Compound Sentences', lv:'B2', mins:15,
    concept:'Band 7 requires "a variety of complex structures". That means mixing sentence lengths and subordinating ideas, not writing longer sentences.',
    rules:[
      '<b>Compound:</b> two independent clauses joined by and / but / so / yet.',
      '<b>Complex:</b> one main clause + a subordinate clause introduced by although, because, while, if, when, since.',
      'Front a subordinate clause for variety: <i>Although fees have risen, applications continue to grow.</i>',
      'Alternate one short punchy sentence with two longer ones — rhythm reads as control, not chaos.',
    ],
    examples:[
      { bad:'Cities are crowded. Housing is expensive. People commute far.', good:'Because cities are crowded and housing is expensive, many people commute long distances.', why:'Three simple sentences become one complex sentence with a causal link.' },
      { bad:'Although the plan is expensive, but it is necessary.', good:'Although the plan is expensive, it is necessary.', why:'Never use "although" and "but" in the same sentence.' },
      { bad:'The scheme failed, it was underfunded.', good:'The scheme failed because it was underfunded.', why:'A comma cannot join two independent clauses — that is a comma splice.' },
    ],
    quiz:[
      { q:'Which sentence is correctly formed?', o:['Despite of the cost, the project continued.','Despite the cost, the project continued.','Despite the cost, but the project continued.','Although the cost, the project continued.'], c:1, e:'"Despite" is followed directly by a noun phrase — no "of".' },
      { q:'Choose the complex sentence.', o:['Fees rose and applications fell.','Fees rose; applications fell.','While fees rose, applications fell.','Fees rose. Applications fell.'], c:2, e:'"While" introduces a subordinate clause — that is complex.' },
      { q:'Fix the comma splice: "Traffic is worsening, the city has no metro."', o:['Traffic is worsening the city has no metro.','Traffic is worsening, and the city has no metro.','Traffic is worsening, however the city has no metro.','Traffic is worsening, the city having no metro.'], c:1, e:'Add a coordinating conjunction after the comma.' },
    ] },

  { id:'reported', unit:'advanced', name:'Reported Speech', lv:'B2', mins:11,
    concept:'Reporting what someone said requires a backshift in tense and changes to pronouns and time words. It appears in Speaking Part 3 and in Listening answers.',
    rules:[
      'Backshift one step: present → past, past → past perfect, will → would.',
      'Change time and place words: <i>now → then, today → that day, here → there.</i>',
      'No backshift needed if the statement is still true: <i>She said the earth is round.</i>',
      'Reported questions use statement word order and no question mark: <i>He asked where I lived.</i>',
    ],
    examples:[
      { bad:'She said she is tired yesterday.', good:'She said she was tired.', why:'Backshift present → past after "said".' },
      { bad:'He asked me where do I live.', good:'He asked me where I lived.', why:'Reported questions use statement word order.' },
      { bad:'They told that the results were ready.', good:'They said that the results were ready.', why:'"Tell" needs an object: told <b>us</b> that…' },
    ],
    quiz:[
      { q:'"I will call you tomorrow." → She said she ___ the next day.', o:['will call','would call','called','calls'], c:1, e:'will → would in reported speech.' },
      { q:'"Where are you from?" → He asked me where I ___.', o:['am from','was from','were from','from'], c:1, e:'Statement order plus backshift.' },
      { q:'She ___ me that the deadline had moved.', o:['said','told','asked','spoke'], c:1, e:'"Told" takes a direct object.' },
    ] },

  { id:'nominal', unit:'writing', name:'Nominalisation for Academic Style', lv:'C1', mins:13,
    concept:'Turning verbs and adjectives into nouns makes writing denser and more formal — a reliable marker of Band 7.5+ in Task 2.',
    rules:[
      'Verb → noun: <i>they decided</i> → <b>their decision</b>; <i>pollution increased</i> → <b>the increase in pollution</b>.',
      'Adjective → noun: <i>it is important</i> → <b>the importance of</b>.',
      'Nominalised subjects let you pack more information into one sentence.',
      'Do not overdo it — three nominalisations in a row become unreadable.',
    ],
    examples:[
      { bad:'Because governments spend a lot on defence, they cannot fund schools well.', good:'Heavy government spending on defence limits the funding available for schools.', why:'The clause becomes a noun phrase subject — tighter and more academic.' },
      { bad:'It is necessary that we protect forests.', good:'The protection of forests is essential.', why:'Nominalisation removes the weak "it is necessary that" opener.' },
      { bad:'People are worried that jobs will disappear.', good:'Concerns over job losses are widespread.', why:'Two nominalisations produce a compact academic subject.' },
    ],
    quiz:[
      { q:'Nominalise: "The city expanded rapidly."', o:['The city was expanding rapidly.','The rapid expansion of the city.','The city rapidly expands.','Rapidly, the city expanded.'], c:1, e:'Verb "expanded" becomes the noun "expansion".' },
      { q:'Which is the most academic opening?', o:['I think pollution is a big problem.','Pollution is a really big problem.','The severity of urban pollution is widely acknowledged.','Pollution, it is a problem.'], c:2, e:'Nominalised subject with hedged reporting.' },
      { q:'Nominalise: "Students participate more when classes are small."', o:['Students participate more in small classes.','Smaller class sizes increase student participation.','When classes are small students participate.','Small classes, students participate more.'], c:1, e:'Both clauses become noun phrases around one verb.' },
    ] },

  { id:'punctuation', unit:'writing', name:'Punctuation That Costs Bands', lv:'B2', mins:9,
    concept:'Punctuation errors are counted under Grammatical Range and Accuracy. Three errors dominate IELTS scripts: comma splices, missing commas after fronted clauses, and apostrophe misuse.',
    rules:[
      'Never join two full sentences with a comma — use a full stop, semicolon, or conjunction.',
      'Put a comma after a fronted subordinate clause or linker: <i>Although it is costly, …</i> / <i>However, …</i>',
      'Apostrophes show possession or contraction, never plurals: <s>the 1990\'s</s> → the 1990s.',
      'Avoid contractions entirely in Task 1 and Task 2 — write "do not", not "don\'t".',
    ],
    examples:[
      { bad:'The policy failed, it was poorly designed.', good:'The policy failed because it was poorly designed.', why:'Comma splice — add a conjunction.' },
      { bad:'However the results were inconclusive.', good:'However, the results were inconclusive.', why:'A comma always follows a sentence-initial linker.' },
      { bad:'Student\'s should manage their own time.', good:'Students should manage their own time.', why:'Plural, not possessive.' },
    ],
    quiz:[
      { q:'Which is punctuated correctly?', o:['Firstly the cost is prohibitive.','Firstly, the cost is prohibitive.','Firstly; the cost is prohibitive.','Firstly the cost, is prohibitive.'], c:1, e:'Comma after a sentence-initial linker.' },
      { q:'Which contains a comma splice?', o:['Costs rose; demand fell.','Costs rose, demand fell.','Costs rose, so demand fell.','Costs rose. Demand fell.'], c:1, e:'Two independent clauses joined by only a comma.' },
      { q:'Choose the correct form.', o:['in the 1980\'s','in the 1980s','in the 1980s\'','in the 1980`s'], c:1, e:'Decades take no apostrophe.' },
    ] },

  { id:'cohesion', unit:'writing', name:'Cohesion Without Overloading', lv:'C1', mins:12,
    concept:'Coherence and Cohesion is 25% of your writing score. Band 7 needs logical progression — not a linker at the start of every sentence.',
    rules:[
      'Vary your referencing: pronouns (this, these), synonyms, and the "known → new" order.',
      'Signpost sparingly: one linker per paragraph is usually enough.',
      'Each body paragraph needs one clear topic sentence stating its single idea.',
      'Avoid the "Firstly / Secondly / Thirdly / Finally" ladder — it reads mechanical at Band 6.',
    ],
    examples:[
      { bad:'Firstly, cars pollute. Secondly, cars cause noise. Thirdly, cars cause jams.', good:'Private cars impose several costs on cities. Beyond the obvious air pollution, they generate constant noise and, at peak hours, near-permanent congestion.', why:'The list becomes one connected idea with natural progression.' },
      { bad:'Moreover, furthermore, in addition, education is important.', good:'Education matters for a further reason.', why:'Stacked linkers signal mechanical cohesion.' },
      { bad:'The government built schools. The government trained teachers.', good:'The government built new schools and trained the teachers to staff them.', why:'Reference and coordination remove the repetition.' },
    ],
    quiz:[
      { q:'Which topic sentence is strongest?', o:['I will talk about pollution now.','Pollution.','The most pressing consequence of unchecked urban growth is air pollution.','There are many things about pollution.'], c:2, e:'It states one specific idea and links to the essay question.' },
      { q:'What is the main cohesion weakness at Band 6?', o:['Too few paragraphs','Mechanical, overused linking words','Short sentences','Formal vocabulary'], c:1, e:'Band 6 descriptors mention mechanical use of cohesive devices.' },
      { q:'Best replacement for a repeated "students"?', o:['Repeat "students" every time','they / this group / young learners','the peoples','student\'s'], c:1, e:'Varied referencing is exactly what cohesion means.' },
    ] },
];
