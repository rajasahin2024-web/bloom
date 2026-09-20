/* ═══ BLOOM — 1-on-1 Tutoring section ═══ */

let tut = { view:'home', cal:'week', wk:0, mo:0, focus:null, part:'', format:'video', date:null, time:null, note:'', teacher:null, remind:{h24:true,h1:true}, confirmed:null };

function sec_tutoring(){
  if (tut.confirmed) return tutConfirmHTML();
  if (tut.view === 'teacher') return tutTeacherHTML();
  return tutHomeHTML();
}

function tutHomeHTML(){
  const up = tutUpcoming();
  const feed = tutFeed();
  if (!tut.date) tut.date = tutFirstOpen();
  return `
    ${phead({ eyebrow:'One-to-one support', title:`1-on-1 <em>tutoring</em>`,
      sub:'Book 45 minutes with the English teacher who specialises in the part you are struggling with. Same-day slots are usually available.',
      actions:`${up.length?`<button class="btn btn-g btn-sm" onclick="tutICS('${up[0].ref}')"><i class="fa-regular fa-calendar-plus"></i> Add next to calendar</button>`:''}
        <button class="btn btn-p" onclick="document.getElementById('tutBook')?.scrollIntoView({block:'start'})"><i class="fa-solid fa-plus"></i> Book a session</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Upcoming', up.length, up.length?'Next on ' + tutDate(up[0].date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'}):'Nothing booked', 'leaf', 'fa-calendar-check')}
      ${statCard('Sessions taken', tutPast().filter(b=>b.status!=='cancelled').length + feed.length, 'Across all your teachers', 'sky', 'fa-clock-rotate-left')}
      ${statCard('Teachers available', TEACHERS.length, 'Examiners and senior tutors', 'amb', 'fa-chalkboard-user')}
      ${statCard('Free slots today', tutFreeCount(today(), tut.focus), tut.focus?TUT_FOCUS.find(f=>f.id===tut.focus).name+' specialists':'Across all teachers', 'cor', 'fa-bolt')}
    </div>

    ${up.length ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Your upcoming sessions</h3><p>You will get an email reminder before each one</p></div></div>
      <div class="card-bd flush">
        ${up.map(b => {
          const t = teacherOf(b.teacher), d = tutDate(b.date);
          return `<div class="row" style="gap:15px">
            <div style="text-align:center;flex:0 0 54px;border-right:1px solid var(--line);padding-right:14px">
              <div style="font-family:var(--display);font-size:20px;font-weight:700;line-height:1">${d.getDate()}</div>
              <div style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-top:2px">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
            <div style="width:36px;height:36px;flex:0 0 36px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800">${t.init}</div>
            <div class="tx"><b>${TUT_FOCUS.find(f=>f.id===b.focus)?.name||'English'}${b.part?' · '+partOf(b.part).name:''}</b>
              <span>${b.time}–${tutEnd(b.time)} · ${t.name} · ${TUT_FORMATS[b.format].name} · ${b.ref}</span>
              ${b.note?`<span style="font-style:italic;color:var(--ink-3);margin-top:4px;display:block">“${esc(b.note)}”</span>`:''}</div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              ${b.format==='video'?`<button class="btn btn-p btn-sm" onclick="toast('The meeting link activates 5 minutes before the session','fa-video')"><i class="fa-solid fa-video"></i> Join</button>`:''}
              <button class="icobtn" title="Add to calendar" onclick="tutICS('${b.ref}')"><i class="fa-regular fa-calendar-plus"></i></button>
              <button class="icobtn" title="Reschedule" onclick="tutReschedule('${b.ref}')"><i class="fa-solid fa-rotate"></i></button>
              <button class="icobtn" title="Cancel" onclick="tutCancel('${b.ref}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${tutCalendarHTML()}
    ${tutBookHTML()}

    <div class="split" style="margin-top:16px">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Your teachers</h3><p>Examiners and senior tutors taking sessions this week</p></div></div>
        <div class="card-bd flush">
          ${TEACHERS.map(t => `<div class="row" style="cursor:pointer" onclick="tut.teacher='${t.id}';tut.view='teacher';navTo('tutoring')">
            <div style="width:38px;height:38px;flex:0 0 38px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800">${t.init}</div>
            <div class="tx"><b>${t.name}</b><span>${t.role} · ${t.years} years · ${t.from}</span></div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;max-width:170px">
              ${t.skills.slice(0,2).map(s=>`<span class="tag leaf">${TUT_FOCUS.find(f=>f.id===s)?.name||s}</span>`).join('')}
              ${t.skills.length>2?`<span class="tag">+${t.skills.length-2}</span>`:''}</div>
            <span style="font-family:var(--mono);font-size:11.5px;color:var(--amber);font-weight:700;flex:0 0 auto"><i class="fa-solid fa-star" style="font-size:9px"></i> ${t.rating}</span>
          </div>`).join('')}
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>How it works</h3></div></div>
          <div class="card-bd" style="display:grid;gap:14px">
            ${[
              ['fa-bullseye','Choose your focus','Pick the skill or the exact exam part. Bloom shows only the teachers who specialise in it.'],
              ['fa-calendar-day','Pick a slot','Availability is live — a slot disappears the moment another student takes it.'],
              ['fa-message','Say what you need','Your note goes to the teacher beforehand, so the 45 minutes are spent solving rather than explaining.'],
              ['fa-video','Meet and work','Video, text chat, or send an essay ahead and discuss it live. Recordings and notes stay in your account.'],
            ].map(([ic,t,s],i)=>`<div style="display:flex;gap:12px;align-items:flex-start">
              <div style="width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;font-size:12px"><i class="fa-solid ${ic}"></i></div>
              <div><b style="font-size:13px;display:block;margin-bottom:2px">${t}</b><span style="font-size:12px;color:var(--ink-3);line-height:1.5">${s}</span></div></div>`).join('')}
          </div>
        </div>
        <div class="card" style="border-color:var(--violet);background:linear-gradient(160deg,var(--violet-soft),var(--surface) 70%)">
          <div class="card-bd">
            <div style="display:flex;gap:11px;align-items:center;margin-bottom:11px">
              <div style="width:32px;height:32px;border-radius:11px;background:var(--violet);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
              <div><b style="font-size:14px;display:block">Not sure what to book?</b><span style="font-size:11px;color:var(--ink-4)">Bloom Tutor can tell you</span></div></div>
            <div style="font-size:12.5px;color:var(--ink-2);line-height:1.6;margin-bottom:13px">${weakestSkill()?`Your weakest skill is <b>${skillMeta(weakestSkill()).name.toLowerCase()}</b> — start with a teacher who specialises in it.`:'Take the placement test and Bloom can point you at the right teacher.'}</div>
            <button class="btn btn-v btn-blk" onclick="navTo('tutor')"><i class="fa-solid fa-comments"></i> Ask Bloom Tutor</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-hd">
        <span style="display:inline-flex;align-items:center;gap:7px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ok);font-weight:800;background:var(--ok-soft);padding:5px 11px;border-radius:20px">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--ok)"></span>Completed feed <b style="font-family:var(--mono)">${feed.length}</b></span>
        <div style="flex:1"><h3 style="margin-left:6px">Recent sessions</h3><p style="margin-left:6px">Real 1-on-1 consultations recently completed by Bloom teachers</p></div>
      </div>
      <div class="card-bd flush">
        ${feed.map(f => {
          const t = teacherOf(f.t), d = tutDate(f.date);
          return `<div class="row" style="align-items:flex-start">
            <div style="text-align:center;flex:0 0 44px;background:var(--leaf-800);color:#fff;border-radius:10px;padding:6px 0">
              <div style="font-size:8px;letter-spacing:1px;text-transform:uppercase;font-weight:800;opacity:.7">${d.toLocaleDateString('en-GB',{month:'short'})}</div>
              <div style="font-family:var(--display);font-size:15px;font-weight:700;line-height:1.1">${String(d.getDate()).padStart(2,'0')}</div></div>
            <div class="tx" style="padding-top:2px">
              <b style="font-weight:600;font-size:13px;line-height:1.5">${esc(f.note)}</b>
              <span style="margin-top:5px">${f.ref} · with ${t.name} — ${TUT_FOCUS.find(x=>x.id===f.focus)?.name} · ${f.band}</span></div>
            <div style="width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${t.init}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function tutFeed(){
  return TUT_SEED_FEED.map((f,i) => ({ ...f, date: dayOffset(-(1 + i*2)), ref: 'BL-' + (2600 + i*37) }));
}
function tutFirstOpen(){
  for (let i = 0; i < 21; i++){ const iso = dayOffset(i); if (tutFreeCount(iso, tut.focus)) return iso; }
  return today();
}

/* ── LIVE CALENDAR ── */
function tutCalendarHTML(){
  const dates = tut.cal === 'week' ? tutWeekDates(tut.wk) : tutMonthDates(tut.mo);
  const label = tut.cal === 'week'
    ? `${tutDate(dates[0]).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} — ${tutDate(dates[6]).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}`
    : tutDate(dates[0]).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const isCurrent = tut.cal === 'week' ? tut.wk === 0 : tut.mo === 0;
  return `
    <div class="card mb2" style="overflow:hidden">
      <div style="background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700));padding:15px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <span style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:8px 14px;color:#fff;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;font-weight:800">
          <i class="fa-regular fa-calendar"></i> Live calendar</span>
        <div style="flex:1"></div>
        <div class="seg" style="background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18)">
          <button class="${tut.cal==='week'?'on':''}" style="${tut.cal==='week'?'':'color:rgba(255,255,255,.75)'}" onclick="tut.cal='week';navTo('tutoring')">Week</button>
          <button class="${tut.cal==='month'?'on':''}" style="${tut.cal==='month'?'':'color:rgba(255,255,255,.75)'}" onclick="tut.cal='month';navTo('tutoring')">Month</button>
        </div>
      </div>
      <div style="padding:14px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <button class="btn btn-g btn-sm" onclick="tut.${tut.cal==='week'?'wk':'mo'}--;navTo('tutoring')"><i class="fa-solid fa-chevron-left"></i> Prev ${tut.cal}</button>
        <div style="flex:1;text-align:center;display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap">
          <b style="font-size:14px">${label}</b>
          ${isCurrent?`<span class="tag leaf">Current ${tut.cal}</span>`:''}
        </div>
        <button class="btn btn-g btn-sm" onclick="tut.${tut.cal==='week'?'wk':'mo'}++;navTo('tutoring')">Next ${tut.cal} <i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="card-bd" style="padding:16px;overflow-x:auto">
        ${tut.cal === 'week' ? `
          <div style="display:grid;grid-template-columns:repeat(7,minmax(148px,1fr));gap:10px">
            ${dates.map(iso => {
              const d = tutDate(iso), slots = tutDaySlots(iso, tut.focus).filter(s => !s.taken);
              const isToday = iso === today(), isSel = iso === tut.date, isPast = iso < today();
              return `<div style="border:1.5px solid ${isSel?'var(--leaf-500)':'var(--line)'};border-radius:14px;background:${isPast?'var(--paper)':'var(--surface)'};overflow:hidden;${isPast?'opacity:.6':''}">
                <div style="padding:11px 13px;border-bottom:1px solid var(--line);background:${isSel?'var(--leaf-50)':'transparent'}">
                  <b style="font-size:12.5px;display:block;color:${isSel?'var(--leaf-700)':'var(--ink)'}">${d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</b>
                  <span style="font-family:var(--mono);font-size:10px;color:${slots.length?'var(--leaf-600)':'var(--ink-4)'}">${isToday?'Today · ':''}${slots.length?slots.length+' free':'no sessions'}</span>
                </div>
                <div style="padding:9px;display:grid;gap:6px;min-height:78px">
                  ${slots.length ? slots.slice(0,6).map(s=>`
                    <button style="display:flex;gap:8px;align-items:center;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:6px 9px;cursor:pointer;text-align:left;font-family:inherit;transition:.13s" onmouseover="this.style.borderColor='var(--leaf-400)'" onmouseout="this.style.borderColor='var(--line)'" onclick="tutPick('${iso}','${s.time}')">
                      <span style="width:20px;height:20px;flex:0 0 20px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:8px;font-weight:800">${s.teacher.init}</span>
                      <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--ink-2)">${s.time}</span></button>`).join('')
                  + (slots.length>6?`<div style="font-family:var(--mono);font-size:10px;color:var(--ink-4);text-align:center;padding-top:2px">+${slots.length-6} more</div>`:'')
                  : `<div style="font-size:11.5px;color:var(--ink-4);text-align:center;padding:20px 0">No sessions</div>`}
                </div>
              </div>`;
            }).join('')}
          </div>`
        : `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:7px">
            ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div style="text-align:center;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800;padding-bottom:5px">${d}</div>`).join('')}
            ${(() => { const first = tutDate(dates[0]); const lead = (first.getDay()+6)%7; return Array.from({length:lead},()=>'<div></div>').join(''); })()}
            ${dates.map(iso => {
              const d = tutDate(iso), n = tutFreeCount(iso, tut.focus);
              const isToday = iso === today(), isSel = iso === tut.date, isPast = iso < today();
              return `<button style="aspect-ratio:1;border:1.5px solid ${isSel?'var(--leaf-500)':isToday?'var(--leaf-300)':'var(--line)'};border-radius:11px;background:${isSel?'var(--leaf-50)':isPast?'var(--paper)':'var(--surface)'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:${n&&!isPast?'pointer':'default'};font-family:inherit;${isPast||!n?'opacity:.45':''}" ${n&&!isPast?`onclick="tut.date='${iso}';navTo('tutoring')"`:''}>
                <span style="font-family:var(--display);font-size:15px;font-weight:700;color:${isSel?'var(--leaf-700)':'var(--ink)'}">${d.getDate()}</span>
                <span style="font-family:var(--mono);font-size:8.5px;color:${n&&!isPast?'var(--leaf-600)':'var(--ink-4)'};font-weight:700">${isPast?'past':n?n+' free':'full'}</span></button>`;
            }).join('')}
          </div>`}
      </div>
    </div>`;
}

/* ── BOOKING PANEL ── */
function tutBookHTML(){
  const dates = Array.from({length:21},(_,i)=>dayOffset(i));
  if (!tut.date || !dates.includes(tut.date)) tut.date = tutFirstOpen();
  const slots = tutDaySlots(tut.date, tut.focus);
  const free = slots.filter(s=>!s.taken).length;
  const partOpts = tut.focus ? PARTS.filter(p => p.skill === tut.focus || (tut.focus==='grammar'&&p.id==='gv') || (tut.focus==='strategy'&&p.id==='strategy') || (tut.focus==='pronunciation'&&p.skill==='speaking')) : [];
  const specialists = TEACHERS.filter(t => !tut.focus || t.skills.includes(tut.focus));
  return `
    <div class="card mb2" id="tutBook">
      <div class="card-hd"><div style="flex:1"><h3>Book a session</h3><p>Choose your focus, day and time — availability updates live</p></div>
        <span style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4)">${specialists.length} teacher${specialists.length===1?'':'s'} match</span></div>
      <div class="card-bd">
        <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:10px">Focus <span style="text-transform:none;letter-spacing:0;font-weight:500">(pick one)</span></div>
        <div class="pills mb" style="margin-bottom:18px">
          <button class="pill ${!tut.focus?'on':''}" onclick="tut.focus=null;tut.part='';tut.time=null;navTo('tutoring')">Any</button>
          ${TUT_FOCUS.map(f=>`<button class="pill ${tut.focus===f.id?'on':''}" onclick="tut.focus='${f.id}';tut.part='';tut.time=null;tut.date=null;navTo('tutoring')"><i class="fa-solid ${f.ic}"></i> ${f.name} <span class="n">${TEACHERS.filter(t=>t.skills.includes(f.id)).length}</span></button>`).join('')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px" class="tutrow">
          <div class="fg"><label>Exam part <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--ink-4)">(optional)</span></label>
            <select onchange="tut.part=this.value;navTo('tutoring')">
              <option value="">${tut.focus?'Any part of '+TUT_FOCUS.find(f=>f.id===tut.focus).name:'Any part of the exam'}</option>
              ${(partOpts.length?partOpts:PARTS).map(p=>`<option value="${p.id}" ${tut.part===p.id?'selected':''}>${p.name}</option>`).join('')}
            </select></div>
          <div><label style="font-size:9.5px;letter-spacing:1.3px;text-transform:uppercase;color:var(--ink-4);font-weight:800;display:block;margin-bottom:7px">Format</label>
            <div class="seg">${Object.entries(TUT_FORMATS).map(([k,v])=>`<button class="${tut.format===k?'on':''}" onclick="tut.format='${k}';navTo('tutoring')"><i class="fa-solid ${v.ic}" style="margin-right:5px"></i>${v.name}</button>`).join('')}</div>
            <div style="font-size:11px;color:var(--ink-4);margin-top:6px">${TUT_FORMATS[tut.format].note}</div></div>
        </div>

        <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:10px">Select a day</div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding:3px 2px 12px">
          ${dates.map(iso => {
            const d = tutDate(iso), n = tutFreeCount(iso, tut.focus), sel = iso === tut.date;
            return `<button style="flex:0 0 auto;width:64px;border:1.5px solid ${sel?'var(--leaf-600)':'var(--line)'};border-radius:12px;background:${sel?'var(--leaf-700)':'var(--surface)'};padding:9px 0;text-align:center;cursor:${n?'pointer':'not-allowed'};font-family:inherit;${n?'':'opacity:.42'}" ${n?`onclick="tut.date='${iso}';tut.time=null;navTo('tutoring')"`:''}>
              <div style="font-size:8.5px;letter-spacing:1.1px;text-transform:uppercase;font-weight:800;color:${sel?'rgba(255,255,255,.7)':'var(--ink-4)'}">${d.toLocaleDateString('en-GB',{weekday:'short'})}</div>
              <div style="font-family:var(--display);font-size:19px;font-weight:700;line-height:1.2;color:${sel?'#fff':'var(--ink)'}">${d.getDate()}</div>
              <div style="font-size:9px;color:${sel?'rgba(255,255,255,.65)':'var(--ink-4)'}">${d.toLocaleDateString('en-GB',{month:'short'})}</div>
              <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;color:${sel?'var(--leaf-300)':n?'var(--leaf-600)':'var(--ink-4)'};margin-top:2px">${n?n+' free':'full'}</div></button>`;
          }).join('')}
        </div>

        <div style="display:flex;align-items:center;gap:11px;margin:12px 0 12px">
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${tutDate(tut.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>
          <div style="flex:1;height:1px;background:var(--line)"></div>
          <div style="font-family:var(--mono);font-size:11px;color:${free?'var(--leaf-600)':'var(--coral)'};font-weight:700">${free} of ${slots.length} slots available</div>
        </div>

        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(184px,1fr));gap:9px">
          ${slots.map(s => `<button style="border:1.5px solid ${tut.time===s.time?'var(--leaf-600)':'var(--line)'};border-radius:13px;background:${tut.time===s.time?'var(--leaf-50)':s.taken?'var(--paper)':'var(--surface)'};padding:12px 14px;text-align:left;cursor:${s.taken?'not-allowed':'pointer'};font-family:inherit;transition:.13s;${s.taken?'opacity:.45':''}" ${s.taken?'':`onmouseover="this.style.borderColor='var(--leaf-400)'" onmouseout="this.style.borderColor='${tut.time===s.time?'var(--leaf-600)':'var(--line)'}'" onclick="tut.time='${s.time}';navTo('tutoring')"`}>
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">
              <b style="font-family:var(--mono);font-size:14.5px;font-weight:700;color:${s.taken?'var(--ink-4)':'var(--leaf-700)'};${s.taken?'text-decoration:line-through':''}">${s.time}</b>
              <span style="font-size:10.5px;color:var(--ink-4)">· ${TUT_LEN} min</span></div>
            <div style="display:flex;gap:7px;align-items:center">
              <span style="width:20px;height:20px;flex:0 0 20px;border-radius:50%;background:${s.taken?'var(--line-2)':'linear-gradient(140deg,var(--leaf-700),var(--leaf-500))'};color:#fff;display:grid;place-items:center;font-size:8px;font-weight:800">${s.teacher.init}</span>
              <span style="font-size:11.5px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.taken?'Booked':s.teacher.name}</span></div>
            ${s.taken?'':`<div style="margin-top:7px;font-size:9px;letter-spacing:.8px;text-transform:uppercase;font-weight:800;color:var(--ok);background:var(--ok-soft);display:inline-block;padding:2px 7px;border-radius:5px">1 teacher available</div>`}
          </button>`).join('')}
        </div>

        ${tut.time ? `
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--line)">
          <div class="fg" style="margin-bottom:14px"><label>What do you want to work on?</label>
            <textarea rows="3" placeholder="e.g. I get 6.0 for grammar in every essay and I cannot see what I am doing wrong — can we look at my last two Task 2s?" oninput="tut.note=this.value">${esc(tut.note)}</textarea></div>
          <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-2);cursor:pointer"><input type="checkbox" ${tut.remind.h24?'checked':''} onchange="tut.remind.h24=this.checked"> Remind me 24 h before</label>
            <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-2);cursor:pointer"><input type="checkbox" ${tut.remind.h1?'checked':''} onchange="tut.remind.h1=this.checked"> Remind me 1 h before</label>
            <button class="btn btn-p" style="margin-left:auto" onclick="tutConfirm()"><i class="fa-solid fa-check"></i> Confirm ${tut.time} with ${tutSlot(tut.date,tut.time,tut.focus).teacher.name.split(' ').slice(-1)[0]}</button>
          </div>
          <div style="font-size:11.5px;color:var(--ink-4);margin-top:10px">Confirmation is emailed instantly · free cancellation up to 3 hours before.</div>
        </div>`
        : `<div style="margin-top:16px;padding:14px;background:var(--paper);border-radius:12px;text-align:center;font-size:12.5px;color:var(--ink-4)"><i class="fa-regular fa-calendar"></i> Click any available time slot above to continue.</div>`}
      </div>
    </div>
    <style>@media(max-width:760px){.tutrow{grid-template-columns:1fr!important}}</style>`;
}

function tutPick(iso, time){ tut.date = iso; tut.time = time; navTo('tutoring'); setTimeout(()=>document.getElementById('tutBook')?.scrollIntoView({block:'start',behavior:'smooth'}),80); }

function tutConfirm(){
  if (!tut.date || !tut.time) return;
  const slot = tutSlot(tut.date, tut.time, tut.focus);
  const b = {
    ref:'BL-' + Date.now().toString(36).toUpperCase().slice(-5),
    date:tut.date, time:tut.time, focus:tut.focus||'strategy', part:tut.part,
    teacher:slot.teacher.id, format:tut.format, note:tut.note,
    remind:{...tut.remind}, status:'confirmed', created:new Date().toISOString(),
  };
  tutBookings().unshift(b); save();
  tut.confirmed = b; tut.time = null; tut.note = '';
  addXP(30);
  notify('Tutoring session confirmed', `${tutDate(b.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} at ${b.time} with ${slot.teacher.name}. Booking ${b.ref}.`, 'fa-calendar-check');
  navTo('tutoring');
  toast('Session booked · confirmation emailed to ' + B.profile.email, 'fa-envelope-circle-check');
}

function tutConfirmHTML(){
  const b = tut.confirmed, t = teacherOf(b.teacher);
  return `
    ${phead({ eyebrow:'Booking confirmed', title:`You're <em>booked</em>`, sub:'A confirmation has been emailed to you with the joining details.',
      actions:`<button class="btn btn-g btn-sm" onclick="tut.confirmed=null;navTo('tutoring')"><i class="fa-solid fa-arrow-left"></i> Back to tutoring</button>` })}
    <div style="max-width:720px;margin:0 auto">
      <div class="card" style="background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 60%,var(--leaf-600));border:none;color:#fff;margin-bottom:16px">
        <div class="card-bd" style="padding:30px 32px">
          <div style="width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);display:grid;place-items:center;font-size:21px;margin-bottom:17px"><i class="fa-solid fa-check"></i></div>
          <h3 style="font-family:var(--display);font-size:25px;font-weight:700;letter-spacing:-.6px">Your session is confirmed</h3>
          <div style="font-family:var(--mono);font-size:11.5px;letter-spacing:1.6px;color:var(--leaf-300);margin-top:7px">BOOKING ${b.ref}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin:24px 0;padding:20px 0;border-top:1px solid rgba(255,255,255,.16);border-bottom:1px solid rgba(255,255,255,.16)">
            ${[['When', tutDate(b.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}) + '<br>' + b.time + ' – ' + tutEnd(b.time)],
               ['With', t.name + '<br><span style="font-weight:400;color:rgba(255,255,255,.55);font-size:12px">' + t.role + '</span>'],
               ['Focus', (TUT_FOCUS.find(f=>f.id===b.focus)?.name||'English') + (b.part?'<br><span style="font-weight:400;color:rgba(255,255,255,.55);font-size:12px">'+partOf(b.part).name+'</span>':'')],
               ['Format', TUT_FORMATS[b.format].name]].map(([l,v])=>`
              <div><div style="font-size:8.5px;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:800;margin-bottom:6px">${l}</div>
                <div style="font-size:13.5px;font-weight:600;line-height:1.4">${v}</div></div>`).join('')}
          </div>
          <div style="display:flex;gap:9px;flex-wrap:wrap">
            <button class="btn btn-a" onclick="tutICS('${b.ref}')"><i class="fa-regular fa-calendar-plus"></i> Add to calendar</button>
            ${b.format==='video'?`<button class="btn btn-g" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.25)" onclick="toast('The link activates 5 minutes before the session','fa-video')"><i class="fa-solid fa-video"></i> Session link</button>`:''}
            <button class="btn btn-g" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.25)" onclick="tut.confirmed=null;navTo('tutoring')"><i class="fa-solid fa-plus"></i> Book another</button>
          </div>
          <div style="margin-top:18px;font-size:12px;color:rgba(255,255,255,.62)">
            <i class="fa-solid fa-envelope-circle-check" style="color:var(--leaf-300);margin-right:6px"></i>Sent to <b style="color:#fff">${esc(B.profile.email)}</b>${b.remind.h24||b.remind.h1?` · reminders ${[b.remind.h24?'24 h':'',b.remind.h1?'1 h':''].filter(Boolean).join(' and ')} before`:''}
          </div>
        </div>
      </div>
      ${b.note?`<div class="why leaf"><b>What you sent ${t.name.split(' ').slice(-1)[0]}</b>${esc(b.note)}</div>`:''}
      <div class="card" style="margin-top:16px"><div class="card-bd" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div style="width:46px;height:46px;flex:0 0 46px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:14px;font-weight:800">${t.init}</div>
        <div style="flex:1;min-width:200px"><b style="font-size:14.5px;display:block">${t.name}</b>
          <span style="font-size:12px;color:var(--ink-3)">${t.bio}</span></div>
        <button class="btn btn-g btn-sm" onclick="tut.confirmed=null;tut.teacher='${t.id}';tut.view='teacher';navTo('tutoring')">Profile</button>
      </div></div>
    </div>`;
}

/* ── TEACHER PROFILE ── */
function tutTeacherHTML(){
  const t = teacherOf(tut.teacher);
  const nextDays = Array.from({length:7},(_,i)=>dayOffset(i));
  return `
    ${phead({ eyebrow:'Bloom teacher', title:t.name.replace(/(\S+)$/,'<em>$1</em>'), sub:t.bio,
      actions:`<button class="btn btn-g btn-sm" onclick="tut.view='home';navTo('tutoring')"><i class="fa-solid fa-arrow-left"></i> All teachers</button>
        <button class="btn btn-p" onclick="tut.view='home';tut.focus='${t.skills[0]}';tut.date=null;navTo('tutoring')"><i class="fa-solid fa-calendar-plus"></i> Book with ${t.name.split(' ').slice(-1)[0]}</button>` })}

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card"><div class="card-bd" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
          <div style="width:76px;height:76px;flex:0 0 76px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-800),var(--leaf-500));color:#fff;display:grid;place-items:center;font-family:var(--display);font-size:24px;font-weight:700">${t.init}</div>
          <div style="flex:1;min-width:200px">
            <b style="font-family:var(--display);font-size:20px;font-weight:700;display:block">${t.name}</b>
            <div style="font-size:13px;color:var(--ink-3);margin:4px 0 10px">${t.role} · ${t.from}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${t.skills.map(s=>`<span class="tag leaf">${TUT_FOCUS.find(f=>f.id===s)?.name||s}</span>`).join('')}</div>
          </div>
          <div style="display:flex;gap:20px">
            ${[[t.rating,'Rating'],[t.years+'y','Experience'],[t.sessions.toLocaleString(),'Sessions']].map(([v,l])=>`
              <div style="text-align:center"><div style="font-family:var(--display);font-size:21px;font-weight:700">${v}</div>
                <div style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${l}</div></div>`).join('')}
          </div>
        </div></div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Availability this week</h3><p>Click a slot to book it</p></div></div>
          <div class="card-bd" style="display:grid;gap:11px">
            ${nextDays.map(iso => {
              const slots = tutDaySlots(iso, null).filter(s => !s.taken && s.teacher.id === t.id);
              if (!slots.length) return '';
              const d = tutDate(iso);
              return `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:11px 13px;background:var(--paper);border-radius:12px">
                <b style="font-size:12.5px;flex:0 0 130px">${d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})}</b>
                <div style="display:flex;gap:6px;flex-wrap:wrap;flex:1">
                  ${slots.map(s=>`<button class="pill" style="padding:5px 12px;font-family:var(--mono);font-size:11.5px" onclick="tut.view='home';tutPick('${iso}','${s.time}')">${s.time}</button>`).join('')}
                </div></div>`;
            }).join('') || `<div style="font-size:12.5px;color:var(--ink-4);text-align:center;padding:20px">No open slots in the next seven days — try the following week.</div>`}
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card"><div class="card-hd"><div style="flex:1"><h3>Specialises in</h3></div></div>
          <div class="card-bd" style="display:grid;gap:9px">
            <div style="font-size:13px;color:var(--ink-2);line-height:1.6;padding-bottom:11px;border-bottom:1px dashed var(--line)"><b>${t.focus}</b></div>
            ${t.parts.map(p=>`<div style="display:flex;gap:10px;align-items:center;font-size:12.5px;color:var(--ink-2)">
              <i class="fa-solid fa-circle" style="font-size:5px;color:var(--leaf-500)"></i>${partOf(p).name}</div>`).join('')}
          </div></div>
        <div class="card"><div class="card-hd"><div style="flex:1"><h3>Languages</h3></div></div>
          <div class="card-bd"><div style="display:flex;gap:6px;flex-wrap:wrap">${t.langs.map(l=>`<span class="tag sky">${l}</span>`).join('')}</div>
            <div style="font-size:12px;color:var(--ink-4);margin-top:11px;line-height:1.55">Sessions are taught entirely in English, but ${t.name.split(' ').slice(-1)[0]} can explain a difficult point in ${t.langs.slice(1).join(' or ')||'plain, slower English'} if you get stuck.</div></div></div>
        ${lecsFor(t.parts[0])?.length?`
        <div class="card"><div class="card-hd"><div style="flex:1"><h3>Lectures by ${t.name.split(' ').slice(-1)[0]}</h3></div></div>
          <div class="card-bd flush">
            ${LECTURES.filter(l=>l.tutor===t.name).map(l=>`<div class="row"><div class="ic sky"><i class="fa-solid fa-circle-play"></i></div>
              <div class="tx"><b class="clip">${l.title}</b><span>${fmtDur(l.secs)}</span></div>
              <button class="btn btn-g btn-sm" onclick="libOpenLec('${l.id}')">Watch</button></div>`).join('') || '<div style="padding:16px 21px;font-size:12.5px;color:var(--ink-4)">No recorded lectures yet.</div>'}
          </div></div>`:''}
      </div>
    </div>`;
}

/* ── actions ── */
function tutCancel(ref){
  if (!confirm('Cancel this session? The slot is released immediately.')) return;
  const b = tutBookings().find(x => x.ref === ref); if (!b) return;
  b.status = 'cancelled'; save(); navTo('tutoring'); toast('Session ' + ref + ' cancelled');
}
function tutReschedule(ref){
  const b = tutBookings().find(x => x.ref === ref); if (!b) return;
  b.status = 'cancelled';
  tut.focus = b.focus; tut.part = b.part; tut.format = b.format; tut.note = b.note; tut.date = null; tut.time = null; tut.confirmed = null;
  save(); navTo('tutoring'); toast('Pick a new slot — your notes were kept', 'fa-rotate');
}
function tutICS(ref){
  const b = tutBookings().find(x => x.ref === ref); if (!b) return;
  const t = teacherOf(b.teacher);
  const dt = b.date.replace(/-/g,'') + 'T' + b.time.replace(':','') + '00';
  const end = b.date.replace(/-/g,'') + 'T' + tutEnd(b.time).replace(':','') + '00';
  const alarms = [];
  if (b.remind.h24) alarms.push('BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:Bloom tutoring session tomorrow\r\nEND:VALARM');
  if (b.remind.h1) alarms.push('BEGIN:VALARM\r\nTRIGGER:-PT1H\r\nACTION:DISPLAY\r\nDESCRIPTION:Bloom tutoring session in 1 hour\r\nEND:VALARM');
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bloom IELTS Academy//Tutoring//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    'UID:' + b.ref + '@bloomielts.com',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z',
    'DTSTART:' + dt, 'DTEND:' + end,
    'SUMMARY:Bloom 1-on-1 — ' + (TUT_FOCUS.find(f=>f.id===b.focus)?.name||'English') + ' with ' + t.name,
    'DESCRIPTION:' + TUT_FORMATS[b.format].name + ' with ' + t.name + ' (' + t.role + '). Booking ' + b.ref + '.' + (b.note?' Focus: '+b.note.replace(/\r?\n/g,' '):''),
    'LOCATION:' + (b.format==='video'?'Online video call':'Bloom platform'),
    ...alarms,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type:'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'Bloom_Tutoring_' + b.ref + '.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 2000);
  toast('Calendar invite downloaded', 'fa-calendar-plus');
}

/* dashboard strip */
function tutDashCard(){
  const up = tutUpcoming();
  if (!up.length) return '';
  const b = up[0], t = teacherOf(b.teacher), d = tutDate(b.date);
  const days = Math.round((tutDate(b.date) - tutDate(today())) / 86400000);
  return `<div class="card mb2" style="border-color:var(--leaf-500)"><div class="card-bd" style="display:flex;gap:15px;align-items:center;flex-wrap:wrap">
    <div style="text-align:center;flex:0 0 52px"><div style="font-family:var(--display);font-size:21px;font-weight:700;line-height:1">${d.getDate()}</div>
      <div style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
    <div style="width:38px;height:38px;flex:0 0 38px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800">${t.init}</div>
    <div style="flex:1;min-width:210px">
      <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:4px">${days===0?'Today':days===1?'Tomorrow':'In '+days+' days'} · 1-on-1 tutoring</div>
      <b style="font-size:14.5px;display:block">${TUT_FOCUS.find(f=>f.id===b.focus)?.name||'English'} with ${t.name}</b>
      <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${b.time}–${tutEnd(b.time)} · ${TUT_FORMATS[b.format].name}</span></div>
    ${b.format==='video'?`<button class="btn btn-p btn-sm" onclick="toast('The link activates 5 minutes before the session','fa-video')"><i class="fa-solid fa-video"></i> Join</button>`:''}
    <button class="btn btn-g btn-sm" onclick="navTo('tutoring')">All sessions</button>
  </div></div>`;
}
