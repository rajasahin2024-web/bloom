/* ═══════════════════════════════════════════════════════════════
   BLOOM — HR data: employees, contracts, documents, hiring, leave, awards
═══════════════════════════════════════════════════════════════ */

const COMPANY = {
  legal:'Bloom IELTS Academy Pvt Ltd',
  trading:'Bloom IELTS Academy',
  cin:'U85499KA2025PTC198420',
  gstin:'29ABMCB4821K1ZP',
  pan:'ABMCB4821K',
  hq:'Prestige Tech Park, Marathahalli, Bengaluru 560103, India',
  offices:[
    { id:'blr', name:'Bengaluru', country:'India', flag:'🇮🇳', role:'Headquarters', addr:'Prestige Tech Park, Marathahalli, Bengaluru 560103' },
    { id:'mct', name:'Muscat', country:'Oman', flag:'🇴🇲', role:'Founding centre', addr:'Al Khuwair, Muscat 133' },
    { id:'mil', name:'Milan', country:'Italy', flag:'🇮🇹', role:'Founding centre', addr:'Via Torino 2, 20123 Milano' },
    { id:'sha', name:'Shanghai', country:'China', flag:'🇨🇳', role:'Founding centre', addr:'Jing\'an, Shanghai 200040' },
  ],
  phone:'+91 80 4718 2260',
  email:'hr@bloomielts.com',
  founded:'2025',
  director:'Meriam Friaa',
  directorRole:'Operational Leader',
};
function officeOf(id){ return COMPANY.offices.find(o => o.id === id) || COMPANY.offices[0]; }

/* ── DEPARTMENTS ── */
const HR_DEPTS = [
  { id:'academic',  name:'Academic',        ic:'fa-chalkboard-user', tone:'leaf' },
  { id:'ops',       name:'Operations',      ic:'fa-sliders',         tone:'sky'  },
  { id:'admissions',name:'Admissions',      ic:'fa-user-plus',       tone:'amb'  },
  { id:'marketing', name:'Marketing',       ic:'fa-bullhorn',        tone:'vio'  },
  { id:'finance',   name:'Finance',         ic:'fa-indian-rupee-sign',tone:'cor' },
];
function deptOf(id){ return HR_DEPTS.find(d => d.id === id) || HR_DEPTS[0]; }

/* ── CONTRACT TYPES ── */
const CONTRACTS = {
  perm:     { name:'Permanent',            ic:'fa-file-signature', note:'Full-time, indefinite term, three-month probation.', notice:'60 days' },
  fixed:    { name:'Fixed term',           ic:'fa-calendar-days',   note:'Defined end date, renewable on performance review.', notice:'30 days' },
  part:     { name:'Part time',            ic:'fa-clock',           note:'Agreed weekly hours, pro-rata benefits.', notice:'30 days' },
  visiting: { name:'Visiting faculty',     ic:'fa-plane',           note:'Paid per teaching hour, no minimum guarantee.', notice:'14 days' },
  consult:  { name:'Consultant',           ic:'fa-handshake',       note:'Service agreement, invoices monthly, no employee benefits.', notice:'30 days' },
  intern:   { name:'Internship',           ic:'fa-graduation-cap',  note:'Fixed six-month term with a stipend and a named mentor.', notice:'7 days' },
};

/* ── EMPLOYEES ──
   Teaching staff mirror the TEACHERS roster so the two never disagree;
   the rest are administrative. */
function hrSeedEmployees(){
  const teach = [
    { tid:'em', emp:'BL-0001', dept:'ops',      title:'Operational Leader',                  contract:'perm',     office:'blr', joined:'2025-01-06', ctc:2400000, band:'L5', reports:null,  leader:true },
    { tid:'ew', emp:'BL-0002', dept:'academic', title:'Head of Listening & Reading',          contract:'perm',     office:'mil', joined:'2025-02-03', ctc:1850000, band:'L4', reports:'BL-0001' },
    { tid:'jo', emp:'BL-0004', dept:'academic', title:'Reading Strategy Lead',                contract:'perm',     office:'blr', joined:'2025-03-17', ctc:1620000, band:'L4', reports:'BL-0001' },
    { tid:'mc', emp:'BL-0005', dept:'academic', title:'Speaking & Pronunciation Lead',        contract:'perm',     office:'sha', joined:'2025-02-10', ctc:1580000, band:'L4', reports:'BL-0001' },
    { tid:'ap', emp:'BL-0006', dept:'academic', title:'Senior Tutor · South Asia',            contract:'perm',     office:'blr', joined:'2025-04-07', ctc:1180000, band:'L3', reports:'BL-0002' },
    { tid:'lw', emp:'BL-0007', dept:'academic', title:'Senior Tutor · East Asia',            contract:'fixed',    office:'sha', joined:'2025-06-02', ctc:1050000, band:'L3', reports:'BL-0005', ends:'2026-12-31' },
    { tid:'rk', emp:'BL-0008', dept:'academic', title:'General & Business English Tutor',     contract:'part',     office:'mil', joined:'2025-07-14', ctc:720000,  band:'L2', reports:'BL-0002' },
  ];
  const out = teach.map(t => {
    const T = TEACHERS.find(x => x.id === t.tid) || {};
    return { ...t, id:t.emp, name:T.name || t.title, init:T.init || 'BL', email:(T.name||'staff').toLowerCase().replace(/^(dr|prof)\.?\s*/,'').replace(/\s+/g,'.')+'@bloomielts.com',
      from:T.from || '—', years:T.years || 1, teacherId:t.tid, status:'active', leave:{ taken:0, entitled:24 } };
  });
  /* administrative staff, not on the teaching roster */
  const admin = [
    { id:'BL-0003', name:'Dr. Elena Marchetti', init:'EM', dept:'academic', title:'Head of Writing & Curriculum', contract:'perm', office:'mil', joined:'2025-01-20', ctc:1920000, band:'L4', reports:'BL-0001', teacherId:'em2', from:'Italy', years:11 },
    { id:'BL-0009', name:'Priya Venkatesh',     init:'PV', dept:'admissions', title:'Admissions Manager',        contract:'perm', office:'blr', joined:'2025-05-12', ctc:960000,  band:'L3', reports:'BL-0001', from:'India', years:6 },
    { id:'BL-0010', name:'Omar Al-Rashid',      init:'OA', dept:'admissions', title:'Admissions Counsellor',     contract:'perm', office:'mct', joined:'2025-08-04', ctc:640000,  band:'L2', reports:'BL-0009', from:'Oman', years:3 },
    { id:'BL-0011', name:'Chen Xiaoli',         init:'CX', dept:'marketing',  title:'Marketing Lead',            contract:'perm', office:'sha', joined:'2025-06-23', ctc:880000,  band:'L3', reports:'BL-0001', from:'China', years:7 },
    { id:'BL-0012', name:'Rahul Mehta',         init:'RM', dept:'finance',    title:'Finance & Compliance',      contract:'perm', office:'blr', joined:'2025-03-03', ctc:1040000, band:'L3', reports:'BL-0001', from:'India', years:9 },
    { id:'BL-0013', name:'Sofia Rossi',         init:'SR', dept:'ops',        title:'Student Success Coordinator',contract:'fixed',office:'mil', joined:'2026-01-12', ctc:620000,  band:'L2', reports:'BL-0001', from:'Italy', years:2, ends:'2027-01-11' },
    { id:'BL-0014', name:'Arjun Nair',          init:'AN', dept:'marketing',  title:'Content & Social Intern',   contract:'intern',office:'blr',joined:'2026-07-01', ctc:240000,  band:'L1', reports:'BL-0011', from:'India', years:0, ends:'2026-12-31' },
    { id:'BL-0015', name:'Nadia Haddad',        init:'NH', dept:'academic',   title:'Visiting Faculty · OET',    contract:'visiting',office:'mct',joined:'2026-02-16',ctc:480000, band:'L3', reports:'BL-0003', from:'Oman', years:10 },
  ];
  return [...out, ...admin.map(a => ({ ...a, email:a.name.toLowerCase().replace(/\s+/g,'.')+'@bloomielts.com', status:'active', leave:{ taken:0, entitled:24 } }))]
    .sort((a,b) => a.id.localeCompare(b.id));
}
let HR_EMP = null;
function employees(){
  if (!HR_EMP){
    HR_EMP = hrSeedEmployees();
    /* deterministic leave taken, so the dashboard is not all zeros */
    HR_EMP.forEach((e,i) => { e.leave.taken = (i * 5 + 3) % 19; });
  }
  return HR_EMP;
}
function empOf(id){ return employees().find(e => e.id === id); }
function empReports(id){ return employees().filter(e => e.reports === id); }

/* ── DOCUMENT TYPES ──
   Each is a real letter template with the fields it needs. */
const HR_DOCS = {
  offer: { name:'Offer letter', ic:'fa-file-signature', tone:'leaf', grp:'Hiring',
    sub:'Extends a formal offer of employment, subject to references and documents.',
    fields:['name','title','dept','contract','office','ctc','startDate','reportsTo','probation','deadline'] },
  contract: { name:'Employment contract', ic:'fa-file-contract', tone:'leaf', grp:'Hiring',
    sub:'The binding agreement: duties, hours, pay, notice, confidentiality.',
    fields:['name','title','dept','contract','office','ctc','startDate','reportsTo','notice','hours','endDate'] },
  confirm: { name:'Probation confirmation', ic:'fa-circle-check', tone:'leaf', grp:'Lifecycle',
    sub:'Confirms an employee in post at the end of probation.',
    fields:['name','title','dept','startDate','effectiveDate','reviewNote'] },
  promotion: { name:'Promotion letter', ic:'fa-arrow-up-right-dots', tone:'amb', grp:'Lifecycle',
    sub:'Records a change of title, band and salary.',
    fields:['name','oldTitle','title','band','ctc','effectiveDate','reportsTo'] },
  increment: { name:'Salary revision', ic:'fa-indian-rupee-sign', tone:'amb', grp:'Lifecycle',
    sub:'Annual or off-cycle revision of remuneration.',
    fields:['name','title','oldCtc','ctc','effectiveDate','reviewNote'] },
  warning: { name:'Warning letter', ic:'fa-triangle-exclamation', tone:'cor', grp:'Conduct',
    sub:'Formal written warning, with the conduct and the required improvement.',
    fields:['name','title','issue','expected','reviewDate','stage'] },
  termination: { name:'Termination letter', ic:'fa-file-circle-xmark', tone:'cor', grp:'Exit',
    sub:'Ends employment, stating grounds, notice and final settlement.',
    fields:['name','title','dept','startDate','lastDay','grounds','notice','settlement'] },
  resignation: { name:'Resignation acceptance', ic:'fa-hand-wave', tone:'sky', grp:'Exit',
    sub:'Accepts a resignation and confirms the last working day.',
    fields:['name','title','resignDate','lastDay','notice','handover'] },
  relieving: { name:'Relieving letter', ic:'fa-door-open', tone:'sky', grp:'Exit',
    sub:'Confirms an employee has been relieved with all dues settled.',
    fields:['name','title','dept','startDate','lastDay','conduct'] },
  experience: { name:'Experience certificate', ic:'fa-award', tone:'sky', grp:'Exit',
    sub:'States dates, role and responsibilities for future employers.',
    fields:['name','title','dept','startDate','lastDay','duties'] },
  reference: { name:'Reference letter', ic:'fa-envelope-open-text', tone:'vio', grp:'References',
    sub:'Factual confirmation of employment for a named third party.',
    fields:['name','title','dept','startDate','lastDay','addressee','purpose'] },
  recommendation: { name:'Recommendation letter', ic:'fa-star', tone:'vio', grp:'References',
    sub:'A personal endorsement — used for visas, further study and new roles.',
    fields:['name','title','dept','startDate','strengths','achievement','addressee','purpose'] },
  award: { name:'Award certificate', ic:'fa-trophy', tone:'amb', grp:'Recognition',
    sub:'Best Faculty and other recognitions, issued as a printable certificate.',
    fields:['name','awardName','period','citation','presentedBy'] },
  nda: { name:'Confidentiality agreement', ic:'fa-user-secret', tone:'', grp:'Hiring',
    sub:'Protects student data, curriculum and commercial information.',
    fields:['name','title','startDate','term'] },
  leaveApproval: { name:'Leave approval', ic:'fa-plane-departure', tone:'sky', grp:'Lifecycle',
    sub:'Approves a leave request, with cover arrangements.',
    fields:['name','title','leaveType','fromDate','toDate','days','cover'] },
};
const HR_DOC_GRPS = ['Hiring','Lifecycle','Conduct','Recognition','References','Exit'];

/* ── AWARDS ── */
const HR_AWARDS = [
  { id:'best-faculty',   name:'Best Faculty',              ic:'fa-trophy',       period:'Quarterly',
    criteria:'Highest combination of student band gain, attendance and feedback rating across the quarter.' },
  { id:'best-newcomer',  name:'Best Newcomer',             ic:'fa-seedling',     period:'Annual',
    criteria:'Outstanding contribution within the first twelve months of joining.' },
  { id:'student-choice', name:'Student Choice',            ic:'fa-heart',        period:'Quarterly',
    criteria:'Voted directly by students at the end of each term.' },
  { id:'above-beyond',   name:'Above & Beyond',            ic:'fa-hand-holding-heart', period:'Any time',
    criteria:'A specific act of service to a student or colleague, nominated by anyone.' },
  { id:'long-service',   name:'Long Service',              ic:'fa-medal',        period:'Anniversary',
    criteria:'Awarded at each completed year of service since the 2025 founding.' },
];
function awardOf(id){ return HR_AWARDS.find(a => a.id === id) || HR_AWARDS[0]; }

/* ── HIRING PIPELINE ── */
const HIRE_STAGES = [
  { id:'applied',   name:'Applied',     tone:'' },
  { id:'screen',    name:'Screening',   tone:'sky' },
  { id:'demo',      name:'Demo lesson', tone:'amb' },
  { id:'interview', name:'Interview',   tone:'amb' },
  { id:'offer',     name:'Offer out',   tone:'leaf' },
  { id:'hired',     name:'Hired',       tone:'leaf' },
  { id:'declined',  name:'Declined',    tone:'cor' },
];
const HR_VACANCIES = [
  { id:'v1', title:'IELTS Writing Examiner', dept:'academic', office:'blr', contract:'perm', band:'L4',
    ctc:'₹16–19 lakh', open:'2026-08-18', need:'Former examiner, five years minimum, able to mark against all four descriptors.' },
  { id:'v2', title:'Speaking Tutor · Gulf',  dept:'academic', office:'mct', contract:'part', band:'L2',
    ctc:'₹6–8 lakh',   open:'2026-08-25', need:'Arabic-speaking, strong on pronunciation for Arabic L1 learners.' },
  { id:'v3', title:'Admissions Counsellor',  dept:'admissions', office:'blr', contract:'perm', band:'L2',
    ctc:'₹6–7.5 lakh', open:'2026-09-01', need:'Two years in overseas education counselling; UK and Australia pathways.' },
];
function hrSeedApplicants(){
  const rows = [
    ['a1','Kavya Krishnan','v1','interview','kavya.k@email.com','+91 98450 22114','India',9,'Former British Council examiner, 9 years. Strong Task 2 marking sample.'],
    ['a2','Thomas Berg','v1','demo','t.berg@email.com','+49 151 2233 4455','Germany',6,'Cambridge-trained, currently teaching in Munich. Demo booked Thursday.'],
    ['a3','Fatima Al-Zahra','v2','offer','fatima.az@email.com','+968 9123 4567','Oman',5,'Arabic L1 specialist. Offer sent, awaiting signature.'],
    ['a4','Deepak Rao','v3','screen','d.rao@email.com','+91 99000 71234','India',3,'Three years at an education consultancy in Bengaluru.'],
    ['a5','Aisha Nasser','v2','applied','aisha.n@email.com','+968 9876 5432','Oman',4,'CELTA plus four years in Muscat. Applied through the website.'],
    ['a6','Miguel Santos','v1','declined','m.santos@email.com','+351 912 345 678','Portugal',2,'Too junior for an examiner role. Kept on file for tutor openings.'],
    ['a7','Ling Zhao','v3','interview','ling.zhao@email.com','+86 138 0022 3344','China',5,'Strong on the China-to-UK pathway. Second interview this week.'],
  ];
  return rows.map(([id,name,vac,stage,email,phone,country,years,note],i) => ({
    id, name, vacancy:vac, stage, email, phone, country, years, note,
    applied: dayOffset(-(4 + i * 3)),
    init: name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(),
  }));
}

/* ── LEAVE TYPES ── */
const LEAVE_TYPES = {
  annual:   { name:'Annual leave',      ic:'fa-umbrella-beach', entitled:24, tone:'sky'  },
  sick:     { name:'Sick leave',        ic:'fa-notes-medical',  entitled:12, tone:'cor'  },
  casual:   { name:'Casual leave',      ic:'fa-mug-hot',        entitled:8,  tone:'amb'  },
  parental: { name:'Parental leave',    ic:'fa-baby',           entitled:182,tone:'vio'  },
  unpaid:   { name:'Unpaid leave',      ic:'fa-circle-minus',   entitled:0,  tone:''     },
  study:    { name:'Study / exam leave',ic:'fa-book',           entitled:5,  tone:'leaf' },
};
function hrSeedLeave(){
  const rows = [
    ['BL-0006','annual','2026-09-21','2026-09-25',5,'approved','Family wedding in Chennai.'],
    ['BL-0010','sick','2026-09-08','2026-09-09',2,'approved','Fever — doctor\'s note filed.'],
    ['BL-0011','annual','2026-10-01','2026-10-08',6,'pending','National Day holiday in China.'],
    ['BL-0013','study','2026-09-28','2026-09-29',2,'pending','Sitting the DELTA Module Two exam.'],
    ['BL-0007','annual','2026-11-03','2026-11-14',10,'pending','Extended trip home.'],
    ['BL-0014','casual','2026-09-15','2026-09-15',1,'approved','University graduation ceremony.'],
  ];
  return rows.map(([emp,type,from,to,days,status,reason],i) => ({
    id:'lv'+(i+1), emp, type, from, to, days, status, reason, filed:dayOffset(-(2 + i * 2)),
  }));
}

/* ── PERFORMANCE REVIEW CRITERIA ── */
const REVIEW_CRITERIA = [
  { id:'gain',     name:'Student band gain',     note:'Average improvement across the reviewer\'s cohorts.' },
  { id:'feedback', name:'Student feedback',      note:'End-of-term rating out of five.' },
  { id:'delivery', name:'Teaching delivery',     note:'Observed lesson quality against the Bloom standard.' },
  { id:'marking',  name:'Marking turnaround',    note:'Written work returned within the 48-hour standard.' },
  { id:'contrib',  name:'Wider contribution',    note:'Materials authored, lectures recorded, colleagues mentored.' },
];
