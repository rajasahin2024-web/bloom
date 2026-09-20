/* ═══════════════════════════════════════════════════════════════
   BLOOM — Exam Builder
   Authoring for full mock exams, section tests, reading passages,
   listening tracks, writing tasks, speaking cue cards and quizzes.
   Everything authored here is filtered to the student's exam track
   and merged into the same banks the practice engines already read.
═══════════════════════════════════════════════════════════════ */

let xb = { kind:'mock', q:'', filter:'all', draft:null, step:0, sec:null, grp:null };

/* ── storage ── */
function xbStore(){
  B.authored = B.authored || { mock:[], reading:[], listening:[], writing:[], speaking:[], quiz:[] };
  ['mock','reading','listening','writing','speaking','quiz'].forEach(k => B.authored[k] = B.authored[k] || []);
  return B.authored;
}
function xbList(k){ return xbStore()[k] || []; }
function xbById(k, id){ return xbList(k).find(x => x.id === id); }
function xbPub(k, examId){
  const list = xbList(k).filter(x => x.published);
  return examId ? list.filter(x => !x.exam || x.exam === examId || x.exam === 'any') : list;
}
function xbSave(){ save(); }

/* ── the six content kinds ── */
const XB_KINDS = {
  mock:      { name:'Mock exams',      one:'mock exam',      ic:'fa-clipboard-check', tone:'cor',  sub:'Full sittings and section tests, built on the official blueprint for each exam' },
  reading:   { name:'Reading passages',one:'reading passage',ic:'fa-book-open',       tone:'leaf', sub:'Passages with paragraph labels and grouped question sets' },
  listening: { name:'Listening tracks',one:'listening track',ic:'fa-headphones',     tone:'sky',  sub:'Scripted recordings with a synchronised transcript and question sets' },
  writing:   { name:'Writing tasks',   one:'writing task',   ic:'fa-pen-nib',        tone:'amb',  sub:'Task 1 and Task 2 prompts with key features and model answers' },
  speaking:  { name:'Speaking prompts',one:'speaking prompt',ic:'fa-microphone',     tone:'cor',  sub:'Part 1 topic sets, Part 2 cue cards and Part 3 discussion questions' },
  quiz:      { name:'Quizzes',         one:'quiz',           ic:'fa-list-check',     tone:'vio',  sub:'Short multiple-choice sets tied to one exam part' },
};

/* ── IELTS blueprint, so mock building works for every track ── */
const IELTS_SECTIONS = [
  { id:'listening', name:'Listening', mins:30, items:40, unscored:false },
  { id:'reading',   name:'Reading',   mins:60, items:40, unscored:false },
  { id:'writing',   name:'Writing',   mins:60, items:2,  unscored:false },
  { id:'speaking',  name:'Speaking',  mins:14, items:3,  unscored:false },
];
function xbSections(examId){
  const bp = typeof blueprintFor === 'function' ? blueprintFor(examId) : null;
  return bp ? bp.sections : IELTS_SECTIONS;
}
function xbScaleLabel(examId){
  const bp = typeof blueprintFor === 'function' ? blueprintFor(examId) : null;
  if (bp) return bp.total + (bp.min ? ' (from ' + bp.min + ')' : '') + ' total';
  return 'Band 0–9';
}

/* IELTS question types available to reading and listening */
const XB_QTYPES = {
  mcq:        { name:'Multiple choice',        needs:'options', instr:'Choose the correct letter, A, B, C or D.' },
  tfng:       { name:'True / False / Not Given', needs:'tfng',  instr:'Do the following statements agree with the information given in the passage?' },
  ynng:       { name:'Yes / No / Not Given',   needs:'ynng',    instr:'Do the following statements agree with the claims of the writer?' },
  headings:   { name:'Matching headings',      needs:'bank',    instr:'Choose the correct heading for each paragraph from the list below.' },
  matching:   { name:'Matching information',   needs:'bank',    instr:'Match each item with the correct description from the list A–G.' },
  completion: { name:'Sentence completion',    needs:'answer',  instr:'Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.' },
};

/* ═══ ROUTER ═══ */
function sec_exambuilder(){
  if (xb.draft) return xbDraftHTML();
  return xbHomeHTML();
}

function xbPills(){
  return `<div class="pills mb" style="margin-bottom:18px">
    ${Object.entries(XB_KINDS).map(([k,c])=>`<button class="pill ${xb.kind===k?'on':''}" onclick="xb.kind='${k}';xb.q='';xb.filter='all';navTo('exambuilder')"><i class="fa-solid ${c.ic}"></i> ${c.name} <span class="n">${xbList(k).length}</span></button>`).join('')}
  </div>`;
}

function xbHomeHTML(){
  const st = xbStore();
  const total = Object.keys(XB_KINDS).reduce((n,k) => n + xbList(k).length, 0);
  const pub = Object.keys(XB_KINDS).reduce((n,k) => n + xbList(k).filter(x=>x.published).length, 0);
  const C = XB_KINDS[xb.kind];
  const q = xb.q.trim().toLowerCase();
  let list = xbList(xb.kind).filter(x => xb.filter === 'all' || (xb.filter === 'published' ? x.published : !x.published));
  if (q) list = list.filter(x => (x.title + ' ' + (x.exam||'') + ' ' + (x.topic||'')).toLowerCase().includes(q));

  return `
    ${phead({ eyebrow:'Administration · Assessment', title:`Exam <em>builder</em>`,
      sub:'Author full mock exams, section tests, passages, recordings, writing tasks, speaking prompts and quizzes. Everything published here reaches the students on that exam track.',
      actions:`<button class="btn btn-g btn-sm" onclick="xbImport()"><i class="fa-solid fa-file-csv"></i> Import questions</button>
        <button class="btn btn-p" onclick="xbNew('${xb.kind}')"><i class="fa-solid fa-plus"></i> New ${C.one}</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Authored items', total, pub + ' live for students', 'leaf', 'fa-pen-to-square')}
      ${statCard('Mock exams', xbList('mock').length, xbList('mock').filter(m=>m.kind==='full').length + ' full sittings', 'cor', 'fa-clipboard-check')}
      ${statCard('Questions written', Object.keys(XB_KINDS).reduce((n,k)=>n+xbList(k).reduce((m,x)=>m+xbCountQ(x),0),0), 'Across every item type', 'sky', 'fa-circle-question')}
      ${statCard('Exam tracks covered', [...new Set(xbList('mock').concat(xbList('reading'),xbList('listening')).map(x=>x.exam).filter(Boolean))].length || 0, 'of ' + EXAMS.length + ' available', 'amb', 'fa-layer-group')}
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Build something</h3><p>Each type is authored to the standard of the exam it belongs to</p></div></div>
      <div class="card-bd">
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(172px,1fr));gap:11px">
          ${Object.entries(XB_KINDS).map(([k,c]) => {
            const [bg,fg] = toneVars(c.tone);
            return `<button class="tile" style="text-align:left;padding:16px" onclick="xbNew('${k}')">
              <div style="width:34px;height:34px;border-radius:11px;background:${bg};color:${fg};display:grid;place-items:center;font-size:14px;margin-bottom:11px"><i class="fa-solid ${c.ic}"></i></div>
              <b style="display:block;font-size:13.5px;margin-bottom:3px">${c.name}</b>
              <span style="font-size:11px;color:var(--ink-4);line-height:1.45">${c.sub}</span>
              <div style="font-family:var(--mono);font-size:9.5px;color:var(--ink-4);margin-top:8px">${xbList(k).length} authored</div>
            </button>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${xbPills()}

    <div class="card mb2"><div class="card-bd" style="padding:13px 17px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div class="search" style="flex:1;min-width:220px"><i class="fa-solid fa-magnifying-glass"></i>
        <input placeholder="Search ${C.name.toLowerCase()}…" value="${esc(xb.q)}" oninput="xb.q=this.value;clearTimeout(window.__xbq);window.__xbq=setTimeout(()=>navTo('exambuilder'),240)"></div>
      <div class="pills" style="margin:0">
        ${[['all','All'],['published','Live'],['draft','Draft']].map(([k,l])=>`<button class="pill ${xb.filter===k?'on':''}" onclick="xb.filter='${k}';navTo('exambuilder')">${l}</button>`).join('')}
      </div>
    </div></div>

    ${list.length ? `<div class="card"><div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Title</th><th>Exam</th><th>${xb.kind==='mock'?'Sections':xb.kind==='writing'?'Task':xb.kind==='speaking'?'Part':'Questions'}</th><th>Level</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(x => `<tr>
        <td><div style="display:flex;gap:10px;align-items:center">
          <div style="width:28px;height:28px;flex:0 0 28px;border-radius:9px;background:${toneVars(C.tone)[0]};color:${toneVars(C.tone)[1]};display:grid;place-items:center;font-size:11px"><i class="fa-solid ${C.ic}"></i></div>
          <div style="min-width:0"><b style="color:var(--ink);display:block">${esc(x.title||'Untitled')}</b>
            <span style="font-size:11px;color:var(--ink-4)">${esc(x.topic||x.desc||'').slice(0,58)}</span></div></div></td>
        <td>${x.exam?examOf(x.exam).short:'Any'}</td>
        <td style="font-family:var(--mono);font-size:12px">${xb.kind==='mock'?(x.sections||[]).length:xb.kind==='writing'?('Task '+(x.task||2)):xb.kind==='speaking'?('Part '+(x.part||2)):xbCountQ(x)}</td>
        <td>${esc(x.level||'—')}</td>
        <td><span class="tag ${x.published?'ok':'amb'}">${x.published?'live':'draft'}</span></td>
        <td style="text-align:right;white-space:nowrap">
          <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="${x.published?'Unpublish':'Publish'}" onclick="xbPublish('${xb.kind}','${x.id}')"><i class="fa-solid fa-${x.published?'eye-slash':'upload'}"></i></button>
          <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Edit" onclick="xbEdit('${xb.kind}','${x.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Duplicate" onclick="xbDupe('${xb.kind}','${x.id}')"><i class="fa-solid fa-copy"></i></button>
          <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Delete" onclick="xbDelete('${xb.kind}','${x.id}')"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('')}</tbody></table></div></div></div>`
    : `<div class="empty"><i class="fa-solid ${C.ic}"></i><b>No ${C.name.toLowerCase()} yet</b>
        <span>${C.sub}. Build the first one and it reaches every student on that exam track the moment you publish.</span>
        <div style="margin-top:16px"><button class="btn btn-p btn-sm" onclick="xbNew('${xb.kind}')"><i class="fa-solid fa-plus"></i> New ${C.one}</button></div></div>`}

    <div class="card" style="margin-top:16px">
      <div class="card-hd"><div style="flex:1"><h3>Built-in bank</h3><p>The Bloom core content — read-only, but your items sit alongside it</p></div></div>
      <div class="card-bd">
        <div class="grid g4">
          ${[['Mock exams', (typeof EXAM_MOCKS!=='undefined'?EXAM_MOCKS.length:0) + MOCKS.length, 'fa-clipboard-check','cor'],
             ['Reading passages', READING.length, 'fa-book-open','leaf'],
             ['Listening tracks', LISTENING.length, 'fa-headphones','sky'],
             ['Writing tasks', WRITING_T1.length + WRITING_T2.length, 'fa-pen-nib','amb']].map(([n,v,ic,tone])=>`
            <div style="display:flex;gap:12px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:13px">
              <div style="width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:${toneVars(tone)[0]};color:${toneVars(tone)[1]};display:grid;place-items:center;font-size:12px"><i class="fa-solid ${ic}"></i></div>
              <div><b style="font-family:var(--display);font-size:18px;font-weight:700;display:block;line-height:1">${v}</b>
                <span style="font-size:11px;color:var(--ink-4)">${n}</span></div></div>`).join('')}
        </div>
      </div>
    </div>`;
}

function xbCountQ(x){
  if (x.groups) return x.groups.reduce((n,g) => n + (g.items||[]).length, 0);
  if (x.questions) return x.questions.length;
  if (x.bullets) return x.bullets.length;
  return 0;
}

/* ═══ CREATE / EDIT ═══ */
function xbNew(kind){
  xb.kind = kind;
  const base = { id:null, title:'', exam:'ielts-a', level:'B2–C1', published:false };
  if (kind === 'mock') xb.draft = { ...base, kind:'full', mins:165, desc:'',
    sections: xbSections('ielts-a').map(s => ({ ...s, source:'bank', ref:'' })) };
  else if (kind === 'reading') xb.draft = { ...base, topic:'', band:6.5, mins:20, words:0, source:'Authored for Bloom',
    intro:'You should spend about 20 minutes on the questions below.', paras:[{ k:'A', t:'' }], groups:[xbNewGroup('headings')] };
  else if (kind === 'listening') xb.draft = { ...base, part:1, kind2:'Conversation · everyday context', secs:210,
    speakers:['Speaker A','Speaker B'], script:[{ w:'Speaker A', t:'' }], groups:[xbNewGroup('completion')] };
  else if (kind === 'writing') xb.draft = { ...base, task:2, type:'Opinion (agree/disagree)', topic:'', prompt:'',
    wordsMin:250, band:8, keyFeatures:[''], plan:[''], model:'' };
  else if (kind === 'speaking') xb.draft = { ...base, part:2, topic:'', card:'', bullets:['','','',''],
    vocab:[''], tip:'', band:7, followUps:[''] };
  else xb.draft = { ...base, part:'gv', desc:'', mins:10, questions:[{ q:'', o:['','','',''], c:0, e:'' }] };
  xb.step = 0; navTo('exambuilder');
}
function xbNewGroup(type){
  return { type, instr: XB_QTYPES[type].instr, bank:type==='headings'||type==='matching'?['i. ','ii. ','iii. ']:null,
    items:[{ q:'', o:type==='mcq'?['','','',''] : null, c:0, a:'', e:'' }] };
}
function xbEdit(kind, id){
  const x = xbById(kind, id); if (!x) return;
  xb.kind = kind; xb.draft = JSON.parse(JSON.stringify(x)); xb.step = 0;
  navTo('exambuilder');
}
function xbPublish(kind, id){
  const x = xbById(kind, id); if (!x) return;
  const warn = xbValidate(kind, x);
  if (!x.published && warn){ toast(warn); return; }
  x.published = !x.published; xbSave(); navTo('exambuilder');
  toast(x.published ? 'Live for students on the ' + (x.exam?examOf(x.exam).short:'every') + ' track' : 'Moved to draft', x.published?'fa-upload':'fa-eye-slash');
}
function xbDupe(kind, id){
  const x = xbById(kind, id); if (!x) return;
  xbStore()[kind].unshift({ ...JSON.parse(JSON.stringify(x)), id:kind.slice(0,2)+Date.now().toString(36), title:x.title+' (copy)', published:false });
  xbSave(); navTo('exambuilder'); toast('Duplicated as a draft');
}
function xbDelete(kind, id){
  const x = xbById(kind, id); if (!x) return;
  if (!confirm('Delete “' + (x.title||'this item') + '”?' + (x.published?' It is live for students right now.':''))) return;
  xbStore()[kind] = xbList(kind).filter(y => y.id !== id);
  xbSave(); navTo('exambuilder'); toast('Deleted');
}
function xbValidate(kind, x){
  if (!String(x.title||'').trim()) return 'Give it a title first';
  if (kind === 'reading'){
    if (!x.paras.some(p => p.t.trim().length > 40)) return 'The passage needs at least one substantial paragraph';
    if (!xbCountQ(x)) return 'Add at least one question';
    const bad = x.groups.some(g => g.items.some(i => !i.q.trim()));
    if (bad) return 'Every question needs text';
  }
  if (kind === 'listening'){
    if (!x.script.some(l => l.t.trim())) return 'The script cannot be empty';
    if (!xbCountQ(x)) return 'Add at least one question';
  }
  if (kind === 'writing' && !String(x.prompt||'').trim()) return 'The task needs a prompt';
  if (kind === 'speaking'){
    if (x.part === 2 && !String(x.card||'').trim()) return 'The cue card needs a prompt';
    if (x.part !== 2 && !x.followUps.some(q => q.trim())) return 'Add at least one question';
  }
  if (kind === 'quiz'){
    const ok = x.questions.filter(q => q.q.trim() && q.o.filter(o=>o.trim()).length >= 2);
    if (!ok.length) return 'Add at least one question with two options';
  }
  if (kind === 'mock' && !x.sections.length) return 'A mock needs at least one section';
  return null;
}
function xbSaveDraft(publish){
  const kind = xb.kind, d = xb.draft;
  const warn = xbValidate(kind, d);
  if (warn){ toast(warn); return; }
  if (publish) d.published = true;
  d.at = today(); d.by = B.profile.name;
  if (kind === 'reading') d.words = d.paras.reduce((n,p) => n + p.t.trim().split(/\s+/).filter(Boolean).length, 0);
  if (kind === 'quiz') d.questions = d.questions.filter(q => q.q.trim() && q.o.filter(o=>o.trim()).length >= 2);
  const list = xbStore()[kind];
  if (d.id){ const i = list.findIndex(x => x.id === d.id); list[i] = d; }
  else { d.id = kind.slice(0,2) + Date.now().toString(36); list.unshift(d); }
  xbSave(); xb.draft = null; navTo('exambuilder');
  toast(publish ? 'Published · live for students now' : 'Saved as a draft', publish?'fa-upload':'fa-floppy-disk');
}

/* ═══ DRAFT EDITORS ═══ */
function xbDraftHTML(){
  const k = xb.kind, C = XB_KINDS[k], d = xb.draft;
  const body = k === 'mock' ? xbMockHTML() : k === 'reading' ? xbReadingHTML()
    : k === 'listening' ? xbListeningHTML() : k === 'writing' ? xbWritingHTML()
    : k === 'speaking' ? xbSpeakingHTML() : xbQuizHTML();
  const warn = xbValidate(k, d);
  return `
    ${phead({ eyebrow:'Exam builder · ' + C.name, title:d.id?`Edit <em>${C.one}</em>`:`New <em>${C.one}</em>`, sub:C.sub,
      actions:`<button class="btn btn-g btn-sm" onclick="if(confirm('Discard unsaved changes?')){xb.draft=null;navTo('exambuilder')}">Cancel</button>
        <button class="btn btn-g" onclick="xbSaveDraft(false)"><i class="fa-solid fa-floppy-disk"></i> Save draft</button>
        <button class="btn btn-p" ${warn?'style="opacity:.5"':''} onclick="xbSaveDraft(true)"><i class="fa-solid fa-upload"></i> Publish</button>` })}

    ${warn ? `<div class="card mb2" style="border-color:var(--amber);background:var(--amber-soft)"><div class="card-bd" style="display:flex;gap:12px;align-items:center;padding:14px 18px">
      <i class="fa-solid fa-circle-exclamation" style="color:#a86e14;font-size:16px"></i>
      <span style="font-size:13px;color:#7a5410;font-weight:600">${warn} — you can still save it as a draft.</span></div></div>` : ''}

    ${xbMetaHTML()}
    ${body}`;
}

function xbMetaHTML(){
  const d = xb.draft, k = xb.kind;
  return `<div class="card mb2"><div class="card-bd">
    <div class="fgrid">
      <div class="fg full"><label>Title</label><input value="${esc(d.title)}" placeholder="${k==='mock'?'e.g. IELTS Academic — Full Mock 3':k==='reading'?'e.g. The Economics of Urban Water':'Give it a clear name'}" oninput="xb.draft.title=this.value"></div>
      <div class="fg"><label>Exam track</label><select onchange="xbSetExam(this.value)">
        ${EXAMS.map(e=>`<option value="${e.id}" ${d.exam===e.id?'selected':''}>${e.name}</option>`).join('')}
        <option value="any" ${d.exam==='any'?'selected':''}>Any track</option></select>
        <span style="font-size:11px;color:var(--ink-4)">${d.exam&&d.exam!=='any'?'Reports on '+xbScaleLabel(d.exam):'Visible to every student'}</span></div>
      <div class="fg"><label>Level</label><select onchange="xb.draft.level=this.value">
        ${['A1–A2','A2–B1','B1–B2','B2–C1','C1–C2','All levels'].map(l=>`<option ${d.level===l?'selected':''}>${l}</option>`).join('')}</select></div>
      ${k==='mock'?`
        <div class="fg"><label>Kind</label><select onchange="xb.draft.kind=this.value;navTo('exambuilder')">
          ${[['full','Full sitting'],['section','Single section'],['mini','Mini test']].map(([v,l])=>`<option value="${v}" ${d.kind===v?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="fg"><label>Total minutes</label><input type="number" value="${d.mins}" oninput="xb.draft.mins=+this.value"></div>
        <div class="fg full"><label>Description shown to students</label><textarea rows="2" oninput="xb.draft.desc=this.value">${esc(d.desc)}</textarea></div>`:''}
      ${k==='reading'?`
        <div class="fg"><label>Topic</label><input value="${esc(d.topic)}" placeholder="Environment" oninput="xb.draft.topic=this.value"></div>
        <div class="fg"><label>Target band</label><input type="number" step="0.5" value="${d.band}" oninput="xb.draft.band=+this.value"></div>
        <div class="fg"><label>Minutes</label><input type="number" value="${d.mins}" oninput="xb.draft.mins=+this.value"></div>
        <div class="fg"><label>Source line</label><input value="${esc(d.source)}" oninput="xb.draft.source=this.value"></div>
        <div class="fg full"><label>Instruction line</label><input value="${esc(d.intro)}" oninput="xb.draft.intro=this.value"></div>`:''}
      ${k==='listening'?`
        <div class="fg"><label>Part</label><select onchange="xb.draft.part=+this.value">${[1,2,3,4].map(p=>`<option value="${p}" ${d.part===p?'selected':''}>Part ${p}</option>`).join('')}</select></div>
        <div class="fg"><label>Duration (seconds)</label><input type="number" value="${d.secs}" oninput="xb.draft.secs=+this.value"></div>
        <div class="fg full"><label>Context</label><input value="${esc(d.kind2)}" placeholder="Academic monologue" oninput="xb.draft.kind2=this.value"></div>`:''}
      ${k==='writing'?`
        <div class="fg"><label>Task</label><select onchange="xb.draft.task=+this.value;navTo('exambuilder')">
          <option value="1" ${d.task===1?'selected':''}>Task 1</option><option value="2" ${d.task===2?'selected':''}>Task 2</option></select></div>
        <div class="fg"><label>Question type</label><input value="${esc(d.type)}" oninput="xb.draft.type=this.value"></div>
        <div class="fg"><label>Topic</label><input value="${esc(d.topic)}" oninput="xb.draft.topic=this.value"></div>
        <div class="fg"><label>Minimum words</label><input type="number" value="${d.wordsMin}" oninput="xb.draft.wordsMin=+this.value"></div>`:''}
      ${k==='speaking'?`
        <div class="fg"><label>Part</label><select onchange="xb.draft.part=+this.value;navTo('exambuilder')">
          ${[1,2,3].map(p=>`<option value="${p}" ${d.part===p?'selected':''}>Part ${p}</option>`).join('')}</select></div>
        <div class="fg"><label>Topic</label><input value="${esc(d.topic)}" placeholder="People" oninput="xb.draft.topic=this.value"></div>`:''}
      ${k==='quiz'?`
        <div class="fg"><label>Exam part</label><select onchange="xb.draft.part=this.value">${PARTS.map(p=>`<option value="${p.id}" ${d.part===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
        <div class="fg"><label>Minutes</label><input type="number" value="${d.mins}" oninput="xb.draft.mins=+this.value"></div>
        <div class="fg full"><label>Description</label><input value="${esc(d.desc)}" oninput="xb.draft.desc=this.value"></div>`:''}
    </div>
  </div></div>`;
}
function xbSetExam(v){
  xb.draft.exam = v;
  if (xb.kind === 'mock'){
    const secs = xbSections(v);
    xb.draft.sections = secs.map(s => ({ ...s, source:'bank', ref:'' }));
    xb.draft.mins = secs.reduce((n,s) => n + (s.mins||0), 0);
  }
  navTo('exambuilder');
}

/* ── MOCK ── */
function xbMockHTML(){
  const d = xb.draft;
  const bp = typeof blueprintFor === 'function' ? blueprintFor(d.exam) : null;
  const total = d.sections.reduce((n,s)=>n+(s.mins||0),0);
  return `
    <div class="card mb2" style="border-color:var(--leaf-500);background:linear-gradient(180deg,var(--leaf-50),var(--surface) 60%)">
      <div class="card-bd" style="display:flex;gap:15px;align-items:center;flex-wrap:wrap">
        <div style="width:42px;height:42px;flex:0 0 42px;border-radius:13px;background:var(--leaf-700);color:#fff;display:grid;place-items:center;font-size:16px"><i class="fa-solid fa-ruler-combined"></i></div>
        <div style="flex:1;min-width:230px">
          <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:4px">Official blueprint</div>
          <b style="font-family:var(--display);font-size:17px;font-weight:700;display:block">${bp?bp.name:examOf(d.exam).name} · ${xbScaleLabel(d.exam)}</b>
          <span style="font-size:12.5px;color:var(--ink-3)">${bp?'Sections, weightings and scaling come from the blueprint — edit the timings only if you are building a shortened test.':'IELTS reports each section as a band 0–9, averaged and rounded to the nearest half band.'}</span>
        </div>
        <div style="text-align:right"><div style="font-family:var(--display);font-size:22px;font-weight:700;color:${total===d.mins?'var(--leaf-700)':'var(--amber)'}">${total} min</div>
          <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">across ${d.sections.length} sections</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Sections</h3><p>Point each section at an authored item, or let it draw from the bank</p></div>
        ${d.kind!=='full'?`<button class="btn btn-g btn-sm" onclick="xbSecAdd()"><i class="fa-solid fa-plus"></i> Add section</button>`:''}</div>
      <div class="card-bd" style="display:grid;gap:12px">
        ${d.sections.map((s,i) => {
          const pool = xbSectionPool(s.id);
          return `<div style="border:1px solid var(--line);border-radius:14px;padding:16px 17px">
            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:13px">
              <div style="width:28px;height:28px;flex:0 0 28px;border-radius:9px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;font-family:var(--mono);font-size:11px;font-weight:800">${i+1}</div>
              <b style="font-size:14.5px;flex:1;min-width:120px">${esc(s.name)}</b>
              ${s.unscored?'<span class="tag">unscored</span>':''}
              <div style="display:flex;gap:8px;align-items:center">
                <input type="number" value="${s.mins||0}" style="width:74px;border:1.5px solid var(--line-2);border-radius:9px;padding:6px 10px;font-family:var(--mono);font-size:12.5px;background:var(--surface);color:var(--ink)" oninput="xb.draft.sections[${i}].mins=+this.value">
                <span style="font-size:11px;color:var(--ink-4)">min</span>
                ${s.items?`<span style="font-family:var(--mono);font-size:11px;color:var(--ink-4);margin-left:6px">${s.items} items</span>`:''}
              </div>
              ${d.kind!=='full'?`<button class="icobtn" style="width:28px;height:28px;font-size:10px" onclick="xbSecDel(${i})"><i class="fa-solid fa-xmark"></i></button>`:''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 2fr;gap:11px">
              <div class="fg" style="margin:0"><label>Content source</label>
                <select onchange="xb.draft.sections[${i}].source=this.value;navTo('exambuilder')">
                  <option value="bank" ${s.source==='bank'?'selected':''}>Draw from the bank</option>
                  <option value="authored" ${s.source==='authored'?'selected':''}>Use an item I authored</option>
                </select></div>
              <div class="fg" style="margin:0"><label>${s.source==='authored'?'Which item':'Bank filter'}</label>
                ${s.source==='authored'
                  ? `<select onchange="xb.draft.sections[${i}].ref=this.value">
                      <option value="">— choose —</option>
                      ${pool.map(p=>`<option value="${p.id}" ${s.ref===p.id?'selected':''}>${esc(p.title)}${p.published?'':' (draft)'}</option>`).join('')}
                    </select>${pool.length?'':'<span style="font-size:11px;color:var(--amber)">Nothing authored for this section yet</span>'}`
                  : `<input value="${esc(s.ref||'')}" placeholder="Any ${s.name.toLowerCase()} item at this level" oninput="xb.draft.sections[${i}].ref=this.value">`}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}
function xbSectionPool(secId){
  const id = String(secId).toLowerCase();
  if (id.includes('read')) return xbList('reading');
  if (id.includes('listen')) return xbList('listening');
  if (id.includes('writ')) return xbList('writing');
  if (id.includes('speak')) return xbList('speaking');
  return xbList('reading').concat(xbList('listening'));
}
function xbSecAdd(){ xb.draft.sections.push({ id:'custom'+Date.now().toString(36), name:'New section', mins:20, items:10, source:'bank', ref:'' }); navTo('exambuilder'); }
function xbSecDel(i){ xb.draft.sections.splice(i,1); navTo('exambuilder'); }

/* ── READING ── */
function xbReadingHTML(){
  const d = xb.draft;
  const words = d.paras.reduce((n,p)=>n+p.t.trim().split(/\s+/).filter(Boolean).length,0);
  return `
    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Passage</h3><p>${words} words · IELTS passages run 700–950</p></div>
          <button class="btn btn-g btn-sm" onclick="xbParaAdd()"><i class="fa-solid fa-plus"></i> Paragraph</button></div>
        <div class="card-bd" style="display:grid;gap:11px">
          ${d.paras.map((p,i)=>`<div style="display:flex;gap:11px;align-items:flex-start">
            <input value="${esc(p.k)}" style="width:42px;flex:0 0 42px;border:1.5px solid var(--line-2);border-radius:9px;padding:9px 0;text-align:center;font-family:var(--mono);font-size:13px;font-weight:800;background:var(--surface);color:var(--leaf-700)" oninput="xb.draft.paras[${i}].k=this.value">
            <textarea rows="4" placeholder="Paragraph text…" style="flex:1;border:1.5px solid var(--line-2);border-radius:10px;padding:10px 12px;font-family:inherit;font-size:13.5px;line-height:1.65;background:var(--surface);color:var(--ink)" oninput="xb.draft.paras[${i}].t=this.value;xbWordCount()">${esc(p.t)}</textarea>
            <div style="display:grid;gap:4px">
              <button class="icobtn" style="width:26px;height:26px;font-size:9px" ${i===0?'disabled':''} onclick="xbParaMove(${i},-1)"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="icobtn" style="width:26px;height:26px;font-size:9px" ${i===d.paras.length-1?'disabled':''} onclick="xbParaMove(${i},1)"><i class="fa-solid fa-arrow-down"></i></button>
              ${d.paras.length>1?`<button class="icobtn" style="width:26px;height:26px;font-size:9px" onclick="xbParaDel(${i})"><i class="fa-solid fa-xmark"></i></button>`:''}
            </div></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Guidance</h3></div></div>
        <div class="card-bd" style="display:grid;gap:12px;font-size:12.5px;color:var(--ink-3);line-height:1.65">
          <div><b style="color:var(--ink);display:block;margin-bottom:3px">Paragraph labels</b>Use A, B, C for Academic passages so matching-headings questions can reference them.</div>
          <div><b style="color:var(--ink);display:block;margin-bottom:3px">Length</b>Passage 1 runs 700–800 words, Passage 3 up to 950. You have ${words}.</div>
          <div><b style="color:var(--ink);display:block;margin-bottom:3px">Question order</b>Answers should appear in passage order for every type except matching headings.</div>
          <div><b style="color:var(--ink);display:block;margin-bottom:3px">Explanations</b>Name the paragraph the answer comes from — that is what makes the review useful.</div>
        </div>
      </div>
    </div>
    ${xbGroupsHTML()}`;
}
function xbWordCount(){ /* recalculated on next render */ }
function xbParaAdd(){
  const next = String.fromCharCode(65 + xb.draft.paras.length);
  xb.draft.paras.push({ k:next, t:'' }); navTo('exambuilder');
}
function xbParaDel(i){ xb.draft.paras.splice(i,1); navTo('exambuilder'); }
function xbParaMove(i,dir){
  const p=xb.draft.paras, j=i+dir; if(j<0||j>=p.length)return;
  [p[i],p[j]]=[p[j],p[i]];
  /* matching-headings questions reference paragraph labels, so keep A, B, C
     sequential after a move rather than carrying the old letters around */
  if (p.every(x => /^[A-Z]$/.test(String(x.k||'').trim())))
    p.forEach((x,n) => x.k = String.fromCharCode(65+n));
  navTo('exambuilder');
}

/* ── LISTENING ── */
function xbListeningHTML(){
  const d = xb.draft;
  return `
    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Script</h3><p>${d.script.length} lines · played back with a synchronised transcript</p></div>
          <button class="btn btn-g btn-sm" onclick="xbLineAdd()"><i class="fa-solid fa-plus"></i> Line</button></div>
        <div class="card-bd" style="display:grid;gap:10px">
          <div class="fg" style="margin-bottom:6px"><label>Speakers (comma separated)</label>
            <input value="${esc((d.speakers||[]).join(', '))}" oninput="xb.draft.speakers=this.value.split(',').map(s=>s.trim()).filter(Boolean)"></div>
          ${d.script.map((l,i)=>`<div style="display:flex;gap:10px;align-items:flex-start">
            <select style="width:124px;flex:0 0 124px;border:1.5px solid var(--line-2);border-radius:9px;padding:8px 9px;font-size:12px;background:var(--surface);color:var(--ink)" onchange="xb.draft.script[${i}].w=this.value">
              ${(d.speakers||['Speaker']).map(s=>`<option ${l.w===s?'selected':''}>${esc(s)}</option>`).join('')}</select>
            <textarea rows="2" placeholder="What this speaker says…" style="flex:1;border:1.5px solid var(--line-2);border-radius:10px;padding:9px 11px;font-family:inherit;font-size:13px;line-height:1.6;background:var(--surface);color:var(--ink)" oninput="xb.draft.script[${i}].t=this.value">${esc(l.t)}</textarea>
            ${d.script.length>1?`<button class="icobtn" style="width:26px;height:26px;font-size:9px;margin-top:6px" onclick="xbLineDel(${i})"><i class="fa-solid fa-xmark"></i></button>`:''}
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Guidance</h3></div></div>
        <div class="card-bd" style="display:grid;gap:12px;font-size:12.5px;color:var(--ink-3);line-height:1.65">
          <div><b style="color:var(--ink);display:block;margin-bottom:3px">Part ${d.part}</b>${d.part===1?'Two speakers, transactional. Names, numbers, dates — the highest-yield spelling practice.':d.part===2?'One speaker describing a place or arrangement. Maps and matching tasks fit here.':d.part===3?'Two to four speakers who disagree and self-correct. The answer is usually the second thing said.':'A single continuous academic lecture with no break. The hardest ten marks.'}</div>
          <div><b style="color:var(--ink);display:block;margin-bottom:3px">Self-correction</b>Write at least one line where a speaker corrects a number or name — it is the most-tested trap.</div>
          <div><b style="color:var(--ink);display:block;margin-bottom:3px">Paraphrase</b>Never use the question's words in the script. Students must hear the idea, not match the wording.</div>
          <div><b style="color:var(--ink);display:block;margin-bottom:3px">Timing</b>${Math.round(d.secs/60)} min ${d.secs%60}s over ${d.script.length} lines · about ${Math.round(d.secs/Math.max(1,d.script.length))}s each.</div>
        </div>
      </div>
    </div>
    ${xbGroupsHTML()}`;
}
function xbLineAdd(){ xb.draft.script.push({ w:(xb.draft.speakers||['Speaker'])[0], t:'' }); navTo('exambuilder'); }
function xbLineDel(i){ xb.draft.script.splice(i,1); navTo('exambuilder'); }

/* ── shared question-group editor for reading + listening ── */
function xbGroupsHTML(){
  const d = xb.draft;
  let n = 0;
  return `<div class="card" style="margin-top:16px">
    <div class="card-hd"><div style="flex:1"><h3>Question groups</h3><p>${xbCountQ(d)} questions in ${d.groups.length} group${d.groups.length===1?'':'s'}</p></div>
      <button class="btn btn-p btn-sm" onclick="xbGrpAdd()"><i class="fa-solid fa-plus"></i> Add group</button></div>
    <div class="card-bd" style="display:grid;gap:16px">
      ${d.groups.map((g,gi) => {
        const T = XB_QTYPES[g.type];
        const first = n + 1; n += g.items.length;
        return `<div style="border:1.5px solid var(--line);border-radius:15px;overflow:hidden">
          <div style="padding:13px 16px;background:var(--paper);border-bottom:1px solid var(--line);display:flex;gap:11px;align-items:center;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:11px;font-weight:800;color:var(--leaf-700)">Q${first}–${n}</span>
            <select style="border:1.5px solid var(--line-2);border-radius:9px;padding:6px 10px;font-size:12.5px;font-weight:600;background:var(--surface);color:var(--ink)" onchange="xbGrpType(${gi},this.value)">
              ${Object.entries(XB_QTYPES).map(([k,t])=>`<option value="${k}" ${g.type===k?'selected':''}>${t.name}</option>`).join('')}</select>
            <div style="flex:1"></div>
            <button class="icobtn" style="width:28px;height:28px;font-size:10px" onclick="xbItemAdd(${gi})" title="Add question"><i class="fa-solid fa-plus"></i></button>
            ${d.groups.length>1?`<button class="icobtn" style="width:28px;height:28px;font-size:10px" onclick="xbGrpDel(${gi})"><i class="fa-solid fa-trash"></i></button>`:''}
          </div>
          <div style="padding:15px 16px;display:grid;gap:13px">
            <div class="fg" style="margin:0"><label>Instruction line</label>
              <textarea rows="2" oninput="xb.draft.groups[${gi}].instr=this.value">${esc(g.instr)}</textarea></div>
            ${g.bank?`<div class="fg" style="margin:0"><label>Option bank — one per line</label>
              <textarea rows="4" placeholder="i. A warming city lengthens the working year" oninput="xb.draft.groups[${gi}].bank=this.value.split('\\n')">${esc(g.bank.join('\n'))}</textarea></div>`:''}
            ${g.items.map((it,ii) => xbItemHTML(g, gi, it, ii, first + ii)).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function xbItemHTML(g, gi, it, ii, num){
  const isMcq = g.type === 'mcq';
  const isTF = g.type === 'tfng' || g.type === 'ynng';
  const isBank = g.type === 'headings' || g.type === 'matching';
  const tfOpts = g.type === 'tfng' ? ['TRUE','FALSE','NOT GIVEN'] : ['YES','NO','NOT GIVEN'];
  return `<div style="border-left:3px solid var(--leaf-300);background:var(--paper);border-radius:0 12px 12px 0;padding:13px 15px">
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
      <span style="font-family:var(--mono);font-size:11px;font-weight:800;color:var(--ink-4)">Q${num}</span>
      <div style="flex:1"></div>
      ${g.items.length>1?`<button class="icobtn" style="width:24px;height:24px;font-size:9px" onclick="xbItemDel(${gi},${ii})"><i class="fa-solid fa-xmark"></i></button>`:''}
    </div>
    <textarea rows="2" placeholder="${isBank?'Paragraph A':'Question text'}" style="width:100%;border:1.5px solid var(--line-2);border-radius:10px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink);margin-bottom:9px" oninput="xb.draft.groups[${gi}].items[${ii}].q=this.value">${esc(it.q)}</textarea>
    ${isMcq ? `<div style="display:grid;gap:7px;margin-bottom:9px">
      ${(it.o||['','','','']).map((o,oi)=>`<div style="display:flex;gap:9px;align-items:center">
        <button style="width:26px;height:26px;flex:0 0 26px;border-radius:8px;border:1.5px solid ${it.c===oi?'var(--ok)':'var(--line-2)'};background:${it.c===oi?'var(--ok)':'var(--surface)'};color:${it.c===oi?'#fff':'var(--ink-4)'};font-family:var(--mono);font-size:10.5px;font-weight:800;cursor:pointer" title="Correct answer" onclick="xbItemCorrect(${gi},${ii},${oi})">${String.fromCharCode(65+oi)}</button>
        <input value="${esc(o)}" placeholder="Option ${String.fromCharCode(65+oi)}" style="flex:1;border:1.5px solid var(--line-2);border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" oninput="xb.draft.groups[${gi}].items[${ii}].o[${oi}]=this.value"></div>`).join('')}
    </div>`
    : isTF ? `<div style="display:flex;gap:7px;margin-bottom:9px">
      ${tfOpts.map(o=>`<button class="pill ${it.a===o?'on':''}" style="padding:6px 13px;font-size:11.5px" onclick="xbItemAnswer(${gi},${ii},'${o}')">${o}</button>`).join('')}
    </div>`
    : `<div class="fg" style="margin:0 0 9px"><label>Correct answer</label>
        <input value="${esc(it.a||'')}" placeholder="${isBank?'iii':'exactly as it appears in the text'}" style="max-width:280px" oninput="xb.draft.groups[${gi}].items[${ii}].a=this.value"></div>`}
    <div class="fg" style="margin:0"><label>Explanation shown in review</label>
      <input value="${esc(it.e||'')}" placeholder="Name the paragraph or line the answer comes from" oninput="xb.draft.groups[${gi}].items[${ii}].e=this.value"></div>
  </div>`;
}
function xbGrpAdd(){ xb.draft.groups.push(xbNewGroup('mcq')); navTo('exambuilder'); }
function xbGrpDel(gi){ xb.draft.groups.splice(gi,1); navTo('exambuilder'); }
function xbGrpType(gi, type){
  const g = xb.draft.groups[gi];
  g.type = type; g.instr = XB_QTYPES[type].instr;
  g.bank = (type==='headings'||type==='matching') ? (g.bank || ['i. ','ii. ','iii. ']) : null;
  g.items.forEach(it => { if (type === 'mcq' && !it.o) it.o = ['','','','']; });
  navTo('exambuilder');
}
function xbItemAdd(gi){
  const g = xb.draft.groups[gi];
  g.items.push({ q:'', o:g.type==='mcq'?['','','','']:null, c:0, a:'', e:'' });
  navTo('exambuilder');
}
function xbItemDel(gi, ii){ xb.draft.groups[gi].items.splice(ii,1); navTo('exambuilder'); }
function xbItemCorrect(gi, ii, oi){ xb.draft.groups[gi].items[ii].c = oi; navTo('exambuilder'); }
function xbItemAnswer(gi, ii, a){ xb.draft.groups[gi].items[ii].a = a; navTo('exambuilder'); }

/* ── WRITING ── */
function xbWritingHTML(){
  const d = xb.draft;
  return `
    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>The task</h3><p>Exactly as the student will read it</p></div></div>
          <div class="card-bd">
            <div class="fg"><label>Prompt</label><textarea rows="5" placeholder="${d.task===1?'The graph below shows…':'Some people believe that… To what extent do you agree or disagree?'}" oninput="xb.draft.prompt=this.value">${esc(d.prompt)}</textarea></div>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>What the examiner needs to see</h3><p>Shown in the “Ideas” panel before they write</p></div>
            <button class="btn btn-g btn-sm" onclick="xbListAdd('keyFeatures')"><i class="fa-solid fa-plus"></i> Add</button></div>
          <div class="card-bd" style="display:grid;gap:8px">
            ${d.keyFeatures.map((f,i)=>`<div style="display:flex;gap:9px">
              <input value="${esc(f)}" placeholder="e.g. An overview paragraph naming the two clearest patterns" style="flex:1;border:1.5px solid var(--line-2);border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" oninput="xb.draft.keyFeatures[${i}]=this.value">
              ${d.keyFeatures.length>1?`<button class="icobtn" style="width:30px;height:30px;font-size:10px" onclick="xbListDel('keyFeatures',${i})"><i class="fa-solid fa-xmark"></i></button>`:''}</div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Suggested structure</h3><p>The plan students see if they ask for ideas</p></div>
            <button class="btn btn-g btn-sm" onclick="xbListAdd('plan')"><i class="fa-solid fa-plus"></i> Add stage</button></div>
          <div class="card-bd" style="display:grid;gap:8px">
            ${d.plan.map((f,i)=>`<div style="display:flex;gap:9px;align-items:center">
              <span style="font-family:var(--mono);font-size:11px;color:var(--leaf-600);font-weight:800;flex:0 0 18px">${i+1}</span>
              <input value="${esc(f)}" placeholder="Introduction: paraphrase, then state your position" style="flex:1;border:1.5px solid var(--line-2);border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" oninput="xb.draft.plan[${i}]=this.value">
              ${d.plan.length>1?`<button class="icobtn" style="width:30px;height:30px;font-size:10px" onclick="xbListDel('plan',${i})"><i class="fa-solid fa-xmark"></i></button>`:''}</div>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Model answer</h3><p>Optional · shown after they submit</p></div>
            <div style="display:flex;gap:8px;align-items:center"><span style="font-size:11px;color:var(--ink-4)">Band</span>
              <input type="number" step="0.5" value="${d.band}" style="width:64px;border:1.5px solid var(--line-2);border-radius:9px;padding:6px 9px;font-family:var(--mono);font-size:12.5px;background:var(--surface);color:var(--ink)" oninput="xb.draft.band=+this.value"></div></div>
          <div class="card-bd">
            <textarea rows="18" placeholder="A full model answer at the band above. Students read it after submitting — never before." style="width:100%;border:1.5px solid var(--line-2);border-radius:10px;padding:11px 13px;font-family:inherit;font-size:13.5px;line-height:1.75;background:var(--surface);color:var(--ink)" oninput="xb.draft.model=this.value">${esc(d.model)}</textarea>
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);margin-top:8px">${d.model.trim()?d.model.trim().split(/\s+/).length:0} words · minimum for the task is ${d.wordsMin}</div>
          </div>
        </div>
      </div>
    </div>`;
}
function xbListAdd(f){ xb.draft[f].push(''); navTo('exambuilder'); }
function xbListDel(f,i){ xb.draft[f].splice(i,1); navTo('exambuilder'); }

/* ── SPEAKING ── */
function xbSpeakingHTML(){
  const d = xb.draft;
  return `
    <div class="split">
      <div style="display:grid;gap:16px">
        ${d.part===2 ? `
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Cue card</h3><p>One minute to prepare, two minutes to speak</p></div></div>
          <div class="card-bd">
            <div class="fg" style="margin-bottom:14px"><label>Card prompt</label>
              <textarea rows="2" placeholder="Describe a person who has influenced you." oninput="xb.draft.card=this.value">${esc(d.card)}</textarea></div>
            <label style="font-size:9.5px;letter-spacing:1.3px;text-transform:uppercase;color:var(--ink-4);font-weight:800;display:block;margin-bottom:9px">You should say</label>
            <div style="display:grid;gap:8px">
              ${d.bullets.map((b,i)=>`<div style="display:flex;gap:9px;align-items:center">
                <span style="color:var(--leaf-500);font-size:8px">●</span>
                <input value="${esc(b)}" placeholder="${i===d.bullets.length-1?'and explain why…':'who this person is'}" style="flex:1;border:1.5px solid var(--line-2);border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" oninput="xb.draft.bullets[${i}]=this.value">
                ${d.bullets.length>2?`<button class="icobtn" style="width:30px;height:30px;font-size:10px" onclick="xbListDel('bullets',${i})"><i class="fa-solid fa-xmark"></i></button>`:''}</div>`).join('')}
            </div>
            <button class="btn btn-g btn-sm" style="margin-top:11px" onclick="xbListAdd('bullets')"><i class="fa-solid fa-plus"></i> Add bullet</button>
          </div>
        </div>` : `
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Part ${d.part} questions</h3><p>${d.part===1?'Familiar topics about the student — four questions per set':'Abstract questions linked to a Part 2 topic'}</p></div>
            <button class="btn btn-g btn-sm" onclick="xbListAdd('followUps')"><i class="fa-solid fa-plus"></i> Add</button></div>
          <div class="card-bd" style="display:grid;gap:8px">
            ${d.followUps.map((q,i)=>`<div style="display:flex;gap:9px;align-items:center">
              <span style="font-family:var(--mono);font-size:11px;color:var(--leaf-600);font-weight:800;flex:0 0 18px">${i+1}</span>
              <input value="${esc(q)}" placeholder="${d.part===1?'Where is your hometown?':'Do you think young people today have good role models?'}" style="flex:1;border:1.5px solid var(--line-2);border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" oninput="xb.draft.followUps[${i}]=this.value">
              ${d.followUps.length>1?`<button class="icobtn" style="width:30px;height:30px;font-size:10px" onclick="xbListDel('followUps',${i})"><i class="fa-solid fa-xmark"></i></button>`:''}</div>`).join('')}
          </div>
        </div>`}
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Vocabulary that lifts the answer</h3><p>Shown alongside the prompt</p></div>
            <button class="btn btn-g btn-sm" onclick="xbListAdd('vocab')"><i class="fa-solid fa-plus"></i> Add</button></div>
          <div class="card-bd" style="display:grid;gap:8px">
            ${d.vocab.map((v,i)=>`<div style="display:flex;gap:9px">
              <input value="${esc(v)}" placeholder="a turning point" style="flex:1;border:1.5px solid var(--line-2);border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" oninput="xb.draft.vocab[${i}]=this.value">
              ${d.vocab.length>1?`<button class="icobtn" style="width:30px;height:30px;font-size:10px" onclick="xbListDel('vocab',${i})"><i class="fa-solid fa-xmark"></i></button>`:''}</div>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Examiner's tip</h3><p>The one thing that changes the answer</p></div></div>
          <div class="card-bd">
            <div class="fg" style="margin-bottom:14px"><label>Tip</label>
              <textarea rows="4" placeholder="Spend your preparation minute writing four nouns, not sentences — you will sound less rehearsed." oninput="xb.draft.tip=this.value">${esc(d.tip)}</textarea></div>
            <div class="fg"><label>Target band</label><input type="number" step="0.5" value="${d.band}" style="max-width:100px" oninput="xb.draft.band=+this.value"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>How Part ${d.part} is scored</h3></div></div>
          <div class="card-bd" style="display:grid;gap:11px;font-size:12.5px;color:var(--ink-3);line-height:1.65">
            ${[['Fluency & Coherence','Length and connection. A Part 2 answer under 90 seconds is capped regardless of language.'],
               ['Lexical Resource','Idiomatic usage is explicitly required at Band 7+. That is what the vocabulary list is for.'],
               ['Grammatical Range','One second conditional and one perfect aspect per long answer lifts this criterion.'],
               ['Pronunciation','Sentence stress, not accent. Clear speech is not slow speech.']]
              .map(([t,s])=>`<div><b style="color:var(--ink);display:block;margin-bottom:2px">${t}</b>${s}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

/* ── QUIZ ── */
function xbQuizHTML(){
  const d = xb.draft;
  return `<div class="card">
    <div class="card-hd"><div style="flex:1"><h3>Questions</h3><p>${d.questions.length} written · about ${Math.max(1,Math.round(d.questions.length*0.75))} minutes</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-g btn-sm" onclick="xbImport()"><i class="fa-solid fa-file-csv"></i> Import CSV</button>
        <button class="btn btn-p btn-sm" onclick="xbQAdd()"><i class="fa-solid fa-plus"></i> Add question</button></div></div>
    <div class="card-bd" style="display:grid;gap:13px">
      ${d.questions.map((q,i)=>`<div style="border:1px solid var(--line);border-radius:14px;padding:15px 16px">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:11px">
          <div style="width:26px;height:26px;flex:0 0 26px;border-radius:8px;background:var(--violet-soft);color:var(--violet);display:grid;place-items:center;font-family:var(--mono);font-size:11px;font-weight:800">${i+1}</div>
          <div style="flex:1"></div>
          ${d.questions.length>1?`<button class="icobtn" style="width:26px;height:26px;font-size:10px" onclick="xbQDel(${i})"><i class="fa-solid fa-trash"></i></button>`:''}</div>
        <textarea rows="2" placeholder="Question text" style="width:100%;border:1.5px solid var(--line-2);border-radius:10px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink);margin-bottom:10px" oninput="xb.draft.questions[${i}].q=this.value">${esc(q.q)}</textarea>
        <div style="display:grid;gap:7px;margin-bottom:10px">
          ${q.o.map((o,oi)=>`<div style="display:flex;gap:9px;align-items:center">
            <button style="width:26px;height:26px;flex:0 0 26px;border-radius:8px;border:1.5px solid ${q.c===oi?'var(--ok)':'var(--line-2)'};background:${q.c===oi?'var(--ok)':'var(--surface)'};color:${q.c===oi?'#fff':'var(--ink-4)'};font-family:var(--mono);font-size:10.5px;font-weight:800;cursor:pointer" onclick="xbQCorrect(${i},${oi})">${String.fromCharCode(65+oi)}</button>
            <input value="${esc(o)}" placeholder="Option ${String.fromCharCode(65+oi)}" style="flex:1;border:1.5px solid var(--line-2);border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" oninput="xb.draft.questions[${i}].o[${oi}]=this.value"></div>`).join('')}
        </div>
        <div class="fg" style="margin:0"><label>Explanation</label>
          <input value="${esc(q.e)}" placeholder="Why this answer is right" oninput="xb.draft.questions[${i}].e=this.value"></div>
      </div>`).join('')}
    </div>
  </div>`;
}
function xbQAdd(){ xb.draft.questions.push({ q:'', o:['','','',''], c:0, e:'' }); navTo('exambuilder'); }
function xbQDel(i){ xb.draft.questions.splice(i,1); navTo('exambuilder'); }
function xbQCorrect(i,oi){ xb.draft.questions[i].c = oi; navTo('exambuilder'); }

/* ── CSV import, reused from the content manager ── */
function xbImport(){
  modal(`<div class="modal-hd"><div style="width:36px;height:36px;border-radius:11px;background:var(--violet-soft);color:var(--violet);display:grid;place-items:center"><i class="fa-solid fa-file-csv"></i></div>
      <div style="flex:1"><h3>Import questions</h3><p>One row per question, with the correct answer as a letter</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      <pre style="background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:13px;font-family:var(--mono);font-size:11px;overflow-x:auto;line-height:1.7;color:var(--ink-2)">${esc(QUIZ_CSV_TEMPLATE)}</pre>
      <div style="display:flex;gap:9px;margin:14px 0"><button class="btn btn-g btn-sm" onclick="cmCSVTemplate()"><i class="fa-solid fa-download"></i> Download template</button></div>
      <label for="xbCSV" style="display:block;cursor:pointer">
        <div style="border:2px dashed var(--violet);border-radius:14px;padding:26px;text-align:center;background:var(--violet-soft)">
          <i class="fa-solid fa-file-csv" style="font-size:28px;color:var(--violet);display:block;margin-bottom:10px"></i>
          <div style="font-size:14px;font-weight:700">Drop your CSV here</div>
          <div style="font-size:11.5px;color:var(--ink-3);margin-top:3px">or click to browse</div></div></label>
      <input type="file" id="xbCSV" accept=".csv,.txt" style="display:none" onchange="xbCSVRead(this)">
      <div style="margin-top:14px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:8px">Or paste it</div>
      <textarea id="xbCSVText" rows="5" placeholder="question,optionA,optionB,optionC,optionD,correct,explanation" style="border:1.5px solid var(--line-2);border-radius:11px;padding:11px;font-family:var(--mono);font-size:11.5px;width:100%;background:var(--surface);color:var(--ink)"></textarea>
    </div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-v" onclick="xbCSVParse(document.getElementById('xbCSVText').value)"><i class="fa-solid fa-wand-magic-sparkles"></i> Import</button></div>`, 640);
}
function xbCSVRead(input){
  const f = input.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => xbCSVParse(r.result); r.readAsText(f);
}
function xbCSVParse(text){
  if (!text || !text.trim()){ toast('Nothing to import'); return; }
  const rows = csvRows(text.trim());
  const head = rows[0].map(h => h.trim().toLowerCase());
  const body = head.includes('question') ? rows.slice(1) : rows;
  const qs = body.map(r => {
    const opts = [r[1],r[2],r[3],r[4]].map(x => (x||'').trim()).filter(Boolean);
    const cRaw = (r[5]||'A').trim().toUpperCase();
    const c = /^[A-D]$/.test(cRaw) ? cRaw.charCodeAt(0) - 65 : Math.max(0, parseInt(cRaw,10) - 1 || 0);
    return { q:(r[0]||'').trim(), o:opts.length?opts:['','','',''], c:Math.min(c, Math.max(0,opts.length-1)), e:(r[6]||'').trim() };
  }).filter(q => q.q && q.o.filter(Boolean).length >= 2);
  if (!qs.length){ toast('Could not read any valid questions — check the column order'); return; }
  /* into an open quiz draft, an open group, or a brand-new quiz */
  if (xb.draft && xb.kind === 'quiz'){
    const blank = xb.draft.questions.filter(q => q.q.trim()).length === 0;
    xb.draft.questions = blank ? qs : [...xb.draft.questions, ...qs];
  } else if (xb.draft && xb.draft.groups){
    xb.draft.groups.push({ type:'mcq', instr:XB_QTYPES.mcq.instr, bank:null,
      items:qs.map(q => ({ q:q.q, o:q.o, c:q.c, a:'', e:q.e })) });
  } else {
    xbNew('quiz');
    xb.draft.title = 'Imported questions · ' + today();
    xb.draft.questions = qs;
  }
  closeModal(); navTo('exambuilder');
  toast(qs.length + ' question' + (qs.length===1?'':'s') + ' imported', 'fa-file-csv');
}

/* ═══════════════════════════════════════════════════════════════
   STUDENT-FACING MERGE
   Authored + published items join the built-in banks, filtered to
   the student's assigned exam track.
═══════════════════════════════════════════════════════════════ */

/* ── shape mappers: authored record → the shape each practice engine expects ── */
function xbToReading(x, t){
  if (!x) return undefined;
  return { id:x.id, exam:x.exam==='any'?(t||'ielts-a'):x.exam, level:x.level, band:x.band, mins:x.mins, words:x.words,
    title:x.title, topic:x.topic, source:x.source, intro:x.intro, paras:x.paras,
    qs:(x.groups||[]).map(g => ({ type:g.type, instr:g.instr, bank:g.bank,
      items:(g.items||[]).map(i => ({ q:i.q, o:i.o||undefined, c:i.c, a:i.a, e:i.e })) })),
    authored:true };
}
function xbToListening(x, t){
  if (!x) return undefined;
  return { id:x.id, exam:x.exam==='any'?(t||'ielts-a'):x.exam, part:x.part, level:x.level, band:7, secs:x.secs,
    title:x.title, kind:x.kind2, speakers:x.speakers,
    script:(x.script||[]).map(l => ({ s:(x.speakers||[]).indexOf(l.w), w:l.w, t:l.t })),
    qs:(x.groups||[]).map(g => ({ type:g.type, instr:g.instr, bank:g.bank,
      items:(g.items||[]).map(i => ({ q:i.q, o:i.o||undefined, c:i.c, a:i.a, e:i.e })) })),
    authored:true };
}
function xbToWriting(x){
  if (!x) return undefined;
  return { id:x.id, type:x.type, kind:x.type, level:x.level, topic:x.topic, prompt:x.prompt,
    keyFeatures:(x.keyFeatures||[]).filter(Boolean), plan:(x.plan||[]).filter(Boolean),
    model:x.model||'', band:x.band, wordsMin:x.wordsMin, task:x.task||2, authored:true };
}
function xbToSpeaking(x){
  if (!x) return undefined;
  return { id:x.id, card:x.card, bullets:(x.bullets||[]).filter(Boolean), topic:x.topic, band:x.band,
    vocab:(x.vocab||[]).filter(Boolean), tip:x.tip, authored:true };
}

/* ── id lookups must not be track-filtered ──
   Track filtering decides what a student is OFFERED. Once a specific item is
   launched — by a mock section, a study-plan link or a direct id — it must
   resolve even if it belongs to another track. */
function xbAny(kind){
  return xbList(kind).filter(x => x.published);
}
function readingById(id){
  return readingBank().find(x => x.id === id)
    || READING.find(x => x.id === id)
    || xbToReading(xbAny('reading').find(x => x.id === id));
}
function listeningById(id){
  return listeningBank().find(x => x.id === id)
    || LISTENING.find(x => x.id === id)
    || xbToListening(xbAny('listening').find(x => x.id === id));
}
function writingById(id, task){
  return writingBank(task).find(x => x.id === id)
    || (task === 1 ? WRITING_T1 : WRITING_T2).find(x => x.id === id)
    || xbToWriting(xbAny('writing').find(x => x.id === id));
}
function speakingById(id){
  return speakingBank(2).find(x => x.id === id)
    || SPEAKING_P2.find(x => x.id === id)
    || xbToSpeaking(xbAny('speaking').find(x => x.id === id));
}

function readingBank(examId){
  const t = examId || (typeof examTrack === 'function' ? examTrack() : 'ielts-a');
  return [...xbPub('reading', t).map(x => xbToReading(x, t)), ...READING];
}
function listeningBank(examId){
  const t = examId || (typeof examTrack === 'function' ? examTrack() : 'ielts-a');
  return [...xbPub('listening', t).map(x => xbToListening(x, t)), ...LISTENING];
}
function writingBank(task, examId){
  const t = examId || (typeof examTrack === 'function' ? examTrack() : 'ielts-a');
  const authored = xbPub('writing', t).filter(x => (x.task||2) === task).map(xbToWriting);
  return [...authored, ...(task === 1 ? WRITING_T1 : WRITING_T2)];
}
function speakingBank(part, examId){
  const t = examId || (typeof examTrack === 'function' ? examTrack() : 'ielts-a');
  const authored = xbPub('speaking', t).filter(x => (x.part||2) === part);
  if (part === 2) return [...authored.map(xbToSpeaking), ...SPEAKING_P2];
  if (part === 1) return [...authored.map(x => ({ topic:x.topic, qs:(x.followUps||[]).filter(Boolean), authored:true })), ...SPEAKING_P1];
  return [...authored.map(x => ({ for:x.id, topic:x.topic, qs:(x.followUps||[]).filter(Boolean), authored:true })), ...SPEAKING_P3];
}
function mockById(id){
  return mockBank().find(x => x.id === id)
    || (typeof EXAM_MOCKS !== 'undefined' ? EXAM_MOCKS.find(x => x.id === id) : null)
    || MOCKS.find(x => x.id === id)
    || xbToMock(xbAny('mock').find(x => x.id === id));
}
function xbToMock(x){
  if (!x) return undefined;
  return { id:x.id, exam:x.exam==='any'?'ielts-a':x.exam, kind:x.kind, name:x.title, mins:x.mins,
    level:x.level, desc:x.desc, parts:(x.sections||[]).map(s => s.name + ' · ' + s.mins + ' min'),
    sections:x.sections, authored:true };
}

function mockBank(examId){
  const t = examId || (typeof examTrack === 'function' ? examTrack() : 'ielts-a');
  const authored = xbPub('mock', t).map(xbToMock);
  const built = typeof mocksForTrack === 'function' ? mocksForTrack(t) : MOCKS;
  return [...authored, ...built];
}
function quizBank(partId){
  const t = typeof examTrack === 'function' ? examTrack() : 'ielts-a';
  const authored = xbPub('quiz', t).filter(x => !partId || x.part === partId);
  const uploaded = typeof publishedQuizzes === 'function' ? publishedQuizzes().filter(q => !partId || q.part === partId) : [];
  return [...authored, ...uploaded];
}
