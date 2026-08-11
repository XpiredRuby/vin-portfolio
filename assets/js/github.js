/* ============================================================
   github.js — live repository list rendered the way GitHub
   renders it. One API call. Fails into a static link.
   ============================================================ */
(function () {
  'use strict';

  var USER = 'XpiredRuby';
  // Recruiter-facing order: strongest current public engineering evidence first.
  // Keep these names synchronized with the actual public repositories.
  var PINNED = [
    'ghost-vins-eskf',
    'astrasim-fsw',
    'aeroframe-dt',
    'f16-flight-sim',
    'pact-controls',
    'vin-portfolio'
  ];
  var MAX = 6;

  var mount = document.getElementById('gh-list');
  var countEl = document.getElementById('gh-count');
  if (!mount) { return; }

  // GitHub's own linguist colours for the languages this profile uses.
  var LANG = {
    'C++': '#f34b7d', 'C': '#555555', 'Python': '#3572A5', 'MATLAB': '#e16737',
    'CMake': '#DA3434', 'Shell': '#89e051', 'JavaScript': '#f1e05a', 'HTML': '#e34c26',
    'CSS': '#563d7c', 'Jupyter Notebook': '#DA5B0B', 'Makefile': '#427819',
    'Dockerfile': '#384d54', 'TeX': '#3D6117'
  };

  var ICON_REPO = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path></svg>';
  var ICON_STAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>';
  var ICON_FORK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function updated(iso) {
    var then = new Date(iso);
    var days = Math.floor((Date.now() - then.getTime()) / 86400000);
    if (days < 1) { return 'Updated today'; }
    if (days === 1) { return 'Updated yesterday'; }
    if (days < 30) { return 'Updated ' + days + ' days ago'; }
    if (days < 365) {
      var m = Math.floor(days / 30);
      return 'Updated ' + m + (m === 1 ? ' month ago' : ' months ago');
    }
    return 'Updated on ' + then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function rank(r) {
    var i = PINNED.indexOf(r.name.toLowerCase());
    return i === -1 ? 100 : i;
  }

  function render(repos) {
    var list = repos
      .filter(function (r) { return !r.fork && !r.archived; })
      .sort(function (a, b) {
        var d = rank(a) - rank(b);
        return d !== 0 ? d : new Date(b.pushed_at) - new Date(a.pushed_at);
      })
      .slice(0, MAX);

    if (!list.length) { return fallback(); }
    if (countEl) { countEl.textContent = list.length; }

    mount.innerHTML = list.map(function (r) {
      var topics = (r.topics || []).slice(0, 5).map(function (t) {
        return '<span class="gh__topic">' + esc(t) + '</span>';
      }).join('');
      var meta = [];
      if (r.language) {
        meta.push('<span><i class="gh__lang" style="background:' + (LANG[r.language] || '#4493f8') + '"></i>' + esc(r.language) + '</span>');
      }
      if (r.stargazers_count) { meta.push('<span>' + ICON_STAR + r.stargazers_count + '</span>'); }
      if (r.forks_count) { meta.push('<span>' + ICON_FORK + r.forks_count + '</span>'); }
      meta.push('<span>' + updated(r.pushed_at) + '</span>');

      return '' +
        '<a class="gh__repo" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="gh__name">' + ICON_REPO + esc(r.name) +
            '<span class="gh__vis">' + (r.private ? 'Private' : 'Public') + '</span>' +
          '</span>' +
          (r.description ? '<span class="gh__desc">' + esc(r.description) + '</span>' : '') +
          (topics ? '<span class="gh__topics">' + topics + '</span>' : '') +
          '<span class="gh__meta">' + meta.join('') + '</span>' +
        '</a>';
    }).join('');
  }

  function fallback() {
    mount.innerHTML = '<p class="gh__empty">Repository list could not be loaded right now. ' +
      'Browse public source at <a href="https://github.com/' + USER + '" target="_blank" rel="noopener noreferrer">github.com/' + USER + '</a>.</p>';
    if (countEl) { countEl.textContent = ''; }
  }

  function load() {
    var timeout = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, 8000);
    });
    var request = fetch('https://api.github.com/users/' + USER + '/repos?per_page=100&sort=pushed',
      { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.json();
      });

    Promise.race([request, timeout]).then(render).catch(fallback);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { obs.disconnect(); load(); }
    }, { rootMargin: '300px' });
    io.observe(mount);
  } else {
    load();
  }
})();
