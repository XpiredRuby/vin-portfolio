/* Shareable, URL-synced project search/filter for projects.html.
   Also installs the ORBITALIS-RPO project entry on the legacy projects index. */
(function () {
  'use strict';

  function installOrbitalisProject() {
    if (document.getElementById('orbitalis')) { return; }

    /* Keep the visible project count accurate. */
    var heroEyebrow = document.querySelector('.page-hero .eyebrow');
    if (heroEyebrow && /08 entries/.test(heroEyebrow.textContent)) {
      heroEyebrow.innerHTML = 'Engineering case studies &middot; 09 entries';
    }

    /* Add ORBITALIS to the status-board register. */
    var register = document.querySelector('.table-wrap.panel .reqs tbody');
    if (register && !register.querySelector('a[href="projects/orbitalis-rpo.html"]')) {
      var row = document.createElement('tr');
      row.innerHTML = '' +
        '<td>PRJ-10</td>' +
        '<td><a class="u-cyan" href="projects/orbitalis-rpo.html">ORBITALIS-RPO</a></td>' +
        '<td>Spacecraft GNC / RPO</td>' +
        '<td>200-run frozen SIL campaign; 0 truth-level keep-out violations</td>' +
        '<td><span class="pill pill--done">Verified SIL</span></td>';
      register.insertBefore(row, register.firstChild);
    }

    /* Add the main project card directly after ASTRA-OS. */
    var catalog = document.querySelector('.project-catalog');
    if (catalog) {
      var article = document.createElement('article');
      article.className = 'case is-in';
      article.id = 'orbitalis';
      article.setAttribute('data-project-key', 'orbitalis');
      article.innerHTML = '' +
        '<div class="case__visual case__visual--evidence">' +
          '<span class="case__id">PRJ-10</span>' +
          '<img src="assets/evidence/orbitalis/architecture.svg" width="1600" height="900" loading="lazy" alt="ORBITALIS-RPO spacecraft rendezvous, relative navigation, guidance, autonomy and verification architecture.">' +
        '</div>' +
        '<div class="case__body">' +
          '<div style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between">' +
            '<span class="pill pill--done">Verified SIL baseline</span><span class="case__sub">2026</span>' +
          '</div>' +
          '<h2 class="case__title"><a href="projects/orbitalis-rpo.html">ORBITALIS-RPO: Spacecraft Rendezvous &amp; Proximity Operations</a></h2>' +
          '<p class="case__sub">Relative navigation &middot; constrained guidance &middot; 6-DOF &middot; autonomy &middot; C++20 verification</p>' +
          '<div class="case__block"><h4>What it does</h4><p>A software-in-the-loop spacecraft inspection and RPO stack spanning orbital/relative dynamics, asynchronous navigation, waypoint and keep-out guidance, quaternion 6-DOF propagation, autonomy, retreat logic, and mission-resource closure.</p></div>' +
          '<div class="case__block"><h4>Evidence</h4><p>A frozen 200-case campaign retained 132 full mission completions, 62 safe abort-retreats, six timeouts, and zero truth-level keep-out violations; the dependency-free C++20 core passed 96 / 96 frozen Python-reference vectors.</p></div>' +
          '<div class="metrics">' +
            '<div class="metric metric--green"><div class="metric__v">200</div><div class="metric__k">Frozen SIL cases</div></div>' +
            '<div class="metric metric--green"><div class="metric__v">132</div><div class="metric__k">Full missions</div></div>' +
            '<div class="metric metric--green"><div class="metric__v">0</div><div class="metric__k">Keep-out violations</div></div>' +
            '<div class="metric"><div class="metric__v">96 / 96</div><div class="metric__k">C++ vectors</div></div>' +
          '</div>' +
          '<div class="chips"><span class="chip chip--accent">Python</span><span class="chip chip--accent">C++20</span><span class="chip">Relative Navigation</span><span class="chip">RPO</span><span class="chip">6-DOF</span><span class="chip">Monte Carlo</span></div>' +
          '<div class="btn-row"><a class="btn btn--sm btn--primary" href="projects/orbitalis-rpo.html">Try interactive case study</a><a class="btn btn--sm" href="https://github.com/XpiredRuby/orbitalis-rpo" target="_blank" rel="noopener noreferrer">Source repository</a></div>' +
        '</div>';

      var astra = document.getElementById('astrasim');
      if (astra && astra.parentNode === catalog) {
        astra.insertAdjacentElement('afterend', article);
      } else {
        catalog.insertBefore(article, catalog.firstChild);
      }
    }

    /* Add it to the footer case-study index. */
    var footerLists = document.querySelectorAll('.footer h5');
    footerLists.forEach(function (heading) {
      if (heading.textContent.trim() !== 'Case studies') { return; }
      var list = heading.parentElement && heading.parentElement.querySelector('ul');
      if (list && !list.querySelector('a[href="projects/orbitalis-rpo.html"]')) {
        var item = document.createElement('li');
        item.innerHTML = '<a href="projects/orbitalis-rpo.html">ORBITALIS-RPO</a>';
        var astraLink = list.querySelector('a[href="projects/astrasim-fsw.html"]');
        if (astraLink && astraLink.parentElement) {
          astraLink.parentElement.insertAdjacentElement('afterend', item);
        } else {
          list.appendChild(item);
        }
      }
    });
  }

  installOrbitalisProject();

  var host = document.querySelector('[data-project-filter-host]');
  if (!host) { return; }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-project-key]'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-project-group]'));
  var metadata = {
    ghost: { domain: 'gnc', text: 'ghost x gnc state estimation imm kalman ros2 raspberry pi tracking dropout reacquisition hardware' },
    astra: { domain: 'software', text: 'astra os flight software cpp c++ fdir verification telemetry spacecraft command protocol monte carlo assurance' },
    orbitalis: { domain: 'gnc', text: 'orbitalis rpo spacecraft rendezvous proximity operations relative navigation gnc six dof 6-dof autonomy cpp c++20 monte carlo keep out retreat inspection' },
    rocket: { domain: 'gnc', text: 'rocket landing gnc point mass simulation controls exploratory prototype evidence pending' },
    aeroframe: { domain: 'structures', text: 'aeroframe dt structures stress fea finite element fatigue damage tolerance allowables margins' },
    interceptor: { domain: 'autonomy', text: 'interception robot autonomy embedded perception actuation latency robotics controls' },
    spirit: { domain: 'systems', text: 'tamu spirit systems engineering iss spacecraft requirements thermal reviews change control' },
    f16: { domain: 'gnc', text: 'f16 inspired flight controls sil dynamics autopilot uncertainty monte carlo python' },
    chaser: { domain: 'gnc', text: 'project chaser relative navigation pose estimation ukf fdir replay pre hardware spacecraft' }
  };

  host.innerHTML = '' +
    '<div class="project-filter" aria-label="Project filters">' +
      '<label class="project-filter__search"><span class="sr-only">Search projects</span>' +
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg>' +
        '<input type="search" placeholder="Search projects, methods, evidence…" autocomplete="off" data-project-search>' +
      '</label>' +
      '<div class="project-filter__domains" role="toolbar" aria-label="Filter projects by domain">' +
        '<button type="button" data-domain="all" aria-pressed="true">All</button>' +
        '<button type="button" data-domain="gnc" aria-pressed="false">GNC</button>' +
        '<button type="button" data-domain="software" aria-pressed="false">Flight software</button>' +
        '<button type="button" data-domain="structures" aria-pressed="false">Structures</button>' +
        '<button type="button" data-domain="systems" aria-pressed="false">Systems</button>' +
        '<button type="button" data-domain="autonomy" aria-pressed="false">Autonomy</button>' +
      '</div>' +
      '<div class="project-filter__status" aria-live="polite" data-project-status></div>' +
    '</div>';

  var input = host.querySelector('[data-project-search]');
  var buttons = Array.prototype.slice.call(host.querySelectorAll('[data-domain]'));
  var status = host.querySelector('[data-project-status]');
  var params = new URLSearchParams(window.location.search);
  var state = {
    q: params.get('q') || '',
    domain: params.get('domain') || 'all'
  };

  if (!buttons.some(function (button) { return button.dataset.domain === state.domain; })) {
    state.domain = 'all';
  }
  input.value = state.q;

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9+#.-]+/g, ' ').trim();
  }

  function keysInDocument() {
    var found = {};
    cards.forEach(function (card) { found[card.dataset.projectKey] = true; });
    return Object.keys(found);
  }

  function matches(key) {
    var item = metadata[key] || { domain: 'other', text: key };
    var query = normalize(state.q);
    var domainMatch = state.domain === 'all' || item.domain === state.domain;
    var textMatch = !query || normalize(item.text + ' ' + key).includes(query);
    return domainMatch && textMatch;
  }

  function syncUrl() {
    var next = new URL(window.location.href);
    if (state.q) { next.searchParams.set('q', state.q); }
    else { next.searchParams.delete('q'); }
    if (state.domain !== 'all') { next.searchParams.set('domain', state.domain); }
    else { next.searchParams.delete('domain'); }
    history.replaceState(null, '', next);
  }

  function updateGroups() {
    groups.forEach(function (group) {
      var items = Array.prototype.slice.call(group.querySelectorAll('[data-project-key]'));
      if (!items.length) { return; }
      var visible = items.some(function (item) { return !item.hidden; });
      group.hidden = !visible;
    });
  }

  function render() {
    var uniqueVisible = {};
    cards.forEach(function (card) {
      var visible = matches(card.dataset.projectKey);
      card.hidden = !visible;
      if (visible) { uniqueVisible[card.dataset.projectKey] = true; }
    });

    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.domain === state.domain ? 'true' : 'false');
    });
    updateGroups();
    syncUrl();

    var count = Object.keys(uniqueVisible).length;
    var total = keysInDocument().length;
    status.textContent = count === total ? total + ' projects' : count + ' of ' + total + ' projects';
  }

  function transitionRender() {
    if (!reduceMotion && document.startViewTransition) {
      document.startViewTransition(render);
    } else {
      render();
    }
  }

  input.addEventListener('input', function () {
    state.q = input.value.trim();
    transitionRender();
  });

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      state.domain = button.dataset.domain;
      transitionRender();
    });
  });

  render();
})();
