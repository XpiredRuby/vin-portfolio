/* ============================================================
   labs/core.js — shared runtime for the interactive case-study models.

   Each project page mounts <div data-lab="NAME">. This file builds the
   chrome (header, plot stage, control rail, footnote), hands the module
   a small drawing/DOM toolkit, and loads labs/NAME.js on demand.

   The models are deliberately small and readable. They illustrate the
   engineering mechanism a case study describes; they are not a rerun of
   the project's verified results, and every lab says so in its footer.
   ============================================================ */
(function () {
  'use strict';

  var here = document.currentScript && document.currentScript.src;
  if (!here) { return; }
  var base = new URL('./', here);

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme-aware colour lookup ---------- */
  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback || '#888';
  }
  var palette = {};
  function refreshPalette() {
    palette = {
      ink: css('--txt', '#eee'),
      ink2: css('--txt-2', '#bbb'),
      ink3: css('--txt-3', '#889'),
      line: css('--line-2', '#334'),
      grid: css('--line', '#223'),
      accent: css('--accent', '#6bb7f5'),
      ok: css('--ok', '#5fcfa0'),
      warn: css('--warn', '#f0b667'),
      danger: css('--danger', '#f58080'),
      systems: css('--systems', '#b49bee'),
      mech: css('--mechanical', '#e89a6b'),
      surface: css('--surface-in', '#0d141c')
    };
  }
  refreshPalette();

  /* ---------- DOM helper ---------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') { node.className = attrs[k]; }
        else if (k === 'text') { node.textContent = attrs[k]; }
        else if (k === 'html') { node.innerHTML = attrs[k]; }
        else if (k.slice(0, 2) === 'on') { node.addEventListener(k.slice(2), attrs[k]); }
        else if (attrs[k] !== null && attrs[k] !== undefined) { node.setAttribute(k, attrs[k]); }
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) { return; }
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  /* ---------- Plot ----------
     A minimal canvas chart: linear axes, polylines, bands, markers.
     Redraws on resize and on theme change so it never goes off-palette. */
  function Plot(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.pad = Object.assign({ l: 52, r: 14, t: 14, b: 30 }, this.opts.pad || {});
    this.setRange(this.opts.xMin || 0, this.opts.xMax || 1, this.opts.yMin || 0, this.opts.yMax || 1);
    this.w = 0; this.h = 0;
  }
  Plot.prototype.setRange = function (x0, x1, y0, y1) {
    this.xMin = x0; this.xMax = x1; this.yMin = y0; this.yMax = y1;
    return this;
  };
  Plot.prototype.resize = function () {
    var rect = this.canvas.parentElement.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(240, Math.round(rect.width));
    var h = this.opts.height || 240;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    return this;
  };
  Plot.prototype.px = function (x) {
    var span = (this.xMax - this.xMin) || 1;
    return this.pad.l + ((x - this.xMin) / span) * (this.w - this.pad.l - this.pad.r);
  };
  Plot.prototype.py = function (y) {
    var span = (this.yMax - this.yMin) || 1;
    return this.h - this.pad.b - ((y - this.yMin) / span) * (this.h - this.pad.t - this.pad.b);
  };
  Plot.prototype.clear = function () {
    this.ctx.clearRect(0, 0, this.w, this.h);
    return this;
  };
  Plot.prototype.frame = function (o) {
    o = o || {};
    var c = this.ctx;
    var xt = o.xTicks || 5, yt = o.yTicks || 4;
    var i, v, x, y;

    c.save();
    c.lineWidth = 1;
    c.font = '10px ui-monospace, monospace';
    c.fillStyle = palette.ink3;

    for (i = 0; i <= yt; i++) {
      v = this.yMin + (this.yMax - this.yMin) * (i / yt);
      y = Math.round(this.py(v)) + 0.5;
      c.strokeStyle = palette.grid;
      c.beginPath(); c.moveTo(this.pad.l, y); c.lineTo(this.w - this.pad.r, y); c.stroke();
      c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillText(o.yFmt ? o.yFmt(v) : v.toFixed(o.yDec === undefined ? 1 : o.yDec), this.pad.l - 6, y);
    }
    for (i = 0; i <= xt; i++) {
      v = this.xMin + (this.xMax - this.xMin) * (i / xt);
      x = Math.round(this.px(v)) + 0.5;
      c.strokeStyle = palette.grid;
      c.beginPath(); c.moveTo(x, this.pad.t); c.lineTo(x, this.h - this.pad.b); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillText(o.xFmt ? o.xFmt(v) : v.toFixed(o.xDec === undefined ? 0 : o.xDec), x, this.h - this.pad.b + 6);
    }

    c.strokeStyle = palette.line;
    c.strokeRect(this.pad.l + 0.5, this.pad.t + 0.5, this.w - this.pad.l - this.pad.r - 1, this.h - this.pad.t - this.pad.b - 1);

    if (o.xLabel) {
      c.fillStyle = palette.ink3; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillText(o.xLabel, (this.pad.l + this.w - this.pad.r) / 2, this.h - 1);
    }
    if (o.yLabel) {
      c.save();
      c.translate(11, (this.pad.t + this.h - this.pad.b) / 2);
      c.rotate(-Math.PI / 2);
      c.fillStyle = palette.ink3; c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillText(o.yLabel, 0, 0);
      c.restore();
    }
    c.restore();
    return this;
  };
  Plot.prototype.line = function (pts, o) {
    if (!pts || pts.length < 2) { return this; }
    o = o || {};
    var c = this.ctx, i;
    c.save();
    c.beginPath();
    c.rect(this.pad.l, this.pad.t, this.w - this.pad.l - this.pad.r, this.h - this.pad.t - this.pad.b);
    c.clip();
    c.lineWidth = o.width || 1.8;
    c.strokeStyle = o.color || palette.accent;
    c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    if (o.dash) { c.setLineDash(o.dash === true ? [4, 3] : o.dash); }
    c.beginPath();
    for (i = 0; i < pts.length; i++) {
      var X = this.px(pts[i][0]), Y = this.py(pts[i][1]);
      if (i === 0) { c.moveTo(X, Y); } else { c.lineTo(X, Y); }
    }
    c.stroke();
    c.restore();
    return this;
  };
  Plot.prototype.band = function (pts, o) {
    if (!pts || pts.length < 2) { return this; }
    o = o || {};
    var c = this.ctx, i;
    c.save();
    c.beginPath();
    c.rect(this.pad.l, this.pad.t, this.w - this.pad.l - this.pad.r, this.h - this.pad.t - this.pad.b);
    c.clip();
    c.beginPath();
    for (i = 0; i < pts.length; i++) {
      var X = this.px(pts[i][0]), Y = this.py(pts[i][1]);
      if (i === 0) { c.moveTo(X, Y); } else { c.lineTo(X, Y); }
    }
    for (i = pts.length - 1; i >= 0; i--) {
      c.lineTo(this.px(pts[i][0]), this.py(pts[i][2]));
    }
    c.closePath();
    c.fillStyle = o.color || palette.accent;
    c.globalAlpha = o.alpha === undefined ? 0.16 : o.alpha;
    c.fill();
    c.restore();
    return this;
  };
  Plot.prototype.rect = function (x0, x1, o) {
    o = o || {};
    var c = this.ctx;
    c.save();
    c.fillStyle = o.color || palette.warn;
    c.globalAlpha = o.alpha === undefined ? 0.12 : o.alpha;
    c.fillRect(this.px(x0), this.pad.t, this.px(x1) - this.px(x0), this.h - this.pad.t - this.pad.b);
    c.restore();
    if (o.label) {
      c.save();
      c.font = '10px ui-monospace, monospace';
      c.fillStyle = o.color || palette.warn;
      c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillText(o.label, (this.px(x0) + this.px(x1)) / 2, this.pad.t + 4);
      c.restore();
    }
    return this;
  };
  Plot.prototype.hline = function (y, o) {
    o = o || {};
    var c = this.ctx, Y = Math.round(this.py(y)) + 0.5;
    if (Y < this.pad.t || Y > this.h - this.pad.b) { return this; }
    c.save();
    c.strokeStyle = o.color || palette.danger;
    c.lineWidth = o.width || 1.2;
    c.setLineDash(o.dash === false ? [] : [5, 4]);
    c.beginPath(); c.moveTo(this.pad.l, Y); c.lineTo(this.w - this.pad.r, Y); c.stroke();
    if (o.label) {
      c.setLineDash([]);
      c.font = '10px ui-monospace, monospace';
      c.fillStyle = o.color || palette.danger;
      c.textAlign = 'right'; c.textBaseline = 'bottom';
      c.fillText(o.label, this.w - this.pad.r - 3, Y - 3);
    }
    c.restore();
    return this;
  };
  Plot.prototype.vline = function (x, o) {
    o = o || {};
    var c = this.ctx, X = Math.round(this.px(x)) + 0.5;
    if (X < this.pad.l || X > this.w - this.pad.r) { return this; }
    c.save();
    c.strokeStyle = o.color || palette.ink3;
    c.lineWidth = o.width || 1.2;
    c.setLineDash(o.dash === false ? [] : [5, 4]);
    c.beginPath(); c.moveTo(X, this.pad.t); c.lineTo(X, this.h - this.pad.b); c.stroke();
    if (o.label) {
      c.setLineDash([]);
      c.font = '10px ui-monospace, monospace';
      c.font = '10px ui-monospace, monospace';
      c.fillStyle = o.color || palette.ink3;
      /* flip the label inboard when the line sits near the right edge */
      var flip = o.align === 'right' ||
        (o.align !== 'left' && X + c.measureText(o.label).width + 8 > this.w - this.pad.r);
      c.textAlign = flip ? 'right' : 'left';
      c.textBaseline = 'bottom';
      c.fillText(o.label, X + (flip ? -4 : 4), this.h - this.pad.b - 4);
    }
    c.restore();
    return this;
  };
  Plot.prototype.dot = function (x, y, o) {
    o = o || {};
    var c = this.ctx;
    c.save();
    c.fillStyle = o.color || palette.accent;
    c.beginPath();
    c.arc(this.px(x), this.py(y), o.r || 3, 0, Math.PI * 2);
    c.fill();
    if (o.ring) {
      c.strokeStyle = o.color || palette.accent;
      c.globalAlpha = 0.35;
      c.lineWidth = 1.4;
      c.beginPath(); c.arc(this.px(x), this.py(y), (o.r || 3) + 4, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    return this;
  };
  Plot.prototype.bars = function (items, o) {
    o = o || {};
    var c = this.ctx, self = this;
    var n = items.length;
    var innerW = this.w - this.pad.l - this.pad.r;
    var slot = innerW / n;
    var bw = Math.max(6, slot * 0.6);
    c.save();
    c.font = '10px ui-monospace, monospace';
    items.forEach(function (it, i) {
      var cx = self.pad.l + slot * (i + 0.5);
      var y0 = self.py(Math.max(self.yMin, 0));
      var y1 = self.py(it.v);
      c.fillStyle = it.color || o.color || palette.accent;
      c.globalAlpha = it.alpha === undefined ? 0.85 : it.alpha;
      c.fillRect(cx - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0));
      c.globalAlpha = 1;
      if (it.label) {
        c.fillStyle = palette.ink3;
        c.textAlign = 'center'; c.textBaseline = 'top';
        c.fillText(it.label, cx, self.h - self.pad.b + 6);
      }
    });
    c.restore();
    return this;
  };

  /* ---------- control builders ---------- */
  function group(title, children) {
    return el('div', { class: 'lab-group' },
      [title ? el('p', { class: 'lab-group__t', text: title }) : null].concat(children));
  }

  function range(spec, onChange) {
    var out = el('output', { text: fmt(spec.value) });
    function fmt(v) {
      var s = spec.format ? spec.format(v) : (spec.decimals !== undefined ? Number(v).toFixed(spec.decimals) : String(v));
      return s + (spec.unit ? ' ' + spec.unit : '');
    }
    var input = el('input', {
      type: 'range', min: spec.min, max: spec.max, step: spec.step || 1, value: spec.value,
      'aria-label': spec.label,
      oninput: function () {
        var v = parseFloat(input.value);
        out.textContent = fmt(v);
        onChange(spec.id, v);
      }
    });
    var node = el('div', { class: 'lab-field' }, [
      el('div', { class: 'lab-field__row' }, [el('label', { text: spec.label }), out]),
      input
    ]);
    node.setValue = function (v) { input.value = v; out.textContent = fmt(v); };
    return node;
  }

  function toggle(spec, onChange) {
    var input = el('input', {
      type: 'checkbox',
      onchange: function () { onChange(spec.id, input.checked); }
    });
    input.checked = !!spec.value;
    var node = el('label', { class: 'lab-switch' }, [
      el('span', { text: spec.label }),
      input,
      el('i', { 'aria-hidden': 'true' })
    ]);
    node.setValue = function (v) { input.checked = !!v; };
    return node;
  }

  function select(spec, onChange) {
    var sel = el('select', {
      class: 'lab-select', 'aria-label': spec.label,
      onchange: function () { onChange(spec.id, sel.value); }
    }, spec.options.map(function (o) {
      return el('option', { value: o.v, text: o.t });
    }));
    sel.value = spec.value;
    var node = el('div', { class: 'lab-field' }, [
      el('div', { class: 'lab-field__row' }, [el('label', { text: spec.label })]),
      sel
    ]);
    node.setValue = function (v) { sel.value = v; };
    return node;
  }

  function presets(spec, onChange) {
    var buttons = spec.options.map(function (o) {
      return el('button', {
        type: 'button', 'aria-pressed': String(o.v === spec.value), text: o.t,
        title: o.hint || '',
        onclick: function () { onChange(spec.id, o.v); }
      });
    });
    var node = el('div', { class: 'lab-presets' }, buttons);
    node.setValue = function (v) {
      buttons.forEach(function (b, i) {
        b.setAttribute('aria-pressed', String(spec.options[i].v === v));
      });
    };
    return node;
  }

  /* ---------- lab shell ---------- */
  var registry = {};
  var pending = {};

  function mount(name, def, host) {
    var state = {};
    (def.controls || []).forEach(function (c) {
      if (c.type !== 'heading') { state[c.id] = c.value; }
    });

    var plots = {};
    var kpiNodes = {};
    var widgets = {};
    var api = {
      el: el,
      css: css,
      state: state,
      palette: palette,
      plot: function (id) { return plots[id]; },
      reduceMotion: reduceMotion,
      set: function (id, v) { state[id] = v; if (widgets[id]) { widgets[id].setValue(v); } },
      kpi: function (id, value, tone) {
        var n = kpiNodes[id];
        if (!n) { return; }
        n.value.textContent = value;
        if (tone) { n.root.setAttribute('data-state', tone); }
        else { n.root.removeAttribute('data-state'); }
      },
      log: null,
      extras: {}
    };

    /* header */
    var actions = el('div', { class: 'lab__actions' }, (def.actions || []).map(function (a) {
      return el('button', {
        type: 'button', class: 'lab-btn' + (a.primary ? ' primary' : ''), text: a.label,
        onclick: function () { a.run(api); }
      });
    }));
    var head = el('div', { class: 'lab__head' }, [
      el('div', { class: 'lab__title' }, [
        el('span', { class: 'lab__badge', text: def.badge || 'Interactive' }),
        el('strong', { text: def.title || 'Model' })
      ]),
      actions
    ]);

    /* stage */
    var stage = el('div', { class: 'lab__stage' });

    (def.kpis || []).length && (function () {
      var wrap = el('div', { class: 'lab__kpis' });
      def.kpis.forEach(function (k) {
        var value = el('b', { text: k.value || '—' });
        var root = el('div', { class: 'lab-kpi' }, [value, el('span', { text: k.label })]);
        if (k.tone) { root.setAttribute('data-state', k.tone); }
        kpiNodes[k.id] = { root: root, value: value };
        wrap.appendChild(root);
      });
      stage.appendChild(wrap);
    })();

    (def.plots || []).forEach(function (p) {
      var canvas = el('canvas', { role: 'img', 'aria-label': p.aria || p.caption || 'Model plot' });
      var legend = p.legend
        ? el('div', { class: 'lab__legend' }, p.legend.map(function (l) {
            return el('span', { style: 'color:' + (l.color || 'var(--accent)') }, [
              el('i', { class: l.dash ? 'dash' : '', 'aria-hidden': 'true' }),
              el('span', { text: l.label, style: 'color:var(--txt-3)' })
            ]);
          }))
        : null;
      var cap = el('div', { class: 'lab__plot-cap' }, [
        el('span', { text: p.caption || '' }),
        legend
      ]);
      var box = el('div', { class: 'lab__plot' }, [canvas, cap]);
      stage.appendChild(box);
      plots[p.id] = new Plot(canvas, p);
    });

    if (def.scene) {
      var scene = el('div', { class: 'lab__scene' });
      stage.appendChild(scene);
      api.scene = scene;
    }

    if (def.log) {
      var logBox = el('div', { class: 'lab-log', role: 'log', 'aria-live': 'polite' });
      stage.appendChild(logBox);
      api.log = function (text, level) {
        var row = el('div', { 'data-level': level || '' }, [
          el('time', { text: api.logClock || '' }),
          el('span', { text: text })
        ]);
        logBox.insertBefore(row, logBox.firstChild);
        while (logBox.children.length > 60) { logBox.removeChild(logBox.lastChild); }
      };
      api.clearLog = function () { logBox.innerHTML = ''; };
    }

    if (def.extra) { def.extra(api, stage); }

    /* control rail */
    var rail = el('div', { class: 'lab__controls' });
    var currentGroup = [];
    var groupTitle = null;
    function flush() {
      if (currentGroup.length) { rail.appendChild(group(groupTitle, currentGroup)); }
      currentGroup = [];
    }
    (def.controls || []).forEach(function (c) {
      if (c.type === 'heading') { flush(); groupTitle = c.label; return; }
      var node;
      if (c.type === 'range') { node = range(c, change); }
      else if (c.type === 'switch') { node = toggle(c, change); }
      else if (c.type === 'select') { node = select(c, change); }
      else if (c.type === 'preset') { node = presets(c, change); }
      else { return; }
      widgets[c.id] = node;
      currentGroup.push(node);
    });
    flush();

    var body = el('div', { class: 'lab__body' }, [stage, rail]);
    var foot = el('div', { class: 'lab__foot' }, [
      el('b', { text: 'Model scope: ' }),
      el('span', { text: def.note || '' })
    ]);

    host.innerHTML = '';
    host.appendChild(head);
    host.appendChild(body);
    host.appendChild(foot);

    function change(id, value) {
      state[id] = value;
      if (widgets[id] && widgets[id].setValue && (id in state)) { widgets[id].setValue(value); }
      if (def.onChange) { def.onChange(api, id, value); }
      render();
    }
    api.change = change;

    function render() {
      Object.keys(plots).forEach(function (k) { plots[k].resize(); });
      refreshPalette();
      api.palette = palette;
      if (def.render) { def.render(api); }
    }
    api.render = render;

    if (def.init) { def.init(api); }
    render();

    /* keep canvases sharp through layout and theme changes */
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () { render(); });
      ro.observe(host);
    } else {
      window.addEventListener('resize', render);
    }
    window.addEventListener('vn:themechange', function () {
      refreshPalette();
      api.palette = palette;
      render();
    });
  }

  window.VNLab = {
    Plot: Plot,
    el: el,
    css: css,
    register: function (name, def) {
      registry[name] = def;
      (pending[name] || []).forEach(function (host) { mount(name, def, host); });
      pending[name] = [];
    }
  };

  /* ---------- discover and load ---------- */
  var hosts = Array.prototype.slice.call(document.querySelectorAll('[data-lab]'));
  var wanted = {};
  hosts.forEach(function (host) {
    var name = host.getAttribute('data-lab');
    if (!name) { return; }
    host.innerHTML = '<p class="lab__fallback">Loading interactive model…</p>';
    if (registry[name]) { mount(name, registry[name], host); return; }
    pending[name] = (pending[name] || []).concat([host]);
    wanted[name] = true;
  });

  Object.keys(wanted).forEach(function (name) {
    var s = document.createElement('script');
    s.src = new URL(name + '.js', base).href;
    s.async = true;
    s.onerror = function () {
      (pending[name] || []).forEach(function (host) {
        host.innerHTML = '<p class="lab__fallback">The interactive model could not load. ' +
          'The case study below is complete without it.</p>';
      });
    };
    document.head.appendChild(s);
  });
})();
