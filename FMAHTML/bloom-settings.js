/* ═══ BLOOM — student settings, avatar, billing & receipts ═══ */

let set = { tab:'account', crop:null, receipt:null };

/* ── AVATAR ── */
function avatarSrc(){ return B.profile.avatar || null; }
function avatarHTML(size, cls){
  const s = avatarSrc();
  const px = size || 40;
  return s
    ? `<img src="${s}" alt="" style="width:${px}px;height:${px}px;border-radius:50%;object-fit:cover;flex:0 0 ${px}px;display:block">`
    : `<div style="width:${px}px;height:${px}px;flex:0 0 ${px}px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-600),var(--leaf-400));color:#fff;display:grid;place-items:center;font-weight:800;font-size:${Math.round(px*0.36)}px">${initials(B.profile.name)}</div>`;
}
function avatarPick(){
  const inp = document.getElementById('avFile');
  if (inp) inp.click();
}
function avatarRead(input){
  const f = input.files[0]; if (!f) return;
  if (!f.type.startsWith('image/')){ toast('Choose an image file'); return; }
  if (f.size > 8*1024*1024){ toast('Image must be under 8 MB'); return; }
  const r = new FileReader();
  r.onload = () => avatarResize(r.result);
  r.readAsDataURL(f);
}
/* square-crop to centre and downscale to 320px so it fits in localStorage */
function avatarResize(dataURL){
  const img = new Image();
  img.onload = () => {
    const side = Math.min(img.width, img.height), out = 320;
    const c = document.createElement('canvas'); c.width = out; c.height = out;
    const x = (img.width - side) / 2, y = (img.height - side) / 2;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, side, side, 0, 0, out, out);
    B.profile.avatar = c.toDataURL('image/jpeg', 0.82);
    save(); renderNav(); navTo(B.section);
    toast('Profile picture updated', 'fa-camera');
  };
  img.onerror = () => toast('Could not read that image');
  img.src = dataURL;
}
function avatarRemove(){
  if (!B.profile.avatar) return;
  if (!confirm('Remove your profile picture? Your initials will be shown instead.')) return;
  delete B.profile.avatar; save(); renderNav(); navTo(B.section);
  toast('Profile picture removed');
}

/* ── BILLING & RECEIPTS ── */
const PLAN_PRICE = { PREMIUM:520, PLUS:340, CORE:190 };
function myPlan(){ return B.profile.plan || 'PLUS'; }
function planOf(id){ return PLANS.find(p => p.id === id) || PLANS[1]; }

function receipts(){
  if (B.receipts) return B.receipts;
  /* seed a realistic history from the join date to today */
  const out = [];
  /* history runs from when the student joined — back-dated to eight months for a
     newly created account so the billing history is not a single empty row */
  const joined = new Date((B.profile.joined || dayOffset(-240)) + 'T00:00:00');
  const now = new Date(today() + 'T00:00:00');
  const monthsSince = (now.getFullYear()-joined.getFullYear())*12 + (now.getMonth()-joined.getMonth());
  const start = monthsSince >= 3 ? joined : new Date(new Date(now).setMonth(now.getMonth() - 8));
  const plan = myPlan(), price = PLAN_PRICE[plan];
  let d = new Date(start), n = 0;
  while (d <= now && n < 24){
    const iso = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const due = new Date(d); due.setDate(due.getDate() + 14);
    const dueIso = due.getFullYear()+'-'+String(due.getMonth()+1).padStart(2,'0')+'-'+String(due.getDate()).padStart(2,'0');
    const isLatest = new Date(d.getFullYear(), d.getMonth()+1, 0) >= now;
    out.push({
      id:'BLM-' + iso.slice(0,7).replace('-','') + '-' + String(1040 + n),
      date: iso, due: dueIso,
      desc: planOf(plan).name + ' plan — ' + d.toLocaleDateString('en-GB',{month:'long',year:'numeric'}),
      plan, amount: price, vat: Math.round(price * 0.2 * 100) / 100,
      status: isLatest ? (dueIso < today() ? 'overdue' : 'pending') : 'paid',
      method: n % 3 === 0 ? 'Visa •••• 4429' : n % 3 === 1 ? 'Mastercard •••• 8871' : 'Bank transfer',
      paidOn: isLatest ? null : iso,
    });
    d.setMonth(d.getMonth() + 1); n++;
  }
  /* one-off purchases */
  if (out.length > 2){
    out.splice(1, 0, { id:'BLM-EXTRA-2201', date:dayOffset(-38), due:dayOffset(-38), desc:'Additional 1-on-1 session pack (4 sessions)', plan:'ADDON', amount:120, vat:24, status:'paid', method:'Visa •••• 4429', paidOn:dayOffset(-38) });
    out.splice(3, 0, { id:'BLM-EXTRA-2178', date:dayOffset(-72), due:dayOffset(-72), desc:'Full mock exam — examiner-marked', plan:'ADDON', amount:45, vat:9, status:'paid', method:'Bank transfer', paidOn:dayOffset(-72) });
  }
  B.receipts = out.reverse();
  save();
  return B.receipts;
}
function receiptOf(id){ return receipts().find(r => r.id === id); }
function receiptTotal(r){ return r.amount + r.vat; }

/* ═══ SETTINGS SECTION ═══ */
const SET_TABS = [
  { id:'account',  name:'Account',       ic:'fa-user' },
  { id:'study',    name:'Study',         ic:'fa-graduation-cap' },
  { id:'notify',   name:'Notifications', ic:'fa-bell' },
  { id:'billing',  name:'Billing',       ic:'fa-credit-card' },
  { id:'receipts', name:'Receipts',      ic:'fa-receipt' },
  { id:'privacy',  name:'Privacy & data',ic:'fa-shield-halved' },
];

function sec_settings(){
  if (set.receipt) return receiptViewHTML();
  return `
    ${phead({ eyebrow:'Your account', title:`<em>Settings</em>`,
      sub:'Your profile, how Bloom studies with you, what it emails you, and every payment you have made.' })}

    <div style="display:grid;grid-template-columns:216px minmax(0,1fr);gap:18px;align-items:start" class="setsplit">
      <div class="card"><div class="card-bd" style="padding:10px">
        ${SET_TABS.map(t=>`<div class="nav-i ${set.tab===t.id?'on':''}" style="margin-bottom:3px" onclick="set.tab='${t.id}';navTo('settings')">
          <i class="fa-solid ${t.ic}"></i><span>${t.name}</span></div>`).join('')}
      </div></div>
      <div>${setPanel()}</div>
    </div>
    <input type="file" id="avFile" accept="image/*" style="display:none" onchange="avatarRead(this)">
    <style>@media(max-width:760px){.setsplit{grid-template-columns:1fr!important}}</style>`;
}

function setPanel(){
  const p = B.profile;
  if (set.tab === 'account') return `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Profile picture</h3><p>Shown next to your name across Bloom — the sidebar, your dashboard, your profile and everything you submit</p></div></div>
      <div class="card-bd">
        <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
          <div id="avDrop" style="position:relative;cursor:pointer" onclick="avatarPick()">
            ${avatarHTML(96)}
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(12,33,20,.55);color:#fff;display:grid;place-items:center;opacity:0;transition:.15s;font-size:18px" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"><i class="fa-solid fa-camera"></i></div>
          </div>
          <div style="flex:1;min-width:220px">
            <div style="font-size:13px;color:var(--ink-3);line-height:1.6;margin-bottom:13px">
              Drop an image here or choose a file. It is cropped square, resized to 320&nbsp;px and stored on this device only — Bloom never uploads it anywhere.</div>
            <div style="display:flex;gap:9px;flex-wrap:wrap">
              <button class="btn btn-p btn-sm" onclick="avatarPick()"><i class="fa-solid fa-camera"></i> ${avatarSrc()?'Change picture':'Upload a picture'}</button>
              ${avatarSrc()?`<button class="btn btn-g btn-sm" onclick="avatarRemove()"><i class="fa-solid fa-trash"></i> Remove</button>`:''}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Your details</h3><p>Used on certificates, receipts and progress reports</p></div></div>
      <div class="card-bd"><div class="fgrid">
        <div class="fg full"><label>Full name</label><input value="${esc(p.name)}" onchange="B.profile.name=this.value;save();renderNav()"></div>
        <div class="fg full"><label>Email</label><input type="email" value="${esc(p.email)}" onchange="B.profile.email=this.value;save()"></div>
        <div class="fg"><label>Country</label><select onchange="B.profile.country=this.value;save()">${COUNTRIES.map(c=>`<option ${p.country===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="fg"><label>First language</label><select onchange="B.profile.l1=this.value;save();navTo('settings')">${L1.map(c=>`<option ${p.l1===c?'selected':''}>${c}</option>`).join('')}</select></div>
      </div>
      <div style="margin-top:14px;padding:13px 15px;background:var(--amber-soft);border-radius:11px;font-size:12.5px;color:#7a5410;line-height:1.55">
        <i class="fa-solid fa-circle-info" style="margin-right:6px"></i>Your first language drives which errors Bloom watches for. As a ${esc(p.l1)} speaker: ${l1Traps(p.l1)[0].charAt(0).toLowerCase()+l1Traps(p.l1)[0].slice(1)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Appearance</h3></div></div>
      <div class="card-bd">
        <div style="display:flex;gap:16px;align-items:center;padding-bottom:15px;border-bottom:1px solid var(--line)">
          <div style="flex:1"><b style="font-size:13.5px;display:block">Theme</b><span style="font-size:12px;color:var(--ink-4)">Light is easier for long reading sessions</span></div>
          <div class="seg">${[['light','Light','fa-sun'],['dark','Dark','fa-moon']].map(([k,l,ic])=>`
            <button class="${(document.documentElement.getAttribute('data-theme')||'light')===k?'on':''}" onclick="if((document.documentElement.getAttribute('data-theme')||'light')!=='${k}')toggleTheme();navTo('settings')"><i class="fa-solid ${ic}" style="margin-right:5px"></i>${l}</button>`).join('')}</div>
        </div>
        <div style="display:flex;gap:16px;align-items:center;padding-top:15px">
          <div style="flex:1"><b style="font-size:13.5px;display:block">Interface language</b><span style="font-size:12px;color:var(--ink-4)">Lessons are always in English</span></div>
          <select style="flex:0 0 200px;border:1.5px solid var(--line-2);border-radius:10px;padding:9px 12px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" onchange="toast('Interface set to ' + this.value)">
            ${['English','हिन्दी','中文','Tiếng Việt','العربية','Español'].map(l=>`<option>${l}</option>`).join('')}</select>
        </div>
      </div>
    </div>`;

  if (set.tab === 'study') return `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Exam &amp; target</h3><p>Changing these rebuilds your study plan recommendations</p></div></div>
      <div class="card-bd">${typeof trackNoticeHTML === 'function' ? trackNoticeHTML() : ''}<div class="fgrid">
        <div class="fg full"><label>Exam${typeof examLocked === 'function' && examLocked() ? ' <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--ink-4)">(set by your academy)</span>' : ''}</label>
          <select ${typeof examLocked === 'function' && examLocked() ? 'disabled style="opacity:.6;cursor:not-allowed"' : ''} onchange="B.profile.exam=this.value;save();navTo('settings')">${EXAMS.map(x=>`<option value="${x.id}" ${(typeof examTrack==='function'?examTrack():p.exam)===x.id?'selected':''}>${x.name}</option>`).join('')}</select></div>
        <div class="fg full"><label>Target band — <b style="color:var(--leaf-700)">${bandLabel(p.target)}</b> · ${scoreInExam(p.target,p.exam)}</label>
          <input class="range" type="range" min="4" max="9" step="0.5" value="${p.target}" onchange="B.profile.target=+this.value;save();navTo('settings')"></div>
        <div class="fg"><label>Test date</label><input type="date" value="${p.testDate||''}" onchange="B.profile.testDate=this.value;save();navTo('settings')"></div>
        <div class="fg"><label>Study hours per day</label><select onchange="B.profile.hoursPerDay=+this.value;save()">${[1,2,3,4,5].map(h=>`<option value="${h}" ${p.hoursPerDay===h?'selected':''}>${h} hour${h===1?'':'s'}</option>`).join('')}</select></div>
        <div class="fg full"><label>Why you need this score</label><select onchange="B.profile.purpose=this.value;save();navTo('settings')">${PURPOSES.map(x=>`<option value="${x.id}" ${p.purpose===x.id?'selected':''}>${x.name}</option>`).join('')}</select></div>
      </div>
      ${p.testDate?`<div style="margin-top:13px;font-size:13px;color:var(--leaf-700);font-weight:700"><i class="fa-solid fa-hourglass-half"></i> ${daysTo(p.testDate)} days until your test</div>`:''}
      </div>
    </div>

    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Daily goal</h3><p>${B.todayMins} of ${B.goalMins} minutes done today</p></div></div>
      <div class="card-bd">
        <div class="bar" style="height:9px;margin-bottom:16px"><i style="width:${Math.min(100,pct(B.todayMins,B.goalMins))}%;background:var(--amber)"></i></div>
        <div class="tiles">${[20,30,45,60,90].map(m=>`<div class="tile ${B.goalMins===m?'on':''}" onclick="B.goalMins=${m};save();navTo('settings')">
          <span class="tk"><i class="fa-solid fa-circle-check"></i></span>
          <div class="nm" style="font-family:var(--display);font-size:21px">${m}</div><div class="mt">minutes</div></div>`).join('')}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Reset</h3><p>These cannot be undone</p></div></div>
      <div class="card-bd" style="display:grid;gap:11px">
        ${[['Retake the placement test','Your current level is replaced by the new result',"navTo('placement')",'fa-clipboard-question'],
           ['Rebuild my study plan','Regenerated from your current scores; ticks are cleared',"if(confirm('Rebuild your study plan? Ticks will be cleared.')){buildPlan();navTo('plan')}",'fa-calendar-days'],
           ['Reset vocabulary progress','Every word returns to unseen',"if(confirm('Reset all vocabulary progress?')){B.vocab={};save();toast('Vocabulary reset')}",'fa-spell-check'],
           ['Erase everything','All progress on this device is deleted','resetBloom()','fa-trash']].map(([t,s,go,ic],i)=>`
          <div style="display:flex;gap:13px;align-items:center;padding:13px 15px;border:1px solid ${i===3?'var(--err)':'var(--line)'};border-radius:12px">
            <div style="width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:${i===3?'var(--err-soft)':'var(--paper-2)'};color:${i===3?'var(--err)':'var(--ink-3)'};display:grid;place-items:center;font-size:11px"><i class="fa-solid ${ic}"></i></div>
            <div style="flex:1"><b style="font-size:13px;display:block">${t}</b><span style="font-size:11.5px;color:var(--ink-4)">${s}</span></div>
            <button class="btn ${i===3?'btn-g':'btn-g'} btn-sm" ${i===3?'style="color:var(--err);border-color:var(--err)"':''} onclick="${go}">${i===3?'Erase':'Open'}</button></div>`).join('')}
      </div>
    </div>`;

  if (set.tab === 'notify'){
    B.notify = B.notify || { daily:true, due:true, streak:true, mock:true, tutoring:true, live:true, weekly:true, marketing:false, quiet:'22:00' };
    const rows = [
      ['daily','Daily study reminder','A nudge at your usual study time'],
      ['due','Vocabulary due','When words are scheduled for review'],
      ['streak','Streak at risk','Late in the day if you have not studied'],
      ['mock','Mock exam reminders','Before a scheduled mock'],
      ['tutoring','1-on-1 sessions','24 hours and 1 hour before'],
      ['live','Live classes','15 minutes before a class starts'],
      ['weekly','Weekly progress summary','Every Sunday evening'],
      ['marketing','News and offers','Occasional Bloom announcements'],
    ];
    return `
      <div class="card mb2">
        <div class="card-hd"><div style="flex:1"><h3>What Bloom tells you</h3><p>Everything is off-device — these control in-app and email alerts</p></div></div>
        <div class="card-bd" style="display:grid;gap:2px">
          ${rows.map(([k,t,s])=>`
            <div style="display:flex;gap:16px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)">
              <div style="flex:1"><b style="font-size:13.5px;display:block">${t}</b><span style="font-size:12px;color:var(--ink-4)">${s}</span></div>
              <button style="width:46px;height:26px;border-radius:14px;border:none;cursor:pointer;background:${B.notify[k]?'var(--leaf-600)':'var(--line-2)'};position:relative;transition:.16s;flex:0 0 46px" onclick="B.notify['${k}']=${!B.notify[k]};save();navTo('settings')">
                <span style="position:absolute;top:3px;left:${B.notify[k]?'23px':'3px'};width:20px;height:20px;border-radius:50%;background:#fff;transition:.16s"></span></button></div>`).join('')}
          <div style="display:flex;gap:16px;align-items:center;padding-top:15px">
            <div style="flex:1"><b style="font-size:13.5px;display:block">Quiet hours</b><span style="font-size:12px;color:var(--ink-4)">No notifications after this time</span></div>
            <select style="flex:0 0 130px;border:1.5px solid var(--line-2);border-radius:10px;padding:9px 12px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--ink)" onchange="B.notify.quiet=this.value;save()">
              ${['20:00','21:00','22:00','23:00','Never'].map(t=>`<option ${B.notify.quiet===t?'selected':''}>${t}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Recent notifications</h3><p>${B.notifs.length} in your history</p></div>
          ${B.notifs.length?`<button class="btn btn-g btn-sm" onclick="B.notifs=[];save();navTo('settings');toast('History cleared')">Clear</button>`:''}</div>
        <div class="card-bd flush">
          ${B.notifs.length ? B.notifs.slice(0,6).map(n=>`<div class="row"><div class="ic"><i class="fa-solid ${n.ic}"></i></div>
            <div class="tx"><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div>
            <span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${new Date(n.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span></div>`).join('')
          : `<div style="padding:26px;text-align:center;font-size:12.5px;color:var(--ink-4)">Nothing yet — milestones and reminders appear here.</div>`}
        </div>
      </div>`;
  }

  if (set.tab === 'billing'){
    const plan = planOf(myPlan());
    const rs = receipts();
    const next = rs.find(r => r.status !== 'paid');
    return `
      <div class="card mb2" style="border-color:var(--leaf-500);background:linear-gradient(160deg,var(--leaf-50),var(--surface) 60%)">
        <div class="card-bd" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
          <div style="width:52px;height:52px;flex:0 0 52px;border-radius:16px;background:var(--leaf-700);color:#fff;display:grid;place-items:center;font-size:19px"><i class="fa-solid fa-${plan.id==='PREMIUM'?'crown':plan.id==='PLUS'?'star':'seedling'}"></i></div>
          <div style="flex:1;min-width:220px">
            <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:5px">Your plan</div>
            <b style="font-family:var(--display);font-size:22px;font-weight:700;display:block">${plan.name} · £${plan.price} / ${plan.per}</b>
            <span style="font-size:12.5px;color:var(--ink-3)">${next ? 'Next payment £' + receiptTotal(next).toFixed(2) + ' due ' + next.due : 'All payments up to date'}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-g btn-sm" onclick="set.tab='receipts';navTo('settings')"><i class="fa-solid fa-receipt"></i> Receipts</button>
            <button class="btn btn-p btn-sm" onclick="setChangePlan()"><i class="fa-solid fa-arrow-up-right-dots"></i> Change plan</button></div>
        </div>
      </div>

      <div class="card mb2">
        <div class="card-hd"><div style="flex:1"><h3>Plans</h3><p>Change any time — the difference is prorated</p></div></div>
        <div class="card-bd"><div class="grid g3">
          ${PLANS.map(x => { const mine = x.id === myPlan();
            return `<div style="border:1.5px solid ${mine?'var(--leaf-600)':'var(--line)'};border-radius:16px;padding:19px;position:relative;${mine?'background:var(--leaf-50)':''}">
              ${mine?'<span style="position:absolute;top:-9px;left:18px;background:var(--leaf-700);color:#fff;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;font-weight:800;padding:3px 9px;border-radius:5px">Your plan</span>':''}
              <b style="font-family:var(--display);font-size:17px;font-weight:700;display:block;margin-bottom:8px">${x.name}</b>
              <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:13px">
                <span style="font-family:var(--display);font-size:27px;font-weight:700;letter-spacing:-1px">£${x.price}</span>
                <span style="font-size:12px;color:var(--ink-4)">/ ${x.per}</span></div>
              <div style="display:grid;gap:6px;margin-bottom:14px">
                ${x.inc.slice(0,4).map(f=>`<div style="display:flex;gap:8px;font-size:12px;color:var(--ink-2);line-height:1.45"><i class="fa-solid fa-check" style="color:var(--ok);font-size:10px;margin-top:3px"></i><span>${f}</span></div>`).join('')}</div>
              <button class="btn ${mine?'btn-g':'btn-p'} btn-sm btn-blk" ${mine?'disabled':''} onclick="setSwitchPlan('${x.id}')">${mine?'Current plan':'Switch to ' + x.name}</button>
            </div>`;
          }).join('')}
        </div></div>
      </div>

      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Payment method</h3></div>
          <button class="btn btn-g btn-sm" onclick="toast('Card update opens your payment provider','fa-credit-card')"><i class="fa-solid fa-pen"></i> Update</button></div>
        <div class="card-bd">
          <div style="display:flex;gap:14px;align-items:center;padding:15px 17px;border:1px solid var(--line);border-radius:13px">
            <div style="width:42px;height:28px;flex:0 0 42px;border-radius:6px;background:linear-gradient(135deg,#1a1f71,#2d4bb8);color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800;letter-spacing:.5px">VISA</div>
            <div style="flex:1"><b style="font-family:var(--mono);font-size:13.5px;display:block">•••• •••• •••• 4429</b>
              <span style="font-size:11.5px;color:var(--ink-4)">Expires 08/29 · ${esc(B.profile.name)}</span></div>
            <span class="tag ok">Default</span></div>
          <div style="margin-top:12px;font-size:12px;color:var(--ink-4);line-height:1.55">
            <i class="fa-solid fa-lock" style="margin-right:6px"></i>Card details are held by our payment provider, never by Bloom.</div>
        </div>
      </div>`;
  }

  if (set.tab === 'receipts'){
    const rs = receipts();
    const paid = rs.filter(r=>r.status==='paid');
    const total = paid.reduce((a,r)=>a+receiptTotal(r),0);
    return `
      <div class="grid g3 mb2">
        ${statCard('Total paid', '£' + total.toLocaleString(undefined,{minimumFractionDigits:2}), paid.length + ' receipts', 'ok', 'fa-receipt')}
        ${statCard('Outstanding', '£' + rs.filter(r=>r.status!=='paid').reduce((a,r)=>a+receiptTotal(r),0).toFixed(2), rs.filter(r=>r.status!=='paid').length + ' invoice' + (rs.filter(r=>r.status!=='paid').length===1?'':'s'), rs.some(r=>r.status==='overdue')?'cor':'amb', 'fa-file-invoice')}
        ${statCard('Member since', new Date((B.profile.joined||dayOffset(-240))+'T00:00:00').toLocaleDateString('en-GB',{month:'short',year:'numeric'}), planOf(myPlan()).name + ' plan', 'leaf', 'fa-calendar-check')}
      </div>
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Receipts &amp; invoices</h3><p>Every payment on your account — open one to print or save it as a PDF</p></div>
          <button class="btn btn-g btn-sm" onclick="receiptsCSV()"><i class="fa-solid fa-file-csv"></i> Export all</button></div>
        <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Receipt</th><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>${rs.map(r => `<tr>
            <td><b style="font-family:var(--mono);font-size:11.5px;color:var(--ink)">${r.id}</b></td>
            <td style="font-family:var(--mono);font-size:11.5px">${r.date}</td>
            <td style="font-size:12.5px">${esc(r.desc)}</td>
            <td><b style="font-family:var(--mono);font-size:13px">£${receiptTotal(r).toFixed(2)}</b></td>
            <td><span class="tag ${r.status==='paid'?'ok':r.status==='overdue'?'cor':'amb'}">${r.status==='paid'?'Paid':r.status==='overdue'?'Overdue':'Pending'}</span></td>
            <td style="text-align:right;white-space:nowrap">
              ${r.status!=='paid'?`<button class="btn btn-p btn-sm" onclick="receiptPay('${r.id}')">Pay now</button>`:''}
              <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="View receipt" onclick="set.receipt='${r.id}';navTo('settings')"><i class="fa-solid fa-eye"></i></button>
              <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Download PDF" onclick="receiptPDF('${r.id}')"><i class="fa-solid fa-download"></i></button></td>
          </tr>`).join('')}</tbody></table></div></div>
      </div>`;
  }

  /* privacy */
  return `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Your data</h3><p>Everything Bloom stores about you lives on this device</p></div></div>
      <div class="card-bd">
        <div style="font-size:13px;color:var(--ink-2);line-height:1.7;margin-bottom:16px">
          Bloom keeps your placement result, essays, recordings transcripts, vocabulary schedule, study plan and receipts in your browser's local storage. Nothing is sent to a server, and clearing your browser data erases it permanently.</div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:11px">
          ${[['Essays',B.essays.length,'fa-pen-nib'],['Recordings',B.speeches.length,'fa-microphone'],['Mock runs',B.mockRuns.length,'fa-clipboard-list'],
             ['Words tracked',Object.keys(B.vocab).length,'fa-spell-check'],['Receipts',receipts().length,'fa-receipt'],['Notifications',B.notifs.length,'fa-bell']].map(([n,v,ic])=>`
            <div style="padding:13px 15px;border:1px solid var(--line);border-radius:12px">
              <div style="width:26px;height:26px;border-radius:8px;background:var(--paper-2);color:var(--ink-3);display:grid;place-items:center;font-size:10px;margin-bottom:8px"><i class="fa-solid ${ic}"></i></div>
              <b style="font-family:var(--display);font-size:19px;font-weight:700;display:block;line-height:1">${v}</b>
              <span style="font-size:11px;color:var(--ink-4)">${n}</span></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><div style="flex:1"><h3>Export &amp; erase</h3></div></div>
      <div class="card-bd" style="display:grid;gap:11px">
        <div style="display:flex;gap:13px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:12px">
          <div style="width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:var(--sky-soft);color:var(--sky);display:grid;place-items:center;font-size:11px"><i class="fa-solid fa-download"></i></div>
          <div style="flex:1"><b style="font-size:13px;display:block">Download all my data</b><span style="font-size:11.5px;color:var(--ink-4)">A single JSON file with everything above</span></div>
          <button class="btn btn-g btn-sm" onclick="setExportData()">Download</button></div>
        <div style="display:flex;gap:13px;align-items:center;padding:14px 16px;border:1px solid var(--err);border-radius:12px">
          <div style="width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:var(--err-soft);color:var(--err);display:grid;place-items:center;font-size:11px"><i class="fa-solid fa-trash"></i></div>
          <div style="flex:1"><b style="font-size:13px;display:block">Erase my account</b><span style="font-size:11.5px;color:var(--ink-4)">Deletes everything and returns you to onboarding</span></div>
          <button class="btn btn-g btn-sm" style="color:var(--err);border-color:var(--err)" onclick="resetBloom()">Erase</button></div>
      </div>
    </div>`;
}

function setSwitchPlan(id){
  const x = planOf(id), cur = planOf(myPlan());
  if (!confirm(`Switch from ${cur.name} (£${cur.price}) to ${x.name} (£${x.price}) per month?\n\nThe change takes effect on your next billing date and the difference is prorated.`)) return;
  B.profile.plan = id; B.receipts = null; save(); navTo('settings');
  toast('Switched to the ' + x.name + ' plan', 'fa-check');
}
function setChangePlan(){ set.tab = 'billing'; navTo('settings'); document.querySelector('#view .grid.g3')?.scrollIntoView({ block:'center', behavior:'smooth' }); }

function receiptPay(id){
  const r = receiptOf(id); if (!r) return;
  if (!confirm(`Pay £${receiptTotal(r).toFixed(2)} for ${r.desc}?`)) return;
  r.status = 'paid'; r.paidOn = today(); save(); navTo('settings');
  toast('Payment received — receipt ' + r.id, 'fa-circle-check');
  notify('Payment received', '£' + receiptTotal(r).toFixed(2) + ' for ' + r.desc + '. Receipt ' + r.id + '.', 'fa-receipt');
}

function receiptViewHTML(){
  const r = receiptOf(set.receipt);
  if (!r) { set.receipt = null; return setPanel(); }
  return `
    ${phead({ eyebrow:'Receipt ' + r.id, title:`£${receiptTotal(r).toFixed(2)} <em>${r.status==='paid'?'paid':'due'}</em>`,
      sub:esc(r.desc),
      actions:`<button class="btn btn-g btn-sm" onclick="set.receipt=null;navTo('settings')"><i class="fa-solid fa-arrow-left"></i> All receipts</button>
        ${r.status!=='paid'?`<button class="btn btn-a btn-sm" onclick="receiptPay('${r.id}')"><i class="fa-solid fa-credit-card"></i> Pay now</button>`:''}
        <button class="btn btn-p" onclick="receiptPDF('${r.id}')"><i class="fa-solid fa-download"></i> Download PDF</button>` })}

    <div class="card" style="max-width:720px">
      <div style="background:linear-gradient(135deg,var(--leaf-900),var(--leaf-700));color:#fff;padding:26px 30px;border-radius:var(--r-lg) var(--r-lg) 0 0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap">
          <div>
            <div style="font-size:9px;letter-spacing:2.2px;text-transform:uppercase;color:var(--leaf-300);font-weight:800">Bloom IELTS Academy</div>
            <div style="font-family:var(--display);font-size:24px;font-weight:700;margin-top:8px">${r.status==='paid'?'Receipt':'Invoice'}</div>
            <div style="font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,.65);margin-top:5px">${r.id}</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--display);font-size:30px;font-weight:700;letter-spacing:-1px">£${receiptTotal(r).toFixed(2)}</div>
            <span class="tag ${r.status==='paid'?'ok':r.status==='overdue'?'cor':'amb'}" style="margin-top:7px;display:inline-block">${r.status==='paid'?'Paid in full':r.status==='overdue'?'Overdue':'Pending'}</span>
          </div>
        </div>
      </div>
      <div class="card-bd" style="padding:26px 30px">
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;padding-bottom:20px;border-bottom:1px solid var(--line);margin-bottom:20px">
          ${[['Billed to', esc(B.profile.name) + '<br><span style="font-weight:400;color:var(--ink-4);font-size:12px">' + esc(B.profile.email) + '</span>'],
             ['Issued', r.date],
             [r.status==='paid'?'Paid on':'Due by', r.status==='paid' ? (r.paidOn||r.date) : r.due],
             ['Method', r.method]].map(([l,v])=>`
            <div><div style="font-size:8.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-4);font-weight:800;margin-bottom:6px">${l}</div>
              <div style="font-size:13px;font-weight:600;line-height:1.45">${v}</div></div>`).join('')}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13.5px">
          <thead><tr>
            <th style="text-align:left;font-size:9px;letter-spacing:1.3px;text-transform:uppercase;color:var(--ink-4);font-weight:800;padding-bottom:10px;border-bottom:1px solid var(--line)">Description</th>
            <th style="text-align:right;font-size:9px;letter-spacing:1.3px;text-transform:uppercase;color:var(--ink-4);font-weight:800;padding-bottom:10px;border-bottom:1px solid var(--line)">Amount</th></tr></thead>
          <tbody>
            <tr><td style="padding:14px 0;color:var(--ink-2)">${esc(r.desc)}</td>
              <td style="padding:14px 0;text-align:right;font-family:var(--mono)">£${r.amount.toFixed(2)}</td></tr>
            <tr><td style="padding:0 0 14px;color:var(--ink-4);font-size:12.5px">VAT at 20%</td>
              <td style="padding:0 0 14px;text-align:right;font-family:var(--mono);color:var(--ink-4)">£${r.vat.toFixed(2)}</td></tr>
            <tr><td style="padding:14px 0 0;border-top:2px solid var(--ink);font-weight:800">Total</td>
              <td style="padding:14px 0 0;border-top:2px solid var(--ink);text-align:right;font-family:var(--display);font-size:19px;font-weight:700">£${receiptTotal(r).toFixed(2)}</td></tr>
          </tbody>
        </table>
        <div style="margin-top:24px;padding:14px 16px;background:var(--paper);border-radius:11px;font-size:11.5px;color:var(--ink-4);line-height:1.6">
          Bloom IELTS Academy Pvt Ltd · Prestige Tech Park, Marathahalli, Bengaluru 560103, India · GSTIN 29ABMCB4821K1ZP<br>
          Thank you. Questions about this ${r.status==='paid'?'receipt':'invoice'}? Email billing@bloomielts.com quoting ${r.id}.</div>
      </div>
    </div>`;
}

function receiptPDF(id){
  const r = receiptOf(id); if (!r) return;
  const w = window.open('','_blank'); if (!w){ toast('Allow pop-ups to download the receipt'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${r.id} — Bloom</title><style>
    @page{size:A4;margin:20mm}body{font-family:system-ui,-apple-system,sans-serif;color:#12211a;font-size:11pt;line-height:1.6}
    .hd{background:linear-gradient(135deg,#14351d,#2f6b3a);color:#fff;padding:26px 30px;border-radius:12px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:26px}
    .brand{font-size:8.5pt;letter-spacing:2.2px;text-transform:uppercase;color:#a3d199;font-weight:800}
    .doc{font-size:20pt;font-weight:700;margin-top:8px}.ref{font-family:ui-monospace,monospace;font-size:9pt;color:rgba(255,255,255,.65);margin-top:4px}
    .amt{font-size:26pt;font-weight:700;text-align:right}.st{font-size:8pt;text-transform:uppercase;letter-spacing:1.2px;font-weight:800;text-align:right;margin-top:5px;color:#a3d199}
    .meta{display:flex;gap:26px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid #e3ebe4;margin-bottom:18px}
    .meta div{min-width:130px}.ml{font-size:7.5pt;letter-spacing:1.3px;text-transform:uppercase;color:#5d7266;font-weight:800;margin-bottom:5px}
    .mv{font-size:10.5pt;font-weight:600}
    table{width:100%;border-collapse:collapse;font-size:10.5pt}
    th{text-align:left;font-size:7.5pt;letter-spacing:1.2px;text-transform:uppercase;color:#5d7266;font-weight:800;padding-bottom:9px;border-bottom:1px solid #cfdcd2}
    th.r,td.r{text-align:right}td{padding:12px 0}
    .tot td{border-top:2px solid #12211a;padding-top:12px;font-weight:800;font-size:13pt}
    .ft{margin-top:30px;padding:14px 16px;background:#f6f9f5;border-radius:10px;font-size:8.5pt;color:#5d7266;line-height:1.65}
  </style></head><body>
    <div class="hd">
      <div><div class="brand">Bloom IELTS Academy</div><div class="doc">${r.status==='paid'?'Receipt':'Invoice'}</div><div class="ref">${r.id}</div></div>
      <div><div class="amt">£${receiptTotal(r).toFixed(2)}</div><div class="st">${r.status==='paid'?'Paid in full':r.status==='overdue'?'Overdue':'Pending'}</div></div>
    </div>
    <div class="meta">
      <div><div class="ml">Billed to</div><div class="mv">${esc(B.profile.name)}</div><div style="font-size:9.5pt;color:#5d7266">${esc(B.profile.email)}</div></div>
      <div><div class="ml">Issued</div><div class="mv">${r.date}</div></div>
      <div><div class="ml">${r.status==='paid'?'Paid on':'Due by'}</div><div class="mv">${r.status==='paid'?(r.paidOn||r.date):r.due}</div></div>
      <div><div class="ml">Method</div><div class="mv">${r.method}</div></div>
    </div>
    <table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>
      <tr><td>${esc(r.desc)}</td><td class="r">£${r.amount.toFixed(2)}</td></tr>
      <tr><td style="color:#5d7266;font-size:9.5pt;padding-top:0">VAT at 20%</td><td class="r" style="color:#5d7266;padding-top:0">£${r.vat.toFixed(2)}</td></tr>
      <tr class="tot"><td>Total</td><td class="r">£${receiptTotal(r).toFixed(2)}</td></tr>
    </tbody></table>
    <div class="ft">Bloom IELTS Academy Pvt Ltd · Prestige Tech Park, Marathahalli, Bengaluru 560103, India · GSTIN 29ABMCB4821K1ZP<br>
      Thank you. Questions about this ${r.status==='paid'?'receipt':'invoice'}? Email billing@bloomielts.com quoting ${r.id}.</div>
  </body></html>`);
  w.document.close(); setTimeout(()=>w.print(), 420);
  toast('Opening print view — choose “Save as PDF”', 'fa-receipt');
}

function receiptsCSV(){
  const rows = [['Receipt','Date','Due','Description','Plan','Net','VAT','Total','Status','Method','Paid on']];
  receipts().forEach(r => rows.push([r.id,r.date,r.due,r.desc,r.plan,r.amount.toFixed(2),r.vat.toFixed(2),receiptTotal(r).toFixed(2),r.status,r.method,r.paidOn||'']));
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-receipts-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast(receipts().length + ' receipts exported', 'fa-file-csv');
}

function setExportData(){
  const data = { exported:new Date().toISOString(), profile:B.profile, placement:B.placement, scores:B.scores,
    history:B.history, essays:B.essays, speeches:B.speeches, mockRuns:B.mockRuns, readRuns:B.readRuns, listenRuns:B.listenRuns,
    vocab:B.vocab, grammar:B.grammar, plan:B.plan, planDone:B.planDone, receipts:receipts(), xp:B.xp, badges:B.badges, streak:B.streak };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-my-data-' + today() + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('Your data has been downloaded', 'fa-download');
}
