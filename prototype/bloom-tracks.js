/* ═══════════════════════════════════════════════════════════════
   BLOOM — exam track gating
   A student's assigned exam decides which mocks, School parts and
   practice content they see. Staff assign the track; students cannot.
═══════════════════════════════════════════════════════════════ */

/* ── which exam is this student on ──
   Staff assignment wins over the student's own onboarding choice, so an
   admin can move someone from IELTS to PTE and the portal reconfigures. */
function examTrack(){
  if (B.assignedExam) return B.assignedExam;
  return B.profile.exam || 'ielts-a';
}
function examLocked(){ return !!B.assignedExam; }
function trackOf(s){ return (s && (s.assignedExam || s.exam)) || 'ielts-a'; }

/* Which exam parts belong to a track. IELTS uses the full 15-part map;
   the others use their own blueprint sections mapped onto Bloom's parts. */
const TRACK_PARTS = {
  'ielts-a': ['l1','l2','l3','l4','r1','r2','r3','w1','w2','s1','s2','s3','gv','strategy'],
  'ielts-g': ['l1','l2','l3','l4','rgt','w1','w2','s1','s2','s3','gv','strategy'],
  'toefl':   ['l3','l4','r2','r3','w1','w2','s1','s3','gv','strategy'],
  'pte':     ['l1','l3','l4','r1','r2','w2','s1','s2','gv','strategy'],
  'duolingo':['l1','l2','r1','r2','w2','s1','s2','gv','strategy'],
  'cambridge':['l1','l2','l3','l4','r1','r2','r3','w1','w2','s1','s2','s3','gv','strategy'],
  'oet':     ['l1','l2','l3','l4','r1','r2','w1','s1','s2','s3','gv','strategy'],
  'general': ['l1','l2','r1','s1','s2','s3','gv'],
};
function trackParts(examId){ return TRACK_PARTS[examId || examTrack()] || TRACK_PARTS['ielts-a']; }
function partInTrack(partId, examId){ return trackParts(examId).includes(partId); }

/* Which mocks a track can see — exam-specific engines for TOEFL/PTE/DET,
   the IELTS engine for IELTS and everything else. */
function mocksForTrack(examId){
  const t = examId || examTrack();
  if (hasBlueprint(t)) return EXAM_MOCKS.filter(m => m.exam === t);
  return MOCKS.filter(m => m.exam === t || (t.startsWith('ielts') && m.exam.startsWith('ielts')));
}

/* the scale label a track reports in */
function trackScale(examId){
  const ex = examOf(examId || examTrack());
  return ex.scale === 'band' ? { unit:'Band', max:9, fmt:v => bandLabel(v) }
    : { unit:'Score', max:ex.max, fmt:v => String(Math.round(v)) };
}

/* ═══ STAFF: ASSIGN AN EXAM TRACK ═══ */
function trackAssignModal(studentId){
  const s = studentOf(studentId);
  if (!s) return;
  const cur = trackOf(s);
  modal(`
    <div class="modal-hd">
      <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800">${initials(s.name)}</div>
      <div style="flex:1"><h3>Exam track for ${esc(s.name)}</h3><p>This decides which mocks, School parts and practice content they can open</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      <div class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(158px,1fr))">
        ${EXAMS.map(e => `<div class="tile ${cur===e.id?'on':''}" onclick="trackPick('${studentId}','${e.id}')">
          <span class="tk"><i class="fa-solid fa-circle-check"></i></span>
          <div class="ic"><i class="fa-solid ${e.ic}"></i></div>
          <div class="nm">${e.short}</div>
          <div class="mt">${hasBlueprint(e.id)?'own engine':e.scale==='band'?'band 0–9':'0–'+e.max}</div>
        </div>`).join('')}
      </div>
      <div id="trackPreview" style="margin-top:18px">${trackPreviewHTML(cur)}</div>
      <div style="margin-top:16px;padding:13px 15px;background:var(--amber-soft);border-radius:11px;font-size:12.5px;color:#7a5410;line-height:1.6">
        <i class="fa-solid fa-lock" style="margin-right:6px"></i>Once you assign a track, the student cannot change it from their own settings. Their exam selector becomes read-only and shows who assigned it.
      </div>
    </div>
    <div class="modal-ft">
      <button class="btn btn-g" style="margin-right:auto" onclick="trackClear('${studentId}')"><i class="fa-solid fa-unlock"></i> Let the student choose</button>
      <button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="trackSave('${studentId}')"><i class="fa-solid fa-check"></i> Assign track</button></div>`, 660);
}
let trackDraft = null;
function trackPick(studentId, examId){
  trackDraft = examId;
  document.querySelectorAll('#mask .tile').forEach((t,i) => t.classList.toggle('on', EXAMS[i].id === examId));
  const p = document.getElementById('trackPreview'); if (p) p.innerHTML = trackPreviewHTML(examId);
}
function trackPreviewHTML(examId){
  const ex = examOf(examId);
  const parts = trackParts(examId);
  const mocks = mocksForTrack(examId);
  const bp = blueprintFor(examId);
  return `<div style="border:1px solid var(--line);border-radius:13px;padding:15px 17px">
    <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:10px">What this unlocks</div>
    <div style="font-size:13px;color:var(--ink-2);line-height:1.6;margin-bottom:13px">${ex.blurb}</div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
      ${[['School parts',parts.length,'fa-graduation-cap'],['Mock tests',mocks.length,'fa-clipboard-list'],[bp?'Sections':'Skills',bp?bp.sections.length:4,'fa-layer-group']]
        .map(([l,v,ic])=>`<div style="padding:11px 12px;background:var(--paper);border-radius:10px;text-align:center">
          <i class="fa-solid ${ic}" style="color:var(--leaf-600);font-size:12px;display:block;margin-bottom:5px"></i>
          <b style="font-family:var(--display);font-size:19px;font-weight:800;display:block;line-height:1">${v}</b>
          <span style="font-size:9.5px;letter-spacing:.9px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${l}</span></div>`).join('')}
    </div>
    ${bp?`<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:5px">${bp.sections.map(s=>`<span class="tag leaf">${s.name} · ${s.mins}min</span>`).join('')}</div>`
       :`<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:5px">${ex.sections.map(s=>`<span class="tag leaf">${s}</span>`).join('')}</div>`}
  </div>`;
}
function trackSave(studentId){
  const examId = trackDraft || trackOf(studentOf(studentId));
  const s = studentOf(studentId); if (!s) return;
  s.assignedExam = examId;
  s.exam = examId;
  s.assignedBy = B.role === 'admin' ? 'Administration' : (typeof me === 'function' ? me().name : 'Faculty');
  s.assignedAt = today();
  /* if this is the signed-in student's own record, apply it to their portal */
  if (B.profile.studentId === studentId || s.email === B.profile.email){
    B.assignedExam = examId; B.profile.exam = examId; save();
  }
  trackDraft = null; closeModal();
  navTo(B.section);
  toast(esc(s.name) + ' moved to the ' + examOf(examId).short + ' track', 'fa-clipboard-check');
}
function trackClear(studentId){
  const s = studentOf(studentId); if (!s) return;
  delete s.assignedExam; delete s.assignedBy; delete s.assignedAt;
  if (B.profile.studentId === studentId){ delete B.assignedExam; save(); }
  closeModal(); navTo(B.section);
  toast('Track unlocked — the student may choose their own exam', 'fa-unlock');
}

/* ═══ BULK ASSIGNMENT ═══ */
function trackBulkModal(){
  modal(`<div class="modal-hd"><div style="flex:1"><h3>Assign an exam track in bulk</h3><p>Move a whole cohort onto one exam at once</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Cohort</label><select id="tbCo">
        ${COHORTS.map(c=>`<option value="${c.id}">${c.name} — ${students().filter(s=>s.cohort===c.id).length} students</option>`).join('')}</select></div>
      <div class="fg full"><label>Exam track</label><select id="tbEx">
        ${EXAMS.map(e=>`<option value="${e.id}">${e.name}${hasBlueprint(e.id)?' — own mock engine':''}</option>`).join('')}</select></div>
    </div>
    <div style="margin-top:15px;padding:13px 15px;background:var(--leaf-50);border-radius:11px;font-size:12.5px;color:var(--ink-2);line-height:1.6">
      <i class="fa-solid fa-circle-info" style="color:var(--leaf-600);margin-right:6px"></i>Every student in the cohort is moved. Their School content, mocks and study plan reconfigure to the new exam on their next visit.</div>
    </div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="trackBulkSave()"><i class="fa-solid fa-users"></i> Assign to cohort</button></div>`, 560);
}
function trackBulkSave(){
  const co = document.getElementById('tbCo').value;
  const examId = document.getElementById('tbEx').value;
  const list = students().filter(s => s.cohort === co);
  list.forEach(s => {
    s.assignedExam = examId; s.exam = examId;
    s.assignedBy = B.role === 'admin' ? 'Administration' : (typeof me === 'function' ? me().name : 'Faculty');
    s.assignedAt = today();
  });
  const c = cohortOf(co); c.exam = examId;
  closeModal(); navTo(B.section);
  toast(list.length + ' students moved to ' + examOf(examId).short, 'fa-clipboard-check');
}

/* ═══ ADMIN: EXAM TRACK OVERVIEW ═══ */
function sec_tracks(){
  const sts = students();
  const byExam = {};
  sts.forEach(s => { const t = trackOf(s); byExam[t] = (byExam[t] || 0) + 1; });
  const assigned = sts.filter(s => s.assignedExam).length;
  return `
    ${phead({ eyebrow:'Administration · Academic', title:`Exam <em>tracks</em>`,
      sub:'Which exam each student is preparing for. The track decides what content they can open — School parts, mock engines and practice labs all filter by it.',
      actions:`<button class="btn btn-g btn-sm" onclick="trackExport()"><i class="fa-solid fa-file-csv"></i> Export</button>
        <button class="btn btn-p btn-sm" onclick="trackBulkModal()"><i class="fa-solid fa-users"></i> Assign in bulk</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Students', sts.length, assigned + ' on an assigned track', 'leaf', 'fa-users')}
      ${statCard('Exam tracks in use', Object.keys(byExam).length, 'of ' + EXAMS.length + ' available', 'sky', 'fa-layer-group')}
      ${statCard('Own mock engine', ['toefl','pte','duolingo'].filter(e => byExam[e]).length, 'TOEFL · PTE · DET run their own format', 'amb', 'fa-microchip')}
      ${statCard('Student-chosen', sts.length - assigned, 'Not yet locked by staff', assigned < sts.length ? 'cor' : 'leaf', 'fa-unlock')}
    </div>

    <div class="split mb2">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Track distribution</h3><p>Where your students actually are</p></div></div>
        <div class="card-bd">
          ${EXAMS.filter(e => byExam[e.id]).sort((a,b) => byExam[b.id] - byExam[a.id]).map(e => {
            const n = byExam[e.id], p = pct(n, sts.length);
            return `<div class="prow"><div class="lb"><span><i class="fa-solid ${e.ic}" style="width:16px;color:var(--ink-4)"></i> ${e.name}${hasBlueprint(e.id)?' <span class="tag leaf">own engine</span>':''}</span><b>${n} · ${p}%</b></div>
              <div class="bar"><i style="width:${p}%"></i></div>
              <div style="font-family:var(--mono);font-size:10px;color:var(--ink-4);margin-top:4px">${trackParts(e.id).length} School parts · ${mocksForTrack(e.id).length} mocks · scored ${e.scale==='band'?'0–9':'0–'+e.max}</div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>What each track unlocks</h3><p>Content gating, exam by exam</p></div></div>
        <div class="card-bd flush">
          ${EXAMS.filter(e => e.id !== 'general').map(e => `<div class="row">
            <div class="ic ${hasBlueprint(e.id)?'amb':''}"><i class="fa-solid ${e.ic}"></i></div>
            <div class="tx"><b>${e.short}</b><span>${trackParts(e.id).length} parts · ${mocksForTrack(e.id).length} mocks · ${hasBlueprint(e.id)?blueprintFor(e.id).sections.length+' native sections':'IELTS engine'}</span></div>
            <span style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4)">${byExam[e.id]||0}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Every student</h3><p>Click a track to reassign it</p></div></div>
      <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Student</th><th>Cohort</th><th>Exam track</th><th>Assigned by</th><th>Mock engine</th><th></th></tr></thead>
        <tbody>${sts.slice(0,40).map(s => {
          const t = trackOf(s), ex = examOf(t);
          return `<tr>
            <td><div style="display:flex;gap:10px;align-items:center">
              <div style="width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${initials(s.name)}</div>
              <b style="color:var(--ink)">${s.name}</b></div></td>
            <td style="font-size:12px">${cohortOf(s.cohort).name.split('·')[0].trim()}</td>
            <td><span class="tag ${hasBlueprint(t)?'amb':'leaf'}"><i class="fa-solid ${ex.ic}"></i> ${ex.short}</span></td>
            <td style="font-size:12px;color:var(--ink-4)">${s.assignedBy ? esc(s.assignedBy) + ' · ' + s.assignedAt : 'student chose'}</td>
            <td style="font-size:12px">${hasBlueprint(t)?'<b style="color:var(--leaf-700)">native</b>':'IELTS'}</td>
            <td style="text-align:right"><button class="btn btn-g btn-sm" onclick="trackAssignModal('${s.id}')"><i class="fa-solid fa-pen"></i> Assign</button></td>
          </tr>`;
        }).join('')}</tbody></table></div>
        ${sts.length>40?`<div style="padding:13px 21px;font-size:12px;color:var(--ink-4)">Showing 40 of ${sts.length}. Use Personnel to search the full roster.</div>`:''}
      </div>
    </div>`;
}
function trackExport(){
  const rows = [['ID','Name','Cohort','Exam track','Scale','Assigned by','Assigned on','School parts','Mocks','Native engine']];
  students().forEach(s => {
    const t = trackOf(s), ex = examOf(t);
    rows.push([s.id, s.name, cohortOf(s.cohort).name, ex.name, ex.scale==='band'?'0–9':'0–'+ex.max,
      s.assignedBy||'student chose', s.assignedAt||'', trackParts(t).length, mocksForTrack(t).length, hasBlueprint(t)?'yes':'no']);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-exam-tracks-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('Exported ' + students().length + ' track assignments', 'fa-file-csv');
}

/* ── the read-only notice a student sees in their own settings ── */
function trackNoticeHTML(){
  if (!examLocked()) return '';
  const ex = examOf(examTrack());
  return `<div style="display:flex;gap:13px;align-items:flex-start;padding:14px 16px;background:var(--leaf-50);border:1px solid var(--leaf-200);border-radius:12px;margin-bottom:14px">
    <i class="fa-solid fa-lock" style="color:var(--leaf-700);margin-top:3px"></i>
    <div><b style="font-size:13px;display:block;margin-bottom:3px">Your exam track is set to ${ex.name}</b>
      <span style="font-size:12px;color:var(--ink-3);line-height:1.55">Assigned by your academy, so your School content, mocks and study plan all match this exam. Ask your teacher if you need to change it.</span></div></div>`;
}
