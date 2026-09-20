/* ═══ BLOOM — IELTS Speaking Lab: record → transcribe → band ═══ */

let ss = { view:'home', part:2, cue:null, q:0, phase:'prep', prepLeft:60, talkLeft:120, timer:null, recording:false, transcript:'', result:null, secs:0 };

const SPEAK_CRITERIA = {
  fc:{ name:'Fluency & Coherence', short:'FC', ic:'fa-water' },
  lr:{ name:'Lexical Resource', short:'LR', ic:'fa-spell-check' },
  gra:{ name:'Grammatical Range & Accuracy', short:'GRA', ic:'fa-diagram-project' },
  pr:{ name:'Pronunciation', short:'PR', ic:'fa-wave-square' },
};
const FILLERS = ['um','uh','er','erm','like','you know','i mean','basically','actually','sort of','kind of'];

function sec_speaking(){
  if (ss.view === 'session') return spSessionHTML();
  if (ss.view === 'result') return spResultHTML();
  if (ss.view === 'pron') return spPronHTML();
  return spHomeHTML();
}

function spHomeHTML(){
  const sp = B.speeches;
  const last = sp[0];
  const avgFillers = sp.length ? Math.round(sp.reduce((s,x)=>s+(x.fillers||0),0)/sp.length) : 0;
  const avgWpm = sp.length ? Math.round(sp.reduce((s,x)=>s+(x.wpm||0),0)/sp.length) : 0;
  return `
    ${phead({ eyebrow:'Speaking Lab', title:`Speaking <em>Lab</em>`,
      sub:'A full three-part examiner simulation. Record your answer, get a transcript, and see fluency, vocabulary, grammar and pronunciation scored separately.',
      actions:`<button class="btn btn-g btn-sm" onclick="ss.view='pron';navTo('speaking')"><i class="fa-solid fa-wave-square"></i> Pronunciation</button>
        <button class="btn btn-p" onclick="spStart(2)"><i class="fa-solid fa-microphone"></i> Practise Part 2</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Speaking band', B.scores.speaking!=null?bandLabel(B.scores.speaking):'—', 'Target ' + bandLabel(B.profile.target), 'cor', 'fa-microphone')}
      ${statCard('Responses recorded', sp.length, sp.length?'Last: Band '+bandLabel(last.band):'None yet', 'leaf', 'fa-waveform-lines')}
      ${statCard('Speaking rate', avgWpm?avgWpm+' wpm':'—', avgWpm?(avgWpm<110?'A little slow — aim for 130':avgWpm>190?'Slow down slightly':'Natural pace'):'Record to measure', avgWpm>=110&&avgWpm<=190?'leaf':'amb','fa-gauge-high')}
      ${statCard('Filler words', avgFillers?avgFillers+' per answer':'—', avgFillers>6?'Hesitation is costing you fluency':'Within a natural range', avgFillers>6?'cor':'leaf','fa-comment-dots')}
    </div>

    <div class="grid g3 mb2">
      ${[[1,'Part 1','Introduction & interview','4–5 minutes of familiar questions about you.','fa-comment'],
         [2,'Part 2','Long turn (cue card)','1 minute to prepare, then speak for 2 minutes alone.','fa-clock'],
         [3,'Part 3','Two-way discussion','Abstract questions linked to your Part 2 topic.','fa-comments']].map(([n,t,s,d,ic])=>`
        <div class="card" style="cursor:pointer" onclick="spStart(${n})">
          <div class="card-bd" style="padding:20px">
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:13px">
              <div style="width:38px;height:38px;border-radius:12px;background:var(--coral-soft);color:var(--coral);display:grid;place-items:center;font-size:15px"><i class="fa-solid ${ic}"></i></div>
              <div><b style="font-family:var(--display);font-size:17px;font-weight:700;display:block">${t}</b><span style="font-size:11px;color:var(--ink-4)">${s}</span></div>
            </div>
            <div style="font-size:12.5px;color:var(--ink-3);line-height:1.55;margin-bottom:14px">${d}</div>
            <button class="btn btn-g btn-sm btn-blk"><i class="fa-solid fa-microphone"></i> Start Part ${n}</button>
          </div></div>`).join('')}
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Part 2 cue cards</h3><p>The long turn is where most students lose fluency marks</p></div></div>
      <div class="card-bd">
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:13px">
          ${speakingBank(2).map(c => {
            const done = B.speeches.filter(s => s.cue === c.id);
            return `<div style="border:1px solid var(--line);border-radius:15px;padding:17px 18px;background:var(--surface)">
              <div style="display:flex;gap:7px;margin-bottom:11px"><span class="tag cor">${c.topic}</span><span class="tag amb">Band ${c.band}+</span>
                ${done.length?`<span class="tag ok" style="margin-left:auto">${done.length}×</span>`:''}</div>
              <b style="font-family:var(--display);font-size:15.5px;font-weight:700;display:block;line-height:1.3;margin-bottom:9px">${c.card}</b>
              <div style="display:grid;gap:3px;margin-bottom:13px">${c.bullets.map(b=>`<div style="font-size:11.5px;color:var(--ink-4);display:flex;gap:7px"><span>·</span><span>${b}</span></div>`).join('')}</div>
              <button class="btn btn-p btn-sm btn-blk" onclick="spStart(2,'${c.id}')"><i class="fa-solid fa-microphone"></i> Practise this</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${sp.length ? `
    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Recording history</h3></div></div>
      <div class="card-bd flush">
        ${sp.slice(0,8).map(s => `<div class="row">
          ${typeof avatarHTML === 'function' && B.profile.avatar ? avatarHTML(30) : ''}
          <div class="band sm cor"><b>${bandLabel(s.band)}</b><span>Band</span></div>
          <div class="tx"><b class="clip">${esc(s.title)}</b><span>${s.date} · Part ${s.part} · ${s.secs}s · ${s.words} words · ${s.wpm} wpm</span></div>
          <button class="btn btn-g btn-sm" onclick="spReopen('${s.id}')">Review</button>
        </div>`).join('')}
      </div>
    </div>` : ''}`;
}

function spStart(part, cueId){
  const cue = part === 2 ? (speakingById(cueId) || speakingBank(2)[Math.floor(Math.random()*speakingBank(2).length)]) : null;
  ss = { ...ss, view:'session', part, cue, q:0, phase: part===2?'prep':'talk', prepLeft:60, talkLeft: part===2?120:60, recording:false, transcript:'', secs:0, result:null };
  navTo('speaking');
  if (part === 2) spPrepTick();
}
function spPrepTick(){
  clearInterval(ss.timer);
  ss.timer = setInterval(() => {
    if (B.section !== 'speaking' || ss.view !== 'session'){ clearInterval(ss.timer); return; }
    ss.prepLeft--;
    const el = document.getElementById('spPrep');
    if (el) el.textContent = fmtClock(ss.prepLeft);
    if (ss.prepLeft <= 0){ clearInterval(ss.timer); ss.phase = 'talk'; navTo('speaking'); }
  }, 1000);
}

function spSessionHTML(){
  const part = ss.part;
  if (part === 2 && ss.phase === 'prep'){
    const c = ss.cue;
    return `
      ${phead({ eyebrow:'Speaking · Part 2', title:`One minute to <em>prepare</em>`, sub:'Make notes. Do not write full sentences — you will read them out and sound rehearsed.',
        actions:`<button class="btn btn-g btn-sm" onclick="clearInterval(ss.timer);ss.view='home';navTo('speaking')">Exit</button>` })}
      <div style="max-width:720px;margin:0 auto">
        <div class="card" style="background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700));border:none;color:#fff;margin-bottom:18px">
          <div class="card-bd" style="padding:26px 28px">
            <div style="font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;margin-bottom:12px">Candidate task card</div>
            <div style="font-family:var(--display);font-size:22px;font-weight:700;line-height:1.3;margin-bottom:16px">${c.card}</div>
            <div style="font-size:13px;color:rgba(255,255,255,.72);margin-bottom:9px">You should say:</div>
            <div style="display:grid;gap:6px">${c.bullets.map(b=>`<div style="display:flex;gap:9px;font-size:14px;color:rgba(255,255,255,.9)"><span style="color:var(--leaf-300)">·</span><span>${b}</span></div>`).join('')}</div>
          </div>
        </div>
        <div style="text-align:center;margin-bottom:18px">
          <div style="font-family:var(--display);font-size:46px;font-weight:700;letter-spacing:-2px;color:var(--amber)" id="spPrep">${fmtClock(ss.prepLeft)}</div>
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-4);font-weight:800">Preparation time</div>
        </div>
        <div class="card mb"><div class="card-bd">
          <div class="fg"><label>Your notes (four words per bullet is plenty)</label><textarea rows="4" placeholder="grandmother · village · taught me patience · still call weekly"></textarea></div>
        </div></div>
        <div class="why amb mb"><b>Examiner's tip</b>${c.tip}</div>
        <button class="btn btn-p btn-blk btn-lg" onclick="clearInterval(ss.timer);ss.phase='talk';navTo('speaking')"><i class="fa-solid fa-microphone"></i> I'm ready — start speaking</button>
      </div>`;
  }

  const questions = part === 1 ? speakingBank(1)[ss.q % speakingBank(1).length]
    : part === 3 ? (speakingBank(3).find(x => x.for === (ss.cue?.id)) || speakingBank(3)[0]) : null;
  const words = ss.transcript.trim() ? ss.transcript.trim().split(/\s+/).length : 0;
  const target = part === 2 ? 200 : 90;

  return `
    ${phead({ eyebrow:`Speaking · Part ${part}`, title:part===2?`Speak for two <em>minutes</em>`:`Answer the <em>examiner</em>`,
      sub:part===2?'Keep going until the examiner stops you. Silence costs more than a small grammar error.':'Extend every answer with a reason and an example — one-line answers cap you at Band 5.',
      actions:`<button class="btn btn-g btn-sm" onclick="spQuit()">Exit</button>${words>=20?`<button class="btn btn-p btn-sm" onclick="spEvaluate()"><i class="fa-solid fa-wand-magic-sparkles"></i> Evaluate</button>`:''}` })}

    <div style="max-width:760px;margin:0 auto">
      ${part === 2 ? `
        <div class="card mb" style="background:var(--leaf-50);border-color:var(--leaf-300)">
          <div class="card-bd" style="padding:18px 20px">
            <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:8px">Your cue card</div>
            <b style="font-family:var(--display);font-size:17px;font-weight:700;display:block;margin-bottom:9px">${ss.cue.card}</b>
            <div style="display:flex;flex-wrap:wrap;gap:12px">${ss.cue.bullets.map(b=>`<span style="font-size:12px;color:var(--ink-3)">· ${b}</span>`).join('')}</div>
          </div></div>`
      : `<div class="card mb"><div class="card-bd">
          <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--coral);font-weight:800;margin-bottom:11px">${questions.topic} · question ${ss.q%4+1} of 4</div>
          <div style="font-family:var(--display);font-size:21px;font-weight:600;line-height:1.35;margin-bottom:14px">${questions.qs[ss.q % questions.qs.length]}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-g btn-sm" onclick="ss.q=(ss.q+1)%${questions.qs.length};navTo('speaking')"><i class="fa-solid fa-forward"></i> Next question</button>
            <span style="font-size:12px;color:var(--ink-4);align-self:center">Answer for 30–45 seconds</span>
          </div></div></div>`}

      <div class="card mb"><div class="card-bd" style="text-align:center;padding:28px">
        <button id="spRecBtn" class="btn ${ss.recording?'':'btn-a'} btn-lg" style="${ss.recording?'background:var(--coral);color:#fff':''};width:120px;height:120px;border-radius:50%;flex-direction:column;gap:7px;justify-content:center;padding:0;font-size:26px" onclick="spToggleRec()">
          <i class="fa-solid ${ss.recording?'fa-stop':'fa-microphone'}"></i>
          <span style="font-size:11px;font-weight:800;letter-spacing:1px">${ss.recording?'STOP':'RECORD'}</span></button>
        <div id="spTimer" style="font-family:var(--display);font-size:30px;font-weight:700;letter-spacing:-1px;margin-top:16px;color:${ss.recording?'var(--coral)':'var(--ink-3)'}">${fmtClock(ss.secs)}</div>
        <div style="font-size:12px;color:var(--ink-4);margin-top:4px">${part===2?'Target: 2 minutes':'Target: 30–45 seconds'}</div>
        <div id="spWave" style="display:flex;gap:3px;justify-content:center;align-items:flex-end;height:34px;margin-top:14px">
          ${Array.from({length:28},(_,i)=>`<span style="width:3px;border-radius:2px;background:var(--line-2);height:${ss.recording?4:4}px;transition:height .18s"></span>`).join('')}
        </div>
      </div></div>

      <div class="card mb"><div class="card-hd"><div style="flex:1"><h3>Transcript</h3><p>Type what you said, as close to word for word as you can — this is what Bloom analyses</p></div>
        <span style="font-family:var(--mono);font-size:12px;color:${words>=target*0.5?'var(--ok)':'var(--ink-4)'}">${words} words</span></div>
        <div class="card-bd"><textarea id="spText" rows="8" placeholder="Well, the person who has influenced me most is probably my grandmother…" style="border:none;padding:0;font-size:14.5px;line-height:1.75" oninput="ss.transcript=this.value;spCount()">${esc(ss.transcript)}</textarea></div>
      </div>

      ${ss.cue?.vocab ? `<div class="why leaf mb"><b>Vocabulary that lifts this answer</b>${ss.cue.vocab.map(v=>`<span class="tag leaf" style="margin:2px 3px 0 0">${v}</span>`).join('')}</div>` : ''}

      ${(() => {
        const canText = words >= 20, canRec = ss.secs >= 15;
        if (canText || canRec) return `<button class="btn btn-p btn-blk btn-lg" onclick="spEvaluate()"><i class="fa-solid fa-wand-magic-sparkles"></i> ${canText?'Evaluate my speaking':'Submit recording ('+ss.secs+'s)'}</button>
          ${!canText&&canRec?'<div style="font-size:12px;color:var(--ink-4);text-align:center;margin-top:9px">Submitting from the recording alone. Fluency, pace and length are scored; add a transcript for vocabulary and grammar feedback too.</div>':''}`;
        return `<button class="btn btn-p btn-blk btn-lg" style="opacity:.45;cursor:not-allowed" onclick="toast('Record for at least 15 seconds, or type what you said','fa-microphone')"><i class="fa-solid fa-wand-magic-sparkles"></i> Evaluate my speaking</button>
          <div style="font-size:12px;color:var(--ink-4);text-align:center;margin-top:9px">Record your answer, or type what you said, then submit.</div>`;
      })()}
    </div>`;
}

function spCount(){
  const n = ss.transcript.trim() ? ss.transcript.trim().split(/\s+/).length : 0;
  const el = document.querySelector('.card-hd span[style*="mono"]');
  if (el) el.textContent = n + ' words';
}
function spToggleRec(){
  ss.recording = !ss.recording;
  const btn = document.getElementById('spRecBtn'), wave = document.getElementById('spWave'), tm = document.getElementById('spTimer');
  if (ss.recording){
    btn.style.cssText = 'background:var(--coral);color:#fff;width:120px;height:120px;border-radius:50%;flex-direction:column;gap:7px;justify-content:center;padding:0;font-size:26px';
    btn.innerHTML = '<i class="fa-solid fa-stop"></i><span style="font-size:11px;font-weight:800;letter-spacing:1px">STOP</span>';
    clearInterval(ss.timer);
    ss.timer = setInterval(() => {
      if (B.section !== 'speaking' || ss.view !== 'session'){ clearInterval(ss.timer); return; }
      ss.secs++;
      const t = document.getElementById('spTimer');
      if (t){ t.textContent = fmtClock(ss.secs); t.style.color = 'var(--coral)'; }
      const w = document.getElementById('spWave');
      if (w) [...w.children].forEach(b => b.style.height = (4 + Math.random()*28) + 'px');
      const cap = ss.part === 2 ? 125 : 65;
      if (ss.secs >= cap) spToggleRec();
    }, 1000);
  } else {
    clearInterval(ss.timer);
    btn.className = 'btn btn-g btn-lg';
    btn.style.cssText = 'width:120px;height:120px;border-radius:50%;flex-direction:column;gap:7px;justify-content:center;padding:0;font-size:26px';
    btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i><span style="font-size:11px;font-weight:800;letter-spacing:1px">AGAIN</span>';
    const w = document.getElementById('spWave'); if (w) [...w.children].forEach(b => b.style.height = '4px');
    const t = document.getElementById('spTimer'); if (t) t.style.color = 'var(--ink-3)';
    toast('Recorded ' + ss.secs + 's — now type your transcript', 'fa-check');
  }
}
function spQuit(){ clearInterval(ss.timer); ss.view = 'home'; navTo('speaking'); }

function spEvaluate(){
  const t = ss.transcript.trim();
  const words = t ? t.split(/\s+/).length : 0;
  const recOnly = words < 20 && ss.secs >= 15;
  if (words < 20 && !recOnly){ toast('Record for at least 15 seconds, or type what you said'); return; }
  const secs = ss.secs || Math.round(words / 2.2);
  const ev = recOnly ? evaluateRecordingOnly(secs, ss.part, ss.cue) : evaluateSpeaking(t, secs, ss.part, ss.cue);
  const entry = {
    id:'s'+Date.now(), part:ss.part, cue:ss.cue?.id||null,
    title: ss.part===2 ? ss.cue.card : ss.part===1 ? 'Part 1 · ' + speakingBank(1)[ss.q % speakingBank(1).length].topic : 'Part 3 discussion',
    date:today(), transcript:t, secs, ...ev,
  };
  B.speeches.unshift(entry); B.speeches = B.speeches.slice(0,40);
  B.scores.speaking = B.scores.speaking == null ? ev.band : roundBand(B.scores.speaking * 0.55 + ev.band * 0.45);
  B.history.push({ at:today(), kind:'speaking', band:ev.band });
  save(); markActive(Math.max(5, Math.round(secs/60)+3)); addXP(50);
  if (B.speeches.length === 1) earn('first-speak');
  if (B.speeches.length >= 20) earn('speak-master');
  ss.result = entry;
  if (typeof mockCapture === 'function' && mockCapture('speaking', ev.band)){ ss.view = 'result'; navTo('speaking'); return; }
  ss.view = 'result'; navTo('speaking');
}

function evaluateSpeaking(t, secs, part, cue){
  const words = t.split(/\s+/);
  const n = words.length;
  const wpm = Math.round(n / Math.max(0.4, secs/60));
  const lower = ' ' + t.toLowerCase() + ' ';
  let fillers = 0;
  FILLERS.forEach(f => { const m = lower.match(new RegExp('\\b' + f.replace(/ /g,'\\s') + '\\b','g')); if (m) fillers += m.length; });
  const fillerRate = n ? fillers / n * 100 : 0;
  const uniq = new Set(words.map(w => w.toLowerCase().replace(/[^a-z']/g,''))).size;
  const ttr = n ? Math.round(uniq / n * 100) : 0;
  const sentences = t.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length > 2);
  const avgLen = sentences.length ? n / sentences.length : n;
  const linkers = ['because','although','however','so that','which','while','even though','the reason','for example','such as','in fact','to be honest','I suppose','what I mean'];
  const linkHits = linkers.filter(l => lower.includes(l)).length;
  const idioms = ['a stone\'s throw','get to grips','steep learning curve','out of my comfort zone','in hindsight','blessing in disguise','can\'t do without','at my fingertips','unwind','look up to','role model','turning point'];
  const idiomHits = idioms.filter(i => lower.includes(i));
  const cueVocab = (cue?.vocab || []).filter(v => lower.includes(v.toLowerCase().replace(/\(.*?\)/,'').trim()));
  const complex = /\b(although|whereas|if .*(would|had)|not only|which is why|the fact that)\b/i.test(t);
  const repeated = (() => {
    const counts = {};
    words.forEach(w => { const k = w.toLowerCase().replace(/[^a-z]/g,''); if (k.length > 4) counts[k] = (counts[k]||0)+1; });
    return Object.entries(counts).filter(([,c]) => c >= 4).map(([w]) => w).slice(0,4);
  })();

  /* Fluency & Coherence */
  let fc = 5.0;
  const rateReliable = n >= 70;   /* short typed transcripts under-report the real speaking rate */
  if (rateReliable){
    if (wpm >= 110 && wpm <= 180) fc += 1.1;
    else if (wpm >= 90) fc += 0.4;
    else if (wpm >= 70) fc -= 0.2;
    else fc -= 0.5;
  } else fc += 0.3;
  fc -= Math.min(1.4, fillerRate * 0.28);
  fc += Math.min(1.0, linkHits * 0.2);
  const targetSecs = part === 2 ? 110 : 30;
  if (secs >= targetSecs) fc += 0.7; else fc -= Math.min(1.0, (targetSecs - secs) / targetSecs * 1.6);

  /* Lexical Resource */
  let lr = 4.8;
  lr += Math.min(1.4, (ttr - 40) / 13);
  lr += Math.min(1.0, idiomHits.length * 0.42);
  lr += Math.min(0.8, cueVocab.length * 0.3);
  lr -= Math.min(0.7, repeated.length * 0.18);

  /* Grammar */
  let gra = 5.0;
  if (complex) gra += 1.0;
  if (avgLen >= 11 && avgLen <= 28) gra += 0.6;
  const tenseMix = ['ed ','have ','will ','would ','was ','is '].filter(x => lower.includes(x)).length;
  gra += Math.min(0.8, tenseMix * 0.16);
  const gerr = [];
  if (/\bpeople is\b/i.test(t)) gerr.push({ bad:'people is', fix:'people are', why:'"People" is plural.' });
  if (/\bi am agree\b/i.test(t)) gerr.push({ bad:'I am agree', fix:'I agree', why:'"Agree" is a verb; it needs no "am".' });
  if (/\bmore better\b/i.test(t)) gerr.push({ bad:'more better', fix:'better', why:'Double comparative — "better" is already comparative.' });
  if (/\bdidn't went\b|\bdid not went\b/i.test(t)) gerr.push({ bad:'did not went', fix:'did not go', why:'After "did", use the base form.' });
  if (/\bevery days\b/i.test(t)) gerr.push({ bad:'every days', fix:'every day', why:'"Every" takes a singular noun.' });
  gra -= Math.min(1.5, gerr.length * 0.4);

  /* Pronunciation — proxied by rhythm markers and length, honestly labelled */
  let pr = 5.4;
  if (rateReliable && wpm >= 110 && wpm <= 175) pr += 0.9; else if (!rateReliable) pr += 0.3;
  if (sentences.length >= 4) pr += 0.5;
  pr -= Math.min(0.8, fillerRate * 0.16);
  if (n > 120) pr += 0.4;

  const criteria = { fc:roundBand(Math.max(4.5,Math.min(9,fc))), lr:roundBand(Math.max(4,Math.min(9,lr))), gra:roundBand(Math.max(4,Math.min(9,gra))), pr:roundBand(Math.max(4.5,Math.min(9,pr))) };
  const band = roundBand((criteria.fc + criteria.lr + criteria.gra + criteria.pr) / 4);

  const notes = [];
  if (fillerRate > 3) notes.push({ tone:'cor', t:`${fillers} filler words (${fillerRate.toFixed(1)}% of everything you said)`, s:'Hesitation markers are the fastest way to lose Fluency marks. Replace them with a short silent pause — silence sounds more confident than "um".' });
  if (!rateReliable) notes.push({ tone:'amb', t:'Your transcript is short', s:'Bloom measures speaking rate from your transcript. If you summarised rather than transcribing word for word, the rate shown below will understate how you actually sounded.' });
  if (rateReliable && wpm < 105) notes.push({ tone:'amb', t:`Speaking rate ${wpm} wpm — slower than natural`, s:'Native-like IELTS candidates run at 130–160 wpm. Slow speech reads as searching for words.' });
  if (rateReliable && wpm > 190) notes.push({ tone:'amb', t:`Speaking rate ${wpm} wpm — very fast`, s:'Rushing hurts pronunciation clarity. Slow down and use the extra time for better word choice.' });
  if (secs < targetSecs) notes.push({ tone:'cor', t:`You spoke for ${secs}s, target ${targetSecs}s`, s: part===2?'Part 2 must fill the full two minutes. Add a specific anecdote — it is the easiest way to extend.':'Extend every answer with a reason and an example.' });
  if (!complex) notes.push({ tone:'amb', t:'No complex sentences detected', s:'Band 7 needs subordination. Practise starting sentences with "Although…" and "The reason I say that is…".' });
  if (repeated.length) notes.push({ tone:'amb', t:`You repeated: ${repeated.join(', ')}`, s:'Repetition caps Lexical Resource at Band 6. Prepare two synonyms for your most likely topic words.' });
  if (idiomHits.length) notes.push({ tone:'leaf', t:`Natural idiomatic language: ${idiomHits.join(', ')}`, s:'Idiomatic usage is explicitly required at Band 7+ for Lexical Resource. Keep doing this.' });
  if (linkHits >= 4) notes.push({ tone:'leaf', t:`${linkHits} discourse markers used`, s:'Your answer connects rather than lists — that is Fluency and Coherence at Band 7.' });

  return { band, criteria, wpm, rateReliable, words:n, fillers, fillerRate:Math.round(fillerRate*10)/10, ttr, idioms:idiomHits, repeated, notes, gerr, sentences:sentences.length };
}

function spResultHTML(){
  const s = ss.result || B.speeches[0];
  if (!s) return spHomeHTML();
  return `
    ${phead({ eyebrow:`Part ${s.part} evaluated`, title:`Band <em>${bandLabel(s.band)}</em>`,
      sub:`${s.words} words in ${s.secs} seconds — ${s.wpm} words per minute with ${s.fillers} filler${s.fillers===1?'':'s'}.`,
      actions:`<button class="btn btn-g btn-sm" onclick="ss.view='home';navTo('speaking')">Speaking Lab</button><button class="btn btn-p" onclick="spStart(${s.part},'${s.cue||''}')"><i class="fa-solid fa-rotate-right"></i> Try again</button>` })}

    <div class="card mb2"><div class="card-bd">
      <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
        <div class="band cor" style="width:96px;height:96px;border-radius:26px"><b style="font-size:33px">${bandLabel(s.band)}</b><span>Overall</span></div>
        <div style="flex:1;min-width:280px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:13px">
          ${Object.entries(SPEAK_CRITERIA).map(([k,d]) => {
            const v = s.criteria[k];
            /* a recording submitted without a transcript cannot be scored for
               vocabulary or grammar — show those two as unscored, not invented */
            const unscored = s.recordingOnly && (k === 'lr' || k === 'gra');
            return `<div style="padding:12px 14px;border:1px solid var(--line);border-radius:12px">
              <div style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:5px">${d.short}</div>
              <div style="display:flex;align-items:baseline"><b style="font-family:var(--display);font-size:22px;font-weight:700;${unscored?'color:var(--ink-4)':''}">${unscored?'—':bandLabel(v)}</b><i class="fa-solid ${d.ic}" style="color:var(--ink-4);font-size:11px;margin-left:auto"></i></div>
              <div class="bar thin" style="margin-top:8px"><i style="width:${unscored?0:v/9*100}%;background:${v>=7?'var(--ok)':v>=6?'var(--amber)':'var(--coral)'}"></i></div>
              <div style="font-size:10.5px;color:var(--ink-4);margin-top:6px">${unscored?'not scored — no transcript':d.name}</div></div>`;
          }).join('')}
        </div>
      </div>
    </div></div>

    <div class="split">
      <div style="display:grid;gap:14px">
        ${s.notes.map(n => `<div class="why ${n.tone}"><b>${n.t}</b>${n.s}</div>`).join('')}
        ${s.gerr?.length ? `<div class="card"><div class="card-hd"><div style="flex:1"><h3>Grammar slips</h3><p>Heard in your answer</p></div></div>
          <div class="card-bd" style="display:grid;gap:10px">${s.gerr.map(g=>`
            <div style="display:flex;gap:12px;align-items:center;padding:11px 13px;background:var(--paper);border-radius:11px">
              <span style="font-size:13px;color:var(--err);text-decoration:line-through">${g.bad}</span>
              <i class="fa-solid fa-arrow-right" style="color:var(--ink-4);font-size:10px"></i>
              <span style="font-size:13px;color:var(--ok);font-weight:700">${g.fix}</span>
              <span style="font-size:11.5px;color:var(--ink-4);margin-left:auto">${g.why}</span></div>`).join('')}</div></div>` : ''}
        <div class="card"><div class="card-hd"><div style="flex:1"><h3>Your transcript</h3><p>Fillers highlighted</p></div></div>
          <div class="card-bd" style="font-size:14.5px;line-height:1.85;color:var(--ink-2)">
            ${esc(s.transcript).replace(new RegExp('\\b(' + FILLERS.join('|') + ')\\b','gi'), m => `<mark style="background:var(--coral-soft);color:var(--coral);border-radius:4px;padding:0 3px">${m}</mark>`)}
          </div></div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card"><div class="card-hd"><div style="flex:1"><h3>Delivery</h3></div></div>
          <div class="card-bd" style="display:grid;gap:12px">
            ${[['Speaking rate',(s.rateReliable===false?'~':'')+s.wpm+' wpm',s.rateReliable===false||(s.wpm>=110&&s.wpm<=180)],['Words spoken',s.words,s.words>=(s.part===2?180:70)],['Duration',s.secs+'s',s.secs>=(s.part===2?110:30)],['Filler rate',s.fillerRate+'%',s.fillerRate<3],['Lexical variety',s.ttr+'%',s.ttr>=45],['Sentences',s.sentences,s.sentences>=4]].map(([l,v,ok])=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:1px dashed var(--line)">
                <span style="font-size:12.5px;color:var(--ink-3)">${l}</span>
                <span style="display:flex;gap:8px;align-items:center"><b style="font-family:var(--mono);font-size:13px">${v}</b>
                <i class="fa-solid ${ok?'fa-circle-check':'fa-circle-exclamation'}" style="color:${ok?'var(--ok)':'var(--amber)'};font-size:11px"></i></span></div>`).join('')}
          </div></div>
        ${s.idioms?.length?`<div class="card"><div class="card-bd">
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-600);font-weight:800;margin-bottom:9px">Idiomatic language used</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${s.idioms.map(i=>`<span class="tag leaf">${i}</span>`).join('')}</div></div></div>`:''}
        <div class="card" style="border-color:var(--violet)"><div class="card-bd">
          <button class="btn btn-v btn-blk" onclick="navTo('tutor')"><i class="fa-solid fa-comments"></i> Practise with Bloom Tutor</button>
          <button class="btn btn-g btn-blk" style="margin-top:8px" onclick="navTo('tutoring')"><i class="fa-solid fa-chalkboard-user"></i> Book a speaking teacher</button>
        </div></div>
      </div>
    </div>`;
}
function spReopen(id){ const s = B.speeches.find(x => x.id === id); if (!s) return; ss.result = s; ss.view = 'result'; navTo('speaking'); }

/* ── pronunciation ── */
const PRON = [
  { t:'Minimal pairs · /iː/ vs /ɪ/', pairs:[['sheep','ship'],['beat','bit'],['leave','live'],['feel','fill']], note:'The difference is length and tension, not just sound. /iː/ is long and tense; /ɪ/ is short and relaxed.' },
  { t:'Minimal pairs · /v/ vs /w/', pairs:[['vest','west'],['vine','wine'],['very','wary'],['veil','wail']], note:'For /v/ the top teeth touch the bottom lip. For /w/ the lips round with no teeth contact.' },
  { t:'Th sounds · /θ/ and /ð/', pairs:[['think','sink'],['three','tree'],['they','day'],['breathe','breed']], note:'The tongue tip goes lightly between the teeth. Many learners substitute /s/, /t/ or /d/.' },
  { t:'Final consonants', pairs:[['card','car'],['bald','ball'],['worked','work'],['friends','friend']], note:'Dropping final consonants changes tense and number — a grammar error the examiner hears, not just an accent.' },
];
const STRESS = [
  { w:'PHOtograph', s:'Noun · stress on the first syllable' },
  { w:'phoTOgrapher', s:'Person · stress moves to the second' },
  { w:'photoGRAphic', s:'Adjective · stress moves to the third' },
  { w:'DEsert (noun) / deSERT (verb)', s:'Stress alone changes the meaning' },
  { w:'ecoNOmic / eCOnomy', s:'-ic pulls stress to the syllable before it' },
];
function spPronHTML(){
  return `
    ${phead({ eyebrow:'Speaking Lab', title:`Pronunciation <em>clinic</em>`,
      sub:`Pronunciation is 25% of your speaking band. These are the sounds most commonly substituted by ${esc(B.profile.l1)} speakers, plus the stress patterns IELTS examiners listen for.`,
      actions:`<button class="btn btn-g btn-sm" onclick="ss.view='home';navTo('speaking')"><i class="fa-solid fa-arrow-left"></i> Back</button>` })}

    <div class="card mb2" style="border-color:var(--amber)"><div class="card-bd">
      <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:#a86e14;font-weight:800;margin-bottom:11px">For ${esc(B.profile.l1)} speakers specifically</div>
      <div style="display:grid;gap:9px">${l1Traps(B.profile.l1).map(t=>`<div style="display:flex;gap:11px;align-items:flex-start;font-size:13px;color:var(--ink-2);line-height:1.55"><i class="fa-solid fa-circle-dot" style="color:var(--amber);font-size:8px;margin-top:6px"></i><span>${t}</span></div>`).join('')}</div>
    </div></div>

    <div class="grid g2 mb2">
      ${PRON.map(p => `<div class="card"><div class="card-bd" style="padding:19px 21px">
        <b style="font-family:var(--display);font-size:16px;font-weight:700;display:block;margin-bottom:11px">${p.t}</b>
        <div style="display:grid;gap:8px;margin-bottom:13px">
          ${p.pairs.map(([a,b])=>`<div style="display:flex;gap:10px;align-items:center">
            <button class="btn btn-g btn-sm" style="flex:1;justify-content:space-between" onclick="speakWord('${a}')">${a} <i class="fa-solid fa-volume-high" style="opacity:.5"></i></button>
            <span style="color:var(--ink-4);font-size:11px">vs</span>
            <button class="btn btn-g btn-sm" style="flex:1;justify-content:space-between" onclick="speakWord('${b}')">${b} <i class="fa-solid fa-volume-high" style="opacity:.5"></i></button></div>`).join('')}
        </div>
        <div style="font-size:12.5px;color:var(--ink-3);line-height:1.55">${p.note}</div>
      </div></div>`).join('')}
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Word stress</h3><p>Stress in the wrong place makes a correct word unintelligible</p></div></div>
      <div class="card-bd" style="display:grid;gap:11px">
        ${STRESS.map(s=>`<div style="display:flex;gap:14px;align-items:center;padding:13px 15px;background:var(--paper);border-radius:12px">
          <button class="icobtn" onclick="speakWord('${s.w.replace(/[()]/g,'').split(' ')[0]}')"><i class="fa-solid fa-volume-high"></i></button>
          <div><b style="font-family:var(--mono);font-size:14px;letter-spacing:.4px">${s.w}</b>
            <div style="font-size:12px;color:var(--ink-4);margin-top:2px">${s.s}</div></div></div>`).join('')}
      </div>
    </div>`;
}


/* A submitted recording with no transcript can still be scored on delivery —
   length against the task target, and pace against the 45-second/2-minute
   expectation. Lexis and grammar are explicitly not scored, and the report
   says so rather than inventing numbers. */
function evaluateRecordingOnly(secs, part, cue){
  const targetSecs = part === 2 ? 110 : 30;
  const ratio = Math.min(1.4, secs / targetSecs);

  let fc = 5.0;
  if (ratio >= 1) fc += 1.3;
  else if (ratio >= 0.8) fc += 0.7;
  else if (ratio >= 0.55) fc += 0.1;
  else fc -= 0.8;
  if (secs >= targetSecs && secs <= targetSecs * 1.25) fc += 0.3;

  let pr = 5.4;
  if (ratio >= 0.85) pr += 0.6;
  if (secs >= 45) pr += 0.3;

  /* not measurable without a transcript — carried at the neutral mid-point
     and flagged, so the overall is not silently inflated or deflated */
  const lr = 5.5, gra = 5.5;

  const criteria = {
    fc: roundBand(Math.max(4.5, Math.min(9, fc))),
    lr: roundBand(lr), gra: roundBand(gra),
    pr: roundBand(Math.max(4.5, Math.min(9, pr))),
  };
  const band = roundBand((criteria.fc + criteria.lr + criteria.gra + criteria.pr) / 4);

  const notes = [
    { tone:'amb', t:'Scored from the recording only',
      s:'Without a transcript, Bloom can measure how long and how steadily you spoke, but not your vocabulary range or grammatical accuracy. Those two criteria are carried at a neutral mid-point, so treat this band as provisional. Type what you said and re-submit for a real Lexical Resource and Grammar score.' },
  ];
  if (secs < targetSecs) notes.push({ tone:'cor', t:`You spoke for ${secs}s, target ${targetSecs}s`,
    s: part === 2 ? 'Part 2 must fill the full two minutes. Stopping early caps Fluency and Coherence regardless of how good the language was.' : 'Extend every answer with a reason and a concrete example.' });
  else notes.push({ tone:'leaf', t:`You filled the time — ${secs}s against a ${targetSecs}s target`,
    s:'Sustaining the full turn is the single most reliable Fluency marker at Band 7.' });
  if (cue && cue.vocab) notes.push({ tone:'sky', t:'Check yourself against the target vocabulary',
    s:'This card rewards: ' + cue.vocab.join(', ') + '. If you used none of them, that is where the Lexical Resource marks went.' });

  return { band, criteria, wpm:0, rateReliable:false, words:0, fillers:0, fillerRate:0, ttr:0,
    idioms:[], repeated:[], notes, gerr:[], sentences:0, recordingOnly:true };
}
