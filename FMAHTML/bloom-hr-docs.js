/* ═══════════════════════════════════════════════════════════════
   BLOOM — HR document engine
   Real letters on company letterhead: offer, contract, promotion,
   warning, termination, relieving, reference, recommendation,
   experience certificate, award certificate, NDA, leave approval.
═══════════════════════════════════════════════════════════════ */

/* ═══ DOCUMENT LIBRARY ═══ */
function hrDocsHTML(){
  const all = hrDocs();
  const byGrp = {};
  Object.entries(HR_DOCS).forEach(([k,t]) => { (byGrp[t.grp] = byGrp[t.grp] || []).push([k,t]); });
  return `
    ${phead({ eyebrow:'HR · Documents', title:`Letters &amp; <em>contracts</em>`,
      sub:'Every document the academy issues, on letterhead with the legal details filled in. Each one is archived against the employee.',
      actions:`<button class="btn btn-g btn-sm" onclick="hr.view='dash';navTo('hr')"><i class="fa-solid fa-arrow-left"></i> HR overview</button>
        <button class="btn btn-p btn-sm" onclick="hrDocPick()"><i class="fa-solid fa-file-signature"></i> Issue a letter</button>` })}
    ${hrNav()}

    <div class="seg mb" style="margin-bottom:18px">
      <button class="${hr.tab==='issued'?'on':''}" onclick="hr.tab='issued';navTo('hr')">Issued <b style="font-family:var(--mono);margin-left:5px">${all.length}</b></button>
      <button class="${hr.tab==='templates'?'on':''}" onclick="hr.tab='templates';navTo('hr')">Templates <b style="font-family:var(--mono);margin-left:5px">${Object.keys(HR_DOCS).length}</b></button>
    </div>

    ${hr.tab === 'templates' ? HR_DOC_GRPS.map(g => {
      const items = byGrp[g] || [];
      if (!items.length) return '';
      return `<div style="margin-bottom:26px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:13px">
          <h3 style="font-family:var(--display);font-size:16px;font-weight:700">${g}</h3>
          <div style="flex:1;height:1px;background:var(--line)"></div>
          <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${items.length}</span></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:13px">
          ${items.map(([k,t]) => {
            const n = all.filter(d => d.type === k).length;
            const [bg,fg] = toneVars(t.tone);
            return `<div class="card"><div class="card-bd" style="padding:17px 19px">
              <div style="display:flex;gap:11px;align-items:flex-start;margin-bottom:11px">
                <div style="width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:${bg};color:${fg};display:grid;place-items:center"><i class="fa-solid ${t.ic}"></i></div>
                <div style="flex:1;min-width:0"><b style="font-size:14px;display:block;line-height:1.25">${t.name}</b>
                  <span style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${t.fields.length} fields${n?' · '+n+' issued':''}</span></div></div>
              <div style="font-size:12px;color:var(--ink-3);line-height:1.55;margin-bottom:13px">${t.sub}</div>
              <button class="btn btn-p btn-sm btn-blk" onclick="hrDocNew('${k}')"><i class="fa-solid fa-pen"></i> Draft this</button>
            </div></div>`;
          }).join('')}
        </div></div>`;
    }).join('')
    : all.length ? `<div class="card"><div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Reference</th><th>Document</th><th>Employee</th><th>Issued</th><th>By</th><th></th></tr></thead>
        <tbody>${all.map(d => { const t = HR_DOCS[d.type], e = empOf(d.emp);
          return `<tr>
            <td style="font-family:var(--mono);font-size:11.5px">${d.ref}</td>
            <td><div style="display:flex;gap:9px;align-items:center">
              <i class="fa-solid ${t.ic}" style="color:var(--ink-4);width:16px"></i>
              <b style="color:var(--ink)">${t.name}</b></div></td>
            <td>${esc(e ? e.name : (d.data.name || '—'))}</td>
            <td style="font-family:var(--mono);font-size:11.5px">${d.at}</td>
            <td style="font-size:12px">${esc(d.by)}</td>
            <td style="text-align:right;white-space:nowrap">
              <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Print or save as PDF" onclick="hrDocPrint('${d.id}')"><i class="fa-solid fa-print"></i></button>
              <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Duplicate" onclick="hrDocDupe('${d.id}')"><i class="fa-solid fa-copy"></i></button>
              <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Delete" onclick="hrDocDel('${d.id}')"><i class="fa-solid fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody></table></div></div></div>`
      : `<div class="empty"><i class="fa-solid fa-folder-open"></i><b>No documents issued yet</b>
          <span>Pick a template and Bloom fills in the company details, the employee record and the legal wording.</span>
          <div style="margin-top:16px"><button class="btn btn-p" onclick="hr.tab='templates';navTo('hr')"><i class="fa-solid fa-file-signature"></i> Browse the templates</button></div></div>`}`;
}

/* ═══ PICK A TEMPLATE ═══ */
function hrDocPick(empId){
  const byGrp = {};
  Object.entries(HR_DOCS).forEach(([k,t]) => { (byGrp[t.grp] = byGrp[t.grp] || []).push([k,t]); });
  const e = empId ? empOf(empId) : null;
  modal(`
    <div class="modal-hd"><div style="flex:1"><h3>Which letter?</h3><p>${e?'For ' + esc(e.name) + ' · ' + e.id:'Choose a template and pick the person next'}</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd" style="overflow-y:auto">
      ${HR_DOC_GRPS.map(g => `
        <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin:0 0 9px">${g}</div>
        <div style="display:grid;gap:7px;margin-bottom:18px">
          ${(byGrp[g]||[]).map(([k,t])=>`<button class="btn btn-g btn-sm" style="justify-content:flex-start;text-align:left;white-space:normal;line-height:1.4;height:auto;padding:11px 13px" onclick="closeModal();hrDocNew('${k}'${empId?",'"+empId+"'":''})">
            <i class="fa-solid ${t.ic}" style="width:16px;color:var(--leaf-600)"></i>
            <span><b style="display:block">${t.name}</b><span style="font-size:11.5px;color:var(--ink-4);font-weight:500">${t.sub}</span></span></button>`).join('')}
        </div>`).join('')}
    </div>`, 620);
}

/* ═══ DRAFT A DOCUMENT ═══ */
const HR_FIELD_META = {
  name:{ l:'Full name', t:'text' }, title:{ l:'Job title', t:'text' }, oldTitle:{ l:'Previous title', t:'text' },
  dept:{ l:'Department', t:'select', opts:() => HR_DEPTS.map(d => d.name) },
  contract:{ l:'Contract type', t:'select', opts:() => Object.values(CONTRACTS).map(c => c.name) },
  office:{ l:'Office', t:'select', opts:() => COMPANY.offices.map(o => o.name + ', ' + o.country) },
  ctc:{ l:'Annual CTC (₹)', t:'number' }, oldCtc:{ l:'Previous CTC (₹)', t:'number' },
  band:{ l:'Band', t:'text' }, startDate:{ l:'Start date', t:'date' }, endDate:{ l:'Contract end date', t:'date' },
  effectiveDate:{ l:'Effective from', t:'date' }, lastDay:{ l:'Last working day', t:'date' },
  resignDate:{ l:'Date of resignation', t:'date' }, deadline:{ l:'Offer valid until', t:'date' },
  reviewDate:{ l:'Review date', t:'date' }, fromDate:{ l:'Leave from', t:'date' }, toDate:{ l:'Leave to', t:'date' },
  reportsTo:{ l:'Reports to', t:'text' }, probation:{ l:'Probation period', t:'text' },
  notice:{ l:'Notice period', t:'text' }, hours:{ l:'Working hours', t:'text' }, term:{ l:'Term of the agreement', t:'text' },
  days:{ l:'Number of days', t:'number' }, leaveType:{ l:'Type of leave', t:'select', opts:() => Object.values(LEAVE_TYPES).map(l => l.name) },
  cover:{ l:'Cover arrangements', t:'textarea' }, handover:{ l:'Handover arrangements', t:'textarea' },
  grounds:{ l:'Grounds for termination', t:'textarea' }, settlement:{ l:'Final settlement', t:'textarea' },
  issue:{ l:'Conduct or performance concern', t:'textarea' }, expected:{ l:'Required improvement', t:'textarea' },
  stage:{ l:'Stage', t:'select', opts:() => ['First written warning','Second written warning','Final written warning'] },
  reviewNote:{ l:'Note', t:'textarea' }, conduct:{ l:'Conduct during service', t:'select', opts:() => ['excellent','very good','good','satisfactory'] },
  duties:{ l:'Duties and responsibilities', t:'textarea' }, strengths:{ l:'Key strengths', t:'textarea' },
  achievement:{ l:'A specific achievement', t:'textarea' }, addressee:{ l:'Addressed to', t:'text' },
  purpose:{ l:'Purpose of the letter', t:'text' },
  awardName:{ l:'Award', t:'select', opts:() => HR_AWARDS.map(a => a.name) },
  period:{ l:'Period', t:'text' }, citation:{ l:'Citation', t:'textarea' }, presentedBy:{ l:'Presented by', t:'text' },
};

function hrDocNew(type, empId, leaveId){
  const t = HR_DOCS[type];
  const e = empId ? empOf(empId) : null;
  const lv = leaveId ? hrLeave().find(l => l.id === leaveId) : null;
  hr.doc = { type, emp:empId || null };
  const pre = hrPrefill(type, e, lv);
  modal(`
    <div class="modal-hd">
      <div style="width:36px;height:36px;border-radius:11px;background:${toneVars(t.tone)[0]};color:${toneVars(t.tone)[1]};display:grid;place-items:center"><i class="fa-solid ${t.ic}"></i></div>
      <div style="flex:1"><h3>${t.name}</h3><p>${t.sub}</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd" style="overflow-y:auto">
      ${!e ? `<div class="fg" style="margin-bottom:16px"><label>Employee</label>
        <select id="hdEmp" onchange="hrDocSwap('${type}',this.value)">
          <option value="">— not an existing employee (fill in by hand) —</option>
          ${employees().map(x=>`<option value="${x.id}">${esc(x.name)} · ${esc(x.title)}</option>`).join('')}
        </select></div>` : `<div style="display:flex;gap:11px;align-items:center;padding:12px 14px;background:var(--leaf-50);border-radius:11px;margin-bottom:16px">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--leaf-700);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800">${e.init}</div>
          <div style="flex:1"><b style="font-size:13px;display:block">${esc(e.name)}</b><span style="font-size:11.5px;color:var(--ink-4)">${e.id} · ${esc(e.title)}</span></div>
          <button class="btn btn-g btn-sm" onclick="closeModal();hrDocNew('${type}')">Change</button></div>`}
      <div class="fgrid">
        ${t.fields.map(f => {
          const m = HR_FIELD_META[f] || { l:f, t:'text' };
          const v = pre[f] != null ? pre[f] : '';
          const full = m.t === 'textarea' ? ' full' : '';
          if (m.t === 'select') return `<div class="fg${full}"><label>${m.l}</label><select data-f="${f}">${m.opts().map(o=>`<option ${String(v)===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
          if (m.t === 'textarea') return `<div class="fg full"><label>${m.l}</label><textarea rows="3" data-f="${f}">${esc(v)}</textarea></div>`;
          return `<div class="fg${full}"><label>${m.l}</label><input type="${m.t}" data-f="${f}" value="${esc(v)}"></div>`;
        }).join('')}
      </div>
    </div>
    <div class="modal-ft">
      <button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-g" onclick="hrDocSave(1)"><i class="fa-solid fa-floppy-disk"></i> Save to file</button>
      <button class="btn btn-p" onclick="hrDocSave(0,1)"><i class="fa-solid fa-print"></i> Save &amp; print</button></div>`, 700);
}
function hrDocSwap(type, empId){ closeModal(); hrDocNew(type, empId || null); }

/* sensible defaults drawn from the employee record */
function hrPrefill(type, e, lv){
  const p = {};
  if (e){
    p.name = e.name; p.title = e.title; p.dept = deptOf(e.dept).name;
    p.contract = CONTRACTS[e.contract].name; p.office = officeOf(e.office).name + ', ' + officeOf(e.office).country;
    p.ctc = e.ctc; p.oldCtc = e.ctc; p.band = e.band; p.startDate = e.joined; p.endDate = e.ends || '';
    p.reportsTo = e.reports ? (empOf(e.reports)||{}).name || '' : COMPANY.director;
    p.notice = CONTRACTS[e.contract].notice; p.oldTitle = e.title;
    p.duties = 'Planning and delivering ' + deptOf(e.dept).name.toLowerCase() + ' work at Bloom, including ' + (e.dept==='academic'?'lesson delivery, assessment against the official band descriptors, and marking written and spoken work to the academy standard':'day-to-day responsibility for ' + e.title.toLowerCase() + ' across the academy') + '.';
    p.strengths = 'Subject expertise, reliability, and a consistent record of raising student outcomes.';
  }
  p.probation = '3 months'; p.hours = '40 hours per week, Monday to Friday'; p.term = 'For the duration of employment and three years thereafter';
  p.effectiveDate = today(); p.startDate = p.startDate || dayOffset(21); p.deadline = dayOffset(14);
  p.lastDay = dayOffset(60); p.reviewDate = dayOffset(30); p.resignDate = today();
  p.presentedBy = COMPANY.director; p.period = 'Q3 2026'; p.conduct = 'excellent';
  p.notice = p.notice || '60 days'; p.stage = 'First written warning';
  p.settlement = 'All salary accrued to the last working day, unused annual leave encashed, and statutory dues settled within 30 days of the last working day.';
  p.handover = 'Complete handover of cohorts, marking in progress and student records to a nominated colleague before the last working day.';
  p.addressee = 'To whom it may concern'; p.purpose = 'employment verification';
  if (lv){
    p.leaveType = LEAVE_TYPES[lv.type].name; p.fromDate = lv.from; p.toDate = lv.to; p.days = lv.days;
    p.cover = 'Classes covered by a nominated colleague; students notified in advance.';
  }
  return p;
}

function hrDocSave(saveOnly, thenPrint){
  const { type, emp } = hr.doc;
  const data = {};
  document.querySelectorAll('.modal [data-f]').forEach(el => { data[el.dataset.f] = el.type === 'number' ? (el.value === '' ? null : +el.value) : el.value; });
  if (!String(data.name || '').trim()){ toast('The name is required'); return; }
  const n = hrDocs().length + 1;
  const rec = {
    id:'d'+Date.now().toString(36), type, emp,
    ref:'BL/HR/' + new Date().getFullYear() + '/' + String(n).padStart(3,'0'),
    at:today(), by:(B.role === 'admin' ? COMPANY.director : (typeof me === 'function' ? me().name : 'HR')), data,
  };
  hrDocs().unshift(rec); save();
  closeModal();
  if (thenPrint) hrDocPrint(rec.id);
  navTo('hr');
  toast(HR_DOCS[type].name + ' issued · ' + rec.ref, 'fa-file-signature');
}
function hrDocDel(id){
  const d = hrDocs().find(x => x.id === id); if (!d) return;
  if (!confirm('Delete ' + HR_DOCS[d.type].name + ' ' + d.ref + '? The archived copy is removed.')) return;
  B.hr.docs = hrDocs().filter(x => x.id !== id); save(); navTo('hr'); toast('Document deleted');
}
function hrDocDupe(id){
  const d = hrDocs().find(x => x.id === id); if (!d) return;
  hr.doc = { type:d.type, emp:d.emp };
  hrDocNew(d.type, d.emp);
  setTimeout(() => {
    document.querySelectorAll('.modal [data-f]').forEach(el => { if (d.data[el.dataset.f] != null) el.value = d.data[el.dataset.f]; });
  }, 80);
}

/* ═══ LETTERHEAD ═══ */
function hrLetterhead(){
  return `<div class="lh">
    <div class="lh-l">
      <div class="mark"></div>
      <div><div class="nm">${COMPANY.trading}</div><div class="tg">The school for English, accepted all over the globe</div></div>
    </div>
    <div class="lh-r">
      <div>${COMPANY.hq}</div>
      <div>${COMPANY.phone} · ${COMPANY.email}</div>
      <div>CIN ${COMPANY.cin}</div>
    </div>
  </div>`;
}
function hrLetterCSS(){
  return `
    @page{size:A4;margin:0}
    *{box-sizing:border-box}
    body{font-family:Georgia,'Times New Roman',serif;color:#12211a;font-size:11pt;line-height:1.7;margin:0}
    .page{width:210mm;min-height:297mm;padding:18mm 20mm 24mm;position:relative;background:#fff}
    .lh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #2f6b3a;padding-bottom:11px;margin-bottom:26px}
    .lh-l{display:flex;gap:11px;align-items:center}
    .lh-l .mark{width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 50% 50%,#1d4427 0 26%,#5da35f 26% 58%,#a3d199 58%)}
    .lh-l .nm{font-family:system-ui,sans-serif;font-size:14pt;font-weight:800;color:#14351d;letter-spacing:-.3px}
    .lh-l .tg{font-family:system-ui,sans-serif;font-size:7.5pt;color:#5da35f;font-weight:700;letter-spacing:.4px}
    .lh-r{font-family:system-ui,sans-serif;font-size:7.5pt;color:#5d7266;text-align:right;line-height:1.6}
    .meta{display:flex;justify-content:space-between;font-family:system-ui,sans-serif;font-size:8.5pt;color:#5d7266;margin-bottom:22px}
    h1{font-family:system-ui,sans-serif;font-size:14pt;font-weight:800;color:#14351d;margin:0 0 3px;letter-spacing:-.2px}
    .sub{font-family:system-ui,sans-serif;font-size:8.5pt;color:#5d7266;text-transform:uppercase;letter-spacing:1.6px;margin-bottom:22px}
    p{margin:0 0 13px;text-align:justify}
    .to{margin-bottom:20px;font-size:10.5pt}
    .to b{display:block;font-size:11pt}
    table.terms{width:100%;border-collapse:collapse;margin:6px 0 18px;font-family:system-ui,sans-serif;font-size:9.5pt}
    table.terms td{padding:7px 0;border-bottom:1px solid #e3ebe4;vertical-align:top}
    table.terms td:first-child{width:38%;color:#5d7266}
    table.terms td:last-child{font-weight:700;color:#12211a}
    ol,ul{margin:0 0 14px;padding-left:20px}li{margin-bottom:7px;text-align:justify}
    .sign{margin-top:34px;display:flex;justify-content:space-between;gap:30px}
    .sign div{flex:1}
    .sign .line{border-bottom:1px solid #12211a;height:34px;margin-bottom:6px}
    .sign .who{font-family:system-ui,sans-serif;font-size:9pt;font-weight:700}
    .sign .role{font-family:system-ui,sans-serif;font-size:8pt;color:#5d7266}
    .foot{position:absolute;left:20mm;right:20mm;bottom:11mm;border-top:1px solid #e3ebe4;padding-top:7px;font-family:system-ui,sans-serif;font-size:7pt;color:#8b9d93;display:flex;justify-content:space-between}
    .cert{text-align:center;padding:14mm 0}
    .cert .ribbon{font-family:system-ui,sans-serif;font-size:9pt;letter-spacing:4px;text-transform:uppercase;color:#5da35f;font-weight:800;margin-bottom:16px}
    .cert h2{font-family:system-ui,sans-serif;font-size:30pt;font-weight:800;color:#14351d;margin:0 0 6px;letter-spacing:-1px;line-height:1.1}
    .cert .pres{font-size:11pt;color:#5d7266;margin-bottom:26px}
    .cert .who{font-family:Georgia,serif;font-size:26pt;color:#2f6b3a;border-bottom:2px solid #a3d199;display:inline-block;padding:0 26px 8px;margin-bottom:22px}
    .cert .cit{font-size:11pt;max-width:140mm;margin:0 auto 26px;text-align:center;line-height:1.75}
    .seal{width:74px;height:74px;border-radius:50%;border:2.5px solid #5da35f;display:inline-grid;place-items:center;font-family:system-ui,sans-serif;font-size:7pt;font-weight:800;color:#2f6b3a;letter-spacing:1px;line-height:1.3;text-align:center}
    @media print{ .page{margin:0} }
  `;
}

/* ═══ RENDER EACH LETTER ═══ */
function hrDocBody(d){
  const v = d.data, e = d.emp ? empOf(d.emp) : null;
  const D = k => longDate(v[k]);
  const money = k => v[k] ? inr(v[k]) : '—';
  const terms = rows => `<table class="terms">${rows.filter(r => r[1] && r[1] !== '—').map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>`;
  const sign = (who, role, counter) => `<div class="sign">
    <div><div class="line"></div><div class="who">${esc(who || COMPANY.director)}</div><div class="role">${esc(role || COMPANY.directorRole)} · ${COMPANY.trading}</div></div>
    ${counter ? `<div><div class="line"></div><div class="who">${esc(v.name)}</div><div class="role">${counter}</div></div>` : ''}
  </div>`;

  switch(d.type){
    case 'offer': return `
      <h1>Offer of employment</h1><div class="sub">Private &amp; confidential</div>
      <div class="to"><b>${esc(v.name)}</b>${v.addressee?esc(v.addressee):''}</div>
      <p>Dear ${esc(v.name.split(' ')[0])},</p>
      <p>Following your interview and the assessment of your teaching, I am delighted to offer you the position of <b>${esc(v.title)}</b> in the ${esc(v.dept)} department at ${COMPANY.trading}, based at our ${esc(v.office)} office.</p>
      ${terms([['Position',v.title],['Department',v.dept],['Contract type',v.contract],['Location',v.office],
        ['Annual cost to company',money('ctc')],['Start date',D('startDate')],['Reporting to',v.reportsTo],['Probation',v.probation]])}
      <p>This offer is subject to satisfactory references, verification of your qualifications and the right to work in the country of your posting. During probation either party may end the engagement on two weeks' written notice.</p>
      <p>Please confirm your acceptance by signing and returning a copy of this letter by <b>${D('deadline')}</b>. We look forward to you joining the academy.</p>
      <p>Yours sincerely,</p>
      ${sign(null, null, 'Accepted and agreed')}`;

    case 'contract': return `
      <h1>Contract of employment</h1><div class="sub">${esc(v.contract)} · ${esc(v.office)}</div>
      <p>This agreement is made between <b>${COMPANY.legal}</b> (CIN ${COMPANY.cin}), registered at ${COMPANY.hq} — hereafter "the Academy" — and <b>${esc(v.name)}</b>, hereafter "the Employee".</p>
      ${terms([['Position',v.title],['Department',v.dept],['Contract type',v.contract],['Place of work',v.office],
        ['Commencement',D('startDate')],['Term',v.endDate?'Fixed term to ' + D('endDate'):'Indefinite'],
        ['Annual cost to company',money('ctc')],['Working hours',v.hours],['Reporting to',v.reportsTo],['Notice period',v.notice]])}
      <p><b>1. Duties.</b> The Employee shall carry out the duties of the position to the professional standard of the Academy, and such other reasonable duties as may be assigned. Teaching staff are required to mark student work within 48 hours and to assess against the official band descriptors of the relevant examination.</p>
      <p><b>2. Remuneration.</b> Salary is payable monthly in arrears by bank transfer, subject to statutory deductions. Remuneration is reviewed annually each April.</p>
      <p><b>3. Leave.</b> The Employee is entitled to 24 days of paid annual leave per calendar year in addition to public holidays at the place of work, plus sick and casual leave in accordance with the staff handbook.</p>
      <p><b>4. Confidentiality.</b> The Employee shall not at any time disclose student records, assessment materials, curriculum content or commercial information of the Academy. This obligation survives the end of employment.</p>
      <p><b>5. Intellectual property.</b> Teaching materials, recordings and assessments created in the course of employment remain the property of the Academy.</p>
      <p><b>6. Termination.</b> Either party may terminate on ${esc(v.notice)} written notice. The Academy may terminate without notice for gross misconduct.</p>
      <p><b>7. Governing law.</b> This agreement is governed by the laws of India, with the courts of Bengaluru having exclusive jurisdiction.</p>
      ${sign(null, null, 'Employee')}`;

    case 'confirm': return `
      <h1>Confirmation of employment</h1><div class="sub">End of probation</div>
      <div class="to"><b>${esc(v.name)}</b>${esc(v.title)}</div>
      <p>Dear ${esc(v.name.split(' ')[0])},</p>
      <p>I am pleased to confirm that, having satisfactorily completed your probationary period which began on ${D('startDate')}, you are confirmed in the position of <b>${esc(v.title)}</b> with effect from <b>${D('effectiveDate')}</b>.</p>
      ${v.reviewNote?`<p>${esc(v.reviewNote)}</p>`:''}
      <p>All other terms of your contract of employment remain unchanged. Congratulations, and thank you for the contribution you have already made.</p>
      <p>Yours sincerely,</p>${sign()}`;

    case 'promotion': return `
      <h1>Promotion</h1><div class="sub">Change of role and remuneration</div>
      <div class="to"><b>${esc(v.name)}</b>${esc(v.oldTitle||'')}</div>
      <p>Dear ${esc(v.name.split(' ')[0])},</p>
      <p>In recognition of your contribution to the academy, I am pleased to confirm your promotion with effect from <b>${D('effectiveDate')}</b>.</p>
      ${terms([['Previous position',v.oldTitle],['New position',v.title],['Band',v.band],['Revised annual CTC',money('ctc')],['Reporting to',v.reportsTo],['Effective from',D('effectiveDate')]])}
      <p>Your revised remuneration takes effect from the same date. All other terms of your contract remain unchanged.</p>
      <p>Congratulations — this is well earned.</p>
      <p>Yours sincerely,</p>${sign()}`;

    case 'increment': return `
      <h1>Salary revision</h1><div class="sub">Effective ${D('effectiveDate')}</div>
      <div class="to"><b>${esc(v.name)}</b>${esc(v.title)}</div>
      <p>Dear ${esc(v.name.split(' ')[0])},</p>
      <p>Following your performance review, your remuneration has been revised with effect from <b>${D('effectiveDate')}</b>.</p>
      ${terms([['Previous annual CTC',money('oldCtc')],['Revised annual CTC',money('ctc')],
        ['Increase',v.ctc&&v.oldCtc?inr(v.ctc-v.oldCtc)+' ('+Math.round((v.ctc-v.oldCtc)/v.oldCtc*100)+'%)':'—'],['Effective from',D('effectiveDate')]])}
      ${v.reviewNote?`<p>${esc(v.reviewNote)}</p>`:''}
      <p>All other terms of your employment remain unchanged.</p>
      <p>Yours sincerely,</p>${sign()}`;

    case 'warning': return `
      <h1>${esc(v.stage||'Written warning')}</h1><div class="sub">Private &amp; confidential</div>
      <div class="to"><b>${esc(v.name)}</b>${esc(v.title)}</div>
      <p>Dear ${esc(v.name.split(' ')[0])},</p>
      <p>This letter constitutes a <b>${esc((v.stage||'first written warning').toLowerCase())}</b> regarding the matter set out below. It follows a discussion in which you were given the opportunity to respond.</p>
      <p><b>The concern.</b> ${esc(v.issue)}</p>
      <p><b>What is required.</b> ${esc(v.expected)}</p>
      <p>Your conduct in this respect will be reviewed on <b>${D('reviewDate')}</b>. If the required improvement is not evident, further action may follow, which may include termination of employment.</p>
      <p>You have the right to respond to this letter in writing within seven days, and to be accompanied at any subsequent meeting. A copy will be placed on your personnel file.</p>
      <p>Yours sincerely,</p>${sign(null, null, 'Acknowledged by the employee')}`;

    case 'termination': return `
      <h1>Termination of employment</h1><div class="sub">Private &amp; confidential</div>
      <div class="to"><b>${esc(v.name)}</b>${esc(v.title)} · ${esc(v.dept)}</div>
      <p>Dear ${esc(v.name.split(' ')[0])},</p>
      <p>I write to confirm that your employment with ${COMPANY.trading}, which commenced on ${D('startDate')}, will terminate on <b>${D('lastDay')}</b>.</p>
      <p><b>Grounds.</b> ${esc(v.grounds)}</p>
      ${terms([['Position held',v.title],['Department',v.dept],['Date of joining',D('startDate')],
        ['Last working day',D('lastDay')],['Notice',v.notice],['Tenure',e?hrTenure(e.joined, v.lastDay):'—']])}
      <p><b>Final settlement.</b> ${esc(v.settlement)}</p>
      <p>You are required to return all academy property, including any equipment, access credentials and teaching materials, on or before your last working day. Your obligations of confidentiality continue after the end of employment.</p>
      <p>A relieving letter and experience certificate will be issued once the handover and settlement are complete. Should you wish to discuss this decision, please contact me directly.</p>
      <p>Yours sincerely,</p>${sign(null, null, 'Received by the employee')}`;

    case 'resignation': return `
      <h1>Acceptance of resignation</h1><div class="sub">${esc(v.title)}</div>
      <div class="to"><b>${esc(v.name)}</b>${esc(v.title)}</div>
      <p>Dear ${esc(v.name.split(' ')[0])},</p>
      <p>I acknowledge receipt of your letter of resignation dated ${D('resignDate')}, and accept it with regret.</p>
      ${terms([['Resignation received',D('resignDate')],['Notice period',v.notice],['Last working day',D('lastDay')]])}
      <p><b>Handover.</b> ${esc(v.handover)}</p>
      <p>Your final settlement, including salary to the last working day and any unused leave, will be processed within thirty days. A relieving letter and experience certificate will follow.</p>
      <p>Thank you for your contribution to the academy. We wish you well.</p>
      <p>Yours sincerely,</p>${sign()}`;

    case 'relieving': return `
      <h1>Relieving letter</h1><div class="sub">To whom it may concern</div>
      <p>This is to certify that <b>${esc(v.name)}</b> was employed with ${COMPANY.legal} as <b>${esc(v.title)}</b> in the ${esc(v.dept)} department from ${D('startDate')} to ${D('lastDay')}.</p>
      <p>${esc(v.name.split(' ')[0])} has been relieved of all duties with effect from the close of business on ${D('lastDay')}. All company property has been returned and all dues have been settled in full. There are no outstanding obligations on either side.</p>
      <p>Their conduct during the period of service was <b>${esc(v.conduct)}</b>.</p>
      <p>We wish them every success in their future endeavours.</p>
      ${sign()}`;

    case 'experience': return `
      <h1>Experience certificate</h1><div class="sub">To whom it may concern</div>
      <p>This is to certify that <b>${esc(v.name)}</b> was employed with ${COMPANY.legal}, ${COMPANY.hq}, in the following capacity:</p>
      ${terms([['Position',v.title],['Department',v.dept],['From',D('startDate')],['To',D('lastDay')],
        ['Total service',e?hrTenure(e.joined, v.lastDay):'—']])}
      <p><b>Duties and responsibilities.</b> ${esc(v.duties)}</p>
      <p>This certificate is issued at the request of the employee for the purpose of onward employment or further study.</p>
      ${sign()}`;

    case 'reference': return `
      <h1>Employment reference</h1><div class="sub">${esc(v.purpose||'Employment verification')}</div>
      <div class="to"><b>${esc(v.addressee)}</b></div>
      <p>I write in response to your request for a reference for <b>${esc(v.name)}</b>.</p>
      ${terms([['Position held',v.title],['Department',v.dept],['Employed from',D('startDate')],
        ['Employed until',v.lastDay?D('lastDay'):'present'],['Employment status',v.lastDay?'Former employee':'Current employee']])}
      <p>The above is a factual statement of employment. ${esc(v.name.split(' ')[0])} carried out their duties to the standard expected of the role, and we have no record of any disciplinary matter.</p>
      <p>This reference is given in good faith and in confidence. Should you require anything further, please contact me at ${COMPANY.email}.</p>
      <p>Yours faithfully,</p>${sign()}`;

    case 'recommendation': return `
      <h1>Letter of recommendation</h1><div class="sub">${esc(v.purpose||'In support of an application')}</div>
      <div class="to"><b>${esc(v.addressee)}</b></div>
      <p>It is a genuine pleasure to write in support of <b>${esc(v.name)}</b>, who has worked with me at ${COMPANY.trading} as <b>${esc(v.title)}</b> since ${D('startDate')}.</p>
      <p>${esc(v.strengths)}</p>
      <p>${esc(v.achievement)}</p>
      <p>I recommend ${esc(v.name.split(' ')[0])} without reservation. ${COMPANY.trading} is a small academy in which every colleague's contribution is visible, and theirs has been consistently among the strongest. I would gladly employ them again.</p>
      <p>Please do contact me directly at ${COMPANY.email} if I can add anything.</p>
      <p>Yours faithfully,</p>${sign()}`;

    case 'nda': return `
      <h1>Confidentiality agreement</h1><div class="sub">Student data, curriculum and commercial information</div>
      <p>This agreement is made between <b>${COMPANY.legal}</b> (CIN ${COMPANY.cin}) and <b>${esc(v.name)}</b>, ${esc(v.title)}, with effect from ${D('startDate')}.</p>
      <p><b>1. Confidential information</b> includes, without limitation: student records, placement and examination results, assessment and marking materials, curriculum and lesson content, recordings, commercial terms, pricing, partner agreements and any information marked or reasonably understood to be confidential.</p>
      <p><b>2. Obligations.</b> The Employee shall not disclose confidential information to any third party, nor use it for any purpose other than the performance of their duties, nor retain copies after the end of employment.</p>
      <p><b>3. Student data.</b> The Employee acknowledges that student records constitute personal data and shall handle them strictly in accordance with the academy's data protection policy and applicable law.</p>
      <p><b>4. Term.</b> ${esc(v.term)}</p>
      <p><b>5. Return of materials.</b> On the end of employment, or on request, the Employee shall return or securely destroy all confidential material in their possession.</p>
      ${sign(null, null, 'Employee')}`;

    case 'leaveApproval': return `
      <h1>Leave approval</h1><div class="sub">${esc(v.leaveType)}</div>
      <div class="to"><b>${esc(v.name)}</b>${esc(v.title)}</div>
      <p>Dear ${esc(v.name.split(' ')[0])},</p>
      <p>Your request for ${esc(String(v.leaveType||'leave').toLowerCase())} has been approved.</p>
      ${terms([['Type of leave',v.leaveType],['From',D('fromDate')],['To',D('toDate')],['Working days',String(v.days||'')]])}
      <p><b>Cover arrangements.</b> ${esc(v.cover)}</p>
      <p>Please ensure your handover is complete before your first day of leave. Enjoy the break.</p>
      <p>Yours sincerely,</p>${sign()}`;

    case 'award': return `
      <div class="cert">
        <div class="ribbon">${COMPANY.trading}</div>
        <h2>${esc(v.awardName)}</h2>
        <div class="pres">is hereby presented to</div>
        <div class="who">${esc(v.name)}</div>
        <div class="cit">${esc(v.citation)}</div>
        <div style="display:flex;justify-content:center;gap:50px;align-items:flex-end;margin-top:14px">
          <div style="text-align:center">
            <div style="border-bottom:1px solid #12211a;width:150px;height:30px;margin-bottom:6px"></div>
            <div style="font-family:system-ui,sans-serif;font-size:9pt;font-weight:700">${esc(v.presentedBy || COMPANY.director)}</div>
            <div style="font-family:system-ui,sans-serif;font-size:8pt;color:#5d7266">${COMPANY.directorRole}</div></div>
          <div class="seal">BLOOM<br>${COMPANY.founded}</div>
          <div style="text-align:center">
            <div style="border-bottom:1px solid #12211a;width:150px;height:30px;margin-bottom:6px"></div>
            <div style="font-family:system-ui,sans-serif;font-size:9pt;font-weight:700">${esc(v.period)}</div>
            <div style="font-family:system-ui,sans-serif;font-size:8pt;color:#5d7266">Period of award</div></div>
        </div>
      </div>`;

    default: return `<h1>${HR_DOCS[d.type].name}</h1><p>${esc(JSON.stringify(v))}</p>`;
  }
}

function hrDocPrint(id){
  const d = hrDocs().find(x => x.id === id); if (!d) return;
  const t = HR_DOCS[d.type];
  const w = window.open('','_blank');
  if (!w){ toast('Allow pop-ups to print the letter'); return; }
  const isCert = d.type === 'award';
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.name} — ${esc(d.data.name)}</title>
    <style>${hrLetterCSS()}</style></head><body>
    <div class="page">
      ${hrLetterhead()}
      ${isCert ? '' : `<div class="meta"><span>Ref: ${d.ref}</span><span>${longDate(d.at)}</span></div>`}
      ${hrDocBody(d)}
      <div class="foot"><span>${COMPANY.legal} · CIN ${COMPANY.cin} · GSTIN ${COMPANY.gstin}</span><span>${d.ref}</span></div>
    </div>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 450);
  toast('Opening print view — choose "Save as PDF" to file it', 'fa-print');
}
