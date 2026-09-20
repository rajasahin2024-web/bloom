/* ═══════════════════════════════════════════════════════════════
   BLOOM — My Schedule
   One timetable for the student. Merges four sources that until now
   lived in separate sections:
     · cohort live classes and academy-wide open sessions
     · self-study blocks from the generated study plan
     · booked 1-on-1 tutoring sessions
     · the exam date itself
═══════════════════════════════════════════════════════════════ */

let sch = { view:'week', wk:0, filter:'all', day:null };

const SCH_KINDS = {
  class:   { name:'Live class',   ic:'fa-chalkboard-user', tone:'leaf', go:"navTo('live')" },
  open:    { name:'Open session', ic:'fa-users-rectangle', tone:'sky',  go:"navTo('live')" },
  tutor:   { name:'1-on-1',       ic:'fa-user',            tone:'vio',  go:"navTo('tutoring')" },
  study:   { name:'Self-study',   ic:'fa-book-open-reader',tone:'amb',  go:"navTo('plan')" },
  exam:    { name:'Exam day',     ic:'fa-file-signature',  tone:'cor',  go:"navTo('profile')" },
};

/* ── gather everything for one ISO date ── */
function schForDate(iso){
  const out = [];

  /* live classes — cohort lessons and open sessions */
  if (typeof myCohort === 'function' && typeof classesFor === 'function'){
    const c = myCohort();
    /* the week containing this date */
    const off = Math.floor((new Date(iso + 'T00:00:00') - new Date(weekDates(0)[0] + 'T00:00:00')) / 604800000);
    classesFor(c, off).filter(x => x.date === iso).forEach(x => {
      out.push({
        kind: x.mine ? 'class' : 'open',
        id: x.id, from: x.from, to: x.to,
        title: x.title, sub: (CLS_KINDS[x.kind] ? CLS_KINDS[x.kind].name : 'Class') + ' · ' + x.room,
        who: teacherOf(x.teacher).name, state: clsState(x), raw: x,
        booked: x.mine || lvBooked(x.id),
      });
    });
  }

  /* self-study blocks from the plan */
  if (B.plan){
    const d = B.plan.days.find(x => x.date === iso);
    if (d && d.tasks) d.tasks.forEach((t, i) => {
      const start = 16 * 60 + i * (t.mins + 15);
      const hh = v => String(Math.floor(v/60)%24).padStart(2,'0') + ':' + String(v%60).padStart(2,'0');
      out.push({
        kind:'study', id:t.key, from:hh(start), to:hh(start + t.mins),
        title:t.name, sub:t.skill + ' · ' + t.mins + ' min', who:'On your own',
        done:!!B.planDone[t.key], go:t.go, task:t,
      });
    });
  }

  /* booked tutoring */
  if (typeof tutBookings === 'function'){
    tutBookings().filter(b => b.status === 'confirmed' && b.date === iso).forEach(b => {
      const t = teacherOf(b.teacher);
      out.push({
        kind:'tutor', id:b.ref, from:b.time, to:tutEnd(b.time),
        title:(TUT_FOCUS.find(f => f.id === b.focus) || {}).name || 'English' ,
        sub:TUT_FORMATS[b.format].name + (b.part ? ' · ' + partOf(b.part).name : ''),
        who:t.name, booking:b,
      });
    });
  }

  /* exam day */
  if (B.profile.testDate === iso){
    out.push({ kind:'exam', id:'exam', from:'09:00', to:'13:00',
      title:examOf(examTrack()).name, sub:'Your test date', who:'Test centre' });
  }

  return out.sort((a,b) => a.from.localeCompare(b.from));
}

function schWeekLoad(off){
  const dates = weekDates(off);
  return dates.map(iso => ({ iso, items:schForDate(iso) }));
}
function schFiltered(items){
  if (sch.filter === 'all') return items;
  if (sch.filter === 'taught') return items.filter(x => x.kind === 'class' || x.kind === 'open' || x.kind === 'tutor');
  return items.filter(x => x.kind === sch.filter);
}

/* ═══ SECTION ═══ */
function sec_schedule(){
  if (sch.view === 'day' && sch.day) return schDayHTML();
  if (sch.view === 'agenda') return schAgendaHTML();
  return schWeekHTML();
}

function schHead(){
  const days = B.profile.testDate ? daysTo(B.profile.testDate) : null;
  const c = typeof myCohort === 'function' ? myCohort() : null;
  return phead({ eyebrow:'My schedule' + (c ? ' · ' + c.name : ''),
    title:`My <em>schedule</em>`,
    sub: days != null
      ? `Every class, session and study block in one place. ${days} days until your ${examOf(examTrack()).short} test.`
      : 'Every class, session and study block in one place — your cohort timetable, your study plan and your booked tutoring.',
    actions:`<div class="seg" style="margin-right:4px">
        <button class="${sch.view==='week'?'on':''}" onclick="sch.view='week';navTo('schedule')">Week</button>
        <button class="${sch.view==='agenda'?'on':''}" onclick="sch.view='agenda';navTo('schedule')">Agenda</button>
      </div>
      <button class="btn btn-g btn-sm" onclick="schICS()"><i class="fa-regular fa-calendar-plus"></i> Export</button>
      <button class="btn btn-g btn-sm" onclick="schPrint()"><i class="fa-solid fa-print"></i> Print</button>` });
}

/* ── stat strip shared by both views ── */
function schStats(){
  const wk = schWeekLoad(sch.wk);
  const all = wk.flatMap(d => d.items);
  const taught = all.filter(x => x.kind === 'class' || x.kind === 'open' || x.kind === 'tutor').length;
  const study = all.filter(x => x.kind === 'study');
  const studyDone = study.filter(x => x.done).length;
  const mins = all.reduce((n,x) => {
    const [ah,am] = x.from.split(':').map(Number), [bh,bm] = x.to.split(':').map(Number);
    return n + Math.max(0, (bh*60+bm) - (ah*60+am));
  }, 0);
  const live = all.find(x => x.state === 'live');
  /* If the cohort has not started, say so — a zero here otherwise looks like
     a broken timetable rather than a course that begins next month. */
  const phase = typeof cohortPhase === 'function' ? cohortPhase() : 'running';
  const co = typeof myCohort === 'function' ? myCohort() : null;
  const notice = (!taught && co && phase !== 'running') ? `
    <div class="card mb2" style="border-color:var(--sky);background:linear-gradient(180deg,var(--sky-soft),var(--surface) 60%)">
      <div class="card-bd" style="display:flex;gap:15px;align-items:center;flex-wrap:wrap">
        <div style="width:42px;height:42px;flex:0 0 42px;border-radius:13px;background:var(--sky);color:#fff;display:grid;place-items:center;font-size:16px"><i class="fa-regular fa-calendar"></i></div>
        <div style="flex:1;min-width:230px">
          <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:#1f6e9e;font-weight:800;margin-bottom:4px">${phase === 'upcoming' ? 'Your course has not started yet' : 'Your course has finished'}</div>
          <b style="font-family:var(--display);font-size:17px;font-weight:700;display:block">${esc(co.name)}</b>
          <span style="font-size:12.5px;color:var(--ink-3)">${phase === 'upcoming'
            ? 'Classes begin ' + longDateSch(co.start) + ' — ' + daysTo(co.start) + ' days away, ' + co.days.join(', ') + ' at ' + co.time + '. Your study plan is already running below.'
            : 'The taught part of your course is complete. Your study plan and 1-on-1 sessions continue.'}</span>
        </div>
        <button class="btn btn-g btn-sm" onclick="navTo('live')">Course details</button>
      </div>
    </div>` : '';
  return notice + `
    <div class="grid g4 mb2">
      ${statCard('Taught hours', taught, taught ? 'Classes, open sessions and 1-on-1s' : phase === 'upcoming' ? 'Course starts ' + longDateSch(co.start) : 'Nothing taught this week', taught?'leaf':'', 'fa-chalkboard-user')}
      ${statCard('Study blocks', studyDone + ' / ' + study.length, study.length?pct(studyDone,study.length)+'% ticked off':'No plan for this week', studyDone===study.length&&study.length?'leaf':'amb', 'fa-book-open-reader')}
      ${statCard('Time committed', Math.floor(mins/60) + 'h ' + (mins%60?mins%60+'m':''), 'Across ' + all.length + ' entries', 'sky', 'fa-clock')}
      ${live ? statCard('Happening now', live.title.slice(0,22), 'Join it — ' + live.from + '–' + live.to, 'cor', 'fa-circle-dot')
        : statCard('Next up', (() => { const n = schNext(); return n ? n.item.from + ' ' + n.item.title.slice(0,16) : '—'; })(), (() => { const n = schNext(); return n ? schWhen(n.iso) : 'Nothing scheduled'; })(), 'amb', 'fa-forward')}
    </div>`;
}
function longDateSch(iso){ return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long'}) : '—'; }
function schNext(){
  for (let i = 0; i < 21; i++){
    const iso = dayOffset(i);
    const items = schForDate(iso).filter(x => !x.done);
    for (const item of items){
      if (i === 0 && new Date(iso + 'T' + item.to) < new Date()) continue;
      return { iso, item };
    }
  }
  return null;
}
function schWhen(iso){
  const n = Math.round((new Date(iso+'T00:00:00') - new Date(today()+'T00:00:00')) / 86400000);
  return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 7 ? tutDate(iso).toLocaleDateString('en-GB',{weekday:'long'}) : 'in ' + n + ' days';
}

/* ═══ WEEK GRID ═══ */
function schWeekHTML(){
  const wk = schWeekLoad(sch.wk);
  const dates = wk.map(d => d.iso);
  const slots = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
  return `
    ${schHead()}
    ${schStats()}
    ${schFilterBar()}

    <div class="card">
      <div class="card-hd">
        <button class="btn btn-g btn-sm" onclick="sch.wk--;navTo('schedule')"><i class="fa-solid fa-chevron-left"></i></button>
        <div style="flex:1;text-align:center">
          <h3>${tutDate(dates[0]).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${tutDate(dates[6]).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</h3>
          <p>${sch.wk===0?'This week':sch.wk>0?'In '+sch.wk+' week'+(sch.wk===1?'':'s'):Math.abs(sch.wk)+' week'+(sch.wk===-1?'':'s')+' ago'}</p></div>
        <button class="btn btn-g btn-sm" onclick="sch.wk++;navTo('schedule')"><i class="fa-solid fa-chevron-right"></i></button>
        ${sch.wk!==0?`<button class="btn btn-g btn-sm" onclick="sch.wk=0;navTo('schedule')">Today</button>`:''}
      </div>
      <div class="card-bd" style="padding:0;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;min-width:860px">
          <thead><tr>
            <th style="width:58px;padding:11px 8px;border-bottom:1px solid var(--line);background:var(--paper)"></th>
            ${dates.map((iso,i) => { const isToday = iso === today(), d = tutDate(iso);
              const n = schFiltered(wk[i].items).length;
              return `<th style="padding:10px 6px;border-bottom:1px solid var(--line);border-left:1px solid var(--line);background:${isToday?'var(--leaf-50)':'var(--paper)'};text-align:center;cursor:pointer" onclick="sch.day='${iso}';sch.view='day';navTo('schedule')">
                <div style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:${isToday?'var(--leaf-700)':'var(--ink-4)'};font-weight:800">${DAYS[i]}</div>
                <div style="font-family:var(--display);font-size:16px;font-weight:700;color:${isToday?'var(--leaf-700)':'var(--ink)'}">${d.getDate()}</div>
                <div style="font-family:var(--mono);font-size:9px;color:var(--ink-4);margin-top:1px">${n?n+' item'+(n===1?'':'s'):'free'}</div></th>`;
            }).join('')}
          </tr></thead>
          <tbody>
            ${slots.map(h => `<tr>
              <td style="padding:5px 8px;font-family:var(--mono);font-size:10.5px;color:var(--ink-4);border-bottom:1px solid var(--line);vertical-align:top;text-align:right">${h}</td>
              ${dates.map((iso,i) => {
                const items = schFiltered(wk[i].items).filter(x => x.from.slice(0,2) === h.slice(0,2));
                const isToday = iso === today();
                return `<td style="padding:3px;border-bottom:1px solid var(--line);border-left:1px solid var(--line);vertical-align:top;background:${isToday?'rgba(93,163,95,.04)':'transparent'}">
                  ${items.map(x => schChip(x, iso)).join('')}</td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${schLegend()}`;
}

function schChip(x, iso){
  const k = SCH_KINDS[x.kind];
  const [bg,fg] = toneVars(k.tone);
  const isLive = x.state === 'live';
  return `<div style="background:${isLive?'var(--coral)':bg};color:${isLive?'#fff':fg};border-radius:8px;padding:6px 8px;margin-bottom:3px;cursor:pointer;font-size:11px;line-height:1.32;${x.done?'opacity:.5':''}${isLive?'box-shadow:0 2px 10px rgba(239,106,90,.4)':''}"
    onclick="schOpen('${iso}','${x.id}')" title="${esc(x.title)} — ${x.from}–${x.to}">
    <b style="display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${isLive?'● ':''}${x.done?'✓ ':''}${esc(x.title)}</b>
    <span style="opacity:.78;font-size:9.5px">${x.from}–${x.to}</span></div>`;
}
function schLegend(){
  return `<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;margin-top:18px">
    ${Object.entries(SCH_KINDS).map(([k,v]) => `<span style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink-4)">
      <span style="width:11px;height:11px;border-radius:3px;background:${toneVars(v.tone)[0]}"></span>${v.name}</span>`).join('')}
  </div>`;
}
function schFilterBar(){
  return `<div class="pills mb" style="margin-bottom:16px">
    <button class="pill ${sch.filter==='all'?'on':''}" onclick="sch.filter='all';navTo('schedule')">Everything</button>
    <button class="pill ${sch.filter==='taught'?'on':''}" onclick="sch.filter='taught';navTo('schedule')"><i class="fa-solid fa-chalkboard-user"></i> Taught only</button>
    ${Object.entries(SCH_KINDS).map(([k,v]) => `<button class="pill ${sch.filter===k?'on':''}" onclick="sch.filter='${k}';navTo('schedule')"><i class="fa-solid ${v.ic}"></i> ${v.name}</button>`).join('')}
  </div>`;
}

/* ═══ AGENDA ═══ */
function schAgendaHTML(){
  const days = [];
  for (let i = 0; i < 21; i++){
    const iso = dayOffset(i);
    const items = schFiltered(schForDate(iso));
    if (items.length) days.push({ iso, items });
  }
  return `
    ${schHead()}
    ${schStats()}
    ${schFilterBar()}
    ${days.length ? `<div style="display:grid;gap:14px">
      ${days.map(d => {
        const dt = tutDate(d.iso), isToday = d.iso === today();
        return `<div class="card" style="${isToday?'border-color:var(--leaf-500)':''}">
          <div class="card-hd" style="${isToday?'background:var(--leaf-50)':''}">
            <div style="text-align:center;flex:0 0 48px">
              <div style="font-family:var(--display);font-size:21px;font-weight:700;line-height:1;color:${isToday?'var(--leaf-700)':'var(--ink)'}">${dt.getDate()}</div>
              <div style="font-size:9px;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${dt.toLocaleDateString('en-GB',{month:'short'})}</div></div>
            <div style="flex:1"><h3>${isToday?'Today':schWhen(d.iso)}</h3>
              <p>${dt.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · ${d.items.length} item${d.items.length===1?'':'s'}</p></div>
            ${isToday?'<span class="tag leaf">Today</span>':''}
          </div>
          <div class="card-bd flush">
            ${d.items.map(x => schRow(x, d.iso)).join('')}
          </div></div>`;
      }).join('')}
    </div>` : `<div class="empty"><i class="fa-regular fa-calendar"></i><b>Nothing scheduled</b>
        <span>${sch.filter==='all'?'No classes, sessions or study blocks in the next three weeks.':'Nothing matches this filter — try Everything.'}</span>
        <div style="margin-top:16px;display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
          ${!B.plan?`<button class="btn btn-p btn-sm" onclick="buildPlan();navTo('schedule')"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate a study plan</button>`:''}
          <button class="btn btn-g btn-sm" onclick="navTo('tutoring')"><i class="fa-solid fa-chalkboard-user"></i> Book a tutor</button>
        </div></div>`}`;
}

function schRow(x, iso){
  const k = SCH_KINDS[x.kind];
  const isLive = x.state === 'live', soon = x.state === 'soon';
  return `<div class="row" style="${x.done?'opacity:.6':''}">
    <div style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4);flex:0 0 84px">${x.from}–${x.to}</div>
    <div class="ic ${k.tone==='leaf'?'':k.tone}"><i class="fa-solid ${k.ic}"></i></div>
    <div class="tx" style="min-width:0">
      <b style="${x.done?'text-decoration:line-through':''}">${esc(x.title)}</b>
      <span>${esc(x.sub)} · ${esc(x.who)}</span></div>
    ${isLive?'<span class="tag cor">● live now</span>':soon?'<span class="tag amb">starting soon</span>':''}
    ${x.kind==='study'?`<div class="check ${x.done?'on':''}" onclick="event.stopPropagation();togglePlanTask('${x.id}');navTo('schedule')"><i class="fa-solid fa-check"></i></div>`:''}
    <button class="btn btn-g btn-sm" onclick="schOpen('${iso}','${x.id}')">Open</button>
  </div>`;
}

/* ═══ ONE DAY ═══ */
function schDayHTML(){
  const iso = sch.day;
  const items = schFiltered(schForDate(iso));
  const dt = tutDate(iso);
  return `
    ${phead({ eyebrow:'My schedule', title:dt.toLocaleDateString('en-GB',{weekday:'long'}).replace(/(\S+)/,'<em>$1</em>'),
      sub:dt.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) + ' · ' + items.length + ' item' + (items.length===1?'':'s'),
      actions:`<button class="btn btn-g btn-sm" onclick="sch.view='week';navTo('schedule')"><i class="fa-solid fa-arrow-left"></i> Week</button>
        <button class="btn btn-g btn-sm" onclick="sch.day='${dayOffsetFrom(iso,-1)}';navTo('schedule')"><i class="fa-solid fa-chevron-left"></i></button>
        <button class="btn btn-g btn-sm" onclick="sch.day='${dayOffsetFrom(iso,1)}';navTo('schedule')"><i class="fa-solid fa-chevron-right"></i></button>` })}
    ${items.length ? `<div class="card" style="max-width:760px"><div class="card-bd flush">
      ${items.map(x => schRow(x, iso)).join('')}
    </div></div>` : `<div class="empty"><i class="fa-regular fa-calendar"></i><b>Nothing on this day</b><span>A good day to catch up, or rest.</span></div>`}`;
}
function dayOffsetFrom(iso, n){ const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return tutISO(d); }

/* ── opening an entry hands off to the section that owns it ── */
function schOpen(iso, id){
  const x = schForDate(iso).find(i => i.id === id);
  if (!x) return;
  if (x.kind === 'study'){ navTo(x.go || 'plan'); return; }
  if (x.kind === 'tutor'){ navTo('tutoring'); return; }
  if (x.kind === 'exam'){ navTo('profile'); return; }
  /* a live or open class: jump straight into the room if it is running */
  if (typeof lvJoin === 'function' && x.state === 'live'){ lvJoin(x.id); return; }
  lv.wk = Math.floor((new Date(iso+'T00:00:00') - new Date(weekDates(0)[0]+'T00:00:00')) / 604800000);
  lv.view = 'home'; navTo('live');
}

/* ── export the whole schedule as one calendar file ── */
function schICS(){
  const ev = [];
  for (let i = -7; i < 42; i++){
    const iso = dayOffset(i);
    schForDate(iso).forEach(x => ev.push({ iso, x }));
  }
  if (!ev.length){ toast('Nothing to export yet'); return; }
  const pad = s => s.replace(/[-:]/g,'');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bloom IELTS Academy//My Schedule//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Bloom — my schedule'];
  ev.forEach(({ iso, x }) => {
    const k = SCH_KINDS[x.kind];
    lines.push('BEGIN:VEVENT',
      'UID:' + x.kind + '-' + x.id + '@bloomielts.com',
      'DTSTAMP:' + pad(new Date().toISOString().slice(0,19)) + 'Z',
      'DTSTART:' + pad(iso) + 'T' + pad(x.from) + '00',
      'DTEND:' + pad(iso) + 'T' + pad(x.to) + '00',
      'SUMMARY:' + k.name + ' — ' + x.title,
      'DESCRIPTION:' + x.sub + (x.who ? ' · ' + x.who : ''),
      'CATEGORIES:' + k.name,
      'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:' + x.title + ' in 30 minutes','END:VALARM',
      'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type:'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-schedule.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  toast(ev.length + ' entries exported — reminders set 30 minutes before', 'fa-calendar-plus');
}

function schPrint(){
  const wk = schWeekLoad(sch.wk), dates = wk.map(d => d.iso);
  const w = window.open('','_blank'); if (!w){ toast('Allow pop-ups to print'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>My schedule</title><style>
    @page{size:A4 landscape;margin:14mm}body{font-family:system-ui,sans-serif;font-size:9.5pt;color:#12211a}
    h1{font-size:19pt;color:#2f6b3a;margin:0 0 3px}.s{color:#5d7266;font-size:9pt;margin-bottom:14px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfdcd2;padding:5px;vertical-align:top}
    th{background:#eef4ec;font-size:8pt;text-transform:uppercase;letter-spacing:1px}
    .b{border-radius:4px;padding:3px 5px;margin-bottom:2px;font-size:8pt}
    .class{background:#e4f1dc}.open{background:#dcedf9}.tutor{background:#ebe5fb}.study{background:#fde9cb}.exam{background:#fde3df}
    .lg{margin-top:12px;font-size:8pt;color:#5d7266}</style></head><body>
    <h1>My schedule</h1>
    <div class="s">${esc(B.profile.name)} · ${typeof myCohort === 'function' ? esc(myCohort().name) : ''} · ${tutDate(dates[0]).toLocaleDateString('en-GB',{day:'numeric',month:'long'})} — ${tutDate(dates[6]).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
    <table><thead><tr><th style="width:40px"></th>${DAYS.map((d,i)=>`<th>${d} ${tutDate(dates[i]).getDate()}</th>`).join('')}</tr></thead><tbody>
    ${['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'].map(h=>`<tr>
      <td style="font-size:8pt;color:#5d7266">${h}</td>
      ${dates.map((iso,i)=>{ const items = wk[i].items.filter(x=>x.from.slice(0,2)===h.slice(0,2));
        return `<td>${items.map(x=>`<div class="b ${x.kind}"><b>${esc(x.title)}</b><br>${x.from}–${x.to}</div>`).join('')}</td>`; }).join('')}
    </tr>`).join('')}
    </tbody></table>
    <div class="lg">Live class · Open session · 1-on-1 · Self-study · Exam day</div>
    </body></html>`);
  w.document.close(); setTimeout(()=>w.print(),400);
}

/* ── dashboard strip: today at a glance ── */
function schDashCard(){
  const items = schForDate(today());
  if (!items.length) return '';
  const live = items.find(x => x.state === 'live');
  const next = items.find(x => !x.done && new Date(today() + 'T' + x.to) >= new Date());
  return `<div class="card mb2" style="${live?'border-color:var(--coral)':''}">
    <div class="card-hd">
      <div style="width:34px;height:34px;border-radius:11px;background:${live?'var(--coral)':'var(--leaf-100)'};color:${live?'#fff':'var(--leaf-700)'};display:grid;place-items:center"><i class="fa-regular fa-calendar-check"></i></div>
      <div style="flex:1"><h3>Today's schedule</h3>
        <p>${live ? '<b style="color:var(--coral)">' + esc(live.title) + ' is live now</b>' : next ? 'Next: ' + next.from + ' · ' + esc(next.title) : items.length + ' item' + (items.length===1?'':'s') + ' — all done'}</p></div>
      <button class="btn btn-g btn-sm" onclick="navTo('schedule')">Full schedule <i class="fa-solid fa-arrow-right"></i></button>
    </div>
    <div class="card-bd flush">${items.slice(0,4).map(x => schRow(x, today())).join('')}</div>
  </div>`;
}
