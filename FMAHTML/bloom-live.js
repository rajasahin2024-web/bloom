/* ═══════════════════════════════════════════════════════════════
   BLOOM — Live classes
   Student side: my course, this week's timetable, join a live room,
   recordings, attendance, homework.
   Staff side: host a class, take the register, publish recordings.
═══════════════════════════════════════════════════════════════ */

let lv = { view:'home', wk:0, cls:null, room:null, tab:'chat', msg:'', hand:false, reg:null, joined:false };

/* ── which cohort is this student in ── */
function myCohort(){
  if (B.cohortId){
    const saved = COHORTS.find(c => c.id === B.cohortId);
    if (saved) return saved;
  }
  const p = B.profile, lvl = B.placement ? B.placement.cefr : 'B1';
  const exam = typeof examTrack === 'function' ? examTrack() : p.exam;
  const byExam = COHORTS.filter(c => c.exam === exam);
  const pool = byExam.length ? byExam : COHORTS;
  /* Prefer a cohort that is actually running: one whose term has begun and
     not yet finished. A cohort that starts next month has no classes at all,
     which would leave the timetable and the schedule empty for no reason. */
  const running = pool.filter(c => {
    const start = new Date(c.start + 'T00:00:00');
    const end = new Date(start); end.setDate(end.getDate() + c.weeks * 7);
    const now = new Date();
    return start <= now && now < end;
  });
  const search = running.length ? running : pool;
  const fit = search.find(c => c.level.includes(lvl)) || search[0];
  B.cohortId = fit.id; save();
  return fit;
}
/* has the student's course started yet? */
function cohortPhase(c){
  const start = new Date((c || myCohort()).start + 'T00:00:00');
  const co = c || myCohort();
  const end = new Date(start); end.setDate(end.getDate() + co.weeks * 7);
  const now = new Date();
  if (now < start) return 'upcoming';
  if (now >= end) return 'finished';
  return 'running';
}
function myClassmates(){ return students().filter(s => s.cohort === myCohort().id); }

/* ── the syllabus a cohort works through, week by week ── */
const SYLLABUS = {
  'ielts-a': [
    { wk:1, focus:'Orientation & diagnosis', parts:['strategy','l1'], aim:'Understand the four papers, the band descriptors and where you stand.' },
    { wk:2, focus:'Listening 1–2 · form completion', parts:['l1','l2'], aim:'Transcribe names, numbers and dates accurately under time pressure.' },
    { wk:3, focus:'Reading · locating not reading', parts:['r1','r2'], aim:'Skim a paragraph for its single idea in under 20 seconds.' },
    { wk:4, focus:'Writing Task 1 · the overview', parts:['w1'], aim:'Write a two-sentence overview identifying the clearest patterns.' },
    { wk:5, focus:'Speaking 1–2 · fluency and extension', parts:['s1','s2'], aim:'Fill the two-minute long turn without hesitation.' },
    { wk:6, focus:'Writing Task 2 · structure', parts:['w2','gv'], aim:'Plan and write all five essay types to a fixed shape.' },
    { wk:7, focus:'Listening 3–4 · discussion and lecture', parts:['l3','l4'], aim:'Track multiple speakers and follow a five-minute lecture.' },
    { wk:8, focus:'Full mock & review', parts:['strategy','r3','s3'], aim:'Sit a complete paper under exam conditions and read the report.' },
  ],
  'ielts-g': [
    { wk:1, focus:'GT format & diagnosis', parts:['strategy','rgt'], aim:'Know how GT differs from Academic, section by section.' },
    { wk:2, focus:'GT Reading Sections 1–2', parts:['rgt'], aim:'Read notices and workplace texts for exception clauses.' },
    { wk:3, focus:'Letter writing', parts:['w1'], aim:'Write formal, semi-formal and informal letters to the right register.' },
    { wk:4, focus:'Listening for daily life', parts:['l1','l2'], aim:'Handle transactional conversations and announcements.' },
    { wk:5, focus:'Task 2 essay', parts:['w2','gv'], aim:'Structure an opinion essay in 40 minutes.' },
    { wk:6, focus:'Full mock & review', parts:['strategy','s2'], aim:'Sit a complete GT paper and read the report.' },
  ],
  'toefl': [
    { wk:1, focus:'TOEFL format & integrated skills', parts:['strategy'], aim:'Understand how TOEFL integrates the four skills.' },
    { wk:2, focus:'Reading · academic passages', parts:['r2','r3'], aim:'Handle inference and vocabulary-in-context questions.' },
    { wk:3, focus:'Listening · lectures and conversations', parts:['l3','l4'], aim:'Take notes on a five-minute academic lecture.' },
    { wk:4, focus:'Speaking · independent and integrated', parts:['s1','s3'], aim:'Deliver a 45-second response from 15 seconds of preparation.' },
    { wk:5, focus:'Writing · integrated and academic discussion', parts:['w2'], aim:'Summarise a lecture against a reading passage.' },
    { wk:6, focus:'Full mock & review', parts:['strategy'], aim:'Sit a complete TOEFL iBT simulation.' },
  ],
  'general': [
    { wk:1, focus:'Speaking with confidence', parts:['s1'], aim:'Answer everyday questions with a reason and an example.' },
    { wk:2, focus:'Pronunciation & rhythm', parts:['s1'], aim:'Use sentence stress rather than word-by-word delivery.' },
    { wk:3, focus:'Describing and narrating', parts:['s2'], aim:'Tell a two-minute story in the past tense accurately.' },
    { wk:4, focus:'Discussion & opinion', parts:['s3','gv'], aim:'Hedge, concede and disagree politely.' },
  ],
};
function syllabusFor(c){ return SYLLABUS[c.exam] || SYLLABUS['ielts-a']; }

/* ── class session types ── */
const CLS_KINDS = {
  lesson:   { name:'Live lesson',      ic:'fa-chalkboard-user', tone:'leaf' },
  workshop: { name:'Skills workshop',  ic:'fa-users-rectangle', tone:'sky'  },
  clinic:   { name:'Q&A clinic',       ic:'fa-circle-question', tone:'amb'  },
  mock:     { name:'Supervised mock',  ic:'fa-clipboard-check', tone:'cor'  },
  speaking: { name:'Speaking circle',  ic:'fa-microphone',      tone:'vio'  },
};

/* Generate the term timetable for a cohort deterministically:
   the cohort's own days/time, plus academy-wide extras every student may join. */
function classesFor(cohort, weekOffset){
  const dates = weekDates(weekOffset);
  const syl = syllabusFor(cohort);
  const termStart = new Date(cohort.start + 'T00:00:00');
  const out = [];

  dates.forEach((iso, di) => {
    const dow = DAYS[di];
    const d = new Date(iso + 'T00:00:00');
    const weekNo = Math.floor((d - termStart) / 604800000) + 1;
    const unit = syl[Math.max(0, Math.min(syl.length - 1, weekNo - 1))];
    if (weekNo < 1 || weekNo > cohort.weeks) return;

    /* the student's own cohort lessons */
    if (cohort.days.includes(dow)){
      const [from, to] = cohort.time.split('–');
      const n = cohort.days.indexOf(dow);
      const kind = n === 0 ? 'lesson' : n === 1 ? 'workshop' : 'clinic';
      out.push({
        id: cohort.id + '-' + iso + '-' + from.replace(':',''),
        cohort: cohort.id, date: iso, from, to, kind,
        teacher: cohort.teacher, room: cohort.room, week: weekNo,
        title: unit.focus, aim: unit.aim, parts: unit.parts,
        mine: true, cap: cohort.cap, booked: Math.min(cohort.cap, cohort.enrolled - (di % 3)),
      });
    }

    /* academy-wide open sessions, same for everyone */
    if (dow === 'Wed') out.push({ id:'open-speak-'+iso, cohort:null, date:iso, from:'19:30', to:'20:15', kind:'speaking',
      teacher:'mc', room:'Studio · Online', week:weekNo, title:'Open speaking circle', aim:'Practise Part 2 long turns with students from every cohort.',
      parts:['s2'], mine:false, cap:12, booked:7 + (di % 4) });
    if (dow === 'Sat') out.push({ id:'open-clinic-'+iso, cohort:null, date:iso, from:'11:00', to:'12:00', kind:'clinic',
      teacher:'em', room:'Room 1 · Online', week:weekNo, title:'Writing drop-in clinic', aim:'Bring one essay. We mark a paragraph of it live against the descriptors.',
      parts:['w2'], mine:false, cap:20, booked:12 + (di % 6) });
    if (dow === 'Fri' && weekNo % 2 === 0) out.push({ id:'open-mock-'+iso, cohort:null, date:iso, from:'14:00', to:'17:00', kind:'mock',
      teacher:'ew', room:'Hall · Online', week:weekNo, title:'Supervised full mock', aim:'A complete paper under exam conditions, invigilated and marked.',
      parts:['strategy'], mine:false, cap:30, booked:18 + (di % 7) });
  });

  return out.sort((a,b) => (a.date + a.from).localeCompare(b.date + b.from));
}

/* ── live-state helpers, relative to the real clock ── */
function clsStart(c){ return new Date(c.date + 'T' + c.from + ':00'); }
function clsEnd(c){ return new Date(c.date + 'T' + c.to + ':00'); }
function clsState(c){
  const now = new Date(), s = clsStart(c), e = clsEnd(c);
  const openFrom = new Date(s.getTime() - 10 * 60000);
  if (now >= e) return 'ended';
  if (now >= s) return 'live';
  if (now >= openFrom) return 'soon';
  return 'upcoming';
}
function clsMinsTo(c){ return Math.round((clsStart(c) - new Date()) / 60000); }
function clsDur(c){ return Math.round((clsEnd(c) - clsStart(c)) / 60000); }

/* ── student records ──
   Backfill each key individually: a saved state from an earlier build may
   have B.live present but missing newer keys, and `B.live || {...}` would
   leave those undefined. */
function lvState(){
  const s = B.live = B.live || {};
  if (!Array.isArray(s.booked)) s.booked = [];
  if (!s.attended) s.attended = {};
  if (!s.notes) s.notes = {};
  if (!s.homework) s.homework = {};
  if (!s.chat) s.chat = {};
  return s;
}
function lvBooked(id){ return lvState().booked.includes(id); }
function lvToggleBook(id){
  const st = lvState(), i = st.booked.indexOf(id);
  if (i >= 0) st.booked.splice(i,1); else st.booked.push(id);
  save(); navTo('live');
  toast(i >= 0 ? 'Removed from your timetable' : 'Added to your timetable · reminder set', i >= 0 ? 'fa-calendar-minus' : 'fa-calendar-check');
}
function lvAttended(id){ return !!lvState().attended[id]; }

/* recordings: every class that has ended has one */
function recordingsFor(cohort){
  const out = [];
  for (let w = -6; w <= 0; w++){
    classesFor(cohort, w).forEach(c => { if (clsState(c) === 'ended') out.push(c); });
  }
  return out.sort((a,b) => (b.date + b.from).localeCompare(a.date + a.from)).slice(0, 24);
}

/* ═══ STUDENT: LIVE CLASSES ═══ */
function sec_live(){
  if (lv.view === 'room' && lv.room) return lvRoomHTML();
  if (lv.view === 'course') return lvCourseHTML();
  if (lv.view === 'recordings') return lvRecordingsHTML();
  return lvHomeHTML();
}

function lvHomeHTML(){
  const c = myCohort();
  const all = classesFor(c, lv.wk);
  const dates = weekDates(lv.wk);
  const t = teacherOf(c.teacher);
  const upcoming = [];
  for (let w = 0; w <= 2; w++) classesFor(c, w).forEach(x => { if (clsState(x) !== 'ended') upcoming.push(x); });
  const next = upcoming[0];
  const nowLive = upcoming.filter(x => clsState(x) === 'live' || clsState(x) === 'soon');
  const att = Object.keys(lvState().attended).length;
  const held = (() => { let n = 0; for (let w = -6; w <= 0; w++) classesFor(c, w).forEach(x => { if (clsState(x) === 'ended' && x.mine) n++; }); return n; })();
  const weekNo = Math.max(1, Math.floor((new Date() - new Date(c.start + 'T00:00:00')) / 604800000) + 1);

  return `
    ${phead({ eyebrow:'My course · ' + c.name, title: nowLive.length ? `A class is <em>live now</em>` : `Live <em>classes</em>`,
      sub:`${c.name} with ${t.name} — ${c.days.join(', ')} at ${c.time}. Week ${Math.min(weekNo, c.weeks)} of ${c.weeks}.`,
      actions:`<button class="btn btn-g btn-sm" onclick="lv.view='recordings';navTo('live')"><i class="fa-solid fa-film"></i> Recordings</button>
        <button class="btn btn-g btn-sm" onclick="lv.view='course';navTo('live')"><i class="fa-solid fa-list-check"></i> My syllabus</button>
        ${next ? `<button class="btn btn-p" onclick="lvJoin('${next.id}')"><i class="fa-solid fa-video"></i> ${clsState(next)==='live'?'Join now':'Next class'}</button>` : ''}` })}

    ${nowLive.length ? nowLive.map(x => {
      const st = clsState(x), tt = teacherOf(x.teacher);
      return `<div class="card mb2" style="border-color:${st==='live'?'var(--coral)':'var(--leaf-500)'};background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 60%);color:#fff;border:none;overflow:hidden;position:relative">
        <div class="card-bd" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:24px 26px">
          <div style="width:52px;height:52px;flex:0 0 52px;border-radius:16px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);display:grid;place-items:center;font-size:20px">
            <i class="fa-solid ${CLS_KINDS[x.kind].ic}"></i></div>
          <div style="flex:1;min-width:220px">
            <div style="display:flex;gap:9px;align-items:center;margin-bottom:6px">
              ${st==='live'?`<span style="display:inline-flex;align-items:center;gap:7px;background:var(--coral);border-radius:30px;padding:4px 11px;font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase;font-weight:800">
                <span style="width:6px;height:6px;border-radius:50%;background:#fff;animation:pulse 1.4s infinite"></span>Live now</span>`
              :`<span style="background:rgba(255,255,255,.16);border-radius:30px;padding:4px 11px;font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase;font-weight:800;color:var(--leaf-300)">Starts in ${Math.max(0,clsMinsTo(x))} min</span>`}
              <span style="font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--leaf-300);font-weight:800">${CLS_KINDS[x.kind].name}</span>
            </div>
            <b style="font-family:var(--display);font-size:20px;font-weight:700;display:block;letter-spacing:-.4px">${x.title}</b>
            <span style="font-size:12.5px;color:rgba(255,255,255,.7)">${x.from}–${x.to} · ${tt.name} · ${x.room}</span>
          </div>
          <button class="btn btn-lg" style="background:#fff;color:var(--leaf-800)" onclick="lvJoin('${x.id}')"><i class="fa-solid fa-video"></i> Join the class</button>
        </div>
      </div>`;
    }).join('') : next ? `
      <div class="card mb2">
        <div class="card-bd" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="text-align:center;flex:0 0 58px">
            <div style="font-family:var(--display);font-size:22px;font-weight:700;line-height:1">${clsStart(next).getDate()}</div>
            <div style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${clsStart(next).toLocaleDateString('en-GB',{month:'short'})}</div></div>
          <div style="width:40px;height:40px;flex:0 0 40px;border-radius:13px;background:${toneVars(CLS_KINDS[next.kind].tone)[0]};color:${toneVars(CLS_KINDS[next.kind].tone)[1]};display:grid;place-items:center"><i class="fa-solid ${CLS_KINDS[next.kind].ic}"></i></div>
          <div style="flex:1;min-width:210px">
            <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:4px">Your next class · ${clsStart(next).toLocaleDateString('en-GB',{weekday:'long'})}</div>
            <b style="font-size:15.5px;display:block">${next.title}</b>
            <span style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4)">${next.from}–${next.to} · ${teacherOf(next.teacher).name} · ${next.room}</span></div>
          <button class="btn btn-g btn-sm" onclick="lvICS('${next.id}')"><i class="fa-regular fa-calendar-plus"></i> Add to calendar</button>
          <button class="btn btn-p btn-sm" onclick="lvJoin('${next.id}')"><i class="fa-solid fa-door-open"></i> Open the room</button>
        </div>
      </div>` : ''}

    <div class="grid g4 mb2">
      ${statCard('Classes attended', att + ' / ' + Math.max(att, held), held ? pct(att, held) + '% attendance' : 'Term has just started', att >= held * 0.8 ? 'leaf' : 'amb', 'fa-user-check')}
      ${statCard('This week', all.filter(x=>x.mine).length + ' lessons', all.filter(x=>!x.mine).length + ' open sessions you may join', 'sky', 'fa-calendar-week')}
      ${statCard('Classmates', myClassmates().length, c.room, '', 'fa-users')}
      ${statCard('Recordings', recordingsFor(c).length, 'Every class is recorded', 'vio', 'fa-film')}
    </div>

    <div class="card mb2">
      <div class="card-hd">
        <button class="btn btn-g btn-sm" onclick="lv.wk--;navTo('live')"><i class="fa-solid fa-chevron-left"></i></button>
        <div style="flex:1;text-align:center"><h3>${tutDate(dates[0]).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${tutDate(dates[6]).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</h3>
          <p>${lv.wk===0?'This week':lv.wk>0?'In '+lv.wk+' week'+(lv.wk===1?'':'s'):Math.abs(lv.wk)+' week'+(lv.wk===-1?'':'s')+' ago'}</p></div>
        <button class="btn btn-g btn-sm" onclick="lv.wk++;navTo('live')"><i class="fa-solid fa-chevron-right"></i></button>
        ${lv.wk!==0?`<button class="btn btn-g btn-sm" onclick="lv.wk=0;navTo('live')">Today</button>`:''}
      </div>
      <div class="card-bd" style="padding:14px">
        ${all.length ? `<div style="display:grid;gap:10px">
          ${dates.map((iso, di) => {
            const day = all.filter(x => x.date === iso);
            if (!day.length) return '';
            const d = tutDate(iso), isToday = iso === today();
            return `<div style="border:1.5px solid ${isToday?'var(--leaf-500)':'var(--line)'};border-radius:14px;overflow:hidden;background:var(--surface)">
              <div style="display:flex;gap:13px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:${isToday?'var(--leaf-50)':'transparent'}">
                <div style="width:42px;text-align:center">
                  <div style="font-family:var(--display);font-size:18px;font-weight:700;line-height:1;color:${isToday?'var(--leaf-700)':'var(--ink)'}">${d.getDate()}</div>
                  <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${DAYS[di]}</div></div>
                <b style="font-size:13.5px;flex:1">${isToday?'Today':d.toLocaleDateString('en-GB',{weekday:'long'})}</b>
                ${isToday?'<span class="tag leaf">Today</span>':''}
                <span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${day.length} session${day.length===1?'':'s'}</span>
              </div>
              ${day.map(x => {
                const st = clsState(x), k = CLS_KINDS[x.kind], [bg,fg] = toneVars(k.tone);
                const tt = teacherOf(x.teacher);
                const booked = x.mine || lvBooked(x.id);
                return `<div style="display:flex;gap:13px;align-items:center;padding:12px 16px;border-bottom:1px dashed var(--line);${st==='ended'?'opacity:.62':''}">
                  <div style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4);flex:0 0 80px">${x.from}–${x.to}</div>
                  <div style="width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:${bg};color:${fg};display:grid;place-items:center;font-size:12px"><i class="fa-solid ${k.ic}"></i></div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
                      <b style="font-size:13.5px">${x.title}</b>
                      ${x.mine?'<span class="tag leaf">My cohort</span>':'<span class="tag">Open to all</span>'}
                      ${st==='live'?'<span class="tag cor">Live now</span>':st==='soon'?'<span class="tag amb">Starting</span>':''}
                      ${lvAttended(x.id)?'<span class="tag ok">Attended</span>':''}
                    </div>
                    <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4);margin-top:2px">${k.name} · ${tt.name} · ${x.room}${x.mine?'':' · '+x.booked+'/'+x.cap+' booked'}</div>
                  </div>
                  ${st === 'ended'
                    ? `<button class="btn btn-g btn-sm" onclick="lvJoin('${x.id}')"><i class="fa-solid fa-play"></i> Recording</button>`
                    : `${x.mine?'':`<button class="icobtn" style="width:30px;height:30px;font-size:11px;${booked?'color:var(--leaf-700);border-color:var(--leaf-400)':''}" title="${booked?'Booked':'Add to my timetable'}" onclick="lvToggleBook('${x.id}')"><i class="fa-${booked?'solid fa-check':'regular fa-square-plus'}"></i></button>`}
                       <button class="btn ${st==='live'||st==='soon'?'btn-p':'btn-g'} btn-sm" onclick="lvJoin('${x.id}')"><i class="fa-solid fa-${st==='live'||st==='soon'?'video':'door-open'}"></i> ${st==='live'?'Join':st==='soon'?'Join':'Open'}</button>`}
                </div>`;
              }).join('')}
            </div>`;
          }).join('')}
        </div>`
        : `<div class="empty" style="border:none;background:transparent"><i class="fa-solid fa-calendar-xmark"></i><b>No classes this week</b><span>${lv.wk>0?'Outside your course dates.':'Your course runs '+c.days.join(', ')+' at '+c.time+'.'}</span></div>`}
      </div>
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>My cohort</h3><p>${c.name} · ${c.level} · ${examOf(c.exam).name}</p></div>
          <button class="btn btn-g btn-sm" onclick="lv.view='course';navTo('live')">Syllabus</button></div>
        <div class="card-bd">
          <div style="display:flex;gap:14px;align-items:center;padding-bottom:16px;border-bottom:1px solid var(--line);margin-bottom:16px">
            <div style="width:46px;height:46px;flex:0 0 46px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:13px;font-weight:800">${t.init}</div>
            <div style="flex:1"><b style="font-size:14.5px;display:block">${t.name}</b><span style="font-size:12px;color:var(--ink-4)">${t.role}</span></div>
            <button class="btn btn-g btn-sm" onclick="navTo('tutoring')"><i class="fa-solid fa-calendar-plus"></i> Book 1-on-1</button>
          </div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:11px">
            ${[['Schedule', c.days.join(', ') + ' · ' + c.time],['Room', c.room],['Length', c.weeks + ' weeks from ' + c.start],['Class size', myClassmates().length + ' students']].map(([l,v])=>`
              <div style="padding:12px 13px;background:var(--paper);border-radius:11px">
                <div style="font-size:8.5px;letter-spacing:1.3px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:4px">${l}</div>
                <div style="font-size:12.5px;font-weight:700;color:var(--ink-2);line-height:1.4">${v}</div></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Open sessions</h3><p>Any Bloom student may join these</p></div></div>
        <div class="card-bd flush">
          ${(() => {
            const open = [];
            for (let w = 0; w <= 2; w++) classesFor(c, w).forEach(x => { if (!x.mine && clsState(x) !== 'ended') open.push(x); });
            return open.slice(0,5).map(x => {
              const k = CLS_KINDS[x.kind], d = clsStart(x);
              return `<div class="row">
                <div class="ic ${k.tone==='leaf'?'':k.tone}"><i class="fa-solid ${k.ic}"></i></div>
                <div class="tx"><b>${x.title}</b><span>${d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} · ${x.from} · ${teacherOf(x.teacher).name}</span></div>
                <button class="btn ${lvBooked(x.id)?'btn-g':'btn-p'} btn-sm" onclick="lvToggleBook('${x.id}')">${lvBooked(x.id)?'Booked':'Book'}</button></div>`;
            }).join('') || '<div style="padding:22px;text-align:center;font-size:12.5px;color:var(--ink-4)">Nothing scheduled.</div>';
          })()}
        </div>
      </div>
    </div>`;
}

/* ── find a class by id across the term ── */
function findClass(id){
  const c = myCohort();
  for (let w = -8; w <= 8; w++){
    const hit = classesFor(c, w).find(x => x.id === id);
    if (hit) return hit;
  }
  return null;
}

/* ═══ THE LIVE ROOM ═══ */
function lvJoin(id){
  const c = findClass(id); if (!c) { toast('That class is not in your timetable'); return; }
  lv.room = id; lv.view = 'room'; lv.tab = clsState(c) === 'ended' ? 'notes' : 'chat'; lv.hand = false;
  lv.joined = false;   /* the call is not entered until the student presses join */
  if (clsState(c) === 'live' || clsState(c) === 'soon'){
    const st = lvState();
    if (!st.attended[id]){ st.attended[id] = today(); save(); addXP(25); markActive(clsDur(c)); }
  }
  navTo('live');
}

function lvRoomHTML(){
  const c = findClass(lv.room); if (!c) { lv.view = 'home'; return lvHomeHTML(); }
  const st = clsState(c), k = CLS_KINDS[c.kind], t = teacherOf(c.teacher);
  const co = c.cohort ? cohortOf(c.cohort) : null;
  const peers = (co ? students().filter(s => s.cohort === co.id) : myClassmates()).slice(0, 11);
  const notes = lvState().notes[c.id] || '';
  const ended = st === 'ended';

  return `
    ${phead({ eyebrow:`${k.name} · Week ${c.week}`, title:c.title.replace(/(\S+)$/,'<em>$1</em>'), sub:c.aim,
      actions:`<button class="btn btn-g btn-sm" onclick="lv.view='home';navTo('live')"><i class="fa-solid fa-arrow-left"></i> Timetable</button>
        ${!ended?`<button class="btn btn-g btn-sm" onclick="lvICS('${c.id}')"><i class="fa-regular fa-calendar-plus"></i> Calendar</button>`:''}
        ${ended?`<button class="btn btn-p btn-sm" onclick="toast('Recording downloaded for offline viewing','fa-download')"><i class="fa-solid fa-download"></i> Download</button>`:''}` })}

    <div style="display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start" class="lvsplit">
      <div style="display:grid;gap:16px">
        <div class="card" style="overflow:hidden">
          <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#0d1712,var(--leaf-900) 55%,var(--leaf-800));position:relative;display:grid;place-items:center">
            <div style="position:absolute;inset:0;opacity:.06;background:radial-gradient(circle at 78% 22%, #fff 0 30%, transparent 30%),radial-gradient(circle at 20% 80%, #fff 0 22%, transparent 22%)"></div>
            ${st === 'live' ? `<div style="position:absolute;top:14px;left:14px;z-index:3;display:inline-flex;align-items:center;gap:8px;background:var(--coral);color:#fff;border-radius:30px;padding:5px 13px;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;font-weight:800">
              <span style="width:6px;height:6px;border-radius:50%;background:#fff;animation:pulse 1.3s infinite"></span>Live</div>` : ''}
            ${ended ? `<div style="position:absolute;top:14px;left:14px;z-index:3;background:rgba(0,0,0,.5);color:#fff;border-radius:30px;padding:5px 13px;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;font-weight:800">Recording</div>` : ''}
            <div style="position:absolute;top:14px;right:14px;z-index:3;display:flex;gap:7px">
              <span style="background:rgba(0,0,0,.45);color:#fff;border-radius:8px;padding:5px 10px;font-family:var(--mono);font-size:11px"><i class="fa-solid fa-users" style="margin-right:6px;opacity:.7"></i>${ended ? c.booked : peers.length + 1}</span>
              <span style="background:rgba(0,0,0,.45);color:#fff;border-radius:8px;padding:5px 10px;font-family:var(--mono);font-size:11px">${c.from}–${c.to}</span>
            </div>
            ${typeof meetPanelHTML === 'function' ? meetPanelHTML(c, st) : ''}
            ${(typeof meetFrameHTML === 'function' && lv.joined && (st === 'live' || st === 'soon')) ? meetFrameHTML(c) : ''}
            </div>
            ${(st === 'live' || ended) ? `<div style="position:absolute;left:0;right:0;bottom:0;z-index:3;padding:13px 16px;background:linear-gradient(to top,rgba(0,0,0,.62),transparent)">
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                ${peers.slice(0,6).map(p=>`<div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.34);color:#fff;display:grid;place-items:center;font-size:9px;font-weight:800" title="${esc(p.name)}">${initials(p.name)}</div>`).join('')}
                ${peers.length>6?`<div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;display:grid;place-items:center;font-family:var(--mono);font-size:9.5px;font-weight:800">+${peers.length-6}</div>`:''}
              </div></div>` : ''}
          </div>
          <div class="card-bd" style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">
            ${ended
              ? `<button class="btn btn-p btn-sm"><i class="fa-solid fa-play"></i> Play recording</button>
                 <button class="icobtn" title="Back 15s"><i class="fa-solid fa-rotate-left"></i></button>
                 <button class="icobtn" title="Speed"><span style="font-family:var(--mono);font-size:10.5px;font-weight:800">1×</span></button>`
              : st === 'upcoming'
                ? `<button class="btn btn-g btn-sm" onclick="lvICS('${c.id}')"><i class="fa-regular fa-calendar-plus"></i> Add to calendar</button>
                   <span style="font-size:12.5px;color:var(--ink-4)">The join button activates ten minutes before the start.</span>`
                : `${(() => {
                     const url = typeof meetLinkFor === 'function' ? meetLinkFor(c) : null;
                     const p = url ? meetProvider(url) : null;
                     if (!url) return '<span style="font-size:12.5px;color:var(--ink-4)"><i class="fa-solid fa-link-slash" style="margin-right:6px"></i>Waiting for your teacher to add the joining link.</span>';
                     if (lv.joined) return '<span style="display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--ok)"><span style="width:7px;height:7px;border-radius:50%;background:var(--ok)"></span>Connected in the portal</span>';
                     return p.embed
                       ? `<button class="btn btn-p btn-sm" onclick="meetJoinInline('${c.id}')"><i class="fa-solid fa-video"></i> Join here</button>
                          <button class="btn btn-g btn-sm" onclick="meetOpenWindow('${c.id}')"><i class="fa-solid fa-up-right-and-down-left-from-center"></i> New window</button>`
                       : `<button class="btn btn-p btn-sm" onclick="meetOpenWindow('${c.id}')"><i class="fa-${p.brand?'brands':'solid'} ${p.ic}"></i> Open ${p.name}</button>`;
                   })()}
                   <button class="btn ${lv.hand?'btn-a':'btn-g'} btn-sm" onclick="lv.hand=!lv.hand;navTo('live');toast(lv.hand?'Hand raised — your teacher can see it':'Hand lowered','fa-hand')"><i class="fa-solid fa-hand"></i> ${lv.hand?'Hand raised':'Raise hand'}</button>
                   <div style="flex:1"></div>
                   <button class="btn btn-g btn-sm" style="color:var(--err);border-color:var(--err)" onclick="lv.view='home';navTo('live')"><i class="fa-solid fa-phone-slash"></i> Leave</button>`}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>What this class covers</h3><p>Week ${c.week} of ${co?co.weeks:'the course'}</p></div></div>
          <div class="card-bd">
            <div style="font-size:14px;color:var(--ink-2);line-height:1.7;margin-bottom:16px">${c.aim}</div>
            <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:10px">Prepare with these, from the School</div>
            <div style="display:grid;gap:8px">
              ${c.parts.flatMap(pid => [
                ...matsFor(pid).slice(0,1).map(m => ({ t:m.title, s:MAT_KINDS[m.kind].name + ' · ' + m.pages + ' pages', ic:MAT_KINDS[m.kind].ic, go:`libOpenMat('${m.id}')`, tone:'amb' })),
                ...audFor(pid).slice(0,1).map(a => ({ t:a.title, s:'Audio · ' + fmtDur(a.secs), ic:'fa-headphones', go:`libOpenAud('${a.id}')`, tone:'cor' })),
                ...lecsFor(pid).slice(0,1).map(l => ({ t:l.title, s:'Lecture · ' + fmtDur(l.secs), ic:'fa-circle-play', go:`libOpenLec('${l.id}')`, tone:'sky' })),
              ]).slice(0,4).map(r => `<div style="display:flex;gap:12px;align-items:center;padding:11px 13px;border:1px solid var(--line);border-radius:11px">
                <div style="width:30px;height:30px;flex:0 0 30px;border-radius:9px;background:${toneVars(r.tone)[0]};color:${toneVars(r.tone)[1]};display:grid;place-items:center;font-size:11px"><i class="fa-solid ${r.ic}"></i></div>
                <div style="flex:1;min-width:0"><b style="font-size:13px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.t}</b>
                  <span style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${r.s}</span></div>
                <button class="btn btn-g btn-sm" onclick="lvGo(function(){${r.go}})">Open</button></div>`).join('')}
            </div>
            <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px">
              ${c.parts.map(pid => `<button class="pill" style="padding:5px 12px;font-size:11.5px" onclick="lvGo(function(){lbs.part='${pid}';lbs.view='part';navTo('library')})">${partOf(pid).name}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd" style="padding:12px 16px">
            <div class="seg" style="width:100%">
              ${[['chat', ended?'Transcript':'Chat'],['notes','My notes'],['people','People']].map(([kk,l])=>`<button class="${lv.tab===kk?'on':''}" style="flex:1" onclick="lv.tab='${kk}';navTo('live')">${l}</button>`).join('')}
            </div>
          </div>
          <div class="card-bd" style="padding:0">
            ${lv.tab === 'chat' ? `
              <div style="max-height:340px;overflow-y:auto;padding:16px;display:grid;gap:12px">
                ${lvChatFor(c).map(m => `<div style="display:flex;gap:10px">
                  <div style="width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:${m.staff?'linear-gradient(140deg,var(--leaf-800),var(--leaf-600))':'var(--paper-2)'};color:${m.staff?'#fff':'var(--ink-3)'};display:grid;place-items:center;font-size:9.5px;font-weight:800">${m.init}</div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;gap:7px;align-items:baseline;margin-bottom:3px">
                      <b style="font-size:12px;color:${m.staff?'var(--leaf-700)':'var(--ink)'}">${m.who}</b>
                      ${m.staff?'<span class="tag leaf" style="font-size:7.5px">Teacher</span>':''}
                      <span style="font-family:var(--mono);font-size:9.5px;color:var(--ink-4);margin-left:auto">${m.at}</span></div>
                    <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">${esc(m.text)}</div></div></div>`).join('')}
              </div>
              ${!ended ? `<div style="padding:12px 16px;border-top:1px solid var(--line);display:flex;gap:8px">
                <input id="lvMsg" placeholder="Ask a question…" style="flex:1;border:1.5px solid var(--line-2);border-radius:11px;padding:9px 12px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" onkeydown="if(event.key==='Enter')lvSend()">
                <button class="btn btn-p btn-sm" onclick="lvSend()"><i class="fa-solid fa-paper-plane"></i></button></div>` : ''}`
            : lv.tab === 'notes' ? `
              <div style="padding:16px">
                <textarea id="lvNotes" rows="12" placeholder="Type your notes during the class. They are saved automatically and kept with the recording." style="border:1.5px solid var(--line-2);border-radius:12px;padding:12px;font-family:inherit;font-size:13.5px;line-height:1.7;width:100%;background:var(--surface);color:var(--ink)" oninput="lvSaveNotes('${c.id}',this.value)">${esc(notes)}</textarea>
                <div style="font-size:11.5px;color:var(--ink-4);margin-top:9px"><i class="fa-solid fa-circle-check" style="color:var(--ok);margin-right:5px"></i>Saved to your account · kept with this class for ever</div>
              </div>`
            : `<div style="max-height:380px;overflow-y:auto">
                <div class="row"><div style="width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-800),var(--leaf-600));color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${t.init}</div>
                  <div class="tx"><b>${t.name}</b><span>${t.role}</span></div><span class="tag leaf">Teacher</span></div>
                <div class="row" style="background:var(--leaf-50)"><div style="width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:var(--leaf-600);color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${initials(B.profile.name)}</div>
                  <div class="tx"><b>${esc(B.profile.name)}</b><span>You${lv.hand?' · hand raised':''}</span></div>${lv.hand?'<i class="fa-solid fa-hand" style="color:var(--amber)"></i>':''}</div>
                ${peers.map(p=>`<div class="row"><div style="width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:var(--paper-2);color:var(--ink-3);display:grid;place-items:center;font-size:10px;font-weight:800">${initials(p.name)}</div>
                  <div class="tx"><b>${p.name}</b><span>${p.country} · Band ${bandLabel(p.band)}</span></div></div>`).join('')}
              </div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Homework</h3><p>Set by ${t.name.split(' ').slice(-1)[0]}</p></div></div>
          <div class="card-bd" style="display:grid;gap:9px">
            ${lvHomeworkFor(c).map((h,i) => {
              const done = !!(lvState().homework[c.id] || {})[i];
              return `<div style="display:flex;gap:11px;align-items:flex-start;padding:11px 13px;background:${done?'var(--ok-soft)':'var(--paper)'};border-radius:11px">
                <div class="check ${done?'on':''}" onclick="lvHw('${c.id}',${i})"><i class="fa-solid fa-check"></i></div>
                <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;line-height:1.5;${done?'text-decoration:line-through;color:var(--ink-4)':''}">${h.t}</div>
                  <span style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${h.mins} min</span></div>
                ${h.go?`<button class="icobtn" style="width:26px;height:26px;font-size:10px" onclick="lvGo(function(){${h.go}})"><i class="fa-solid fa-arrow-right"></i></button>`:''}</div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
    <style>@media(max-width:1080px){.lvsplit{grid-template-columns:1fr!important}}</style>`;
}

/* deterministic chat so a recording always reads the same */
function lvChatFor(c){
  const t = teacherOf(c.teacher);
  const peers = myClassmates();
  const h = tutHash(c.id);
  const pick = n => peers[(h + n * 7) % Math.max(1, peers.length)] || { name:'A student' };
  const base = [
    { who:t.name, init:t.init, staff:true, at:c.from, text:'Good morning everyone. Today is ' + c.title.toLowerCase() + ' — by the end you should be able to: ' + c.aim.toLowerCase() },
    { who:pick(1).name, init:initials(pick(1).name), staff:false, at:addMin(c.from, 4), text:'Should we have read the notes before this class?' },
    { who:t.name, init:t.init, staff:true, at:addMin(c.from, 5), text:'Helpful but not essential. The notes for ' + partOf(c.parts[0]).name + ' are in the School if you want them afterwards.' },
    { who:pick(2).name, init:initials(pick(2).name), staff:false, at:addMin(c.from, 18), text:'Could you show that example again please?' },
    { who:t.name, init:t.init, staff:true, at:addMin(c.from, 19), text:'Of course — screen sharing it now. Watch what changes in the second version.' },
    { who:pick(3).name, init:initials(pick(3).name), staff:false, at:addMin(c.from, 31), text:'That makes much more sense written side by side.' },
    { who:t.name, init:t.init, staff:true, at:addMin(c.from, Math.max(40, clsDur(c) - 8)), text:'Homework is in the panel on the right. Bring it to the next class and we will mark two of them live.' },
  ];
  const mine = (lvState().chat[c.id] || []).map(m => ({ who:B.profile.name, init:initials(B.profile.name), staff:false, at:m.at, text:m.text, me:true }));
  return [...base, ...mine].sort((a,b) => a.at.localeCompare(b.at));
}
function addMin(hhmm, n){
  const [h,m] = hhmm.split(':').map(Number);
  const x = h * 60 + m + n;
  return String(Math.floor(x/60) % 24).padStart(2,'0') + ':' + String(x % 60).padStart(2,'0');
}
function lvSend(){
  const el = document.getElementById('lvMsg'); if (!el) return;
  const v = el.value.trim(); if (!v) return;
  const st = lvState();
  st.chat[lv.room] = st.chat[lv.room] || [];
  st.chat[lv.room].push({ text:v, at:new Date().toTimeString().slice(0,5) });
  save(); el.value = ''; navTo('live');
}
function lvSaveNotes(id, v){
  const st = lvState(); st.notes[id] = v; save();
}
function lvHw(id, i){
  const st = lvState();
  st.homework[id] = st.homework[id] || {};
  st.homework[id][i] = !st.homework[id][i];
  save(); navTo('live');
  if (st.homework[id][i]) addXP(10);
}
function lvHomeworkFor(c){
  const out = [];
  c.parts.forEach(pid => {
    const m = matsFor(pid)[0], a = audFor(pid)[0];
    if (m) out.push({ t:'Read “' + m.title + '” and bring one question', mins:25, go:`libOpenMat('${m.id}')` });
    if (a) out.push({ t:'Listen to “' + a.title + '” once without the transcript', mins:Math.round(a.secs/60)+5, go:`libOpenAud('${a.id}')` });
  });
  if (c.parts.some(p => p.startsWith('w'))) out.push({ t:'Write one full task and submit it in the Writing Lab', mins:40, go:`navTo('writing')` });
  if (c.parts.some(p => p.startsWith('s'))) out.push({ t:'Record one cue-card answer in the Speaking Lab', mins:15, go:`navTo('speaking')` });
  if (c.kind === 'mock') out.push({ t:'Read your score report and note the two weakest sections', mins:20, go:`navTo('mocks')` });
  return out.slice(0, 4);
}
function lvGo(fn){ fn(); }

function lvICS(id){
  const c = findClass(id); if (!c) return;
  const t = teacherOf(c.teacher);
  const dt = c.date.replace(/-/g,'') + 'T' + c.from.replace(':','') + '00';
  const end = c.date.replace(/-/g,'') + 'T' + c.to.replace(':','') + '00';
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bloom IELTS Academy//Live Classes//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    'UID:' + c.id + '@bloomielts.com',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z',
    'DTSTART:' + dt, 'DTEND:' + end,
    'SUMMARY:Bloom live class — ' + c.title,
    'DESCRIPTION:' + CLS_KINDS[c.kind].name + ' with ' + t.name + '. ' + c.aim,
    'LOCATION:' + c.room,
    'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:Bloom class in 15 minutes','END:VALARM',
    'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type:'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'Bloom_Class_' + c.date + '.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('Calendar invite downloaded · reminder 15 minutes before', 'fa-calendar-plus');
}

/* ═══ MY COURSE / SYLLABUS ═══ */
function lvCourseHTML(){
  const c = myCohort(), syl = syllabusFor(c), t = teacherOf(c.teacher);
  const weekNo = Math.max(1, Math.min(c.weeks, Math.floor((new Date() - new Date(c.start + 'T00:00:00')) / 604800000) + 1));
  return `
    ${phead({ eyebrow:'My course', title:c.name.replace(/(\S+)$/,'<em>$1</em>'),
      sub:`${examOf(c.exam).name} · ${c.level} · ${c.weeks} weeks with ${t.name}. You are in week ${weekNo}.`,
      actions:`<button class="btn btn-g btn-sm" onclick="lv.view='home';navTo('live')"><i class="fa-solid fa-arrow-left"></i> Timetable</button>
        <button class="btn btn-p btn-sm" onclick="lv.view='recordings';navTo('live')"><i class="fa-solid fa-film"></i> Recordings</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Week', weekNo + ' / ' + c.weeks, pct(weekNo, c.weeks) + '% through the course', 'leaf', 'fa-calendar-week')}
      ${statCard('Contact hours', (() => { const [a,b] = c.time.split('–'); return c.days.length * ((+b.slice(0,2)) - (+a.slice(0,2))) * c.weeks + 'h'; })(), c.days.length + ' lessons a week', 'sky', 'fa-clock')}
      ${statCard('Attendance', (() => { const n = Object.keys(lvState().attended).length; return n; })(), 'classes joined', 'amb', 'fa-user-check')}
      ${statCard('Classmates', myClassmates().length, 'of ' + c.cap + ' places', '', 'fa-users')}
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Week by week</h3><p>What each week covers and which School material it uses</p></div></div>
      <div class="card-bd" style="display:grid;gap:11px">
        ${syl.map(u => {
          const now = u.wk === weekNo, past = u.wk < weekNo;
          return `<div style="border:1.5px solid ${now?'var(--leaf-500)':'var(--line)'};border-radius:14px;padding:16px 18px;background:${now?'var(--leaf-50)':past?'var(--paper)':'var(--surface)'};${past?'opacity:.78':''}">
            <div style="display:flex;gap:13px;align-items:flex-start;flex-wrap:wrap">
              <div style="width:38px;height:38px;flex:0 0 38px;border-radius:11px;background:${past?'var(--ok)':now?'var(--leaf-700)':'var(--paper-2)'};color:${past||now?'#fff':'var(--ink-4)'};display:grid;place-items:center;font-family:var(--mono);font-size:13px;font-weight:800">
                ${past?'<i class="fa-solid fa-check"></i>':u.wk}</div>
              <div style="flex:1;min-width:200px">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px">
                  <b style="font-size:15px">${u.focus}</b>
                  ${now?'<span class="tag leaf">This week</span>':past?'<span class="tag ok">Complete</span>':''}
                </div>
                <div style="font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-bottom:11px">${u.aim}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  ${u.parts.map(pid=>`<button class="pill" style="padding:4px 11px;font-size:11px" onclick="lbs.part='${pid}';lbs.view='part';navTo('library')">${partOf(pid).name}</button>`).join('')}
                </div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

/* ═══ RECORDINGS ═══ */
function lvRecordingsHTML(){
  const c = myCohort();
  const recs = recordingsFor(c);
  return `
    ${phead({ eyebrow:'My course', title:`Class <em>recordings</em>`,
      sub:'Every class is recorded with the chat transcript and your own notes attached. Missed one, or want to hear an explanation again — it is all here.',
      actions:`<button class="btn btn-g btn-sm" onclick="lv.view='home';navTo('live')"><i class="fa-solid fa-arrow-left"></i> Timetable</button>` })}
    ${recs.length ? `<div class="grid g2">
      ${recs.map(x => {
        const k = CLS_KINDS[x.kind], t = teacherOf(x.teacher), d = clsStart(x);
        const notes = (lvState().notes[x.id] || '').trim();
        return `<div class="card" style="overflow:hidden"><div class="card-bd" style="padding:0">
          <div style="height:96px;background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 62%);position:relative;display:grid;place-items:center;cursor:pointer" onclick="lvJoin('${x.id}')">
            <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.32);display:grid;place-items:center;color:#fff;font-size:14px"><i class="fa-solid fa-play" style="margin-left:3px"></i></div>
            <span style="position:absolute;bottom:9px;right:11px;font-family:var(--mono);font-size:10.5px;color:#fff;background:rgba(0,0,0,.42);padding:2px 8px;border-radius:20px">${clsDur(x)} min</span>
            ${lvAttended(x.id)?'<span style="position:absolute;top:9px;left:11px;z-index:2" class="tag ok">Attended</span>':'<span style="position:absolute;top:9px;left:11px;z-index:2" class="tag amb">Missed</span>'}
          </div>
          <div style="padding:15px 18px">
            <div style="display:flex;gap:6px;margin-bottom:9px;flex-wrap:wrap">
              <span class="tag ${k.tone==='leaf'?'leaf':k.tone}">${k.name}</span><span class="tag">Week ${x.week}</span>
              ${notes?'<span class="tag sky"><i class="fa-solid fa-note-sticky"></i> Notes</span>':''}</div>
            <b style="font-size:14.5px;font-weight:700;display:block;line-height:1.28;margin-bottom:5px">${x.title}</b>
            <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4);margin-bottom:12px">${d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} · ${x.from} · ${t.name}</div>
            <button class="btn btn-p btn-sm btn-blk" onclick="lvJoin('${x.id}')"><i class="fa-solid fa-play"></i> Watch the recording</button>
          </div>
        </div></div>`;
      }).join('')}
    </div>` : `<div class="empty"><i class="fa-solid fa-film"></i><b>No recordings yet</b><span>Once your first class has finished it appears here with the chat and your notes.</span></div>`}`;
}

/* ═══ STAFF: HOST A CLASS & TAKE THE REGISTER ═══ */
function sec_facultylive(){
  if (lv.reg) return facRegisterHTML();
  const t = me(), cos = myCohorts();
  const dates = weekDates(lv.wk);
  const all = cos.flatMap(c => classesFor(c, lv.wk).filter(x => x.cohort === c.id));
  const nowLive = all.filter(x => clsState(x) === 'live' || clsState(x) === 'soon');
  const next = all.find(x => clsState(x) !== 'ended');
  return `
    ${phead({ eyebrow:'Faculty · Live teaching', title: nowLive.length ? `You are <em>on air</em>` : `Live <em>classes</em>`,
      sub:`${cos.length} cohort${cos.length===1?'':'s'} · ${all.length} session${all.length===1?'':'s'} this week. Start the room, take the register, publish the recording.`,
      actions:`<button class="btn btn-g btn-sm" onclick="navTo('facultyplan')"><i class="fa-solid fa-calendar-week"></i> Full planner</button>
        ${next?`<button class="btn btn-p" onclick="facHost('${next.id}')"><i class="fa-solid fa-video"></i> ${clsState(next)==='live'?'Enter the room':'Open next class'}</button>`:''}` })}

    ${nowLive.map(x => {
      const co = cohortOf(x.cohort);
      return `<div class="card mb2" style="border:none;background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 60%);color:#fff">
        <div class="card-bd" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:24px 26px">
          <div style="width:52px;height:52px;flex:0 0 52px;border-radius:16px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);display:grid;place-items:center;font-size:20px"><i class="fa-solid ${CLS_KINDS[x.kind].ic}"></i></div>
          <div style="flex:1;min-width:220px">
            <span style="display:inline-flex;align-items:center;gap:7px;background:var(--coral);border-radius:30px;padding:4px 11px;font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase;font-weight:800;margin-bottom:7px">
              <span style="width:6px;height:6px;border-radius:50%;background:#fff;animation:pulse 1.3s infinite"></span>${clsState(x)==='live'?'Live now':'Starts in '+Math.max(0,clsMinsTo(x))+' min'}</span>
            <b style="font-family:var(--display);font-size:20px;font-weight:700;display:block;letter-spacing:-.4px">${x.title}</b>
            <span style="font-size:12.5px;color:rgba(255,255,255,.7)">${co.name} · ${x.from}–${x.to} · ${co.enrolled} students</span>
          </div>
          <div style="display:flex;gap:9px;flex-wrap:wrap">
            <button class="btn btn-lg" style="background:#fff;color:var(--leaf-800)" onclick="facHost('${x.id}')"><i class="fa-solid fa-video"></i> Enter the room</button>
            <button class="btn btn-ghost btn-lg" style="border-color:rgba(255,255,255,.32);color:#fff" onclick="meetSetupModal('${x.id}')"><i class="fa-solid fa-link"></i> ${typeof meetLinkFor==='function'&&meetLinkFor(x)?'Link set':'Add link'}</button>
          </div>
        </div></div>`;
    }).join('')}

    <div class="card mb2">
      <div class="card-hd">
        <button class="btn btn-g btn-sm" onclick="lv.wk--;navTo('facultylive')"><i class="fa-solid fa-chevron-left"></i></button>
        <div style="flex:1;text-align:center"><h3>${tutDate(dates[0]).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${tutDate(dates[6]).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</h3>
          <p>${lv.wk===0?'This week':lv.wk>0?'In '+lv.wk+' week'+(lv.wk===1?'':'s'):Math.abs(lv.wk)+' week'+(lv.wk===-1?'':'s')+' ago'}</p></div>
        <button class="btn btn-g btn-sm" onclick="lv.wk++;navTo('facultylive')"><i class="fa-solid fa-chevron-right"></i></button>
        ${lv.wk!==0?`<button class="btn btn-g btn-sm" onclick="lv.wk=0;navTo('facultylive')">This week</button>`:''}
      </div>
      <div class="card-bd flush">
        ${all.length ? all.map(x => {
          const st = clsState(x), k = CLS_KINDS[x.kind], co = cohortOf(x.cohort), d = clsStart(x);
          const reg = (B.register || {})[x.id];
          return `<div class="row">
            <div style="text-align:center;flex:0 0 44px"><div style="font-family:var(--display);font-size:17px;font-weight:700;line-height:1">${d.getDate()}</div>
              <div style="font-size:8.5px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${d.toLocaleDateString('en-GB',{weekday:'short'})}</div></div>
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);flex:0 0 74px">${x.from}</div>
            <div class="ic ${k.tone==='leaf'?'':k.tone}"><i class="fa-solid ${k.ic}"></i></div>
            <div class="tx"><b>${x.title}</b><span>${co.name} · Week ${x.week} · ${co.enrolled} students${reg?' · register taken ('+Object.values(reg).filter(Boolean).length+' present)':''}</span></div>
            ${st==='live'||st==='soon'?'<span class="tag cor">Live</span>':st==='ended'?'<span class="tag">Ended</span>':''}
            <button class="icobtn" style="width:30px;height:30px;font-size:11px;${typeof meetLinkFor==='function'&&meetLinkFor(x)?'color:var(--leaf-700);border-color:var(--leaf-400)':''}" title="${typeof meetLinkFor==='function'&&meetLinkFor(x)?'Joining link set — click to change':'Add a joining link'}" onclick="meetSetupModal('${x.id}')"><i class="fa-solid fa-link"></i></button>
            <button class="btn btn-g btn-sm" onclick="lv.reg='${x.id}';navTo('facultylive')"><i class="fa-solid fa-clipboard-user"></i> Register</button>
            <button class="btn ${st==='live'||st==='soon'?'btn-p':'btn-g'} btn-sm" onclick="facHost('${x.id}')"><i class="fa-solid fa-${st==='ended'?'film':'video'}"></i> ${st==='ended'?'Recording':'Room'}</button>
          </div>`;
        }).join('') : `<div style="padding:26px;text-align:center;font-size:12.5px;color:var(--ink-4)">No classes scheduled this week.</div>`}
      </div>
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>My cohorts</h3><p>Syllabus position and attendance</p></div></div>
        <div class="card-bd flush">
          ${cos.map(c => {
            const weekNo = Math.max(1, Math.min(c.weeks, Math.floor((new Date() - new Date(c.start + 'T00:00:00')) / 604800000) + 1));
            const u = syllabusFor(c)[Math.min(syllabusFor(c).length-1, weekNo-1)];
            return `<div class="row" style="align-items:flex-start">
              <div class="ic"><i class="fa-solid fa-chalkboard"></i></div>
              <div class="tx"><b>${c.name}</b><span>Week ${weekNo} of ${c.weeks} · ${u.focus}</span>
                <div class="bar thin" style="margin-top:7px;max-width:210px"><i style="width:${pct(weekNo,c.weeks)}%"></i></div></div>
              <button class="btn btn-g btn-sm" onclick="fac.cohort='${c.id}';fac.view='cohort';navTo('roster')">Roster</button></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Publish a recording</h3><p>Students see it in their course immediately</p></div></div>
        <div class="card-bd">
          <div style="font-size:12.5px;color:var(--ink-3);line-height:1.65;margin-bottom:14px">Every ended class already shows as a recording for the cohort. Upload the video file to replace the placeholder, or attach a worksheet to it.</div>
          <button class="btn btn-p btn-blk" onclick="navTo('content');cmUpload('video')"><i class="fa-solid fa-cloud-arrow-up"></i> Upload class video</button>
          <button class="btn btn-g btn-blk" style="margin-top:8px" onclick="navTo('content');cmUpload('pdf')"><i class="fa-solid fa-file-pdf"></i> Attach a worksheet</button>
        </div>
      </div>
    </div>`;
}

function facHost(id){
  const c = (() => {
    for (const co of myCohorts()){
      for (let w = -8; w <= 8; w++){ const hit = classesFor(co, w).find(x => x.id === id); if (hit) return hit; }
    }
    return null;
  })();
  if (!c){ toast('Class not found'); return; }
  lv.reg = id; navTo('facultylive');
}

function facRegisterHTML(){
  const id = lv.reg;
  const c = (() => {
    for (const co of myCohorts()){
      for (let w = -8; w <= 8; w++){ const hit = classesFor(co, w).find(x => x.id === id); if (hit) return hit; }
    }
    return null;
  })();
  if (!c){ lv.reg = null; return sec_facultylive(); }
  const co = cohortOf(c.cohort), roster = students().filter(s => s.cohort === co.id);
  B.register = B.register || {};
  const reg = B.register[id] = B.register[id] || {};
  const present = Object.values(reg).filter(Boolean).length;
  return `
    ${phead({ eyebrow:`${CLS_KINDS[c.kind].name} · Week ${c.week}`, title:c.title.replace(/(\S+)$/,'<em>$1</em>'),
      sub:`${co.name} · ${clsStart(c).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · ${c.from}–${c.to} · ${c.room}`,
      actions:`<button class="btn btn-g btn-sm" onclick="lv.reg=null;navTo('facultylive')"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button class="btn btn-g btn-sm" onclick="facRegAll(true)"><i class="fa-solid fa-check-double"></i> All present</button>
        <button class="btn btn-p btn-sm" onclick="facRegSave()"><i class="fa-solid fa-floppy-disk"></i> Save register</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Present', present + ' / ' + roster.length, pct(present, roster.length) + '% attendance', present >= roster.length * 0.8 ? 'leaf' : 'amb', 'fa-user-check')}
      ${statCard('Absent', roster.length - present, 'Followed up automatically', 'cor', 'fa-user-xmark')}
      ${statCard('Lesson aim', 'Week ' + c.week, c.parts.map(p=>partOf(p).name.replace(/^(Listening|Reading|Writing|Speaking) /,'')).join(' · '), '', 'fa-bullseye')}
      ${statCard('Duration', clsDur(c) + ' min', c.from + '–' + c.to, 'sky', 'fa-clock')}
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Register</h3><p>Tap each student. Absences trigger a follow-up email.</p></div></div>
        <div class="card-bd flush">
          ${roster.map(s => {
            const on = !!reg[s.id];
            return `<div class="row" style="background:${on?'var(--ok-soft)':'transparent'};cursor:pointer" onclick="facRegToggle('${s.id}')">
              <div class="check ${on?'on':''}"><i class="fa-solid fa-check"></i></div>
              <div style="width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:${on?'var(--ok)':'var(--paper-2)'};color:${on?'#fff':'var(--ink-3)'};display:grid;place-items:center;font-size:10px;font-weight:800">${initials(s.name)}</div>
              <div class="tx"><b>${s.name}</b><span>Band ${bandLabel(s.band)} → ${bandLabel(s.target)} · ${s.lastActive===0?'active today':s.lastActive+'d since last activity'}</span></div>
              ${s.risk==='at-risk'?'<span class="tag cor">At risk</span>':''}
              <span class="tag ${on?'ok':''}">${on?'Present':'Absent'}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Lesson aim</h3></div></div>
          <div class="card-bd">
            <div style="font-size:13.5px;color:var(--ink-2);line-height:1.7;margin-bottom:14px">${c.aim}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${c.parts.map(p=>`<span class="tag leaf">${partOf(p).name}</span>`).join('')}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Class notes</h3><p>Published to the cohort with the recording</p></div></div>
          <div class="card-bd">
            <textarea rows="7" placeholder="What you covered, what to revise, what the homework is." style="border:1.5px solid var(--line-2);border-radius:12px;padding:12px;font-family:inherit;font-size:13px;line-height:1.7;width:100%;background:var(--surface);color:var(--ink)"
              oninput="B.classNotes=B.classNotes||{};B.classNotes['${id}']=this.value;save()">${esc((B.classNotes||{})[id]||'')}</textarea>
            <button class="btn btn-p btn-blk" style="margin-top:10px" onclick="toast('Notes published to ' + ${roster.length} + ' students','fa-paper-plane')"><i class="fa-solid fa-paper-plane"></i> Publish to the cohort</button>
          </div>
        </div>
      </div>
    </div>`;
}
function facRegToggle(sid){
  B.register[lv.reg][sid] = !B.register[lv.reg][sid];
  save(); navTo('facultylive');
}
function facRegAll(v){
  const c = (() => { for (const co of myCohorts()){ for (let w = -8; w <= 8; w++){ const h = classesFor(co, w).find(x => x.id === lv.reg); if (h) return h; } } return null; })();
  if (!c) return;
  students().filter(s => s.cohort === c.cohort).forEach(s => B.register[lv.reg][s.id] = v);
  save(); navTo('facultylive');
}
function facRegSave(){
  const n = Object.values(B.register[lv.reg] || {}).filter(Boolean).length;
  toast('Register saved · ' + n + ' present', 'fa-clipboard-check');
  lv.reg = null; navTo('facultylive');
}

/* ── dashboard strip for students ── */
function lvDashCard(){
  const c = myCohort();
  const upcoming = [];
  for (let w = 0; w <= 1; w++) classesFor(c, w).forEach(x => { if (clsState(x) !== 'ended') upcoming.push(x); });
  const next = upcoming[0];
  if (!next) return '';
  const st = clsState(next), t = teacherOf(next.teacher), d = clsStart(next);
  const live = st === 'live' || st === 'soon';
  return `<div class="card mb2" style="${live?'border:none;background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 60%);color:#fff':'border-color:var(--leaf-500)'}">
    <div class="card-bd" style="display:flex;gap:15px;align-items:center;flex-wrap:wrap">
      ${live ? `<div style="width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);display:grid;place-items:center;font-size:17px"><i class="fa-solid ${CLS_KINDS[next.kind].ic}"></i></div>`
        : `<div style="text-align:center;flex:0 0 50px"><div style="font-family:var(--display);font-size:20px;font-weight:700;line-height:1">${d.getDate()}</div>
            <div style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>`}
      <div style="flex:1;min-width:200px">
        <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;margin-bottom:4px;color:${live?'var(--leaf-300)':'var(--leaf-700)'}">
          ${st==='live'?'● Live now':st==='soon'?'Starting in '+Math.max(0,clsMinsTo(next))+' minutes':'Next live class · '+d.toLocaleDateString('en-GB',{weekday:'long'})}</div>
        <b style="font-size:15px;display:block">${next.title}</b>
        <span style="font-family:var(--mono);font-size:11px;color:${live?'rgba(255,255,255,.65)':'var(--ink-4)'}">${next.from}–${next.to} · ${t.name} · ${next.room}</span></div>
      <button class="btn ${live?'':'btn-p'} btn-sm" style="${live?'background:#fff;color:var(--leaf-800)':''}" onclick="lvJoin('${next.id}')"><i class="fa-solid fa-video"></i> ${live?'Join the class':'Open the room'}</button>
      <button class="btn ${live?'btn-line':'btn-g'} btn-sm" onclick="navTo('live')">Timetable</button>
    </div></div>`;
}
