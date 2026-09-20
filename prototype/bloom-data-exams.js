/* ═══════════════════════════════════════════════════════════════
   BLOOM — genuine exam blueprints
   TOEFL iBT, PTE Academic and the Duolingo English Test do not
   share IELTS's structure, item types or scoring. Each gets its own
   section plan, task list and official score table here.
═══════════════════════════════════════════════════════════════ */

/* ── TOEFL iBT ──
   Four sections in a fixed order, each scaled 0–30, total 0–120.
   Reading and Listening are raw-to-scaled; Speaking and Writing are
   rubric-scored 0–4 / 0–5 then converted. */
const TOEFL_BLUEPRINT = {
  exam:'toefl', name:'TOEFL iBT', total:120, mins:116,
  sections:[
    { id:'reading', name:'Reading', mins:35, items:20, scaled:30, order:1,
      desc:'Two academic passages, roughly 700 words each, with 10 questions per passage.',
      tasks:[
        { t:'Factual information', n:4, note:'What the passage explicitly states.' },
        { t:'Negative factual information', n:2, note:'Which option is NOT stated — the highest-error type.' },
        { t:'Inference', n:3, note:'What is strongly implied but never said.' },
        { t:'Vocabulary in context', n:4, note:'A highlighted word; pick the closest meaning as used here.' },
        { t:'Sentence simplification', n:2, note:'Which sentence best restates the highlighted one.' },
        { t:'Insert text', n:2, note:'Where does this sentence belong — four square markers.' },
        { t:'Prose summary', n:3, note:'Choose three of six statements. Worth 2 points, not 1.' },
      ] },
    { id:'listening', name:'Listening', mins:36, items:28, scaled:30, order:2,
      desc:'Two conversations (5 questions each) and three lectures (6 questions each). You hear each once, and may take notes.',
      tasks:[
        { t:'Gist-content', n:5, note:'What is the lecture mainly about.' },
        { t:'Gist-purpose', n:4, note:'Why does the student go to see the professor.' },
        { t:'Detail', n:7, note:'Specific facts stated in the recording.' },
        { t:'Function of what is said', n:4, note:'Why does the speaker say this — replay question.' },
        { t:'Speaker attitude', n:3, note:'Tone, certainty, degree of agreement.' },
        { t:'Organisation', n:2, note:'How the lecture is structured.' },
        { t:'Connecting content', n:3, note:'Table or ordering task across the whole lecture.' },
      ] },
    { id:'speaking', name:'Speaking', mins:16, items:4, scaled:30, order:3, rubric:4,
      desc:'Four tasks, each scored 0–4 by two raters and scaled to 30. Preparation time is very short.',
      tasks:[
        { t:'Task 1 · Independent speaking', n:1, note:'15 seconds to prepare, 45 seconds to speak. State a preference and justify it.' },
        { t:'Task 2 · Read/listen/speak (campus)', n:1, note:'Read a notice, hear two students discuss it, then summarise their opinion. 30s prep, 60s speak.' },
        { t:'Task 3 · Read/listen/speak (academic)', n:1, note:'Read a definition, hear a lecture with examples, then explain the concept. 30s prep, 60s speak.' },
        { t:'Task 4 · Listen/speak (lecture summary)', n:1, note:'Hear an academic lecture and summarise the two main points. 20s prep, 60s speak.' },
      ] },
    { id:'writing', name:'Writing', mins:29, items:2, scaled:30, order:4, rubric:5,
      desc:'Two tasks, each scored 0–5 and scaled to 30. The second replaced the old independent essay in 2023.',
      tasks:[
        { t:'Integrated writing', n:1, note:'20 minutes. Read a passage, hear a lecture that challenges it, summarise how the lecture casts doubt on the reading. 150–225 words.' },
        { t:'Writing for an academic discussion', n:1, note:'10 minutes. A professor poses a question and two students answer. Contribute your own view with a reason. At least 100 words.' },
      ] },
  ],
  /* official raw → scaled tables (Reading /20 incl. 2-point summary items, Listening /28) */
  scaleReading:[[22,30],[21,29],[20,28],[19,27],[18,26],[17,24],[16,23],[15,22],[14,21],[13,19],[12,18],[11,16],[10,15],[9,13],[8,11],[7,10],[6,8],[5,6],[4,4],[3,3],[2,2],[1,1],[0,0]],
  scaleListening:[[28,30],[27,29],[26,28],[25,27],[24,26],[23,25],[22,24],[21,23],[20,22],[19,20],[18,19],[17,18],[16,16],[15,15],[14,14],[13,12],[12,11],[11,9],[10,8],[9,7],[8,6],[7,5],[6,4],[5,3],[4,2],[3,1],[0,0]],
  bands:[[110,'Advanced (C1+)'],[95,'High Intermediate to Advanced'],[80,'Accepted by most universities'],[65,'Intermediate'],[42,'Low Intermediate'],[0,'Basic']],
};

/* ── PTE ACADEMIC ──
   Three parts, but scoring is by *skill* not by part, because most items
   contribute to two skills at once. Overall 10–90. */
const PTE_BLUEPRINT = {
  exam:'pte', name:'PTE Academic', total:90, min:10, mins:120,
  sections:[
    { id:'sw', name:'Part 1 · Speaking & Writing', mins:60, order:1,
      desc:'Seven item types. Most are machine-scored on content, oral fluency and pronunciation simultaneously.',
      tasks:[
        { t:'Personal introduction', n:1, note:'Unscored. 25s prepare, 30s record.' },
        { t:'Read aloud', n:6, note:'40s to read a 60-word text aloud. Scores reading, oral fluency and pronunciation.' },
        { t:'Repeat sentence', n:10, note:'Hear a sentence once and repeat it exactly. Scores listening and speaking.' },
        { t:'Describe image', n:6, note:'25s to study a chart, 40s to describe it. The single highest-weighted speaking item.' },
        { t:'Re-tell lecture', n:3, note:'Hear a 90s lecture, 10s prepare, 40s re-tell it.' },
        { t:'Answer short question', n:10, note:'One-word or short-phrase answer to a simple question.' },
        { t:'Summarize written text', n:2, note:'10 minutes. One sentence of 5–75 words summarising a passage.' },
        { t:'Essay', n:1, note:'20 minutes. 200–300 words on a given prompt.' },
      ] },
    { id:'reading', name:'Part 2 · Reading', mins:30, order:2,
      desc:'Five item types. Multiple-answer items carry negative marking.',
      tasks:[
        { t:'Reading & writing: fill in the blanks', n:6, note:'Drop-down blanks. Scores reading and writing together.' },
        { t:'Multiple choice, multiple answers', n:2, note:'Negative marking — a wrong tick cancels a right one.' },
        { t:'Re-order paragraphs', n:3, note:'Drag text boxes into a logical sequence.' },
        { t:'Reading: fill in the blanks', n:5, note:'Drag words from a bank into the gaps.' },
        { t:'Multiple choice, single answer', n:2, note:'One correct option, no negative marking.' },
      ] },
    { id:'listening', name:'Part 3 · Listening', mins:30, order:3,
      desc:'Eight item types. Write from dictation is worth disproportionately many points.',
      tasks:[
        { t:'Summarize spoken text', n:2, note:'10 minutes each. 50–70 words summarising a 60–90s recording.' },
        { t:'Multiple choice, multiple answers', n:2, note:'Negative marking applies.' },
        { t:'Fill in the blanks', n:2, note:'Type the missing words while the transcript scrolls.' },
        { t:'Highlight correct summary', n:2, note:'Choose the paragraph that best summarises the recording.' },
        { t:'Multiple choice, single answer', n:2, note:'One correct option.' },
        { t:'Select missing word', n:2, note:'The last word or phrase is beeped out — choose it.' },
        { t:'Highlight incorrect words', n:2, note:'Click the words in the transcript that differ from the audio.' },
        { t:'Write from dictation', n:3, note:'Type a sentence heard once. Very high points-per-item.' },
      ] },
  ],
  /* PTE reports four communicative skills and six enabling skills */
  comm:[
    { id:'listening', name:'Listening', from:'Repeat sentence · Re-tell lecture · all of Part 3' },
    { id:'reading',   name:'Reading',   from:'Read aloud · fill in the blanks · all of Part 2' },
    { id:'speaking',  name:'Speaking',  from:'Read aloud · Repeat sentence · Describe image · Re-tell lecture' },
    { id:'writing',   name:'Writing',   from:'Summarize written text · Essay · listening fill in the blanks' },
  ],
  enabling:[
    { id:'grammar',   name:'Grammar',        note:'Correct use of tense, agreement and structure in written and spoken output.' },
    { id:'oral',      name:'Oral fluency',   note:'Smooth, effortless, natural rate. Hesitation and repair cost most here.' },
    { id:'pron',      name:'Pronunciation',  note:'Intelligibility to a regular speaker of the language.' },
    { id:'spelling',  name:'Spelling',       note:'Consistent to one convention — British or American, not mixed.' },
    { id:'vocab',     name:'Vocabulary',     note:'Appropriate word choice for the academic register.' },
    { id:'discourse', name:'Written discourse', note:'Structure, coherence and logical development in the essay.' },
  ],
  bands:[[85,'Expert (C2)'],[76,'Very good (C1)'],[65,'Good (C1)'],[58,'Competent (B2)'],[50,'Modest (B2)'],[42,'Limited (B1)'],[30,'Basic (B1)'],[10,'Beginner (A2)']],
};

/* ── DUOLINGO ENGLISH TEST ──
   One adaptive graded section plus an unscored-then-reviewed video
   interview. Overall 10–160 in 5-point steps, with four subscores. */
const DET_BLUEPRINT = {
  exam:'duolingo', name:'Duolingo English Test', total:160, min:10, step:5, mins:60,
  sections:[
    { id:'adaptive', name:'Adaptive section', mins:45, order:1,
      desc:'Item difficulty adjusts to your answers in real time. Every item feeds two of the four subscores.',
      tasks:[
        { t:'Read and complete', n:6, note:'A c-test: every other letter of some words is removed. Restore them.' },
        { t:'Read and select', n:8, note:'Decide whether each word shown is a real English word.' },
        { t:'Listen and select', n:8, note:'Decide whether each spoken word is a real English word.' },
        { t:'Listen and type', n:6, note:'Dictation. Type the sentence exactly; you may replay it twice.' },
        { t:'Read aloud', n:6, note:'Read a sentence into the microphone.' },
        { t:'Write about the photo', n:3, note:'One minute to describe an image in at least one sentence.' },
        { t:'Interactive reading', n:2, note:'A passage with six linked task types — the highest-value item.' },
        { t:'Interactive listening', n:2, note:'A conversation you respond inside, then summarise.' },
        { t:'Read, then write', n:1, note:'Five minutes. Respond to a written prompt in at least 50 words.' },
        { t:'Read, then speak', n:1, note:'Speak for 90 seconds on a written prompt.' },
        { t:'Listen, then speak', n:1, note:'Hear a question and answer it aloud for 90 seconds.' },
        { t:'Speak about the photo', n:1, note:'90 seconds describing an image aloud.' },
      ] },
    { id:'sample', name:'Video interview & writing sample', mins:10, order:2, unscored:true,
      desc:'Not scored, but sent to institutions with your certificate. Treat it as part of the application.',
      tasks:[
        { t:'Video interview', n:2, note:'Choose one of two prompts, speak for 1–3 minutes.' },
        { t:'Writing sample', n:1, note:'Choose one of two prompts, write for 3–5 minutes.' },
      ] },
  ],
  subs:[
    { id:'literacy',      name:'Literacy',      from:'Reading + Writing', note:'How well you read and write — the strongest predictor of academic performance.' },
    { id:'comprehension', name:'Comprehension', from:'Reading + Listening', note:'How well you understand written and spoken English.' },
    { id:'conversation',  name:'Conversation',  from:'Listening + Speaking', note:'How well you follow and take part in spoken exchanges.' },
    { id:'production',    name:'Production',    from:'Writing + Speaking', note:'How clearly you produce language yourself.' },
  ],
  bands:[[140,'C2'],[120,'C1'],[95,'B2'],[65,'B1'],[35,'A2'],[10,'A1']],
  accept:[['160','Any university, no conditions'],['120','Most postgraduate programmes'],['115','Typical undergraduate minimum'],['105','Widely accepted floor'],['95','Foundation and pathway courses']],
};

const BLUEPRINTS = { toefl:TOEFL_BLUEPRINT, pte:PTE_BLUEPRINT, duolingo:DET_BLUEPRINT };
function blueprintFor(examId){ return BLUEPRINTS[examId] || null; }
function hasBlueprint(examId){ return !!BLUEPRINTS[examId]; }

/* raw → scaled lookup */
function toeflScale(raw, which){
  const table = which === 'reading' ? TOEFL_BLUEPRINT.scaleReading : TOEFL_BLUEPRINT.scaleListening;
  for (const [r, s] of table) if (raw >= r) return s;
  return 0;
}
function toeflRubricToScaled(avg, outOf){ return Math.round(avg / outOf * 30); }
function bandLabelFor(examId, score){
  const bp = blueprintFor(examId); if (!bp) return '';
  for (const [min, label] of bp.bands) if (score >= min) return label;
  return bp.bands[bp.bands.length-1][1];
}
/* DET reports in 5-point steps */
function detRound(n){ return Math.max(10, Math.min(160, Math.round(n / 5) * 5)); }

/* exam-specific mock definitions, replacing the IELTS clones */
const EXAM_MOCKS = [
  { id:'x-toefl-full', exam:'toefl', kind:'full', name:'TOEFL iBT — Full Mock', mins:116, level:'B2–C1',
    desc:'All four sections in the official order, each scaled 0–30, with a 0–120 total and per-item-type analysis.',
    parts:['Reading · 35 min','Listening · 36 min','Speaking · 16 min','Writing · 29 min'] },
  { id:'x-toefl-rl', exam:'toefl', kind:'section', name:'TOEFL Reading & Listening', mins:71, level:'B2–C1',
    desc:'The two machine-scored sections, with the raw-to-scaled conversion shown question by question.',
    parts:['Reading · 20 items','Listening · 28 items'] },
  { id:'x-toefl-sw', exam:'toefl', kind:'section', name:'TOEFL Speaking & Writing', mins:45, level:'B2–C1',
    desc:'Four speaking tasks and both writing tasks, scored against the official 0–4 and 0–5 rubrics.',
    parts:['Speaking · 4 tasks','Writing · Integrated + Discussion'] },
  { id:'x-pte-full', exam:'pte', kind:'full', name:'PTE Academic — Full Mock', mins:120, level:'B2–C1',
    desc:'All three parts, scored the way PTE actually scores: four communicative skills and six enabling skills, overall 10–90.',
    parts:['Speaking & Writing · 60 min','Reading · 30 min','Listening · 30 min'] },
  { id:'x-pte-sw', exam:'pte', kind:'section', name:'PTE Speaking & Writing', mins:60, level:'B2–C1',
    desc:'The longest and most heavily weighted part, including Describe Image and the 200–300 word essay.',
    parts:['8 item types','39 items'] },
  { id:'x-pte-lr', exam:'pte', kind:'section', name:'PTE Reading & Listening', mins:60, level:'B2–C1',
    desc:'Both machine-scored parts, with negative marking applied exactly as in the real test.',
    parts:['Reading · 18 items','Listening · 17 items'] },
  { id:'x-det-full', exam:'duolingo', kind:'full', name:'Duolingo English Test — Adaptive Mock', mins:60, level:'B1–C1',
    desc:'The adaptive section plus the video interview, returning a 10–160 score and all four subscores.',
    parts:['Adaptive · 45 min','Interview & writing sample · 10 min'] },
  { id:'x-det-quick', exam:'duolingo', kind:'mini', name:'DET Quick Adaptive Check', mins:20, level:'B1–C1',
    desc:'A shortened adaptive run — enough items to estimate your score within about 10 points.',
    parts:['Adaptive · 20 min'] },
];
