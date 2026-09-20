/* ═══ BLOOM — Reading Academy + Listening Academy ═══ */

let rs = { view:'home', id:null, ans:{}, submitted:false, started:null, timer:null, left:0, showText:true };
let ls = { view:'home', id:null, ans:{}, submitted:false, played:0, playing:false, timer:null, showScript:false };

/* ─────────────── READING ─────────────── */
function rItems(p){ return p.qs.flatMap((g,gi) => g.items.map((it,i) => ({ ...it, g, gi, i, key:gi+'-'+i }))); }
function rIsRight(it, given){
  if (given == null) return false;
  if (it.o) return given === it.c;
  const a = String(it.a).toLowerCase().trim();
  return String(given).toLowerCase().trim().replace(/[.,]/g,'') === a.replace(/[.,]/g,'');
}
function rScore(p){
  const items = rItems(p);
  const right = items.filter(it => rIsRight(it, rs.ans[it.key])).length;
  return { right, total:items.length, pct:pct(right, items.length), band:rawToBand(right, items.length) };
}
/* IELTS Academic Reading raw→band, scaled proportionally for shorter sets */
function rawToBand(right, total){
  const scaled = Math.round(right / total * 40);
  const table = [[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[8,3.5],[6,3]];
  for (const [min, b] of table) if (scaled >= min) return b;
  return 2.5;
}

function sec_reading(){
  if (rs.view === 'test') return rTestHTML();
  if (rs.view === 'result') return rResultHTML();
  return rHomeHTML();
}

function rHomeHTML(){
  const runs = B.readRuns;
  const last = runs[0];
  const byType = {};
  runs.forEach(r => Object.entries(r.byType||{}).forEach(([k,v]) => { byType[k] = byType[k]||{c:0,n:0}; byType[k].c += v.c; byType[k].n += v.n; }));
  const weakType = Object.entries(byType).filter(([,v])=>v.n>=3).sort((a,b)=>(a[1].c/a[1].n)-(b[1].c/b[1].n))[0];
  const avgWPM = (() => { const v = runs.map(r=>r.wpm).filter(x=>x); return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : 0; })();
  return `
    ${phead({ eyebrow:'Reading Academy', title:`Reading <em>practice</em>`,
      sub:'Full IELTS passages with every question type. Bloom tracks your accuracy by question type and your reading speed, because those are the two things that actually decide your band.',
      actions:`<button class="btn btn-p" onclick="rStart('${readingBank()[0].id}')"><i class="fa-solid fa-play"></i> Start a passage</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Current band', B.scores.reading!=null?bandLabel(B.scores.reading):'—', 'Target ' + bandLabel(B.profile.target), 'leaf', 'fa-book-open')}
      ${statCard('Passages done', runs.length, runs.length?'Last: '+last.pct+'%':'None yet', 'sky', 'fa-list-check')}
      ${statCard('Reading speed', avgWPM?avgWPM+' wpm':'—', avgWPM?(avgWPM>=200?'Fast enough for the exam':'Aim for 200+ wpm'):'Complete a timed passage', avgWPM>=200?'leaf':'amb', 'fa-gauge-high')}      ${statCard('Weakest question type', weakType?qTypeName(weakType[0]):'—', weakType?Math.round(weakType[1].c/weakType[1].n*100)+'% correct':'Needs more data', 'cor', 'fa-triangle-exclamation')}
    </div>

    ${Object.keys(byType).length ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Accuracy by question type</h3><p>Where your marks are actually going</p></div></div>
      <div class="card-bd">
        ${Object.entries(byType).sort((a,b)=>(a[1].c/a[1].n)-(b[1].c/b[1].n)).map(([k,v])=>{
          const p2 = Math.round(v.c/v.n*100);
          return `<div class="prow"><div class="lb"><span>${qTypeName(k)}</span><b>${v.c}/${v.n} · ${p2}%</b></div>
            <div class="bar"><i style="width:${p2}%;background:${p2>=70?'var(--ok)':p2>=50?'var(--amber)':'var(--coral)'}"></i></div></div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="grid g2">
      ${readingBank().map(p => {
        const done = runs.filter(r => r.id === p.id);
        return `<div class="card">
          <div class="card-bd" style="padding:19px 21px">
            <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
              <span class="tag leaf">${examOf(p.exam).short}</span><span class="tag">${p.level}</span><span class="tag amb">Band ${p.band}+</span>
              ${done.length?`<span class="tag ok" style="margin-left:auto">Best ${Math.max(...done.map(d=>d.pct))}%</span>`:''}
            </div>
            <b style="font-family:var(--display);font-size:19px;font-weight:700;letter-spacing:-.4px;display:block;line-height:1.2">${p.title}</b>
            <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4);margin:6px 0 12px">${p.topic} · ${p.words} words · ${p.mins} min · ${rItems(p).length} questions</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:15px">${p.qs.map(g=>`<span class="tag sky">${qTypeName(g.type)}</span>`).join('')}</div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-p btn-sm" style="flex:1;justify-content:center" onclick="rStart('${p.id}')"><i class="fa-solid fa-play"></i> ${done.length?'Retake':'Start'} (timed)</button>
              <button class="btn btn-g btn-sm" onclick="rStart('${p.id}',true)">Untimed</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
function qTypeName(t){
  return ({ headings:'Matching headings', tfng:'True / False / Not Given', ynng:'Yes / No / Not Given', mcq:'Multiple choice', completion:'Sentence & summary completion', matching:'Matching information' })[t] || t;
}

function rStart(id, untimed){
  const p = readingById(id);
  rs = { view:'test', id, ans:{}, submitted:false, started:Date.now(), left: untimed ? null : p.mins*60, timer:null, showText:true };
  navTo('reading');
  if (!untimed) rTick();
}
function rTick(){
  clearInterval(rs.timer);
  rs.timer = setInterval(() => {
    if (B.section !== 'reading' || rs.view !== 'test'){ clearInterval(rs.timer); return; }
    rs.left--;
    const el = document.getElementById('rClock');
    if (el){ el.textContent = fmtClock(rs.left); if (rs.left < 120) el.style.color = 'var(--coral)'; }
    if (rs.left <= 0){ clearInterval(rs.timer); rSubmit(true); }
  }, 1000);
}
function fmtClock(s){ if (s == null) return '—'; const m = Math.floor(Math.max(0,s)/60); return String(m).padStart(2,'0') + ':' + String(Math.max(0,s)%60).padStart(2,'0'); }

function rTestHTML(){
  const p = readingById(rs.id);
  const items = rItems(p);
  const answered = items.filter(it => rs.ans[it.key] != null && rs.ans[it.key] !== '').length;
  return `
    ${phead({ eyebrow:'Reading · ' + examOf(p.exam).short, title:p.title.replace(/\s(\w+)$/,' <em>$1</em>'), sub:p.intro,
      actions:`<div style="display:flex;gap:9px;align-items:center">
        ${rs.left!=null?`<div style="display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:11px;background:var(--paper-2);font-family:var(--mono);font-weight:700;font-size:14px"><i class="fa-regular fa-clock" style="color:var(--ink-4)"></i><span id="rClock">${fmtClock(rs.left)}</span></div>`:'<span class="tag">Untimed</span>'}
        <button class="btn btn-g btn-sm" onclick="rQuit()">Exit</button>
        <button class="btn btn-p btn-sm" onclick="rSubmit()"><i class="fa-solid fa-flag-checkered"></i> Submit</button></div>` })}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start" class="rsplit">
      <div class="card" style="position:sticky;top:74px;max-height:calc(100vh - 100px);overflow-y:auto">
        <div class="card-hd"><div style="flex:1"><h3>Passage</h3><p>${p.source}</p></div>
          <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${p.words} words</span></div>
        <div class="card-bd" style="font-size:14.5px;line-height:1.75;color:var(--ink-2)">
          ${p.paras.map(pa => `<div style="margin-bottom:16px;display:flex;gap:13px">
            <div style="flex:0 0 22px;font-family:var(--mono);font-size:12px;font-weight:800;color:var(--leaf-600);padding-top:2px">${pa.k}</div>
            <div style="text-wrap:pretty">${pa.t}</div></div>`).join('')}
        </div>
      </div>

      <div style="display:grid;gap:16px">
        ${p.qs.map((g,gi) => `
          <div class="card">
            <div class="card-hd"><div style="flex:1"><h3>${qTypeName(g.type)}</h3><p>${g.instr}</p></div></div>
            <div class="card-bd">
              ${g.bank ? `<div style="padding:13px 15px;background:var(--paper);border-radius:12px;margin-bottom:16px;display:grid;gap:5px;font-size:12.5px;color:var(--ink-2)">${g.bank.map(b=>`<div>${b}</div>`).join('')}</div>` : ''}
              <div style="display:grid;gap:14px">
                ${g.items.map((it,i) => {
                  const key = gi+'-'+i;
                  const v = rs.ans[key];
                  if (g.type === 'mcq') return `<div>
                    <div style="font-size:13.5px;font-weight:600;margin-bottom:9px">${qNum(p,gi,i)}. ${it.q}</div>
                    <div class="opts">${it.o.map((o,oi)=>`<div class="opt ${v===oi?'sel':''}" style="padding:10px 13px" onclick="rSet('${key}',${oi})"><div class="k" style="width:22px;height:22px;flex:0 0 22px;font-size:10px">${String.fromCharCode(65+oi)}</div><div class="x" style="font-size:13px">${o}</div></div>`).join('')}</div></div>`;
                  if (g.type === 'tfng' || g.type === 'ynng'){
                    const opts = g.type==='tfng' ? ['TRUE','FALSE','NOT GIVEN'] : ['YES','NO','NOT GIVEN'];
                    return `<div>
                      <div style="font-size:13.5px;font-weight:600;margin-bottom:9px">${qNum(p,gi,i)}. ${it.q}</div>
                      <div style="display:flex;gap:7px;flex-wrap:wrap">${opts.map(o=>`<button class="pill ${v===o?'on':''}" onclick="rSet('${key}','${o}')">${o}</button>`).join('')}</div></div>`;
                  }
                  if (g.type === 'headings' || g.type === 'matching'){
                    const letters = (g.bank||[]).map(b => b.split('.')[0].trim());
                    return `<div style="display:flex;gap:12px;align-items:center">
                      <div style="flex:1;font-size:13.5px;font-weight:600">${qNum(p,gi,i)}. ${it.q}</div>
                      <select style="width:110px;border:1.5px solid var(--line-2);border-radius:10px;padding:8px 10px;font-family:var(--mono);font-size:13px;background:var(--surface);color:var(--ink)" onchange="rSet('${key}',this.value)">
                        <option value="">—</option>${letters.map(l=>`<option ${v===l?'selected':''}>${l}</option>`).join('')}</select></div>`;
                  }
                  return `<div>
                    <div style="font-size:13.5px;font-weight:600;margin-bottom:9px">${qNum(p,gi,i)}. ${it.q.replace('______','<span style="display:inline-block;min-width:96px;border-bottom:2px dotted var(--line-2)"></span>')}</div>
                    <input value="${esc(v||'')}" placeholder="Your answer" style="border:1.5px solid var(--line-2);border-radius:10px;padding:9px 12px;font-family:inherit;font-size:13.5px;background:var(--surface);color:var(--ink);width:100%;max-width:280px" oninput="rs.ans['${key}']=this.value"></div>`;
                }).join('')}
              </div>
            </div>
          </div>`).join('')}

        <div class="card"><div class="card-bd" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <span style="font-family:var(--mono);font-size:12px;color:var(--ink-4)">${answered} of ${items.length} answered</span>
          <div style="flex:1"></div>
          <button class="btn btn-p" onclick="rSubmit()"><i class="fa-solid fa-flag-checkered"></i> Submit answers</button>
        </div></div>
      </div>
    </div>
    <style>@media(max-width:1080px){.rsplit{grid-template-columns:1fr!important}.rsplit>.card:first-child{position:static!important;max-height:420px}}</style>`;
}
function qNum(p, gi, i){ let n = 1; for (let x = 0; x < gi; x++) n += p.qs[x].items.length; return n + i; }
function rSet(k, v){ rs.ans[k] = v; navTo('reading'); }
function rQuit(){ clearInterval(rs.timer); rs.view = 'home'; navTo('reading'); }

function rSubmit(auto){
  const p = readingById(rs.id);
  const items = rItems(p);
  const un = items.filter(it => rs.ans[it.key] == null || rs.ans[it.key] === '').length;
  if (!auto && un && !confirm(un + ' question' + (un>1?'s':'') + ' unanswered. Submit anyway?')) return;
  clearInterval(rs.timer);
  const sc = rScore(p);
  const secs = Math.max(30, Math.round((Date.now() - rs.started) / 1000));
  const wpm = secs >= 45 ? Math.min(600, Math.round(p.words / (secs / 60))) : null;
  const byType = {};
  items.forEach(it => { const t = it.g.type; byType[t] = byType[t] || { c:0, n:0 }; byType[t].n++; if (rIsRight(it, rs.ans[it.key])) byType[t].c++; });
  const run = { id:p.id, title:p.title, date:today(), ...sc, secs, wpm, byType, ans:{ ...rs.ans } };
  B.readRuns.unshift(run); B.readRuns = B.readRuns.slice(0,30);
  B.scores.reading = B.scores.reading == null ? sc.band : roundBand(B.scores.reading * 0.6 + sc.band * 0.4);
  B.history.push({ at:today(), kind:'reading', band:sc.band });
  save(); markActive(Math.round(secs/60)); addXP(sc.right * 6);
  if (B.scores.reading >= 7 && overallBand(B.scores) >= 7) earn('band-7');
  if (typeof mockCapture === 'function' && mockCapture('reading', sc.band)){ rs.view = 'result'; navTo('reading'); return; }
  rs.view = 'result'; rs.submitted = true; navTo('reading');
  if (auto) toast('Time is up — answers submitted', 'fa-clock');
}

function rResultHTML(){
  const p = readingById(rs.id);
  const run = B.readRuns[0];
  const items = rItems(p);
  return `
    ${phead({ eyebrow:'Reading result', title:`Band <em>${bandLabel(run.band)}</em>`, sub:`${run.right} of ${run.total} correct in ${Math.round(run.secs/60)} minutes${run.wpm?` — that is ${run.wpm} words per minute`:''}.`,
      actions:`<button class="btn btn-g btn-sm" onclick="rs.view='home';navTo('reading')">All passages</button><button class="btn btn-p" onclick="rStart('${p.id}')"><i class="fa-solid fa-rotate-right"></i> Retake</button>` })}

    <div class="card mb2"><div class="card-bd" style="display:flex;gap:30px;align-items:center;flex-wrap:wrap">
      ${ringHTML(run.pct, run.pct+'%', 'Accuracy', 118, run.pct>=75?'var(--ok)':run.pct>=55?'var(--amber)':'var(--coral)')}
      <div style="flex:1;min-width:230px">
        <div style="font-family:var(--display);font-size:21px;font-weight:700;margin-bottom:14px">${p.title}</div>
        ${Object.entries(run.byType).map(([k,v])=>{const p2=Math.round(v.c/v.n*100);
          return `<div class="prow"><div class="lb"><span>${qTypeName(k)}</span><b>${v.c}/${v.n}</b></div><div class="bar thin"><i style="width:${p2}%;background:${p2>=70?'var(--ok)':p2>=50?'var(--amber)':'var(--coral)'}"></i></div></div>`;}).join('')}
      </div>
      <div style="display:grid;gap:10px;min-width:150px">
        <div class="band"><b>${bandLabel(run.band)}</b><span>Band</span></div>
        <div style="text-align:center"><div style="font-family:var(--mono);font-size:17px;font-weight:700">${run.wpm||'—'}</div><div style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">words / min</div></div>
      </div>
    </div></div>

    ${run.wpm && run.wpm < 180 ? `<div class="why amb mb"><b>Reading speed</b>At ${run.wpm} wpm you would not finish a full three-passage paper in 60 minutes. You need roughly 200 wpm. Practise skimming each paragraph for its single main idea before you look at the questions.</div>` : ''}

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Every answer explained</h3><p>The explanation names the exact place in the passage</p></div></div>
      <div class="card-bd" style="display:grid;gap:11px">
        ${items.map((it,n) => {
          const given = rs.ans[it.key], ok = rIsRight(it, given);
          const shown = it.o ? (given!=null?String.fromCharCode(65+given)+' — '+it.o[given]:'not answered') : (given||'not answered');
          const correct = it.o ? String.fromCharCode(65+it.c)+' — '+it.o[it.c] : it.a;
          return `<div style="border-left:3px solid ${ok?'var(--ok)':'var(--err)'};background:var(--paper);border-radius:0 12px 12px 0;padding:13px 16px">
            <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:7px">
              <b style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">Q${n+1}</b>
              <div style="flex:1;font-size:13.5px;font-weight:600">${it.q}</div>
              <i class="fa-solid ${ok?'fa-circle-check':'fa-circle-xmark'}" style="color:${ok?'var(--ok)':'var(--err)'}"></i></div>
            <div style="font-size:12.5px;color:var(--ink-3);margin-bottom:3px">Your answer: <b style="color:${ok?'var(--ok)':'var(--err)'}">${esc(shown)}</b></div>
            ${!ok?`<div style="font-size:12.5px;color:var(--ink-3);margin-bottom:6px">Correct: <b style="color:var(--ok)">${esc(correct)}</b></div>`:''}
            <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55;font-style:italic">${it.e}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

/* ─────────────── LISTENING ─────────────── */
function lItems(a){ return a.qs.flatMap((g,gi) => g.items.map((it,i) => ({ ...it, g, gi, i, key:gi+'-'+i }))); }

function sec_listening(){
  if (ls.view === 'test') return lTestHTML();
  if (ls.view === 'result') return lResultHTML();
  return lHomeHTML();
}

function lHomeHTML(){
  const runs = B.listenRuns, last = runs[0];
  const spellErr = runs.reduce((s,r)=>s+(r.spelling||0),0);
  return `
    ${phead({ eyebrow:'Listening Academy', title:`Listening <em>practice</em>`,
      sub:'Conversations, monologues and academic lectures. Bloom counts spelling and number-format mistakes separately, because that is where most students lose marks they had already earned.',
      actions:`<button class="btn btn-p" onclick="lStart('${listeningBank()[0].id}')"><i class="fa-solid fa-headphones"></i> Start a recording</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Current band', B.scores.listening!=null?bandLabel(B.scores.listening):'—', 'Target ' + bandLabel(B.profile.target), 'sky', 'fa-headphones')}
      ${statCard('Recordings done', runs.length, runs.length?'Last: '+last.pct+'%':'None yet', 'leaf', 'fa-list-check')}
      ${statCard('Spelling slips', spellErr, spellErr?'Answers right but written wrong':'None so far', 'cor', 'fa-spell-check')}
      ${statCard('Average accuracy', runs.length?Math.round(runs.reduce((s,r)=>s+r.pct,0)/runs.length)+'%':'—','Across all recordings','amb','fa-percent')}
    </div>

    <div class="grid g2">
      ${listeningBank().map(a => {
        const done = B.listenRuns.filter(r => r.id === a.id);
        return `<div class="card"><div class="card-bd" style="padding:19px 21px">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
            <span class="tag sky">Part ${a.part}</span><span class="tag">${a.level}</span><span class="tag amb">Band ${a.band}+</span>
            ${done.length?`<span class="tag ok" style="margin-left:auto">Best ${Math.max(...done.map(d=>d.pct))}%</span>`:''}</div>
          <b style="font-family:var(--display);font-size:19px;font-weight:700;letter-spacing:-.4px;display:block;line-height:1.2">${a.title}</b>
          <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4);margin:6px 0 12px">${a.kind} · ${Math.round(a.secs/60)}:${String(a.secs%60).padStart(2,'0')} · ${lItems(a).length} questions</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:15px">${a.qs.map(g=>`<span class="tag">${qTypeName(g.type)}</span>`).join('')}</div>
          <button class="btn btn-p btn-sm btn-blk" onclick="lStart('${a.id}')"><i class="fa-solid fa-play"></i> ${done.length?'Listen again':'Start'}</button>
        </div></div>`;
      }).join('')}
    </div>`;
}

function lStart(id){
  ls = { view:'test', id, ans:{}, submitted:false, played:0, playing:false, timer:null, showScript:false, started:Date.now(), line:-1 };
  navTo('listening');
}

function lTestHTML(){
  const a = listeningById(ls.id);
  const items = lItems(a);
  const answered = items.filter(it => ls.ans[it.key] != null && ls.ans[it.key] !== '').length;
  return `
    ${phead({ eyebrow:'Listening · Part ' + a.part, title:a.title.replace(/\s(\w+)$/,' <em>$1</em>'), sub:'Play the recording once, exactly as in the exam. The transcript is hidden until you submit.',
      actions:`<button class="btn btn-g btn-sm" onclick="ls.view='home';clearInterval(ls.timer);navTo('listening')">Exit</button><button class="btn btn-p btn-sm" onclick="lSubmit()"><i class="fa-solid fa-flag-checkered"></i> Submit</button>` })}

    <div style="max-width:900px;margin:0 auto">
      <div class="card mb2" style="background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700));border:none;color:#fff">
        <div class="card-bd" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
          <button class="btn" id="lPlayBtn" style="background:#fff;color:var(--leaf-800);width:56px;height:56px;border-radius:50%;padding:0;justify-content:center;flex:0 0 56px;font-size:17px" onclick="lTogglePlay()"><i class="fa-solid fa-play"></i></button>
          <div style="flex:1;min-width:200px">
            <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;margin-bottom:7px">${a.kind} · ${a.speakers.join(' and ')}</div>
            <div class="bar" style="background:rgba(255,255,255,.18);height:6px"><i id="lProg" style="width:${ls.played/a.secs*100}%;background:var(--leaf-300)"></i></div>
            <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:rgba(255,255,255,.65);margin-top:6px">
              <span id="lTime">${fmtClock(ls.played)}</span><span>${fmtClock(a.secs)}</span></div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--mono);font-size:11px;color:rgba(255,255,255,.6)">Plays used</div>
            <div style="font-family:var(--display);font-size:20px;font-weight:700" id="lPlays">${ls.plays||0} / 1</div>
          </div>
        </div>
        <div style="padding:0 21px 18px">
          <div id="lCaption" style="min-height:56px;padding:13px 16px;background:rgba(0,0,0,.2);border-radius:12px;font-size:14px;line-height:1.55;color:rgba(255,255,255,.9)">
            ${ls.playing ? '' : '<span style="color:rgba(255,255,255,.45)">Press play. Answer as you listen — you get one play, as in the real exam.</span>'}
          </div>
        </div>
      </div>

      ${a.qs.map((g,gi) => `
        <div class="card mb">
          <div class="card-hd"><div style="flex:1"><h3>${qTypeName(g.type)}</h3><p>${g.instr}</p></div></div>
          <div class="card-bd">
            ${g.bank ? `<div style="padding:13px 15px;background:var(--paper);border-radius:12px;margin-bottom:16px;display:grid;gap:5px;font-size:12.5px;color:var(--ink-2)">${g.bank.map(b=>`<div>${b}</div>`).join('')}</div>` : ''}
            <div style="display:grid;gap:14px">
              ${g.items.map((it,i) => {
                const key = gi+'-'+i, v = ls.ans[key];
                if (g.type === 'mcq') return `<div>
                  <div style="font-size:13.5px;font-weight:600;margin-bottom:9px">${i+1}. ${it.q}</div>
                  <div class="opts">${it.o.map((o,oi)=>`<div class="opt ${v===oi?'sel':''}" style="padding:10px 13px" onclick="lSet('${key}',${oi})"><div class="k" style="width:22px;height:22px;flex:0 0 22px;font-size:10px">${String.fromCharCode(65+oi)}</div><div class="x" style="font-size:13px">${o}</div></div>`).join('')}</div></div>`;
                if (g.type === 'tfng') return `<div>
                  <div style="font-size:13.5px;font-weight:600;margin-bottom:9px">${i+1}. ${it.q}</div>
                  <div style="display:flex;gap:7px">${['TRUE','FALSE','NOT GIVEN'].map(o=>`<button class="pill ${v===o?'on':''}" onclick="lSet('${key}','${o}')">${o}</button>`).join('')}</div></div>`;
                if (g.type === 'matching'){
                  const letters = (g.bank||[]).map(b=>b.split('.')[0].trim());
                  return `<div style="display:flex;gap:12px;align-items:center">
                    <div style="flex:1;font-size:13.5px;font-weight:600">${i+1}. ${it.q}</div>
                    <select style="width:96px;border:1.5px solid var(--line-2);border-radius:10px;padding:8px 10px;font-family:var(--mono);font-size:13px;background:var(--surface);color:var(--ink)" onchange="lSet('${key}',this.value)">
                      <option value="">—</option>${letters.map(l=>`<option ${v===l?'selected':''}>${l}</option>`).join('')}</select></div>`;
                }
                return `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
                  <div style="flex:1;min-width:200px;font-size:13.5px;font-weight:600">${i+1}. ${it.q.replace('______','<span style="display:inline-block;min-width:86px;border-bottom:2px dotted var(--line-2)"></span>')}</div>
                  <input value="${esc(v||'')}" placeholder="Answer" style="border:1.5px solid var(--line-2);border-radius:10px;padding:9px 12px;font-family:inherit;font-size:13.5px;background:var(--surface);color:var(--ink);width:190px" oninput="ls.ans['${key}']=this.value"></div>`;
              }).join('')}
            </div>
          </div>
        </div>`).join('')}

      <div class="card"><div class="card-bd" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <span style="font-family:var(--mono);font-size:12px;color:var(--ink-4)">${answered} of ${items.length} answered</span>
        <div style="flex:1"></div>
        <button class="btn btn-p" onclick="lSubmit()"><i class="fa-solid fa-flag-checkered"></i> Submit answers</button>
      </div></div>
    </div>`;
}

function lSet(k, v){ ls.ans[k] = v; navTo('listening'); }

function lTogglePlay(){
  const a = listeningById(ls.id);
  if (ls.playing){ clearInterval(ls.timer); ls.playing = false; document.getElementById('lPlayBtn').innerHTML = '<i class="fa-solid fa-play"></i>'; return; }
  if ((ls.plays||0) >= 1 && ls.played >= a.secs){ toast('You get one play, as in the real exam'); return; }
  if (ls.played === 0) ls.plays = (ls.plays||0) + 1;
  ls.playing = true;
  document.getElementById('lPlayBtn').innerHTML = '<i class="fa-solid fa-pause"></i>';
  const perLine = a.secs / a.script.length;
  clearInterval(ls.timer);
  ls.timer = setInterval(() => {
    if (B.section !== 'listening' || ls.view !== 'test'){ clearInterval(ls.timer); ls.playing = false; return; }
    ls.played++;
    const li = Math.min(a.script.length - 1, Math.floor(ls.played / perLine));
    const prog = document.getElementById('lProg'), tm = document.getElementById('lTime'), cap = document.getElementById('lCaption'), pl = document.getElementById('lPlays');
    if (prog) prog.style.width = (ls.played / a.secs * 100) + '%';
    if (tm) tm.textContent = fmtClock(ls.played);
    if (pl) pl.textContent = (ls.plays||1) + ' / 1';
    if (cap && li !== ls.line){
      ls.line = li;
      const s = a.script[li];
      cap.innerHTML = `<span style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;display:block;margin-bottom:5px">${s.w}</span>${s.t}`;
    }
    if (ls.played >= a.secs){
      clearInterval(ls.timer); ls.playing = false;
      const b = document.getElementById('lPlayBtn'); if (b) b.innerHTML = '<i class="fa-solid fa-check"></i>';
      if (cap) cap.innerHTML = '<span style="color:rgba(255,255,255,.55)">Recording finished. Complete your answers and submit.</span>';
    }
  }, 1000);
}

function lSubmit(){
  const a = listeningById(ls.id);
  clearInterval(ls.timer); ls.playing = false;
  const items = lItems(a);
  const un = items.filter(it => ls.ans[it.key] == null || ls.ans[it.key] === '').length;
  if (un && !confirm(un + ' unanswered. Submit anyway?')) return;
  let right = 0, spelling = 0;
  items.forEach(it => {
    const given = ls.ans[it.key];
    if (it.o){ if (given === it.c) right++; return; }
    const g = String(given||'').toLowerCase().trim().replace(/[.,£$]/g,'');
    const c = String(it.a).toLowerCase().trim().replace(/[.,£$]/g,'');
    if (g === c) right++;
    else if (g && (lev(g,c) <= 2 || g.replace(/\s/g,'') === c.replace(/\s/g,''))) spelling++;
  });
  const total = items.length;
  const sc = { right, total, pct:pct(right,total), band:rawToBand(right,total), spelling };
  B.listenRuns.unshift({ id:a.id, title:a.title, date:today(), ...sc, ans:{ ...ls.ans } });
  B.listenRuns = B.listenRuns.slice(0,30);
  B.scores.listening = B.scores.listening == null ? sc.band : roundBand(B.scores.listening * 0.6 + sc.band * 0.4);
  B.history.push({ at:today(), kind:'listening', band:sc.band });
  save(); markActive(Math.round(a.secs/60) + 5); addXP(right * 6);
  if (typeof mockCapture === 'function' && mockCapture('listening', sc.band)){ ls.view = 'result'; navTo('listening'); return; }
  ls.view = 'result'; navTo('listening');
}
function lev(a,b){
  const m = Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)]);
  for (let j=0;j<=b.length;j++) m[0][j]=j;
  for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++)
    m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1] + (a[i-1]===b[j-1]?0:1));
  return m[a.length][b.length];
}

function lResultHTML(){
  const a = listeningById(ls.id);
  const run = B.listenRuns[0];
  const items = lItems(a);
  return `
    ${phead({ eyebrow:'Listening result', title:`Band <em>${bandLabel(run.band)}</em>`, sub:`${run.right} of ${run.total} correct.${run.spelling?` ${run.spelling} answer${run.spelling>1?'s were':' was'} correct but misspelled — in the real exam those score zero.`:''}`,
      actions:`<button class="btn btn-g btn-sm" onclick="ls.view='home';navTo('listening')">All recordings</button><button class="btn btn-p" onclick="lStart('${a.id}')"><i class="fa-solid fa-rotate-right"></i> Try again</button>` })}

    <div class="split">
      <div style="display:grid;gap:16px">
        ${run.spelling ? `<div class="why cor"><b>${run.spelling} spelling or format slip${run.spelling>1?'s':''}</b>You heard the answer correctly but wrote it wrong. In IELTS Listening this scores zero. Before you transfer answers, check every date format, every plural -s and every number written as digits.</div>` : ''}
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Every answer</h3><p>With the exact line of the recording it came from</p></div></div>
          <div class="card-bd" style="display:grid;gap:11px">
            ${items.map((it,n) => {
              const given = ls.ans[it.key];
              const ok = it.o ? given === it.c : String(given||'').toLowerCase().trim() === String(it.a).toLowerCase().trim();
              const near = !ok && !it.o && given && lev(String(given).toLowerCase().trim(), String(it.a).toLowerCase().trim()) <= 2;
              const shown = it.o ? (given!=null?String.fromCharCode(65+given)+' — '+it.o[given]:'not answered') : (given||'not answered');
              const correct = it.o ? String.fromCharCode(65+it.c)+' — '+it.o[it.c] : it.a;
              return `<div style="border-left:3px solid ${ok?'var(--ok)':near?'var(--amber)':'var(--err)'};background:var(--paper);border-radius:0 12px 12px 0;padding:13px 16px">
                <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:7px">
                  <b style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">Q${n+1}</b>
                  <div style="flex:1;font-size:13.5px;font-weight:600">${it.q}</div>
                  <i class="fa-solid ${ok?'fa-circle-check':near?'fa-circle-exclamation':'fa-circle-xmark'}" style="color:${ok?'var(--ok)':near?'var(--amber)':'var(--err)'}"></i></div>
                <div style="font-size:12.5px;color:var(--ink-3)">You wrote: <b style="color:${ok?'var(--ok)':'var(--err)'}">${esc(shown)}</b>${near?' <span class="tag amb">spelling</span>':''}</div>
                ${!ok?`<div style="font-size:12.5px;color:var(--ink-3);margin-top:2px">Correct: <b style="color:var(--ok)">${esc(correct)}</b></div>`:''}
                <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55;font-style:italic;margin-top:6px">${it.e}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card"><div class="card-bd" style="text-align:center">
          ${ringHTML(run.pct, run.pct+'%', 'Accuracy', 130, run.pct>=75?'var(--ok)':run.pct>=55?'var(--amber)':'var(--coral)')}
          <div style="margin-top:16px"><div class="band" style="margin:0 auto"><b>${bandLabel(run.band)}</b><span>Band</span></div></div>
        </div></div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Full transcript</h3><p>Now you can check what you missed</p></div>
            <button class="icobtn" onclick="ls.showScript=!ls.showScript;navTo('listening')"><i class="fa-solid fa-${ls.showScript?'eye-slash':'eye'}"></i></button></div>
          ${ls.showScript ? `<div class="card-bd" style="display:grid;gap:11px;max-height:460px;overflow-y:auto">
            ${a.script.map(s=>`<div><div style="font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--leaf-600);font-weight:800;margin-bottom:3px">${s.w}</div>
              <div style="font-size:13px;line-height:1.6;color:var(--ink-2)">${s.t}</div></div>`).join('')}
          </div>` : `<div class="card-bd" style="text-align:center;padding:26px"><button class="btn btn-g btn-sm" onclick="ls.showScript=true;navTo('listening')"><i class="fa-solid fa-file-lines"></i> Reveal transcript</button></div>`}
        </div>
      </div>
    </div>`;
}
