/* ASTRA-OS — command / telemetry framing and fault response.

   Builds a real frame, computes a real CRC-16/CCITT-FALSE over it, lets you
   corrupt it, and runs the ground-segment acceptance checks in order. The
   FDIR side steps a small state machine from injected subsystem faults. */
(function () {
  'use strict';

  var SYNC = [0x1A, 0xCF];
  var APIDS = {
    tc_nop:    { id: 0x001, name: 'TC_NOP', payload: [] },
    tc_mode:   { id: 0x011, name: 'TC_SET_MODE', payload: [0x02] },
    tm_hk:     { id: 0x081, name: 'TM_HOUSEKEEPING', payload: [0x27, 0x10, 0x00, 0xB4, 0x1F, 0x3A, 0x00, 0x64] },
    tm_event:  { id: 0x0A2, name: 'TM_EVENT', payload: [0x04, 0x00, 0x12, 0x9C] }
  };

  /* CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection. */
  function crc16(bytes) {
    var c = 0xFFFF;
    for (var i = 0; i < bytes.length; i++) {
      c ^= (bytes[i] & 0xFF) << 8;
      for (var b = 0; b < 8; b++) {
        c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
      }
    }
    return c & 0xFFFF;
  }

  function build(s) {
    var spec = APIDS[s.packet];
    var body = [
      (spec.id >> 8) & 0xFF, spec.id & 0xFF,
      (s.seq >> 8) & 0xFF, s.seq & 0xFF,
      spec.payload.length
    ].concat(spec.payload);
    var frame = SYNC.concat(body);
    var c = crc16(body);
    frame.push((c >> 8) & 0xFF, c & 0xFF);
    return { frame: frame, headerLen: 2, bodyLen: body.length, crc: c, spec: spec };
  }

  /* Corruptions are applied to the wire copy only, exactly as a link fault
     would present them to the receiver. */
  function corrupt(built, s) {
    var wire = built.frame.slice();
    var notes = [];
    if (s.bitflip) {
      var idx = Math.min(s.flipByte, wire.length - 1);
      wire[idx] ^= (1 << (s.flipBit & 7));
      notes.push('bit ' + (s.flipBit & 7) + ' flipped in byte ' + idx);
    }
    if (s.truncate) { wire = wire.slice(0, Math.max(3, wire.length - 2)); notes.push('2 trailing bytes lost'); }
    if (s.badSync) { wire[0] = 0x00; notes.push('sync word corrupted'); }
    return { wire: wire, notes: notes };
  }

  /* Ground-segment acceptance, in the order a receiver actually applies it. */
  function validate(wire, built) {
    var checks = [];
    var ok = true;

    var syncOk = wire.length >= 2 && wire[0] === SYNC[0] && wire[1] === SYNC[1];
    checks.push({ t: 'Sync word 0x1ACF', ok: syncOk });
    if (!syncOk) { return { checks: checks, accepted: false, reason: 'sync_mismatch' }; }

    var lenOk = wire.length >= 9;
    checks.push({ t: 'Minimum frame length', ok: lenOk });
    if (!lenOk) { return { checks: checks, accepted: false, reason: 'frame_too_short' }; }

    var declared = wire[6];
    var expected = 2 + 5 + declared + 2;
    var fieldOk = wire.length === expected;
    checks.push({ t: 'Declared length ' + declared + ' B matches frame', ok: fieldOk });
    if (!fieldOk) { return { checks: checks, accepted: false, reason: 'length_field_mismatch' }; }

    var body = wire.slice(2, wire.length - 2);
    var received = (wire[wire.length - 2] << 8) | wire[wire.length - 1];
    var computed = crc16(body);
    var crcOk = received === computed;
    checks.push({
      t: 'CRC-16 0x' + hex4(computed) + ' vs 0x' + hex4(received), ok: crcOk
    });
    if (!crcOk) { return { checks: checks, accepted: false, reason: 'crc_mismatch', computed: computed, received: received }; }

    var apid = (wire[2] << 8) | wire[3];
    var known = Object.keys(APIDS).some(function (k) { return APIDS[k].id === apid; });
    checks.push({ t: 'APID 0x' + hex3(apid) + ' routable', ok: known });
    if (!known) { return { checks: checks, accepted: false, reason: 'unknown_apid' }; }

    return { checks: checks, accepted: ok, reason: 'accepted', computed: computed, received: received };
  }

  function hex2(v) { return ('0' + v.toString(16).toUpperCase()).slice(-2); }
  function hex3(v) { return ('00' + v.toString(16).toUpperCase()).slice(-3); }
  function hex4(v) { return ('000' + v.toString(16).toUpperCase()).slice(-4); }

  /* FDIR: faults escalate; recovery needs the fault cleared. */
  function fdir(s, accepted) {
    var faults = [];
    if (s.fWatchdog) { faults.push({ id: 'WATCHDOG_TIMEOUT', sev: 'critical' }); }
    if (s.fPower) { faults.push({ id: 'BUS_UNDERVOLTAGE', sev: 'critical' }); }
    if (s.fThermal) { faults.push({ id: 'THERMAL_LIMIT', sev: 'major' }); }
    if (s.fSensor) { faults.push({ id: 'SENSOR_STALE', sev: 'major' }); }
    if (!accepted) { faults.push({ id: 'UPLINK_FRAME_REJECTED', sev: 'minor' }); }

    var critical = faults.filter(function (f) { return f.sev === 'critical'; }).length;
    var major = faults.filter(function (f) { return f.sev === 'major'; }).length;

    var mode = 'NOMINAL';
    if (critical > 0) { mode = 'SAFE'; }
    else if (major > 1) { mode = 'SAFE'; }
    else if (major === 1) { mode = 'DEGRADED'; }
    return { mode: mode, faults: faults, critical: critical, major: major };
  }

  window.VNLab.register('astra', {
    title: 'Frame a packet, corrupt it, watch the checks fail',
    note: 'The CRC-16/CCITT-FALSE, the frame layout and the acceptance order are the real ones; the bytes are ' +
          'computed live in your browser. This shows how the protocol rejects a damaged uplink and how FDIR ' +
          'escalates — it is not the flight build. The 9/9 CTest suites and the aarch64 target evidence above ' +
          'come from the repository, not from this page.',
    controls: [
      { type: 'heading', label: 'Packet' },
      { type: 'select', id: 'packet', label: 'Frame type', value: 'tm_hk', options: [
        { v: 'tc_nop', t: 'TC_NOP' },
        { v: 'tc_mode', t: 'TC_SET_MODE' },
        { v: 'tm_hk', t: 'TM_HOUSEKEEPING' },
        { v: 'tm_event', t: 'TM_EVENT' }
      ] },
      { type: 'range', id: 'seq', label: 'Sequence count', min: 0, max: 4095, step: 1, value: 1042, decimals: 0 },
      { type: 'heading', label: 'Link corruption' },
      { type: 'switch', id: 'bitflip', label: 'Single-bit flip', value: false },
      { type: 'range', id: 'flipByte', label: 'Byte index', min: 0, max: 15, step: 1, value: 8, decimals: 0 },
      { type: 'range', id: 'flipBit', label: 'Bit index', min: 0, max: 7, step: 1, value: 3, decimals: 0 },
      { type: 'switch', id: 'truncate', label: 'Truncate frame', value: false },
      { type: 'switch', id: 'badSync', label: 'Corrupt sync word', value: false },
      { type: 'heading', label: 'Fault injection' },
      { type: 'switch', id: 'fWatchdog', label: 'Watchdog timeout', value: false },
      { type: 'switch', id: 'fPower', label: 'Bus undervoltage', value: false },
      { type: 'switch', id: 'fThermal', label: 'Thermal limit', value: false },
      { type: 'switch', id: 'fSensor', label: 'Stale sensor', value: false }
    ],
    kpis: [
      { id: 'verdict', label: 'Frame verdict' },
      { id: 'crc', label: 'CRC-16 computed' },
      { id: 'mode', label: 'FDIR mode' },
      { id: 'size', label: 'Frame size' }
    ],
    extra: function (api, stage) {
      var el = api.el;
      api.extras.hex = el('div', { class: 'lab-log', style: 'max-height:8rem;padding:.6rem .7rem;line-height:1.8;word-break:break-all' });
      api.extras.checks = el('table', { class: 'lab-table' });
      stage.appendChild(el('div', { class: 'lab__plot' }, [
        api.extras.hex,
        el('div', { class: 'lab__plot-cap' }, [el('span', { text: 'Frame on the wire' })])
      ]));
      stage.appendChild(el('div', { class: 'lab__plot' }, [
        api.extras.checks,
        el('div', { class: 'lab__plot-cap' }, [el('span', { text: 'Ground-segment acceptance chain' })])
      ]));
    },
    render: function (api) {
      var s = api.state, el = api.el;
      var built = build(s);
      var bad = corrupt(built, s);
      var v = validate(bad.wire, built);
      var f = fdir(s, v.accepted);

      /* hex dump, with corrupted bytes marked */
      var changed = {};
      bad.wire.forEach(function (b, i) {
        if (built.frame[i] === undefined || built.frame[i] !== b) { changed[i] = true; }
      });
      api.extras.hex.innerHTML = '';
      bad.wire.forEach(function (b, i) {
        api.extras.hex.appendChild(el('span', {
          text: hex2(b) + ' ',
          style: changed[i]
            ? 'color:var(--danger);font-weight:600'
            : (i < 2 ? 'color:var(--accent)' : (i >= bad.wire.length - 2 ? 'color:var(--ok)' : 'color:var(--txt-2)'))
        }));
      });
      if (bad.wire.length < built.frame.length) {
        api.extras.hex.appendChild(el('span', {
          text: '·· '.repeat(built.frame.length - bad.wire.length),
          style: 'color:var(--danger);opacity:.6'
        }));
      }

      api.extras.checks.innerHTML = '';
      var head = el('tr', {}, [el('th', { text: 'Acceptance check' }), el('th', { text: 'Result' })]);
      api.extras.checks.appendChild(el('thead', {}, [head]));
      var tb = el('tbody');
      v.checks.forEach(function (c) {
        tb.appendChild(el('tr', { 'data-hit': String(!c.ok) }, [
          el('td', { text: c.t }),
          el('td', { text: c.ok ? 'PASS' : 'REJECT',
            style: 'color:' + (c.ok ? 'var(--ok)' : 'var(--danger)') + ';font-weight:600' })
        ]));
      });
      if (f.faults.length) {
        f.faults.forEach(function (x) {
          tb.appendChild(el('tr', {}, [
            el('td', { text: 'FDIR · ' + x.id }),
            el('td', { text: x.sev.toUpperCase(),
              style: 'color:' + (x.sev === 'critical' ? 'var(--danger)' : (x.sev === 'major' ? 'var(--warn)' : 'var(--txt-3)')) })
          ]));
        });
      }
      api.extras.checks.appendChild(tb);

      api.kpi('verdict', v.accepted ? 'ACCEPTED' : v.reason.toUpperCase().replace(/_/g, ' '),
        v.accepted ? 'ok' : 'bad');
      api.kpi('crc', '0x' + hex4(built.crc));
      api.kpi('mode', f.mode, f.mode === 'NOMINAL' ? 'ok' : (f.mode === 'DEGRADED' ? 'warn' : 'bad'));
      api.kpi('size', bad.wire.length + ' B');
    }
  });
})();
