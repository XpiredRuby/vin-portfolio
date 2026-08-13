#!/usr/bin/env python3
"""Generate consistent technical block diagrams as standalone SVG files."""
import os

OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

C = {
    "bg": "#05070A", "panel": "#0B0E14", "line": "#28313F", "line2": "#3A4657",
    "txt": "#E7ECF3", "dim": "#98A4B6", "mute": "#616E82", "faint": "#414C5C",
    "blue": "#2B7FFF", "cyan": "#22D3EE", "orange": "#FF7A18", "green": "#35D08A",
}
MONO = "'JetBrains Mono', ui-monospace, monospace"


def head(w, h, title):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}" font-family="{MONO}">
<defs>
  <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0L10 5L0 10z" fill="{C['line2']}"/>
  </marker>
  <marker id="ac" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0L10 5L0 10z" fill="{C['cyan']}"/>
  </marker>
  <marker id="ao" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0L10 5L0 10z" fill="{C['orange']}"/>
  </marker>
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M20 0H0V20" fill="none" stroke="#FFFFFF" stroke-opacity="0.028" stroke-width="1"/>
  </pattern>
</defs>
<rect width="{w}" height="{h}" fill="{C['bg']}"/>
<rect width="{w}" height="{h}" fill="url(#grid)"/>'''


def box(x, y, w, h, label, sub=None, accent="line", fill="panel", dash=False):
    stroke = C.get(accent, accent)
    o = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2" fill="{C[fill]}" stroke="{stroke}" stroke-width="1"'
    o += ' stroke-dasharray="4 3"' if dash else ''
    o += '/>'
    cx = x + w / 2
    if sub:
        o += txt(cx, y + h / 2 - 3, label, 11, C["txt"], w=500)
        o += txt(cx, y + h / 2 + 12, sub, 9, C["mute"])
    else:
        o += txt(cx, y + h / 2 + 4, label, 11, C["txt"], w=500)
    return o


def txt(x, y, s, size=10, fill=None, anchor="middle", w=400, ls="0.04em"):
    fill = fill or C["dim"]
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
            f'font-weight="{w}" letter-spacing="{ls}">{s}</text>')


def arrow(x1, y1, x2, y2, color="line2", marker="a", dash=False, label=None, lx=None, ly=None):
    o = (f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{C[color] if color in C else color}" stroke-width="1" '
         f'fill="none" marker-end="url(#{marker})"')
    o += ' stroke-dasharray="4 3"' if dash else ''
    o += '/>'
    if label:
        o += txt(lx if lx is not None else (x1 + x2) / 2, ly if ly is not None else (y1 + y2) / 2 - 6,
                 label, 8.5, C["faint"])
    return o


def path(d, color="line2", marker="a", dash=False):
    o = f'<path d="{d}" stroke="{C[color]}" stroke-width="1" fill="none" marker-end="url(#{marker})"'
    o += ' stroke-dasharray="4 3"' if dash else ''
    return o + '/>'


def caption(w, h, left, right):
    return (f'<line x1="14" y1="{h-26}" x2="{w-14}" y2="{h-26}" stroke="{C["line"]}"/>' +
            txt(16, h - 11, left, 8.5, C["faint"], anchor="start", ls="0.14em") +
            txt(w - 16, h - 11, right, 8.5, C["faint"], anchor="end", ls="0.14em"))


def write(name, body):
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(body + "\n</svg>\n")
    print("wrote", name)


# ---------------------------------------------------------------- GHOST
w, h = 880, 400
s = head(w, h, "GHOST dual-filter state estimation architecture")
s += txt(16, 26, "GHOST // DUAL-FILTER ESTIMATION ARCHITECTURE", 10, C["cyan"], anchor="start", ls="0.16em")
# sensors
s += txt(90, 60, "SENSOR LAYER", 8.5, C["faint"], ls="0.14em")
s += box(20, 72, 140, 46, "IMX296", "GLOBAL SHUTTER / 30 Hz", "line")
s += box(20, 130, 140, 46, "ICM-42688-P", "6-AXIS IMU / 200 Hz", "line")
s += box(20, 188, 140, 46, "BARO / MAG", "AUX / 20 Hz", "line", dash=True)
# front end
s += txt(275, 60, "FRONT END", 8.5, C["faint"], ls="0.14em")
s += box(205, 72, 140, 46, "AprilTag Det.", "PnP POSE SOLVE", "cyan")
s += box(205, 130, 140, 46, "Preintegration", "BIAS-COMP. Δv, Δθ", "cyan")
s += box(205, 188, 140, 46, "Gating / NIS", "χ² OUTLIER REJECT", "cyan")
# filters
s += txt(500, 60, "ESTIMATION CORE", 8.5, C["faint"], ls="0.14em")
s += box(390, 72, 220, 74, "9-STATE ESKF", "δp δv δθ  |  ERROR-STATE PROPAGATE", "blue")
s += box(390, 160, 220, 74, "IMM TRACKER", "CV / CTRV  |  MARKOV MIXING", "blue")
# output
s += txt(775, 60, "CONSUMER", 8.5, C["faint"], ls="0.14em")
s += box(700, 100, 160, 46, "MAVLink UDP", "VISION_POSITION_EST", "green")
s += box(700, 160, 160, 46, "PX4 SITL", "EKF2 / OFFBOARD", "green")
s += box(700, 220, 160, 46, "Evidence Log", "CSV + NIS PLOTS", "line")
# arrows
for y in (95, 153, 211):
    s += arrow(160, y, 203, y)
s += arrow(345, 95, 388, 100)
s += arrow(345, 153, 388, 120, label=None)
s += arrow(345, 211, 388, 190)
s += path("M610 109L700 123", "line2")
s += path("M500 146L500 160", "cyan", "ac")
s += path("M610 197L700 183", "line2")
s += path("M610 215L660 215L660 243L700 243", "line2")
# feedback loop
s += path("M700 133L672 133L672 320L280 320L280 240", "orange", "ao", dash=True)
s += txt(476, 312, "STATE FEEDBACK — REPROJECTION PRIOR TIGHTENS DETECTION SEARCH WINDOW", 8.5, C["faint"])
s += txt(500, 258, "OCCLUSION → MEASUREMENT DROPOUT → DEAD-RECKON ON IMU, INFLATE P", 8.5, C["mute"])
s += caption(w, h, "FIG. 1 — SYSTEM BLOCK DIAGRAM", "TARGET: RASPBERRY PI 4B / AARCH64")
write("ghost-architecture.svg", s)

# ---------------------------------------------------------------- ASTRA-OS
w, h = 880, 400
s = head(w, h, "ASTRA-OS native target execution and software assurance architecture")
s += txt(16, 26, "ASTRA-OS // NATIVE TARGET + ASSURANCE ARCHITECTURE", 10, C["cyan"], anchor="start", ls="0.16em")
# ground segment
s += f'<rect x="20" y="52" width="290" height="270" rx="2" fill="none" stroke="{C["line"]}" stroke-dasharray="4 3"/>'
s += txt(165, 70, "GROUND SEGMENT — PYTHON", 8.5, C["faint"], ls="0.14em")
s += box(40, 82, 250, 42, "Command Client", "CLI + YAML SCENARIO RUNNER", "cyan")
s += box(40, 134, 250, 42, "Telemetry Decoder", "CRC-16 CHECK / ACK MATCH", "cyan")
s += box(40, 186, 250, 42, "Fault Injector", "DROP / CORRUPT / DELAY", "orange")
s += box(40, 238, 250, 42, "Monte Carlo Harness", "25 SEEDED REGRESSION TRIALS", "cyan")
# link
s += f'<rect x="345" y="120" width="80" height="140" rx="2" fill="{C["panel"]}" stroke="{C["blue"]}"/>'
s += txt(385, 160, "UDP", 12, C["blue"])
s += txt(385, 178, "BINARY", 8.5, C["mute"])
s += txt(385, 192, "PACKET", 8.5, C["mute"])
s += txt(385, 212, "CRC-16", 9, C["orange"])
s += txt(385, 226, "CCITT", 8.5, C["faint"])
# flight segment
s += f'<rect x="460" y="52" width="400" height="270" rx="2" fill="none" stroke="{C["line"]}" stroke-dasharray="4 3"/>'
s += txt(660, 70, "FLIGHT SEGMENT — C++17 ON RASPBERRY PI (AARCH64)", 8.5, C["faint"], ls="0.14em")
s += box(480, 82, 175, 42, "Command Handler", "PARSE / VALIDATE / ACK", "blue")
s += box(665, 82, 175, 42, "Mode Manager", "SAFE / NOMINAL / FAULT", "blue")
s += box(480, 134, 175, 42, "Telemetry Encoder", "PACKETIZE @ 10 Hz", "blue")
s += box(665, 134, 175, 42, "Health Monitor", "LIMIT + TREND CHECK", "blue")
s += box(480, 186, 175, 42, "Watchdog", "MISSED-TICK → SAFE", "orange")
s += box(665, 186, 175, 42, "Fault Response", "FDIR STATE MACHINE", "orange")
s += box(480, 238, 360, 42, "Evidence Writer", "TIMESTAMPED LOGS → CTEST ASSERTIONS → PLOTS", "green")
s += arrow(290, 103, 343, 140, label="CMD")
s += arrow(343, 220, 292, 176, label="TLM")
s += arrow(425, 140, 478, 103)
s += arrow(478, 155, 427, 200)
s += path("M655 103L663 103", "line2")
s += path("M567 124L567 132", "line2")
s += path("M752 124L752 132", "line2")
s += path("M567 176L567 184", "line2")
s += path("M752 176L752 184", "line2")
s += path("M567 228L567 236", "green", "a")
s += path("M752 228L752 236", "green", "a")
s += caption(w, h, "FIG. 1 - TARGET EXECUTION TOPOLOGY", "NATIVE RASPBERRY PI EXECUTION / NOT HIL")
write("astrasim-architecture.svg", s)

# ---------------------------------------------------------------- Rocket GNC
w, h = 880, 320
s = head(w, h, "Planned rocket landing GNC architecture; current evidence is a point-mass prototype")
s += txt(16, 26, "ROCKET LANDING GNC // PLANNED ARCHITECTURE", 10, C["cyan"], anchor="start", ls="0.16em")
s += txt(440, 45, "FUTURE-FIDELITY BLOCKS / NOT THE IMPLEMENTED BASELINE", 8.5, C["orange"], w=500, ls="0.12em")
s += box(20, 150, 130, 52, "GUIDANCE", "REF. TRAJECTORY", "cyan")
s += box(185, 150, 130, 52, "CONTROL", "PID → TVC CMD", "blue")
s += box(350, 150, 130, 52, "ACTUATOR", "PLANNED GIMBAL", "line", dash=True)
s += box(515, 150, 150, 52, "6-DOF PLANT", "PLANNED RIGID BODY", "orange", dash=True)
s += box(700, 150, 150, 52, "NAVIGATION", "PLANNED ESTIMATE", "line", dash=True)
for x in (150, 315, 480, 665):
    s += arrow(x, 176, x + 33, 176)
# disturbances
s += box(515, 60, 150, 42, "WIND (PLANNED)", "SEEDED DRAW / N TBD", "orange", dash=True)
s += path("M590 102L590 148", "orange", "ao")
s += box(700, 60, 150, 42, "SENSORS (PLANNED)", "NOISE + BIAS", "orange", dash=True)
s += path("M775 102L775 148", "orange", "ao")
# feedback
s += path("M775 202L775 260L85 260L85 204", "cyan", "ac")
s += txt(430, 254, "FEEDBACK — ESTIMATED STATE x̂ = [r, v, q, ω, m]", 9, C["mute"])
# aero heating branch
s += box(350, 60, 130, 42, "AERO (PLANNED)", "SCREENING MODEL", "line", dash=True)
s += path("M415 102L415 148", "line2", dash=True)
s += box(20, 60, 130, 42, "MISSION PROFILE", "ENTRY → LANDING", "line")
s += path("M85 102L85 148", "line2")
s += caption(w, h, "FIG. 1 — PLANNED GNC ARCHITECTURE", "CURRENT EVIDENCE: POINT MASS / 1 NOMINAL RUN")
write("gnc-loop.svg", s)

# ---------------------------------------------------------------- Interceptor
w, h = 880, 320
s = head(w, h, "Reported interception pipeline timing allocation; no public raw timing trace")
s += txt(16, 26, "INTERCEPTOR // REPORTED PIPELINE ALLOCATION", 10, C["cyan"], anchor="start", ls="0.16em")
stages = [
    (20, "CAMERA", "FRAME CAPTURE", "line", "8 ms"),
    (190, "YOLO", "DETECT + NMS", "cyan", "52 ms"),
    (360, "KALMAN", "PREDICT/UPDATE", "blue", "2 ms"),
    (530, "PID", "AZ/EL ERROR LAW", "blue", "1 ms"),
    (700, "PWM DRIVE", "MOTOR COMMAND", "green", "4 ms"),
]
for x, a, b, col, t in stages:
    s += box(x, 110, 150, 56, a, b, col)
    s += txt(x + 75, 188, t, 9, C["orange"])
    if x > 20:
        s += arrow(x - 20, 138, x - 3, 138)
s += txt(440, 68, "REPORTED VALUES / NO PUBLIC RAW TIMING TRACE", 9, C["orange"], w=500, ls="0.10em")
s += txt(440, 86, "END-TO-END DESIGN TARGET: &lt; 100 ms", 9.5, C["txt"], w=500)
s += f'<rect x="20" y="205" width="830" height="26" rx="2" fill="{C["panel"]}" stroke="{C["line"]}"/>'
xc = 20
for frac, col, lbl in [(0.12, "line2", ""), (0.76, "cyan", "INFERENCE ~76% / REPORTED"), (0.03, "blue", ""), (0.03, "blue", ""), (0.06, "green", "")]:
    wpx = 830 * frac
    s += f'<rect x="{xc:.1f}" y="205" width="{wpx:.1f}" height="26" fill="{C[col]}" fill-opacity="0.28"/>'
    if lbl:
        s += txt(xc + wpx / 2, 222, lbl, 9, C["cyan"])
    xc += wpx
s += txt(435, 253, "REPORTED NARRATIVE: INFERENCE DOMINATED THE BUDGET", 8.5, C["faint"])
s += caption(w, h, "FIG. 1 — REPORTED TIMING ALLOCATION", "PUBLIC SOURCE + RAW TRACE UNAVAILABLE")
write("interceptor-pipeline.svg", s)

# ---------------------------------------------------------------- AeroFrame-DT
w, h = 880, 380
s = head(w, h, "AeroFrame-DT synthetic fitting analysis workflow")
s += txt(16, 26, "AEROFRAME-DT // SYNTHETIC LOAD PATH + FEA WORKFLOW", 10, C["cyan"], anchor="start", ls="0.16em")
# fuselage / wing wireframe
s += f'<ellipse cx="440" cy="120" rx="300" ry="26" fill="none" stroke="{C["line2"]}"/>'
s += f'<path d="M200 120L440 62L680 120L440 178Z" fill="none" stroke="{C["line2"]}" stroke-dasharray="3 3"/>'
for i in range(9):
    x = 200 + i * 60
    s += f'<line x1="{x}" y1="{120 - abs(440-x)*0.24:.0f}" x2="{x}" y2="{120 + abs(440-x)*0.24:.0f}" stroke="{C["line"]}"/>'
s += f'<line x1="200" y1="120" x2="680" y2="120" stroke="{C["cyan"]}" stroke-width="1.2"/>'
s += txt(440, 112, "PRIMARY SPAR — LOAD PATH", 9, C["cyan"])
# load arrows
for x in (260, 350, 530, 620):
    s += f'<path d="M{x} 210L{x} 178" stroke="{C["orange"]}" stroke-width="1" marker-end="url(#ao)"/>'
s += txt(440, 226, "DISTRIBUTED LIFT — 2.5 g LIMIT MANOEUVRE", 9, C["orange"])
# hotspots
for cx, cy, lbl in [(268, 120, "HS-1"), (440, 78, "HS-2"), (612, 120, "HS-3")]:
    s += f'<circle cx="{cx}" cy="{cy}" r="9" fill="none" stroke="{C["orange"]}"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="3" fill="{C["orange"]}"/>'
    s += txt(cx, cy - 16, lbl, 8.5, C["orange"])
s += txt(440, 258, "3 STRESS CONCENTRATION SITES IDENTIFIED — ROOT JOINT, UPPER SKIN, ATTACH LUG", 8.5, C["faint"])
# workflow strip
y = 285
for i, (x, lbl) in enumerate([(20, "CAD ASSEMBLY"), (190, "MESH + BC"), (360, "STATIC 2.5g"), (530, "THERMAL"), (700, "MODAL")]):
    s += box(x, y, 150, 34, lbl, None, "blue" if i in (2, 3, 4) else "line")
    if x > 20:
        s += arrow(x - 20, y + 17, x - 3, y + 17)
s += caption(w, h, "FIG. 1 — LOAD PATH SCHEMATIC (NOT TO SCALE)", "SYNTHETIC FITTING / EDUCATIONAL NON-OEM")
write("md11-structures.svg", s)

# ---------------------------------------------------------------- SPIRIT lifecycle
w, h = 880, 300
s = head(w, h, "ISS payload systems engineering review lifecycle")
s += txt(16, 26, "TAMU-SPIRIT // NASA PAYLOAD REVIEW LIFECYCLE", 10, C["cyan"], anchor="start", ls="0.16em")
gates = [
    (20, "SCR", "SYSTEM CONCEPT", "green", "COMPLETE"),
    (185, "SRR", "REQUIREMENTS", "green", "COMPLETE"),
    (350, "PDR", "PRELIM. DESIGN", "green", "COMPLETE"),
    (515, "CDR", "CRITICAL DESIGN", "orange", "IN WORK"),
    (680, "FLIGHT", "DRAGON / ISS", "line", "SEP 2028"),
]
s += f'<line x1="95" y1="150" x2="755" y2="150" stroke="{C["line"]}"/>'
for x, a, b, col, st in gates:
    s += box(x, 118, 150, 64, a, b, col)
    s += txt(x + 75, 200, st, 8.5, C[col] if col in C else C["mute"], ls="0.12em")
    if x > 20:
        s += arrow(x - 20, 150, x - 3, 150)
s += txt(440, 88, "4 ISS-BOUND EXPERIMENTS — 8-PERSON ENGINEERING TEAM — 100% MILESTONE COMPLIANCE", 9.5, C["txt"], w=500)
s += box(20, 226, 400, 36, "ENGINEERING CHANGE REQUESTS", "CONFIGURATION CONTROL + TRACEABILITY", "line")
s += box(450, 226, 400, 36, "THERMAL TRADE — DASH PAYLOAD", "−120 °C to +120 °C LEO CYCLING", "line")
s += caption(w, h, "FIG. 1 — REVIEW GATE SEQUENCE", "AEGIS AEROSPACE / NASA JSC STAKEHOLDERS")
write("spirit-lifecycle.svg", s)

# ---------------------------------------------------------------- ESKF timing
w, h = 880, 300
s = head(w, h, "Error state Kalman filter propagate and update timing")
s += txt(16, 26, "ESKF // ASYNCHRONOUS PROPAGATE-UPDATE SCHEDULE", 10, C["cyan"], anchor="start", ls="0.16em")
s += f'<line x1="40" y1="150" x2="840" y2="150" stroke="{C["line2"]}"/>'
for i in range(21):
    x = 40 + i * 40
    s += f'<line x1="{x}" y1="146" x2="{x}" y2="154" stroke="{C["line"]}"/>'
    s += f'<line x1="{x}" y1="150" x2="{x}" y2="118" stroke="{C["blue"]}" stroke-opacity="0.5"/>'
    s += f'<circle cx="{x}" cy="118" r="2.5" fill="{C["blue"]}"/>'
for i in range(4):
    x = 40 + i * 200 + 80
    s += f'<line x1="{x}" y1="150" x2="{x}" y2="196" stroke="{C["cyan"]}"/>'
    s += f'<circle cx="{x}" cy="196" r="3.5" fill="{C["cyan"]}"/>'
s += txt(60, 104, "IMU PROPAGATE @ 200 Hz — NOMINAL STATE INTEGRATION + COVARIANCE PREDICT", 9, C["blue"], anchor="start")
s += txt(60, 218, "VISION UPDATE @ 30 Hz — APRILTAG PnP → INNOVATION → ERROR-STATE INJECT → RESET", 9, C["cyan"], anchor="start")
s += f'<rect x="500" y="132" width="160" height="36" fill="{C["orange"]}" fill-opacity="0.1" stroke="{C["orange"]}" stroke-dasharray="4 3"/>'
s += txt(580, 154, "OCCLUSION WINDOW", 9, C["orange"])
s += txt(580, 244, "NO VISION UPDATE → COVARIANCE GROWS → NIS GATE REOPENS ON REACQUISITION", 8.5, C["faint"])
s += caption(w, h, "FIG. 2 — FILTER TIMING", "TIME →")
write("eskf-timing.svg", s)
