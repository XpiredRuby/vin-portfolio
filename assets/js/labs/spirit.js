/* TAMU-SPIRIT — LEO thermal cycling trade and review-gate traceability.

   Two things a systems engineer actually does on this programme: pick a
   material pair that survives the environment, and know which requirements
   are closed at which gate. Both are shown at the public level the case
   study permits; no internal programme data is reproduced here. */
(function () {
  'use strict';

  /* Screening-level properties: CTE (µm/m/K), modulus (GPa), allowable (MPa). */
  var MAT = {
    al6061:  { name: 'Al 6061-T6',     a: 23.6, E: 68.9,  Fty: 276 },
    al7075:  { name: 'Al 7075-T73',    a: 23.4, E: 71.7,  Fty: 435 },
    ti64:    { name: 'Ti-6Al-4V',      a: 8.6,  E: 113.8, Fty: 828 },
    ss304:   { name: 'SS 304',         a: 17.3, E: 193.0, Fty: 215 },
    invar:   { name: 'Invar 36',       a: 1.3,  E: 141.0, Fty: 276 },
    cfrp:    { name: 'CFRP quasi-iso', a: 2.0,  E: 70.0,  Fty: 480 },
    peek:    { name: 'PEEK (isolator)', a: 47.0, E: 3.6,  Fty: 100 }
  };

  /* Requirement themes are the portfolio-safe categories from the case study. */
  var REQS = [
    { id: 'SP-001', text: 'Survive LEO thermal cycling', gate: 'PDR', method: 'Analysis + test', driver: '-120 to +120 C' },
    { id: 'SP-002', text: 'Meet launch structural / interface requirements', gate: 'SRR', method: 'Analysis + interface review', driver: 'Dragon manifest' },
    { id: 'SP-003', text: 'All requirements traceable to a verification method', gate: 'SCR', method: 'Traceability audit', driver: 'NASA review standard' },
    { id: 'SP-004', text: 'Changes assessed and dispositioned since last gate', gate: 'SRR', method: 'ECR log review', driver: 'Configuration control' },
    { id: 'SP-005', text: 'Payload interfaces defined and controlled', gate: 'PDR', method: 'ICD review', driver: 'Integration' },
    { id: 'SP-006', text: 'Safety data package submitted for review', gate: 'PDR', method: 'Safety review', driver: 'Crew safety' },
    { id: 'SP-007', text: 'Concept of operations agreed across experiments', gate: 'SCR', method: 'Review board', driver: '4 experiments' },
    { id: 'SP-008', text: 'Verification plan defined for each requirement', gate: 'SRR', method: 'V&V plan review', driver: 'NASA review standard' }
  ];
  var GATE_ORDER = { SCR: 1, SRR: 2, PDR: 3 };

  /* Constrained bimaterial joint: both parts share a joint, so differential
     expansion is reacted through the softer load path. */
  function thermal(s, T) {
    var A = MAT[s.matA], B = MAT[s.matB];
    var dT = T - s.tRef;
    var dAlpha = (A.a - B.a) * 1e-6;
    var Eeff = 1 / (1 / A.E + 1 / B.E) * 1e3;      /* MPa */
    var stress = Math.abs(dAlpha * dT) * Eeff * s.constraint;
    var allow = Math.min(A.Fty, B.Fty) / s.fos;
    return { stress: stress, allow: allow, ms: allow / Math.max(stress, 1e-6) - 1 };
  }

  window.VNLab.register('spirit', {
    title: 'Trade the thermal pair, then check the gate',
    note: 'Screening-level differential-expansion arithmetic over the declared -120 to +120 C cycling ' +
          'environment, plus the public-level requirement themes from the table above. Internal programme ' +
          'requirement matrices, ECR logs, thermal models and review packages are proprietary and are not ' +
          'reproduced here; this shows the method, not the programme data.',
    controls: [
      { type: 'heading', label: 'Joint materials' },
      { type: 'select', id: 'matA', label: 'Structure', value: 'al6061', options: Object.keys(MAT).map(function (k) {
        return { v: k, t: MAT[k].name };
      }) },
      { type: 'select', id: 'matB', label: 'Payload interface', value: 'ti64', options: Object.keys(MAT).map(function (k) {
        return { v: k, t: MAT[k].name };
      }) },
      { type: 'heading', label: 'Environment' },
      { type: 'range', id: 'tCold', label: 'Cold soak', min: -160, max: -20, step: 5, value: -120, unit: '°C', decimals: 0 },
      { type: 'range', id: 'tHot', label: 'Hot soak', min: 40, max: 160, step: 5, value: 120, unit: '°C', decimals: 0 },
      { type: 'range', id: 'tRef', label: 'Assembly temperature', min: 0, max: 40, step: 1, value: 22, unit: '°C', decimals: 0 },
      { type: 'heading', label: 'Joint and criteria' },
      { type: 'range', id: 'constraint', label: 'Constraint factor', min: 0.1, max: 1, step: 0.05, value: 0.6, decimals: 2 },
      { type: 'range', id: 'fos', label: 'Factor of safety', min: 1, max: 2.5, step: 0.05, value: 1.5, decimals: 2 },
      { type: 'heading', label: 'Review gate' },
      { type: 'preset', id: 'gate', value: 'PDR', options: [
        { v: 'SCR', t: 'SCR' }, { v: 'SRR', t: 'SRR' }, { v: 'PDR', t: 'PDR' }
      ] }
    ],
    kpis: [
      { id: 'dalpha', label: 'CTE mismatch' },
      { id: 'worst', label: 'Worst-case stress' },
      { id: 'ms', label: 'Margin of safety' },
      { id: 'closed', label: 'Requirements closed' }
    ],
    plots: [
      { id: 'therm', height: 235, caption: 'Thermal stress across the cycling band',
        pad: { l: 58, r: 16, t: 14, b: 34 }, legend: [
        { label: 'Induced stress', color: 'var(--accent)' },
        { label: 'Allowable / FoS', color: 'var(--danger)', dash: true },
        { label: 'Assembly temp', color: 'var(--ok)', dash: true }
      ] }
    ],
    extra: function (api, stage) {
      var el = api.el;
      api.extras.table = el('table', { class: 'lab-table' });
      stage.appendChild(el('div', { class: 'lab__plot' }, [
        api.extras.table,
        el('div', { class: 'lab__plot-cap' }, [el('span', { text: 'Requirement themes by review gate' })])
      ]));
    },
    actions: [
      { label: 'Baseline pair', primary: true, run: function (api) {
        [['matA', 'al6061'], ['matB', 'ti64'], ['tCold', -120], ['tHot', 120],
         ['tRef', 22], ['constraint', 0.6], ['fos', 1.5]].forEach(function (kv) { api.set(kv[0], kv[1]); });
        api.render();
      } }
    ],
    render: function (api) {
      var s = api.state, P = api.palette, el = api.el;
      var A = MAT[s.matA], B = MAT[s.matB];

      var pts = [], maxS = 0;
      for (var T = s.tCold; T <= s.tHot; T += 2) {
        var r = thermal(s, T);
        pts.push([T, r.stress]);
        maxS = Math.max(maxS, r.stress);
      }
      var allow = thermal(s, s.tRef).allow;
      var worst = Math.max(thermal(s, s.tCold).stress, thermal(s, s.tHot).stress);
      var ms = allow / Math.max(worst, 1e-6) - 1;

      var g = api.plot('therm');
      g.setRange(s.tCold, s.tHot, 0, Math.max(maxS, allow) * 1.18).clear();
      g.frame({ xLabel: 'temperature (°C)', yLabel: 'stress (MPa)', xTicks: 6, yTicks: 4, xDec: 0, yDec: 0 });
      g.hline(allow, { color: P.danger, label: 'ALLOWABLE / FoS' });
      g.vline(s.tRef, { color: P.ok, label: 'ASSEMBLY' });
      g.line(pts, { color: P.accent, width: 2 });
      g.dot(s.tCold, thermal(s, s.tCold).stress, { color: P.accent, r: 3.5, ring: true });
      g.dot(s.tHot, thermal(s, s.tHot).stress, { color: P.accent, r: 3.5, ring: true });

      var closed = REQS.filter(function (q) { return GATE_ORDER[q.gate] <= GATE_ORDER[s.gate]; });
      api.extras.table.innerHTML = '';
      api.extras.table.appendChild(el('thead', {}, [el('tr', {}, [
        el('th', { text: 'ID' }), el('th', { text: 'Requirement theme' }),
        el('th', { text: 'Verification' }), el('th', { text: 'Gate' })
      ])]));
      var tb = el('tbody');
      REQS.forEach(function (q) {
        var due = GATE_ORDER[q.gate] <= GATE_ORDER[s.gate];
        tb.appendChild(el('tr', { 'data-hit': String(due) }, [
          el('td', { text: q.id }),
          el('td', { text: q.text }),
          el('td', { text: q.method }),
          el('td', { text: q.gate, style: 'color:' + (due ? 'var(--ok)' : 'var(--txt-3)') })
        ]));
      });
      api.extras.table.appendChild(tb);

      api.kpi('dalpha', Math.abs(A.a - B.a).toFixed(1) + ' µm/m/K',
        Math.abs(A.a - B.a) < 6 ? 'ok' : (Math.abs(A.a - B.a) < 16 ? 'warn' : 'bad'));
      api.kpi('worst', Math.round(worst) + ' MPa');
      api.kpi('ms', (ms >= 0 ? '+' : '') + ms.toFixed(2), ms < 0 ? 'bad' : (ms < 0.2 ? 'warn' : 'ok'));
      api.kpi('closed', closed.length + ' / ' + REQS.length + ' by ' + s.gate,
        closed.length === REQS.length ? 'ok' : 'warn');
    }
  });
})();
