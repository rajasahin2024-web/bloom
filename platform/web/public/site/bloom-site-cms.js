/* ═══ BLOOM — public-site CMS bindings ═══
   Loaded on every public page. Each block is a no-op when its container
   is absent, so one file serves all ten pages. */
(function(){
  var C, st;
  try { C = cms(); st = C.settings; } catch(e){ return; }
  var esc = cmsEsc;

  /* ── announcement banner ──
     The nav is position:fixed, so a block prepended to <body> would sit
     underneath it. The banner is therefore fixed above the nav, and its
     measured height is published as --banner-h, which offsets both the
     nav's top and the body's padding so nothing is covered. */
  if (st.bannerOn && !document.getElementById('cmsBanner')){
    var css = document.createElement('style');
    css.id = 'cmsBannerCSS';
    css.textContent = ':root{--banner-h:0px}'
      + '#cmsBanner{position:fixed;top:0;left:0;right:0;z-index:901;background:var(--leaf-800);color:#fff;'
      + 'padding:10px 20px;display:flex;align-items:center;justify-content:center;gap:14px;font-size:13px;'
      + 'font-weight:600;flex-wrap:wrap;text-align:center;line-height:1.45}'
      + '#cmsBanner a.cta{background:#fff;color:var(--leaf-800);border-radius:8px;padding:5px 13px;font-size:12px;font-weight:700;white-space:nowrap}'
      + '#cmsBanner .x{background:transparent;border:none;color:rgba(255,255,255,.55);cursor:pointer;font-size:13px;padding:2px 4px;margin-left:2px}'
      + '#cmsBanner .x:hover{color:#fff}'
      + 'body.has-banner{padding-top:var(--banner-h)}'
      + 'body.has-banner .nav{top:var(--banner-h)}'
      + 'body.has-banner .mob{top:calc(var(--nav-h) + var(--banner-h))}';
    document.head.appendChild(css);

    var b = document.createElement('div');
    b.id = 'cmsBanner';
    b.innerHTML = '<i class="fa-solid fa-bullhorn" style="color:var(--leaf-300)"></i><span>' + esc(st.bannerText) + '</span>'
      + '<a class="cta" href="' + esc(st.bannerLink) + '">' + esc(st.bannerCta) + '</a>'
      + '<button class="x" aria-label="Dismiss">&times;</button>';
    document.body.insertBefore(b, document.body.firstChild);
    document.body.classList.add('has-banner');

    var sync = function(){
      document.documentElement.style.setProperty('--banner-h', b.offsetHeight + 'px');
    };
    sync();
    addEventListener('resize', sync);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);

    b.querySelector('.x').onclick = function(){
      b.remove();
      document.body.classList.remove('has-banner');
      document.documentElement.style.setProperty('--banner-h', '0px');
    };
  }

  /* ── universities ── */
  var u = document.getElementById('uniList');
  if (u) u.innerHTML = cmsPub('unis').map(function(x){
    return '<div class="uni"><div class="fl">' + (x.flag || '🎓') + '</div><b>' + esc(x.name) + '</b><span>'
      + esc(x.course) + '</span><div class="req">Needs ' + esc(x.ielts)
      + (x.perSkill ? ' · ' + esc(x.perSkill) : '') + '</div></div>';
  }).join('');

  /* ── testimonials ── */
  var t = document.getElementById('tList');
  if (t){
    var list = cmsPub('testimonials');
    if (t.dataset.limit) list = list.slice(0, +t.dataset.limit);
    t.innerHTML = list.map(function(x){
      var ini = x.name.split(' ').map(function(w){ return w[0]; }).slice(0,2).join('');
      return '<div class="tcard rv in"><div class="q">“' + esc(x.quote) + '”</div>'
        + '<div class="who"><div class="tav">' + ini + '</div>'
        + '<div><div class="nm">' + esc(x.name) + '</div><div class="mt">' + esc(x.from) + ' · ' + esc(x.outcome) + '</div></div>'
        + '<div class="jump"><span class="a">' + Number(x.start).toFixed(1) + '</span>'
        + '<i class="fa-solid fa-arrow-right"></i><span class="b">' + Number(x.end).toFixed(1) + '</span></div></div></div>';
    }).join('');
  }

  /* ── course catalogue ── */
  var c = document.getElementById('courseList');
  if (c) c.innerHTML = cmsPub('courses').map(function(x){
    return '<div class="feat rv in"><div class="ic ic-leaf"><i class="fa-solid fa-book-open"></i></div>'
      + '<h3>' + esc(x.name) + '</h3><p>' + esc(x.blurb) + '</p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:15px">'
      + '<span class="tag leaf">' + esc(x.level) + '</span>'
      + '<span class="tag">' + x.weeks + ' weeks</span>'
      + '<span class="tag amb">' + esc(x.tier) + '</span></div>'
      + '<div style="margin-top:13px;font-family:var(--mono);font-size:12.5px;font-weight:700;color:var(--leaf-700)">' + esc(x.price) + '</div></div>';
  }).join('');

  /* ── university directory (rich cards, filterable) ── */
  var dir = document.getElementById('uniDir');
  if (dir){
    var all = cmsPub('unis');
    var filtEl = document.getElementById('uniFilt');
    var cardFor = function(x){
      return '<article class="unic rv in">'
        + '<div class="shot">'
          + '<image-slot id="' + esc(x.photo || ('uni-' + x.id)) + '" shape="rect" placeholder="' + esc(x.name) + ' campus"></image-slot>'
          + '<div class="flagbar"><span class="f">' + (x.flag || '🎓') + '</span>' + esc(x.country) + '</div>'
          + (x.rank ? '<div class="rk">QS #' + x.rank + '</div>' : '')
        + '</div>'
        + '<div class="bd">'
          + '<h4>' + esc(x.name) + '</h4>'
          + '<div class="crs">' + esc(x.course) + '</div>'
          + '<div class="meta">'
            + '<div><div class="l">City</div><div class="v">' + esc(x.city || '—') + '</div></div>'
            + '<div><div class="l">Tuition / year</div><div class="v">' + esc(x.tuition || '—') + '</div></div>'
            + '<div><div class="l">Intakes</div><div class="v">' + esc(x.intake || '—') + '</div></div>'
            + '<div><div class="l">Per-skill rule</div><div class="v">' + esc(x.perSkill || 'None stated') + '</div></div>'
          + '</div>'
          + '<div class="bands">'
            + '<span class="bandchip"><span class="k">IELTS</span><span class="b">' + esc(x.ielts) + '</span></span>'
            + (x.toefl ? '<span class="bandchip alt"><span class="k">TOEFL</span><span class="b">' + esc(x.toefl) + '</span></span>' : '')
          + '</div>'
          + (x.note ? '<div class="note"><i class="fa-solid fa-lightbulb"></i>' + esc(x.note) + '</div>' : '')
        + '</div></article>';
    };
    var paint = function(country){
      var list = country === 'all' ? all : all.filter(function(x){ return x.country === country; });
      dir.innerHTML = list.map(cardFor).join('');
    };
    if (filtEl){
      var countries = [];
      all.forEach(function(x){ if (countries.indexOf(x.country) < 0) countries.push(x.country); });
      var flagOf = function(c){ var f = all.filter(function(x){ return x.country === c; })[0]; return f && f.flag || '🎓'; };
      filtEl.innerHTML = '<button class="on" data-c="all"><i class="fa-solid fa-globe"></i> All destinations <span class="n">' + all.length + '</span></button>'
        + countries.map(function(c){
            return '<button data-c="' + esc(c) + '"><span>' + flagOf(c) + '</span> ' + esc(c)
              + ' <span class="n">' + all.filter(function(x){ return x.country === c; }).length + '</span></button>';
          }).join('');
      filtEl.addEventListener('click', function(ev){
        var b = ev.target.closest('button'); if (!b) return;
        filtEl.querySelectorAll('button').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        paint(b.dataset.c);
      });
    }
    paint('all');
  }

  /* ── featured universities (homepage strip) ── */
  var feat = document.getElementById('uniFeat');
  if (feat){
    var f = cmsPub('unis').filter(function(x){ return x.featured; });
    if (f.length < 3) f = cmsPub('unis');
    feat.innerHTML = f.slice(0, +(feat.dataset.limit || 6)).map(function(x){
      return '<article class="unic rv in">'
        + '<div class="shot">'
          + '<image-slot id="' + esc(x.photo || ('uni-' + x.id)) + '" shape="rect" placeholder="' + esc(x.name) + ' campus"></image-slot>'
          + '<div class="flagbar"><span class="f">' + (x.flag || '🎓') + '</span>' + esc(x.country) + '</div>'
          + (x.rank ? '<div class="rk">QS #' + x.rank + '</div>' : '')
        + '</div>'
        + '<div class="bd"><h4>' + esc(x.name) + '</h4><div class="crs">' + esc(x.course) + '</div>'
        + '<div class="bands" style="margin-bottom:0">'
          + '<span class="bandchip"><span class="k">IELTS</span><span class="b">' + esc(x.ielts) + '</span></span>'
          + perSkillChip(x)
        + '</div></div></article>';
    }).join('');
  }

  /* A per-skill value is only a band rule if it reads like one ("6.0 each",
   "no band below 6.5"). Anything else — "IMAT entrance exam required" — is an
   additional requirement, so it gets its own label and normal prose styling. */
  function perSkillChip(x){
    var v = String(x.perSkill || '').trim();
    if (!v || /^none/i.test(v)) return '';
    var isBand = /\d(\.\d)?/.test(v) && v.length <= 26;
    if (isBand) return '<span class="bandchip alt"><span class="k">Per skill</span><span class="b" style="font-size:11px">' + esc(v) + '</span></span>';
    return '<span class="bandchip alt" style="max-width:100%"><span class="k">Also required</span><span class="b" style="font-size:11px;font-family:var(--sans);font-weight:700;white-space:normal;line-height:1.35">' + esc(v) + '</span></span>';
  }

  /* ── academic staff ── */
  var fac = document.getElementById('facList');
  if (fac){
    var staff = cmsPub('staff');
    if (fac.dataset.limit) {
      var lead = staff.filter(function(s){ return s.lead; });
      var rest = staff.filter(function(s){ return !s.lead; }).slice(0, +fac.dataset.limit);
      staff = lead.concat(rest);
    }
    fac.innerHTML = staff.map(function(s){
      return '<article class="facc rv in' + (s.lead ? ' lead' : '') + '">'
        + '<div class="pic"><image-slot id="' + esc(s.slot) + '" shape="rect" placeholder="Photograph of ' + esc(s.name) + '"></image-slot>'
          + '<div class="yrs">' + s.years + ' years</div></div>'
        + '<div class="bd">'
          + (s.lead ? '<div class="eb">Operational Leader</div>' : '')
          + '<h4>' + esc(s.name) + '</h4>'
          + '<div class="rl">' + esc(s.role) + '</div>'
          + '<p>' + esc(s.bio) + '</p>'
          + '<div class="tags"><span class="tag leaf">' + esc(s.spec) + '</span></div>'
          + '<div class="lg"><i class="fa-solid fa-language"></i><span>' + esc(s.langs) + '</span></div>'
          + '<div class="lg"><i class="fa-solid fa-location-dot"></i><span>' + esc(s.from) + '</span></div>'
        + '</div></article>';
    }).join('');
  }

  /* ── gallery captions + slot ids ── */
  var caps = document.querySelectorAll('.mo cap');
  if (caps.length){
    var g = cmsPub('gallery');
    caps.forEach(function(cap, i){
      var item = g[i]; if (!item) return;
      var slot = cap.parentElement && cap.parentElement.querySelector('image-slot');
      if (slot){
        if (item.slot) slot.setAttribute('id', item.slot);
        slot.setAttribute('placeholder', item.title);
      }
      cap.innerHTML = esc(item.title) + '<small>' + esc(item.sub) + '</small>';
    });
  }

  /* ── headline statistics ── */
  document.querySelectorAll('[data-cms]').forEach(function(el){
    var v = st[el.dataset.cms];
    if (v !== undefined) el.textContent = v;
  });
})();
