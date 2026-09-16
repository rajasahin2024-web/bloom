/* ═══ BLOOM — Grammar Academy: concept → examples → practice → test ═══ */

let gs = { view:'home', id:null, step:'concept', ans:{}, checked:false, unit:'all' };

function gState(id){ return B.grammar[id] || { done:false, score:0, attempts:0, best:0 }; }
function gLesson(id){ return GRAMMAR.find(l => l.id === id); }
function gDoneCount(){ return GRAMMAR.filter(l => gState(l.id).done).length; }

function sec_grammar(){
  if (gs.view === 'lesson') return gLessonHTML();
  return gHomeHTML();
}

function gHomeHTML(){
  const done = gDoneCount();
  const avg = (() => { const s = GRAMMAR.map(l => gState(l.id)).filter(x => x.attempts); return s.length ? Math.round(s.reduce((a,b)=>a+b.best,0)/s.length) : 0; })();
  const next = GRAMMAR.find(l => !gState(l.id).done) || GRAMMAR[0];
  const units = gs.unit === 'all' ? GRAMMAR_UNITS : GRAMMAR_UNITS.filter(u => u.id === gs.unit);
  return `
    ${phead({ eyebrow:'Grammar Academy', title:`Grammar that actually costs you <em>bands</em>`,
      sub:`Twelve lessons, each one concept → explanation → real IELTS examples → a short test. Ordered so that the errors most common for ${esc(B.profile.l1)} speakers come first.`,
      actions:`<button class="btn btn-p" onclick="gOpen('${next.id}')"><i class="fa-solid fa-play"></i> ${done?'Continue':'Start'} · ${next.name}</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Lessons complete', done + ' / ' + GRAMMAR.length, pct(done, GRAMMAR.length) + '% of the course', 'leaf', 'fa-graduation-cap')}
      ${statCard('Average test score', avg ? avg + '%' : '—', avg ? (avg>=80?'Strong control':'Keep drilling') : 'No tests taken yet', avg>=80?'leaf':'amb', 'fa-percent')}
      ${statCard('Your grammar band', B.placement?.sub?.grammar ? bandLabel(B.placement.sub.grammar) : '—', 'From your placement test', 'sky', 'fa-chart-simple')}
      ${statCard('Priority for you', l1Priority().name, 'Common for ' + esc(B.profile.l1) + ' speakers', 'cor', 'fa-bullseye')}
    </div>

    <div class="card mb2" style="border-color:var(--amber);background:linear-gradient(180deg,var(--amber-soft),var(--surface) 55%)">
      <div class="card-bd" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:var(--amber);color:#fff;display:grid;place-items:center;font-size:17px"><i class="fa-solid fa-bullseye"></i></div>
        <div style="flex:1;min-width:230px">
          <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:#a86e14;font-weight:800;margin-bottom:5px">Start here</div>
          <b style="font-family:var(--display);font-size:18px;font-weight:700;display:block">${l1Priority().name}</b>
          <span style="font-size:12.5px;color:var(--ink-3)">${l1Traps(B.profile.l1)[0]}</span>
        </div>
        <button class="btn btn-a" onclick="gOpen('${l1Priority().id}')">Open lesson <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>

    <div class="pills mb" style="margin-bottom:16px">
      <button class="pill ${gs.unit==='all'?'on':''}" onclick="gs.unit='all';navTo('grammar')">All units <span class="n">${GRAMMAR.length}</span></button>
      ${GRAMMAR_UNITS.map(u=>`<button class="pill ${gs.unit===u.id?'on':''}" onclick="gs.unit='${u.id}';navTo('grammar')">${u.name} <span class="n">${GRAMMAR.filter(l=>l.unit===u.id).length}</span></button>`).join('')}
    </div>

    ${units.map(u => {
      const ls = GRAMMAR.filter(l => l.unit === u.id);
      if (!ls.length) return '';
      return `<div style="margin-bottom:26px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:13px">
          <h3 style="font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.3px">${u.name}</h3>
          <span class="tag">${u.lv}</span>
          <div style="flex:1;height:1px;background:var(--line)"></div>
          <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${ls.filter(l=>gState(l.id).done).length} / ${ls.length} complete</span>
        </div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(292px,1fr));gap:13px">
          ${ls.map(l => { const st = gState(l.id);
            return `<div class="card" style="cursor:pointer;transition:transform .15s,box-shadow .15s;${st.done?'border-color:var(--ok)':''}" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--sh-2)'" onmouseout="this.style.transform='';this.style.boxShadow='var(--sh-1)'" onclick="gOpen('${l.id}')">
              <div class="card-bd" style="padding:17px 19px">
                <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:11px">
                  <div style="width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:${st.done?'var(--ok-soft)':'var(--leaf-100)'};color:${st.done?'var(--ok)':'var(--leaf-700)'};display:grid;place-items:center"><i class="fa-solid ${st.done?'fa-circle-check':'fa-diagram-project'}"></i></div>
                  <div style="flex:1;min-width:0">
                    <b style="font-size:14px;display:block;line-height:1.3">${l.name}</b>
                    <span style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${l.lv} · ${l.mins} min · ${l.quiz.length} questions</span>
                  </div>
                  ${st.attempts?`<span class="tag ${st.best>=80?'ok':'amb'}">${st.best}%</span>`:''}
                </div>
                <div style="font-size:12.5px;color:var(--ink-3);line-height:1.55">${l.concept.length>128?l.concept.slice(0,126)+'…':l.concept}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}`;
}

function l1Priority(){
  const l1 = B.profile.l1;
  const map = { Hindi:'articles', Urdu:'articles', Bengali:'articles', Tamil:'articles', Telugu:'articles', Punjabi:'articles',
    Mandarin:'sva', Cantonese:'tenses', Vietnamese:'tenses', Thai:'tenses',
    Arabic:'articles', Persian:'articles', Tagalog:'sva', Indonesian:'tenses', Nepali:'articles', Sinhala:'articles',
    Turkish:'articles', Uzbek:'articles', Spanish:'tenses', Portuguese:'tenses' };
  return gLesson(map[l1] || 'articles');
}

function gOpen(id){ gs = { ...gs, view:'lesson', id, step:'concept', ans:{}, checked:false }; navTo('grammar'); }

function gLessonHTML(){
  const l = gLesson(gs.id); if (!l) return gHomeHTML();
  const st = gState(l.id);
  const steps = [['concept','Concept'],['examples','Examples'],['practice','Practice'],['result','Result']];
  const si = steps.findIndex(s => s[0] === gs.step);
  return `
    ${phead({ eyebrow:GRAMMAR_UNITS.find(u=>u.id===l.unit).name + ' · ' + l.lv, title:l.name.replace(/^(\w+)/,'<em>$1</em>'),
      sub:l.concept,
      actions:`<button class="btn btn-g btn-sm" onclick="gs.view='home';navTo('grammar')"><i class="fa-solid fa-arrow-left"></i> All lessons</button>${st.done?'<span class="tag ok" style="align-self:center">Completed · '+st.best+'%</span>':''}` })}

    <div class="rail" style="max-width:520px">${steps.map((s,i)=>`
      <div class="s ${si===i?'on':si>i?'dn':''}" style="width:78px"><div class="n">${si>i?'<i class="fa-solid fa-check" style="font-size:10px"></i>':i+1}</div><div class="lb">${s[1]}</div></div>${i<3?`<div class="bar2 ${si>i?'f':''}"></div>`:''}`).join('')}</div>

    <div class="stage">${gStepHTML(l)}</div>`;
}

function gStepHTML(l){
  if (gs.step === 'concept') return `
    <div class="stage-hd"><div class="eb">The rules</div><h3>How it <em>works</em></h3><p>Read these once carefully. Every rule below appears in the practice test at the end.</p></div>
    <div style="display:grid;gap:11px;max-width:640px;margin:0 auto">
      ${l.rules.map((r,i)=>`<div style="display:flex;gap:13px;align-items:flex-start;padding:14px 16px;border:1px solid var(--line);border-radius:13px;background:var(--surface)">
        <div style="width:24px;height:24px;flex:0 0 24px;border-radius:8px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;font-family:var(--mono);font-size:11px;font-weight:800">${i+1}</div>
        <div style="font-size:13.5px;line-height:1.6;color:var(--ink-2)">${r}</div></div>`).join('')}
    </div>
    <div class="stage-ft"><span style="font-size:12px;color:var(--ink-4)">${l.mins} minute lesson</span>
      <button class="btn btn-p" onclick="gs.step='examples';navTo('grammar')">See real examples <i class="fa-solid fa-arrow-right"></i></button></div>`;

  if (gs.step === 'examples') return `
    <div class="stage-hd"><div class="eb">Before and after</div><h3>Mistakes we actually <em>see</em></h3><p>These are drawn from real IELTS scripts. Read the wrong version, work out why, then check.</p></div>
    <div style="display:grid;gap:14px;max-width:660px;margin:0 auto">
      ${l.examples.map((e,i)=>`<div style="border:1px solid var(--line);border-radius:15px;overflow:hidden">
        <div style="padding:13px 16px;background:var(--err-soft);display:flex;gap:11px;align-items:flex-start">
          <i class="fa-solid fa-xmark" style="color:var(--err);margin-top:3px"></i>
          <div style="font-size:14px;color:var(--ink-2);text-decoration:line-through;text-decoration-color:rgba(214,69,69,.4)">${e.bad}</div></div>
        <div style="padding:13px 16px;background:var(--ok-soft);display:flex;gap:11px;align-items:flex-start">
          <i class="fa-solid fa-check" style="color:var(--ok);margin-top:3px"></i>
          <div style="font-size:14px;color:var(--ink);font-weight:600">${e.good}</div></div>
        <div style="padding:11px 16px;background:var(--surface);font-size:12.5px;color:var(--ink-3);line-height:1.55;border-top:1px solid var(--line)"><b style="color:var(--ink-2)">Why:</b> ${e.why}</div>
      </div>`).join('')}
    </div>
    <div class="stage-ft"><button class="btn btn-g" onclick="gs.step='concept';navTo('grammar')"><i class="fa-solid fa-arrow-left"></i> Rules</button>
      <button class="btn btn-p" onclick="gs.step='practice';navTo('grammar')">Take the test <i class="fa-solid fa-arrow-right"></i></button></div>`;

  if (gs.step === 'practice'){
    const answered = l.quiz.filter((_,i) => gs.ans[i] != null).length;
    return `
    <div class="stage-hd"><div class="eb">Practice test</div><h3>${l.quiz.length} <em>questions</em></h3><p>No time limit. Answer everything, then check — you will see an explanation for each one.</p></div>
    <div style="display:grid;gap:20px;max-width:660px;margin:0 auto">
      ${l.quiz.map((q,i)=>{
        return `<div>
          <div style="font-size:14.5px;font-weight:600;margin-bottom:11px;line-height:1.45">${i+1}. ${q.q}</div>
          <div class="opts">${q.o.map((o,oi)=>{
            let cls = gs.ans[i]===oi ? 'sel' : '';
            if (gs.checked){ if (oi===q.c) cls='right'; else if (gs.ans[i]===oi) cls='wrong'; }
            return `<div class="opt ${cls}" onclick="${gs.checked?'':`gPick(${i},${oi})`}"><div class="k">${String.fromCharCode(65+oi)}</div><div class="x">${o}</div></div>`;
          }).join('')}</div>
          ${gs.checked?`<div class="why ${gs.ans[i]===q.c?'leaf':'cor'}"><b>${gs.ans[i]===q.c?'Correct':'The answer is '+String.fromCharCode(65+q.c)}</b>${q.e}</div>`:''}
        </div>`;
      }).join('')}
    </div>
    <div class="stage-ft">
      <button class="btn btn-g" onclick="gs.step='examples';navTo('grammar')"><i class="fa-solid fa-arrow-left"></i> Examples</button>
      <div style="display:flex;gap:12px;align-items:center">
        <span style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4)">${answered} / ${l.quiz.length}</span>
        ${gs.checked
          ? `<button class="btn btn-p" onclick="gs.step='result';navTo('grammar')">See my result <i class="fa-solid fa-arrow-right"></i></button>`
          : `<button class="btn btn-p" onclick="gCheck()"><i class="fa-solid fa-check"></i> Check answers</button>`}
      </div>
    </div>`;
  }

  /* result */
  const right = l.quiz.filter((q,i) => gs.ans[i] === q.c).length;
  const score = Math.round(right / l.quiz.length * 100);
  const wrong = l.quiz.map((q,i) => ({ q, i })).filter(x => gs.ans[x.i] !== x.q.c);
  const nextL = GRAMMAR[GRAMMAR.findIndex(x => x.id === l.id) + 1];
  return `
    <div class="stage-hd"><div class="eb">Lesson complete</div><h3>${score}% — ${score>=80?'<em>solid control</em>':score>=60?'<em>nearly there</em>':'<em>worth repeating</em>'}</h3>
      <p>${score>=80?'You can use this structure accurately. It will show up in your writing score.':score>=60?'You understand the rule but slip on the harder cases. Re-read the examples and retake in a few days.':'Go back through the rules — this one is worth getting right, it appears constantly.'}</p></div>
    <div style="display:flex;gap:26px;align-items:center;justify-content:center;flex-wrap:wrap;margin-bottom:24px">
      ${ringHTML(score, score + '%', 'Score', 118, score>=80?'var(--ok)':score>=60?'var(--amber)':'var(--coral)')}
      <div><div style="font-family:var(--display);font-size:24px;font-weight:700">${right} of ${l.quiz.length} correct</div>
        <div style="font-size:12.5px;color:var(--ink-3);margin-top:5px">Best previous: ${gState(l.id).best||0}%</div></div>
    </div>
    ${wrong.length?`<div style="max-width:620px;margin:0 auto">
      <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--coral);font-weight:800;margin-bottom:11px">Review these ${wrong.length}</div>
      ${wrong.map(x=>`<div style="padding:13px 15px;border-left:3px solid var(--coral);background:var(--paper);border-radius:0 11px 11px 0;margin-bottom:9px">
        <div style="font-size:13px;font-weight:600;margin-bottom:5px">${x.q.q}</div>
        <div style="font-size:12.5px;color:var(--ok);font-weight:700;margin-bottom:4px">${String.fromCharCode(65+x.q.c)} — ${x.q.o[x.q.c]}</div>
        <div style="font-size:12px;color:var(--ink-3);line-height:1.55">${x.q.e}</div></div>`).join('')}
    </div>`:`<div class="why leaf" style="max-width:620px;margin:0 auto"><b>Perfect score</b>Nothing to review. Move on to the next lesson.</div>`}
    <div class="stage-ft">
      <button class="btn btn-g" onclick="gs.step='practice';gs.checked=false;gs.ans={};navTo('grammar')"><i class="fa-solid fa-rotate-right"></i> Retake</button>
      <div style="display:flex;gap:9px">
        <button class="btn btn-g" onclick="gs.view='home';navTo('grammar')">All lessons</button>
        ${nextL?`<button class="btn btn-p" onclick="gOpen('${nextL.id}')">Next: ${nextL.name} <i class="fa-solid fa-arrow-right"></i></button>`:''}
      </div>
    </div>`;
}

function gPick(i, oi){ gs.ans[i] = oi; navTo('grammar'); }
function gCheck(){
  const l = gLesson(gs.id);
  const un = l.quiz.length - Object.keys(gs.ans).length;
  if (un && !confirm(un + ' question' + (un>1?'s':'') + ' unanswered. Check anyway?')) return;
  gs.checked = true;
  const right = l.quiz.filter((q,i) => gs.ans[i] === q.c).length;
  const score = Math.round(right / l.quiz.length * 100);
  const st = gState(l.id);
  B.grammar[l.id] = { done: st.done || score >= 60, score, attempts: st.attempts + 1, best: Math.max(st.best, score) };
  save();
  markActive(l.mins); addXP(right * 8);
  if (gDoneCount() >= 10) earn('grammar-ace');
  /* grammar performance nudges the writing estimate — grammar is 25% of the writing score */
  if (B.scores.writing != null && score >= 80){
    const bump = 0.1;
    B.scores.writing = roundBand(Math.min(9, B.scores.writing + bump));
    save();
  }
  navTo('grammar');
}
