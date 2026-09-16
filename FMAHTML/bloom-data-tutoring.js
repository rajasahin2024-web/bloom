/* ═══ BLOOM — 1-on-1 tutoring: teachers, availability, bookings ═══ */

const TEACHERS = [
  { id:'ew', name:'Dr. Sarah Whitfield', init:'SW', role:'Former IELTS examiner', years:14, from:'United Kingdom',
    skills:['listening','reading','strategy'], parts:['l1','l2','l3','l4','r1','r2','r3','strategy'],
    bio:'Fourteen years marking IELTS Listening and Reading for the British Council. Specialises in students who understand the content but keep losing marks on transfer and timing.',
    langs:['English','French'], rating:4.9, sessions:1840, focus:'Listening accuracy · Reading speed' },
  { id:'em', name:'Dr. Elena Marchetti', init:'EM', role:'Writing examiner & trainer', years:11, from:'Italy',
    skills:['writing','grammar'], parts:['w1','w2','gv'],
    bio:'Trains IELTS writing examiners. Marks your essay against the official descriptors line by line, then rewrites one paragraph with you so you can see the difference.',
    langs:['English','Italian','Spanish'], rating:5.0, sessions:2210, focus:'Task 2 structure · Band 7 grammar' },
  { id:'mc', name:'Michael Chen', init:'MC', role:'Speaking examiner & pronunciation coach', years:9, from:'Singapore',
    skills:['speaking','pronunciation'], parts:['s1','s2','s3'],
    bio:'Full mock interviews under exam conditions with immediate criterion-by-criterion feedback. Particularly strong on pronunciation for Mandarin, Cantonese and Vietnamese speakers.',
    langs:['English','Mandarin'], rating:4.9, sessions:1560, focus:'Part 2 fluency · Pronunciation' },
  { id:'jo', name:'James Okonkwo', init:'JO', role:'IELTS trainer, British Council', years:12, from:'Nigeria',
    skills:['reading','strategy','writing'], parts:['r1','r2','r3','rgt','w1','strategy'],
    bio:'Reading strategy specialist. If you understand the passages but never finish the paper, this is the session to book.',
    langs:['English'], rating:4.8, sessions:1320, focus:'Reading timing · Task 1 reports' },
  { id:'ap', name:'Anjali Prasad', init:'AP', role:'Senior tutor · South Asia programme', years:8, from:'India',
    skills:['grammar','writing','speaking'], parts:['gv','w2','s1','s2'],
    bio:'Works almost exclusively with Hindi, Urdu, Bengali and Tamil speakers. Targets articles, tense consistency and the direct-translation habits that cap students at Band 6.',
    langs:['English','Hindi','Bengali'], rating:4.9, sessions:1970, focus:'Articles & tenses · Essay planning' },
  { id:'lw', name:'Li Wei', init:'LW', role:'Senior tutor · East Asia programme', years:7, from:'China',
    skills:['speaking','listening','pronunciation'], parts:['s1','s2','s3','l3','l4'],
    bio:'Focuses on the specific obstacles for Mandarin and Cantonese speakers: final consonants, plural and past-tense endings, and extending answers past one sentence.',
    langs:['English','Mandarin','Cantonese'], rating:4.8, sessions:1140, focus:'Speaking extension · Final consonants' },
  { id:'rk', name:'Rosa Kimura', init:'RK', role:'General & Business English', years:10, from:'Brazil',
    skills:['speaking','grammar','strategy'], parts:['s1','s3','gv','strategy'],
    bio:'For students preparing for work, interviews or daily life rather than a specific band. Conversation-led with correction afterwards, never during.',
    langs:['English','Portuguese','Spanish'], rating:4.9, sessions:980, focus:'Confidence · Workplace English' },
];
function teacherOf(id){ return TEACHERS.find(t => t.id === id) || TEACHERS[0]; }

const TUT_FOCUS = [
  { id:'listening', name:'Listening', ic:'fa-headphones' },
  { id:'reading',   name:'Reading',   ic:'fa-book-open' },
  { id:'writing',   name:'Writing',   ic:'fa-pen-nib' },
  { id:'speaking',  name:'Speaking',  ic:'fa-microphone' },
  { id:'grammar',   name:'Grammar',   ic:'fa-diagram-project' },
  { id:'pronunciation', name:'Pronunciation', ic:'fa-wave-square' },
  { id:'strategy',  name:'Exam strategy', ic:'fa-chess' },
];
const TUT_FORMATS = {
  video:  { name:'Video call',   ic:'fa-video',        note:'Zoom link sent on booking' },
  chat:   { name:'Text chat',    ic:'fa-comments',     note:'Written, good for essay review' },
  essay:  { name:'Essay review', ic:'fa-file-pen',     note:'Send work ahead, discuss live' },
};
const TUT_TIMES = ['08:00','09:00','10:00','11:30','13:00','14:30','16:00','17:30','19:00','20:30'];
const TUT_LEN = 45;

/* Deterministic availability so the calendar is stable between renders */
function tutHash(s){ let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 99991; return h; }
function tutISO(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function tutDate(iso){ return new Date(iso + 'T00:00:00'); }
function tutEnd(t){ const [h,m] = t.split(':').map(Number); const x = h*60+m+TUT_LEN; return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0'); }

function tutBookings(){ B.tutoring = B.tutoring || []; return B.tutoring; }
function tutUpcoming(){ const t = today(); return tutBookings().filter(b => b.status === 'confirmed' && b.date >= t).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time)); }
function tutPast(){ const t = today(); return tutBookings().filter(b => b.status !== 'confirmed' || b.date < t); }

function tutSlot(iso, time, focus){
  const pool = TEACHERS.filter(t => !focus || t.skills.includes(focus));
  const list = pool.length ? pool : TEACHERS;
  const h = tutHash(iso + time + (focus||'any'));
  const teacher = list[h % list.length];
  const past = new Date(iso + 'T' + time) < new Date();
  const booked = tutBookings().some(b => b.status === 'confirmed' && b.date === iso && b.time === time);
  return { time, teacher, taken: past || booked || h % 11 < 3 };
}
function tutDaySlots(iso, focus){ return TUT_TIMES.map(t => tutSlot(iso, t, focus)); }
function tutFreeCount(iso, focus){ return tutDaySlots(iso, focus).filter(s => !s.taken).length; }

/* month grid of dates for the strip */
function tutMonthDates(offset){
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset);
  const y = base.getFullYear(), m = base.getMonth();
  const n = new Date(y, m+1, 0).getDate();
  return Array.from({length:n}, (_,i) => tutISO(new Date(y, m, i+1)));
}
function tutWeekDates(offset){
  const d = new Date(); const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + offset*7);
  return Array.from({length:7}, (_,i) => { const x = new Date(d); x.setDate(d.getDate()+i); return tutISO(x); });
}

/* Sample completed sessions so the feed is populated on a fresh account */
const TUT_SEED_FEED = [
  { t:'ap', focus:'writing', note:'I keep getting 6.0 for grammar even though my ideas are good. Went through my last three essays and found the same article errors in all of them.', mins:45, band:'Task 2' },
  { t:'mc', focus:'speaking', note:'Full mock interview. I ran out of things to say in Part 2 at about 70 seconds — we built four extension techniques and re-recorded.', mins:45, band:'Part 2' },
  { t:'jo', focus:'reading', note:'I never finish Passage 3. We timed my skim and it was 140 wpm. Worked on locating rather than reading.', mins:45, band:'Passage 3' },
  { t:'em', focus:'writing', note:'Task 1 overview paragraph — I was describing data instead of summarising patterns. Rewrote five overviews in the session.', mins:45, band:'Task 1' },
  { t:'ew', focus:'listening', note:'Lost 6 marks in Part 1 of my last mock, all spelling. Drilled dates, money formats and name spelling.', mins:45, band:'Part 1' },
];
