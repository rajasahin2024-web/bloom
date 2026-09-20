/* ═══ FLASHCARDS — browse / search + faculty card management ═══ */

const FC_FILTERS = [
  ['all','All cards'], ['due','Due today'], ['hard','Difficult'], ['new','Unseen'],
  ['seen','Reviewed'], ['mast','Mastered'], ['mark','Bookmarked'],
  ['d-easy','Easy'], ['d-medium','Medium'], ['d-hard','Hard'],
];

function fcMatch(c){
  const q = fcState.search.trim().toLowerCase();
  if (q){
    const hay = [c.f, c.a, c.e, c.m, c.ip, c.r, c.s, fcTopicName(c.s,c.t), (c.g||[]).join(' ')].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  const f = fcState.filter;
  if (f === 'due') return fcIsDue(c.id);
  if (f === 'hard') return fcIsHard(c.id);
  if (f === 'new') return fcIsNew(c.id);
  if (f === 'seen') return !fcIsNew(c.id);
  if (f === 'mast') return fcIsMastered(c.id);
  if (f === 'mark') return fcMarks().includes(c.id);
  if (f.startsWith('d-')) return c.d === f.slice(2);
  return true;
}

function fcBrowseHTML(){
  const subj = fcState.subj;
  const matches = fcDeck().filter(fcMatch).filter(c => !subj || c.s === subj);
  const searching = fcState.search.trim().length > 0 || fcState.filter !== 'all';
  return `
    ${pageHead({
      eyebrow:'Flashcards · Browse',
      title:`Every <em>card</em>`,
      sub:'Search by concept, filter by what is due, weak or unseen — then drill exactly that set.',
      actions:`<button class="btn btn-ghost btn-sm" onclick="fcState.view='dash'; navTo('flashcards')"><i class="fa-solid fa-arrow-left"></i> Dashboard</button>
        ${matches.length ? `<button class="btn btn-primary btn-sm" onclick="fcStartSet()"><i class="fa-solid fa-play"></i> Study these ${matches.length}</button>` : ''}`
    })}

    <div class="card mb-5" style="padding:14px 20px;">
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <div class="f-search" style="flex:1; min-width:250px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input id="fcSearch" placeholder="Search concepts — try “mitochondria”, “pH”, “vector”…" value="${fcState.search}" oninput="fcState.search=this.value; fcPaintBrowse();">
        </div>
        <div class="pill-row" style="margin:0; gap:6px;">
          <button class="pill ${!subj?'on':''}" onclick="fcState.subj=null; navTo('flashcards')">All subjects</button>
          ${FC_SUBJECTS.map(s => `<button class="pill ${subj===s.id?'on':''}" onclick="fcState.subj='${s.id}'; navTo('flashcards')">${s.id} <span class="count">${fcScope(s.id).length}</span></button>`).join('')}
        </div>
      </div>
      <div class="fc-filters" style="margin-top:13px; padding-top:13px; border-top:1px solid var(--rule);">
        <span style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-right:2px;">Filter</span>
        ${FC_FILTERS.map(([k,l]) => `<button class="st-chip ${fcState.filter===k?'on':''}" style="padding:5px 12px; font-size:11.5px;" onclick="fcState.filter='${k}'; fcPaintBrowse();">${l}</button>`).join('')}
      </div>
    </div>

    <div id="fcBrowseBody">${fcBrowseBodyHTML()}</div>`;
}

function fcPaintBrowse(){
  const el = document.getElementById('fcBrowseBody');
  if (el) el.innerHTML = fcBrowseBodyHTML();
  document.querySelectorAll('.fc-filters .st-chip').forEach(b => b.classList.toggle('on', b.textContent.trim() === (FC_FILTERS.find(f => f[0] === fcState.filter)||[])[1]));
}

function fcBrowseBodyHTML(){
  const subj = fcState.subj;
  const subs = subj ? [FC_SUBJECTS.find(s => s.id === subj)] : FC_SUBJECTS;
  const searching = fcState.search.trim().length > 0;
  const matches = fcDeck().filter(fcMatch).filter(c => !subj || c.s === subj);
  if (!matches.length) return `<div class="st-empty"><i class="fa-solid fa-layer-group"></i><b>No cards match</b><span>Try a different search term or clear the filter.</span><div style="margin-top:16px;"><button class="btn btn-ghost btn-sm" onclick="fcState.search=''; fcState.filter='all'; navTo('flashcards')"><i class="fa-solid fa-rotate-left"></i> Reset</button></div></div>`;

  if (searching) return `
    <div class="bk-topic">${matches.length} result${matches.length===1?'':'s'} for “${fcState.search}”</div>
    <div class="card"><div class="card-body" style="padding:6px 22px;">${matches.slice(0,60).map(fcRowHTML).join('')}</div></div>`;

  return subs.map(sub => {
    const topics = FC_TOPICS[sub.id].filter(([t]) => matches.some(c => c.s === sub.id && c.t === t));
    if (!topics.length) return '';
    const st = fcStats(matches.filter(c => c.s === sub.id));
    return `<div style="margin-bottom:26px;">
      <div class="bk-subj"><h4>${sub.id}</h4><div class="rule"></div><div class="n">${st.total} cards · ${st.mastered} mastered · ${st.due} due</div></div>
      <div class="fc-topics">
        ${topics.map(([t,name]) => {
          const cards = matches.filter(c => c.s === sub.id && c.t === t);
          const ts = fcStats(cards);
          const open = fcState.open[sub.id + t];
          return `<div class="fc-topic">
            <div class="fc-thd" onclick="fcToggleTopic('${sub.id}','${t}')">
              <div class="cv"><i class="fa-solid fa-chevron-${open?'down':'right'}" style="font-size:9px;"></i></div>
              <div class="nm"><b>${name}</b><span>${ts.total} cards${ts.due?' · '+ts.due+' due':''}${ts.hard?' · '+ts.hard+' difficult':''}</span></div>
              <div class="mb"><i style="width:${ts.pct}%; background:${ts.pct>=70?'var(--ok)':ts.pct>=40?'var(--gold)':'var(--err)'};"></i></div>
              <div class="pc">${ts.pct}%</div>
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); fcStart('topic','${sub.id}','${t}')"><i class="fa-solid fa-play"></i></button>
            </div>
            ${open ? `<div class="fc-tlist">${cards.map(fcRowHTML).join('')}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

function fcRowHTML(c){
  const st = fcStatus(c.id), s = fcSrs(c.id);
  const marked = fcMarks().includes(c.id);
  return `<div class="fc-row">
    <div class="st ${st}" title="${st==='mast'?'Mastered':st==='hard'?'Difficult':st==='due'?'Due today':st==='seen'?'Scheduled':'Not seen yet'}"></div>
    <div class="q">${c.f.replace(/\$/g,'')}</div>
    ${marked ? '<i class="fa-solid fa-bookmark" style="color:var(--gold); font-size:10px;"></i>' : ''}
    <div class="mt">${(c.g||[]).includes('HIGH YIELD') ? '<span class="fc-tag hy" style="margin-right:6px;">HIGH YIELD</span>' : ''}${c.d}${s ? ' · ' + (s.due <= fcToday() ? 'due' : 'in ' + s.iv + 'd') : ' · new'}</div>
    <button class="ico-btn" title="Study this card" onclick="fcStart('single',null,null,'${c.id}')"><i class="fa-solid fa-play"></i></button>
  </div>`;
}

function fcToggleTopic(s, t){ fcState.open[s+t] = !fcState.open[s+t]; fcPaintBrowse(); }
function fcStartSet(){
  const subj = fcState.subj;
  const ids = fcDeck().filter(fcMatch).filter(c => !subj || c.s === subj).map(c => c.id);
  if (!ids.length) return;
  fcState.mode = 'topic'; fcState.queue = ids.slice(0, 40); fcState.idx = 0; fcState.back = false;
  fcState.results = []; fcState.stats = { again:0, hard:0, good:0, easy:0, start:Date.now() };
  fcState.view = 'session'; navTo('flashcards');
}

/* ═══ FACULTY / ADMIN — card management ═══ */
function fcManageHTML(){
  if (!['admin','faculty','staff'].includes(state.user.roleKey)){ fcState.view = 'dash'; return fcDashHTML(); }
  const c = fcCustom();
  const cards = fcDeck().filter(x => !fcState.subj || x.s === fcState.subj)
    .filter(x => !fcState.search.trim() || (x.f + x.a).toLowerCase().includes(fcState.search.trim().toLowerCase()));
  return `
    ${pageHead({
      eyebrow:'Faculty tools',
      title:`Manage <em>flashcards</em>`,
      sub:'Author, edit and publish cards. Students can review and annotate but never edit content.',
      actions:`<button class="btn btn-ghost btn-sm" onclick="fcState.view='dash'; navTo('flashcards')"><i class="fa-solid fa-arrow-left"></i> Dashboard</button>
        <button class="btn btn-ghost btn-sm" onclick="fcBulkModal()"><i class="fa-solid fa-file-excel"></i> Bulk import</button>
        <button class="btn btn-primary btn-sm" onclick="fcEdit()"><i class="fa-solid fa-plus"></i> New card</button>`
    })}
    <div class="st-stats">
      <div class="st-stat"><div class="lbl">Published cards</div><div class="val">${fcDeck().length - c.unpub.length}</div><div class="sub">${FC_SUBJECTS.length} subjects</div></div>
      <div class="st-stat"><div class="lbl">Drafts / unpublished</div><div class="val teal">${c.unpub.length}</div><div class="sub">Hidden from students</div></div>
      <div class="st-stat"><div class="lbl">Faculty-authored</div><div class="val">${c.add.length}</div><div class="sub">Added in this workspace</div></div>
      <div class="st-stat"><div class="lbl">High yield</div><div class="val ok">${fcDeck().filter(x => (x.g||[]).includes('HIGH YIELD')).length}</div><div class="sub">Tagged for priority revision</div></div>
    </div>
    <div class="card mb-5" style="padding:14px 20px;">
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <div class="f-search" style="flex:1; min-width:230px;"><i class="fa-solid fa-magnifying-glass"></i><input placeholder="Search cards…" value="${fcState.search}" oninput="fcState.search=this.value; navTo('flashcards')"></div>
        <div class="pill-row" style="margin:0; gap:6px;">
          <button class="pill ${!fcState.subj?'on':''}" onclick="fcState.subj=null; navTo('flashcards')">All</button>
          ${FC_SUBJECTS.map(s => `<button class="pill ${fcState.subj===s.id?'on':''}" onclick="fcState.subj='${s.id}'; navTo('flashcards')">${s.id}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Front</th><th>Subject · Topic</th><th>Type</th><th>Difficulty</th><th>Tags</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
        <tbody>
          ${cards.map(x => `<tr>
            <td style="max-width:320px;"><div style="font-size:12.5px; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${x.f.replace(/\$/g,'')}</div></td>
            <td><div style="font-size:12px;">${x.s}</div><div style="font-family:var(--mono); font-size:10px; color:var(--ink-4);">${fcTopicName(x.s,x.t)}</div></td>
            <td><span style="font-size:11px; color:var(--ink-3);">${FC_TYPES[x.ty]||x.ty}</span></td>
            <td><span class="tag ${x.d==='hard'?'tag-overdue':x.d==='medium'?'tag-pending':'tag-paid'}">${x.d.toUpperCase()}</span></td>
            <td><div style="display:flex; gap:4px; flex-wrap:wrap; max-width:150px;">${(x.g||[]).map(t => `<span class="fc-tag ${t==='HIGH YIELD'?'hy':t==='COMMON TRAP'?'trap':t==='MUST KNOW'?'must':t==='FORMULA'?'formula':''}">${t}</span>`).join('')}</div></td>
            <td>${c.unpub.includes(x.id) ? '<span class="tag tag-inactive">DRAFT</span>' : '<span class="tag tag-paid">LIVE</span>'}</td>
            <td style="text-align:right; white-space:nowrap;">
              <button class="ico-btn" title="${c.unpub.includes(x.id)?'Publish':'Unpublish'}" onclick="fcTogglePub('${x.id}')"><i class="fa-solid fa-${c.unpub.includes(x.id)?'eye':'eye-slash'}"></i></button>
              <button class="ico-btn" title="Edit" onclick="fcEdit('${x.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="ico-btn" title="Delete" onclick="fcDelete('${x.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function fcTogglePub(id){
  const c = fcCustom(); const i = c.unpub.indexOf(id);
  if (i >= 0) c.unpub.splice(i,1); else c.unpub.push(id);
  fcSaveCustom(c); navTo('flashcards');
  showToast(i >= 0 ? 'Card published to students' : 'Card unpublished — hidden from students');
}
function fcDelete(id){
  if (!confirm('Delete this flashcard? Students will no longer see it.')) return;
  const c = fcCustom();
  const ai = c.add.findIndex(x => x.id === id);
  if (ai >= 0) c.add.splice(ai,1); else c.hide.push(id);
  fcSaveCustom(c); navTo('flashcards'); showToast('Flashcard deleted');
}

function fcEdit(id){
  const card = id ? fcCard(id) : null;
  const subj = card?.s || 'Biology';
  const tagList = ['HIGH YIELD','IMAT','FORMULA','COMMON TRAP','MUST KNOW'];
  const f = (v) => (v || '').replace(/"/g,'&quot;');
  stModal(`
    <div class="modal-hd"><div><div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700;">Faculty tools</div><div class="modal-title">${card ? 'Edit flashcard' : 'New flashcard'}</div></div><button class="modal-close" onclick="stCloseModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body" style="overflow-y:auto;">
      <div class="form-grid">
        <div class="fg"><label>Subject</label><select id="fcSubj" onchange="fcSyncTopics()">${FC_SUBJECTS.map(s => `<option ${subj===s.id?'selected':''}>${s.id}</option>`).join('')}</select></div>
        <div class="fg"><label>Topic</label><select id="fcTopic">${FC_TOPICS[subj].map(([t,n]) => `<option value="${t}" ${card?.t===t?'selected':''}>${n}</option>`).join('')}</select></div>
        <div class="fg"><label>Card type</label><select id="fcType">${Object.entries(FC_TYPES).map(([k,v]) => `<option value="${k}" ${card?.ty===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg"><label>Difficulty</label><select id="fcDiff">${['easy','medium','hard'].map(d => `<option ${card?.d===d?'selected':''}>${d}</option>`).join('')}</select></div>
        <div class="fg full"><label>Front — one question, concept or formula</label><textarea id="fcFront" rows="2" placeholder="Which organelle is primarily responsible for ATP production?">${card?.f||''}</textarea></div>
        <div class="fg full"><label>Answer</label><textarea id="fcAns" rows="2" placeholder="The mitochondrion — ATP synthase sits in the inner membrane.">${card?.a||''}</textarea></div>
        <div class="fg full"><label>Short explanation</label><textarea id="fcExpl" rows="2">${card?.e||''}</textarea></div>
        <div class="fg full"><label>Formula (LaTeX — rendered with KaTeX)</label><input id="fcFo" value="${f(card?.fo)}" placeholder="E_k = \\tfrac{1}{2}mv^2"></div>
        <div class="fg full"><label>Common misconception</label><input id="fcMis" value="${f(card?.m)}"></div>
        <div class="fg full"><label>IMAT tip</label><input id="fcTip" value="${f(card?.ip)}"></div>
        <div class="fg"><label>Related concept</label><input id="fcRel" value="${f(card?.r)}"></div>
        <div class="fg"><label>Diagram plate reference</label><input id="fcPlate" value="${f(card?.pl)}" placeholder="Plate B-2 · cell ultrastructure"></div>
        <div class="fg full"><label>Diagram image URL (optional)</label><input id="fcImg" value="${f(card?.img)}" placeholder="assets/plates/cell.png"></div>
      </div>
      <div style="margin-top:14px;">
        <label style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; display:block; margin-bottom:9px;">IMAT tags</label>
        <div class="st-chips" id="fcTagRow">
          ${tagList.map(t => `<button class="st-chip ${(card?.g||[]).includes(t)?'on':''}" data-tag="${t}" onclick="this.classList.toggle('on')">${t}</button>`).join('')}
        </div>
      </div>
      <div style="margin-top:14px; display:flex; align-items:center; gap:10px; padding:12px 14px; background:var(--paper); border-radius:8px;">
        <input type="checkbox" id="fcPub" ${!card || !fcCustom().unpub.includes(card.id) ? 'checked' : ''}>
        <label for="fcPub" style="font-size:12.5px; color:var(--ink-2); cursor:pointer;">Publish to students immediately</label>
      </div>
    </div>
    <div style="display:flex; gap:8px; padding:16px 24px; border-top:1px solid var(--rule); background:var(--paper); border-radius:0 0 var(--r-lg) var(--r-lg); justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="stCloseModal()">Cancel</button>
      <button class="btn btn-primary" onclick="fcSave('${id||''}')"><i class="fa-solid fa-check"></i> ${card ? 'Save changes' : 'Create card'}</button>
    </div>
  `, 680);
}

/* ── BULK IMPORT (Excel / CSV) ── */
const FC_COLS = ['Subject','Topic','Type','Difficulty','Front','Answer','Explanation','Formula (LaTeX)','Misconception','IMAT Tip','Related','Tags','Diagram Plate','Image URL','Published'];
let fcImportRows = [];

function fcBulkModal(){
  fcImportRows = [];
  stModal(`
    <div class="modal-hd"><div><div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700;">Faculty tools</div><div class="modal-title">Bulk import flashcards</div></div><button class="modal-close" onclick="stCloseModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body" style="overflow-y:auto;">
      <div style="display:flex; gap:12px; align-items:center; padding:13px 16px; background:var(--steel-mist); border-radius:8px; margin-bottom:16px;">
        <i class="fa-solid fa-circle-info" style="color:var(--blue); font-size:15px;"></i>
        <div style="font-size:12.5px; color:var(--ink-2); line-height:1.5;">Start from the template so the columns match. <b>Subject</b>, <b>Topic</b>, <b>Front</b> and <b>Answer</b> are required — everything else is optional.</div>
        <button class="btn btn-ghost btn-sm" style="flex:0 0 auto; margin-left:auto;" onclick="fcTemplate()"><i class="fa-solid fa-download"></i> Template</button>
      </div>
      <label for="fcXlsx" style="display:block; cursor:pointer;">
        <div style="border:2px dashed var(--gold); border-radius:10px; padding:28px; text-align:center; background:var(--gold-pale);">
          <i class="fa-solid fa-file-excel" style="font-size:32px; color:var(--gold); display:block; margin-bottom:10px;"></i>
          <div style="font-size:14px; font-weight:600; color:var(--ink);">Choose an Excel or CSV file</div>
          <div style="font-size:11.5px; color:var(--ink-3); margin-top:3px;">.xlsx · .xls · .csv — first sheet, first row is the header</div>
        </div>
      </label>
      <input type="file" id="fcXlsx" accept=".xlsx,.xls,.csv" style="display:none;" onchange="fcReadSheet(this)">
      <div style="margin-top:14px;">
        <div style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:8px;">Expected columns</div>
        <div class="st-chips">${FC_COLS.map(c => `<span class="st-chip" style="padding:4px 11px; font-size:11px; cursor:default;">${c}</span>`).join('')}</div>
        <div style="font-family:var(--mono); font-size:10.5px; color:var(--ink-4); margin-top:10px; line-height:1.6;">Topic accepts the display name (“Cell Biology”) or its id (“cell”) · Tags comma-separated (HIGH YIELD, FORMULA) · Published: Yes / No</div>
      </div>
      <div id="fcPreview"></div>
    </div>
    <div style="display:flex; gap:8px; padding:16px 24px; border-top:1px solid var(--rule); background:var(--paper); border-radius:0 0 var(--r-lg) var(--r-lg); justify-content:flex-end;" id="fcImportFoot">
      <button class="btn btn-ghost" onclick="stCloseModal()">Cancel</button>
    </div>
  `, 720);
}

function fcTemplate(){
  const rows = [FC_COLS,
    ['Biology','Cell Biology','Question → Answer','easy','Which organelle is primarily responsible for ATP production?','The mitochondrion — ATP synthase sits in the inner membrane.','The electron transport chain pumps protons into the intermembrane space.','','Placing the electron transport chain in the matrix.','Cells with high energy demand are packed with mitochondria.','Cellular respiration','HIGH YIELD, MUST KNOW','','','Yes'],
    ['Physics','Work, Energy & Power','Formula → Variables','easy','State the kinetic energy formula and the effect of doubling velocity.','Ek = ½mv² — doubling v quadruples the kinetic energy.','Energy scales with the square of speed.','E_k = \\tfrac{1}{2}mv^2','Assuming doubling speed doubles the energy.','Spot the square relationships.','Work–energy theorem','FORMULA, HIGH YIELD','','','Yes'],
    ['Chemistry','Acids & Bases','IMAT Mini-Problem','easy','What is the pH of a 0.01 M solution of HCl?','pH = 2','HCl fully dissociates, so [H+] = 10⁻².','\\mathrm{pH} = -\\log[\\mathrm{H^+}]','Applying this to a weak acid.','pH + pOH = 14 at 25 °C.','Strong vs weak acids','MUST KNOW, FORMULA','','','Yes'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = FC_COLS.map((c,i) => ({ wch: i < 4 ? 16 : i < 6 ? 46 : 30 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Flashcards');
  const ref = XLSX.utils.aoa_to_sheet([['Subject','Valid topics'],
    ...FC_SUBJECTS.map(s => [s.id, FC_TOPICS[s.id].map(t => t[1]).join(' · ')]),
    [], ['Card types', Object.values(FC_TYPES).join(' · ')], ['Difficulty','easy · medium · hard'], ['Tags','HIGH YIELD · IMAT · FORMULA · COMMON TRAP · MUST KNOW']]);
  ref['!cols'] = [{ wch:16 }, { wch:120 }];
  XLSX.utils.book_append_sheet(wb, ref, 'Reference');
  XLSX.writeFile(wb, 'FMA_Flashcard_Import_Template.xlsx');
  showToast('Template downloaded');
}

function fcNorm(v){ return String(v == null ? '' : v).trim(); }
function fcResolveTopic(subj, val){
  const v = fcNorm(val).toLowerCase();
  const hit = (FC_TOPICS[subj] || []).find(([id,name]) => id.toLowerCase() === v || name.toLowerCase() === v);
  return hit ? hit[0] : null;
}
function fcResolveType(val){
  const v = fcNorm(val).toLowerCase();
  if (!v) return 'qa';
  const hit = Object.entries(FC_TYPES).find(([k,label]) => k === v || label.toLowerCase() === v || label.toLowerCase().replace(/[^a-z]/g,'') === v.replace(/[^a-z]/g,''));
  return hit ? hit[0] : 'qa';
}

function fcReadSheet(input){
  const file = input.files && input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let rows = [];
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type:'array' });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:'' });
    } catch(err){ showToast('Could not read that file — check it is a valid .xlsx or .csv'); return; }
    fcImportRows = rows.map((r, i) => {
      const get = (...keys) => { for (const k of keys){ const hit = Object.keys(r).find(h => h.trim().toLowerCase() === k.toLowerCase()); if (hit && fcNorm(r[hit])) return fcNorm(r[hit]); } return ''; };
      const subj = FC_SUBJECTS.find(s => s.id.toLowerCase() === get('Subject').toLowerCase())?.id || '';
      const topic = subj ? fcResolveTopic(subj, get('Topic')) : null;
      const front = get('Front','Question'), ans = get('Answer','Back');
      const errs = [];
      if (!subj) errs.push('unknown subject');
      if (subj && !topic) errs.push('unknown topic');
      if (!front) errs.push('missing front');
      if (!ans) errs.push('missing answer');
      const diff = ['easy','medium','hard'].includes(get('Difficulty').toLowerCase()) ? get('Difficulty').toLowerCase() : 'medium';
      return {
        row: i + 2, errs,
        card: {
          s: subj, t: topic, ty: fcResolveType(get('Type','Card Type')), d: diff,
          f: front, a: ans, e: get('Explanation'), fo: get('Formula (LaTeX)','Formula'),
          m: get('Misconception','Common Misconception'), ip: get('IMAT Tip','Tip'), r: get('Related','Related Concept'),
          pl: get('Diagram Plate','Plate'), img: get('Image URL','Image'),
          g: get('Tags').split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
        },
        pub: !/^(no|false|0|draft)$/i.test(get('Published') || 'yes'),
      };
    });
    fcPreviewImport(file.name);
  };
  reader.readAsArrayBuffer(file);
}

function fcPreviewImport(name){
  const ok = fcImportRows.filter(r => !r.errs.length), bad = fcImportRows.filter(r => r.errs.length);
  const el = document.getElementById('fcPreview'); if (!el) return;
  el.innerHTML = `
    <div style="margin-top:18px; padding-top:16px; border-top:1px solid var(--rule);">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700;">${name}</div>
        <div style="flex:1; height:1px; background:var(--rule);"></div>
        <span class="tag tag-paid">${ok.length} READY</span>${bad.length?`<span class="tag tag-overdue">${bad.length} SKIPPED</span>`:''}
      </div>
      ${ok.length ? `<div style="max-height:210px; overflow-y:auto; border:1px solid var(--rule); border-radius:8px;">
        ${ok.slice(0,80).map(r => `<div class="fc-row" style="padding:9px 14px; border-bottom:1px dashed var(--rule);"><div class="st mast"></div><div class="q">${r.card.f}</div><div class="mt">${r.card.s} · ${fcTopicName(r.card.s, r.card.t)}</div></div>`).join('')}
      </div>` : `<div class="st-empty" style="padding:26px;"><i class="fa-solid fa-triangle-exclamation"></i><b>No importable rows</b><span>Check the Subject and Topic spelling against the Reference sheet.</span></div>`}
      ${bad.length ? `<div style="margin-top:12px; font-size:11.5px; color:var(--err); line-height:1.7;">${bad.slice(0,8).map(r => `Row ${r.row}: ${r.errs.join(', ')}`).join('<br>')}${bad.length>8?`<br>+ ${bad.length-8} more`:''}</div>` : ''}
    </div>`;
  const foot = document.getElementById('fcImportFoot');
  if (foot) foot.innerHTML = `<button class="btn btn-ghost" onclick="stCloseModal()">Cancel</button>${ok.length?`<button class="btn btn-primary" onclick="fcRunImport()"><i class="fa-solid fa-cloud-arrow-up"></i> Import ${ok.length} card${ok.length===1?'':'s'}</button>`:''}`;
}

function fcRunImport(){
  const ok = fcImportRows.filter(r => !r.errs.length);
  if (!ok.length) return;
  const c = fcCustom();
  ok.forEach((r, i) => {
    const id = 'fx' + Date.now().toString(36) + i;
    c.add.push({ id, ...r.card });
    if (!r.pub) c.unpub.push(id);
  });
  fcSaveCustom(c); stCloseModal(); navTo('flashcards');
  showToast(ok.length + ' flashcards imported');
  if (typeof pushActivity === 'function') pushActivity({ type:'edit', actor:(state.user.role||'Faculty') + ' · ' + (state.user.name||''), text:`Bulk-imported <b>${ok.length}</b> flashcards from a spreadsheet` });
}

function fcSyncTopics(){
  const s = document.getElementById('fcSubj').value;
  document.getElementById('fcTopic').innerHTML = FC_TOPICS[s].map(([t,n]) => `<option value="${t}">${n}</option>`).join('');
}

function fcSave(id){
  const front = document.getElementById('fcFront').value.trim();
  const ans = document.getElementById('fcAns').value.trim();
  if (!front || !ans){ showToast('A card needs a front and an answer'); return; }
  const data = {
    s: document.getElementById('fcSubj').value, t: document.getElementById('fcTopic').value,
    ty: document.getElementById('fcType').value, d: document.getElementById('fcDiff').value,
    f: front, a: ans,
    e: document.getElementById('fcExpl').value.trim(), fo: document.getElementById('fcFo').value.trim(),
    m: document.getElementById('fcMis').value.trim(), ip: document.getElementById('fcTip').value.trim(),
    r: document.getElementById('fcRel').value.trim(), pl: document.getElementById('fcPlate').value.trim(),
    img: document.getElementById('fcImg').value.trim(),
    g: [...document.querySelectorAll('#fcTagRow .st-chip.on')].map(b => b.dataset.tag),
  };
  const c = fcCustom();
  let cardId = id;
  if (id){
    const own = c.add.find(x => x.id === id);
    if (own) Object.assign(own, data); else c.edit[id] = data;
  } else {
    cardId = 'fx' + Date.now().toString(36);
    c.add.push({ id:cardId, ...data });
  }
  const pub = document.getElementById('fcPub').checked;
  const ui = c.unpub.indexOf(cardId);
  if (pub && ui >= 0) c.unpub.splice(ui,1);
  if (!pub && ui < 0) c.unpub.push(cardId);
  fcSaveCustom(c); stCloseModal(); navTo('flashcards');
  showToast(id ? 'Flashcard updated' : 'Flashcard created');
  if (typeof pushActivity === 'function') pushActivity({ type:'edit', actor:(state.user.role||'Faculty') + ' · ' + (state.user.name||''), text:`${id?'Updated':'Created'} a <b>${data.s}</b> flashcard — ${fcTopicName(data.s,data.t)}` });
}
