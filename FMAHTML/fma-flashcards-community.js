/* ═══════════════════════════════════════════════════════════════
   FLASHCARDS · STUDENT-MADE DECKS
   Students author their own cards (credited by name), share them to
   the community shelf, and adopt classmates' cards into their rotation.
   Depends on: fma-flashcards.js, fma-flashcards-browse.js
═══════════════════════════════════════════════════════════════ */

/* ── identity ── */
function fcMe(){
  const s = (typeof getCurrentStudent === 'function' && state.user.roleKey === 'student') ? getCurrentStudent() : null;
  return {
    id: s ? s.id : (state.user.name || 'me').replace(/\s+/g,'').toLowerCase(),
    name: s ? s.name : (state.user.name || 'You'),
    init: typeof initials === 'function' ? initials(s ? s.name : (state.user.name || 'You')) : 'ME',
    cohort: s ? (s.cohort || s.course || 'IMAT 2026') : 'Faculty',
  };
}
function fcInit(name){ return name.split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase(); }

/* ── storage ── */
function fcMine(){ return fcLS('fma_fc_mine', []); }
function fcSaveMine(a){ fcSet('fma_fc_mine', a); }
function fcAdopted(){ return fcLS('fma_fc_adopted', []); }
function fcSaveAdopted(a){ fcSet('fma_fc_adopted', a); }
function fcPeerStore(){ return fcLS('fma_fc_peers', null); }

/* Seeded classmate decks — real content so the shelf is never empty */
const FC_PEER_SEED = [
  { by:'Aisha Khan', s:'Biology', t:'genetics', ty:'trap', d:'medium', g:['COMMON TRAP','HIGH YIELD'], likes:14,
    f:'My own trap: is a carrier of an autosomal recessive disease affected?', a:'No — carriers are heterozygous (Aa) and phenotypically normal.',
    e:'Only homozygous recessive (aa) individuals show the disease. Two carriers have a 1 in 4 chance of an affected child.',
    m:'I kept reading "carrier" as "mildly affected" in pedigree questions.', ip:'In a pedigree, unaffected parents with an affected child means autosomal recessive.', r:'Pedigree analysis' },
  { by:'Aisha Khan', s:'Biology', t:'cardio', ty:'sequence', d:'easy', g:['MUST KNOW'], likes:21,
    f:'Order the conduction pathway of the heart.', a:'SA node → AV node → bundle of His → left and right bundle branches → Purkinje fibres',
    e:'The AV node delays the signal ~0.1 s so the atria finish emptying before the ventricles contract.',
    ip:'The delay at the AV node is why the PR interval exists on an ECG.', r:'Cardiac cycle' },
  { by:'Marco Ferretti', s:'Physics', t:'electricity', ty:'problem', d:'medium', g:['IMAT','FORMULA'], likes:18,
    f:'Three 6 Ω resistors in parallel — what is the equivalent resistance?', a:'2 Ω',
    e:'For n identical resistors in parallel, R = R₁/n = 6/3 = 2 Ω.', fo:'R_p = \\frac{R}{n}',
    m:'I used to do the full reciprocal sum every time and lose 30 seconds.', ip:'Identical resistors in parallel: just divide by how many there are.', r:'Circuits' },
  { by:'Marco Ferretti', s:'Physics', t:'kinematics', ty:'tf', d:'medium', g:['COMMON TRAP'], likes:9,
    f:'True or false: an object with zero velocity must have zero acceleration.', a:'False — a ball at the top of its flight has v = 0 but a = g.',
    e:'Velocity and acceleration are independent at any instant; acceleration is the rate of change of velocity, not its size.',
    ip:'This one-liner shows up in disguised form almost every year.', r:'Projectile motion' },
  { by:'Sofia Rossi', s:'Chemistry', t:'organic', ty:'compare', d:'hard', g:['HIGH YIELD'], likes:26,
    f:'How do I tell an aldehyde from a ketone in one test?', a:'Aldehydes reduce Tollens\' reagent (silver mirror) and Fehling\'s solution (brick-red precipitate); ketones do not.',
    e:'The aldehyde carbonyl carries an H that can be oxidised to a carboxylic acid. Ketones have no such hydrogen.',
    m:'I mixed up which one gives the silver mirror — it is the aldehyde, always.', ip:'Aldehyde = oxidisable = positive test. Ketone = no reaction.', r:'Carbonyl chemistry' },
  { by:'Sofia Rossi', s:'Chemistry', t:'equilibrium', ty:'def', d:'medium', g:['MUST KNOW','FORMULA'], likes:12,
    f:'Write Kc for: N₂ + 3H₂ ⇌ 2NH₃', a:'$K_c = \\dfrac{[\\mathrm{NH_3}]^2}{[\\mathrm{N_2}][\\mathrm{H_2}]^3}$',
    e:'Products over reactants, each raised to its stoichiometric coefficient. Solids and pure liquids are omitted.',
    fo:'K_c = \\frac{[\\mathrm{NH_3}]^2}{[\\mathrm{N_2}][\\mathrm{H_2}]^3}',
    ip:'If you reverse the reaction, K becomes 1/K. If you double the coefficients, K is squared.', r:'Le Chatelier' },
  { by:'Yusuf Demir', s:'Mathematics', t:'percentages', ty:'problem', d:'medium', g:['IMAT','COMMON TRAP'], likes:31,
    f:'A test has 60 questions. I answered 48 correctly. What percentage did I lose?', a:'20%',
    e:'12 wrong out of 60 = 12/60 = 0.2 = 20%. Answering 80% correctly means losing 20%.',
    m:'I used to compute 48/60 and then forget the question asked for the loss.', ip:'Underline what the question actually asks before you calculate anything.', r:'Percentage change' },
  { by:'Yusuf Demir', s:'Mathematics', t:'probability', ty:'problem', d:'hard', g:['IMAT'], likes:16,
    f:'A bag has 3 red and 5 blue balls. Two are drawn without replacement. P(both red)?', a:'3/28',
    e:'$\\frac{3}{8} \\times \\frac{2}{7} = \\frac{6}{56} = \\frac{3}{28}$. The denominator shrinks because the first ball is not replaced.',
    m:'Using 3/8 × 3/8 — that is with replacement.', ip:'"Without replacement" always means the second fraction has smaller top and bottom.', r:'Conditional probability' },
  { by:'Nadia Haddad', s:'Biology', t:'nervous', ty:'process', d:'hard', g:['HIGH YIELD','MUST KNOW'], likes:24,
    f:'Walk through one action potential in five steps.', a:'Resting −70 mV → threshold −55 mV → Na⁺ channels open (depolarisation to +40 mV) → K⁺ channels open, Na⁺ close (repolarisation) → hyperpolarisation, then Na⁺/K⁺ pump restores rest.',
    e:'All-or-nothing: below threshold nothing fires; above it, the amplitude is always the same. Strength is coded by frequency, not size.',
    m:'I thought a stronger stimulus gives a bigger action potential — it gives more of them.', ip:'The absolute refractory period is why impulses cannot travel backwards.', r:'Synaptic transmission' },
  { by:'Nadia Haddad', s:'Biology', t:'metabolism', ty:'cloze', d:'medium', g:['MUST KNOW'], likes:11,
    f:'Fill the blanks: glycolysis happens in the ______, the Krebs cycle in the ______, and the electron transport chain on the ______.',
    a:'Cytoplasm · mitochondrial matrix · inner mitochondrial membrane',
    e:'Location questions are free marks — they need no reasoning, only recall.',
    ip:'I made this card after losing two marks on exactly this in a mock.', r:'Cellular respiration' },
  { by:'Liam O\'Brien', s:'Physics', t:'optics', ty:'formula', d:'medium', g:['FORMULA','IMAT'], likes:8,
    f:'Object 30 cm from a converging lens with f = 10 cm. Where is the image?', a:'15 cm on the other side, real and inverted',
    e:'$1/f = 1/v + 1/u \\Rightarrow 1/10 = 1/v + 1/30 \\Rightarrow v = 15$ cm.', fo:'\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}',
    ip:'Object beyond 2f always gives a diminished real image — check your answer against that.', r:'Lenses' },
  { by:'Liam O\'Brien', s:'Chemistry', t:'stoich', ty:'problem', d:'easy', g:['IMAT','FORMULA'], likes:13,
    f:'How many molecules are in 0.25 mol of CO₂?', a:'1.5 × 10²³',
    e:'$0.25 \\times 6.02\\times10^{23} = 1.505\\times10^{23}$ molecules.', fo:'N = n N_A',
    m:'Do not multiply by 3 for the atoms unless the question asks for atoms.', ip:'Read whether it asks for molecules, atoms or moles — three different answers.', r:'Avogadro constant' },
];

function fcPeers(){
  let p = fcPeerStore();
  if (!p){
    p = FC_PEER_SEED.map((c,i) => ({
      ...c, id:'pc' + i, byId:c.by.replace(/\W+/g,'').toLowerCase(), byInit:fcInit(c.by),
      at:fcAddDays(-(3 + i * 2)), shared:true, student:true,
    }));
    fcSet('fma_fc_peers', p);
  }
  return p;
}
function fcSavePeers(p){ fcSet('fma_fc_peers', p); }

/* ── deck contributions (called from fcDeck) ── */
function fcStudentCards(){
  const adopted = fcAdopted();
  return [...fcMine(), ...fcPeers().filter(c => c.shared && adopted.includes(c.id))];
}
/* Everything visible on the community shelf: peers + my shared cards */
function fcCommunity(){
  const me = fcMe();
  return [...fcPeers().filter(c => c.shared), ...fcMine().filter(c => c.shared).map(c => ({ ...c, mine:true }))]
    .sort((a,b) => (b.at || '').localeCompare(a.at || ''));
}
function fcAuthors(){
  const map = {};
  fcCommunity().forEach(c => {
    const k = c.byId;
    map[k] = map[k] || { id:k, name:c.by, init:c.byInit || fcInit(c.by), n:0, likes:0, mine:!!c.mine, subj:new Set() };
    map[k].n++; map[k].likes += (c.likes || 0); map[k].subj.add(c.s);
  });
  return Object.values(map).sort((a,b) => (b.likes - a.likes) || (b.n - a.n));
}

/* ── actions ── */
function fcAdopt(id){
  const a = fcAdopted(), i = a.indexOf(id);
  const peers = fcPeers(), card = peers.find(c => c.id === id);
  if (i >= 0){ a.splice(i,1); if (card) card.likes = Math.max(0, (card.likes||0) - 1); }
  else { a.push(id); if (card) card.likes = (card.likes||0) + 1; }
  fcSaveAdopted(a); fcSavePeers(peers);
  navTo('flashcards');
  showToast(i >= 0 ? 'Removed from your deck' : 'Added to your deck — it will appear in your reviews');
}
function fcShareToggle(id){
  const mine = fcMine(), c = mine.find(x => x.id === id); if (!c) return;
  c.shared = !c.shared; fcSaveMine(mine); navTo('flashcards');
  showToast(c.shared ? 'Shared to the class shelf under your name' : 'Card is private again');
}
function fcDeleteMine(id){
  if (!confirm('Delete your card? Anyone who saved it keeps their copy.')) return;
  fcSaveMine(fcMine().filter(c => c.id !== id)); navTo('flashcards'); showToast('Card deleted');
}

/* ═══ MY CARDS ═══ */
function fcMineHTML(){
  const me = fcMe(), mine = fcMine();
  const shared = mine.filter(c => c.shared);
  const saves = shared.reduce((s,c) => s + (c.likes || 0), 0);
  const rank = fcAuthors().findIndex(a => a.id === me.id) + 1;
  return `
    ${pageHead({
      eyebrow:'Flashcards · My cards',
      title:`Cards I <em>made</em>`,
      sub:'Write a card the way you actually remember it. Share it and your name travels with it.',
      actions:`<button class="btn btn-ghost btn-sm" onclick="fcState.view='community'; navTo('flashcards')"><i class="fa-solid fa-users"></i> Class shelf</button>
        <button class="btn btn-primary btn-sm" onclick="fcMyEdit()"><i class="fa-solid fa-plus"></i> New card</button>`
    })}
    <div class="st-stats">
      <div class="st-stat"><div class="lbl">Cards written</div><div class="val">${mine.length}</div><div class="sub">${shared.length} shared with the class</div></div>
      <div class="st-stat"><div class="lbl">Saved by classmates</div><div class="val teal">${saves}</div><div class="sub">${saves ? 'Your cards are in other decks' : 'Share a card to start'}</div></div>
      <div class="st-stat"><div class="lbl">Contributor rank</div><div class="val">${rank ? '#' + rank : '—'}</div><div class="sub">${rank ? 'On the class shelf' : 'Not on the shelf yet'}</div></div>
      <div class="st-stat"><div class="lbl">Saved from others</div><div class="val ok">${fcAdopted().length}</div><div class="sub">In your review rotation</div></div>
    </div>
    ${mine.length ? `
      <div class="card">
        <div class="card-hd"><div><div class="card-title">My flashcards</div><div class="card-sub">Only you can edit these — sharing shows them to the class read-only</div></div>
        ${mine.length ? `<button class="btn btn-ghost btn-sm" onclick="fcStudyMine()"><i class="fa-solid fa-play"></i> Study my cards</button>` : ''}</div>
        <div class="card-body" style="padding:0;">
          ${mine.map(c => `<div style="display:flex; gap:13px; align-items:center; padding:13px 22px; border-bottom:1px solid var(--rule);">
            <div class="st ${fcStatus(c.id)}" style="width:8px; height:8px; border-radius:50%; flex:0 0 8px; background:${fcIsMastered(c.id)?'var(--ok)':fcIsDue(c.id)?'var(--gold)':'var(--rule-2)'};"></div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:13px; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.f.replace(/\$/g,'')}</div>
              <div style="font-family:var(--mono); font-size:10px; color:var(--ink-4); margin-top:3px;">${c.s} · ${fcTopicName(c.s,c.t)} · ${c.d}${c.likes ? ' · saved ' + c.likes + '×' : ''}</div>
            </div>
            ${(c.g||[]).slice(0,2).map(t => `<span class="fc-tag ${t==='HIGH YIELD'?'hy':t==='COMMON TRAP'?'trap':t==='MUST KNOW'?'must':t==='FORMULA'?'formula':''}">${t}</span>`).join('')}
            <span class="tag ${c.shared?'tag-paid':'tag-inactive'}">${c.shared?'SHARED':'PRIVATE'}</span>
            <div style="display:flex; gap:5px; flex-shrink:0;">
              <button class="ico-btn" title="Study this card" onclick="fcStart('single',null,null,'${c.id}')"><i class="fa-solid fa-play"></i></button>
              <button class="ico-btn" title="${c.shared?'Make private':'Share with the class'}" onclick="fcShareToggle('${c.id}')"><i class="fa-solid fa-${c.shared?'lock':'share-nodes'}"></i></button>
              <button class="ico-btn" title="Edit" onclick="fcMyEdit('${c.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="ico-btn" title="Delete" onclick="fcDeleteMine('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>`).join('')}
        </div>
      </div>`
    : `<div class="st-empty"><i class="fa-solid fa-pen-to-square"></i><b>You haven't written a card yet</b><span>The fastest way to fix a mistake is to turn it into a card in your own words.</span><div style="margin-top:16px;"><button class="btn btn-primary btn-sm" onclick="fcMyEdit()"><i class="fa-solid fa-plus"></i> Write my first card</button></div></div>`}
  `;
}

function fcStudyMine(){
  const ids = fcMine().map(c => c.id);
  if (!ids.length) return;
  fcState.mode = 'topic'; fcState.queue = ids; fcState.idx = 0; fcState.back = false;
  fcState.results = []; fcState.stats = { again:0, hard:0, good:0, easy:0, start:Date.now() };
  fcState.view = 'session'; navTo('flashcards');
}

/* ═══ CLASS SHELF ═══ */
function fcCommunityHTML(){
  const me = fcMe();
  const all = fcCommunity();
  const authors = fcAuthors();
  const filt = fcState.author ? all.filter(c => c.byId === fcState.author) : (fcState.subj ? all.filter(c => c.s === fcState.subj) : all);
  const sorted = fcState.sort === 'saved' ? [...filt].sort((a,b) => (b.likes||0) - (a.likes||0)) : filt;
  const adopted = fcAdopted();
  return `
    ${pageHead({
      eyebrow:'Flashcards · Made by students',
      title:`The class <em>shelf</em>`,
      sub:'Cards written by your cohort, credited to whoever made them. Save any card and it joins your own review rotation.',
      actions:`<button class="btn btn-ghost btn-sm" onclick="fcState.view='dash'; fcState.author=null; navTo('flashcards')"><i class="fa-solid fa-arrow-left"></i> Dashboard</button>
        <button class="btn btn-primary btn-sm" onclick="fcMyEdit()"><i class="fa-solid fa-plus"></i> Contribute a card</button>`
    })}

    <div class="card mb-5">
      <div class="card-hd"><div><div class="card-title">Top contributors</div><div class="card-sub">Ranked by how often classmates saved their cards</div></div></div>
      <div class="card-body">
        <div class="fc-authors">
          ${authors.map((a,i) => `<button class="fc-author ${fcState.author===a.id?'on':''}" onclick="fcPickAuthor('${a.id}')">
            <div class="av ${a.mine?'me':''}">${a.init}</div>
            <div class="tx">
              <b>${a.name}${a.mine?' <span style="font-weight:500; color:var(--gold);">· you</span>':''}</b>
              <span>${a.n} card${a.n===1?'':'s'} · ${[...a.subj].join(', ')}</span>
            </div>
            <div class="mt"><b>${a.likes}</b><span>saves</span></div>
            ${i < 3 ? `<div class="rk">#${i+1}</div>` : ''}
          </button>`).join('')}
        </div>
      </div>
    </div>

    <div class="card mb-5" style="padding:14px 20px;">
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <div class="pill-row" style="margin:0; gap:6px; flex:1;">
          <button class="pill ${!fcState.subj&&!fcState.author?'on':''}" onclick="fcState.subj=null; fcState.author=null; navTo('flashcards')">Everything <span class="count">${all.length}</span></button>
          ${FC_SUBJECTS.map(s => { const n = all.filter(c => c.s === s.id).length; return n ? `<button class="pill ${fcState.subj===s.id&&!fcState.author?'on':''}" onclick="fcState.author=null; fcState.subj='${s.id}'; navTo('flashcards')">${s.id} <span class="count">${n}</span></button>` : ''; }).join('')}
        </div>
        <div class="st-seg">
          <button class="${fcState.sort!=='saved'?'on':''}" onclick="fcState.sort='new'; navTo('flashcards')">Newest</button>
          <button class="${fcState.sort==='saved'?'on':''}" onclick="fcState.sort='saved'; navTo('flashcards')">Most saved</button>
        </div>
      </div>
      ${fcState.author ? `<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--rule); display:flex; align-items:center; gap:10px;">
        <span style="font-size:12.5px; color:var(--ink-3);">Showing only cards by <b style="color:var(--navy);">${authors.find(a=>a.id===fcState.author)?.name || ''}</b></span>
        <button class="st-chip hollow" style="padding:4px 11px; font-size:11px;" onclick="fcState.author=null; navTo('flashcards')">Clear</button>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="fcStudyAuthor('${fcState.author}')"><i class="fa-solid fa-play"></i> Study this deck</button>
      </div>` : ''}
    </div>

    ${sorted.length ? `<div class="fc-shelf">
      ${sorted.map(c => {
        const got = c.mine || adopted.includes(c.id);
        return `<div class="fc-shared">
          <div class="hd">
            <div class="av ${c.mine?'me':''}">${c.byInit || fcInit(c.by)}</div>
            <div class="who"><b>${c.by}${c.mine?' · you':''}</b><span>${c.s} · ${fcTopicName(c.s,c.t)} · ${FC_TYPES[c.ty]||'Card'}</span></div>
            ${c.likes ? `<div class="lk"><i class="fa-solid fa-bookmark"></i> ${c.likes}</div>` : ''}
          </div>
          <div class="q">${fcMath(c.f)}</div>
          <div class="tg">${(c.g||[]).map(t => `<span class="fc-tag ${t==='HIGH YIELD'?'hy':t==='COMMON TRAP'?'trap':t==='MUST KNOW'?'must':t==='FORMULA'?'formula':''}">${t}</span>`).join('')}<span class="fc-tag">${c.d.toUpperCase()}</span></div>
          <div class="ac">
            <button class="btn btn-ghost btn-sm" onclick="fcPeek('${c.id}')"><i class="fa-solid fa-eye"></i> Answer</button>
            ${c.mine
              ? `<button class="btn btn-ghost btn-sm" onclick="fcMyEdit('${c.id}')"><i class="fa-solid fa-pen"></i> Edit</button>`
              : `<button class="btn ${got?'btn-ghost':'btn-primary'} btn-sm" onclick="fcAdopt('${c.id}')"><i class="fa-${got?'solid fa-check':'regular fa-bookmark'}"></i> ${got?'In my deck':'Save to my deck'}</button>`}
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="st-empty"><i class="fa-solid fa-users"></i><b>Nothing shared here yet</b><span>Be the first — write a card and share it with your cohort.</span></div>`}
  `;
}

function fcPickAuthor(id){ fcState.author = fcState.author === id ? null : id; fcState.subj = null; navTo('flashcards'); }

function fcPeek(id){
  const c = fcCommunity().find(x => x.id === id) || fcCard(id); if (!c) return;
  const got = c.mine || fcAdopted().includes(c.id);
  stModal(`
    <div class="modal-hd" style="border:none; background:linear-gradient(135deg,var(--navy-deep),var(--navy)); color:#fff; padding:22px 24px; align-items:flex-start;">
      <div>
        <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold-soft); font-weight:700;">${c.s} · ${fcTopicName(c.s,c.t)} · ${FC_TYPES[c.ty]||'Card'}</div>
        <div style="font-family:var(--serif); font-size:19px; font-weight:600; margin-top:8px; line-height:1.3;">${fcMath(c.f)}</div>
        <div style="display:flex; align-items:center; gap:8px; margin-top:12px;">
          <div class="db-tutor" style="width:26px; height:26px; flex:0 0 26px; font-size:10px; background:rgba(255,255,255,.18);">${c.byInit || fcInit(c.by)}</div>
          <span style="font-size:12px; color:rgba(255,255,255,.7);">Made by <b style="color:#fff;">${c.by}</b>${c.at?' · '+c.at:''}</span>
        </div>
      </div>
      <button class="modal-close" onclick="stCloseModal()" style="background:rgba(255,255,255,.1); color:#fff; border-color:rgba(255,255,255,.2); flex:0 0 30px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body" style="overflow-y:auto;">
      <div class="fc-ans" style="font-size:19px;">${fcMath(c.a)}</div>
      ${c.fo ? `<div class="fc-formula">${fcTex(c.fo, true)}</div>` : ''}
      ${c.e ? `<div class="fc-block"><div class="l"><i class="fa-solid fa-circle-info"></i> Why</div><p>${fcMath(c.e)}</p></div>` : ''}
      ${c.m ? `<div class="fc-block trap"><div class="l"><i class="fa-solid fa-triangle-exclamation"></i> Common misconception</div><p>${fcMath(c.m)}</p></div>` : ''}
      ${c.ip ? `<div class="fc-block tip"><div class="l"><i class="fa-solid fa-lightbulb"></i> ${c.mine||c.student?'Author\'s note':'IMAT tip'}</div><p>${fcMath(c.ip)}</p></div>` : ''}
      ${c.r ? `<div class="fc-block"><div class="l">Related</div><div class="fc-rel"><span>${c.s} · ${fcTopicName(c.s,c.t)}</span><span>${c.r}</span></div></div>` : ''}
    </div>
    <div style="display:flex; gap:8px; padding:16px 24px; border-top:1px solid var(--rule); background:var(--paper); border-radius:0 0 var(--r-lg) var(--r-lg); justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="stCloseModal()">Close</button>
      ${c.mine ? '' : `<button class="btn ${got?'btn-ghost':'btn-primary'}" onclick="stCloseModal(); fcAdopt('${c.id}')"><i class="fa-${got?'solid fa-check':'regular fa-bookmark'}"></i> ${got?'In my deck':'Save to my deck'}</button>`}
    </div>
  `, 620);
}

function fcStudyAuthor(id){
  const ids = fcCommunity().filter(c => c.byId === id).map(c => c.id);
  if (!ids.length) return;
  const adopted = fcAdopted(), add = ids.filter(i => !adopted.includes(i) && !fcMine().some(m => m.id === i));
  if (add.length){ fcSaveAdopted([...adopted, ...add]); }
  fcState.mode = 'topic'; fcState.queue = ids; fcState.idx = 0; fcState.back = false;
  fcState.results = []; fcState.stats = { again:0, hard:0, good:0, easy:0, start:Date.now() };
  fcState.view = 'session'; navTo('flashcards');
}

/* ═══ STUDENT CARD EDITOR ═══ */
function fcMyEdit(id){
  const card = id ? fcMine().find(c => c.id === id) : null;
  const subj = card?.s || 'Biology';
  const me = fcMe();
  const tagList = ['HIGH YIELD','COMMON TRAP','MUST KNOW','FORMULA','IMAT'];
  const f = v => (v || '').replace(/"/g,'&quot;');
  stModal(`
    <div class="modal-hd"><div>
      <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700;">My flashcards</div>
      <div class="modal-title">${card ? 'Edit my card' : 'Write a flashcard'}</div>
    </div><button class="modal-close" onclick="stCloseModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body" style="overflow-y:auto;">
      <div style="display:flex; gap:11px; align-items:center; padding:12px 15px; background:var(--gold-pale); border-radius:8px; margin-bottom:16px;">
        <div class="db-tutor" style="background:var(--gold);">${me.init}</div>
        <div style="font-size:12.5px; color:var(--ink-2); line-height:1.5;">This card is credited to <b>${me.name}</b>. If you share it, your name goes on the class shelf with it.</div>
      </div>
      <div class="form-grid">
        <div class="fg"><label>Subject</label><select id="fcmSubj" onchange="fcmSyncTopics()">${FC_SUBJECTS.map(s => `<option ${subj===s.id?'selected':''}>${s.id}</option>`).join('')}</select></div>
        <div class="fg"><label>Topic</label><select id="fcmTopic">${FC_TOPICS[subj].map(([t,n]) => `<option value="${t}" ${card?.t===t?'selected':''}>${n}</option>`).join('')}</select></div>
        <div class="fg"><label>Card type</label><select id="fcmType">${Object.entries(FC_TYPES).map(([k,v]) => `<option value="${k}" ${card?.ty===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg"><label>How hard is it for you?</label><select id="fcmDiff">${['easy','medium','hard'].map(d => `<option ${card?.d===d?'selected':''}>${d}</option>`).join('')}</select></div>
        <div class="fg full"><label>Front — one question or concept</label><textarea id="fcmFront" rows="2" placeholder="Why is the pulmonary artery the only artery carrying deoxygenated blood?">${card?.f||''}</textarea></div>
        <div class="fg full"><label>Answer</label><textarea id="fcmAns" rows="2" placeholder="Keep it to the one thing you need to recall.">${card?.a||''}</textarea></div>
        <div class="fg full"><label>Why — in your own words <span style="text-transform:none; letter-spacing:0; font-weight:500; color:var(--ink-4);">(optional)</span></label><textarea id="fcmExpl" rows="2">${card?.e||''}</textarea></div>
        <div class="fg full"><label>What I kept getting wrong <span style="text-transform:none; letter-spacing:0; font-weight:500; color:var(--ink-4);">(optional)</span></label><input id="fcmMis" value="${f(card?.m)}" placeholder="I confused this with competitive inhibition."></div>
        <div class="fg full"><label>My note / trick to remember <span style="text-transform:none; letter-spacing:0; font-weight:500; color:var(--ink-4);">(optional)</span></label><input id="fcmTip" value="${f(card?.ip)}"></div>
        <div class="fg"><label>Formula (LaTeX)</label><input id="fcmFo" value="${f(card?.fo)}" placeholder="v = f\\lambda"></div>
        <div class="fg"><label>Related concept</label><input id="fcmRel" value="${f(card?.r)}"></div>
      </div>
      <div style="margin-top:14px;">
        <label style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; display:block; margin-bottom:9px;">Tags</label>
        <div class="st-chips" id="fcmTagRow">${tagList.map(t => `<button class="st-chip ${(card?.g||[]).includes(t)?'on':''}" data-tag="${t}" onclick="this.classList.toggle('on')">${t}</button>`).join('')}</div>
      </div>
      <div style="margin-top:14px; display:flex; align-items:center; gap:10px; padding:12px 14px; background:var(--paper); border-radius:8px;">
        <input type="checkbox" id="fcmShare" ${!card || card.shared ? 'checked' : ''}>
        <label for="fcmShare" style="font-size:12.5px; color:var(--ink-2); cursor:pointer;">Share with my cohort on the class shelf — credited to me</label>
      </div>
    </div>
    <div style="display:flex; gap:8px; padding:16px 24px; border-top:1px solid var(--rule); background:var(--paper); border-radius:0 0 var(--r-lg) var(--r-lg); justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="stCloseModal()">Cancel</button>
      <button class="btn btn-primary" onclick="fcMySave('${id||''}')"><i class="fa-solid fa-check"></i> ${card ? 'Save changes' : 'Create my card'}</button>
    </div>
  `, 660);
}

function fcmSyncTopics(){
  const s = document.getElementById('fcmSubj').value;
  document.getElementById('fcmTopic').innerHTML = FC_TOPICS[s].map(([t,n]) => `<option value="${t}">${n}</option>`).join('');
}

function fcMySave(id){
  const front = document.getElementById('fcmFront').value.trim();
  const ans = document.getElementById('fcmAns').value.trim();
  if (!front || !ans){ showToast('A card needs a front and an answer'); return; }
  const me = fcMe();
  const data = {
    s: document.getElementById('fcmSubj').value, t: document.getElementById('fcmTopic').value,
    ty: document.getElementById('fcmType').value, d: document.getElementById('fcmDiff').value,
    f: front, a: ans, e: document.getElementById('fcmExpl').value.trim(),
    m: document.getElementById('fcmMis').value.trim(), ip: document.getElementById('fcmTip').value.trim(),
    fo: document.getElementById('fcmFo').value.trim(), r: document.getElementById('fcmRel').value.trim(),
    g: [...document.querySelectorAll('#fcmTagRow .st-chip.on')].map(b => b.dataset.tag),
    shared: document.getElementById('fcmShare').checked,
    by: me.name, byId: me.id, byInit: me.init, student: true,
  };
  const mine = fcMine();
  if (id){
    const c = mine.find(x => x.id === id);
    if (c) Object.assign(c, data);
  } else {
    mine.unshift({ id:'my' + Date.now().toString(36), at:fcToday(), likes:0, ...data });
  }
  fcSaveMine(mine);
  stCloseModal();
  if (fcState.view !== 'community') fcState.view = 'mine';
  navTo('flashcards');
  showToast(id ? 'Your card was updated' : data.shared ? 'Card created and shared under your name' : 'Card created — kept private');
}

/* ── dashboard block ── */
function fcCommunityCard(){
  const mine = fcMine(), authors = fcAuthors(), all = fcCommunity();
  const recent = all.slice(0,4);
  const saves = mine.filter(c => c.shared).reduce((s,c) => s + (c.likes||0), 0);
  return `<div class="grid-wide" style="margin-top:0;">
    <div class="card">
      <div class="card-hd">
        <div><div class="card-title"><i class="fa-solid fa-users" style="color:var(--gold); margin-right:7px;"></i>Made by students</div><div class="card-sub">${all.length} cards from ${authors.length} classmates — save any of them into your own reviews</div></div>
        <button class="btn btn-ghost btn-sm" onclick="fcState.view='community'; navTo('flashcards')">Class shelf <i class="fa-solid fa-arrow-right"></i></button>
      </div>
      <div class="card-body" style="padding:0;">
        ${recent.map(c => {
          const got = c.mine || fcAdopted().includes(c.id);
          return `<div style="display:flex; gap:12px; align-items:center; padding:12px 22px; border-bottom:1px solid var(--rule);">
            <div class="db-tutor" style="width:30px; height:30px; flex:0 0 30px; font-size:10.5px; ${c.mine?'background:var(--gold);':''}">${c.byInit || fcInit(c.by)}</div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:12.5px; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.f.replace(/\$/g,'')}</div>
              <div style="font-family:var(--mono); font-size:10px; color:var(--ink-4); margin-top:2px;">${c.by}${c.mine?' · you':''} · ${c.s} · ${fcTopicName(c.s,c.t)}</div>
            </div>
            ${c.mine ? '' : `<button class="ico-btn" title="${got?'In your deck':'Save to my deck'}" style="${got?'color:var(--gold); border-color:var(--gold);':''}" onclick="fcAdopt('${c.id}')"><i class="fa-${got?'solid':'regular'} fa-bookmark"></i></button>`}
            <button class="ico-btn" title="See the answer" onclick="fcPeek('${c.id}')"><i class="fa-solid fa-eye"></i></button>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><div><div class="card-title">My cards</div><div class="card-sub">Writing a card is the fastest way to fix a mistake</div></div>
      <button class="btn btn-primary btn-sm" onclick="fcMyEdit()"><i class="fa-solid fa-plus"></i> New</button></div>
      <div class="card-body">
        <div class="st-stats" style="margin:0 0 14px; grid-template-columns:1fr 1fr 1fr;">
          <div class="st-stat" style="padding:11px 13px;"><div class="lbl">Written</div><div class="val" style="font-size:21px;">${mine.length}</div></div>
          <div class="st-stat" style="padding:11px 13px;"><div class="lbl">Saved by others</div><div class="val teal" style="font-size:21px;">${saves}</div></div>
          <div class="st-stat" style="padding:11px 13px;"><div class="lbl">From friends</div><div class="val ok" style="font-size:21px;">${fcAdopted().length}</div></div>
        </div>
        ${mine.length
          ? `<div style="display:grid; gap:7px;">${mine.slice(0,3).map(c => `<div class="fc-row" style="padding:7px 0;"><div class="st ${fcStatus(c.id)}"></div><div class="q">${c.f.replace(/\$/g,'')}</div><span class="tag ${c.shared?'tag-paid':'tag-inactive'}" style="font-size:8.5px;">${c.shared?'SHARED':'PRIVATE'}</span></div>`).join('')}</div>
             <button class="btn btn-ghost btn-sm" style="width:100%; justify-content:center; margin-top:12px;" onclick="fcState.view='mine'; navTo('flashcards')">Manage my ${mine.length} card${mine.length===1?'':'s'} <i class="fa-solid fa-arrow-right"></i></button>`
          : `<div style="text-align:center; padding:14px 10px;">
              <div style="font-size:12.5px; color:var(--ink-3); line-height:1.55; margin-bottom:14px;">Got a question wrong today? Turn it into a card in your own words — then share it and your name travels with it.</div>
              <button class="btn btn-primary btn-sm" onclick="fcMyEdit()"><i class="fa-solid fa-pen-to-square"></i> Write my first card</button>
            </div>`}
      </div>
    </div>
  </div>`;
}
