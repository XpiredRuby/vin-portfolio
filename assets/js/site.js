/* ============================================================
   site.js — dependency-free interaction layer.
   Content stays usable with JavaScript disabled; everything here
   is progressive enhancement.
   ============================================================ */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src)
    : null;

  var path = window.location.pathname.replace(/\/+$/, '');
  var isHome = path === '' || path === '/' || /\/index\.html$/.test(path);
  var isProjects = /\/projects\.html$/.test(path);
  var isProjectDetail = /\/projects\/[^/]+\.html$/.test(path);

  document.body.classList.add('aero-ui');
  if (isHome) { document.body.classList.add('page-home'); }
  else if (isProjects) { document.body.classList.add('page-projects'); }
  else if (isProjectDetail) { document.body.classList.add('page-project-detail'); }
  else {
    document.body.classList.add('page-standard');
    if (/\/about\.html$/.test(path)) { document.body.classList.add('page-about'); }
    else if (/\/experience\.html$/.test(path)) { document.body.classList.add('page-experience'); }
    else if (/\/skills\.html$/.test(path)) { document.body.classList.add('page-skills'); }
    else if (/\/contact\.html$/.test(path)) { document.body.classList.add('page-contact'); }
  }

  /* ---------- Theme switch ----------
     The initial theme is resolved by an inline <head> script so the page
     never paints the wrong palette first. This only wires the control. */
  (function theme() {
    var root = document.documentElement;
    var nav = document.getElementById('primary-nav');
    if (!nav) { return; }

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Switch colour theme');
    button.innerHTML = '' +
      '<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>' +
      '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

    function sync() {
      var dark = root.getAttribute('data-theme') !== 'light';
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
    }

    button.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('vn-theme', next); } catch (err) { /* private mode */ }
      sync();
      window.dispatchEvent(new CustomEvent('vn:themechange', { detail: { theme: next } }));
    });

    sync();
    nav.appendChild(button);
  })();

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
    if (bar) {
      requestAnimationFrame(function () {
        bar.style.width = (el.getAttribute('data-fill') || '100') + '%';
      });
    }

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

  /* ---------- Case-study contents: scroll spy + reading progress ---------- */
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
    }, { rootMargin: '-12% 0px -72% 0px', threshold: 0 });

    sections.forEach(function (s) { spy.observe(s); });
  }

  if (document.querySelector('.doc')) {
    var rail = document.createElement('div');
    rail.className = 'read-progress';
    document.body.appendChild(rail);
    var railTick = false;
    var updateRail = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0;
      rail.style.width = pct.toFixed(2) + '%';
      railTick = false;
    };
    window.addEventListener('scroll', function () {
      if (!railTick) { railTick = true; requestAnimationFrame(updateRail); }
    }, { passive: true });
    updateRail();
  }

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Native <details> stays usable without JS; this only opens a role before
     an in-page jump so the destination content is immediately visible. */
  document.querySelectorAll('.experience-jump a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var target = document.querySelector(link.getAttribute('href'));
      if (target && target.tagName === 'DETAILS') { target.open = true; }
    });
  });

  /* ---------- Evidence lightbox ----------
     Evidence plots are repository artifacts; reviewers need to read the
     axis labels. Opening in a dialog beats a new tab full of raw PNG. */
  (function lightbox() {
    if (!('HTMLDialogElement' in window)) { return; }

    var candidates = Array.prototype.slice.call(
      document.querySelectorAll('.evidence-card > a:first-child, .fig > a:first-child')
    ).filter(function (a) { return a.querySelector('img'); });
    if (!candidates.length) { return; }

    var dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.innerHTML = '' +
      '<div class="lightbox__bar"><span data-lb-label>EVIDENCE</span>' +
      '<span><a data-lb-open target="_blank" rel="noopener noreferrer" style="margin-right:.5rem">Open original ↗</a>' +
      '<button type="button" data-lb-close>Close · Esc</button></span></div>' +
      '<div class="lightbox__stage"><img alt="" data-lb-img></div>' +
      '<p class="lightbox__cap" data-lb-cap></p>';
    document.body.appendChild(dialog);

    var lbImg = dialog.querySelector('[data-lb-img]');
    var lbCap = dialog.querySelector('[data-lb-cap]');
    var lbOpen = dialog.querySelector('[data-lb-open]');
    var lbLabel = dialog.querySelector('[data-lb-label]');
    var opener = null;

    dialog.querySelector('[data-lb-close]').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) { dialog.close(); }
    });
    dialog.addEventListener('close', function () {
      if (opener && typeof opener.focus === 'function') { opener.focus(); }
    });

    candidates.forEach(function (link) {
      var img = link.querySelector('img');
      link.addEventListener('click', function (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) { return; }
        event.preventDefault();
        opener = link;
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt || '';
        var caption = link.parentElement && link.parentElement.querySelector('figcaption h3');
        var tag = link.parentElement && link.parentElement.querySelector('.evidence-tag');
        lbLabel.textContent = tag ? tag.textContent.toUpperCase() : 'EVIDENCE';
        lbCap.textContent = caption ? caption.textContent : (img.alt || '');
        lbOpen.href = link.getAttribute('href');
        dialog.showModal();
      });
    });
  })();

  /* ---------- Optional enhancements ---------- */
  /* Resolving a relative URL drops the query string, so a redeploy would ship
     a new site.js beside a cached command-palette.js. Carry the version down. */
  function loadScript(relative) {
    if (!scriptUrl) { return; }
    var script = document.createElement('script');
    script.src = new URL(relative + scriptUrl.search, scriptUrl).href;
    script.async = true;
    document.head.appendChild(script);
  }

  loadScript('command-palette.js');
  if (isProjects) { loadScript('project-filter.js'); }
  if (document.querySelector('[data-lab]')) { loadScript('labs/core.js'); }
})();
