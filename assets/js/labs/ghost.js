/* GHOST-X — target estimation through visual occlusion.
   Two-model IMM (constant-velocity + high-manoeuvre) against a single
   constant-velocity filter, with a measurement gap you control and a
   supervisor that reports TRACKING / PREDICTION / SAFE_HOLD. */
(function () {
  'use strict';

  var DT = 0.05;
  var T = 14;
  var N = Math.round(T / DT);
  var SAFE_HOLD_S = 3.0;   /* declared prediction envelope from the case study */

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

  /* 2-state [range, rate] Kalman filter */
  function makeFilter(q, x0) {
    return { x: [x0, 0], P: [[0.5, 0], [0, 0.5]], q: q };
  }
  function predict(f) {
    var x = f.x, P = f.P, dt = DT, q = f.q;
    x[0] += x[1] * dt;
    var p00 = P[0][0] + dt * (P[1][0] + P[0][1]) + dt * dt * P[1][1];
    var p01 = P[0][1] + dt * P[1][1];
    var p10 = P[1][0] + dt * P[1][1];
    var p11 = P[1][1];
    /* discrete white-noise acceleration */
    P[0][0] = p00 + q * dt * dt * dt * dt / 4;
    P[0][1] = p01 + q * dt * dt * dt / 2;
    P[1][0] = p10 + q * dt * dt * dt / 2;
    P[1][1] = p11 + q * dt * dt;
  }
  function update(f, z, R) {
    var S = f.P[0][0] + R;
    var K0 = f.P[0][0] / S, K1 = f.P[1][0] / S;
    var y = z - f.x[0];
    f.x[0] += K0 * y;
    f.x[1] += K1 * y;
    var p00 = f.P[0][0], p01 = f.P[0][1], p10 = f.P[1][0], p11 = f.P[1][1];
    f.P[0][0] = p00 - K0 * p00;
    f.P[0][1] = p01 - K0 * p01;
    f.P[1][0] = p10 - K1 * p00;
    f.P[1][1] = p11 - K1 * p01;
    return { y: y, S: S };
  }

  function run(s) {
    var r = rng(s.seed | 0);
    var gapStart = s.gapStart, gapEnd = s.gapStart + s.gap;
    var R = s.noise * s.noise;

    /* IMM: model 0 = constant velocity, model 1 = manoeuvre-tolerant */
    var f0 = makeFilter(0.02, 8), f1 = makeFilter(3.5, 8);
    var mu = [0.9, 0.1];
    var PI = [[0.97, 0.03], [0.12, 0.88]];

    var truth = [], meas = [], est = [], sig = [], modeP = [];
    var tx = 8, tv = -0.35;
    var errTracked = 0, nTracked = 0, errPredicted = 0, nPredicted = 0;
    var reacqError = null, reacqSigma = null, sigmaAtEnd = 0;
    var state = 'TRACKING';
    var worstState = 'TRACKING';

    for (var k = 0; k <= N; k++) {
      var t = k * DT;

      /* truth: constant closing rate, optional mid-run turn */
      if (s.manoeuvre && t > 5.5 && t < 8.5) { tv += 0.55 * DT; }
      tx += tv * DT;
      truth.push([t, tx]);

      var visible = !(t >= gapStart && t < gapEnd);

      /* --- IMM mixing --- */
      var c = [PI[0][0] * mu[0] + PI[1][0] * mu[1], PI[0][1] * mu[0] + PI[1][1] * mu[1]];
      var w00 = PI[0][0] * mu[0] / (c[0] || 1e-9), w10 = PI[1][0] * mu[1] / (c[0] || 1e-9);
      var w01 = PI[0][1] * mu[0] / (c[1] || 1e-9), w11 = PI[1][1] * mu[1] / (c[1] || 1e-9);
      var m0 = [w00 * f0.x[0] + w10 * f1.x[0], w00 * f0.x[1] + w10 * f1.x[1]];
      var m1 = [w01 * f0.x[0] + w11 * f1.x[0], w01 * f0.x[1] + w11 * f1.x[1]];
      if (s.imm) { f0.x = m0.slice(); f1.x = m1.slice(); }

      predict(f0);
      if (s.imm) { predict(f1); }

      var z = null;
      if (visible) {
        z = tx + gauss(r) * s.noise;
        meas.push([t, z]);
        var u0 = update(f0, z, R);
        if (s.imm) {
          var u1 = update(f1, z, R);
          var L0 = Math.exp(-0.5 * u0.y * u0.y / u0.S) / Math.sqrt(2 * Math.PI * u0.S);
          var L1 = Math.exp(-0.5 * u1.y * u1.y / u1.S) / Math.sqrt(2 * Math.PI * u1.S);
          var n0 = Math.max(L0 * c[0], 1e-12), n1 = Math.max(L1 * c[1], 1e-12);
          mu = [n0 / (n0 + n1), n1 / (n0 + n1)];
        }
      }

      var X = s.imm ? mu[0] * f0.x[0] + mu[1] * f1.x[0] : f0.x[0];
      var P = s.imm
        ? mu[0] * (f0.P[0][0] + Math.pow(f0.x[0] - X, 2)) + mu[1] * (f1.P[0][0] + Math.pow(f1.x[0] - X, 2))
        : f0.P[0][0];
      var three = 3 * Math.sqrt(Math.max(P, 1e-9));

      est.push([t, X]);
      sig.push([t, three, -three]);
      modeP.push([t, s.imm ? mu[1] : 0]);

      var e = Math.abs(X - tx);
      if (visible) { errTracked += e * e; nTracked++; }
      else { errPredicted += e * e; nPredicted++; }

      /* supervisor */
      if (!visible) {
        var held = t - gapStart;
        state = held > SAFE_HOLD_S ? 'SAFE_HOLD' : 'PREDICTION';
      } else {
        state = 'TRACKING';
      }
      if (state === 'SAFE_HOLD') { worstState = 'SAFE_HOLD'; }
      else if (state === 'PREDICTION' && worstState === 'TRACKING') { worstState = 'PREDICTION'; }

      if (s.gap > 0 && reacqError === null && t >= gapEnd) {
        reacqError = e;
        reacqSigma = three;
      }
      sigmaAtEnd = three;
    }

    return {
      truth: truth, meas: meas, est: est, sig: sig, modeP: modeP,
      gapStart: gapStart, gapEnd: gapEnd,
      rmseTracked: nTracked ? Math.sqrt(errTracked / nTracked) : 0,
      rmsePredicted: nPredicted ? Math.sqrt(errPredicted / nPredicted) : 0,
      reacqError: reacqError, reacqSigma: reacqSigma, sigmaAtEnd: sigmaAtEnd,
      state: worstState
    };
  }

  var SCENARIOS = {
    nominal:  { gap: 0.0,   gapStart: 6.0, noise: 0.06, manoeuvre: false, imm: true },
    short:    { gap: 2.451, gapStart: 5.0, noise: 0.06, manoeuvre: false, imm: true },
    long:     { gap: 4.6,   gapStart: 5.0, noise: 0.06, manoeuvre: false, imm: true },
    manoeuvre:{ gap: 2.451, gapStart: 5.0, noise: 0.09, manoeuvre: true,  imm: true }
  };

  window.VNLab.register('ghost', {
    title: 'Estimate a target through a measurement gap',
    note: 'A 2-state range filter with the same IMM structure and 3.0 s prediction envelope the case study ' +
          'describes, run in your browser on synthetic measurements. It shows the mechanism — covariance growth ' +
          'while blind, mode mixing on a manoeuvre, reacquisition. It is not a replay of the Raspberry Pi ' +
          'campaign; the hardware numbers stay in the evidence plates above.',
    controls: [
      { type: 'heading', label: 'Scenario' },
      { type: 'preset', id: 'scenario', value: 'short', options: [
        { v: 'nominal', t: 'No dropout' },
        { v: 'short', t: 'Measured 2.451 s gap' },
        { v: 'long', t: 'Beyond envelope' },
        { v: 'manoeuvre', t: 'Manoeuvring target' }
      ] },
      { type: 'heading', label: 'Occlusion' },
      { type: 'range', id: 'gap', label: 'Vision gap', min: 0, max: 6, step: 0.05, value: 2.451, unit: 's', decimals: 2 },
      { type: 'range', id: 'gapStart', label: 'Gap onset', min: 2, max: 9, step: 0.1, value: 5, unit: 's', decimals: 1 },
      { type: 'heading', label: 'Sensor and target' },
      { type: 'range', id: 'noise', label: 'Measurement σ', min: 0.01, max: 0.3, step: 0.005, value: 0.06, unit: 'm', decimals: 3 },
      { type: 'switch', id: 'manoeuvre', label: 'Target manoeuvres', value: false },
      { type: 'heading', label: 'Estimator' },
      { type: 'switch', id: 'imm', label: 'IMM mode mixing', value: true },
      { type: 'range', id: 'seed', label: 'Noise seed', min: 1, max: 40, step: 1, value: 7, decimals: 0 }
    ],
    kpis: [
      { id: 'state', label: 'Supervisor state' },
      { id: 'rmseT', label: 'RMSE while measured' },
      { id: 'rmseP', label: 'RMSE while blind' },
      { id: 'reacq', label: 'Reacquisition error' }
    ],
    plots: [
      { id: 'range', height: 250, caption: 'Relative range', legend: [
        { label: 'Truth', color: 'var(--txt-3)' },
        { label: 'Measurements', color: 'var(--warn)' },
        { label: 'Estimate', color: 'var(--accent)' },
        { label: '±3σ', color: 'var(--accent)', dash: true }
      ] },
      { id: 'sigma', height: 150, caption: '3σ range uncertainty', legend: [
        { label: '3σ', color: 'var(--accent)' },
        { label: 'Envelope limit', color: 'var(--danger)', dash: true }
      ] }
    ],
    actions: [
      { label: 'New noise draw', run: function (api) { api.change('seed', 1 + ((api.state.seed) % 40)); } },
      { label: 'Reset', run: function (api) { api.change('scenario', 'short'); } }
    ],
    onChange: function (api, id, value) {
      if (id !== 'scenario') { return; }
      var p = SCENARIOS[value];
      if (!p) { return; }
      Object.keys(p).forEach(function (k) { api.set(k, p[k]); });
    },
    render: function (api) {
      var s = api.state;
      var out = run(s);
      var P = api.palette;

      var lo = 1e9, hi = -1e9;
      out.truth.concat(out.est).forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
      out.sig.forEach(function (p, i) {
        hi = Math.max(hi, out.est[i][1] + p[1]);
        lo = Math.min(lo, out.est[i][1] + p[2]);
      });
      var padY = Math.max(0.3, (hi - lo) * 0.12);

      var g = api.plot('range');
      g.setRange(0, T, lo - padY, hi + padY).clear();
      g.frame({ xLabel: 'time (s)', yLabel: 'range (m)', xTicks: 7, yTicks: 4, xDec: 0, yDec: 1 });
      if (s.gap > 0) {
        g.rect(out.gapStart, out.gapEnd, { color: P.warn, alpha: 0.13, label: 'NO MEASUREMENTS' });
      }
      g.band(out.sig.map(function (p, i) {
        return [p[0], out.est[i][1] + p[1], out.est[i][1] + p[2]];
      }), { color: P.accent, alpha: 0.15 });
      g.line(out.truth, { color: P.ink3, width: 1.6 });
      out.meas.forEach(function (m, i) {
        if (i % 3 === 0) { g.dot(m[0], m[1], { color: P.warn, r: 1.6 }); }
      });
      g.line(out.est, { color: P.accent, width: 2 });
      if (out.reacqError !== null) {
        g.vline(out.gapEnd, { color: P.ok, label: 'REACQUIRE' });
      }

      var maxS = 0;
      out.sig.forEach(function (p) { maxS = Math.max(maxS, p[1]); });
      var h = api.plot('sigma');
      h.setRange(0, T, 0, Math.max(maxS * 1.25, 0.25)).clear();
      h.frame({ xLabel: 'time (s)', yLabel: '3σ (m)', xTicks: 7, yTicks: 3, xDec: 0, yDec: 2 });
      if (s.gap > 0) {
        h.rect(out.gapStart, out.gapEnd, { color: P.warn, alpha: 0.13 });
        h.vline(Math.min(out.gapStart + 3.0, T), { color: P.danger, label: '3.0 s ENVELOPE' });
      }
      h.line(out.sig.map(function (p) { return [p[0], p[1]]; }), { color: P.accent, width: 2 });

      var tone = out.state === 'SAFE_HOLD' ? 'bad' : (out.state === 'PREDICTION' ? 'warn' : 'ok');
      api.kpi('state', out.state, tone);
      api.kpi('rmseT', out.rmseTracked.toFixed(3) + ' m', 'ok');
      api.kpi('rmseP', s.gap > 0 ? out.rmsePredicted.toFixed(3) + ' m' : 'n/a',
        s.gap > 0 ? (out.rmsePredicted > 4 * out.rmseTracked ? 'warn' : 'ok') : null);
      api.kpi('reacq', out.reacqError === null ? 'n/a' : out.reacqError.toFixed(3) + ' m',
        out.reacqError === null ? null : (out.reacqError < out.reacqSigma ? 'ok' : 'warn'));
    }
  });
})();
