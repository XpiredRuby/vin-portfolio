/* ============================================================
   site.js — minimal, dependency-free interaction layer
   Everything degrades gracefully with JS disabled.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      // easeOutExpo — decelerating settle, reads like a gauge coming to rest
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

  /* ---------- ASTRA-OS current-evidence normalization ---------- */
  var astraImages = document.querySelectorAll('img[src$="assets/hero/astrasim.svg"], img[src$="../assets/hero/astrasim.svg"]');
  astraImages.forEach(function (img) {
    var prefix = img.getAttribute('src').indexOf('../') === 0 ? '../' : '';
    img.setAttribute('src', prefix + 'assets/hero/astrasim-ai.jpg');
    img.setAttribute('width', '768');
    img.setAttribute('height', '432');
    img.setAttribute('alt', 'AI-generated ASTRA-OS aerospace systems artwork representing spacecraft flight software, command and telemetry, FDIR, verification evidence, and native target execution.');
  });

  function replaceText(root, replacements) {
    if (!root) { return; }
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var text = node.nodeValue;
      replacements.forEach(function (pair) { text = text.split(pair[0]).join(pair[1]); });
      node.nodeValue = text;
    }
  }

  var astraReplacements = [
    ['Flight Software HIL Verification Framework', 'Flight Software Assurance & Native Target Verification'],
    ['hardware-in-the-loop verification', 'native-target verification'],
    ['Hardware-in-the-loop verification', 'Native-target verification'],
    ['HIL VERIFICATION', 'ASSURANCE & TARGET VERIFICATION'],
    ['HIL verified', 'Native target verified'],
    ['HIL verification', 'target verification'],
    ['hardware-in-the-loop evidence', 'native Raspberry Pi/aarch64 execution evidence'],
    ['hardware-in-the-loop', 'native-target'],
    ['9/9 tests, 25/25 MC trials on hardware', '20/20 CTest, 25/25 MC trials, native Pi evidence'],
    ['9/9', '20/20'],
    ['5/5', '8/8']
  ];

  var astraCards = [];
  document.querySelectorAll('a[href*="astrasim-fsw.html"]').forEach(function (link) {
    var scope = link.closest('article, tr, .panel, .card, .project-card');
    if (scope && astraCards.indexOf(scope) === -1) { astraCards.push(scope); }
  });
  astraCards.forEach(function (scope) { replaceText(scope, astraReplacements); });

  if (/\/projects\/astrasim-fsw\.html$/.test(window.location.pathname)) {
    replaceText(document.body, astraReplacements);
    document.title = 'AstraSim-FSW: Flight Software Assurance & Native Target Verification | Vinayak Manoj Nair';
    var description = 'Engineering case study: C++17 spacecraft-style flight software with command and telemetry, FDIR, deterministic scenarios, Monte Carlo regression, requirement traceability, assurance CI, and preserved Raspberry Pi aarch64 execution evidence.';
    var metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) { metaDescription.setAttribute('content', description); }
    var ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) { ogDescription.setAttribute('content', description); }
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
