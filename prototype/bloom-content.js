/* ═══ BLOOM — Content Manager: real uploads for video, audio, PDF, notes, quizzes ═══ */

let cm = { view:'all', type:'all', part:'', q:'', up:null, quiz:null, sel:[] };

function upStore(){ B.uploads = B.uploads || []; return B.uploads; }
function upSave(){ save(); }
function upById(id){ return upStore().find(u => u.id === id); }
function upByType(t){ return upStore().filter(u => u.type === t); }
function fmtBytes(b){ return b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(0) + ' KB' : b < 1073741824 ? (b/1048576).toFixed(1) + ' MB' : (b/1073741824).toFixed(2) + ' GB'; }

/* Blob URLs are re-minted per session; small files persist as data URLs */
const UP_BLOBS = {};
function upURL(u){
  if (UP_BLOBS[u.id]) return UP_BLOBS[u.id];
  if (u.data) return u.data;
  return null;
}

function sec_content(){
  if (cm.quiz) return cmQuizHTML();
  return cmHomeHTML();
}

function cmHomeHTML(){
  const all = upStore();
  const q = cm.q.trim().toLowerCase();
  let list = all.filter(u => (cm.type === 'all' || u.type === cm.type) && (!cm.part || u.part === cm.part));
  if (q) list = list.filter(u => (u.title + ' ' + u.desc + ' ' + partOf(u.part).name).toLowerCase().includes(q));
  const pub = all.filter(u => u.published).length;
  const bytes = all.reduce((s,u) => s + (u.size||0), 0);
  const builtIn = MATERIALS.length + LECTURES.length + AUDIO.length;

  return `
    ${phead({ eyebrow: B.role === 'admin' ? 'Admin · Content' : 'Faculty · Content',
      title:`Content <em>manager</em>`,
      sub:'Upload video lectures, audio tracks, PDFs, class notes and quizzes, tag them to the exact exam part, and publish them into the School.',
      actions:`<button class="btn btn-g btn-sm" onclick="cmQuizNew()"><i class="fa-solid fa-list-check"></i> Build a quiz</button>
        <button class="btn btn-p" onclick="cmUpload()"><i class="fa-solid fa-cloud-arrow-up"></i> Upload content</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Uploaded by you', all.length, pub + ' published · ' + (all.length-pub) + ' draft', 'leaf', 'fa-cloud-arrow-up')}
      ${statCard('Storage used', fmtBytes(bytes), 'of 50 GB on this plan', 'sky', 'fa-database')}
      ${statCard('In the School', builtIn + all.filter(u=>u.published).length, builtIn + ' core + ' + pub + ' yours', 'amb', 'fa-graduation-cap')}
      ${statCard('Quizzes', upByType('quiz').length, upByType('quiz').reduce((s,u)=>s+(u.questions?.length||0),0) + ' questions total', 'vio', 'fa-list-check')}
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Add something new</h3><p>Drop a file straight in, or build a quiz in the editor</p></div></div>
      <div class="card-bd">
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:11px">
          ${Object.entries(UP_TYPES).map(([k,t]) => {
            const [bg,fg] = toneVars(t.tone);
            return `<button class="tile" style="text-align:left;padding:16px" onclick="${k==='quiz'?'cmQuizNew()':`cmUpload('${k}')`}">
              <div style="width:34px;height:34px;border-radius:11px;background:${bg};color:${fg};display:grid;place-items:center;font-size:14px;margin-bottom:11px"><i class="fa-solid ${t.ic}"></i></div>
              <b style="display:block;font-size:13.5px;margin-bottom:3px">${t.name}</b>
              <span style="font-size:11px;color:var(--ink-4);line-height:1.4">${t.hint}</span>
              <div style="font-family:var(--mono);font-size:9.5px;color:var(--ink-4);margin-top:7px">up to ${t.max} · ${upByType(k).length} uploaded</div>
            </button>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="card mb2"><div class="card-bd" style="padding:13px 17px">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div class="search" style="flex:1;min-width:220px"><i class="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Search your content…" value="${esc(cm.q)}" oninput="cm.q=this.value;clearTimeout(window.__cmT);window.__cmT=setTimeout(()=>navTo('content'),250)"></div>
        <select style="border:1.5px solid var(--line-2);border-radius:11px;padding:9px 12px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" onchange="cm.part=this.value;navTo('content')">
          <option value="">All exam parts</option>
          ${PARTS.map(p=>`<option value="${p.id}" ${cm.part===p.id?'selected':''}>${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="pills" style="margin-top:12px">
        <button class="pill ${cm.type==='all'?'on':''}" onclick="cm.type='all';navTo('content')">All <span class="n">${all.length}</span></button>
        ${Object.entries(UP_TYPES).map(([k,t])=>`<button class="pill ${cm.type===k?'on':''}" onclick="cm.type='${k}';navTo('content')"><i class="fa-solid ${t.ic}"></i> ${t.name} <span class="n">${upByType(k).length}</span></button>`).join('')}
      </div>
    </div></div>

    ${list.length ? `
    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Your content</h3><p>${list.length} item${list.length===1?'':'s'}${cm.part?' in '+partOf(cm.part).name:''}</p></div></div>
      <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Title</th><th>Type</th><th>Exam part</th><th>Size</th><th>Added</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map(u => {
          const t = UP_TYPES[u.type];
          return `<tr>
            <td><div style="display:flex;gap:10px;align-items:center">
              <div style="width:28px;height:28px;flex:0 0 28px;border-radius:9px;background:${toneVars(t.tone)[0]};color:${toneVars(t.tone)[1]};display:grid;place-items:center;font-size:11px"><i class="fa-solid ${t.ic}"></i></div>
              <div style="min-width:0"><b style="color:var(--ink);display:block">${esc(u.title)}</b>
                <span style="font-size:11px;color:var(--ink-4)">${esc(u.file||'')}${u.questions?u.questions.length+' questions':''}${u.mins?' · '+u.mins+' min':''}</span></div></div></td>
            <td>${t.name}</td>
            <td>${partOf(u.part).name}</td>
            <td style="font-family:var(--mono);font-size:11.5px">${u.size?fmtBytes(u.size):'—'}</td>
            <td style="font-family:var(--mono);font-size:11.5px">${u.at}</td>
            <td><span class="tag ${u.published?'ok':''}">${u.published?'Published':'Draft'}</span></td>
            <td style="text-align:right;white-space:nowrap">
              ${u.type==='quiz'?`<button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Edit quiz" onclick="cmQuizEdit('${u.id}')"><i class="fa-solid fa-pen"></i></button>`:''}
              ${upURL(u)?`<button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Preview" onclick="cmPreview('${u.id}')"><i class="fa-solid fa-eye"></i></button>`:''}
              <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="${u.published?'Unpublish':'Publish'}" onclick="cmPublish('${u.id}')"><i class="fa-solid fa-${u.published?'eye-slash':'upload'}"></i></button>
              <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Delete" onclick="cmDelete('${u.id}')"><i class="fa-solid fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div></div>
    </div>`
    : `<div class="empty"><i class="fa-solid fa-cloud-arrow-up"></i><b>${all.length?'Nothing matches those filters':'No content uploaded yet'}</b>
        <span>${all.length?'Try a different type or exam part.':'Upload a lecture, a PDF or an audio track and it appears in the School the moment you publish it.'}</span>
        <div style="margin-top:16px"><button class="btn btn-p" onclick="cmUpload()"><i class="fa-solid fa-cloud-arrow-up"></i> Upload your first file</button></div></div>`}

    <div class="card" style="margin-top:16px">
      <div class="card-hd"><div style="flex:1"><h3>Built-in course content</h3><p>The Bloom core curriculum — read-only, but you can add to any part</p></div></div>
      <div class="card-bd">
        <div class="grid g3">
          ${[['Class notes & PDFs', MATERIALS.length, 'fa-note-sticky','cor'],['Audio tracks', AUDIO.length, 'fa-headphones','amb'],['Video lectures', LECTURES.length, 'fa-circle-play','sky']].map(([n,v,ic,tone])=>`
            <div style="display:flex;gap:12px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:13px">
              <div style="width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:${toneVars(tone)[0]};color:${toneVars(tone)[1]};display:grid;place-items:center"><i class="fa-solid ${ic}"></i></div>
              <div><b style="font-family:var(--display);font-size:19px;font-weight:700;display:block;line-height:1">${v}</b>
                <span style="font-size:11.5px;color:var(--ink-4)">${n}</span></div></div>`).join('')}
        </div>
      </div>
    </div>`;
}

/* ── UPLOAD MODAL ── */
function cmUpload(preset){
  cm.up = { type: preset || 'video', part:'l1', title:'', desc:'', level:'B1–B2', file:null, size:0, mins:'', published:true };
  cmUploadModal();
}
function cmUploadModal(){
  const u = cm.up, t = UP_TYPES[u.type];
  modal(`
    <div class="modal-hd">
      <div style="width:36px;height:36px;border-radius:11px;background:${toneVars(t.tone)[0]};color:${toneVars(t.tone)[1]};display:grid;place-items:center"><i class="fa-solid ${t.ic}"></i></div>
      <div style="flex:1"><h3>Upload ${t.name.toLowerCase()}</h3><p>${t.hint} · up to ${t.max}</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      <div class="pills mb" style="margin-bottom:18px">
        ${Object.entries(UP_TYPES).filter(([k])=>k!=='quiz').map(([k,x])=>`<button class="pill ${u.type===k?'on':''}" onclick="cm.up.type='${k}';cm.up.file=null;cmUploadModal()"><i class="fa-solid ${x.ic}"></i> ${x.name}</button>`).join('')}
      </div>

      <label for="cmFile" style="display:block;cursor:pointer;margin-bottom:18px">
        <div id="cmDrop" style="border:2px dashed ${u.file?'var(--ok)':'var(--leaf-400)'};border-radius:16px;padding:${u.file?'20px':'34px 22px'};text-align:center;background:${u.file?'var(--ok-soft)':'var(--leaf-50)'};transition:.15s">
          ${u.file ? `
            <i class="fa-solid fa-circle-check" style="font-size:28px;color:var(--ok);display:block;margin-bottom:10px"></i>
            <div style="font-size:14.5px;font-weight:700;color:var(--ink)">${esc(u.file)}</div>
            <div style="font-family:var(--mono);font-size:11.5px;color:var(--ink-3);margin-top:4px">${fmtBytes(u.size)}${u.mins?' · '+u.mins+' min':''}</div>
            <div style="font-size:11.5px;color:var(--ink-4);margin-top:8px">Click to choose a different file</div>`
          : `<i class="fa-solid ${t.ic}" style="font-size:32px;color:var(--leaf-500);display:block;margin-bottom:12px"></i>
            <div style="font-size:15px;font-weight:700;color:var(--ink)">Drop your ${t.name.toLowerCase()} here</div>
            <div style="font-size:12.5px;color:var(--ink-3);margin-top:5px">or click to browse · ${t.hint}</div>`}
        </div></label>
      <input type="file" id="cmFile" accept="${t.accept}" style="display:none" onchange="cmFilePicked(this)">

      <div class="fgrid">
        <div class="fg full"><label>Title</label><input id="cmTitle" value="${esc(u.title)}" placeholder="e.g. Part 4 Lecture — Water Pricing" oninput="cm.up.title=this.value"></div>
        <div class="fg full"><label>Description — what a student will see</label><textarea id="cmDesc" rows="2" placeholder="One or two sentences on what this covers and who it is for." oninput="cm.up.desc=this.value">${esc(u.desc)}</textarea></div>
        <div class="fg"><label>Exam part</label><select onchange="cm.up.part=this.value">
          ${PARTS.map(p=>`<option value="${p.id}" ${u.part===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
        <div class="fg"><label>Level</label><select onchange="cm.up.level=this.value">
          ${['A1–A2','A2–B1','B1–B2','B2–C1','C1–C2','All'].map(l=>`<option ${u.level===l?'selected':''}>${l}</option>`).join('')}</select></div>
      </div>

      <div style="margin-top:16px;display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--paper);border-radius:11px">
        <input type="checkbox" id="cmPub" ${u.published?'checked':''} onchange="cm.up.published=this.checked">
        <label for="cmPub" style="font-size:12.5px;color:var(--ink-2);cursor:pointer">Publish to the School immediately — students in every cohort will see it under ${partOf(u.part).name}</label>
      </div>
    </div>
    <div class="modal-ft">
      <button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="cmSaveUpload()"><i class="fa-solid fa-check"></i> ${cm.up.published?'Upload &amp; publish':'Save as draft'}</button>
    </div>`, 640);

  /* drag and drop */
  setTimeout(() => {
    const drop = document.getElementById('cmDrop'); if (!drop) return;
    ['dragenter','dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.style.borderColor = 'var(--leaf-700)'; drop.style.background = 'var(--leaf-100)'; }));
    ['dragleave','drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.style.borderColor = 'var(--leaf-400)'; drop.style.background = 'var(--leaf-50)'; }));
    drop.addEventListener('drop', ev => {
      const f = ev.dataTransfer.files[0];
      if (f) cmTakeFile(f);
    });
  }, 60);
}

function cmFilePicked(input){ const f = input.files[0]; if (f) cmTakeFile(f); }
function cmTakeFile(f){
  cm.up.file = f.name; cm.up.size = f.size;
  if (!cm.up.title) cm.up.title = f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  cm.up.blob = f;
  /* read duration for media, and keep small files as data URLs so they survive a reload */
  const kind = cm.up.type;
  if (kind === 'video' || kind === 'audio'){
    const el = document.createElement(kind === 'video' ? 'video' : 'audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => { cm.up.mins = Math.max(1, Math.round(el.duration / 60)); cm.up.secs = Math.round(el.duration); URL.revokeObjectURL(el.src); cmUploadModal(); };
    el.src = URL.createObjectURL(f);
  }
  if (f.size <= 3 * 1024 * 1024){
    const r = new FileReader();
    r.onload = () => { cm.up.data = r.result; };
    r.readAsDataURL(f);
  }
  cmUploadModal();
  toast(f.name + ' ready', 'fa-file-circle-check');
}

function cmSaveUpload(){
  const u = cm.up;
  if (!u.file){ toast('Choose a file first'); return; }
  if (!u.title.trim()){ toast('Give it a title'); return; }
  const rec = {
    id:'up' + Date.now().toString(36), type:u.type, part:u.part, title:u.title.trim(), desc:u.desc.trim(),
    level:u.level, file:u.file, size:u.size, mins:u.mins||null, secs:u.secs||null, data:u.data||null,
    published:u.published, at:today(), by:B.profile.name, role:B.role,
  };
  if (u.blob) UP_BLOBS[rec.id] = URL.createObjectURL(u.blob);
  upStore().unshift(rec); upSave();
  cm.up = null; closeModal(); navTo('content');
  toast(rec.published ? 'Published to ' + partOf(rec.part).name : 'Saved as a draft', 'fa-circle-check');
}

function cmPublish(id){
  const u = upById(id); if (!u) return;
  u.published = !u.published; upSave(); navTo('content');
  toast(u.published ? 'Published — students can see it now' : 'Unpublished', u.published?'fa-upload':'fa-eye-slash');
}
function cmDelete(id){
  const u = upById(id); if (!u) return;
  if (!confirm('Delete “' + u.title + '”? Students who have already opened it keep no copy.')) return;
  B.uploads = upStore().filter(x => x.id !== id); upSave(); navTo('content'); toast('Deleted');
}
function cmPreview(id){
  const u = upById(id); if (!u) return;
  const src = upURL(u);
  const body = u.type === 'video' ? `<video controls style="width:100%;border-radius:12px;background:#000" src="${src}"></video>`
    : u.type === 'audio' ? `<audio controls style="width:100%" src="${src}"></audio>`
    : u.type === 'image' ? `<img src="${src}" style="width:100%;border-radius:12px">`
    : u.type === 'pdf' || u.type === 'notes' ? `<iframe src="${src}" style="width:100%;height:60vh;border:1px solid var(--line);border-radius:12px"></iframe>`
    : `<div style="font-size:13px;color:var(--ink-3)">No inline preview for this type.</div>`;
  modal(`<div class="modal-hd"><div style="flex:1"><h3>${esc(u.title)}</h3><p>${UP_TYPES[u.type].name} · ${partOf(u.part).name} · ${fmtBytes(u.size)}</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">${body}${u.desc?`<div style="font-size:13px;color:var(--ink-3);line-height:1.6;margin-top:14px">${esc(u.desc)}</div>`:''}</div>`, 720);
}

/* ── QUIZ BUILDER ── */
function cmQuizNew(){
  cm.quiz = { id:null, title:'', part:'gv', level:'B1–B2', desc:'', published:true, mins:10,
    questions:[{ q:'', o:['','','',''], c:0, e:'' }] };
  navTo('content');
}
function cmQuizEdit(id){
  const u = upById(id); if (!u) return;
  cm.quiz = { id:u.id, title:u.title, part:u.part, level:u.level, desc:u.desc, published:u.published, mins:u.mins||10, questions:JSON.parse(JSON.stringify(u.questions)) };
  navTo('content');
}

function cmQuizHTML(){
  const z = cm.quiz;
  return `
    ${phead({ eyebrow:'Content · Quiz builder', title:z.id?`Edit <em>quiz</em>`:`Build a <em>quiz</em>`,
      sub:'Write questions by hand, or import a CSV. Published quizzes appear in the student Practice section under the exam part you tag.',
      actions:`<button class="btn btn-g btn-sm" onclick="cmCSVImport()"><i class="fa-solid fa-file-csv"></i> Import CSV</button>
        <button class="btn btn-g btn-sm" onclick="cm.quiz=null;navTo('content')">Cancel</button>
        <button class="btn btn-p" onclick="cmQuizSave()"><i class="fa-solid fa-check"></i> ${z.published?'Save &amp; publish':'Save draft'}</button>` })}

    <div class="card mb2"><div class="card-bd">
      <div class="fgrid">
        <div class="fg full"><label>Quiz title</label><input value="${esc(z.title)}" placeholder="e.g. Articles — Diagnostic Test" oninput="cm.quiz.title=this.value"></div>
        <div class="fg"><label>Exam part</label><select onchange="cm.quiz.part=this.value">${PARTS.map(p=>`<option value="${p.id}" ${z.part===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
        <div class="fg"><label>Level</label><select onchange="cm.quiz.level=this.value">${['A1–A2','A2–B1','B1–B2','B2–C1','C1–C2','All'].map(l=>`<option ${z.level===l?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="fg full"><label>Description</label><input value="${esc(z.desc)}" placeholder="What this quiz tests and when a student should take it" oninput="cm.quiz.desc=this.value"></div>
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--paper);border-radius:11px">
        <input type="checkbox" ${z.published?'checked':''} onchange="cm.quiz.published=this.checked">
        <span style="font-size:12.5px;color:var(--ink-2)">Publish to students in every cohort</span>
        <div style="flex:1"></div>
        <span style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4)">${z.questions.length} question${z.questions.length===1?'':'s'} · ~${Math.max(1,Math.round(z.questions.length*0.75))} min</span>
      </div>
    </div></div>

    <div style="display:grid;gap:14px">
      ${z.questions.map((qq,i) => `
        <div class="card"><div class="card-bd">
          <div style="display:flex;gap:11px;align-items:center;margin-bottom:13px">
            <div style="width:28px;height:28px;flex:0 0 28px;border-radius:9px;background:var(--violet-soft);color:var(--violet);display:grid;place-items:center;font-family:var(--mono);font-size:12px;font-weight:800">${i+1}</div>
            <div style="flex:1;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800">Question ${i+1}</div>
            ${z.questions.length>1?`<button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Remove" onclick="cmQDel(${i})"><i class="fa-solid fa-trash"></i></button>`:''}
          </div>
          <div class="fg" style="margin-bottom:13px"><label>Question</label>
            <textarea rows="2" placeholder="e.g. ___ education system in Finland is widely admired." oninput="cm.quiz.questions[${i}].q=this.value">${esc(qq.q)}</textarea></div>
          <div style="display:grid;gap:8px;margin-bottom:13px">
            ${qq.o.map((o,oi)=>`<div style="display:flex;gap:10px;align-items:center">
              <button style="width:28px;height:28px;flex:0 0 28px;border-radius:9px;border:1.5px solid ${qq.c===oi?'var(--ok)':'var(--line-2)'};background:${qq.c===oi?'var(--ok)':'var(--surface)'};color:${qq.c===oi?'#fff':'var(--ink-4)'};font-family:var(--mono);font-size:11px;font-weight:800;cursor:pointer" title="Mark as the correct answer" onclick="cmQCorrect(${i},${oi})">${String.fromCharCode(65+oi)}</button>
              <input value="${esc(o)}" placeholder="Option ${String.fromCharCode(65+oi)}" style="flex:1;border:1.5px solid var(--line-2);border-radius:10px;padding:9px 12px;font-family:inherit;font-size:13.5px;background:var(--surface);color:var(--ink)" oninput="cm.quiz.questions[${i}].o[${oi}]=this.value">
              ${qq.c===oi?'<span class="tag ok">Correct</span>':''}</div>`).join('')}
          </div>
          <div class="fg"><label>Explanation shown after answering</label>
            <input value="${esc(qq.e)}" placeholder="Why this answer is right — one sentence." oninput="cm.quiz.questions[${i}].e=this.value"></div>
        </div></div>`).join('')}
    </div>

    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn btn-g" onclick="cmQAdd()"><i class="fa-solid fa-plus"></i> Add question</button>
      <div style="flex:1"></div>
      <button class="btn btn-p" onclick="cmQuizSave()"><i class="fa-solid fa-check"></i> ${z.published?'Save &amp; publish':'Save draft'}</button>
    </div>`;
}
function cmQAdd(){ cm.quiz.questions.push({ q:'', o:['','','',''], c:0, e:'' }); navTo('content'); }
function cmQDel(i){ cm.quiz.questions.splice(i,1); navTo('content'); }
function cmQCorrect(i,oi){ cm.quiz.questions[i].c = oi; navTo('content'); }

function cmQuizSave(){
  const z = cm.quiz;
  if (!z.title.trim()){ toast('Give the quiz a title'); return; }
  const valid = z.questions.filter(q => q.q.trim() && q.o.filter(o=>o.trim()).length >= 2);
  if (!valid.length){ toast('Add at least one question with two options'); return; }
  const rec = {
    id: z.id || ('up' + Date.now().toString(36)), type:'quiz', part:z.part, title:z.title.trim(), desc:z.desc.trim(),
    level:z.level, questions:valid, mins:Math.max(1,Math.round(valid.length*0.75)),
    size:JSON.stringify(valid).length, published:z.published, at:today(), by:B.profile.name, role:B.role,
  };
  if (z.id){ const i = upStore().findIndex(x=>x.id===z.id); upStore()[i] = rec; }
  else upStore().unshift(rec);
  upSave(); cm.quiz = null; navTo('content');
  toast(rec.published ? 'Quiz published · ' + valid.length + ' questions' : 'Quiz saved as a draft', 'fa-list-check');
}

function cmCSVImport(){
  modal(`<div class="modal-hd"><div style="flex:1"><h3>Import questions from CSV</h3><p>One row per question, with the correct answer as a letter</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:9px">Required columns</div>
      <pre style="background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:13px;font-family:var(--mono);font-size:11px;overflow-x:auto;line-height:1.7;color:var(--ink-2)">${esc(QUIZ_CSV_TEMPLATE)}</pre>
      <div style="display:flex;gap:9px;margin:14px 0">
        <button class="btn btn-g btn-sm" onclick="cmCSVTemplate()"><i class="fa-solid fa-download"></i> Download template</button>
      </div>
      <label for="cmCSV" style="display:block;cursor:pointer">
        <div style="border:2px dashed var(--violet);border-radius:14px;padding:26px;text-align:center;background:var(--violet-soft)">
          <i class="fa-solid fa-file-csv" style="font-size:28px;color:var(--violet);display:block;margin-bottom:10px"></i>
          <div style="font-size:14px;font-weight:700">Drop your CSV here</div>
          <div style="font-size:11.5px;color:var(--ink-3);margin-top:3px">or click to browse</div></div></label>
      <input type="file" id="cmCSV" accept=".csv,.txt" style="display:none" onchange="cmCSVRead(this)">
      <div style="margin-top:14px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:8px">Or paste it</div>
      <textarea id="cmCSVText" rows="5" placeholder="question,optionA,optionB,optionC,optionD,correct,explanation" style="border:1.5px solid var(--line-2);border-radius:11px;padding:11px;font-family:var(--mono);font-size:11.5px;width:100%;background:var(--surface);color:var(--ink)"></textarea>
    </div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-v" onclick="cmCSVParse(document.getElementById('cmCSVText').value)"><i class="fa-solid fa-wand-magic-sparkles"></i> Import</button></div>`, 640);
}
function cmCSVTemplate(){
  const url = URL.createObjectURL(new Blob([QUIZ_CSV_TEMPLATE], { type:'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-quiz-template.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function cmCSVRead(input){
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => cmCSVParse(r.result);
  r.readAsText(f);
}
function csvRows(text){
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (quoted){
      if (c === '"' && text[i+1] === '"'){ cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ','){ row.push(cell); cell = ''; }
    else if (c === '\n'){ row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
function cmCSVParse(text){
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
  if (!cm.quiz) cmQuizNew();
  const blank = cm.quiz.questions.filter(q => q.q.trim()).length === 0;
  cm.quiz.questions = blank ? qs : [...cm.quiz.questions, ...qs];
  closeModal(); navTo('content');
  toast(qs.length + ' question' + (qs.length===1?'':'s') + ' imported', 'fa-file-csv');
}

/* ── student-facing: published uploads merged into the School ── */
function publishedFor(partId, type){
  return upStore().filter(u => u.published && u.part === partId && (!type || u.type === type));
}
function publishedQuizzes(){ return upStore().filter(u => u.published && u.type === 'quiz'); }
