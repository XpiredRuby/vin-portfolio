/* AeroFrame-DT — pylon attachment lug, edge-distance trade.

   Melcon-Hoblit style screening: an axially loaded lug is checked against
   shear-bearing (tear-out folded into the bearing efficiency), net-section
   tension, and transverse behaviour at the bore. Sweeping e/D makes the
   failure-mode crossover visible instead of inferring it from one contour. */
(function () {
  'use strict';

  /* Representative MMPDS-class A-basis ultimate tensile allowables (MPa). */
  var MAT = {
    '7050': { name: '7050-T7451', Ftu: 510 },
    '7075': { name: '7075-T7351', Ftu: 462 },
    'ti':   { name: 'Ti-6Al-4V',  Ftu: 897 }
  };

  /* Shear-bearing efficiency: rises steeply with edge distance, then plateaus.
     This is why "e/D at least 1.5" is a design rule rather than a preference. */
  function Kbr(r) { return Math.min(1.45, 0.95 * Math.pow(Math.max(r - 0.5, 0), 0.75)); }
  /* Transverse efficiency at the bore: set by material available outboard. */
  function Ktr(W, D) { return Math.min(1.10, 0.90 * Math.pow(Math.max((W - D) / D, 0.01), 0.55)); }
  var KNT = 1.0;

  function allowables(s, r) {
    var Ftu = MAT[s.material].Ftu;
    var D = s.tol ? s.D + 0.15 : s.D;
    var t = s.tol ? s.t * 0.98 : s.t;
    var W = s.tol ? s.W - 0.2 : s.W;
    var Abr = D * t;
    var Anet = t * Math.max(W - D, 0.1);
    return {
      shearbearing: Kbr(r) * Abr * Ftu,
      netsection: KNT * Anet * Ftu,
      transverse: Ktr(W, D) * Abr * Ftu,
      Abr: Abr, Anet: Anet, D: D, t: t, W: W
    };
  }

  var MODES = [
    { k: 'shearbearing', label: 'Shear-bearing' },
    { k: 'netsection', label: 'Net section' },
    { k: 'transverse', label: 'Transverse' }
  ];

  function margins(s, r) {
    var a = allowables(s, r);
    var P = s.load * 1000;
    var out = { _a: a };
    MODES.forEach(function (m) { out[m.k] = a[m.k] / P - 1; });
    return out;
  }

  function governing(ms) {
    var best = MODES[0], bv = ms[MODES[0].k];
    MODES.forEach(function (m) { if (ms[m.k] < bv) { bv = ms[m.k]; best = m; } });
    return { k: best.k, label: best.label, v: bv };
  }

  function crossover(s, r0, r1) {
    var prev = governing(margins(s, r0)).k;
    for (var r = r0; r <= r1; r += 0.005) {
      var k = governing(margins(s, r)).k;
      if (k !== prev) { return { r: r, from: prev, to: k }; }
    }
    return null;
  }

  var RELEASED = { r: 1.6, D: 60, t: 23.7, W: 113, load: 529.7, material: '7050', tol: false };

  window.VNLab.register('aeroframe', {
    title: 'Sweep edge distance, watch the governing mode change',
    note: 'Screening lug equations with representative MMPDS-class A-basis allowables, swept in your browser. ' +
          'The defaults reproduce the released configuration: transverse behaviour at the bore governs at ' +
          '+0.151, and the governing mode changes near e/D 1.35. The released study reached those numbers ' +
          'through controlled geometry, a synthetic load basis and nonlinear contact FEA — this model shows ' +
          'the trade logic, not the finite-element result, and hand screening is exactly what disagrees with ' +
          'FEA in the open plastic-strain item above.',
    controls: [
      { type: 'heading', label: 'Geometry' },
      { type: 'range', id: 'r', label: 'Edge distance e/D', min: 0.9, max: 2.4, step: 0.01, value: 1.6, decimals: 2 },
      { type: 'range', id: 'D', label: 'Pin diameter D', min: 40, max: 85, step: 0.5, value: 60, unit: 'mm', decimals: 1 },
      { type: 'range', id: 't', label: 'Lug thickness t', min: 14, max: 34, step: 0.1, value: 23.7, unit: 'mm', decimals: 1 },
      { type: 'range', id: 'W', label: 'Lug width W', min: 80, max: 160, step: 1, value: 113, unit: 'mm', decimals: 0 },
      { type: 'heading', label: 'Load and material' },
      { type: 'range', id: 'load', label: 'Limit load P', min: 200, max: 800, step: 0.1, value: 529.7, unit: 'kN', decimals: 1 },
      { type: 'select', id: 'material', label: 'Material', value: '7050', options: [
        { v: '7050', t: '7050-T7451 (released)' },
        { v: '7075', t: '7075-T7351' },
        { v: 'ti', t: 'Ti-6Al-4V' }
      ] },
      { type: 'heading', label: 'Manufacturing' },
      { type: 'switch', id: 'tol', label: 'Worst tolerance stack', value: false }
    ],
    kpis: [
      { id: 'mode', label: 'Governing mode' },
      { id: 'ms', label: 'Governing margin' },
      { id: 'cross', label: 'Mode crossover e/D' },
      { id: 'bearing', label: 'Bearing stress' }
    ],
    plots: [
      { id: 'sweep', height: 300, caption: 'Margin of safety vs edge distance',
        pad: { l: 58, r: 16, t: 14, b: 34 }, legend: [
        { label: 'Shear-bearing', color: 'var(--controls)' },
        { label: 'Net section', color: 'var(--systems)' },
        { label: 'Transverse', color: 'var(--mechanical)' },
        { label: 'MS = 0', color: 'var(--danger)', dash: true }
      ] }
    ],
    actions: [
      { label: 'Released configuration', primary: true, run: function (api) {
        Object.keys(RELEASED).forEach(function (k) { api.set(k, RELEASED[k]); });
        api.render();
      } }
    ],
    render: function (api) {
      var s = api.state, P = api.palette;
      var r0 = 0.9, r1 = 2.4;
      var series = { shearbearing: [], netsection: [], transverse: [] };
      var gov = [];
      var lo = 1e9, hi = -1e9;

      for (var r = r0; r <= r1 + 1e-9; r += 0.01) {
        var m = margins(s, r);
        MODES.forEach(function (mode) {
          series[mode.k].push([r, m[mode.k]]);
          if (isFinite(m[mode.k])) { lo = Math.min(lo, m[mode.k]); hi = Math.max(hi, m[mode.k]); }
        });
        gov.push([r, governing(m).v]);
      }
      lo = Math.max(lo, -0.8);
      hi = Math.min(hi, 3);
      var yMin = Math.min(lo - 0.08, -0.25);

      var g = api.plot('sweep');
      g.setRange(r0, r1, yMin, hi + 0.12).clear();
      g.frame({ xLabel: 'edge distance ratio e / D', yLabel: 'margin of safety',
                xTicks: 6, yTicks: 5, xDec: 1, yDec: 2 });

      /* the lower envelope is what actually sizes the fitting */
      g.band(gov.map(function (p) { return [p[0], p[1], yMin]; }), { color: P.ink3, alpha: 0.10 });
      g.hline(0, { color: P.danger, label: 'MS = 0' });
      g.line(series.shearbearing, { color: api.css('--controls', '#6bb7f5'), width: 2 });
      g.line(series.netsection, { color: P.systems, width: 2 });
      g.line(series.transverse, { color: P.mech, width: 2 });

      var x = crossover(s, r0, r1);
      if (x) { g.vline(x.r, { color: P.ink2, label: 'CROSSOVER ' + x.r.toFixed(2) }); }

      var now = margins(s, s.r);
      var win = governing(now);
      g.vline(s.r, { color: P.ok, dash: false, width: 1, label: '' });
      g.dot(s.r, win.v, { color: P.ok, r: 4.5, ring: true });

      var tone = win.v < 0 ? 'bad' : (win.v < 0.1 ? 'warn' : 'ok');
      api.kpi('mode', win.label, tone);
      api.kpi('ms', (win.v >= 0 ? '+' : '') + win.v.toFixed(3), tone);
      api.kpi('cross', x ? x.r.toFixed(2) : 'none in range');
      api.kpi('bearing', Math.round(s.load * 1000 / now._a.Abr) + ' MPa');
    }
  });
})();
