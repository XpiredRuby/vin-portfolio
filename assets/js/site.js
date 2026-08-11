/* ============================================================
   site.js — minimal, dependency-free interaction layer
   Everything degrades gracefully with JS disabled.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Presentation layer ---------- */
  function resolveSiteScript() {
    if (document.currentScript && document.currentScript.src) { return document.currentScript.src; }
    var scripts = document.scripts;
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      if (/\/assets\/js\/site\.js(?:\?|$)/.test(scripts[i].src || '')) { return scripts[i].src; }
    }
    return new URL('assets/js/site.js', window.location.href).href;
  }

  var siteScriptSrc = resolveSiteScript();
  var assetsRoot = new URL('../', siteScriptSrc);
  var path = window.location.pathname.replace(/\/+$/, '');
  var isHome = path === '' || path === '/' || /\/index\.html$/.test(path);
  var isProjects = /\/projects\.html$/.test(path);
  var isProjectDetail = /\/projects\/[^/]+\.html$/.test(path);
  var isResume = /\/resume\.html$/.test(path);

  if (!isResume) {
    document.body.classList.add('aero-ui');
    if (isHome) { document.body.classList.add('page-home'); }
    else if (isProjects) { document.body.classList.add('page-projects'); }
    else if (isProjectDetail) { document.body.classList.add('page-project-detail'); }
    else { document.body.classList.add('page-standard'); }
  }

  /* ASTRA presentation artwork. Technical architecture diagrams remain unchanged. */
  if (!isResume) {
    var astraArtwork = new URL('hero/astrasim-ai.jpg', assetsRoot).href;
    document.querySelectorAll('img').forEach(function (img) {
      if (/\/assets\/hero\/astrasim\.svg(?:\?|$)/.test(img.src)) {
        img.src = astraArtwork;
        img.alt = 'Concept artwork representing ASTRA-OS spacecraft-style flight-software assurance; technical diagrams and evidence are provided in the case study.';
      }
    });
  }

  /* Homepage hero: use the generated concept-art layout as a coded design system. */
  if (isHome) {
    var hero = document.querySelector('.hero');
    if (hero) {
      var eyebrow = hero.querySelector('.eyebrow');
      var heroTitle = hero.querySelector('h1');
      var heroSpec = hero.querySelector('.hero__spec');
      var heroButtons = hero.querySelector('.btn-row');
      var portrait = hero.querySelector('.portrait');

      if (eyebrow) {
        eyebrow.innerHTML = 'Vinayak Manoj Nair &middot; Texas A&amp;M Aerospace Engineering &middot; May 2027';
      }
      if (heroTitle) {
        heroTitle.innerHTML = 'Aerospace Engineer.<br>Building <span class="hero-accent">Reliable</span> Systems.<br>Proving Them in Reality.';
      }
      if (heroSpec) {
        heroSpec.innerHTML = '<b>GNC / STATE ESTIMATION</b> &nbsp;&middot;&nbsp; <b>FLIGHT SOFTWARE / ASSURANCE</b> &nbsp;&middot;&nbsp; <b>STRUCTURES / STRESS</b>';
      }
      if (heroButtons) {
        var buttonLinks = heroButtons.querySelectorAll('a');
        if (buttonLinks[0]) { buttonLinks[0].textContent = 'View Resume'; }
        if (buttonLinks[1]) { buttonLinks[1].textContent = 'View Projects'; }
        if (buttonLinks[2]) { buttonLinks[2].textContent = 'GitHub'; }
        if (buttonLinks[3]) { buttonLinks[3].textContent = 'Contact Me'; }
      }

      if (portrait) {
        portrait.setAttribute('role', 'img');
        portrait.setAttribute('aria-label', 'Systems map linking state estimation, guidance and control, flight software assurance, and structural substantiation.');
        portrait.innerHTML = '' +
          '<div class="mission-map" aria-hidden="true">' +
            '<span class="mission-link mission-link--1"></span>' +
            '<span class="mission-link mission-link--2"></span>' +
            '<span class="mission-link mission-link--3"></span>' +
            '<span class="mission-link mission-link--4"></span>' +
            '<div class="mission-core"><b>VIN</b><span>Build &middot; Verify &middot; Explain</span></div>' +
            '<div class="mission-node mission-node--estimation"><h3>State Estimation</h3><p>IMM / covariance / dropout handling / hardware tracking evidence</p></div>' +
            '<div class="mission-node mission-node--controls"><h3>Guidance &amp; Control</h3><p>Closed-loop simulation / uncertainty / bounded recovery behavior</p></div>' +
            '<div class="mission-node mission-node--fsw"><h3>Flight Software</h3><p>Command &amp; telemetry / FDIR / deterministic assurance / traceability</p></div>' +
            '<div class="mission-node mission-node--structures"><h3>Structures</h3><p>Loads / FE verification / margins / fatigue / damage tolerance</p></div>' +
          '</div>';
      }
    }
  }

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.setAttribute('data-open', String(!open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && window.innerWidth <= 900) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.setAttribute('data-open', 'false');
      }
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealables = document.querySelectorAll('[data-reveal]');
  if (!revealables.length) { /* no-op */ }
  else if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Counting statistics ---------- */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (isNaN(target)) { return; }

    var bar = el.parentElement && el.parentElement.querySelector('.stat__bar i');
    if (bar) { requestAnimationFrame(function () { bar.style.width = (el.getAttribute('data-fill') || '100') + '%'; }); }

    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }

    var duration = 1150;
    var start = null;
    function step(ts) {
      if (start === null) { start = ts; }
      var p = Math.min((ts - start) / duration, 1);
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) { requestAnimationFrame(step); }
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCounter);
    } else {
      var countObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { runCounter(entry.target); obs.unobserve(entry.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* ---------- UTC mission clock ---------- */
  var clock = document.getElementById('utc-clock');
  if (clock) {
    var tick = function () {
      var d = new Date();
      var p = function (n) { return String(n).padStart(2, '0'); };
      clock.textContent = p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + 'Z';
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Countdown to graduation (May 2027) ---------- */
  var grad = document.getElementById('grad-countdown');
  if (grad) {
    var gradDate = new Date('2027-05-14T00:00:00Z').getTime();
    var days = Math.max(0, Math.ceil((gradDate - Date.now()) / 86400000));
    grad.textContent = 'T-' + days + 'd';
  }

  /* ---------- Table-of-contents scroll spy ---------- */
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    var sections = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (section) { map[id] = link; sections.push(section); }
    });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        for (var id in map) { map[id].classList.remove('is-active'); }
        var active = map[entry.target.id];
        if (active) { active.classList.add('is-active'); }
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Current year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Print resume ---------- */
  var printBtn = document.getElementById('print-resume');
  if (printBtn) {
    printBtn.addEventListener('click', function () { window.print(); });
  }
})();
