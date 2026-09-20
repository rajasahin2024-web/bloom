/* ═══ BLOOM — AI English Tutor (simulated, profile-aware) ═══ */

let ts = { typing:false, drill:null, mode:'chat' };

const TUTOR_STARTERS = [
  { q:"I don't understand when to use the present perfect.", i:'fa-clock' },
  { q:'How do I get from Band 6 to Band 7 in Writing?', i:'fa-arrow-trend-up' },
  { q:'What are my weakest areas right now?', i:'fa-bullseye' },
  { q:'Explain articles — a, an and the.', i:'fa-diagram-project' },
  { q:'Give me ten words for an essay about the environment.', i:'fa-spell-check' },
  { q:'How should I structure a Task 2 opinion essay?', i:'fa-pen-nib' },
  { q:'What should I do today?', i:'fa-calendar-day' },
  { q:'Ask me a Part 2 speaking question.', i:'fa-microphone' },
  { q:'I want to book a session with a teacher.', i:'fa-chalkboard-user' },
];

function sec_tutor(){
  if (!B.tutorChat.length) seedTutor();
  return `
    ${phead({ eyebrow:'Bloom Tutor', title:`Ask me <em>anything</em>`,
      sub:`I know your profile — ${B.placement?B.placement.cefr:'unassessed'}, target Band ${bandLabel(B.profile.target)}, first language ${esc(B.profile.l1)} — and I remember the mistakes you have made in Bloom.`,
      actions:`<button class="btn btn-g btn-sm" onclick="tutorClear()"><i class="fa-solid fa-broom"></i> New conversation</button>` })}

    <div class="split">
      <div class="card" style="display:flex;flex-direction:column;height:calc(100vh - 250px);min-height:520px">
        <div class="card-hd" style="flex:0 0 auto">
          <div style="width:34px;height:34px;border-radius:11px;background:var(--violet);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
          <div style="flex:1"><h3>Bloom Tutor</h3><p>${ts.typing?'<span style="color:var(--violet)">typing…</span>':'Online · knows your profile and your error history'}</p></div>        </div>
        <div id="tChat" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px">
          ${B.tutorChat.map(m => tMsgHTML(m)).join('')}
          ${ts.typing?`<div style="display:flex;gap:11px"><div style="width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:var(--violet);color:#fff;display:grid;place-items:center;font-size:12px"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
            <div style="background:var(--violet-soft);border-radius:14px 14px 14px 4px;padding:14px 16px"><span class="pulse" style="font-size:13px;color:var(--violet)">● ● ●</span></div></div>`:''}
        </div>
        <div style="flex:0 0 auto;padding:14px 18px;border-top:1px solid var(--line)">
          <div style="display:flex;gap:9px;align-items:flex-end">
            <textarea id="tInput" rows="1" placeholder="Ask about grammar, vocabulary, strategy, or your own mistakes…" style="flex:1;border:1.5px solid var(--line-2);border-radius:14px;padding:11px 14px;font-family:inherit;font-size:13.5px;resize:none;max-height:120px;background:var(--surface);color:var(--ink)"
              oninput="this.style.height='auto';this.style.height=Math.min(120,this.scrollHeight)+'px'"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();tutorSend()}"></textarea>
            <button class="btn btn-v" style="padding:11px 15px" onclick="tutorSend()"><i class="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Try asking</h3></div></div>
          <div class="card-bd" style="display:grid;gap:7px">
            ${TUTOR_STARTERS.map(s=>`<button class="btn btn-g btn-sm" style="justify-content:flex-start;text-align:left;white-space:normal;line-height:1.4" onclick="tutorAsk(${JSON.stringify(s.q).replace(/"/g,'&quot;')})"><i class="fa-solid ${s.i}" style="color:var(--violet);flex:0 0 14px"></i> ${s.q}</button>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>What I know about you</h3></div></div>
          <div class="card-bd" style="display:grid;gap:10px;font-size:12.5px">
            ${[
              ['Level', B.placement?`${B.placement.cefr} · Band ${bandLabel(est())}`:'Not assessed yet'],
              ['Target', `Band ${bandLabel(B.profile.target)} for ${PURPOSES.find(p=>p.id===B.profile.purpose).name.toLowerCase()}`],
              ['Weakest skill', weakestSkill()?skillMeta(weakestSkill()).name:'—'],
              ['First language', B.profile.l1],
              ['Recurring errors', (typeof errorBank==='function'&&errorBank().length)?errorBank().slice(0,2).map(e=>e.type).join(', '):'none logged yet'],
              ['Words mastered', (typeof vocabMastered==='function'?vocabMastered().length:0) + ' of ' + VOCAB.length],
            ].map(([l,v])=>`<div style="display:flex;justify-content:space-between;gap:12px;padding-bottom:9px;border-bottom:1px dashed var(--line)">
              <span style="color:var(--ink-4)">${l}</span><b style="text-align:right;color:var(--ink-2)">${esc(v)}</b></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function tMsgHTML(m){
  if (m.role === 'user') return `<div style="display:flex;gap:11px;justify-content:flex-end">
    <div style="background:var(--leaf-700);color:#fff;border-radius:14px 14px 4px 14px;padding:12px 15px;font-size:13.5px;line-height:1.55;max-width:78%">${esc(m.text)}</div>
    <div style="width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:linear-gradient(140deg,var(--leaf-600),var(--leaf-400));color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${initials(B.profile.name)}</div></div>`;
  return `<div style="display:flex;gap:11px">
    <div style="width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:var(--violet);color:#fff;display:grid;place-items:center;font-size:12px"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
    <div style="background:var(--violet-soft);border-radius:14px 14px 14px 4px;padding:14px 16px;font-size:13.5px;line-height:1.65;max-width:82%;color:var(--ink)">
      ${m.html || esc(m.text)}
      ${m.actions?.length?`<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:13px">${m.actions.map(a=>`<button class="btn btn-g btn-sm" onclick="${a.go}">${a.ic?`<i class="fa-solid ${a.ic}"></i> `:''}${a.label}</button>`).join('')}</div>`:''}
    </div></div>`;
}

function tutorScroll(){ const el = document.getElementById('tChat'); if (el) el.scrollTop = el.scrollHeight; }

function seedTutor(){
  const w = weakestSkill();
  const greetings = B.placement
    ? `Hello ${esc(B.profile.name.split(' ')[0])}. I have read your placement result: <b>${B.placement.cefr}</b>, estimated Band ${bandLabel(est())}, aiming for ${bandLabel(B.profile.target)}.<br><br>${w?`Your ${skillMeta(w).name.toLowerCase()} is the section holding your overall score down, so that is where I would start.`:''} As a ${esc(B.profile.l1)} speaker, the error I would watch first is <b>${l1Traps(B.profile.l1)[0].split('—')[0].split('(')[0].trim().toLowerCase()}</b>.<br><br>Ask me anything — grammar, vocabulary, exam strategy, or your own mistakes.`
    : `Hello. I am your Bloom tutor.<br><br>I can explain any point of English grammar, build vocabulary sets for a topic, or walk you through exam strategy. I will be far more useful once you have taken the placement test, because then I can see exactly where you stand.`;
  B.tutorChat = [{ role:'bot', html:greetings, actions: B.placement ? [] : [{ label:'Take the placement test', ic:'fa-clipboard-question', go:"navTo('placement')" }] }];
  save();
}
function tutorClear(){ B.tutorChat = []; save(); seedTutor(); navTo('tutor'); }
function tutorAsk(q){ tutorPush(q); }
function tutorSend(){
  const el = document.getElementById('tInput');
  const v = el.value.trim(); if (!v) return;
  el.value = ''; el.style.height = 'auto';
  tutorPush(v);
}
function tutorPush(text){
  B.tutorChat.push({ role:'user', text });
  ts.typing = true; save(); navTo('tutor'); tutorScroll();
  const reply = tutorReply(text);
  setTimeout(() => {
    ts.typing = false;
    B.tutorChat.push({ role:'bot', ...reply });
    B.tutorChat = B.tutorChat.slice(-40);
    save(); navTo('tutor'); tutorScroll();
    addXP(5);
  }, 620 + Math.min(1400, reply.html.length * 1.5));
}
function tutorFromEssay(id){
  const e = B.essays.find(x => x.id === id);
  navTo('tutor');
  setTimeout(() => tutorPush(`Drill the errors from my last essay: ${e ? e.issues.map(i=>i.type).slice(0,3).join(', ') : 'my recent writing'}.`), 200);
}

/* ── the brain: intent matching over Bloom's own content ── */
function tutorReply(qRaw){
  const q = qRaw.toLowerCase();
  const has = (...ws) => ws.some(w => q.includes(w));

  /* 1. Point them at their own data */
  if (has('weakest','weak area','what should i focus','where am i losing','my level','how am i doing')){
    const w = weakestSkill(), e = est();
    if (!e) return { html:`I cannot answer that honestly yet — you have not taken the placement test, so anything I said would be a guess.<br><br>It takes twenty-five minutes and gives me a CEFR level plus a band for each skill. After that I can be specific.`, actions:[{label:'Take the placement test',ic:'fa-clipboard-question',go:"navTo('placement')"}] };
    const rows = ['listening','reading','writing','speaking'].map(k => `<div style="display:flex;justify-content:space-between;padding:3px 0"><span>${skillMeta(k).name}</span><b>${B.scores[k]!=null?bandLabel(B.scores[k]):'—'}</b></div>`).join('');
    const bank = typeof errorBank === 'function' ? errorBank() : [];
    return { html:`Here is where you stand right now:<br><br><div style="background:var(--surface);border-radius:11px;padding:12px 14px;font-family:var(--mono);font-size:12.5px">${rows}<div style="display:flex;justify-content:space-between;padding-top:7px;margin-top:5px;border-top:1px solid var(--line)"><span><b>Overall</b></span><b>${bandLabel(e)}</b></div></div><br>
      <b>${skillMeta(w).name} is your weakest skill.</b> ${weakAdvice(w)}<br><br>
      ${bank.length?`In your writing I have logged <b>${bank[0].type}</b> ${bank[0].n} times — that single pattern is probably worth half a band on Grammatical Range and Accuracy.`:'You have not written enough for me to spot error patterns yet. Submit a Task 2 and I will.'}`,
      actions:[{label:`Work on ${skillMeta(w).name}`,ic:skillMeta(w).ic,go:`navTo('${w}')`},{label:'See my full progress',ic:'fa-chart-line',go:"navTo('progress')"}] };
  }

  if (has('what should i do today','today','plan for today','next session')){
    const t = typeof planToday === 'function' ? planToday() : [];
    if (!t.length) return { html:`You do not have a study plan yet. Let me build one from your placement result — it takes a second and it decides what you do each day so you never have to.`, actions:[{label:'Build my plan',ic:'fa-calendar-days',go:"buildPlan();navTo('plan')"}] };
    const undone = t.filter(x => !B.planDone[x.key]);
    return { html:`Today's plan has ${t.length} blocks, ${undone.length} still to do:<br><br>${t.map(x=>`<div style="display:flex;gap:9px;padding:3px 0"><i class="fa-solid ${B.planDone[x.key]?'fa-circle-check':'fa-circle'}" style="color:${B.planDone[x.key]?'var(--ok)':'var(--line-2)'};font-size:11px;margin-top:4px"></i><span>${x.name} — ${x.mins} min</span></div>`).join('')}<br>
      ${undone.length?`Start with <b>${undone[0].name}</b>. It is ${undone[0].mins} minutes.`:'Everything is done. Take the evening off — rest is part of the plan.'}`,
      actions: undone.length?[{label:`Start ${undone[0].name}`,ic:'fa-play',go:`navTo('${undone[0].go}')`}]:[] };
  }

  /* 2. Grammar lessons */
  const lesson = GRAMMAR.find(l => q.includes(l.id) || l.name.toLowerCase().split(/[:&,]/).some(part => part.trim().length > 4 && q.includes(part.trim().toLowerCase())))
    || (has('article','a an the','a/an') ? gLesson('articles')
      : has('present perfect','past simple','tense') ? gLesson('tenses')
      : has('conditional','if clause','second conditional','third conditional') ? gLesson('conditionals')
      : has('passive') ? gLesson('passive')
      : has('relative clause','which','who that') ? gLesson('relative')
      : has('subject verb','agreement','plural verb') ? gLesson('sva')
      : has('modal','hedge','hedging') ? gLesson('modals')
      : has('complex sentence','compound','sentence structure') ? gLesson('complex')
      : has('reported speech','indirect speech') ? gLesson('reported')
      : has('nominalis','nominaliz','academic style','formal writing') ? gLesson('nominal')
      : has('punctuation','comma','apostrophe','semicolon') ? gLesson('punctuation')
      : has('cohesion','linking word','linkers','coherence') ? gLesson('cohesion') : null);

  if (lesson){
    const ex = lesson.examples[0];
    return { html:`<b>${lesson.name}</b> (${lesson.lv})<br><br>${lesson.concept}<br><br>
      <div style="background:var(--surface);border-radius:11px;padding:12px 14px;margin:4px 0">${lesson.rules.slice(0,3).map((r,i)=>`<div style="display:flex;gap:9px;padding:4px 0"><b style="color:var(--violet);font-family:var(--mono);font-size:11px">${i+1}</b><span>${r}</span></div>`).join('')}</div><br>
      Here is the mistake I see most often:<br><br>
      <div style="background:var(--err-soft);border-radius:9px;padding:9px 12px;margin-bottom:6px"><s style="color:var(--err)">${ex.bad}</s></div>
      <div style="background:var(--ok-soft);border-radius:9px;padding:9px 12px"><b style="color:var(--ok)">${ex.good}</b></div>
      <div style="font-size:12.5px;color:var(--ink-3);margin-top:8px">${ex.why}</div><br>
      Want to test it? The full lesson has ${lesson.quiz.length} questions with explanations.`,
      actions:[{label:'Open the full lesson',ic:'fa-diagram-project',go:`gOpen('${lesson.id}')`},{label:'Just the test',ic:'fa-list-check',go:`gOpen('${lesson.id}');gs.step='practice';navTo('grammar')`}] };
  }

  /* 3. Vocabulary by topic */
  const topic = VOCAB_TOPICS.find(t => q.includes(t.id) || q.includes(t.name.toLowerCase().split(' ')[0]));
  if (topic || has('vocabulary','words for','synonym','collocation')){
    const t = topic || VOCAB_TOPICS[0];
    const ws = VOCAB.filter(v => v.t === t.id).slice(0, 8);
    return { html:`Here are ${ws.length} high-value words for <b>${t.name}</b>. These are the ones that actually move Lexical Resource, because they carry a precise meaning a Band 6 candidate would express in four words.<br><br>
      ${ws.map(v=>`<div style="padding:8px 0;border-bottom:1px dashed var(--line)">
        <b>${v.w}</b> <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${v.p} · ${v.pos}</span><br>
        <span style="font-size:12.5px;color:var(--ink-2)">${v.d}</span><br>
        <span style="font-size:12px;color:var(--ink-4);font-style:italic">${v.e}</span>
        ${v.col?.length?`<br><span style="font-size:11.5px;color:var(--leaf-700)">Collocations: ${v.col.slice(0,2).join(' · ')}</span>`:''}</div>`).join('')}
      <br>Do not just read them. Put each one into a sentence about your own life — that is what makes them stick.`,
      actions:[{label:`Study the ${t.name} deck`,ic:'fa-spell-check',go:`vStart('topic','${t.id}')`}] };
  }

  /* 4. Band improvement strategy */
  if (has('band 7','band 8','band 6','improve my writing','raise my score','get to band','how do i improve')){
    const target = q.match(/band\s*(\d(?:\.\d)?)/) ? parseFloat(q.match(/band\s*(\d(?:\.\d)?)/)[1]) : B.profile.target;
    const skill = has('speaking')?'speaking':has('reading')?'reading':has('listening')?'listening':'writing';
    const advice = {
      writing:[
        ['Task Response','Answer every part of the question explicitly in the introduction, then prove it. Most Band 6 essays answer a related question rather than the one asked.'],
        ['Coherence','One idea per paragraph, stated in the first sentence. Then stop starting every sentence with a linking word — that is what "mechanical" means in the Band 6 descriptor.'],
        ['Lexical Resource','Band 7 needs less common vocabulary used <i>accurately</i>. Two precise words beat six impressive ones used wrongly.'],
        ['Grammar','Band 7 asks for "frequent error-free sentences". Write shorter sentences that are correct rather than long ones that collapse.'],
      ],
      speaking:[
        ['Fluency','Length is the fastest win. Every answer needs a reason and an example — never stop after one sentence.'],
        ['Hesitation','Replace "um" with a silent pause. Examiners penalise audible hesitation, not thinking time.'],
        ['Vocabulary','Prepare eight topic areas, not scripts. Idiomatic language is explicitly required for Band 7.'],
        ['Grammar','Deliberately use one second conditional and one present perfect in every long answer.'],
      ],
      reading:[
        ['Speed','You need about 200 words per minute. Skim each paragraph for its single main idea before reading any question.'],
        ['Question order','Answers appear in order for most task types. If you cannot find one, move on and come back.'],
        ['True/False/Not Given','"Not Given" means the passage does not say — not that it seems unlikely. This is where most marks are lost.'],
        ['Transfer','Copy answers exactly as spelled in the passage. No paraphrasing on the answer sheet.'],
      ],
      listening:[
        ['Prediction','Read the questions in the gap and predict the word type: number, name, noun, plural.'],
        ['Distractors','Speakers correct themselves. The answer is almost always the second thing they say.'],
        ['Spelling','A correct answer spelled wrong scores zero. Practise the alphabet and common names.'],
        ['Section 4','No break in the middle and no dialogue. Practise this section most — it carries the hardest marks.'],
      ],
    }[skill];
    return { html:`Getting ${skill} to <b>Band ${bandLabel(target)}</b> is four specific things, not general effort:<br><br>
      ${advice.map((a,i)=>`<div style="padding:9px 0;border-bottom:1px dashed var(--line)"><b style="color:var(--violet)">${i+1}. ${a[0]}</b><br><span style="font-size:12.5px">${a[1]}</span></div>`).join('')}
      <br>${B.scores[skill]!=null?`You are at Band ${bandLabel(B.scores[skill])} in ${skill} now, so the gap is ${bandLabel(Math.max(0,target-B.scores[skill]))}.`:''} The honest answer on timing: half a band takes roughly a hundred focused hours for most students.`,
      actions:[{label:`Practise ${skill} now`,ic:skillMeta(skill).ic,go:`navTo('${skill}')`}] };
  }

  /* 5. Essay structure */
  if (has('structure','how to write','task 2','task 1','essay format','introduction','conclusion')){
    const t1 = has('task 1','graph','chart','process','letter');
    return t1 ? { html:`<b>Task 1 structure — four paragraphs, 20 minutes, 150+ words</b><br><br>
      <b>1. Introduction (1 sentence).</b> Paraphrase the question. Change the verb and the nouns, keep the data.<br>
      <b>2. Overview (2 sentences).</b> The two biggest patterns, with no numbers. This paragraph alone decides whether you can score above Band 6 — an answer without an overview is capped.<br>
      <b>3–4. Detail (2 paragraphs).</b> Group logically: highest with highest, rising with rising. Use numbers here, not in the overview.<br><br>
      Never give an opinion, never explain why the trend happened, never write a conclusion.`,
      actions:[{label:'Write a Task 1 now',ic:'fa-chart-line',go:"ws.task=1;navTo('writing')"}] }
    : { html:`<b>Task 2 structure — four paragraphs, 40 minutes, 250+ words</b><br><br>
      <b>Introduction (2 sentences).</b> Paraphrase the question, then state your position clearly. Do not save your opinion for the conclusion.<br>
      <b>Body 1 (5–6 sentences).</b> Topic sentence with one idea → explain it → give a specific example → link back to the question.<br>
      <b>Body 2 (5–6 sentences).</b> Same shape, different idea. Two developed ideas beat four listed ones.<br>
      <b>Conclusion (2 sentences).</b> Restate your position in new words. Add nothing new.<br><br>
      The single most common Band 6 problem: writing about the topic instead of answering the question. Underline the question words before you start.`,
      actions:[{label:'Write a Task 2 now',ic:'fa-pen-nib',go:"ws.task=2;navTo('writing')"},{label:'See a model answer',ic:'fa-file-lines',go:"ws.task=1;navTo('writing')"}] };
  }

  /* 6. Speaking practice partner */
  if (has('ask me','speaking question','cue card','practice speaking','part 2','part 1','part 3')){
    const c = SPEAKING_P2[Math.floor(Math.random()*SPEAKING_P2.length)];
    return { html:`Right — here is your cue card. You get one minute to prepare and two minutes to speak.<br><br>
      <div style="background:var(--surface);border-radius:12px;padding:14px 16px;border-left:3px solid var(--coral)">
        <b style="font-size:14.5px">${c.card}</b><br><span style="font-size:12.5px;color:var(--ink-3)">You should say:</span>
        ${c.bullets.map(b=>`<div style="font-size:12.5px;color:var(--ink-2);padding-left:8px">· ${b}</div>`).join('')}</div><br>
      <b>Before you start:</b> ${c.tip}<br><br>
      Words that would lift this answer: ${c.vocab.map(v=>`<span class="tag leaf" style="margin:2px 2px 0 0">${v}</span>`).join('')}`,
      actions:[{label:'Record my answer',ic:'fa-microphone',go:`spStart(2,'${c.id}')`}] };
  }

  /* 7. Error drilling */
  if (has('my mistake','my error','drill','my last essay','correct me')){
    const bank = typeof errorBank === 'function' ? errorBank() : [];
    if (!bank.length) return { html:`I have not logged any recurring errors yet, because you have not submitted enough writing for me to see a pattern.<br><br>Write one Task 2 and I will have something concrete to work on. Patterns are much more useful than one-off slips.`, actions:[{label:'Write a Task 2',ic:'fa-pen-nib',go:"ws.task=2;navTo('writing')"}] };
    const top = bank[0];
    return { html:`Your most frequent error is <b>${top.type}</b> — I have seen it ${top.n} times.<br><br>
      ${top.examples.slice(0,2).map(x=>`<div style="margin-bottom:10px"><div style="background:var(--err-soft);border-radius:9px;padding:8px 11px;margin-bottom:4px"><s style="color:var(--err);font-size:12.5px">${esc(x.bad)}</s></div>
        <div style="background:var(--ok-soft);border-radius:9px;padding:8px 11px"><b style="color:var(--ok);font-size:12.5px">${esc(x.fix)}</b></div>
        <div style="font-size:12px;color:var(--ink-4);margin-top:4px">${x.why||''}</div></div>`).join('')}
      The rest of your error bank: ${bank.slice(1,5).map(b=>`<span class="tag cor" style="margin:2px 2px 0 0">${b.type} ×${b.n}</span>`).join('')}`,
      actions:[{label:'Open my error bank',ic:'fa-triangle-exclamation',go:"ws.view='errors';navTo('writing')"},{label:'Grammar lesson on this',ic:'fa-diagram-project',go:"navTo('grammar')"}] };
  }

  /* 8. Exam logistics */
  if (has('how long','how many question','exam format','test day','what is ielts','difference between')){
    const ex = examOf(B.profile.exam);
    return { html:`<b>${ex.name}</b> — ${ex.blurb}<br><br>
      ${ex.sections.map(s=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed var(--line)"><span>${s}</span><span style="font-family:var(--mono);font-size:12px;color:var(--ink-4)">${s==='Listening'?'30 min · 40 Q':s.includes('Reading')?'60 min · 40 Q':s.includes('Writing')?'60 min · 2 tasks':'11–14 min'}</span></div>`).join('')}
      <br>Total: about ${ex.mins} minutes. ${ex.id.startsWith('ielts')?'Speaking may be on a different day from the other three sections.':''}<br><br>
      Your target of Band ${bandLabel(B.profile.target)} converts to ${EXAMS.filter(x=>x.id!=='general'&&x.id!==ex.id).slice(0,3).map(x=>`${x.short} ${scoreInExam(B.profile.target,x.id).split(' /')[0]}`).join(', ')}.`,
      actions:[{label:'Take a full mock',ic:'fa-clipboard-list',go:"navTo('mocks')"}] };
  }

  /* 9. Motivation / timeline */
  if (has('how long will it take','how many weeks','enough time','worried','stressed','nervous','give up')){
    const e = est(), wks = e!=null?estimateWeeks(e,B.profile.target,B.profile.hoursPerDay):null;
    return { html:`${e!=null?`You are at Band ${bandLabel(e)} and aiming for ${bandLabel(B.profile.target)}. At ${B.profile.hoursPerDay} hours a day, that is roughly <b>${wks} weeks</b> of consistent work.`:'Take the placement test and I can give you a real number rather than encouragement.'}<br><br>
      Two things are true at once: half a band genuinely takes about a hundred focused hours, and almost everyone who does that work gets there. The students who fail are not the weak ones — they are the ones who practise without ever checking what they got wrong.<br><br>
      ${B.streak?`You are on a ${B.streak}-day streak. That is the single best predictor I have.`:'Start with a streak. Twenty focused minutes a day beats four hours on Sunday.'}`,
      actions:[{label:'See my plan',ic:'fa-calendar-days',go:"navTo('plan')"}] };
  }

  /* 11. Book a human teacher */
  if (has('book','tutor session','teacher','one to one','1 on 1','one-on-one','human','speak to someone','lesson with')){
    const w = weakestSkill();
    const match = TEACHERS.filter(t => !w || t.skills.includes(w)).slice(0,3);
    return { html:`Some things are faster with a person than with me.<br><br>${w?`For <b>${skillMeta(w).name.toLowerCase()}</b>, these teachers specialise in exactly that:`:'These are the teachers taking sessions this week:'}<br><br>
      ${match.map(t=>`<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--line)">
        <span style="width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:var(--leaf-600);color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800">${t.init}</span>
        <span style="flex:1"><b>${t.name}</b><br><span style="font-size:11.5px;color:var(--ink-4)">${t.focus}</span></span></div>`).join('')}
      <br>Sessions are 45 minutes, video or text chat, and there are usually same-day slots.`,
      actions:[{label:'Open 1-on-1 tutoring',ic:'fa-chalkboard-user',go:"navTo('tutoring')"}] };
  }

  /* 12. Fallback — still useful, never vague */
  const w = weakestSkill();
  return { html:`I can help with that, but let me be specific rather than general.<br><br>I am strongest on: <b>grammar explanations</b> (any of the twelve lessons in the Academy), <b>vocabulary by topic</b>, <b>exam strategy</b> for each of the four skills, and <b>your own mistakes</b> — I keep a record of every error pattern in your writing.<br><br>
    Try asking me something like “explain the second conditional”, “give me vocabulary for a technology essay”, or “what am I getting wrong in my writing”.${w?`<br><br>If you want my honest recommendation right now: work on ${skillMeta(w).name.toLowerCase()}.`:''}`,
    actions:[{label:'What are my weak areas?',ic:'fa-bullseye',go:"tutorAsk('What are my weakest areas right now?')"},{label:'Book a human teacher',ic:'fa-chalkboard-user',go:"navTo('tutoring')"}] };
}
