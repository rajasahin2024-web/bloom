/* ═══════════════════════════════════════════════════════════════
   FEATURE 4 · DOUBT SESSION BOOKING
   Inline booking (dashboard + full section), live slot availability,
   confirmation, email + reminders, calendar (.ics) export.
   Depends on: TOPICS, SUBJECTS, pageHead(), showToast(), getCurrentStudent()
═══════════════════════════════════════════════════════════════ */

const DOUBT_TUTORS = [
  { id:'em', name:'Prof. E. Marcucci', role:'Biology & Anatomy lead',   subj:['Biology','Anatomy'],            init:'EM' },
  { id:'hk', name:'Dr. H. Karim',      role:'Chemistry faculty',        subj:['Chemistry'],                    init:'HK' },
  { id:'sb', name:'Prof. S. Bianchi',  role:'Physics faculty',          subj:['Physics'],                      init:'SB' },
  { id:'ar', name:'Prof. A. Russo',    role:'English & reading',        subj:['English'],                      init:'AR' },
  { id:'lh', name:'Dr. L. Hadid',      role:'Logic & reasoning',        subj:['Logic'],                        init:'LH' },
  { id:'mf', name:'Dr. M. Ferrero',    role:'Biology · evening slots',  subj:['Biology','Chemistry','Anatomy'], init:'MF' },
  { id:'gr', name:'Giulia Rossi',      role:'Mentor · Med Y3, Pavia',   subj:['Biology','Chemistry','Physics','Logic','English','Anatomy'], init:'GR' },
];
const DOUBT_TIMES = ['09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00'];
const DOUBT_MODES = { video:{ label:'Video call', ic:'fa-video' }, chat:{ label:'Text chat', ic:'fa-comments' }, campus:{ label:'On campus · Padova', ic:'fa-location-dot' } };

let dbState = { subj:'Biology', topic:'', date:null, time:null, mode:'video', note:'', confirmed:null, remind:{ h24:true, h1:true } };

/* ── storage ── */
function dbBookings(){ try { return JSON.parse(localStorage.getItem('fma_doubts') || '[]'); } catch(e){ return []; } }
function dbSaveBookings(b){ try { localStorage.setItem('fma_doubts', JSON.stringify(b)); } catch(e){} }
function dbISO(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function dbUpcoming(){
  const now = dbISO(new Date());
  return dbBookings().filter(b => b.status !== 'cancelled' && b.date >= now).sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/* ── availability (deterministic per date+time) ── */
function dbHash(s){ let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000; return h; }
function dbTutorsFor(subj){ return DOUBT_TUTORS.filter(t => t.subj.includes(subj)); }
function dbSlot(date, time, subj){
  const h = dbHash(date + time + subj);
  const pool = dbTutorsFor(subj);
  const taken = h % 10 < 3 || new Date(date + 'T' + time) < new Date();
  const booked = dbBookings().some(b => b.date === date && b.time === time && b.status !== 'cancelled');
  return { time, tutor: pool[h % pool.length], taken: taken || booked };
}
function dbDaySlots(date, subj){ return DOUBT_TIMES.map(t => dbSlot(date, t, subj)); }
function dbDates(n){
  const out = [];
  for (let i = 0; i < n; i++){
    const d = new Date(); d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue; // no Sunday sessions
    out.push(dbISO(d));
  }
  return out;
}
function dbFmtDate(iso){ return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }); }

/* ── the reusable booking widget ── */
function doubtWidget(prefix, compact){
  return `<div data-dbw="${prefix}" data-compact="${compact ? 1 : 0}">${dbWidgetHTML(prefix, compact)}</div>`;
}
function dbPaintAll(){
  document.querySelectorAll('[data-dbw]').forEach(el => { el.innerHTML = dbWidgetHTML(el.dataset.dbw, el.dataset.compact === '1'); });
}

function dbWidgetHTML(p, compact){
  if (dbState.confirmed) return dbConfirmHTML(dbState.confirmed, compact);
  const dates = dbDates(compact ? 8 : 15);
  if (!dbState.date || !dates.includes(dbState.date)) dbState.date = dates[0];
  const slots = dbDaySlots(dbState.date, dbState.subj);
  const free = slots.filter(s => !s.taken).length;
  const topics = TOPICS.filter(t => t.subj === dbState.subj);
  return `
    <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:16px;">
      <div class="fg" style="flex:1; min-width:170px; margin:0;">
        <label>Subject</label>
        <select onchange="dbState.subj=this.value; dbState.topic=''; dbState.time=null; dbPaintAll();">
          ${SUBJECTS.map(s => `<option ${dbState.subj===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="fg" style="flex:1; min-width:190px; margin:0;">
        <label>Topic <span style="text-transform:none; letter-spacing:0; font-weight:500; color:var(--ink-4);">(optional)</span></label>
        <select onchange="dbState.topic=this.value; dbPaintAll();">
          <option value="">Any topic in ${dbState.subj}</option>
          ${topics.map(t => `<option value="${t.name}" ${dbState.topic===t.name?'selected':''}>${t.name}</option>`).join('')}
        </select>
      </div>
      ${compact ? '' : `<div style="flex:0 0 auto;"><div style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:7px;">Format</div>
      <div class="st-seg">${Object.entries(DOUBT_MODES).map(([k,v]) => `<button class="${dbState.mode===k?'on':''}" onclick="dbState.mode='${k}'; dbPaintAll()"><i class="fa-solid ${v.ic}" style="margin-right:5px;"></i>${v.label}</button>`).join('')}</div></div>`}
    </div>

    <div class="db-dates">
      ${dates.map(d => {
        const dd = new Date(d + 'T00:00:00');
        const n = dbDaySlots(d, dbState.subj).filter(s => !s.taken).length;
        return `<div class="db-date ${dbState.date===d?'on':''} ${n===0?'full':''}" onclick="${n?`dbState.date='${d}'; dbState.time=null; dbPaintAll()`:''}">
          <div class="dw">${dd.toLocaleDateString('en-GB',{weekday:'short'})}</div>
          <div class="dd">${dd.getDate()}</div>
          <div class="dm">${dd.toLocaleDateString('en-GB',{month:'short'})}</div>
          <div class="av">${n ? n + ' free' : 'full'}</div>
        </div>`;
      }).join('')}
    </div>

    <div style="display:flex; align-items:center; gap:10px; margin:14px 0 11px;">
      <div style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700;">${dbFmtDate(dbState.date)}</div>
      <div style="flex:1; height:1px; background:var(--rule);"></div>
      <div style="font-family:var(--mono); font-size:11px; color:${free?'var(--gold)':'var(--err)'};">${free} of ${slots.length} slots free</div>
    </div>

    <div class="db-slots">
      ${slots.map(s => `<div class="db-slot ${s.taken?'taken':''} ${dbState.time===s.time?'on':''}" onclick="${s.taken?'':`dbState.time='${s.time}'; dbPaintAll()`}">
        <div class="tm">${s.time}<span style="font-family:var(--sans); font-size:10.5px; font-weight:500; color:var(--ink-4); margin-left:6px;">45 min</span></div>
        <div class="tu">${s.taken ? 'Booked' : s.tutor.name}</div>
      </div>`).join('')}
    </div>

    ${dbState.time ? `
    <div style="margin-top:18px; padding-top:18px; border-top:1px solid var(--rule);">
      <div class="fg" style="margin:0 0 14px;">
        <label>What would you like to go through?</label>
        <textarea rows="${compact?2:3}" placeholder="e.g. I keep getting Punnett square probability questions wrong — especially with two traits." oninput="dbState.note=this.value;">${dbState.note}</textarea>
      </div>
      ${compact ? `<div class="st-seg" style="margin-bottom:14px;">${Object.entries(DOUBT_MODES).map(([k,v]) => `<button class="${dbState.mode===k?'on':''}" onclick="dbState.mode='${k}'; dbPaintAll()"><i class="fa-solid ${v.ic}" style="margin-right:5px;"></i>${v.label}</button>`).join('')}</div>` : ''}
      <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
        <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--ink-2); cursor:pointer;"><input type="checkbox" ${dbState.remind.h24?'checked':''} onchange="dbState.remind.h24=this.checked;"> Remind me 24 h before</label>
        <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--ink-2); cursor:pointer;"><input type="checkbox" ${dbState.remind.h1?'checked':''} onchange="dbState.remind.h1=this.checked;"> Remind me 1 h before</label>
        <button class="btn btn-primary" style="margin-left:auto;" onclick="dbConfirmBooking()"><i class="fa-solid fa-check"></i> Confirm ${dbState.time} session</button>
      </div>
      <div style="font-size:11.5px; color:var(--ink-4); margin-top:10px;">Confirmation is emailed instantly · free cancellation up to 3 h before.</div>
    </div>` : `<div style="margin-top:16px; font-size:12.5px; color:var(--ink-4); text-align:center; padding:12px; background:var(--paper); border-radius:8px;">Pick a time slot above to continue.</div>`}
  `;
}

function dbConfirmHTML(b, compact){
  const tutor = DOUBT_TUTORS.find(t => t.id === b.tutorId) || { name:b.tutor, init:'FM', role:'FMA faculty' };
  return `<div class="db-conf">
    <div class="tick"><i class="fa-solid fa-check"></i></div>
    <h3>Your doubt session is booked</h3>
    <div class="ref">BOOKING ${b.ref}</div>
    <div class="rows">
      <div class="r"><div class="l">When</div><div class="v">${dbFmtDate(b.date)}<br>${b.time} – ${dbEnd(b.time)} CET</div></div>
      <div class="r"><div class="l">With</div><div class="v">${tutor.name}<br><span style="font-weight:400; color:rgba(255,255,255,.55); font-size:12px;">${tutor.role}</span></div></div>
      <div class="r"><div class="l">Topic</div><div class="v">${b.subj}${b.topic?'<br><span style="font-weight:400; color:rgba(255,255,255,.55); font-size:12px;">'+b.topic+'</span>':''}</div></div>
      <div class="r"><div class="l">Format</div><div class="v">${DOUBT_MODES[b.mode].label}</div></div>
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <button class="btn btn-gold" onclick="dbDownloadICS('${b.ref}')"><i class="fa-regular fa-calendar-plus"></i> Add to calendar</button>
      ${b.mode === 'video' ? `<button class="btn btn-ghost" style="background:rgba(255,255,255,.1); color:#fff; border-color:rgba(255,255,255,.25);" onclick="showToast('Meeting link opens 5 minutes before the session')"><i class="fa-solid fa-video"></i> Session link</button>` : ''}
      <button class="btn btn-ghost" style="background:rgba(255,255,255,.1); color:#fff; border-color:rgba(255,255,255,.25);" onclick="dbNewBooking()"><i class="fa-solid fa-plus"></i> Book another</button>
    </div>
    <div style="margin-top:18px; font-size:12px; color:rgba(255,255,255,.6);">
      <i class="fa-solid fa-envelope-circle-check" style="color:var(--gold-soft); margin-right:6px;"></i>Confirmation sent to <b style="color:#fff;">${b.email}</b>${b.remind.h24||b.remind.h1?` · reminders ${[b.remind.h24?'24 h':'',b.remind.h1?'1 h':''].filter(Boolean).join(' and ')} before`:''}
    </div>
  </div>`;
}

function dbEnd(time){
  const [h,m] = time.split(':').map(Number);
  const t = h * 60 + m + 45;
  return String(Math.floor(t/60)).padStart(2,'0') + ':' + String(t%60).padStart(2,'0');
}

function dbConfirmBooking(){
  if (!dbState.date || !dbState.time) return;
  const slot = dbSlot(dbState.date, dbState.time, dbState.subj);
  const s = (typeof getCurrentStudent === 'function' && state.user.roleKey === 'student') ? getCurrentStudent() : null;
  const b = {
    ref: 'DS-' + Date.now().toString(36).toUpperCase().slice(-6),
    date: dbState.date, time: dbState.time, subj: dbState.subj, topic: dbState.topic,
    tutor: slot.tutor.name, tutorId: slot.tutor.id, mode: dbState.mode, note: dbState.note,
    remind: { ...dbState.remind }, status: 'confirmed',
    student: s ? s.name : (state.user?.name || 'FMA student'),
    email: s ? s.email : (state.user?.email || 'student@fmacademy.eu'),
    created: new Date().toISOString(),
  };
  const all = dbBookings(); all.unshift(b); dbSaveBookings(all);
  dbState.confirmed = b;
  dbPaintAll();
  showToast('Session booked · confirmation emailed to ' + b.email);
  if (typeof pushStudentNotif === 'function' && s) pushStudentNotif(s.id, { type:'check', title:'Doubt session confirmed — ' + b.subj, body: dbFmtDate(b.date) + ' at ' + b.time + ' with ' + b.tutor + '. Booking ' + b.ref + '.' });
  if (typeof pushActivity === 'function') pushActivity({ type:'check', actor:(state.user?.role||'Student') + ' · ' + (state.user?.name||''), text:`Booked a <b>${b.subj}</b> doubt session with ${b.tutor} on ${b.date} at ${b.time}` });
  if (state.section === 'doubts') setTimeout(() => navTo('doubts'), 60);
}
function dbNewBooking(){ dbState.confirmed = null; dbState.time = null; dbState.note = ''; dbPaintAll(); }

function dbDownloadICS(ref){
  const b = dbBookings().find(x => x.ref === ref); if (!b) return;
  const dt = b.date.replace(/-/g,'') + 'T' + b.time.replace(':','') + '00';
  const end = b.date.replace(/-/g,'') + 'T' + dbEnd(b.time).replace(':','') + '00';
  const alarms = [];
  if (b.remind.h24) alarms.push('BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:FMA doubt session tomorrow\r\nEND:VALARM');
  if (b.remind.h1) alarms.push('BEGIN:VALARM\r\nTRIGGER:-PT1H\r\nACTION:DISPLAY\r\nDESCRIPTION:FMA doubt session in 1 hour\r\nEND:VALARM');
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Future MedsAcademy//Doubt Sessions//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    'UID:' + b.ref + '@fmacademy.eu',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z',
    'DTSTART:' + dt, 'DTEND:' + end,
    'SUMMARY:FMA doubt session — ' + b.subj + (b.topic ? ' (' + b.topic + ')' : ''),
    'DESCRIPTION:With ' + b.tutor + '. ' + DOUBT_MODES[b.mode].label + '. Booking ' + b.ref + '.' + (b.note ? ' Notes: ' + b.note.replace(/\r?\n/g,' ') : ''),
    'LOCATION:' + (b.mode === 'campus' ? 'Future MedsAcademy, Padova' : 'Online'),
    ...alarms, 'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type:'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'FMA_Doubt_Session_' + b.ref + '.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast('Calendar invite downloaded');
}

function dbCancel(ref){
  if (!confirm('Cancel this doubt session? The slot is released immediately.')) return;
  const all = dbBookings(); const b = all.find(x => x.ref === ref); if (!b) return;
  b.status = 'cancelled'; dbSaveBookings(all);
  if (dbState.confirmed && dbState.confirmed.ref === ref) dbState.confirmed = null;
  navTo(state.section === 'doubts' ? 'doubts' : state.section);
  showToast('Session ' + ref + ' cancelled');
}
function dbReschedule(ref){
  const b = dbBookings().find(x => x.ref === ref); if (!b) return;
  dbState.subj = b.subj; dbState.topic = b.topic; dbState.date = null; dbState.time = null; dbState.mode = b.mode; dbState.note = b.note; dbState.confirmed = null;
  dbCancelSilent(ref);
  navTo('doubts');
  showToast('Pick a new slot for ' + b.subj);
}
function dbCancelSilent(ref){ const all = dbBookings(); const b = all.find(x => x.ref === ref); if (b){ b.status = 'cancelled'; dbSaveBookings(all); } }

/* ── full section ── */
function sec_doubts(){
  const up = dbUpcoming();
  const past = dbBookings().filter(b => !up.includes(b));
  const isStudent = state.user.roleKey === 'student';
  return `
    ${pageHead({
      eyebrow: 'One-to-one support',
      title: `Doubt <em>sessions</em>`,
      sub: 'Book 45 minutes with the faculty member who teaches the topic. Same-day slots are usually available.',
      actions: up.length ? `<button class="btn btn-ghost btn-sm" onclick="dbDownloadICS('${up[0].ref}')"><i class="fa-regular fa-calendar-plus"></i> Add next session to calendar</button>` : ''
    })}

    ${up.length ? `
    <div class="card mb-5">
      <div class="card-hd"><div><div class="card-title">Upcoming sessions</div><div class="card-sub">${up.length} booked · you will get an email reminder before each one</div></div></div>
      <div class="card-body">
        ${up.map(b => {
          const t = DOUBT_TUTORS.find(x => x.id === b.tutorId) || { init:'FM', name:b.tutor, role:'' };
          const d = new Date(b.date + 'T00:00:00');
          return `<div class="db-book">
            <div class="when"><div class="d">${d.getDate()}</div><div class="m">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
            <div class="db-tutor">${t.init}</div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:14px; font-weight:700; color:var(--ink);">${b.subj}${b.topic ? ' · ' + b.topic : ''}</div>
              <div style="font-family:var(--mono); font-size:11px; color:var(--ink-4); margin-top:3px;">${b.time}–${dbEnd(b.time)} · ${t.name} · ${DOUBT_MODES[b.mode].label} · ${b.ref}</div>
              ${b.note ? `<div style="font-size:12px; color:var(--ink-3); margin-top:6px; font-style:italic;">“${b.note}”</div>` : ''}
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              ${b.mode === 'video' ? `<button class="btn btn-primary btn-sm" onclick="showToast('The meeting link activates 5 minutes before the session')"><i class="fa-solid fa-video"></i> Join</button>` : ''}
              <button class="ico-btn" title="Add to calendar" onclick="dbDownloadICS('${b.ref}')"><i class="fa-regular fa-calendar-plus"></i></button>
              <button class="ico-btn" title="Reschedule" onclick="dbReschedule('${b.ref}')"><i class="fa-solid fa-rotate"></i></button>
              <button class="ico-btn" title="Cancel" onclick="dbCancel('${b.ref}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="card mb-5">
      <div class="card-hd"><div><div class="card-title">Book a session</div><div class="card-sub">Choose subject, day and time — availability updates live</div></div></div>
      <div class="card-body">${doubtWidget('sec', false)}</div>
    </div>

    <div class="grid-wide">
      <div class="card">
        <div class="card-hd"><div><div class="card-title">Who you will meet</div><div class="card-sub">Faculty and senior mentors taking doubt sessions this week</div></div></div>
        <div class="card-body" style="padding:0;">
          ${DOUBT_TUTORS.map(t => `<div style="display:flex; gap:13px; align-items:center; padding:13px 22px; border-bottom:1px solid var(--rule);">
            <div class="db-tutor">${t.init}</div>
            <div style="flex:1; min-width:0;"><div style="font-size:13.5px; font-weight:600; color:var(--ink);">${t.name}</div><div style="font-size:11.5px; color:var(--ink-4); margin-top:2px;">${t.role}</div></div>
            <div style="display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end; max-width:150px;">${t.subj.slice(0,3).map(s => `<span class="tag tag-inactive" style="font-size:9px;">${s}</span>`).join('')}${t.subj.length>3?`<span class="tag tag-inactive" style="font-size:9px;">+${t.subj.length-3}</span>`:''}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div><div class="card-title">How it works</div></div></div>
        <div class="card-body">
          <div class="feed">
            ${[
              ['Pick a slot','Availability is live — a slot disappears the moment another student takes it.'],
              ['Tell us the problem','Your note goes to the tutor beforehand so the 45 minutes are spent solving, not explaining.'],
              ['Confirmation & reminders','An email lands immediately, plus reminders 24 h and 1 h before. Add it to your own calendar in one click.'],
              ['Join or come in','Video link, chat thread or the Padova campus — your choice at booking.'],
            ].map(([t,s],i) => `<div class="feed-item"><div class="feed-dot ${i===0?'gold':''}"></div><div class="feed-body"><p><b>${t}</b></p><div class="meta">${s}</div></div></div>`).join('')}
          </div>
          ${past.length ? `<div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--rule);">
            <div style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:9px;">Past & cancelled</div>
            ${past.slice(0,6).map(b => `<div style="display:flex; gap:9px; align-items:center; padding:6px 0; font-size:12px; color:var(--ink-3);"><span style="font-family:var(--mono); font-size:10.5px; color:var(--ink-4); flex:0 0 84px;">${b.date}</span><span style="flex:1;">${b.subj}${b.topic?' · '+b.topic:''}</span><span class="tag ${b.status==='cancelled'?'tag-inactive':'tag-paid'}" style="font-size:9px;">${b.status==='cancelled'?'CANCELLED':'COMPLETED'}</span></div>`).join('')}
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

/* ── dashboard card ── */
function doubtDashboardCard(){
  const up = dbUpcoming();
  return `
    <div class="card mb-5">
      <div class="card-hd">
        <div><div class="card-title"><i class="fa-solid fa-circle-question" style="color:var(--gold); margin-right:7px;"></i>Doubt sessions</div><div class="card-sub">${up.length ? 'Next: ' + dbFmtDate(up[0].date) + ' at ' + up[0].time + ' with ' + up[0].tutor : 'Book 45 one-to-one minutes with the faculty member who teaches the topic'}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="navTo('doubts')">All sessions <i class="fa-solid fa-arrow-right"></i></button>
      </div>
      ${up.length ? `<div style="padding:14px 22px 0;">${up.slice(0,2).map(b => {
        const t = DOUBT_TUTORS.find(x => x.id === b.tutorId) || { init:'FM', name:b.tutor };
        const d = new Date(b.date + 'T00:00:00');
        return `<div class="db-book" style="margin-bottom:8px;">
          <div class="when"><div class="d">${d.getDate()}</div><div class="m">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
          <div class="db-tutor">${t.init}</div>
          <div style="flex:1; min-width:0;"><div style="font-size:13.5px; font-weight:700; color:var(--ink);">${b.subj}${b.topic?' · '+b.topic:''}</div><div style="font-family:var(--mono); font-size:10.5px; color:var(--ink-4); margin-top:2px;">${b.time}–${dbEnd(b.time)} · ${DOUBT_MODES[b.mode].label} · ${b.ref}</div></div>
          ${b.mode === 'video' ? `<button class="btn btn-primary btn-sm" onclick="showToast('The meeting link activates 5 minutes before the session')"><i class="fa-solid fa-video"></i> Join</button>` : ''}
          <button class="ico-btn" title="Add to calendar" onclick="dbDownloadICS('${b.ref}')"><i class="fa-regular fa-calendar-plus"></i></button>
        </div>`;
      }).join('')}</div>` : ''}
      <div class="card-body">${doubtWidget('dash', true)}</div>
    </div>`;
}

/* ── study tools launcher (dashboard) ── */
function studyToolsLauncher(){
  const up = dbUpcoming().length, hist = (typeof qlHistory === 'function' ? qlHistory().length : 0);
  const plan = (() => { try { return !!JSON.parse(localStorage.getItem('fma_planner')||'null')?.plan; } catch(e){ return false; } })();
  const fcDue = (typeof fcDeck === 'function') ? fcDeck().filter(c => fcIsDue(c.id)).length : 0;
  return `<div class="st-launch">
    <a onclick="navTo('textbooks')"><div class="ic"><i class="fa-solid fa-book"></i></div><div class="tx"><div class="t">Textbooks</div><div class="s">${TEXTBOOKS.length} titles by topic</div></div></a>
    <a onclick="navTo('flashcards')"><div class="ic"><i class="fa-solid fa-layer-group"></i></div><div class="tx"><div class="t">Flashcards</div><div class="s">${fcDue ? fcDue + ' due today' : 'Active recall drills'}</div></div></a>
    <a onclick="navTo('quizlab')"><div class="ic teal"><i class="fa-solid fa-square-check"></i></div><div class="tx"><div class="t">Practice Lab</div><div class="s">${hist ? hist + ' quizzes taken' : 'Build your own quiz'}</div></div></a>
    <a onclick="navTo('planner')"><div class="ic"><i class="fa-solid fa-calendar-days"></i></div><div class="tx"><div class="t">Study Planner</div><div class="s">${plan ? 'Continue my plan' : 'Generate a schedule'}</div></div></a>
    <a onclick="navTo('doubts')"><div class="ic teal"><i class="fa-solid fa-circle-question"></i></div><div class="tx"><div class="t">Doubt Sessions</div><div class="s">${up ? up + ' booked' : 'Book a tutor'}</div></div></a>
  </div>`;
}
