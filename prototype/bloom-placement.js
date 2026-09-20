/* ═══ BLOOM — placement test → Bloom English Profile ═══ */

let plc = { stage:0, ans:{}, essay:'', speech:'', started:null, result:null };
const PLC_STAGES = [
  { k:'grammar',    name:'Grammar',    ic:'fa-diagram-project', mins:5 },
  { k:'vocabulary', name:'Vocabulary', ic:'fa-spell-check',     mins:4 },
  { k:'reading',    name:'Reading',    ic:'fa-book-open',       mins:6 },
  { k:'listening',  name:'Listening',  ic:'fa-headphones',      mins:4 },
  { k:'writing',    name:'Writing',    ic:'fa-pen-nib',         mins:8 },
  { k:'speaking',   name:'Speaking',   ic:'fa-microphone',      mins:3 },
];

function plcItems(k){
  if (k === 'grammar' || k === 'vocabulary') return PLACEMENT[k].map((x,i) => ({ ...x, key:k+i }));
  if (k === 'reading') return PLACEMENT.reading.flatMap((p,pi) => p.items.map((x,i) => ({ ...x, key:'r'+pi+'-'+i, passage:i===0?p.passage:null })));
  if (k === 'listening') return PLACEMENT.listening.flatMap((p,pi) => p.items.map((x,i) => ({ ...x, key:'l'+pi+'-'+i, script:i===0?p.script:null })));
  return [];
}

function sec_placement(){
  if (plc.result) return plcResultHTML();
  if (plc.stage === 0) return plcIntroHTML();
  const st = PLC_STAGES[plc.stage-1];
  return plcStageHTML(st);
}

function plcIntroHTML(){
  return `
    <div style="max-width:820px;margin:0 auto">
      ${phead({ eyebrow:'Step one', title:`Your <em>placement</em> test`, sub:'Six short parts, about 25 minutes. Answer honestly — a flattering result only produces a study plan that wastes your time.' })}
      <div class="card mb2">
        <div class="card-bd">
          <div class="grid g3" style="gap:11px">
            ${PLC_STAGES.map((s,i) => `<div style="display:flex;gap:11px;align-items:center;padding:13px 14px;border:1px solid var(--line);border-radius:13px">
              <div style="width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center"><i class="fa-solid ${s.ic}"></i></div>
              <div><b style="font-size:13px;display:block">${i+1}. ${s.name}</b><span style="font-size:11px;color:var(--ink-4)">about ${s.mins} min</span></div>
            </div>`).join('')}
          </div>
          <div style="margin-top:20px;padding:16px 18px;border-radius:14px;background:var(--violet-soft)">
            <div style="font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:#5a3fb0;font-weight:800;margin-bottom:8px"><i class="fa-solid fa-wand-magic-sparkles"></i> What you get at the end</div>
            <div style="font-size:13px;color:var(--ink-2);line-height:1.6">A CEFR level from A1 to C2, an estimated band for each of the four skills, your strongest and weakest area, and a recommended programme length — all of which feed straight into your study plan and daily practice.</div>
          </div>
        </div>
      </div>
      <div style="text-align:center"><button class="btn btn-p btn-lg" onclick="plcStart()"><i class="fa-solid fa-play"></i> Begin the test</button>
        <div style="font-size:12px;color:var(--ink-4);margin-top:11px">You can pause between parts. Your answers save as you go.</div></div>
    </div>`;
}
function plcStart(){ plc.stage = 1; plc.started = Date.now(); navTo('placement'); }

function plcStageHTML(st){
  const items = plcItems(st.k);
  const n = plc.stage, total = 6;
  const head = `
    <div class="rail" style="max-width:720px">${PLC_STAGES.map((s,i)=>`
      <div class="s ${n===i+1?'on':n>i+1?'dn':''}" style="width:64px"><div class="n">${n>i+1?'<i class="fa-solid fa-check" style="font-size:10px"></i>':i+1}</div><div class="lb">${s.name}</div></div>${i<5?`<div class="bar2 ${n>i+1?'f':''}"></div>`:''}`).join('')}</div>`;

  if (st.k === 'writing'){
    const words = plc.essay.trim() ? plc.essay.trim().split(/\s+/).length : 0;
    return `${head}<div class="stage">
      <div class="stage-hd"><div class="eb">Part 5 of 6 · Writing</div><h3>Write a short <em>response</em></h3><p>${PLACEMENT.writing.prompt}</p></div>
      <div class="fg"><label>Your response</label>
        <textarea id="plcEssay" rows="9" placeholder="Start writing…" oninput="plc.essay=this.value;document.getElementById('plcWc').textContent=this.value.trim()?this.value.trim().split(/\\s+/).length:0">${esc(plc.essay)}</textarea></div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:var(--ink-4)">
        <span><b id="plcWc" style="font-family:var(--mono);color:var(--ink-2)">${words}</b> words</span>
        <span style="color:var(--line-2)">·</span><span>minimum ${PLACEMENT.writing.min}</span>
      </div>
      <div class="stage-ft"><button class="btn btn-g" onclick="plcBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button class="btn btn-p" onclick="plcNext()">Continue <i class="fa-solid fa-arrow-right"></i></button></div>
    </div>`;
  }
  if (st.k === 'speaking'){
    const words = plc.speech.trim() ? plc.speech.trim().split(/\s+/).length : 0;
    return `${head}<div class="stage">
      <div class="stage-hd"><div class="eb">Part 6 of 6 · Speaking</div><h3>Say it out <em>loud</em></h3><p>${PLACEMENT.speaking.prompt}</p></div>
      <div style="text-align:center;margin-bottom:22px">
        <button class="btn btn-a btn-lg" id="plcRec" onclick="plcToggleRec()"><i class="fa-solid fa-microphone"></i> Start recording</button>
        <div id="plcRecState" style="font-size:12px;color:var(--ink-4);margin-top:10px">Speak for about 60 seconds, then type the key points you said below.</div>
      </div>
      <div class="fg"><label>What you said (type or paraphrase — this is what we analyse)</label>
        <textarea id="plcSpeech" rows="6" placeholder="I'm really looking forward to…" oninput="plc.speech=this.value;document.getElementById('plcSc').textContent=this.value.trim()?this.value.trim().split(/\\s+/).length:0">${esc(plc.speech)}</textarea></div>
      <div style="margin-top:10px;font-size:12px;color:var(--ink-4)"><b id="plcSc" style="font-family:var(--mono);color:var(--ink-2)">${words}</b> words · minimum ${PLACEMENT.speaking.min}</div>
      <div class="stage-ft"><button class="btn btn-g" onclick="plcBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button class="btn btn-p btn-lg" onclick="plcFinish()"><i class="fa-solid fa-id-card"></i> Build my English Profile</button></div>
    </div>`;
  }

  const answered = items.filter(x => plc.ans[x.key] != null).length;
  return `${head}<div class="stage">
    <div class="stage-hd"><div class="eb">Part ${n} of ${total} · ${st.name}</div><h3>${st.k==='reading'?'Read and <em>answer</em>':st.k==='listening'?'Listen and <em>answer</em>':'Choose the correct <em>option</em>'}</h3>
      <p>${st.k==='listening'?'Read the transcript once, as if you had heard it — then answer without looking back.':'There is exactly one correct answer for each question.'}</p></div>
    <div style="display:grid;gap:18px">
      ${items.map((x,i) => `
        ${x.passage ? `<div style="padding:16px 18px;background:var(--paper);border-radius:14px;font-size:13.5px;line-height:1.7;color:var(--ink-2);border-left:3px solid var(--leaf-400)">${x.passage}</div>` : ''}
        ${x.script ? `<div style="padding:16px 18px;background:var(--sky-soft);border-radius:14px;font-size:13.5px;line-height:1.7;color:var(--ink-2);border-left:3px solid var(--sky)"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--sky);font-weight:800;margin-bottom:7px"><i class="fa-solid fa-headphones"></i> Recording transcript</div>${x.script}</div>` : ''}
        <div>
          <div style="font-size:14.5px;font-weight:600;color:var(--ink);margin-bottom:11px;line-height:1.45">${i+1}. ${x.q}</div>
          <div class="opts">${x.o.map((o,oi) => `<div class="opt ${plc.ans[x.key]===oi?'sel':''}" onclick="plcPick('${x.key}',${oi})"><div class="k">${String.fromCharCode(65+oi)}</div><div class="x">${o}</div></div>`).join('')}</div>
        </div>`).join('')}
    </div>
    <div class="stage-ft">
      <button class="btn btn-g" onclick="plcBack()" ${n===1?'disabled':''}><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div style="display:flex;gap:12px;align-items:center">
        <span style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4)">${answered} / ${items.length} answered</span>
        <button class="btn btn-p" onclick="plcNext()">Continue <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>
  </div>`;
}

function plcPick(key, i){
  plc.ans[key] = i;
  document.querySelectorAll('.opt').forEach(() => {});
  navTo('placement');
}
function plcNext(){ plc.stage = Math.min(6, plc.stage + 1); navTo('placement'); }
function plcBack(){ plc.stage = Math.max(1, plc.stage - 1); navTo('placement'); }

let plcRecOn = false, plcRecTimer = null, plcRecSecs = 0;
function plcToggleRec(){
  const btn = document.getElementById('plcRec'), st = document.getElementById('plcRecState');
  plcRecOn = !plcRecOn;
  if (plcRecOn){
    plcRecSecs = 0;
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop recording';
    btn.className = 'btn btn-lg';
    btn.style.cssText = 'background:var(--coral);color:#fff';
    plcRecTimer = setInterval(() => {
      plcRecSecs++;
      const s = document.getElementById('plcRecState');
      if (s) s.innerHTML = `<span style="color:var(--coral);font-weight:800"><i class="fa-solid fa-circle" style="font-size:8px"></i> Recording · ${String(Math.floor(plcRecSecs/60)).padStart(2,'0')}:${String(plcRecSecs%60).padStart(2,'0')}</span>`;
      if (plcRecSecs >= 90) plcToggleRec();
    }, 1000);
  } else {
    clearInterval(plcRecTimer);
    btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Record again';
    btn.className = 'btn btn-g btn-lg'; btn.style.cssText = '';
    if (st) st.innerHTML = `<span style="color:var(--leaf-700);font-weight:700"><i class="fa-solid fa-circle-check"></i> Recorded ${plcRecSecs}s — now type the key points below</span>`;
  }
}

/* ── scoring ── */
function plcScoreObjective(k){
  const items = plcItems(k);
  let right = 0, weighted = 0, maxW = 0;
  items.forEach(x => {
    const w = x.lv === 'C1' ? 3 : x.lv === 'B2' ? 2 : 1;
    maxW += w;
    if (plc.ans[x.key] === x.c){ right++; weighted += w; }
  });
  return { right, total:items.length, ratio: items.length ? right/items.length : 0, wRatio: maxW ? weighted/maxW : 0 };
}

/* Heuristic text analysis — deterministic, transparent, no black box */
function analyseText(text, kind){
  const t = (text||'').trim();
  const words = t ? t.split(/\s+/) : [];
  const n = words.length;
  const sentences = t.split(/[.!?]+/).filter(s => s.trim().length > 2);
  const avgLen = sentences.length ? n / sentences.length : 0;
  const uniq = new Set(words.map(w => w.toLowerCase().replace(/[^a-z']/g,''))).size;
  const ttr = n ? uniq / n : 0;
  const long = words.filter(w => w.replace(/[^a-zA-Z]/g,'').length >= 8).length;
  const linkers = ['however','moreover','furthermore','although','whereas','nevertheless','consequently','therefore','in addition','for instance','despite','while','because','which','that is why','on the other hand'];
  const linkHits = linkers.filter(l => t.toLowerCase().includes(l)).length;
  const academic = VOCAB.filter(v => t.toLowerCase().includes(v.w.toLowerCase())).map(v => v.w);
  const complex = /\b(although|whereas|despite|however|which|whose|if .*(would|were)|not only)\b/i.test(t);

  const issues = [];
  if (/\bi\s+(am|was)\s+\w+ing\s+(know|understand|believe|want)\b/i.test(t)) issues.push({ type:'Grammar', bad:'stative verb in continuous form', fix:'Use the simple form: "I know", not "I am knowing".' });
  if (/\bpeople\s+is\b/i.test(t)) issues.push({ type:'Grammar', bad:'People is', fix:'"People" is plural: People **are**.' });
  if (/\bhave\s+\w+ed\s+(yesterday|last\s|in\s+\d{4})/i.test(t)) issues.push({ type:'Tense', bad:'present perfect with finished time', fix:'Use past simple with yesterday / last week / in 2019.' });
  if (/\bdiscuss about\b/i.test(t)) issues.push({ type:'Collocation', bad:'discuss about', fix:'"Discuss" takes no preposition: discuss the issue.' });
  if (/\bdespite of\b/i.test(t)) issues.push({ type:'Grammar', bad:'despite of', fix:'Either "despite" or "in spite of" — never "despite of".' });
  if (/\bcan\s+not\s+to\b|\bcan\s+to\b/i.test(t)) issues.push({ type:'Grammar', bad:'modal + to', fix:'Modals take the bare infinitive: "can go", not "can to go".' });
  if (/,\s+[a-z][^,.]{15,},\s+[a-z]/.test(t) && sentences.some(s => s.split(/\s+/).length > 45)) issues.push({ type:'Punctuation', bad:'possible comma splice', fix:'Split very long comma-joined clauses into separate sentences.' });
  if (n && !/\b(the|a|an)\b/i.test(t)) issues.push({ type:'Articles', bad:'no articles used', fix:'Check every singular countable noun for a/an/the.' });
  if (/\bvery\s+(good|bad|big|important)\b/i.test(t)) issues.push({ type:'Lexis', bad:'very + basic adjective', fix:'Replace with a precise word: "crucial" rather than "very important".' });

  /* scoring components 0–1 */
  const lenScore = kind === 'speaking' ? Math.min(1, n/90) : Math.min(1, n/140);
  const rangeScore = Math.min(1, (ttr - 0.35) / 0.3 + (long / Math.max(12, n)) * 2.2);
  const cohScore = Math.min(1, linkHits / 5);
  const structScore = Math.min(1, (avgLen >= 12 && avgLen <= 26 ? 0.7 : 0.35) + (complex ? 0.3 : 0));
  const acadScore = Math.min(1, academic.length / 3);
  const penalty = Math.min(0.35, issues.length * 0.07);

  const raw = (lenScore*0.18 + rangeScore*0.24 + cohScore*0.16 + structScore*0.24 + acadScore*0.18) - penalty;
  const band = roundBand(3.5 + Math.max(0, raw) * 5.5);
  return { n, sentences:sentences.length, avgLen:Math.round(avgLen*10)/10, ttr:Math.round(ttr*100), long, linkHits, academic, issues, band, complex };
}

function plcFinish(){
  const g = plcScoreObjective('grammar');
  const v = plcScoreObjective('vocabulary');
  const r = plcScoreObjective('reading');
  const l = plcScoreObjective('listening');
  const w = analyseText(plc.essay, 'writing');
  const s = analyseText(plc.speech, 'speaking');

  const toBand = x => roundBand(3.5 + x.wRatio * 5.5);
  const skills = {
    listening: toBand(l),
    reading: toBand(r),
    writing: w.n >= 30 ? w.band : 4.0,
    speaking: s.n >= 20 ? s.band : 4.0,
  };
  const sub = { grammar: toBand(g), vocabulary: toBand(v) };
  /* grammar and vocabulary nudge writing and speaking, as they do in reality */
  skills.writing = roundBand(skills.writing * 0.7 + (sub.grammar + sub.vocabulary) / 2 * 0.3);
  skills.speaking = roundBand(skills.speaking * 0.7 + (sub.grammar + sub.vocabulary) / 2 * 0.3);

  const band = overallBand(skills);
  const order = Object.entries(skills).sort((a,b) => b[1] - a[1]);
  const result = {
    date: today(), band, cefr: bandToCEFR(band), skills, sub,
    strongest: order[0][0], weakest: order[order.length-1][0],
    writing: w, speaking: s,
    detail: { grammar:g, vocabulary:v, reading:r, listening:l },
    weeks: estimateWeeks(band, B.profile.target, B.profile.hoursPerDay),
  };
  plc.result = result;
  B.placement = { date:result.date, cefr:result.cefr, band, skills, sub, strongest:result.strongest, weakest:result.weakest, weeks:result.weeks };
  B.scores = { ...skills };
  B.profile.level = result.cefr;
  B.history.push({ at:today(), kind:'placement', band, skills });
  save();
  earn('first-steps'); addXP(120);
  markActive(25);
  notify('Your Bloom English Profile is ready', `CEFR ${result.cefr} · estimated Band ${bandLabel(band)}. Weakest skill: ${result.weakest}.`, 'fa-id-card');
  navTo('placement');
}

function estimateWeeks(current, target, hoursPerDay){
  const gap = Math.max(0, target - current);
  const hoursNeeded = gap * 110;               /* ~110 focused hours per half band */
  const weekly = Math.max(3, (hoursPerDay||2) * 6);
  return Math.max(2, Math.ceil(hoursNeeded / weekly));
}

/* ── result ── */
function plcResultHTML(){
  const rz = plc.result, p = B.profile;
  const skillRow = k => {
    const b = rz.skills[k], t = p.target;
    const s = SKILLS.find(x => x.id === k);
    return `<div style="display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)">
      <div style="width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:var(--${s.tone==='leaf'?'leaf-100':s.tone==='amb'?'amber-soft':s.tone==='cor'?'coral-soft':'sky-soft'});color:var(--${s.tone==='leaf'?'leaf-700':s.tone==='amb'?'amber':s.tone==='cor'?'coral':'sky'});display:grid;place-items:center"><i class="fa-solid ${s.ic}"></i></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <b style="font-size:13.5px">${s.name}</b>
          <span style="font-family:var(--mono);font-size:12px"><b style="color:var(--ink)">${bandLabel(b)}</b> <span style="color:var(--ink-4)">→ ${bandLabel(t)}</span></span>
        </div>
        <div class="bar" style="position:relative"><i style="width:${b/9*100}%;background:${b>=t?'var(--ok)':b>=t-1?'var(--amber)':'var(--coral)'}"></i>
          <span style="position:absolute;top:-3px;left:${t/9*100}%;width:2px;height:13px;background:var(--ink-3);border-radius:2px"></span></div>
      </div>
      ${k===rz.weakest?'<span class="tag cor">Focus here</span>':k===rz.strongest?'<span class="tag ok">Strongest</span>':''}
    </div>`;
  };
  const ci = cefrIdx(rz.cefr), ti = cefrIdx(bandToCEFR(p.target));
  return `
    ${phead({ eyebrow:'Placement complete', title:`Your Bloom English <em>Profile</em>`, sub:'Built entirely from what you just did — not from what you told us about yourself.',
      actions:`<button class="btn btn-g btn-sm" onclick="plc={stage:0,ans:{},essay:'',speech:'',started:null,result:null};navTo('placement')"><i class="fa-solid fa-rotate-right"></i> Retake</button>
        <button class="btn btn-p" onclick="plcAccept()"><i class="fa-solid fa-arrow-right"></i> Go to my dashboard</button>` })}

    <div class="hero mb2">
      <div style="display:flex;gap:30px;align-items:center;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-family:var(--display);font-size:58px;font-weight:800;line-height:1;letter-spacing:-2px">${rz.cefr}</div>
          <div style="font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;margin-top:6px">CEFR level</div>
        </div>
        <div style="width:1px;height:70px;background:rgba(255,255,255,.18)"></div>
        <div style="flex:1;min-width:230px">
          <div class="eb">${cefrOf(rz.cefr).name}</div>
          <h3>Estimated Band ${bandLabel(rz.band)}</h3>
          <p>${cefrOf(rz.cefr).desc} Your strongest skill is <b style="color:#fff">${rz.strongest}</b>; the one holding your overall score down is <b style="color:#fff">${rz.weakest}</b>.</p>
        </div>
        <div class="hero-chips" style="margin:0">
          <div class="hero-chip"><b>${scoreInExam(rz.band, p.exam).replace(' / ','/')}</b><span>${examOf(p.exam).short}</span></div>
          <div class="hero-chip"><b>${bandLabel(p.target)}</b><span>Your target</span></div>
          <div class="hero-chip"><b>${rz.weeks}w</b><span>Est. to target</span></div>
        </div>
      </div>
      <div style="margin-top:22px">
        <div class="cefr">${CEFR.map((c,i) => `<div class="${i===ci?'now':i<ci?'pass':i===ti?'goal':''}">${c.id}<small>${i===ci?'you':i===ti?'target':c.name.split(' ')[0]}</small></div>`).join('')}</div>
      </div>
    </div>

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Skill by skill</h3><p>Your estimate against your target of Band ${bandLabel(p.target)}</p></div></div>
        <div class="card-bd" style="padding:6px 21px 14px">
          ${['listening','reading','writing','speaking'].map(skillRow).join('')}
          <div style="display:flex;gap:14px;margin-top:18px">
            <div style="flex:1;padding:13px 15px;border-radius:12px;background:var(--paper)">
              <div style="font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:6px">Grammar accuracy</div>
              <div style="font-family:var(--display);font-size:22px;font-weight:700">${rz.detail.grammar.right}/${rz.detail.grammar.total}</div>
            </div>
            <div style="flex:1;padding:13px 15px;border-radius:12px;background:var(--paper)">
              <div style="font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:6px">Vocabulary range</div>
              <div style="font-family:var(--display);font-size:22px;font-weight:700">${rz.detail.vocabulary.right}/${rz.detail.vocabulary.total}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>What we saw in your writing</h3></div></div>
          <div class="card-bd">
            ${rz.writing.n >= 30 ? `
              <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">
                ${[['Words',rz.writing.n],['Sentences',rz.writing.sentences],['Avg length',rz.writing.avgLen],['Lexical variety',rz.writing.ttr+'%']].map(([l,v])=>`
                  <div style="flex:1;min-width:70px"><div style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${l}</div><div style="font-family:var(--mono);font-size:15px;font-weight:700;margin-top:3px">${v}</div></div>`).join('')}
              </div>
              ${rz.writing.academic.length ? `<div class="why leaf"><b>Academic vocabulary spotted</b>${rz.writing.academic.map(a=>`<span class="tag leaf" style="margin-right:4px">${a}</span>`).join('')}</div>` : ''}
              ${rz.writing.issues.length ? `<div class="why cor" style="margin-top:10px"><b>${rz.writing.issues.length} pattern${rz.writing.issues.length===1?'':'s'} to fix</b>${rz.writing.issues.slice(0,3).map(i=>`<div style="margin-top:5px"><b style="display:inline;font-size:11px;color:var(--coral)">${i.type}:</b> ${i.fix}</div>`).join('')}</div>` : `<div class="why leaf" style="margin-top:10px"><b>No recurring errors detected</b>Your sample was clean — we will look harder once you write a full Task 2.</div>`}
            ` : `<div style="font-size:12.5px;color:var(--ink-4)">Your sample was too short to analyse properly. Write a full task in the Writing Lab for a real evaluation.</div>`}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Because your first language is ${esc(B.profile.l1)}</h3><p>Errors Bloom will watch for specifically</p></div></div>
          <div class="card-bd" style="display:grid;gap:9px">
            ${l1Traps(B.profile.l1).map(t => `<div style="display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:var(--ink-2);line-height:1.55"><i class="fa-solid fa-circle-dot" style="color:var(--amber);font-size:8px;margin-top:6px"></i><span>${t}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-hd"><div style="flex:1"><h3>Your recommended programme</h3><p>Based on a ${bandLabel(Math.max(0,B.profile.target-rz.band))} band gap and ${B.profile.hoursPerDay} hours a day</p></div>
        <button class="btn btn-p btn-sm" onclick="plcAccept()">Start it <i class="fa-solid fa-arrow-right"></i></button></div>
      <div class="card-bd">
        <div class="grid g3">
          ${[
            ['fa-calendar-days', rz.weeks + '-week plan', 'Weighted towards ' + rz.weakest + ', your weakest skill, with a checkpoint mock every fortnight.'],
            ['fa-spell-check', 'Vocabulary at ' + rz.cefr + '+', 'Bloom will start you on ' + (ci >= 3 ? 'C1 academic' : 'B2 core') + ' words and move up as you master them.'],
            ['fa-pen-nib', 'Writing focus first', 'Writing is where most students at ' + rz.cefr + ' lose the most marks, and it improves fastest with feedback.'],
          ].map(([i,t,s]) => `<div style="padding:16px;border:1px solid var(--line);border-radius:14px">
            <div style="width:34px;height:34px;border-radius:11px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;margin-bottom:11px"><i class="fa-solid ${i}"></i></div>
            <b style="font-size:14px;display:block;margin-bottom:5px">${t}</b><span style="font-size:12.5px;color:var(--ink-3);line-height:1.55">${s}</span></div>`).join('')}
        </div>
      </div>
    </div>`;
}

function plcAccept(){
  if (typeof buildPlan === 'function' && !B.plan) buildPlan();
  plc = { stage:0, ans:{}, essay:'', speech:'', started:null, result:null };
  navTo('dashboard');
  toast('Your study plan is ready', 'fa-seedling');
}
