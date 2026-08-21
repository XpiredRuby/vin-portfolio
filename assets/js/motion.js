/* ============================================================
   motion.js — ambient interaction layer.

   Everything here responds to presence rather than clicks: the cursor,
   the scroll position, the pointer entering a card. None of it carries
   information, so all of it switches off under prefers-reduced-motion
   and on touch devices, where a hover state is a lie.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function motionAllowed() { return !reduceMotion.matches && finePointer.matches; }

  /* ---------- 1. Cursor spotlight ----------
     A soft highlight follows the pointer across a card, so the surface
     reacts before anything is clicked. */
  var SPOT = '.case, .model-card, .contact-card, .panel, .tech, .tool-logo-card, ' +
             '.proof-ribbon__item, .artifact, .evidence-card, .icon-tile';

  function bindSpotlight() {
    document.querySelectorAll(SPOT).forEach(function (el) {
      el.setAttribute('data-spot', '');
    });

    document.addEventListener('pointermove', function (event) {
      if (!motionAllowed()) { return; }
      var card = event.target.closest && event.target.closest('[data-spot]');
      if (!card) { return; }
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((event.clientX - r.left) / r.width * 100).toFixed(2) + '%');
      card.style.setProperty('--my', ((event.clientY - r.top) / r.height * 100).toFixed(2) + '%');
    }, { passive: true });
  }

  /* ---------- 2. Tilt ----------
     Featured cards lean toward the cursor. Small angles only: this should
     read as depth, not as a toy. */
  function bindTilt() {
    var cards = document.querySelectorAll('.featured-grid .case, .project-catalog .case');
    cards.forEach(function (card) {
      var frame = null;

      card.addEventListener('pointermove', function (event) {
        if (!motionAllowed()) { return; }
        if (frame) { return; }
        frame = requestAnimationFrame(function () {
          frame = null;
          var r = card.getBoundingClientRect();
          var px = (event.clientX - r.left) / r.width - 0.5;
          var py = (event.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            'perspective(900px) rotateX(' + (-py * 3.4).toFixed(2) + 'deg) ' +
            'rotateY(' + (px * 3.4).toFixed(2) + 'deg) translateY(-3px)';
        });
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        if (frame) { cancelAnimationFrame(frame); frame = null; }
        card.style.transform = '';
      });
    });
  }

  /* ---------- 3. Magnetic controls ----------
     Primary actions drift a few pixels toward the cursor as it approaches,
     so the button feels like it wants to be pressed. */
  function bindMagnets() {
    var magnets = document.querySelectorAll('[data-magnetic]');
    magnets.forEach(function (el) {
      var frame = null;

      el.addEventListener('pointermove', function (event) {
        if (!motionAllowed()) { return; }
        if (frame) { return; }
        frame = requestAnimationFrame(function () {
          frame = null;
          var r = el.getBoundingClientRect();
          var dx = event.clientX - (r.left + r.width / 2);
          var dy = event.clientY - (r.top + r.height / 2);
          /* Cap the offset so a wide button does not slide halfway across. */
          var pull = 0.22, cap = 7;
          var mx = Math.max(-cap, Math.min(cap, dx * pull));
          var my = Math.max(-cap, Math.min(cap, dy * pull));
          el.style.transform = 'translate(' + mx.toFixed(2) + 'px,' + my.toFixed(2) + 'px)';
        });
      }, { passive: true });

      el.addEventListener('pointerleave', function () {
        if (frame) { cancelAnimationFrame(frame); frame = null; }
        el.style.transform = '';
      });
    });
  }

  /* ---------- 4. Scroll parallax ----------
     The hero portrait and its grid drift at different rates, which gives
     the top of the page a sense of depth as you leave it. */
  function bindParallax() {
    var layers = document.querySelectorAll('[data-parallax]');
    if (!layers.length) { return; }
    var ticking = false;

    function apply() {
      ticking = false;
      if (!motionAllowed()) { return; }
      var y = window.scrollY;
      layers.forEach(function (el) {
        var rate = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        el.style.transform = 'translate3d(0,' + (y * rate).toFixed(1) + 'px,0)';
      });
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }

  /* ---------- 5. Copy to clipboard ----------
     An address you can take without opening a mail client. */
  function bindCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (el) {
      el.addEventListener('click', function (event) {
        event.preventDefault();
        var text = el.getAttribute('data-copy');
        var done = function (ok) {
          el.setAttribute('data-copied', ok ? 'yes' : 'fail');
          var label = el.querySelector('[data-copy-label]');
          var original = label ? label.textContent : null;
          if (label) { label.textContent = ok ? 'Copied' : 'Press Ctrl+C'; }
          setTimeout(function () {
            el.removeAttribute('data-copied');
            if (label && original !== null) { label.textContent = original; }
          }, 1800);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
          document.body.removeChild(ta);
          done(ok);
        }
      });
    });
  }

  /* ---------- 6. Staggered reveal ----------
     Children of a revealed group come in one after another rather than
     all at once, which reads as assembly instead of a flash. */
  function bindStagger() {
    var groups = document.querySelectorAll('[data-stagger]');
    if (!groups.length || !('IntersectionObserver' in window)) {
      groups.forEach(function (g) {
        Array.prototype.forEach.call(g.children, function (c) { c.classList.add('is-in'); });
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        obs.unobserve(entry.target);
        var step = reduceMotion.matches ? 0 : 55;
        Array.prototype.forEach.call(entry.target.children, function (child, i) {
          setTimeout(function () { child.classList.add('is-in'); }, i * step);
        });
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

    groups.forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c) { c.classList.add('stagger-item'); });
      observer.observe(g);
    });
  }

  /* Clear any inline transforms when the user turns motion off mid-session. */
  function clearAll() {
    document.querySelectorAll('[data-magnetic], .case, [data-parallax]').forEach(function (el) {
      el.style.transform = '';
    });
  }
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () { if (reduceMotion.matches) { clearAll(); } });
  }

  bindSpotlight();
  bindTilt();
  bindMagnets();
  bindParallax();
  bindCopy();
  bindStagger();
})();
