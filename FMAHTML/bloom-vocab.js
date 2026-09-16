/* ═══ BLOOM — vocabulary engine (spaced repetition) ═══ */

let vs = { view:'home', topic:null, mode:'review', queue:[], idx:0, flip:false, stats:null, search:'', filter:'all' };

function vKey(w){ return w.w.toLowerCase().replace(/[^a-z]/g,''); }
function vSrs(w){ return B.vocab[vKey(w)] || null; }
function vDueDate(s){ return s ? s.due : null; }
function vocabDue(){ return VOCAB.filter(w => { const s = vSrs(w); return s && s.due <= today(); }); }
function vocabNew(){ return VOCAB.filter(w => !vSrs(w)); }
function vocabMastered(){ return VOCAB.filter(w => { const s = vSrs(w); return s && s.reps >= 4 && s.iv >= 21; }); }
function vocabWeak(){ return VOCAB.filter(w => { const s = vSrs(w); return s && s.lapses >= 2; }); }
function vocabSeen(){ return VOCAB.filter(w => vSrs(w)); }

function vGrade(w, g){
  const k = vKey(w);
  const s = B.vocab[k] || { ease:2.4, iv:0, reps:0, lapses:0, hits:0, due:today(), hist:[] };
  if (g === 1){ s.lapses++; s.ease = Math.max(1.3, s.ease - 0.2); s.iv = 0; s.reps = 0; }
  else if (g === 2){ s.ease = Math.max(1.3, s.ease - 0.12); s.iv = s.iv ? Math.max(1, Math.round(s.iv * 1.25)) : 1; s.reps++; s.hits++; }
  else if (g === 3){ s.iv = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.iv * s.ease); s.reps++; s.hits++; }
  else { s.ease = Math.min(3.1, s.ease + 0.14); s.iv = s.reps === 0 ? 4 : Math.round((s.iv || 1) * s.ease * 1.35); s.reps++; s.hits++; }
  s.due = dayOffset(g === 1 ? 0 : s.iv);
  s.hist = [...(s.hist||[]), { d:today(), g }].slice(-15);
  B.vocab[k] = s; save();
  return s;
}
function vNextLabel(w, g){
  const s = vSrs(w) || { ease:2.4, iv:0, reps:0 };
  if (g === 1) return 'now';
  let iv;
  if (g === 2) iv = s.iv ? Math.max(1, Math.round(s.iv * 1.25)) : 1;
  else if (g === 3) iv = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.iv * s.ease);
  else iv = s.reps === 0 ? 4 : Math.round((s.iv || 1) * s.ease * 1.35);
  return iv === 1 ? '1 day' : iv < 30 ? iv + ' days' : Math.round(iv/30) + ' mo';
}

function sec_vocab(){
  if (vs.view === 'drill') return vDrillHTML();
  if (vs.view === 'done') return vDoneHTML();
  if (vs.view === 'browse') return vBrowseHTML();
  return vHomeHTML();
}

function vHomeHTML(){
  const due = vocabDue(), fresh = vocabNew(), mast = vocabMastered(), weak = vocabWeak(), seen = vocabSeen();
  const overall = pct(mast.length, VOCAB.length);
  return `
    ${phead({ eyebrow:'Active recall', title:`Vocab<em>ulary</em>`,
      sub:'Learn, practise, test, review, master. Words you get wrong come back sooner; words you know disappear for weeks.',
      actions:`<button class="btn btn-g btn-sm" onclick="vs.view='browse';navTo('vocab')"><i class="fa-solid fa-list"></i> Browse all ${VOCAB.length}</button>
        <button class="btn btn-p" onclick="vStart('${due.length?'review':'new'}')"><i class="fa-solid fa-play"></i> ${due.length?'Review '+due.length+' due':'Learn new words'}</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Due today', due.length, due.length?'Review these first':'Nothing scheduled', 'amb', 'fa-clock')}
      ${statCard('Mastered', mast.length + ' / ' + VOCAB.length, overall + '% of the bank', 'leaf', 'fa-check-double')}
      ${statCard('Learning', seen.length - mast.length, 'Seen but not secure', 'sky', 'fa-seedling')}
      ${statCard('Difficult', weak.length, weak.length?'Missed at least twice':'None flagged', 'cor', 'fa-triangle-exclamation')}
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Study modes</h3><p>Every mode reschedules the words automatically</p></div></div>
      <div class="card-bd">
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(176px,1fr));gap:11px">
          ${[
            ['review','fa-clock','Due Today', due.length + ' words', ''],
            ['new','fa-plus','Learn New', fresh.length + ' unseen', ''],
            ['weak','fa-triangle-exclamation','Weak Words', weak.length + ' flagged', 'cor'],
            ['random','fa-shuffle','Random Mix','20 words',''],
            ['test','fa-list-check','Test Mode','Multiple choice','amb'],
            ['spell','fa-keyboard','Spelling Drill','Type the word','sky'],
          ].map(([m,ic,t,s,tone]) => `<button class="tile" style="text-align:left;padding:15px 16px" onclick="vStart('${m}')">
            <div style="display:flex;gap:11px;align-items:center">
              <div style="width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:${tone==='cor'?'var(--coral-soft)':tone==='amb'?'var(--amber-soft)':tone==='sky'?'var(--sky-soft)':'var(--leaf-100)'};color:${tone==='cor'?'var(--coral)':tone==='amb'?'#a86e14':tone==='sky'?'var(--sky)':'var(--leaf-700)'};display:grid;place-items:center;font-size:13px"><i class="fa-solid ${ic}"></i></div>
              <div><b style="display:block;font-size:13px">${t}</b><span style="font-size:11px;color:var(--ink-4)">${s}</span></div>
            </div></button>`).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Topic decks</h3><p>Pick the topics that match your exam essays</p></div></div>
      <div class="card-bd">
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:12px">
          ${VOCAB_TOPICS.map(t => {
            const ws = VOCAB.filter(w => w.t === t.id);
            const m = ws.filter(w => { const s = vSrs(w); return s && s.reps >= 4 && s.iv >= 21; }).length;
            const d = ws.filter(w => { const s = vSrs(w); return s && s.due <= today(); }).length;
            const p2 = pct(m, ws.length);
            return `<div style="border:1px solid var(--line);border-radius:14px;padding:15px 16px;background:var(--surface)">
              <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
                <div style="width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center"><i class="fa-solid ${t.ic}"></i></div>
                <div style="flex:1;min-width:0"><b style="font-size:13.5px;display:block">${t.name}</b><span style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${ws.length} words${d?' · '+d+' due':''}</span></div>
                <span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${p2>=60?'var(--ok)':'var(--ink-4)'}">${p2}%</span>
              </div>
              <div class="bar thin" style="margin-bottom:12px"><i style="width:${p2}%"></i></div>
              <button class="btn btn-g btn-sm btn-blk" onclick="vStart('topic','${t.id}')"><i class="fa-solid fa-play"></i> Study deck</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function vShuffle(a){ const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; }

function vStart(mode, topic){
  let pool = [];
  if (mode === 'review') pool = vocabDue();
  else if (mode === 'new') pool = vShuffle(vocabNew()).slice(0, 12);
  else if (mode === 'weak') pool = vocabWeak();
  else if (mode === 'topic') pool = VOCAB.filter(w => w.t === topic);
  else if (mode === 'test' || mode === 'spell') pool = vShuffle([...vocabDue(), ...vShuffle(vocabSeen()).slice(0,10), ...vShuffle(vocabNew()).slice(0,5)]).slice(0, 12);
  else pool = vShuffle(VOCAB).slice(0, 20);
  if (!pool.length){ toast(mode==='review'?'Nothing due — try Learn New':'No words in this set'); return; }
  vs = { ...vs, view:'drill', mode, topic:topic||null, queue:pool.map(vKey), idx:0, flip:false, typed:'', checked:false,
         stats:{ again:0, hard:0, good:0, easy:0, right:0, wrong:0, start:Date.now(), n:pool.length } };
  navTo('vocab');
}
function vCur(){ const k = vs.queue[vs.idx]; return VOCAB.find(w => vKey(w) === k); }

function vDrillHTML(){
  const w = vCur(); if (!w) return vHomeHTML();
  const n = vs.queue.length;
  const isTest = vs.mode === 'test', isSpell = vs.mode === 'spell';
  return `
    ${phead({ eyebrow:'Vocabulary · ' + ({review:'Due today',new:'Learn new',weak:'Weak words',topic:'Topic deck',test:'Test mode',spell:'Spelling drill',random:'Random mix'})[vs.mode],
      title:`${vs.idx+1} of ${n}`, sub:isSpell?'Read the definition and type the word exactly.':isTest?'Choose the correct meaning. No hints.':'Recall the meaning first, then reveal.',
      actions:`<button class="btn btn-g btn-sm" onclick="vEnd()"><i class="fa-solid fa-xmark"></i> End session</button>` })}
    <div style="max-width:760px;margin:0 auto">
      <div class="bar" style="margin-bottom:18px"><i style="width:${vs.idx/n*100}%;background:var(--amber)"></i></div>
      ${isSpell ? vSpellHTML(w) : isTest ? vTestHTML(w) : vCardHTML(w)}
    </div>`;
}

function vCardHTML(w){
  const s = vSrs(w), topic = VOCAB_TOPICS.find(t => t.id === w.t);
  return `
    <div class="card" style="border-radius:var(--r-xl);box-shadow:var(--sh-3)">
      <div class="card-bd" style="padding:32px 34px;min-height:300px;display:flex;flex-direction:column">
        <div style="display:flex;gap:7px;align-items:center;margin-bottom:22px;flex-wrap:wrap">
          <span class="tag leaf">${topic?topic.name:''}</span><span class="tag">${w.lv}</span><span class="tag amb">Band ${w.band}+</span>
          <span style="margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${s?`seen ${s.reps+s.lapses}× · interval ${s.iv}d`:'new word'}</span>
        </div>
        <div style="flex:1">
          <div style="font-family:var(--display);font-size:40px;font-weight:700;letter-spacing:-1.4px;line-height:1.05">${w.w}</div>
          <div style="font-family:var(--mono);font-size:13px;color:var(--ink-4);margin-top:8px">${w.p} · <span style="font-style:italic">${w.pos}</span>
            <button class="icobtn" style="width:26px;height:26px;font-size:10px;margin-left:8px;vertical-align:middle" onclick="speakWord('${w.w.replace(/'/g,"\\'")}')" title="Hear it"><i class="fa-solid fa-volume-high"></i></button></div>
          ${vs.flip ? `
            <div style="margin-top:22px;padding-top:20px;border-top:1px solid var(--line)">
              <div style="font-size:17px;line-height:1.5;color:var(--ink);margin-bottom:16px">${w.d}</div>
              <div style="font-size:14px;color:var(--ink-2);font-style:italic;padding:12px 15px;background:var(--leaf-50);border-left:3px solid var(--leaf-400);border-radius:0 10px 10px 0">${w.e}</div>
              <div style="display:grid;gap:11px;margin-top:16px">
                ${w.col?.length?`<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:6px">Collocations</div><div style="display:flex;flex-wrap:wrap;gap:5px">${w.col.map(c=>`<span class="tag leaf">${c}</span>`).join('')}</div></div>`:''}
                ${w.syn?.length?`<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:6px">Synonyms</div><div style="display:flex;flex-wrap:wrap;gap:5px">${w.syn.map(c=>`<span class="tag sky">${c}</span>`).join('')}</div></div>`:''}
                ${w.ant?.length?`<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:6px">Opposites</div><div style="display:flex;flex-wrap:wrap;gap:5px">${w.ant.map(c=>`<span class="tag cor">${c}</span>`).join('')}</div></div>`:''}
              </div>
            </div>`
          : `<div style="margin-top:auto;padding-top:40px;text-align:center;color:var(--ink-4);font-size:12.5px">What does it mean? Recall it, then press <kbd style="font-family:var(--mono);font-size:11px;background:var(--paper-2);border:1px solid var(--line);border-bottom-width:2px;border-radius:4px;padding:2px 7px">Space</kbd></div>`}
        </div>
      </div>
    </div>
    ${vs.flip ? `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:14px">
        ${[[1,'Again','again','var(--err)'],[2,'Hard','hard','#c9791f'],[3,'Good','good','var(--amber)'],[4,'Easy','easy','var(--ok)']].map(([g,l,,c])=>`
          <button class="card" style="padding:13px 10px;text-align:center;cursor:pointer;border-width:1.5px" onmouseover="this.style.borderColor='${c}'" onmouseout="this.style.borderColor='var(--line)'" onclick="vRate(${g})">
            <b style="display:block;font-size:13.5px;font-weight:700">${l}</b><span style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${vNextLabel(vCur(),g)}</span></button>`).join('')}
      </div>`
    : `<button class="btn btn-p btn-blk btn-lg" style="margin-top:14px" onclick="vFlip()"><i class="fa-solid fa-eye"></i> Show meaning</button>`}
    <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
      <button class="btn btn-q btn-sm" onclick="vPrev()" ${vs.idx===0?'disabled':''}><i class="fa-solid fa-arrow-left"></i> Previous</button>
      <div style="flex:1"></div>
      <button class="btn btn-q btn-sm" onclick="vSkip()">Skip <i class="fa-solid fa-arrow-right"></i></button>
    </div>`;
}

function vTestHTML(w){
  const wrong = vShuffle(VOCAB.filter(x => x.w !== w.w)).slice(0,3);
  if (!vs.opts || vs.optsFor !== w.w){ vs.opts = vShuffle([w, ...wrong]); vs.optsFor = w.w; vs.picked = null; }
  return `
    <div class="card"><div class="card-bd" style="padding:28px 30px">
      <div style="display:flex;gap:7px;margin-bottom:18px"><span class="tag leaf">${w.lv}</span><span class="tag amb">Band ${w.band}+</span></div>
      <div style="font-family:var(--display);font-size:32px;font-weight:700;letter-spacing:-1px;margin-bottom:6px">${w.w}</div>
      <div style="font-family:var(--mono);font-size:12px;color:var(--ink-4);margin-bottom:22px">${w.p} · ${w.pos}</div>
      <div class="opts">
        ${vs.opts.map((o,i) => {
          let cls = '';
          if (vs.picked != null){ if (o.w === w.w) cls = 'right'; else if (i === vs.picked) cls = 'wrong'; }
          return `<div class="opt ${cls}" onclick="vTestPick(${i})"><div class="k">${String.fromCharCode(65+i)}</div><div class="x">${o.d}</div></div>`;
        }).join('')}
      </div>
      ${vs.picked != null ? `<div class="why ${vs.opts[vs.picked].w===w.w?'leaf':'cor'}"><b>${vs.opts[vs.picked].w===w.w?'Correct':'Not quite'}</b>${w.e}</div>
        <button class="btn btn-p btn-blk" style="margin-top:14px" onclick="vAdvance()">Next word <i class="fa-solid fa-arrow-right"></i></button>` : ''}
    </div></div>`;
}
function vTestPick(i){
  if (vs.picked != null) return;
  vs.picked = i;
  const w = vCur(), ok = vs.opts[i].w === w.w;
  vGrade(w, ok ? 3 : 1);
  vs.stats[ok?'right':'wrong']++; vs.stats[ok?'good':'again']++;
  navTo('vocab');
}

function vSpellHTML(w){
  const ok = vs.checked && vs.typed.trim().toLowerCase() === w.w.toLowerCase();
  return `
    <div class="card"><div class="card-bd" style="padding:28px 30px">
      <div style="display:flex;gap:7px;margin-bottom:18px"><span class="tag sky">Spelling</span><span class="tag">${w.lv}</span></div>
      <div style="font-size:17px;line-height:1.55;color:var(--ink);margin-bottom:8px">${w.d}</div>
      <div style="font-family:var(--mono);font-size:13px;color:var(--ink-4);margin-bottom:20px">${w.p} · ${w.pos} · ${w.w.replace(/[a-z]/gi,'_').split('').join(' ')}</div>
      <div class="fg"><label>Type the word</label>
        <input id="vSpellIn" value="${esc(vs.typed||'')}" ${vs.checked?'disabled':''} placeholder="…" style="font-size:19px;font-family:var(--display);font-weight:600;${vs.checked?(ok?'border-color:var(--ok);background:var(--ok-soft)':'border-color:var(--err);background:var(--err-soft)'):''}"
          oninput="vs.typed=this.value" onkeydown="if(event.key==='Enter')vSpellCheck()"></div>
      ${vs.checked ? `<div class="why ${ok?'leaf':'cor'}"><b>${ok?'Correct spelling':'The correct spelling is “'+w.w+'”'}</b>${w.e}</div>
        <button class="btn btn-p btn-blk" style="margin-top:14px" onclick="vAdvance()">Next <i class="fa-solid fa-arrow-right"></i></button>`
      : `<button class="btn btn-p btn-blk" style="margin-top:14px" onclick="vSpellCheck()"><i class="fa-solid fa-check"></i> Check</button>`}
    </div></div>`;
}
function vSpellCheck(){
  const w = vCur(); const ok = (vs.typed||'').trim().toLowerCase() === w.w.toLowerCase();
  vs.checked = true; vGrade(w, ok ? 3 : 1);
  vs.stats[ok?'right':'wrong']++; vs.stats[ok?'good':'again']++;
  navTo('vocab');
}

function vFlip(){ vs.flip = true; navTo('vocab'); }
function vRate(g){
  const w = vCur(); vGrade(w, g);
  vs.stats[['','again','hard','good','easy'][g]]++;
  if (g >= 3) vs.stats.right++; else vs.stats.wrong++;
  if (g === 1) vs.queue.splice(Math.min(vs.queue.length, vs.idx + 4), 0, vKey(w));
  vAdvance();
}
function vAdvance(){
  vs.flip = false; vs.picked = null; vs.opts = null; vs.optsFor = null; vs.typed = ''; vs.checked = false;
  if (vs.idx >= vs.queue.length - 1){ vFinish(); return; }
  vs.idx++; navTo('vocab');
}
function vSkip(){ if (vs.idx >= vs.queue.length-1){ vFinish(); return; } vs.idx++; vs.flip=false; navTo('vocab'); }
function vPrev(){ if (vs.idx===0) return; vs.idx--; vs.flip=false; vs.picked=null; vs.opts=null; vs.checked=false; vs.typed=''; navTo('vocab'); }
function vEnd(){ if (vs.stats && (vs.stats.right + vs.stats.wrong)) vFinish(); else { vs.view='home'; navTo('vocab'); } }
function vFinish(){
  const s = vs.stats, n = s.right + s.wrong;
  markActive(Math.max(5, Math.round(n * 0.6)));
  addXP(n * 4);
  if (vocabMastered().length >= 100) earn('word-100');
  /* a Duolingo adaptive mock section runs through this engine — hand the
     accuracy back so the mock can complete and issue its report */
  if (typeof xmAdaptiveDone === 'function' && xmAdaptiveDone(s.right, n)) return;
  vs.view = 'done'; navTo('vocab');
}

function vDoneHTML(){
  const s = vs.stats, n = s.right + s.wrong;
  const acc = n ? Math.round(s.right / n * 100) : 0;
  const mins = Math.max(1, Math.round((Date.now() - s.start) / 60000));
  return `
    ${phead({ eyebrow:'Session complete', title:`${n} words <em>reviewed</em>`, sub:'Every word has been rescheduled. The ones you missed come back today or tomorrow.',
      actions:`<button class="btn btn-g btn-sm" onclick="vs.view='home';navTo('vocab')">Back to vocabulary</button><button class="btn btn-p" onclick="vStart('${vs.mode}','${vs.topic||''}')"><i class="fa-solid fa-rotate-right"></i> Another round</button>` })}
    <div class="card mb2"><div class="card-bd" style="display:flex;gap:30px;align-items:center;flex-wrap:wrap">
      ${ringHTML(acc, acc + '%', 'Recalled', 116, acc>=70?'var(--ok)':'var(--amber)')}
      <div style="flex:1;min-width:230px">
        <div style="font-family:var(--display);font-size:22px;font-weight:700;margin-bottom:6px">${s.right} of ${n} correct</div>
        <div style="font-size:13px;color:var(--ink-3);margin-bottom:16px">${mins} minute${mins===1?'':'s'} · +${n*4} XP</div>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          ${[['Again',s.again,'var(--err)'],['Hard',s.hard,'#c9791f'],['Good',s.good,'var(--amber)'],['Easy',s.easy,'var(--ok)']].map(([l,v,c])=>`
            <div style="flex:1;min-width:80px;text-align:center;padding:11px;border-radius:11px;background:var(--paper)"><b style="display:block;font-family:var(--mono);font-size:17px;color:${c}">${v}</b><span style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${l}</span></div>`).join('')}
        </div>
      </div>
      <div style="text-align:center"><div style="font-family:var(--display);font-size:30px;font-weight:700;color:var(--leaf-600)">${vocabDue().length}</div>
        <div style="font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-4);font-weight:800">Still due today</div></div>
    </div></div>`;
}

function vBrowseHTML(){
  const q = vs.search.trim().toLowerCase();
  let list = VOCAB.filter(w => !q || (w.w + ' ' + w.d + ' ' + (w.syn||[]).join(' ') + ' ' + (w.col||[]).join(' ')).toLowerCase().includes(q));
  if (vs.filter === 'due') list = list.filter(w => { const s = vSrs(w); return s && s.due <= today(); });
  else if (vs.filter === 'new') list = list.filter(w => !vSrs(w));
  else if (vs.filter === 'weak') list = list.filter(w => { const s = vSrs(w); return s && s.lapses >= 2; });
  else if (vs.filter === 'mast') list = list.filter(w => { const s = vSrs(w); return s && s.reps >= 4 && s.iv >= 21; });
  else if (vs.topic) list = list.filter(w => w.t === vs.topic);

  return `
    ${phead({ eyebrow:'Vocabulary · Browse', title:`All <em>${VOCAB.length}</em> words`, sub:'Search by word, meaning, synonym or collocation.',
      actions:`<button class="btn btn-g btn-sm" onclick="vs.view='home';vs.topic=null;navTo('vocab')"><i class="fa-solid fa-arrow-left"></i> Back</button>` })}
    <div class="card mb2"><div class="card-bd" style="padding:14px 18px">
      <div class="search" style="margin-bottom:12px"><i class="fa-solid fa-magnifying-glass"></i>
        <input placeholder="Search words, meanings, collocations…" value="${esc(vs.search)}" oninput="vs.search=this.value;vPaintList()"></div>
      <div class="pills">
        ${[['all','All'],['due','Due today'],['new','Unseen'],['weak','Difficult'],['mast','Mastered']].map(([k,l])=>`<button class="pill ${vs.filter===k?'on':''}" style="padding:5px 12px;font-size:11.5px" onclick="vs.filter='${k}';vs.topic=null;navTo('vocab')">${l}</button>`).join('')}
        ${VOCAB_TOPICS.map(t=>`<button class="pill ${vs.topic===t.id?'on':''}" style="padding:5px 12px;font-size:11.5px" onclick="vs.topic='${t.id}';vs.filter='all';navTo('vocab')">${t.name}</button>`).join('')}
      </div>
    </div></div>
    <div id="vList">${vListHTML(list)}</div>`;
}
function vPaintList(){
  const q = vs.search.trim().toLowerCase();
  let list = VOCAB.filter(w => !q || (w.w + ' ' + w.d).toLowerCase().includes(q));
  const el = document.getElementById('vList'); if (el) el.innerHTML = vListHTML(list);
}
function vListHTML(list){
  if (!list.length) return `<div class="empty"><i class="fa-solid fa-spell-check"></i><b>No words match</b><span>Try a different search or filter.</span></div>`;
  return `<div class="card"><div class="card-bd flush">${list.map(w => {
    const s = vSrs(w);
    const st = !s ? ['New','var(--line-2)'] : s.lapses>=2 ? ['Difficult','var(--coral)'] : (s.reps>=4&&s.iv>=21) ? ['Mastered','var(--ok)'] : s.due<=today() ? ['Due','var(--amber)'] : ['In '+s.iv+'d','var(--sky)'];
    return `<div class="row">
      <div style="width:8px;height:8px;border-radius:50%;background:${st[1]};flex:0 0 8px" title="${st[0]}"></div>
      <div class="tx" style="flex:0 0 176px"><b>${w.w}</b><span style="font-family:var(--mono)">${w.p}</span></div>
      <div class="tx"><span class="clip" style="color:var(--ink-2);font-size:12.5px">${w.d}</span></div>
      <span class="tag">${w.lv}</span>
      <span style="font-family:var(--mono);font-size:10px;color:${st[1]};font-weight:700;min-width:56px;text-align:right">${st[0]}</span>
      <button class="icobtn" style="width:28px;height:28px;font-size:10px" onclick="speakWord('${w.w.replace(/'/g,"\\'")}')"><i class="fa-solid fa-volume-high"></i></button>
    </div>`;
  }).join('')}</div></div>`;
}

function speakWord(w){
  try {
    if (!window.speechSynthesis){ toast('Speech is not supported in this browser'); return; }
    const u = new SpeechSynthesisUtterance(w);
    u.lang = 'en-GB'; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch(e){ toast('Could not play audio'); }
}

document.addEventListener('keydown', e => {
  if (!B || B.section !== 'vocab' || vs.view !== 'drill') return;
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if (vs.mode === 'test' || vs.mode === 'spell') return;
  if (e.key === ' '){ e.preventDefault(); vs.flip ? null : vFlip(); }
  else if (['1','2','3','4'].includes(e.key) && vs.flip){ e.preventDefault(); vRate(+e.key); }
  else if (e.key === 'ArrowRight'){ e.preventDefault(); vSkip(); }
  else if (e.key === 'ArrowLeft'){ e.preventDefault(); vPrev(); }
  else if (e.key === 'Escape'){ vEnd(); }
});
