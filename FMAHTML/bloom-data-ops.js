/* ═══ BLOOM — admin operations data: admissions, live classes, finance, comms ═══ */

/* ── LIVE CLASSES ── */
const LIVE_SEED = [
  { id:'lc1', subj:'Writing', title:'Task 2 — Structure Clinic', date:'2026-09-09', time:'14:30', mins:60, plat:'Google Meet', teacher:'em', cohort:'c-int-a', link:'https://meet.google.com/bmw-task2-clinic' },
  { id:'lc2', subj:'Speaking', title:'Part 2 Mock Interviews', date:'2026-09-09', time:'17:00', mins:90, plat:'Zoom', teacher:'mc', cohort:'c-speak', link:'https://zoom.us/j/bloom-speaking-p2' },
  { id:'lc3', subj:'Reading', title:'Passage 3 — Timing Under Pressure', date:'2026-09-10', time:'11:00', mins:90, plat:'Google Meet', teacher:'jo', cohort:'c-int-b', link:'https://meet.google.com/bmw-reading-p3' },
  { id:'lc4', subj:'Listening', title:'Part 4 Lecture Practice', date:'2026-09-11', time:'09:00', mins:60, plat:'Google Meet', teacher:'ew', cohort:'c-int-a', link:'https://meet.google.com/bmw-listening-p4' },
  { id:'lc5', subj:'Grammar', title:'Articles for South Asian Speakers', date:'2026-09-12', time:'18:30', mins:60, plat:'Zoom', teacher:'ap', cohort:'c-found', link:'https://zoom.us/j/bloom-articles' },
  { id:'lc6', subj:'Writing', title:'Task 1 — Overview Paragraph', date:'2026-09-05', time:'14:30', mins:60, plat:'Google Meet', teacher:'em', cohort:'c-int-a', link:'https://meet.google.com/bmw-task1' },
  { id:'lc7', subj:'Speaking', title:'Pronunciation Workshop', date:'2026-09-03', time:'17:00', mins:90, plat:'Zoom', teacher:'lw', cohort:'c-speak', link:'https://zoom.us/j/bloom-pron' },
];
const LIVE_SUBJ = { Writing:'amb', Speaking:'cor', Reading:'leaf', Listening:'sky', Grammar:'vio', Vocabulary:'leaf' };

/* ── ADMISSIONS PIPELINE ── */
const APP_STAGES = [
  { id:'enquiry',  name:'Enquiry',        ic:'fa-envelope-open-text' },
  { id:'placement',name:'Placement test', ic:'fa-clipboard-question' },
  { id:'offer',    name:'Offer sent',     ic:'fa-file-signature' },
  { id:'deposit',  name:'Deposit paid',   ic:'fa-receipt' },
  { id:'enrolled', name:'Enrolled',       ic:'fa-circle-check' },
];
const APP_SOURCES = ['Website','Instagram','Referral','Agent · Delhi','Agent · Lahore','Google Ads','Walk-in','Alumni'];

function seedApps(){
  const out = [];
  for (let i = 0; i < 26; i++){
    const h = ((i + 31) * 2654435761) >>> 0;
    const p = (sh,n) => (h >>> sh) % n;
    const f = FIRST[p(0,FIRST.length)], l = LAST[p(5,LAST.length)];
    const st = APP_STAGES[p(3,APP_STAGES.length)];
    const d = new Date('2026-09-08'); d.setDate(d.getDate() - p(11,26));
    out.push({
      id:'A-2026-' + String(300 + i),
      name: f + ' ' + l,
      email: (f+'.'+l).toLowerCase() + '@email.com',
      country: COUNTRIES[p(9, COUNTRIES.length-1)],
      exam: ['ielts-a','ielts-g','toefl','pte','general'][p(7,5)],
      cohort: COHORTS[p(13,COHORTS.length)].id,
      stage: st.id,
      source: APP_SOURCES[p(17,APP_SOURCES.length)],
      at: d.toISOString().slice(0,10),
      band: p(19,2) ? Math.round((3.5 + p(21,8)*0.5)*2)/2 : null,
      value: [520,340,190][p(23,3)],
    });
  }
  return out;
}
let APPS = null;
function apps(){ if (!APPS) APPS = seedApps(); return APPS; }

/* ── FINANCE ── */
const FEE_MONTHS = ['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
const FEE_DATA = {
  collected: [ 2100, 2600, 1900, 4200, 5100, 6300, 7400, 6900, 8600, 9100, 7800, 4900 ],
  target:    [ 3000, 3000, 3500, 5000, 5500, 6500, 7500, 7500, 8500, 9000, 9000, 9000 ],
  forecast:  [ 2400, 2800, 2200, 4600, 5400, 6600, 7800, 7200, 8900, 9400, 8300, 8800 ],
};
const INVOICE_STATUS = { paid:{ name:'Paid in full', tone:'ok' }, pending:{ name:'Pending', tone:'amb' }, overdue:{ name:'Overdue', tone:'cor' } };

/* ── COMMUNICATIONS ── */
const EMAIL_TEMPLATES = [
  { id:'tp-welcome', name:'Welcome & placement test link', cat:'Admissions', subj:'Welcome to Bloom — your placement test is ready',
    body:'Dear {{name}},\n\nWelcome to Bloom IELTS Academy. Before your first class on {{start}}, please complete your placement test — it takes about 25 minutes and gives your teacher a real level to plan from.\n\nTake the test: {{link}}\n\nYour cohort: {{cohort}}\nYour teacher: {{teacher}}\n\nBloom IELTS Academy', used:184 },
  { id:'tp-offer', name:'Offer letter', cat:'Admissions', subj:'Your place at Bloom IELTS Academy',
    body:'Dear {{name}},\n\nWe are pleased to offer you a place on {{cohort}}, starting {{start}}.\n\nCourse fee: {{fee}}\nDeposit to secure your place: {{deposit}}\nDeadline: {{deadline}}\n\nBloom IELTS Academy', used:96 },
  { id:'tp-fee1', name:'Fee reminder — 7 days', cat:'Finance', subj:'Your Bloom invoice is due in 7 days',
    body:'Dear {{name}},\n\nA friendly reminder that invoice {{invoice}} for {{amount}} is due on {{due}}.\n\nPay online: {{link}}\n\nBloom IELTS Academy', used:412 },
  { id:'tp-fee2', name:'Fee reminder — overdue', cat:'Finance', subj:'Overdue: invoice {{invoice}}',
    body:'Dear {{name}},\n\nInvoice {{invoice}} for {{amount}} was due on {{due}} and remains unpaid. Access to live classes is suspended after 14 days.\n\nPay now: {{link}}\n\nBloom IELTS Academy', used:138 },
  { id:'tp-mock', name:'Mock exam invitation', cat:'Academic', subj:'Your mock exam is on {{date}}',
    body:'Dear {{name}},\n\nYour full mock exam is scheduled for {{date}} at {{time}} in {{room}}.\n\nBring photo ID and arrive fifteen minutes early. The mock runs to full exam timing.\n\nBloom IELTS Academy', used:227 },
  { id:'tp-report', name:'Progress report', cat:'Academic', subj:'Your progress report — {{month}}',
    body:'Dear {{name}},\n\nHere is your progress this month.\n\nCurrent estimate: Band {{band}}\nTarget: Band {{target}}\nAttendance: {{attendance}}\n\nYour teacher\'s comment: {{comment}}\n\nBloom IELTS Academy', used:301 },
  { id:'tp-absent', name:'Attendance concern', cat:'Academic', subj:'We have missed you in class',
    body:'Dear {{name}},\n\nYou have missed {{count}} classes this month. Attendance below 80% makes the target band very difficult to reach.\n\nIs there something we can help with? Reply to this email or book a call.\n\nBloom IELTS Academy', used:64 },
  { id:'tp-result', name:'Official result received', cat:'Academic', subj:'Congratulations on your {{exam}} result',
    body:'Dear {{name}},\n\nWe have received your official result: {{score}}.\n\n{{message}}\n\nBloom IELTS Academy', used:88 },
];

const ACTIVITY_LOG = [
  { at:'6m',   who:'Dr. Elena Marchetti', kind:'content',  t:'Published “Task 2 — Structure Clinic” recording to Writing Task 2' },
  { at:'22m',  who:'System',              kind:'billing',  t:'Payment received — £340 from Aisha Khan (PLUS)' },
  { at:'48m',  who:'Administration',      kind:'admission',t:'New application received — Nguyen Tran, IELTS Academic, via Agent · Delhi' },
  { at:'1h',   who:'Michael Chen',        kind:'academic', t:'Recorded speaking mock results for 8 students in Speaking Confidence Lab' },
  { at:'2h',   who:'System',              kind:'exam',     t:'Mock exam window opened for IELTS Intensive Morning A — 16 entries' },
  { at:'3h',   who:'Anjali Prasad',       kind:'content',  t:'Uploaded “Articles Decision Tree” worksheet to Grammar & Vocabulary' },
  { at:'4h',   who:'Administration',      kind:'billing',  t:'Sent 9 overdue payment reminders — £2,890 outstanding' },
  { at:'5h',   who:'James Okonkwo',       kind:'academic', t:'Marked attendance for Reading Passage 3 clinic — 15 of 18 present' },
  { at:'Yesterday', who:'Administration', kind:'admission',t:'Enrolled 3 students into TOEFL iBT Prep, starting 5 October' },
  { at:'Yesterday', who:'Dr. Sarah Whitfield', kind:'content', t:'Published Part 4 lecture audio with synchronised transcript' },
  { at:'2 days', who:'System',            kind:'exam',     t:'Published results for FMA-style full mock — average Band 6.2' },
  { at:'2 days', who:'Administration',    kind:'system',   t:'Updated cohort capacity for Speaking Confidence Lab from 10 to 12' },
];
const LOG_KINDS = {
  content:  { ic:'fa-cloud-arrow-up', tone:'leaf' },
  billing:  { ic:'fa-sterling-sign',  tone:'amb'  },
  admission:{ ic:'fa-user-plus',      tone:'sky'  },
  academic: { ic:'fa-chalkboard',     tone:'vio'  },
  exam:     { ic:'fa-clipboard-check',tone:'cor'  },
  system:   { ic:'fa-gear',           tone:''     },
};

/* ── SUBSCRIPTIONS / PLANS ── */
const PLANS = [
  { id:'CORE', name:'Core', price:190, colour:'sky', per:'month',
    inc:['All School notes, audio and lectures','Vocabulary and grammar trainers','Two mock exams a month','Group classes'],
    exc:['1-on-1 tutoring','Writing evaluation','Speaking evaluation'] },
  { id:'PLUS', name:'Plus', price:340, colour:'leaf', per:'month', popular:true,
    inc:['Everything in Core','Unlimited writing evaluation','Unlimited speaking evaluation','Weekly mock exams','One 1-on-1 session a month'],
    exc:['Priority examiner feedback'] },
  { id:'PREMIUM', name:'Premium', price:520, colour:'amb', per:'month',
    inc:['Everything in Plus','Four 1-on-1 sessions a month','Priority marking within 12 hours','Examiner-led mock interviews','Personal study plan review'],
    exc:[] },
];

/* ── SYSTEM SETTINGS ── */
const SYS_SETTINGS = [
  { grp:'School', items:[
    { k:'name', label:'School name', type:'text', val:'Bloom IELTS Academy' },
    { k:'email', label:'Contact email', type:'text', val:'hello@bloomielts.com' },
    { k:'tz', label:'Timezone', type:'select', val:'Europe/London', opts:['Europe/London','Europe/Rome','Asia/Kolkata','Asia/Shanghai','Asia/Dubai'] },
    { k:'cur', label:'Currency', type:'select', val:'GBP (£)', opts:['GBP (£)','EUR (€)','USD ($)','INR (₹)'] },
  ]},
  { grp:'Academic', items:[
    { k:'pass', label:'Default target band', type:'select', val:'7.0', opts:['5.5','6.0','6.5','7.0','7.5','8.0'] },
    { k:'att', label:'Minimum attendance', type:'select', val:'80%', opts:['70%','75%','80%','85%','90%'] },
    { k:'mock', label:'Mock frequency', type:'select', val:'Every 2 weeks', opts:['Weekly','Every 2 weeks','Monthly'] },
    { k:'place', label:'Placement test required before enrolment', type:'toggle', val:true },
  ]},
  { grp:'Finance', items:[
    { k:'dep', label:'Deposit to secure a place', type:'select', val:'25%', opts:['10%','20%','25%','50%','Full fee'] },
    { k:'grace', label:'Payment grace period', type:'select', val:'14 days', opts:['7 days','14 days','21 days','30 days'] },
    { k:'auto', label:'Send automatic payment reminders', type:'toggle', val:true },
    { k:'suspend', label:'Suspend access when overdue', type:'toggle', val:true },
  ]},
  { grp:'Notifications', items:[
    { k:'nWelcome', label:'Welcome email on enrolment', type:'toggle', val:true },
    { k:'nMock', label:'Mock exam reminders', type:'toggle', val:true },
    { k:'nReport', label:'Monthly progress reports', type:'toggle', val:true },
    { k:'nAbsent', label:'Alert teacher after 2 absences', type:'toggle', val:true },
  ]},
];
