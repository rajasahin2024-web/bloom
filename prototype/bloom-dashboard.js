/* ═══ BLOOM — dashboard, study plan, English profile ═══ */

function est(){ return overallBand(B.scores) || (B.placement ? B.placement.band : null); }
function gapTo(){ const e = est(); return e == null ? null : Math.max(0, B.profile.target - e); }
function weakestSkill(){
  const s = B.scores; const v = Object.entries(s).filter(([,x]) => typeof x === 'number');
  if (!v.length) return null;
  return v.sort((a,b) => a[1] - b[1])[0][0];
}
function strongestSkill(){
  const v = Object.entries(B.scores).filter(([,x]) => typeof x === 'number');
  if (!v.length) return null;
  return v.sort((a,b) => b[1] - a[1])[0][0];
}
function skillMeta(id){ return SKILLS.find(s => s.id === id) || { name:id, ic:'fa-circle', tone:'leaf' }; }
function toneVars(t){
  return t==='leaf' ? ['var(--leaf-100)','var(--leaf-700)'] : t==='amb' ? ['var(--amber-soft)','#a86e14']
    : t==='cor' ? ['var(--coral-soft)','#b73f31'] : t==='sky' ? ['var(--sky-soft)','#1f6e9e'] : ['var(--violet-soft)','#5a3fb0'];
}

/* ═══ DASHBOARD ═══ */
function sec_dashboard(){
  const p = B.profile, e = est(), weak = weakestSkill(), strong = strongestSkill();
  const due = typeof vocabDue === 'function' ? vocabDue().length : 0;
  const goalPct = Math.min(100, pct(B.todayMins, B.goalMins));
  const days = p.testDate ? daysTo(p.testDate) : null;
  const todayTasks = planToday();
  const word = wordOfDay();

  return `
    ${phead({ eyebrow:`${greeting()}, ${esc(p.name.split(' ')[0])}`,
      title: e == null ? `Let's find your <em>level</em>` : days != null ? `${days} days to your <em>test</em>` : `Today's <em>practice</em>`,
      sub: e == null ? 'Take the placement test and everything else in Bloom configures itself around the result.'
        : `You are estimated at Band ${bandLabel(e)} against a target of ${bandLabel(p.target)}. ${weak ? 'Your ' + skillMeta(weak).name.toLowerCase() + ' is what is holding the overall score down.' : ''}`,
      actions: e == null ? `<button class="btn btn-p" onclick="navTo('placement')"><i class="fa-solid fa-clipboard-question"></i> Take placement test</button>`
        : `<button class="btn btn-g btn-sm" onclick="navTo('settings')"><i class="fa-solid fa-gear"></i> Settings</button><button class="btn btn-g btn-sm" onclick="navTo('plan')"><i class="fa-solid fa-calendar-days"></i> My plan</button><button class="btn btn-p" onclick="startToday()"><i class="fa-solid fa-play"></i> Start today's session</button>` })}

    ${e == null ? `
      <div class="empty" style="padding:60px 22px">
        <i class="fa-solid fa-clipboard-question"></i>
        <b>Bloom needs 25 minutes to know where you stand</b>
        <span>Six short parts across grammar, vocabulary, reading, listening, writing and speaking.</span>
        <div style="margin-top:18px"><button class="btn btn-p btn-lg" onclick="navTo('placement')"><i class="fa-solid fa-play"></i> Start the placement test</button></div>
      </div>` : `

    <div class="split mb2">
      <div class="hero">
        <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
          ${ringHTML(Math.min(100, Math.round(e / p.target * 100)), bandLabel(e), 'Estimated', 118, 'var(--leaf-300)')}
          <div style="flex:1;min-width:210px">
            <div class="eb" style="display:flex;align-items:center;gap:9px">
              ${typeof avatarHTML === 'function' ? avatarHTML(22) : ''}
              <span>${esc(p.name)} · ${examOf(p.exam).name} · ${bandToCEFR(e)}</span></div>
            <h3>${gapTo() === 0 ? 'You are at target' : bandLabel(gapTo()) + ' bands to go'}</h3>
            <p>${gapTo() === 0 ? 'Hold this level with regular mocks until test day.' : `At ${p.hoursPerDay} hours a day, roughly ${estimateWeeks(e, p.target, p.hoursPerDay)} weeks of focused work closes the gap.`}</p>
            <div class="hero-chips">
              <div class="hero-chip"><b>${scoreInExam(e, p.exam).split(' / ')[0]}</b><span>${examOf(p.exam).short} now</span></div>
              <div class="hero-chip"><b>${B.streak}</b><span>Day streak</span></div>
              <div class="hero-chip"><b>${B.xp.toLocaleString()}</b><span>XP · level ${xpLevel(B.xp)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Today's goal</h3><p>${B.todayMins} of ${B.goalMins} minutes</p></div>
          <button class="icobtn" onclick="editGoal()" title="Change goal"><i class="fa-solid fa-sliders"></i></button></div>
        <div class="card-bd">
          <div class="bar" style="height:10px;margin-bottom:16px"><i style="width:${goalPct}%;background:${goalPct>=100?'var(--ok)':'var(--amber)'}"></i></div>
          <div style="display:grid;gap:9px">
            ${todayTasks.length ? todayTasks.map((t,i) => `
              <div style="display:flex;gap:11px;align-items:center;padding:10px 12px;border-radius:12px;background:${B.planDone[t.key]?'var(--ok-soft)':'var(--paper)'}">
                <div class="check ${B.planDone[t.key]?'on':''}" onclick="togglePlanTask('${t.key}')"><i class="fa-solid fa-check"></i></div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12.5px;font-weight:700;${B.planDone[t.key]?'text-decoration:line-through;color:var(--ink-4)':''}">${t.name}</div>
                  <div style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${t.mins} min · ${t.skill}</div>
                </div>
                <button class="icobtn" style="width:28px;height:28px;font-size:11px" onclick="navTo('${t.go}')"><i class="fa-solid fa-arrow-right"></i></button>
              </div>`).join('')
            : `<div style="text-align:center;padding:20px 10px;font-size:12.5px;color:var(--ink-4)">No plan yet.<br><button class="btn btn-p btn-sm" style="margin-top:11px" onclick="buildPlan();navTo('plan')">Generate my study plan</button></div>`}
          </div>
        </div>
      </div>
    </div>

    ${typeof schDashCard === 'function' ? schDashCard() : ''}
    ${typeof lvDashCard === 'function' ? lvDashCard() : ''}
    ${typeof tutDashCard === 'function' ? tutDashCard() : ''}

    ${typeof liveForStudent === 'function' ? liveForStudent() : ''}

    <div class="grid g4 mb2">
      ${['listening','reading','writing','speaking'].map(k => {
        const b = B.scores[k], m = skillMeta(k), [bg,fg] = toneVars(m.tone);
        const t = p.target;
        return `<div class="stat" style="cursor:pointer" onclick="navTo('${k==='reading'?'reading':k==='listening'?'listening':k}')">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px">
            <div style="width:28px;height:28px;border-radius:9px;background:${bg};color:${fg};display:grid;place-items:center;font-size:12px"><i class="fa-solid ${m.ic}"></i></div>
            <div class="l" style="margin:0">${m.name}</div>
          </div>
          <div class="v" style="color:${b>=t?'var(--ok)':b>=t-1?'var(--amber)':'var(--coral)'}">${b!=null?bandLabel(b):'—'}</div>
          <div class="bar thin" style="margin-top:9px"><i style="width:${(b||0)/9*100}%;background:${b>=t?'var(--ok)':b>=t-1?'var(--amber)':'var(--coral)'}"></i></div>
          <div class="s">${b>=t?'At target':'Target '+bandLabel(t)}${k===weak?' · focus here':''}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="split">
      <div style="display:grid;gap:16px">
        ${weak ? `
        <div class="card" style="border-color:var(--coral);background:linear-gradient(180deg,var(--coral-soft),var(--surface) 60%)">
          <div class="card-bd" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div style="width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:var(--coral);color:#fff;display:grid;place-items:center;font-size:17px"><i class="fa-solid ${skillMeta(weak).ic}"></i></div>
            <div style="flex:1;min-width:220px">
              <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:#b73f31;font-weight:800;margin-bottom:5px">Your weakest skill</div>
              <b style="font-family:var(--display);font-size:19px;font-weight:700;display:block">${skillMeta(weak).name} · Band ${bandLabel(B.scores[weak])}</b>
              <span style="font-size:12.5px;color:var(--ink-3)">${weakAdvice(weak)}</span>
            </div>
            <button class="btn btn-p" onclick="navTo('${weak}')">Work on it <i class="fa-solid fa-arrow-right"></i></button>
          </div>
        </div>` : ''}

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Jump back in</h3><p>Where you left off across Bloom</p></div></div>
          <div class="card-bd flush">
            ${[
              { ic:'fa-video', tone:'cor', t:'Live classes', s: (() => { try { const c = myCohort(); return c.name + ' · ' + c.days.join(', ') + ' at ' + c.time; } catch(e){ return 'Your cohort timetable'; } })(), go:'live', cta:'Timetable' },
              { ic:'fa-folder-open', tone:'', t:'Library', s: (() => { const st = (B.library||{}); const n = (st.downloaded||[]).length + Object.values(st.watched||{}).filter(w=>w.done).length; return n ? n + ' resource' + (n===1?'':'s') + ' completed' : (typeof MATERIALS!=='undefined'?MATERIALS.length+' PDFs and '+LECTURES.length+' lectures by exam part':'Materials by exam part'); })(), go:'library', cta:'Browse' },
              { ic:'fa-spell-check', tone:'', t:'Vocabulary', s: due ? due + ' words due for review today' : (Object.keys(B.vocab).length ? 'Nothing due — learn new words' : 'Start your first deck'), go:'vocab', cta: due ? 'Review ' + due : 'Learn' },
              { ic:'fa-pen-nib', tone:'amb', t:'Writing Lab', s: B.essays.length ? B.essays.length + ' task' + (B.essays.length===1?'':'s') + ' evaluated · last Band ' + bandLabel(B.essays[0].band) : 'No tasks submitted yet', go:'writing', cta: B.essays.length ? 'Write again' : 'Write one' },
              { ic:'fa-microphone', tone:'cor', t:'Speaking Lab', s: B.speeches.length ? B.speeches.length + ' response' + (B.speeches.length===1?'':'s') + ' recorded' : 'Try a Part 2 cue card', go:'speaking', cta: 'Practise' },
              { ic:'fa-clipboard-list', tone:'sky', t:'Mock tests', s: B.mockRuns.length ? 'Last mock: Band ' + bandLabel(B.mockRuns[0].band) + ' on ' + B.mockRuns[0].date : 'Take your first full mock', go:'mocks', cta: 'Open' },
              { ic:'fa-chalkboard-user', tone:'vio', t:'1-on-1 tutoring', s: (() => { const n = typeof tutUpcoming==='function'?tutUpcoming().length:0; return n ? n + ' session' + (n===1?'':'s') + ' booked' : 'Book 45 minutes with an English teacher'; })(), go:'tutoring', cta: (typeof tutUpcoming==='function'&&tutUpcoming().length)?'Manage':'Book' },
              { ic:'fa-diagram-project', tone:'vio', t:'Grammar Academy', s: (() => { const d = Object.values(B.grammar).filter(x=>x.done).length; return d ? d + ' of ' + GRAMMAR.length + ' lessons complete' : GRAMMAR.length + ' lessons, starting with articles'; })(), go:'grammar', cta:'Continue' },
            ].map(r => `<div class="row">
              <div class="ic ${r.tone}"><i class="fa-solid ${r.ic}"></i></div>
              <div class="tx"><b>${r.t}</b><span>${r.s}</span></div>
              <button class="btn btn-g btn-sm" onclick="navTo('${r.go}')">${r.cta}</button>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card" style="border-color:var(--violet);background:linear-gradient(160deg,var(--violet-soft),var(--surface) 70%)">
          <div class="card-bd">
            <div style="display:flex;gap:11px;align-items:center;margin-bottom:12px">
              <div style="width:34px;height:34px;border-radius:11px;background:var(--violet);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
              <div><b style="font-size:14px;display:block">Bloom Tutor</b><span style="font-size:11px;color:var(--ink-4)">Knows your profile and your errors</span></div>
            </div>
            <div style="font-size:12.5px;color:var(--ink-2);line-height:1.6;padding:11px 13px;background:var(--surface);border-radius:11px;margin-bottom:12px">
              “${tutorNudge()}”
            </div>
            <button class="btn btn-v btn-blk" onclick="navTo('tutor')"><i class="fa-solid fa-comments"></i> Ask Bloom Tutor</button>
            <button class="btn btn-g btn-blk" style="margin-top:8px" onclick="navTo('tutoring')"><i class="fa-solid fa-chalkboard-user"></i> Book a human teacher</button>
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Word of the day</h3><p>${word.t ? VOCAB_TOPICS.find(x=>x.id===word.t)?.name : ''} · ${word.lv}</p></div>
            <button class="icobtn" onclick="navTo('vocab')"><i class="fa-solid fa-arrow-right"></i></button></div>
          <div class="card-bd">
            <div style="font-family:var(--display);font-size:24px;font-weight:700;letter-spacing:-.6px">${word.w}</div>
            <div style="font-family:var(--mono);font-size:11.5px;color:var(--ink-4);margin:4px 0 10px">${word.p} · ${word.pos}</div>
            <div style="font-size:13px;color:var(--ink-2);line-height:1.55;margin-bottom:10px">${word.d}</div>
            <div style="font-size:12.5px;color:var(--ink-3);font-style:italic;padding-left:11px;border-left:2px solid var(--leaf-300)">${word.e}</div>
            ${word.col?.length ? `<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:5px">${word.col.slice(0,3).map(c=>`<span class="tag leaf">${c}</span>`).join('')}</div>` : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Badges</h3><p>${B.badges.length} of ${BADGES.length} earned</p></div></div>
          <div class="card-bd">
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:9px">
              ${BADGES.map(b => { const got = B.badges.includes(b.id);
                return `<div title="${b.name} — ${b.desc}" style="aspect-ratio:1;border-radius:13px;display:grid;place-items:center;font-size:15px;background:${got?'linear-gradient(145deg,var(--amber),#e08a20)':'var(--paper-2)'};color:${got?'#fff':'var(--line-2)'};cursor:default">
                  <i class="fa-solid ${b.ic}"></i></div>`; }).join('')}
            </div>
            <div style="margin-top:14px">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink-4);margin-bottom:5px"><span>Level ${xpLevel(B.xp)}</span><span style="font-family:var(--mono)">${xpInLevel(B.xp)} / ${XP_PER_LEVEL} XP</span></div>
              <div class="bar thin"><i style="width:${xpInLevel(B.xp)/XP_PER_LEVEL*100}%;background:var(--amber)"></i></div>
            </div>
          </div>
        </div>
      </div>
    </div>`}`;
}

function greeting(){ const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function wordOfDay(){
  const seed = today().split('-').join('') | 0;
  return VOCAB[seed % VOCAB.length];
}
function weakAdvice(k){
  return ({
    writing:'Writing improves fastest with feedback. One Task 2 evaluated properly is worth five written and never checked.',
    speaking:'Fluency comes from talking, not from reading about talking. Record one cue card a day for two weeks.',
    reading:'Your problem is almost certainly timing, not comprehension. Practise skimming for the answer, not reading for pleasure.',
    listening:'Most lost marks are spelling and number formats, not understanding. Check every answer letter by letter.',
  })[k] || '';
}
function tutorNudge(){
  const w = weakestSkill();
  if (!w) return 'Take the placement test and I can tell you exactly where to start.';
  if (B.essays.length && B.essays[0].issues?.length) return `In your last essay I saw a recurring problem with ${B.essays[0].issues[0].type.toLowerCase()}. Shall we drill that for ten minutes?`;
  const trap = l1Traps(B.profile.l1)[0];
  return `${skillMeta(w).name} is your weakest skill right now. As a ${B.profile.l1} speaker, ${trap.charAt(0).toLowerCase() + trap.slice(1)}`;
}
function editGoal(){
  modal(`<div class="modal-hd"><div style="flex:1"><h3>Daily goal</h3><p>How many minutes will you realistically do each day?</p></div><button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      <div class="tiles">${[20,30,45,60,90].map(m=>`<div class="tile ${B.goalMins===m?'on':''}" onclick="B.goalMins=${m};save();closeModal();navTo('dashboard')"><span class="tk"><i class="fa-solid fa-circle-check"></i></span><div class="nm" style="font-family:var(--display);font-size:21px">${m}</div><div class="mt">minutes</div></div>`).join('')}</div>
    </div>`, 520);
}
function startToday(){
  const t = planToday().find(x => !B.planDone[x.key]);
  if (!t){ toast('Today is complete — nice work', 'fa-check'); return; }
  navTo(t.go);
}

/* ═══ STUDY PLAN ═══ */
const PLAN_BLOCKS = {
  vocab:     { name:'Vocabulary review',   ic:'fa-spell-check',     go:'vocab',     skill:'Vocabulary', mins:15 },
  vocabNew:  { name:'Learn new words',     ic:'fa-plus',            go:'vocab',     skill:'Vocabulary', mins:15 },
  grammar:   { name:'Grammar lesson',      ic:'fa-diagram-project', go:'grammar',   skill:'Grammar',    mins:20 },
  reading:   { name:'Reading passage',     ic:'fa-book-open',       go:'reading',   skill:'Reading',    mins:20 },
  listening: { name:'Listening practice',  ic:'fa-headphones',      go:'listening', skill:'Listening',  mins:20 },
  writing:   { name:'Writing task',        ic:'fa-pen-nib',         go:'writing',   skill:'Writing',    mins:40 },
  writingT1: { name:'Task 1 report',       ic:'fa-chart-line',      go:'writing',   skill:'Writing',    mins:25 },
  speaking:  { name:'Speaking practice',   ic:'fa-microphone',      go:'speaking',  skill:'Speaking',   mins:20 },
  mock:      { name:'Section mock test',   ic:'fa-clipboard-list',  go:'mocks',     skill:'Mixed',      mins:60 },
  fullmock:  { name:'Full mock exam',      ic:'fa-clipboard-check', go:'mocks',     skill:'Mixed',      mins:165 },
  tutor:     { name:'Review errors with Bloom Tutor', ic:'fa-wand-magic-sparkles', go:'tutor', skill:'Review', mins:15 },
  lecture:   { name:'Watch a lecture',     ic:'fa-circle-play',     go:'library',   skill:'Theory',     mins:20 },
  liveclass: { name:'Live class with your teacher', ic:'fa-video', go:'live', skill:'Class', mins:120 },
  material:  { name:'Study guide or PDF',  ic:'fa-file-pdf',        go:'library',   skill:'Theory',     mins:20 },
};

function buildPlan(){
  const p = B.profile, e = est() || 4.5;
  const weeks = p.testDate ? Math.max(1, Math.ceil(daysTo(p.testDate) / 7)) : (B.placement?.weeks || estimateWeeks(e, p.target, p.hoursPerDay));
  const budget = p.hoursPerDay * 60;
  const scores = B.scores;
  const ranked = ['listening','reading','writing','speaking']
    .filter(k => scores[k] != null)
    .sort((a,b) => scores[a] - scores[b]);
  const weak = ranked[0] || 'writing', second = ranked[1] || 'reading';

  const days = [];
  const total = weeks * 7;
  for (let i = 0; i < total; i++){
    const date = dayOffset(i), dow = new Date(date + 'T00:00:00').getDay();
    const wk = Math.floor(i / 7) + 1;
    if (dow === 0){ days.push({ i, date, week:wk, rest:true, tasks:[] }); continue; }
    const tasks = [];
    let used = 0;
    const push = k => { const b = PLAN_BLOCKS[k]; if (used + b.mins <= budget + 15){ tasks.push({ ...b, key:'d'+i+'-'+tasks.length, k }); used += b.mins; } };

    push('vocab');
    if (i % 7 === 5 && wk % 2 === 0) push('fullmock');
    else if (i % 7 === 5) push('mock');
    else {
      if (i % 4 === 1) push('lecture');
      push(weak);
      if (dow % 2 === 0) push('grammar'); else push(second);
      if (used < budget - 20) push(weak === 'writing' ? 'writingT1' : 'vocabNew');
      if (i % 5 === 4) push('tutor');
    }
    days.push({ i, date, week:wk, rest:false, tasks });
  }
  B.plan = { built:today(), weeks, weak, second, budget, days };
  B.planDone = {};
  save();
  notify('Your ' + weeks + '-week study plan is ready', `Weighted towards ${skillMeta(weak).name.toLowerCase()}, with a mock every Saturday.`, 'fa-calendar-days');
  return B.plan;
}

function planToday(){
  if (!B.plan) return [];
  const d = B.plan.days.find(x => x.date === today());
  return d ? d.tasks : (B.plan.days[0]?.tasks || []);
}
function togglePlanTask(key){
  B.planDone[key] = !B.planDone[key];
  if (B.planDone[key]){ const t = (B.plan?.days||[]).flatMap(d=>d.tasks).find(x=>x.key===key); markActive(t?t.mins:15); addXP(15); }
  save(); navTo(B.section);
}

function sec_plan(){
  if (!B.plan) return `
    ${phead({ eyebrow:'Study plan', title:`Build your <em>schedule</em>`, sub:'Bloom weights every week towards whatever your placement test says you are weakest at.' })}
    <div class="empty"><i class="fa-solid fa-calendar-days"></i><b>No plan yet</b><span>${est()==null?'Take the placement test first — the plan is built from its results.':'Generate a plan from your current profile.'}</span>
      <div style="margin-top:18px"><button class="btn btn-p btn-lg" onclick="${est()==null?"navTo('placement')":'buildPlan();navTo(\'plan\')'}"><i class="fa-solid fa-${est()==null?'clipboard-question':'wand-magic-sparkles'}"></i> ${est()==null?'Take the placement test':'Generate my plan'}</button></div></div>`;

  const pl = B.plan;
  const allTasks = pl.days.flatMap(d => d.tasks);
  const done = allTasks.filter(t => B.planDone[t.key]).length;
  const p = B.profile;
  const wk = Math.max(1, Math.min(pl.weeks, Math.floor((new Date(today()) - new Date(pl.days[0].date)) / 86400000 / 7) + 1));
  const shown = planWeek || wk;
  const weekDays = pl.days.filter(d => d.week === shown);

  return `
    ${phead({ eyebrow:`${pl.weeks}-week programme`, title:`My study <em>plan</em>`,
      sub:`Built ${pl.built} and weighted towards ${skillMeta(pl.weak).name.toLowerCase()}. Tick each block as you finish it — progress feeds your streak and your XP.`,
      actions:`<button class="btn btn-g btn-sm" onclick="navTo('schedule')"><i class="fa-solid fa-calendar-check"></i> See it in my schedule</button>
        <button class="btn btn-g btn-sm" onclick="exportPlan()"><i class="fa-solid fa-print"></i> Print</button><button class="btn btn-g btn-sm" onclick="if(confirm('Rebuild the plan from your current scores? Ticks will be cleared.')){buildPlan();navTo('plan')}"><i class="fa-solid fa-rotate"></i> Rebuild</button>` })}

    <div class="grid g4 mb2">
      ${statCard('Sessions complete', done + ' / ' + allTasks.length, pct(done, allTasks.length) + '% of the programme', 'leaf', 'fa-list-check')}
      ${statCard('This week', 'Week ' + wk, 'of ' + pl.weeks, '', 'fa-calendar-week')}
      ${statCard('Daily budget', Math.round(pl.budget/60*10)/10 + 'h', pl.budget + ' minutes a day', 'amb', 'fa-clock')}
      ${statCard('Focus skill', skillMeta(pl.weak).name, 'Most sessions target this', 'cor', skillMeta(pl.weak).ic)}
    </div>

    <div class="card mb2">
      <div class="card-hd" style="gap:8px;flex-wrap:wrap">
        <div style="flex:1"><h3>Week ${shown}</h3><p>${weekDays[0]?.date} → ${weekDays[weekDays.length-1]?.date}</p></div>
        <div class="pills">
          ${Array.from({length:pl.weeks},(_,i)=>i+1).slice(0,12).map(n=>`<button class="pill ${shown===n?'on':''}" style="padding:5px 11px;font-size:11.5px" onclick="planWeek=${n};navTo('plan')">${n}</button>`).join('')}
          ${pl.weeks>12?`<span class="pill dash" style="padding:5px 11px;font-size:11.5px">+${pl.weeks-12}</span>`:''}
        </div>
      </div>
      <div class="card-bd" style="padding:14px">
        <div style="display:grid;gap:10px">
          ${weekDays.map(d => {
            const dt = new Date(d.date + 'T00:00:00');
            const isToday = d.date === today();
            const allDone = d.tasks.length && d.tasks.every(t => B.planDone[t.key]);
            if (d.rest) return `<div style="display:flex;gap:14px;align-items:center;padding:12px 16px;border:1px dashed var(--line-2);border-radius:14px;background:var(--paper)">
              <div style="width:44px;text-align:center"><div style="font-family:var(--display);font-size:17px;font-weight:700;color:var(--ink-4)">${dt.getDate()}</div><div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${dt.toLocaleDateString('en-GB',{weekday:'short'})}</div></div>
              <div style="flex:1"><b style="font-size:13px;color:var(--ink-3)">Rest day</b><div style="font-size:11.5px;color:var(--ink-4)">Sleep, watch something in English, do nothing at all.</div></div>
              <i class="fa-solid fa-mug-hot" style="color:var(--ink-4)"></i></div>`;
            return `<div style="border:1.5px solid ${isToday?'var(--leaf-500)':allDone?'var(--ok)':'var(--line)'};border-radius:14px;overflow:hidden;background:${allDone?'var(--ok-soft)':'var(--surface)'}">
              <div style="display:flex;gap:14px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line)">
                <div style="width:44px;text-align:center"><div style="font-family:var(--display);font-size:19px;font-weight:700;color:${isToday?'var(--leaf-700)':'var(--ink)'}">${dt.getDate()}</div><div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${dt.toLocaleDateString('en-GB',{weekday:'short'})}</div></div>
                <div style="flex:1"><b style="font-size:13.5px">${isToday?'Today':dt.toLocaleDateString('en-GB',{weekday:'long'})}</b>
                  <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${d.tasks.length} blocks · ${d.tasks.reduce((s,t)=>s+t.mins,0)} min</div></div>
                ${isToday?'<span class="tag leaf">Today</span>':''}${allDone?'<i class="fa-solid fa-circle-check" style="color:var(--ok)"></i>':''}
              </div>
              ${d.tasks.map(t => `<div style="display:flex;gap:12px;align-items:center;padding:10px 16px 10px 20px;border-bottom:1px dashed var(--line)">
                <div class="check ${B.planDone[t.key]?'on':''}" onclick="togglePlanTask('${t.key}')"><i class="fa-solid fa-check"></i></div>
                <div style="width:26px;height:26px;border-radius:8px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;font-size:11px"><i class="fa-solid ${t.ic}"></i></div>
                <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;${B.planDone[t.key]?'text-decoration:line-through;color:var(--ink-4)':''}">${t.name}</div>
                  <div style="font-family:var(--mono);font-size:10px;color:var(--ink-4)">${t.skill} · ${t.mins} min</div></div>
                <button class="btn btn-q btn-sm" onclick="navTo('${t.go}')">Open <i class="fa-solid fa-arrow-right"></i></button>
              </div>`).join('')}
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}
let planWeek = null;

function exportPlan(){
  const pl = B.plan; if (!pl) return;
  const w = window.open('', '_blank');
  if (!w){ toast('Allow pop-ups to print your plan'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Bloom Study Plan</title><style>
    @page{size:A4;margin:16mm}body{font-family:system-ui,sans-serif;color:#12211a;font-size:11pt;line-height:1.45}
    h1{font-size:22pt;margin:0 0 4px;color:#2f6b3a}.sub{color:#5d7266;font-size:10pt;margin-bottom:18px}
    .wk{font-size:9pt;letter-spacing:1.5px;text-transform:uppercase;color:#5da35f;font-weight:800;margin:16px 0 6px;border-bottom:1px solid #e3ebe4;padding-bottom:4px}
    .d{margin-bottom:7px;break-inside:avoid}.dh{font-weight:700;font-size:10.5pt}
    .t{margin-left:14px;font-size:10pt;color:#31463b}.box{display:inline-block;width:9px;height:9px;border:1px solid #8b9d93;margin-right:6px;vertical-align:middle}
    .rest{color:#8b9d93;font-style:italic}</style></head><body>
    <h1>Bloom Study Plan</h1>
    <div class="sub">${esc(B.profile.name)} · ${examOf(B.profile.exam).name} · target Band ${bandLabel(B.profile.target)} · ${pl.weeks} weeks from ${pl.days[0].date}</div>
    ${Array.from({length:pl.weeks},(_,i)=>i+1).map(n => `<div class="wk">Week ${n}</div>` + pl.days.filter(d=>d.week===n).map(d => {
      const dt = new Date(d.date+'T00:00:00');
      if (d.rest) return `<div class="d"><span class="dh">${dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span> <span class="rest">— rest day</span></div>`;
      return `<div class="d"><div class="dh">${dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</div>${d.tasks.map(t=>`<div class="t"><span class="box"></span>${t.name} — ${t.mins} min</div>`).join('')}</div>`;
    }).join('')).join('')}
    </body></html>`);
  w.document.close(); setTimeout(() => w.print(), 400);
}

/* ═══ ENGLISH PROFILE ═══ */
function sec_profile(){
  const p = B.profile, pl = B.placement, e = est();
  const ci = pl ? cefrIdx(pl.cefr) : 0, ti = cefrIdx(bandToCEFR(p.target));
  return `
    ${phead({ eyebrow:'Your profile', title:`Bloom English <em>Profile</em>`, sub:'Everything Bloom knows about your English, and the settings that drive your plan.',
      actions:`<button class="btn btn-g btn-sm" onclick="navTo('settings')"><i class="fa-solid fa-gear"></i> Settings</button><button class="btn btn-g btn-sm" onclick="navTo('placement')"><i class="fa-solid fa-rotate-right"></i> Retake placement</button><button class="btn btn-g btn-sm" onclick="resetBloom()"><i class="fa-solid fa-trash"></i> Reset</button>` })}

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Level</h3><p>${pl ? 'Assessed on ' + pl.date : 'Not yet assessed'}</p></div></div>
          <div class="card-bd">
            ${pl ? `
              <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap;margin-bottom:20px">
                ${typeof avatarHTML === 'function' && B.profile.avatar ? avatarHTML(72) : ''}
                <div class="band" style="width:88px;height:88px;border-radius:24px"><b style="font-size:30px">${pl.cefr}</b><span>CEFR</span></div>
                <div style="flex:1;min-width:200px">
                  <b style="font-family:var(--display);font-size:19px;font-weight:700;display:block">${cefrOf(pl.cefr).name}</b>
                  <p style="font-size:12.5px;color:var(--ink-3);margin-top:5px;line-height:1.55">${cefrOf(pl.cefr).desc}</p>
                </div>
                <div class="band amb sm"><b>${bandLabel(e)}</b><span>Est. band</span></div>
              </div>
              <div class="cefr">${CEFR.map((c,i)=>`<div class="${i===ci?'now':i<ci?'pass':i===ti?'goal':''}">${c.id}<small>${i===ci?'you':i===ti?'target':''}</small></div>`).join('')}</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:11px;margin-top:20px">
                ${['listening','reading','writing','speaking'].map(k=>`<div style="padding:12px;border-radius:12px;background:var(--paper);text-align:center">
                  <div style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${skillMeta(k).name}</div>
                  <div style="font-family:var(--display);font-size:21px;font-weight:700;margin-top:4px">${bandLabel(B.scores[k])}</div></div>`).join('')}
                ${Object.entries(pl.sub||{}).map(([k,v])=>`<div style="padding:12px;border-radius:12px;background:var(--paper);text-align:center">
                  <div style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-4);font-weight:800">${k}</div>
                  <div style="font-family:var(--display);font-size:21px;font-weight:700;margin-top:4px;color:var(--ink-3)">${bandLabel(v)}</div></div>`).join('')}
              </div>`
            : `<div class="empty" style="border:none;background:transparent;padding:26px"><i class="fa-solid fa-clipboard-question"></i><b>No placement result</b><span>Take the test to unlock your profile.</span><div style="margin-top:14px"><button class="btn btn-p btn-sm" onclick="navTo('placement')">Take it now</button></div></div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Score conversions</h3><p>Your current estimate on every scale Bloom supports</p></div></div>
          <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>Exam</th><th>Your estimate</th><th>Your target</th><th>Typical requirement</th></tr></thead>
            <tbody>
              ${EXAMS.filter(x=>x.id!=='general').map(x => `<tr>
                <td><b style="color:var(--ink)">${x.name}</b></td>
                <td style="font-family:var(--mono)">${e!=null?scoreInExam(e,x.id):'—'}</td>
                <td style="font-family:var(--mono);color:var(--leaf-700);font-weight:700">${scoreInExam(p.target,x.id)}</td>
                <td style="font-size:12px;color:var(--ink-4)">${x.id==='ielts-a'?'6.5–7.0 for most universities':x.id==='ielts-g'?'6.0–7.0 for migration':x.id==='toefl'?'80–100 for US universities':x.id==='pte'?'58–65 for most courses':x.id==='duolingo'?'105–120 accepted widely':'B2 First or C1 Advanced'}</td>
              </tr>`).join('')}
            </tbody></table></div></div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Settings</h3><p>Changing these rebuilds your recommendations</p></div></div>
          <div class="card-bd" style="display:grid;gap:14px">
            <div class="fg"><label>Name</label><input value="${esc(p.name)}" onchange="B.profile.name=this.value;save();renderNav()"></div>
            <div class="fg"><label>Email</label><input value="${esc(p.email)}" onchange="B.profile.email=this.value;save()"></div>
            <div class="fg"><label>Exam</label><select onchange="B.profile.exam=this.value;save();navTo('profile')">${EXAMS.map(x=>`<option value="${x.id}" ${p.exam===x.id?'selected':''}>${x.name}</option>`).join('')}</select></div>
            <div class="fg"><label>Target band — ${bandLabel(p.target)}</label><input class="range" type="range" min="4" max="9" step="0.5" value="${p.target}" onchange="B.profile.target=+this.value;save();navTo('profile')"></div>
            <div class="fg"><label>Test date</label><input type="date" value="${p.testDate||''}" onchange="B.profile.testDate=this.value;save();navTo('profile')"></div>
            <div class="fg"><label>Study hours per day</label><select onchange="B.profile.hoursPerDay=+this.value;save()">${[1,2,3,4,5].map(h=>`<option value="${h}" ${p.hoursPerDay===h?'selected':''}>${h} hour${h===1?'':'s'}</option>`).join('')}</select></div>
            <div class="fg"><label>First language</label><select onchange="B.profile.l1=this.value;save();navTo('profile')">${L1.map(x=>`<option ${p.l1===x?'selected':''}>${x}</option>`).join('')}</select></div>
            <div class="fg"><label>Purpose</label><select onchange="B.profile.purpose=this.value;save();navTo('profile')">${PURPOSES.map(x=>`<option value="${x.id}" ${p.purpose===x.id?'selected':''}>${x.name}</option>`).join('')}</select></div>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Watch list for ${esc(p.l1)} speakers</h3></div></div>
          <div class="card-bd" style="display:grid;gap:9px">
            ${l1Traps(p.l1).map(t=>`<div style="display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:var(--ink-2);line-height:1.55"><i class="fa-solid fa-circle-dot" style="color:var(--amber);font-size:8px;margin-top:6px"></i><span>${t}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}
