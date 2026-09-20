/* ═══ BLOOM — staff data: roles, cohorts, students, terms, tasks ═══ */

const ROLES = {  student: { name:'Student',  ic:'fa-user-graduate', home:'dashboard' },
  teacher: { name:'Teacher',  ic:'fa-chalkboard-user', home:'faculty' },
  admin:   { name:'Admin',    ic:'fa-shield-halved', home:'admin' },
};

/* ── NON-TEACHING STAFF ── */
const STAFF = [
  { id:'mf', name:'Meriam Friaa', init:'MF', role:'Operational Leader', dept:'Operations',
    email:'meriam@bloomielts.com', since:'2021', langs:['English','French','Arabic'],
    owns:['Admissions & placement','Timetabling & staffing','Exam entries','FMA Overseas liaison','Student success','Outcome reporting'],
    bio:'Runs everything that is not a lesson — admissions, cohort timetabling, teacher allocation, exam entries, the FMA Overseas partnership and the student-success programme that catches a student before they drift.',
    quote:'A student does not fail because the teaching was wrong. They fail because nobody noticed they had stopped turning up, or because their test was booked before they were ready.' },
  { id:'ho', name:'Hannah Obeng', init:'HO', role:'Admissions Officer', dept:'Operations',
    email:'admissions@bloomielts.com', since:'2023', langs:['English','Twi'],
    owns:['Applications','Placement scheduling','Welcome onboarding'],
    bio:'First point of contact for every applicant. Books placement tests, checks prior study evidence and assigns cohorts.' },
  { id:'dt', name:'Daniel Tomlin', init:'DT', role:'Exams & Compliance', dept:'Operations',
    email:'exams@bloomielts.com', since:'2022', langs:['English','Spanish'],
    owns:['Test-centre bookings','Readiness sign-off','Regulator requirement checks'],
    bio:'Books every IELTS, OET and TOEFL sitting, and verifies the current requirement with the regulator before a student pays an entry fee.' },
  { id:'sk', name:'Sana Kaur', init:'SK', role:'Student Success Lead', dept:'Student services',
    email:'success@bloomielts.com', since:'2022', langs:['English','Punjabi','Hindi'],
    owns:['Attendance monitoring','At-risk intervention','Pastoral support'],
    bio:'Watches the attendance and activity data and calls students before a quiet week turns into a dropped course.' },
  { id:'pm', name:'Paulo Mendes', init:'PM', role:'FMA Overseas Counsellor', dept:'Study abroad',
    email:'overseas@bloomielts.com', since:'2024', langs:['English','Portuguese','Spanish'],
    owns:['University shortlisting','Applications & offers','Visa and finance filing'],
    bio:'Seconded from Future MedsAcademy. Turns a Bloom score report into a shortlist, then into offers and a visa.' },
  { id:'ry', name:'Dr. Rana Yusuf', init:'RY', role:'Clinical Lead · OET', dept:'Medical English',
    email:'medical@bloomielts.com', since:'2023', langs:['English','Arabic','Urdu'],
    owns:['OET role-plays','Referral-letter marking','GMC & NMC pathway'],
    bio:'A practising clinician from the Future MedsAcademy faculty. Plays the patient in OET speaking role-plays and second-marks every referral letter for clinical accuracy.' },
];
function staffOf(id){ return STAFF.find(s => s.id === id); }
const DEPTS = ['Operations','Student services','Study abroad','Medical English'];

const NAV_BY_ROLE = {
  student: ['dashboard','library','plan','tutor','tutoring','_skills','reading','listening','writing','speaking','_lang','vocab','grammar','_exam','mocks','progress','profile'],
  teacher: ['faculty','facultyplan','content','roster','_school','library','tutoring','_tools','mocks','grammar'],
  admin:   ['admin','adminplan','content','people','operations','_insight','analytics','_school','library'],
};

/* ── COHORTS ── */
const COHORTS = [
  { id:'c-int-a', name:'IELTS Intensive · Morning A', exam:'ielts-a', level:'B1–B2', start:'2026-09-07', weeks:8, cap:18, enrolled:16, room:'Room 2 · Online', teacher:'em', days:['Mon','Wed','Fri'], time:'09:00–11:00' },
  { id:'c-int-b', name:'IELTS Intensive · Evening B', exam:'ielts-a', level:'B2–C1', start:'2026-09-07', weeks:8, cap:18, enrolled:18, room:'Room 1 · Online', teacher:'jo', days:['Tue','Thu'], time:'18:30–21:00' },
  { id:'c-gt',    name:'IELTS General Training', exam:'ielts-g', level:'B1–B2', start:'2026-09-14', weeks:6, cap:14, enrolled:9, room:'Room 3', teacher:'ap', days:['Sat'], time:'10:00–14:00' },
  { id:'c-speak', name:'Speaking Confidence Lab', exam:'general', level:'A2–B1', start:'2026-09-21', weeks:4, cap:10, enrolled:10, room:'Studio', teacher:'mc', days:['Mon','Thu'], time:'17:00–18:30' },
  { id:'c-toefl', name:'TOEFL iBT Prep', exam:'toefl', level:'B2–C1', start:'2026-10-05', weeks:6, cap:16, enrolled:4, room:'Room 2', teacher:'ew', days:['Tue','Fri'], time:'14:00–16:30' },
  { id:'c-found', name:'Foundation English', exam:'general', level:'A1–A2', start:'2026-09-07', weeks:12, cap:20, enrolled:17, room:'Room 4', teacher:'rk', days:['Mon','Wed'], time:'11:30–13:00' },
];
function cohortOf(id){ return COHORTS.find(c => c.id === id) || COHORTS[0]; }

/* ── STUDENTS ── */
const FIRST = ['Priya','Rahul','Aisha','Chen','Mei','Nguyen','Fatima','Arjun','Sofia','Yusuf','Ananya','Wei','Linh','Hassan','Nadia','Kiran','Thanh','Zara','Ravi','Ming','Sara','Omar','Divya','Jun','Lakshmi','Tuan','Amara','Bilal','Preeti','Hao','Ayesha','Karan','Nu','Farah','Vikram','Xiu','Imran','Sneha','Duc','Leila'];
const LAST = ['Sharma','Patel','Khan','Wang','Li','Tran','Ahmed','Singh','Rossi','Demir','Gupta','Zhang','Pham','Malik','Haddad','Reddy','Le','Iqbal','Kumar','Chen','Ali','Nair','Liu','Rao','Nguyen','Osei','Yilmaz','Das','Wu','Farooq'];

function seedStudents(){
  const out = [];
  const now = new Date('2026-09-08');
  for (let i = 0; i < 84; i++){
    const h = ((i + 7) * 2654435761) >>> 0;
    const pick = (shift, n) => ((h >>> shift) % n);
    const f = FIRST[pick(0, FIRST.length)], l = LAST[pick(5, LAST.length)];
    const co = COHORTS[pick(3, COHORTS.length)];
    const start = 3.5 + pick(7, 9) * 0.5;
    const gain = pick(11, 5) * 0.25;
    const cur = Math.min(9, start + gain);
    const target = Math.min(9, Math.max(cur + 0.5, 5.5 + pick(13, 8) * 0.25));
    const joined = new Date(now); joined.setDate(joined.getDate() - (7 + (h % 160)));
    const lastSeenRaw = pick(17, 20);
    const lastSeen = lastSeenRaw < 12 ? lastSeenRaw % 4 : lastSeenRaw < 17 ? 4 + (lastSeenRaw % 3) : 8 + (lastSeenRaw % 9);
    out.push({
      id: 'S' + String(1000 + i),
      name: f + ' ' + l,
      email: (f + '.' + l).toLowerCase() + '@email.com',
      country: COUNTRIES[pick(9, COUNTRIES.length - 1)],
      l1: L1[pick(6, L1.length - 1)],
      cohort: co.id, exam: co.exam,
      startBand: Math.round(start * 2) / 2,
      band: Math.round(cur * 2) / 2,
      target: Math.round(target * 2) / 2,
      cefr: bandToCEFR(cur),
      joined: joined.toISOString().slice(0,10),
      lastActive: lastSeen,
      streak: pick(19, 22),
      hours: 8 + (h % 90),
      essays: pick(4, 14),
      speeches: pick(8, 11),
      mocks: pick(12, 5),
      plan: ['PREMIUM','PLUS','CORE'][pick(15, 3)],
      paid: (h % 9) !== 0,
      risk: lastSeen > 7 ? 'at-risk' : (cur < target - 1.5 ? 'behind' : 'on-track'),
    });
  }
  return out;
}
let STUDENTS = null;
function students(){
  if (!STUDENTS){
    STUDENTS = seedStudents();
    /* keep cohort enrolment consistent with the roster */
    COHORTS.forEach(c => { c.enrolled = Math.min(c.cap, STUDENTS.filter(s => s.cohort === c.id).length); });
  }
  return STUDENTS;
}
function studentOf(id){ return students().find(s => s.id === id); }

/* ── TERM / ACADEMIC CALENDAR ── */
const TERM_EVENTS = [
  { d:'2026-09-07', t:'Autumn term begins',            kind:'term',    who:'All cohorts' },
  { d:'2026-09-09', t:'Placement testing day',         kind:'assess',  who:'New intake · 24 students' },
  { d:'2026-09-14', t:'General Training cohort starts',kind:'term',    who:'c-gt · 9 enrolled' },
  { d:'2026-09-19', t:'Faculty standards meeting',     kind:'staff',   who:'All teachers · 14:00' },
  { d:'2026-09-26', t:'Mid-term mock exam window',     kind:'assess',  who:'Intensive A & B' },
  { d:'2026-10-03', t:'Parent & sponsor progress reports due', kind:'admin', who:'All teachers' },
  { d:'2026-10-05', t:'TOEFL cohort starts',           kind:'term',    who:'c-toefl · 4 enrolled' },
  { d:'2026-10-12', t:'IELTS test date · British Council', kind:'exam', who:'31 students entered' },
  { d:'2026-10-17', t:'Half-term break begins',        kind:'term',    who:'All cohorts · 1 week' },
  { d:'2026-10-26', t:'Teaching resumes',              kind:'term',    who:'All cohorts' },
  { d:'2026-11-02', t:'Full mock exam week',           kind:'assess',  who:'All exam cohorts' },
  { d:'2026-11-09', t:'Curriculum review · Writing',   kind:'staff',   who:'Marchetti, Okonkwo, Prasad' },
  { d:'2026-11-16', t:'IELTS test date · IDP',         kind:'exam',    who:'18 students entered' },
  { d:'2026-11-30', t:'Term ends · reports issued',    kind:'term',    who:'All cohorts' },
];
const EVENT_KINDS = {
  term:   { name:'Term',       tone:'leaf', ic:'fa-calendar' },
  assess: { name:'Assessment', tone:'amb',  ic:'fa-clipboard-check' },
  exam:   { name:'Exam date',  tone:'cor',  ic:'fa-file-signature' },
  staff:  { name:'Staff',      tone:'sky',  ic:'fa-users' },
  admin:  { name:'Admin',      tone:'vio',  ic:'fa-clipboard-list' },
};

/* ── ADMIN TASK BOARD ── */
const ADMIN_TASKS = [
  { id:'t1', t:'Approve October intake applications',   owner:'admin', due:'2026-09-11', pri:'high', col:'doing', note:'24 applications, 6 need proof of prior study.' },
  { id:'t2', t:'Book IELTS test slots for October sitting', owner:'admin', due:'2026-09-15', pri:'high', col:'todo', note:'31 students entered — deadline is the 20th.' },
  { id:'t3', t:'Renew British Council partner licence', owner:'admin', due:'2026-09-30', pri:'med',  col:'todo', note:'Annual renewal, finance sign-off required.' },
  { id:'t4', t:'Publish Writing Task 2 model bank',     owner:'em',    due:'2026-09-12', pri:'med',  col:'doing', note:'Six essays annotated, two still to record.' },
  { id:'t5', t:'Record Part 4 lecture audio',           owner:'ew',    due:'2026-09-18', pri:'med',  col:'todo', note:'Studio booked Thursday 10:00.' },
  { id:'t6', t:'Chase 9 unpaid September invoices',     owner:'admin', due:'2026-09-10', pri:'high', col:'doing', note:'£4,140 outstanding.' },
  { id:'t7', t:'Onboard new speaking examiner',         owner:'admin', due:'2026-09-22', pri:'low',  col:'todo', note:'Contract sent, DBS pending.' },
  { id:'t8', t:'Migrate legacy PDFs into the School',   owner:'admin', due:'2026-09-08', pri:'med',  col:'done', note:'147 pages uploaded and tagged by part.' },
  { id:'t9', t:'Timetable half-term revision clinics',  owner:'admin', due:'2026-09-25', pri:'med',  col:'todo', note:'Four clinics, two teachers each.' },
  { id:'t10',t:'Q3 outcome report for the board',       owner:'admin', due:'2026-10-02', pri:'high', col:'todo', note:'Band gains, retention, pass rates.' },
];
const TASK_COLS = [ ['todo','To do'], ['doing','In progress'], ['done','Done'] ];

/* ── UPLOAD TYPES ── */
const UP_TYPES = {
  video: { name:'Video lecture', ic:'fa-video',        tone:'sky',  accept:'video/*',            max:'2 GB',  hint:'MP4 or MOV · 1080p recommended' },
  audio: { name:'Audio track',   ic:'fa-headphones',   tone:'amb',  accept:'audio/*',            max:'200 MB',hint:'MP3 or M4A · 128 kbps or better' },
  pdf:   { name:'PDF / worksheet',ic:'fa-file-pdf',    tone:'cor',  accept:'.pdf',               max:'60 MB', hint:'A4, print-ready' },
  notes: { name:'Class notes',   ic:'fa-note-sticky',  tone:'leaf', accept:'.pdf,.doc,.docx,.md',max:'25 MB', hint:'Written up after a lesson' },
  quiz:  { name:'Quiz',          ic:'fa-list-check',   tone:'vio',  accept:'.csv,.json,.xlsx',   max:'5 MB',  hint:'CSV or built in the editor' },
  image: { name:'Image / diagram',ic:'fa-image',       tone:'sky',  accept:'image/*',            max:'20 MB', hint:'PNG or JPG · charts for Task 1' },
};

/* Quiz CSV template — question, A, B, C, D, correct letter, explanation */
const QUIZ_CSV_TEMPLATE = `question,optionA,optionB,optionC,optionD,correct,explanation
"She ___ to London three times this year.",go,went,has been,is going,C,"Present perfect for experience within an unfinished time period."
"Choose the closest meaning to 'mitigate'.",worsen,alleviate,measure,delay,B,"Mitigate means to make something bad less severe."`;
