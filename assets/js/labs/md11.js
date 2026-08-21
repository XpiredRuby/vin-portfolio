/* MD-11 Aircraft CAD Assembly — parametric three-view.

   The retained artifacts are a SolidWorks assembly, part, drawing and a
   neutral Parasolid export. This model drives the same shape parameters a
   sketch-driven assembly exposes, renders the top / side / front views a
   drawing sheet would carry, and rolls up the part count as groups are
   suppressed. It is a geometry teaching model, not the CAD file. */
(function () {
  'use strict';

  /* Part groups with the counts that make up the 24-part assembly. */
  var GROUPS = [
    { id: 'gFuse', label: 'Fuselage + nose', parts: 5 },
    { id: 'gWing', label: 'Wing + control surfaces', parts: 8 },
    { id: 'gEmp', label: 'Empennage', parts: 5 },
    { id: 'gEng', label: 'Engines (3)', parts: 6 }
  ];

  function partCount(s) {
    var n = 0;
    GROUPS.forEach(function (g) { if (s[g.id]) { n += g.parts; } });
    return n;
  }

  /* ---- drawing primitives on a shared canvas ---- */
  function view(c, ox, oy, scale, title, P) {
    c.save();
    c.translate(ox, oy);
    c.scale(scale, scale);
    c.lineJoin = 'round';
    return function done() {
      c.restore();
      c.save();
      c.font = '10px ui-monospace, monospace';
      c.fillStyle = P.ink3;
      c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText(title, ox - 4, oy + 4);
      c.restore();
    };
  }

  function poly(c, pts, o) {
    o = o || {};
    c.beginPath();
    pts.forEach(function (p, i) { if (i === 0) { c.moveTo(p[0], p[1]); } else { c.lineTo(p[0], p[1]); } });
    if (o.close !== false) { c.closePath(); }
    if (o.fill) { c.fillStyle = o.fill; c.globalAlpha = o.alpha === undefined ? 0.22 : o.alpha; c.fill(); c.globalAlpha = 1; }
    if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.width || 1.1; c.stroke(); }
  }

  function ellipse(c, x, y, rx, ry, o) {
    o = o || {};
    c.beginPath();
    c.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    if (o.fill) { c.fillStyle = o.fill; c.globalAlpha = o.alpha === undefined ? 0.22 : o.alpha; c.fill(); c.globalAlpha = 1; }
    if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.width || 1.1; c.stroke(); }
  }

  window.VNLab.register('md11', {
    title: 'Drive the assembly parameters, read the three-view',
    note: 'A sketch-driven three-view built from the same kind of parameters a parametric assembly exposes: ' +
          'span, sweep, dihedral, fuselage length, engine placement, plus group suppression and an exploded ' +
          'state. It illustrates how the retained SolidWorks assembly is organised — it is not the CAD file, ' +
          'and the dimensions here are illustrative rather than the released model geometry.',
    controls: [
      { type: 'heading', label: 'Planform' },
      { type: 'range', id: 'span', label: 'Wing span', min: 40, max: 75, step: 0.5, value: 51.7, unit: 'm', decimals: 1 },
      { type: 'range', id: 'sweep', label: 'Quarter-chord sweep', min: 15, max: 40, step: 0.5, value: 35, unit: '°', decimals: 1 },
      { type: 'range', id: 'taper', label: 'Taper ratio', min: 0.15, max: 0.6, step: 0.01, value: 0.24, decimals: 2 },
      { type: 'range', id: 'root', label: 'Root chord', min: 5, max: 14, step: 0.1, value: 9.4, unit: 'm', decimals: 1 },
      { type: 'heading', label: 'Fuselage' },
      { type: 'range', id: 'length', label: 'Overall length', min: 45, max: 80, step: 0.5, value: 61.6, unit: 'm', decimals: 1 },
      { type: 'range', id: 'diam', label: 'Fuselage diameter', min: 4, max: 8, step: 0.1, value: 6.0, unit: 'm', decimals: 1 },
      { type: 'heading', label: 'Empennage and engines' },
      { type: 'range', id: 'dihedral', label: 'Wing dihedral', min: 0, max: 10, step: 0.5, value: 6, unit: '°', decimals: 1 },
      { type: 'range', id: 'engY', label: 'Wing engine station', min: 0.25, max: 0.55, step: 0.01, value: 0.36, decimals: 2 },
      { type: 'heading', label: 'Assembly state' },
      { type: 'range', id: 'explode', label: 'Explode', min: 0, max: 1, step: 0.01, value: 0, decimals: 2 },
      { type: 'switch', id: 'gFuse', label: 'Fuselage + nose', value: true },
      { type: 'switch', id: 'gWing', label: 'Wing + surfaces', value: true },
      { type: 'switch', id: 'gEmp', label: 'Empennage', value: true },
      { type: 'switch', id: 'gEng', label: 'Engines (3)', value: true }
    ],
    kpis: [
      { id: 'parts', label: 'Parts in assembly' },
      { id: 'area', label: 'Reference area' },
      { id: 'ar', label: 'Aspect ratio' },
      { id: 'ar2', label: 'Slenderness L/D' }
    ],
    plots: [
      { id: 'sheet', height: 460, caption: 'Three-view · top, side, front', pad: { l: 0, r: 0, t: 0, b: 0 } }
    ],
    actions: [
      { label: 'MD-11 baseline', primary: true, run: function (api) {
        [['span', 51.7], ['sweep', 35], ['taper', 0.24], ['root', 9.4], ['length', 61.6],
         ['diam', 6.0], ['dihedral', 6], ['engY', 0.36], ['explode', 0],
         ['gFuse', true], ['gWing', true], ['gEmp', true], ['gEng', true]]
          .forEach(function (kv) { api.set(kv[0], kv[1]); });
        api.render();
      } },
      { label: 'Exploded view', run: function (api) { api.change('explode', api.state.explode > 0.5 ? 0 : 1); } }
    ],
    render: function (api) {
      var s = api.state, P = api.palette;
      var g = api.plot('sheet');
      g.setRange(0, 1, 0, 1).clear();
      var c = g.ctx, W = g.w, H = g.h;
      var ex = s.explode;
      var half = s.span / 2;
      var tip = s.root * s.taper;
      var sweepX = Math.tan(s.sweep * Math.PI / 180) * half;
      var ink = P.ink2, acc = P.accent, mech = P.mech, eng = P.warn;

      /* drawing sheet border and column rule */
      c.save();
      c.strokeStyle = P.grid; c.lineWidth = 1;
      c.strokeRect(6.5, 6.5, W - 13, H - 13);
      var split = W * 0.63;
      c.beginPath(); c.moveTo(split, 7); c.lineTo(split, H - 7); c.stroke();
      c.beginPath(); c.moveTo(7, H * 0.52); c.lineTo(split, H * 0.52); c.stroke();
      c.restore();

      /* one scale for all three views, so the sheet reads as a drawing */
      var leftW = split - 40;
      var topH = H * 0.52 - 34;
      var sideH = H * 0.48 - 34;
      var rightW = W - split - 30;
      var scale = Math.min(
        leftW / (s.length * 1.12),
        topH / (s.span * 1.04),
        sideH / (s.diam * 0.62 + half * 0.34 + s.diam * 0.9),
        rightW / (s.span * 1.06)
      );

      function label(text, x, y) {
        c.save();
        c.font = '9px ui-monospace, monospace';
        c.fillStyle = P.ink3; c.textAlign = 'left'; c.textBaseline = 'top';
        c.fillText(text, x, y);
        c.restore();
      }
      function begin(ox, oy) { c.save(); c.translate(ox, oy); c.scale(scale, scale); c.lineJoin = 'round'; }
      function end() { c.restore(); }

      var nose = 18;

      /* ---------- TOP ---------- */
      label('TOP', 14, 14);
      begin(nose + 14, H * 0.26);
      if (s.gFuse) {
        poly(c, [
          [0, -s.diam / 2], [s.length * 0.82, -s.diam / 2], [s.length, -s.diam * 0.09],
          [s.length, s.diam * 0.09], [s.length * 0.82, s.diam / 2], [0, s.diam / 2],
          [-s.length * 0.05, s.diam * 0.2], [-s.length * 0.05, -s.diam * 0.2]
        ], { fill: ink, alpha: 0.16, stroke: ink });
      }
      if (s.gWing) {
        var wx = s.length * 0.40;
        var off = ex * s.span * 0.18;
        [1, -1].forEach(function (sg) {
          poly(c, [
            [wx, sg * s.diam / 2],
            [wx + sweepX, sg * (half + off)],
            [wx + sweepX + tip, sg * (half + off)],
            [wx + s.root, sg * s.diam / 2]
          ], { fill: acc, alpha: 0.20, stroke: acc });
        });
      }
      if (s.gEmp) {
        var tx = s.length * 0.84 + ex * s.length * 0.10;
        var th = half * 0.38;
        [1, -1].forEach(function (sg) {
          poly(c, [
            [tx, sg * s.diam * 0.28],
            [tx + th * 0.62, sg * th],
            [tx + th * 0.62 + s.root * 0.26, sg * th],
            [tx + s.root * 0.48, sg * s.diam * 0.28]
          ], { fill: mech, alpha: 0.22, stroke: mech });
        });
      }
      if (s.gEng) {
        var ey = half * s.engY;
        var exn = s.length * 0.40 + Math.tan(s.sweep * Math.PI / 180) * ey - s.root * 0.30;
        [1, -1].forEach(function (sg) {
          var yy = sg * (ey + ex * s.span * 0.08);
          poly(c, [
            [exn, yy - s.diam * 0.20], [exn + s.root * 0.66, yy - s.diam * 0.20],
            [exn + s.root * 0.66, yy + s.diam * 0.20], [exn, yy + s.diam * 0.20]
          ], { fill: eng, alpha: 0.30, stroke: eng });
        });
        /* tail-mounted centre engine: the MD-11 signature */
        var cx = s.length * 0.80 + ex * s.length * 0.08;
        poly(c, [
          [cx, -s.diam * 0.26], [cx + s.length * 0.15, -s.diam * 0.18],
          [cx + s.length * 0.15, s.diam * 0.18], [cx, s.diam * 0.26]
        ], { fill: eng, alpha: 0.30, stroke: eng });
      }
      end();

      /* ---------- SIDE ---------- */
      label('SIDE', 14, H * 0.52 + 8);
      begin(nose + 14, H * 0.92);
      if (s.gFuse) {
        poly(c, [
          [0, 0], [s.length * 0.84, 0], [s.length, -s.diam * 0.18],
          [s.length, -s.diam * 0.50], [s.length * 0.80, -s.diam * 0.62],
          [s.length * 0.10, -s.diam * 0.62], [-s.length * 0.05, -s.diam * 0.30]
        ], { fill: ink, alpha: 0.16, stroke: ink });
      }
      if (s.gEmp) {
        var vx = s.length * 0.78 + ex * s.length * 0.08;
        poly(c, [
          [vx, -s.diam * 0.62], [vx + s.root * 0.50, -s.diam * 0.62 - half * 0.34],
          [vx + s.root * 0.95, -s.diam * 0.62 - half * 0.34], [vx + s.root * 0.88, -s.diam * 0.62]
        ], { fill: mech, alpha: 0.22, stroke: mech });
      }
      if (s.gWing) {
        var sy = -s.diam * 0.20 - ex * s.diam * 1.6;
        poly(c, [
          [s.length * 0.40, sy], [s.length * 0.40 + s.root, sy],
          [s.length * 0.40 + s.root * 0.90, sy + s.diam * 0.09],
          [s.length * 0.40 + s.root * 0.06, sy + s.diam * 0.09]
        ], { fill: acc, alpha: 0.20, stroke: acc });
      }
      if (s.gEng) {
        ellipse(c, s.length * 0.40 + s.root * 0.10, -s.diam * 0.04 - ex * s.diam * 1.1,
          s.root * 0.34, s.diam * 0.18, { fill: eng, alpha: 0.30, stroke: eng });
        ellipse(c, s.length * 0.86 + ex * s.length * 0.08, -s.diam * 0.62 - half * 0.30,
          s.root * 0.26, s.diam * 0.16, { fill: eng, alpha: 0.30, stroke: eng });
      }
      end();

      /* ---------- FRONT ---------- */
      label('FRONT', split + 14, 14);
      begin(split + (W - split) / 2, H * 0.50);
      var dih = Math.tan(s.dihedral * Math.PI / 180);
      if (s.gEmp) {
        poly(c, [
          [-s.diam * 0.07, -s.diam * 0.5], [-s.diam * 0.07, -s.diam * 0.5 - half * 0.32],
          [s.diam * 0.07, -s.diam * 0.5 - half * 0.32], [s.diam * 0.07, -s.diam * 0.5]
        ], { fill: mech, alpha: 0.22, stroke: mech });
      }
      if (s.gWing) {
        var off2 = ex * s.span * 0.10;
        [1, -1].forEach(function (sg) {
          poly(c, [
            [sg * s.diam * 0.38, 0],
            [sg * (half + off2), -dih * half - off2 * 0.3],
            [sg * (half + off2), -dih * half - off2 * 0.3 + s.diam * 0.09],
            [sg * s.diam * 0.38, s.diam * 0.12]
          ], { fill: acc, alpha: 0.20, stroke: acc });
        });
      }
      if (s.gFuse) { ellipse(c, 0, 0, s.diam / 2, s.diam / 2, { fill: ink, alpha: 0.16, stroke: ink }); }
      if (s.gEng) {
        [1, -1].forEach(function (sg) {
          var yy = sg * half * s.engY;
          ellipse(c, yy, -dih * Math.abs(yy) + s.diam * 0.26 + ex * s.diam * 0.8,
            s.diam * 0.19, s.diam * 0.19, { fill: eng, alpha: 0.30, stroke: eng });
        });
        ellipse(c, 0, -s.diam * 0.5 - half * 0.32 + s.diam * 0.2, s.diam * 0.17, s.diam * 0.17,
          { fill: eng, alpha: 0.30, stroke: eng });
      }
      end();

      var area = (s.root + s.root * s.taper) / 2 * s.span;
      api.kpi('parts', partCount(s) + ' / 24');
      api.kpi('area', area.toFixed(1) + ' m²');
      api.kpi('ar', (s.span * s.span / Math.max(area, 1e-3)).toFixed(2));
      api.kpi('ar2', (s.length / s.diam).toFixed(2));
    }
  });
})();
