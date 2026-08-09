/* ============================================================
   github.js — live repository feed (unauthenticated GitHub API)
   Two requests total. Fails silently into a static fallback.
   ============================================================ */
(function () {
  'use strict';

  var USER = 'XpiredRuby';
  var PINNED = ['astrasim-fsw', 'ghost', 'rocket-landing-gnc', 'interceptor'];

  var repoMount = document.getElementById('gh-repos');
  var commitMount = document.getElementById('gh-commits');
  var statMount = document.getElementById('gh-stats');
  if (!repoMount) { return; }

  var LANG_COLORS = {
    'C++': '#f34b7d', 'C': '#555555', 'Python': '#3572A5', 'MATLAB': '#e16737',
    'CMake': '#DA3434', 'Shell': '#89e051', 'JavaScript': '#f1e05a', 'HTML': '#e34c26',
    'CSS': '#563d7c', 'Jupyter Notebook': '#DA5B0B', 'Makefile': '#427819', 'Dockerfile': '#384d54'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ago(iso) {
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    var units = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
    for (var i = 0; i < units.length; i++) {
      if (diff >= units[i][0]) { return Math.floor(diff / units[i][0]) + units[i][1] + ' ago'; }
    }
    return 'just now';
  }

  function rank(repo) {
    var i = PINNED.indexOf(repo.name.toLowerCase());
    return i === -1 ? 100 : i;
  }

  function renderRepos(repos) {
    if (!repos.length) { return fallback(); }

    var visible = repos
      .filter(function (r) { return !r.fork && !r.archived; })
      .sort(function (a, b) {
        var d = rank(a) - rank(b);
        if (d !== 0) { return d; }
        return new Date(b.pushed_at) - new Date(a.pushed_at);
      })
      .slice(0, 6);

    repoMount.innerHTML = visible.map(function (r) {
      var color = LANG_COLORS[r.language] || '#2B7FFF';
      var topics = (r.topics || []).slice(0, 4).map(function (t) {
        return '<span class="chip" style="font-size:.64rem;padding:.18rem .45rem">' + esc(t) + '</span>';
      }).join('');

      return '' +
        '<a class="repo" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="repo__name">' + esc(r.name) + (rank(r) < 100 ? ' <span class="u-mute" style="font-size:.62rem">PINNED</span>' : '') + '</span>' +
          '<span class="repo__desc">' + esc(r.description || 'No description provided.') + '</span>' +
          (topics ? '<span class="chips">' + topics + '</span>' : '') +
          '<span class="repo__foot">' +
            (r.language ? '<span><i class="lang-dot" style="background:' + color + '"></i>' + esc(r.language) + '</span>' : '') +
            '<span>&#9733; ' + r.stargazers_count + '</span>' +
            '<span>&#8862; ' + r.forks_count + '</span>' +
            '<span>PUSHED ' + ago(r.pushed_at).toUpperCase() + '</span>' +
          '</span>' +
        '</a>';
    }).join('');

    if (statMount) {
      var stars = repos.reduce(function (sum, r) { return sum + r.stargazers_count; }, 0);
      var langs = {};
      repos.forEach(function (r) { if (r.language) { langs[r.language] = 1; } });
      statMount.innerHTML = '' +
        '<div class="metric"><div class="metric__v">' + repos.length + '</div><div class="metric__k">Public repos</div></div>' +
        '<div class="metric"><div class="metric__v">' + Object.keys(langs).length + '</div><div class="metric__k">Languages</div></div>' +
        '<div class="metric metric--orange"><div class="metric__v">' + stars + '</div><div class="metric__k">Stars earned</div></div>' +
        '<div class="metric metric--green"><div class="metric__v">' + ago(repos[0].pushed_at).replace(' ago', '') + '</div><div class="metric__k">Last push</div></div>';
    }
  }

  function renderCommits(events) {
    if (!commitMount) { return; }

    var rows = [];
    events.forEach(function (ev) {
      if (ev.type !== 'PushEvent' || !ev.payload || !ev.payload.commits) { return; }
      ev.payload.commits.slice(-2).reverse().forEach(function (c) {
        if (rows.length >= 8) { return; }
        rows.push(
          '<div class="commit">' +
            '<span class="commit__sha">' + esc(c.sha.slice(0, 7)) + '</span>' +
            '<span class="commit__msg" title="' + esc(c.message) + '">' + esc(c.message.split('\n')[0]) + '</span>' +
            '<span class="commit__t">' + esc(ev.repo.name.split('/')[1]) + ' &middot; ' + ago(ev.created_at) + '</span>' +
          '</div>'
        );
      });
    });

    commitMount.innerHTML = rows.length
      ? rows.join('')
      : '<p class="u-mute" style="font-size:.85rem">No public push activity in the last 90 days.</p>';
  }

  function fallback() {
    repoMount.innerHTML =
      '<div class="repo"><span class="repo__name">Live feed unavailable</span>' +
      '<span class="repo__desc">The GitHub API did not respond (rate limit or offline). ' +
      'All repositories are browsable directly on the profile.</span>' +
      '<span class="repo__foot"><span>GITHUB.COM/' + USER.toUpperCase() + '</span></span></div>';
    if (commitMount) { commitMount.innerHTML = '<p class="u-mute" style="font-size:.85rem">Commit feed unavailable.</p>'; }
    if (statMount) { statMount.innerHTML = ''; }
  }

  function getJSON(url) {
    return fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.json();
      });
  }

  // Defer until the section is close to the viewport — keeps first paint clean.
  function load() {
    getJSON('https://api.github.com/users/' + USER + '/repos?per_page=100&sort=pushed')
      .then(renderRepos)
      .catch(fallback);

    if (commitMount) {
      getJSON('https://api.github.com/users/' + USER + '/events/public?per_page=30')
        .then(renderCommits)
        .catch(function () {
          commitMount.innerHTML = '<p class="u-mute" style="font-size:.85rem">Commit feed unavailable.</p>';
        });
    }
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { obs.disconnect(); load(); }
    }, { rootMargin: '300px' });
    io.observe(repoMount);
  } else {
    load();
  }
})();
