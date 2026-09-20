/* ═══════════════════════════════════════════════════════════════
   FEATURE 3 · STUDY PLANNER GENERATOR
   Intake → weighted day-by-day schedule → checkpoints → PDF export.
   Depends on: TOPICS, SUBJECTS, pageHead(), showToast(), navTo(), jsPDF
═══════════════════════════════════════════════════════════════ */

const PL_ACTIVITIES = [
  { k:'lecture',  label:'Watch lecture',            ic:'fa-circle-play',      cls:'' },
  { k:'read',     label:'Read textbook chapter',    ic:'fa-book-open',        cls:'' },
  { k:'quiz',     label:'Practice quiz · 10 Q',     ic:'fa-square-check',     cls:'quiz' },
  { k:'notes',    label:'Summarise into notes',     ic:'fa-pen-to-square',    cls:'' },
  { k:'drill',    label:'Timed drill · 15 Q',       ic:'fa-stopwatch',        cls:'quiz' },
  { k:'recap',    label:'Flashcard recap',          ic:'fa-layer-group',      cls:'rev' },
];
const PL_REVISION = [
  { label:'Full IMAT simulation · 60 Q', ic:'fa-clipboard-list', cls:'mock', note:'Sit it under exam conditions, no interruptions' },
  { label:'Review error log',           ic:'fa-triangle-exclamation', cls:'rev', note:'Re-work every question you got wrong this week' },
  { label:'Weakest-topic sprint',       ic:'fa-bullseye', cls:'quiz', note:'20 questions on your two lowest-scoring topics' },
  { label:'Formula & terminology recall', ic:'fa-list-ol', cls:'rev', note:'Formula booklet + medical terminology builder' },
];
const PL_CONF = { weak:{ w:3, label:'Needs work' }, ok:{ w:2, label:'Getting there' }, strong:{ w:1, label:'Confident' }, skip:{ w:0, label:'Not studying' } };

let plState = { view:'intake', step:1, days:50, hours:4, rest:'sun', start:plISOToday(), conf:{}, struggle:[], plan:null, done:{} };
SUBJECTS.forEach(s => plState.conf[s] = 'ok');

/* ── storage ── */
function plSave(){
  try { localStorage.setItem('fma_planner', JSON.stringify({ days:plState.days, hours:plState.hours, rest:plState.rest, start:plState.start, conf:plState.conf, struggle:plState.struggle, plan:plState.plan, done:plState.done })); } catch(e){}
}
function plLoad(){
  try {
    const d = JSON.parse(localStorage.getItem('fma_planner') || 'null');
    if (d && d.plan){ Object.assign(plState, d); plState.view = 'plan'; return true; }
  } catch(e){}
  return false;
}
let plLoaded = false;

/* ── helpers ── */
function plISO(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function plISOToday(){ return plISO(new Date()); }
function plDate(offset){ const d = new Date(plState.start + 'T00:00:00'); d.setDate(d.getDate() + offset); return d; }
function plFmt(d){ return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }); }
function plRestSet(){ return plState.rest === 'none' ? [] : plState.rest === 'sun' ? [0] : [0,6]; }
function plBlocks(){ return Math.max(1, Math.min(4, Math.round(plState.hours / 1.5))); }
function plTotalBlocks(){ return (plState.plan || []).reduce((s,d) => s + d.blocks.length, 0); }
function plDoneCount(){ return Object.values(plState.done).filter(Boolean).length; }

/* ── section ── */
function sec_planner(){
  if (!plLoaded){ plLoaded = true; plLoad(); }
  return plState.view === 'plan' && plState.plan ? plPlanHTML() : plIntakeHTML();
}

function plIntakeHTML(){
  return `
    ${pageHead({
      eyebrow: 'Study Planner',
      title: `Build my <em>study plan</em>`,
      sub: 'Answer three short questions and we will lay out every day between now and your exam — weighted towards the topics you find hardest.',
      actions: plState.plan ? `<button class="btn btn-ghost btn-sm" onclick="plState.view='plan'; navTo('planner')"><i class="fa-solid fa-arrow-left"></i> Back to my plan</button>` : ''
    })}

    <div class="st-steps" id="plRail">${plRailHTML()}</div>

    <div class="st-stage">${plStepHTML()}</div>
  `;
}

function plRailHTML(){
  return [['1','Timeline'],['2','Confidence'],['3','Trouble spots']].map((s,i) => {
    const n = i + 1;
    return `<div class="s ${plState.step===n?'on':plState.step>n?'done':''}"><div class="n">${plState.step>n?'<i class="fa-solid fa-check" style="font-size:10px;"></i>':s[0]}</div><div class="lb">${s[1]}</div></div>${i<2?`<div class="bar ${plState.step>n?'fill':''}"></div>`:''}`;
  }).join('');
}

function plStepHTML(){
  if (plState.step === 1){
    const rest = plRestSet().length;
    const studyDays = plState.days - Math.floor(plState.days / 7 * rest);
    return `
      <div class="st-stage-hd"><div class="eb">Step 1 of 3</div><h3>How much <em>time</em> do you have?</h3><p>Everything else is calculated from these four answers — you can regenerate at any point.</p></div>
      <div style="max-width:560px; margin:0 auto;">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="fg"><label>Days until the exam</label><input id="plDays" type="number" min="7" max="400" value="${plState.days}" oninput="plState.days=Math.max(7,Math.min(400,+this.value||7)); plStepPaint();"></div>
          <div class="fg"><label>Start date</label><input id="plStart" type="date" value="${plState.start}" onchange="plState.start=this.value; plStepPaint();"></div>
        </div>
        <div style="margin-top:20px;">
          <label style="display:block; font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:12px;">Study hours per day — <b style="color:var(--gold);">${plState.hours}h</b> (${plBlocks()} ${plBlocks()===1?'session':'sessions'})</label>
          <input class="st-range" type="range" min="1" max="10" step="1" value="${plState.hours}" oninput="plState.hours=+this.value; plStepPaint();">
        </div>
        <div style="margin-top:22px;">
          <div style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:9px;">Rest days</div>
          <div class="st-seg">
            <button class="${plState.rest==='none'?'on':''}" onclick="plState.rest='none'; plStepPaint()">Study every day</button>
            <button class="${plState.rest==='sun'?'on':''}" onclick="plState.rest='sun'; plStepPaint()">Sundays off</button>
            <button class="${plState.rest==='weekend'?'on':''}" onclick="plState.rest='weekend'; plStepPaint()">Weekends off</button>
          </div>
        </div>
        <div style="display:flex; gap:12px; margin-top:24px;">
          <div class="st-num" style="flex:1;"><b style="font-size:24px;">${studyDays}</b><span>Study days</span></div>
          <div class="st-num" style="flex:1;"><b style="font-size:24px;">${studyDays * plBlocks()}</b><span>Sessions</span></div>
          <div class="st-num" style="flex:1;"><b style="font-size:24px;">${Math.round(studyDays * plState.hours)}h</b><span>Total hours</span></div>
        </div>
      </div>
      <div class="st-actions"><span style="font-size:12px; color:var(--ink-4);">Exam day: <b style="color:var(--navy);">${plFmt(plDate(plState.days))}</b></span><button class="btn btn-primary" onclick="plNext()">Rate my confidence <i class="fa-solid fa-arrow-right"></i></button></div>`;
  }
  if (plState.step === 2){
    return `
      <div class="st-stage-hd"><div class="eb">Step 2 of 3</div><h3>Where do you <em>stand</em>?</h3><p>Be honest — weaker subjects get proportionally more days in the schedule.</p></div>
      <div style="max-width:620px; margin:0 auto; display:grid; gap:11px;">
        ${SUBJECTS.map(s => `
          <div style="display:flex; align-items:center; gap:14px; padding:12px 16px; border:1px solid var(--rule); border-radius:var(--r); background:${plState.conf[s]==='skip'?'var(--paper-2)':'var(--surface)'};">
            <div style="flex:1; min-width:0;">
              <div style="font-size:14px; font-weight:600; color:var(--ink);">${s}</div>
              <div style="font-family:var(--mono); font-size:10.5px; color:var(--ink-4); margin-top:2px;">${TOPICS.filter(t => t.subj === s).length} topics</div>
            </div>
            <div class="st-seg">
              ${['weak','ok','strong','skip'].map(k => `<button class="${plState.conf[s]===k?'on':''}" onclick="plState.conf['${s}']='${k}'; plStepPaint()">${PL_CONF[k].label}</button>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div class="st-actions"><button class="btn btn-ghost" onclick="plBack()"><i class="fa-solid fa-arrow-left"></i> Timeline</button><button class="btn btn-primary" onclick="plNext()">Trouble spots <i class="fa-solid fa-arrow-right"></i></button></div>`;
  }
  const subs = SUBJECTS.filter(s => plState.conf[s] !== 'skip');
  return `
    <div class="st-stage-hd"><div class="eb">Step 3 of 3</div><h3>Which <em>topics</em> worry you?</h3><p>Optional. Anything you flag here gets extra sessions and lands earlier in the plan, while there is still time to fix it.</p></div>
    ${subs.map(s => `
      <div style="margin-bottom:18px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
          <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700;">${s}</div>
          <div style="flex:1; height:1px; background:var(--rule);"></div>
        </div>
        <div class="st-chips">${TOPICS.filter(t => t.subj === s).map(t => `<button class="st-chip warm ${plState.struggle.includes(t.id)?'on':''}" onclick="plToggleStruggle('${t.id}')">${t.name}</button>`).join('')}</div>
      </div>`).join('')}
    <div class="st-actions">
      <button class="btn btn-ghost" onclick="plBack()"><i class="fa-solid fa-arrow-left"></i> Confidence</button>
      <div style="display:flex; gap:12px; align-items:center;">
        <span style="font-family:var(--mono); font-size:11.5px; color:var(--ink-4);">${plState.struggle.length} flagged</span>
        <button class="btn btn-primary" onclick="plGenerate()"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate my plan</button>
      </div>
    </div>`;
}

function plStepPaint(){
  const el = document.querySelector('.st-stage'); if (el) el.innerHTML = plStepHTML();
  const rail = document.getElementById('plRail'); if (rail) rail.innerHTML = plRailHTML();
}
function plNext(){ plState.step = Math.min(3, plState.step + 1); plStepPaint(); }
function plBack(){ plState.step = Math.max(1, plState.step - 1); plStepPaint(); }
function plToggleStruggle(id){ const i = plState.struggle.indexOf(id); if (i >= 0) plState.struggle.splice(i,1); else plState.struggle.push(id); plStepPaint(); }

/* ── generator ── */
function plGenerate(){
  const subs = SUBJECTS.filter(s => plState.conf[s] !== 'skip');
  if (!subs.length){ showToast('Include at least one subject'); return; }
  const topics = TOPICS.filter(t => subs.includes(t.subj));
  const weights = topics.map(t => PL_CONF[plState.conf[t.subj]].w * (plState.struggle.includes(t.id) ? 1.8 : 1));
  const wSum = weights.reduce((a,b) => a+b, 0);

  const rest = plRestSet();
  const revisionDays = Math.max(3, Math.min(14, Math.round(plState.days * 0.18)));
  const blocksPerDay = plBlocks();
  const blockMins = Math.max(40, Math.min(120, Math.round(plState.hours * 60 / blocksPerDay)));

  // Which calendar days are study days
  const dayIdx = [];
  for (let i = 0; i < plState.days; i++){ if (!rest.includes(plDate(i).getDay())) dayIdx.push(i); }
  const studyIdx = dayIdx.filter(i => i < plState.days - revisionDays);
  const revIdx = dayIdx.filter(i => i >= plState.days - revisionDays);
  const slots = Math.max(topics.length, studyIdx.length * blocksPerDay);

  // Sessions per topic, proportional to weight — flagged topics first in the rotation
  const queueByTopic = topics.map((t,i) => ({
    t, n: Math.max(1, Math.round(slots * weights[i] / wSum)), flagged: plState.struggle.includes(t.id)
  })).sort((a,b) => (b.flagged - a.flagged) || (b.n - a.n));

  // Interleave so each topic is revisited across the whole period
  const queue = [];
  const counters = queueByTopic.map(q => ({ ...q, used:0 }));
  while (counters.some(c => c.used < c.n) && queue.length < slots){
    counters.forEach(c => { if (c.used < c.n && queue.length < slots){ queue.push({ topic:c.t, k:c.used }); c.used++; } });
  }

  const plan = [];
  let qi = 0, studyDayNo = 0;
  for (let i = 0; i < plState.days; i++){
    const date = plDate(i);
    const isRest = rest.includes(date.getDay());
    const isRev = i >= plState.days - revisionDays;
    const ph = isRev ? 'revision' : (i < (plState.days - revisionDays) * 0.55 ? 'foundation' : 'consolidation');
    if (isRest){ plan.push({ day:i+1, date:plISO(date), phase:'rest', ph, label:'Rest day', blocks:[] }); continue; }
    if (isRev){
      const k = revIdx.indexOf(i);
      const isLast = i === plState.days - 1;
      const blocks = isLast
        ? [{ act:'Light review — formula sheet and terminology only', ic:'fa-mug-hot', cls:'rev', topic:'Exam eve', mins:60, note:'Pack your documents, sleep early' }]
        : [PL_REVISION[k % PL_REVISION.length], PL_REVISION[(k + 2) % PL_REVISION.length]].slice(0, Math.max(2, blocksPerDay - 1)).map(r => ({ act:r.label, ic:r.ic, cls:r.cls, topic:'Revision', mins: r.cls === 'mock' ? 100 : blockMins, note:r.note }));
      plan.push({ day:i+1, date:plISO(date), phase:'revision', ph, label: isLast ? 'Exam eve' : 'Final revision', blocks });
      continue;
    }
    studyDayNo++;
    const blocks = [];
    const isCheckpoint = studyDayNo % 7 === 0;
    const n = isCheckpoint ? Math.max(1, blocksPerDay - 1) : blocksPerDay;
    for (let b = 0; b < n; b++){
      const item = queue[qi % queue.length]; qi++;
      const a = PL_ACTIVITIES[item.k % PL_ACTIVITIES.length];
      blocks.push({ act:a.label, ic:a.ic, cls:a.cls, topic:item.topic.name, topicId:item.topic.id, subj:item.topic.subj, mins:blockMins, note:item.topic.desc });
    }
    if (isCheckpoint) blocks.push({ act:'Weekly checkpoint — mixed quiz · 20 Q', ic:'fa-flag-checkered', cls:'mock', topic:'Checkpoint', mins:40, note:'Covers everything from the last seven study days', checkpoint:true });
    plan.push({ day:i+1, date:plISO(date), phase: ph, ph, label: isCheckpoint ? 'Checkpoint day' : 'Study day', blocks });
  }

  plState.plan = plan; plState.done = {}; plState.view = 'plan'; plSave();
  navTo('planner');
  showToast('Study plan built — ' + plan.filter(d => d.phase !== 'rest').length + ' active days');
}

/* ── plan view ── */
function plPlanHTML(){
  const plan = plState.plan;
  const totalBlocks = plTotalBlocks(), done = plDoneCount();
  const pct = totalBlocks ? Math.round(done / totalBlocks * 100) : 0;
  const totalHours = Math.round(plan.reduce((s,d) => s + d.blocks.reduce((x,b) => x + b.mins, 0), 0) / 60);
  const checkpoints = plan.filter(d => d.blocks.some(b => b.checkpoint)).length;
  const today = plISOToday();
  const todayDay = plan.find(d => d.date === today);
  const phases = [
    { k:'foundation',    t:'Phase 1 · Foundation', s:'Cover every topic once, weakest first' },
    { k:'consolidation', t:'Phase 2 · Consolidation', s:'Second pass with more practice and drills' },
    { k:'revision',      t:'Phase 3 · Final revision & mocks', s:'Simulations, error log and targeted sprints' },
  ];
  return `
    ${pageHead({
      eyebrow: 'Study Planner · ' + plState.days + '-day plan',
      title: `My <em>study plan</em>`,
      sub: 'Tick each session as you finish it. Progress is saved on this device and included in the PDF export.',
      actions: `
        <button class="btn btn-ghost btn-sm" onclick="plDownloadPDF()"><i class="fa-solid fa-file-pdf"></i> Export PDF</button>
        <button class="btn btn-ghost btn-sm" onclick="plState.view='intake'; plState.step=1; navTo('planner')"><i class="fa-solid fa-sliders"></i> Adjust inputs</button>
        <button class="btn btn-primary btn-sm" onclick="plRegenerate()"><i class="fa-solid fa-rotate"></i> Regenerate</button>`
    })}

    <div class="card mb-5">
      <div class="card-body" style="display:flex; gap:28px; align-items:center; flex-wrap:wrap;">
        <div class="pl-ring" id="plRing" style="--p:${pct}%;"><b>${pct}%</b></div>
        <div style="flex:1; min-width:220px;">
          <div id="plCount" style="font-family:var(--serif); font-size:21px; font-weight:600; color:var(--navy); margin-bottom:4px;">${done} of ${totalBlocks} sessions complete</div>
          <div style="font-size:13px; color:var(--ink-3);">${plState.days} days to exam · ${plFmt(plDate(0))} → ${plFmt(plDate(plState.days))} · ${plState.hours}h per day</div>
          ${todayDay ? `<div style="margin-top:14px; padding:11px 14px; background:var(--steel-mist); border-left:3px solid var(--blue); border-radius:6px;">
            <div style="font-size:9.5px; letter-spacing:1.5px; text-transform:uppercase; color:var(--blue); font-weight:700; margin-bottom:4px;">Today · Day ${todayDay.day}</div>
            <div style="font-size:13px; color:var(--ink-2);">${todayDay.blocks.length ? todayDay.blocks.map(b => b.topic).join(' · ') : 'Rest day — no sessions scheduled'}</div>
          </div>` : ''}
        </div>
        <div class="st-stats" style="margin:0; flex:0 0 300px; grid-template-columns:1fr 1fr;">
          <div class="st-stat"><div class="lbl">Total hours</div><div class="val">${totalHours}</div></div>
          <div class="st-stat"><div class="lbl">Checkpoints</div><div class="val teal">${checkpoints}</div></div>
          <div class="st-stat"><div class="lbl">Topics</div><div class="val">${new Set(plan.flatMap(d => d.blocks.map(b => b.topicId).filter(Boolean))).size}</div></div>
          <div class="st-stat"><div class="lbl">Flagged</div><div class="val teal">${plState.struggle.length}</div></div>
        </div>
      </div>
    </div>

    <div id="plDays">${plDaysHTML(phases)}</div>

    <div style="display:flex; gap:8px; justify-content:center; margin-top:26px;">
      <button class="btn btn-ghost btn-sm" onclick="plResetProgress()"><i class="fa-solid fa-eraser"></i> Reset progress</button>
      <button class="btn btn-ghost btn-sm" onclick="plShiftToToday()"><i class="fa-solid fa-forward"></i> Restart from today</button>
    </div>
  `;
}

function plDaysHTML(phases){
  return phases.map(ph => {
    const days = plState.plan.filter(d => (d.ph || d.phase) === ph.k);
    if (!days.length) return '';
    return `<div class="pl-phase">${ph.t} <span style="font-weight:500; letter-spacing:0; text-transform:none; color:var(--ink-4); font-size:11.5px;">${ph.s}</span><div class="rule"></div><span style="font-family:var(--mono); color:var(--ink-4);">${days.filter(d=>d.phase!=='rest').length} days</span></div>
      ${days.map(plDayHTML).join('')}`;
  }).join('');
}

function plDayHTML(d){
  const date = new Date(d.date + 'T00:00:00');
  const allDone = d.blocks.length && d.blocks.every((_,i) => plState.done[d.day + '-' + i]);
  const mins = d.blocks.reduce((s,b) => s + b.mins, 0);
  if (d.phase === 'rest') return `<div class="pl-day rest" id="plDay${d.day}"><div class="pl-dhd"><div class="pl-dnum"><b>${d.day}</b></div><div class="pl-dttl"><div class="d">Rest day</div><div class="m">${plFmt(date)} · recover, review flashcards if you want to</div></div><i class="fa-solid fa-mug-hot" style="color:var(--ink-4);"></i></div></div>`;
  return `<div class="pl-day ${allDone?'done':''}" id="plDay${d.day}">
    <div class="pl-dhd" onclick="plToggleDay(${d.day})">
      <div class="pl-dnum"><b>${d.day}</b></div>
      <div class="pl-dttl">
        <div class="d">${d.label} · ${[...new Set(d.blocks.map(b => b.topic))].join(', ')}</div>
        <div class="m">${plFmt(date)} · ${d.blocks.length} ${d.blocks.length===1?'session':'sessions'} · ${Math.floor(mins/60)}h ${mins%60 ? (mins%60)+'m' : ''}</div>
      </div>
      <div class="pl-check ${allDone?'on':''}" title="Mark whole day"><i class="fa-solid fa-check"></i></div>
    </div>
    <div class="pl-blocks">
      ${d.blocks.map((b,i) => {
        const key = d.day + '-' + i, on = !!plState.done[key];
        const start = 16 * 60 + i * (b.mins + 15);
        const t1 = String(Math.floor(start/60)%24).padStart(2,'0') + ':' + String(start%60).padStart(2,'0');
        const t2 = String(Math.floor((start+b.mins)/60)%24).padStart(2,'0') + ':' + String((start+b.mins)%60).padStart(2,'0');
        return `<div class="pl-block">
          <div class="pl-btime">${t1}–${t2}</div>
          <div class="pl-bic ${b.cls}"><i class="fa-solid ${b.ic}"></i></div>
          <div class="pl-btxt">
            <div class="a" style="${on?'text-decoration:line-through; color:var(--ink-4);':''}">${b.topic === 'Revision' || b.topic === 'Checkpoint' || b.topic === 'Exam eve' ? b.act : b.topic + ' — ' + b.act}</div>
            <div class="b">${b.subj ? b.subj + ' · ' : ''}${b.note || ''}</div>
          </div>
          ${b.topicId ? `<button class="ico-btn" title="Open this topic" onclick="event.stopPropagation(); plOpenTopic('${b.topicId}','${b.cls}')"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>` : ''}
          <div class="pl-check ${on?'on':''}" onclick="event.stopPropagation(); plToggleBlock('${key}')"><i class="fa-solid fa-check"></i></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function plPaintDay(day){
  const d = plState.plan.find(x => x.day === day);
  const el = document.getElementById('plDay' + day);
  if (!d || !el){ navTo('planner'); return; }
  el.outerHTML = plDayHTML(d);
  const total = plTotalBlocks(), done = plDoneCount(), pct = total ? Math.round(done/total*100) : 0;
  const ring = document.getElementById('plRing'), cnt = document.getElementById('plCount');
  if (ring){ ring.style.setProperty('--p', pct + '%'); ring.querySelector('b').textContent = pct + '%'; }
  if (cnt) cnt.textContent = done + ' of ' + total + ' sessions complete';
}
function plToggleBlock(key){
  plState.done[key] = !plState.done[key]; plSave();
  plPaintDay(parseInt(key.split('-')[0], 10));
}
function plToggleDay(day){
  const d = plState.plan.find(x => x.day === day); if (!d) return;
  const allDone = d.blocks.every((_,i) => plState.done[day + '-' + i]);
  d.blocks.forEach((_,i) => plState.done[day + '-' + i] = !allDone);
  plSave(); plPaintDay(day);
}
function plResetProgress(){ if (!confirm('Clear every tick on this plan?')) return; plState.done = {}; plSave(); navTo('planner'); showToast('Progress reset'); }
function plRegenerate(){ plGenerate(); }
function plShiftToToday(){ plState.start = plISOToday(); plGenerate(); }
function plOpenTopic(topicId, cls){
  if (cls === 'quiz'){ qlState.topics = [topicId]; qlState.subjects = [qlTopic(topicId).subj]; qlState.count = Math.min(10, qlBankCount(topicId)); qlGenerate(); return; }
  tbState.subject = (TOPICS.find(t => t.id === topicId)||{}).subj || 'All'; tbState.topic = topicId; navTo('textbooks');
}

/* ── PDF ── */
function plDownloadPDF(){
  if (!plState.plan) return;
  const { jsPDF } = window.jspdf; const doc = new jsPDF();
  const student = (typeof getCurrentStudent === 'function' && state.user.roleKey === 'student') ? getCurrentStudent() : null;
  const totalBlocks = plTotalBlocks(), done = plDoneCount();

  // Cover
  doc.setFillColor(8,42,82); doc.rect(0,0,210,297,'F');
  doc.setFillColor(31,138,138); doc.rect(0,0,8,297,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('FUTURE MEDSACADEMY', 22, 34);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(160,210,210);
  doc.text('PERSONALISED STUDY PLANNER', 22, 40);
  doc.setDrawColor(31,138,138); doc.setLineWidth(0.8); doc.line(22, 46, 96, 46);
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(30);
  doc.text(plState.days + '-day', 22, 96); doc.text('study plan', 22, 110);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(180,205,230);
  doc.text((student ? student.name : (state.user?.name || 'FMA student')) + (student ? '  ·  ' + student.id : ''), 22, 126);
  doc.text(plFmt(plDate(0)) + '  →  ' + plFmt(plDate(plState.days)), 22, 133);
  const facts = [
    ['Study hours per day', plState.hours + ' h (' + plBlocks() + ' sessions)'],
    ['Rest days', plState.rest === 'none' ? 'None' : plState.rest === 'sun' ? 'Sundays' : 'Weekends'],
    ['Sessions scheduled', String(totalBlocks)],
    ['Checkpoints', String(plState.plan.filter(d => d.blocks.some(b => b.checkpoint)).length)],
    ['Flagged topics', plState.struggle.length ? plState.struggle.map(t => (TOPICS.find(x=>x.id===t)||{}).name).join(', ') : 'None'],
    ['Progress at export', done + ' / ' + totalBlocks + ' sessions ticked'],
  ];
  let fy = 168;
  facts.forEach(([l,v]) => {
    doc.setFontSize(8); doc.setTextColor(120,160,200); doc.text(l.toUpperCase(), 22, fy);
    doc.setFontSize(10.5); doc.setTextColor(255,255,255);
    doc.text(doc.splitTextToSize(v, 150), 22, fy + 5.5);
    fy += 17;
  });
  doc.setFontSize(8); doc.setTextColor(130,160,190);
  doc.text('Generated ' + new Date().toLocaleString('en-GB'), 22, 282);

  // Day-by-day
  let page = 1, y = 0;
  const newPage = () => { doc.addPage(); page++; pdfHeader(doc, 'STUDY PLAN · DAY BY DAY'); y = 42; };
  newPage();
  let lastPhase = null;
  plState.plan.forEach(d => {
    const rows = d.blocks.length || 1;
    if (y + 12 + rows * 6.4 > 278){ pdfFooter(doc, page, page); newPage(); }
    if (d.phase !== lastPhase && d.phase !== 'rest'){
      lastPhase = d.phase;
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(31,138,138);
      doc.text(({ foundation:'PHASE 1 · FOUNDATION', consolidation:'PHASE 2 · CONSOLIDATION', revision:'PHASE 3 · FINAL REVISION & MOCKS' })[d.phase] || '', 14, y);
      y += 7;
    }
    const date = new Date(d.date + 'T00:00:00');
    doc.setFillColor(244,247,250); doc.rect(14, y - 4.6, 182, 7, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(8,42,82);
    doc.text('DAY ' + d.day + '  ·  ' + plFmt(date) + (d.phase === 'rest' ? '  ·  REST DAY' : ''), 17, y);
    if (d.blocks.length){
      const mins = d.blocks.reduce((s,b) => s + b.mins, 0);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(120,134,148);
      doc.text(Math.floor(mins/60) + 'h ' + (mins%60 ? (mins%60)+'m' : ''), 193, y, { align:'right' });
    }
    y += 7;
    d.blocks.forEach((b,i) => {
      const on = !!plState.done[d.day + '-' + i];
      doc.setDrawColor(150,160,172); doc.setLineWidth(0.3);
      doc.rect(18, y - 3.2, 3.4, 3.4);
      if (on){ doc.setFillColor(31,122,68); doc.rect(18, y - 3.2, 3.4, 3.4, 'F'); }
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(on ? 140 : 30, on ? 148 : 42, on ? 158 : 54);
      const label = (b.topic === 'Revision' || b.topic === 'Checkpoint' || b.topic === 'Exam eve') ? b.act : b.topic + ' — ' + b.act;
      doc.text(doc.splitTextToSize(label, 150), 25, y);
      doc.setFontSize(8.5); doc.setTextColor(130,142,154);
      doc.text(b.mins + ' min', 193, y, { align:'right' });
      y += 6.4;
    });
    if (!d.blocks.length) y += 1;
    y += 2.5;
  });
  pdfFooter(doc, page, page);
  doc.save('FMA_Study_Plan_' + plState.days + 'day.pdf');
  showToast('Study plan exported as PDF');
}
