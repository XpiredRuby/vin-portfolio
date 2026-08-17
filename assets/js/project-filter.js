/* Shareable, URL-synced project search/filter for projects.html.
   No-JS fallback: every project remains visible. */
(function () {
  'use strict';

  var host = document.querySelector('[data-project-filter-host]');
  if (!host) { return; }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-project-key]'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-project-group]'));
  var metadata = {
    ghost: { domain: 'gnc', text: 'ghost x gnc state estimation imm kalman ros2 raspberry pi tracking dropout reacquisition hardware' },
    astra: { domain: 'software', text: 'astra os flight software cpp c++ fdir verification telemetry spacecraft command protocol monte carlo assurance' },
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
