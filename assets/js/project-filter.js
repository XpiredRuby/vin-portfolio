/* Projects index cleanup + search/filter.
   Keeps the legacy static page usable while presenting one clean entry per project. */
(function () {
  'use strict';

  function addPagePolish() {
    if (document.getElementById('project-index-polish')) { return; }
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

  function projectCardKey(article) {
    var map = {
      ghost: 'ghost',
      astrasim: 'astra',
      gnc: 'rocket',
      'aeroframe-dt': 'aeroframe',
      interceptor: 'interceptor',
      spirit: 'spirit',
      f16: 'f16',
      orbitalis: 'orbitalis',
      'md11-cad': 'md11cad'
    };
    return map[article.id] || article.id || 'project';
  }

  function removeDuplicateAeroFrame(register, catalog) {
    if (register) {
      Array.prototype.slice.call(register.querySelectorAll('tr')).forEach(function (row) {
        var legacy = row.querySelector('a[href="projects/md11-structures.html"]');
        var idCell = row.querySelector('td');
        if (legacy || (idCell && idCell.textContent.trim() === 'PRJ-04')) {
          row.remove();
        }
      });
    }
    var duplicateCard = document.getElementById('md11');
    if (duplicateCard && duplicateCard.parentNode === catalog) { duplicateCard.remove(); }
  }

  function updateAeroFrame(register) {
    if (register) {
      var link = register.querySelector('a[href="projects/aeroframe-dt.html"]');
      if (link) {
        var row = link.closest('tr');
        var cells = row ? row.querySelectorAll('td') : [];
        if (cells.length >= 5) {
          cells[0].textContent = 'PRJ-08';
          link.textContent = 'AeroFrame-DT';
          cells[2].textContent = 'Structures / CAD / FEA';
          cells[3].textContent = '18/18 requirements; +0.151 governing margin; 5-variant attachment trade';
          cells[4].innerHTML = '<span class="pill pill--done">Verified structural record</span>';
        }
      }
    }

    var card = document.getElementById('aeroframe-dt');
    if (!card) { return; }
    card.setAttribute('data-project-key', 'aeroframe');
    var status = card.querySelector('.case__body > div:first-child');
    if (status) { status.innerHTML = '<span class="pill pill--done">18 / 18 requirements verified</span><span class="case__sub">2026</span>'; }
    var title = card.querySelector('.case__title');
    if (title) { title.innerHTML = '<a href="projects/aeroframe-dt.html">AeroFrame-DT: Structural Substantiation &amp; Pylon Attachment Trade Study</a>'; }
    var sub = card.querySelector('.case__sub');
    if (sub && sub.parentElement === card.querySelector('.case__body')) {
      sub.innerHTML = 'Parametric CAD &middot; hand calculations &middot; nonlinear FEA &middot; allowables &middot; fatigue / damage tolerance';
    }
    var blocks = card.querySelectorAll('.case__block');
    if (blocks[0]) { blocks[0].innerHTML = '<h4>Engineering challenge</h4><p>Carry a synthetic pylon-to-wingbox attachment fitting from controlled geometry and load definition through hand analysis, nonlinear FEA, material allowables, fatigue and damage tolerance, while keeping the full evidence chain reviewable.</p>'; }
    if (blocks[1]) { blocks[1].innerHTML = '<h4>Released result</h4><p>The final 7050-T7451 configuration closed 18 / 18 requirements with a +0.151 governing nominal margin. FE force equilibrium closed to 0.006%, and a five-variant e/D trade documented the failure-mode transition and unresolved model limits.</p>'; }
    var metrics = card.querySelector('.metrics');
    if (metrics) { metrics.innerHTML = '<div class="metric metric--green"><div class="metric__v">+0.151</div><div class="metric__k">Governing margin</div></div><div class="metric metric--green"><div class="metric__v">18 / 18</div><div class="metric__k">Requirements</div></div><div class="metric"><div class="metric__v">0.006%</div><div class="metric__k">FE equilibrium</div></div><div class="metric"><div class="metric__v">5</div><div class="metric__k">e/D variants</div></div>'; }
    var chips = card.querySelector('.chips');
    if (chips) { chips.innerHTML = '<span class="chip chip--accent">ANSYS Mechanical</span><span class="chip chip--accent">Python</span><span class="chip">Parametric CAD</span><span class="chip">MMPDS allowables</span><span class="chip">Fatigue / DT</span><span class="chip">Verification</span>'; }
    var buttons = card.querySelector('.btn-row');
    if (buttons) { buttons.innerHTML = '<a class="btn btn--sm btn--primary" href="projects/aeroframe-dt.html">Inspect full evidence record</a><a class="btn btn--sm" href="https://github.com/XpiredRuby/aeroframe-dt" target="_blank" rel="noopener noreferrer">Source repository</a>'; }
  }

  function ensureOrbitalis(register, catalog) {
    if (register && !register.querySelector('a[href="projects/orbitalis-rpo.html"]')) {
      var row = document.createElement('tr');
      row.innerHTML = '<td>PRJ-10</td><td><a class="u-cyan" href="projects/orbitalis-rpo.html">ORBITALIS-RPO</a></td><td>Spacecraft GNC / RPO</td><td>200-run frozen SIL campaign; 0 truth-level keep-out violations</td><td><span class="pill pill--done">Verified SIL</span></td>';
      register.insertBefore(row, register.firstChild);
    }
    if (document.getElementById('orbitalis')) { return; }
    var article = document.createElement('article');
    article.className = 'case is-in';
    article.id = 'orbitalis';
    article.setAttribute('data-project-key', 'orbitalis');
    article.innerHTML = '' +
      '<div class="case__visual case__visual--evidence"><span class="case__id">PRJ-10</span><img src="assets/evidence/orbitalis/architecture.svg" width="1600" height="900" loading="lazy" alt="ORBITALIS-RPO spacecraft rendezvous, relative navigation, guidance, autonomy and verification architecture."></div>' +
      '<div class="case__body"><div style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between"><span class="pill pill--done">Verified SIL baseline</span><span class="case__sub">2026</span></div>' +
      '<h2 class="case__title"><a href="projects/orbitalis-rpo.html">ORBITALIS-RPO: Spacecraft Rendezvous &amp; Proximity Operations</a></h2><p class="case__sub">Relative navigation &middot; constrained guidance &middot; 6-DOF &middot; autonomy &middot; C++20 verification</p>' +
      '<div class="case__block"><h4>What it does</h4><p>A software-in-the-loop spacecraft inspection and RPO stack spanning orbital and relative dynamics, asynchronous navigation, constrained guidance, quaternion 6-DOF propagation, autonomy, retreat logic, and resource closure.</p></div>' +
      '<div class="case__block"><h4>Evidence</h4><p>The frozen 200-case campaign retained 132 full missions, 62 safe abort-retreats, six timeouts, and zero truth-level keep-out violations. The C++20 core passed 96 / 96 frozen Python-reference vectors.</p></div>' +
      '<div class="metrics"><div class="metric metric--green"><div class="metric__v">200</div><div class="metric__k">Frozen SIL cases</div></div><div class="metric metric--green"><div class="metric__v">132</div><div class="metric__k">Full missions</div></div><div class="metric metric--green"><div class="metric__v">0</div><div class="metric__k">Keep-out violations</div></div><div class="metric"><div class="metric__v">96 / 96</div><div class="metric__k">C++ vectors</div></div></div>' +
      '<div class="chips"><span class="chip chip--accent">Python</span><span class="chip chip--accent">C++20</span><span class="chip">Relative Navigation</span><span class="chip">RPO</span><span class="chip">6-DOF</span><span class="chip">Monte Carlo</span></div>' +
      '<div class="btn-row"><a class="btn btn--sm btn--primary" href="projects/orbitalis-rpo.html">Try interactive case study</a><a class="btn btn--sm" href="https://github.com/XpiredRuby/orbitalis-rpo" target="_blank" rel="noopener noreferrer">Source repository</a></div></div>';
    catalog.appendChild(article);
  }

  function ensureMd11(register, catalog) {
    if (register && !register.querySelector('a[href="projects/md11-aircraft-cad.html"]')) {
      var row = document.createElement('tr');
      row.innerHTML = '<td>PRJ-07</td><td><a class="u-cyan" href="projects/md11-aircraft-cad.html">MD-11 Aircraft CAD Assembly</a></td><td>Mechanical design / CAD</td><td>24-part SolidWorks aircraft assembly with drawing + BOM workflow</td><td><span class="pill pill--done">Complete</span></td>';
      var aero = register.querySelector('a[href="projects/aeroframe-dt.html"]');
      if (aero && aero.closest('tr')) { aero.closest('tr').insertAdjacentElement('afterend', row); }
      else { register.appendChild(row); }
    }
    if (document.getElementById('md11-cad')) { return; }
    var article = document.createElement('article');
    article.className = 'case is-in';
    article.id = 'md11-cad';
    article.setAttribute('data-project-key', 'md11cad');
    article.innerHTML = '' +
      '<div class="case__visual case__visual--evidence"><span class="case__id">PRJ-07</span><img src="assets/evidence/md11/assembly-overview.svg" width="1600" height="900" loading="lazy" alt="MD-11 aircraft CAD project overview showing retained SolidWorks assembly, part, drawing and Parasolid artifacts."></div>' +
      '<div class="case__body"><div style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between"><span class="pill pill--done">Earliest portfolio project</span><span class="case__sub">NOV 2024</span></div>' +
      '<h2 class="case__title"><a href="projects/md11-aircraft-cad.html">MD-11 Aircraft CAD Assembly</a></h2><p class="case__sub">SolidWorks &middot; parametric aircraft modeling &middot; assembly design &middot; drawings &middot; BOM</p>' +
      '<div class="case__block"><h4>What I built</h4><p>A 24-part parametric full-aircraft assembly in SolidWorks, carried through native assembly and part files, a drawing package, bill-of-material workflow, and a retained Parasolid geometry export.</p></div>' +
      '<div class="case__block"><h4>Why it stays in the portfolio</h4><p>This is the starting point of my mechanical-design progression: full-aircraft CAD organization first, then later structural substantiation and verification work in AeroFrame-DT.</p></div>' +
      '<div class="metrics"><div class="metric"><div class="metric__v">24</div><div class="metric__k">Assembly parts</div></div><div class="metric metric--green"><div class="metric__v">3</div><div class="metric__k">Native CAD artifacts</div></div><div class="metric"><div class="metric__v">1</div><div class="metric__k">Parasolid export</div></div><div class="metric"><div class="metric__v">2024</div><div class="metric__k">Original project</div></div></div>' +
      '<div class="chips"><span class="chip chip--accent">SolidWorks</span><span class="chip">Parametric CAD</span><span class="chip">Assemblies</span><span class="chip">GD&amp;T / PMI</span><span class="chip">BOM</span><span class="chip">FEA workflow</span></div>' +
      '<div class="btn-row"><a class="btn btn--sm btn--primary" href="projects/md11-aircraft-cad.html">View CAD project</a></div></div>';
    catalog.appendChild(article);
  }

  function ensureF16Card(catalog) {
    if (document.getElementById('f16')) { return; }
    var article = document.createElement('article');
    article.className = 'case is-in';
    article.id = 'f16';
    article.setAttribute('data-project-key', 'f16');
    article.innerHTML = '' +
      '<div class="case__visual"><span class="case__id">PRJ-09</span><div style="min-height:300px;display:grid;place-items:center;padding:2rem;background:linear-gradient(135deg,#0f172a,#1e293b);color:#dbeafe;text-align:center"><div><div class="mono" style="font-size:.8rem;letter-spacing:.12em;color:#93c5fd">FIXED-WING SIL</div><div style="font-family:Space Grotesk,sans-serif;font-size:2rem;margin:.5rem 0">Aircraft Dynamics → Autopilot → Disturbances → Verification</div><div class="mono" style="font-size:.88rem;color:#cbd5e1">longitudinal + lateral-directional · bounded actuators · sensor errors · Monte Carlo</div></div></div></div>' +
      '<div class="case__body"><div style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between"><span class="pill pill--done">Verified software</span><span class="case__sub">2026</span></div>' +
      '<h2 class="case__title"><a href="projects/f16-flight-controls.html">Fixed-Wing Flight Controls SIL</a></h2><p class="case__sub">Coupled aircraft dynamics &middot; autopilot loops &middot; deterministic disturbances &middot; seeded Monte Carlo</p>' +
      '<div class="case__block"><h4>Scope</h4><p>Representative fixed-wing software-in-the-loop model with coupled longitudinal and lateral-directional dynamics, bounded actuators, deterministic sensor errors, gust disturbances, and regression checks.</p></div>' +
      '<div class="case__block"><h4>Evidence boundary</h4><p>The model is an educational fixed-wing controls SIL and does not claim a validated F-16 aerodynamic model.</p></div>' +
      '<div class="metrics"><div class="metric metric--green"><div class="metric__v">50 / 50</div><div class="metric__k">Finite seeded runs</div></div><div class="metric"><div class="metric__v">2</div><div class="metric__k">Coupled axes sets</div></div><div class="metric"><div class="metric__v">SIL</div><div class="metric__k">Verification level</div></div><div class="metric"><div class="metric__v">MC</div><div class="metric__k">Dispersion checks</div></div></div>' +
      '<div class="chips"><span class="chip chip--accent">MATLAB</span><span class="chip chip--accent">Simulink</span><span class="chip">Flight dynamics</span><span class="chip">Autopilot</span><span class="chip">Monte Carlo</span></div>' +
      '<div class="btn-row"><a class="btn btn--sm btn--primary" href="projects/f16-flight-controls.html">Read case study</a></div></div>';
    catalog.appendChild(article);
  }

  function ensureFooterLinks() {
    document.querySelectorAll('.footer h5').forEach(function (heading) {
      if (heading.textContent.trim() !== 'Case studies') { return; }
      var list = heading.parentElement && heading.parentElement.querySelector('ul');
      if (!list) { return; }
      var legacy = list.querySelector('a[href="projects/md11-structures.html"]');
      if (legacy && legacy.parentElement) { legacy.parentElement.remove(); }
      [
        ['projects/orbitalis-rpo.html', 'ORBITALIS-RPO'],
        ['projects/aeroframe-dt.html', 'AeroFrame-DT'],
        ['projects/md11-aircraft-cad.html', 'MD-11 Aircraft CAD']
      ].forEach(function (item) {
        if (!list.querySelector('a[href="' + item[0] + '"]')) {
          var li = document.createElement('li');
          li.innerHTML = '<a href="' + item[0] + '">' + item[1] + '</a>';
          list.appendChild(li);
        }
      });
    });
  }

  function reorderCatalog(catalog) {
    var order = ['orbitalis', 'ghost', 'astrasim', 'aeroframe-dt', 'spirit', 'f16', 'md11-cad', 'interceptor', 'gnc'];
    order.forEach(function (id) {
      var node = document.getElementById(id);
      if (node && node.parentNode === catalog) { catalog.appendChild(node); }
    });
  }

  function installFilterHost(catalog) {
    var host = document.querySelector('[data-project-filter-host]');
    if (host) { return host; }
    var section = catalog.closest('section');
    if (!section || !section.parentNode) { return null; }
    host = document.createElement('section');
    host.className = 'shell section--tight';
    host.style.paddingTop = '0';
    host.setAttribute('data-project-filter-host', '');
    section.parentNode.insertBefore(host, section);
    return host;
  }

  addPagePolish();
  var catalog = document.querySelector('.project-catalog');
  var register = document.querySelector('.table-wrap.panel .reqs tbody');
  if (!catalog) { return; }

  var heroEyebrow = document.querySelector('.page-hero .eyebrow');
  if (heroEyebrow) { heroEyebrow.innerHTML = 'Engineering case studies &middot; 09 entries'; }

  removeDuplicateAeroFrame(register, catalog);
  updateAeroFrame(register);
  ensureOrbitalis(register, catalog);
  ensureMd11(register, catalog);
  ensureF16Card(catalog);
  ensureFooterLinks();

  Array.prototype.slice.call(catalog.querySelectorAll('.case')).forEach(function (article) {
    article.setAttribute('data-project-key', projectCardKey(article));
  });
  reorderCatalog(catalog);

  var host = installFilterHost(catalog);
  if (!host) { return; }

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

  host.innerHTML = '<div class="project-filter" aria-label="Project filters"><label class="project-filter__search"><span class="sr-only">Search projects</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg><input type="search" placeholder="Search projects, methods, evidence…" autocomplete="off" data-project-search></label><div class="project-filter__domains" role="toolbar" aria-label="Filter projects by domain"><button type="button" data-domain="all" aria-pressed="true">All</button><button type="button" data-domain="gnc" aria-pressed="false">GNC</button><button type="button" data-domain="software" aria-pressed="false">Flight software</button><button type="button" data-domain="structures" aria-pressed="false">Structures + CAD</button><button type="button" data-domain="systems" aria-pressed="false">Systems</button><button type="button" data-domain="autonomy" aria-pressed="false">Autonomy</button></div><div class="project-filter__status" aria-live="polite" data-project-status></div></div>';

  var input = host.querySelector('[data-project-search]');
  var buttons = Array.prototype.slice.call(host.querySelectorAll('[data-domain]'));
  var status = host.querySelector('[data-project-status]');
  var params = new URLSearchParams(window.location.search);
  var state = { q: params.get('q') || '', domain: params.get('domain') || 'all' };
  if (!buttons.some(function (button) { return button.dataset.domain === state.domain; })) { state.domain = 'all'; }
  input.value = state.q;

  function normalize(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9+#.-]+/g, ' ').trim(); }
  function matches(key) {
    var item = metadata[key] || { domain: 'other', text: key };
    var query = normalize(state.q);
    return (state.domain === 'all' || item.domain === state.domain) && (!query || normalize(item.text + ' ' + key).includes(query));
  }
  function syncUrl() {
    var next = new URL(window.location.href);
    if (state.q) { next.searchParams.set('q', state.q); } else { next.searchParams.delete('q'); }
    if (state.domain !== 'all') { next.searchParams.set('domain', state.domain); } else { next.searchParams.delete('domain'); }
    history.replaceState(null, '', next);
  }
  function render() {
    var count = 0;
    cards.forEach(function (card) { var visible = matches(card.dataset.projectKey); card.hidden = !visible; if (visible) { count += 1; } });
    buttons.forEach(function (button) { button.setAttribute('aria-pressed', button.dataset.domain === state.domain ? 'true' : 'false'); });
    status.textContent = count === cards.length ? cards.length + ' projects' : count + ' of ' + cards.length + ' projects';
    syncUrl();
  }
  function transitionRender() { if (!reduceMotion && document.startViewTransition) { document.startViewTransition(render); } else { render(); } }
  input.addEventListener('input', function () { state.q = input.value.trim(); transitionRender(); });
  buttons.forEach(function (button) { button.addEventListener('click', function () { state.domain = button.dataset.domain; transitionRender(); }); });
  render();
})();