/* ═══ BLOOM — Faculty: teaching dashboard, weekly planner, roster ═══ */

let fac = { view:'home', wk:0, cohort:null, student:null, tab:'overview', lesson:null };

/* the signed-in teacher */
function me(){ return teacherOf(B.teacherId || 'em'); }
function myCohorts(){ return COHORTS.filter(c => c.teacher === me().id); }
function myStudents(){ const ids = myCohorts().map(c => c.id); return students().filter(s => ids.includes(s.cohort)); }
function mySessions(){ return tutBookings().filter(b => b.teacher === me().id && b.status === 'confirmed'); }

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function weekDates(off){
  const d = new Date(); const dow = (d.getDay()+6)%7;
  d.setDate(d.getDate() - dow + off*7);
  return DAYS.map((_,i) => { const x = new Date(d); x.setDate(d.getDate()+i); return tutISO(x); });
}

/* ═══ FACULTY DASHBOARD ═══ */
function sec_faculty(){
  const t = me(), cos = myCohorts(), sts = myStudents();
  const sessions = mySessions();
  const atRisk = sts.filter(s => s.risk === 'at-risk');
  const avgGain = sts.length ? (sts.reduce((a,s)=>a+(s.band-s.startBand),0)/sts.length) : 0;
  const marking = sts.reduce((a,s)=>a+(s.essays%3===0?1:0),0);
  return `
    ${phead({ eyebrow:`${t.role} · ${t.name}`, title:`Good ${new Date().getHours()<12?'morning':'afternoon'}, <em>${esc(t.name.split(' ').slice(-1)[0])}</em>`,
      sub:`You teach ${cos.length} cohort${cos.length===1?'':'s'} — ${sts.length} students — and have ${sessions.length} one-to-one session${sessions.length===1?'':'s'} booked.`,
      actions:`<button class="btn btn-g btn-sm" onclick="navTo('content')"><i class="fa-solid fa-cloud-arrow-up"></i> Upload content</button>
        <button class="btn btn-p" onclick="navTo('facultyplan')"><i class="fa-solid fa-calendar-days"></i> My planner</button>` })}

    <div class="grid g4 mb2">
      ${statCard('My students', sts.length, cos.length + ' cohort' + (cos.length===1?'':'s'), 'leaf', 'fa-users')}
      ${statCard('Average band gain', (avgGain>=0?'+':'') + avgGain.toFixed(2), 'Since placement', avgGain>=0.5?'leaf':'amb', 'fa-arrow-trend-up')}
      ${statCard('Awaiting marking', marking, marking?'Essays and recordings':'You are up to date', marking?'cor':'leaf', 'fa-pen-to-square')}
      ${statCard('At risk', atRisk.length, atRisk.length?'No activity for 7+ days':'Everyone is active', atRisk.length?'cor':'leaf', 'fa-triangle-exclamation')}
    </div>

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Today</h3><p>${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</p></div>
            <button class="btn btn-g btn-sm" onclick="navTo('facultyplan')">Full week <i class="fa-solid fa-arrow-right"></i></button></div>
          <div class="card-bd flush">
            ${(() => {
              const dow = DAYS[(new Date().getDay()+6)%7];
              const classes = cos.filter(c => c.days.includes(dow));
              const oneToOnes = sessions.filter(s => s.date === today());
              if (!classes.length && !oneToOnes.length) return `<div style="padding:26px;text-align:center;font-size:12.5px;color:var(--ink-4)">No teaching scheduled today. A good day for marking or recording.</div>`;
              return [...classes.map(c => ({ time:c.time, t:c.name, s:c.room + ' · ' + c.enrolled + ' students', ic:'fa-chalkboard', tone:'', go:`fac.cohort='${c.id}';fac.view='cohort';navTo('faculty')` })),
                      ...oneToOnes.map(b => ({ time:b.time+'–'+tutEnd(b.time), t:'1-on-1 · ' + (TUT_FOCUS.find(f=>f.id===b.focus)?.name||'English'), s:'With a student · ' + TUT_FORMATS[b.format].name, ic:'fa-user', tone:'vio', go:"navTo('tutoring')" }))]
                .map(r => `<div class="row">
                  <div style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4);flex:0 0 86px">${r.time}</div>
                  <div class="ic ${r.tone}"><i class="fa-solid ${r.ic}"></i></div>
                  <div class="tx"><b>${r.t}</b><span>${r.s}</span></div>
                  <button class="btn btn-g btn-sm" onclick="${r.go}">Open</button></div>`).join('');
            })()}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>My cohorts</h3><p>Click through for the roster and each student's progress</p></div></div>
          <div class="card-bd flush">
            ${cos.map(c => {
              const cs = students().filter(s => s.cohort === c.id);
              const avg = cs.length ? cs.reduce((a,s)=>a+s.band,0)/cs.length : 0;
              return `<div class="row" style="cursor:pointer" onclick="fac.cohort='${c.id}';fac.view='cohort';navTo('faculty')">
                <div class="ic"><i class="fa-solid fa-chalkboard"></i></div>
                <div class="tx"><b>${c.name}</b><span>${c.days.join(', ')} · ${c.time} · ${c.room}</span></div>
                <div style="text-align:right;flex:0 0 auto">
                  <div style="font-family:var(--mono);font-size:13px;font-weight:700">${c.enrolled}/${c.cap}</div>
                  <div style="font-size:10px;color:var(--ink-4)">avg ${bandLabel(avg)}</div></div>
                <i class="fa-solid fa-chevron-right" style="color:var(--line-2);font-size:11px"></i></div>`;
            }).join('') || '<div style="padding:24px;text-align:center;font-size:12.5px;color:var(--ink-4)">No cohorts assigned.</div>'}
          </div>
        </div>

        ${atRisk.length ? `
        <div class="card" style="border-color:var(--coral)">
          <div class="card-hd"><div style="flex:1"><h3>Needs your attention</h3><p>No activity for over a week</p></div>
            <span class="tag cor">${atRisk.length}</span></div>
          <div class="card-bd flush">
            ${atRisk.slice(0,6).map(s => `<div class="row">
              <div style="width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:var(--coral-soft);color:var(--coral);display:grid;place-items:center;font-size:10px;font-weight:800">${initials(s.name)}</div>
              <div class="tx"><b>${s.name}</b><span>Band ${bandLabel(s.band)} → ${bandLabel(s.target)} · last active ${s.lastActive} days ago</span></div>
              <button class="btn btn-g btn-sm" onclick="fac.student='${s.id}';fac.view='student';navTo('faculty')">Open</button>
              <button class="btn btn-p btn-sm" onclick="toast('Reminder emailed to ' + '${esc(s.name)}','fa-envelope')"><i class="fa-solid fa-envelope"></i></button></div>`).join('')}
          </div>
        </div>` : ''}
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>1-on-1 sessions</h3><p>Booked with you</p></div></div>
          <div class="card-bd flush">
            ${sessions.length ? sessions.slice(0,5).map(b => {
              const d = tutDate(b.date);
              return `<div class="row">
                <div style="text-align:center;flex:0 0 42px"><div style="font-family:var(--display);font-size:17px;font-weight:700;line-height:1">${d.getDate()}</div>
                  <div style="font-size:8.5px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
                <div class="tx"><b>${TUT_FOCUS.find(f=>f.id===b.focus)?.name||'English'}</b><span>${b.time} · ${TUT_FORMATS[b.format].name}</span>
                  ${b.note?`<span style="font-style:italic;margin-top:3px;display:block">“${esc(b.note.slice(0,70))}${b.note.length>70?'…':''}”</span>`:''}</div></div>`;
            }).join('') : '<div style="padding:22px;text-align:center;font-size:12.5px;color:var(--ink-4)">Nothing booked yet.</div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>My content</h3><p>Published into the School</p></div>
            <button class="btn btn-g btn-sm" onclick="navTo('content')">Manage</button></div>
          <div class="card-bd">
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
              ${[['Lectures', LECTURES.filter(l=>l.tutor===t.name).length + upByType('video').length, 'fa-circle-play','sky'],
                 ['Audio', upByType('audio').length, 'fa-headphones','amb'],
                 ['Notes & PDFs', upByType('pdf').length + upByType('notes').length, 'fa-note-sticky','cor'],
                 ['Quizzes', upByType('quiz').length, 'fa-list-check','vio']].map(([n,v,ic,tone])=>`
                <div style="padding:12px 13px;border:1px solid var(--line);border-radius:12px">
                  <div style="width:26px;height:26px;border-radius:8px;background:${toneVars(tone)[0]};color:${toneVars(tone)[1]};display:grid;place-items:center;font-size:10px;margin-bottom:8px"><i class="fa-solid ${ic}"></i></div>
                  <b style="font-family:var(--display);font-size:18px;font-weight:700;display:block;line-height:1">${v}</b>
                  <span style="font-size:10.5px;color:var(--ink-4)">${n}</span></div>`).join('')}
            </div>
            <button class="btn btn-p btn-blk" style="margin-top:12px" onclick="cmUpload()"><i class="fa-solid fa-cloud-arrow-up"></i> Upload something</button>
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Cohort band spread</h3><p>Where your students sit right now</p></div></div>
          <div class="card-bd">
            ${(() => {
              const buckets = [[0,4.5,'Below 4.5'],[4.5,5.5,'4.5 – 5.0'],[5.5,6.5,'5.5 – 6.0'],[6.5,7.5,'6.5 – 7.0'],[7.5,10,'7.5+']];
              const max = Math.max(1, ...buckets.map(([lo,hi]) => sts.filter(s=>s.band>=lo&&s.band<hi).length));
              return buckets.map(([lo,hi,l]) => { const n = sts.filter(s=>s.band>=lo&&s.band<hi).length;
                return `<div class="prow"><div class="lb"><span>${l}</span><b>${n}</b></div>
                  <div class="bar"><i style="width:${n/max*100}%;background:${hi<=5.5?'var(--coral)':hi<=6.5?'var(--amber)':'var(--ok)'}"></i></div></div>`;
              }).join('');
            })()}
          </div>
        </div>
      </div>
    </div>`;
}

/* ═══ FACULTY PLANNER ═══ */
function sec_facultyplan(){
  if (fac.lesson) return facLessonHTML();
  const t = me(), cos = myCohorts();
  const dates = weekDates(fac.wk);
  const sessions = mySessions();
  const slots = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

  /* build the grid: classes from cohorts, 1-on-1s from bookings, plus prep/marking blocks */
  const cell = (dayIdx, hour) => {
    const iso = dates[dayIdx], dow = DAYS[dayIdx];
    const out = [];
    cos.filter(c => c.days.includes(dow)).forEach(c => {
      const [from] = c.time.split('–');
      if (from.slice(0,2) === hour.slice(0,2)) out.push({ kind:'class', c, t:c.name, s:c.time + ' · ' + c.room, tone:'leaf' });
    });
    sessions.filter(b => b.date === iso && b.time.slice(0,2) === hour.slice(0,2))
      .forEach(b => out.push({ kind:'1on1', b, t:'1-on-1 · ' + (TUT_FOCUS.find(f=>f.id===b.focus)?.name||'English'), s:b.time+'–'+tutEnd(b.time), tone:'vio' }));
    /* recurring admin blocks */
    if (dow === 'Fri' && hour === '15:00') out.push({ kind:'mark', t:'Marking block', s:'Essays and recordings', tone:'amb' });
    if (dow === 'Wed' && hour === '13:00') out.push({ kind:'prep', t:'Lesson prep', s:'Next week\'s materials', tone:'sky' });
    if (dow === 'Mon' && hour === '08:00') out.push({ kind:'staff', t:'Faculty stand-up', s:'15 minutes', tone:'cor' });
    return out;
  };
  const busy = dates.reduce((n,_,i) => n + slots.reduce((m,h) => m + cell(i,h).length, 0), 0);
  const teachHrs = cos.reduce((n,c) => { const [a,b] = c.time.split('–'); return n + c.days.length * ((+b.slice(0,2)) - (+a.slice(0,2))); }, 0);

  return `
    ${phead({ eyebrow:'Faculty planner', title:`My teaching <em>week</em>`,
      sub:`${teachHrs} contact hours across ${cos.length} cohort${cos.length===1?'':'s'}, plus one-to-one sessions, marking and prep.`,
      actions:`<button class="btn btn-g btn-sm" onclick="facPrint()"><i class="fa-solid fa-print"></i> Print timetable</button>
        <button class="btn btn-p btn-sm" onclick="facLessonNew()"><i class="fa-solid fa-plus"></i> Plan a lesson</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Contact hours', teachHrs + 'h', 'Scheduled class time', 'leaf', 'fa-chalkboard')}
      ${statCard('1-on-1 sessions', sessions.filter(s=>dates.includes(s.date)).length, 'This week', 'vio', 'fa-user')}
      ${statCard('Blocks this week', busy, 'Classes, sessions, prep and marking', 'sky', 'fa-calendar-week')}
      ${statCard('Lesson plans', (B.lessons||[]).length, (B.lessons||[]).length?'Saved and reusable':'None written yet', 'amb', 'fa-clipboard-list')}
    </div>

    <div class="card mb2">
      <div class="card-hd">
        <button class="btn btn-g btn-sm" onclick="fac.wk--;navTo('facultyplan')"><i class="fa-solid fa-chevron-left"></i></button>
        <div style="flex:1;text-align:center"><h3>${tutDate(dates[0]).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${tutDate(dates[6]).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</h3>
          <p>${fac.wk===0?'This week':fac.wk>0?'In '+fac.wk+' week'+(fac.wk===1?'':'s'):Math.abs(fac.wk)+' week'+(fac.wk===-1?'':'s')+' ago'}</p></div>
        <button class="btn btn-g btn-sm" onclick="fac.wk++;navTo('facultyplan')"><i class="fa-solid fa-chevron-right"></i></button>
        ${fac.wk!==0?`<button class="btn btn-g btn-sm" onclick="fac.wk=0;navTo('facultyplan')">Today</button>`:''}
      </div>
      <div class="card-bd" style="padding:0;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;min-width:900px">
          <thead><tr>
            <th style="width:62px;padding:11px 8px;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800;border-bottom:1px solid var(--line);background:var(--paper)"></th>
            ${DAYS.map((d,i) => { const iso = dates[i], isToday = iso === today();
              return `<th style="padding:11px 8px;border-bottom:1px solid var(--line);border-left:1px solid var(--line);background:${isToday?'var(--leaf-50)':'var(--paper)'};text-align:center">
                <div style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:${isToday?'var(--leaf-700)':'var(--ink-4)'};font-weight:800">${d}</div>
                <div style="font-family:var(--display);font-size:16px;font-weight:700;color:${isToday?'var(--leaf-700)':'var(--ink)'}">${tutDate(iso).getDate()}</div></th>`;
            }).join('')}
          </tr></thead>
          <tbody>
            ${slots.map(h => `<tr>
              <td style="padding:6px 8px;font-family:var(--mono);font-size:10.5px;color:var(--ink-4);border-bottom:1px solid var(--line);vertical-align:top;text-align:right">${h}</td>
              ${DAYS.map((_,i) => {
                const items = cell(i,h);
                const isToday = dates[i] === today();
                return `<td style="padding:4px;border-bottom:1px solid var(--line);border-left:1px solid var(--line);vertical-align:top;min-height:40px;background:${isToday?'rgba(93,163,95,.04)':'transparent'}">
                  ${items.map(x => { const [bg,fg] = toneVars(x.tone);
                    return `<div style="background:${bg};color:${fg};border-radius:8px;padding:6px 8px;margin-bottom:3px;cursor:pointer;font-size:11px;line-height:1.35" onclick="${x.kind==='class'?`fac.cohort='${x.c.id}';fac.view='cohort';navTo('faculty')`:x.kind==='1on1'?"navTo('tutoring')":`toast('${x.t} — protected time in your week','fa-clock')`}">
                      <b style="display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.t}</b>
                      <span style="opacity:.78;font-size:10px">${x.s}</span></div>`;
                  }).join('')}
                </td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Lesson plans</h3><p>Reusable plans tied to an exam part</p></div>
          <button class="btn btn-p btn-sm" onclick="facLessonNew()"><i class="fa-solid fa-plus"></i> New plan</button></div>
        <div class="card-bd flush">
          ${(B.lessons||[]).length ? B.lessons.map(l => `<div class="row">
            <div class="ic"><i class="fa-solid fa-clipboard-list"></i></div>
            <div class="tx"><b>${esc(l.title)}</b><span>${partOf(l.part).name} · ${l.mins} min · ${l.stages.length} stages</span></div>
            <button class="btn btn-g btn-sm" onclick="facLessonEdit('${l.id}')">Open</button>
            <button class="icobtn" style="width:28px;height:28px;font-size:11px" onclick="facLessonDel('${l.id}')"><i class="fa-solid fa-trash"></i></button></div>`).join('')
          : `<div style="padding:26px;text-align:center"><div style="font-size:12.5px;color:var(--ink-4);margin-bottom:13px">No lesson plans yet. A plan is a sequence of timed stages you can reuse with any cohort.</div>
              <button class="btn btn-p btn-sm" onclick="facLessonNew()"><i class="fa-solid fa-plus"></i> Write your first plan</button></div>`}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Term calendar</h3><p>What is coming for your cohorts</p></div></div>
        <div class="card-bd flush">
          ${TERM_EVENTS.filter(e => e.d >= today()).slice(0,7).map(e => {
            const k = EVENT_KINDS[e.kind], d = tutDate(e.d);
            return `<div class="row">
              <div style="text-align:center;flex:0 0 42px"><div style="font-family:var(--display);font-size:16px;font-weight:700;line-height:1">${d.getDate()}</div>
                <div style="font-size:8.5px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
              <div class="ic ${k.tone==='leaf'?'':k.tone}"><i class="fa-solid ${k.ic}"></i></div>
              <div class="tx"><b>${e.t}</b><span>${e.who}</span></div></div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ── LESSON PLAN EDITOR ── */
const LESSON_STAGE_KINDS = ['Warmer','Presentation','Controlled practice','Freer practice','Exam task','Feedback','Homework'];
function facLessonNew(){
  fac.lesson = { id:null, title:'', part:'w2', mins:90, cohort:myCohorts()[0]?.id||'', aim:'',
    stages:[{ k:'Warmer', mins:10, what:'', mat:'' },{ k:'Presentation', mins:20, what:'', mat:'' },{ k:'Controlled practice', mins:25, what:'', mat:'' },{ k:'Exam task', mins:25, what:'', mat:'' },{ k:'Feedback', mins:10, what:'', mat:'' }] };
  navTo('facultyplan');
}
function facLessonEdit(id){ const l = (B.lessons||[]).find(x=>x.id===id); if (!l) return; fac.lesson = JSON.parse(JSON.stringify(l)); navTo('facultyplan'); }
function facLessonDel(id){ if (!confirm('Delete this lesson plan?')) return; B.lessons = (B.lessons||[]).filter(x=>x.id!==id); save(); navTo('facultyplan'); toast('Plan deleted'); }

function facLessonHTML(){
  const l = fac.lesson;
  const total = l.stages.reduce((s,x)=>s+(+x.mins||0),0);
  const mats = matsFor(l.part), lecs = lecsFor(l.part), auds = audFor(l.part), ups = publishedFor(l.part);
  return `
    ${phead({ eyebrow:'Faculty planner · Lesson plan', title:l.id?`Edit <em>plan</em>`:`New lesson <em>plan</em>`,
      sub:'A sequence of timed stages tied to one exam part, with the School materials each stage uses.',
      actions:`<button class="btn btn-g btn-sm" onclick="fac.lesson=null;navTo('facultyplan')">Cancel</button>
        <button class="btn btn-p" onclick="facLessonSave()"><i class="fa-solid fa-check"></i> Save plan</button>` })}

    <div class="card mb2"><div class="card-bd">
      <div class="fgrid">
        <div class="fg full"><label>Lesson title</label><input value="${esc(l.title)}" placeholder="e.g. Task 2 — writing an overview under time pressure" oninput="fac.lesson.title=this.value"></div>
        <div class="fg"><label>Exam part</label><select onchange="fac.lesson.part=this.value;navTo('facultyplan')">${PARTS.map(p=>`<option value="${p.id}" ${l.part===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
        <div class="fg"><label>Cohort</label><select onchange="fac.lesson.cohort=this.value">${myCohorts().map(c=>`<option value="${c.id}" ${l.cohort===c.id?'selected':''}>${c.name}</option>`).join('')}</select></div>
        <div class="fg full"><label>Main aim — what students can do by the end</label><input value="${esc(l.aim)}" placeholder="Students can write a two-sentence overview identifying the two clearest patterns in any chart." oninput="fac.lesson.aim=this.value"></div>
      </div>
    </div></div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Stages</h3><p>${total} minutes planned</p></div>
          <button class="btn btn-g btn-sm" onclick="facStageAdd()"><i class="fa-solid fa-plus"></i> Add stage</button></div>
        <div class="card-bd" style="display:grid;gap:11px">
          ${l.stages.map((s,i) => `
            <div style="border:1px solid var(--line);border-radius:13px;padding:14px 15px">
              <div style="display:flex;gap:10px;align-items:center;margin-bottom:11px">
                <div style="width:26px;height:26px;flex:0 0 26px;border-radius:8px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;font-family:var(--mono);font-size:11px;font-weight:800">${i+1}</div>
                <select style="border:1.5px solid var(--line-2);border-radius:9px;padding:6px 10px;font-family:inherit;font-size:12.5px;background:var(--surface);color:var(--ink)" onchange="fac.lesson.stages[${i}].k=this.value">
                  ${LESSON_STAGE_KINDS.map(k=>`<option ${s.k===k?'selected':''}>${k}</option>`).join('')}</select>
                <input type="number" value="${s.mins}" min="1" max="120" style="width:70px;border:1.5px solid var(--line-2);border-radius:9px;padding:6px 10px;font-family:var(--mono);font-size:12.5px;background:var(--surface);color:var(--ink)" oninput="fac.lesson.stages[${i}].mins=+this.value;facTotal()">
                <span style="font-size:11px;color:var(--ink-4)">min</span>
                <div style="flex:1"></div>
                ${l.stages.length>1?`<button class="icobtn" style="width:26px;height:26px;font-size:10px" onclick="facStageDel(${i})"><i class="fa-solid fa-xmark"></i></button>`:''}
              </div>
              <textarea rows="2" placeholder="What happens in this stage" style="border:1.5px solid var(--line-2);border-radius:10px;padding:9px 11px;font-family:inherit;font-size:13px;width:100%;background:var(--surface);color:var(--ink);margin-bottom:8px" oninput="fac.lesson.stages[${i}].what=this.value">${esc(s.what)}</textarea>
              <select style="width:100%;border:1.5px solid var(--line-2);border-radius:10px;padding:8px 11px;font-family:inherit;font-size:12.5px;background:var(--surface);color:var(--ink)" onchange="fac.lesson.stages[${i}].mat=this.value">
                <option value="">No material</option>
                ${mats.map(m=>`<option value="${m.title}" ${s.mat===m.title?'selected':''}>Notes · ${m.title}</option>`).join('')}
                ${auds.map(a=>`<option value="${a.title}" ${s.mat===a.title?'selected':''}>Audio · ${a.title}</option>`).join('')}
                ${lecs.map(x=>`<option value="${x.title}" ${s.mat===x.title?'selected':''}>Lecture · ${x.title}</option>`).join('')}
                ${ups.map(u=>`<option value="${u.title}" ${s.mat===u.title?'selected':''}>${UP_TYPES[u.type].name} · ${u.title}</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card"><div class="card-bd" style="text-align:center">
          ${ringHTML(Math.min(100, total/l.mins*100), total + '′', 'planned', 120, total>l.mins?'var(--coral)':'var(--leaf-500)')}
          <div style="margin-top:14px;font-size:12.5px;color:var(--ink-3)">${total>l.mins?`${total-l.mins} minutes over a ${l.mins}-minute lesson`:total<l.mins?`${l.mins-total} minutes still to fill`:'Exactly the lesson length'}</div>
          <div class="fg" style="margin-top:14px"><label>Lesson length</label>
            <select onchange="fac.lesson.mins=+this.value;navTo('facultyplan')">${[45,60,90,120,150].map(m=>`<option value="${m}" ${l.mins===m?'selected':''}>${m} minutes</option>`).join('')}</select></div>
        </div></div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Available for ${partOf(l.part).name}</h3><p>Everything in the School for this part</p></div></div>
          <div class="card-bd" style="display:grid;gap:8px;font-size:12.5px">
            ${[['Notes & PDFs',mats.length,'fa-note-sticky'],['Audio',auds.length,'fa-headphones'],['Lectures',lecs.length,'fa-circle-play'],['Your uploads',ups.length,'fa-cloud-arrow-up']].map(([n,v,ic])=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px dashed var(--line)">
                <span style="color:var(--ink-3)"><i class="fa-solid ${ic}" style="width:15px;color:var(--ink-4)"></i> ${n}</span><b style="font-family:var(--mono)">${v}</b></div>`).join('')}
            <button class="btn btn-g btn-blk" style="margin-top:6px" onclick="facLessonSave(true)"><i class="fa-solid fa-cloud-arrow-up"></i> Save and add material</button>
          </div>
        </div>
      </div>
    </div>`;
}
function facTotal(){ /* recompute on next render */ }
function facStageAdd(){ fac.lesson.stages.push({ k:'Freer practice', mins:15, what:'', mat:'' }); navTo('facultyplan'); }
function facStageDel(i){ fac.lesson.stages.splice(i,1); navTo('facultyplan'); }
function facLessonSave(thenUpload){
  const l = fac.lesson;
  if (!l.title.trim()){ toast('Give the lesson a title'); return; }
  B.lessons = B.lessons || [];
  const rec = { ...l, id: l.id || ('ls'+Date.now().toString(36)), at:today(), by:me().id };
  if (l.id){ const i = B.lessons.findIndex(x=>x.id===l.id); B.lessons[i] = rec; } else B.lessons.unshift(rec);
  save(); fac.lesson = null;
  if (thenUpload){ navTo('content'); cmUpload(); return; }
  navTo('facultyplan'); toast('Lesson plan saved', 'fa-clipboard-check');
}

function facPrint(){
  const t = me(), cos = myCohorts(), dates = weekDates(fac.wk);
  const w = window.open('','_blank'); if (!w){ toast('Allow pop-ups to print'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Teaching timetable</title><style>
    @page{size:A4 landscape;margin:14mm}body{font-family:system-ui,sans-serif;font-size:9.5pt;color:#12211a}
    h1{font-size:18pt;color:#2f6b3a;margin:0 0 3px}.s{color:#5d7266;font-size:9pt;margin-bottom:14px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfdcd2;padding:5px;vertical-align:top}
    th{background:#eef4ec;font-size:8pt;text-transform:uppercase;letter-spacing:1px}
    .b{background:#e4f1dc;border-radius:4px;padding:3px 5px;margin-bottom:2px;font-size:8pt}</style></head><body>
    <h1>Teaching timetable</h1><div class="s">${esc(t.name)} · ${tutDate(dates[0]).toLocaleDateString('en-GB',{day:'numeric',month:'long'})} — ${tutDate(dates[6]).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
    <table><thead><tr><th></th>${DAYS.map((d,i)=>`<th>${d} ${tutDate(dates[i]).getDate()}</th>`).join('')}</tr></thead><tbody>
    ${['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(h=>`<tr><td style="width:42px;font-size:8pt;color:#5d7266">${h}</td>
      ${DAYS.map(d=>{ const cs = cos.filter(c=>c.days.includes(d)&&c.time.split('–')[0].slice(0,2)===h.slice(0,2));
        return `<td>${cs.map(c=>`<div class="b"><b>${c.name}</b><br>${c.time} · ${c.room}</div>`).join('')}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></body></html>`);
  w.document.close(); setTimeout(()=>w.print(),400);
}

/* ═══ ROSTER ═══ */
function sec_roster(){
  if (fac.view === 'student' && fac.student) return facStudentHTML();
  if (fac.view === 'cohort' && fac.cohort) return facCohortHTML();
  const sts = myStudents();
  return `
    ${phead({ eyebrow:'Faculty', title:`My <em>students</em>`, sub:`${sts.length} students across ${myCohorts().length} cohorts. Sorted by who needs you most.` })}
    ${facTableHTML(sts)}`;
}
function facCohortHTML(){
  const c = cohortOf(fac.cohort);
  const sts = students().filter(s => s.cohort === c.id);
  const avg = sts.length ? sts.reduce((a,s)=>a+s.band,0)/sts.length : 0;
  const gain = sts.length ? sts.reduce((a,s)=>a+(s.band-s.startBand),0)/sts.length : 0;
  return `
    ${phead({ eyebrow:'Cohort', title:c.name.replace(/(\S+)$/,'<em>$1</em>'),
      sub:`${c.days.join(', ')} · ${c.time} · ${c.room} · ${c.weeks} weeks from ${c.start}`,
      actions:`<button class="btn btn-g btn-sm" onclick="fac.view='home';navTo('faculty')"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button class="btn btn-p btn-sm" onclick="facLessonNew()"><i class="fa-solid fa-clipboard-list"></i> Plan a lesson</button>` })}
    <div class="grid g4 mb2">
      ${statCard('Enrolled', c.enrolled + ' / ' + c.cap, pct(c.enrolled,c.cap) + '% full', 'leaf', 'fa-users')}
      ${statCard('Average band', bandLabel(avg), 'Across the cohort', 'sky', 'fa-chart-simple')}
      ${statCard('Average gain', (gain>=0?'+':'') + gain.toFixed(2), 'Since placement', gain>=0.5?'leaf':'amb', 'fa-arrow-trend-up')}
      ${statCard('At risk', sts.filter(s=>s.risk==='at-risk').length, 'Inactive 7+ days', 'cor', 'fa-triangle-exclamation')}
    </div>
    ${facTableHTML(sts)}`;
}
function facTableHTML(sts){
  const order = { 'at-risk':0, 'behind':1, 'on-track':2 };
  const sorted = [...sts].sort((a,b) => order[a.risk] - order[b.risk] || a.band - b.band);
  return `<div class="card"><div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Student</th><th>Cohort</th><th>Track</th><th>Band</th><th>Target</th><th>Gain</th><th>Activity</th><th>Status</th><th></th></tr></thead>
    <tbody>${sorted.map(s => `<tr>
      <td><div style="display:flex;gap:10px;align-items:center">
        <div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${initials(s.name)}</div>
        <div><b style="color:var(--ink);display:block">${s.name}</b><span style="font-size:11px;color:var(--ink-4)">${s.country} · ${s.l1}</span></div></div></td>
      <td style="font-size:12px">${cohortOf(s.cohort).name.split('·')[0].trim()}</td>
      <td><span class="tag ${typeof hasBlueprint==='function'&&hasBlueprint(trackOf(s))?'amb':'leaf'}">${examOf(trackOf(s)).short}</span></td>
      <td><b style="font-family:var(--mono);font-size:13px">${bandLabel(s.band)}</b></td>
      <td style="font-family:var(--mono);color:var(--ink-4)">${bandLabel(s.target)}</td>
      <td style="font-family:var(--mono);color:${s.band>s.startBand?'var(--ok)':'var(--ink-4)'}">${s.band>s.startBand?'+':''}${(s.band-s.startBand).toFixed(2)}</td>
      <td style="font-size:12px">${s.lastActive===0?'today':s.lastActive+'d ago'}</td>
      <td><span class="tag ${s.risk==='at-risk'?'cor':s.risk==='behind'?'amb':'ok'}">${s.risk==='at-risk'?'At risk':s.risk==='behind'?'Behind':'On track'}</span></td>
      <td style="text-align:right"><button class="btn btn-g btn-sm" onclick="fac.student='${s.id}';fac.view='student';navTo('${B.role==='admin'?'people':'roster'}')">Open</button></td>
    </tr>`).join('')}</tbody></table></div></div></div>`;
}
function facStudentHTML(){
  const s = studentOf(fac.student); if (!s) { fac.view='home'; return sec_faculty(); }
  const c = cohortOf(s.cohort);
  return `
    ${phead({ eyebrow:'Student record · ' + s.id, title:s.name.replace(/(\S+)$/,'<em>$1</em>'),
      sub:`${c.name} · ${s.country} · first language ${s.l1} · joined ${s.joined}`,
      actions:`<button class="btn btn-g btn-sm" onclick="fac.view='home';fac.student=null;navTo('${B.role==='admin'?'people':'roster'}')"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button class="btn btn-g btn-sm" onclick="trackAssignModal('${s.id}')"><i class="fa-solid fa-layer-group"></i> Exam track</button>
        <button class="btn btn-g btn-sm" onclick="toast('Message sent to ' + '${esc(s.name)}','fa-envelope')"><i class="fa-solid fa-envelope"></i> Message</button>
        <button class="btn btn-p btn-sm" onclick="toast('Progress report generated','fa-file-lines')"><i class="fa-solid fa-file-lines"></i> Report</button>` })}
    <div class="grid g4 mb2">
      ${statCard('Current band', bandLabel(s.band), 'Started at ' + bandLabel(s.startBand), 'leaf', 'fa-chart-line')}
      ${statCard('Target', bandLabel(s.target), (s.target-s.band>0?bandLabel(s.target-s.band)+' to go':'At target'), s.band>=s.target?'leaf':'amb', 'fa-bullseye')}
      ${statCard('Study hours', s.hours + 'h', s.streak + ' day streak', 'sky', 'fa-clock')}
      ${statCard('Last active', s.lastActive===0?'Today':s.lastActive+'d ago', s.risk==='at-risk'?'Needs chasing':'Engaged', s.risk==='at-risk'?'cor':'leaf', 'fa-signal')}
    </div>
    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Work submitted</h3></div></div>
        <div class="card-bd">
          ${[['Writing tasks',s.essays,'fa-pen-nib'],['Speaking recordings',s.speeches,'fa-microphone'],['Mock exams',s.mocks,'fa-clipboard-list']].map(([n,v,ic])=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)">
              <span style="font-size:13px;color:var(--ink-2)"><i class="fa-solid ${ic}" style="width:18px;color:var(--ink-4)"></i> ${n}</span>
              <b style="font-family:var(--mono);font-size:14px">${v}</b></div>`).join('')}
          <div style="margin-top:14px;padding:13px 15px;background:var(--amber-soft);border-radius:11px;font-size:12.5px;color:#7a5410;line-height:1.55">
            <b>Watch for:</b> as a ${s.l1} speaker, ${l1Traps(s.l1)[0].charAt(0).toLowerCase() + l1Traps(s.l1)[0].slice(1)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Progress to target</h3></div></div>
        <div class="card-bd" style="text-align:center">
          ${ringHTML(Math.min(100, Math.round(s.band/s.target*100)), bandLabel(s.band), 'of ' + bandLabel(s.target), 130, s.band>=s.target?'var(--ok)':'var(--leaf-500)')}
          <div style="margin-top:16px;display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
            <span class="tag">${s.cefr}</span><span class="tag leaf">${s.plan}</span><span class="tag ${s.paid?'ok':'cor'}">${s.paid?'Paid':'Unpaid'}</span>
            <span class="tag ${typeof hasBlueprint==='function'&&hasBlueprint(trackOf(s))?'amb':''}"><i class="fa-solid ${examOf(trackOf(s)).ic}"></i> ${examOf(trackOf(s)).short}</span></div>
          <div style="margin-top:11px;font-size:11.5px;color:var(--ink-4)">${s.assignedBy ? 'Track assigned by ' + esc(s.assignedBy) + ' on ' + s.assignedAt : 'Exam chosen by the student'}</div>
        </div>
      </div>
    </div>`;
}
