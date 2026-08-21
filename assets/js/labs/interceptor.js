/* Interception robot — perception-to-actuation latency budget.

   The case study's central claim is a sub-100 ms loop. This model makes the
   budget additive and visible, then shows the angular lag it produces at a
   given target speed and whether predicting across the delay recovers it.
   It illustrates the reported architecture; it is not measured timing. */
(function () {
  'use strict';

  var DT = 0.005, T = 6;

  var STAGES = [
    { id: 'lCapture', label: 'Frame capture', color: 'var(--txt-3)' },
    { id: 'lDetect', label: 'Detector inference', color: 'var(--danger)' },
    { id: 'lEstimate', label: 'Track update', color: 'var(--accent)' },
    { id: 'lControl', label: 'Control law', color: 'var(--systems)' },
    { id: 'lActuate', label: 'Actuator response', color: 'var(--warn)' }
  ];

  function budget(s) {
    var total = 0;
    STAGES.forEach(function (st) { total += s[st.id]; });
    return total;
  }

  function simulate(s) {
    var lag = budget(s) / 1000;                 /* seconds of pipeline delay */
    var framePeriod = 1 / Math.max(s.fps, 1);
    var truth = [], aim = [], errSeries = [];
    var turret = 0, turretRate = 0;
    var lastMeasureT = -1, lastMeasure = 0, lastVel = 0, prevMeasure = null, prevT = null;
    var sumSq = 0, n = 0, peak = 0;

    function targetAngle(t) {
      /* constant crossing rate plus an optional mid-run direction change */
      var a = s.speed * (t - T / 2) * 0.1;
      if (s.manoeuvre && t > 3) { a = s.speed * (3 - T / 2) * 0.1 - s.speed * (t - 3) * 0.14; }
      return a;
    }

    for (var k = 0; k * DT <= T; k++) {
      var t = k * DT;
      var truthA = targetAngle(t);
      truth.push([t, truthA]);

      /* a new detection lands only on frame boundaries, delayed by the pipeline */
      if (t - lastMeasureT >= framePeriod) {
        var sampledAt = t - lag;
        if (sampledAt >= 0) {
          var m = targetAngle(sampledAt);
          if (prevMeasure !== null && t - prevT > 1e-6) {
            lastVel = (m - prevMeasure) / (t - prevT);
          }
          prevMeasure = m; prevT = t;
          lastMeasure = m;
          lastMeasureT = t;
        } else {
          lastMeasureT = t;
        }
      }

      /* estimator: hold the last detection, or propagate it across the delay */
      var command = s.predict ? lastMeasure + lastVel * lag : lastMeasure;

      /* bounded first-order servo */
      var rateCmd = s.kp * (command - turret);
      rateCmd = Math.max(-s.rateMax, Math.min(s.rateMax, rateCmd));
      turretRate += (rateCmd - turretRate) * (DT / Math.max(s.servoTau, 1e-3));
      turret += turretRate * DT;

      aim.push([t, turret]);
      var e = turret - truthA;
      errSeries.push([t, e]);
      if (t > 1) { sumSq += e * e; n++; peak = Math.max(peak, Math.abs(e)); }
    }

    return {
      truth: truth, aim: aim, err: errSeries,
      rms: n ? Math.sqrt(sumSq / n) : 0,
      peak: peak, lag: lag * 1000
    };
  }

  window.VNLab.register('interceptor', {
    title: 'Build the latency budget, then see the lag it buys',
    note: 'This is an illustrative model of the reported architecture, not measurement. No timing traces, ' +
          'histograms or hardware records were available for this project during the portfolio audit, so ' +
          'nothing here verifies the reported sub-100 ms figure — it shows what a budget of the stated shape ' +
          'implies for tracking error, and why predicting across the delay is the lever that matters.',
    controls: [
      { type: 'heading', label: 'Latency budget (ms)' },
      { type: 'range', id: 'lCapture', label: 'Frame capture', min: 1, max: 40, step: 1, value: 12, unit: 'ms', decimals: 0 },
      { type: 'range', id: 'lDetect', label: 'Detector inference', min: 5, max: 180, step: 1, value: 48, unit: 'ms', decimals: 0 },
      { type: 'range', id: 'lEstimate', label: 'Track update', min: 0, max: 20, step: 1, value: 3, unit: 'ms', decimals: 0 },
      { type: 'range', id: 'lControl', label: 'Control law', min: 0, max: 20, step: 1, value: 2, unit: 'ms', decimals: 0 },
      { type: 'range', id: 'lActuate', label: 'Actuator response', min: 2, max: 60, step: 1, value: 18, unit: 'ms', decimals: 0 },
      { type: 'heading', label: 'Pipeline' },
      { type: 'range', id: 'fps', label: 'Camera frame rate', min: 5, max: 60, step: 1, value: 30, unit: 'fps', decimals: 0 },
      { type: 'switch', id: 'predict', label: 'Predict across delay', value: true },
      { type: 'heading', label: 'Servo' },
      { type: 'range', id: 'kp', label: 'Tracking gain', min: 1, max: 25, step: 0.5, value: 9, decimals: 1 },
      { type: 'range', id: 'servoTau', label: 'Servo time constant', min: 0.01, max: 0.3, step: 0.005, value: 0.06, unit: 's', decimals: 3 },
      { type: 'range', id: 'rateMax', label: 'Rate limit', min: 20, max: 400, step: 5, value: 180, unit: '°/s', decimals: 0 },
      { type: 'heading', label: 'Target' },
      { type: 'range', id: 'speed', label: 'Crossing rate', min: 5, max: 90, step: 1, value: 35, decimals: 0 },
      { type: 'switch', id: 'manoeuvre', label: 'Target changes direction', value: false }
    ],
    kpis: [
      { id: 'total', label: 'End-to-end latency' },
      { id: 'verdict', label: 'Against 100 ms target' },
      { id: 'rms', label: 'RMS tracking error' },
      { id: 'peak', label: 'Peak error' }
    ],
    plots: [
      { id: 'stack', height: 130, caption: 'Stage-by-stage latency budget', pad: { l: 56, r: 16, t: 14, b: 34 } },
      { id: 'track', height: 220, caption: 'Target bearing vs turret aim', pad: { l: 56, r: 16, t: 14, b: 32 }, legend: [
        { label: 'Target', color: 'var(--txt-3)' },
        { label: 'Turret', color: 'var(--accent)' },
        { label: 'Error', color: 'var(--danger)' }
      ] }
    ],
    actions: [
      { label: 'Reported budget', primary: true, run: function (api) {
        [['lCapture', 12], ['lDetect', 48], ['lEstimate', 3], ['lControl', 2], ['lActuate', 18],
         ['fps', 30], ['predict', true], ['kp', 9], ['servoTau', 0.06], ['rateMax', 180],
         ['speed', 35], ['manoeuvre', false]].forEach(function (kv) { api.set(kv[0], kv[1]); });
        api.render();
      } },
      { label: 'Drop the predictor', run: function (api) { api.change('predict', false); } }
    ],
    render: function (api) {
      var s = api.state, P = api.palette;
      var total = budget(s);
      var out = simulate(s);

      /* stacked budget bar */
      var b = api.plot('stack');
      b.setRange(0, Math.max(total, 100) * 1.05, 0, 1).clear();
      b.frame({ xLabel: 'milliseconds', xTicks: 5, yTicks: 1, xDec: 0, yFmt: function () { return ''; } });
      var cursor = 0;
      STAGES.forEach(function (st) {
        var v = s[st.id];
        var colour = api.css(st.color.replace('var(', '').replace(')', ''), P.accent);
        var c = b.ctx;
        c.save();
        c.fillStyle = colour;
        c.globalAlpha = 0.85;
        c.fillRect(b.px(cursor), b.py(0.78), Math.max(b.px(cursor + v) - b.px(cursor), 0), b.py(0.22) - b.py(0.78));
        c.restore();
        if (v / Math.max(total, 1) > 0.1) {
          c.save();
          c.font = '10px ui-monospace, monospace';
          c.fillStyle = P.surface;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(v + '', (b.px(cursor) + b.px(cursor + v)) / 2, b.py(0.5));
          c.restore();
        }
        cursor += v;
      });
      b.vline(100, { color: P.danger, label: '100 ms TARGET' });

      var lo = 1e9, hi = -1e9;
      out.truth.concat(out.aim).forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
      var pad = Math.max(3, (hi - lo) * 0.15);

      var g = api.plot('track');
      g.setRange(0, T, lo - pad, hi + pad).clear();
      g.frame({ xLabel: 'time (s)', yLabel: 'bearing (deg)', xTicks: 6, yTicks: 4, xDec: 0, yDec: 0 });
      g.line(out.truth, { color: P.ink3, width: 1.6 });
      g.line(out.aim, { color: P.accent, width: 2 });
      g.line(out.err, { color: P.danger, width: 1.3, dash: true });

      api.kpi('total', total + ' ms', total <= 100 ? 'ok' : 'bad');
      api.kpi('verdict', total <= 100 ? 'WITHIN BUDGET' : (total - 100) + ' ms OVER',
        total <= 100 ? 'ok' : 'bad');
      api.kpi('rms', out.rms.toFixed(2) + '°', out.rms < 1.5 ? 'ok' : (out.rms < 4 ? 'warn' : 'bad'));
      api.kpi('peak', out.peak.toFixed(2) + '°', out.peak < 3 ? 'ok' : (out.peak < 8 ? 'warn' : 'bad'));
    }
  });
})();
