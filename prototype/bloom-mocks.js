/* ═══ BLOOM — mock test system ═══ */

let ms = { view:'home', id:null, filter:'all', run:null, sec:0, step:0, ans:{}, left:0, timer:null };

function sec_mocks(){
  /* TOEFL, PTE and DET run their own section flow and scoring */
  if (typeof xm !== 'undefined'){
    if (xm.view === 'run') return xmRunHTML();
    if (xm.view === 'result') return xmResultHTML();
  }
  if (ms.view === 'run') return mRunHTML();
  if (ms.view === 'result') return mResultHTML();
  return mHomeHTML();
}

function mHomeHTML(){
  const runs = B.mockRuns;
  const last = runs[0];
  const track = typeof examTrack === 'function' ? examTrack() : B.profile.exam;
  const pool = typeof mockBank === 'function' ? mockBank(track) : (typeof mocksForTrack === 'function' ? mocksForTrack(track) : MOCKS);
  const mine = pool.filter(m => ms.filter === 'all' || m.kind === ms.filter);
  const forExam = pool;
  const native = typeof hasBlueprint === 'function' && hasBlueprint(track);
  const best = runs.length ? Math.max(...runs.map(r => r.band)) : null;
  return `
    ${phead({ eyebrow:'Exam simulation · ' + examOf(track).name, title:`Mock <em>tests</em>`,
      sub: native
        ? `${examOf(track).name} does not share IELTS's structure or scoring, so these mocks run its own sections, item types and score table — ${blueprintFor(track).sections.length} sections, scored ${blueprintFor(track).min||0}–${blueprintFor(track).total}.`
        : 'Nothing predicts your real score like a full mock under timed conditions. Every run gives you a section breakdown, a time analysis and a ranked list of what to fix.',
      actions:`<button class="btn btn-p" onclick="mStart('${forExam[0]?.id || mockBank()[0].id}')"><i class="fa-solid fa-play"></i> Take a full mock</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Mocks completed', runs.length, runs.length?'Last on '+last.date:'None yet', 'sky', 'fa-clipboard-check')}
      ${(() => {
        if (native && typeof xmRuns === 'function'){
          const xr = xmRuns().filter(r => r.exam === track);
          const bestX = xr.length ? Math.max(...xr.map(r => r.total)) : null;
          const denom = track==='toefl'?120:track==='pte'?90:160;
          const tgt = track==='toefl'?bandToTOEFL(B.profile.target):track==='pte'?bandToPTE(B.profile.target):bandToDET(B.profile.target);
          return statCard('Best score', bestX!=null?bestX+' / '+denom:'—', 'Target about ' + tgt, bestX>=tgt?'leaf':'amb', 'fa-trophy')
            + statCard('Attempts', xr.length, xr.length?bandLabelFor(track, bestX):'None yet', 'leaf', 'fa-clipboard-check');
        }
        return statCard('Best overall', best!=null?bandLabel(best):'—', 'Target ' + bandLabel(B.profile.target), best>=B.profile.target?'leaf':'amb', 'fa-trophy')
          + statCard('Predicted band', est()!=null?bandLabel(est()):'—', 'From all your practice, not just mocks', 'leaf', 'fa-chart-line');
      })()}
      ${statCard('Test date', B.profile.testDate?daysTo(B.profile.testDate)+' days':'Not set', B.profile.testDate||'Add one in your profile', 'cor', 'fa-calendar-day')}
    </div>

    ${native && typeof xmBlueprintHTML === 'function' ? xmBlueprintHTML(track) : ''}

    ${native && typeof xmRuns === 'function' && xmRuns().filter(r => r.exam === track).length ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Your ${examOf(track).short} attempts</h3><p>Scored on the real scale, not converted from a band</p></div></div>
      <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Date</th><th>Test</th>${blueprintFor(track).sections.filter(s=>!s.unscored).map(s=>`<th>${s.name.replace(/^Part \d+ · /,'').slice(0,9)}</th>`).join('')}<th>Total</th><th></th></tr></thead>
        <tbody>${xmRuns().filter(r => r.exam === track).slice(0,10).map(r => `<tr>
          <td style="font-family:var(--mono);font-size:11.5px">${r.date}</td>
          <td><b style="color:var(--ink)">${esc(r.name)}</b></td>
          ${blueprintFor(track).sections.filter(s=>!s.unscored).map(s=>`<td style="font-family:var(--mono)">${r.sections[s.id]!=null?r.sections[s.id]:'—'}</td>`).join('')}
          <td><b style="font-family:var(--mono);color:var(--leaf-700)">${r.total}</b></td>
          <td style="text-align:right"><button class="btn btn-g btn-sm" onclick="xmReopen('${r.id}')">Report</button></td>
        </tr>`).join('')}</tbody></table></div></div>
    </div>` : ''}

    ${runs.length >= 2 ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Band progression</h3><p>Your last ${Math.min(8,runs.length)} mocks against your target</p></div></div>
      <div class="card-bd">${sparkChart(runs.slice(0,8).reverse().map(r => ({ x:r.date, y:r.band })), B.profile.target)}</div>
    </div>` : ''}

    <div class="pills mb" style="margin-bottom:16px">
      ${[['all','All tests'],['full','Full mocks'],['section','Section tests'],['mini','Mini tests']].map(([k,l])=>`<button class="pill ${ms.filter===k?'on':''}" onclick="ms.filter='${k}';navTo('mocks')">${l} <span class="n">${k==='all'?pool.length:pool.filter(m=>m.kind===k).length}</span></button>`).join('')}
    </div>

    <div class="grid g2 mb2">
      ${mine.map(m => {
        const done = runs.filter(r => r.mid === m.id);
        const ex = examOf(m.exam);
        return `<div class="card"><div class="card-bd" style="padding:19px 21px">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
            <span class="tag ${m.kind==='full'?'cor':m.kind==='section'?'sky':'leaf'}">${m.kind==='full'?'Full mock':m.kind==='section'?'Section':'Mini'}</span>
            <span class="tag">${ex.short}</span><span class="tag">${m.level}</span>
            ${done.length?`<span class="tag ok" style="margin-left:auto">Best ${bandLabel(Math.max(...done.map(d=>d.band)))}</span>`:''}
          </div>
          <b style="font-family:var(--display);font-size:17.5px;font-weight:700;letter-spacing:-.4px;display:block;line-height:1.25">${m.name}</b>
          <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4);margin:6px 0 11px"><i class="fa-regular fa-clock"></i> ${m.mins} minutes</div>
          <div style="font-size:12.5px;color:var(--ink-3);line-height:1.55;margin-bottom:13px">${m.desc}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:15px">${m.parts.map(p=>`<span class="tag">${p}</span>`).join('')}</div>
          <button class="btn btn-p btn-sm btn-blk" onclick="mLaunch('${m.id}')"><i class="fa-solid fa-play"></i> ${done.length?'Take again':'Start test'}</button>
        </div></div>`;
      }).join('')}
    </div>

    ${runs.length ? `
    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Test history</h3></div></div>
      <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Date</th><th>Test</th><th>L</th><th>R</th><th>W</th><th>S</th><th>Overall</th><th></th></tr></thead>
        <tbody>${runs.slice(0,12).map(r => `<tr>
          <td style="font-family:var(--mono);font-size:11.5px">${r.date}</td>
          <td><b style="color:var(--ink)">${esc(r.name)}</b></td>
          ${['listening','reading','writing','speaking'].map(k=>`<td style="font-family:var(--mono)">${r.sections[k]!=null?bandLabel(r.sections[k]):'—'}</td>`).join('')}
          <td><b style="font-family:var(--mono);color:${r.band>=B.profile.target?'var(--ok)':'var(--amber)'}">${bandLabel(r.band)}</b></td>
          <td style="text-align:right"><button class="btn btn-g btn-sm" onclick="mReopen('${r.id}')">Report</button></td>
        </tr>`).join('')}</tbody>
      </table></div></div>
    </div>` : ''}`;
}

function sparkChart(pts, target){
  if (pts.length < 2) return '';
  const W = 640, H = 150, pad = 34;
  const ys = pts.map(p => p.y);
  const min = Math.max(3, Math.min(...ys, target) - 0.5), max = Math.min(9, Math.max(...ys, target) + 0.5);
  const x = i => pad + i * (W - pad*2) / (pts.length - 1);
  const y = v => H - pad - ((v - min) / (max - min)) * (H - pad*2);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-height:190px">
    ${[0,0.5,1].map(f=>`<line x1="${pad}" x2="${W-pad}" y1="${H-pad-f*(H-pad*2)}" y2="${H-pad-f*(H-pad*2)}" stroke="var(--line)"/>
      <text x="${pad-6}" y="${H-pad-f*(H-pad*2)+3}" text-anchor="end" font-size="8" fill="var(--ink-4)" font-family="monospace">${(min+f*(max-min)).toFixed(1)}</text>`).join('')}
    <line x1="${pad}" x2="${W-pad}" y1="${y(target)}" y2="${y(target)}" stroke="var(--amber)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="${W-pad+2}" y="${y(target)+3}" font-size="8" fill="var(--amber)" font-family="monospace">target</text>
    <polyline fill="none" stroke="var(--leaf-500)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map((p,i)=>x(i)+','+y(p.y)).join(' ')}"/>
    ${pts.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.y)}" r="4" fill="var(--surface)" stroke="var(--leaf-600)" stroke-width="2.5"/>
      <text x="${x(i)}" y="${H-pad+13}" text-anchor="middle" font-size="7.5" fill="var(--ink-4)" font-family="monospace">${p.x.slice(5)}</text>
      <text x="${x(i)}" y="${y(p.y)-10}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--leaf-700)" font-family="monospace">${bandLabel(p.y)}</text>`).join('')}
  </svg>`;
}

/* ── running a mock ──
   Full mocks route through the real skill modules; the mock shell tracks
   which sections are complete and assembles the report. */
/* Which skills a mock covers. An authored mock carries its own section list,
   so use that rather than inferring anything from the id. */
function mSections(m){
  if (m.authored && Array.isArray(m.sections) && m.sections.length)
    return m.sections.map(s => mSkillOf(s));
  if (m.kind === 'section'){
    const k = m.id.includes('listen') ? 'listening' : m.id.includes('read') ? 'reading' : m.id.includes('write') ? 'writing' : m.id.includes('speak') ? 'speaking' : 'reading';
    return [k];
  }
  if (m.kind === 'mini') return ['reading'];
  return ['listening','reading','writing','speaking'];
}
/* map a section (authored or blueprint) onto one of the four skill engines */
function mSkillOf(s){
  const t = String((s && (s.id || s.name)) || '').toLowerCase();
  if (t.includes('listen')) return 'listening';
  if (t.includes('read')) return 'reading';
  if (t.includes('writ')) return 'writing';
  if (t.includes('speak')) return 'speaking';
  return 'reading';
}
/* the author's chosen item for a skill, if they set one */
function mRefFor(m, skill){
  if (!m || !m.authored || !Array.isArray(m.sections)) return '';
  const s = m.sections.find(x => mSkillOf(x) === skill);
  return (s && s.source === 'authored' && s.ref) ? s.ref : '';
}
/* resolve a skill to a concrete item id: the author's pick first, bank[0] otherwise.
   The bank is read against the MOCK's exam track, not the student's, so an
   authored item attached to an IELTS mock still resolves for a TOEFL student. */
function mPick(skill, ref, examId){
  if (skill === 'reading'){
    const b = readingBank(examId);
    return (ref && b.find(x => x.id === ref) ? ref : b[0].id);
  }
  if (skill === 'listening'){
    const b = listeningBank(examId);
    return (ref && b.find(x => x.id === ref) ? ref : b[0].id);
  }
  if (skill === 'writing'){
    const b2 = writingBank(2, examId), b1 = writingBank(1, examId);
    if (ref && b2.find(x => x.id === ref)) return { task:2, id:ref };
    if (ref && b1.find(x => x.id === ref)) return { task:1, id:ref };
    return { task:2, id:b2[0].id };
  }
  if (skill === 'speaking'){
    const b = speakingBank(2, examId);
    return (ref && b.find(x => x.id === ref) ? ref : (b[0] && b[0].id) || null);
  }
  return null;
}
function mStart(id){
  const m = mockById(id);
  ms = { ...ms, view:'run', id, run:{ mid:id, name:m.name, started:Date.now(), sections:{}, times:{} }, step:0 };
  navTo('mocks');
}

function mRunHTML(){
  const m = mockById(ms.id);
  const secs = mSections(m);
  const done = secs.filter(s => ms.run.sections[s] != null);
  const cur = secs.find(s => ms.run.sections[s] == null);
  const allDone = !cur;
  return `
    ${phead({ eyebrow:m.kind === 'full' ? 'Full mock exam' : 'Section test', title:m.name.replace(/—.*/,'').trim().replace(/(\w+)$/,'<em>$1</em>'),
      sub: allDone ? 'Every section is complete. Generate your report to see the breakdown.' : `Complete each section in order, exactly as on test day. ${m.mins} minutes in total.`,
      actions:`<button class="btn btn-g btn-sm" onclick="if(confirm('Abandon this mock? Section results already recorded will be lost.')){ms.view='home';navTo('mocks')}">Abandon</button>
        ${allDone?`<button class="btn btn-p" onclick="mFinish()"><i class="fa-solid fa-file-lines"></i> Generate report</button>`:''}` })}

    <div style="max-width:760px;margin:0 auto">
      <div class="card mb2"><div class="card-bd">
        <div class="bar" style="height:9px;margin-bottom:18px"><i style="width:${pct(done.length,secs.length)}%"></i></div>
        <div style="display:grid;gap:11px">
          ${secs.map((k,i) => {
            const sk = skillMeta(k);
            const score = ms.run.sections[k];
            const isCur = k === cur;
            const [bg,fg] = toneVars(sk.tone);
            return `<div style="display:flex;gap:14px;align-items:center;padding:15px 17px;border:1.5px solid ${isCur?'var(--leaf-500)':score!=null?'var(--ok)':'var(--line)'};border-radius:15px;background:${score!=null?'var(--ok-soft)':'var(--surface)'}">
              <div style="width:40px;height:40px;flex:0 0 40px;border-radius:13px;background:${score!=null?'var(--ok)':bg};color:${score!=null?'#fff':fg};display:grid;place-items:center;font-size:15px"><i class="fa-solid ${score!=null?'fa-check':sk.ic}"></i></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:14.5px;display:block">${i+1}. ${sk.name}</b>
                <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${score!=null?'Completed · Band '+bandLabel(score):isCur?'Ready to start':'Locked until the previous section is done'}</span>
              </div>
              ${score!=null?`<span class="band sm"><b>${bandLabel(score)}</b><span>Band</span></span>`
                : isCur?`<button class="btn btn-p btn-sm" onclick="mDoSection('${k}')"><i class="fa-solid fa-play"></i> Start</button>`
                : `<i class="fa-solid fa-lock" style="color:var(--line-2)"></i>`}
            </div>`;
          }).join('')}
        </div>
      </div></div>

      ${allDone ? `<button class="btn btn-p btn-blk btn-lg" onclick="mFinish()"><i class="fa-solid fa-file-lines"></i> Generate my score report</button>`
      : `<div class="why leaf"><b>How this works</b>Each section opens the real Bloom module for that skill — the same passages, recordings, tasks and evaluation. When you finish a section, its band is recorded here and the next one unlocks.</div>`}
    </div>`;
}

function mDoSection(k){
  ms.pending = k; save();
  const m = mockById(ms.id);
  const ref = mRefFor(m, k);
  const ex = m && m.exam;
  if (k === 'reading'){ rStart(mPick('reading', ref, ex)); }
  else if (k === 'listening'){ lStart(mPick('listening', ref, ex)); }
  else if (k === 'writing'){ const w = mPick('writing', ref, ex); ws.task = w.task; wOpen(w.id, w.task); }
  else if (k === 'speaking'){ spStart(2, mPick('speaking', ref, ex)); }
  toast('Section started — your band returns to the mock automatically', 'fa-clipboard-list');
}

/* modules call this when a skill result is recorded during a mock */
function mCapture(skill, band){
  if (!ms.run || ms.pending !== skill) return false;
  ms.run.sections[skill] = band;
  ms.pending = null;
  toast('Section recorded · Band ' + bandLabel(band) + ' — returning to your mock', 'fa-clipboard-check');
  setTimeout(() => { ms.view = 'run'; navTo('mocks'); }, 2200);
  return true;
}

function mFinish(){
  const m = mockById(ms.id);
  const sections = ms.run.sections;
  const band = overallBand(sections) ?? Object.values(sections)[0];
  const mins = Math.max(1, Math.round((Date.now() - ms.run.started) / 60000));
  const weakest = Object.entries(sections).sort((a,b)=>a[1]-b[1])[0];
  const run = {
    id:'m'+Date.now(), mid:m.id, name:m.name, date:today(), band, sections, mins,
    exam:m.exam, kind:m.kind,
    recs: mRecs(sections, band),
    weakest: weakest ? weakest[0] : null,
  };
  B.mockRuns.unshift(run); B.mockRuns = B.mockRuns.slice(0,30);
  B.history.push({ at:today(), kind:'mock', band });
  save(); markActive(mins); addXP(150);
  if (B.mockRuns.length === 1) earn('first-mock');
  if (band >= 7) earn('band-7');
  notify('Mock complete — Band ' + bandLabel(band), `${m.name}. Weakest section: ${weakest?skillMeta(weakest[0]).name:'—'}.`, 'fa-clipboard-check');
  ms.result = run; ms.view = 'result'; navTo('mocks');
}

function mRecs(sections, band){
  const out = [];
  const t = B.profile.target;
  Object.entries(sections).sort((a,b)=>a[1]-b[1]).forEach(([k,v]) => {
    if (v >= t) return;
    out.push({
      skill:k, gap:Math.round((t-v)*10)/10,
      t: `${skillMeta(k).name} is ${bandLabel(t-v)} below target`,
      s: ({
        listening:'Almost all lost listening marks are spelling and number formats, not comprehension. Do one Part 4 lecture a day and check every answer letter by letter.',
        reading:'You need roughly 200 words per minute to finish three passages. Practise locating the answer rather than reading the whole paragraph.',
        writing:'Write one Task 2 every other day and read the feedback before you write the next. Fix one criterion at a time, starting with your lowest.',
        speaking:'Record one Part 2 cue card every day for two weeks. Fluency responds faster to volume of practice than any other skill.',
      })[k],
      go:k,
    });
  });
  if (!out.length) out.push({ skill:null, t:'Every section is at or above target', s:'Hold this level with one full mock a week until test day, and keep your vocabulary reviews going so nothing slips.', go:'plan' });
  return out;
}

function mResultHTML(){
  const r = ms.result || B.mockRuns[0];
  if (!r) return mHomeHTML();
  const t = B.profile.target;
  const prev = B.mockRuns.filter(x => x.id !== r.id)[0];
  return `
    ${phead({ eyebrow:'Score report · ' + r.date, title:`Overall Band <em>${bandLabel(r.band)}</em>`,
      sub:`${r.name} completed in ${r.mins} minutes.${prev?` That is ${r.band>prev.band?'up':r.band<prev.band?'down':'level'} ${r.band!==prev.band?bandLabel(Math.abs(r.band-prev.band))+' from your last mock':'with your last mock'}.`:''}`,
      actions:`<button class="btn btn-g btn-sm" onclick="mPrint('${r.id}')"><i class="fa-solid fa-print"></i> Print report</button>
        <button class="btn btn-g btn-sm" onclick="ms.view='home';navTo('mocks')">All mocks</button>
        <button class="btn btn-p" onclick="mLaunch('${r.mid}')"><i class="fa-solid fa-rotate-right"></i> Retake</button>` })}

    <div class="hero mb2">
      <div style="display:flex;gap:30px;align-items:center;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-family:var(--display);font-size:60px;font-weight:800;line-height:1;letter-spacing:-2.5px">${bandLabel(r.band)}</div>
          <div style="font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--leaf-300);font-weight:800;margin-top:6px">Overall band</div>
        </div>
        <div style="width:1px;height:76px;background:rgba(255,255,255,.18)"></div>
        <div style="flex:1;min-width:220px">
          <div class="eb">${examOf(r.exam).name}</div>
          <h3>${r.band>=t?'At or above your target':`${bandLabel(t-r.band)} bands from your target of ${bandLabel(t)}`}</h3>
          <p>${r.band>=t?'If you sat the real test today, this is roughly what you would get. Keep it steady.':`Your weakest section is ${skillMeta(r.weakest).name.toLowerCase()}. Fixing that alone would raise your overall by about ${bandLabel(Math.min(1,(t-r.band)))} of a band.`}</p>
        </div>
        <div class="hero-chips" style="margin:0">
          ${Object.entries(r.sections).map(([k,v])=>`<div class="hero-chip"><b>${bandLabel(v)}</b><span>${skillMeta(k).name}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Section breakdown</h3><p>Against your target of Band ${bandLabel(t)}</p></div></div>
          <div class="card-bd">
            ${Object.entries(r.sections).map(([k,v]) => {
              const sk = skillMeta(k), [bg,fg] = toneVars(sk.tone);
              return `<div style="display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)">
                <div style="width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:${bg};color:${fg};display:grid;place-items:center"><i class="fa-solid ${sk.ic}"></i></div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                    <b style="font-size:13.5px">${sk.name}</b>
                    <span style="font-family:var(--mono);font-size:12px"><b>${bandLabel(v)}</b> <span style="color:var(--ink-4)">→ ${bandLabel(t)}</span></span></div>
                  <div class="bar" style="position:relative"><i style="width:${v/9*100}%;background:${v>=t?'var(--ok)':v>=t-1?'var(--amber)':'var(--coral)'}"></i>
                    <span style="position:absolute;top:-3px;left:${t/9*100}%;width:2px;height:13px;background:var(--ink-3);border-radius:2px"></span></div>
                </div>
                ${v>=t?'<span class="tag ok">Target met</span>':`<span class="tag ${v>=t-1?'amb':'cor'}">−${bandLabel(t-v)}</span>`}
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>What to do next</h3><p>Ranked by how much each would move your overall band</p></div></div>
          <div class="card-bd" style="display:grid;gap:12px">
            ${r.recs.map((rec,i) => `<div style="display:flex;gap:13px;align-items:flex-start;padding:15px 16px;border:1px solid var(--line);border-radius:14px">
              <div style="width:26px;height:26px;flex:0 0 26px;border-radius:8px;background:${i===0?'var(--coral)':'var(--paper-2)'};color:${i===0?'#fff':'var(--ink-3)'};display:grid;place-items:center;font-family:var(--mono);font-size:11px;font-weight:800">${i+1}</div>
              <div style="flex:1"><b style="font-size:13.5px;display:block;margin-bottom:4px">${rec.t}</b>
                <span style="font-size:12.5px;color:var(--ink-3);line-height:1.55">${rec.s}</span></div>
              <button class="btn btn-g btn-sm" onclick="navTo('${rec.go}')">Open</button></div>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Score on every scale</h3></div></div>
          <div class="card-bd" style="display:grid;gap:11px">
            ${EXAMS.filter(x=>x.id!=='general').map(x=>`<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px dashed var(--line)">
              <span style="font-size:12.5px;color:var(--ink-3)">${x.name}</span>
              <b style="font-family:var(--mono);font-size:13px">${scoreInExam(r.band,x.id)}</b></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Is this enough?</h3><p>For ${PURPOSES.find(p=>p.id===B.profile.purpose).name.toLowerCase()}</p></div></div>
          <div class="card-bd">
            <div style="font-size:13px;color:var(--ink-2);line-height:1.65;margin-bottom:14px">${PURPOSES.find(p=>p.id===B.profile.purpose).note}</div>
            <div style="padding:13px 15px;border-radius:12px;background:${r.band>=t?'var(--ok-soft)':'var(--amber-soft)'};font-size:12.5px;color:${r.band>=t?'var(--ok)':'#8a5a10'};font-weight:600;line-height:1.55">
              <i class="fa-solid fa-${r.band>=t?'circle-check':'circle-exclamation'}"></i>
              ${r.band>=t?'Your current level meets the target you set.':`You are ${bandLabel(t-r.band)} bands short. At your current rate that is roughly ${estimateWeeks(r.band,t,B.profile.hoursPerDay)} more weeks.`}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}
function mReopen(id){ const r = B.mockRuns.find(x=>x.id===id); if(!r) return; ms.result = r; ms.view='result'; navTo('mocks'); }

function mPrint(id){
  const r = B.mockRuns.find(x=>x.id===id) || ms.result; if (!r) return;
  const w = window.open('','_blank');
  if (!w){ toast('Allow pop-ups to print your report'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Bloom Score Report</title><style>
    @page{size:A4;margin:18mm}body{font-family:system-ui,sans-serif;color:#12211a;font-size:11pt;line-height:1.5}
    .hd{border-bottom:3px solid #2f6b3a;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}
    h1{font-size:24pt;margin:0;color:#2f6b3a}.s{color:#5d7266;font-size:10pt}
    .big{font-size:44pt;font-weight:800;color:#2f6b3a;line-height:1}
    table{width:100%;border-collapse:collapse;margin:18px 0}th{text-align:left;font-size:9pt;text-transform:uppercase;letter-spacing:1px;color:#5d7266;border-bottom:1px solid #cfdcd2;padding:7px 0}
    td{padding:9px 0;border-bottom:1px solid #e3ebe4}.b{font-weight:700;font-size:13pt}
    h2{font-size:11pt;text-transform:uppercase;letter-spacing:1.5px;color:#5da35f;margin:22px 0 8px}
    .rec{margin-bottom:10px;padding-left:14px;border-left:3px solid #a3d199}.rt{font-weight:700}
    .ft{margin-top:30px;padding-top:12px;border-top:1px solid #e3ebe4;font-size:8.5pt;color:#8b9d93}</style></head><body>
    <div class="hd"><div><h1>Bloom Score Report</h1><div class="s">${esc(B.profile.name)} · ${esc(r.name)} · ${r.date}</div></div>
      <div style="text-align:right"><div class="big">${bandLabel(r.band)}</div><div class="s">Overall band</div></div></div>
    <table><thead><tr><th>Section</th><th>Band</th><th>Target</th><th>Gap</th></tr></thead><tbody>
      ${Object.entries(r.sections).map(([k,v])=>`<tr><td>${skillMeta(k).name}</td><td class="b">${bandLabel(v)}</td><td>${bandLabel(B.profile.target)}</td><td>${v>=B.profile.target?'met':'−'+bandLabel(B.profile.target-v)}</td></tr>`).join('')}
    </tbody></table>
    <h2>Equivalent scores</h2>
    <table><tbody>${EXAMS.filter(x=>x.id!=='general').map(x=>`<tr><td>${x.name}</td><td class="b">${scoreInExam(r.band,x.id)}</td></tr>`).join('')}</tbody></table>
    <h2>Recommendations</h2>
    ${r.recs.map((c,i)=>`<div class="rec"><div class="rt">${i+1}. ${c.t}</div><div>${c.s}</div></div>`).join('')}
    <div class="ft">Generated by Bloom IELTS Academy · this is a practice estimate and is not an official test result.</div>
    </body></html>`);
  w.document.close(); setTimeout(()=>w.print(), 400);
}


/* route to the correct engine for this mock */
function mLaunch(id){
  if (typeof EXAM_MOCKS !== 'undefined' && EXAM_MOCKS.some(m => m.id === id)){ xmStart(id); return; }
  mStart(id);
}


/* One entry point for the skill modules. Tries the native exam engine
   (TOEFL / PTE / DET) first, then the IELTS engine. Returns true if a mock
   section was waiting for this skill, so the module knows to hand back. */
function mockCapture(skill, band){
  if (typeof xmCapture === 'function' && typeof xm !== 'undefined' && xm.run && xm.pending){
    if (xmCapture(skill, band)) return true;
  }
  if (typeof mCapture === 'function') return mCapture(skill, band);
  return false;
}
