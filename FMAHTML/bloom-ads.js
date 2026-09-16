/* ═══════════════════════════════════════════════════════════════
   BLOOM — Meta Ads integration

   What is genuinely possible from a browser page, and what is not:

   · Pixel + Conversions API — the Pixel fires client-side from the
     public site. Real, and wired here.
   · Lead Ads — Meta delivers leads by webhook to a server. A static
     page cannot receive webhooks, so leads are pulled in by CSV
     export from Ads Manager, or pushed by the same automation
     endpoint already used for WhatsApp.
   · Insights (spend, CPL, ROAS) — the Graph API blocks browser
     calls without a server-side token. Figures shown here come from
     the CSV you export from Ads Manager, so they are your real
     numbers rather than invented ones.

   The panel states which mode each part is in, so nobody mistakes a
   configured pixel for a connected ad account.
═══════════════════════════════════════════════════════════════ */

let ads = { view:'dash', camp:null, q:'', range:'30' };

function adsCfg(){
  const c = cms();
  c.ads = c.ads || {
    pixelId:'', capToken:'', datasetId:'', pageId:'', adAccount:'',
    testCode:'', consentMode:true, autoAdvancedMatching:true,
    events:{ PageView:true, ViewContent:true, Lead:true, CompleteRegistration:true, Schedule:true, Purchase:true, StartTrial:true },
    utm:{ source:'facebook', medium:'paid_social', campaign:'' },
    webhook:'',
  };
  c.adsData = c.adsData || { campaigns:[], leads:[], imported:null };
  return c.ads;
}
function adsData(){ adsCfg(); return cms().adsData; }

/* ── the events worth sending, and what each means for an academy ── */
const META_EVENTS = {
  PageView:            { name:'PageView',             note:'Every page of the public site. The baseline for audiences.', auto:true },
  ViewContent:         { name:'ViewContent',          note:'A course, IELTS or study-abroad page — signals intent.', auto:true },
  Lead:                { name:'Lead',                 note:'Contact form submitted. Your primary optimisation event.', value:true },
  CompleteRegistration:{ name:'CompleteRegistration', note:'Student finished onboarding in the portal.', value:true },
  Schedule:            { name:'Schedule',             note:'Booked a 1-on-1 consultation.', value:true },
  StartTrial:          { name:'StartTrial',           note:'Took the free placement test.' },
  Purchase:            { name:'Purchase',             note:'Paid for a course. Needed for return on ad spend.', value:true, money:true },
};

/* ── where each event fires from ── */
const EVENT_SOURCES = [
  { ev:'PageView',             where:'Every public page',            file:'all pages' },
  { ev:'ViewContent',          where:'Courses, IELTS, Study abroad', file:'courses.html · ielts.html · abroad.html' },
  { ev:'Lead',                 where:'Contact form submitted',       file:'contact.html' },
  { ev:'StartTrial',           where:'Placement test started',       file:'portal · placement' },
  { ev:'CompleteRegistration', where:'Onboarding completed',         file:'portal · onboarding' },
  { ev:'Schedule',             where:'1-on-1 session booked',        file:'portal · tutoring' },
  { ev:'Purchase',             where:'Course payment recorded',      file:'portal · billing' },
];

/* ═══ SECTION ═══ */
function sec_ads(){
  if (ads.view === 'setup') return adsSetupHTML();
  if (ads.view === 'leads') return adsLeadsHTML();
  if (ads.view === 'campaigns') return adsCampaignsHTML();
  return adsDashHTML();
}
function adsNav(){
  const tabs = [['dash','Overview','fa-chart-pie'],['campaigns','Campaigns','fa-rectangle-ad'],['leads','Lead ads','fa-inbox'],['setup','Pixel & setup','fa-gear']];
  return `<div class="pills mb" style="margin-bottom:18px">
    ${tabs.map(([k,l,ic])=>`<button class="pill ${ads.view===k?'on':''}" onclick="ads.view='${k}';navTo('ads')"><i class="fa-solid ${ic}"></i> ${l}</button>`).join('')}
  </div>`;
}
function adsLive(){ return !!adsCfg().pixelId; }

/* ═══ OVERVIEW ═══ */
function adsDashHTML(){
  const c = adsCfg(), d = adsData();
  const camps = d.campaigns;
  const spend = camps.reduce((n,x) => n + (+x.spend || 0), 0);
  const leads = camps.reduce((n,x) => n + (+x.leads || 0), 0);
  const imp = camps.reduce((n,x) => n + (+x.impressions || 0), 0);
  const clicks = camps.reduce((n,x) => n + (+x.clicks || 0), 0);
  const enrolled = d.leads.filter(l => l.status === 'enrolled').length;
  const cpl = leads ? spend / leads : 0;
  const enq = (cms().enquiries || []).filter(e => e.source === 'meta').length;

  return `
    ${phead({ eyebrow:'Administration · Marketing', title:`Meta <em>Ads</em>`,
      sub:'Facebook and Instagram advertising: the Pixel on your public site, the events it sends, and the campaign figures you import from Ads Manager.',
      actions:`<button class="btn btn-g btn-sm" onclick="ads.view='setup';navTo('ads')"><i class="fa-solid fa-gear"></i> Pixel setup</button>
        <button class="btn btn-p btn-sm" onclick="adsImportModal()"><i class="fa-solid fa-file-csv"></i> Import from Ads Manager</button>` })}
    ${adsNav()}

    ${!adsLive() ? `
    <div class="card mb2" style="border-color:var(--amber);background:linear-gradient(180deg,var(--amber-soft),var(--surface) 60%)">
      <div class="card-bd" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:var(--amber);color:#fff;display:grid;place-items:center;font-size:17px"><i class="fa-brands fa-meta"></i></div>
        <div style="flex:1;min-width:230px">
          <div style="font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:#a86e14;font-weight:800;margin-bottom:5px">Not connected yet</div>
          <b style="font-family:var(--display);font-size:18px;font-weight:700;display:block">Add your Pixel ID to start tracking</b>
          <span style="font-size:12.5px;color:var(--ink-3)">Until then no events are sent, so Meta cannot optimise or build audiences from your traffic.</span>
        </div>
        <button class="btn btn-a" onclick="ads.view='setup';navTo('ads')">Set up the Pixel <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>` : ''}

    <div class="grid g4 mb2">
      ${statCard('Spend', spend ? '₹' + Math.round(spend).toLocaleString('en-IN') : '—', d.imported ? 'Imported ' + d.imported : 'Import from Ads Manager', 'cor', 'fa-indian-rupee-sign')}
      ${statCard('Leads', leads || '—', leads ? '₹' + Math.round(cpl).toLocaleString('en-IN') + ' cost per lead' : 'No campaign data yet', 'leaf', 'fa-user-plus')}
      ${statCard('Enrolled from ads', enrolled, leads ? Math.round(enrolled/leads*100) + '% of leads converted' : '—', enrolled?'leaf':'', 'fa-graduation-cap')}
      ${statCard('Pixel', adsLive() ? 'Live' : 'Off', adsLive() ? Object.values(c.events).filter(Boolean).length + ' events enabled' : 'No Pixel ID set', adsLive()?'leaf':'amb', 'fa-satellite-dish')}
    </div>

    ${camps.length ? `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Campaign performance</h3><p>From your Ads Manager export · ${d.imported}</p></div>
        <button class="btn btn-g btn-sm" onclick="ads.view='campaigns';navTo('ads')">All campaigns</button></div>
      <div class="card-bd flush"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Campaign</th><th>Spend</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Leads</th><th>CPL</th></tr></thead>
        <tbody>${camps.slice(0,6).map(x => {
          const ctr = x.impressions ? (x.clicks / x.impressions * 100) : 0;
          const c2 = x.leads ? x.spend / x.leads : 0;
          return `<tr>
            <td><b style="color:var(--ink)">${esc(x.name)}</b>${x.objective?`<div style="font-size:11px;color:var(--ink-4)">${esc(x.objective)}</div>`:''}</td>
            <td style="font-family:var(--mono)">₹${Math.round(x.spend).toLocaleString('en-IN')}</td>
            <td style="font-family:var(--mono)">${(+x.impressions).toLocaleString()}</td>
            <td style="font-family:var(--mono)">${(+x.clicks).toLocaleString()}</td>
            <td style="font-family:var(--mono);color:${ctr>=1.5?'var(--ok)':ctr>=0.8?'var(--amber)':'var(--coral)'}">${ctr.toFixed(2)}%</td>
            <td style="font-family:var(--mono)">${x.leads||0}</td>
            <td style="font-family:var(--mono);font-weight:700;color:${c2&&c2<=cpl?'var(--ok)':'var(--ink)'}">${x.leads?'₹'+Math.round(c2).toLocaleString('en-IN'):'—'}</td>
          </tr>`;
        }).join('')}</tbody></table></div></div>
    </div>` : `
    <div class="card mb2">
      <div class="card-hd"><div style="flex:1"><h3>Campaign performance</h3><p>Spend, reach and cost per lead</p></div></div>
      <div class="card-bd">
        <div class="empty" style="border:none;background:transparent;padding:30px 20px">
          <i class="fa-solid fa-rectangle-ad"></i><b>No campaign data imported</b>
          <span>Meta's Graph API cannot be called from a browser page without a server-side token, so Bloom does not invent these numbers. Export the report from Ads Manager and drop the CSV in — then the figures here are genuinely yours.</span>
          <div style="margin-top:16px"><button class="btn btn-p btn-sm" onclick="adsImportModal()"><i class="fa-solid fa-file-csv"></i> Import a CSV</button></div>
        </div>
      </div>
    </div>`}

    <div class="split">
      <div class="card">
        <div class="card-hd"><div style="flex:1"><h3>Events being sent</h3><p>Where each one fires from</p></div>
          <button class="btn btn-g btn-sm" onclick="ads.view='setup';navTo('ads')">Configure</button></div>
        <div class="card-bd flush">
          ${EVENT_SOURCES.map(s => {
            const on = c.events[s.ev];
            const m = META_EVENTS[s.ev];
            return `<div class="row" style="${on?'':'opacity:.5'}">
              <div class="ic ${on?'leaf':''}"><i class="fa-solid ${on?'fa-satellite-dish':'fa-circle-minus'}"></i></div>
              <div class="tx"><b>${s.ev}${m.money?' <span class="tag amb">with value</span>':''}</b><span>${s.where} · ${s.file}</span></div>
              <span class="tag ${on?'ok':''}">${on?'on':'off'}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Lead ads</h3><p>${d.leads.length} in the system</p></div>
            <button class="btn btn-g btn-sm" onclick="ads.view='leads';navTo('ads')">Open</button></div>
          <div class="card-bd flush">
            ${d.leads.length ? d.leads.slice(0,4).map(l => `<div class="row">
              <div style="width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--leaf-100);color:var(--leaf-700);display:grid;place-items:center;font-size:10px;font-weight:800">${initials(l.name||'?')}</div>
              <div class="tx"><b class="clip">${esc(l.name||'—')}</b><span>${esc(l.campaign||'—')} · ${esc(l.at||'')}</span></div>
              <span class="tag ${l.status==='enrolled'?'ok':l.status==='contacted'?'amb':'cor'}">${l.status}</span></div>`).join('')
            : `<div style="padding:22px;text-align:center;font-size:12.5px;color:var(--ink-4)">No lead-ad leads yet. Import the CSV from Ads Manager, or point your Meta webhook at the automation endpoint.</div>`}
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>UTM tagging</h3><p>Applied to every ad link you build here</p></div></div>
          <div class="card-bd">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);background:var(--paper);border-radius:10px;padding:11px 13px;word-break:break-all;line-height:1.7">
              ?utm_source=${esc(c.utm.source)}&utm_medium=${esc(c.utm.medium)}${c.utm.campaign?'&utm_campaign='+esc(c.utm.campaign):''}&utm_content={{ad.name}}</div>
            <button class="btn btn-g btn-sm btn-blk" style="margin-top:12px" onclick="adsLinkBuilder()"><i class="fa-solid fa-link"></i> Build a tagged ad link</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ═══ PIXEL SETUP ═══ */
function adsSetupHTML(){
  const c = adsCfg();
  return `
    ${phead({ eyebrow:'Meta Ads · Setup', title:`Pixel &amp; <em>events</em>`,
      sub:'Paste your identifiers and Bloom writes the Pixel into every public page, firing the events below at the right moments.',
      actions:`<button class="btn btn-g btn-sm" onclick="ads.view='dash';navTo('ads')"><i class="fa-solid fa-arrow-left"></i> Overview</button>
        <button class="btn btn-p btn-sm" onclick="adsInstall()"><i class="fa-solid fa-code"></i> Install on the site</button>` })}
    ${adsNav()}

    <div class="split">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd">
            <div style="width:36px;height:36px;border-radius:11px;background:#0866FF;color:#fff;display:grid;place-items:center"><i class="fa-brands fa-meta"></i></div>
            <div style="flex:1"><h3>Identifiers</h3><p>From Events Manager in your Meta business account</p></div></div>
          <div class="card-bd" style="display:grid;gap:14px">
            <div class="fg"><label>Pixel ID <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--ink-4)">(required)</span></label>
              <input value="${esc(c.pixelId)}" placeholder="1234567890123456" oninput="adsCfg().pixelId=this.value.trim()" onchange="cmsSave();navTo('ads')">
              <span style="font-size:11.5px;color:var(--ink-4)">Events Manager → Data sources → your pixel. Sixteen digits.</span></div>
            <div class="fg"><label>Conversions API token <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--ink-4)">(optional)</span></label>
              <input value="${esc(c.capToken)}" placeholder="EAAG…" type="password" oninput="adsCfg().capToken=this.value.trim()" onchange="cmsSave()">
              <span style="font-size:11.5px;color:var(--ink-4)">Only usable from a server. Stored here so your automation endpoint can read it — never sent from the browser.</span></div>
            <div class="fgrid">
              <div class="fg"><label>Ad account ID</label><input value="${esc(c.adAccount)}" placeholder="act_1234567890" oninput="adsCfg().adAccount=this.value.trim()" onchange="cmsSave()"></div>
              <div class="fg"><label>Facebook Page ID</label><input value="${esc(c.pageId)}" placeholder="1098…" oninput="adsCfg().pageId=this.value.trim()" onchange="cmsSave()"></div>
            </div>
            <div class="fg"><label>Test event code <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--ink-4)">(while testing only)</span></label>
              <input value="${esc(c.testCode)}" placeholder="TEST12345" oninput="adsCfg().testCode=this.value.trim()" onchange="cmsSave()">
              <span style="font-size:11.5px;color:var(--ink-4)">Events Manager → Test events. Remove this before going live or your real traffic lands in the test bucket.</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Events</h3><p>Which conversions to send, and where they fire</p></div></div>
          <div class="card-bd" style="display:grid;gap:10px">
            ${Object.entries(META_EVENTS).map(([k,m]) => {
              const src = EVENT_SOURCES.find(s => s.ev === k);
              return `<label style="display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:${c.events[k]?'var(--leaf-50)':'var(--paper)'};border-radius:11px;cursor:pointer">
                <input type="checkbox" ${c.events[k]?'checked':''} style="margin-top:3px" onchange="adsCfg().events['${k}']=this.checked;cmsSave();navTo('ads')">
                <div style="flex:1;min-width:0">
                  <b style="font-size:13px;display:block">${m.name}${m.money?' <span class="tag amb">value + currency</span>':m.value?' <span class="tag">value</span>':''}</b>
                  <span style="font-size:11.5px;color:var(--ink-4);line-height:1.5">${m.note}</span>
                  ${src?`<span style="font-family:var(--mono);font-size:10px;color:var(--leaf-700);display:block;margin-top:3px">${src.file}</span>`:''}
                </div></label>`;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Privacy</h3><p>What gets sent, and what does not</p></div></div>
          <div class="card-bd" style="display:grid;gap:11px">
            <label style="display:flex;gap:11px;align-items:flex-start;padding:12px 14px;background:var(--paper);border-radius:11px;cursor:pointer">
              <input type="checkbox" ${c.consentMode?'checked':''} style="margin-top:3px" onchange="adsCfg().consentMode=this.checked;cmsSave()">
              <span style="font-size:12.5px;color:var(--ink-2);line-height:1.55"><b>Wait for cookie consent</b> before firing anything. Required in the EU — and your Milan office puts you in scope.</span></label>
            <label style="display:flex;gap:11px;align-items:flex-start;padding:12px 14px;background:var(--paper);border-radius:11px;cursor:pointer">
              <input type="checkbox" ${c.autoAdvancedMatching?'checked':''} style="margin-top:3px" onchange="adsCfg().autoAdvancedMatching=this.checked;cmsSave()">
              <span style="font-size:12.5px;color:var(--ink-2);line-height:1.55"><b>Advanced matching</b> — hashes email and phone before sending, improving attribution without transmitting anything in the clear.</span></label>
            <div class="why cor"><b>Never sent to Meta</b>Student band scores, essay content, speaking recordings, placement results or anything else from the portal. Only the conversion event and, with advanced matching on, a one-way hash of the contact details the visitor themselves typed.</div>
          </div>
        </div>
      </div>

      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>Status</h3></div></div>
          <div class="card-bd" style="display:grid;gap:11px">
            ${[['Pixel ID', c.pixelId ? 'Set' : 'Missing', !!c.pixelId],
               ['Installed on the site', adsInstalled() ? 'Yes' : 'Not yet', adsInstalled()],
               ['Events enabled', Object.values(c.events).filter(Boolean).length + ' of ' + Object.keys(c.events).length, true],
               ['Conversions API', c.capToken ? 'Token stored' : 'Not configured', !!c.capToken],
               ['Test mode', c.testCode ? 'ON — ' + c.testCode : 'Off (live)', !c.testCode],
               ['Consent gate', c.consentMode ? 'On' : 'Off', c.consentMode]]
              .map(([l,v,ok])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px dashed var(--line)">
                <span style="font-size:12.5px;color:var(--ink-3)">${l}</span>
                <span style="display:flex;gap:8px;align-items:center"><b style="font-size:12.5px">${esc(v)}</b>
                <i class="fa-solid ${ok?'fa-circle-check':'fa-circle-exclamation'}" style="color:${ok?'var(--ok)':'var(--amber)'};font-size:11px"></i></span></div>`).join('')}
            <button class="btn btn-p btn-blk" style="margin-top:4px" onclick="adsInstall()"><i class="fa-solid fa-code"></i> ${adsInstalled()?'Reinstall on the site':'Install on the site'}</button>
            ${adsInstalled()?`<button class="btn btn-g btn-blk" onclick="adsUninstall()"><i class="fa-solid fa-trash"></i> Remove from the site</button>`:''}
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div style="flex:1"><h3>What Bloom can and cannot do</h3></div></div>
          <div class="card-bd" style="display:grid;gap:12px;font-size:12.5px;line-height:1.6">
            <div style="display:flex;gap:10px"><i class="fa-solid fa-circle-check" style="color:var(--ok);margin-top:3px"></i>
              <span><b>Pixel and events</b> — fully automatic once installed. Fires from the real pages at the real moments.</span></div>
            <div style="display:flex;gap:10px"><i class="fa-solid fa-circle-check" style="color:var(--ok);margin-top:3px"></i>
              <span><b>UTM tagging</b> — build tagged links here so traffic attributes correctly in your own reporting.</span></div>
            <div style="display:flex;gap:10px"><i class="fa-solid fa-circle-exclamation" style="color:var(--amber);margin-top:3px"></i>
              <span><b>Lead ads</b> — Meta delivers these by webhook to a server. Import the CSV, or point your Meta webhook at the same automation endpoint you use for WhatsApp.</span></div>
            <div style="display:flex;gap:10px"><i class="fa-solid fa-circle-exclamation" style="color:var(--amber);margin-top:3px"></i>
              <span><b>Spend and insights</b> — the Graph API refuses browser calls without a server-side token, so these come from your Ads Manager export rather than being invented.</span></div>
          </div>
        </div>
      </div>
    </div>`;
}

function adsInstalled(){ return !!cms().adsInstalled; }
