/* ═══ BLOOM — Library section: browse by part, read PDFs, watch lectures ═══ */

let lbs = { view:'home', skill:'all', part:null, kind:'all', q:'', mat:null, lec:null, aud:null, ch:0, playing:false, timer:null, pos:0, line:0 };

/* ── progress ──
   Keys are backfilled individually: a state saved by an earlier build may
   have B.library present but missing newer keys, and `B.library || {...}`
   would leave those undefined. */
function libState(){
  const s = B.library = B.library || {};
  if (!Array.isArray(s.downloaded)) s.downloaded = [];
  if (!s.watched) s.watched = {};
  if (!s.heard) s.heard = {};
  if (!Array.isArray(s.saved)) s.saved = [];
  return s;
}
function libDownloaded(id){ return libState().downloaded.includes(id); }
function libWatched(id){ return libState().watched[id] || null; }
function libHeard(id){ return libState().heard[id] || null; }
function libSaved(id){ return libState().saved.includes(id); }
function libToggleSave(id){
  const s = libState(), i = s.saved.indexOf(id);
  if (i >= 0) s.saved.splice(i,1); else s.saved.push(id);
  save(); navTo('library');
  toast(i >= 0 ? 'Removed from saved' : 'Saved to your shelf', i >= 0 ? 'fa-bookmark' : 'fa-bookmark');
}
function libPct(){
  const total = MATERIALS.length + LECTURES.length + AUDIO.length;
  const st = libState();
  const done = st.downloaded.length + Object.values(st.watched).filter(w => w.done).length + Object.values(st.heard).filter(w => w.done).length;
  return pct(done, total);
}

function sec_library(){
  if (lbs.view === 'material') return libMaterialHTML();
  if (lbs.view === 'lecture') return libLectureHTML();
  if (lbs.view === 'audio') return libAudioHTML();
  if (lbs.view === 'part') return libPartHTML();
  return libHomeHTML();
}

/* ═══ HOME — organised by skill, then by part ═══ */
function libHomeHTML(){
  const st = libState();
  const q = lbs.q.trim().toLowerCase();
  const skills = [
    { id:'all', name:'Everything', ic:'fa-layer-group' },
    { id:'listening', name:'Listening', ic:'fa-headphones' },
    { id:'reading', name:'Reading', ic:'fa-book-open' },
    { id:'writing', name:'Writing', ic:'fa-pen-nib' },
    { id:'speaking', name:'Speaking', ic:'fa-microphone' },
    { id:'general', name:'General', ic:'fa-graduation-cap' },
  ];
  const track = typeof examTrack === 'function' ? examTrack() : null;
  const inTrack = p => typeof partInTrack !== 'function' || B.role !== 'student' || partInTrack(p.id, track);
  const shownParts = PARTS.filter(p => (lbs.skill === 'all' || p.skill === lbs.skill) && inTrack(p));
  const weak = weakestSkill();
  const totalMins = LECTURES.reduce((s,l) => s + l.secs, 0) / 60;
  const totalAudio = AUDIO.reduce((s,a) => s + a.secs, 0) / 60;
  const totalPages = MATERIALS.reduce((s,m) => s + m.pages, 0);

  if (q){
    const mats = MATERIALS.filter(m => (m.title + ' ' + m.desc + ' ' + partOf(m.part).name).toLowerCase().includes(q));
    const lecs = LECTURES.filter(l => (l.title + ' ' + l.desc + ' ' + l.tutor + ' ' + l.chapters.map(c=>c.n).join(' ')).toLowerCase().includes(q));
    const auds = AUDIO.filter(a => (a.title + ' ' + a.desc + ' ' + a.focus.join(' ')).toLowerCase().includes(q));
    const nres = mats.length + lecs.length + auds.length;
    return `${libHead()}${libSearchBar()}
      <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:13px">${nres} result${nres===1?'':'s'} for “${esc(lbs.q)}”</div>
      ${lecs.length?`<div class="grid g2 mb2">${lecs.map(lecCard).join('')}</div>`:''}
      ${auds.length?`<div class="grid g2 mb2">${auds.map(audCard).join('')}</div>`:''}
      ${mats.length?`<div class="grid g2">${mats.map(matCard).join('')}</div>`:''}
      ${!nres?`<div class="empty"><i class="fa-solid fa-magnifying-glass"></i><b>Nothing matches “${esc(lbs.q)}”</b><span>Try a part name, a skill, or a tutor.</span></div>`:''}`;
  }

  return `${libHead()}

    <div class="grid g4 mb2">
      ${statCard('Lectures', LECTURES.length, Math.round(totalMins) + ' minutes of teaching', 'sky', 'fa-circle-play')}
      ${statCard('Audio', AUDIO.length, Math.round(totalAudio) + ' minutes of listening', 'cor', 'fa-headphones')}
      ${statCard('Notes &amp; PDFs', MATERIALS.length, totalPages + ' printable pages', 'amb', 'fa-file-pdf')}
      ${statCard('Your progress', libPct() + '%', st.saved.length + ' saved to your shelf', 'leaf', 'fa-check-double')}
    </div>

    ${weak ? `
    <div class="card mb2" style="border-color:var(--leaf-500);background:linear-gradient(180deg,var(--leaf-50),var(--surface) 60%)">
      <div class="card-bd" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:var(--leaf-700);color:#fff;display:grid;place-items:center;font-size:17px"><i class="fa-solid ${skillMeta(weak).ic}"></i></div>
        <div style="flex:1;min-width:220px">
          <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:5px">Recommended for you</div>
          <b style="font-family:var(--display);font-size:18px;font-weight:700;display:block">${skillMeta(weak).name} is your weakest skill — start here</b>
          <span style="font-size:12.5px;color:var(--ink-3)">${partsFor(weak).length} parts · ${LECTURES.filter(l=>partOf(l.part).skill===weak).length} lectures · ${AUDIO.filter(a=>partOf(a.part).skill===weak).length} audio · ${MATERIALS.filter(m=>partOf(m.part).skill===weak).length} notes</span>
        </div>
        <button class="btn btn-p" onclick="lbs.skill='${weak}';navTo('library')">Open ${skillMeta(weak).name} <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>` : ''}

    ${libSearchBar()}

    <div class="pills mb" style="margin-bottom:20px">
      ${skills.map(s => {
        const ok = x => inTrack(partOf(x.part));
        const n = s.id === 'all' ? MATERIALS.filter(ok).length + LECTURES.filter(ok).length + AUDIO.filter(ok).length
          : MATERIALS.filter(m=>ok(m)&&partOf(m.part).skill===s.id).length + LECTURES.filter(l=>ok(l)&&partOf(l.part).skill===s.id).length + AUDIO.filter(a=>ok(a)&&partOf(a.part).skill===s.id).length;
        return `<button class="pill ${lbs.skill===s.id?'on':''}" onclick="lbs.skill='${s.id}';navTo('library')"><i class="fa-solid ${s.ic}"></i> ${s.name} <span class="n">${n}</span></button>`;
      }).join('')}
    </div>

    ${['listening','reading','writing','speaking','general'].filter(sk => lbs.skill==='all' || lbs.skill===sk).map(sk => {
      const ps = shownParts.filter(p => p.skill === sk);
      if (!ps.length) return '';
      const meta = sk==='general' ? { name:'General & Strategy', ic:'fa-graduation-cap', tone:'leaf' } : skillMeta(sk);
      const [bg,fg] = toneVars(meta.tone);
      const band = B.scores[sk];
      return `<div style="margin-bottom:30px">
        <div style="display:flex;align-items:center;gap:13px;margin-bottom:15px">
          <div style="width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:${bg};color:${fg};display:grid;place-items:center"><i class="fa-solid ${meta.ic}"></i></div>
          <div>
            <h3 style="font-family:var(--display);font-size:18px;font-weight:700;letter-spacing:-.4px">${meta.name}</h3>
            <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${ps.length} part${ps.length===1?'':'s'} · ${ps.reduce((s,p)=>s+lecsFor(p.id).length,0)} lectures · ${ps.reduce((s,p)=>s+audFor(p.id).length,0)} audio · ${ps.reduce((s,p)=>s+matsFor(p.id).length,0)} notes</div>
          </div>
          ${band!=null?`<span class="tag ${band>=B.profile.target?'ok':'amb'}" style="margin-left:auto">Your band ${bandLabel(band)}</span>`:''}
          <div style="flex:1;height:1px;background:var(--line)"></div>
        </div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(276px,1fr));gap:13px">
          ${ps.map(p => {
            const mats = matsFor(p.id), lecs = lecsFor(p.id), auds = audFor(p.id);
            const done = mats.filter(m=>libDownloaded(m.id)).length + lecs.filter(l=>libWatched(l.id)?.done).length + auds.filter(a=>libHeard(a.id)?.done).length;
            const tot = mats.length + lecs.length + auds.length;
            return `<div class="card" style="cursor:pointer;transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--sh-2)'" onmouseout="this.style.transform='';this.style.boxShadow='var(--sh-1)'" onclick="lbs.part='${p.id}';lbs.view='part';navTo('library')">
              <div class="card-bd" style="padding:17px 19px">
                <div style="display:flex;gap:9px;align-items:flex-start;margin-bottom:10px">
                  <div style="flex:1;min-width:0">
                    <b style="font-family:var(--display);font-size:15.5px;font-weight:700;display:block;line-height:1.25">${p.name}</b>
                    <span style="font-size:11.5px;color:var(--ink-4)">${p.sub}</span>
                  </div>
                  ${done===tot&&tot?`<i class="fa-solid fa-circle-check" style="color:var(--ok)"></i>`:''}
                </div>
                <div style="font-size:12px;color:var(--ink-3);line-height:1.5;margin-bottom:13px;text-wrap:pretty">${p.note}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px">
                  ${lecs.length?`<span class="tag sky"><i class="fa-solid fa-circle-play"></i> ${lecs.length} lecture${lecs.length===1?'':'s'}</span>`:''}
                  ${auds.length?`<span class="tag cor"><i class="fa-solid fa-headphones"></i> ${auds.length} audio</span>`:''}
                  ${mats.length?`<span class="tag amb"><i class="fa-solid fa-file-pdf"></i> ${mats.length} note${mats.length===1?'':'s'}</span>`:''}
                  <span class="tag">${p.mins}</span>
                </div>
                ${tot?`<div class="bar thin"><i style="width:${pct(done,tot)}%;background:${done===tot?'var(--ok)':'var(--leaf-500)'}"></i></div>
                  <div style="font-family:var(--mono);font-size:10px;color:var(--ink-4);margin-top:6px">${done} of ${tot} complete</div>`:''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}

    ${st.saved.length ? `
    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Your shelf</h3><p>Everything you bookmarked</p></div></div>
      <div class="card-bd flush">
        ${st.saved.map(id => {
          const m = MATERIALS.find(x=>x.id===id), l = LECTURES.find(x=>x.id===id), a = AUDIO.find(x=>x.id===id);
          const it = m || l || a; if (!it) return '';
          return `<div class="row">
            <div class="ic ${m?'amb':a?'cor':'sky'}"><i class="fa-solid ${m?MAT_KINDS[m.kind].ic:a?AUDIO_KINDS[a.kind].ic:'fa-circle-play'}"></i></div>
            <div class="tx"><b class="clip">${it.title}</b><span>${partOf(it.part).name} · ${m?m.pages+' pages':fmtDur(it.secs)}</span></div>
            <button class="btn btn-g btn-sm" onclick="${m?`libOpenMat('${id}')`:a?`libOpenAud('${id}')`:`libOpenLec('${id}')`}">Open</button>
            <button class="icobtn" style="width:30px;height:30px;font-size:11px;color:var(--amber);border-color:var(--amber)" onclick="event.stopPropagation();libToggleSave('${id}')"><i class="fa-solid fa-bookmark"></i></button>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}`;
}

function libHead(){
  return phead({ eyebrow:'School', title:`Notes, audio &amp; <em>lectures</em>`,
    sub: (typeof examTrack === 'function' && B.role === 'student')
      ? `Everything for your ${examOf(examTrack()).name} track, organised by the part of the exam it belongs to — so you never wonder what to study next.`
      : 'Everything organised by the part of the exam it belongs to — so you never wonder what to study for Listening Part 4 or Writing Task 1.',
    actions:`${lbs.skill!=='all'||lbs.q?`<button class="btn btn-g btn-sm" onclick="lbs.skill='all';lbs.q='';navTo('library')"><i class="fa-solid fa-rotate-left"></i> Clear filters</button>`:''}
      <button class="btn btn-p btn-sm" onclick="libEssentials()"><i class="fa-solid fa-star"></i> Start here</button>` });
}
function libSearchBar(){
  return `<div class="card mb" style="margin-bottom:18px"><div class="card-bd" style="padding:13px 17px">
    <div class="search"><i class="fa-solid fa-magnifying-glass"></i>
      <input placeholder="Search notes, audio, lectures, tutors…" value="${esc(lbs.q)}" oninput="lbs.q=this.value;clearTimeout(window.__lbT);window.__lbT=setTimeout(()=>navTo('library'),260)"></div>
  </div></div>`;
}

function libEssentials(){
  const hot = [...LECTURES.filter(l=>l.hot), ...AUDIO.filter(a=>a.hot), ...MATERIALS.filter(m=>m.hot)];
  modal(`<div class="modal-hd"><div style="flex:1"><h3>Start here</h3><p>If you only work through a handful of things in the School, make it these</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd" style="padding:0">
      ${hot.map((it,i) => {
        const isMat = !!it.pages, isAud = !!AUDIO.find(a=>a.id===it.id);
        return `<div class="row">
          <div style="width:24px;font-family:var(--mono);font-size:12px;font-weight:800;color:var(--ink-4)">${i+1}</div>
          <div class="ic ${isMat?'amb':isAud?'cor':'sky'}"><i class="fa-solid ${isMat?MAT_KINDS[it.kind].ic:isAud?AUDIO_KINDS[it.kind].ic:'fa-circle-play'}"></i></div>
          <div class="tx"><b>${it.title}</b><span>${partOf(it.part).name} · ${isMat?it.pages+' pages':fmtDur(it.secs)}</span></div>
          <button class="btn btn-g btn-sm" onclick="closeModal();${isMat?`libOpenMat('${it.id}')`:isAud?`libOpenAud('${it.id}')`:`libOpenLec('${it.id}')`}">Open</button>
        </div>`;
      }).join('')}
    </div>`, 620);
}

/* ═══ PART PAGE ═══ */
function libPartHTML(){
  const p = partOf(lbs.part);
  const mats = matsFor(p.id), lecs = lecsFor(p.id), auds = audFor(p.id);
  const meta = p.skill==='general' ? { name:'General', ic:'fa-graduation-cap', tone:'leaf' } : skillMeta(p.skill);
  const siblings = partsFor(p.skill);
  const idx = siblings.findIndex(x => x.id === p.id);
  return `
    ${phead({ eyebrow:`School · ${meta.name}`, title:p.name.replace(/(\S+)$/,'<em>$1</em>'), sub:p.note,
      actions:`<button class="btn btn-g btn-sm" onclick="lbs.view='home';navTo('library')"><i class="fa-solid fa-arrow-left"></i> All parts</button>
        ${p.skill!=='general'?`<button class="btn btn-p btn-sm" onclick="navTo('${p.skill}')"><i class="fa-solid fa-play"></i> Practise ${meta.name}</button>`:''}` })}

    <div class="card mb2"><div class="card-bd" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
      <div style="display:flex;gap:9px;flex-wrap:wrap;flex:1">
        <span class="tag">${p.sub}</span><span class="tag amb">${p.mins}</span>
        <span class="tag sky">${lecs.length} lecture${lecs.length===1?'':'s'}</span>
        <span class="tag cor">${auds.length} audio</span>
        <span class="tag leaf">${mats.length} note${mats.length===1?'':'s'}</span>
      </div>
      <div class="pills" style="margin:0">
        ${siblings.map(s=>`<button class="pill ${s.id===p.id?'on':''}" style="padding:5px 12px;font-size:11.5px" onclick="lbs.part='${s.id}';navTo('library')">${s.name.replace(/^(Listening |Reading |Writing |Speaking )/,'')}</button>`).join('')}
      </div>
    </div></div>

    ${lecs.length ? `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <h3 style="font-family:var(--display);font-size:16px;font-weight:700">Lectures</h3>
        <div style="flex:1;height:1px;background:var(--line)"></div>
        <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${Math.round(lecs.reduce((s,l)=>s+l.secs,0)/60)} minutes total</span>
      </div>
      <div class="grid g2 mb2">${lecs.map(lecCard).join('')}</div>` : ''}

    ${auds.length ? `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <h3 style="font-family:var(--display);font-size:16px;font-weight:700">Audio</h3>
        <div style="flex:1;height:1px;background:var(--line)"></div>
        <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${Math.round(auds.reduce((s,a)=>s+a.secs,0)/60)} minutes</span>
      </div>
      <div class="grid g2 mb2">${auds.map(audCard).join('')}</div>` : ''}

    ${mats.length ? `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <h3 style="font-family:var(--display);font-size:16px;font-weight:700">Notes &amp; PDFs</h3>
        <div style="flex:1;height:1px;background:var(--line)"></div>
        <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${mats.reduce((s,m)=>s+m.pages,0)} pages</span>
      </div>
      <div class="grid g2 mb2">${mats.map(matCard).join('')}</div>` : ''}

    ${!mats.length && !lecs.length && !auds.length ? `<div class="empty"><i class="fa-solid fa-folder-open"></i><b>Nothing here yet</b><span>Materials for this part are being written.</span></div>` : ''}

    ${idx < siblings.length - 1 ? `
      <div class="card" style="background:var(--paper)"><div class="card-bd" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:4px">Next part</div>
          <b style="font-size:15px">${siblings[idx+1].name}</b>
          <div style="font-size:12px;color:var(--ink-4)">${siblings[idx+1].sub}</div>
        </div>
        <button class="btn btn-p btn-sm" onclick="lbs.part='${siblings[idx+1].id}';navTo('library')">Continue <i class="fa-solid fa-arrow-right"></i></button>
      </div></div>` : ''}`;
}

/* ── cards ── */
function matCard(m){
  const k = MAT_KINDS[m.kind], got = libDownloaded(m.id), saved = libSaved(m.id);
  const [bg,fg] = toneVars(k.tone);
  return `<div class="card"><div class="card-bd" style="padding:0;display:flex">
    <div style="flex:0 0 76px;background:linear-gradient(155deg,var(--leaf-800),var(--leaf-600));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#fff;border-radius:var(--r-lg) 0 0 var(--r-lg);position:relative;cursor:pointer" onclick="libOpenMat('${m.id}')">
      <i class="fa-solid ${k.ic}" style="font-size:20px;opacity:.92"></i>
      <span style="font-family:var(--mono);font-size:8.5px;letter-spacing:.8px;opacity:.75">${m.pages}pp</span>
      <span style="position:absolute;left:0;top:0;bottom:0;width:4px;background:rgba(0,0,0,.22);border-radius:var(--r-lg) 0 0 var(--r-lg)"></span>
    </div>
    <div style="flex:1;min-width:0;padding:16px 18px">
      <div style="display:flex;gap:6px;margin-bottom:9px;flex-wrap:wrap;align-items:center">
        <span class="tag ${k.tone}">${k.name}</span><span class="tag">${m.level}</span>
        ${m.hot?'<span class="tag amb"><i class="fa-solid fa-star"></i> Essential</span>':''}
        ${got?'<span class="tag ok" style="margin-left:auto"><i class="fa-solid fa-check"></i></span>':''}
      </div>
      <b style="font-size:14.5px;font-weight:700;display:block;line-height:1.28;margin-bottom:6px">${m.title}</b>
      <div style="font-size:12px;color:var(--ink-3);line-height:1.5;margin-bottom:12px;text-wrap:pretty">${m.desc}</div>
      <div style="display:flex;gap:7px;align-items:center">
        <button class="btn btn-p btn-sm" onclick="libOpenMat('${m.id}')"><i class="fa-solid fa-book-open"></i> Read</button>
        <button class="btn btn-g btn-sm" onclick="libPrintMat('${m.id}')"><i class="fa-solid fa-download"></i> PDF</button>
        <button class="icobtn" style="width:30px;height:30px;font-size:11px;margin-left:auto;${saved?'color:var(--amber);border-color:var(--amber)':''}" onclick="libToggleSave('${m.id}')"><i class="fa-${saved?'solid':'regular'} fa-bookmark"></i></button>
      </div>
    </div>
  </div></div>`;
}

function lecCard(l){
  const w = libWatched(l.id), saved = libSaved(l.id);
  const prog = w ? pct(w.pos, l.secs) : 0;
  return `<div class="card" style="overflow:hidden"><div class="card-bd" style="padding:0">
    <div style="height:104px;background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 60%,var(--leaf-600));position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer" onclick="libOpenLec('${l.id}')">
      <div style="position:absolute;inset:0;opacity:.09;background:radial-gradient(circle at 78% 22%, #fff 0 34%, transparent 34%)"></div>
      <div style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.35);display:grid;place-items:center;color:#fff;font-size:15px;position:relative;z-index:1"><i class="fa-solid fa-play" style="margin-left:3px"></i></div>
      <span style="position:absolute;bottom:9px;right:11px;font-family:var(--mono);font-size:10.5px;color:#fff;background:rgba(0,0,0,.4);padding:2px 8px;border-radius:20px">${fmtDur(l.secs)}</span>
      ${l.hot?'<span style="position:absolute;top:10px;left:11px;font-size:8.5px;letter-spacing:1.1px;text-transform:uppercase;font-weight:800;background:var(--amber);color:#fff;padding:3px 8px;border-radius:5px">Essential</span>':''}
      ${w?.done?'<span style="position:absolute;top:10px;right:11px;color:var(--leaf-300);font-size:15px"><i class="fa-solid fa-circle-check"></i></span>':''}
      ${prog>0&&!w?.done?`<div style="position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.2)"><div style="width:${prog}%;height:100%;background:var(--amber)"></div></div>`:''}
    </div>
    <div style="padding:15px 18px">
      <div style="display:flex;gap:6px;margin-bottom:9px;flex-wrap:wrap">
        <span class="tag sky">${l.chapters.length} chapters</span><span class="tag">${l.level}</span>
      </div>
      <b style="font-size:14.5px;font-weight:700;display:block;line-height:1.28;margin-bottom:5px">${l.title}</b>
      <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4);margin-bottom:9px">${l.tutor} · ${l.role}</div>
      <div style="font-size:12px;color:var(--ink-3);line-height:1.5;margin-bottom:13px;text-wrap:pretty">${l.desc}</div>
      <div style="display:flex;gap:7px;align-items:center">
        <button class="btn btn-p btn-sm" onclick="libOpenLec('${l.id}')"><i class="fa-solid fa-play"></i> ${prog>0&&!w?.done?'Resume':w?.done?'Watch again':'Watch'}</button>
        <button class="icobtn" style="width:30px;height:30px;font-size:11px;margin-left:auto;${saved?'color:var(--amber);border-color:var(--amber)':''}" onclick="libToggleSave('${l.id}')"><i class="fa-${saved?'solid':'regular'} fa-bookmark"></i></button>
      </div>
    </div>
  </div></div>`;
}

/* ═══ MATERIAL READER ═══ */
function libOpenMat(id){ lbs.mat = id; lbs.view = 'material'; navTo('library'); }

function libMaterialHTML(){
  const m = MATERIALS.find(x => x.id === lbs.mat); if (!m) return libHomeHTML();
  const p = partOf(m.part), k = MAT_KINDS[m.kind];
  const got = libDownloaded(m.id), saved = libSaved(m.id);
  const others = matsFor(m.part).filter(x => x.id !== m.id);
  return `
    ${phead({ eyebrow:`${p.name} · ${k.name}`, title:m.title.replace(/(\S+)$/,'<em>$1</em>'), sub:m.desc,
      actions:`<button class="btn btn-g btn-sm" onclick="lbs.part='${m.part}';lbs.view='part';navTo('library')"><i class="fa-solid fa-arrow-left"></i> ${p.name}</button>
        <button class="btn btn-g btn-sm" onclick="libToggleSave('${m.id}')"><i class="fa-${saved?'solid':'regular'} fa-bookmark"></i> ${saved?'Saved':'Save'}</button>
        <button class="btn btn-p" onclick="libPrintMat('${m.id}')"><i class="fa-solid fa-download"></i> Download PDF</button>` })}

    <div class="split">
      <div class="card">
        <div class="card-hd">
          <div style="width:34px;height:34px;border-radius:11px;background:var(--leaf-700);color:#fff;display:grid;place-items:center"><i class="fa-solid ${k.ic}"></i></div>
          <div style="flex:1"><h3>${m.title}</h3><p>${m.pages} pages · ${m.level} · Bloom IELTS Academy</p></div>
          ${got?'<span class="tag ok"><i class="fa-solid fa-check"></i> Downloaded</span>':''}
        </div>
        <div class="card-bd" style="padding:28px 32px">
          ${m.body.map((s,i) => `
            <div style="margin-bottom:${i===m.body.length-1?0:26}px">
              <h4 style="font-family:var(--display);font-size:16.5px;font-weight:700;letter-spacing:-.3px;margin-bottom:11px;display:flex;gap:11px;align-items:baseline">
                <span style="font-family:var(--mono);font-size:11px;color:var(--leaf-500);font-weight:800">${String(i+1).padStart(2,'0')}</span>${s.h}</h4>
              ${s.p?`<p style="font-size:14px;line-height:1.75;color:var(--ink-2);margin-bottom:${s.list?12:0}px;text-wrap:pretty">${s.p}</p>`:''}
              ${s.list?`<div style="display:grid;gap:8px">${s.list.map(x=>`
                <div style="display:flex;gap:11px;align-items:flex-start;padding:10px 13px;background:var(--paper);border-radius:10px">
                  <i class="fa-solid fa-circle" style="font-size:5px;color:var(--leaf-500);margin-top:8px"></i>
                  <span style="font-size:13.5px;line-height:1.6;color:var(--ink-2)">${x}</span></div>`).join('')}</div>`:''}
            </div>`).join('')}
        </div>
        <div style="padding:18px 24px;border-top:1px solid var(--line);background:var(--paper);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--ink-4)">Print or save this as a PDF to work through offline.</span>
          <div style="flex:1"></div>
          <button class="btn btn-p" onclick="libPrintMat('${m.id}')"><i class="fa-solid fa-download"></i> Download PDF</button>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Practise this part</h3><p>Reading about it is half the job</p></div></div>
          <div class="card-bd" style="display:grid;gap:9px">
            ${p.skill!=='general'?`<button class="btn btn-p btn-blk" onclick="navTo('${p.skill}')"><i class="fa-solid ${skillMeta(p.skill).ic}"></i> Open ${skillMeta(p.skill).name} practice</button>`:''}
            ${m.kind==='wordlist'?`<button class="btn btn-g btn-blk" onclick="navTo('vocab')"><i class="fa-solid fa-spell-check"></i> Vocabulary trainer</button>`:''}
            ${m.part==='gv'?`<button class="btn btn-g btn-blk" onclick="navTo('grammar')"><i class="fa-solid fa-diagram-project"></i> Grammar Academy</button>`:''}
            <button class="btn btn-g btn-blk" onclick="navTo('tutor')"><i class="fa-solid fa-wand-magic-sparkles"></i> Ask Bloom Tutor about this</button>
          </div>
        </div>
        ${lecsFor(m.part).length?`
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Lectures on ${p.name}</h3></div></div>
          <div class="card-bd flush">
            ${lecsFor(m.part).map(l=>`<div class="row">
              <div class="ic sky"><i class="fa-solid fa-circle-play"></i></div>
              <div class="tx"><b class="clip">${l.title}</b><span>${l.tutor} · ${fmtDur(l.secs)}</span></div>
              <button class="btn btn-g btn-sm" onclick="libOpenLec('${l.id}')">Watch</button></div>`).join('')}
          </div>
        </div>`:''}
        ${others.length?`
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>More for this part</h3></div></div>
          <div class="card-bd flush">
            ${others.map(o=>`<div class="row">
              <div class="ic cor"><i class="fa-solid ${MAT_KINDS[o.kind].ic}"></i></div>
              <div class="tx"><b class="clip">${o.title}</b><span>${MAT_KINDS[o.kind].name} · ${o.pages} pages</span></div>
              <button class="btn btn-g btn-sm" onclick="libOpenMat('${o.id}')">Read</button></div>`).join('')}
          </div>
        </div>`:''}
      </div>
    </div>`;
}

function libPrintMat(id){
  const m = MATERIALS.find(x => x.id === id); if (!m) return;
  const p = partOf(m.part);
  const w = window.open('', '_blank');
  if (!w){ toast('Allow pop-ups to download this PDF'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(m.title)} — Bloom</title><style>
    @page{size:A4;margin:20mm 18mm}
    body{font-family:Georgia,'Times New Roman',serif;color:#12211a;font-size:11pt;line-height:1.65}
    .cover{page-break-after:always;display:flex;flex-direction:column;justify-content:center;min-height:230mm}
    .brand{font-family:system-ui,sans-serif;font-size:9pt;letter-spacing:3px;text-transform:uppercase;color:#5da35f;font-weight:800;margin-bottom:10px}
    .rule{width:70px;height:3px;background:#5da35f;margin:16px 0 26px}
    h1{font-family:system-ui,sans-serif;font-size:30pt;line-height:1.12;margin:0 0 14px;color:#14351d;letter-spacing:-1px}
    .sub{font-size:12pt;color:#5d7266;max-width:130mm;margin-bottom:34px}
    .meta{font-family:system-ui,sans-serif;font-size:9.5pt;color:#5d7266}
    .meta b{color:#12211a}
    .meta div{padding:5px 0;border-bottom:1px solid #e3ebe4;display:flex;justify-content:space-between;max-width:110mm}
    h2{font-family:system-ui,sans-serif;font-size:13pt;color:#1f5230;margin:24px 0 9px;padding-bottom:5px;border-bottom:1px solid #e3ebe4;break-after:avoid}
    h2 .n{color:#7fba7c;font-size:10pt;margin-right:9px}
    p{margin:0 0 11px;text-align:justify}
    ul{margin:0 0 13px;padding-left:20px}li{margin-bottom:6px}
    .ft{position:fixed;bottom:8mm;left:0;right:0;font-family:system-ui,sans-serif;font-size:8pt;color:#8b9d93;display:flex;justify-content:space-between}
    @media print{.ft{position:fixed}}
  </style></head><body>
    <div class="cover">
      <div class="brand">Bloom IELTS Academy</div>
      <div class="rule"></div>
      <h1>${esc(m.title)}</h1>
      <div class="sub">${esc(m.desc)}</div>
      <div class="meta">
        <div><span>Exam part</span><b>${esc(p.name)}</b></div>
        <div><span>Type</span><b>${MAT_KINDS[m.kind].name}</b></div>
        <div><span>Level</span><b>${m.level}</b></div>
        <div><span>Length</span><b>${m.pages} pages</b></div>
        <div><span>Prepared for</span><b>${esc(B.profile.name)}</b></div>
        <div><span>Downloaded</span><b>${today()}</b></div>
      </div>
    </div>
    ${m.body.map((s,i)=>`<h2><span class="n">${String(i+1).padStart(2,'0')}</span>${esc(s.h)}</h2>
      ${s.p?`<p>${s.p}</p>`:''}
      ${s.list?`<ul>${s.list.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}`).join('')}
    <div class="ft"><span>Bloom IELTS Academy · ${esc(m.title)}</span><span>${esc(p.name)}</span></div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 450);
  const st = libState();
  if (!st.downloaded.includes(m.id)){ st.downloaded.push(m.id); save(); addXP(15); }
  markActive(5);
  toast('Opening print view — choose “Save as PDF”', 'fa-file-pdf');
}

/* ═══ LECTURE PLAYER ═══ */
function libOpenLec(id){
  const w = libWatched(id);
  lbs.lec = id; lbs.view = 'lecture'; lbs.pos = w && !w.done ? w.pos : 0; lbs.playing = false;
  const l = LECTURES.find(x => x.id === id);
  lbs.ch = l ? Math.max(0, l.chapters.findIndex((c,i) => lbs.pos >= c.t && (i === l.chapters.length-1 || lbs.pos < l.chapters[i+1].t))) : 0;
  navTo('library');
}

function libLectureHTML(){
  const l = LECTURES.find(x => x.id === lbs.lec); if (!l) return libHomeHTML();
  const p = partOf(l.part);
  const w = libWatched(l.id), saved = libSaved(l.id);
  const ch = l.chapters[lbs.ch] || l.chapters[0];
  const others = lecsFor(l.part).filter(x => x.id !== l.id);
  return `
    ${phead({ eyebrow:`${p.name} · Lecture`, title:l.title.replace(/(\S+)$/,'<em>$1</em>'), sub:l.desc,
      actions:`<button class="btn btn-g btn-sm" onclick="libStopPlay();lbs.part='${l.part}';lbs.view='part';navTo('library')"><i class="fa-solid fa-arrow-left"></i> ${p.name}</button>
        <button class="btn btn-g btn-sm" onclick="libToggleSave('${l.id}')"><i class="fa-${saved?'solid':'regular'} fa-bookmark"></i> ${saved?'Saved':'Save'}</button>` })}

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card" style="overflow:hidden">
          <div style="aspect-ratio:16/9;background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 55%,var(--leaf-600));position:relative;display:flex;flex-direction:column;justify-content:flex-end">
            <div style="position:absolute;inset:0;opacity:.08;background:radial-gradient(circle at 80% 20%, #fff 0 30%, transparent 30%),radial-gradient(circle at 18% 78%, #fff 0 22%, transparent 22%)"></div>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center">
              <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--leaf-300);font-weight:800">Chapter ${lbs.ch+1} of ${l.chapters.length}</div>
              <div style="font-family:var(--display);font-size:25px;font-weight:700;color:#fff;letter-spacing:-.6px;line-height:1.2;max-width:520px">${ch.n}</div>
              <div style="font-size:13px;color:rgba(255,255,255,.68);max-width:460px;line-height:1.55">${ch.s}</div>
              <button class="btn" style="background:#fff;color:var(--leaf-800);width:62px;height:62px;border-radius:50%;padding:0;justify-content:center;font-size:19px;margin-top:6px" onclick="libTogglePlay()">
                <i class="fa-solid fa-${lbs.playing?'pause':'play'}" style="${lbs.playing?'':'margin-left:3px'}"></i></button>
            </div>
            <div style="position:relative;z-index:1;padding:0 18px 14px">
              <div style="position:relative;height:5px;background:rgba(255,255,255,.2);border-radius:4px;cursor:pointer" onclick="libSeek(event,${l.secs})">
                <div id="lbBar" style="width:${lbs.pos/l.secs*100}%;height:100%;background:var(--leaf-300);border-radius:4px"></div>
                ${l.chapters.map(c=>`<span style="position:absolute;left:${c.t/l.secs*100}%;top:-2px;width:2px;height:9px;background:rgba(255,255,255,.5);border-radius:2px"></span>`).join('')}
              </div>
              <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:rgba(255,255,255,.7);margin-top:7px">
                <span id="lbTime">${fmtTime(lbs.pos)}</span><span>${fmtTime(l.secs)}</span></div>
            </div>
          </div>
          <div class="card-bd" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <button class="icobtn" onclick="libSkip(-15)" title="Back 15s"><i class="fa-solid fa-rotate-left"></i></button>
            <button class="btn btn-p btn-sm" onclick="libTogglePlay()"><i class="fa-solid fa-${lbs.playing?'pause':'play'}"></i> ${lbs.playing?'Pause':'Play'}</button>
            <button class="icobtn" onclick="libSkip(15)" title="Forward 15s"><i class="fa-solid fa-rotate-right"></i></button>
            <div style="flex:1"></div>
            <div style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4)">${l.tutor}</div>
            <button class="btn btn-g btn-sm" onclick="libMarkWatched('${l.id}')"><i class="fa-solid fa-check"></i> ${w?.done?'Watched':'Mark watched'}</button>
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Chapters</h3><p>Jump to any section</p></div></div>
          <div class="card-bd flush">
            ${l.chapters.map((c,i)=>`<div class="row" style="cursor:pointer;${i===lbs.ch?'background:var(--leaf-50)':''}" onclick="libGoCh(${i})">
              <div style="width:34px;font-family:var(--mono);font-size:11px;color:${i===lbs.ch?'var(--leaf-700)':'var(--ink-4)'};font-weight:${i===lbs.ch?'800':'400'}">${fmtTime(c.t)}</div>
              <div class="tx"><b style="${i===lbs.ch?'color:var(--leaf-700)':''}">${c.n}</b><span>${c.s}</span></div>
              ${i===lbs.ch?'<i class="fa-solid fa-volume-high" style="color:var(--leaf-600)"></i>':`<i class="fa-solid fa-play" style="color:var(--line-2);font-size:11px"></i>`}
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Your tutor</h3></div></div>
          <div class="card-bd" style="display:flex;gap:13px;align-items:center">
            <div style="width:46px;height:46px;flex:0 0 46px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:14px;font-weight:800">${initials(l.tutor.replace(/^(Dr\.|Prof\.)\s*/,''))}</div>
            <div><b style="font-size:14px;display:block">${l.tutor}</b><span style="font-size:12px;color:var(--ink-4)">${l.role}</span></div>
          </div>
        </div>
        ${matsFor(l.part).length?`
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Materials for this part</h3><p>Work through these alongside the lecture</p></div></div>
          <div class="card-bd flush">
            ${matsFor(l.part).map(m=>`<div class="row">
              <div class="ic cor"><i class="fa-solid ${MAT_KINDS[m.kind].ic}"></i></div>
              <div class="tx"><b class="clip">${m.title}</b><span>${MAT_KINDS[m.kind].name} · ${m.pages} pages</span></div>
              <button class="btn btn-g btn-sm" onclick="libStopPlay();libOpenMat('${m.id}')">Open</button></div>`).join('')}
          </div>
        </div>`:''}
        ${p.skill!=='general'?`
        <div class="card" style="border-color:var(--leaf-500)"><div class="card-bd">
          <div style="font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-bottom:13px">Watching is not practising. Apply this straight away while it is fresh.</div>
          <button class="btn btn-p btn-blk" onclick="libStopPlay();navTo('${p.skill}')"><i class="fa-solid ${skillMeta(p.skill).ic}"></i> Practise ${skillMeta(p.skill).name} now</button>
        </div></div>`:''}
        ${others.length?`
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>More lectures</h3></div></div>
          <div class="card-bd flush">
            ${others.map(o=>`<div class="row">
              <div class="ic sky"><i class="fa-solid fa-circle-play"></i></div>
              <div class="tx"><b class="clip">${o.title}</b><span>${fmtDur(o.secs)} · ${o.chapters.length} chapters</span></div>
              <button class="btn btn-g btn-sm" onclick="libStopPlay();libOpenLec('${o.id}')">Watch</button></div>`).join('')}
          </div>
        </div>`:''}
      </div>
    </div>`;
}

function libTogglePlay(){
  const l = LECTURES.find(x => x.id === lbs.lec); if (!l) return;
  lbs.playing = !lbs.playing;
  if (!lbs.playing){ clearInterval(lbs.timer); libSavePos(l); navTo('library'); return; }
  clearInterval(lbs.timer);
  lbs.timer = setInterval(() => {
    if (B.section !== 'library' || lbs.view !== 'lecture'){ clearInterval(lbs.timer); lbs.playing = false; return; }
    lbs.pos += 3;                                   /* 3× so a 20-minute lecture plays through in ~7 */
    const bar = document.getElementById('lbBar'), tm = document.getElementById('lbTime');
    if (bar) bar.style.width = Math.min(100, lbs.pos / l.secs * 100) + '%';
    if (tm) tm.textContent = fmtTime(Math.min(l.secs, lbs.pos));
    const ci = l.chapters.reduce((acc,c,i) => lbs.pos >= c.t ? i : acc, 0);
    if (ci !== lbs.ch){ lbs.ch = ci; libSavePos(l); navTo('library'); return; }
    if (lbs.pos >= l.secs){ clearInterval(lbs.timer); lbs.playing = false; lbs.pos = l.secs; libMarkWatched(l.id); }
  }, 1000);
  navTo('library');
}
function libStopPlay(){ clearInterval(lbs.timer); lbs.playing = false; const l = LECTURES.find(x=>x.id===lbs.lec); if (l) libSavePos(l); }
function libSavePos(l){
  const st = libState();
  const prev = st.watched[l.id] || {};
  st.watched[l.id] = { pos:Math.min(lbs.pos, l.secs), done: prev.done || lbs.pos >= l.secs - 5, at:today() };
  save();
}
function libSkip(n){
  const l = LECTURES.find(x => x.id === lbs.lec); if (!l) return;
  lbs.pos = Math.max(0, Math.min(l.secs, lbs.pos + n));
  lbs.ch = l.chapters.reduce((acc,c,i) => lbs.pos >= c.t ? i : acc, 0);
  libSavePos(l); navTo('library');
}
function libSeek(e, secs){
  const r = e.currentTarget.getBoundingClientRect();
  lbs.pos = Math.round((e.clientX - r.left) / r.width * secs);
  const l = LECTURES.find(x => x.id === lbs.lec);
  if (l){ lbs.ch = l.chapters.reduce((acc,c,i) => lbs.pos >= c.t ? i : acc, 0); libSavePos(l); }
  navTo('library');
}
function libGoCh(i){
  const l = LECTURES.find(x => x.id === lbs.lec); if (!l) return;
  lbs.ch = i; lbs.pos = l.chapters[i].t; libSavePos(l); navTo('library');
}
function libMarkWatched(id){
  const l = LECTURES.find(x => x.id === id); if (!l) return;
  const st = libState();
  const already = st.watched[id]?.done;
  st.watched[id] = { pos:l.secs, done:true, at:today() };
  save();
  if (!already){ addXP(40); markActive(Math.round(l.secs/60)); toast('Lecture complete · +40 XP', 'fa-circle-check'); }
  clearInterval(lbs.timer); lbs.playing = false;
  navTo('library');
}


/* ═══════════════════════════════════════════════════════════════
   AUDIO — cards, player, transcript and progress
═══════════════════════════════════════════════════════════════ */

function audCard(a){
  const k = AUDIO_KINDS[a.kind] || AUDIO_KINDS.track;
  const h = libHeard(a.id), saved = libSaved(a.id);
  const prog = h ? pct(h.pos, a.secs) : 0;
  const [bg,fg] = toneVars(k.tone);
  return `<div class="card" style="overflow:hidden"><div class="card-bd" style="padding:0">
    <div style="padding:17px 19px;background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 70%);position:relative;cursor:pointer" onclick="libOpenAud('${a.id}')">
      <div style="position:absolute;inset:0;opacity:.07;background:radial-gradient(circle at 86% 18%, #fff 0 32%, transparent 32%)"></div>
      <div style="position:relative;z-index:1;display:flex;gap:13px;align-items:center">
        <div style="width:42px;height:42px;flex:0 0 42px;border-radius:50%;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.34);display:grid;place-items:center;color:#fff;font-size:14px">
          <i class="fa-solid ${h?.done?'fa-check':'fa-play'}" style="${h?.done?'':'margin-left:2px'}"></i></div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:7px;align-items:center;margin-bottom:5px;flex-wrap:wrap">
            <span style="font-size:8.5px;letter-spacing:1.3px;text-transform:uppercase;font-weight:800;color:var(--leaf-300)">${k.name}</span>
            ${a.hot?'<span style="font-size:8px;letter-spacing:1.1px;text-transform:uppercase;font-weight:800;background:var(--amber);color:#fff;padding:2px 7px;border-radius:5px">Start here</span>':''}
          </div>
          <div style="display:flex;gap:10px;align-items:baseline;font-family:var(--mono);font-size:10.5px;color:rgba(255,255,255,.62)">
            <span>${fmtTime(a.secs)}</span><span>·</span><span>${a.level}</span>
            ${a.accent?`<span>·</span><span>${a.accent}</span>`:''}
            ${a.speakers?`<span>·</span><span>${a.speakers} speaker${a.speakers===1?'':'s'}</span>`:''}
          </div>
        </div>
      </div>
      ${prog>0&&!h?.done?`<div style="position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.2);z-index:2"><div style="width:${prog}%;height:100%;background:var(--amber)"></div></div>`:''}
    </div>
    <div style="padding:15px 19px 18px">
      <b style="font-size:14.5px;font-weight:700;display:block;line-height:1.28;margin-bottom:7px">${a.title}</b>
      <div style="font-size:12px;color:var(--ink-3);line-height:1.55;margin-bottom:12px;text-wrap:pretty">${a.desc}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px">
        ${(a.focus||[]).slice(0,2).map(f=>`<span class="tag" style="background:${bg};color:${fg}">${f}</span>`).join('')}
        ${(a.focus||[]).length>2?`<span class="tag">+${a.focus.length-2}</span>`:''}
      </div>
      <div style="display:flex;gap:7px;align-items:center">
        <button class="btn btn-p btn-sm" onclick="libOpenAud('${a.id}')"><i class="fa-solid fa-headphones"></i> ${prog>0&&!h?.done?'Resume':h?.done?'Listen again':'Listen'}</button>
        <button class="icobtn" style="width:30px;height:30px;font-size:11px;margin-left:auto;${saved?'color:var(--amber);border-color:var(--amber)':''}" onclick="libToggleSave('${a.id}')"><i class="fa-${saved?'solid':'regular'} fa-bookmark"></i></button>
      </div>
    </div>
  </div></div>`;
}

function libOpenAud(id){
  libStopAud();
  const h = libHeard(id);
  lbs.aud = id; lbs.view = 'audio';
  lbs.pos = h && !h.done ? h.pos : 0;
  lbs.playing = false; lbs.line = -1; lbs.script = false;
  navTo('library');
}

function audLineAt(a, pos){
  const per = a.secs / a.script.length;
  return Math.max(0, Math.min(a.script.length - 1, Math.floor(pos / per)));
}

function libAudioHTML(){
  const a = AUDIO.find(x => x.id === lbs.aud); if (!a) return libHomeHTML();
  const p = partOf(a.part), k = AUDIO_KINDS[a.kind] || AUDIO_KINDS.track;
  const h = libHeard(a.id), saved = libSaved(a.id);
  const li = audLineAt(a, lbs.pos);
  const others = audFor(a.part).filter(x => x.id !== a.id);
  const isListening = p.skill === 'listening';
  return `
    ${phead({ eyebrow:`${p.name} · ${k.name}`, title:a.title.replace(/(\S+)$/,'<em>$1</em>'), sub:a.desc,
      actions:`<button class="btn btn-g btn-sm" onclick="libStopAud();lbs.part='${a.part}';lbs.view='part';navTo('library')"><i class="fa-solid fa-arrow-left"></i> ${p.name}</button>
        <button class="btn btn-g btn-sm" onclick="libToggleSave('${a.id}')"><i class="fa-${saved?'solid':'regular'} fa-bookmark"></i> ${saved?'Saved':'Save'}</button>` })}

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card" style="overflow:hidden">
          <div style="background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700) 58%,var(--leaf-600));padding:30px 28px;position:relative">
            <div style="position:absolute;inset:0;opacity:.07;background:radial-gradient(circle at 82% 20%, #fff 0 30%, transparent 30%),radial-gradient(circle at 16% 80%, #fff 0 22%, transparent 22%)"></div>
            <div style="position:relative;z-index:1">
              <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:22px">
                <button class="btn" style="background:#fff;color:var(--leaf-800);width:62px;height:62px;border-radius:50%;padding:0;justify-content:center;flex:0 0 62px;font-size:19px" onclick="libToggleAud()">
                  <i class="fa-solid fa-${lbs.playing?'pause':'play'}" style="${lbs.playing?'':'margin-left:3px'}"></i></button>
                <div style="flex:1;min-width:180px">
                  <div style="font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;margin-bottom:8px">${k.name} · ${a.level}${a.accent?' · '+a.accent+' accent':''}</div>
                  <div style="display:flex;gap:3px;align-items:flex-end;height:30px;margin-bottom:10px" id="audWave">
                    ${Array.from({length:44},(_,i)=>`<span style="flex:1;border-radius:2px;background:rgba(255,255,255,${i/44*0.35+0.18});height:${4+((i*37)%22)}px;transition:height .2s"></span>`).join('')}
                  </div>
                  <div style="position:relative;height:5px;background:rgba(255,255,255,.2);border-radius:4px;cursor:pointer" onclick="libAudSeek(event,${a.secs})">
                    <div id="audBar" style="width:${lbs.pos/a.secs*100}%;height:100%;background:var(--leaf-300);border-radius:4px"></div></div>
                  <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:rgba(255,255,255,.7);margin-top:7px">
                    <span id="audTime">${fmtTime(lbs.pos)}</span><span>${fmtTime(a.secs)}</span></div>
                </div>
              </div>
              <div id="audCap" style="min-height:62px;padding:14px 17px;background:rgba(0,0,0,.22);border-radius:12px;font-size:14.5px;line-height:1.6;color:rgba(255,255,255,.94)">
                ${lbs.playing || lbs.pos > 0
                  ? `<span style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;display:block;margin-bottom:6px">Now playing · line ${li+1} of ${a.script.length}</span>${esc(a.script[li])}`
                  : `<span style="color:rgba(255,255,255,.5)">${isListening?'Press play and answer as you listen. The transcript stays hidden until you finish — as in the real exam.':'Press play. The transcript follows along underneath.'}</span>`}
              </div>
            </div>
          </div>
          <div class="card-bd" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <button class="icobtn" onclick="libAudSkip(-10)" title="Back 10s"><i class="fa-solid fa-rotate-left"></i></button>
            <button class="btn btn-p btn-sm" onclick="libToggleAud()"><i class="fa-solid fa-${lbs.playing?'pause':'play'}"></i> ${lbs.playing?'Pause':'Play'}</button>
            <button class="icobtn" onclick="libAudSkip(10)" title="Forward 10s"><i class="fa-solid fa-rotate-right"></i></button>
            <button class="icobtn" onclick="libAudRestart()" title="Start again"><i class="fa-solid fa-backward-fast"></i></button>
            <div style="flex:1"></div>
            <button class="btn btn-g btn-sm" onclick="libMarkHeard('${a.id}')"><i class="fa-solid fa-check"></i> ${h?.done?'Completed':'Mark complete'}</button>
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Transcript</h3><p>${isListening?'Check it only after you have answered — otherwise you are reading, not listening':'Follow along or read afterwards'}</p></div>
            <button class="icobtn" onclick="lbs.script=!lbs.script;navTo('library')"><i class="fa-solid fa-${lbs.script?'eye-slash':'eye'}"></i></button></div>
          ${lbs.script ? `<div class="card-bd" style="display:grid;gap:9px;max-height:420px;overflow-y:auto">
            ${a.script.map((line,i)=>`<div style="display:flex;gap:12px;padding:9px 11px;border-radius:9px;background:${i===li&&(lbs.playing||lbs.pos>0)?'var(--leaf-50)':'transparent'};cursor:pointer" onclick="libAudGoLine(${i})">
              <span style="font-family:var(--mono);font-size:10.5px;color:${i===li?'var(--leaf-700)':'var(--ink-4)'};flex:0 0 38px;padding-top:2px;font-weight:${i===li?'800':'400'}">${fmtTime(Math.round(i*a.secs/a.script.length))}</span>
              <span style="font-size:13.5px;line-height:1.6;color:var(--ink-2)">${esc(line)}</span></div>`).join('')}
          </div>`
          : `<div class="card-bd" style="text-align:center;padding:28px">
              <button class="btn btn-g btn-sm" onclick="lbs.script=true;navTo('library')"><i class="fa-solid fa-file-lines"></i> Reveal the transcript</button>
              <div style="font-size:11.5px;color:var(--ink-4);margin-top:10px">${a.script.length} lines</div></div>`}
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>What to listen for</h3><p>The specific skills this track drills</p></div></div>
          <div class="card-bd" style="display:grid;gap:10px">
            ${(a.focus||[]).map(f=>`<div style="display:flex;gap:11px;align-items:flex-start;font-size:13px;color:var(--ink-2);line-height:1.55">
              <i class="fa-solid fa-circle-dot" style="color:var(--leaf-500);font-size:7px;margin-top:6px"></i><span>${f}</span></div>`).join('')}
          </div>
        </div>
        ${isListening ? `
        <div class="card" style="border-color:var(--leaf-500)"><div class="card-bd">
          <div style="font-size:12.5px;color:var(--ink-3);line-height:1.65;margin-bottom:13px">Listening to a track is not the same as answering questions against the clock. Do the matching practice while this is fresh.</div>
          <button class="btn btn-p btn-blk" onclick="libStopAud();navTo('listening')"><i class="fa-solid fa-headphones"></i> Listening practice</button>
        </div></div>` : p.skill!=='general' ? `
        <div class="card" style="border-color:var(--leaf-500)"><div class="card-bd">
          <button class="btn btn-p btn-blk" onclick="libStopAud();navTo('${p.skill}')"><i class="fa-solid ${skillMeta(p.skill).ic}"></i> Practise ${skillMeta(p.skill).name} now</button>
        </div></div>` : ''}
        ${matsFor(a.part).length?`
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Notes for this part</h3></div></div>
          <div class="card-bd flush">
            ${matsFor(a.part).map(m=>`<div class="row">
              <div class="ic amb"><i class="fa-solid ${MAT_KINDS[m.kind].ic}"></i></div>
              <div class="tx"><b class="clip">${m.title}</b><span>${MAT_KINDS[m.kind].name} · ${m.pages} pages</span></div>
              <button class="btn btn-g btn-sm" onclick="libStopAud();libOpenMat('${m.id}')">Open</button></div>`).join('')}
          </div>
        </div>`:''}
        ${others.length?`
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>More audio</h3></div></div>
          <div class="card-bd flush">
            ${others.map(o=>`<div class="row">
              <div class="ic cor"><i class="fa-solid ${(AUDIO_KINDS[o.kind]||AUDIO_KINDS.track).ic}"></i></div>
              <div class="tx"><b class="clip">${o.title}</b><span>${fmtDur(o.secs)} · ${o.level}</span></div>
              <button class="btn btn-g btn-sm" onclick="libOpenAud('${o.id}')">Listen</button></div>`).join('')}
          </div>
        </div>`:''}
      </div>
    </div>`;
}

/* ── audio transport ── */
function libToggleAud(){
  const a = AUDIO.find(x => x.id === lbs.aud); if (!a) return;
  lbs.playing = !lbs.playing;
  if (!lbs.playing){ clearInterval(lbs.timer); libSaveAud(a); navTo('library'); return; }
  clearInterval(lbs.timer);
  lbs.timer = setInterval(() => {
    if (B.section !== 'library' || lbs.view !== 'audio'){ clearInterval(lbs.timer); lbs.playing = false; return; }
    lbs.pos += 2;                                  /* 2× so a 5-minute track plays through in about 2.5 */
    const bar = document.getElementById('audBar'), tm = document.getElementById('audTime'), cap = document.getElementById('audCap'), w = document.getElementById('audWave');
    if (bar) bar.style.width = Math.min(100, lbs.pos / a.secs * 100) + '%';
    if (tm) tm.textContent = fmtTime(Math.min(a.secs, lbs.pos));
    if (w) [...w.children].forEach(b => b.style.height = (4 + Math.random() * 26) + 'px');
    const li = audLineAt(a, lbs.pos);
    if (li !== lbs.line){
      lbs.line = li;
      if (cap) cap.innerHTML = '<span style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;display:block;margin-bottom:6px">Now playing · line ' + (li+1) + ' of ' + a.script.length + '</span>' + esc(a.script[li]);
      if (lbs.script) navTo('library');
    }
    if (lbs.pos >= a.secs){ clearInterval(lbs.timer); lbs.playing = false; lbs.pos = a.secs; libMarkHeard(a.id); }
  }, 1000);
  navTo('library');
}
function libStopAud(){ clearInterval(lbs.timer); lbs.playing = false; const a = AUDIO.find(x=>x.id===lbs.aud); if (a) libSaveAud(a); }
function libSaveAud(a){
  const st = libState();
  st.heard = st.heard || {};
  const prev = st.heard[a.id] || {};
  st.heard[a.id] = { pos:Math.min(lbs.pos, a.secs), done: prev.done || lbs.pos >= a.secs - 4, at:today() };
  save();
}
function libAudSkip(n){
  const a = AUDIO.find(x => x.id === lbs.aud); if (!a) return;
  lbs.pos = Math.max(0, Math.min(a.secs, lbs.pos + n));
  lbs.line = -1; libSaveAud(a); navTo('library');
}
function libAudSeek(e, secs){
  const r = e.currentTarget.getBoundingClientRect();
  lbs.pos = Math.max(0, Math.min(secs, Math.round((e.clientX - r.left) / r.width * secs)));
  lbs.line = -1;
  const a = AUDIO.find(x => x.id === lbs.aud); if (a) libSaveAud(a);
  navTo('library');
}
function libAudGoLine(i){
  const a = AUDIO.find(x => x.id === lbs.aud); if (!a) return;
  lbs.pos = Math.round(i * a.secs / a.script.length);
  lbs.line = i; libSaveAud(a); navTo('library');
}
function libAudRestart(){ clearInterval(lbs.timer); lbs.playing = false; lbs.pos = 0; lbs.line = -1; navTo('library'); }
function libMarkHeard(id){
  const a = AUDIO.find(x => x.id === id); if (!a) return;
  const st = libState();
  st.heard = st.heard || {};
  const already = st.heard[id] && st.heard[id].done;
  st.heard[id] = { pos:a.secs, done:true, at:today() };
  save();
  clearInterval(lbs.timer); lbs.playing = false;
  if (!already){ addXP(30); markActive(Math.round(a.secs/60)); toast('Audio complete · +30 XP', 'fa-circle-check'); }
  navTo('library');
}
