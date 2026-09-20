/* ═══ BLOOM — admin operations: admissions, communications, academic, finance, live, system ═══ */

let ops = { view:'', stage:'', q:'', tpl:null, live:null, mail:null, acad:'schedule', fin:'overview', sys:'School', period:'Monthly' };

/* ── LIVE CLASSES ── */
function liveList(){ B.live = B.live || JSON.parse(JSON.stringify(LIVE_SEED)); return B.live; }
function liveSorted(){ return [...liveList()].sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time)); }
function liveStatus(c){
  const start = new Date(c.date + 'T' + c.time);
  const end = new Date(start.getTime() + c.mins*60000);
  const now = new Date();
  return now > end ? 'ended' : now >= new Date(start.getTime() - 15*60000) ? 'live' : 'scheduled';
}
function liveCard(c, admin){
  const st = liveStatus(c), t = teacherOf(c.teacher);
  const tone = LIVE_SUBJ[c.subj] || 'leaf', [bg,fg] = toneVars(tone);
  return `<div class="row" style="gap:13px">
    <div style="width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:${bg};color:${fg};display:grid;place-items:center"><i class="fa-solid fa-video"></i></div>
    <div class="tx" style="min-width:0">
      <b style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${esc(c.title)}
        <span class="tag ${st==='live'?'cor':st==='ended'?'':'ok'}">${st==='live'?'LIVE NOW':st==='ended'?'Ended':'Scheduled'}</span></b>
      <span>${c.subj} · ${c.date} · ${c.time} · ${c.mins} min · ${c.plat} · ${t.name} · ${cohortOf(c.cohort).name}</span></div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <a class="btn ${st==='live'?'btn-p':'btn-g'} btn-sm" href="${esc(c.link)}" target="_blank" rel="noopener">${st==='live'?'<i class="fa-solid fa-video"></i> Join':'Link'}</a>
      ${admin?`<button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Edit" onclick="liveEdit('${c.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Delete" onclick="liveDel('${c.id}')"><i class="fa-solid fa-trash"></i></button>`:''}
    </div></div>`;
}
/* ── student-facing: upcoming live classes ── */
function liveUpcoming(){
  const now = new Date();
  return liveList()
    .filter(c => new Date(c.date + 'T' + c.time).getTime() + c.mins*60000 > now.getTime())
    .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
}
function liveForStudent(){
  const up = liveUpcoming();
  if (!up.length) return '';
  const nextLive = up.find(c => liveStatus(c) === 'live');
  return `<div class="card mb2" ${nextLive?'style="border-color:var(--coral)"':''}>
    <div class="card-hd">
      <div style="width:34px;height:34px;border-radius:10px;background:${nextLive?'var(--coral)':'var(--leaf-700)'};color:#fff;display:grid;place-items:center"><i class="fa-solid fa-video"></i></div>
      <div style="flex:1"><h3>Live classes</h3><p>${nextLive?'A class is running right now — join from here':'Your next ' + Math.min(3,up.length) + ' scheduled ' + (up.length===1?'class':'classes')}</p></div>
      ${nextLive?`<a class="btn btn-p btn-sm" href="${esc(nextLive.link)}" target="_blank" rel="noopener"><i class="fa-solid fa-video"></i> Join now</a>`:''}
    </div>
    <div class="card-bd flush">
      ${up.slice(0,3).map(c => {
        const st = liveStatus(c), t = teacherOf(c.teacher), d = tutDate(c.date);
        const tone = LIVE_SUBJ[c.subj] || 'leaf', [bg,fg] = toneVars(tone);
        const days = Math.round((tutDate(c.date) - tutDate(today())) / 86400000);
        return `<div class="row" style="gap:14px">
          <div style="text-align:center;flex:0 0 46px">
            <div style="font-family:var(--display);font-size:18px;font-weight:700;line-height:1;color:${st==='live'?'var(--coral)':'var(--ink)'}">${d.getDate()}</div>
            <div style="font-size:8.5px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-top:2px">${d.toLocaleDateString('en-GB',{month:'short'})}</div></div>
          <div style="width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:${bg};color:${fg};display:grid;place-items:center;font-size:12px"><i class="fa-solid fa-video"></i></div>
          <div class="tx">
            <b style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${esc(c.title)}
              ${st==='live'?'<span class="tag cor">LIVE NOW</span>':days===0?'<span class="tag amb">Today</span>':days===1?'<span class="tag">Tomorrow</span>':''}</b>
            <span>${c.subj} · ${c.time} · ${c.mins} min · ${t.name} · ${c.plat}</span></div>
          <a class="btn ${st==='live'?'btn-p':'btn-g'} btn-sm" href="${esc(c.link)}" target="_blank" rel="noopener">${st==='live'?'Join':'Link'}</a>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function liveNew(){ ops.live = { id:null, subj:'Writing', title:'', date:today(), time:'14:30', mins:60, plat:'Google Meet', teacher:TEACHERS[0].id, cohort:COHORTS[0].id, link:'' }; liveModal(); }function liveEdit(id){ const c = liveList().find(x=>x.id===id); if(!c) return; ops.live = {...c}; liveModal(); }
function liveDel(id){ if(!confirm('Delete this live class? Students lose the link immediately.')) return; B.live = liveList().filter(x=>x.id!==id); save(); navTo(B.section); toast('Live class removed'); }
function liveModal(){
  const c = ops.live;
  modal(`<div class="modal-hd"><div style="width:36px;height:36px;border-radius:11px;background:var(--coral);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-video"></i></div>
      <div style="flex:1"><h3>${c.id?'Edit live class':'Add live class'}</h3><p>Students see it on their dashboard the moment you save</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Class title</label><input id="lvT" value="${esc(c.title)}" placeholder="e.g. Task 2 — Structure Clinic"></div>
      <div class="fg"><label>Subject</label><select id="lvS">${Object.keys(LIVE_SUBJ).map(s=>`<option ${c.subj===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="fg"><label>Teacher</label><select id="lvTe">${TEACHERS.map(t=>`<option value="${t.id}" ${c.teacher===t.id?'selected':''}>${t.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Date</label><input id="lvD" type="date" value="${c.date}"></div>
      <div class="fg"><label>Start time</label><input id="lvTi" type="time" value="${c.time}"></div>
      <div class="fg"><label>Length</label><select id="lvM">${[30,45,60,90,120].map(m=>`<option value="${m}" ${c.mins===m?'selected':''}>${m} minutes</option>`).join('')}</select></div>
      <div class="fg"><label>Platform</label><select id="lvP">${['Google Meet','Zoom','Microsoft Teams','Bloom Live'].map(p=>`<option ${c.plat===p?'selected':''}>${p}</option>`).join('')}</select></div>
      <div class="fg full"><label>Cohort</label><select id="lvC">${COHORTS.map(x=>`<option value="${x.id}" ${c.cohort===x.id?'selected':''}>${x.name}</option>`).join('')}</select></div>
      <div class="fg full"><label>Meeting link</label><input id="lvL" value="${esc(c.link)}" placeholder="https://meet.google.com/…"></div>
    </div></div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="liveSave()"><i class="fa-solid fa-check"></i> ${c.id?'Save changes':'Add class'}</button></div>`, 600);
}
function liveSave(){
  const g = id => document.getElementById(id).value;
  const rec = { id: ops.live.id || 'lc'+Date.now().toString(36), subj:g('lvS'), title:g('lvT').trim(), date:g('lvD'), time:g('lvTi'), mins:+g('lvM'), plat:g('lvP'), teacher:g('lvTe'), cohort:g('lvC'), link:g('lvL').trim() };
  if (!rec.title){ toast('Give the class a title'); return; }
  if (!rec.link){ toast('Add the meeting link'); return; }
  const list = liveList();
  if (ops.live.id){ const i = list.findIndex(x=>x.id===ops.live.id); list[i] = rec; } else list.unshift(rec);
  save(); closeModal(); navTo(B.section);
  toast(ops.live.id ? 'Class updated' : 'Live class added — students can see it now', 'fa-video');
}

/* ═══ ADMISSIONS ═══ */
function sec_admissions(){
  const all = apps();
  const q = ops.q.trim().toLowerCase();
  let list = all.filter(a => !ops.stage || a.stage === ops.stage);
  if (q) list = list.filter(a => (a.name+' '+a.email+' '+a.country+' '+a.id+' '+a.source).toLowerCase().includes(q));
  const pipeline = APP_STAGES.map(s => ({ ...s, n: all.filter(a=>a.stage===s.id).length, v: all.filter(a=>a.stage===s.id).reduce((x,a)=>x+a.value,0) }));
  const conv = pct(all.filter(a=>a.stage==='enrolled').length, all.length);
  const bySource = {}; all.forEach(a => bySource[a.source] = (bySource[a.source]||0)+1);

  return `
    ${phead({ eyebrow:'Administration', title:`<em>Admissions</em>`,
      sub:`${all.length} applications in the pipeline this term. ${pipeline[4].n} enrolled, ${all.length-pipeline[4].n} still in progress.`,
      actions:`<button class="btn btn-g btn-sm" onclick="admCSV()"><i class="fa-solid fa-file-csv"></i> Export</button>
        <button class="btn btn-p" onclick="admEnrol()"><i class="fa-solid fa-user-plus"></i> New admission</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Applications', all.length, 'This term', 'sky', 'fa-inbox')}
      ${statCard('Conversion', conv + '%', 'Enquiry to enrolment', conv>=40?'leaf':'amb', 'fa-filter')}
      ${statCard('Pipeline value', '£' + all.filter(a=>a.stage!=='enrolled').reduce((x,a)=>x+a.value,0).toLocaleString(), 'Not yet enrolled', 'amb', 'fa-sterling-sign')}
      ${statCard('Top source', Object.entries(bySource).sort((a,b)=>b[1]-a[1])[0][0], Object.entries(bySource).sort((a,b)=>b[1]-a[1])[0][1] + ' applications', 'leaf', 'fa-bullhorn')}
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Pipeline</h3><p>Click a stage to filter the table below</p></div>
        ${ops.stage?`<button class="btn btn-g btn-sm" onclick="ops.stage='';navTo('admissions')">Clear filter</button>`:''}</div>
      <div class="card-bd">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
          ${pipeline.map((s,i) => `<button class="tile ${ops.stage===s.id?'on':''}" style="text-align:left;padding:15px 16px" onclick="ops.stage='${ops.stage===s.id?'':s.id}';navTo('admissions')">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">
              <div style="width:28px;height:28px;border-radius:9px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;font-size:11px"><i class="fa-solid ${s.ic}"></i></div>
              ${i<4?'<i class="fa-solid fa-chevron-right" style="margin-left:auto;color:var(--line-2);font-size:10px"></i>':''}</div>
            <div style="font-family:var(--display);font-size:24px;font-weight:700;line-height:1">${s.n}</div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:4px">${s.name}</div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--ink-4);margin-top:3px">£${s.v.toLocaleString()}</div>
          </button>`).join('')}
        </div>
      </div>
    </div>

    <div class="split mb2">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Applications${ops.stage?' · '+APP_STAGES.find(s=>s.id===ops.stage).name:''}</h3><p>${list.length} shown</p></div>
          <div class="search" style="max-width:230px"><i class="fa-solid fa-magnifying-glass"></i>
            <input placeholder="Search…" value="${esc(ops.q)}" oninput="ops.q=this.value;clearTimeout(window.__opT);window.__opT=setTimeout(()=>navTo('admissions'),250)"></div></div>
        <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Applicant</th><th>ID</th><th>Course</th><th>Origin</th><th>Source</th><th>Stage</th><th></th></tr></thead>
          <tbody>${list.slice(0,14).map(a => `<tr>
            <td><b style="color:var(--ink)">${a.name}</b><div style="font-size:11px;color:var(--ink-4)">${a.email}</div></td>
            <td style="font-family:var(--mono);font-size:11px">${a.id}</td>
            <td style="font-size:12px">${cohortOf(a.cohort).name.split('·')[0].trim()}</td>
            <td style="font-size:12px">${a.country}</td>
            <td style="font-size:12px;color:var(--ink-4)">${a.source}</td>
            <td><span class="tag ${a.stage==='enrolled'?'ok':a.stage==='deposit'?'leaf':a.stage==='offer'?'amb':''}">${APP_STAGES.find(s=>s.id===a.stage).name}</span></td>
            <td style="text-align:right"><button class="btn btn-g btn-sm" onclick="opsAdvance('${a.id}')">${a.stage==='enrolled'?'View':'Advance'}</button></td>
          </tr>`).join('')}</tbody></table></div>
          ${list.length>14?`<div style="padding:12px 21px;font-size:12px;color:var(--ink-4)">+${list.length-14} more — refine the search to narrow this list</div>`:''}
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Where they come from</h3></div></div>
          <div class="card-bd">
            ${Object.entries(bySource).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`
              <div class="prow"><div class="lb"><span>${s}</span><b>${n}</b></div>
                <div class="bar thin"><i style="width:${n/Math.max(...Object.values(bySource))*100}%"></i></div></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Recent admissions</h3><p>Latest five enrolled</p></div></div>
          <div class="card-bd flush">
            ${all.filter(a=>a.stage==='enrolled').slice(0,5).map(a=>`<div class="row">
              <div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${initials(a.name)}</div>
              <div class="tx"><b>${a.name}</b><span>${a.id} · ${a.country} · ${a.at}</span></div>
              <span class="tag ok">Active</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}
function opsAdvance(id){
  const a = apps().find(x=>x.id===id); if (!a) return;
  const i = APP_STAGES.findIndex(s=>s.id===a.stage);
  if (i >= APP_STAGES.length-1){ toast(a.name + ' is already enrolled'); return; }
  a.stage = APP_STAGES[i+1].id;
  navTo('admissions');
  toast(a.name + ' moved to ' + APP_STAGES[i+1].name, 'fa-arrow-right');
}

/* ═══ COMMUNICATIONS ═══ */
function sec_comms(){
  if (ops.tpl) return opsTplHTML();
  const v = ops.view || 'email';
  return `
    ${phead({ eyebrow:'Administration', title:`<em>Communications</em>`,
      sub:'Broadcast mailers, saved templates, automated payment reminders and the full system audit log.',
      actions:`<button class="btn btn-p" onclick="opsCompose()"><i class="fa-solid fa-paper-plane"></i> New broadcast</button>` })}

    <div class="seg mb" style="margin-bottom:18px">
      ${[['email','Email Center','fa-envelope'],['templates','Templates','fa-clipboard'],['reminders','Payment Reminders','fa-circle-exclamation'],['log','Activity Log','fa-clipboard-list']]
        .map(([k,l,ic])=>`<button class="${v===k?'on':''}" onclick="ops.view='${k}';navTo('comms')"><i class="fa-solid ${ic}" style="margin-right:6px"></i>${l}</button>`).join('')}
    </div>

    ${v === 'email' ? `
      <div class="grid g4 mb2">
        ${statCard('Sent this month', '1,482', 'Across all mailers', 'sky', 'fa-paper-plane')}
        ${statCard('Open rate', '64%', 'Above the 41% sector average', 'leaf', 'fa-envelope-open')}
        ${statCard('Templates', EMAIL_TEMPLATES.length, 'Saved and reusable', 'amb', 'fa-clipboard')}
        ${statCard('Automated', '3 rules', 'Payment, mock and attendance', 'vio', 'fa-robot')}
      </div>
      <div class="split">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Send a broadcast</h3><p>Pick an audience, choose a template, review, send</p></div></div>
          <div class="card-bd">
            <div class="fgrid">
              <div class="fg full"><label>Audience</label><select id="bcAud">
                <option>All active students (${allStudents().length})</option>
                ${COHORTS.map(c=>`<option>${c.name} (${c.enrolled})</option>`).join('')}
                <option>Unpaid invoices (${allStudents().filter(s=>!s.paid).length})</option>
                <option>At-risk students (${allStudents().filter(s=>s.risk==='at-risk').length})</option>
                <option>All teachers (${TEACHERS.length})</option></select></div>
              <div class="fg full"><label>Template</label><select id="bcTpl" onchange="opsPickTpl(this.value)">
                <option value="">Write from scratch</option>
                ${EMAIL_TEMPLATES.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
              <div class="fg full"><label>Subject</label><input id="bcSubj" placeholder="Subject line"></div>
              <div class="fg full"><label>Message</label><textarea id="bcBody" rows="8" placeholder="Dear {{name}}, …"></textarea></div>
            </div>
            <div style="margin-top:13px;padding:12px 14px;background:var(--paper);border-radius:11px;font-size:12px;color:var(--ink-3);line-height:1.55">
              <b style="color:var(--ink-2)">Merge fields:</b> {{name}} {{cohort}} {{teacher}} {{band}} {{target}} {{amount}} {{due}} {{link}}</div>
            <div style="display:flex;gap:9px;margin-top:14px">
              <button class="btn btn-g" onclick="toast('Test email sent to ' + '${esc(B.profile.email)}','fa-envelope')"><i class="fa-solid fa-vial"></i> Send test</button>
              <div style="flex:1"></div>
              <button class="btn btn-p" onclick="opsSendBroadcast()"><i class="fa-solid fa-paper-plane"></i> Send broadcast</button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Recent mailers</h3></div></div>
          <div class="card-bd flush">
            ${[['Mock exam invitation — Intensive A','16 recipients','Yesterday','98% opened'],
               ['Overdue invoice reminder','9 recipients','2 days ago','67% opened'],
               ['September progress reports','84 recipients','5 days ago','71% opened'],
               ['Autumn term welcome','24 recipients','1 week ago','92% opened'],
               ['Half-term revision clinics','84 recipients','2 weeks ago','58% opened']].map(([t,n,d,o])=>`
              <div class="row"><div class="ic sky"><i class="fa-solid fa-envelope"></i></div>
                <div class="tx"><b class="clip">${t}</b><span>${n} · ${d}</span></div>
                <span class="tag ok">${o}</span></div>`).join('')}
          </div>
        </div>
      </div>`
    : v === 'templates' ? `
      <div class="grid g2">
        ${EMAIL_TEMPLATES.map(t => `<div class="card"><div class="card-bd" style="padding:18px 20px">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
            <span class="tag ${t.cat==='Finance'?'amb':t.cat==='Academic'?'vio':'leaf'}">${t.cat}</span>
            <span style="margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">used ${t.used}×</span></div>
          <b style="font-size:14.5px;display:block;margin-bottom:5px">${t.name}</b>
          <div style="font-size:12px;color:var(--ink-4);margin-bottom:10px">Subject: ${esc(t.subj)}</div>
          <div style="font-size:12px;color:var(--ink-3);line-height:1.55;max-height:52px;overflow:hidden;margin-bottom:13px">${esc(t.body.split('\n')[2]||t.body.slice(0,110))}…</div>
          <div style="display:flex;gap:7px">
            <button class="btn btn-g btn-sm" style="flex:1;justify-content:center" onclick="ops.tpl='${t.id}';navTo('comms')"><i class="fa-solid fa-eye"></i> Open</button>
            <button class="btn btn-p btn-sm" style="flex:1;justify-content:center" onclick="ops.view='email';opsPickTpl('${t.id}',true)"><i class="fa-solid fa-paper-plane"></i> Use</button></div>
        </div></div>`).join('')}
      </div>`
    : v === 'reminders' ? `
      <div class="grid g4 mb2">
        ${statCard('Overdue', allStudents().filter(s=>!s.paid).length, '£' + outstanding().toLocaleString() + ' outstanding', 'cor', 'fa-file-invoice')}
        ${statCard('Reminders sent', 138, 'This term', 'amb', 'fa-bell')}
        ${statCard('Recovered', '£8,420', 'After reminder emails', 'ok', 'fa-hand-holding-dollar')}
        ${statCard('Automation', 'On', '3 rules running', 'leaf', 'fa-robot')}
      </div>
      <div class="split">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Automation rules</h3><p>When each reminder fires</p></div></div>
          <div class="card-bd" style="display:grid;gap:11px">
            ${[['7 days before due','Friendly reminder with a payment link','on'],
               ['On the due date','Invoice due today','on'],
               ['3 days overdue','Firmer reminder, teacher copied','on'],
               ['14 days overdue','Access suspension warning','on'],
               ['21 days overdue','Escalate to administration','off']].map(([w,d,s])=>`
              <div style="display:flex;gap:13px;align-items:center;padding:13px 15px;border:1px solid var(--line);border-radius:12px">
                <div style="width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:${s==='on'?'var(--ok-soft)':'var(--paper-2)'};color:${s==='on'?'var(--ok)':'var(--ink-4)'};display:grid;place-items:center;font-size:11px"><i class="fa-solid fa-clock"></i></div>
                <div style="flex:1"><b style="font-size:13px;display:block">${w}</b><span style="font-size:11.5px;color:var(--ink-4)">${d}</span></div>
                <span class="tag ${s==='on'?'ok':''}">${s==='on'?'Active':'Off'}</span></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Outstanding invoices</h3></div>
            <button class="btn btn-p btn-sm" onclick="toast('${allStudents().filter(s=>!s.paid).length} reminders queued','fa-bell')"><i class="fa-solid fa-bell"></i> Chase all</button></div>
          <div class="card-bd flush">
            ${allStudents().filter(s=>!s.paid).slice(0,8).map(s=>{const price={PREMIUM:520,PLUS:340,CORE:190};
              return `<div class="row"><div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--coral-soft);color:var(--coral);display:grid;place-items:center;font-size:10px;font-weight:800">${initials(s.name)}</div>
                <div class="tx"><b>${s.name}</b><span>${s.plan} · ${cohortOf(s.cohort).name.split('·')[0].trim()}</span></div>
                <b style="font-family:var(--mono);color:var(--coral)">£${price[s.plan]}</b>
                <button class="icobtn" style="width:28px;height:28px;font-size:10px" onclick="toast('Reminder sent to ' + '${esc(s.name)}','fa-envelope')"><i class="fa-solid fa-envelope"></i></button></div>`;
            }).join('')}
          </div>
        </div>
      </div>`
    : `
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Activity log</h3><p>System audits and administrative records</p></div>
          <button class="btn btn-g btn-sm" onclick="opsLogCSV()"><i class="fa-solid fa-file-csv"></i> Export log</button></div>
        <div class="card-bd flush">
          ${ACTIVITY_LOG.map(l => { const k = LOG_KINDS[l.kind];
            return `<div class="row">
              <div class="ic ${k.tone}"><i class="fa-solid ${k.ic}"></i></div>
              <div class="tx"><b style="font-weight:600;line-height:1.5">${esc(l.t)}</b><span>${l.who}</span></div>
              <span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4);flex:0 0 auto">${l.at} ago</span></div>`;
          }).join('')}
        </div>
      </div>`}`;
}
function opsPickTpl(id, go){
  const t = EMAIL_TEMPLATES.find(x=>x.id===id);
  if (go){ navTo('comms'); setTimeout(()=>opsPickTpl(id), 60); return; }
  if (!t) return;
  const s = document.getElementById('bcSubj'), b = document.getElementById('bcBody'), sel = document.getElementById('bcTpl');
  if (s) s.value = t.subj; if (b) b.value = t.body; if (sel) sel.value = id;
}
function opsCompose(){ ops.view='email'; navTo('comms'); toast('Compose a broadcast below', 'fa-paper-plane'); }
function opsSendBroadcast(){
  const aud = document.getElementById('bcAud')?.value || 'students';
  const subj = document.getElementById('bcSubj')?.value.trim();
  if (!subj){ toast('Add a subject line'); return; }
  const n = (aud.match(/\((\d+)\)/)||[,'0'])[1];
  toast('Broadcast queued to ' + n + ' recipients', 'fa-paper-plane');
}
function opsTplHTML(){
  const t = EMAIL_TEMPLATES.find(x=>x.id===ops.tpl);
  return `
    ${phead({ eyebrow:'Communications · Template', title:t.name.replace(/(\S+)$/,'<em>$1</em>'), sub:'Subject: ' + esc(t.subj),
      actions:`<button class="btn btn-g btn-sm" onclick="ops.tpl=null;navTo('comms')"><i class="fa-solid fa-arrow-left"></i> Templates</button>
        <button class="btn btn-p" onclick="ops.tpl=null;ops.view='email';navTo('comms');setTimeout(()=>opsPickTpl('${t.id}'),80)"><i class="fa-solid fa-paper-plane"></i> Use this template</button>` })}
    <div class="card" style="max-width:760px"><div class="card-bd" style="white-space:pre-wrap;font-size:14px;line-height:1.8;color:var(--ink-2)">${esc(t.body)}</div>
      <div style="padding:15px 21px;border-top:1px solid var(--line);background:var(--paper);font-size:12px;color:var(--ink-4)">Used ${t.used} times · category ${t.cat}</div></div>`;
}
function opsLogCSV(){
  const csv = [['When','Who','Type','Event'], ...ACTIVITY_LOG.map(l=>[l.at+' ago',l.who,l.kind,l.t])]
    .map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-activity-log-'+today()+'.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('Activity log exported', 'fa-file-csv');
}

/* ═══ ACADEMIC ═══ */
function sec_academic(){
  const v = ops.acad;
  return `
    ${phead({ eyebrow:'Administration', title:`<em>Academic</em> operations`,
      sub:'Curriculum, timetable, attendance, mock exams and published results.',
      actions:`<button class="btn btn-g btn-sm" onclick="navTo('content')"><i class="fa-solid fa-cloud-arrow-up"></i> Content</button>
        <button class="btn btn-p btn-sm" onclick="liveNew()"><i class="fa-solid fa-video"></i> Add live class</button>` })}

    <div class="seg mb" style="margin-bottom:18px;flex-wrap:wrap">
      ${[['schedule','Schedule','fa-calendar'],['curriculum','Curriculum','fa-layer-group'],['attendance','Attendance','fa-user-check'],['mocks','Mock Exams','fa-clipboard-check'],['results','Results','fa-chart-line']]
        .map(([k,l,ic])=>`<button class="${v===k?'on':''}" onclick="ops.acad='${k}';navTo('academic')"><i class="fa-solid ${ic}" style="margin-right:6px"></i>${l}</button>`).join('')}
    </div>

    ${v === 'schedule' ? `
      <div class="card mb2">
        <div class="card-hd"><div style="width:34px;height:34px;border-radius:10px;background:var(--coral);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-video"></i></div>
          <div style="flex:1"><h3>Live classes</h3><p>Add class links — students see them instantly on their dashboard</p></div>
          <button class="btn btn-p btn-sm" onclick="liveNew()"><i class="fa-solid fa-plus"></i> Add live class</button></div>
        <div class="card-bd flush">${liveSorted().map(c=>liveCard(c,true)).join('')}</div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Weekly timetable</h3><p>Every cohort, every room</p></div></div>
        <div class="card-bd" style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;min-width:760px">
            <thead><tr><th style="width:130px;padding:10px;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800;text-align:left;border-bottom:1px solid var(--line)">Cohort</th>
              ${DAYS.map(d=>`<th style="padding:10px 6px;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800;border-bottom:1px solid var(--line);border-left:1px solid var(--line)">${d}</th>`).join('')}</tr></thead>
            <tbody>${COHORTS.map(c=>`<tr>
              <td style="padding:10px;border-bottom:1px solid var(--line)"><b style="font-size:12.5px">${c.name.split('·')[0].trim()}</b>
                <div style="font-size:10.5px;color:var(--ink-4)">${teacherOf(c.teacher).name.split(' ').slice(-1)[0]} · ${c.room}</div></td>
              ${DAYS.map(d=>`<td style="padding:5px;border-bottom:1px solid var(--line);border-left:1px solid var(--line);text-align:center">
                ${c.days.includes(d)?`<div style="background:var(--leaf-100);color:var(--leaf-700);border-radius:7px;padding:5px 4px;font-family:var(--mono);font-size:10px;font-weight:700">${c.time}</div>`:''}</td>`).join('')}
            </tr>`).join('')}</tbody></table>
        </div>
      </div>`
    : v === 'curriculum' ? `
      <div class="grid g4 mb2">
        ${statCard('Exam parts', PARTS.length, 'The full curriculum spine', 'leaf', 'fa-layer-group')}
        ${statCard('Notes & PDFs', MATERIALS.length + upByType('pdf').length + upByType('notes').length, 'Across all parts', 'cor', 'fa-note-sticky')}
        ${statCard('Audio & lectures', AUDIO.length + LECTURES.length + upByType('audio').length + upByType('video').length, 'Hours of teaching', 'sky', 'fa-circle-play')}
        ${statCard('Quizzes', publishedQuizzes().length, 'Published to students', 'vio', 'fa-list-check')}
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Curriculum coverage</h3><p>Content available for each part of the exam</p></div>
          <button class="btn btn-g btn-sm" onclick="navTo('content')">Add content</button></div>
        <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Exam part</th><th>Skill</th><th>Notes</th><th>Audio</th><th>Lectures</th><th>Uploads</th><th>Coverage</th></tr></thead>
          <tbody>${PARTS.map(p=>{
            const m = matsFor(p.id).length, a = audFor(p.id).length, l = lecsFor(p.id).length, u = publishedFor(p.id).length;
            const tot = m+a+l+u, cov = Math.min(100, tot*22);
            return `<tr><td><b style="color:var(--ink)">${p.name}</b><div style="font-size:11px;color:var(--ink-4)">${p.sub}</div></td>
              <td style="font-size:12px;text-transform:capitalize">${p.skill}</td>
              <td style="font-family:var(--mono)">${m}</td><td style="font-family:var(--mono)">${a}</td>
              <td style="font-family:var(--mono)">${l}</td><td style="font-family:var(--mono)">${u}</td>
              <td><div style="display:flex;gap:8px;align-items:center"><div class="bar thin" style="width:64px"><i style="width:${cov}%;background:${cov>=70?'var(--ok)':cov>=40?'var(--amber)':'var(--coral)'}"></i></div>
                <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${tot}</span></div></td></tr>`;
          }).join('')}</tbody></table></div></div>
      </div>`
    : v === 'attendance' ? (() => {
        const sts = allStudents();
        const att = s => Math.max(45, 100 - s.lastActive*4 - (s.risk==='at-risk'?18:0));
        const avg = Math.round(sts.reduce((a,s)=>a+att(s),0)/sts.length);
        const low = sts.filter(s=>att(s)<80);
        return `
        <div class="grid g4 mb2">
          ${statCard('Average attendance', avg + '%', 'Across all cohorts', avg>=85?'leaf':'amb', 'fa-user-check')}
          ${statCard('Below 80%', low.length, 'Flagged to their teacher', 'cor', 'fa-user-xmark')}
          ${statCard('Perfect attendance', sts.filter(s=>att(s)>=98).length, 'No sessions missed', 'ok', 'fa-star')}
          ${statCard('Sessions this week', COHORTS.reduce((a,c)=>a+c.days.length,0), 'Across ' + COHORTS.length + ' cohorts', 'sky', 'fa-calendar-week')}
        </div>
        <div class="split">
          <div class="card">
            <div class="card-hd"><div style="flex:1"><h3>Attendance by cohort</h3></div></div>
            <div class="card-bd">
              ${COHORTS.map(c=>{const cs=sts.filter(s=>s.cohort===c.id); if(!cs.length) return '';
                const a = Math.round(cs.reduce((x,s)=>x+att(s),0)/cs.length);
                return `<div class="prow"><div class="lb"><span>${c.name}</span><b>${a}% · ${cs.length} students</b></div>
                  <div class="bar"><i style="width:${a}%;background:${a>=85?'var(--ok)':a>=75?'var(--amber)':'var(--coral)'}"></i></div></div>`;
              }).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-hd"><div style="flex:1"><h3>Attendance concerns</h3><p>Below the 80% threshold</p></div>
              <button class="btn btn-p btn-sm" onclick="toast(${low.length} + ' letters queued','fa-envelope')"><i class="fa-solid fa-envelope"></i> Contact all</button></div>
            <div class="card-bd flush">
              ${low.slice(0,8).map(s=>`<div class="row">
                <div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--coral-soft);color:var(--coral);display:grid;place-items:center;font-size:10px;font-weight:800">${initials(s.name)}</div>
                <div class="tx"><b>${s.name}</b><span>${cohortOf(s.cohort).name.split('·')[0].trim()} · last seen ${s.lastActive}d ago</span></div>
                <b style="font-family:var(--mono);color:var(--coral)">${att(s)}%</b></div>`).join('')}
            </div>
          </div>
        </div>`;
      })()
    : v === 'mocks' ? `
      <div class="grid g4 mb2">
        ${statCard('Mock papers', MOCKS.length, 'Full, section and mini', 'leaf', 'fa-clipboard-list')}
        ${statCard('Sittings this term', 214, 'Across all cohorts', 'sky', 'fa-pen-to-square')}
        ${statCard('Average band', '6.2', 'Up from 5.7 at placement', 'amb', 'fa-chart-simple')}
        ${statCard('Next window', '26 Sep', 'Mid-term mock exam week', 'cor', 'fa-calendar-day')}
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Mock exam papers</h3><p>Available to students in every cohort</p></div>
          <button class="btn btn-g btn-sm" onclick="cmQuizNew();navTo('content')"><i class="fa-solid fa-plus"></i> Build a paper</button></div>
        <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Paper</th><th>Exam</th><th>Type</th><th>Duration</th><th>Level</th><th>Sittings</th></tr></thead>
          <tbody>${MOCKS.map((m,i)=>`<tr>
            <td><b style="color:var(--ink)">${m.name}</b><div style="font-size:11px;color:var(--ink-4)">${m.parts.join(' · ')}</div></td>
            <td>${examOf(m.exam).short}</td>
            <td><span class="tag ${m.kind==='full'?'cor':m.kind==='section'?'sky':'leaf'}">${m.kind}</span></td>
            <td style="font-family:var(--mono)">${m.mins} min</td><td>${m.level}</td>
            <td style="font-family:var(--mono)">${18 + i*7}</td></tr>`).join('')}</tbody></table></div></div>
      </div>`
    : (() => {
        const sts = allStudents();
        const top = [...sts].sort((a,b)=>(b.band-b.startBand)-(a.band-a.startBand)).slice(0,8);
        return `
        <div class="grid g4 mb2">
          ${statCard('Results published', 128, 'This term', 'leaf', 'fa-chart-line')}
          ${statCard('At or above target', sts.filter(s=>s.band>=s.target).length, pct(sts.filter(s=>s.band>=s.target).length,sts.length) + '% of cohort', 'ok', 'fa-bullseye')}
          ${statCard('Average gain', '+' + (sts.reduce((a,s)=>a+(s.band-s.startBand),0)/sts.length).toFixed(2), 'bands since placement', 'amb', 'fa-arrow-trend-up')}
          ${statCard('Official sittings', 49, 'October and November', 'sky', 'fa-file-signature')}
        </div>
        <div class="split">
          <div class="card">
            <div class="card-hd"><div style="flex:1"><h3>Most improved</h3><p>Biggest band gain since placement</p></div>
              <button class="btn btn-g btn-sm" onclick="toast('Results published to 84 students','fa-chart-line')"><i class="fa-solid fa-upload"></i> Publish results</button></div>
            <div class="card-bd flush">
              ${top.map((s,i)=>`<div class="row">
                <div style="width:24px;font-family:var(--mono);font-size:12px;font-weight:800;color:${i<3?'var(--amber)':'var(--ink-4)'}">${i+1}</div>
                <div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${initials(s.name)}</div>
                <div class="tx"><b>${s.name}</b><span>${cohortOf(s.cohort).name.split('·')[0].trim()} · ${bandLabel(s.startBand)} → ${bandLabel(s.band)}</span></div>
                <b style="font-family:var(--mono);color:var(--ok)">+${(s.band-s.startBand).toFixed(2)}</b></div>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-hd"><div style="flex:1"><h3>Band distribution</h3></div></div>
            <div class="card-bd">${admBandChart(sts)}</div>
          </div>
        </div>`;
      })()}`;
}

/* ═══ FINANCE ═══ */
function sec_finance(){
  const sts = allStudents();
  const paid = sts.filter(s=>s.paid).length;
  const pending = Math.round(sts.filter(s=>!s.paid).length * 0.6);
  const overdue = sts.filter(s=>!s.paid).length - pending;
  const q = ops.period === 'Quarterly';
  const months = q ? ['Q1','Q2','Q3','Q4'] : FEE_MONTHS;
  const agg = arr => q ? [0,1,2,3].map(i => arr.slice(i*3,i*3+3).reduce((a,b)=>a+b,0)) : arr;
  const dc = agg(FEE_DATA.collected), dt = agg(FEE_DATA.target), df = agg(FEE_DATA.forecast);
  const max = Math.max(...dt, ...df) * 1.08;

  return `
    ${phead({ eyebrow:'Administration', title:`<em>Finance</em>`,
      sub:'Fee collection against target, payment status across the cohort, and plan performance.',
      actions:`<button class="btn btn-g btn-sm" onclick="admCSV()"><i class="fa-solid fa-file-csv"></i> Export</button>
        <button class="btn btn-p btn-sm" onclick="ops.view='reminders';navTo('comms')"><i class="fa-solid fa-bell"></i> Chase unpaid</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Collected', '£' + revenueMonth().toLocaleString(), paid + ' students paid', 'ok', 'fa-sterling-sign')}
      ${statCard('Outstanding', '£' + outstanding().toLocaleString(), (sts.length-paid) + ' unpaid', 'cor', 'fa-file-invoice')}
      ${statCard('Annual to date', '£' + FEE_DATA.collected.reduce((a,b)=>a+b,0).toLocaleString(), 'Against £' + FEE_DATA.target.reduce((a,b)=>a+b,0).toLocaleString() + ' target', 'amb', 'fa-chart-column')}
      ${statCard('Premium track', sts.filter(s=>s.plan==='PREMIUM').length, pct(sts.filter(s=>s.plan==='PREMIUM').length,sts.length) + '% of students', 'leaf', 'fa-crown')}
    </div>

    <div class="split mb2">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Fee collection</h3><p>${ops.period} performance — GBP</p></div>
          <div class="seg">${['Monthly','Quarterly'].map(p=>`<button class="${ops.period===p?'on':''}" onclick="ops.period='${p}';navTo('finance')">${p}</button>`).join('')}</div></div>
        <div class="card-bd">
          <div style="display:flex;gap:${q?18:7}px;align-items:flex-end;height:210px;padding-bottom:6px">
            ${months.map((m,i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end">
              <div style="display:flex;gap:2px;align-items:flex-end;width:100%;height:100%;justify-content:center">
                <div style="width:${q?22:7}px;height:${dc[i]/max*100}%;background:var(--leaf-900);border-radius:3px 3px 0 0" title="Collected £${dc[i].toLocaleString()}"></div>
                <div style="width:${q?22:7}px;height:${dt[i]/max*100}%;background:var(--amber);border-radius:3px 3px 0 0" title="Target £${dt[i].toLocaleString()}"></div>
                <div style="width:${q?22:7}px;height:${df[i]/max*100}%;background:var(--sky);border-radius:3px 3px 0 0" title="Forecast £${df[i].toLocaleString()}"></div>
              </div>
              <span style="font-family:var(--mono);font-size:9.5px;color:var(--ink-4)">${m}</span></div>`).join('')}
          </div>
          <div style="display:flex;gap:16px;justify-content:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
            ${[['Collected','var(--leaf-900)'],['Target','var(--amber)'],['Forecast','var(--sky)']].map(([l,c])=>`
              <span style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink-3)"><span style="width:10px;height:10px;border-radius:3px;background:${c}"></span>${l}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Payment status</h3><p>Across the active cohort</p></div></div>
        <div class="card-bd" style="text-align:center">
          ${(() => {
            const tot = paid+pending+overdue;
            const a = paid/tot*100, b = pending/tot*100;
            return `<div class="ring" style="width:150px;height:150px;margin:0 auto;background:conic-gradient(var(--ok) 0 ${a}%, var(--amber) ${a}% ${a+b}%, var(--err) ${a+b}% 100%)">
              <div><b style="font-size:26px">${tot}</b><span>Students</span></div></div>`;
          })()}
          <div style="margin-top:20px;display:grid;gap:11px;text-align:left">
            ${[['Paid in full',paid,'var(--ok)'],['Pending',pending,'var(--amber)'],['Overdue',overdue,'var(--err)']].map(([l,n,c])=>`
              <div style="display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px dashed var(--line)">
                <span style="width:9px;height:9px;border-radius:50%;background:${c}"></span>
                <span style="flex:1;font-size:13px;color:var(--ink-2)">${l}</span>
                <b style="font-family:var(--mono);font-size:14px">${n}</b></div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Plans &amp; subscriptions</h3><p>What each tier includes and how it performs</p></div></div>
      <div class="card-bd">
        <div class="grid g3">
          ${PLANS.map(p => { const n = sts.filter(s=>s.plan===p.id).length, rev = sts.filter(s=>s.plan===p.id&&s.paid).length*p.price;
            const [bg,fg] = toneVars(p.colour);
            return `<div style="border:1.5px solid ${p.popular?'var(--leaf-500)':'var(--line)'};border-radius:16px;padding:20px;position:relative;${p.popular?'background:var(--leaf-50)':''}">
              ${p.popular?'<span style="position:absolute;top:-9px;left:20px;background:var(--leaf-600);color:#fff;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;font-weight:800;padding:3px 9px;border-radius:5px">Most popular</span>':''}
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div style="width:30px;height:30px;border-radius:10px;background:${bg};color:${fg};display:grid;place-items:center;font-size:12px"><i class="fa-solid fa-${p.id==='PREMIUM'?'crown':p.id==='PLUS'?'star':'seedling'}"></i></div>
                <b style="font-family:var(--display);font-size:17px;font-weight:700">${p.name}</b></div>
              <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:14px">
                <span style="font-family:var(--display);font-size:30px;font-weight:700;letter-spacing:-1px">£${p.price}</span>
                <span style="font-size:12px;color:var(--ink-4)">/ ${p.per}</span></div>
              <div style="display:grid;gap:6px;margin-bottom:14px">
                ${p.inc.map(x=>`<div style="display:flex;gap:8px;font-size:12px;color:var(--ink-2);line-height:1.45"><i class="fa-solid fa-check" style="color:var(--ok);font-size:10px;margin-top:3px"></i><span>${x}</span></div>`).join('')}
                ${p.exc.map(x=>`<div style="display:flex;gap:8px;font-size:12px;color:var(--ink-4);line-height:1.45"><i class="fa-solid fa-xmark" style="font-size:10px;margin-top:3px"></i><span>${x}</span></div>`).join('')}</div>
              <div style="padding-top:13px;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:12px">
                <span style="color:var(--ink-4)">${n} students</span><b style="font-family:var(--mono)">£${rev.toLocaleString()}</b></div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ═══ SYSTEM ═══ */
function sec_system(){
  const grp = SYS_SETTINGS.find(g => g.grp === ops.sys) || SYS_SETTINGS[0];
  B.settings = B.settings || {};
  const val = it => B.settings[it.k] !== undefined ? B.settings[it.k] : it.val;
  return `
    ${phead({ eyebrow:'Administration', title:`<em>System</em> settings`,
      sub:'School details, academic policy, finance rules and notification defaults.',
      actions:`<button class="btn btn-g btn-sm" onclick="if(confirm('Reset all settings to their defaults?')){B.settings={};save();navTo('system');toast('Settings reset')}"><i class="fa-solid fa-rotate-left"></i> Reset</button>
        <button class="btn btn-p btn-sm" onclick="save();toast('Settings saved','fa-check')"><i class="fa-solid fa-check"></i> Save changes</button>` })}

    <div style="display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start" class="syssplit">
      <div class="card"><div class="card-bd" style="padding:10px">
        ${SYS_SETTINGS.map(g=>`<div class="nav-i ${ops.sys===g.grp?'on':''}" style="margin-bottom:3px" onclick="ops.sys='${g.grp}';navTo('system')">
          <i class="fa-solid fa-${g.grp==='School'?'building-columns':g.grp==='Academic'?'graduation-cap':g.grp==='Finance'?'sterling-sign':'bell'}"></i><span>${g.grp}</span></div>`).join('')}
      </div></div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>${grp.grp}</h3><p>${grp.items.length} settings</p></div></div>
        <div class="card-bd" style="display:grid;gap:16px">
          ${grp.items.map(it => `
            <div style="display:flex;gap:16px;align-items:center;padding-bottom:15px;border-bottom:1px solid var(--line)">
              <div style="flex:1"><b style="font-size:13.5px;display:block">${it.label}</b></div>
              <div style="flex:0 0 220px">
                ${it.type==='text'?`<input value="${esc(val(it))}" style="width:100%;border:1.5px solid var(--line-2);border-radius:10px;padding:9px 12px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" onchange="B.settings['${it.k}']=this.value;save()">`
                : it.type==='select'?`<select style="width:100%;border:1.5px solid var(--line-2);border-radius:10px;padding:9px 12px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" onchange="B.settings['${it.k}']=this.value;save()">
                    ${it.opts.map(o=>`<option ${val(it)===o?'selected':''}>${o}</option>`).join('')}</select>`
                : `<button style="float:right;width:46px;height:26px;border-radius:14px;border:none;cursor:pointer;background:${val(it)?'var(--leaf-600)':'var(--line-2)'};position:relative;transition:.16s" onclick="B.settings['${it.k}']=${!val(it)};save();navTo('system')">
                    <span style="position:absolute;top:3px;left:${val(it)?'23px':'3px'};width:20px;height:20px;border-radius:50%;background:#fff;transition:.16s"></span></button>`}
              </div></div>`).join('')}
        </div>
      </div>
    </div>
    <style>@media(max-width:760px){.syssplit{grid-template-columns:1fr!important}}</style>`;
}
