/* ═══════════════════════════════════════════════════════════════
   FLASHCARDS ENGINE — active recall, SM-2 style spaced repetition,
   weak-area detection, daily goals, six study modes.
   Depends on: FC_CARDS/FC_TOPICS/FC_SUBJECTS, pageHead(), showToast(), navTo()
═══════════════════════════════════════════════════════════════ */

const FC_GRADES = [
  { k:'again', n:1, label:'Again',  sub:'Didn\'t know it',     cls:'again' },
  { k:'hard',  n:2, label:'Hard',   sub:'Partly remembered',   cls:'hard'  },
  { k:'good',  n:3, label:'Good',   sub:'Remembered it',       cls:'good'  },
  { k:'easy',  n:4, label:'Easy',   sub:'Knew it instantly',   cls:'easy'  },
];
const FC_MODES = {
  continue: { label:'Continue Learning', ic:'fa-play',            sub:'Due cards first, then new' },
  due:      { label:'Due Today',         ic:'fa-calendar-check',  sub:'Only what is scheduled' },
  weak:     { label:'Weak Areas',        ic:'fa-triangle-exclamation', sub:'Your difficult cards' },
  random:   { label:'Random Review',     ic:'fa-shuffle',         sub:'Shuffled mixed recall' },
  topic:    { label:'Topic Review',      ic:'fa-layer-group',     sub:'One topic end to end' },
  exam:     { label:'Exam Mode',         ic:'fa-stopwatch',       sub:'Timed, answers at the end' },
  saved:    { label:'My Saved Cards',    ic:'fa-bookmark',        sub:'Everything you starred' },
};

let fcState = { view:'dash', subj:null, topic:null, mode:'continue', queue:[], idx:0, back:false, open:{}, stats:null, results:[], search:'', filter:'all', timer:null, left:0 };

/* ── storage ── */
function fcLS(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e){ return d; } }
function fcSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
function fcToday(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function fcAddDays(n){ const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

function fcSrsAll(){ return fcLS('fma_fc_srs', {}); }
function fcSrs(id){ return fcSrsAll()[id] || null; }
function fcMarks(){ return fcLS('fma_fc_marks', []); }
function fcNotes(){ return fcLS('fma_fc_notes', {}); }
function fcCustom(){ return fcLS('fma_fc_custom', { add:[], edit:{}, hide:[], unpub:[] }); }
function fcSaveCustom(c){ fcSet('fma_fc_custom', c); }
function fcDaily(){
  const d = fcLS('fma_fc_daily', { date:fcToday(), n:0, goal:30, streak:0, last:null });
  if (d.date !== fcToday()){
    const y = fcAddDays(-1);
    d.streak = (d.date === y && d.n > 0) ? d.streak : (d.n > 0 && d.date === y ? d.streak : 0);
    if (d.date !== y) d.streak = 0;
    d.date = fcToday(); d.n = 0; fcSet('fma_fc_daily', d);
  }
  return d;
}
function fcBumpDaily(){
  const d = fcDaily();
  if (d.n === 0){ const y = fcAddDays(-1); d.streak = (d.last === y) ? d.streak + 1 : 1; d.last = fcToday(); }
  d.n++; fcSet('fma_fc_daily', d); return d;
}

/* ── deck ── */
function fcDeck(){
  const c = fcCustom();
  const isStudent = state.user.roleKey === 'student';
  const base = FC_CARDS.map(card => c.edit[card.id] ? { ...card, ...c.edit[card.id] } : card);
  const student = (typeof fcStudentCards === 'function') ? fcStudentCards() : [];
  const all = [...base, ...c.add, ...student];
  return all.filter(card => !c.hide.includes(card.id) && !(isStudent && c.unpub.includes(card.id)));
}
function fcCard(id){ return fcDeck().find(c => c.id === id); }
function fcTopicName(subj, t){ return (FC_TOPICS[subj] || []).find(x => x[0] === t)?.[1] || t; }
function fcSubjMeta(s){ return FC_SUBJECTS.find(x => x.id === s) || { ic:'fa-book', cls:'' }; }

/* ── card status ── */
function fcIsDue(id){ const s = fcSrs(id); return !!s && s.due <= fcToday(); }
function fcIsNew(id){ return !fcSrs(id); }
function fcIsMastered(id){ const s = fcSrs(id); return !!s && s.reps >= 3 && s.iv >= 21 && s.lastG >= 3; }
function fcIsHard(id){ const s = fcSrs(id); return !!s && (s.lapses >= 3 || s.ease < 2.0); }
function fcStatus(id){ return fcIsMastered(id) ? 'mast' : fcIsHard(id) ? 'hard' : fcIsDue(id) ? 'due' : fcIsNew(id) ? '' : 'seen'; }

function fcScope(subj, topic){
  return fcDeck().filter(c => (!subj || c.s === subj) && (!topic || c.t === topic));
}
function fcStats(cards){
  const ids = cards.map(c => c.id);
  const srs = fcSrsAll();
  let seen = 0, ok = 0, tot = 0;
  ids.forEach(id => { const s = srs[id]; if (s){ seen++; ok += s.good || 0; tot += s.reps || 0; } });
  return {
    total: ids.length,
    due: ids.filter(fcIsDue).length,
    fresh: ids.filter(fcIsNew).length,
    mastered: ids.filter(fcIsMastered).length,
    hard: ids.filter(fcIsHard).length,
    seen,
    accuracy: tot ? Math.round(ok / tot * 100) : 0,
    pct: ids.length ? Math.round(ids.filter(fcIsMastered).length / ids.length * 100) : 0,
  };
}

/* ── SM-2 lite ── */
function fcGrade(id, g){
  const all = fcSrsAll();
  const s = all[id] || { ease:2.5, iv:0, reps:0, lapses:0, good:0, due:fcToday(), lastG:0, hist:[] };
  if (g === 1){ s.lapses++; s.ease = Math.max(1.3, s.ease - 0.2); s.iv = 0; s.reps = 0; }
  else if (g === 2){ s.ease = Math.max(1.3, s.ease - 0.15); s.iv = s.iv ? Math.max(1, Math.round(s.iv * 1.2)) : 1; s.reps++; s.good++; }
  else if (g === 3){ s.iv = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.iv * s.ease); s.reps++; s.good++; }
  else { s.ease = Math.min(3.2, s.ease + 0.15); s.iv = s.reps === 0 ? 3 : Math.round((s.iv || 1) * s.ease * 1.3); s.reps++; s.good++; }
  s.lastG = g;
  s.due = fcAddDays(g === 1 ? 0 : s.iv);
  s.hist = [...(s.hist || []), { d:fcToday(), g }].slice(-20);
  all[id] = s; fcSet('fma_fc_srs', all);
  return s;
}
function fcNextLabel(id, g){
  const s = { ...(fcSrs(id) || { ease:2.5, iv:0, reps:0 }) };
  if (g === 1) return 'now';
  let iv;
  if (g === 2) iv = s.iv ? Math.max(1, Math.round(s.iv * 1.2)) : 1;
  else if (g === 3) iv = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.iv * s.ease);
  else iv = s.reps === 0 ? 3 : Math.round((s.iv || 1) * s.ease * 1.3);
  return iv === 1 ? '1 day' : iv < 30 ? iv + ' days' : Math.round(iv/30) + ' mo';
}

/* ── math rendering ── */
function fcTex(tex, display){
  if (window.katex) { try { return katex.renderToString(tex, { throwOnError:false, displayMode:!!display }); } catch(e){} }
  return '<code>' + tex.replace(/\\/g,'').replace(/[{}]/g,'') + '</code>';
}
function fcMath(txt){
  if (!txt) return '';
  return String(txt).split('$').map((part, i) => i % 2 ? fcTex(part, false) : part).join('');
}

/* ═══ SECTION ═══ */
function sec_flashcards(){
  if (fcState.view === 'session') return fcSessionHTML();
  if (fcState.view === 'summary') return fcSummaryHTML();
  if (fcState.view === 'browse') return fcBrowseHTML();
  if (fcState.view === 'community') return fcCommunityHTML();
  if (fcState.view === 'mine') return fcMineHTML();
  if (fcState.view === 'manage') return fcManageHTML();
  return fcDashHTML();
}

/* ── dashboard ── */
function fcDashHTML(){
  const all = fcDeck(), g = fcStats(all), d = fcDaily();
  const goalPct = Math.min(100, Math.round(d.n / d.goal * 100));
  const canManage = ['admin','faculty','staff'].includes(state.user.roleKey);
  return `
    ${pageHead({
      eyebrow:'Active recall',
      title:`Flash<em>cards</em>`,
      sub:'Answer three questions every day: what do I revise today, where am I weak, and what have I mastered.',
      actions:`
        <button class="btn btn-ghost btn-sm" onclick="fcState.view='community'; navTo('flashcards')"><i class="fa-solid fa-users"></i> Class shelf</button>
        <button class="btn btn-ghost btn-sm" onclick="fcState.view='browse'; navTo('flashcards')"><i class="fa-solid fa-magnifying-glass"></i> Browse &amp; search</button>
        ${canManage ? `<button class="btn btn-ghost btn-sm" onclick="fcState.view='manage'; navTo('flashcards')"><i class="fa-solid fa-pen-to-square"></i> Manage cards</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="fcStart('continue')"><i class="fa-solid fa-play"></i> Continue learning</button>`
    })}

    <div class="fc-hero">
      <div class="ring" style="--p:${g.pct}%;"><div><b>${g.pct}%</b><span>Mastered</span></div></div>
      <div>
        <h3>${g.due ? g.due + ' card' + (g.due===1?'':'s') + ' due today' : d.n ? 'All caught up for today' : 'Nothing due — start something new'}</h3>
        <p>${g.mastered} of ${g.total} cards mastered · ${g.hard} flagged difficult · ${g.fresh} never seen. Reviews are scheduled automatically after every rating.</p>
        <div class="fc-goal">
          <div class="top"><span>Daily goal</span><b>${d.n} / ${d.goal} cards</b></div>
          <div class="bar"><i style="width:${goalPct}%"></i></div>
          <div style="display:flex; gap:6px; margin-top:10px; flex-wrap:wrap;">
            ${[10,20,30,50].map(n => `<button class="st-chip ${d.goal===n?'on':''}" style="padding:4px 11px; font-size:11px;" onclick="fcSetGoal(${n})">${n}</button>`).join('')}
            <button class="st-chip hollow" style="padding:4px 11px; font-size:11px;" onclick="fcSetGoal('custom')">Custom</button>
          </div>
        </div>
      </div>
      <div class="fc-streak">
        <div class="s"><b>${d.streak}</b><span>Day streak</span></div>
        <div class="s"><b>${g.accuracy}%</b><span>Accuracy</span></div>
      </div>
    </div>

    <div class="fc-subjects">
      ${FC_SUBJECTS.map(sub => {
        const st = fcStats(fcScope(sub.id));
        return `<div class="fc-sub">
          <div class="hd">
            <div class="ic ${sub.cls}"><i class="fa-solid ${sub.ic}"></i></div>
            <div class="nm"><b>${sub.id}</b><span>${st.total} cards · ${FC_TOPICS[sub.id].length} topics</span></div>
            <div class="pct">${st.pct}%</div>
          </div>
          <div class="bd">
            <div class="bar"><i style="width:${st.pct}%"></i></div>
            <div class="fc-mini">
              <div class="due"><b>${st.due}</b><span>Due</span></div>
              <div class="mast"><b>${st.mastered}</b><span>Mastered</span></div>
              <div class="hard"><b>${st.hard}</b><span>Difficult</span></div>
            </div>
            <div class="acts">
              <button class="btn btn-primary btn-sm" style="flex:1; justify-content:center;" onclick="fcStart('continue','${sub.id}')"><i class="fa-solid fa-play"></i> Study</button>
              <button class="btn btn-ghost btn-sm" onclick="fcState.subj='${sub.id}'; fcState.view='browse'; navTo('flashcards')">Topics</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="card mb-5">
      <div class="card-hd"><div><div class="card-title">Study modes</div><div class="card-sub">Every mode schedules the next review for you</div></div></div>
      <div class="card-body">
        <div class="fc-modes">
          ${['continue','due','weak','random','exam','saved'].map(m => {
            const M = FC_MODES[m];
            const n = m === 'due' ? g.due : m === 'weak' ? g.hard : m === 'saved' ? fcMarks().length : null;
            return `<button class="fc-mode ${m==='weak'?'danger':m==='exam'||m==='saved'?'warm':''}" onclick="fcStart('${m}')">
              <div class="mi"><i class="fa-solid ${M.ic}"></i></div>
              <div class="mt"><b>${M.label}${n!=null?` · ${n}`:''}</b><span>${M.sub}</span></div>
            </button>`;
          }).join('')}
          <button class="fc-mode warm" onclick="fcState.view='community'; navTo('flashcards')">
            <div class="mi"><i class="fa-solid fa-users"></i></div>
            <div class="mt"><b>Made by Students · ${(typeof fcCommunity === 'function' ? fcCommunity().length : 0)}</b><span>Cards your cohort wrote</span></div>
          </button>
        </div>
      </div>
    </div>

    <div class="grid-wide">
      <div class="card">
        <div class="card-hd"><div><div class="card-title">Topic mastery</div><div class="card-sub">Weakest topics first — these need the next session</div></div>        <button class="btn btn-ghost btn-sm" onclick="fcState.view='browse'; navTo('flashcards')">All topics <i class="fa-solid fa-arrow-right"></i></button></div>
        <div class="card-body">
          ${(() => {
            const rows = [];
            FC_SUBJECTS.forEach(sub => FC_TOPICS[sub.id].forEach(([t,name]) => {
              const cards = fcScope(sub.id, t); if (!cards.length) return;
              const st = fcStats(cards);
              if (st.seen) rows.push({ sub:sub.id, name, pct:st.pct, st });
            }));
            rows.sort((a,b) => a.pct - b.pct);
            if (!rows.length) return `<div class="st-empty" style="padding:30px 16px;"><i class="fa-solid fa-seedling"></i><b>No reviews yet</b><span>Study a few cards and your topic mastery appears here.</span></div>`;
            return rows.slice(0,8).map(r => `<div class="prog-row"><div class="prog-lbl"><span>${r.sub} · ${r.name}</span><b>${r.pct}%</b></div><div class="prog-bar"><div class="prog-fill" style="width:${r.pct}%; background:${r.pct>=70?'var(--ok)':r.pct>=40?'var(--gold)':'var(--err)'};"></div></div></div>`).join('');
          })()}
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div><div class="card-title">Difficult cards</div><div class="card-sub">Flagged automatically after repeated lapses</div></div>
        ${g.hard ? `<button class="btn btn-ghost btn-sm" onclick="fcStart('weak')">Drill these <i class="fa-solid fa-arrow-right"></i></button>` : ''}</div>
        <div class="card-body" style="padding:${g.hard?'0':'22px'};">
          ${g.hard ? all.filter(c => fcIsHard(c.id)).slice(0,7).map(c => {
            const s = fcSrs(c.id);
            return `<div style="display:flex; gap:12px; align-items:center; padding:11px 22px; border-bottom:1px solid var(--rule);">
              <div style="width:8px; height:8px; border-radius:50%; background:var(--err); flex:0 0 8px;"></div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:12.5px; color:var(--ink-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.f.replace(/\$/g,'')}</div>
                <div style="font-family:var(--mono); font-size:10px; color:var(--ink-4); margin-top:2px;">${c.s} · ${fcTopicName(c.s,c.t)} · struggled ${s.lapses} time${s.lapses===1?'':'s'}</div>
              </div>
              <button class="ico-btn" onclick="fcStart('single',null,null,'${c.id}')"><i class="fa-solid fa-play"></i></button>
            </div>`;
          }).join('') : `<div class="st-empty" style="padding:30px 16px;"><i class="fa-solid fa-circle-check"></i><b>Nothing flagged</b><span>Cards you repeatedly miss are collected here automatically.</span></div>`}
        </div>
      </div>
    </div>
    ${typeof fcCommunityCard === 'function' ? fcCommunityCard() : ''}`;
}

function fcSetGoal(n){
  const d = fcDaily();
  if (n === 'custom'){ const v = prompt('Daily flashcard goal', d.goal); if (!v) return; n = Math.max(5, Math.min(300, parseInt(v) || d.goal)); }
  d.goal = n; fcSet('fma_fc_daily', d); navTo('flashcards');
}

/* ── queue building ── */
function fcShuffle(a){ const x = [...a]; for (let i = x.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [x[i],x[j]] = [x[j],x[i]]; } return x; }

function fcStart(mode, subj, topic, single){
  const scope = fcScope(subj || fcState.subj && mode === 'topic' ? subj || fcState.subj : subj, topic);
  let pool = subj || topic ? fcScope(subj, topic) : fcDeck();
  let queue = [];
  const d = fcDaily();
  const room = Math.max(10, d.goal - d.n);
  if (single){ queue = [single]; mode = 'single'; }
  else if (mode === 'due') queue = pool.filter(c => fcIsDue(c.id)).map(c => c.id);
  else if (mode === 'weak') queue = pool.filter(c => fcIsHard(c.id)).map(c => c.id);
  else if (mode === 'saved') queue = fcMarks().filter(id => pool.some(c => c.id === id));
  else if (mode === 'random') queue = fcShuffle(pool.map(c => c.id)).slice(0, 20);
  else if (mode === 'exam') queue = fcShuffle(pool.map(c => c.id)).slice(0, 20);
  else if (mode === 'topic') queue = pool.map(c => c.id);
  else {
    const due = pool.filter(c => fcIsDue(c.id)).map(c => c.id);
    const fresh = pool.filter(c => fcIsNew(c.id)).map(c => c.id);
    queue = [...due, ...fcShuffle(fresh)].slice(0, room);
  }
  if (!queue.length){
    showToast(mode === 'due' ? 'Nothing is due right now — try Random Review' : mode === 'weak' ? 'No difficult cards yet' : mode === 'saved' ? 'You have not bookmarked any cards yet' : 'No cards in this selection');
    return;
  }
  fcState.mode = mode; fcState.queue = queue; fcState.idx = 0; fcState.back = false;
  fcState.subj = subj || fcState.subj; fcState.topic = topic || null;
  fcState.results = []; fcState.stats = { again:0, hard:0, good:0, easy:0, start:Date.now() };
  fcState.view = 'session';
  navTo('flashcards');
  if (mode === 'exam') fcStartTimer();
}
function fcStartTimer(){
  clearInterval(fcState.timer); fcState.left = 20;
  fcState.timer = setInterval(() => {
    if (typeof state === 'undefined' || state.section !== 'flashcards' || fcState.view !== 'session'){ fcStopTimer(); return; }
    fcState.left--;
    const el = document.getElementById('fcTimer');
    if (el) el.textContent = fcState.left + 's';
    if (fcState.left <= 0) fcExamMark(0);
  }, 1000);
}
function fcStopTimer(){ clearInterval(fcState.timer); fcState.timer = null; }

/* ── session ── */
function fcSessionHTML(){
  const id = fcState.queue[fcState.idx], c = fcCard(id);
  if (!c) return fcDashHTML();
  const done = fcState.idx, total = fcState.queue.length;
  const exam = fcState.mode === 'exam';
  return `
    ${pageHead({
      eyebrow:'Flashcards · ' + (FC_MODES[fcState.mode]?.label || 'Review'),
      title:`${c.s} <em>${fcTopicName(c.s, c.t)}</em>`,
      sub: exam ? 'Exam mode — rate yourself fast, answers are revealed at the end.' : 'Recall first, then reveal. Your rating schedules the next review.',
      actions:`<button class="btn btn-ghost btn-sm" onclick="fcQuit()"><i class="fa-solid fa-xmark"></i> End session</button>`
    })}
    <div class="fc-stage">
      <div class="fc-meter">
        <span class="n">${done + 1} / ${total}</span>
        <div class="bar"><i style="width:${Math.round(done/total*100)}%"></i></div>
        ${exam ? `<span class="n" id="fcTimer" style="color:var(--err); font-weight:700;">${fcState.left}s</span>` : `<span class="n">${fcDaily().n} today</span>`}
      </div>
      <div class="fc-flip" id="fcFlip">${fcFaceHTML(c)}</div>
      <div id="fcControls">${fcControlsHTML(c)}</div>
    </div>`;
}

function fcFaceHTML(c){
  const marked = fcMarks().includes(c.id);
  const note = fcNotes()[c.id] || '';
  const s = fcSrs(c.id);
  const tags = [...(c.g || [])];
  if (fcIsHard(c.id)) tags.push('DIFFICULT');
  const tagCls = t => t === 'HIGH YIELD' ? 'hy' : t === 'COMMON TRAP' ? 'trap' : t === 'MUST KNOW' ? 'must' : t === 'FORMULA' ? 'formula' : t === 'DIFFICULT' ? 'diff' : '';
  const head = `<div class="fc-tags">
      <span class="fc-type">${FC_TYPES[c.ty] || 'Flashcard'}</span>
      ${tags.map(t => `<span class="fc-tag ${tagCls(t)}">${t}</span>`).join('')}
      <span style="margin-left:auto; display:flex; gap:4px; align-items:center;">
        ${c.by ? `<span class="fc-credit" title="Written by ${c.by}"><i class="fa-solid fa-user-pen"></i> ${c.by}</span>` : ''}
        <button class="ico-btn" title="${marked?'Remove bookmark':'Bookmark this card'}" onclick="fcToggleMark('${c.id}')" style="${marked?'color:var(--gold); border-color:var(--gold);':''}"><i class="fa-${marked?'solid':'regular'} fa-bookmark"></i></button>
        <button class="ico-btn" title="Private note" onclick="fcToggleNote()"><i class="fa-regular fa-note-sticky"></i></button>
      </span>
    </div>`;
  if (!fcState.back){
    return `<div class="fc-face">
      ${head}
      <div class="fc-front">
        <div class="fc-q ${c.f.length > 110 ? 'fc-sm' : ''}">${fcMath(c.f)}</div>
        ${c.pl ? `<div class="fc-plate">${c.img ? `<img src="${c.img}" alt="">` : `<i class="fa-regular fa-image"></i><b>Diagram card</b><span>${c.pl}</span>`}</div>` : ''}
      </div>
      <div class="fc-hint">Recall the answer, then press <kbd>Space</kbd> to reveal${s ? ` · seen ${s.reps + s.lapses}× · interval ${s.iv || 0}d` : ' · new card'}</div>
    </div>`;
  }
  return `<div class="fc-face">
    ${head}
    <div style="font-size:13px; color:var(--ink-4); margin-bottom:12px; text-wrap:pretty;">${fcMath(c.f)}</div>
    <div class="fc-ans">${fcMath(c.a)}</div>
    ${c.fo ? `<div class="fc-formula">${fcTex(c.fo, true)}</div>` : ''}
    ${c.e ? `<div class="fc-block"><div class="l"><i class="fa-solid fa-circle-info"></i> Why</div><p>${fcMath(c.e)}</p></div>` : ''}
    ${c.m ? `<div class="fc-block trap"><div class="l"><i class="fa-solid fa-triangle-exclamation"></i> Common misconception</div><p>${fcMath(c.m)}</p></div>` : ''}
    ${c.ip ? `<div class="fc-block tip"><div class="l"><i class="fa-solid fa-lightbulb"></i> IMAT tip</div><p>${fcMath(c.ip)}</p></div>` : ''}
    ${c.r ? `<div class="fc-block"><div class="l">Related</div><div class="fc-rel"><span>${c.s} · ${fcTopicName(c.s,c.t)}</span><span>${c.r}</span></div></div>` : ''}
    ${fcState.note ? `<div class="fc-note"><div class="l">My private note</div><textarea placeholder="Why did I get this wrong? What does it remind me of?" onchange="fcSaveNote('${c.id}', this.value)">${(fcNotes()[c.id]||'')}</textarea></div>` : (fcNotes()[c.id] ? `<div class="fc-note"><div class="l">My private note</div><p style="font-size:12.5px; color:var(--ink-2); line-height:1.5;">${fcNotes()[c.id]}</p></div>` : '')}
  </div>`;
}

function fcControlsHTML(c){
  const exam = fcState.mode === 'exam';
  if (exam) return `<div class="fc-grade" style="grid-template-columns:repeat(2,1fr);">
      <button class="fc-g again" onclick="fcExamMark(0)"><b>Didn't know</b><span>1</span></button>
      <button class="fc-g easy" onclick="fcExamMark(1)"><b>Knew it</b><span>2</span></button>
    </div>
    <div class="fc-bar"><span style="font-size:11.5px; color:var(--ink-4);">Answers are revealed in the summary at the end.</span><span class="sp"></span><button class="btn btn-ghost btn-sm" onclick="fcQuit()">Finish now</button></div>`;
  if (!fcState.back) return `<button class="btn btn-primary" style="width:100%; justify-content:center; padding:14px;" onclick="fcShow()"><i class="fa-solid fa-eye"></i> Show answer</button>
    <div class="fc-bar"><button class="btn btn-ghost btn-sm" onclick="fcPrev()" ${fcState.idx===0?'disabled style="opacity:.4;"':''}><i class="fa-solid fa-arrow-left"></i> Previous</button><span class="sp"></span><button class="btn btn-ghost btn-sm" onclick="fcSkip()">Skip <i class="fa-solid fa-arrow-right"></i></button></div>`;
  return `<div class="fc-grade">
      ${FC_GRADES.map(g => `<button class="fc-g ${g.cls}" onclick="fcRate(${g.n})"><b>${g.label}</b><span>${fcNextLabel(c.id, g.n)}</span></button>`).join('')}
    </div>
    <div class="fc-bar"><span style="font-size:11.5px; color:var(--ink-4);">How well did you know this? <kbd class="fc-hint" style="padding:0;">1</kbd>–<kbd>4</kbd></span><span class="sp"></span><button class="btn btn-ghost btn-sm" onclick="fcToggleNote()"><i class="fa-regular fa-note-sticky"></i> Note</button></div>`;
}

function fcPaint(){
  const c = fcCard(fcState.queue[fcState.idx]);
  if (!c){ navTo('flashcards'); return; }
  const flip = document.getElementById('fcFlip');
  if (!flip){ navTo('flashcards'); return; }
  flip.innerHTML = fcFaceHTML(c);
  document.getElementById('fcControls').innerHTML = fcControlsHTML(c);
  const m = document.querySelector('.fc-meter');
  if (m){ m.querySelector('.n').textContent = (fcState.idx + 1) + ' / ' + fcState.queue.length; m.querySelector('.bar i').style.width = Math.round(fcState.idx / fcState.queue.length * 100) + '%'; }
}
function fcFlipTo(back){
  const flip = document.getElementById('fcFlip');
  fcState.back = back;
  if (!flip){ fcPaint(); return; }
  flip.classList.add('turning');
  setTimeout(() => { fcPaint(); flip.classList.remove('turning'); }, 190);
}
function fcShow(){ if (!fcState.back) fcFlipTo(true); }
function fcToggleNote(){ fcState.note = !fcState.note; if (!fcState.back) fcState.back = true; fcPaint(); }
function fcSaveNote(id, v){ const n = fcNotes(); if (v.trim()) n[id] = v.trim(); else delete n[id]; fcSet('fma_fc_notes', n); showToast('Note saved to this card'); }
function fcToggleMark(id){
  const m = fcMarks(), i = m.indexOf(id);
  if (i >= 0) m.splice(i,1); else m.push(id);
  fcSet('fma_fc_marks', m); fcPaint();
  showToast(i >= 0 ? 'Bookmark removed' : 'Card saved to My Saved Cards');
}

function fcRate(g){
  if (!fcState.back) return;
  const id = fcState.queue[fcState.idx];
  fcGrade(id, g); fcBumpDaily();
  fcState.stats[FC_GRADES[g-1].k]++;
  fcState.results.push({ id, g });
  if (g === 1){ const q = fcState.queue; q.splice(Math.min(q.length, fcState.idx + 4), 0, id); }
  fcAdvance();
}
function fcExamMark(known){
  const id = fcState.queue[fcState.idx];
  fcGrade(id, known ? 3 : 1); fcBumpDaily();
  fcState.stats[known ? 'good' : 'again']++;
  fcState.results.push({ id, g: known ? 3 : 1 });
  fcAdvance();
  if (fcState.view === 'session') fcStartTimer();
}
function fcAdvance(){
  fcState.back = false; fcState.note = false;
  if (fcState.idx >= fcState.queue.length - 1){ fcFinish(); return; }
  fcState.idx++; fcPaint();
}
function fcSkip(){ if (fcState.idx >= fcState.queue.length - 1){ fcFinish(); return; } fcState.idx++; fcState.back = false; fcPaint(); }
function fcPrev(){ if (fcState.idx === 0) return; fcState.idx--; fcState.back = false; fcPaint(); }
function fcQuit(){ fcStopTimer(); if (fcState.results.length) fcFinish(); else { fcState.view = 'dash'; navTo('flashcards'); } }
function fcFinish(){
  fcStopTimer(); fcState.view = 'summary'; navTo('flashcards');
  const d = fcDaily();
  if (d.n >= d.goal && typeof pushStudentNotif === 'function' && state.user.roleKey === 'student'){
    const s = getCurrentStudent && getCurrentStudent();
    if (s) pushStudentNotif(s.id, { type:'check', title:'Daily flashcard goal reached — ' + d.n + ' cards', body:'Streak: ' + d.streak + ' day' + (d.streak===1?'':'s') + '. Tomorrow\'s review is already scheduled.' });
  }
}

/* ── summary ── */
function fcSummaryHTML(){
  const st = fcState.stats || { again:0, hard:0, good:0, easy:0, start:Date.now() };
  const n = fcState.results.length;
  const right = st.good + st.easy;
  const pct = n ? Math.round(right / n * 100) : 0;
  const mins = Math.max(1, Math.round((Date.now() - st.start) / 60000));
  const d = fcDaily();
  const again = fcState.results.filter(r => r.g === 1);
  return `
    ${pageHead({ eyebrow:'Session complete', title:`Nice <em>work</em>`, sub:'Every card you rated has been rescheduled — the next review date is set automatically.',
      actions:`<button class="btn btn-ghost btn-sm" onclick="fcState.view='dash'; navTo('flashcards')">Back to dashboard</button><button class="btn btn-primary btn-sm" onclick="fcStart('${fcState.mode==='exam'?'continue':fcState.mode}')"><i class="fa-solid fa-rotate-right"></i> Another session</button>` })}
    <div class="card mb-5">
      <div class="card-body" style="display:flex; gap:30px; align-items:center; flex-wrap:wrap;">
        <div class="ql-score" style="--p:${pct}%;"><div><b>${pct}%</b><span>Recalled</span></div></div>
        <div style="flex:1; min-width:240px;">
          <div style="font-family:var(--serif); font-size:22px; font-weight:600; color:var(--navy); margin-bottom:6px;">${n} cards reviewed in ${mins} min</div>
          <div style="display:flex; gap:9px; flex-wrap:wrap; margin-top:12px;">
            ${FC_GRADES.map(g => `<div style="flex:1; min-width:88px; text-align:center; padding:10px; border-radius:8px; background:var(--paper);"><b style="display:block; font-family:var(--mono); font-size:17px; color:${g.k==='again'?'var(--err)':g.k==='hard'?'#c9791f':g.k==='good'?'var(--gold)':'var(--ok)'};">${st[g.k]}</b><span style="font-size:9px; letter-spacing:1.2px; text-transform:uppercase; color:var(--ink-4); font-weight:700;">${g.label}</span></div>`).join('')}
          </div>
        </div>
        <div class="fc-streak" style="flex:0 0 auto;">
          <div class="s" style="background:var(--paper); border-color:var(--rule);"><b style="color:var(--navy);">${d.n}/${d.goal}</b><span style="color:var(--ink-4);">Daily goal</span></div>
          <div class="s" style="background:var(--paper); border-color:var(--rule);"><b style="color:var(--gold);">${d.streak}</b><span style="color:var(--ink-4);">Day streak</span></div>
        </div>
      </div>
    </div>
    ${fcState.mode === 'exam' ? `
      <div class="bk-topic">Answers</div>
      ${fcState.results.map(r => { const c = fcCard(r.id); return c ? `<div class="ql-rev ${r.g===1?'ko':'ok'}"><div class="qh"><b><i class="fa-solid ${r.g===1?'fa-circle-xmark':'fa-circle-check'}" style="color:${r.g===1?'var(--err)':'var(--ok)'};"></i></b><div class="qt">${fcMath(c.f)}</div></div><div class="an"><span>${fcMath(c.a)}</span></div>${c.e?`<div class="ql-expl"><b>Why</b>${fcMath(c.e)}</div>`:''}</div>` : ''; }).join('')}`
    : again.length ? `
      <div class="card">
        <div class="card-hd"><div><div class="card-title">Cards to see again soon</div><div class="card-sub">Rated “Again” — they are due today and will come back first</div></div>
        <button class="btn btn-ghost btn-sm" onclick="fcStart('due')">Review now <i class="fa-solid fa-arrow-right"></i></button></div>
        <div class="card-body" style="padding:0;">
          ${[...new Set(again.map(r => r.id))].map(id => { const c = fcCard(id); return c ? `<div class="fc-row" style="padding:12px 22px; border-bottom:1px solid var(--rule);"><div class="st hard"></div><div class="q">${c.f.replace(/\$/g,'')}</div><div class="mt">${c.s} · ${fcTopicName(c.s,c.t)}</div></div>` : ''; }).join('')}
        </div>
      </div>` : `<div class="st-empty"><i class="fa-solid fa-circle-check"></i><b>Clean sweep — nothing to repeat</b><span>Every card in this session was recalled. Next reviews are scheduled.</span></div>`}
  `;
}

/* ── keyboard ── */
document.addEventListener('keydown', e => {
  if (typeof state === 'undefined' || state.section !== 'flashcards' || fcState.view !== 'session') return;
  const t = e.target.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
  if (e.key === ' '){ e.preventDefault(); fcState.mode === 'exam' ? fcExamMark(1) : fcShow(); }
  else if (['1','2','3','4'].includes(e.key)){
    e.preventDefault();
    if (fcState.mode === 'exam'){ if (e.key === '1') fcExamMark(0); if (e.key === '2') fcExamMark(1); }
    else if (fcState.back) fcRate(+e.key);
  }
  else if (e.key === 'ArrowRight'){ e.preventDefault(); fcSkip(); }
  else if (e.key === 'ArrowLeft'){ e.preventDefault(); fcPrev(); }
  else if (e.key === 'Escape'){ fcQuit(); }
});
