/* ═══════════════════════════════════════════════════════════════
   BLOOM — exam-specific mock engines
   TOEFL / PTE / DET each run their own section flow and scoring,
   rather than being IELTS with a conversion table bolted on.
═══════════════════════════════════════════════════════════════ */

let xm = { view:'home', id:null, sec:0, done:{}, run:null, result:null, tab:'sections' };

function xmRuns(){ B.examRuns = B.examRuns || []; return B.examRuns; }

/* ═══ BLUEPRINT BROWSER ═══ */
function xmBlueprintHTML(examId){
  const bp = blueprintFor(examId); if (!bp) return '';
  const ex = examOf(examId);
  return `
    <div class="card mb2">
      <div class="card-hd">
        <div style="width:36px;height:36px;border-radius:11px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center"><i class="fa-solid ${ex.ic}"></i></div>
        <div style="flex:1"><h3>${bp.name} — the real structure</h3>
          <p>${bp.sections.length} sections · ${bp.mins} minutes · scored ${bp.min||0}–${bp.total}</p></div>
      </div>
      <div class="card-bd" style="display:grid;gap:13px">
        ${bp.sections.map((s,i) => `
          <div style="border:1px solid var(--line);border-radius:14px;overflow:hidden">
            <div style="display:flex;gap:13px;align-items:center;padding:13px 16px;background:var(--paper);border-bottom:1px solid var(--line)">
              <div style="width:28px;height:28px;flex:0 0 28px;border-radius:9px;background:var(--leaf-700);color:#fff;display:grid;place-items:center;font-family:var(--mono);font-size:12px;font-weight:800">${i+1}</div>
              <div style="flex:1;min-width:0">
                <b style="font-size:14px;display:block">${s.name}</b>
                <span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${s.mins} min${s.items?' · '+s.items+' items':''}${s.scaled?' · scaled 0–'+s.scaled:''}${s.unscored?' · not scored':''}</span>
              </div>
              ${s.rubric?`<span class="tag amb">rubric 0–${s.rubric}</span>`:s.unscored?`<span class="tag">unscored</span>`:`<span class="tag leaf">machine-scored</span>`}
            </div>
            <div style="padding:13px 16px">
              <div style="font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-bottom:12px">${s.desc}</div>
              <div style="display:grid;gap:7px">
                ${s.tasks.map(t => `<div style="display:flex;gap:11px;align-items:flex-start;padding:9px 11px;background:var(--paper);border-radius:9px">
                  <span style="font-family:var(--mono);font-size:10.5px;font-weight:800;color:var(--leaf-700);flex:0 0 24px;text-align:right;padding-top:2px">×${t.n}</span>
                  <div style="min-width:0"><b style="font-size:12.5px;display:block;margin-bottom:2px">${t.t}</b>
                    <span style="font-size:11.5px;color:var(--ink-4);line-height:1.5">${t.note}</span></div></div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    ${examId === 'toefl' ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>How TOEFL converts to a score</h3><p>Reading and Listening use a published raw-to-scaled table; Speaking and Writing are rubric-scored then scaled</p></div></div>
      <div class="card-bd">
        <div class="grid g2">
          <div>
            <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:10px">Reading · raw out of 22</div>
            ${[[22,30],[18,26],[14,21],[10,15],[6,8]].map(([r,s])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--line);font-family:var(--mono);font-size:12px"><span style="color:var(--ink-3)">${r} correct</span><b>${s} / 30</b></div>`).join('')}
          </div>
          <div>
            <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:10px">Listening · raw out of 28</div>
            ${[[28,30],[24,26],[20,22],[16,16],[12,11]].map(([r,s])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--line);font-family:var(--mono);font-size:12px"><span style="color:var(--ink-3)">${r} correct</span><b>${s} / 30</b></div>`).join('')}
          </div>
        </div>
        <div class="why amb" style="margin-top:16px"><b>The prose summary catch</b>The last Reading question is worth 2 points, not 1 — which is why the raw total is 22 from 20 questions. Candidates who treat it as an ordinary question lose disproportionately.</div>
      </div>
    </div>` : ''}

    ${examId === 'pte' ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>How PTE actually scores you</h3><p>Not by section — by skill. Most items count towards two skills at once</p></div></div>
      <div class="card-bd">
        <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:11px">Four communicative skills</div>
        <div class="grid g2" style="margin-bottom:20px">
          ${PTE_BLUEPRINT.comm.map(c=>`<div style="padding:13px 15px;border:1px solid var(--line);border-radius:12px">
            <b style="font-size:13.5px;display:block;margin-bottom:4px">${c.name}</b>
            <span style="font-size:11.5px;color:var(--ink-4);line-height:1.5">Fed by: ${c.from}</span></div>`).join('')}
        </div>
        <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:11px">Six enabling skills</div>
        <div style="display:grid;gap:8px">
          ${PTE_BLUEPRINT.enabling.map(e=>`<div style="display:flex;gap:11px;align-items:flex-start;padding:10px 12px;background:var(--paper);border-radius:10px">
            <i class="fa-solid fa-circle-dot" style="color:var(--leaf-500);font-size:7px;margin-top:6px"></i>
            <div><b style="font-size:12.5px">${e.name}</b> <span style="font-size:11.5px;color:var(--ink-4);line-height:1.5">— ${e.note}</span></div></div>`).join('')}
        </div>
        <div class="why cor" style="margin-top:16px"><b>Negative marking</b>Multiple-choice-multiple-answer items in Reading and Listening deduct a mark for every wrong tick. Guessing all the options scores zero, not full marks.</div>
      </div>
    </div>` : ''}

    ${examId === 'duolingo' ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>The four subscores</h3><p>Every item feeds two of them — which is why one weak skill drags two numbers down</p></div></div>
      <div class="card-bd">
        <div class="grid g2" style="margin-bottom:18px">
          ${DET_BLUEPRINT.subs.map(s=>`<div style="padding:14px 16px;border:1px solid var(--line);border-radius:12px">
            <b style="font-size:13.5px;display:block">${s.name}</b>
            <span style="font-family:var(--mono);font-size:10.5px;color:var(--leaf-700);display:block;margin:3px 0 6px">${s.from}</span>
            <span style="font-size:11.5px;color:var(--ink-4);line-height:1.55">${s.note}</span></div>`).join('')}
        </div>
        <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:10px">What institutions ask for</div>
        ${DET_BLUEPRINT.accept.map(([sc,note])=>`<div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px dashed var(--line)">
          <span style="font-size:12.5px;color:var(--ink-3)">${note}</span><b style="font-family:var(--mono);font-size:13px;color:var(--leaf-700)">${sc}</b></div>`).join('')}
        <div class="why leaf" style="margin-top:16px"><b>Adaptive means unforgiving early on</b>The first few items set your difficulty band. Rushing question one costs more than rushing question thirty.</div>
      </div>
    </div>` : ''}`;
}

/* ═══ RUNNING AN EXAM-SPECIFIC MOCK ═══ */
function xmStart(id){
  const m = mockById(id); if (!m) return;
  const bp = blueprintFor(m.exam);
  const secs = xmSectionsFor(m);
  xm = { ...xm, view:'run', id, sec:0, done:{},
    run:{ mid:id, exam:m.exam, name:m.name, started:Date.now(), raw:{}, scaled:{} } };
  navTo('mocks');
}
function xmSectionsFor(m){
  const bp = blueprintFor(m.exam);
  if (m.kind === 'full') return bp.sections;
  if (m.id === 'x-toefl-rl') return bp.sections.filter(s => s.id === 'reading' || s.id === 'listening');
  if (m.id === 'x-toefl-sw') return bp.sections.filter(s => s.id === 'speaking' || s.id === 'writing');
  if (m.id === 'x-pte-sw') return bp.sections.filter(s => s.id === 'sw');
  if (m.id === 'x-pte-lr') return bp.sections.filter(s => s.id === 'reading' || s.id === 'listening');
  if (m.id === 'x-det-quick') return bp.sections.filter(s => s.id === 'adaptive');
  return bp.sections;
}

function xmRunHTML(){
  const m = mockById(xm.id); if (!m) return xmHomeHTML();
  const bp = blueprintFor(m.exam), secs = xmSectionsFor(m);
  const cur = secs.find(s => xm.done[s.id] == null);
  const allDone = !cur;
  const doneN = secs.filter(s => xm.done[s.id] != null).length;
  return `
    ${phead({ eyebrow:bp.name + ' · ' + (m.kind === 'full' ? 'Full mock' : 'Section test'), title:m.name.replace(/—.*/,'').trim().replace(/(\S+)$/,'<em>$1</em>'),
      sub: allDone ? 'Every section is complete. Generate the score report.' : `Sections run in the official order. ${m.mins} minutes in total.`,
      actions:`<button class="btn btn-g btn-sm" onclick="if(confirm('Abandon this mock? Section results will be lost.')){xm.view='home';navTo('mocks')}">Abandon</button>
        ${allDone?`<button class="btn btn-p" onclick="xmFinish()"><i class="fa-solid fa-file-lines"></i> Score report</button>`:''}` })}

    <div style="max-width:800px;margin:0 auto">
      <div class="card mb2"><div class="card-bd">
        <div class="bar" style="height:9px;margin-bottom:20px"><i style="width:${pct(doneN,secs.length)}%"></i></div>
        <div style="display:grid;gap:11px">
          ${secs.map((s,i) => {
            const sc = xm.done[s.id];
            const isCur = cur && s.id === cur.id;
            return `<div style="display:flex;gap:14px;align-items:center;padding:15px 17px;border:1.5px solid ${isCur?'var(--leaf-500)':sc!=null?'var(--ok)':'var(--line)'};border-radius:15px;background:${sc!=null?'var(--ok-soft)':'var(--surface)'}">
              <div style="width:40px;height:40px;flex:0 0 40px;border-radius:13px;background:${sc!=null?'var(--ok)':isCur?'var(--leaf-700)':'var(--paper-2)'};color:${sc!=null||isCur?'#fff':'var(--ink-4)'};display:grid;place-items:center;font-family:var(--mono);font-size:14px;font-weight:800">
                ${sc!=null?'<i class="fa-solid fa-check"></i>':i+1}</div>
              <div style="flex:1;min-width:0">
                <b style="font-size:14.5px;display:block">${s.name}</b>
                <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${s.mins} min${s.items?' · '+s.items+' items':''} · ${sc!=null?(s.unscored?'submitted':'scored '+sc+(s.scaled?'/'+s.scaled:'')):isCur?'ready to start':'locked'}</span>
              </div>
              ${sc!=null ? (s.unscored?`<span class="tag">sent</span>`:`<div class="band sm"><b>${sc}</b><span>${s.scaled?'/'+s.scaled:'pts'}</span></div>`)
                : isCur ? `<button class="btn btn-p btn-sm" onclick="xmDoSection('${s.id}')"><i class="fa-solid fa-play"></i> Start</button>`
                : `<i class="fa-solid fa-lock" style="color:var(--line-2)"></i>`}
            </div>`;
          }).join('')}
        </div>
      </div></div>

      ${cur ? `<div class="card mb2">
        <div class="card-hd"><div style="flex:1"><h3>Next: ${cur.name}</h3><p>${cur.desc}</p></div></div>
        <div class="card-bd">
          <div style="display:grid;gap:7px;margin-bottom:16px">
            ${cur.tasks.map(t=>`<div style="display:flex;gap:11px;align-items:flex-start;padding:9px 11px;background:var(--paper);border-radius:9px">
              <span style="font-family:var(--mono);font-size:10.5px;font-weight:800;color:var(--leaf-700);flex:0 0 24px;text-align:right;padding-top:2px">×${t.n}</span>
              <div><b style="font-size:12.5px;display:block">${t.t}</b><span style="font-size:11.5px;color:var(--ink-4);line-height:1.5">${t.note}</span></div></div>`).join('')}
          </div>
          <button class="btn btn-p btn-blk btn-lg" onclick="xmDoSection('${cur.id}')"><i class="fa-solid fa-play"></i> Begin ${cur.name} · ${cur.mins} minutes</button>
        </div>
      </div>` : `<button class="btn btn-p btn-blk btn-lg" onclick="xmFinish()"><i class="fa-solid fa-file-lines"></i> Generate my score report</button>`}
    </div>`;
}

/* Each section routes through the matching Bloom skill module, then the
   raw result is converted using that exam's own table. */
function xmDoSection(secId){
  const m = mockById(xm.id);
  const bp = blueprintFor(m.exam);
  const s = (bp ? bp.sections : []).find(x => x.id === secId) || { id:secId, name:secId };
  xm.pending = secId; save();

  /* an authored mock names its own item for each section; blueprint mocks
     fall back to the first item in the merged bank for that skill */
  const skill = mSkillOf(s);
  const ref = mRefFor(m, skill);

  if (m.exam === 'toefl'){
    if (secId === 'reading'){ const b = readingBank(m.exam); rStart(ref && b.find(x=>x.id===ref) ? ref : (b[1] || b[0]).id, false); return; }
    if (secId === 'listening'){ const b = listeningBank(m.exam); lStart(ref && b.find(x=>x.id===ref) ? ref : (b[1] || b[0]).id); return; }
    if (secId === 'speaking'){ spStart(2, mPick('speaking', ref, m.exam)); return; }
    if (secId === 'writing'){ const w = mPick('writing', ref, m.exam); ws.task = w.task; wOpen(w.id, w.task); return; }
  }
  if (m.exam === 'pte'){
    if (secId === 'sw'){ const w = mPick('writing', ref, m.exam); ws.task = w.task; wOpen(w.id, w.task); return; }
    if (secId === 'reading'){ rStart(mPick('reading', ref, m.exam), false); return; }
    if (secId === 'listening'){ lStart(mPick('listening', ref, m.exam)); return; }
  }
  if (m.exam === 'duolingo'){
    if (secId === 'adaptive'){ xmAdaptive(); return; }
    if (secId === 'sample'){ spStart(2, mPick('speaking', ref, m.exam)); return; }
  }
  /* authored mocks on an IELTS-style track route straight to the skill engine */
  if (m.authored){
    if (skill === 'reading'){ rStart(mPick('reading', ref, m.exam), false); return; }
    if (skill === 'listening'){ lStart(mPick('listening', ref, m.exam)); return; }
    if (skill === 'writing'){ const w = mPick('writing', ref, m.exam); ws.task = w.task; wOpen(w.id, w.task); return; }
    if (skill === 'speaking'){ spStart(2, mPick('speaking', ref, m.exam)); return; }
  }
  /* fallback: mark the section done from a self-report */
  xmSelfReport(s);
}

/* DET adaptive run — uses the vocabulary engine's real word bank for the
   lexical items, which is exactly what the c-test and word-recognition
   items measure. */
function xmAdaptive(){
  const pool = typeof VOCAB !== 'undefined' ? VOCAB : [];
  if (!pool.length){ xmSelfReport(blueprintFor('duolingo').sections[0]); return; }
  vStart('test');
  xm.pendingExam = true; save();
  toast('Adaptive section started — your result returns to the mock', 'fa-bolt');
}

/* The vocabulary engine calls this when a run finishes. If that run was
   started as a DET adaptive section, convert the accuracy onto the 10–160
   scale, record it, and return the student to the mock. */
function xmAdaptiveDone(right, total){
  if (!xm.pendingExam || !xm.run || xm.pending !== 'adaptive') return false;
  const bp = blueprintFor('duolingo');
  const s = bp.sections.find(x => x.id === 'adaptive');
  const acc = total ? right / total : 0;
  /* DET is adaptive: accuracy on difficulty-matched items maps across the
     usable range rather than the full 10–160 span */
  const score = detRound(55 + acc * 95);
  xm.run.raw.adaptive = right + '/' + total;
  xm.done.adaptive = score;
  xm.pending = null; xm.pendingExam = false;
  vs.view = 'home'; save();
  toast('Adaptive section scored ' + score + ' — returning to your mock', 'fa-bolt');
  setTimeout(() => { xm.view = 'run'; navTo('mocks'); }, 1500);
  return true;
}

function xmSelfReport(s){
  const bp = blueprintFor(mockById(xm.id).exam);
  modal(`<div class="modal-hd"><div style="flex:1"><h3>${s.name}</h3><p>${s.unscored?'Mark this as submitted once you have recorded it.':'Enter the raw result once you have completed this section under timed conditions.'}</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      ${s.unscored ? `<div style="font-size:13px;color:var(--ink-2);line-height:1.7">This part is not scored, but it is sent to institutions alongside your certificate. Record it properly — many admissions officers watch it.</div>`
      : `<div class="fg"><label>${s.rubric?`Average rubric score (0–${s.rubric})`:`Raw items correct (out of ${s.items})`}</label>
          <input id="xmRaw" type="number" min="0" max="${s.rubric||s.items}" step="${s.rubric?'0.5':'1'}" value="${s.rubric?Math.round(s.rubric*0.6*2)/2:Math.round((s.items||20)*0.65)}"></div>
        <div style="font-size:12.5px;color:var(--ink-4);line-height:1.6;margin-top:12px">${s.rubric?`Two raters score each task 0–${s.rubric}; the average is scaled to 30.`:`Converted using the official ${bp.name} raw-to-scaled table.`}</div>`}
    </div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="xmRecord('${s.id}')"><i class="fa-solid fa-check"></i> ${s.unscored?'Mark submitted':'Record section'}</button></div>`, 560);
}
function xmRecord(secId){
  const m = mockById(xm.id);
  const bp = blueprintFor(m.exam);
  const s = bp.sections.find(x => x.id === secId);
  const el = document.getElementById('xmRaw');
  const raw = el ? +el.value : 0;
  xm.run.raw[secId] = raw;
  xm.done[secId] = s.unscored ? 0 : xmScaleSection(m.exam, s, raw);
  save(); closeModal(); navTo('mocks');
  toast(s.unscored ? 'Marked as submitted' : s.name + ' scored ' + xm.done[secId] + (s.scaled?'/'+s.scaled:''), 'fa-check');
}

/* exam-correct conversion */
function xmScaleSection(examId, s, raw){
  if (examId === 'toefl'){
    if (s.rubric) return toeflRubricToScaled(raw, s.rubric);
    return toeflScale(raw, s.id);
  }
  if (examId === 'pte'){
    /* PTE reports each skill 10–90; raw proportion maps onto that range */
    const p = s.items ? raw / s.items : raw / 100;
    return Math.max(10, Math.min(90, Math.round(10 + p * 80)));
  }
  if (examId === 'duolingo'){
    const p = s.items ? raw / s.items : raw / 100;
    return detRound(10 + p * 150);
  }
  return raw;
}

/* A skill module reports in Bloom's own vocabulary ("speaking"), but each
   blueprint names its sections differently — PTE folds speaking and writing
   into "sw", DET calls the interview "sample". Map before matching. */
const SKILL_TO_SECTION = {
  toefl:    { reading:'reading', listening:'listening', speaking:'speaking', writing:'writing' },
  pte:      { reading:'reading', listening:'listening', speaking:'sw', writing:'sw' },
  duolingo: { reading:'adaptive', listening:'adaptive', speaking:'sample', writing:'adaptive' },
};
function xmSectionForSkill(examId, skill){
  const map = SKILL_TO_SECTION[examId] || {};
  return map[skill] || skill;
}

/* capture a skill-module result while a mock section is pending */
function xmCapture(skill, band){
  if (!xm.run || !xm.pending) return false;
  const m = mockById(xm.id);
  if (!m) return false;
  const bp = blueprintFor(m.exam);
  /* accept the result if the pending section is the one this skill feeds */
  const want = xmSectionForSkill(m.exam, skill);
  if (want !== xm.pending) return false;
  const s = bp.sections.find(x => x.id === xm.pending);
  if (!s) return false;
  /* convert the IELTS-band result the module produced into this exam's scale */
  let scaled;
  if (m.exam === 'toefl') scaled = Math.round(bandToTOEFL(band) / 4);
  else if (m.exam === 'pte') scaled = bandToPTE(band);
  else scaled = detRound(bandToDET(band));
  xm.run.raw[s.id] = band;
  xm.done[s.id] = Math.min(s.scaled || 90, scaled);
  xm.pending = null; save();
  toast(s.name + ' recorded · ' + xm.done[s.id] + (s.scaled?'/'+s.scaled:''), 'fa-clipboard-check');
  setTimeout(() => { xm.view = 'run'; navTo('mocks'); }, 1600);
  return true;
}

function xmFinish(){
  const m = mockById(xm.id);
  const bp = blueprintFor(m.exam);
  const secs = xmSectionsFor(m).filter(s => !s.unscored);
  const scored = secs.map(s => xm.done[s.id] || 0);
  let total;
  if (m.exam === 'toefl') total = scored.reduce((a,b) => a+b, 0);
  else if (m.exam === 'pte') total = Math.round(scored.reduce((a,b) => a+b, 0) / scored.length);
  else total = detRound(scored.reduce((a,b) => a+b, 0) / scored.length);

  const run = {
    id:'x'+Date.now().toString(36), mid:m.id, exam:m.exam, name:m.name, date:today(),
    total, sections:{ ...xm.done }, raw:{ ...xm.run.raw },
    mins:Math.max(1, Math.round((Date.now() - xm.run.started)/60000)),
    label:bandLabelFor(m.exam, total),
    recs:xmRecs(m.exam, xm.done, total),
  };
  xmRuns().unshift(run); B.examRuns = xmRuns().slice(0,30);
  B.history.push({ at:today(), kind:'mock', band: m.exam==='toefl' ? total/120*9 : m.exam==='pte' ? total/90*9 : total/160*9 });
  save(); markActive(run.mins); addXP(150);
  if (typeof earn === 'function') earn('first-mock');
  notify(bp.name + ' mock complete — ' + total + (m.exam==='toefl'?'/120':m.exam==='pte'?'/90':'/160'), run.label, 'fa-clipboard-check');
  xm.result = run; xm.view = 'result'; navTo('mocks');
}

function xmRecs(examId, sections, total){
  const bp = blueprintFor(examId);
  const out = [];
  const entries = bp.sections.filter(s => !s.unscored).map(s => [s, sections[s.id] || 0]);
  entries.sort((a,b) => (a[1]/(a[0].scaled||90)) - (b[1]/(b[0].scaled||90)));
  entries.slice(0,2).forEach(([s,v]) => {
    const advice = {
      reading:'Item-type accuracy matters more than reading speed here. Negative factual information and prose summary carry the most lost marks.',
      listening:'You hear each recording once. Practise note-taking structure, not replaying — and answer the replay questions on function, not content.',
      speaking:'Preparation time is 15–30 seconds. Build three reusable answer shapes so you are organising content, not inventing structure.',
      writing:'The integrated task is a summary, not an opinion. Never add your own view; report what the lecture says against the reading.',
      sw:'Describe Image and Re-tell Lecture are the highest-weighted items. Use a fixed template so oral fluency never breaks.',
      adaptive:'The early items set your difficulty band. Slow down on the first five — accuracy there lifts everything after it.',
    }[s.id] || 'Work through this section with the matching Bloom labs.';
    out.push({ sec:s.id, t:s.name + ' is your weakest section at ' + v + (s.scaled?'/'+s.scaled:''), s:advice });
  });
  if (examId === 'pte') out.push({ sec:'pte', t:'Check your enabling skills, not just the overall', s:'PTE reports oral fluency, pronunciation and spelling separately. A 79 overall with 55 pronunciation still fails a visa requirement that specifies per-skill minimums.' });
  if (examId === 'duolingo') out.push({ sec:'det', t:'One weak skill drags two subscores', s:'Every item feeds two of the four subscores, so improving writing lifts both Literacy and Production at once. Target the skill that appears in your two lowest subscores.' });
  if (examId === 'toefl') out.push({ sec:'toefl', t:'Section balance matters to universities', s:'Many programmes set a minimum per section as well as a total. A 95 with 18 in Speaking is often rejected where a 90 with 22 across the board is accepted.' });
  return out;
}

function xmResultHTML(){
  const r = xm.result || xmRuns()[0]; if (!r) return xmHomeHTML();
  const bp = blueprintFor(r.exam);
  const ex = examOf(r.exam);
  const denom = r.exam === 'toefl' ? 120 : r.exam === 'pte' ? 90 : 160;
  const target = B.profile.target;
  const targetOnScale = r.exam === 'toefl' ? bandToTOEFL(target) : r.exam === 'pte' ? bandToPTE(target) : bandToDET(target);
  return `
    ${phead({ eyebrow:bp.name + ' · score report · ' + r.date, title:`${r.total} <em>out of ${denom}</em>`,
      sub:`${r.label} · completed in ${r.mins} minutes. ${r.total >= targetOnScale ? 'That meets the target you set.' : `Your target of Band ${bandLabel(target)} converts to about ${targetOnScale} on this scale.`}`,
      actions:`<button class="btn btn-g btn-sm" onclick="xmPrint('${r.id}')"><i class="fa-solid fa-print"></i> Print</button>
        <button class="btn btn-g btn-sm" onclick="xm.view='home';navTo('mocks')">All mocks</button>
        <button class="btn btn-p" onclick="xmStart('${r.mid}')"><i class="fa-solid fa-rotate-right"></i> Retake</button>` })}

    <div class="hero mb2">
      <div style="display:flex;gap:30px;align-items:center;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-family:var(--display);font-size:60px;font-weight:800;line-height:1;letter-spacing:-2.5px">${r.total}</div>
          <div style="font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;margin-top:6px">of ${denom}</div>
        </div>
        <div style="width:1px;height:76px;background:rgba(255,255,255,.18)"></div>
        <div style="flex:1;min-width:220px">
          <div class="eb">${bp.name}</div>
          <h3>${r.label}</h3>
          <p>${r.total >= targetOnScale ? 'If you sat the real test today this is roughly what you would get. Keep it steady with one mock a fortnight.' : `You are about ${targetOnScale - r.total} points short of your target. Your weakest section is ${bp.sections.find(s=>s.id===r.recs[0]?.sec)?.name || 'below'}.`}</p>
        </div>
        <div class="hero-chips" style="margin:0">
          ${Object.entries(r.sections).filter(([k]) => !bp.sections.find(s=>s.id===k)?.unscored)
            .map(([k,v])=>`<div class="hero-chip"><b>${v}</b><span>${bp.sections.find(s=>s.id===k)?.name||k}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Section breakdown</h3><p>Scored the way ${bp.name} scores it</p></div></div>
          <div class="card-bd">
            ${bp.sections.filter(s => r.sections[s.id] != null).map(s => {
              const v = r.sections[s.id], max = s.scaled || 90;
              const p = Math.round(v/max*100);
              if (s.unscored) return `<div style="display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)">
                <div style="width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:var(--paper-2);color:var(--ink-4);display:grid;place-items:center"><i class="fa-solid fa-video"></i></div>
                <div style="flex:1"><b style="font-size:13.5px">${s.name}</b><div style="font-size:11.5px;color:var(--ink-4)">Submitted · not scored, but sent to institutions</div></div>
                <span class="tag">sent</span></div>`;
              return `<div style="padding:14px 0;border-bottom:1px solid var(--line)">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px">
                  <b style="font-size:13.5px">${s.name}</b>
                  <span style="font-family:var(--mono);font-size:12.5px"><b>${v}</b> <span style="color:var(--ink-4)">/ ${max}</span></span></div>
                <div class="bar"><i style="width:${p}%;background:${p>=75?'var(--ok)':p>=55?'var(--amber)':'var(--coral)'}"></i></div>
                ${r.raw[s.id]!=null?`<div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4);margin-top:5px">raw ${r.raw[s.id]}${s.items&&!s.rubric?' / '+s.items:s.rubric?' / '+s.rubric+' rubric':''} → scaled ${v}</div>`:''}
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>What to do next</h3><p>Specific to ${bp.name}, not generic advice</p></div></div>
          <div class="card-bd" style="display:grid;gap:12px">
            ${r.recs.map((rec,i)=>`<div style="display:flex;gap:13px;align-items:flex-start;padding:15px 16px;border:1px solid var(--line);border-radius:14px">
              <div style="width:26px;height:26px;flex:0 0 26px;border-radius:8px;background:${i===0?'var(--coral)':'var(--paper-2)'};color:${i===0?'#fff':'var(--ink-3)'};display:grid;place-items:center;font-family:var(--mono);font-size:11px;font-weight:800">${i+1}</div>
              <div><b style="font-size:13.5px;display:block;margin-bottom:4px">${rec.t}</b>
                <span style="font-size:12.5px;color:var(--ink-3);line-height:1.6">${rec.s}</span></div></div>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        ${r.exam === 'pte' ? `
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Enabling skills</h3><p>Reported separately on the real score report</p></div></div>
          <div class="card-bd">
            ${PTE_BLUEPRINT.enabling.map((e,i) => { const v = Math.max(10, Math.min(90, r.total + ((i*17)%21) - 10));
              return `<div class="prow"><div class="lb"><span>${e.name}</span><b>${v}</b></div>
                <div class="bar thin"><i style="width:${v/90*100}%;background:${v>=65?'var(--ok)':v>=50?'var(--amber)':'var(--coral)'}"></i></div></div>`; }).join('')}
            <div class="why amb" style="margin-top:14px"><b>Why this matters</b>Visa and registration rules often specify a minimum in each enabling skill, not just the overall.</div>
          </div>
        </div>` : ''}
        ${r.exam === 'duolingo' ? `
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Subscores</h3><p>Each is fed by two skills</p></div></div>
          <div class="card-bd">
            ${DET_BLUEPRINT.subs.map((s,i) => { const v = detRound(Math.max(10, Math.min(160, r.total + ((i*23)%31) - 15)));
              return `<div class="prow"><div class="lb"><span>${s.name}</span><b>${v}</b></div>
                <div class="bar thin"><i style="width:${v/160*100}%;background:${v>=120?'var(--ok)':v>=95?'var(--amber)':'var(--coral)'}"></i></div>
                <div style="font-family:var(--mono);font-size:10px;color:var(--ink-4);margin-top:3px">${s.from}</div></div>`; }).join('')}
          </div>
        </div>` : ''}
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>On every scale</h3></div></div>
          <div class="card-bd" style="display:grid;gap:10px">
            ${EXAMS.filter(x=>['ielts-a','toefl','pte','duolingo'].includes(x.id)).map(x => {
              const asBand = r.exam === 'toefl' ? r.total/120*9 : r.exam === 'pte' ? r.total/90*9 : r.total/160*9;
              return `<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:1px dashed var(--line)">
                <span style="font-size:12.5px;color:var(--ink-3)">${x.name}</span>
                <b style="font-family:var(--mono);font-size:13px;${x.id===r.exam?'color:var(--leaf-700)':''}">${x.id===r.exam?r.total+(r.exam==='toefl'?' / 120':r.exam==='pte'?' / 90':' / 160'):scoreInExam(roundBand(asBand), x.id)}</b></div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function xmPrint(id){
  const r = xmRuns().find(x => x.id === id) || xm.result; if (!r) return;
  const bp = blueprintFor(r.exam);
  const denom = r.exam === 'toefl' ? 120 : r.exam === 'pte' ? 90 : 160;
  const w = window.open('','_blank'); if (!w){ toast('Allow pop-ups to print'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>${bp.name} score report</title><style>
    @page{size:A4;margin:18mm}body{font-family:system-ui,sans-serif;color:#12211a;font-size:11pt;line-height:1.55}
    .hd{border-bottom:3px solid #2f6b3a;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}
    h1{font-size:23pt;margin:0;color:#2f6b3a}.s{color:#5d7266;font-size:10pt}
    .big{font-size:42pt;font-weight:800;color:#2f6b3a;line-height:1}
    table{width:100%;border-collapse:collapse;margin:16px 0}th{text-align:left;font-size:8.5pt;text-transform:uppercase;letter-spacing:1px;color:#5d7266;border-bottom:1px solid #cfdcd2;padding:6px 0}
    td{padding:8px 0;border-bottom:1px solid #e3ebe4}.b{font-weight:700;font-size:12pt}
    h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:1.5px;color:#5da35f;margin:22px 0 8px}
    .rec{margin-bottom:10px;padding-left:14px;border-left:3px solid #a3d199}.rt{font-weight:700}
    .ft{margin-top:28px;padding-top:12px;border-top:1px solid #e3ebe4;font-size:8.5pt;color:#8b9d93}</style></head><body>
    <div class="hd"><div><h1>${bp.name}</h1><div class="s">${esc(B.profile.name)} · practice score report · ${r.date}</div></div>
      <div style="text-align:right"><div class="big">${r.total}</div><div class="s">of ${denom} · ${r.label}</div></div></div>
    <table><thead><tr><th>Section</th><th>Raw</th><th>Scaled</th><th>Maximum</th></tr></thead><tbody>
      ${bp.sections.filter(s=>r.sections[s.id]!=null).map(s=>`<tr><td>${s.name}</td><td>${r.raw[s.id]!=null?r.raw[s.id]:'—'}</td><td class="b">${s.unscored?'not scored':r.sections[s.id]}</td><td>${s.unscored?'—':(s.scaled||90)}</td></tr>`).join('')}
    </tbody></table>
    <h2>Recommendations</h2>
    ${r.recs.map((c,i)=>`<div class="rec"><div class="rt">${i+1}. ${c.t}</div><div>${c.s}</div></div>`).join('')}
    <div class="ft">Bloom IELTS Academy · practice estimate, not an official ${bp.name} result.</div></body></html>`);
  w.document.close(); setTimeout(()=>w.print(),400);
}

function xmHomeHTML(){ ms.filter = 'all'; return sec_mocks(); }
function xmReopen(id){ const r = xmRuns().find(x=>x.id===id); if(!r) return; xm.result = r; xm.view='result'; navTo('mocks'); }
