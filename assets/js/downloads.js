/* ============================================================
   downloads.js — CAD and analysis packages.

   A file that is present offers a download with its size and hash. A file
   that is not published yet says so plainly rather than serving a 404. The
   check is a HEAD request per file, so the panel is always truthful about
   what is actually on the server.
   ============================================================ */
(function () {
  'use strict';

  var mount = document.querySelector('[data-downloads]');
  if (!mount) { return; }

  var here = document.currentScript && document.currentScript.src;
  if (!here) { return; }
  var key = mount.getAttribute('data-downloads');
  var manifestUrl = new URL('../data/downloads.json' + new URL(here).search, here);
  var base = new URL('../downloads/', here);

  function bytes(n) {
    if (!n && n !== 0) { return null; }
    if (n < 1024) { return n + ' B'; }
    if (n < 1048576) { return (n / 1024).toFixed(0) + ' KB'; }
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICON_DOWN = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 4v11M7.6 10.6 12 15l4.4-4.4M4.5 19.5h15"/></svg>';
  var ICON_LOCK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8.4 10.5V7.8a3.6 3.6 0 0 1 7.2 0v2.7"/></svg>';

  function card(f, available) {
    var size = bytes(f.bytes);
    var meta = [f.format, size].filter(Boolean).map(esc).join(' · ');
    var contains = (f.contains || []).length
      ? '<span class="dl-card__contains">' + f.contains.map(esc).join(' · ') + '</span>' : '';
    var hash = f.sha256
      ? '<code class="dl-card__hash" title="SHA-256">' + esc(f.sha256.slice(0, 16)) + '…</code>' : '';

    if (available) {
      return '<a class="dl-card" href="' + esc(new URL(f.file, base).href) + '" download>' +
        '<span class="dl-card__icon">' + ICON_DOWN + '</span>' +
        '<span class="dl-card__body"><strong>' + esc(f.label) + '</strong>' +
        '<span class="dl-card__meta">' + meta + '</span>' + contains + hash + '</span></a>';
    }
    return '<div class="dl-card dl-card--pending">' +
      '<span class="dl-card__icon">' + ICON_LOCK + '</span>' +
      '<span class="dl-card__body"><strong>' + esc(f.label) + '</strong>' +
      '<span class="dl-card__meta">' + (meta || 'Not published yet') + '</span>' + contains +
      '<span class="dl-card__ask">Available on request — ' +
      '<a href="mailto:Vin.manoj.nair@gmail.com?subject=' +
      encodeURIComponent('Request: ' + f.label) + '">ask me for it</a></span></span></div>';
  }

  function head(url) {
    return fetch(url, { method: 'HEAD' })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }

  fetch(manifestUrl)
    .then(function (r) { if (!r.ok) { throw new Error('no manifest'); } return r.json(); })
    .then(function (all) {
      var group = all[key];
      if (!group) { throw new Error('no group ' + key); }
      return Promise.all(group.files.map(function (f) {
        return head(new URL(f.file, base).href).then(function (ok) { return { f: f, ok: ok }; });
      })).then(function (results) {
        var ready = results.filter(function (r) { return r.ok; }).length;
        mount.innerHTML =
          '<div class="dl-head"><strong>' + esc(group.title) + '</strong>' +
          '<span>' + ready + ' of ' + results.length + ' published</span></div>' +
          '<div class="dl-grid">' + results.map(function (r) { return card(r.f, r.ok); }).join('') + '</div>' +
          '<p class="dl-note">' + esc(group.note) + '</p>';
      });
    })
    .catch(function () {
      mount.innerHTML = '<p class="dl-note">Package list unavailable. ' +
        '<a href="mailto:Vin.manoj.nair@gmail.com">Email me</a> for the source files.</p>';
    });
})();
