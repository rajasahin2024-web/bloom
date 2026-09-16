/* ═══════════════════════════════════════════════════════════════
   BLOOM — in-portal meeting rooms

   Some providers permit iframe embedding, some forbid it outright.
   Google Meet, Microsoft Teams and Zoom all send X-Frame-Options /
   CSP frame-ancestors headers that make embedding impossible — no
   amount of markup changes that. So:

     · embeddable providers (Jitsi, Whereby, Daily, BigBlueButton,
       8x8) run genuinely inside the portal in an iframe with
       camera and microphone granted;
     · the rest open in a companion window while the portal keeps
       chat, notes, hand-raise and the register, so the student
       still never loses their place.

   Jitsi needs no account and embeds freely, which is why Bloom
   offers to generate a room for any class in one click.
═══════════════════════════════════════════════════════════════ */

const MEET_PROVIDERS = [
  { id:'jitsi',   name:'Jitsi Meet',        ic:'fa-video',           embed:true,
    match:/(meet\.jit\.si|8x8\.vc)/i, tone:'leaf',
    note:'Embeds directly in the portal. No account needed for either side.' },
  { id:'whereby', name:'Whereby',           ic:'fa-door-open',       embed:true,
    match:/whereby\.com/i, tone:'leaf',
    note:'Built for embedding. Add ?embed to the room URL for the cleanest fit.' },
  { id:'daily',   name:'Daily.co',          ic:'fa-tower-broadcast', embed:true,
    match:/daily\.co/i, tone:'leaf',
    note:'Embeds in the portal with full camera and microphone access.' },
  { id:'bbb',     name:'BigBlueButton',     ic:'fa-chalkboard',      embed:true,
    match:/(bigbluebutton|\/bbb\/)/i, tone:'leaf',
    note:'Purpose-built for teaching and embeds cleanly.' },
  { id:'meet',    name:'Google Meet',       ic:'fa-google',          embed:false, brand:true,
    match:/meet\.google\.com/i, tone:'sky',
    note:'Google blocks embedding for security. Opens beside the portal instead.' },
  { id:'teams',   name:'Microsoft Teams',   ic:'fa-microsoft',       embed:false, brand:true,
    match:/teams\.(microsoft|live)\.com/i, tone:'sky',
    note:'Microsoft blocks embedding. Opens beside the portal instead.' },
  { id:'zoom',    name:'Zoom',              ic:'fa-video',           embed:false,
    match:/zoom\.(us|com)/i, tone:'sky',
    note:'Zoom blocks embedding in the browser. Opens beside the portal instead.' },
  { id:'webex',   name:'Webex',             ic:'fa-circle-nodes',    embed:false,
    match:/webex\.com/i, tone:'sky',
    note:'Cisco blocks embedding. Opens beside the portal instead.' },
  { id:'other',   name:'Meeting link',      ic:'fa-link',            embed:false,
    match:/.*/, tone:'', note:'Unknown provider — opened in a companion window to be safe.' },
];
function meetProvider(url){
  if (!url) return null;
  return MEET_PROVIDERS.find(p => p.match.test(url)) || MEET_PROVIDERS[MEET_PROVIDERS.length-1];
}

/* ── where links are stored ──
   per class id, falling back to a recurring link on the cohort. */
function meetStore(){
  const c = cms();
  c.meetings = c.meetings || { byClass:{}, byCohort:{}, settings:{ autoJoin:true, preferEmbed:true } };
  return c.meetings;
}
function meetLinkFor(cls){
  const st = meetStore();
  if (st.byClass[cls.id]) return st.byClass[cls.id];
  if (cls.cohort && st.byCohort[cls.cohort]) return st.byCohort[cls.cohort];
  return null;
}
function meetSetClass(clsId, url){ meetStore().byClass[clsId] = url; cmsSave(); }
function meetSetCohort(coId, url){ meetStore().byCohort[coId] = url; cmsSave(); }
function meetClear(clsId){ delete meetStore().byClass[clsId]; cmsSave(); }

/* Jitsi rooms are deterministic from the class id, so teacher and students
   land in the same room without anyone creating an account. */
function meetGenerateJitsi(cls){
  const slug = 'bloom-' + String(cls.id).replace(/[^a-z0-9]+/gi,'-').toLowerCase().slice(0,48);
  return 'https://meet.jit.si/' + slug;
}

/* embeddable URL, normalised per provider */
function meetEmbedURL(url, name){
  const p = meetProvider(url);
  if (!p || !p.embed) return null;
  const who = encodeURIComponent(name || B.profile.name || 'Student');
  if (p.id === 'jitsi'){
    const room = url.replace(/^https?:\/\/[^/]+\//,'').split('?')[0];
    const host = /8x8\.vc/i.test(url) ? '8x8.vc' : 'meet.jit.si';
    return 'https://' + host + '/' + room + '#userInfo.displayName=%22' + who + '%22'
      + '&config.prejoinPageEnabled=false&config.disableDeepLinking=true'
      + '&interfaceConfig.SHOW_CHROME_EXTENSION_BANNER=false';
  }
  if (p.id === 'whereby') return url + (url.includes('?') ? '&' : '?') + 'embed&displayName=' + who;
  if (p.id === 'daily')   return url + (url.includes('?') ? '&' : '?') + 'userName=' + who;
  return url;
}

/* ═══ STUDENT: THE ROOM PANEL ═══ */
function meetPanelHTML(cls, state){
  const url = meetLinkFor(cls);
  const p = url ? meetProvider(url) : null;
  const embeddable = p && p.embed;
  const joinable = state === 'live' || state === 'soon';

  if (!url) return `
    <div style="position:relative;z-index:2;text-align:center;padding:26px">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.26);display:grid;place-items:center;margin:0 auto 16px;font-size:22px;color:rgba(255,255,255,.7)"><i class="fa-solid fa-link-slash"></i></div>
      <div style="font-family:var(--display);font-size:18px;font-weight:700;color:#fff;margin-bottom:7px">No meeting link yet</div>
      <div style="font-size:12.5px;color:rgba(255,255,255,.6);max-width:360px;margin:0 auto;line-height:1.6">Your teacher has not added a joining link for this class. It will appear here as soon as they do.</div>
    </div>`;

  /* the real thing: running inside the portal */
  if (embeddable && joinable && lv.joined) return '';

  return `
    <div style="position:relative;z-index:2;text-align:center;padding:24px">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.3);display:grid;place-items:center;margin:0 auto 16px;font-size:22px;color:#fff">
        <i class="fa-${p.brand?'brands':'solid'} ${p.ic}"></i></div>
      <div style="font-family:var(--display);font-size:20px;font-weight:700;color:#fff;letter-spacing:-.3px;margin-bottom:7px">
        ${joinable ? (embeddable ? 'Join here, in the portal' : 'Ready to join on ' + p.name) : p.name + ' room is set up'}</div>
      <div style="font-size:12.5px;color:rgba(255,255,255,.64);max-width:400px;margin:0 auto 18px;line-height:1.6">
        ${!joinable ? 'The join button activates ten minutes before the start. Your notes and the chat stay here either way.'
          : embeddable ? 'The class opens inside this page — your notes, the chat and the hand stay right beside it.'
          : p.note + ' Your notes, the chat and the hand all stay here.'}</div>
      ${joinable ? `<div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        ${embeddable
          ? `<button class="btn btn-lg" style="background:#fff;color:var(--leaf-800)" onclick="meetJoinInline('${cls.id}')"><i class="fa-solid fa-video"></i> Join the class here</button>
             <button class="btn btn-ghost btn-lg" style="border-color:rgba(255,255,255,.3);color:#fff" onclick="meetOpenWindow('${cls.id}')"><i class="fa-solid fa-up-right-and-down-left-from-center"></i> Separate window</button>`
          : `<button class="btn btn-lg" style="background:#fff;color:var(--leaf-800)" onclick="meetOpenWindow('${cls.id}')"><i class="fa-${p.brand?'brands':'solid'} ${p.ic}"></i> Open ${p.name} beside the portal</button>`}
      </div>
      <div style="margin-top:14px;font-family:var(--mono);font-size:10.5px;color:rgba(255,255,255,.4)">${esc(url.replace(/^https?:\/\//,'').slice(0,52))}</div>` : ''}
    </div>`;
}

/* the live iframe, rendered in place of the placeholder */
function meetFrameHTML(cls){
  const url = meetLinkFor(cls);
  const src = meetEmbedURL(url, B.profile.name);
  if (!src) return '';
  const p = meetProvider(url);
  return `
    <iframe id="meetFrame" src="${esc(src)}" allow="camera; microphone; fullscreen; display-capture; autoplay; speaker-selection"
      allowfullscreen
      style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#0d1712;z-index:4"></iframe>
    <div style="position:absolute;top:12px;right:12px;z-index:6;display:flex;gap:7px">
      <button class="icobtn" style="background:rgba(0,0,0,.55);border-color:rgba(255,255,255,.2);color:#fff" title="Full screen" onclick="meetFullscreen()"><i class="fa-solid fa-expand"></i></button>
      <button class="icobtn" style="background:rgba(0,0,0,.55);border-color:rgba(255,255,255,.2);color:#fff" title="Open in its own window" onclick="meetOpenWindow('${cls.id}')"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>
      <button class="icobtn" style="background:var(--coral);border-color:var(--coral);color:#fff" title="Leave the call" onclick="meetLeave()"><i class="fa-solid fa-phone-slash"></i></button>
    </div>
    <div style="position:absolute;bottom:12px;left:12px;z-index:6;display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.55);color:#fff;border-radius:30px;padding:5px 13px;font-size:10.5px;font-weight:700">
      <i class="fa-solid ${p.ic}" style="color:var(--leaf-300)"></i>${p.name} · in the portal</div>`;
}

function meetJoinInline(clsId){
  const cls = findClass(clsId); if (!cls) return;
  lv.joined = true; lv.room = clsId;
  /* count attendance the moment they actually join */
  const st = lvState(); st.attended[clsId] = { at:new Date().toISOString(), via:'portal' }; save();
  navTo('live');
  toast('Joined in the portal — your notes stay beside the call', 'fa-video');
}
function meetLeave(){
  lv.joined = false; navTo('live');
  toast('Left the call. Your notes and the chat are saved.', 'fa-phone-slash');
}
function meetFullscreen(){
  const f = document.getElementById('meetFrame');
  if (f && f.requestFullscreen) f.requestFullscreen();
  else toast('Full screen is not available in this browser');
}
/* A companion window, sized and positioned so the portal stays visible
   beside it rather than being buried. */
function meetOpenWindow(clsId){
  const cls = findClass(clsId); if (!cls) return;
  const url = meetLinkFor(cls); if (!url){ toast('No meeting link for this class yet'); return; }
  const w = Math.min(1100, Math.round(screen.availWidth * 0.62));
  const h = Math.round(screen.availHeight * 0.86);
  const left = screen.availWidth - w;
  const win = window.open(url, 'bloom-class-' + clsId, `width=${w},height=${h},left=${left},top=0,noopener`);
  const st = lvState(); st.attended[clsId] = { at:new Date().toISOString(), via:'window' }; save();
  if (!win){ toast('Allow pop-ups to open the class window'); return; }
  toast('Class opened beside the portal — keep this tab for notes and chat', 'fa-up-right-and-down-left-from-center');
  navTo('live');
}

/* ═══ STAFF: SET THE LINK ═══ */
function meetSetupModal(clsId){
  const cls = findClassAny(clsId);
  if (!cls){ toast('Class not found'); return; }
  const current = meetLinkFor(cls) || '';
  const co = cls.cohort ? cohortOf(cls.cohort) : null;
  const cohortLink = co ? (meetStore().byCohort[co.id] || '') : '';
  const p = current ? meetProvider(current) : null;
  modal(`
    <div class="modal-hd">
      <div style="width:36px;height:36px;border-radius:11px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center"><i class="fa-solid fa-video"></i></div>
      <div style="flex:1"><h3>Joining link</h3><p>${esc(cls.title)} · ${cls.date} · ${cls.from}–${cls.to}</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd">
      <div class="fg" style="margin-bottom:6px"><label>Meeting link</label>
        <input id="meetURL" value="${esc(current)}" placeholder="https://meet.google.com/abc-defg-hij" oninput="meetPreview(this.value)"></div>
      <div id="meetProv" style="margin-bottom:16px">${meetProvHTML(current)}</div>

      <div style="padding:14px 16px;background:var(--leaf-50);border:1px solid var(--leaf-200);border-radius:12px;margin-bottom:16px">
        <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--leaf-700);font-weight:800;margin-bottom:8px">Want the class to run inside the portal?</div>
        <div style="font-size:12.5px;color:var(--ink-2);line-height:1.6;margin-bottom:12px">Teams, Meet and Zoom all block embedding, so they open in a window beside the portal. Jitsi embeds freely and needs no account — one click and students never leave Bloom.</div>
        <button class="btn btn-p btn-sm" onclick="meetUseJitsi('${cls.id}')"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate an embeddable Jitsi room</button>
      </div>

      <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--paper);border-radius:11px;cursor:pointer">
        <input type="checkbox" id="meetRecur" ${cohortLink && cohortLink === current ? 'checked' : ''} style="margin-top:2px">
        <span style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Use this link for <b>every</b> ${co ? esc(co.name) : 'cohort'} class, not just this one${cohortLink?` <span style="color:var(--ink-4)">(currently ${esc(cohortLink.replace(/^https?:\/\//,'').slice(0,30))})</span>`:''}</span></label>
    </div>
    <div class="modal-ft">
      ${current?`<button class="btn btn-g" style="margin-right:auto;color:var(--err)" onclick="meetRemove('${cls.id}')"><i class="fa-solid fa-trash"></i> Remove link</button>`:''}
      <button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="meetSave('${cls.id}')"><i class="fa-solid fa-check"></i> Save link</button></div>`, 620);
}
function meetProvHTML(url){
  if (!url || !url.trim()) return `<div style="font-size:11.5px;color:var(--ink-4)">Paste a Teams, Meet, Zoom, Jitsi or Whereby link.</div>`;
  if (!/^https?:\/\//i.test(url)) return `<div style="font-size:11.5px;color:var(--err)"><i class="fa-solid fa-triangle-exclamation"></i> That does not look like a full link — it should start with https://</div>`;
  const p = meetProvider(url);
  return `<div style="display:flex;gap:11px;align-items:flex-start;padding:11px 13px;background:${p.embed?'var(--ok-soft)':'var(--sky-soft)'};border-radius:10px">
    <i class="fa-${p.brand?'brands':'solid'} ${p.ic}" style="color:${p.embed?'var(--ok)':'var(--sky)'};margin-top:2px"></i>
    <div><b style="font-size:12.5px;display:block">${p.name}${p.embed?' — embeds in the portal':' — opens in a window'}</b>
      <span style="font-size:11.5px;color:var(--ink-4);line-height:1.5">${p.note}</span></div></div>`;
}
function meetPreview(v){ const el = document.getElementById('meetProv'); if (el) el.innerHTML = meetProvHTML(v); }
function meetUseJitsi(clsId){
  const cls = findClassAny(clsId); if (!cls) return;
  const url = meetGenerateJitsi(cls);
  const el = document.getElementById('meetURL');
  if (el){ el.value = url; meetPreview(url); }
  toast('Jitsi room generated — save to publish it', 'fa-wand-magic-sparkles');
}
function meetSave(clsId){
  const cls = findClassAny(clsId); if (!cls) return;
  const url = document.getElementById('meetURL').value.trim();
  if (!url){ toast('Paste a link, or remove it'); return; }
  if (!/^https?:\/\//i.test(url)){ toast('The link must start with https://'); return; }
  const recur = document.getElementById('meetRecur').checked;
  if (recur && cls.cohort) meetSetCohort(cls.cohort, url);
  meetSetClass(cls.id, url);
  closeModal(); navTo(B.section);
  const p = meetProvider(url);
  toast(recur ? 'Link saved for every class in the cohort' : 'Link saved · ' + p.name + (p.embed?' will embed in the portal':' opens in a window'), 'fa-link');
}
function meetRemove(clsId){
  meetClear(clsId); closeModal(); navTo(B.section); toast('Link removed');
}

/* staff look up classes across every cohort they teach, not just their own */
function findClassAny(id){
  if (typeof findClass === 'function'){ const c = findClass(id); if (c) return c; }
  const pool = (typeof myCohorts === 'function' ? myCohorts() : COHORTS);
  for (const co of pool){
    for (let w = -8; w <= 8; w++){
      const hit = classesFor(co, w).find(x => x.id === id);
      if (hit) return hit;
    }
  }
  return null;
}
