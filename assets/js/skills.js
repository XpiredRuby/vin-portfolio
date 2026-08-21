/* ============================================================
   skills.js — filter the tool grid and show what each tool was
   actually used for. Without JavaScript every tile still renders
   and the full capability matrix below carries the same detail.
   ============================================================ */
(function () {
  'use strict';

  var grid = document.getElementById('skill-grid');
  var panel = document.getElementById('skill-detail');
  var dataEl = document.getElementById('skill-data');
  if (!grid || !panel || !dataEl) { return; }

  var DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (err) { return; }

  var tiles = Array.prototype.slice.call(grid.querySelectorAll('.skill-tile'));
  var filters = Array.prototype.slice.call(document.querySelectorAll('[data-skill-filter]'));
  var selected = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function show(slug) {
    var d = DATA[slug];
    if (!d) { return; }

    var links = (d.where || []).map(function (w) {
      var external = /^https?:/i.test(w.h);
      return '<a href="' + esc(w.h) + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(w.t) + '</a>';
    }).join('');

    panel.innerHTML =
      '<div class="skill-detail__body">' +
        '<p class="skill-detail__eyebrow">' + esc(d.name) + '</p>' +
        '<p class="skill-detail__what">' + esc(d.what) + '</p>' +
        (links ? '<div class="skill-detail__where"><span>Proven in</span>' + links + '</div>' : '') +
      '</div>';

    tiles.forEach(function (tile) {
      tile.setAttribute('aria-pressed', String(tile.dataset.skill === slug));
    });
    selected = slug;
  }

  function clear() {
    panel.innerHTML = '<p class="skill-detail__hint">Pick a tool above to see where it shows up.</p>';
    tiles.forEach(function (tile) { tile.setAttribute('aria-pressed', 'false'); });
    selected = null;
  }

  tiles.forEach(function (tile) {
    tile.addEventListener('click', function () {
      if (selected === tile.dataset.skill) { clear(); } else { show(tile.dataset.skill); }
    });
  });

  function applyFilter(group) {
    var shown = 0;
    tiles.forEach(function (tile) {
      var match = group === 'all' || tile.dataset.group === group;
      tile.hidden = !match;
      if (match) { shown += 1; }
    });
    filters.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.skillFilter === group));
    });
    // A selected tool that just got filtered out should stop being highlighted.
    if (selected && DATA[selected]) {
      var stillVisible = tiles.some(function (t) { return t.dataset.skill === selected && !t.hidden; });
      if (!stillVisible) { clear(); }
    }
    return shown;
  }

  filters.forEach(function (b) {
    b.addEventListener('click', function () { applyFilter(b.dataset.skillFilter); });
  });

  // Deep link: skills.html?tool=solidworks opens straight onto that tool.
  var wanted = new URLSearchParams(window.location.search).get('tool');
  if (wanted && DATA[wanted]) {
    show(wanted);
    var target = tiles.filter(function (t) { return t.dataset.skill === wanted; })[0];
    if (target) { target.scrollIntoView({ block: 'center' }); }
  }
})();
