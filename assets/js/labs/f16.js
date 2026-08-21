/* Fixed-Wing Flight Controls SIL — longitudinal altitude capture.

   Low-order short-period plant, bounded pitch command, first-order elevator
   with deflection and rate limits, seeded gusts and a dispersion campaign.
   The sign-convention switch reproduces the class of defect the project's
   verification pass actually caught. */
(function () {
  'use strict';

  var DT = 0.02, T = 60, N = Math.round(T / DT);
  var V = 180;                 /* trim airspeed, m/s */
  var DEG = Math.PI / 180;
  var DMAX = 25 * DEG, DRATE = 60 * DEG, TAU = 0.05;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    var u = 1 - r(), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  /* One deterministic run. `disp` scales the plant for a dispersion case. */
  function fly(s, disp) {
    disp = disp || { Ma: 1, Mq: 1, Md: 1, La: 1, gust: 1, V: 1, bias: 0 };
    var r = rng(s.seed * 7919 + (disp.id || 0) * 104729);

    var Ma = -9.0 * disp.Ma, Mq = -1.5 * disp.Mq, Md = 12.0 * disp.Md, La = 1.2 * disp.La;
    var Vt = V * disp.V;
    var sign = s.signBug ? -1 : 1;

    var a = 0, q = 0, th = 0, h = 6000, d = 0;
    var hCmd = 6000 + s.step;
    var hist = [], dHist = [];
    var peak = -1e9, finite = true, settle = null;

    for (var k = 0; k <= N; k++) {
      var t = k * DT;

      /* seeded sensor errors on the measured signals only */
      var hMeas = h + disp.bias + gauss(r) * s.noise;
      var qMeas = q + gauss(r) * s.noise * 0.0004;
      var hDot = Vt * (th - a);

      var thCmd = clamp(s.Kh * (hCmd - hMeas) - s.Khd * hDot, -12 * DEG, 12 * DEG);
      var dCmd = clamp(sign * (s.Kth * (thCmd - th) - s.Kq * qMeas), -DMAX, DMAX);

      /* first-order actuator with a rate limit */
      var dDot = clamp((dCmd - d) / TAU, -DRATE, DRATE);
      d += dDot * DT;
      d = clamp(d, -DMAX, DMAX);

      var gust = s.gust * disp.gust * DEG * Math.sin(2 * Math.PI * 0.12 * t);

      var aDot = q - La * (a + gust);
      var qDot = Ma * (a + gust) + Mq * q + Md * d;
      a += aDot * DT;
      q += qDot * DT;
      th += q * DT;
      h += Vt * (th - a) * DT;

      if (!isFinite(h) || Math.abs(h - 6000) > 1e5) { finite = false; break; }

      var err = h - hCmd;
      hist.push([t, err]);
      dHist.push([t, d / DEG]);
      if (h - 6000 > peak) { peak = h - 6000; }
      if (settle === null && t > 5 && Math.abs(err) < 0.02 * Math.abs(s.step)) { settle = t; }
      else if (settle !== null && Math.abs(err) >= 0.02 * Math.abs(s.step)) { settle = null; }
    }

    return {
      hist: hist, dHist: dHist, finite: finite,
      finalError: hist.length ? hist[hist.length - 1][1] : NaN,
      overshoot: s.step > 0 ? Math.max(0, peak - s.step) : 0,
      settle: settle
    };
  }

  function campaign(s) {
    var runs = [], i;
    var r = rng(s.seed * 31 + 17);
    for (i = 0; i < s.mc; i++) {
      runs.push(fly(s, {
        id: i + 1,
        Ma: 1 + (r() - 0.5) * 0.30,
        Mq: 1 + (r() - 0.5) * 0.40,
        Md: 1 + (r() - 0.5) * 0.30,
        La: 1 + (r() - 0.5) * 0.20,
        V: 1 + (r() - 0.5) * 0.16,
        bias: (r() - 0.5) * 26,
        gust: 0.5 + r()
      }));
    }
    return runs;
  }

  function percentile(sorted, p) {
    if (!sorted.length) { return NaN; }
    var i = clamp(Math.round((p / 100) * (sorted.length - 1)), 0, sorted.length - 1);
    return sorted[i];
  }

  window.VNLab.register('f16', {
    title: 'Fly the altitude capture, then disperse it',
    note: 'A low-order longitudinal model with the same loop structure as the repository SIL — bounded pitch ' +
          'command, first-order elevator with deflection and rate limits, seeded gusts, dispersion campaign. ' +
          'The numbers here are this browser model, not the committed seed-42 baseline; the repository values ' +
          '(-31.476 m at 60 s, 50/50 finite) stay in the evidence section. The sign-convention switch ' +
          'reproduces the defect class the verification pass caught.',
    controls: [
      { type: 'heading', label: 'Command' },
      { type: 'range', id: 'step', label: 'Altitude step', min: 100, max: 900, step: 10, value: 500, unit: 'm', decimals: 0 },
      { type: 'heading', label: 'Control gains' },
      { type: 'range', id: 'Kth', label: 'Pitch gain Kθ', min: 0.5, max: 8, step: 0.1, value: 3, decimals: 1 },
      { type: 'range', id: 'Kq', label: 'Pitch damping Kq', min: 0, max: 4, step: 0.05, value: 1.2, decimals: 2 },
      { type: 'range', id: 'Kh', label: 'Altitude gain Kh', min: 0.0002, max: 0.006, step: 0.0001, value: 0.0015, decimals: 4 },
      { type: 'range', id: 'Khd', label: 'Rate feedback', min: 0, max: 0.06, step: 0.002, value: 0.02, decimals: 3 },
      { type: 'heading', label: 'Disturbance' },
      { type: 'range', id: 'gust', label: 'Gust amplitude', min: 0, max: 2, step: 0.05, value: 0.4, unit: '°', decimals: 2 },
      { type: 'range', id: 'noise', label: 'Altimeter σ', min: 0, max: 20, step: 0.5, value: 4, unit: 'm', decimals: 1 },
      { type: 'heading', label: 'Campaign' },
      { type: 'range', id: 'mc', label: 'Monte Carlo runs', min: 0, max: 50, step: 1, value: 50, decimals: 0 },
      { type: 'range', id: 'seed', label: 'Seed', min: 1, max: 99, step: 1, value: 42, decimals: 0 },
      { type: 'heading', label: 'Fault injection' },
      { type: 'switch', id: 'signBug', label: 'Invert elevator sign', value: false }
    ],
    kpis: [
      { id: 'err', label: 'Final altitude error' },
      { id: 'over', label: 'Overshoot' },
      { id: 'finite', label: 'Runs finite' },
      { id: 'band', label: '5–95% band' }
    ],
    plots: [
      { id: 'alt', height: 235, caption: 'Altitude error, 60 s', pad: { l: 56, r: 16, t: 14, b: 32 }, legend: [
        { label: 'Nominal', color: 'var(--accent)' },
        { label: 'Dispersion 5–95%', color: 'var(--accent)', dash: true },
        { label: 'Command', color: 'var(--ok)', dash: true }
      ] },
      { id: 'elev', height: 150, caption: 'Elevator deflection', pad: { l: 56, r: 16, t: 14, b: 32 }, legend: [
        { label: 'δe', color: 'var(--warn)' },
        { label: '±25° limit', color: 'var(--danger)', dash: true }
      ] }
    ],
    actions: [
      { label: 'Verified baseline', primary: true, run: function (api) {
        [['step', 500], ['Kth', 3], ['Kq', 1.2], ['Kh', 0.0015], ['Khd', 0.02],
         ['gust', 0.4], ['noise', 4], ['mc', 50], ['seed', 42], ['signBug', false]]
          .forEach(function (kv) { api.set(kv[0], kv[1]); });
        api.render();
      } }
    ],
    render: function (api) {
      var s = api.state, P = api.palette;
      var nom = fly(s);
      var runs = s.mc > 0 ? campaign(s) : [];

      /* percentile envelope across the campaign, sampled every 0.5 s */
      var band = [];
      if (runs.length) {
        var step = Math.round(0.5 / DT);
        for (var k = 0; k < N; k += step) {
          var col = [];
          runs.forEach(function (rn) { if (rn.hist[k]) { col.push(rn.hist[k][1]); } });
          if (col.length < 2) { continue; }
          col.sort(function (a, b) { return a - b; });
          band.push([k * DT, percentile(col, 95), percentile(col, 5)]);
        }
      }

      var lo = 1e9, hi = -1e9;
      nom.hist.forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
      band.forEach(function (p) { lo = Math.min(lo, p[2]); hi = Math.max(hi, p[1]); });
      if (!isFinite(lo)) { lo = -s.step; hi = s.step; }
      lo = Math.max(lo, -3 * s.step); hi = Math.min(hi, 2 * s.step);
      var pad = Math.max(20, (hi - lo) * 0.1);

      var g = api.plot('alt');
      g.setRange(0, T, lo - pad, hi + pad).clear();
      g.frame({ xLabel: 'time (s)', yLabel: 'h − h_cmd (m)', xTicks: 6, yTicks: 5, xDec: 0, yDec: 0 });
      if (band.length) { g.band(band, { color: P.accent, alpha: 0.16 }); }
      g.hline(0, { color: P.ok, label: 'COMMAND' });
      g.line(nom.hist, { color: P.accent, width: 2 });

      var e = api.plot('elev');
      e.setRange(0, T, -28, 28).clear();
      e.frame({ xLabel: 'time (s)', yLabel: 'δe (deg)', xTicks: 6, yTicks: 4, xDec: 0, yDec: 0 });
      e.hline(25, { color: P.danger }); e.hline(-25, { color: P.danger, label: '±25° LIMIT' });
      e.line(nom.dHist, { color: P.warn, width: 1.8 });

      var finite = runs.filter(function (r) { return r.finite; }).length;
      var finals = runs.filter(function (r) { return r.finite && isFinite(r.finalError); })
        .map(function (r) { return r.finalError; }).sort(function (a, b) { return a - b; });

      var diverged = !nom.finite;
      api.kpi('err', diverged ? 'DIVERGED' : nom.finalError.toFixed(3) + ' m',
        diverged ? 'bad' : (Math.abs(nom.finalError) < 0.06 * s.step ? 'ok' : 'warn'));
      api.kpi('over', diverged ? '—' : nom.overshoot.toFixed(1) + ' m',
        diverged ? 'bad' : (nom.overshoot < 0.12 * s.step ? 'ok' : 'warn'));
      api.kpi('finite', s.mc ? finite + ' / ' + s.mc : 'campaign off',
        s.mc ? (finite === s.mc ? 'ok' : 'bad') : null);
      api.kpi('band', finals.length
        ? percentile(finals, 5).toFixed(1) + ' … ' + percentile(finals, 95).toFixed(1) + ' m'
        : '—');
    }
  });
})();
