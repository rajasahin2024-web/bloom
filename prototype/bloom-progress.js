/* ═══ BLOOM — progress analytics ═══ */

let ps = { range:'all', skill:'all' };

function sec_progress(){
  const h = B.history;
  const e = est();
  if (!h.length) return `
    ${phead({ eyebrow:'Analytics', title:`My <em>progress</em>`, sub:'Everything you do in Bloom is recorded here — band by band, skill by skill, week by week.' })}
    <div class="empty"><i class="fa-solid fa-chart-line"></i><b>No data yet</b><span>Take the placement test, then practise. Your progression appears here from the first session.</span>
      <div style="margin-top:18px"><button class="btn btn-p" onclick="navTo('placement')">Take the placement test</button></div></div>`;

  const byKind = k => h.filter(x => x.kind === k);
  const first = h[0], latest = h[h.length-1];
  const gained = e != null && first.band != null ? Math.round((e - first.band) * 10) / 10 : 0;
  const totalSessions = B.essays.length + B.speeches.length + B.readRuns.length + B.listenRuns.length + B.mockRuns.length + Object.keys(B.grammar).length;
  const vocabMast = typeof vocabMastered === 'function' ? vocabMastered().length : 0;
  const days = new Set(h.map(x => x.at)).size;

  return `
    ${phead({ eyebrow:'Analytics', title:`My <em>progress</em>`,
      sub:`${gained>0?`You have gained ${bandLabel(gained)} bands since your placement test on ${first.at}.`:'Your history since the placement test.'} Every number here comes from work you actually did.`,
      actions:`<button class="btn btn-g btn-sm" onclick="pExport()"><i class="fa-solid fa-print"></i> Print summary</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Estimated band', e!=null?bandLabel(e):'—', gained>0?'+'+bandLabel(gained)+' since placement':'From all your practice', 'leaf', 'fa-chart-line')}
      ${statCard('Practice sessions', totalSessions, days + ' active day' + (days===1?'':'s'), 'sky', 'fa-list-check')}
      ${statCard('Words mastered', vocabMast, 'of ' + VOCAB.length + ' in the bank', 'amb', 'fa-spell-check')}
      ${statCard('Current streak', B.streak + ' day' + (B.streak===1?'':'s'), 'Level ' + xpLevel(B.xp) + ' · ' + B.xp.toLocaleString() + ' XP', 'cor', 'fa-fire')}
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Band progression</h3><p>Every scored activity, plotted against your target</p></div>
        <div class="seg">${[['all','All'],['writing','Writing'],['speaking','Speaking'],['reading','Reading'],['listening','Listening']].map(([k,l])=>`<button class="${ps.skill===k?'on':''}" onclick="ps.skill='${k}';navTo('progress')">${l}</button>`).join('')}</div></div>
      <div class="card-bd">${progressChart()}</div>
    </div>

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Skill breakdown</h3><p>Current estimate against target for each skill</p></div></div>
          <div class="card-bd">
            ${['listening','reading','writing','speaking'].map(k => {
              const v = B.scores[k], t = B.profile.target, sk = skillMeta(k);
              const start = B.placement?.skills?.[k];
              const delta = (v != null && start != null) ? Math.round((v - start) * 10) / 10 : 0;
              const [bg,fg] = toneVars(sk.tone);
              return `<div style="display:flex;gap:14px;align-items:center;padding:15px 0;border-bottom:1px solid var(--line)">
                <div style="width:36px;height:36px;flex:0 0 36px;border-radius:12px;background:${bg};color:${fg};display:grid;place-items:center"><i class="fa-solid ${sk.ic}"></i></div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                    <b style="font-size:13.5px">${sk.name}</b>
                    <span style="font-family:var(--mono);font-size:12px">${v!=null?bandLabel(v):'—'} ${delta?`<span style="color:${delta>0?'var(--ok)':'var(--coral)'};font-size:11px">${delta>0?'+':''}${bandLabel(delta)}</span>`:''}</span></div>
                  <div class="bar" style="position:relative"><i style="width:${(v||0)/9*100}%;background:${v>=t?'var(--ok)':v>=t-1?'var(--amber)':'var(--coral)'}"></i>
                    <span style="position:absolute;top:-3px;left:${t/9*100}%;width:2px;height:13px;background:var(--ink-3);border-radius:2px"></span></div>
                  <div style="font-size:11px;color:var(--ink-4);margin-top:5px">${start!=null?`Placement: ${bandLabel(start)} · `:''}${countFor(k)} session${countFor(k)===1?'':'s'}</div>
                </div></div>`;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Activity by week</h3><p>Sessions completed in each of the last eight weeks</p></div></div>
          <div class="card-bd">${weekBars()}</div>
        </div>

        ${B.essays.length ? `
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Writing criteria over time</h3><p>Your four descriptors across every submission</p></div></div>
          <div class="card-bd">
            ${Object.entries(BAND_DESCRIPTORS).map(([k,d]) => {
              const vals = B.essays.slice(0,6).reverse().map(x => x.criteria?.[k] || x.band);
              const now = vals[vals.length-1], was = vals[0];
              return `<div class="prow">
                <div class="lb"><span>${d.name}</span><b>${bandLabel(now)}${vals.length>1?` <span style="color:${now>was?'var(--ok)':now<was?'var(--coral)':'var(--ink-4)'}">${now>was?'↑':now<was?'↓':'→'}</span>`:''}</b></div>
                <div style="display:flex;gap:3px;align-items:flex-end;height:34px">
                  ${vals.map(v=>`<div style="flex:1;height:${v/9*100}%;background:${v>=7?'var(--ok)':v>=6?'var(--amber)':'var(--coral)'};border-radius:3px 3px 0 0;min-height:5px" title="Band ${bandLabel(v)}"></div>`).join('')}
                </div></div>`;
            }).join('')}
          </div>
        </div>` : ''}
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Target forecast</h3></div></div>
          <div class="card-bd" style="text-align:center">
            ${ringHTML(Math.min(100, Math.round((e||0)/B.profile.target*100)), bandLabel(e||0), 'of ' + bandLabel(B.profile.target), 132, e>=B.profile.target?'var(--ok)':'var(--leaf-500)')}
            <div style="margin-top:16px;font-size:13px;color:var(--ink-3);line-height:1.6">
              ${e>=B.profile.target ? 'You are at target. Hold it with one mock a week.'
                : `At ${B.profile.hoursPerDay}h a day you are roughly <b style="color:var(--ink)">${estimateWeeks(e, B.profile.target, B.profile.hoursPerDay)} weeks</b> from Band ${bandLabel(B.profile.target)}.${B.profile.testDate?` Your test is in ${daysTo(B.profile.testDate)} days.`:''}`}
            </div>
            ${B.profile.testDate && e < B.profile.target && estimateWeeks(e,B.profile.target,B.profile.hoursPerDay)*7 > daysTo(B.profile.testDate) ? `
              <div class="why cor" style="margin-top:14px;text-align:left"><b>Timing warning</b>At your current rate you will not reach Band ${bandLabel(B.profile.target)} before your test date. Either raise your daily hours or consider moving the test.</div>` : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Milestones</h3><p>${B.badges.length} of ${BADGES.length} earned</p></div></div>
          <div class="card-bd flush">
            ${BADGES.map(b => { const got = B.badges.includes(b.id);
              return `<div class="row" style="${got?'':'opacity:.45'}">
                <div class="ic ${got?'amb':''}" style="${got?'':'background:var(--paper-2);color:var(--line-2)'}"><i class="fa-solid ${b.ic}"></i></div>
                <div class="tx"><b>${b.name}</b><span>${b.desc}</span></div>
                ${got?'<i class="fa-solid fa-circle-check" style="color:var(--ok)"></i>':`<span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">+${b.xp}</span>`}
              </div>`; }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Recent activity</h3></div></div>
          <div class="card-bd flush">
            ${h.slice(-10).reverse().map(x => `<div class="row">
              <div class="ic ${x.kind==='writing'?'amb':x.kind==='speaking'?'cor':x.kind==='mock'?'vio':x.kind==='listening'?'sky':''}"><i class="fa-solid ${x.kind==='placement'?'fa-clipboard-question':x.kind==='mock'?'fa-clipboard-check':skillMeta(x.kind).ic}"></i></div>
              <div class="tx"><b>${x.kind==='placement'?'Placement test':x.kind==='mock'?'Mock exam':skillMeta(x.kind).name+' practice'}</b><span>${x.at}</span></div>
              <b style="font-family:var(--mono);font-size:13px;color:var(--leaf-700)">${bandLabel(x.band)}</b>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function countFor(k){
  return k==='writing' ? B.essays.length : k==='speaking' ? B.speeches.length : k==='reading' ? B.readRuns.length : B.listenRuns.length;
}

function progressChart(){
  let pts = B.history.filter(x => ps.skill === 'all' || x.kind === ps.skill || (ps.skill==='all'));
  if (ps.skill !== 'all') pts = B.history.filter(x => x.kind === ps.skill);
  if (pts.length < 2) return `<div style="text-align:center;padding:34px;color:var(--ink-4);font-size:12.5px">Not enough data yet — complete at least two ${ps.skill==='all'?'activities':ps.skill+' sessions'} to see a trend.</div>`;
  pts = pts.slice(-14);
  const W = 700, H = 200, pad = 38, t = B.profile.target;
  const ys = pts.map(p => p.band);
  const min = Math.max(3, Math.min(...ys) - 0.5), max = Math.min(9, Math.max(...ys, t) + 0.5);
  const x = i => pad + i * (W - pad*2) / Math.max(1, pts.length - 1);
  const y = v => H - pad - ((v - min) / (max - min)) * (H - pad*2);
  const area = `${pts.map((p,i)=>x(i)+','+y(p.band)).join(' ')} ${x(pts.length-1)},${H-pad} ${x(0)},${H-pad}`;
  const kindColor = k => k==='writing'?'var(--amber)':k==='speaking'?'var(--coral)':k==='listening'?'var(--sky)':k==='mock'?'var(--violet)':'var(--leaf-600)';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-height:240px">
    <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--leaf-400)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--leaf-400)" stop-opacity="0"/></linearGradient></defs>
    ${[0,0.25,0.5,0.75,1].map(f=>`<line x1="${pad}" x2="${W-pad}" y1="${H-pad-f*(H-pad*2)}" y2="${H-pad-f*(H-pad*2)}" stroke="var(--line)"/>
      <text x="${pad-7}" y="${H-pad-f*(H-pad*2)+3}" text-anchor="end" font-size="8.5" fill="var(--ink-4)" font-family="monospace">${(min+f*(max-min)).toFixed(1)}</text>`).join('')}
    <line x1="${pad}" x2="${W-pad}" y1="${y(t)}" y2="${y(t)}" stroke="var(--amber)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="${W-pad+3}" y="${y(t)+3}" font-size="8" fill="var(--amber)" font-family="monospace">target</text>
    <polygon fill="url(#gr)" points="${area}"/>
    <polyline fill="none" stroke="var(--leaf-600)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map((p,i)=>x(i)+','+y(p.band)).join(' ')}"/>
    ${pts.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.band)}" r="4.5" fill="var(--surface)" stroke="${kindColor(p.kind)}" stroke-width="2.5"><title>${p.kind} · Band ${bandLabel(p.band)} · ${p.at}</title></circle>`).join('')}
    ${pts.map((p,i)=> i%Math.ceil(pts.length/7)===0 ? `<text x="${x(i)}" y="${H-pad+15}" text-anchor="middle" font-size="8" fill="var(--ink-4)" font-family="monospace">${p.at.slice(5)}</text>` : '').join('')}
  </svg>
  <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:10px">
    ${[['Placement','var(--leaf-600)'],['Writing','var(--amber)'],['Speaking','var(--coral)'],['Listening','var(--sky)'],['Mock','var(--violet)']].map(([l,c])=>`
      <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-4)"><span style="width:8px;height:8px;border-radius:50%;border:2px solid ${c}"></span>${l}</span>`).join('')}
  </div>`;
}

function weekBars(){
  const weeks = [];
  for (let w = 7; w >= 0; w--){
    const end = new Date(); end.setDate(end.getDate() - w*7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const n = B.history.filter(x => x.at >= iso(start) && x.at <= iso(end)).length;
    weeks.push({ label: iso(end).slice(5), n });
  }
  const max = Math.max(1, ...weeks.map(w => w.n));
  return `<div style="display:flex;gap:9px;align-items:flex-end;height:120px">
    ${weeks.map(w => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;height:100%;justify-content:flex-end">
      <span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-3);font-weight:700">${w.n||''}</span>
      <div style="width:100%;height:${Math.max(4, w.n/max*82)}%;background:${w.n?'var(--leaf-500)':'var(--paper-2)'};border-radius:7px 7px 0 0"></div>
      <span style="font-family:var(--mono);font-size:9px;color:var(--ink-4)">${w.label}</span></div>`).join('')}
  </div>`;
}

function pExport(){
  const e = est();
  const w = window.open('','_blank');
  if (!w){ toast('Allow pop-ups to print your summary'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Bloom Progress Summary</title><style>
    @page{size:A4;margin:18mm}body{font-family:system-ui,sans-serif;color:#12211a;font-size:11pt;line-height:1.5}
    h1{font-size:23pt;color:#2f6b3a;margin:0}.s{color:#5d7266;font-size:10pt;margin-bottom:20px}
    h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:1.5px;color:#5da35f;margin:22px 0 8px;border-bottom:1px solid #e3ebe4;padding-bottom:5px}
    table{width:100%;border-collapse:collapse}td{padding:7px 0;border-bottom:1px solid #e3ebe4}
    .b{font-weight:700}.ft{margin-top:26px;font-size:8.5pt;color:#8b9d93}</style></head><body>
    <h1>Progress Summary</h1>
    <div class="s">${esc(B.profile.name)} · ${examOf(B.profile.exam).name} · generated ${today()}</div>
    <h2>Current estimate</h2>
    <table><tbody>
      <tr><td>Overall band</td><td class="b">${e!=null?bandLabel(e):'—'}</td></tr>
      <tr><td>CEFR level</td><td class="b">${e!=null?bandToCEFR(e):'—'}</td></tr>
      <tr><td>Target</td><td class="b">${bandLabel(B.profile.target)}</td></tr>
      ${['listening','reading','writing','speaking'].map(k=>`<tr><td>${skillMeta(k).name}</td><td class="b">${B.scores[k]!=null?bandLabel(B.scores[k]):'—'}</td></tr>`).join('')}
    </tbody></table>
    <h2>Practice completed</h2>
    <table><tbody>
      <tr><td>Writing tasks</td><td class="b">${B.essays.length}</td></tr>
      <tr><td>Speaking responses</td><td class="b">${B.speeches.length}</td></tr>
      <tr><td>Reading passages</td><td class="b">${B.readRuns.length}</td></tr>
      <tr><td>Listening recordings</td><td class="b">${B.listenRuns.length}</td></tr>
      <tr><td>Mock exams</td><td class="b">${B.mockRuns.length}</td></tr>
      <tr><td>Grammar lessons</td><td class="b">${Object.values(B.grammar).filter(x=>x.done).length} of ${GRAMMAR.length}</td></tr>
      <tr><td>Vocabulary mastered</td><td class="b">${typeof vocabMastered==='function'?vocabMastered().length:0} of ${VOCAB.length}</td></tr>
      <tr><td>Study streak</td><td class="b">${B.streak} days</td></tr>
    </tbody></table>
    <div class="ft">Bloom IELTS Academy · practice estimates only, not an official test result.</div>
    </body></html>`);
  w.document.close(); setTimeout(()=>w.print(), 400);
}
