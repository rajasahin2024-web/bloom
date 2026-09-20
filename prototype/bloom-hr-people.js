/* ═══ BLOOM — HR: hiring pipeline, leave, recognition, reviews ═══ */

/* ═══ HIRING ═══ */
function hrHiringHTML(){
  const apps = hrApplicants();
  const shown = hr.stage === 'all' ? apps : apps.filter(a => a.stage === hr.stage);
  const active = apps.filter(a => !['hired','declined'].includes(a.stage));
  return `
    ${phead({ eyebrow:'HR · Hiring', title:`<em>Hiring</em>`,
      sub:`${HR_VACANCIES.length} open roles and ${active.length} candidates in the pipeline. Applications from the careers page arrive here automatically; move a candidate to Offer and Bloom drafts the letter for you.`,
      actions:`<button class="btn btn-g btn-sm" onclick="hrVacancyModal()"><i class="fa-solid fa-plus"></i> Post a vacancy</button>
        <button class="btn btn-p btn-sm" onclick="hrAppModal()"><i class="fa-solid fa-user-plus"></i> Add a candidate</button>` })}
    ${hrNav()}

    <div class="grid g4 mb2">
      ${statCard('Open roles', HR_VACANCIES.length, HR_VACANCIES.map(v=>deptOf(v.dept).name).filter((x,i,a)=>a.indexOf(x)===i).join(' · '), 'leaf', 'fa-briefcase')}
      ${statCard('In pipeline', active.length, apps.filter(a=>a.stage==='interview'||a.stage==='demo').length + ' at interview stage', 'sky', 'fa-users')}
      ${statCard('Offers out', apps.filter(a=>a.stage==='offer').length, 'Awaiting signature', 'amb', 'fa-file-signature')}
      ${statCard('From the website', apps.filter(a=>a.web).length, apps.filter(a=>a.web).length?'Via the careers page':'Vacancies are live on careers.html', 'leaf', 'fa-globe')}
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Open vacancies</h3><p>These appear on careers.html the moment you post them</p></div>
        <a class="btn btn-g btn-sm" href="careers.html" target="_blank">View live <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>
      <div class="card-bd flush">
        ${HR_VACANCIES.map(v => {
          const n = apps.filter(a => a.vacancy === v.id && !['declined'].includes(a.stage)).length;
          return `<div class="row">
            <div class="ic ${deptOf(v.dept).tone}"><i class="fa-solid ${deptOf(v.dept).ic}"></i></div>
            <div class="tx"><b>${esc(v.title)}</b><span>${deptOf(v.dept).name} · ${officeOf(v.office).flag} ${officeOf(v.office).name} · ${CONTRACTS[v.contract].name} · ${v.ctc}</span>
              <span style="font-style:italic;color:var(--ink-4);display:block;margin-top:3px">${esc(v.need)}</span></div>
            <div style="text-align:right;flex:0 0 auto"><div style="font-family:var(--mono);font-size:13px;font-weight:700">${n}</div>
              <div style="font-size:10px;color:var(--ink-4)">candidates</div></div>
            <button class="btn btn-g btn-sm" onclick="hrAppModal('${v.id}')"><i class="fa-solid fa-plus"></i> Candidate</button></div>`;
        }).join('')}
      </div>
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Pipeline</h3><p>Drag is not needed — use the stage buttons on each candidate</p></div></div>
      <div class="card-bd">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
          ${HIRE_STAGES.map(s => {
            const n = apps.filter(a => a.stage === s.id).length;
            const [bg,fg] = toneVars(s.tone);
            return `<button class="tile ${hr.stage===s.id?'on':''}" style="padding:14px 12px" onclick="hr.stage='${hr.stage===s.id?'all':s.id}';navTo('hr')">
              <div style="font-family:var(--display);font-size:24px;font-weight:800;color:${n?fg:'var(--ink-4)'};line-height:1">${n}</div>
              <div class="nm" style="font-size:12px;margin-top:5px">${s.name}</div></button>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${shown.length ? `<div style="display:grid;gap:12px">
      ${shown.map(a => {
        const v = HR_VACANCIES.find(x => x.id === a.vacancy) || {};
        const st = HIRE_STAGES.find(s => s.id === a.stage);
        const idx = HIRE_STAGES.findIndex(s => s.id === a.stage);
        const next = HIRE_STAGES[idx+1];
        return `<div class="card"><div class="card-bd">
          <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px">
            <div style="width:40px;height:40px;flex:0 0 40px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800">${a.init}</div>
            <div style="flex:1;min-width:200px">
              <b style="font-size:15px;display:block">${esc(a.name)}</b>
              <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${esc(v.title||'Speculative')} · ${a.country} · ${a.years} years · applied ${a.applied}${a.ref?' · '+a.ref:''}</span></div>
            ${a.web?'<span class="tag leaf"><i class="fa-solid fa-globe"></i> Careers page</span>':''}
            <span class="tag ${st.tone==='leaf'?'ok':st.tone||''}">${st.name}</span>
          </div>
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.6;padding:11px 13px;background:var(--paper);border-radius:11px;margin-bottom:13px;white-space:pre-wrap">${esc(a.note)}</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-3);margin-bottom:14px">
            <span><i class="fa-solid fa-envelope" style="width:15px;color:var(--ink-4)"></i> ${esc(a.email)}</span>
            <span><i class="fa-solid fa-phone" style="width:15px;color:var(--ink-4)"></i> ${esc(a.phone)}</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${next && a.stage !== 'hired' && a.stage !== 'declined' ? `<button class="btn btn-p btn-sm" onclick="hrAppStage('${a.id}','${next.id}')"><i class="fa-solid fa-arrow-right"></i> Move to ${next.name}</button>` : ''}
            ${a.stage === 'offer' ? `<button class="btn btn-a btn-sm" onclick="hrOfferFor('${a.id}')"><i class="fa-solid fa-file-signature"></i> Draft the offer letter</button>` : ''}
            ${a.stage === 'hired' ? `<button class="btn btn-p btn-sm" onclick="hrOnboard('${a.id}')"><i class="fa-solid fa-user-plus"></i> Onboard as an employee</button>` : ''}
            <a class="btn btn-g btn-sm" href="mailto:${esc(a.email)}?subject=${encodeURIComponent('Your application to Bloom IELTS Academy')}"><i class="fa-solid fa-envelope"></i> Email</a>
            <div style="flex:1"></div>
            ${a.stage !== 'declined' ? `<button class="btn btn-q btn-sm" onclick="hrAppStage('${a.id}','declined')">Decline</button>` : ''}
          </div>
        </div></div>`;
      }).join('')}
    </div>` : `<div class="empty"><i class="fa-solid fa-users"></i><b>No candidates at this stage</b><span>Pick another stage, or add a candidate.</span></div>`}`;
}
function hrAppStage(id, stage){
  const a = hrApplicants().find(x => x.id === id); if (!a) return;
  a.stage = stage; save(); navTo('hr');
  const s = HIRE_STAGES.find(x => x.id === stage);
  toast(esc(a.name) + ' → ' + s.name, stage === 'declined' ? 'fa-circle-xmark' : 'fa-arrow-right');
  if (stage === 'offer') setTimeout(() => hrOfferFor(id), 500);
}
function hrOfferFor(id){
  const a = hrApplicants().find(x => x.id === id); if (!a) return;
  const v = HR_VACANCIES.find(x => x.id === a.vacancy) || {};
  hr.doc = { type:'offer', emp:null };
  hrDocNew('offer');
  setTimeout(() => {
    const set = (f, val) => { const el = document.querySelector(`.modal [data-f="${f}"]`); if (el && val != null) el.value = val; };
    set('name', a.name);
    set('title', v.title || '');
    const d = document.querySelector('.modal [data-f="dept"]'); if (d && v.dept) d.value = deptOf(v.dept).name;
    const c = document.querySelector('.modal [data-f="contract"]'); if (c && v.contract) c.value = CONTRACTS[v.contract].name;
    const o = document.querySelector('.modal [data-f="office"]'); if (o && v.office) o.value = officeOf(v.office).name + ', ' + officeOf(v.office).country;
    set('reportsTo', COMPANY.director);
  }, 90);
}
function hrAppModal(vacId){
  modal(`<div class="modal-hd"><div style="flex:1"><h3>Add a candidate</h3><p>They enter the pipeline at Applied</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Full name</label><input id="caN" placeholder="Full name"></div>
      <div class="fg"><label>Email</label><input id="caE" type="email"></div>
      <div class="fg"><label>Phone</label><input id="caP"></div>
      <div class="fg"><label>Applying for</label><select id="caV">${HR_VACANCIES.map(v=>`<option value="${v.id}" ${vacId===v.id?'selected':''}>${esc(v.title)}</option>`).join('')}</select></div>
      <div class="fg"><label>Country</label><select id="caC">${COUNTRIES.map(c=>`<option>${c}</option>`).join('')}</select></div>
      <div class="fg"><label>Years of experience</label><input id="caY" type="number" value="3"></div>
      <div class="fg"><label>Stage</label><select id="caS">${HIRE_STAGES.slice(0,5).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <div class="fg full"><label>Notes</label><textarea id="caNo" rows="2" placeholder="Where they came from, first impressions, what to check."></textarea></div>
    </div></div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="hrAppSave()"><i class="fa-solid fa-check"></i> Add candidate</button></div>`, 620);
}
function hrAppSave(){
  const g = id => (document.getElementById(id)||{}).value || '';
  const name = g('caN').trim();
  if (!name){ toast('Enter a name'); return; }
  hrApplicants().unshift({
    id:'a'+Date.now().toString(36), name, email:g('caE'), phone:g('caP'), vacancy:g('caV'),
    country:g('caC'), years:+g('caY')||0, stage:g('caS'), note:g('caNo')||'No notes yet.',
    applied:today(), init:name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(),
  });
  save(); closeModal(); navTo('hr'); toast(name + ' added to the pipeline', 'fa-user-plus');
}
function hrVacancyModal(){
  modal(`<div class="modal-hd"><div style="flex:1"><h3>Post a vacancy</h3><p>Appears in the hiring pipeline and on the careers page</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Job title</label><input id="vcT" placeholder="e.g. IELTS Listening Examiner"></div>
      <div class="fg"><label>Department</label><select id="vcD">${HR_DEPTS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Office</label><select id="vcO">${COMPANY.offices.map(o=>`<option value="${o.id}">${o.flag} ${o.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Contract</label><select id="vcC">${Object.entries(CONTRACTS).map(([k,c])=>`<option value="${k}">${c.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Band</label><select id="vcB">${['L1','L2','L3','L4','L5'].map(b=>`<option ${b==='L3'?'selected':''}>${b}</option>`).join('')}</select></div>
      <div class="fg full"><label>Salary range</label><input id="vcS" placeholder="₹8–11 lakh"></div>
      <div class="fg full"><label>What the role needs</label><textarea id="vcN" rows="2" placeholder="The one requirement that actually filters applicants."></textarea></div>
    </div></div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="hrVacancySave()"><i class="fa-solid fa-check"></i> Post vacancy</button></div>`, 620);
}
function hrVacancySave(){
  const g = id => (document.getElementById(id)||{}).value || '';
  const title = g('vcT').trim(); if (!title){ toast('Give the role a title'); return; }
  HR_VACANCIES.push({ id:'v'+Date.now().toString(36), title, dept:g('vcD'), office:g('vcO'),
    contract:g('vcC'), band:g('vcB'), ctc:g('vcS')||'On application', open:today(), need:g('vcN')||'—' });
  closeModal(); navTo('hr'); toast('Vacancy posted', 'fa-briefcase');
}
function hrOnboard(appId){
  const a = hrApplicants().find(x => x.id === appId); if (!a) return;
  const v = HR_VACANCIES.find(x => x.id === a.vacancy) || {};
  hrHireModal({ name:a.name, title:v.title, dept:v.dept, office:v.office, contract:v.contract, band:v.band, from:a.country, years:a.years });
}

/* ═══ ADD AN EMPLOYEE ═══ */
function hrHireModal(pre){
  const p = pre || {};
  modal(`<div class="modal-hd"><div style="flex:1"><h3>${p.name?'Onboard ' + esc(p.name):'Add a person'}</h3><p>Creates the employee record. Issue the contract straight afterwards.</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Full name</label><input id="ehN" value="${esc(p.name||'')}"></div>
      <div class="fg full"><label>Job title</label><input id="ehT" value="${esc(p.title||'')}"></div>
      <div class="fg"><label>Department</label><select id="ehD">${HR_DEPTS.map(d=>`<option value="${d.id}" ${p.dept===d.id?'selected':''}>${d.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Office</label><select id="ehO">${COMPANY.offices.map(o=>`<option value="${o.id}" ${p.office===o.id?'selected':''}>${o.flag} ${o.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Contract</label><select id="ehC">${Object.entries(CONTRACTS).map(([k,c])=>`<option value="${k}" ${p.contract===k?'selected':''}>${c.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Band</label><select id="ehB">${['L1','L2','L3','L4','L5'].map(b=>`<option ${(p.band||'L2')===b?'selected':''}>${b}</option>`).join('')}</select></div>
      <div class="fg"><label>Annual CTC (₹)</label><input id="ehS" type="number" value="800000"></div>
      <div class="fg"><label>Start date</label><input id="ehJ" type="date" value="${dayOffset(14)}"></div>
      <div class="fg"><label>Reports to</label><select id="ehR">${employees().map(e=>`<option value="${e.id}" ${e.leader?'selected':''}>${esc(e.name)} · ${esc(e.title)}</option>`).join('')}</select></div>
      <div class="fg"><label>Nationality</label><select id="ehF">${COUNTRIES.map(c=>`<option ${p.from===c?'selected':''}>${c}</option>`).join('')}</select></div>
    </div></div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="hrHireSave()"><i class="fa-solid fa-user-plus"></i> Create record</button></div>`, 660);
}
function hrHireSave(){
  const g = id => (document.getElementById(id)||{}).value || '';
  const name = g('ehN').trim(); if (!name){ toast('Enter a name'); return; }
  const n = employees().length + 1;
  const rec = {
    id:'BL-' + String(n).padStart(4,'0'), name, title:g('ehT')||'New starter',
    init:name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(),
    email:name.toLowerCase().replace(/\s+/g,'.')+'@bloomielts.com',
    dept:g('ehD'), office:g('ehO'), contract:g('ehC'), band:g('ehB'),
    ctc:+g('ehS')||0, joined:g('ehJ'), reports:g('ehR'), from:g('ehF'),
    years:0, status:'active', leave:{ taken:0, entitled:24 },
  };
  employees().push(rec); save();
  closeModal(); hr.emp = rec.id; hr.view = 'employee'; navTo('hr');
  toast(name + ' added as ' + rec.id + ' — issue the contract next', 'fa-user-plus');
  setTimeout(() => hrDocNew('contract', rec.id), 700);
}

/* ═══ LEAVE ═══ */
function hrLeaveHTML(){
  const all = hrLeave();
  const pend = all.filter(l => l.status === 'pending');
  const emp = employees();
  const totalTaken = emp.reduce((n,e) => n + e.leave.taken, 0);
  return `
    ${phead({ eyebrow:'HR · Leave', title:`<em>Leave</em>`,
      sub:`${pend.length} request${pend.length===1?'':'s'} awaiting a decision. Approving one generates the approval letter in a click.`,
      actions:`<button class="btn btn-p btn-sm" onclick="hrLeaveModal()"><i class="fa-solid fa-plus"></i> Record leave</button>` })}
    ${hrNav()}

    <div class="grid g4 mb2">
      ${statCard('Pending', pend.length, pend.length?'Awaiting your decision':'All clear', pend.length?'cor':'leaf', 'fa-hourglass-half')}
      ${statCard('Approved this year', all.filter(l=>l.status==='approved').length, totalTaken + ' days taken across the team', 'leaf', 'fa-circle-check')}
      ${statCard('Entitlement', '24 days', 'Plus 12 sick · 8 casual', 'sky', 'fa-umbrella-beach')}
      ${statCard('Away this month', all.filter(l=>l.status==='approved'&&l.from.slice(0,7)===today().slice(0,7)).reduce((n,l)=>n+l.days,0) + ' days', 'Booked across the team', 'amb', 'fa-plane-departure')}
    </div>

    ${pend.length ? `<div class="card mb2" style="border-color:var(--amber)">
      <div class="card-hd"><div style="flex:1"><h3>Awaiting a decision</h3><p>${pend.length} request${pend.length===1?'':'s'}</p></div></div>
      <div class="card-bd flush">
        ${pend.map(l => { const e = empOf(l.emp), t = LEAVE_TYPES[l.type];
          const clash = hrLeave().filter(x => x.status==='approved' && x.emp!==l.emp && x.from <= l.to && x.to >= l.from);
          return `<div class="row" style="align-items:flex-start">
            <div class="ic ${t.tone}"><i class="fa-solid ${t.ic}"></i></div>
            <div class="tx"><b>${esc(e?e.name:l.emp)} · ${t.name}</b>
              <span>${l.days} day${l.days===1?'':'s'} · ${longDate(l.from)} → ${longDate(l.to)} · filed ${l.filed}</span>
              <span style="font-style:italic;display:block;margin-top:3px">${esc(l.reason)}</span>
              ${e?`<span style="display:block;margin-top:4px;color:var(--ink-4)">${e.leave.taken} of ${e.leave.entitled} days used · ${e.leave.entitled - e.leave.taken} remaining</span>`:''}
              ${clash.length?`<span style="display:block;margin-top:4px;color:var(--amber);font-weight:700"><i class="fa-solid fa-triangle-exclamation"></i> Overlaps ${clash.length} other approved absence${clash.length===1?'':'s'}</span>`:''}</div>
            <button class="btn btn-g btn-sm" onclick="hrLeaveSet('${l.id}','rejected')">Decline</button>
            <button class="btn btn-p btn-sm" onclick="hrLeaveSet('${l.id}','approved')"><i class="fa-solid fa-check"></i> Approve</button></div>`;
        }).join('')}
      </div></div>` : ''}

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>All leave</h3><p>Newest first</p></div></div>
        <div class="card-bd flush">
          ${all.slice().sort((a,b)=>b.from.localeCompare(a.from)).map(l => { const e = empOf(l.emp), t = LEAVE_TYPES[l.type];
            return `<div class="row">
              <div class="ic ${t.tone}"><i class="fa-solid ${t.ic}"></i></div>
              <div class="tx"><b>${esc(e?e.name:l.emp)}</b><span>${t.name} · ${l.days}d · ${longDate(l.from)}</span></div>
              <span class="tag ${l.status==='approved'?'ok':l.status==='pending'?'amb':'cor'}">${l.status}</span>
              ${l.status==='approved'&&e?`<button class="icobtn" style="width:30px;height:30px;font-size:11px" title="Approval letter" onclick="hrDocNew('leaveApproval','${e.id}','${l.id}')"><i class="fa-solid fa-file-lines"></i></button>`:''}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Balances</h3><p>Annual entitlement used</p></div></div>
        <div class="card-bd">
          ${employees().slice().sort((a,b)=>b.leave.taken-a.leave.taken).slice(0,10).map(e => {
            const p = pct(e.leave.taken, e.leave.entitled);
            return `<div class="prow"><div class="lb"><span>${esc(e.name)}</span><b>${e.leave.taken} / ${e.leave.entitled}</b></div>
              <div class="bar thin"><i style="width:${p}%;background:${p>=85?'var(--coral)':p>=60?'var(--amber)':'var(--ok)'}"></i></div></div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}
function hrLeaveSet(id, status){
  const l = hrLeave().find(x => x.id === id); if (!l) return;
  l.status = status;
  const e = empOf(l.emp);
  if (status === 'approved' && e) e.leave.taken += l.days;
  save(); navTo('hr');
  toast(status === 'approved' ? 'Approved · ' + l.days + ' days deducted from the balance' : 'Request declined', status === 'approved' ? 'fa-circle-check' : 'fa-circle-xmark');
  if (status === 'approved' && e) setTimeout(() => hrDocNew('leaveApproval', e.id, l.id), 600);
}
function hrLeaveModal(empId){
  modal(`<div class="modal-hd"><div style="flex:1"><h3>Record leave</h3><p>Filed on behalf of an employee</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Employee</label><select id="lvE">${employees().map(e=>`<option value="${e.id}" ${empId===e.id?'selected':''}>${esc(e.name)} · ${e.leave.entitled - e.leave.taken} days left</option>`).join('')}</select></div>
      <div class="fg full"><label>Type</label><select id="lvT">${Object.entries(LEAVE_TYPES).map(([k,t])=>`<option value="${k}">${t.name}</option>`).join('')}</select></div>
      <div class="fg"><label>From</label><input id="lvF" type="date" value="${dayOffset(7)}"></div>
      <div class="fg"><label>To</label><input id="lvTo" type="date" value="${dayOffset(11)}"></div>
      <div class="fg full"><label>Reason</label><input id="lvR" placeholder="Brief reason"></div>
      <div class="fg full"><label>Status</label><select id="lvS"><option value="pending">Pending a decision</option><option value="approved">Approved</option></select></div>
    </div></div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="hrLeaveSave()"><i class="fa-solid fa-check"></i> Record</button></div>`, 600);
}
function hrLeaveSave(){
  const g = id => (document.getElementById(id)||{}).value || '';
  const from = g('lvF'), to = g('lvTo');
  if (!from || !to || to < from){ toast('Check the dates'); return; }
  let days = 0;
  for (let d = new Date(from+'T00:00:00'); d <= new Date(to+'T00:00:00'); d.setDate(d.getDate()+1)){
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
  }
  const rec = { id:'lv'+Date.now().toString(36), emp:g('lvE'), type:g('lvT'), from, to, days,
    status:g('lvS'), reason:g('lvR')||'—', filed:today() };
  hrLeave().unshift(rec);
  if (rec.status === 'approved'){ const e = empOf(rec.emp); if (e) e.leave.taken += days; }
  save(); closeModal(); navTo('hr');
  toast(days + ' working day' + (days===1?'':'s') + ' recorded', 'fa-calendar-check');
}

/* ═══ RECOGNITION ═══ */
function hrAwardsHTML(){
  const given = hrAwards();
  return `
    ${phead({ eyebrow:'HR · Recognition', title:`Awards &amp; <em>recognition</em>`,
      sub:'Best Faculty and the rest, issued as printable certificates on academy letterhead and recorded against the employee.',
      actions:`<button class="btn btn-p btn-sm" onclick="hrAwardModal()"><i class="fa-solid fa-trophy"></i> Present an award</button>` })}
    ${hrNav()}

    <div class="grid g4 mb2">
      ${statCard('Awards presented', given.length, 'Since ' + COMPANY.founded, 'amb', 'fa-trophy')}
      ${statCard('Best Faculty', (() => { const b = given.filter(a=>a.award==='best-faculty')[0]; return b ? (empOf(b.emp)||{}).name || '—' : '—'; })(),
        (() => { const b = given.filter(a=>a.award==='best-faculty')[0]; return b ? b.period : 'Not yet awarded'; })(), 'leaf', 'fa-medal')}
      ${statCard('People recognised', new Set(given.map(a=>a.emp)).size + ' of ' + employees().length, 'Across the team', 'sky', 'fa-users')}
      ${statCard('Award types', HR_AWARDS.length, 'Quarterly, annual and any-time', '', 'fa-star')}
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>The awards</h3><p>What each one recognises</p></div></div>
      <div class="card-bd">
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:13px">
          ${HR_AWARDS.map(a => {
            const n = given.filter(x => x.award === a.id).length;
            return `<div style="border:1px solid var(--line);border-radius:14px;padding:17px 19px">
              <div style="display:flex;gap:11px;align-items:center;margin-bottom:11px">
                <div style="width:36px;height:36px;flex:0 0 36px;border-radius:11px;background:var(--amber-soft);color:#a86e14;display:grid;place-items:center;font-size:15px"><i class="fa-solid ${a.ic}"></i></div>
                <div style="flex:1;min-width:0"><b style="font-size:14.5px;display:block">${a.name}</b>
                  <span style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${a.period}${n?' · '+n+' presented':''}</span></div></div>
              <div style="font-size:12px;color:var(--ink-3);line-height:1.55;margin-bottom:13px">${a.criteria}</div>
              <button class="btn btn-g btn-sm btn-blk" onclick="hrAwardModal('${a.id}')"><i class="fa-solid fa-trophy"></i> Present this</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${given.length ? `<div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Presented</h3><p>Every award on record</p></div></div>
      <div class="card-bd flush">
        ${given.map(a => { const aw = awardOf(a.award), e = empOf(a.emp);
          return `<div class="row" style="align-items:flex-start">
            <div class="ic amb"><i class="fa-solid ${aw.ic}"></i></div>
            <div class="tx"><b>${aw.name} · ${esc(a.period)}</b>
              <span>${esc(e?e.name:a.emp)}${e?' · ' + esc(e.title):''} · presented ${longDate(a.at)} by ${esc(a.by)}</span>
              <span style="font-style:italic;display:block;margin-top:4px">${esc(a.citation)}</span></div>
            <button class="btn btn-g btn-sm" onclick="hrAwardPrint('${a.id}')"><i class="fa-solid fa-certificate"></i> Certificate</button>
            <button class="icobtn" style="width:30px;height:30px;font-size:11px" onclick="hrAwardDel('${a.id}')"><i class="fa-solid fa-trash"></i></button></div>`;
        }).join('')}
      </div></div>` : ''}`;
}
function hrAwardModal(awardId){
  modal(`<div class="modal-hd">
      <div style="width:36px;height:36px;border-radius:11px;background:var(--amber-soft);color:#a86e14;display:grid;place-items:center"><i class="fa-solid fa-trophy"></i></div>
      <div style="flex:1"><h3>Present an award</h3><p>Generates a printable certificate and records it on the employee's file</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Award</label><select id="awA" onchange="hrAwardHint(this.value)">${HR_AWARDS.map(a=>`<option value="${a.id}" ${awardId===a.id?'selected':''}>${a.name} · ${a.period}</option>`).join('')}</select></div>
      <div id="awHint" style="grid-column:1/-1;font-size:12px;color:var(--ink-4);line-height:1.55;margin-top:-6px">${awardOf(awardId||'best-faculty').criteria}</div>
      <div class="fg full"><label>Recipient</label><select id="awE">${employees().map(e=>`<option value="${e.id}">${esc(e.name)} · ${esc(e.title)}</option>`).join('')}</select></div>
      <div class="fg"><label>Period</label><input id="awP" value="Q3 2026"></div>
      <div class="fg"><label>Presented by</label><input id="awB" value="${esc(COMPANY.director)}"></div>
      <div class="fg full"><label>Citation — why they won it</label><textarea id="awC" rows="3" placeholder="Be specific. A number or a named achievement makes the certificate mean something."></textarea></div>
    </div></div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="hrAwardSave()"><i class="fa-solid fa-certificate"></i> Present &amp; print</button></div>`, 640);
}
function hrAwardHint(id){ const el = document.getElementById('awHint'); if (el) el.textContent = awardOf(id).criteria; }
function hrAwardSave(){
  const g = id => (document.getElementById(id)||{}).value || '';
  const cit = g('awC').trim();
  if (!cit){ toast('Write a citation — a certificate without one means nothing'); return; }
  const rec = { id:'aw'+Date.now().toString(36), award:g('awA'), emp:g('awE'), period:g('awP'),
    citation:cit, at:today(), by:g('awB') || COMPANY.director };
  hrAwards().unshift(rec); save();
  closeModal(); navTo('hr');
  toast(awardOf(rec.award).name + ' presented', 'fa-trophy');
  setTimeout(() => hrAwardPrint(rec.id), 400);
}
function hrAwardDel(id){
  if (!confirm('Remove this award from the record?')) return;
  B.hr.awards = hrAwards().filter(a => a.id !== id); save(); navTo('hr'); toast('Award removed');
}
/* certificates route through the same letter engine */
function hrAwardPrint(id){
  const a = hrAwards().find(x => x.id === id); if (!a) return;
  const e = empOf(a.emp);
  const doc = { id:'tmp', type:'award', emp:a.emp, ref:'BL/AWD/' + new Date(a.at).getFullYear() + '/' + a.id.slice(-3).toUpperCase(), at:a.at, by:a.by,
    data:{ name:e?e.name:a.emp, awardName:awardOf(a.award).name, period:a.period, citation:a.citation, presentedBy:a.by } };
  const existing = hrDocs().find(d => d.type === 'award' && d.data.name === doc.data.name && d.data.period === a.period);
  if (existing){ hrDocPrint(existing.id); return; }
  hrDocs().unshift(doc); doc.id = 'd'+Date.now().toString(36); save();
  hrDocPrint(doc.id);
}

/* ═══ PERFORMANCE REVIEW ═══ */
function hrReviewModal(empId){
  const e = empOf(empId); if (!e) return;
  const prev = hrStore().reviews[empId];
  modal(`<div class="modal-hd">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800">${e.init}</div>
      <div style="flex:1"><h3>Performance review</h3><p>${esc(e.name)} · ${esc(e.title)}${prev?' · last reviewed ' + prev.at:''}</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      <div style="display:grid;gap:14px">
        ${REVIEW_CRITERIA.map(c => {
          const v = prev ? (prev.scores[c.id] || 3) : 3;
          return `<div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
              <b style="font-size:13px">${c.name}</b>
              <span style="font-family:var(--mono);font-size:12px;color:var(--leaf-700)" id="rv-${c.id}-v">${v} / 5</span></div>
            <div style="font-size:11.5px;color:var(--ink-4);margin-bottom:7px">${c.note}</div>
            <input class="range" type="range" min="1" max="5" step="1" value="${v}" data-r="${c.id}"
              oninput="document.getElementById('rv-${c.id}-v').textContent=this.value+' / 5'"></div>`;
        }).join('')}
      </div>
      <div class="fg" style="margin-top:16px"><label>Reviewer's note</label>
        <textarea id="rvNote" rows="3" placeholder="What they did well, and the one thing to work on.">${esc(prev?prev.note:'')}</textarea></div>
    </div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="hrReviewSave('${empId}')"><i class="fa-solid fa-check"></i> Save review</button></div>`, 620);
}
function hrReviewSave(empId){
  const scores = {};
  document.querySelectorAll('.modal [data-r]').forEach(el => scores[el.dataset.r] = +el.value);
  const vals = Object.values(scores);
  const overall = vals.reduce((a,b)=>a+b,0) / vals.length;
  hrStore().reviews[empId] = { scores, overall, note:(document.getElementById('rvNote')||{}).value||'',
    at:today(), by:(B.role==='admin'?COMPANY.director:(typeof me==='function'?me().name:'HR')) };
  save(); closeModal(); navTo('hr');
  toast('Review saved · overall ' + overall.toFixed(1) + ' of 5', 'fa-star-half-stroke');
  if (overall >= 4.5) setTimeout(() => toast('Strong review — consider a promotion or an increment letter', 'fa-lightbulb'), 1800);
}


/* ═══════════════════════════════════════════════════════════════
   CAREERS PAGE INTAKE
   Applications submitted on careers.html are queued in localStorage
   and written into the CMS. Drain them into the hiring pipeline so
   a website applicant appears at the Applied stage automatically.
═══════════════════════════════════════════════════════════════ */

function hrAppIngest(a){
  const list = hrApplicants();
  if (list.some(x => x.id === a.id || (x.ref && x.ref === a.ref))) return false;
  list.unshift({
    id: a.id, name: a.name, init: a.init,
    email: a.email, phone: a.phone, country: a.country,
    vacancy: a.vacancy || (HR_VACANCIES[0] || {}).id,
    stage: 'applied', years: a.years, applied: a.applied,
    note: a.note + (a.cv ? '\n\nCV: ' + a.cv : '')
      + '\n\nExaminer status: ' + (a.examiner || '—')
      + ' · can teach from ' + (a.officeName || '—')
      + (a.vacancy ? '' : ' · speculative application'),
    ref: a.ref, source: a.source || 'careers page', web: true,
  });
  return true;
}

function hrAppDrain(){
  let q = [];
  try { q = JSON.parse(localStorage.getItem('bloom_app_queue') || '[]'); } catch(err){}
  /* the careers page also writes into the CMS, so read both and dedupe */
  let fromCms = [];
  try { fromCms = (cms().applications || []); } catch(err){}
  const all = [...q, ...fromCms];
  if (!all.length) return;
  try { localStorage.removeItem('bloom_app_queue'); } catch(err){}
  let added = 0;
  all.forEach(a => { if (hrAppIngest(a)) added++; });
  if (added){
    save();
    notify(added + ' new job application' + (added === 1 ? '' : 's'),
      'From the careers page — waiting at the Applied stage in Hiring.', 'fa-user-plus');
    toast(added + ' new application' + (added === 1 ? '' : 's') + ' from the website', 'fa-user-plus');
  }
}
