/* Rocket landing GNC — point-mass powered descent.

   This is deliberately the same fidelity the prototype actually has: a
   translational point mass, one closed guidance loop, one scenario at a
   time. No 6-DOF, no aerodynamics, no dispersion campaign. */
(function () {
  'use strict';

  var DT = 0.02, G0 = 9.80665;

  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  function descend(s) {
    var h = s.h0, vz = -Math.abs(s.v0), x = s.x0, vx = 0;
    var m = s.mDry + s.mProp, prop = s.mProp;
    var Tmax = s.Tmax * 1000;
    var traj = [], vel = [], thr = [];
    var t = 0, touchdown = null, cutoff = false;

    for (var k = 0; k < 8000; k++) {
      t = k * DT;

      /* velocity profile: bleed off speed proportional to remaining altitude */
      var vCmd = -clamp(s.kProfile * Math.sqrt(Math.max(h, 0)), s.vTouch, s.vMax);

      /* throttle holds the commanded descent rate against weight */
      var aCmd = G0 + s.kv * (vCmd - vz);
      var throttle = clamp(aCmd * m / Tmax, prop > 0 ? s.thrMin : 0, 1);
      if (prop <= 0) { throttle = 0; cutoff = true; }
      var T = throttle * Tmax;

      /* lateral channel: gimbal the engine to null offset */
      var gim = clamp(-(s.kx * x + s.kvx * vx), -s.gimMax, s.gimMax) * Math.PI / 180;
      var aLat = T * Math.sin(gim) / m + s.wind * 0.06;
      var aVert = T * Math.cos(gim) / m - G0;

      vx += aLat * DT; x += vx * DT;
      vz += aVert * DT; h += vz * DT;

      var mdot = T / (s.isp * G0);
      prop = Math.max(0, prop - mdot * DT);
      m = s.mDry + prop;

      traj.push([x, Math.max(h, 0)]);
      vel.push([t, vz]);
      thr.push([t, throttle * 100]);

      if (h <= 0) { touchdown = { t: t, vz: vz, x: x, vx: vx, prop: prop }; break; }
      if (h > s.h0 * 2.2 || t > 150) { break; }
    }

    var ok = touchdown &&
      Math.abs(touchdown.vz) <= 2.0 &&
      Math.abs(touchdown.x) <= 5.0 &&
      touchdown.prop > 0;

    return { traj: traj, vel: vel, thr: thr, touchdown: touchdown, cutoff: cutoff, ok: ok, propLeft: prop };
  }

  window.VNLab.register('rocket', {
    title: 'Close the loop on the point-mass descent',
    note: 'A point-mass translational model with one guidance loop, gimbal saturation and propellant depletion — ' +
          'the same fidelity as the private prototype this case study reviews, and the same boundary. It is not ' +
          '6-DOF, has no aerodynamics, and one run here is one run: nothing on this page supports a landing-' +
          'accuracy or dispersion claim. Gates RL-G2 through RL-G5 above are still open.',
    controls: [
      { type: 'heading', label: 'Initial state' },
      { type: 'range', id: 'h0', label: 'Ignition altitude', min: 200, max: 1500, step: 10, value: 600, unit: 'm', decimals: 0 },
      { type: 'range', id: 'v0', label: 'Descent rate', min: 20, max: 120, step: 1, value: 65, unit: 'm/s', decimals: 0 },
      { type: 'range', id: 'x0', label: 'Lateral offset', min: -80, max: 80, step: 1, value: 30, unit: 'm', decimals: 0 },
      { type: 'heading', label: 'Vehicle' },
      { type: 'range', id: 'Tmax', label: 'Max thrust', min: 200, max: 1200, step: 10, value: 520, unit: 'kN', decimals: 0 },
      { type: 'range', id: 'thrMin', label: 'Min throttle', min: 0.2, max: 0.8, step: 0.01, value: 0.35, decimals: 2 },
      { type: 'range', id: 'mDry', label: 'Dry mass', min: 8000, max: 26000, step: 100, value: 14000, unit: 'kg', decimals: 0 },
      { type: 'range', id: 'mProp', label: 'Propellant', min: 500, max: 12000, step: 50, value: 7000, unit: 'kg', decimals: 0 },
      { type: 'range', id: 'isp', label: 'Specific impulse', min: 240, max: 340, step: 1, value: 282, unit: 's', decimals: 0 },
      { type: 'heading', label: 'Guidance' },
      { type: 'range', id: 'kProfile', label: 'Profile gain', min: 0.6, max: 3, step: 0.05, value: 1.2, decimals: 2 },
      { type: 'range', id: 'kv', label: 'Rate gain', min: 0.2, max: 4, step: 0.05, value: 2.0, decimals: 2 },
      { type: 'range', id: 'vTouch', label: 'Touchdown target', min: 0.5, max: 6, step: 0.1, value: 1.5, unit: 'm/s', decimals: 1 },
      { type: 'range', id: 'vMax', label: 'Descent cap', min: 30, max: 150, step: 1, value: 90, unit: 'm/s', decimals: 0 },
      { type: 'heading', label: 'Lateral control' },
      { type: 'range', id: 'kx', label: 'Position gain', min: 0, max: 0.35, step: 0.005, value: 0.12, decimals: 3 },
      { type: 'range', id: 'kvx', label: 'Velocity gain', min: 0, max: 2.5, step: 0.02, value: 0.8, decimals: 2 },
      { type: 'range', id: 'gimMax', label: 'Gimbal limit', min: 2, max: 15, step: 0.5, value: 7, unit: '°', decimals: 1 },
      { type: 'range', id: 'wind', label: 'Lateral disturbance', min: -30, max: 30, step: 1, value: 0, decimals: 0 }
    ],
    kpis: [
      { id: 'verdict', label: 'Outcome' },
      { id: 'vz', label: 'Touchdown rate' },
      { id: 'miss', label: 'Lateral miss' },
      { id: 'prop', label: 'Propellant left' }
    ],
    plots: [
      { id: 'traj', height: 250, caption: 'Descent trajectory', pad: { l: 56, r: 16, t: 14, b: 32 }, legend: [
        { label: 'Path', color: 'var(--accent)' },
        { label: 'Pad', color: 'var(--ok)', dash: true }
      ] },
      { id: 'prof', height: 165, caption: 'Descent rate and throttle', pad: { l: 56, r: 16, t: 14, b: 32 }, legend: [
        { label: 'Descent rate m/s', color: 'var(--accent)' },
        { label: 'Throttle %', color: 'var(--warn)' }
      ] }
    ],
    actions: [
      { label: 'Nominal case', primary: true, run: function (api) {
        [['h0', 600], ['v0', 65], ['x0', 30], ['Tmax', 520], ['thrMin', 0.35], ['mDry', 14000],
         ['mProp', 7000], ['isp', 282], ['kProfile', 1.2], ['kv', 2.0], ['vTouch', 1.5],
         ['vMax', 90], ['kx', 0.12], ['kvx', 0.8], ['gimMax', 7], ['wind', 0]]
          .forEach(function (kv) { api.set(kv[0], kv[1]); });
        api.render();
      } }
    ],
    render: function (api) {
      var s = api.state, P = api.palette;
      var out = descend(s);

      var xLo = 1e9, xHi = -1e9;
      out.traj.forEach(function (p) { xLo = Math.min(xLo, p[0]); xHi = Math.max(xHi, p[0]); });
      var span = Math.max(20, (xHi - xLo) * 1.25);
      var mid = (xHi + xLo) / 2;

      var g = api.plot('traj');
      g.setRange(mid - span / 2, mid + span / 2, 0, s.h0 * 1.08).clear();
      g.frame({ xLabel: 'lateral position (m)', yLabel: 'altitude (m)', xTicks: 5, yTicks: 4, xDec: 0, yDec: 0 });
      g.rect(-5, 5, { color: P.ok, alpha: 0.14, label: 'PAD ±5 m' });
      g.line(out.traj, { color: P.accent, width: 2 });
      if (out.touchdown) {
        g.dot(out.touchdown.x, 0, { color: out.ok ? P.ok : P.danger, r: 5, ring: true });
      }

      var tEnd = out.vel.length ? out.vel[out.vel.length - 1][0] : 1;
      var h = api.plot('prof');
      h.setRange(0, Math.max(tEnd, 1), -Math.max(s.vMax, Math.abs(s.v0)) * 1.1, 110).clear();
      h.frame({ xLabel: 'time (s)', yLabel: 'rate / throttle', xTicks: 5, yTicks: 4, xDec: 0, yDec: 0 });
      h.hline(0, { color: P.ink3, dash: true });
      h.line(out.thr, { color: P.warn, width: 1.6 });
      h.line(out.vel, { color: P.accent, width: 2 });

      var td = out.touchdown;
      api.kpi('verdict', !td ? 'NO TOUCHDOWN' : (out.ok ? 'LANDED' : 'FAILED'),
        !td ? 'bad' : (out.ok ? 'ok' : 'bad'));
      api.kpi('vz', td ? Math.abs(td.vz).toFixed(2) + ' m/s' : '—',
        td ? (Math.abs(td.vz) <= 2 ? 'ok' : 'bad') : null);
      api.kpi('miss', td ? Math.abs(td.x).toFixed(1) + ' m' : '—',
        td ? (Math.abs(td.x) <= 5 ? 'ok' : 'warn') : null);
      api.kpi('prop', Math.round(out.propLeft) + ' kg',
        out.propLeft > 50 ? 'ok' : 'bad');
    }
  });
})();
