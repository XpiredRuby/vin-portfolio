/* Project search/filter for projects.html. */
(function () {
  'use strict';

  var duplicateNote = document.querySelector('.project-register-note');
  if (duplicateNote) { duplicateNote.remove(); }

  if (!document.getElementById('project-index-polish')) {
    var style = document.createElement('style');
    style.id = 'project-index-polish';
    style.textContent = '' +
      '.page-projects .project-catalog .case{transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}' +
      '.page-projects .project-catalog .case:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(15,23,42,.09)}' +
      '.page-projects .table-wrap.panel .reqs tbody tr{transition:background-color .18s ease}' +
      '.page-projects .table-wrap.panel .reqs tbody tr:hover{background:rgba(255,255,255,.055)}' +
      '.page-projects .table-wrap.panel .reqs a{color:#9bd7ff!important;text-decoration-color:rgba(155,215,255,.35)}' +
      '.page-projects .table-wrap.panel .reqs a:hover{color:#d8efff!important;text-decoration-color:#d8efff}' +
      '.page-projects .project-filter{margin:0 0 1.5rem}' +
      '.page-projects .project-filter__search input{transition:border-color .18s ease,box-shadow .18s ease}' +
      '.page-projects .project-filter__search input:focus{border-color:#6cbcf0;box-shadow:0 0 0 3px rgba(108,188,240,.15)}' +
      '@media(prefers-reduced-motion:reduce){.page-projects .project-catalog .case{transition:none}.page-projects .project-catalog .case:hover{transform:none}}';
    document.head.appendChild(style);
  }

  var host = document.querySelector('[data-project-filter-host]');
  var catalog = document.querySelector('.project-catalog');
  if (!host || !catalog) { return; }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = Array.prototype.slice.call(catalog.querySelectorAll('[data-project-key]'));
  var metadata = {
    orbitalis: { domain: 'gnc', text: 'orbitalis rpo spacecraft rendezvous proximity operations relative navigation gnc six dof autonomy c++20 monte carlo keep out retreat inspection' },
    ghost: { domain: 'gnc', text: 'ghost x gnc state estimation imm kalman ros2 raspberry pi tracking dropout reacquisition hardware' },
    astra: { domain: 'software', text: 'astra os flight software cpp c++ fdir verification telemetry spacecraft command protocol monte carlo assurance' },
    aeroframe: { domain: 'structures', text: 'aeroframe dt structures cad stress fea finite element fatigue damage tolerance mmpds allowables margins pylon attachment' },
    spirit: { domain: 'systems', text: 'tamu spirit systems engineering iss spacecraft requirements thermal reviews change control' },
    f16: { domain: 'gnc', text: 'fixed wing f16 flight controls sil dynamics autopilot uncertainty monte carlo matlab simulink' },
    md11cad: { domain: 'structures', text: 'md11 md 11 aircraft cad solidworks assembly drawing bom parametric mechanical design earliest project' },
    interceptor: { domain: 'autonomy', text: 'interception robot autonomy embedded perception actuation latency robotics controls' },
    rocket: { domain: 'gnc', text: 'rocket landing gnc simulation controls exploratory prototype tvc' }
  };

  host.innerHTML = '<div class="project-filter" aria-label="Project filters"><label class="project-filter__search"><span class="sr-only">Search projects</span><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg><input type="search" placeholder="Search projects, methods, evidence…" autocomplete="off" data-project-search></label><div class="project-filter__domains" role="toolbar" aria-label="Filter projects by domain"><button type="button" data-domain="all" aria-pressed="true">All</button><button type="button" data-domain="gnc" aria-pressed="false">GNC</button><button type="button" data-domain="software" aria-pressed="false">Flight software</button><button type="button" data-domain="structures" aria-pressed="false">Structures + CAD</button><button type="button" data-domain="systems" aria-pressed="false">Systems</button><button type="button" data-domain="autonomy" aria-pressed="false">Autonomy</button></div><div class="project-filter__status" aria-live="polite" data-project-status></div></div>';

  var input = host.querySelector('[data-project-search]');
  var buttons = Array.prototype.slice.call(host.querySelectorAll('[data-domain]'));
  var status = host.querySelector('[data-project-status]');
  var params = new URLSearchParams(window.location.search);
  var state = { q: params.get('q') || '', domain: params.get('domain') || 'all' };

  if (!buttons.some(function (button) { return button.dataset.domain === state.domain; })) {
    state.domain = 'all';
  }
  input.value = state.q;

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9+#.-]+/g, ' ').trim();
  }

  function matches(key) {
    var item = metadata[key] || { domain: 'other', text: key };
    var query = normalize(state.q);
    return (state.domain === 'all' || item.domain === state.domain) &&
      (!query || normalize(item.text + ' ' + key).includes(query));
  }

  function syncUrl() {
    var next = new URL(window.location.href);
    if (state.q) { next.searchParams.set('q', state.q); }
    else { next.searchParams.delete('q'); }
    if (state.domain !== 'all') { next.searchParams.set('domain', state.domain); }
    else { next.searchParams.delete('domain'); }
    history.replaceState(null, '', next);
  }

  function render() {
    var count = 0;
    cards.forEach(function (card) {
      var visible = matches(card.dataset.projectKey);
      card.hidden = !visible;
      if (visible) { count += 1; }
    });
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.domain === state.domain ? 'true' : 'false');
    });
    status.textContent = count === cards.length ? cards.length + ' projects' : count + ' of ' + cards.length + ' projects';
    syncUrl();
  }

  function transitionRender() {
    if (!reduceMotion && document.startViewTransition) { document.startViewTransition(render); }
    else { render(); }
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
