/* ═══ BLOOM — core reference data: exams, CEFR, skills, student profile ═══ */

const CEFR = [
  { id:'A1', name:'Beginner',            ielts:'3.0', toefl:'0–31',  pte:'10–29', desc:'Basic phrases, familiar everyday expressions.' },
  { id:'A2', name:'Elementary',          ielts:'3.5', toefl:'32–34', pte:'30–42', desc:'Simple routine exchanges on familiar matters.' },
  { id:'B1', name:'Intermediate',        ielts:'4.5', toefl:'35–45', pte:'43–58', desc:'Handles most travel situations, describes experiences.' },
  { id:'B2', name:'Upper Intermediate',  ielts:'5.5', toefl:'46–59', pte:'59–75', desc:'Fluent enough for regular interaction with native speakers.' },
  { id:'C1', name:'Advanced',            ielts:'7.0', toefl:'60–93', pte:'76–84', desc:'Flexible, effective language for academic and professional use.' },
  { id:'C2', name:'Proficient',          ielts:'8.5', toefl:'94–120',pte:'85–90', desc:'Effortless understanding, precise expression of fine shades of meaning.' },
];
function cefrIdx(id){ return Math.max(0, CEFR.findIndex(c => c.id === id)); }
function cefrOf(id){ return CEFR[cefrIdx(id)]; }

const EXAMS = [
  { id:'ielts-a',  name:'IELTS Academic',        short:'IELTS AC',  ic:'fa-graduation-cap', scale:'band', max:9,   step:0.5, sections:['Listening','Reading','Writing','Speaking'], mins:165, blurb:'University admission worldwide. Four skills, band 0–9.' },
  { id:'ielts-g',  name:'IELTS General Training',short:'IELTS GT',  ic:'fa-passport',       scale:'band', max:9,   step:0.5, sections:['Listening','Reading','Writing','Speaking'], mins:165, blurb:'Migration and work. Easier reading, letter instead of report.' },
  { id:'toefl',    name:'TOEFL iBT',             short:'TOEFL',     ic:'fa-building-columns',scale:'points',max:120,step:1,  sections:['Reading','Listening','Speaking','Writing'], mins:116, blurb:'US-focused academic English. Score 0–120.' },
  { id:'pte',      name:'PTE Academic',          short:'PTE',       ic:'fa-microchip',      scale:'points',max:90, step:1,   sections:['Speaking & Writing','Reading','Listening'], mins:120, blurb:'Computer-scored, results in 48 hours. Score 10–90.' },
  { id:'duolingo', name:'Duolingo English Test', short:'DET',       ic:'fa-bolt',           scale:'points',max:160,step:5,   sections:['Adaptive','Writing','Speaking'], mins:60, blurb:'One hour, at home, adaptive. Score 10–160.' },
  { id:'cambridge',name:'Cambridge English',     short:'Cambridge', ic:'fa-certificate',    scale:'points',max:230,step:1,   sections:['Reading & Use','Writing','Listening','Speaking'], mins:210, blurb:'A2 Key through C2 Proficiency. Certificate never expires.' },
  { id:'oet',      name:'OET (Occupational English Test)', short:'OET', ic:'fa-stethoscope', scale:'grade', max:500, step:10, sections:['Listening','Reading','Writing','Speaking'], mins:170, blurb:'Healthcare-specific English for medical registration. Graded A–E per sub-test; GMC and NMC require B.' },
  { id:'general',  name:'General & Spoken English',short:'General', ic:'fa-comments',       scale:'cefr',  max:6,  step:1,   sections:['Speaking','Vocabulary','Grammar','Listening'], mins:0, blurb:'No exam — build confident everyday and workplace English.' },
];
function examOf(id){ return EXAMS.find(e => e.id === id) || EXAMS[0]; }

const SKILLS = [
  { id:'listening', name:'Listening', ic:'fa-headphones',    tone:'sky'  },
  { id:'reading',   name:'Reading',   ic:'fa-book-open',     tone:'leaf' },
  { id:'writing',   name:'Writing',   ic:'fa-pen-nib',       tone:'amb'  },
  { id:'speaking',  name:'Speaking',  ic:'fa-microphone',    tone:'cor'  },
];
const SUBSKILLS = [
  { id:'grammar',    name:'Grammar',       ic:'fa-diagram-project' },
  { id:'vocabulary', name:'Vocabulary',    ic:'fa-spell-check' },
  { id:'pronounce',  name:'Pronunciation', ic:'fa-wave-square' },
];

/* IELTS band ⇄ other scales (approximate official concordance) */
function bandToTOEFL(b){ const m = {4:31,4.5:34,5:45,5.5:59,6:72,6.5:84,7:94,7.5:101,8:109,8.5:115,9:118}; return m[Math.round(b*2)/2] || 60; }
function bandToPTE(b){ const m = {4:29,4.5:36,5:42,5.5:50,6:58,6.5:65,7:72,7.5:79,8:84,8.5:87,9:89}; return m[Math.round(b*2)/2] || 58; }
function bandToDET(b){ const m = {4:55,4.5:65,5:75,5.5:85,6:95,6.5:105,7:120,7.5:130,8:140,8.5:150,9:160}; return m[Math.round(b*2)/2] || 95; }
/* IELTS band → OET grade + numerical score (OET publishes 0–500 per sub-test) */
function bandToOET(b){
  const r = Math.round(b*2)/2;
  if (r >= 8.5) return { g:'A', n:460 };
  if (r >= 8)   return { g:'A', n:420 };
  if (r >= 7.5) return { g:'B', n:400 };
  if (r >= 7)   return { g:'B', n:360 };
  if (r >= 6.5) return { g:'C+', n:320 };
  if (r >= 5.5) return { g:'C', n:260 };
  if (r >= 4.5) return { g:'D', n:160 };
  return { g:'E', n:80 };
}
const OET_GRADES = [
  { g:'A',  n:'450–500', d:'Very high level of performance', ok:true },
  { g:'B',  n:'350–440', d:'High level — the grade GMC, NMC and AHPRA require', ok:true },
  { g:'C+', n:'300–340', d:'Good level; accepted for writing by the NMC only', ok:false },
  { g:'C',  n:'200–290', d:'Moderate level — below registration requirements', ok:false },
  { g:'D',  n:'100–190', d:'Limited ability', ok:false },
  { g:'E',  n:'0–90',    d:'Very limited ability', ok:false },
];
function bandToCEFR(b){ return b >= 8.5 ? 'C2' : b >= 7 ? 'C1' : b >= 5.5 ? 'B2' : b >= 4.5 ? 'B1' : b >= 3.5 ? 'A2' : 'A1'; }
function bandLabel(b){ return Number(b).toFixed(1); }
function roundBand(x){ return Math.max(1, Math.min(9, Math.round(x * 2) / 2)); }
function overallBand(s){
  const v = [s.listening, s.reading, s.writing, s.speaking].filter(n => typeof n === 'number');
  if (!v.length) return null;
  const avg = v.reduce((a,b) => a + b, 0) / v.length;
  return Math.round(avg * 2) / 2;
}
function scoreInExam(band, examId){
  if (examId === 'toefl') return bandToTOEFL(band) + ' / 120';
  if (examId === 'pte') return bandToPTE(band) + ' / 90';
  if (examId === 'duolingo') return bandToDET(band) + ' / 160';
  if (examId === 'oet'){ const o = bandToOET(band); return 'Grade ' + o.g + ' · ' + o.n; }
  if (examId === 'cambridge') return bandToCEFR(band) + ' level';
  if (examId === 'general') return bandToCEFR(band);
  return 'Band ' + bandLabel(band);
}

const PURPOSES = [
  { id:'university', name:'University admission', ic:'fa-graduation-cap', note:'Most universities ask Band 6.5–7.0 overall with no band below 6.0.' },
  { id:'medical',    name:'Medical registration', ic:'fa-stethoscope',    note:'GMC requires OET Grade B in each sub-test, or IELTS 7.5 overall with 7.0 each. NMC accepts C+ in writing.' },
  { id:'immigration',name:'Immigration / PR',     ic:'fa-plane-departure', note:'Canada CLB 9 ≈ Band 8 L / 7 R / 7 W / 7 S. Australia PR ≈ Band 7 each.' },
  { id:'work',       name:'Work or licensing',    ic:'fa-briefcase',      note:'Nursing and medical registration usually require Band 7.0 each.' },
  { id:'school',     name:'School / foundation',  ic:'fa-school',         note:'Foundation programmes typically accept Band 5.5–6.0.' },
  { id:'personal',   name:'Personal confidence',  ic:'fa-seedling',       note:'No deadline — steady CEFR progress and fluent everyday English.' },
];

const COUNTRIES = ['India','Pakistan','Bangladesh','Nepal','Sri Lanka','China','Vietnam','Philippines','Indonesia','Thailand','Nigeria','Egypt','Iran','Uzbekistan','Brazil','Colombia','Türkiye','Other'];
const L1 = ['Hindi','Urdu','Bengali','Punjabi','Tamil','Telugu','Nepali','Sinhala','Mandarin','Cantonese','Vietnamese','Tagalog','Indonesian','Thai','Arabic','Persian','Uzbek','Portuguese','Spanish','Turkish','Other'];

/* Native-language interference patterns — powers targeted tutor advice */
const L1_TRAPS = {
  Hindi:['Articles (a/an/the) — Hindi has no articles, so they are the single most common IELTS error for Hindi speakers.','Present perfect vs past simple ("I have gone yesterday" → "I went yesterday").','Word order in questions ("What you are doing?" → "What are you doing?").'],
  Urdu:['Articles (a/an/the) are absent in Urdu — expect frequent omissions.','Prepositions after verbs ("discuss about" → "discuss").','Continuous forms with stative verbs ("I am knowing" → "I know").'],
  Bengali:['Articles and plural -s agreement.','Direct translation of Bengali idioms into English.','Consonant clusters in pronunciation (school → "iskool").'],
  Mandarin:['Plural -s and third-person -s endings, absent in Mandarin.','Verb tense marking — Mandarin uses time words instead of inflection.','Final consonants and /l/ vs /n/ in pronunciation.'],
  Cantonese:['Past tense endings and plural marking.','Th- sounds (/θ/, /ð/) realised as /f/ or /d/.','Article use before countable nouns.'],
  Vietnamese:['Final consonant sounds are frequently dropped.','Plural and past-tense endings.','Word stress — Vietnamese is tonal, English is stress-timed.'],
  Arabic:['P vs B sounds ("barking" for "parking").','Article overuse ("the life is hard").','Subject pronoun dropping ("Is very important").'],
  Persian:['Article use and the indefinite "a/an".','Word order in relative clauses.','W vs V sounds.'],
  Tagalog:['Preposition choice and gendered pronouns (he/she confusion).','Subject-verb agreement.','Verb tense consistency in narratives.'],
  Tamil:['Articles and countable/uncountable distinctions.','Direct question word order.','Vowel insertion between consonants in speech.'],
  default:['Article use (a/an/the) before nouns.','Consistent verb tense across a paragraph.','Subject–verb agreement with plural subjects.'],
};
function l1Traps(lang){ return L1_TRAPS[lang] || L1_TRAPS.default; }

/* Demo student — replaced by whatever the user enters at onboarding */
const DEMO_STUDENT = {
  name:'Priya Sharma', email:'priya.sharma@email.com', country:'India', l1:'Hindi',
  exam:'ielts-a', target:7.0, testDate:'', purpose:'university', hoursPerDay:2,
  level:'B1', joined:'2026-08-04',
};

const BADGES = [
  { id:'first-steps',  name:'First Steps',        ic:'fa-shoe-prints',   desc:'Completed the placement test',            xp:50 },
  { id:'week-streak',  name:'7-Day Streak',       ic:'fa-fire',          desc:'Studied seven days in a row',             xp:100 },
  { id:'word-100',     name:'Hundred Words',      ic:'fa-spell-check',   desc:'Mastered 100 vocabulary items',           xp:150 },
  { id:'first-essay',  name:'First Draft',        ic:'fa-pen-nib',       desc:'Submitted your first Task 2 essay',       xp:75 },
  { id:'ten-essays',   name:'Essay Machine',      ic:'fa-file-pen',      desc:'Ten writing tasks evaluated',             xp:250 },
  { id:'first-speak',  name:'Found Your Voice',   ic:'fa-microphone',    desc:'Completed a speaking part',               xp:75 },
  { id:'speak-master', name:'Speaking Master',    ic:'fa-comments',      desc:'Twenty speaking responses recorded',      xp:300 },
  { id:'first-mock',   name:'Mock Rookie',        ic:'fa-clipboard-list',desc:'Finished your first full mock',           xp:120 },
  { id:'band-7',       name:'Band 7 Achiever',    ic:'fa-award',         desc:'Reached an estimated Band 7.0',           xp:500 },
  { id:'grammar-ace',  name:'Grammar Ace',        ic:'fa-diagram-project',desc:'Passed ten grammar lesson tests',        xp:200 },
];

const XP_PER_LEVEL = 500;
function xpLevel(xp){ return Math.floor(xp / XP_PER_LEVEL) + 1; }
function xpInLevel(xp){ return xp % XP_PER_LEVEL; }
