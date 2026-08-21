/* ============================================================
   cursor.js — instrument cursor.

   Three layers, each doing a different job:

     dot    the true pointer position, no smoothing at all, so text
            selection and small targets stay exact
     ring   a lagging reticle that locks onto interactive elements and
            morphs to their shape
     ghost  where a constant-velocity filter predicts the pointer will be
            one lead-time from now — the same idea as the GHOST-X tracker,
            running against your hand instead of a target

   Move slowly and the ghost sits on the dot. Move fast and it leads you,
   then converges when you stop. That convergence is the whole point of
   the estimator, made visible.

   Off entirely on touch and under prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduce.matches) { return; }

  var LEAD = 0.075;        /* seconds the filter predicts ahead */
  var VEL_SMOOTH = 0.72;   /* velocity low-pass; raw finite differences are noisy */
  var RING_FOLLOW = 0.19;  /* ring catch-up per frame */
  var MAX_LEAD_PX = 90;    /* never let the prediction fly off on a flick */

  var LOCK_SELECTOR = 'a, button, [role="button"], .case, .skill-tile, .tool-chip, ' +
    '.model-card, .icon-tile, .contact-card, .dl-card, .lab-btn, .proc-btn, ' +
    'summary, .command-result, input[type="range"], .skill-filters button, ' +
    '.project-filter__domains button, .lab-switch, .toc a';

  var root = document.createElement('div');
  root.className = 'cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<svg class="cursor__ghost" viewBox="0 0 24 24" width="24" height="24">' +
      '<circle cx="12" cy="12" r="7" />' +
    '</svg>' +
    '<svg class="cursor__ring" viewBox="0 0 44 44" width="44" height="44">' +
      '<circle class="cursor__ring-c" cx="22" cy="22" r="13" />' +
      '<path class="cursor__tick" d="M22 3v5M22 36v5M3 22h5M36 22h5" />' +
    '</svg>' +
    '<i class="cursor__dot"></i>';
  document.body.appendChild(root);
  document.documentElement.classList.add('has-cursor');

  var ghost = root.querySelector('.cursor__ghost');
  var ring = root.querySelector('.cursor__ring');
  var dot = root.querySelector('.cursor__dot');

  var x = window.innerWidth / 2, y = window.innerHeight / 2;
  var rx = x, ry = y;                 /* ring position */
  var vx = 0, vy = 0;                 /* smoothed velocity, px/s */
  var lastX = x, lastY = y, lastT = 0;
  var locked = null;
  var visible = false;

  function move(e) {
    x = e.clientX;
    y = e.clientY;
    if (!visible) {
      visible = true;
      rx = x; ry = y;
      root.classList.add('is-on');
    }
  }

  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerdown', function () { root.classList.add('is-down'); }, { passive: true });
  document.addEventListener('pointerup', function () { root.classList.remove('is-down'); }, { passive: true });

  document.addEventListener('pointerleave', function () {
    visible = false;
    root.classList.remove('is-on');
  }, { passive: true });
  document.addEventListener('pointerenter', function () {
    visible = true;
    root.classList.add('is-on');
  }, { passive: true });

  /* ---------- lock-on ----------
     The reticle takes the shape of whatever it is over, so a card reads as
     a captured target rather than a hover. */
  /* An accent-coloured mark vanishes on an accent-filled button. Read the
     locked element's own background and flip the cursor to its ink colour
     when the surface underneath is bright. */
  function isBright(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      var c = getComputedStyle(node).backgroundColor;
      var m = c && c.match(/[\d.]+/g);
      if (m && (m.length < 4 || parseFloat(m[3]) > 0.55)) {
        var lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
        return lum > 0.55;
      }
      node = node.parentElement;
    }
    return false;
  }

  document.addEventListener('pointerover', function (e) {
    var hit = e.target.closest && e.target.closest(LOCK_SELECTOR);
    if (hit === locked) { return; }
    locked = hit;
    root.classList.toggle('is-locked', !!hit);
    root.classList.toggle('is-bright', !!hit && isBright(hit));
  }, { passive: true });

  document.addEventListener('pointerout', function (e) {
    if (!e.relatedTarget) { locked = null; root.classList.remove('is-locked', 'is-bright'); }
  }, { passive: true });

  /* Text needs the real caret, so stand down over inputs and editable areas. */
  document.addEventListener('pointerover', function (e) {
    var t = e.target;
    var editable = t.closest && t.closest('input:not([type="range"]), textarea, select, [contenteditable="true"]');
    root.classList.toggle('is-text', !!editable);
    document.documentElement.classList.toggle('cursor-native', !!editable);
  }, { passive: true });

  function frame(t) {
    var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0.016;
    lastT = t;

    if (dt > 0) {
      var ivx = (x - lastX) / dt;
      var ivy = (y - lastY) / dt;
      vx = vx * VEL_SMOOTH + ivx * (1 - VEL_SMOOTH);
      vy = vy * VEL_SMOOTH + ivy * (1 - VEL_SMOOTH);
    }
    lastX = x; lastY = y;

    /* constant-velocity prediction, clamped so a flick cannot throw it away */
    var px = vx * LEAD, py = vy * LEAD;
    var mag = Math.sqrt(px * px + py * py);
    if (mag > MAX_LEAD_PX) { px *= MAX_LEAD_PX / mag; py *= MAX_LEAD_PX / mag; }

    /* the gap between truth and prediction is the innovation: show it */
    root.style.setProperty('--lead', Math.min(mag / MAX_LEAD_PX, 1).toFixed(3));

    dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    ghost.style.transform = 'translate3d(' + (x + px) + 'px,' + (y + py) + 'px,0) translate(-50%,-50%)';

    if (locked) {
      var r = locked.getBoundingClientRect();
      rx += (r.left + r.width / 2 - rx) * 0.28;
      ry += (r.top + r.height / 2 - ry) * 0.28;
      var radius = parseFloat(getComputedStyle(locked).borderRadius) || 8;
      ring.style.width = Math.round(r.width + 10) + 'px';
      ring.style.height = Math.round(r.height + 10) + 'px';
      ring.style.borderRadius = Math.round(radius + 4) + 'px';
    } else {
      rx += (x - rx) * RING_FOLLOW;
      ry += (y - ry) * RING_FOLLOW;
      ring.style.width = '';
      ring.style.height = '';
      ring.style.borderRadius = '';
    }
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* Stand down if the preference changes mid-session. */
  function teardown() {
    root.remove();
    document.documentElement.classList.remove('has-cursor', 'cursor-native');
  }
  if (reduce.addEventListener) {
    reduce.addEventListener('change', function () { if (reduce.matches) { teardown(); } });
  }
})();
