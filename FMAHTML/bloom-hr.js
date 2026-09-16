/* ═══════════════════════════════════════════════════════════════
   BLOOM — HR: people, documents, hiring, leave, awards, reviews
   Every letter generates as a real printable document on company
   letterhead, with the legal details filled in from COMPANY.
═══════════════════════════════════════════════════════════════ */

let hr = { view:'dash', emp:null, dept:'all', q:'', doc:null, docFor:null, tab:'issued', stage:'all', app:null, award:null };

function hrStore(){
  const s = B.hr = B.hr || {};
  if (!Array.isArray(s.docs)) s.docs = [];
  if (!s.reviews) s.reviews = {};
  if (!s.notes) s.notes = {};
  if (!s.leave) s.leave = hrSeedLeave();
  if (!s.applicants) s.applicants = hrSeedApplicants();
  if (!s.awards) s.awards = [
    { id:'aw1', award:'best-faculty', emp:'BL-0003', period:'Q2 2026', citation:'Highest average band gain in the academy at +1.9, with a 4.9 feedback rating across three cohorts.', at:'2026-07-04', by:'Meriam Friaa' },
    { id:'aw2', award:'student-choice', emp:'BL-0005', period:'Q2 2026', citation:'Voted by 41 of 58 students. Repeatedly named for turning speaking anxiety into confidence.', at:'2026-07-04', by:'Meriam Friaa' },
    { id:'aw3', award:'best-newcomer', emp:'BL-0006', period:'2025–26', citation:'Joined in April 2025 and rebuilt the entire South Asia grammar programme within six months.', at:'2026-04-12', by:'Meriam Friaa' },
  ];
  return B.hr;
}
function hrDocs(){ return hrStore().docs; }
function hrLeave(){ return hrStore().leave; }
function hrApplicants(){ return hrStore().applicants; }
function hrAwards(){ return hrStore().awards; }

function inr(n){
  if (n >= 10000000) return '₹' + (n/10000000).toFixed(2).replace(/\.00$/,'') + ' crore';
  if (n >= 100000) return '₹' + (n/100000).toFixed(2).replace(/\.00$/,'') + ' lakh';
  return '₹' + Number(n).toLocaleString('en-IN');
}
function hrTenure(from, to){
  const a = new Date(from + 'T00:00:00'), b = to ? new Date(to + 'T00:00:00') : new Date();
  const months = Math.max(0, (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth()));
  const y = Math.floor(months/12), m = months % 12;
  return (y ? y + ' year' + (y===1?'':'s') : '') + (y && m ? ' ' : '') + (m ? m + ' month' + (m===1?'':'s') : (y?'':'less than a month'));
}
function longDate(iso){ return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '—'; }

/* ═══ ROUTER ═══ */
function sec_hr(){
  if (hr.view === 'employee' && hr.emp) return hrEmployeeHTML();
  if (hr.view === 'docs') return hrDocsHTML();
  if (hr.view === 'hiring') return hrHiringHTML();
  if (hr.view === 'leave') return hrLeaveHTML();
  if (hr.view === 'awards') return hrAwardsHTML();
  if (hr.view === 'org') return hrOrgHTML();
  return hrDashHTML();
}

function hrNav(){
  const tabs = [['dash','Overview','fa-gauge-high'],['org','People','fa-users'],['docs','Documents','fa-folder-open'],
    ['hiring','Hiring','fa-user-plus'],['leave','Leave','fa-plane-departure'],['awards','Recognition','fa-trophy']];
  return `<div class="pills mb" style="margin-bottom:18px">
    ${tabs.map(([k,l,ic])=>`<button class="pill ${hr.view===k||(k==='org'&&hr.view==='employee')?'on':''}" onclick="hr.view='${k}';hr.emp=null;navTo('hr')"><i class="fa-solid ${ic}"></i> ${l}</button>`).join('')}
  </div>`;
}

/* ═══ OVERVIEW ═══ */
function hrDashHTML(){
  const emp = employees();
  const pend = hrLeave().filter(l => l.status === 'pending');
  const apps = hrApplicants().filter(a => !['hired','declined'].includes(a.stage));
  const payroll = emp.reduce((n,e) => n + e.ctc, 0);
  const ending = emp.filter(e => e.ends && daysTo(e.ends) <= 120 && daysTo(e.ends) >= 0);
  return `
    ${phead({ eyebrow:'Administration · Human resources', title:`<em>HR</em>`,
      sub:`${COMPANY.legal} · ${emp.length} people across ${COMPANY.offices.length} offices. Contracts, letters, hiring, leave and recognition, all issued from here.`,
      actions:`<button class="btn btn-g btn-sm" onclick="hr.view='docs';hrDocPick()"><i class="fa-solid fa-file-signature"></i> Issue a letter</button>
        <button class="btn btn-p btn-sm" onclick="hrHireModal()"><i class="fa-solid fa-user-plus"></i> Add a person</button>` })}
    ${hrNav()}

    <div class="grid g4 mb2">
      ${statCard('Headcount', emp.length, emp.filter(e=>e.contract==='perm').length + ' permanent · ' + emp.filter(e=>e.contract!=='perm').length + ' other', 'leaf', 'fa-users')}
      ${statCard('Annual payroll', inr(payroll), 'Across ' + HR_DEPTS.length + ' departments', 'sky', 'fa-indian-rupee-sign')}
      ${statCard('Open roles', HR_VACANCIES.length, apps.length + ' candidates in the pipeline', 'amb', 'fa-user-plus')}
      ${statCard('Needs action', pend.length + ending.length, pend.length + ' leave requests · ' + ending.length + ' contracts ending', pend.length+ending.length?'cor':'leaf', 'fa-triangle-exclamation')}
    </div>

    ${(pend.length || ending.length) ? `
    <div class="card mb2" style="border-color:var(--coral);background:linear-gradient(180deg,var(--coral-soft),var(--surface) 60%)">
      <div class="card-bd">
        <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:#b73f31;font-weight:800;margin-bottom:12px">Waiting on you</div>
        <div style="display:grid;gap:9px">
          ${pend.map(l => { const e = empOf(l.emp);
            return `<div style="display:flex;gap:12px;align-items:center;padding:11px 13px;background:var(--surface);border-radius:11px">
              <i class="fa-solid ${LEAVE_TYPES[l.type].ic}" style="color:var(--ink-4);width:17px"></i>
              <div style="flex:1;min-width:0"><b style="font-size:13px">${esc(e?e.name:l.emp)}</b>
                <span style="font-size:11.5px;color:var(--ink-4);display:block">${LEAVE_TYPES[l.type].name} · ${l.days} day${l.days===1?'':'s'} from ${longDate(l.from)}</span></div>
              <button class="btn btn-g btn-sm" onclick="hrLeaveSet('${l.id}','rejected')">Decline</button>
              <button class="btn btn-p btn-sm" onclick="hrLeaveSet('${l.id}','approved')">Approve</button></div>`;
          }).join('')}
          ${ending.map(e => `<div style="display:flex;gap:12px;align-items:center;padding:11px 13px;background:var(--surface);border-radius:11px">
            <i class="fa-solid fa-calendar-xmark" style="color:var(--amber);width:17px"></i>
            <div style="flex:1;min-width:0"><b style="font-size:13px">${esc(e.name)}</b>
              <span style="font-size:11.5px;color:var(--ink-4);display:block">${CONTRACTS[e.contract].name} contract ends ${longDate(e.ends)} — ${daysTo(e.ends)} days</span></div>
            <button class="btn btn-g btn-sm" onclick="hrDocNew('contract','${e.id}')">Renew</button>
            <button class="btn btn-g btn-sm" onclick="hr.emp='${e.id}';hr.view='employee';navTo('hr')">Open</button></div>`).join('')}
        </div>
      </div>
    </div>` : ''}

    <div class="split mb2">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>By department</h3><p>Headcount and payroll split</p></div>
          <button class="btn btn-g btn-sm" onclick="hr.view='org';navTo('hr')">All people</button></div>
        <div class="card-bd">
          ${HR_DEPTS.map(d => {
            const list = employees().filter(e => e.dept === d.id);
            if (!list.length) return '';
            const pay = list.reduce((n,e) => n + e.ctc, 0);
            return `<div class="prow"><div class="lb"><span><i class="fa-solid ${d.ic}" style="width:16px;color:var(--ink-4)"></i> ${d.name}</span><b>${list.length} · ${inr(pay)}</b></div>
              <div class="bar"><i style="width:${pct(list.length, employees().length)}%"></i></div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Documents issued</h3><p>${hrDocs().length} on file</p></div>
          <button class="btn btn-g btn-sm" onclick="hr.view='docs';navTo('hr')">Open</button></div>
        <div class="card-bd flush">
          ${hrDocs().length ? hrDocs().slice(0,5).map(d => { const t = HR_DOCS[d.type], e = empOf(d.emp);
            return `<div class="row"><div class="ic ${t.tone}"><i class="fa-solid ${t.ic}"></i></div>
              <div class="tx"><b>${t.name}</b><span>${esc(e?e.name:d.data.name||'—')} · ${d.at}</span></div>
              <button class="btn btn-g btn-sm" onclick="hrDocPrint('${d.id}')"><i class="fa-solid fa-print"></i></button></div>`;
          }).join('') : `<div style="padding:24px;text-align:center;font-size:12.5px;color:var(--ink-4)">
            No letters issued yet. Every offer, contract, reference and certificate you generate is archived here.
            <div style="margin-top:13px"><button class="btn btn-p btn-sm" onclick="hr.view='docs';hrDocPick()"><i class="fa-solid fa-file-signature"></i> Issue the first one</button></div></div>`}
        </div>
      </div>
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Offices</h3><p>${COMPANY.legal} · founded ${COMPANY.founded}</p></div></div>
        <div class="card-bd flush">
          ${COMPANY.offices.map(o => { const n = employees().filter(e => e.office === o.id).length;
            return `<div class="row"><div style="font-size:21px;flex:0 0 30px">${o.flag}</div>
              <div class="tx"><b>${o.name}, ${o.country}</b><span>${o.role} · ${o.addr}</span></div>
              <span style="font-family:var(--mono);font-size:12.5px;font-weight:700">${n}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Recent recognition</h3><p>Awards issued</p></div>
          <button class="btn btn-g btn-sm" onclick="hr.view='awards';navTo('hr')">All</button></div>
        <div class="card-bd flush">
          ${hrAwards().slice(0,4).map(a => { const aw = awardOf(a.award), e = empOf(a.emp);
            return `<div class="row"><div class="ic amb"><i class="fa-solid ${aw.ic}"></i></div>
              <div class="tx"><b>${aw.name} · ${a.period}</b><span>${esc(e?e.name:a.emp)} · ${a.at}</span></div>
              <button class="btn btn-g btn-sm" onclick="hrAwardPrint('${a.id}')"><i class="fa-solid fa-certificate"></i></button></div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ═══ PEOPLE ═══ */
function hrOrgHTML(){
  const q = hr.q.trim().toLowerCase();
  let list = employees().filter(e => hr.dept === 'all' || e.dept === hr.dept);
  if (q) list = list.filter(e => (e.name + ' ' + e.title + ' ' + e.id + ' ' + e.email).toLowerCase().includes(q));
  return `
    ${phead({ eyebrow:'HR · People', title:`The <em>team</em>`,
      sub:`${employees().length} people. Open anyone to see their contract, documents, leave and review history.`,
      actions:`<button class="btn btn-g btn-sm" onclick="hrOrgExport()"><i class="fa-solid fa-file-csv"></i> Export</button>
        <button class="btn btn-p btn-sm" onclick="hrHireModal()"><i class="fa-solid fa-user-plus"></i> Add a person</button>` })}
    ${hrNav()}
    <div class="card mb2"><div class="card-bd" style="padding:13px 17px;display:flex;gap:11px;align-items:center;flex-wrap:wrap">
      <div class="search" style="flex:1;min-width:220px"><i class="fa-solid fa-magnifying-glass"></i>
        <input placeholder="Search name, role or employee number…" value="${esc(hr.q)}" oninput="hr.q=this.value;clearTimeout(window.__hq);window.__hq=setTimeout(()=>navTo('hr'),240)"></div>
      <div class="pills" style="margin:0">
        <button class="pill ${hr.dept==='all'?'on':''}" onclick="hr.dept='all';navTo('hr')">All <span class="n">${employees().length}</span></button>
        ${HR_DEPTS.map(d=>{const n=employees().filter(e=>e.dept===d.id).length;return n?`<button class="pill ${hr.dept===d.id?'on':''}" onclick="hr.dept='${d.id}';navTo('hr')">${d.name} <span class="n">${n}</span></button>`:''}).join('')}
      </div>
    </div></div>
    <div class="card"><div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Employee</th><th>Role</th><th>Dept</th><th>Contract</th><th>Office</th><th>Tenure</th><th>CTC</th><th></th></tr></thead>
      <tbody>${list.map(e => `<tr>
        <td><div style="display:flex;gap:10px;align-items:center">
          <div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${e.init}</div>
          <div><b style="color:var(--ink);display:block">${esc(e.name)}${e.leader?' <span class="tag amb">leader</span>':''}</b>
            <span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${e.id}</span></div></div></td>
        <td style="font-size:12.5px">${esc(e.title)}</td>
        <td><span class="tag ${deptOf(e.dept).tone}">${deptOf(e.dept).name}</span></td>
        <td style="font-size:12px">${CONTRACTS[e.contract].name}${e.ends?`<div style="font-size:10.5px;color:var(--amber)">ends ${e.ends}</div>`:''}</td>
        <td style="font-size:12px">${officeOf(e.office).flag} ${officeOf(e.office).name}</td>
        <td style="font-size:12px">${hrTenure(e.joined)}</td>
        <td style="font-family:var(--mono);font-size:12px">${inr(e.ctc)}</td>
        <td style="text-align:right"><button class="btn btn-g btn-sm" onclick="hr.emp='${e.id}';hr.view='employee';navTo('hr')">Open</button></td>
      </tr>`).join('')}</tbody></table></div></div></div>`;
}
function hrOrgExport(){
  const rows = [['Employee no','Name','Role','Department','Contract','Band','Office','Joined','Tenure','Contract ends','CTC (INR)','Reports to','Email','Status']];
  employees().forEach(e => rows.push([e.id,e.name,e.title,deptOf(e.dept).name,CONTRACTS[e.contract].name,e.band,
    officeOf(e.office).name,e.joined,hrTenure(e.joined),e.ends||'',e.ctc,e.reports?(empOf(e.reports)||{}).name||'':'',e.email,e.status]));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-hr-roster-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('Exported ' + employees().length + ' employee records', 'fa-file-csv');
}

/* ═══ ONE EMPLOYEE ═══ */
function hrEmployeeHTML(){
  const e = empOf(hr.emp); if (!e){ hr.view = 'org'; return hrOrgHTML(); }
  const docs = hrDocs().filter(d => d.emp === e.id);
  const lv = hrLeave().filter(l => l.emp === e.id);
  const aws = hrAwards().filter(a => a.emp === e.id);
  const mgr = e.reports ? empOf(e.reports) : null;
  const team = empReports(e.id);
  const rev = hrStore().reviews[e.id];
  return `
    ${phead({ eyebrow:'HR · ' + e.id, title:esc(e.name).replace(/(\S+)$/,'<em>$1</em>'),
      sub:`${e.title} · ${deptOf(e.dept).name} · ${officeOf(e.office).name} · joined ${longDate(e.joined)} (${hrTenure(e.joined)})`,
      actions:`<button class="btn btn-g btn-sm" onclick="hr.view='org';hr.emp=null;navTo('hr')"><i class="fa-solid fa-arrow-left"></i> All people</button>
        <button class="btn btn-g btn-sm" onclick="hrReviewModal('${e.id}')"><i class="fa-solid fa-star-half-stroke"></i> Review</button>
        <button class="btn btn-p btn-sm" onclick="hrDocPick('${e.id}')"><i class="fa-solid fa-file-signature"></i> Issue a letter</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Contract', CONTRACTS[e.contract].name, e.ends?'Ends ' + longDate(e.ends):'No end date · ' + CONTRACTS[e.contract].notice + ' notice', e.ends?'amb':'leaf', CONTRACTS[e.contract].ic)}
      ${statCard('Remuneration', inr(e.ctc), 'Band ' + e.band + ' · annual CTC', 'sky', 'fa-indian-rupee-sign')}
      ${statCard('Leave', e.leave.taken + ' / ' + e.leave.entitled, (e.leave.entitled - e.leave.taken) + ' days remaining', 'amb', 'fa-umbrella-beach')}
      ${statCard('Recognition', aws.length, aws.length?aws.map(a=>awardOf(a.award).name).join(', ').slice(0,26):'None yet', aws.length?'leaf':'', 'fa-trophy')}
    </div>

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Documents on file</h3><p>${docs.length} issued</p></div>
            <button class="btn btn-p btn-sm" onclick="hrDocPick('${e.id}')"><i class="fa-solid fa-plus"></i> New</button></div>
          <div class="card-bd flush">
            ${docs.length ? docs.map(d => { const t = HR_DOCS[d.type];
              return `<div class="row"><div class="ic ${t.tone}"><i class="fa-solid ${t.ic}"></i></div>
                <div class="tx"><b>${t.name}</b><span>Issued ${longDate(d.at)} by ${esc(d.by)} · ref ${d.ref}</span></div>
                <button class="icobtn" style="width:30px;height:30px;font-size:11px" title="Print" onclick="hrDocPrint('${d.id}')"><i class="fa-solid fa-print"></i></button>
                <button class="icobtn" style="width:30px;height:30px;font-size:11px" title="Delete" onclick="hrDocDel('${d.id}')"><i class="fa-solid fa-trash"></i></button></div>`;
            }).join('') : `<div style="padding:22px;text-align:center;font-size:12.5px;color:var(--ink-4)">Nothing on file. Issue a contract or an offer letter to start the record.</div>`}
          </div>
        </div>

        ${rev ? `<div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Last performance review</h3><p>${longDate(rev.at)} by ${esc(rev.by)}</p></div>
            <div class="band sm ${rev.overall>=4?'':'amb'}"><b>${rev.overall.toFixed(1)}</b><span>of 5</span></div></div>
          <div class="card-bd">
            ${REVIEW_CRITERIA.map(c => { const v = rev.scores[c.id] || 0;
              return `<div class="prow"><div class="lb"><span>${c.name}</span><b>${v} / 5</b></div>
                <div class="bar thin"><i style="width:${v/5*100}%;background:${v>=4?'var(--ok)':v>=3?'var(--amber)':'var(--coral)'}"></i></div></div>`;
            }).join('')}
            ${rev.note?`<div class="why leaf" style="margin-top:14px"><b>Reviewer's note</b>${esc(rev.note)}</div>`:''}
          </div>
        </div>` : ''}

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Leave history</h3><p>${e.leave.taken} of ${e.leave.entitled} days used this year</p></div>
            <button class="btn btn-g btn-sm" onclick="hrLeaveModal('${e.id}')"><i class="fa-solid fa-plus"></i> Record leave</button></div>
          <div class="card-bd flush">
            ${lv.length ? lv.map(l => `<div class="row">
              <div class="ic ${LEAVE_TYPES[l.type].tone}"><i class="fa-solid ${LEAVE_TYPES[l.type].ic}"></i></div>
              <div class="tx"><b>${LEAVE_TYPES[l.type].name} · ${l.days} day${l.days===1?'':'s'}</b><span>${longDate(l.from)} → ${longDate(l.to)} · ${esc(l.reason)}</span></div>
              <span class="tag ${l.status==='approved'?'ok':l.status==='pending'?'amb':'cor'}">${l.status}</span>
              ${l.status==='approved'?`<button class="icobtn" style="width:30px;height:30px;font-size:11px" title="Approval letter" onclick="hrDocNew('leaveApproval','${e.id}','${l.id}')"><i class="fa-solid fa-file-lines"></i></button>`:''}
            </div>`).join('') : `<div style="padding:22px;text-align:center;font-size:12.5px;color:var(--ink-4)">No leave recorded.</div>`}
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card"><div class="card-bd" style="text-align:center">
          <div style="width:76px;height:76px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-800),var(--leaf-500));color:#fff;display:grid;place-items:center;font-family:var(--display);font-size:24px;font-weight:700;margin:0 auto 14px">${e.init}</div>
          <b style="font-family:var(--display);font-size:18px;font-weight:700;display:block">${esc(e.name)}</b>
          <div style="font-size:12.5px;color:var(--ink-3);margin:4px 0 12px">${esc(e.title)}</div>
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
            <span class="tag ${deptOf(e.dept).tone}">${deptOf(e.dept).name}</span>
            <span class="tag">${e.band}</span>
            <span class="tag ${e.status==='active'?'ok':'cor'}">${e.status}</span></div>
          <div style="margin-top:16px;display:grid;gap:9px;text-align:left;font-size:12.5px">
            ${[['Employee no', e.id],['Email', e.email],['Office', officeOf(e.office).flag + ' ' + officeOf(e.office).name],
               ['Reports to', mgr ? mgr.name : '—'],['Nationality', e.from],['Notice', CONTRACTS[e.contract].notice]]
              .map(([l,v])=>`<div style="display:flex;justify-content:space-between;gap:10px;padding-bottom:8px;border-bottom:1px dashed var(--line)">
                <span style="color:var(--ink-4)">${l}</span><b style="text-align:right;color:var(--ink-2);word-break:break-word">${esc(v)}</b></div>`).join('')}
          </div>
        </div></div>

        ${team.length ? `<div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Direct reports</h3><p>${team.length}</p></div></div>
          <div class="card-bd flush">
            ${team.map(t => `<div class="row" style="cursor:pointer" onclick="hr.emp='${t.id}';navTo('hr')">
              <div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;font-size:10px;font-weight:800">${t.init}</div>
              <div class="tx"><b>${esc(t.name)}</b><span>${esc(t.title)}</span></div>
              <i class="fa-solid fa-chevron-right" style="color:var(--line-2);font-size:11px"></i></div>`).join('')}
          </div></div>` : ''}

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Quick letters</h3></div></div>
          <div class="card-bd" style="display:grid;gap:7px">
            ${['contract','confirm','promotion','reference','recommendation','experience'].map(k => {
              const t = HR_DOCS[k];
              return `<button class="btn btn-g btn-sm" style="justify-content:flex-start" onclick="hrDocNew('${k}','${e.id}')"><i class="fa-solid ${t.ic}" style="width:15px"></i> ${t.name}</button>`;
            }).join('')}
            <button class="btn btn-g btn-sm" style="justify-content:flex-start;color:var(--err)" onclick="hrDocNew('termination','${e.id}')"><i class="fa-solid fa-file-circle-xmark" style="width:15px"></i> Termination letter</button>
          </div>
        </div>
      </div>
    </div>`;
}
