/* ═══ BLOOM — IELTS Writing Lab: submit → evaluate → learn ═══ */

let ws = { view:'home', task:1, id:null, text:'', started:null, result:null, tab:'feedback', filter:'all' };

const BAND_DESCRIPTORS = {
  ta:{ name:'Task Achievement / Response', short:'TA', ic:'fa-bullseye',
    at:{ 5:'Addresses the task only partially; the format may be inappropriate.', 6:'Addresses all parts of the task, though some parts are more fully covered than others.', 7:'Addresses all parts of the task; presents a clear position throughout.', 8:'Sufficiently addresses all parts with a well-developed response and relevant, extended ideas.' } },
  cc:{ name:'Coherence & Cohesion', short:'CC', ic:'fa-link',
    at:{ 5:'Presents information with some organisation but no clear progression.', 6:'Arranges information coherently; uses cohesive devices effectively but sometimes mechanically.', 7:'Logically organises information with clear progression; uses a range of cohesive devices.', 8:'Sequences information and ideas logically; manages all aspects of cohesion well.' } },
  lr:{ name:'Lexical Resource', short:'LR', ic:'fa-spell-check',
    at:{ 5:'Limited range of vocabulary; noticeable errors in word choice and spelling.', 6:'Adequate range; attempts less common vocabulary with some inaccuracy.', 7:'Sufficient range to allow some flexibility and precision; uses less common items with awareness of style.', 8:'Wide range used fluently and flexibly; skilful use of uncommon items with only rare slips.' } },
  gra:{ name:'Grammatical Range & Accuracy', short:'GRA', ic:'fa-diagram-project',
    at:{ 5:'Limited range of structures; frequent errors that cause difficulty for the reader.', 6:'Mix of simple and complex forms; some errors but they rarely reduce communication.', 7:'Variety of complex structures; frequent error-free sentences.', 8:'Wide range of structures; majority of sentences error-free with only occasional slips.' } },
};

function sec_writing(){
  if (ws.view === 'compose') return wComposeHTML();
  if (ws.view === 'result') return wResultHTML();
  if (ws.view === 'errors') return wErrorBankHTML();
  return wHomeHTML();
}

function wHomeHTML(){
  const es = B.essays;
  const t2 = es.filter(e => e.task === 2), t1 = es.filter(e => e.task === 1);
  const trend = es.length >= 2 ? es[0].band - es[es.length-1].band : 0;
  const bank = errorBank();
  return `
    ${phead({ eyebrow:'Writing Lab', title:`Writing <em>Lab</em>`,
      sub:'Write under exam conditions, get a band against all four official descriptors, and see every error explained rather than merely marked.',
      actions:`${bank.length?`<button class="btn btn-g btn-sm" onclick="ws.view='errors';navTo('writing')"><i class="fa-solid fa-triangle-exclamation"></i> Error bank (${bank.length})</button>`:''}
        <button class="btn btn-p" onclick="wPick(2)"><i class="fa-solid fa-pen-nib"></i> Write Task 2</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Writing band', B.scores.writing!=null?bandLabel(B.scores.writing):'—', 'Target ' + bandLabel(B.profile.target), 'amb', 'fa-pen-nib')}
      ${statCard('Tasks evaluated', es.length, t2.length + ' Task 2 · ' + t1.length + ' Task 1', 'leaf', 'fa-file-lines')}
      ${statCard('Trend', trend>0?'+'+trend.toFixed(1):trend<0?trend.toFixed(1):'—', es.length>=2?'Since your first submission':'Write two to see a trend', trend>0?'leaf':'', 'fa-arrow-trend-up')}
      ${statCard('Recurring errors', bank.length, bank.length?'Top: '+bank[0].type:'Nothing repeating yet', 'cor', 'fa-triangle-exclamation')}
    </div>

    ${es.length ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Your band by criterion</h3><p>Averaged across your last ${Math.min(5,es.length)} submissions</p></div></div>
      <div class="card-bd">
        <div class="grid g4">
          ${Object.entries(BAND_DESCRIPTORS).map(([k,d]) => {
            const recent = es.slice(0,5);
            const v = roundBand(recent.reduce((s,e)=>s+(e.criteria?.[k]||e.band),0)/recent.length);
            return `<div style="padding:15px 16px;border:1px solid var(--line);border-radius:14px">
              <div style="display:flex;gap:9px;align-items:center;margin-bottom:10px">
                <div style="width:28px;height:28px;border-radius:9px;background:var(--amber-soft);color:#a86e14;display:grid;place-items:center;font-size:11px"><i class="fa-solid ${d.ic}"></i></div>
                <span style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${d.short}</span></div>
              <div style="font-family:var(--display);font-size:25px;font-weight:700;letter-spacing:-1px">${bandLabel(v)}</div>
              <div class="bar thin" style="margin-top:9px"><i style="width:${v/9*100}%;background:${v>=7?'var(--ok)':v>=6?'var(--amber)':'var(--coral)'}"></i></div>
              <div style="font-size:11px;color:var(--ink-4);margin-top:7px;line-height:1.4">${d.name}</div></div>`;
          }).join('')}
        </div>
      </div>
    </div>` : ''}

    <div class="seg mb" style="margin-bottom:16px">
      <button class="${ws.task===2?'on':''}" onclick="ws.task=2;navTo('writing')">Task 2 · Essay</button>
      <button class="${ws.task===1?'on':''}" onclick="ws.task=1;navTo('writing')">Task 1 · Report or letter</button>
    </div>

    <div class="grid g2 mb2">
      ${(writingBank(ws.task)).map(p => {
        const done = B.essays.filter(e => e.pid === p.id);
        return `<div class="card"><div class="card-bd" style="padding:19px 21px;display:flex;flex-direction:column;height:100%">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
            <span class="tag amb">${p.type||p.kind}</span><span class="tag">${p.level}</span><span class="tag leaf">${p.topic}</span>
            ${done.length?`<span class="tag ok" style="margin-left:auto">Band ${bandLabel(Math.max(...done.map(d=>d.band)))}</span>`:''}</div>
          <div style="font-size:14.5px;line-height:1.55;color:var(--ink);flex:1;text-wrap:pretty;margin-bottom:15px">${p.prompt.split('\n')[0]}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-p btn-sm" style="flex:1;justify-content:center" onclick="wOpen('${p.id}',${ws.task})"><i class="fa-solid fa-pen"></i> ${done.length?'Write again':'Write this'}</button>
            <button class="btn btn-g btn-sm" onclick="wIdeas('${p.id}',${ws.task})">Ideas</button>
          </div>
        </div></div>`;
      }).join('')}
    </div>

    ${es.length ? `
    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Submission history</h3><p>Every task you have written, newest first</p></div></div>
      <div class="card-bd flush">
        ${es.slice(0,10).map(e => `<div class="row">
          ${typeof avatarHTML === 'function' && B.profile.avatar ? avatarHTML(30) : ''}
          <div class="band sm ${e.band>=7?'':'amb'}"><b>${bandLabel(e.band)}</b><span>Band</span></div>
          <div class="tx"><b class="clip">${esc(e.title)}</b><span>${e.date} · Task ${e.task} · ${e.words} words · ${e.mins} min${e.issues?.length?' · '+e.issues.length+' issues':''}</span></div>
          <button class="btn btn-g btn-sm" onclick="wReopen('${e.id}')">Review</button>
        </div>`).join('')}
      </div>
    </div>` : `<div class="empty"><i class="fa-solid fa-pen-nib"></i><b>Nothing written yet</b><span>Pick a prompt above. One essay evaluated properly beats five written and never checked.</span></div>`}`;
}

function wPick(task){ ws.task = task; ws.view='home'; navTo('writing'); }
function wPrompt(id, task){ return writingById(id, task); }

function wIdeas(id, task){
  const p = wPrompt(id, task);
  modal(`
    <div class="modal-hd"><div style="flex:1"><h3>Before you write</h3><p>${p.type||p.kind} · ${p.topic}</p></div><button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      <div style="font-size:14px;line-height:1.6;padding:14px 16px;background:var(--paper);border-radius:12px;margin-bottom:18px">${p.prompt.replace(/\n/g,'<br>')}</div>
      ${p.plan ? `<div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--leaf-600);font-weight:800;margin-bottom:10px">A structure that works</div>
        <div style="display:grid;gap:8px;margin-bottom:18px">${p.plan.map((s,i)=>`<div style="display:flex;gap:11px;font-size:13px;color:var(--ink-2);line-height:1.5"><b style="font-family:var(--mono);font-size:11px;color:var(--leaf-600);flex:0 0 18px">${i+1}</b><span>${s}</span></div>`).join('')}</div>` : ''}
      ${p.keyFeatures ? `<div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--leaf-600);font-weight:800;margin-bottom:10px">What the examiner needs to see</div>
        <div style="display:grid;gap:8px;margin-bottom:18px">${p.keyFeatures.map(s=>`<div style="display:flex;gap:10px;font-size:13px;color:var(--ink-2);line-height:1.5"><i class="fa-solid fa-check" style="color:var(--ok);margin-top:3px;font-size:11px"></i><span>${s}</span></div>`).join('')}</div>` : ''}
      ${p.ideas ? `<div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--amber);font-weight:800;margin-bottom:10px">Specific examples you can use</div>
        <div style="display:grid;gap:8px">${p.ideas.map(s=>`<div style="padding:11px 13px;background:var(--amber-soft);border-radius:10px;font-size:12.5px;color:#7a5410;line-height:1.5">${s}</div>`).join('')}</div>` : ''}
    </div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Close</button><button class="btn btn-p" onclick="closeModal();wOpen('${id}',${task})"><i class="fa-solid fa-pen"></i> Start writing</button></div>`, 620);
}

function wOpen(id, task){
  ws = { ...ws, view:'compose', id, task, text:'', started:Date.now(), result:null };
  navTo('writing');
}

function wComposeHTML(){
  const p = wPrompt(ws.id, ws.task);
  const min = p.wordsMin || (ws.task===2?250:150);
  const words = ws.text.trim() ? ws.text.trim().split(/\s+/).length : 0;
  const limit = ws.task === 2 ? 40 : 20;
  return `
    ${phead({ eyebrow:`Task ${ws.task} · ${p.type||p.kind}`, title:`Write your <em>response</em>`,
      sub:`${limit} minutes is the exam allowance. Minimum ${min} words — writing under the limit is penalised automatically.`,
      actions:`<button class="btn btn-g btn-sm" onclick="wIdeas('${p.id}',${ws.task})"><i class="fa-solid fa-lightbulb"></i> Ideas</button>
        <button class="btn btn-g btn-sm" onclick="ws.view='home';navTo('writing')">Exit</button>
        <button class="btn btn-p" onclick="wSubmit()"><i class="fa-solid fa-wand-magic-sparkles"></i> Evaluate my writing</button>` })}

    <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:18px;align-items:start" class="wsplit">
      <div style="display:grid;gap:16px;position:sticky;top:74px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>The task</h3><p>${p.topic} · ${p.level}</p></div></div>
          <div class="card-bd">
            <div style="font-size:14px;line-height:1.65;color:var(--ink);text-wrap:pretty">${p.prompt.replace(/\n/g,'<br><br>')}</div>
            ${p.data ? wChartHTML(p.data) : ''}
            ${p.steps ? `<div style="margin-top:16px;padding:15px;background:var(--paper);border-radius:13px">
              <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:11px">${p.plate}</div>
              <div style="display:grid;gap:7px">${p.steps.map((s,i)=>`<div style="display:flex;gap:10px;align-items:center;font-size:12.5px;color:var(--ink-2)">
                <span style="width:22px;height:22px;flex:0 0 22px;border-radius:7px;background:var(--leaf-600);color:#fff;display:grid;place-items:center;font-family:var(--mono);font-size:10px;font-weight:800">${i+1}</span>${s}
                ${i<p.steps.length-1?'<i class="fa-solid fa-arrow-right" style="color:var(--line-2);font-size:9px;margin-left:auto"></i>':''}</div>`).join('')}</div></div>` : ''}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <div style="flex:1"><h3>Your answer</h3><p>Write in full paragraphs. No bullet points.</p></div>
          <div style="display:flex;gap:10px;align-items:center">
            <span style="font-family:var(--mono);font-size:13px;font-weight:700;color:${words>=min?'var(--ok)':'var(--ink-4)'}">${words}</span>
            <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">/ ${min}</span>
          </div>
        </div>
        <div class="card-bd">
          <textarea id="wText" rows="20" placeholder="Start with a paraphrase of the question…" style="border:none;padding:0;font-size:15px;line-height:1.8;min-height:440px;resize:vertical"
            oninput="ws.text=this.value;wLiveCount()">${esc(ws.text)}</textarea>
        </div>
        <div style="padding:14px 21px;border-top:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <span id="wHint" style="font-size:12px;color:var(--ink-4)">${words<min?`${min-words} more words needed`:'Length is fine — now check your paragraphing'}</span>
          <div style="flex:1"></div>
          <button class="btn btn-p" onclick="wSubmit()"><i class="fa-solid fa-wand-magic-sparkles"></i> Evaluate my writing</button>
        </div>
      </div>
    </div>
    <style>@media(max-width:1080px){.wsplit{grid-template-columns:1fr!important}.wsplit>div:first-child{position:static!important}}</style>`;
}
function wLiveCount(){
  const p = wPrompt(ws.id, ws.task), min = p.wordsMin || (ws.task===2?250:150);
  const n = ws.text.trim() ? ws.text.trim().split(/\s+/).length : 0;
  const hd = document.querySelector('#view .card-hd span'); // first count span
  const hint = document.getElementById('wHint');
  const spans = document.querySelectorAll('.card-hd span');
  spans.forEach(s => { if (s.textContent.match(/^\d+$/)) { s.textContent = n; s.style.color = n>=min?'var(--ok)':'var(--ink-4)'; } });
  if (hint) hint.textContent = n < min ? `${min-n} more words needed` : 'Length is fine — now check your paragraphing';
}

function wChartHTML(d){
  const max = Math.max(...d.series.flatMap(s => s.v)) * 1.1;
  const W = 300, H = 170, pad = 26;
  const x = i => pad + i * (W - pad*2) / (d.years.length - 1);
  const y = v => H - pad - (v / max) * (H - pad*2);
  return `<div style="margin-top:16px;padding:14px;background:var(--paper);border-radius:13px">
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
      ${[0,0.25,0.5,0.75,1].map(f=>`<line x1="${pad}" x2="${W-pad}" y1="${H-pad-f*(H-pad*2)}" y2="${H-pad-f*(H-pad*2)}" stroke="var(--line)" stroke-width="1"/>
        <text x="${pad-5}" y="${H-pad-f*(H-pad*2)+3}" text-anchor="end" font-size="7" fill="var(--ink-4)" font-family="monospace">${Math.round(max*f)}</text>`).join('')}
      ${d.series.map(s=>`<polyline fill="none" stroke="${s.c}" stroke-width="2" stroke-linejoin="round" points="${s.v.map((v,i)=>x(i)+','+y(v)).join(' ')}"/>
        ${s.v.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${s.c}"/>`).join('')}`).join('')}
      ${d.years.map((yr,i)=>`<text x="${x(i)}" y="${H-pad+12}" text-anchor="middle" font-size="7.5" fill="var(--ink-4)" font-family="monospace">${yr}</text>`).join('')}
    </svg>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px">
      ${d.series.map(s=>`<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-3)"><span style="width:10px;height:3px;border-radius:2px;background:${s.c}"></span>${s.n}</span>`).join('')}
    </div></div>`;
}

/* ── evaluation ── */
function wSubmit(){
  const p = wPrompt(ws.id, ws.task);
  const min = p.wordsMin || (ws.task===2?250:150);
  const words = ws.text.trim() ? ws.text.trim().split(/\s+/).length : 0;
  if (words < 40){ toast('Write a full response before evaluating'); return; }
  const mins = Math.max(1, Math.round((Date.now() - ws.started) / 60000));
  const ev = evaluateWriting(ws.text, ws.task, p, min);
  const entry = {
    id:'e'+Date.now(), pid:p.id, task:ws.task, title:(p.type||p.kind) + ' · ' + p.topic,
    prompt:p.prompt, text:ws.text, date:today(), words, mins,
    band:ev.band, criteria:ev.criteria, issues:ev.issues, strengths:ev.strengths, stats:ev.stats, advice:ev.advice,
  };
  B.essays.unshift(entry); B.essays = B.essays.slice(0,40);
  B.scores.writing = B.scores.writing == null ? ev.band : roundBand(B.scores.writing * 0.55 + ev.band * 0.45);
  B.history.push({ at:today(), kind:'writing', band:ev.band });
  save(); markActive(mins); addXP(60);
  if (B.essays.length === 1) earn('first-essay');
  if (B.essays.length >= 10) earn('ten-essays');
  ws.result = entry; ws.tab = 'feedback';
  if (typeof mockCapture === 'function' && mockCapture('writing', ev.band)){ ws.view = 'result'; navTo('writing'); return; }
  ws.view = 'result';
  navTo('writing');
}

function evaluateWriting(text, task, prompt, min){
  const base = analyseText(text, 'writing');
  const t = text.trim();
  const words = base.n;
  const paras = t.split(/\n\s*\n/).filter(x => x.trim().length > 20);
  const sentences = t.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 3);

  /* ── Task Achievement ── */
  let ta = 5.0;
  if (words >= min) ta += 1.0; else ta -= Math.min(1.5, (min - words) / min * 3);
  if (paras.length >= (task===2?4:3)) ta += 0.7;
  if (/\b(in my (view|opinion)|i (believe|would argue|contend)|this essay will)\b/i.test(t)) ta += 0.4;
  if (/\b(for (instance|example)|such as|namely|to illustrate)\b/i.test(t)) ta += 0.5;
  if (task === 1 && /\boverall\b/i.test(t)) ta += 0.6;
  if (task === 1 && /\d/.test(t)) ta += 0.4;
  if (task === 2 && /\bconclusion\b|\bto conclude\b|\bin summary\b/i.test(t)) ta += 0.4;

  /* ── Coherence & Cohesion ── */
  let cc = 5.0;
  cc += Math.min(1.4, base.linkHits * 0.28);
  if (paras.length >= 4) cc += 0.8; else if (paras.length >= 3) cc += 0.4;
  if (/\b(firstly|secondly|thirdly|finally)\b.*\b(firstly|secondly|thirdly|finally)\b/is.test(t)) cc -= 0.4;
  if (/\b(this|these|such|the former|the latter)\b/i.test(t)) cc += 0.4;
  const avgPara = paras.length ? words / paras.length : words;
  if (avgPara > 20 && avgPara < 130) cc += 0.4;

  /* ── Lexical Resource ── */
  let lr = 4.6;
  lr += Math.min(1.6, (base.ttr - 38) / 14);
  lr += Math.min(1.2, base.academic.length * 0.32);
  lr += Math.min(0.8, base.long / Math.max(20, words) * 9);
  if (/\b(very|really|a lot of|big|good|bad|thing|stuff)\b/gi.test(t)){
    const basic = (t.match(/\b(very|really|a lot of|big|good|bad|thing|stuff)\b/gi)||[]).length;
    lr -= Math.min(0.9, basic * 0.14);
  }

  /* ── Grammatical Range & Accuracy ── */
  let gra = 5.0;
  if (base.complex) gra += 0.9;
  const complexCount = (t.match(/\b(although|whereas|despite|however|which|whose|unless|provided that|not only)\b/gi)||[]).length;
  gra += Math.min(1.1, complexCount * 0.2);
  if (base.avgLen >= 13 && base.avgLen <= 26) gra += 0.5;
  if (/\b(if\s+\w+\s+(had|were)|would have|might have)\b/i.test(t)) gra += 0.4;
  if (/\b(is|are|was|were|been|being)\s+\w+(ed|en)\b/i.test(t)) gra += 0.3;
  gra -= Math.min(1.8, base.issues.length * 0.3);

  const criteria = {
    ta: roundBand(Math.max(4, Math.min(9, ta))),
    cc: roundBand(Math.max(4, Math.min(9, cc))),
    lr: roundBand(Math.max(4, Math.min(9, lr))),
    gra: roundBand(Math.max(4, Math.min(9, gra))),
  };
  const band = roundBand((criteria.ta + criteria.cc + criteria.lr + criteria.gra) / 4);

  /* ── sentence-level corrections ── */
  const issues = [...base.issues];
  sentences.forEach((s, i) => {
    const trimmed = s.trim();
    if (/\bpeople is\b/i.test(trimmed)) issues.push({ type:'Subject–verb agreement', line:i+1, bad:trimmed, fix:trimmed.replace(/people is/ig,'people are'), why:'"People" is an irregular plural and always takes a plural verb.' });
    if (/\binformations\b/i.test(trimmed)) issues.push({ type:'Uncountable noun', line:i+1, bad:trimmed, fix:trimmed.replace(/informations/ig,'information'), why:'"Information" is uncountable — no plural -s, and never "an information".' });
    if (/\badvices\b/i.test(trimmed)) issues.push({ type:'Uncountable noun', line:i+1, bad:trimmed, fix:trimmed.replace(/advices/ig,'advice'), why:'"Advice" is uncountable. Use "a piece of advice" if you need to count it.' });
    if (/\bdiscuss about\b/i.test(trimmed)) issues.push({ type:'Collocation', line:i+1, bad:trimmed, fix:trimmed.replace(/discuss about/ig,'discuss'), why:'"Discuss" is transitive and takes no preposition.' });
    if (/\bdespite of\b/i.test(trimmed)) issues.push({ type:'Preposition', line:i+1, bad:trimmed, fix:trimmed.replace(/despite of/ig,'despite'), why:'Choose "despite" or "in spite of" — never mix them.' });
    if (/\bnowadays\b.*\bnowadays\b/i.test(t) && /\bnowadays\b/i.test(trimmed) && i > 2) issues.push({ type:'Repetition', line:i+1, bad:trimmed, fix:trimmed.replace(/nowadays/i,'in recent years'), why:'Repeating the same time marker lowers Lexical Resource. Vary it.' });
    if (/\bcan't|don't|won't|isn't|it's\b/i.test(trimmed)) issues.push({ type:'Register', line:i+1, bad:trimmed, fix:trimmed.replace(/can't/ig,'cannot').replace(/don't/ig,'do not').replace(/won't/ig,'will not').replace(/isn't/ig,'is not').replace(/it's/ig,'it is'), why:'Contractions are informal. Academic writing spells the words out in full.' });
    if (trimmed.split(/\s+/).length > 48) issues.push({ type:'Sentence length', line:i+1, bad:trimmed.slice(0,90)+'…', fix:'Split this into two sentences.', why:'Sentences over about 45 words usually lose the reader and hide grammar errors.' });
  });

  const strengths = [];
  if (paras.length >= 4) strengths.push({ t:'Clear paragraphing', s:`${paras.length} paragraphs with a visible structure — that is what Coherence and Cohesion rewards.` });
  if (base.academic.length) strengths.push({ t:'Academic vocabulary', s:`You used ${base.academic.slice(0,4).join(', ')}${base.academic.length>4?' and others':''} accurately.` });
  if (base.complex) strengths.push({ t:'Complex structures', s:'You used subordinate clauses rather than only simple sentences.' });
  if (words >= min + 40) strengths.push({ t:'Comfortable length', s:`${words} words gives you room to develop ideas without padding.` });
  if (base.linkHits >= 4) strengths.push({ t:'Range of linkers', s:`${base.linkHits} different cohesive devices — enough variety to avoid sounding mechanical.` });

  const advice = [];
  const lowest = Object.entries(criteria).sort((a,b)=>a[1]-b[1])[0];
  advice.push({ crit:lowest[0], t:'Your lowest criterion is ' + BAND_DESCRIPTORS[lowest[0]].name,
    s: lowest[0]==='ta' ? 'Answer every part of the question explicitly and give a concrete example in each body paragraph.'
     : lowest[0]==='cc' ? 'Give every body paragraph one topic sentence that states its single idea, then vary how you connect ideas rather than starting each sentence with a linker.'
     : lowest[0]==='lr' ? 'Replace your five most common general words with precise ones. Learn collocations, not isolated words.'
     : 'Write more complex sentences — although, whereas, which — and check every plural and article before you submit.' });
  if (words < min) advice.push({ crit:'ta', t:'You are under the word limit', s:`${min} words is the minimum. Under it, Task Achievement is capped regardless of quality.` });
  if (paras.length < 4 && task === 2) advice.push({ crit:'cc', t:'Use four or five paragraphs', s:'Introduction, two body paragraphs, conclusion. Anything less looks unplanned.' });
  if (base.ttr < 42) advice.push({ crit:'lr', t:'You are repeating words', s:`Only ${base.ttr}% of your words were unique. Paraphrase the question rather than copying its wording.` });

  return { band, criteria, issues:issues.slice(0,10), strengths, advice, stats:{ ...base, paras:paras.length, sentences:sentences.length } };
}

function wResultHTML(){
  const e = ws.result || B.essays[0];
  if (!e) return wHomeHTML();
  const p = wPrompt(e.pid, e.task);
  const tabs = [['feedback','Feedback'],['errors','Corrections ('+e.issues.length+')'],['model','Model answer'],['text','My answer']];
  return `
    ${phead({ eyebrow:`Task ${e.task} evaluated`, title:`Band <em>${bandLabel(e.band)}</em>`,
      sub:`${e.words} words in ${e.mins} minutes. ${e.band >= B.profile.target ? 'That is at or above your target.' : `You need ${bandLabel(B.profile.target - e.band)} more bands to reach your target of ${bandLabel(B.profile.target)}.`}`,
      actions:`<button class="btn btn-g btn-sm" onclick="ws.view='home';navTo('writing')">All tasks</button><button class="btn btn-p" onclick="wOpen('${e.pid}',${e.task})"><i class="fa-solid fa-rotate-right"></i> Rewrite this</button>` })}

    <div class="card mb2"><div class="card-bd">
      <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
        <div class="band" style="width:96px;height:96px;border-radius:26px"><b style="font-size:33px">${bandLabel(e.band)}</b><span>Overall</span></div>
        <div style="flex:1;min-width:280px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:13px">
          ${Object.entries(BAND_DESCRIPTORS).map(([k,d]) => {
            const v = e.criteria[k];
            return `<div style="padding:12px 14px;border:1px solid var(--line);border-radius:12px">
              <div style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:5px">${d.short}</div>
              <div style="display:flex;align-items:baseline;gap:7px"><b style="font-family:var(--display);font-size:22px;font-weight:700">${bandLabel(v)}</b>
                <i class="fa-solid ${d.ic}" style="color:var(--ink-4);font-size:11px;margin-left:auto"></i></div>
              <div class="bar thin" style="margin-top:8px"><i style="width:${v/9*100}%;background:${v>=7?'var(--ok)':v>=6?'var(--amber)':'var(--coral)'}"></i></div>
              <div style="font-size:10.5px;color:var(--ink-4);margin-top:6px;line-height:1.4">${d.at[Math.min(8,Math.max(5,Math.floor(v)))]}</div></div>`;
          }).join('')}
        </div>
      </div>
    </div></div>

    <div class="seg mb" style="margin-bottom:16px">${tabs.map(([k,l])=>`<button class="${ws.tab===k?'on':''}" onclick="ws.tab='${k}';navTo('writing')">${l}</button>`).join('')}</div>

    ${ws.tab === 'feedback' ? `
      <div class="split">
        <div style="display:grid;gap:16px">
          ${e.advice.map(a => `<div class="card" style="border-left:3px solid var(--amber)"><div class="card-bd">
            <div style="display:flex;gap:11px;align-items:flex-start">
              <div style="width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:var(--amber-soft);color:#a86e14;display:grid;place-items:center"><i class="fa-solid ${BAND_DESCRIPTORS[a.crit]?.ic||'fa-lightbulb'}"></i></div>
              <div><b style="font-size:14.5px;display:block;margin-bottom:5px">${a.t}</b><span style="font-size:13px;color:var(--ink-3);line-height:1.6">${a.s}</span></div>
            </div></div></div>`).join('')}
          ${e.strengths.length ? `<div class="card"><div class="card-hd"><div style="flex:1"><h3>What worked</h3><p>Keep doing these</p></div></div>
            <div class="card-bd" style="display:grid;gap:11px">${e.strengths.map(s=>`<div style="display:flex;gap:11px;align-items:flex-start">
              <i class="fa-solid fa-circle-check" style="color:var(--ok);margin-top:3px"></i>
              <div><b style="font-size:13px;display:block">${s.t}</b><span style="font-size:12.5px;color:var(--ink-3);line-height:1.5">${s.s}</span></div></div>`).join('')}</div></div>` : ''}
        </div>
        <div style="display:grid;gap:16px">
          <div class="card"><div class="card-hd"><div style="flex:1"><h3>Text analysis</h3></div></div>
            <div class="card-bd" style="display:grid;gap:12px">
              ${[['Words',e.stats.n],['Paragraphs',e.stats.paras],['Sentences',e.stats.sentences],['Average sentence',e.stats.avgLen+' words'],['Lexical variety',e.stats.ttr+'%'],['Cohesive devices',e.stats.linkHits],['Academic words used',e.stats.academic.length]].map(([l,v])=>`
                <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:9px;border-bottom:1px dashed var(--line)">
                  <span style="font-size:12.5px;color:var(--ink-3)">${l}</span><b style="font-family:var(--mono);font-size:13px">${v}</b></div>`).join('')}
              ${e.stats.academic.length?`<div><div style="font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:7px">Spotted</div>
                <div style="display:flex;flex-wrap:wrap;gap:5px">${e.stats.academic.map(a=>`<span class="tag leaf">${a}</span>`).join('')}</div></div>`:''}
            </div></div>
          <div class="card" style="border-color:var(--violet)"><div class="card-bd">
            <div style="display:flex;gap:11px;align-items:center;margin-bottom:11px">
              <div style="width:30px;height:30px;border-radius:10px;background:var(--violet);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
              <b style="font-size:14px">Take this to Bloom Tutor</b></div>
            <div style="font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-bottom:13px">Ask Bloom Tutor to drill the exact structures you got wrong here, rather than reading about them.</div>
            <button class="btn btn-v btn-blk" onclick="tutorFromEssay('${e.id}')"><i class="fa-solid fa-comments"></i> Drill my errors</button>
            <button class="btn btn-g btn-blk" style="margin-top:8px" onclick="navTo('tutoring')"><i class="fa-solid fa-chalkboard-user"></i> Review this with a teacher</button>
          </div></div>
        </div>
      </div>`
    : ws.tab === 'errors' ? `
      ${e.issues.length ? `<div style="display:grid;gap:12px;max-width:900px">
        ${e.issues.map((iss,i) => `<div class="card"><div class="card-bd" style="padding:0">
          <div style="padding:11px 18px;background:var(--paper);border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center">
            <span class="tag cor">${iss.type}</span>${iss.line?`<span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">sentence ${iss.line}</span>`:''}</div>
          ${iss.bad?`<div style="padding:13px 18px;background:var(--err-soft);display:flex;gap:11px;align-items:flex-start">
            <i class="fa-solid fa-xmark" style="color:var(--err);margin-top:3px"></i><div style="font-size:13.5px;color:var(--ink-2);line-height:1.5">${esc(iss.bad)}</div></div>`:''}
          ${iss.fix?`<div style="padding:13px 18px;background:var(--ok-soft);display:flex;gap:11px;align-items:flex-start">
            <i class="fa-solid fa-check" style="color:var(--ok);margin-top:3px"></i><div style="font-size:13.5px;color:var(--ink);font-weight:600;line-height:1.5">${esc(iss.fix)}</div></div>`:''}
          <div style="padding:12px 18px;font-size:12.5px;color:var(--ink-3);line-height:1.6"><b style="color:var(--ink-2)">Why:</b> ${iss.why||iss.fix}</div>
        </div></div>`).join('')}
      </div>` : `<div class="empty"><i class="fa-solid fa-circle-check"></i><b>No sentence-level errors detected</b><span>Your accuracy is good. To go higher, focus on range rather than correctness.</span></div>`}`
    : ws.tab === 'model' ? `
      ${p.model ? `<div class="card" style="max-width:820px"><div class="card-hd"><div style="flex:1"><h3>Model answer · Band ${p.band}</h3><p>Read it once for structure, then once for language. Do not memorise it.</p></div></div>
        <div class="card-bd" style="font-size:14.5px;line-height:1.85;color:var(--ink-2);white-space:pre-wrap">${esc(p.model)}</div></div>`
      : `<div class="card" style="max-width:820px"><div class="card-hd"><div style="flex:1"><h3>How a Band ${p.band||8} answer is built</h3></div></div>
        <div class="card-bd"><div style="display:grid;gap:11px">${(p.plan||[]).map((s,i)=>`<div style="display:flex;gap:12px;padding:13px 15px;background:var(--paper);border-radius:12px">
          <b style="font-family:var(--mono);font-size:12px;color:var(--leaf-600);flex:0 0 20px">${i+1}</b><span style="font-size:13.5px;color:var(--ink-2);line-height:1.55">${s}</span></div>`).join('')}</div></div></div>`}`
    : `<div class="card" style="max-width:820px"><div class="card-hd"><div style="flex:1"><h3>What you wrote</h3><p>${e.words} words · ${e.date}</p></div></div>
        <div class="card-bd" style="font-size:14.5px;line-height:1.85;color:var(--ink-2);white-space:pre-wrap">${esc(e.text)}</div></div>`}`;
}

function wReopen(id){ const e = B.essays.find(x => x.id === id); if (!e) return; ws.result = e; ws.view = 'result'; ws.tab = 'feedback'; navTo('writing'); }

/* ── error bank ── */
function errorBank(){
  const map = {};
  B.essays.forEach(e => (e.issues||[]).forEach(i => {
    map[i.type] = map[i.type] || { type:i.type, n:0, examples:[] };
    map[i.type].n++;
    if (map[i.type].examples.length < 4 && i.bad) map[i.type].examples.push({ bad:i.bad, fix:i.fix, why:i.why, date:e.date });
  }));
  return Object.values(map).sort((a,b) => b.n - a.n);
}
function wErrorBankHTML(){
  const bank = errorBank();
  return `
    ${phead({ eyebrow:'Writing Lab', title:`My error <em>bank</em>`, sub:'Every mistake Bloom has found in your writing, grouped by type. The one at the top is costing you the most marks.',
      actions:`<button class="btn btn-g btn-sm" onclick="ws.view='home';navTo('writing')"><i class="fa-solid fa-arrow-left"></i> Back</button>` })}
    ${bank.length ? bank.map(b => `<div class="card mb">
      <div class="card-hd"><div style="flex:1"><h3>${b.type}</h3><p>Seen ${b.n} time${b.n===1?'':'s'} across your submissions</p></div>
        <span class="tag ${b.n>=3?'cor':'amb'}">${b.n}×</span></div>
      <div class="card-bd" style="display:grid;gap:11px">
        ${b.examples.map(x=>`<div style="border-left:3px solid var(--coral);background:var(--paper);border-radius:0 11px 11px 0;padding:12px 15px">
          <div style="font-size:13px;color:var(--ink-3);text-decoration:line-through;margin-bottom:5px">${esc(x.bad)}</div>
          ${x.fix?`<div style="font-size:13px;color:var(--ok);font-weight:600;margin-bottom:5px">${esc(x.fix)}</div>`:''}
          <div style="font-size:12px;color:var(--ink-4);line-height:1.5">${x.why||''}</div></div>`).join('')}
      </div></div>`).join('')
    : `<div class="empty"><i class="fa-solid fa-circle-check"></i><b>No recurring errors yet</b><span>Write a few tasks and Bloom will collect the patterns here.</span></div>`}`;
}
