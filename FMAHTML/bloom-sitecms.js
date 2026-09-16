/* ═══════════════════════════════════════════════════════════════
   BLOOM — Public Website management, inside the main admin panel.
   Merges the former standalone site-admin into the portal so there
   is a single admin surface for the student platform and the site.
   Adds WhatsApp routing for enquiries.
═══════════════════════════════════════════════════════════════ */

let scms = { col:'dashboard', q:'', filter:'all', edit:null, tab:'inbox', setTab:'brand' };

const SITE_STATUS = ['published','draft'];
const SITE_CATS = ['Writing','Speaking','Reading','Listening','Strategy','Study abroad','Medical English','Vocabulary','Grammar'];

/* collection schema — cols for the table, fields for the editor */
const SITE_COLS = {
  blogs: { name:'Blog posts', ic:'fa-pen-nib', grp:'Content', sub:'Long-form guides and strategy posts shown on the blog page',
    cols:[['title','Title',1],['cat','Category'],['author','Author'],['date','Date'],['status','Status']],
    fields:[['title','Title','text',1],['slug','URL slug','text'],['cat','Category','select',0,SITE_CATS],['author','Author','text'],
      ['date','Publish date','date'],['read','Read time (min)','number'],['excerpt','Excerpt','textarea',1],
      ['tags','Tags (comma separated)','tags',1],['hero','Image slot id','text'],['featured','Feature on the blog page','bool'],['status','Status','select',0,SITE_STATUS]] },
  news: { name:'News & updates', ic:'fa-bullhorn', grp:'Content', sub:'Short announcements shown under the blog and in the site banner',
    cols:[['title','Headline',1],['kind','Type'],['date','Date'],['status','Status']],
    fields:[['title','Headline','text',1],['kind','Type','select',0,['Exam update','Admissions','Course launch','Announcement','Partnership']],
      ['date','Date','date'],['body','Body','textarea',1],['status','Status','select',0,SITE_STATUS]] },
  testimonials: { name:'Testimonials', ic:'fa-quote-left', grp:'Content', sub:'Quotes and band jumps shown on the results page and homepage',
    cols:[['name','Student',1],['from','From'],['outcome','Outcome'],['jump','Band jump'],['status','Status']],
    fields:[['name','Student name','text',1],['from','From (city, country)','text'],['outcome','Outcome','text'],
      ['start','Starting band','number'],['end','Final band','number'],['quote','Quote','textarea',1],['status','Status','select',0,SITE_STATUS]] },
  courses: { name:'Courses', ic:'fa-graduation-cap', grp:'Content', sub:'The course catalogue shown on the courses page',
    cols:[['name','Course',1],['level','Level'],['weeks','Weeks'],['tier','Tier'],['price','Price'],['status','Status']],
    fields:[['name','Course name','text',1],['level','CEFR level','text'],['weeks','Length (weeks)','number'],
      ['tier','Tier','select',0,['Core','Plus','Premium']],['price','Price','text'],['blurb','Description','textarea',1],['status','Status','select',0,SITE_STATUS]] },
  unis: { name:'Universities', ic:'fa-building-columns', grp:'Admissions', sub:'The university network shown on the study-abroad page and homepage',
    cols:[['name','University',1],['country','Country'],['course','Course'],['ielts','IELTS'],['rank','QS'],['status','Status']],
    fields:[['name','University','text',1],['country','Country','text'],['flag','Flag emoji','text'],['city','City','text'],
      ['rank','QS ranking','number'],['tuition','Tuition per year','text'],['intake','Intakes','text'],
      ['course','Example course','text',1],['ielts','IELTS requirement','text',1],['perSkill','Per-skill rule','text'],['toefl','TOEFL requirement','text'],
      ['photo','Campus image slot id','text'],['note','Advisory note','textarea'],['featured','Feature on the homepage','bool'],['status','Status','select',0,SITE_STATUS]] },
  staff: { name:'Academic staff', ic:'fa-users', grp:'Admissions', sub:'Leadership and teaching staff shown on the about page and homepage',
    cols:[['name','Name',1],['role','Role'],['spec','Specialism'],['years','Years'],['status','Status']],
    fields:[['name','Full name','text',1],['role','Role','text',1],['slot','Photo slot id','text'],['from','Based in','text'],
      ['spec','Specialism','text',1],['langs','Languages','text'],['years','Years of experience','number'],
      ['bio','Biography','textarea',1],['lead','Show as operational leader','bool'],['status','Status','select',0,SITE_STATUS]] },
  gallery: { name:'Photo gallery', ic:'fa-images', grp:'Content', sub:'Photographs shown in the Moments in Bloom mosaic', custom:'gallery' },
};
const SITE_GRPS = ['Content','Admissions'];

/* ═══ WHATSAPP ROUTING ═══ */
function waCfg(){
  const s = cms().settings;
  s.wa = s.wa || {
    on: true,
    team: '+919008041720',
    extra: '',
    webhook: '',
    autoOpen: false,
    routeMedical: '',
    routeAbroad: '',
    template: 'New Bloom enquiry\n\nName: {name}\nCountry: {country}\nInterested in: {interest}\nCurrent band: {band} → target {target}\nEmail: {email}\nPhone: {phone}\n\n"{msg}"\n\nReceived {at} · ref {ref}',
    replyTemplate: 'Hello {first}, this is Bloom IELTS Academy. Thank you for your enquiry about {interest} — when would suit you for a short consultation call?',
  };
  return s.wa;
}
function waLog(){ const c = cms(); c.waLog = c.waLog || []; return c.waLog; }

function waDigits(n){ return String(n || '').replace(/[^\d]/g, ''); }
function waRender(tpl, e){
  const map = {
    name: e.name || '—', first: (e.name || '').split(' ')[0] || 'there',
    email: e.email || '—', phone: e.phone || '—', country: e.country || '—',
    interest: e.interest || 'IELTS preparation', band: e.band || 'not tested', target: e.target || '—',
    msg: (e.msg || '').trim() || 'No message',
    at: e.at || today(), ref: e.ref || e.id || '—',
  };
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => map[k] !== undefined ? map[k] : '{' + k + '}');
}
/* which number handles this enquiry */
function waRoute(e){
  const cfg = waCfg();
  const i = (e.interest || '').toLowerCase();
  if (cfg.routeMedical && /oet|medical|nurse|doctor|dent|gmc|nmc|pharmac/.test(i)) return cfg.routeMedical;
  if (cfg.routeAbroad && /abroad|university|visa|admission|masters|undergrad/.test(i)) return cfg.routeAbroad;
  return cfg.team;
}
function waLink(number, text){ return 'https://wa.me/' + waDigits(number) + '?text=' + encodeURIComponent(text); }

/* fire the notification: webhook first (real automation), deep link as the fallback */
async function waNotify(e, opts){
  const cfg = waCfg();
  if (!cfg.on) return { ok:false, how:'disabled' };
  const to = waRoute(e);
  const body = waRender(cfg.template, e);
  const entry = { id:'wa'+Date.now().toString(36), at:new Date().toISOString(), ref:e.ref||e.id, name:e.name, to, body, how:'queued', ok:false };

  if (cfg.webhook){
    try {
      const r = await fetch(cfg.webhook, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ event:'enquiry.created', to, message:body, enquiry:e, sentAt:entry.at }),
      });
      entry.how = 'webhook'; entry.ok = r.ok; entry.code = r.status;
    } catch(err){ entry.how = 'webhook'; entry.ok = false; entry.err = String(err.message || err); }
  }
  entry.link = waLink(to, body);
  waLog().unshift(entry);
  cms().waLog = waLog().slice(0, 60);
  cmsSave();

  if (!entry.ok && (cfg.autoOpen || (opts && opts.open))) window.open(entry.link, '_blank');
  return entry;
}

/* ═══ SECTION ROUTER ═══ */
function sec_site(){
  if (scms.col === 'dashboard') return siteDashHTML();
  if (scms.col === 'gallery') return siteGalleryHTML();
  return siteTableHTML(scms.col);
}

function siteNavPills(){
  return `<div class="pills mb" style="margin-bottom:18px">
    <button class="pill ${scms.col==='dashboard'?'on':''}" onclick="scms.col='dashboard';navTo('site')"><i class="fa-solid fa-gauge-high"></i> Overview</button>
    ${Object.entries(SITE_COLS).map(([k,c])=>`<button class="pill ${scms.col===k?'on':''}" onclick="scms.col='${k}';scms.q='';scms.filter='all';navTo('site')"><i class="fa-solid ${c.ic}"></i> ${c.name} <span class="n">${(cms()[k]||[]).length}</span></button>`).join('')}
  </div>`;
}

function siteDashHTML(){
  const c = cms();
  const enq = c.enquiries || [];
  const neu = enq.filter(e => e.status === 'new').length;
  const drafts = Object.keys(SITE_COLS).reduce((n,k) => n + (c[k]||[]).filter(r => r.status === 'draft').length, 0);
  const log = waLog();
  return `
    ${phead({ eyebrow:'Administration · Public website', title:`The <em>website</em>`,
      sub:'Everything visitors see — blog, universities, staff, testimonials, courses and photography — edited here and published straight to the live pages.',
      actions:`<a class="btn btn-g btn-sm" href="index.html" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> View live site</a>
        <button class="btn btn-p btn-sm" onclick="scms.col='news';siteEdit('news',null)"><i class="fa-solid fa-bullhorn"></i> Post an update</button>` })}
    ${siteNavPills()}

    <div class="grid g4 mb2">
      ${statCard('New enquiries', neu, neu?'Awaiting a first reply':'Inbox clear', neu?'cor':'leaf', 'fa-inbox')}
      ${statCard('Published items', Object.keys(SITE_COLS).reduce((n,k)=>n+(c[k]||[]).filter(r=>r.status==='published').length,0), drafts + ' in draft', 'leaf', 'fa-globe')}
      ${statCard('Universities', (c.unis||[]).length, (c.unis||[]).filter(u=>u.featured).length + ' featured on the homepage', 'sky', 'fa-building-columns')}
      ${statCard('WhatsApp alerts', log.length, waCfg().on ? (waCfg().webhook ? 'Webhook connected' : 'Deep-link mode') : 'Notifications off', waCfg().on?'amb':'', 'fa-whatsapp')}
    </div>

    ${neu ? `
    <div class="card mb2" style="border-color:var(--coral);background:linear-gradient(180deg,var(--coral-soft),var(--surface) 60%)">
      <div class="card-bd" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:var(--coral);color:#fff;display:grid;place-items:center;font-size:17px"><i class="fa-solid fa-inbox"></i></div>
        <div style="flex:1;min-width:220px">
          <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:#b73f31;font-weight:800;margin-bottom:5px">Needs a reply</div>
          <b style="font-family:var(--display);font-size:18px;font-weight:700;display:block">${neu} new enquir${neu===1?'y':'ies'} from the website</b>
          <span style="font-size:12.5px;color:var(--ink-3)">Each one already has a WhatsApp reply drafted and ready to send.</span>
        </div>
        <button class="btn btn-p" onclick="navTo('enquiries')">Open the inbox <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>` : ''}

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Collections</h3><p>What is live on the public site right now</p></div></div>
        <div class="card-bd flush">
          ${Object.entries(SITE_COLS).map(([k,col]) => {
            const list = c[k] || [];
            const pub = list.filter(r => r.status === 'published').length;
            return `<div class="row" style="cursor:pointer" onclick="scms.col='${k}';navTo('site')">
              <div class="ic"><i class="fa-solid ${col.ic}"></i></div>
              <div class="tx"><b>${col.name}</b><span>${col.sub}</span></div>
              <div style="text-align:right;flex:0 0 auto"><div style="font-family:var(--mono);font-size:13px;font-weight:700">${pub}/${list.length}</div>
                <div style="font-size:10px;color:var(--ink-4)">published</div></div>
              <i class="fa-solid fa-chevron-right" style="color:var(--line-2);font-size:11px"></i></div>`;
          }).join('')}
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Site banner</h3><p>The strip above the navigation on every page</p></div></div>
          <div class="card-bd">
            <label style="display:flex;align-items:center;gap:10px;padding:11px 13px;background:var(--paper);border-radius:11px;cursor:pointer;margin-bottom:13px">
              <input type="checkbox" ${c.settings.bannerOn?'checked':''} onchange="cms().settings.bannerOn=this.checked;cmsSave();navTo('site')">
              <span style="font-size:12.5px;font-weight:700">Banner is ${c.settings.bannerOn?'live':'hidden'}</span></label>
            <div class="fg" style="margin-bottom:11px"><label>Message</label><input value="${esc(c.settings.bannerText)}" oninput="cms().settings.bannerText=this.value" onchange="cmsSave()"></div>
            <div class="fgrid"><div class="fg"><label>Button label</label><input value="${esc(c.settings.bannerCta)}" oninput="cms().settings.bannerCta=this.value" onchange="cmsSave()"></div>
              <div class="fg"><label>Button link</label><input value="${esc(c.settings.bannerLink)}" oninput="cms().settings.bannerLink=this.value" onchange="cmsSave()"></div></div>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Recent WhatsApp alerts</h3><p>${waCfg().webhook?'Sent through your webhook':'Deep links, opened manually'}</p></div>
            <button class="btn btn-g btn-sm" onclick="navTo('waset')">Configure</button></div>
          <div class="card-bd flush">
            ${log.length ? log.slice(0,5).map(l => `<div class="row">
              <div class="ic ${l.ok?'':'amb'}" style="${l.ok?'background:var(--ok-soft);color:var(--ok)':''}"><i class="fa-brands fa-whatsapp"></i></div>
              <div class="tx"><b>${esc(l.name||'Enquiry')}</b><span>${l.how}${l.code?' · HTTP '+l.code:''} · ${new Date(l.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div>
              <a class="btn btn-g btn-sm" href="${l.link}" target="_blank"><i class="fa-brands fa-whatsapp"></i></a></div>`).join('')
            : `<div style="padding:24px;text-align:center;font-size:12.5px;color:var(--ink-4)">No alerts yet. The next website enquiry will appear here.</div>`}
          </div>
        </div>
      </div>
    </div>`;
}

/* ── generic collection table ── */
function siteTableHTML(k){
  const C = SITE_COLS[k], all = cms()[k] || [];
  const q = scms.q.trim().toLowerCase();
  let list = all.filter(r => scms.filter === 'all' || r.status === scms.filter);
  if (q) list = list.filter(r => Object.values(r).join(' ').toLowerCase().includes(q));
  const statuses = [...new Set(all.map(r => r.status))];
  return `
    ${phead({ eyebrow:'Public website · ' + C.grp, title:C.name.replace(/(\S+)$/,'<em>$1</em>'), sub:C.sub,
      actions:`<button class="btn btn-g btn-sm" onclick="siteExport('${k}')"><i class="fa-solid fa-file-csv"></i> Export</button>
        <button class="btn btn-p btn-sm" onclick="siteEdit('${k}',null)"><i class="fa-solid fa-plus"></i> Add</button>` })}
    ${siteNavPills()}
    <div class="card mb2"><div class="card-bd" style="padding:13px 17px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div class="search" style="flex:1;min-width:220px"><i class="fa-solid fa-magnifying-glass"></i>
        <input placeholder="Search ${C.name.toLowerCase()}…" value="${esc(scms.q)}" oninput="scms.q=this.value;clearTimeout(window.__sq);window.__sq=setTimeout(()=>navTo('site'),240)"></div>
      <div class="pills" style="margin:0">
        <button class="pill ${scms.filter==='all'?'on':''}" onclick="scms.filter='all';navTo('site')">All <span class="n">${all.length}</span></button>
        ${statuses.map(s=>`<button class="pill ${scms.filter===s?'on':''}" onclick="scms.filter='${s}';navTo('site')">${s} <span class="n">${all.filter(r=>r.status===s).length}</span></button>`).join('')}
      </div>
    </div></div>
    ${list.length ? `<div class="card"><div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
      <thead><tr>${C.cols.map(([,l])=>`<th>${l}</th>`).join('')}<th></th></tr></thead>
      <tbody>${list.map(r => `<tr>
        ${C.cols.map(([f,,strong]) => {
          let v;
          if (f === 'jump') v = `<span style="font-family:var(--mono)">${r.start} → <b style="color:var(--leaf-700)">${r.end}</b></span>`;
          else if (f === 'status') v = `<span class="tag ${r.status==='published'?'ok':'amb'}">${r.status}</span>`;
          else if (f === 'country' && r.flag) v = r.flag + ' ' + esc(r.country);
          else if (f === 'rank') v = r.rank ? 'QS #' + r.rank : '—';
          else v = esc(r[f] == null || r[f] === '' ? '—' : r[f]);
          return `<td>${strong?`<b style="color:var(--ink)">${v}</b>${r.featured?' <span class="tag amb">featured</span>':''}`:v}</td>`;
        }).join('')}
        <td style="text-align:right;white-space:nowrap">
          <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="${r.status==='published'?'Unpublish':'Publish'}" onclick="sitePub('${k}','${r.id}')"><i class="fa-solid fa-${r.status==='published'?'eye-slash':'upload'}"></i></button>
          <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Edit" onclick="siteEdit('${k}','${r.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Duplicate" onclick="siteDupe('${k}','${r.id}')"><i class="fa-solid fa-copy"></i></button>
          <button class="icobtn" style="width:28px;height:28px;font-size:11px" title="Delete" onclick="siteDel('${k}','${r.id}')"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('')}</tbody></table></div></div></div>`
    : `<div class="empty"><i class="fa-solid ${C.ic}"></i><b>Nothing here yet</b><span>Add the first ${C.name.toLowerCase().replace(/s$/,'')} and it appears on the live site once published.</span>
        <div style="margin-top:16px"><button class="btn btn-p btn-sm" onclick="siteEdit('${k}',null)"><i class="fa-solid fa-plus"></i> Add</button></div></div>`}`;
}

/* ── record editor ── */
function siteEdit(k, id){
  const C = SITE_COLS[k];
  const rec = id ? (cms()[k]||[]).find(r => r.id === id) : null;
  scms.edit = { k, id };
  modal(`
    <div class="modal-hd"><div style="width:36px;height:36px;border-radius:11px;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center"><i class="fa-solid ${C.ic}"></i></div>
      <div style="flex:1"><h3>${id?'Edit':'New'} ${C.name.toLowerCase().replace(/s$/,'')}</h3><p>${C.sub}</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      ${C.fields.map(([f,label,type,full,opts]) => {
        const v = rec ? rec[f] : (type === 'date' ? today() : type === 'bool' ? false : '');
        const cls = full || type === 'textarea' ? 'fg full' : 'fg';
        if (type === 'bool') return `<div class="${cls}"><label style="display:flex;align-items:center;gap:10px;cursor:pointer;text-transform:none;letter-spacing:0;font-size:12.5px;color:var(--ink-2);font-weight:600">
          <input type="checkbox" data-f="${f}" ${v?'checked':''}> ${label}</label></div>`;
        if (type === 'select') return `<div class="${cls}"><label>${label}</label><select data-f="${f}">${opts.map(o=>`<option ${v===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
        if (type === 'textarea') return `<div class="${cls}"><label>${label}</label><textarea rows="3" data-f="${f}">${esc(v)}</textarea></div>`;
        if (type === 'tags') return `<div class="${cls}"><label>${label}</label><input data-f="${f}" data-tags="1" value="${esc(Array.isArray(v)?v.join(', '):v)}"></div>`;
        return `<div class="${cls}"><label>${label}</label><input type="${type==='number'?'number':type==='date'?'date':'text'}" data-f="${f}" value="${esc(v)}"></div>`;
      }).join('')}
    </div></div>
    <div class="modal-ft">
      ${id?`<button class="btn btn-g" style="margin-right:auto;color:var(--err)" onclick="siteDel('${k}','${id}',1)"><i class="fa-solid fa-trash"></i> Delete</button>`:''}
      <button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="siteSave()"><i class="fa-solid fa-check"></i> Save</button></div>`, 680);
}
function siteSave(){
  const { k, id } = scms.edit;
  const C = SITE_COLS[k];
  const rec = { id: id || (k.slice(0,1) + Date.now().toString(36)) };
  document.querySelectorAll('.modal [data-f]').forEach(el => {
    const f = el.dataset.f;
    if (el.type === 'checkbox') rec[f] = el.checked;
    else if (el.dataset.tags) rec[f] = el.value.split(',').map(x => x.trim()).filter(Boolean);
    else if (el.type === 'number') rec[f] = el.value === '' ? null : +el.value;
    else rec[f] = el.value;
  });
  const req = C.fields.find(([f,,,full]) => full === 1);
  if (req && !String(rec[req[0]] || '').trim()){ toast('“' + req[1] + '” is required'); return; }
  if (!rec.status) rec.status = 'published';
  const list = cms()[k] = cms()[k] || [];
  if (id){ const i = list.findIndex(r => r.id === id); list[i] = { ...list[i], ...rec }; }
  else list.unshift(rec);
  cmsSave(); closeModal(); navTo('site');
  toast((id?'Updated':'Added') + ' · live on the site now', 'fa-globe');
}
function sitePub(k, id){
  const r = (cms()[k]||[]).find(x => x.id === id); if (!r) return;
  r.status = r.status === 'published' ? 'draft' : 'published';
  cmsSave(); navTo('site');
  toast(r.status === 'published' ? 'Published to the live site' : 'Moved to draft', r.status === 'published' ? 'fa-upload' : 'fa-eye-slash');
}
function siteDupe(k, id){
  const r = (cms()[k]||[]).find(x => x.id === id); if (!r) return;
  cms()[k].unshift({ ...r, id: k.slice(0,1)+Date.now().toString(36), title: r.title?r.title+' (copy)':undefined, name: r.name?r.name+' (copy)':undefined, status:'draft' });
  cmsSave(); navTo('site'); toast('Duplicated as a draft');
}
function siteDel(k, id, fromModal){
  const r = (cms()[k]||[]).find(x => x.id === id); if (!r) return;
  if (!confirm('Delete “' + (r.title || r.name || id) + '”? This removes it from the live site.')) return;
  cms()[k] = cms()[k].filter(x => x.id !== id);
  cmsSave(); if (fromModal) closeModal();
  navTo('site'); toast('Deleted');
}
function siteExport(k){
  const list = cms()[k] || []; if (!list.length){ toast('Nothing to export'); return; }
  const keys = [...new Set(list.flatMap(r => Object.keys(r)))];
  const csv = [keys.join(','), ...list.map(r => keys.map(x => `"${String(r[x]==null?'':Array.isArray(r[x])?r[x].join('; '):r[x]).replace(/"/g,'""')}"`).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'bloom-' + k + '-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('Exported ' + list.length + ' rows', 'fa-file-csv');
}

/* ── gallery (ordered, visual) ── */
function siteGalleryHTML(){
  const g = cms().gallery || [];
  return `
    ${phead({ eyebrow:'Public website · Content', title:`Photo <em>gallery</em>`, sub:'The Moments in Bloom mosaic. Order here is the order on the page — drop the photographs into the slots on the live site.',
      actions:`<button class="btn btn-p btn-sm" onclick="siteGalAdd()"><i class="fa-solid fa-plus"></i> Add photo slot</button>` })}
    ${siteNavPills()}
    <div class="grid g3">
      ${g.map((x,i) => `<div class="card"><div class="card-bd" style="padding:0">
        <div style="position:relative;aspect-ratio:4/3;background:var(--paper-2);border-radius:var(--r-lg) var(--r-lg) 0 0;overflow:hidden">
          <image-slot id="${esc(x.slot)}" shape="rect" placeholder="${esc(x.title)}" style="position:absolute;inset:0"></image-slot>
          <span style="position:absolute;top:9px;left:9px;background:rgba(12,33,20,.78);color:#fff;border-radius:7px;padding:3px 9px;font-family:var(--mono);font-size:10.5px;font-weight:800;z-index:3">${i+1}</span>
          ${x.status!=='published'?'<span style="position:absolute;top:9px;right:9px;z-index:3" class="tag amb">draft</span>':''}
        </div>
        <div style="padding:14px 16px">
          <b style="font-size:13.5px;display:block;margin-bottom:3px">${esc(x.title)}</b>
          <span style="font-size:11.5px;color:var(--ink-4);display:block;margin-bottom:11px">${esc(x.sub)}</span>
          <div style="display:flex;gap:5px">
            <button class="icobtn" style="width:28px;height:28px;font-size:10px" ${i===0?'disabled':''} onclick="siteGalMove(${i},-1)"><i class="fa-solid fa-arrow-up"></i></button>
            <button class="icobtn" style="width:28px;height:28px;font-size:10px" ${i===g.length-1?'disabled':''} onclick="siteGalMove(${i},1)"><i class="fa-solid fa-arrow-down"></i></button>
            <div style="flex:1"></div>
            <button class="icobtn" style="width:28px;height:28px;font-size:10px" onclick="siteGalEdit('${x.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="icobtn" style="width:28px;height:28px;font-size:10px" onclick="sitePub('gallery','${x.id}')"><i class="fa-solid fa-${x.status==='published'?'eye-slash':'upload'}"></i></button>
            <button class="icobtn" style="width:28px;height:28px;font-size:10px" onclick="siteDel('gallery','${x.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div></div></div>`).join('')}
    </div>`;
}
function siteGalMove(i, d){
  const g = cms().gallery; const j = i + d;
  if (j < 0 || j >= g.length) return;
  [g[i], g[j]] = [g[j], g[i]]; cmsSave(); navTo('site');
}
function siteGalAdd(){ siteGalEdit(null); }
function siteGalEdit(id){
  const x = id ? cms().gallery.find(r => r.id === id) : null;
  modal(`<div class="modal-hd"><div style="flex:1"><h3>${id?'Edit':'Add'} photo slot</h3><p>The slot id is where the photograph is dropped on the live page</p></div>
      <button class="icobtn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-bd"><div class="fgrid">
      <div class="fg full"><label>Caption</label><input id="gT" value="${esc(x?x.title:'')}" placeholder="Results day, July 2026"></div>
      <div class="fg full"><label>Sub-caption</label><input id="gS" value="${esc(x?x.sub:'')}" placeholder="Sixteen students, eleven at Band 7 or above"></div>
      <div class="fg"><label>Image slot id</label><input id="gI" value="${esc(x?x.slot:'mo-'+((cms().gallery||[]).length+1))}"></div>
      <div class="fg"><label>Status</label><select id="gP">${SITE_STATUS.map(s=>`<option ${x&&x.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div></div>
    <div class="modal-ft"><button class="btn btn-g" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="siteGalSave('${id||''}')"><i class="fa-solid fa-check"></i> Save</button></div>`, 560);
}
function siteGalSave(id){
  const t = document.getElementById('gT').value.trim();
  if (!t){ toast('Give the photo a caption'); return; }
  const rec = { id: id || 'g'+Date.now().toString(36), title:t, sub:document.getElementById('gS').value.trim(),
    slot:document.getElementById('gI').value.trim(), status:document.getElementById('gP').value };
  const g = cms().gallery = cms().gallery || [];
  if (id){ const i = g.findIndex(r => r.id === id); g[i] = rec; } else g.push(rec);
  cmsSave(); closeModal(); navTo('site'); toast('Gallery updated', 'fa-images');
}

/* ═══ ENQUIRY INBOX ═══ */
function sec_enquiries(){
  const all = (cms().enquiries || []).slice().sort((a,b) => String(b.at).localeCompare(String(a.at)));
  const list = scms.tab === 'inbox' ? all.filter(e => e.status === 'new' || e.status === 'contacted') : scms.tab === 'all' ? all : all.filter(e => e.status === scms.tab);
  const cfg = waCfg();
  return `
    ${phead({ eyebrow:'Administration · Public website', title:`Enquiry <em>inbox</em>`,
      sub:`Consultation requests from the website. ${cfg.on ? (cfg.webhook ? 'Each one is pushed to WhatsApp through your webhook the moment it arrives.' : 'Each one arrives with a WhatsApp message pre-drafted for your team number.') : 'WhatsApp notifications are currently switched off.'}`,
      actions:`<button class="btn btn-g btn-sm" onclick="navTo('waset')"><i class="fa-brands fa-whatsapp"></i> WhatsApp settings</button>
        <button class="btn btn-g btn-sm" onclick="siteExport('enquiries')"><i class="fa-solid fa-file-csv"></i> Export</button>
        <button class="btn btn-p btn-sm" onclick="enqTest()"><i class="fa-solid fa-flask"></i> Send a test</button>` })}

    <div class="grid g4 mb2">
      ${statCard('New', all.filter(e=>e.status==='new').length, 'No reply sent yet', 'cor', 'fa-inbox')}
      ${statCard('Contacted', all.filter(e=>e.status==='contacted').length, 'Awaiting their answer', 'amb', 'fa-comments')}
      ${statCard('Converted', all.filter(e=>e.status==='converted').length, 'Became students', 'leaf', 'fa-user-check')}
      ${statCard('Alerts fired', waLog().length, cfg.webhook?'Via webhook':'Deep-link mode', 'sky', 'fa-whatsapp')}
    </div>

    <div class="seg mb" style="margin-bottom:16px">
      ${[['inbox','Inbox'],['new','New'],['contacted','Contacted'],['converted','Converted'],['closed','Closed'],['all','Everything']]
        .map(([k,l])=>`<button class="${scms.tab===k?'on':''}" onclick="scms.tab='${k}';navTo('enquiries')">${l}</button>`).join('')}
    </div>

    ${list.length ? `<div style="display:grid;gap:13px">
      ${list.map(e => {
        const to = waRoute(e);
        const teamMsg = waRender(cfg.template, e);
        const reply = waRender(cfg.replyTemplate, e);
        return `<div class="card"><div class="card-bd">
          <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:13px">
            <div style="width:40px;height:40px;flex:0 0 40px;border-radius:50%;background:linear-gradient(140deg,var(--leaf-700),var(--leaf-500));color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800">${initials(e.name||'?')}</div>
            <div style="flex:1;min-width:200px">
              <b style="font-size:15px;display:block">${esc(e.name||'Unnamed')}</b>
              <span style="font-family:var(--mono);font-size:11px;color:var(--ink-4)">${esc(e.country||'—')} · ${esc(e.interest||'—')} · band ${esc(e.band||'—')}${e.target?' → '+esc(e.target):''} · ${esc(e.at||'')}</span>
            </div>
            <span class="tag ${e.status==='new'?'cor':e.status==='contacted'?'amb':e.status==='converted'?'ok':''}">${e.status}</span>
          </div>
          ${e.msg?`<div style="font-size:13px;color:var(--ink-2);line-height:1.65;padding:12px 14px;background:var(--paper);border-radius:11px;margin-bottom:13px;font-style:italic">“${esc(e.msg)}”</div>`:''}
          <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-3);margin-bottom:14px">
            ${e.email?`<span><i class="fa-solid fa-envelope" style="width:15px;color:var(--ink-4)"></i> ${esc(e.email)}</span>`:''}
            ${e.phone?`<span><i class="fa-solid fa-phone" style="width:15px;color:var(--ink-4)"></i> ${esc(e.phone)}</span>`:''}
            <span><i class="fa-brands fa-whatsapp" style="width:15px;color:#25D366"></i> routes to ${esc(to)}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn btn-sm btn-wa" href="${waLink(to, teamMsg)}" target="_blank"><i class="fa-brands fa-whatsapp"></i> Notify team</a>
            ${e.phone?`<a class="btn btn-sm btn-wa-alt" href="${waLink(e.phone, reply)}" target="_blank" onclick="enqSet('${e.id}','contacted')"><i class="fa-brands fa-whatsapp"></i> Reply to student</a>`:''}
            ${e.email?`<a class="btn btn-g btn-sm" href="mailto:${esc(e.email)}?subject=${encodeURIComponent('Your Bloom IELTS enquiry')}&body=${encodeURIComponent(reply)}"><i class="fa-solid fa-envelope"></i> Email</a>`:''}
            <div style="flex:1"></div>
            ${e.status!=='converted'?`<button class="btn btn-g btn-sm" onclick="enqSet('${e.id}','converted')"><i class="fa-solid fa-user-check"></i> Converted</button>`:''}
            ${e.status!=='closed'?`<button class="btn btn-q btn-sm" onclick="enqSet('${e.id}','closed')">Close</button>`:''}
            <button class="icobtn" style="width:30px;height:30px;font-size:11px" onclick="siteEdit('enquiries','${e.id}')"><i class="fa-solid fa-pen"></i></button>
          </div>
        </div></div>`;
      }).join('')}
    </div>`
    : `<div class="empty"><i class="fa-solid fa-inbox"></i><b>Nothing in this view</b><span>Enquiries submitted on the contact page land here, and fire a WhatsApp alert as they arrive.</span></div>`}`;
}
SITE_COLS.enquiries = { name:'Enquiries', ic:'fa-inbox', grp:'People', sub:'Consultation requests from the contact page',
  cols:[['name','Name',1],['country','Country'],['interest','Interested in'],['at','Received'],['status','Status']],
  fields:[['name','Name','text',1],['email','Email','text'],['phone','WhatsApp number','text'],['country','Country','text'],
    ['interest','Interested in','text'],['band','Current band','text'],['target','Target','text'],['msg','Message','textarea',1],
    ['at','Received','date'],['status','Status','select',0,['new','contacted','converted','closed']]] };

function enqSet(id, status){
  const e = (cms().enquiries||[]).find(x => x.id === id); if (!e) return;
  e.status = status; cmsSave(); navTo('enquiries');
  toast('Marked as ' + status, status === 'converted' ? 'fa-user-check' : 'fa-check');
}
async function enqTest(){
  const e = { id:'test'+Date.now().toString(36), ref:'TEST', name:'Test Enquiry', email:'test@example.com', phone:waCfg().team,
    country:'India', interest:'IELTS Academic', band:'6.0', target:'7.5', msg:'This is a test of the WhatsApp notification route.', at:today(), status:'new' };
  const r = await waNotify(e, { open:true });
  toast(r.how === 'webhook' ? (r.ok ? 'Webhook accepted the test · HTTP ' + r.code : 'Webhook failed · opened WhatsApp instead') : 'Test opened in WhatsApp', 'fa-whatsapp');
  navTo('enquiries');
}

/* ═══ WHATSAPP SETTINGS ═══ */
function sec_waset(){
  const c = waCfg(), log = waLog();
  return `
    ${phead({ eyebrow:'Administration · Automation', title:`WhatsApp <em>notifications</em>`,
      sub:'Route website enquiries to the right person on WhatsApp the moment they arrive, instead of waiting for someone to open the admin panel.',
      actions:`<button class="btn btn-g btn-sm" onclick="navTo('enquiries')"><i class="fa-solid fa-inbox"></i> Inbox</button>
        <button class="btn btn-p btn-sm" onclick="enqTest()"><i class="fa-solid fa-paper-plane"></i> Send a test</button>` })}

    <div class="card mb2" style="border-color:#25D366;background:linear-gradient(180deg,rgba(37,211,102,.08),var(--surface) 60%)">
      <div class="card-bd" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="width:46px;height:46px;flex:0 0 46px;border-radius:14px;background:#25D366;color:#fff;display:grid;place-items:center;font-size:20px"><i class="fa-brands fa-whatsapp"></i></div>
        <div style="flex:1;min-width:220px">
          <b style="font-family:var(--display);font-size:18px;font-weight:700;display:block">Notifications are ${c.on?'on':'off'}${c.on?(c.webhook?' · webhook connected':' · deep-link mode'):''}</b>
          <span style="font-size:12.5px;color:var(--ink-3)">${c.on?(c.webhook?'Enquiries are POSTed to your automation endpoint, which sends the WhatsApp message.':'Enquiries are logged with a pre-filled WhatsApp link. Add a webhook below for fully hands-off delivery.'):'Enquiries are still saved to the inbox, but nobody is alerted.'}</span>
        </div>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:700">
          <input type="checkbox" ${c.on?'checked':''} onchange="waCfg().on=this.checked;cmsSave();navTo('waset')"> Enabled</label>
      </div>
    </div>

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Who gets alerted</h3><p>Enquiries route by what the student asked about</p></div></div>
          <div class="card-bd" style="display:grid;gap:14px">
            <div class="fg"><label>Main team number</label><input value="${esc(c.team)}" placeholder="+91 90080 41720" oninput="waCfg().team=this.value" onchange="cmsSave()">
              <span style="font-size:11.5px;color:var(--ink-4)">Include the country code. Everything not matched below goes here.</span></div>
            <div class="fg"><label>Medical &amp; OET enquiries</label><input value="${esc(c.routeMedical)}" placeholder="Leave blank to use the main number" oninput="waCfg().routeMedical=this.value" onchange="cmsSave()">
              <span style="font-size:11.5px;color:var(--ink-4)">Matches OET, medical, nurse, doctor, dentist, GMC, NMC, pharmacy.</span></div>
            <div class="fg"><label>Study-abroad enquiries</label><input value="${esc(c.routeAbroad)}" placeholder="Leave blank to use the main number" oninput="waCfg().routeAbroad=this.value" onchange="cmsSave()">
              <span style="font-size:11.5px;color:var(--ink-4)">Matches university, visa, admission, masters, undergraduate.</span></div>
            <label style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--paper);border-radius:11px;cursor:pointer">
              <input type="checkbox" ${c.autoOpen?'checked':''} onchange="waCfg().autoOpen=this.checked;cmsSave()">
              <span style="font-size:12.5px;color:var(--ink-2)">Open WhatsApp automatically when an enquiry arrives while the panel is open</span></label>
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Fully automated delivery</h3><p>Optional — connect an automation endpoint</p></div></div>
          <div class="card-bd">
            <div class="fg" style="margin-bottom:13px"><label>Webhook URL</label>
              <input value="${esc(c.webhook)}" placeholder="https://hooks.zapier.com/hooks/catch/…" oninput="waCfg().webhook=this.value" onchange="cmsSave()"></div>
            <div style="font-size:12.5px;color:var(--ink-3);line-height:1.7;padding:14px 16px;background:var(--paper);border-radius:12px">
              <b style="color:var(--ink)">How to connect it.</b> Create a catch hook in Zapier, Make or n8n — or point this at your own endpoint using the WhatsApp Cloud API or Twilio. Bloom POSTs this JSON on every enquiry:
              <pre style="font-family:var(--mono);font-size:11px;background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:11px;margin-top:10px;overflow-x:auto;line-height:1.6">{
  "event": "enquiry.created",
  "to": "${esc(waDigits(c.team))}",
  "message": "New Bloom enquiry…",
  "enquiry": { "name": "…", "email": "…", "interest": "…" }
}</pre>
              Map <code>to</code> and <code>message</code> onto your WhatsApp send step and the alert lands on the team's phone with no one touching the panel.
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Message templates</h3><p>Placeholders: {name} {first} {email} {phone} {country} {interest} {band} {target} {msg} {at} {ref}</p></div></div>
          <div class="card-bd" style="display:grid;gap:14px">
            <div class="fg"><label>Alert to the team</label><textarea rows="8" oninput="waCfg().template=this.value" onchange="cmsSave()">${esc(c.template)}</textarea></div>
            <div class="fg"><label>First reply to the student</label><textarea rows="3" oninput="waCfg().replyTemplate=this.value" onchange="cmsSave()">${esc(c.replyTemplate)}</textarea></div>
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Preview</h3><p>What the team receives</p></div></div>
          <div class="card-bd">
            <div style="background:#e5ddd5;border-radius:14px;padding:14px">
              <div style="background:#dcf8c6;border-radius:10px 10px 2px 10px;padding:11px 13px;font-size:12.5px;line-height:1.6;white-space:pre-wrap;color:#111b21;box-shadow:0 1px 2px rgba(0,0,0,.12)">${esc(waRender(c.template, { name:'Priya Sharma', country:'India', interest:'IELTS Academic', band:'6.0', target:'7.5', email:'priya@email.com', phone:'+91 98450 11234', msg:'I need 7.0 in each band for my nursing registration. How long will it take?', at:today(), ref:'ENQ-4821' }))}</div>
              <div style="text-align:right;font-size:10px;color:#667781;margin-top:4px">${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} ✓✓</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Delivery log</h3><p>Last ${Math.min(log.length,60)} alerts</p></div>
            ${log.length?`<button class="btn btn-g btn-sm" onclick="if(confirm('Clear the delivery log?')){cms().waLog=[];cmsSave();navTo('waset')}">Clear</button>`:''}</div>
          <div class="card-bd flush">
            ${log.length ? log.map(l => `<div class="row">
              <div class="ic" style="background:${l.ok?'var(--ok-soft)':'var(--amber-soft)'};color:${l.ok?'var(--ok)':'#a86e14'}"><i class="fa-brands fa-whatsapp"></i></div>
              <div class="tx"><b>${esc(l.name||'Enquiry')}</b><span>${l.how}${l.code?' · HTTP '+l.code:''}${l.err?' · '+esc(l.err.slice(0,40)):''} → ${esc(l.to)}</span></div>
              <span style="font-family:var(--mono);font-size:10.5px;color:var(--ink-4)">${new Date(l.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
              <a class="icobtn" style="width:28px;height:28px;font-size:11px" href="${l.link}" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>`).join('')
            : `<div style="padding:24px;text-align:center;font-size:12.5px;color:var(--ink-4)">Nothing sent yet. Use “Send a test” to check the route.</div>`}
          </div>
        </div>
      </div>
    </div>`;
}

/* Called by the public contact form via a localStorage handoff.
   The form also writes straight into the CMS, so storage may already have the
   record — dedupe the notification independently, keyed on the enquiry id, so
   an already-saved enquiry still raises its WhatsApp alert exactly once. */
async function enqIngest(e){
  const c = cms();
  c.enquiries = c.enquiries || [];
  if (!c.enquiries.some(x => x.id === e.id)) c.enquiries.unshift(e);
  c.waSeen = c.waSeen || [];
  if (c.waSeen.includes(e.id)){ cmsSave(); return; }
  c.waSeen = [e.id, ...c.waSeen].slice(0, 200);
  cmsSave();
  await waNotify(e);
}
function enqDrain(){
  let q = [];
  try { q = JSON.parse(localStorage.getItem('bloom_enq_queue') || '[]'); } catch(err){}
  if (!q.length) return;
  try { localStorage.removeItem('bloom_enq_queue'); } catch(err){}
  const fresh = q.filter(e => !(cms().waSeen || []).includes(e.id));
  q.forEach(e => enqIngest(e));
  if (fresh.length) toast(fresh.length + ' new website enquir' + (fresh.length===1?'y':'ies') + ' received', 'fa-inbox');
}
