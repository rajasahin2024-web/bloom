/* ═══════════════════════════════════════════════════════════════
   FEATURE 2 · PRACTICE LAB (student quiz builder)
   Subject → topics → length → generated quiz, grouped by topic,
   with full answer review and tracked history.
   Depends on: TOPICS, SUBJECTS, pageHead(), showToast(), navTo(), jsPDF
═══════════════════════════════════════════════════════════════ */

const QUIZ_BANK = {
  'cell-bio': [
    { t:'Which organelle is primarily responsible for ATP synthesis by oxidative phosphorylation?', o:['Ribosome','Mitochondrion','Golgi apparatus','Lysosome'], c:1, d:1, e:'The inner mitochondrial membrane houses the electron transport chain and ATP synthase, so oxidative phosphorylation occurs there.' },
    { t:'The rough endoplasmic reticulum is chiefly involved in:', o:['Lipid and steroid synthesis','Detoxification of drugs','Synthesis and folding of secretory proteins','ATP production'], c:2, d:1, e:'Ribosomes on the rough ER translate proteins destined for secretion or for membranes; the lumen folds and glycosylates them. Smooth ER handles lipids and detoxification.' },
    { t:'During which stage of mitosis do sister chromatids separate and move to opposite poles?', o:['Prophase','Metaphase','Anaphase','Telophase'], c:2, d:1, e:'Cohesin is cleaved at anaphase onset, allowing spindle microtubules to pull sister chromatids apart.' },
    { t:'The Na⁺/K⁺-ATPase moves:', o:['2 Na⁺ out and 3 K⁺ in per ATP','3 Na⁺ out and 2 K⁺ in per ATP','3 Na⁺ in and 2 K⁺ out per ATP','Equal Na⁺ and K⁺ in opposite directions'], c:1, d:2, e:'The pump is electrogenic: 3 Na⁺ leave and 2 K⁺ enter per ATP hydrolysed, creating a net outward positive charge movement.' },
  ],
  'genetics': [
    { t:'Two heterozygous individuals (Aa × Aa) are crossed. What is the expected phenotypic ratio in the offspring?', o:['1 : 1','3 : 1','1 : 2 : 1','9 : 3 : 3 : 1'], c:1, d:1, e:'Genotypes are 1 AA : 2 Aa : 1 aa; since A is dominant, three offspring show the dominant phenotype for every one recessive — 3 : 1.' },
    { t:'A father has blood group AB and the mother group O. Which blood groups can their children have?', o:['A or B only','AB or O only','A, B, AB or O','O only'], c:0, d:2, e:'The father passes either I^A or I^B; the mother can only pass i. Offspring are therefore I^A i (group A) or I^B i (group B).' },
    { t:'A point mutation that changes a codon but not the amino acid encoded is called:', o:['Nonsense mutation','Missense mutation','Silent mutation','Frameshift mutation'], c:2, d:1, e:'The genetic code is degenerate — several codons specify the same amino acid, so some substitutions are phenotypically silent.' },
    { t:'In eukaryotes, which enzyme synthesises the RNA primer needed to begin DNA replication?', o:['DNA ligase','Primase','Helicase','Topoisomerase'], c:1, d:2, e:'DNA polymerases can only extend an existing 3′-OH, so primase lays down a short RNA primer first.' },
  ],
  'evolution': [
    { t:'Natural selection acts most directly on:', o:['Genotypes','Phenotypes','Individual alleles','Whole species'], c:1, d:1, e:'Selection can only "see" expressed traits; allele frequencies change as a consequence of differential phenotype survival and reproduction.' },
    { t:'The independent evolution of similar traits in unrelated lineages is called:', o:['Divergent evolution','Convergent evolution','Coevolution','Genetic drift'], c:1, d:1, e:'Similar selective pressures produce analogous structures — for example the streamlined body of dolphins and sharks.' },
    { t:'Genetic drift has the greatest effect on allele frequencies in:', o:['Large, isolated populations','Small populations','Populations under strong selection','Populations with high mutation rates'], c:1, d:2, e:'Sampling error dominates when few individuals reproduce, so alleles can be fixed or lost by chance in small populations.' },
    { t:'Homologous structures in different species are best explained by:', o:['Similar function','Common ancestry','Convergent evolution','Random mutation'], c:1, d:1, e:'Homology means shared ancestry with subsequent modification — the pentadactyl limb is the classic example.' },
  ],
  'microbiology': [
    { t:'Penicillin acts by interfering with the synthesis of which bacterial structure?', o:['Ribosome','Peptidoglycan cell wall','Plasma membrane','DNA gyrase'], c:1, d:1, e:'β-lactams inhibit transpeptidases that cross-link peptidoglycan, so the wall fails during growth and the cell lyses.' },
    { t:'Viruses are obligate intracellular parasites mainly because they lack:', o:['Nucleic acid','A protein coat','Ribosomes and metabolic machinery','Any genetic information'], c:2, d:1, e:'Without ribosomes, tRNA or ATP-generating pathways, a virus must use host machinery to replicate.' },
    { t:'The outer membrane of Gram-negative bacteria contains an endotoxin known as:', o:['Lipopolysaccharide','Teichoic acid','Mycolic acid','Peptidoglycan'], c:0, d:2, e:'LPS (lipid A) triggers strong innate immune activation and is responsible for septic shock in Gram-negative infection.' },
    { t:'Which immunoglobulin class crosses the placenta to give passive immunity to the fetus?', o:['IgA','IgE','IgG','IgM'], c:2, d:2, e:'IgG is the only class transported across the placenta by FcRn receptors.' },
  ],
  'atomic': [
    { t:'How many neutrons are present in an atom of ⁵⁶Fe (Z = 26)?', o:['26','30','56','82'], c:1, d:1, e:'Neutrons = mass number − atomic number = 56 − 26 = 30.' },
    { t:'An element with the configuration 1s² 2s² 2p⁶ 3s² 3p⁵ is:', o:['Sulfur','Chlorine','Argon','Phosphorus'], c:1, d:2, e:'The configuration accounts for 17 electrons, which is chlorine — one electron short of a full 3p subshell.' },
    { t:'Moving from left to right across a period, atomic radius generally:', o:['Increases','Decreases','Stays constant','Increases then decreases'], c:1, d:1, e:'Nuclear charge rises while electrons enter the same shell, so effective nuclear attraction increases and the radius contracts.' },
    { t:'The hybridisation of the carbon atom in carbon dioxide (CO₂) is:', o:['sp','sp²','sp³','sp³d'], c:0, d:2, e:'CO₂ is linear with two σ bonds and two π bonds, which requires sp hybridisation of carbon.' },
  ],
  'organic': [
    { t:'Which functional group characterises a carboxylic acid?', o:['–OH','–CHO','–COOH','–NH₂'], c:2, d:1, e:'A carboxyl group is a carbonyl bonded to a hydroxyl; resonance stabilisation of the anion makes it acidic.' },
    { t:'The reaction of an alkene with bromine in the dark proceeds by:', o:['Free-radical substitution','Electrophilic addition','Nucleophilic substitution','Elimination'], c:1, d:2, e:'The π electrons attack Br₂, forming a cyclic bromonium ion that is opened by bromide — electrophilic addition, anti-stereochemistry.' },
    { t:'How many structural isomers has C₄H₁₀?', o:['1','2','3','4'], c:1, d:1, e:'Butane and 2-methylpropane (isobutane) are the only two constitutional isomers.' },
    { t:'Which of the following is a tertiary alcohol?', o:['Butan-1-ol','Butan-2-ol','2-methylpropan-2-ol','2-methylpropan-1-ol'], c:2, d:2, e:'Its hydroxyl carbon is bonded to three other carbon atoms, which is the definition of a tertiary alcohol.' },
  ],
  'biochem': [
    { t:'A low Km value for an enzyme–substrate pair indicates:', o:['Low affinity for the substrate','High affinity for the substrate','A high maximum velocity','Irreversible inhibition'], c:1, d:2, e:'Km is the substrate concentration at half Vmax, so a small Km means the enzyme is saturated at low substrate — high affinity.' },
    { t:'A classic competitive inhibitor changes the kinetics of an enzyme by:', o:['Lowering Vmax, Km unchanged','Raising apparent Km, Vmax unchanged','Lowering both Km and Vmax','Raising both Km and Vmax'], c:1, d:3, e:'It competes for the active site, so more substrate is needed to reach half Vmax; excess substrate still achieves the same Vmax.' },
    { t:'What is the net ATP yield of glycolysis per molecule of glucose?', o:['1','2','4','36'], c:1, d:1, e:'Four ATP are produced by substrate-level phosphorylation and two are consumed in the investment phase — a net gain of two.' },
    { t:'A peptide bond forms between:', o:['Two amino groups','Two carboxyl groups','The carboxyl group of one amino acid and the amino group of the next','Two side chains'], c:2, d:1, e:'It is a condensation (amide) linkage that releases one molecule of water.' },
  ],
  'stoich': [
    { t:'How many moles are present in 36 g of water (M = 18 g/mol)?', o:['0.5 mol','1 mol','2 mol','18 mol'], c:2, d:1, e:'n = m / M = 36 / 18 = 2 mol.' },
    { t:'What is the molarity of a solution containing 0.5 mol of solute in 250 mL of solution?', o:['0.125 M','0.5 M','2 M','5 M'], c:2, d:1, e:'c = n / V = 0.5 mol / 0.250 L = 2 mol/L.' },
    { t:'In the balanced combustion C₃H₈ + xO₂ → 3CO₂ + 4H₂O, what is x?', o:['3','4','5','7'], c:2, d:2, e:'Oxygen atoms needed: (3×2) + (4×1) = 10, so five O₂ molecules are required.' },
    { t:'What volume does 1 mol of an ideal gas occupy at STP (0 °C, 1 atm)?', o:['11.2 L','22.4 L','24.0 L','44.8 L'], c:1, d:1, e:'The molar volume at standard temperature and pressure is 22.4 litres.' },
  ],
  'mechanics': [
    { t:'A ball is thrown vertically upwards. At the highest point of its flight its acceleration is:', o:['Zero','9.8 m/s² upwards','9.8 m/s² downwards','Equal to its initial velocity'], c:2, d:2, e:'Velocity is momentarily zero but gravity acts throughout, so acceleration remains g downwards.' },
    { t:'The work done by the centripetal force on a body in uniform circular motion is:', o:['Zero','Positive and constant','Negative and constant','Equal to the kinetic energy'], c:0, d:2, e:'The force is always perpendicular to the displacement, so W = F·d·cos 90° = 0.' },
    { t:'A net force of 10 N acts on a 2 kg mass. Its acceleration is:', o:['0.2 m/s²','5 m/s²','12 m/s²','20 m/s²'], c:1, d:1, e:'a = F / m = 10 / 2 = 5 m/s².' },
    { t:'Two objects of different mass fall freely in a vacuum from the same height. They:', o:['Land at the same time','The heavier lands first','The lighter lands first','Depends on their volume'], c:0, d:1, e:'In the absence of air resistance all bodies accelerate at g regardless of mass.' },
  ],
  'electromag': [
    { t:'A 3 Ω and a 6 Ω resistor are connected in parallel. The equivalent resistance is:', o:['0.5 Ω','2 Ω','4.5 Ω','9 Ω'], c:1, d:1, e:'1/R = 1/3 + 1/6 = 1/2, so R = 2 Ω — always smaller than the smallest branch.' },
    { t:'A charged particle moves parallel to a uniform magnetic field. The magnetic force on it is:', o:['Zero','Maximum','Perpendicular to the field','Along the field'], c:0, d:2, e:'F = qvB sin θ; with θ = 0° the sine term vanishes.' },
    { t:'If the voltage across a fixed resistor is doubled, the power dissipated:', o:['Halves','Doubles','Quadruples','Stays the same'], c:2, d:2, e:'P = V²/R, so power scales with the square of the voltage.' },
    { t:'Faraday\'s law states that the induced EMF in a circuit is proportional to:', o:['The magnetic flux','The rate of change of magnetic flux','The current in the circuit','The resistance of the circuit'], c:1, d:2, e:'EMF = −dΦ/dt; a static flux, however large, induces nothing.' },
  ],
  'thermo': [
    { t:'The first law of thermodynamics for a closed system is written:', o:['ΔU = Q + W','ΔU = Q − W','Q = ΔU × W','ΔU = W − Q'], c:1, d:1, e:'With the physics sign convention, internal energy change equals heat added minus work done by the system.' },
    { t:'For an ideal gas undergoing an isothermal expansion:', o:['ΔU = 0','Q = 0','W = 0','ΔS = 0'], c:0, d:2, e:'Internal energy of an ideal gas depends only on temperature, so constant T means ΔU = 0 and Q = W.' },
    { t:'In any spontaneous process, the entropy of the universe:', o:['Decreases','Stays constant','Increases','Can do any of these'], c:2, d:1, e:'That is the second law: ΔS_universe > 0 for an irreversible (spontaneous) change.' },
    { t:'How much heat is needed to raise 2 kg of water by 10 °C? (c = 4.18 kJ·kg⁻¹·K⁻¹)', o:['8.4 kJ','41.8 kJ','83.6 kJ','836 kJ'], c:2, d:2, e:'Q = mcΔT = 2 × 4.18 × 10 = 83.6 kJ.' },
  ],
  'skeletal': [
    { t:'How many bones are there in the typical adult human skeleton?', o:['186','206','226','256'], c:1, d:1, e:'206 in adults; neonates have around 270 before fusion of, for example, the sacrum and cranial bones.' },
    { t:'Which is the longest bone in the human body?', o:['Tibia','Humerus','Femur','Fibula'], c:2, d:1, e:'The femur is both the longest and the strongest bone.' },
    { t:'The shoulder (glenohumeral) joint is an example of a:', o:['Hinge joint','Pivot joint','Ball-and-socket joint','Saddle joint'], c:2, d:1, e:'The humeral head articulates with the shallow glenoid fossa, allowing movement in three planes.' },
    { t:'How many cervical vertebrae does the human vertebral column contain?', o:['5','7','12','24'], c:1, d:1, e:'Seven cervical, twelve thoracic, five lumbar, plus the fused sacrum and coccyx.' },
  ],
  'cardio': [
    { t:'Which vessel carries deoxygenated blood from the heart to the lungs?', o:['Pulmonary vein','Pulmonary artery','Aorta','Superior vena cava'], c:1, d:1, e:'It is the only artery carrying deoxygenated blood, leaving the right ventricle for the lungs.' },
    { t:'The valve between the left atrium and the left ventricle is the:', o:['Tricuspid valve','Mitral valve','Aortic valve','Pulmonary valve'], c:1, d:1, e:'Also called the bicuspid valve; the tricuspid sits on the right side.' },
    { t:'The natural pacemaker of the heart is the:', o:['Atrioventricular node','Sinoatrial node','Bundle of His','Purkinje fibres'], c:1, d:1, e:'The SA node in the right atrial wall depolarises spontaneously at the fastest intrinsic rate.' },
    { t:'Which chamber of the heart has the thickest muscular wall?', o:['Right atrium','Left atrium','Right ventricle','Left ventricle'], c:3, d:1, e:'It must generate enough pressure to perfuse the entire systemic circulation.' },
  ],
  'nervous': [
    { t:'Myelin in the central nervous system is produced by:', o:['Schwann cells','Oligodendrocytes','Astrocytes','Microglia'], c:1, d:2, e:'Oligodendrocytes myelinate multiple CNS axons; Schwann cells do the equivalent job in the peripheral nervous system.' },
    { t:'The neurotransmitter released at the neuromuscular junction is:', o:['Dopamine','Noradrenaline','Acetylcholine','GABA'], c:2, d:1, e:'ACh binds nicotinic receptors on the motor end plate, triggering muscle depolarisation.' },
    { t:'The resting membrane potential of a neuron is around −70 mV mainly because of:', o:['Voltage-gated Na⁺ channels','K⁺ leak channels and the Na⁺/K⁺ pump','Ca²⁺ influx','Chloride pumps'], c:1, d:3, e:'The membrane is far more permeable to K⁺ at rest, and the electrogenic pump maintains the gradients.' },
    { t:'Which brain region is primarily responsible for coordination and balance?', o:['Cerebrum','Cerebellum','Medulla oblongata','Hypothalamus'], c:1, d:1, e:'The cerebellum fine-tunes motor output and maintains posture and equilibrium.' },
  ],
  'vocab': [
    { t:'The term "hepatomegaly" refers to:', o:['Inflammation of the liver','Enlargement of the liver','Removal of the liver','Liver failure'], c:1, d:1, e:'hepat- (liver) + -megaly (enlargement). Inflammation would be hepatitis.' },
    { t:'The prefix "brady-" means:', o:['Fast','Slow','Difficult','Absent'], c:1, d:1, e:'Bradycardia is a slow heart rate; tachy- is its opposite.' },
    { t:'The suffix "-ectomy" denotes:', o:['Surgical removal','Surgical repair','Viewing with an instrument','Creating an opening'], c:0, d:1, e:'Compare -plasty (repair), -scopy (viewing) and -stomy (opening).' },
    { t:'"Dyspnoea" describes:', o:['Absence of breathing','Rapid breathing','Difficult or laboured breathing','Painful swallowing'], c:2, d:1, e:'dys- (difficult) + -pnoea (breathing). Apnoea is absence, tachypnoea is rapid breathing.' },
  ],
  'reading': [
    { t:'The function of a topic sentence in an academic paragraph is to:', o:['Introduce supporting evidence','State the main idea of the paragraph','Provide a counter-argument','Cite the source'], c:1, d:1, e:'It announces the claim the rest of the paragraph develops — locating it quickly is the fastest route to the answer.' },
    { t:'If an author\'s tone is described as sceptical, the author most likely:', o:['Fully endorses the claims','Doubts the claims presented','Is indifferent to the claims','Is hostile towards the reader'], c:1, d:2, e:'Scepticism signals reserved doubt, not outright rejection — watch for hedging language such as "purportedly".' },
    { t:'In argument analysis, an assumption is best defined as:', o:['A stated premise','An unstated premise the conclusion depends on','The conclusion itself','A piece of statistical evidence'], c:1, d:2, e:'Negate a true assumption and the argument collapses — that is the standard test.' },
    { t:'A conclusion that does not follow logically from its premises is a:', o:['Tautology','Syllogism','Non sequitur','Corollary'], c:2, d:2, e:'Non sequitur literally means "it does not follow".' },
  ],
  'verbal': [
    { t:'All medics are graduates. Some graduates are researchers. Which statement must be true?', o:['Some medics are researchers','All researchers are medics','No medics are researchers','None of the above must be true'], c:3, d:3, e:'The two premises share only the middle term "graduates" in an undistributed way, so no valid conclusion links medics to researchers.' },
    { t:'No A are B. All C are B. Therefore:', o:['No C are A','All C are A','Some C are A','Nothing follows'], c:0, d:2, e:'Every C sits inside B, and A is entirely outside B, so no C can be an A.' },
    { t:'Which of the following would most strengthen the argument "Students who sleep eight hours score higher, so schools should start later"?', o:['Some students prefer early starts','Later starts increased average sleep to eight hours in a trial','Sleep quality varies between students','Exam scores rose nationally last year'], c:1, d:2, e:'It supplies the missing link between the proposed policy and the mechanism the argument relies on.' },
    { t:'Physician is to patient as lawyer is to:', o:['Court','Client','Judge','Contract'], c:1, d:1, e:'The relationship is professional-to-person-served.' },
  ],
  'numerical': [
    { t:'What is the next number in the sequence 2, 6, 12, 20, 30, …?', o:['36','40','42','56'], c:2, d:2, e:'Differences increase by two each time (4, 6, 8, 10, 12), so 30 + 12 = 42. The terms are n(n+1).' },
    { t:'What is 15% of 240?', o:['24','30','36','42'], c:2, d:1, e:'10% is 24, 5% is 12, so 15% is 36.' },
    { t:'A price rises by 20% and then falls by 20%. Overall the price has:', o:['Returned to its original value','Fallen by 4%','Risen by 4%','Fallen by 40%'], c:1, d:2, e:'1.20 × 0.80 = 0.96, so a net 4% decrease.' },
    { t:'The mean of five numbers is 12. A sixth number, 18, is added. The new mean is:', o:['12','13','14','15'], c:1, d:2, e:'Total was 60; it becomes 78 over six values, giving a mean of 13.' },
  ],
};

const QL_ACTIVITY = { practice:'Untimed practice', timed:'Timed drill' };
let qlState = { view:'build', step:1, subjects:[], topics:[], count:15, mode:'practice', feedback:true, quiz:[], answers:{}, idx:0, startedAt:null, reviewFilter:'all' };

/* ── storage ── */
function qlHistory(){ try { return JSON.parse(localStorage.getItem('fma_quiz_history') || '[]'); } catch(e){ return []; } }
function qlSaveHistory(h){ try { localStorage.setItem('fma_quiz_history', JSON.stringify(h.slice(0,40))); } catch(e){} }
function qlSaveActive(){
  try {
    if (qlState.view === 'run') localStorage.setItem('fma_quiz_active', JSON.stringify({ quiz:qlState.quiz, answers:qlState.answers, idx:qlState.idx, subjects:qlState.subjects, topics:qlState.topics, mode:qlState.mode, feedback:qlState.feedback, startedAt:qlState.startedAt }));
    else localStorage.removeItem('fma_quiz_active');
  } catch(e){}
}
function qlActive(){ try { return JSON.parse(localStorage.getItem('fma_quiz_active') || 'null'); } catch(e){ return null; } }

/* ── helpers ── */
function qlQ(ref){ return QUIZ_BANK[ref.tp][ref.i]; }
function qlTopic(id){ return TOPICS.find(t => t.id === id) || { name:id, subj:'—' }; }
function qlBankCount(topicId){ return (QUIZ_BANK[topicId] || []).length; }
function qlSubjectCount(subj){ return TOPICS.filter(t => t.subj === subj).reduce((s,t) => s + qlBankCount(t.id), 0); }
function qlAvailable(){ return qlState.topics.reduce((s,t) => s + qlBankCount(t), 0); }
function qlTopicAccuracy(){
  const acc = {};
  qlHistory().forEach(h => Object.entries(h.byTopic || {}).forEach(([t,v]) => { acc[t] = acc[t] || { c:0, n:0 }; acc[t].c += v.c; acc[t].n += v.n; }));
  return acc;
}

/* ── section ── */
function sec_quizlab(){
  if (qlState.view === 'run') return qlRunHTML();
  if (qlState.view === 'review') return qlReviewHTML();
  return qlBuildHTML();
}

function qlBuildHTML(){
  const hist = qlHistory(), active = qlActive();
  const attempts = hist.length;
  const answered = hist.reduce((s,h) => s + h.n, 0);
  const avg = attempts ? Math.round(hist.reduce((s,h) => s + h.pct, 0) / attempts) : 0;
  const acc = qlTopicAccuracy();
  const weakest = Object.entries(acc).filter(([,v]) => v.n >= 2).sort((a,b) => (a[1].c/a[1].n) - (b[1].c/b[1].n))[0];
  return `
    ${pageHead({
      eyebrow: 'Practice Lab',
      title: `Build your own <em>quiz</em>`,
      sub: 'Pick a subject, choose the topics you want to drill, set the length — we assemble the paper and show every answer and explanation at the end.',
      actions: attempts ? `<button class="btn btn-ghost btn-sm" onclick="qlOpenHistory()"><i class="fa-solid fa-clock-rotate-left"></i> My attempts (${attempts})</button>` : ''
    })}

    <div class="st-stats">
      <div class="st-stat"><div class="lbl">Question bank</div><div class="val">${Object.values(QUIZ_BANK).reduce((s,a)=>s+a.length,0)}</div><div class="sub">Across ${Object.keys(QUIZ_BANK).length} topics · full explanations</div></div>
      <div class="st-stat"><div class="lbl">Quizzes taken</div><div class="val teal">${attempts}</div><div class="sub">${answered} questions answered</div></div>
      <div class="st-stat"><div class="lbl">Average score</div><div class="val ${avg>=70?'ok':''}">${attempts?avg+'%':'—'}</div><div class="sub">${attempts?'Across all attempts':'Take your first quiz'}</div></div>
      <div class="st-stat"><div class="lbl">Weakest topic</div><div class="val" style="font-size:16px; line-height:1.25;">${weakest?qlTopic(weakest[0]).name:'—'}</div><div class="sub">${weakest?Math.round(weakest[1].c/weakest[1].n*100)+'% correct so far':'Needs more data'}</div></div>
    </div>

    ${active && active.quiz?.length ? `
    <div class="card mb-5" style="border:1.5px solid var(--gold); background:linear-gradient(180deg,var(--gold-pale),var(--surface));">
      <div class="card-body" style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
        <div style="font-size:26px; color:var(--gold);"><i class="fa-solid fa-hourglass-half"></i></div>
        <div style="flex:1; min-width:240px;">
          <div style="font-size:14.5px; font-weight:700; color:var(--ink);">You have a quiz in progress</div>
          <div style="font-size:12px; color:var(--ink-3); margin-top:3px;">${Object.keys(active.answers||{}).length} of ${active.quiz.length} answered · ${active.topics.map(t=>qlTopic(t).name).slice(0,3).join(', ')}${active.topics.length>3?' +'+(active.topics.length-3):''}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="qlDiscardActive()">Discard</button>
          <button class="btn btn-primary btn-sm" onclick="qlResume()"><i class="fa-solid fa-play"></i> Resume quiz</button>
        </div>
      </div>
    </div>` : ''}

    <div class="st-steps">
      ${[['1','Subject'],['2','Topics'],['3','Length']].map((s,i) => {
        const n = i + 1;
        return `<div class="s ${qlState.step===n?'on':qlState.step>n?'done':''}"><div class="n">${qlState.step>n?'<i class="fa-solid fa-check" style="font-size:10px;"></i>':s[0]}</div><div class="lb">${s[1]}</div></div>${i<2?`<div class="bar ${qlState.step>n?'fill':''}"></div>`:''}`;
      }).join('')}
    </div>

    <div class="st-stage">${qlStepHTML()}</div>

    ${hist.length ? `
    <div class="card" style="margin-top:28px;">
      <div class="card-hd"><div><div class="card-title">Recent attempts</div><div class="card-sub">Every quiz you build is saved — reopen one to review the answers again</div></div>
      <button class="btn btn-ghost btn-sm" onclick="qlOpenHistory()">Topic breakdown <i class="fa-solid fa-arrow-right"></i></button></div>
      <div class="card-body" style="padding:0;">
        ${hist.slice(0,5).map(h => `
          <div style="display:flex; gap:14px; align-items:center; padding:13px 22px; border-bottom:1px solid var(--rule);">
            <div style="width:44px; height:44px; flex:0 0 44px; border-radius:10px; display:grid; place-items:center; background:${h.pct>=70?'var(--ok-pale)':h.pct>=50?'var(--gold-pale)':'var(--err-pale)'}; color:${h.pct>=70?'var(--ok)':h.pct>=50?'var(--gold)':'var(--err)'}; font-family:var(--mono); font-size:13px; font-weight:700;">${h.pct}%</div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:13.5px; font-weight:600; color:var(--ink);">${h.title}</div>
              <div style="font-family:var(--mono); font-size:10.5px; color:var(--ink-4); margin-top:3px;">${h.date} · ${h.correct}/${h.n} correct · ${QL_ACTIVITY[h.mode]||'Practice'}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="qlReopen('${h.id}')"><i class="fa-solid fa-rotate-left"></i> Review</button>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  `;
}

function qlStepHTML(){
  if (qlState.step === 1){
    return `
      <div class="st-stage-hd"><div class="eb">Step 1 of 3</div><h3>Which <em>subjects</em>?</h3><p>Choose one or more. The topic list on the next step follows your choice.</p></div>
      <div class="st-grid">
        ${SUBJECTS.filter(s => qlSubjectCount(s) > 0).map(s => {
          const on = qlState.subjects.includes(s);
          const ic = s==='Biology'?'fa-dna':s==='Chemistry'?'fa-flask':s==='Physics'?'fa-atom':s==='Anatomy'?'fa-heart-pulse':s==='English'?'fa-book-open':'fa-brain';
          return `<div class="st-tile ${on?'on':''}" onclick="qlToggleSubject('${s}')"><span class="tick"><i class="fa-solid fa-circle-check"></i></span><div class="ic"><i class="fa-solid ${ic}"></i></div><div class="nm">${s}</div><div class="mt">${qlSubjectCount(s)} questions</div></div>`;
        }).join('')}
      </div>
      <div class="st-actions">
        <button class="btn btn-ghost btn-sm" onclick="qlAllSubjects()"><i class="fa-solid fa-check-double"></i> Select all subjects</button>
        <button class="btn btn-primary" ${qlState.subjects.length?'':'disabled style="opacity:.45; cursor:not-allowed;"'} onclick="qlNext()">Choose topics <i class="fa-solid fa-arrow-right"></i></button>
      </div>`;
  }
  if (qlState.step === 2){
    return `
      <div class="st-stage-hd"><div class="eb">Step 2 of 3</div><h3>Pick your <em>topics</em></h3><p>Select as many as you like — the quiz is grouped topic by topic so it reads like a real section.</p></div>
      ${qlState.subjects.map(s => {
        const ts = TOPICS.filter(t => t.subj === s && qlBankCount(t.id) > 0);
        const allOn = ts.every(t => qlState.topics.includes(t.id));
        return `<div style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:11px;">
            <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700;">${s}</div>
            <div style="flex:1; height:1px; background:var(--rule);"></div>
            <button class="st-chip hollow" onclick="qlToggleSubjectTopics('${s}')">${allOn?'Clear':'Select all'}</button>
          </div>
          <div class="st-chips">
            ${ts.map(t => `<button class="st-chip ${qlState.topics.includes(t.id)?'on':''}" onclick="qlToggleTopic('${t.id}')">${t.name} <span class="c">${qlBankCount(t.id)}</span></button>`).join('')}
          </div>
        </div>`;
      }).join('')}
      <div class="st-actions">
        <button class="btn btn-ghost" onclick="qlBack()"><i class="fa-solid fa-arrow-left"></i> Subjects</button>
        <div style="display:flex; gap:12px; align-items:center;">
          <span style="font-family:var(--mono); font-size:11.5px; color:var(--ink-4);">${qlState.topics.length} topics · ${qlAvailable()} questions available</span>
          <button class="btn btn-primary" ${qlState.topics.length?'':'disabled style="opacity:.45; cursor:not-allowed;"'} onclick="qlNext()">Set length <i class="fa-solid fa-arrow-right"></i></button>
        </div>
      </div>`;
  }
  const max = Math.min(40, qlAvailable());
  qlState.count = Math.min(qlState.count, max);
  return `
    <div class="st-stage-hd"><div class="eb">Step 3 of 3</div><h3>How <em>long</em>?</h3><p>We recommend 15–20 questions in one sitting. Questions are shared out evenly across the topics you picked.</p></div>
    <div style="max-width:560px; margin:0 auto; text-align:center;">
      <input class="st-range" type="range" min="5" max="${max}" step="1" value="${qlState.count}" oninput="qlState.count=+this.value; document.getElementById('qlCountVal').textContent=this.value; document.getElementById('qlMins').textContent=Math.round(this.value*1.5)+' min';">
      <div style="display:flex; justify-content:center; gap:16px; margin-top:20px; align-items:stretch;">
        <div class="st-num"><b id="qlCountVal">${qlState.count}</b><span>Questions</span></div>
        <div class="st-num"><b id="qlMins" style="font-size:22px; padding-top:6px;">${Math.round(qlState.count*1.5)} min</b><span>Est. time</span></div>
        <div class="st-num"><b style="font-size:22px; padding-top:6px;">${qlState.topics.length}</b><span>Topics</span></div>
      </div>
      <div style="display:flex; flex-direction:column; gap:14px; align-items:center; margin-top:26px;">
        <div>
          <div style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:7px;">Mode</div>
          <div class="st-seg">
            <button class="${qlState.mode==='practice'?'on':''}" onclick="qlState.mode='practice'; qlRerender()">Untimed practice</button>
            <button class="${qlState.mode==='timed'?'on':''}" onclick="qlState.mode='timed'; qlRerender()">Timed drill</button>
          </div>
        </div>
        <div>
          <div style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:7px;">Explanations</div>
          <div class="st-seg teal">
            <button class="${qlState.feedback?'on':''}" onclick="qlState.feedback=true; qlRerender()">Reveal as I answer</button>
            <button class="${!qlState.feedback?'on':''}" onclick="qlState.feedback=false; qlRerender()">Only at the end</button>
          </div>
        </div>
      </div>
    </div>
    <div class="st-actions">
      <button class="btn btn-ghost" onclick="qlBack()"><i class="fa-solid fa-arrow-left"></i> Topics</button>
      <button class="btn btn-primary" onclick="qlGenerate()"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate my quiz</button>
    </div>`;
}

/* ── wizard actions ── */
function qlRerender(){ const el = document.querySelector('.st-stage'); if (el) el.innerHTML = qlStepHTML(); else navTo('quizlab'); }
function qlNext(){ qlState.step = Math.min(3, qlState.step + 1); navTo('quizlab'); }
function qlBack(){ qlState.step = Math.max(1, qlState.step - 1); navTo('quizlab'); }
function qlToggleSubject(s){
  const i = qlState.subjects.indexOf(s);
  if (i >= 0){ qlState.subjects.splice(i,1); qlState.topics = qlState.topics.filter(t => qlTopic(t).subj !== s); }
  else qlState.subjects.push(s);
  qlRerender();
}
function qlAllSubjects(){ qlState.subjects = SUBJECTS.filter(s => qlSubjectCount(s) > 0); qlRerender(); }
function qlToggleTopic(id){
  const i = qlState.topics.indexOf(id);
  if (i >= 0) qlState.topics.splice(i,1); else qlState.topics.push(id);
  qlRerender();
}
function qlToggleSubjectTopics(s){
  const ts = TOPICS.filter(t => t.subj === s && qlBankCount(t.id) > 0).map(t => t.id);
  const allOn = ts.every(t => qlState.topics.includes(t));
  qlState.topics = allOn ? qlState.topics.filter(t => !ts.includes(t)) : [...new Set([...qlState.topics, ...ts])];
  qlRerender();
}

function qlGenerate(){
  // Even share across topics, ordered topic by topic (subject order preserved)
  const ordered = SUBJECTS.flatMap(s => TOPICS.filter(t => t.subj === s && qlState.topics.includes(t.id)).map(t => t.id));
  const pools = {}; ordered.forEach(t => { pools[t] = [...(QUIZ_BANK[t]||[]).keys()].sort(() => Math.random() - 0.5); });
  const picked = {}; ordered.forEach(t => picked[t] = []);
  let remaining = qlState.count, guard = 0;
  while (remaining > 0 && guard < 500){
    let took = false;
    for (const t of ordered){ if (remaining <= 0) break; if (pools[t].length){ picked[t].push(pools[t].shift()); remaining--; took = true; } }
    if (!took) break; guard++;
  }
  qlState.quiz = ordered.flatMap(t => picked[t].sort((a,b) => a-b).map(i => ({ tp:t, i })));
  qlState.answers = {}; qlState.idx = 0; qlState.startedAt = Date.now(); qlState.view = 'run';
  qlSaveActive(); navTo('quizlab');
}
function qlResume(){
  const a = qlActive(); if (!a) return;
  Object.assign(qlState, { quiz:a.quiz, answers:a.answers||{}, idx:a.idx||0, subjects:a.subjects||[], topics:a.topics||[], mode:a.mode||'practice', feedback:a.feedback!==false, startedAt:a.startedAt||Date.now(), view:'run' });
  navTo('quizlab');
}
function qlDiscardActive(){ try { localStorage.removeItem('fma_quiz_active'); } catch(e){} navTo('quizlab'); showToast('In-progress quiz discarded'); }

/* ── runner ── */
function qlRunHTML(){
  const total = qlState.quiz.length;
  const groups = qlGroups();
  return `
    ${pageHead({
      eyebrow: 'Practice Lab · ' + (qlState.mode === 'timed' ? 'Timed drill' : 'Untimed practice'),
      title: `My <em>quiz</em>`,
      sub: `${total} questions across ${qlState.topics.length} ${qlState.topics.length===1?'topic':'topics'} — your answers are saved as you go.`,
      actions: `<button class="btn btn-ghost btn-sm" onclick="qlAbandon()"><i class="fa-solid fa-xmark"></i> Exit</button>`
    })}
    <div class="grid-wide" style="grid-template-columns: 1fr 300px;">
      <div>
        <div id="qlQBox">${qlQuestionHTML()}</div>
        <div id="qlFoot" style="display:flex; gap:8px; align-items:center; margin-top:14px; padding:14px 20px; background:var(--surface); border:1px solid var(--rule); border-radius:var(--r);">${qlFootHTML()}</div>
      </div>
      <div>
        <div class="card" style="padding:18px;">
          <div style="font-size:9.5px; letter-spacing:1.6px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:12px;">Question map</div>
          <div id="qlMap">${qlMapHTML(groups)}</div>
          <button class="btn btn-primary" style="width:100%; justify-content:center; margin-top:14px;" onclick="qlSubmit()"><i class="fa-solid fa-paper-plane"></i> Submit quiz</button>
          <div style="font-size:11px; color:var(--ink-4); text-align:center; margin-top:9px;">Unanswered questions are marked as skipped.</div>
        </div>
      </div>
    </div>`;
}

function qlGroups(){
  const groups = [];
  qlState.quiz.forEach((r,i) => { const g = groups[groups.length-1]; if (g && g.tp === r.tp) g.idx.push(i); else groups.push({ tp:r.tp, idx:[i] }); });
  return groups;
}
function qlMapHTML(groups){
  const total = qlState.quiz.length, answered = Object.keys(qlState.answers).length;
  return (groups || qlGroups()).map(g => `
    <div style="margin-bottom:14px;">
      <div style="font-size:11px; font-weight:700; color:var(--navy); margin-bottom:7px;">${qlTopic(g.tp).name}</div>
      <div class="ql-grid">${g.idx.map(i => `<button class="ql-n ${i===qlState.idx?'cur':qlState.answers[i]!=null?'ans':''}" onclick="qlGoTo(${i})">${i+1}</button>`).join('')}</div>
    </div>`).join('') +
    `<div class="prog-bar" style="margin-top:6px;"><div class="prog-fill" style="width:${Math.round(answered/total*100)}%; background:var(--gold);"></div></div>`;
}
function qlFootHTML(){
  const total = qlState.quiz.length, answered = Object.keys(qlState.answers).length;
  return `<button class="btn btn-ghost btn-sm" onclick="qlNav(-1)" ${qlState.idx===0?'disabled style="opacity:.4;"':''}><i class="fa-solid fa-arrow-left"></i> Previous</button>
    <span style="font-family:var(--mono); font-size:11.5px; color:var(--ink-4); margin-left:auto;">${answered} of ${total} answered</span>
    ${qlState.idx === total-1
      ? `<button class="btn btn-gold btn-sm" onclick="qlSubmit()"><i class="fa-solid fa-flag-checkered"></i> Finish &amp; see answers</button>`
      : `<button class="btn btn-primary btn-sm" onclick="qlNav(1)">Next <i class="fa-solid fa-arrow-right"></i></button>`}`;
}
function qlPaint(){
  const box = document.getElementById('qlQBox');
  if (!box) { navTo('quizlab'); return; }
  box.innerHTML = qlQuestionHTML();
  document.getElementById('qlFoot').innerHTML = qlFootHTML();
  document.getElementById('qlMap').innerHTML = qlMapHTML();
}

function qlQuestionHTML(){
  const ref = qlState.quiz[qlState.idx], q = qlQ(ref), t = qlTopic(ref.tp);
  const given = qlState.answers[qlState.idx];
  const reveal = qlState.feedback && given != null;
  return `<div class="ql-q">
    <div class="ql-qmeta">
      <span class="tp">${t.subj} · ${t.name}</span>
      <span style="margin-left:auto; font-family:var(--mono);">Question ${qlState.idx+1} / ${qlState.quiz.length}</span>
      <span style="font-family:var(--mono);">Difficulty ${'●'.repeat(q.d)}${'○'.repeat(3-q.d)}</span>
    </div>
    <div class="ql-qtext">${q.t}</div>
    <div class="ql-opts">
      ${q.o.map((o,i) => {
        let cls = '';
        if (reveal){ if (i === q.c) cls = 'right'; else if (i === given) cls = 'wrong'; }
        else if (i === given) cls = 'sel';
        return `<div class="ql-opt ${cls}" onclick="qlPick(${i})"><div class="k">${String.fromCharCode(65+i)}</div><div class="x">${o}</div></div>`;
      }).join('')}
    </div>
    ${reveal ? `<div class="ql-expl"><b>${given === q.c ? 'Correct' : 'Not quite'}</b>${q.e}</div>` : ''}
  </div>`;
}

function qlPick(i){
  if (qlState.feedback && qlState.answers[qlState.idx] != null) return;
  qlState.answers[qlState.idx] = i; qlSaveActive();
  if (!qlState.feedback && qlState.idx < qlState.quiz.length - 1){ qlState.idx++; qlSaveActive(); }
  qlPaint();
}
function qlNav(d){ qlGoTo(Math.max(0, Math.min(qlState.quiz.length-1, qlState.idx + d))); }
function qlGoTo(i){ qlState.idx = i; qlSaveActive(); qlPaint(); }
function qlAbandon(){ if (!confirm('Leave this quiz? Your progress is saved and you can resume later.')) return; qlState.view = 'build'; qlState.step = 3; navTo('quizlab'); }

function qlSubmit(){
  const unanswered = qlState.quiz.length - Object.keys(qlState.answers).length;
  if (unanswered && !confirm(unanswered + ' question' + (unanswered>1?'s':'') + ' still unanswered. Submit anyway?')) return;
  const byTopic = {}; let correct = 0;
  qlState.quiz.forEach((r,i) => {
    const q = qlQ(r); const ok = qlState.answers[i] === q.c;
    byTopic[r.tp] = byTopic[r.tp] || { c:0, n:0 };
    byTopic[r.tp].n++; if (ok){ byTopic[r.tp].c++; correct++; }
  });
  const pct = Math.round(correct / qlState.quiz.length * 100);
  const now = new Date();
  const entry = {
    id: 'QZ' + now.getTime().toString(36).toUpperCase(),
    title: qlState.topics.length === 1 ? qlTopic(qlState.topics[0]).name + ' drill' : qlState.subjects.join(' + ') + ' · ' + qlState.topics.length + ' topics',
    date: now.toISOString().slice(0,10) + ' ' + now.toTimeString().slice(0,5),
    subjects: qlState.subjects, topics: qlState.topics, mode: qlState.mode,
    n: qlState.quiz.length, correct, pct, byTopic,
    quiz: qlState.quiz, answers: qlState.answers,
    mins: Math.max(1, Math.round((Date.now() - (qlState.startedAt||Date.now())) / 60000)),
  };
  const h = qlHistory(); h.unshift(entry); qlSaveHistory(h);
  qlState.lastId = entry.id; qlState.view = 'review'; qlSaveActive();
  navTo('quizlab');
  if (typeof pushStudentNotif === 'function' && state.user.roleKey === 'student'){
    const s = getCurrentStudent && getCurrentStudent();
    if (s) pushStudentNotif(s.id, { type:'check', title:'Practice quiz completed — ' + pct + '%', body: entry.title + ' · ' + correct + '/' + entry.n + ' correct.' });
  }
}

/* ── review ── */
function qlReviewHTML(){
  const h = qlHistory().find(x => x.id === qlState.lastId) || qlHistory()[0];
  if (!h) { qlState.view = 'build'; return qlBuildHTML(); }
  const groups = [];
  h.quiz.forEach((r,i) => { const g = groups[groups.length-1]; if (g && g.tp === r.tp) g.idx.push(i); else groups.push({ tp:r.tp, idx:[i] }); });
  const wrongOnly = qlState.reviewFilter === 'wrong';
  return `
    ${pageHead({
      eyebrow: 'Practice Lab · Attempt ' + h.id,
      title: `Your <em>answers</em>`,
      sub: 'Every question with the correct answer and why it is correct. Weakest topics first in the breakdown below.',
      actions: `
        <button class="btn btn-ghost btn-sm" onclick="qlDownloadPDF('${h.id}')"><i class="fa-solid fa-file-pdf"></i> Export PDF</button>
        <button class="btn btn-primary btn-sm" onclick="qlNewQuiz()"><i class="fa-solid fa-plus"></i> Build another quiz</button>`
    })}

    <div class="card mb-5">
      <div class="card-body" style="display:flex; gap:30px; align-items:center; flex-wrap:wrap;">
        <div class="ql-score" style="--p:${h.pct}%;"><div><b>${h.pct}%</b><span>Score</span></div></div>
        <div style="flex:1; min-width:260px;">
          <div style="font-family:var(--serif); font-size:22px; font-weight:600; color:var(--navy); margin-bottom:5px;">${h.correct} of ${h.n} correct</div>
          <div style="font-size:13px; color:var(--ink-3); margin-bottom:16px;">${h.title} · ${QL_ACTIVITY[h.mode]||'Practice'} · ${h.mins} min · ${h.date}</div>
          ${Object.entries(h.byTopic).sort((a,b) => (a[1].c/a[1].n) - (b[1].c/b[1].n)).map(([t,v]) => {
            const p = Math.round(v.c/v.n*100);
            return `<div class="prog-row"><div class="prog-lbl"><span>${qlTopic(t).name}</span><b>${v.c}/${v.n}</b></div><div class="prog-bar"><div class="prog-fill" style="width:${p}%; background:${p>=70?'var(--ok)':p>=50?'var(--gold)':'var(--err)'};"></div></div></div>`;
          }).join('')}
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; min-width:170px;">
          <button class="btn btn-primary btn-sm" style="justify-content:center;" onclick="qlRetake('${h.id}')"><i class="fa-solid fa-rotate-right"></i> Retake these topics</button>
          <button class="btn btn-ghost btn-sm" style="justify-content:center;" onclick="qlPracticeWeakest('${h.id}')"><i class="fa-solid fa-bullseye"></i> Drill weakest topic</button>
          <button class="btn btn-ghost btn-sm" style="justify-content:center;" onclick="navTo('planner')"><i class="fa-solid fa-calendar-days"></i> Add to study plan</button>
        </div>
      </div>
    </div>

    <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
      <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700;">Question by question</div>
      <div style="flex:1; height:1px; background:var(--rule);"></div>
      <div class="st-seg">
        <button class="${!wrongOnly?'on':''}" onclick="qlState.reviewFilter='all'; navTo('quizlab')">All ${h.n}</button>
        <button class="${wrongOnly?'on':''}" onclick="qlState.reviewFilter='wrong'; navTo('quizlab')">Incorrect ${h.n - h.correct}</button>
      </div>
    </div>

    ${groups.map(g => {
      const rows = g.idx.filter(i => !wrongOnly || h.answers[i] !== qlQ(h.quiz[i]).c);
      if (!rows.length) return '';
      return `<div style="margin-bottom:22px;">
        <div class="bk-topic">${qlTopic(g.tp).subj} · ${qlTopic(g.tp).name}</div>
        ${rows.map(i => {
          const q = qlQ(h.quiz[i]); const given = h.answers[i]; const ok = given === q.c;
          return `<div class="ql-rev ${ok?'ok':'ko'}">
            <div class="qh"><b>Q${i+1}</b><div class="qt">${q.t}</div></div>
            <div class="an"><i class="fa-solid ${ok?'fa-circle-check':given==null?'fa-circle-minus':'fa-circle-xmark'}" style="color:${ok?'var(--ok)':given==null?'var(--ink-4)':'var(--err)'};"></i> <span>Your answer: <b>${given==null?'skipped':String.fromCharCode(65+given)+' — '+q.o[given]}</b></span></div>
            ${!ok ? `<div class="an"><i class="fa-solid fa-circle-check" style="color:var(--ok);"></i> <span>Correct answer: <b>${String.fromCharCode(65+q.c)} — ${q.o[q.c]}</b></span></div>` : ''}
            <div class="ql-expl"><b>Explanation</b>${q.e}</div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}
  `;
}

function qlNewQuiz(){ qlState.view = 'build'; qlState.step = 1; qlState.reviewFilter = 'all'; navTo('quizlab'); }
function qlReopen(id){ qlState.lastId = id; qlState.view = 'review'; qlState.reviewFilter = 'all'; navTo('quizlab'); }
function qlRetake(id){
  const h = qlHistory().find(x => x.id === id); if (!h) return;
  qlState.subjects = h.subjects; qlState.topics = h.topics; qlState.count = h.n; qlState.mode = h.mode;
  qlGenerate();
}
function qlPracticeWeakest(id){
  const h = qlHistory().find(x => x.id === id); if (!h) return;
  const weakest = Object.entries(h.byTopic).sort((a,b) => (a[1].c/a[1].n) - (b[1].c/b[1].n))[0];
  if (!weakest) return;
  qlState.topics = [weakest[0]]; qlState.subjects = [qlTopic(weakest[0]).subj];
  qlState.count = Math.min(10, qlBankCount(weakest[0])); qlGenerate();
}

function qlOpenHistory(){
  const hist = qlHistory(), acc = qlTopicAccuracy();
  const rows = Object.entries(acc).sort((a,b) => (a[1].c/a[1].n) - (b[1].c/b[1].n));
  stModal(`
    <div class="modal-hd"><div><div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold); font-weight:700;">Practice Lab</div><div class="modal-title">Progress by topic</div></div><button class="modal-close" onclick="stCloseModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body" style="overflow-y:auto;">
      ${rows.length ? rows.map(([t,v]) => {
        const p = Math.round(v.c/v.n*100);
        return `<div class="prog-row"><div class="prog-lbl"><span>${qlTopic(t).subj} · ${qlTopic(t).name}</span><b>${p}%</b></div><div class="prog-bar"><div class="prog-fill" style="width:${p}%; background:${p>=70?'var(--ok)':p>=50?'var(--gold)':'var(--err)'};"></div></div><div style="font-family:var(--mono); font-size:10.5px; color:var(--ink-4); margin-top:3px;">${v.c} correct of ${v.n} attempted</div></div>`;
      }).join('') : '<div class="st-empty"><i class="fa-solid fa-chart-simple"></i><b>No attempts yet</b><span>Build your first quiz to start tracking.</span></div>'}
      ${hist.length ? `<div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--rule);">
        <div style="font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--ink-4); font-weight:700; margin-bottom:10px;">All attempts</div>
        ${hist.map(h => `<div style="display:flex; gap:10px; align-items:center; padding:8px 0; border-bottom:1px dashed var(--rule);"><span style="font-family:var(--mono); font-size:11px; color:var(--ink-4); flex:0 0 96px;">${h.date}</span><span style="flex:1; font-size:12.5px; color:var(--ink-2);">${h.title}</span><b style="font-family:var(--mono); font-size:12px; color:${h.pct>=70?'var(--ok)':h.pct>=50?'var(--gold)':'var(--err)'};">${h.pct}%</b><button class="btn btn-ghost btn-sm" onclick="stCloseModal(); qlReopen('${h.id}')">Review</button></div>`).join('')}
      </div>` : ''}
    </div>
  `, 620);
}

function qlDownloadPDF(id){
  const h = qlHistory().find(x => x.id === id); if (!h) return;
  const { jsPDF } = window.jspdf; const doc = new jsPDF();
  pdfHeader(doc, 'PRACTICE QUIZ · ANSWERS & EXPLANATIONS');
  let y = 42, page = 1;
  const total = 1 + Math.ceil(h.n / 3);
  doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(8,42,82);
  doc.text(h.title, 14, y); y += 7;
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(90,114,137);
  doc.text(`${h.correct} / ${h.n} correct (${h.pct}%) · ${h.date} · attempt ${h.id}`, 14, y); y += 9;
  doc.setDrawColor(220,224,228); doc.line(14, y, 196, y); y += 9;
  let lastTp = null;
  h.quiz.forEach((r,i) => {
    const q = qlQ(r), given = h.answers[i], ok = given === q.c;
    const need = 46 + doc.splitTextToSize(q.t, 178).length * 5 + doc.splitTextToSize(q.e, 172).length * 4.4;
    if (y + need > 280){ pdfFooter(doc, page, total); doc.addPage(); page++; pdfHeader(doc, 'PRACTICE QUIZ · ANSWERS & EXPLANATIONS'); y = 42; lastTp = null; }
    if (r.tp !== lastTp){
      lastTp = r.tp;
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(31,138,138);
      doc.text((qlTopic(r.tp).subj + ' · ' + qlTopic(r.tp).name).toUpperCase(), 14, y); y += 7;
    }
    doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(20,31,46);
    const qt = doc.splitTextToSize('Q' + (i+1) + '. ' + q.t, 178);
    doc.text(qt, 14, y); y += qt.length * 5 + 2;
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
    q.o.forEach((o,oi) => {
      doc.setTextColor(oi === q.c ? 31 : 90, oi === q.c ? 122 : 100, oi === q.c ? 68 : 112);
      doc.setFont('helvetica', oi === q.c ? 'bold' : 'normal');
      doc.text(String.fromCharCode(65+oi) + '.  ' + o, 20, y); y += 4.8;
    });
    y += 1.5;
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.setTextColor(ok ? 31 : 179, ok ? 122 : 38, ok ? 68 : 30);
    doc.text(ok ? 'YOUR ANSWER: CORRECT' : 'YOUR ANSWER: ' + (given == null ? 'SKIPPED' : String.fromCharCode(65+given) + ' — INCORRECT'), 20, y); y += 5.5;
    doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(70,84,96);
    const ex = doc.splitTextToSize('Why: ' + q.e, 172);
    doc.text(ex, 20, y); y += ex.length * 4.4 + 7;
  });
  pdfFooter(doc, page, page);
  doc.save('FMA_Practice_' + h.id + '.pdf');
  showToast('Quiz + explanations exported');
}
