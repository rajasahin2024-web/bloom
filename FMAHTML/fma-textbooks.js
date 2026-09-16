/* ═══════════════════════════════════════════════════════════════
   FEATURE 1 · TEXTBOOK LIBRARY
   Browse by subject → topic, filter, preview and download PDFs.
   Depends on: TOPICS, SUBJECTS, pageHead(), showToast(), jsPDF, pdfHeader/pdfFooter
═══════════════════════════════════════════════════════════════ */

const TEXTBOOKS = [
  /* BIOLOGY */
  { id:'bio-core', subj:'Biology', topic:'core', title:'Biology Core Textbook — IMAT Edition', author:'Prof. E. Marcucci', ed:'4th ed · 2026', pages:412, size:'18.4 MB', level:'ALL', tag:'Core text',
    desc:'The full IMAT biology syllabus in one volume — from biochemistry of the cell to human physiology, with end-of-chapter question sets.',
    ch:['The Chemistry of Life','Cell Structure & Transport','Bioenergetics','Cell Division & the Cell Cycle','Molecular Genetics','Inheritance & Variation','Evolution & Classification','Human Physiology Overview'] },
  { id:'bio-cell', subj:'Biology', topic:'cell-bio', title:'Cell Biology & Molecular Foundations', author:'Prof. E. Marcucci', ed:'2nd ed · 2026', pages:168, size:'9.2 MB', level:'ALL', tag:'Subject text',
    desc:'Organelles, membrane transport, the cytoskeleton and signalling pathways, illustrated with annotated electron micrographs.',
    ch:['The Eukaryotic Cell','Membranes & Transport','Endomembrane System','Mitochondria & Chloroplasts','Cytoskeleton & Motility','Cell Signalling','Mitosis vs Meiosis'] },
  { id:'bio-cell-wb', subj:'Biology', topic:'cell-bio', title:'Cell Biology Problem Workbook', author:'Prof. E. Marcucci', ed:'2026', pages:74, size:'3.1 MB', level:'ALL', tag:'Workbook',
    desc:'240 IMAT-style questions on organelles, transport and cell division with fully worked solutions.',
    ch:['Organelle Identification','Transport Calculations','Cycle & Checkpoint Questions','Micrograph Interpretation','Mixed Set + Solutions'] },
  { id:'bio-gen', subj:'Biology', topic:'genetics', title:'Genetics & Inheritance', author:'Prof. E. Marcucci', ed:'3rd ed · 2026', pages:196, size:'11.6 MB', level:'ALL', tag:'Subject text',
    desc:'From Mendel to gene expression — crosses, linkage, mutation and modern molecular techniques, with 90 solved genetic problems.',
    ch:['Mendelian Principles','Beyond Mendel','Chromosomes & Linkage','DNA Structure & Replication','Transcription & Translation','Gene Regulation','Mutation & Repair','Genetic Engineering'] },
  { id:'bio-evo', subj:'Biology', topic:'evolution', title:'Evolution, Ecology & Biodiversity', author:'Dr. M. Ferrero', ed:'2026', pages:142, size:'8.0 MB', level:'ALL', tag:'Subject text',
    desc:'Selection, drift, speciation and population ecology — the topics most students under-prepare and IMAT reliably tests.',
    ch:['Evidence for Evolution','Mechanisms of Change','Population Genetics','Speciation','Phylogeny & Classification','Ecosystems & Energy Flow'] },
  { id:'bio-micro', subj:'Biology', topic:'microbiology', title:'Microbiology & Immunology Primer', author:'Dr. H. Karim', ed:'2026', pages:158, size:'9.8 MB', level:'PREMIUM', tag:'Subject text',
    desc:'Bacterial structure, viral replication cycles and the human immune response, aligned to the IMAT biology blueprint.',
    ch:['Prokaryotic Cell Architecture','Bacterial Growth & Genetics','Viruses & Replication','Innate Immunity','Adaptive Immunity','Vaccines & Antimicrobials'] },

  /* CHEMISTRY */
  { id:'chem-core', subj:'Chemistry', topic:'core', title:'Chemistry Core Textbook — IMAT Edition', author:'Dr. H. Karim', ed:'4th ed · 2026', pages:388, size:'17.1 MB', level:'ALL', tag:'Core text',
    desc:'General, inorganic and organic chemistry for medical entrance exams, with 600+ graded exercises and full answer keys.',
    ch:['Matter & Measurement','Atomic Structure','Periodicity & Bonding','Stoichiometry','States of Matter','Solutions & Colligative Properties','Equilibrium & Acids/Bases','Redox & Electrochemistry','Organic Foundations'] },
  { id:'chem-atom', subj:'Chemistry', topic:'atomic', title:'Atomic Structure & Periodicity', author:'Dr. H. Karim', ed:'2nd ed · 2026', pages:124, size:'6.4 MB', level:'ALL', tag:'Subject text',
    desc:'Quantum numbers, electron configuration, periodic trends and bonding models built up from first principles.',
    ch:['Subatomic Particles & Isotopes','Quantum Model of the Atom','Electron Configuration','Periodic Trends','Ionic & Covalent Bonding','VSEPR & Hybridisation'] },
  { id:'chem-org', subj:'Chemistry', topic:'organic', title:'Organic Chemistry — Reactions & Mechanisms', author:'Dr. H. Karim', ed:'3rd ed · 2026', pages:242, size:'14.2 MB', level:'PREMIUM', tag:'Subject text',
    desc:'Every functional group, every mechanism you need, drawn step by step — plus a 40-page reaction map fold-out.',
    ch:['Nomenclature & Isomerism','Alkanes & Alkenes','Aromatic Systems','Alcohols, Ethers & Amines','Carbonyl Chemistry','Carboxylic Acids & Derivatives','Reaction Mechanism Atlas'] },
  { id:'chem-bio', subj:'Chemistry', topic:'biochem', title:'Biochemistry Essentials', author:'Dr. H. Karim', ed:'2026', pages:136, size:'7.7 MB', level:'PREMIUM', tag:'Subject text',
    desc:'Amino acids, proteins, enzyme kinetics and metabolic pathways at exactly the depth IMAT expects — no further.',
    ch:['Biomolecules Overview','Amino Acids & Proteins','Enzymes & Kinetics','Carbohydrate Metabolism','Lipids & Membranes','Nucleotides & Energy Currency'] },
  { id:'chem-stoich', subj:'Chemistry', topic:'stoich', title:'Quantitative Chemistry Problem Book', author:'Dr. H. Karim', ed:'2026', pages:96, size:'4.2 MB', level:'ALL', tag:'Workbook',
    desc:'380 mole, concentration, gas-law and titration problems, ordered from routine to exam-hard, all fully worked.',
    ch:['Moles & Molar Mass','Balancing & Yields','Solutions & Molarity','Gas Laws','Titration Calculations','Timed Mixed Sets'] },

  /* PHYSICS */
  { id:'phy-core', subj:'Physics', topic:'core', title:'Physics Core Textbook — IMAT Edition', author:'Prof. S. Bianchi', ed:'3rd ed · 2026', pages:352, size:'15.8 MB', level:'ALL', tag:'Core text',
    desc:'Mechanics through modern physics, written for students who last studied physics two years ago. Worked example on every spread.',
    ch:['Units & Measurement','Kinematics','Forces & Newton\'s Laws','Work, Energy & Power','Fluids','Thermodynamics','Waves & Optics','Electricity & Magnetism','Atomic & Nuclear Physics'] },
  { id:'phy-mech', subj:'Physics', topic:'mechanics', title:'Mechanics — Kinematics to Rotation', author:'Prof. S. Bianchi', ed:'2026', pages:164, size:'8.9 MB', level:'ALL', tag:'Subject text',
    desc:'Motion, forces, momentum and energy with 120 worked problems and a diagnostic test per chapter.',
    ch:['Vectors & Scalars','Motion in One Dimension','Projectile Motion','Newton\'s Laws Applied','Momentum & Collisions','Work–Energy Theorem','Circular Motion'] },
  { id:'phy-em', subj:'Physics', topic:'electromag', title:'Electricity & Magnetism', author:'Prof. S. Bianchi', ed:'2026', pages:148, size:'8.1 MB', level:'PREMIUM', tag:'Subject text',
    desc:'Fields, circuits and induction — with a circuit-analysis toolkit that turns exam questions into two-line calculations.',
    ch:['Electric Charge & Field','Potential & Capacitance','Current & Resistance','DC Circuits','Magnetic Fields','Electromagnetic Induction'] },
  { id:'phy-thermo', subj:'Physics', topic:'thermo', title:'Thermodynamics & Fluids', author:'Prof. S. Bianchi', ed:'2026', pages:112, size:'5.9 MB', level:'ALL', tag:'Subject text',
    desc:'Heat, the gas laws, the four laws of thermodynamics and hydrostatics — the highest-yield physics pages in the course.',
    ch:['Temperature & Heat','Ideal Gas Behaviour','First Law & Processes','Second Law & Entropy','Hydrostatics','Fluid Dynamics'] },
  { id:'phy-formula', subj:'Physics', topic:'core', title:'Formula & Constants Booklet', author:'FMA Faculty', ed:'2026', pages:24, size:'0.9 MB', level:'ALL', tag:'Reference',
    desc:'Every equation and constant across physics, chemistry and quantitative reasoning on 24 printable pages.',
    ch:['Mechanics','Thermodynamics','Electromagnetism','Waves & Optics','Chemistry Constants','Mathematical Identities'] },

  /* ANATOMY */
  { id:'ana-core', subj:'Anatomy', topic:'core', title:'Human Anatomy Atlas — FMA Edition', author:'Prof. E. Marcucci', ed:'2nd ed · 2026', pages:286, size:'34.6 MB', level:'PREMIUM', tag:'Core text',
    desc:'Systems-based atlas with labelled plates, clinical notes and a self-test overlay on every regional section.',
    ch:['Anatomical Terminology','Skeletal System','Muscular System','Cardiovascular System','Respiratory System','Digestive System','Urogenital System','Nervous System','Endocrine System'] },
  { id:'ana-skel', subj:'Anatomy', topic:'skeletal', title:'Skeletal & Muscular Systems', author:'Prof. E. Marcucci', ed:'2026', pages:132, size:'12.4 MB', level:'ALL', tag:'Subject text',
    desc:'All 206 bones, the major joints and muscle groups — with naming drills designed for spaced repetition.',
    ch:['Bone Tissue & Growth','Axial Skeleton','Appendicular Skeleton','Joints & Movement','Skeletal Muscle Structure','Major Muscle Groups'] },
  { id:'ana-cardio', subj:'Anatomy', topic:'cardio', title:'Cardiovascular & Respiratory Systems', author:'Prof. E. Marcucci', ed:'2026', pages:118, size:'10.8 MB', level:'PREMIUM', tag:'Subject text',
    desc:'Heart anatomy, the conduction system, circulation and gas exchange, with flow diagrams built for exam recall.',
    ch:['Heart Anatomy','Cardiac Cycle & Conduction','Blood Vessels & Pressure','Blood & Haemostasis','Airways & Lungs','Gas Exchange & Control of Breathing'] },
  { id:'ana-nerv', subj:'Anatomy', topic:'nervous', title:'Nervous System & Special Senses', author:'Prof. E. Marcucci', ed:'2026', pages:146, size:'13.2 MB', level:'PREMIUM', tag:'Subject text',
    desc:'Neurons and synapses up to cortical organisation, plus vision, hearing and balance in clinical context.',
    ch:['Neurons & Glia','Membrane Potentials','Synaptic Transmission','Spinal Cord & Reflexes','Brain Regions','Autonomic Nervous System','Eye & Ear'] },

  /* ENGLISH */
  { id:'eng-core', subj:'English', topic:'core', title:'Medical English Handbook', author:'Prof. A. Russo', ed:'2026', pages:174, size:'7.4 MB', level:'ALL', tag:'Core text',
    desc:'Grammar, academic register and the reading strategies IMAT rewards, taught through medical source texts.',
    ch:['Diagnostic Assessment','Tenses & Aspect','Conditionals & Modals','Academic Register','Cohesion & Cohesive Devices','Reading Under Time Pressure'] },
  { id:'eng-vocab', subj:'English', topic:'vocab', title:'Medical Terminology Builder', author:'Prof. A. Russo', ed:'2026', pages:88, size:'3.6 MB', level:'ALL', tag:'Workbook',
    desc:'900 roots, prefixes and suffixes with decoding drills — build any clinical term from its parts.',
    ch:['Word Roots','Prefixes of Number & Position','Suffixes of Procedure & Condition','Body Systems Vocabulary','Abbreviations','Decoding Practice'] },
  { id:'eng-read', subj:'English', topic:'reading', title:'Reading Comprehension Practice Sets', author:'Prof. A. Russo', ed:'2026', pages:104, size:'4.8 MB', level:'ALL', tag:'Workbook',
    desc:'20 timed passage sets at IMAT difficulty, each with answer rationales that explain why the distractors fail.',
    ch:['Strategy Overview','Sets 1–5 · Science Passages','Sets 6–10 · Ethics & Society','Sets 11–15 · Historical','Sets 16–20 · Mixed','Answer Rationales'] },

  /* LOGIC */
  { id:'log-core', subj:'Logic', topic:'core', title:'Logical Reasoning Masterbook', author:'Dr. L. Hadid', ed:'3rd ed · 2026', pages:228, size:'10.2 MB', level:'ALL', tag:'Core text',
    desc:'The complete logic section: argument structure, formal deduction, spatial and numerical reasoning, with 500 practice items.',
    ch:['Argument Anatomy','Assumptions & Inference','Formal Logic & Syllogisms','Logical Fallacies','Spatial Reasoning','Numerical Reasoning','Timing Strategy'] },
  { id:'log-verbal', subj:'Logic', topic:'verbal', title:'Verbal Reasoning Drills', author:'Dr. L. Hadid', ed:'2026', pages:92, size:'4.1 MB', level:'PREMIUM', tag:'Workbook',
    desc:'300 verbal items sorted by trap type, so you learn to recognise the pattern before you read the options.',
    ch:['Necessary vs Sufficient','Strengthen & Weaken','Flaw Detection','Parallel Reasoning','Timed Sets'] },
  { id:'log-num', subj:'Logic', topic:'numerical', title:'Numerical Reasoning & Data Sets', author:'Dr. L. Hadid', ed:'2026', pages:98, size:'5.3 MB', level:'ALL', tag:'Workbook',
    desc:'Percentages, ratios, sequences and table/graph interpretation with the mental-arithmetic shortcuts examiners assume.',
    ch:['Percentage & Ratio Toolkit','Sequences & Series','Rates & Proportion','Table Interpretation','Graph Interpretation','Speed Drills'] },

  /* CROSS-SUBJECT */
  { id:'past-companion', subj:'Biology', topic:'core', title:'IMAT Past-Paper Companion 2019–2025', author:'FMA Faculty', ed:'2026', pages:318, size:'16.9 MB', level:'PREMIUM', tag:'Past papers',
    desc:'Seven years of official questions regrouped by topic, each with an FMA explanation and a difficulty rating.',
    ch:['How to Use This Book','Biology by Topic','Chemistry by Topic','Physics & Maths by Topic','Logic by Topic','Answer Keys & Statistics'] },
];

let tbState = { subject:'All', topic:'All', q:'' };

function tbDownloads(){ try { return JSON.parse(localStorage.getItem('fma_tb_downloads') || '[]'); } catch(e){ return []; } }
function tbMarkDownloaded(id){
  const d = tbDownloads(); if (!d.includes(id)) d.push(id);
  try { localStorage.setItem('fma_tb_downloads', JSON.stringify(d)); } catch(e){}
}
function tbTopicName(id){ return id === 'core' ? 'Core & reference' : (TOPICS.find(t => t.id === id)?.name || id); }
function tbCoverClass(subj){
  return subj === 'Chemistry' ? 'chem' : subj === 'Physics' ? 'phy' : subj === 'Anatomy' ? 'ana' : (subj === 'English' || subj === 'Logic') ? 'eng' : '';
}
function tbMatches(){
  const q = tbState.q.trim().toLowerCase();
  return TEXTBOOKS.filter(b => {
    if (tbState.subject !== 'All' && b.subj !== tbState.subject) return false;
    if (tbState.topic !== 'All' && b.topic !== tbState.topic) return false;
    if (q && !(b.title + ' ' + b.desc + ' ' + b.author + ' ' + b.ch.join(' ') + ' ' + tbTopicName(b.topic)).toLowerCase().includes(q)) return false;
    return true;
  });
}

function sec_textbooks(){
  const isStudent = state.user.roleKey === 'student';
  const dl = tbDownloads();
  const topicsForSubject = tbState.subject === 'All' ? [] : [...new Set(TEXTBOOKS.filter(b => b.subj === tbState.subject).map(b => b.topic))];
  const totalPages = TEXTBOOKS.reduce((s,b) => s + b.pages, 0);
  return `
    ${pageHead({
      eyebrow: isStudent ? 'My Resources' : 'Content Hub',
      title: `Textbook <em>Library</em>`,
      sub: 'Every FMA textbook, workbook and reference sheet — organised by subject and topic, downloadable as PDF.',
      actions: isStudent ? '' : `<button class="btn btn-primary btn-sm" onclick="tbUploadPrompt()"><i class="fa-solid fa-cloud-arrow-up"></i> Add Textbook</button>`
    })}

    <div class="st-stats">
      <div class="st-stat"><div class="lbl">Titles available</div><div class="val">${TEXTBOOKS.length}</div><div class="sub">${SUBJECTS.length} subjects · ${new Set(TEXTBOOKS.map(b=>b.topic)).size} shelves</div></div>
      <div class="st-stat"><div class="lbl">Total pages</div><div class="val teal">${totalPages.toLocaleString()}</div><div class="sub">Print-ready A4 PDFs</div></div>
      <div class="st-stat"><div class="lbl">Downloaded by you</div><div class="val ok">${dl.length}</div><div class="sub">${dl.length ? 'Available offline' : 'Nothing downloaded yet'}</div></div>
      <div class="st-stat"><div class="lbl">Last updated</div><div class="val" style="font-size:19px;">June 2026</div><div class="sub">Aligned to IMAT 2026 syllabus</div></div>
    </div>

    <div class="card mb-5" style="padding:14px 20px;">
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <div class="f-search" style="flex:1; min-width:250px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input id="tbSearch" placeholder="Search titles, chapters, authors…" value="${tbState.q}" oninput="tbState.q = this.value; renderTextbookResults();">
        </div>
        <div class="pill-row" style="margin:0; gap:6px;">
          <button class="pill ${tbState.subject==='All'?'on':''}" onclick="tbSetSubject('All')">All <span class="count">${TEXTBOOKS.length}</span></button>
          ${SUBJECTS.map(s => { const n = TEXTBOOKS.filter(b => b.subj === s).length; return n ? `<button class="pill ${tbState.subject===s?'on':''}" onclick="tbSetSubject('${s}')">${s} <span class="count">${n}</span></button>` : ''; }).join('')}
        </div>
      </div>
      ${topicsForSubject.length ? `
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:13px; padding-top:13px; border-top:1px solid var(--rule);">
        <span style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-right:2px;">Topic</span>
        <div class="st-chips">
          <button class="st-chip ${tbState.topic==='All'?'on':''}" onclick="tbState.topic='All'; navTo('textbooks')">All topics</button>
          ${topicsForSubject.map(t => `<button class="st-chip ${tbState.topic===t?'on':''}" onclick="tbState.topic='${t}'; navTo('textbooks')">${tbTopicName(t)} <span class="c">${TEXTBOOKS.filter(b=>b.topic===t&&b.subj===tbState.subject).length}</span></button>`).join('')}
        </div>
      </div>` : ''}
    </div>

    <div id="tbResults">${textbookResultsHTML()}</div>
  `;
}

function tbSetSubject(s){ tbState.subject = s; tbState.topic = 'All'; navTo('textbooks'); }
function renderTextbookResults(){ const el = document.getElementById('tbResults'); if (el) el.innerHTML = textbookResultsHTML(); }

function textbookResultsHTML(){
  const books = tbMatches();
  if (!books.length) return `<div class="st-empty"><i class="fa-solid fa-book-open"></i><b>No textbooks match your filters</b><span>Try a different subject, or clear the search.</span><div style="margin-top:16px;"><button class="btn btn-ghost btn-sm" onclick="tbState={subject:'All',topic:'All',q:''}; navTo('textbooks')"><i class="fa-solid fa-rotate-left"></i> Reset filters</button></div></div>`;
  const subjOrder = SUBJECTS.filter(s => books.some(b => b.subj === s));
  return subjOrder.map(subj => {
    const inSubj = books.filter(b => b.subj === subj);
    const topics = ['core', ...TOPICS.filter(t => t.subj === subj).map(t => t.id)].filter(t => inSubj.some(b => b.topic === t));
    return `<div class="bk-shelf">
      <div class="bk-subj"><h4>${subj}</h4><div class="rule"></div><div class="n">${inSubj.length} ${inSubj.length===1?'title':'titles'} · ${inSubj.reduce((s,b)=>s+b.pages,0).toLocaleString()} pages</div></div>
      ${topics.map(t => `
        <div class="bk-topic">${tbTopicName(t)}</div>
        <div class="bk-grid">${inSubj.filter(b => b.topic === t).map(bookCardHTML).join('')}</div>
      `).join('')}
    </div>`;
  }).join('');
}

function bookCardHTML(b){
  const got = tbDownloads().includes(b.id);
  return `<div class="bk-card">
    <div class="bk-cover ${tbCoverClass(b.subj)}" onclick="openBookPreview('${b.id}')" title="Preview contents">
      <i class="fa-solid ${b.tag==='Workbook'?'fa-pen-to-square':b.tag==='Reference'?'fa-list-ol':b.tag==='Past papers'?'fa-clipboard-list':'fa-book'}"></i>
      <div class="ed">${b.ed.split(' · ')[0]}</div>
    </div>
    <div class="bk-body">
      <div class="t">${b.title}${b.level==='PREMIUM'?'<span class="bk-badge">Premium</span>':''}</div>
      <div class="d">${b.desc}</div>
      <div class="bk-meta">
        <span><i class="fa-solid fa-file-lines"></i> ${b.pages} pp</span>
        <span><i class="fa-solid fa-weight-hanging"></i> ${b.size}</span>
        <span><i class="fa-solid fa-user-pen"></i> ${b.author}</span>
        ${got ? '<span style="color:var(--ok);"><i class="fa-solid fa-circle-check"></i> Downloaded</span>' : ''}
      </div>
      <div class="bk-acts">
        <button class="btn btn-primary btn-sm" onclick="downloadTextbookPDF('${b.id}')"><i class="fa-solid fa-download"></i> Download PDF</button>
        <button class="btn btn-ghost btn-sm" onclick="openBookPreview('${b.id}')"><i class="fa-solid fa-list"></i> Contents</button>
      </div>
    </div>
  </div>`;
}

/* ── Preview modal ── */
function stModal(html, width){
  let m = document.getElementById('stModal');
  if (!m){ m = document.createElement('div'); m.id = 'stModal'; m.className = 'modal-bg'; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m) stCloseModal(); }); }
  m.innerHTML = `<div class="modal" style="width:min(${width||600}px,100%); max-height:92vh; display:flex; flex-direction:column;">${html}</div>`;
  m.classList.add('show');
}
function stCloseModal(){ const m = document.getElementById('stModal'); if (m) m.classList.remove('show'); }

function openBookPreview(id){
  const b = TEXTBOOKS.find(x => x.id === id); if (!b) return;
  stModal(`
    <div class="modal-hd" style="border:none; background:linear-gradient(135deg,var(--navy-deep),var(--navy)); color:#fff; padding:24px; align-items:flex-start;">
      <div>
        <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold-soft); font-weight:700;">${b.subj} · ${tbTopicName(b.topic)} · ${b.tag}</div>
        <div style="font-family:var(--serif); font-size:21px; font-weight:600; margin-top:7px; line-height:1.2;">${b.title}</div>
        <div style="font-size:12px; color:rgba(255,255,255,.65); margin-top:6px;">${b.author} · ${b.ed} · ${b.pages} pages · ${b.size}</div>
      </div>
      <button class="modal-close" onclick="stCloseModal()" style="background:rgba(255,255,255,.1); color:#fff; border-color:rgba(255,255,255,.2); flex:0 0 30px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body" style="overflow-y:auto;">
      <div style="font-size:13px; color:var(--ink-2); line-height:1.6; margin-bottom:20px; text-wrap:pretty;">${b.desc}</div>
      <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700; margin-bottom:12px;">Table of contents</div>
      <div class="bk-chlist">${b.ch.map((c,i) => `<div><b>${String(i+1).padStart(2,'0')}</b><span>${c}</span></div>`).join('')}</div>
    </div>
    <div style="display:flex; gap:8px; padding:16px 24px; border-top:1px solid var(--rule); background:var(--paper); border-radius:0 0 var(--r-lg) var(--r-lg); justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="stCloseModal()">Close</button>
      <button class="btn btn-primary" onclick="downloadTextbookPDF('${b.id}')"><i class="fa-solid fa-download"></i> Download PDF</button>
    </div>
  `, 620);
}

function tbUploadPrompt(){
  stModal(`
    <div class="modal-hd"><div class="modal-title">Add Textbook</div><button class="modal-close" onclick="stCloseModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="fg full"><label>Title</label><input id="tbNewTitle" placeholder="Immunology Companion"></div>
        <div class="fg"><label>Subject</label><select id="tbNewSubj">${SUBJECTS.map(s => `<option>${s}</option>`).join('')}</select></div>
        <div class="fg"><label>Topic shelf</label><select id="tbNewTopic"><option value="core">Core & reference</option>${TOPICS.map(t => `<option value="${t.id}">${t.subj} · ${t.name}</option>`).join('')}</select></div>
        <div class="fg full"><label>Description</label><input id="tbNewDesc" placeholder="One line on what this covers"></div>
        <div class="fg"><label>Access level</label><select id="tbNewLevel"><option>ALL</option><option>PREMIUM</option></select></div>
        <div class="fg"><label>Pages</label><input id="tbNewPages" type="number" value="120"></div>
      </div>
      <label for="tbNewFile" style="display:block; cursor:pointer; margin-top:16px;">
        <div style="border:2px dashed var(--gold); border-radius:10px; padding:26px; text-align:center; background:var(--gold-pale);">
          <i class="fa-solid fa-file-pdf" style="font-size:32px; color:var(--gold); display:block; margin-bottom:10px;"></i>
          <div style="font-size:14px; font-weight:600; color:var(--ink);">Drop the PDF here</div>
          <div style="font-size:11.5px; color:var(--ink-3); margin-top:3px;">PDF · up to 60 MB</div>
        </div>
      </label>
      <input type="file" id="tbNewFile" accept=".pdf" style="display:none;" onchange="showToast(this.files[0]?.name + ' ready to publish')">
    </div>
    <div style="display:flex; gap:8px; padding:16px 24px; border-top:1px solid var(--rule); background:var(--paper); border-radius:0 0 var(--r-lg) var(--r-lg); justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="stCloseModal()">Cancel</button>
      <button class="btn btn-primary" onclick="tbSaveNew()"><i class="fa-solid fa-check"></i> Publish to library</button>
    </div>
  `, 620);
}
function tbSaveNew(){
  const title = document.getElementById('tbNewTitle')?.value.trim();
  if (!title){ showToast('Give the textbook a title first'); return; }
  TEXTBOOKS.push({
    id: 'tb-' + Date.now(), subj: document.getElementById('tbNewSubj').value, topic: document.getElementById('tbNewTopic').value,
    title, author: state.user.name, ed: '2026', pages: parseInt(document.getElementById('tbNewPages').value) || 100,
    size: '—', level: document.getElementById('tbNewLevel').value, tag: 'Subject text',
    desc: document.getElementById('tbNewDesc').value || 'Newly published FMA resource.', ch: ['Chapter 1','Chapter 2','Chapter 3']
  });
  stCloseModal(); navTo('textbooks'); showToast('“' + title + '” published to the library');
}

/* ── PDF generation ── */
function downloadTextbookPDF(id){
  const b = TEXTBOOKS.find(x => x.id === id); if (!b) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const W = 210;
  // Cover
  doc.setFillColor(8, 42, 82); doc.rect(0, 0, W, 297, 'F');
  doc.setFillColor(31, 138, 138); doc.rect(0, 0, 8, 297, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('FUTURE MEDSACADEMY', 22, 34);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(160, 210, 210);
  doc.text('IMAT PREPARATION SERIES · ' + b.subj.toUpperCase(), 22, 40);
  doc.setDrawColor(31,138,138); doc.setLineWidth(0.8); doc.line(22, 46, 96, 46);
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(28);
  doc.text(doc.splitTextToSize(b.title, 150), 22, 100);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(180, 205, 230);
  doc.text(doc.splitTextToSize(b.desc, 150), 22, 100 + doc.splitTextToSize(b.title, 150).length * 12 + 6);
  doc.setFontSize(10); doc.setTextColor(255,255,255);
  doc.text(b.author, 22, 250); doc.setTextColor(160,210,210); doc.setFontSize(9);
  doc.text(b.ed + '  ·  ' + b.pages + ' pages  ·  ' + b.tag, 22, 256);
  doc.setFontSize(8); doc.setTextColor(130,160,190);
  doc.text('Licensed to ' + (state.user?.name || 'FMA student') + ' · not for redistribution', 22, 278);

  // Contents
  doc.addPage(); pdfHeader(doc, 'TABLE OF CONTENTS');
  let y = 44;
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(8,42,82);
  doc.text(b.title, 14, y); y += 8;
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(90,114,137);
  doc.text(b.subj + ' · ' + tbTopicName(b.topic) + ' · ' + b.ed, 14, y); y += 10;
  b.ch.forEach((c,i) => {
    doc.setDrawColor(228,232,237); doc.line(14, y, 196, y); y += 7;
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(31,138,138);
    doc.text(String(i+1).padStart(2,'0'), 14, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(20,31,46);
    doc.text(c, 26, y);
    doc.setFontSize(9); doc.setTextColor(150,160,170);
    doc.text(String(6 + Math.round(i * b.pages / b.ch.length)), 196, y, { align:'right' });
    y += 6;
  });
  pdfFooter(doc, 2, b.ch.length + 2);

  // Chapter openers
  b.ch.forEach((c, i) => {
    doc.addPage(); pdfHeader(doc, b.title.toUpperCase());
    let yy = 46;
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(31,138,138);
    doc.text('CHAPTER ' + (i+1), 14, yy); yy += 9;
    doc.setFontSize(18); doc.setTextColor(8,42,82);
    doc.text(doc.splitTextToSize(c, 180), 14, yy); yy += 14;
    doc.setDrawColor(31,138,138); doc.setLineWidth(0.6); doc.line(14, yy, 60, yy); yy += 12;
    doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(60,72,84);
    doc.text(doc.splitTextToSize('Learning objectives for this chapter, the syllabus points it covers, worked examples and the end-of-chapter question set are laid out on the following pages. Study this chapter alongside the ' + b.subj + ' lecture series in the FMA video library, then attempt the matching set in the Practice Lab.', 180), 14, yy);
    yy += 34;
    doc.setFillColor(240, 247, 250); doc.rect(14, yy, 182, 30, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(8,42,82);
    doc.text('BEFORE YOU START', 20, yy + 9);
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(60,72,84);
    doc.text(doc.splitTextToSize('Review the previous chapter summary and the formula sheet. Allow 90 minutes for the reading and 30 minutes for the questions.', 170), 20, yy + 17);
    pdfFooter(doc, i + 3, b.ch.length + 2);
  });

  doc.save(b.title.replace(/[^a-z0-9]+/gi, '_') + '_FMA.pdf');
  tbMarkDownloaded(b.id);
  showToast('Downloading “' + b.title + '”');
  renderTextbookResults();
}
