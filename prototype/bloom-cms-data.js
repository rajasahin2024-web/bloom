/* ═══ BLOOM — website CMS content store ═══
   Seed content lives here; the site-admin panel writes overrides to
   localStorage under `bloom_cms`, and every public page reads through cms(). */

/* Bump CMS_VERSION whenever the seed content below is corrected. Any saved
   snapshot from an older version is discarded on load, so a correction here
   is never permanently shadowed by a browser that has used the admin panel. */
const CMS_VERSION = 3;

const CMS_SEED = {
  blogs: [
    { id:'b1', title:'Band 6.5 to 7.0: the four things that actually move the needle', slug:'band-65-to-7',
      cat:'Strategy', author:'Dr. Elena Marchetti', date:'2026-08-28', read:8, hero:'blog-1', featured:true, status:'published',
      excerpt:'Half a band is roughly a hundred focused hours — but only if those hours target the right four things. Here is what separates a 6.5 script from a 7.0 one, criterion by criterion.',
      tags:['Writing','Band descriptors'] },
    { id:'b2', title:'True / False / Not Given: a three-question procedure that removes the guesswork', slug:'tfng-procedure',
      cat:'Reading', author:'James Okonkwo', date:'2026-08-21', read:6, hero:'blog-2', featured:true, status:'published',
      excerpt:'The most-failed question type in IELTS Reading, reduced to three questions you ask in order. Plus the qualifier words that turn a TRUE into a FALSE.',
      tags:['Reading','Question types'] },
    { id:'b3', title:'Why your Part 2 answer runs out at 70 seconds — and four ways to fix it', slug:'part-2-extension',
      cat:'Speaking', author:'Michael Chen', date:'2026-08-14', read:7, hero:'blog-3', featured:false, status:'published',
      excerpt:'Almost every candidate who fails Part 2 fails it the same way: they say everything they planned in seventy seconds and then stop. Four extension techniques that hold two minutes.',
      tags:['Speaking','Fluency'] },
    { id:'b4', title:'Articles for Hindi, Urdu and Bengali speakers: the decision tree', slug:'articles-decision-tree',
      cat:'Grammar', author:'Anjali Prasad', date:'2026-08-06', read:9, hero:'blog-4', featured:false, status:'published',
      excerpt:'If your first language has no article system, a/an/the is probably costing you more marks than anything else in your writing. Three questions, asked in order, fix most of it.',
      tags:['Grammar','First language'] },
    { id:'b5', title:'UK university IELTS requirements 2027: what changed', slug:'uk-requirements-2027',
      cat:'Study abroad', author:'Paulo Mendes', date:'2026-07-30', read:5, hero:'blog-5', featured:true, status:'published',
      excerpt:'Several Russell Group departments have raised their per-skill minimums for 2027 entry. A department-by-department summary, and what it means if you are sitting this autumn.',
      tags:['Requirements','UK'] },
    { id:'b6', title:'OET or IELTS for GMC registration? An honest comparison', slug:'oet-or-ielts-gmc',
      cat:'Medical', author:'Dr. Rana Yusuf', date:'2026-07-22', read:10, hero:'blog-6', featured:false, status:'published',
      excerpt:'Both are accepted. One is dramatically easier if you already work in a clinical setting. The difference in what each exam asks you to do, and how to choose.',
      tags:['OET','Registration'] },
    { id:'b7', title:'Listening Part 1: the six formats that cost candidates ten marks', slug:'listening-part-1-formats',
      cat:'Listening', author:'Dr. Sarah Whitfield', date:'2026-07-15', read:6, hero:'blog-7', featured:false, status:'published',
      excerpt:'A correct answer written in the wrong format scores zero. Dates, money, phone numbers, plurals, postcodes and spelled names — every accepted variant.',
      tags:['Listening','Accuracy'] },
    { id:'b8', title:'What a study plan that survives week three looks like', slug:'study-plan-week-three',
      cat:'Strategy', author:'Meriam Friaa', date:'2026-07-08', read:7, hero:'blog-8', featured:false, status:'draft',
      excerpt:'Most IELTS preparation collapses in the third week. The structural reasons why, and how to build a schedule you will still be following in week ten.',
      tags:['Planning','Motivation'] },
  ],
  unis: [
    { id:'u1', photo:'uni-manchester', name:'University of Manchester', country:'United Kingdom', flag:'🇬🇧', city:'Manchester', rank:34, tuition:'£28,000', intake:'Sep · Jan',
      course:'MSc Data Science', ielts:'6.5', perSkill:'no band below 6.0', toefl:'90', status:'published', featured:true, note:'Strong pathway for our Plus and Premium students.' },
    { id:'u2', photo:'uni-kcl', name:"King's College London", country:'United Kingdom', flag:'🇬🇧', city:'London', rank:40, tuition:'£33,450', intake:'Sep',
      course:'MSc Public Health', ielts:'7.0', perSkill:'6.5 in writing', toefl:'100', status:'published', featured:true, note:'Writing minimum is the usual blocker — plan for a 7.0 writing target.' },
    { id:'u3', photo:'uni-unsw', name:'UNSW Sydney', country:'Australia', flag:'🇦🇺', city:'Sydney', rank:19, tuition:'A$52,000', intake:'Feb · Jul · Sep',
      course:'MEng Civil', ielts:'6.5', perSkill:'6.0 each', toefl:'90', status:'published', featured:true, note:'Three intakes a year gives useful flexibility if a retake is needed.' },
    { id:'u4', photo:'uni-toronto', name:'University of Toronto', country:'Canada', flag:'🇨🇦', city:'Toronto', rank:21, tuition:'C$58,000', intake:'Sep',
      course:'MA Economics', ielts:'7.0', perSkill:'no minimum stated', toefl:'100', status:'published', featured:false, note:'Overall 7.0 with no per-skill rule — a strong listening score can carry writing.' },
    { id:'u5', photo:'uni-delft', name:'TU Delft', country:'Netherlands', flag:'🇳🇱', city:'Delft', rank:47, tuition:'€21,000', intake:'Sep',
      course:'MSc Aerospace Engineering', ielts:'6.5', perSkill:'6.0 each', toefl:'90', status:'published', featured:false, note:'No tuition-fee loan for non-EU; plan finances early.' },
    { id:'u6', photo:'uni-monash', name:'Trinity College Dublin', country:'Ireland', flag:'🇮🇪', city:'Dublin', rank:87, tuition:'€26,000', intake:'Sep',
      course:'MSc Computer Science', ielts:'6.5', perSkill:'6.0 each', toefl:'88', status:'published', featured:false, note:'Two-year post-study work visa makes this popular with our cohort.' },
    { id:'u7', photo:'uni-ubc', name:'University of Pavia', country:'Italy', flag:'🇮🇹', city:'Pavia', rank:601, tuition:'€3,900', intake:'Sep',
      course:'Medicine & Surgery (English)', ielts:'B2 equivalent', perSkill:'IMAT entrance exam required', toefl:'—', status:'published', featured:true, note:'IMAT route — prepared jointly with Future MedsAcademy.' },
    { id:'u8', photo:'uni-tcd', name:'RWTH Aachen', country:'Germany', flag:'🇩🇪', city:'Aachen', rank:99, tuition:'€0 (semester fee)', intake:'Oct · Apr',
      course:'MSc Mechanical Engineering', ielts:'6.5', perSkill:'no minimum stated', toefl:'90', status:'published', featured:false, note:'No tuition fees; blocked account required for the visa.' },
    { id:'u9', photo:'uni-auckland', name:'University of Melbourne', country:'Australia', flag:'🇦🇺', city:'Melbourne', rank:13, tuition:'A$50,000', intake:'Feb · Jul',
      course:'Master of Management', ielts:'6.5', perSkill:'6.0 each, 6.0 writing', toefl:'79', status:'draft', featured:false, note:'Newly added — requirements still to be confirmed with the department.' },
  ],
  staff: [
    { id:'st1', name:'Meriam Friaa', role:'Operational Leader', slot:'leader-meriam', from:'Tunisia · based in Bengaluru',
      spec:'Operations · Admissions · Student success', langs:'English · French · Arabic · Italian', years:9, lead:true, status:'published',
      bio:'Runs everything that is not a lesson — admissions, timetabling, teacher allocation, exam entries and the FMA Overseas partnership. Rebuilt the academy around measurement rather than goodwill; retention went from 71% to 94%.' },
    { id:'st2', name:'Dr. Sarah Whitfield', role:'Former IELTS Examiner · Listening & Reading Lead', slot:'staff-sw', from:'United Kingdom',
      spec:'Listening accuracy · Reading speed', langs:'English · French', years:14, lead:false, status:'published',
      bio:'Fourteen years marking IELTS Listening and Reading. Specialises in students who understand the content but lose marks on transfer and timing.' },
    { id:'st3', name:'Dr. Elena Marchetti', role:'Writing Examiner & Trainer', slot:'staff-em', from:'Italy · Milan centre',
      spec:'Task 2 structure · Band 7 grammar', langs:'English · Italian · Spanish', years:11, lead:false, status:'published',
      bio:'Trains IELTS writing examiners. Marks your essay against the official descriptors line by line, then rewrites one paragraph with you so you can see the difference.' },
    { id:'st4', name:'Michael Chen', role:'Speaking Examiner & Pronunciation Coach', slot:'staff-mc', from:'Singapore · Shanghai centre',
      spec:'Part 2 fluency · Pronunciation', langs:'English · Mandarin', years:9, lead:false, status:'published',
      bio:'Full mock interviews under exam conditions with immediate criterion-by-criterion feedback. Particularly strong on pronunciation for Mandarin, Cantonese and Vietnamese speakers.' },
    { id:'st5', name:'James Okonkwo', role:'IELTS Trainer · Reading Strategy', slot:'staff-jo', from:'Nigeria',
      spec:'Reading timing · Task 1 reports', langs:'English', years:12, lead:false, status:'published',
      bio:'Reading strategy specialist. If you understand the passages but never finish the paper, this is the teacher to book.' },
    { id:'st6', name:'Anjali Prasad', role:'Senior Tutor · South Asia Programme', slot:'staff-ap', from:'India · Bengaluru HQ',
      spec:'Articles & tenses · Essay planning', langs:'English · Hindi · Bengali', years:8, lead:false, status:'published',
      bio:'Works almost exclusively with Hindi, Urdu, Bengali and Tamil speakers. Targets articles, tense consistency and the direct-translation habits that cap students at Band 6.' },
    { id:'st7', name:'Dr. Hana Al-Balushi', role:'OET & Medical English Lead', slot:'staff-hb', from:'Oman · Muscat centre',
      spec:'OET · Medical English · IELTS 7.0 each', langs:'English · Arabic', years:10, lead:false, status:'published',
      bio:'Leads the medical track for doctors, nurses and dentists sitting OET or the IELTS 7.0-each requirement for GMC, NMC and DHA registration.' },
    { id:'st8', name:'Li Wei', role:'Senior Tutor · East Asia Programme', slot:'staff-lw', from:'China · Shanghai centre',
      spec:'Speaking extension · Final consonants', langs:'English · Mandarin · Cantonese', years:7, lead:false, status:'published',
      bio:'Focuses on the obstacles specific to Mandarin and Cantonese speakers: final consonants, plural and past-tense endings, and extending answers past one sentence.' },
  ],
  gallery: [
    { id:'g1', slot:'mo-1', title:'Results day, July 2026', sub:'Sixteen students, eleven at Band 7 or above', status:'published' },
    { id:'g2', slot:'mo-2', title:'Speaking workshop', sub:'Part 2 long turns, recorded and reviewed', status:'published' },
    { id:'g3', slot:'mo-3', title:'Muscat, our first classroom', sub:'Where Bloom started in 2025', status:'published' },
    { id:'g4', slot:'mo-4', title:'The teaching team', sub:'Three former examiners, four specialists', status:'published' },
    { id:'g5', slot:'mo-5', title:'Marking session', sub:'Every essay against all four descriptors', status:'published' },
    { id:'g6', slot:'mo-6', title:'Send-off before departure', sub:'Milan, Toronto, Sydney and Delft', status:'published' },
    { id:'g7', slot:'mo-7', title:'Autumn intake, first week', sub:'Twenty-four students, fourteen countries', status:'published' },
  ],
  news: [
    { id:'n1', title:'Single-skill retakes now available at our partner centres', date:'2026-09-02', kind:'Exam update', status:'published',
      body:'Candidates who miss one skill can now retake that skill alone within 60 days of the original sitting, at our Bengaluru, Muscat and Shanghai partner centres.' },
    { id:'n2', title:'Autumn intake open — six cohorts, 96 places', date:'2026-08-25', kind:'Admissions', status:'published',
      body:'Morning and evening IELTS Intensive, General Training, Speaking Confidence, TOEFL and Foundation English. Placement testing runs from 9 September.' },
    { id:'n3', title:'New: OET pathway with Future MedsAcademy', date:'2026-08-11', kind:'Course launch', status:'published',
      body:'Healthcare English for GMC, NMC and AHPRA registration, with role-plays run by practising clinicians and referral letters marked twice.' },
    { id:'n4', title:'Bloom named a British Council preparation partner', date:'2026-07-19', kind:'Announcement', status:'published',
      body:'Formal recognition of our examiner-led marking standards. Students can now book test sittings directly through their Bloom account.' },
  ],
  testimonials: [
    { id:'t1', name:'Priya Sharma', from:'Delhi, India', outcome:'Manchester MSc', start:6.0, end:7.5, status:'published', featured:true,
      quote:'I had taken IELTS twice and got 6.0 for writing both times without ever understanding why. Bloom marked my first essay against the four criteria and the problem was obvious in ten minutes.' },
    { id:'t2', name:'Li Chen', from:'Shanghai, China', outcome:'UNSW Engineering', start:6.5, end:7.5, status:'published', featured:true,
      quote:'My reading comprehension was fine — I just never finished the paper. James timed my skim and taught me to locate rather than read. That single change was worth a band.' },
    { id:'t3', name:'Aisha Khan', from:'Lahore, Pakistan', outcome:'NHS Registration', start:6.0, end:7.5, status:'published', featured:true,
      quote:'I needed 7.0 in every band for nursing registration and speaking was holding me back. Michael showed me I was stopping at seventy seconds in Part 2.' },
    { id:'t4', name:'Nguyen Tran', from:'Hanoi, Vietnam', outcome:'TU Delft MSc', start:6.0, end:7.0, status:'published', featured:false,
      quote:'Nobody had ever told me that Vietnamese speakers drop final consonants, and that it reads as a grammar error rather than an accent. Once I knew, I could hear it.' },
    { id:'t5', name:'Yusuf Demir', from:'Istanbul, Türkiye', outcome:'Canada PR', start:5.5, end:7.0, status:'published', featured:false,
      quote:'I stopped deciding what to study every morning and just did what the plan said. Thirty-four day streak, and my mock scores went up every fortnight.' },
    { id:'t6', name:'Fatima Ahmed', from:'Dhaka, Bangladesh', outcome:"King's College London", start:4.5, end:7.0, status:'published', featured:false,
      quote:'I started at B1 and thought Band 7 was years away. The placement test said eighteen weeks. Having a real number instead of encouragement kept me going.' },
  ],
  courses: [
    { id:'c1', name:'IELTS Academic', tier:'All plans', level:'B1–C1', weeks:8, price:'from £190/mo', status:'published',
      blurb:'Our core programme. Four skills, every question type, and the band descriptors read literally rather than paraphrased.' },
    { id:'c2', name:'IELTS General Training', tier:'All plans', level:'B1–B2', weeks:6, price:'from £190/mo', status:'published',
      blurb:'Migration and work. Everyday reading texts and a letter task instead of a report.' },
    { id:'c3', name:'TOEFL iBT', tier:'Plus & Premium', level:'B2–C1', weeks:6, price:'from £340/mo', status:'published',
      blurb:'Integrated-skills format with a 0–120 scaled score. Format is taught explicitly.' },
    { id:'c4', name:'PTE Academic', tier:'Plus & Premium', level:'B2–C1', weeks:6, price:'from £340/mo', status:'published',
      blurb:'Computer-scored, results in 48 hours. Heavy emphasis on response timing.' },
    { id:'c5', name:'OET · Medical English', tier:'Premium', level:'B2–C1', weeks:8, price:'from £520/mo', status:'published',
      blurb:'Healthcare English for registration, with Future MedsAcademy clinicians in every role-play.' },
    { id:'c6', name:'General & Spoken English', tier:'Core & Plus', level:'A1–C2', weeks:12, price:'from £190/mo', status:'published',
      blurb:'Confident everyday and workplace English, with CEFR progression rather than a band target.' },
  ],
  enquiries: [
    { id:'e1', name:'Rahul Verma', email:'rahul.v@email.com', country:'India', interest:'IELTS Academic', band:'6.0', target:'7.0', at:'2026-09-09', status:'new',
      msg:'I need 7.0 with 6.5 in writing for a September 2027 masters. Sat once, got 6.0 overall.' },
    { id:'e2', name:'Mei Wong', email:'mei.wong@email.com', country:'China', interest:'PTE Academic', band:'—', target:'65', at:'2026-09-09', status:'new',
      msg:'Have not tested yet. Which is easier for me, PTE or IELTS?' },
    { id:'e3', name:'Dr. Samir Haddad', email:'s.haddad@email.com', country:'Egypt', interest:'OET', band:'—', target:'B each', at:'2026-09-08', status:'contacted',
      msg:'GMC registration. I am a practising cardiologist and my clinical English is strong.' },
    { id:'e4', name:'Linh Pham', email:'linh.pham@email.com', country:'Vietnam', interest:'IELTS Academic', band:'5.5', target:'6.5', at:'2026-09-07', status:'contacted',
      msg:'Speaking is my weakest. Do you have evening classes in my time zone?' },
    { id:'e5', name:'Omar Farooq', email:'omar.f@email.com', country:'Pakistan', interest:'Study abroad', band:'7.0', target:'—', at:'2026-09-05', status:'converted',
      msg:'Already have 7.0. I need help choosing universities and filing the visa.' },
  ],
  settings: {
    siteName:'Bloom IELTS Academy', tagline:'Reach your band with teachers who marked the real exam',
    email:'hello@bloomielts.com', phone:'+91 80 4718 2260', address:'Prestige Tech Park, Marathahalli, Bengaluru 560103, India',
    whatsapp:'+91 90080 41720', instagram:'@bloomielts', founded:'2025',
    students:'2,840', gain:'+1.4', target:'92%', countries:'34', teachers:'8', hq:'Bengaluru, India', offices:'Muscat · Milan · Shanghai',
    bannerOn:true, bannerText:'Autumn intake open — six cohorts, 96 places. Placement testing from 9 September.',
    bannerLink:'courses.html', bannerCta:'See courses',
  },
};

const CMS_CATS = ['Strategy','Writing','Reading','Listening','Speaking','Grammar','Study abroad','Medical','Exam update'];
const CMS_STATUS = ['published','draft'];

/* ── read/write ── */
let CMS_STALE = false;
function cmsLoad(){
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('bloom_cms') || 'null'); } catch(e){}
  const out = JSON.parse(JSON.stringify(CMS_SEED));
  if (saved && saved._v === CMS_VERSION){
    for (const k of Object.keys(out)) if (saved[k] !== undefined) out[k] = saved[k];
  } else if (saved){
    /* snapshot predates the current seed — discard it and keep the corrected
       content, so the stale copy can never win. */
    CMS_STALE = true;
    try { localStorage.removeItem('bloom_cms'); } catch(e){}
  }
  return out;
}
let CMS = null;
function cms(){ if (!CMS) CMS = cmsLoad(); return CMS; }
function cmsSave(){
  try { localStorage.setItem('bloom_cms', JSON.stringify({ ...cms(), _v: CMS_VERSION })); } catch(e){}
}
function cmsReset(){ try { localStorage.removeItem('bloom_cms'); } catch(e){} CMS = null; CMS_STALE = false; }
function cmsWasReset(){ return CMS_STALE; }
function cmsPub(key){ return cms()[key].filter(x => x.status === 'published'); }
function cmsFmtDate(d){ return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }); }
function cmsEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
