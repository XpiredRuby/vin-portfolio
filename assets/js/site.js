/* ============================================================
   site.js — minimal, dependency-free interaction layer
   Content and presentation remain usable with JavaScript disabled.
   ============================================================ */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scriptUrl = document.currentScript && document.currentScript.src ? new URL(document.currentScript.src) : null;
  var path = window.location.pathname.replace(/\/+$/, '');
  var isHome = path === '' || path === '/' || /\/index\.html$/.test(path);
  var isProjects = /\/projects\.html$/.test(path);
  var isProjectDetail = /\/projects\/[^/]+\.html$/.test(path);
  var isAbout = /\/about\.html$/.test(path);
  var isExperience = /\/experience\.html$/.test(path);
  var isSkills = /\/skills\.html$/.test(path);
  var isContact = /\/contact\.html$/.test(path);

  document.body.classList.add('aero-ui');
  if (isHome) { document.body.classList.add('page-home'); }
  else if (isProjects) { document.body.classList.add('page-projects'); }
  else if (isProjectDetail) { document.body.classList.add('page-project-detail'); }
  else {
    document.body.classList.add('page-standard');
    if (isAbout) { document.body.classList.add('page-about'); }
    else if (isExperience) { document.body.classList.add('page-experience'); }
    else if (isSkills) { document.body.classList.add('page-skills'); }
    else if (isContact) { document.body.classList.add('page-contact'); }
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
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
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

  /* ---------- Countdown to graduation ---------- */
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

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Native details stay fully usable without JS; this only opens a role before
     an in-page jump so the destination content is immediately visible. */
  document.querySelectorAll('.experience-jump a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var target = document.querySelector(link.getAttribute('href'));
      if (target && target.tagName === 'DETAILS') { target.open = true; }
    });
  });

  /* ---------- Optional product-grade enhancements ---------- */
  function loadEnhancement(filename) {
    if (!scriptUrl) { return; }
    var script = document.createElement('script');
    script.src = new URL(filename, scriptUrl).href;
    script.async = true;
    document.head.appendChild(script);
  }

  loadEnhancement('command-palette.js');
  if (isProjects) { loadEnhancement('project-filter.js'); }
})();
