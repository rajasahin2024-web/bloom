/* ═══ BLOOM — Admin: overview, administrative planner, people, operations, analytics ═══ */

let adm = { view:'home', tab:'students', q:'', cohort:'', risk:'', mo:0, task:null, drag:null };

function allStudents(){ return students(); }
function revenueMonth(){
  const price = { PREMIUM:520, PLUS:340, CORE:190 };
  return allStudents().filter(s=>s.paid).reduce((a,s)=>a+price[s.plan],0);
}
function outstanding(){
  const price = { PREMIUM:520, PLUS:340, CORE:190 };
  return allStudents().filter(s=>!s.paid).reduce((a,s)=>a+price[s.plan],0);
}

/* ═══ ADMIN OVERVIEW ═══ */
function sec_admin(){
  const sts = allStudents();
  const atRisk = sts.filter(s=>s.risk==='at-risk');
  const avgGain = sts.reduce((a,s)=>a+(s.band-s.startBand),0)/sts.length;
  const hitTarget = sts.filter(s=>s.band>=s.target).length;
  const cap = COHORTS.reduce((a,c)=>a+c.cap,0), enr = COHORTS.reduce((a,c)=>a+c.enrolled,0);
  const upcoming = TERM_EVENTS.filter(e=>e.d>=today()).slice(0,5);
  const openTasks = ADMIN_TASKS.filter(t=>t.col!=='done');

  return `
    ${phead({ eyebrow:'Administration', title:`Welcome back, <em>Administrator</em>`,
      sub:`A summary of admissions, finances and academic operations. ${sts.length} active students across ${COHORTS.length} cohorts and ${TEACHERS.length} teachers.`,
      actions:`<button class="btn btn-g btn-sm" onclick="admExport()"><i class="fa-solid fa-file-arrow-down"></i> Export</button>
        <button class="btn btn-p" onclick="admEnrol()"><i class="fa-solid fa-plus"></i> New admission</button>` })}

    <div class="grid g4 mb2">
      <div class="stat" style="background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700));border:none;color:#fff">
        <div class="l" style="color:var(--leaf-300)">Total students</div>
        <div class="v" style="color:#fff">${sts.length}</div>
        <div class="s" style="color:rgba(255,255,255,.6)">${sts.length} active students in the system</div></div>
      ${statCard('Fees collected', '£' + revenueMonth().toLocaleString(), sts.filter(s=>s.paid).length + ' paid this month', 'ok', 'fa-sterling-sign')}
      ${statCard('Pending fees', '£' + outstanding().toLocaleString(), sts.filter(s=>!s.paid).length + ' students', 'cor', 'fa-file-invoice')}
      ${statCard('Premium track', sts.filter(s=>s.plan==='PREMIUM').length, pct(sts.filter(s=>s.plan==='PREMIUM').length,sts.length) + '% of students', 'amb', 'fa-crown')}
    </div>

    <div class="card mb2">
      <div class="card-hd">
        <div style="width:34px;height:34px;border-radius:10px;background:var(--coral);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-video"></i></div>
        <div style="flex:1"><h3>Live classes</h3><p>Add class links — students see them instantly on their dashboard</p></div>
        <button class="btn btn-p btn-sm" onclick="liveNew()"><i class="fa-solid fa-plus"></i> Add live class</button></div>
      <div class="card-bd flush">${(typeof liveSorted==='function'?liveSorted().slice(0,4):[]).map(c=>liveCard(c,true)).join('')}</div>
      ${typeof liveSorted==='function'&&liveSorted().length>4?`<div style="padding:12px;text-align:center;border-top:1px solid var(--line)">
        <button class="btn btn-g btn-sm" onclick="ops.acad='schedule';navTo('academic')">View all ${liveSorted().length} <i class="fa-solid fa-chevron-down"></i></button></div>`:''}
    </div>

    <div class="split mb2">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Cohort health</h3><p>Enrolment, average band and progress for every running cohort</p></div>
          <button class="btn btn-g btn-sm" onclick="navTo('operations')">Operations <i class="fa-solid fa-arrow-right"></i></button></div>
        <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Cohort</th><th>Teacher</th><th>Enrolled</th><th>Avg band</th><th>Gain</th><th>Schedule</th></tr></thead>
          <tbody>${COHORTS.map(c => {
            const cs = sts.filter(s=>s.cohort===c.id);
            const avg = cs.length?cs.reduce((a,s)=>a+s.band,0)/cs.length:0;
            const g = cs.length?cs.reduce((a,s)=>a+(s.band-s.startBand),0)/cs.length:0;
            const full = pct(c.enrolled,c.cap);
            return `<tr>
              <td><b style="color:var(--ink)">${c.name}</b><div style="font-size:11px;color:var(--ink-4)">${examOf(c.exam).short} · ${c.level}</div></td>
              <td style="font-size:12px">${teacherOf(c.teacher).name}</td>
              <td><div style="display:flex;gap:8px;align-items:center"><b style="font-family:var(--mono)">${c.enrolled}/${c.cap}</b>
                <div class="bar thin" style="width:52px"><i style="width:${full}%;background:${full>=90?'var(--ok)':full>=50?'var(--amber)':'var(--coral)'}"></i></div></div></td>
              <td style="font-family:var(--mono)">${cs.length?bandLabel(avg):'—'}</td>
              <td style="font-family:var(--mono);color:${g>0.4?'var(--ok)':'var(--ink-4)'}">${g>0?'+':''}${g.toFixed(2)}</td>
              <td style="font-size:11.5px;color:var(--ink-4)">${c.days.join(', ')} · ${c.time}</td></tr>`;
          }).join('')}</tbody></table></div></div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Open tasks</h3><p>${openTasks.length} outstanding</p></div>
            <button class="btn btn-g btn-sm" onclick="navTo('adminplan')">Board</button></div>
          <div class="card-bd flush">
            ${openTasks.slice(0,5).map(t => `<div class="row">
              <div style="width:7px;height:7px;border-radius:50%;flex:0 0 7px;background:${t.pri==='high'?'var(--coral)':t.pri==='med'?'var(--amber)':'var(--line-2)'}"></div>
              <div class="tx"><b class="clip">${t.t}</b><span>${t.owner==='admin'?'Administration':teacherOf(t.owner).name} · due ${t.due}</span></div>
              <span class="tag ${t.col==='doing'?'amb':''}">${t.col==='doing'?'In progress':'To do'}</span></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Coming up</h3><p>Academic calendar</p></div></div>
          <div class="card-bd flush">
            ${upcoming.map(e => { const k = EVENT_KINDS[e.kind], d = tutDate(e.d);
              return `<div class="row">
                <div style="text-align:center;flex:0 0 40px"><div style="font-family:var(--display);font-size:16px;font-weight:700;line-height:1">${d.getDate()}</div>
                  <div style="font-size:8.5px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
                <div class="ic ${k.tone==='leaf'?'':k.tone}"><i class="fa-solid ${k.ic}"></i></div>
                <div class="tx"><b class="clip">${e.t}</b><span>${e.who}</span></div></div>`; }).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Band distribution</h3><p>Every active student, by current band</p></div></div>
        <div class="card-bd">${admBandChart(sts)}</div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Teaching load</h3><p>Cohorts and 1-on-1 sessions per teacher</p></div>
          <button class="btn btn-g btn-sm" onclick="adm.tab='teachers';navTo('people')">Staff</button></div>
        <div class="card-bd">
          ${TEACHERS.map(t => {
            const cs = COHORTS.filter(c=>c.teacher===t.id);
            const hrs = cs.reduce((n,c)=>{const [a,b]=c.time.split('–');return n+c.days.length*((+b.slice(0,2))-(+a.slice(0,2)));},0);
            const max = 20;
            return `<div class="prow"><div class="lb"><span>${t.name}</span><b>${hrs}h · ${cs.length} cohort${cs.length===1?'':'s'}</b></div>
              <div class="bar"><i style="width:${Math.min(100,hrs/max*100)}%;background:${hrs>16?'var(--coral)':hrs>10?'var(--amber)':'var(--ok)'}"></i></div></div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="split" style="margin-top:16px">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Nationalities</h3><p>Top origins — ${sts.length} total represented</p></div></div>
        <div class="card-bd">
          ${(() => { const by = {}; sts.forEach(s => by[s.country] = (by[s.country]||0)+1);
            const top = Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,9);
            const other = sts.length - top.reduce((a,x)=>a+x[1],0);
            const rows = other > 0 ? [...top, ['Other', other]] : top;
            const max = Math.max(...rows.map(r=>r[1]));
            return rows.map(([c,n]) => `<div style="display:flex;gap:11px;align-items:center;margin-bottom:9px">
              <span style="flex:0 0 78px;font-size:11.5px;color:var(--ink-3);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c}</span>
              <div style="flex:1;height:9px;border-radius:5px;background:var(--paper-2);overflow:hidden"><div style="width:${n/max*100}%;height:100%;background:${c==='Other'?'var(--line-2)':'var(--leaf-500)'};border-radius:5px"></div></div>
              <b style="flex:0 0 26px;font-family:var(--mono);font-size:11.5px;text-align:right">${n}</b></div>`).join('');
          })()}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Course enrolment</h3><p>Distribution across programmes</p></div></div>
        <div class="card-bd">
          ${(() => { const tones = ['leaf','amb','sky','vio','cor',''];
            return COHORTS.map((c,i) => { const n = sts.filter(s=>s.cohort===c.id).length; if (!n) return '';
              const [bg,fg] = toneVars(tones[i%tones.length]);
              return `<div style="margin-bottom:13px">
                <div style="display:flex;gap:9px;align-items:center;margin-bottom:6px">
                  <span class="tag" style="background:${bg};color:${fg}">${examOf(c.exam).short}</span>
                  <span style="flex:1;font-size:12.5px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</span>
                  <b style="font-family:var(--mono);font-size:12px">${n} · ${pct(n,sts.length)}%</b></div>
                <div class="bar thin"><i style="width:${pct(n,sts.length)}%;background:${fg}"></i></div></div>`;
            }).join('');
          })()}
        </div>
      </div>
    </div>

    <div class="split" style="margin-top:16px">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Recent admissions</h3><p>Latest five students enrolled in the system</p></div>
          <button class="btn btn-g btn-sm" onclick="navTo('admissions')">View all <i class="fa-solid fa-arrow-right"></i></button></div>
        <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Student</th><th>ID</th><th>Course</th><th>Origin</th><th>Status</th><th>Progress</th></tr></thead>
          <tbody>${sts.slice(0,5).map(s => `<tr>
            <td><b style="color:var(--ink)">${s.name}</b></td>
            <td style="font-family:var(--mono);font-size:11px">${s.id}</td>
            <td style="font-size:12px">${cohortOf(s.cohort).name.split('·')[0].trim()}</td>
            <td style="font-size:12px">${s.country}</td>
            <td><span class="tag ok">Active</span></td>
            <td><div style="display:flex;gap:8px;align-items:center"><div class="bar thin" style="width:52px"><i style="width:${pct(s.band,9)}%"></i></div>
              <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${s.band?bandLabel(s.band):'—'}</span></div></td></tr>`).join('')}
          </tbody></table></div></div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Activity</h3><p>Recent events across the system</p></div>
          <button class="btn btn-g btn-sm" onclick="ops.view='log';navTo('comms')">View all <i class="fa-solid fa-arrow-right"></i></button></div>
        <div class="card-bd flush" style="max-height:420px;overflow-y:auto">
          ${(typeof ACTIVITY_LOG!=='undefined'?ACTIVITY_LOG:[]).slice(0,8).map(l => { const k = LOG_KINDS[l.kind];
            return `<div class="row" style="align-items:flex-start">
              <div class="ic ${k.tone}"><i class="fa-solid ${k.ic}"></i></div>
              <div class="tx"><b style="font-weight:600;line-height:1.5">${esc(l.t)}</b><span>${l.who}</span></div>
              <span style="font-family:var(--mono);font-size:10px;color:var(--ink-4);flex:0 0 auto"><i class="fa-regular fa-clock"></i> ${l.at}</span></div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function admBandChart(sts){
  const buckets = [];
  for (let b = 3.5; b <= 9; b += 0.5) buckets.push({ b, n: sts.filter(s=>s.band===b).length });
  const max = Math.max(1, ...buckets.map(x=>x.n));
  return `<div style="display:flex;gap:5px;align-items:flex-end;height:150px">
    ${buckets.map(x => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end">
      <span style="font-family:var(--mono);font-size:10px;color:var(--ink-3);font-weight:700">${x.n||''}</span>
      <div style="width:100%;height:${Math.max(3, x.n/max*82)}%;background:${x.b<5.5?'var(--coral)':x.b<6.5?'var(--amber)':'var(--leaf-500)'};border-radius:6px 6px 0 0" title="Band ${bandLabel(x.b)} · ${x.n} students"></div>
      <span style="font-family:var(--mono);font-size:9px;color:var(--ink-4)">${bandLabel(x.b)}</span></div>`).join('')}
  </div>`;
}

/* ═══ ADMINISTRATIVE PLANNER ═══ */
function sec_adminplan(){
  const dates = tutMonthDates(adm.mo);
  const first = tutDate(dates[0]);
  const lead = (first.getDay()+6)%7;
  const byDay = {}; TERM_EVENTS.forEach(e => { (byDay[e.d] = byDay[e.d] || []).push(e); });
  COHORTS.forEach(c => { (byDay[c.start] = byDay[c.start] || []).push({ d:c.start, t:c.name + ' starts', kind:'term', who:c.enrolled + ' enrolled' }); });

  return `
    ${phead({ eyebrow:'Administration', title:`Administrative <em>planner</em>`,
      sub:'The term calendar, the task board and the operational deadlines that keep the school running.',
      actions:`<button class="btn btn-g btn-sm" onclick="admPrintCal()"><i class="fa-solid fa-print"></i> Print calendar</button>
        <button class="btn btn-p btn-sm" onclick="admTaskNew()"><i class="fa-solid fa-plus"></i> New task</button>` })}

    <div class="card mb2">
      <div class="card-hd">
        <button class="btn btn-g btn-sm" onclick="adm.mo--;navTo('adminplan')"><i class="fa-solid fa-chevron-left"></i></button>
        <div style="flex:1;text-align:center"><h3>${first.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</h3>
          <p>${Object.keys(byDay).filter(d=>d.startsWith(dates[0].slice(0,7))).length} scheduled events</p></div>
        <button class="btn btn-g btn-sm" onclick="adm.mo++;navTo('adminplan')"><i class="fa-solid fa-chevron-right"></i></button>
        ${adm.mo!==0?`<button class="btn btn-g btn-sm" onclick="adm.mo=0;navTo('adminplan')">Today</button>`:''}
      </div>
      <div class="card-bd" style="padding:14px">
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
          ${DAYS.map(d=>`<div style="text-align:center;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800;padding-bottom:6px">${d}</div>`).join('')}
          ${Array.from({length:lead},()=>'<div></div>').join('')}
          ${dates.map(iso => {
            const evs = byDay[iso] || [], d = tutDate(iso), isToday = iso === today();
            return `<div style="min-height:82px;border:1px solid ${isToday?'var(--leaf-500)':'var(--line)'};border-radius:11px;padding:7px;background:${isToday?'var(--leaf-50)':'var(--surface)'};overflow:hidden">
              <div style="font-family:var(--mono);font-size:11px;font-weight:${isToday?'800':'400'};color:${isToday?'var(--leaf-700)':'var(--ink-4)'};margin-bottom:5px">${d.getDate()}</div>
              ${evs.slice(0,3).map(e => { const k = EVENT_KINDS[e.kind], [bg,fg] = toneVars(k.tone);
                return `<div style="background:${bg};color:${fg};border-radius:6px;padding:3px 6px;margin-bottom:3px;font-size:9.5px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(e.t)} — ${esc(e.who)}">${esc(e.t)}</div>`;
              }).join('')}
              ${evs.length>3?`<div style="font-size:9px;color:var(--ink-4)">+${evs.length-3} more</div>`:''}</div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
          ${Object.entries(EVENT_KINDS).map(([k,v])=>`<span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ink-4)">
            <span style="width:10px;height:10px;border-radius:3px;background:${toneVars(v.tone)[0]}"></span>${v.name}</span>`).join('')}
        </div>
      </div>
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Task board</h3><p>Drag between columns, or click a task to edit it</p></div>
        <button class="btn btn-p btn-sm" onclick="admTaskNew()"><i class="fa-solid fa-plus"></i> New task</button></div>
      <div class="card-bd">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:13px" class="admboard">
          ${TASK_COLS.map(([col,label]) => {
            const items = admTasks().filter(t => t.col === col);
            return `<div ondragover="event.preventDefault()" ondrop="admDrop('${col}')" style="background:var(--paper);border-radius:14px;padding:12px;min-height:180px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">
                <span style="font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${label}</span>
                <span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${items.length}</span></div>
              <div style="display:grid;gap:8px">
                ${items.map(t => `<div draggable="true" ondragstart="adm.drag='${t.id}'" onclick="admTaskEdit('${t.id}')" style="background:var(--surface);border:1px solid var(--line);border-left:3px solid ${t.pri==='high'?'var(--coral)':t.pri==='med'?'var(--amber)':'var(--line-2)'};border-radius:11px;padding:11px 13px;cursor:grab">
                  <b style="font-size:12.5px;display:block;line-height:1.35;margin-bottom:5px;${t.col==='done'?'text-decoration:line-through;color:var(--ink-4)':''}">${esc(t.t)}</b>
                  <div style="font-size:11px;color:var(--ink-4);line-height:1.45;margin-bottom:7px">${esc(t.note)}</div>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <span class="tag ${t.pri==='high'?'cor':t.pri==='med'?'amb':''}">${t.pri==='high'?'High':t.pri==='med'?'Medium':'Low'}</span>
                    <span style="font-family:var(--mono);font-size:10px;color:${t.due<today()&&t.col!=='done'?'var(--coral)':'var(--ink-4)'}">${t.due}</span>
                    <span style="margin-left:auto;font-size:10px;color:var(--ink-4)">${t.owner==='admin'?'Admin':teacherOf(t.owner).init}</span></div>
                </div>`).join('') || `<div style="text-align:center;padding:20px 8px;font-size:11.5px;color:var(--ink-4)">Nothing here</div>`}
              </div></div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Term dates</h3><p>Full academic calendar</p></div></div>
        <div class="card-bd flush">
          ${TERM_EVENTS.map(e => { const k = EVENT_KINDS[e.kind], past = e.d < today();
            return `<div class="row" style="${past?'opacity:.5':''}">
              <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);flex:0 0 74px">${e.d.slice(5)}</div>
              <div class="ic ${k.tone==='leaf'?'':k.tone}"><i class="fa-solid ${k.ic}"></i></div>
              <div class="tx"><b>${e.t}</b><span>${e.who}</span></div>
              ${past?'<i class="fa-solid fa-check" style="color:var(--ok)"></i>':`<span class="tag">${Math.round((new Date(e.d)-new Date(today()))/86400000)}d</span>`}</div>`;
          }).join('')}
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Room &amp; resource allocation</h3><p>Where each cohort meets</p></div></div>
          <div class="card-bd flush">
            ${[...new Set(COHORTS.map(c=>c.room))].map(room => {
              const cs = COHORTS.filter(c=>c.room===room);
              const days = [...new Set(cs.flatMap(c=>c.days))];
              return `<div class="row"><div class="ic sky"><i class="fa-solid fa-door-open"></i></div>
                <div class="tx"><b>${room}</b><span>${cs.length} cohort${cs.length===1?'':'s'} · ${days.join(', ')}</span></div>
                <span class="tag ${days.length>=4?'amb':'ok'}">${days.length>=4?'Heavy use':'Available'}</span></div>`;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Deadlines this month</h3></div></div>
          <div class="card-bd flush">
            ${admTasks().filter(t=>t.col!=='done').sort((a,b)=>a.due.localeCompare(b.due)).slice(0,6).map(t=>`
              <div class="row"><div style="font-family:var(--mono);font-size:11px;color:${t.due<today()?'var(--coral)':'var(--ink-4)'};flex:0 0 74px">${t.due.slice(5)}</div>
                <div class="tx"><b class="clip">${esc(t.t)}</b><span>${t.owner==='admin'?'Administration':teacherOf(t.owner).name}</span></div>
                <span class="tag ${t.pri==='high'?'cor':'amb'}">${t.pri}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <style>@media(max-width:860px){.admboard{grid-template-columns:1fr!important}}</style>`;
}

function admTasks(){ B.tasks = B.tasks || JSON.parse(JSON.stringify(ADMIN_TASKS)); return B.tasks; }
function admDrop(col){
  const t = admTasks().find(x => x.id === adm.drag); if (!t) return;
  t.col = col; adm.drag = null; save(); navTo('adminplan');
  toast('Moved to ' + TASK_COLS.find(c=>c[0]===col)[1], 'fa-arrows-up-down-left-right');
}
function admTaskNew(){ adm.task = { id:null, t:'', owner:'admin', due:dayOffset(7), pri:'med', col:'todo', note:'' }; admTaskModal(); }
function admTaskEdit(id){ const t = admTasks().find(x=>x.id===id); if (!t) return; adm.task = {...t}; admTaskModal(); }
function admTaskModal(){
  const t = adm.task;
  modal(`<div class="modal-hd"><div style="flex:1"><h3>${t.id?'Edit task':'New task'}</h3><p>Appears on the board and in the deadline list</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Task</label><input id="atT" value="${esc(t.t)}" placeholder="e.g. Book IELTS test slots for November"></div>
      <div class="fg full"><label>Notes</label><textarea id="atN" rows="2">${esc(t.note)}</textarea></div>
      <div class="fg"><label>Owner</label><select id="atO"><option value="admin" ${t.owner==='admin'?'selected':''}>Administration</option>
        ${TEACHERS.map(x=>`<option value="${x.id}" ${t.owner===x.id?'selected':''}>${x.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Due</label><input id="atD" type="date" value="${t.due}"></div>
      <div class="fg"><label>Priority</label><select id="atP">${[['high','High'],['med','Medium'],['low','Low']].map(([v,l])=>`<option value="${v}" ${t.pri===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="fg"><label>Column</label><select id="atC">${TASK_COLS.map(([v,l])=>`<option value="${v}" ${t.col===v?'selected':''}>${l}</option>`).join('')}</select></div>
    </div></div>
    <div class="modal-ft">
      ${t.id?`<button class="btn btn-g" style="margin-right:auto;color:var(--err)" onclick="admTaskDel('${t.id}')"><i class="fa-solid fa-trash"></i> Delete</button>`:''}
      <button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="admTaskSave()"><i class="fa-solid fa-check"></i> Save</button></div>`, 560);
}
function admTaskSave(){
  const g = id => document.getElementById(id).value;
  const t = { id: adm.task.id || 'tk'+Date.now().toString(36), t:g('atT').trim(), note:g('atN').trim(), owner:g('atO'), due:g('atD'), pri:g('atP'), col:g('atC') };
  if (!t.t){ toast('Give the task a name'); return; }
  const list = admTasks();
  if (adm.task.id){ const i = list.findIndex(x=>x.id===adm.task.id); list[i] = t; } else list.unshift(t);
  save(); closeModal(); navTo('adminplan'); toast('Task saved', 'fa-clipboard-check');
}
function admTaskDel(id){ B.tasks = admTasks().filter(x=>x.id!==id); save(); closeModal(); navTo('adminplan'); toast('Task deleted'); }

/* ═══ PEOPLE ═══ */
function sec_people(){
  if (fac.view === 'student' && fac.student) return facStudentHTML();
  const sts = allStudents();
  const q = adm.q.trim().toLowerCase();
  let list = sts.filter(s => (!adm.cohort || s.cohort === adm.cohort) && (!adm.risk || s.risk === adm.risk));
  if (q) list = list.filter(s => (s.name + ' ' + s.email + ' ' + s.id + ' ' + s.country).toLowerCase().includes(q));

  return `
    ${phead({ eyebrow:'Administration', title:`People`.replace('People','<em>People</em>'),
      sub:`${sts.length} students and ${TEACHERS.length} teachers. Search, filter and open any record.`,
      actions:`<button class="btn btn-g btn-sm" onclick="admCSV()"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
        <button class="btn btn-p btn-sm" onclick="admEnrol()"><i class="fa-solid fa-user-plus"></i> Enrol student</button>` })}

    <div class="seg mb" style="margin-bottom:16px">
      <button class="${adm.tab==='students'?'on':''}" onclick="adm.tab='students';navTo('people')">Students <b style="font-family:var(--mono);margin-left:5px">${sts.length}</b></button>
      <button class="${adm.tab==='teachers'?'on':''}" onclick="adm.tab='teachers';navTo('people')">Teachers <b style="font-family:var(--mono);margin-left:5px">${TEACHERS.length}</b></button>
      <button class="${adm.tab==='staff'?'on':''}" onclick="adm.tab='staff';navTo('people')">Staff <b style="font-family:var(--mono);margin-left:5px">${STAFF.length}</b></button>
    </div>

    ${adm.tab === 'staff' ? admStaffHTML() : adm.tab === 'teachers' ? `
      <div class="grid g2">
        ${TEACHERS.map(t => {
          const cs = COHORTS.filter(c=>c.teacher===t.id);
          const n = students().filter(s=>cs.some(c=>c.id===s.cohort)).length;
          return `<div class="card"><div class="card-bd" style="display:flex;gap:15px;align-items:flex-start">
            <div style="width:48px;height:48px;flex:0 0 48px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:14px;font-weight:800">${t.init}</div>
            <div style="flex:1;min-width:0">
              <b style="font-size:15px;display:block">${t.name}</b>
              <div style="font-size:12px;color:var(--ink-4);margin:3px 0 9px">${t.role} · ${t.years} years · ${t.from}</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">${t.skills.map(s=>`<span class="tag leaf">${TUT_FOCUS.find(f=>f.id===s)?.name||s}</span>`).join('')}</div>
              <div style="display:flex;gap:16px;font-size:11.5px;color:var(--ink-3)">
                <span><b style="font-family:var(--mono);color:var(--ink)">${cs.length}</b> cohorts</span>
                <span><b style="font-family:var(--mono);color:var(--ink)">${n}</b> students</span>
                <span><b style="font-family:var(--mono);color:var(--ink)">${t.rating}</b> rating</span></div>
            </div>
            <button class="btn btn-g btn-sm" onclick="B.teacherId='${t.id}';save();toast('Viewing as ' + '${esc(t.name)}','fa-user');switchRole('teacher')">View as</button>
          </div></div>`;
        }).join('')}
      </div>`
    : `
      <div class="card mb2"><div class="card-bd" style="padding:13px 17px;display:flex;gap:11px;flex-wrap:wrap;align-items:center">
        <div class="search" style="flex:1;min-width:220px"><i class="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Search by name, email, ID or country…" value="${esc(adm.q)}" oninput="adm.q=this.value;clearTimeout(window.__adT);window.__adT=setTimeout(()=>navTo('people'),250)"></div>
        <select style="border:1.5px solid var(--line-2);border-radius:11px;padding:9px 12px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" onchange="adm.cohort=this.value;navTo('people')">
          <option value="">All cohorts</option>${COHORTS.map(c=>`<option value="${c.id}" ${adm.cohort===c.id?'selected':''}>${c.name}</option>`).join('')}</select>
        <select style="border:1.5px solid var(--line-2);border-radius:11px;padding:9px 12px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" onchange="adm.risk=this.value;navTo('people')">
          <option value="">All statuses</option>${[['on-track','On track'],['behind','Behind'],['at-risk','At risk']].map(([v,l])=>`<option value="${v}" ${adm.risk===v?'selected':''}>${l}</option>`).join('')}</select>
        <span style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4)">${list.length} shown</span>
      </div></div>
      ${list.length?facTableHTML(list):`<div class="empty"><i class="fa-solid fa-users"></i><b>No students match</b><span>Try clearing a filter.</span></div>`}`}`;
}

function admEnrol(){
  modal(`<div class="modal-hd"><div style="flex:1"><h3>Enrol a student</h3><p>They receive a welcome email with their placement test link</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Full name</label><input id="enN" placeholder="Full name"></div>
      <div class="fg full"><label>Email</label><input id="enE" type="email" placeholder="student@email.com"></div>
      <div class="fg"><label>Cohort</label><select id="enC">${COHORTS.map(c=>`<option value="${c.id}">${c.name} (${c.enrolled}/${c.cap})</option>`).join('')}</select></div>
      <div class="fg"><label>Plan</label><select id="enP"><option>PREMIUM</option><option selected>PLUS</option><option>CORE</option></select></div>
      <div class="fg"><label>Country</label><select id="enCo">${COUNTRIES.map(c=>`<option>${c}</option>`).join('')}</select></div>
      <div class="fg"><label>First language</label><select id="enL">${L1.map(c=>`<option>${c}</option>`).join('')}</select></div>
    </div>
    <div style="margin-top:15px;padding:13px 15px;background:var(--leaf-50);border-radius:11px;font-size:12.5px;color:var(--ink-2);line-height:1.55">
      <i class="fa-solid fa-circle-info" style="color:var(--leaf-600);margin-right:6px"></i>The student is asked to take the placement test before their first class, so their teacher has a real level to plan from.</div>
    </div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="admEnrolSave()"><i class="fa-solid fa-user-plus"></i> Enrol &amp; send invite</button></div>`, 580);
}
function admEnrolSave(){
  const n = document.getElementById('enN').value.trim();
  if (!n){ toast('Enter a name'); return; }
  const co = document.getElementById('enC').value;
  const s = {
    id:'S'+(1000+students().length), name:n, email:document.getElementById('enE').value.trim()||n.toLowerCase().replace(/\s+/g,'.')+'@email.com',
    country:document.getElementById('enCo').value, l1:document.getElementById('enL').value,
    cohort:co, exam:cohortOf(co).exam, startBand:0, band:0, target:7, cefr:'—', joined:today(),
    lastActive:0, streak:0, hours:0, essays:0, speeches:0, mocks:0, plan:document.getElementById('enP').value, paid:false, risk:'on-track',
  };
  students().unshift(s);
  const c = cohortOf(co); c.enrolled = Math.min(c.cap, c.enrolled + 1);
  closeModal(); navTo('people');
  toast(n + ' enrolled · welcome email sent', 'fa-user-plus');
}
function admCSV(){
  const rows = [['ID','Name','Email','Country','L1','Cohort','Plan','Start band','Current band','Target','Gain','Hours','Streak','Last active (days)','Status','Paid']];
  allStudents().forEach(s => rows.push([s.id,s.name,s.email,s.country,s.l1,cohortOf(s.cohort).name,s.plan,s.startBand,s.band,s.target,(s.band-s.startBand).toFixed(2),s.hours,s.streak,s.lastActive,s.risk,s.paid?'yes':'no']));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-students-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('Exported ' + allStudents().length + ' student records', 'fa-file-csv');
}

/* ═══ NON-TEACHING STAFF ═══ */
function admStaffHTML(){
  const lead = staffOf('mf');
  return `
    <div class="card mb2" style="border-color:var(--leaf-500);background:linear-gradient(180deg,var(--leaf-50),var(--surface) 55%)">
      <div class="card-bd" style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
        <div style="width:62px;height:62px;flex:0 0 62px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-900),var(--leaf-600));color:#fff;display:grid;place-items:center;font-family:var(--display);font-size:20px;font-weight:700">${lead.init}</div>
        <div style="flex:1;min-width:250px">
          <div style="font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:6px">Operational Leader</div>
          <b style="font-family:var(--display);font-size:22px;font-weight:700;letter-spacing:-.6px;display:block">${lead.name}</b>
          <div style="font-size:13px;color:var(--ink-3);line-height:1.65;margin-top:8px;max-width:560px">${lead.bio}</div>
          <div style="margin-top:14px;padding:13px 16px;background:var(--surface);border-left:3px solid var(--leaf-500);border-radius:0 10px 10px 0;font-size:12.5px;font-style:italic;color:var(--ink-2);line-height:1.6">“${lead.quote}”</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px">${lead.owns.map(o=>`<span class="tag leaf">${o}</span>`).join('')}</div>
        </div>
        <div style="display:grid;gap:9px;min-width:180px;font-size:12.5px">
          ${[['Department',lead.dept],['At Bloom since',lead.since],['Email',lead.email],['Languages',lead.langs.join(' · ')]].map(([l,v])=>`
            <div style="display:flex;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px dashed var(--line)">
              <span style="color:var(--ink-4)">${l}</span><b style="text-align:right;color:var(--ink-2)">${v}</b></div>`).join('')}
        </div>
      </div>
    </div>

    ${DEPTS.map(d => {
      const list = STAFF.filter(s => s.dept === d && s.id !== 'mf');
      if (!list.length) return '';
      return `<div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:13px">
          <h3 style="font-family:var(--display);font-size:16px;font-weight:700;letter-spacing:-.3px">${d}</h3>
          <div style="flex:1;height:1px;background:var(--line)"></div>
          <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${list.length} ${list.length===1?'person':'people'}</span>
        </div>
        <div class="grid g2">
          ${list.map(s => `<div class="card"><div class="card-bd" style="display:flex;gap:14px;align-items:flex-start">
            <div style="width:44px;height:44px;flex:0 0 44px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-400));color:#fff;display:grid;place-items:center;font-size:13px;font-weight:800">${s.init}</div>
            <div style="flex:1;min-width:0">
              <b style="font-size:14.5px;display:block">${s.name}</b>
              <div style="font-size:12px;color:var(--leaf-700);font-weight:700;margin:3px 0 8px">${s.role}</div>
              <div style="font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-bottom:10px">${s.bio}</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px">${s.owns.map(o=>`<span class="tag">${o}</span>`).join('')}</div>
              <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${s.email} · since ${s.since} · ${s.langs.join(', ')}</div>
            </div></div></div>`).join('')}
        </div>
      </div>`;
    }).join('')}`;
}

/* ═══ OPERATIONS ═══ */
function sec_operations(){
  const sts = allStudents();
  const unpaid = sts.filter(s=>!s.paid);
  const price = { PREMIUM:520, PLUS:340, CORE:190 };
  return `
    ${phead({ eyebrow:'Administration', title:`<em>Operations</em>`,
      sub:'Cohort capacity, billing, exam entries and the operational detail behind the school.',
      actions:`<button class="btn btn-g btn-sm" onclick="admCSV()"><i class="fa-solid fa-file-csv"></i> Export</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Seats filled', COHORTS.reduce((a,c)=>a+c.enrolled,0) + ' / ' + COHORTS.reduce((a,c)=>a+c.cap,0), pct(COHORTS.reduce((a,c)=>a+c.enrolled,0),COHORTS.reduce((a,c)=>a+c.cap,0)) + '% utilisation', 'leaf', 'fa-chair')}
      ${statCard('Collected', '£' + revenueMonth().toLocaleString(), sts.filter(s=>s.paid).length + ' paid this month', 'ok', 'fa-sterling-sign')}
      ${statCard('Outstanding', '£' + outstanding().toLocaleString(), unpaid.length + ' unpaid invoices', 'cor', 'fa-file-invoice')}
      ${statCard('Exam entries', 49, 'October and November sittings', 'sky', 'fa-file-signature')}
    </div>

    <div class="split mb2">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Cohort capacity</h3><p>Where you can still take enrolments</p></div></div>
        <div class="card-bd">
          ${COHORTS.map(c => { const p = pct(c.enrolled,c.cap);
            return `<div class="prow"><div class="lb"><span>${c.name}</span><b>${c.enrolled}/${c.cap} · ${p}%</b></div>
              <div class="bar"><i style="width:${p}%;background:${p>=100?'var(--coral)':p>=80?'var(--amber)':'var(--ok)'}"></i></div>
              <div style="font-size:11px;color:var(--ink-4);margin-top:4px">${teacherOf(c.teacher).name} · ${c.room} · starts ${c.start}${p<50?' · <b style="color:var(--coral)">under-enrolled</b>':''}</div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Unpaid invoices</h3><p>£${outstanding().toLocaleString()} outstanding</p></div>
          <button class="btn btn-p btn-sm" onclick="toast(${unpaid.length} + ' reminders sent','fa-envelope')"><i class="fa-solid fa-envelope"></i> Chase all</button></div>
        <div class="card-bd flush">
          ${unpaid.slice(0,8).map(s => `<div class="row">
            <div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--coral-soft);color:var(--coral);display:grid;place-items:center;font-size:10px;font-weight:800">${initials(s.name)}</div>
            <div class="tx"><b>${s.name}</b><span>${s.plan} · ${cohortOf(s.cohort).name.split('·')[0].trim()}</span></div>
            <b style="font-family:var(--mono);font-size:13px;color:var(--coral)">£${price[s.plan]}</b>
            <button class="icobtn" style="width:28px;height:28px;font-size:10px" title="Send reminder" onclick="toast('Reminder sent to ' + '${esc(s.name)}','fa-envelope')"><i class="fa-solid fa-envelope"></i></button></div>`).join('')}
          ${unpaid.length>8?`<div style="padding:12px 21px;font-size:12px;color:var(--ink-4)">+${unpaid.length-8} more</div>`:''}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Plan mix</h3><p>Revenue by product tier</p></div></div>
      <div class="card-bd">
        <div class="grid g3">
          ${['PREMIUM','PLUS','CORE'].map(p => { const n = sts.filter(s=>s.plan===p).length, rev = sts.filter(s=>s.plan===p&&s.paid).length*price[p];
            return `<div style="padding:16px 18px;border:1px solid var(--line);border-radius:14px">
              <div style="font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:7px">${p}</div>
              <div style="font-family:var(--display);font-size:26px;font-weight:700;letter-spacing:-1px">${n}</div>
              <div style="font-size:12px;color:var(--ink-4);margin-top:4px">students · £${rev.toLocaleString()} collected</div>
              <div class="bar thin" style="margin-top:10px"><i style="width:${pct(n,sts.length)}%;background:${p==='PREMIUM'?'var(--leaf-600)':p==='PLUS'?'var(--amber)':'var(--sky)'}"></i></div></div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ═══ ANALYTICS ═══ */
function sec_analytics(){
  const sts = allStudents();
  const avgGain = sts.reduce((a,s)=>a+(s.band-s.startBand),0)/sts.length;
  const byCountry = {}; sts.forEach(s => byCountry[s.country] = (byCountry[s.country]||0)+1);
  const top = Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const byL1 = {}; sts.forEach(s => byL1[s.l1] = (byL1[s.l1]||0)+1);
  const retention = Math.round(sts.filter(s=>s.lastActive<=7).length / sts.length * 100);
  return `
    ${phead({ eyebrow:'Administration', title:`School <em>analytics</em>`,
      sub:'Outcomes, engagement and intake across every cohort.',
      actions:`<button class="btn btn-g btn-sm" onclick="admExport()"><i class="fa-solid fa-print"></i> Board report</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Average gain', '+' + avgGain.toFixed(2), 'bands since placement', 'leaf', 'fa-arrow-trend-up')}
      ${statCard('At target', pct(sts.filter(s=>s.band>=s.target).length, sts.length) + '%', sts.filter(s=>s.band>=s.target).length + ' of ' + sts.length + ' students', 'ok', 'fa-bullseye')}
      ${statCard('7-day retention', retention + '%', 'Active in the last week', retention>=70?'leaf':'amb', 'fa-signal')}
      ${statCard('Average study time', Math.round(sts.reduce((a,s)=>a+s.hours,0)/sts.length) + 'h', 'per student to date', 'sky', 'fa-clock')}
    </div>

    <div class="split mb2">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Band gain by cohort</h3><p>Which cohorts move students fastest</p></div></div>
        <div class="card-bd">
          ${COHORTS.map(c => { const cs = sts.filter(s=>s.cohort===c.id); if (!cs.length) return '';
            const g = cs.reduce((a,s)=>a+(s.band-s.startBand),0)/cs.length;
            return `<div class="prow"><div class="lb"><span>${c.name}</span><b>+${g.toFixed(2)} · ${cs.length} students</b></div>
              <div class="bar"><i style="width:${Math.min(100,g/1.5*100)}%;background:${g>=1?'var(--ok)':g>=0.5?'var(--amber)':'var(--coral)'}"></i></div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Where students come from</h3><p>Top eight countries</p></div></div>
        <div class="card-bd">
          ${top.map(([c,n]) => `<div class="prow"><div class="lb"><span>${c}</span><b>${n}</b></div>
            <div class="bar thin"><i style="width:${n/top[0][1]*100}%"></i></div></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Band distribution</h3></div></div>
        <div class="card-bd">${admBandChart(sts)}</div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>First languages</h3><p>Drives which grammar errors we target</p></div></div>
        <div class="card-bd">
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${Object.entries(byL1).sort((a,b)=>b[1]-a[1]).slice(0,14).map(([l,n])=>`
              <span class="pill" style="cursor:default">${l} <span class="n">${n}</span></span>`).join('')}
          </div>
          <div style="margin-top:16px;padding:14px 16px;background:var(--amber-soft);border-radius:12px;font-size:12.5px;color:#7a5410;line-height:1.6">
            <b>Curriculum note:</b> ${Object.entries(byL1).sort((a,b)=>b[1]-a[1])[0][0]} is your largest first-language group. ${l1Traps(Object.entries(byL1).sort((a,b)=>b[1]-a[1])[0][0])[0]}</div>
        </div>
      </div>
    </div>`;
}

function admExport(){
  const sts = allStudents();
  const avgGain = sts.reduce((a,s)=>a+(s.band-s.startBand),0)/sts.length;
  const w = window.open('','_blank'); if (!w){ toast('Allow pop-ups to print'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Bloom — school report</title><style>
    @page{size:A4;margin:18mm}body{font-family:system-ui,sans-serif;color:#12211a;font-size:11pt;line-height:1.55}
    h1{font-size:24pt;color:#2f6b3a;margin:0}.s{color:#5d7266;font-size:10pt;margin-bottom:22px}
    h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:1.5px;color:#5da35f;margin:24px 0 8px;border-bottom:1px solid #e3ebe4;padding-bottom:5px}
    table{width:100%;border-collapse:collapse}th{text-align:left;font-size:8.5pt;text-transform:uppercase;letter-spacing:1px;color:#5d7266;padding:6px 0;border-bottom:1px solid #cfdcd2}
    td{padding:7px 0;border-bottom:1px solid #e3ebe4}.b{font-weight:700}
    .ft{margin-top:26px;font-size:8.5pt;color:#8b9d93}</style></head><body>
    <h1>School report</h1><div class="s">Bloom IELTS Academy · generated ${today()}</div>
    <h2>Headline</h2><table><tbody>
      <tr><td>Active students</td><td class="b">${sts.length}</td></tr>
      <tr><td>Cohorts running</td><td class="b">${COHORTS.length}</td></tr>
      <tr><td>Teaching staff</td><td class="b">${TEACHERS.length}</td></tr>
      <tr><td>Average band gain</td><td class="b">+${avgGain.toFixed(2)}</td></tr>
      <tr><td>Students at target</td><td class="b">${sts.filter(s=>s.band>=s.target).length} (${pct(sts.filter(s=>s.band>=s.target).length,sts.length)}%)</td></tr>
      <tr><td>Monthly revenue collected</td><td class="b">£${revenueMonth().toLocaleString()}</td></tr>
      <tr><td>Outstanding</td><td class="b">£${outstanding().toLocaleString()}</td></tr>
    </tbody></table>
    <h2>Cohorts</h2><table><thead><tr><th>Cohort</th><th>Teacher</th><th>Enrolled</th><th>Avg band</th><th>Gain</th></tr></thead><tbody>
      ${COHORTS.map(c=>{const cs=sts.filter(s=>s.cohort===c.id);const a=cs.length?cs.reduce((x,s)=>x+s.band,0)/cs.length:0;const g=cs.length?cs.reduce((x,s)=>x+(s.band-s.startBand),0)/cs.length:0;
        return `<tr><td>${c.name}</td><td>${teacherOf(c.teacher).name}</td><td>${c.enrolled}/${c.cap}</td><td class="b">${cs.length?bandLabel(a):'—'}</td><td>+${g.toFixed(2)}</td></tr>`;}).join('')}
    </tbody></table>
    <h2>Upcoming</h2><table><tbody>
      ${TERM_EVENTS.filter(e=>e.d>=today()).slice(0,8).map(e=>`<tr><td>${e.d}</td><td class="b">${e.t}</td><td>${e.who}</td></tr>`).join('')}
    </tbody></table>
    <div class="ft">Bloom IELTS Academy · internal management report</div></body></html>`);
  w.document.close(); setTimeout(()=>w.print(),400);
}
function admPrintCal(){ admExport(); }
