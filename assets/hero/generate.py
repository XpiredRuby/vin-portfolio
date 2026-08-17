#!/usr/bin/env python3
"""
Generate hero artwork for each project page.

These are ILLUSTRATIONS, not plots of measured data. Nothing here is presented
as a result; the real results live in the case-study text and in the repos.
"""
import os, math

OUT = os.path.dirname(os.path.abspath(__file__))
W, H = 1200, 675

C = {
    "bg0": "#070A0F", "bg1": "#0C1219", "grid": "#FFFFFF",
    "line": "#2A3444", "line2": "#3E4C60",
    "txt": "#E7ECF3", "dim": "#8895AA", "faint": "#4A5768",
    "blue": "#2B7FFF", "cyan": "#22D3EE", "orange": "#FF7A18",
    "green": "#35D08A", "violet": "#8B7CFF",
}


def head(accent, title, sub):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"
     role="img" aria-label="{title}. {sub}" font-family="'JetBrains Mono', ui-monospace, monospace">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="{C['bg1']}"/><stop offset="100%" stop-color="{C['bg0']}"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%">
    <stop offset="0%" stop-color="{accent}" stop-opacity="0.30"/>
    <stop offset="70%" stop-color="{accent}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="accentFade" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="{accent}" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="{accent}" stop-opacity="0.05"/>
  </linearGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#1A2230"/><stop offset="45%" stop-color="#39465C"/>
    <stop offset="55%" stop-color="#2A3444"/><stop offset="100%" stop-color="#141B26"/>
  </linearGradient>
  <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="14"/>
  </filter>
  <filter id="soft2" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="4"/>
  </filter>
  <pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse">
    <path d="M30 0H0V30" fill="none" stroke="{C['grid']}" stroke-opacity="0.030" stroke-width="1"/>
  </pattern>
  <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.45"/>
  </linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>
<rect width="{W}" height="{H}" fill="url(#g)"/>'''


def foot(accent, tag, title):
    return f'''
<rect width="{W}" height="{H}" fill="url(#vig)"/>
<rect x="0" y="{H-4}" width="{W}" height="4" fill="{accent}" opacity="0.85"/>
<text x="48" y="72" font-size="16" fill="{accent}" letter-spacing="0.22em">{tag}</text>
<text x="48" y="104" font-size="15" fill="{C['faint']}" letter-spacing="0.14em">{title}</text>
</svg>
'''


def txt(x, y, s, size=14, fill=None, anchor="start", ls="0.1em", w=400):
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill or C["dim"]}" '
            f'text-anchor="{anchor}" letter-spacing="{ls}" font-weight="{w}">{s}</text>')


def write(name, body):
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(body)
    print("wrote", name)


# ------------------------------------------------------------------ GHOST-X
a = C["cyan"]
s = head(a, "GHOST-X", "Target estimation through visual occlusion; non-VIO")
s += f'<circle cx="760" cy="330" r="330" fill="url(#glow)"/>'
# ground plane perspective
for i in range(12):
    y = 470 + i * i * 1.6
    if y > H: break
    s += f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="{C["line"]}" stroke-opacity="{0.30 - i*0.02:.2f}"/>'
for i in range(-8, 9):
    s += f'<line x1="{600 + i*150}" y1="470" x2="{600 + i*620}" y2="{H}" stroke="{C["line"]}" stroke-opacity="0.13"/>'
# tag markers on the ground
for tx, ty, sz in [(430, 545, 26), (700, 585, 34), (960, 520, 22)]:
    s += f'<rect x="{tx}" y="{ty}" width="{sz}" height="{sz}" fill="none" stroke="{a}" stroke-opacity="0.75"/>'
    s += f'<rect x="{tx+sz*0.28:.0f}" y="{ty+sz*0.28:.0f}" width="{sz*0.44:.0f}" height="{sz*0.44:.0f}" fill="{a}" fill-opacity="0.55"/>'
# camera cone from vehicle
s += f'<path d="M700 300 L440 552 L742 596 Z" fill="{a}" fill-opacity="0.08" stroke="{a}" stroke-opacity="0.35"/>'
# occlusion column
s += f'<rect x="800" y="300" width="120" height="300" fill="{C["bg0"]}" fill-opacity="0.92" stroke="{C["orange"]}" stroke-opacity="0.5" stroke-dasharray="6 5"/>'
s += txt(860, 470, "OCCLUSION", 12, C["orange"], anchor="middle", ls="0.16em")
# quadrotor
s += f'<g filter="url(#soft2)"><ellipse cx="700" cy="300" rx="150" ry="26" fill="{a}" fill-opacity="0.18"/></g>'
for dx, dy in [(-92, -34), (92, -34), (-92, 34), (92, 34)]:
    s += f'<ellipse cx="{700+dx}" cy="{300+dy}" rx="62" ry="12" fill="none" stroke="{C["line2"]}" stroke-width="2"/>'
    s += f'<line x1="700" y1="300" x2="{700+dx}" y2="{300+dy}" stroke="url(#metal)" stroke-width="9" stroke-linecap="round"/>'
s += f'<rect x="662" y="278" width="76" height="44" rx="8" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<circle cx="700" cy="300" r="9" fill="{a}"/><circle cx="700" cy="300" r="16" fill="none" stroke="{a}" stroke-opacity="0.5"/>'
# trajectory
s += f'<path d="M120 400 C 300 250, 460 470, 700 300" fill="none" stroke="{a}" stroke-width="2" stroke-opacity="0.55" stroke-dasharray="2 8" stroke-linecap="round"/>'
s += foot(a, "PRJ-01 / GHOST-X", "TARGET ESTIMATION / HARDWARE + SOFTWARE EVIDENCE / NON-VIO")
write("ghost.svg", s)

# ------------------------------------------------------------------ ASTRA-OS
a = C["green"]
s = head(a, "ASTRA-OS", "Native Raspberry Pi target execution and software assurance")
s += f'<circle cx="880" cy="340" r="300" fill="url(#glow)"/>'
# board
s += f'<rect x="620" y="200" width="440" height="290" rx="10" fill="#0E1A16" stroke="{a}" stroke-opacity="0.45"/>'
for i in range(9):
    s += f'<line x1="{648+i*48}" y1="200" x2="{648+i*48}" y2="490" stroke="{a}" stroke-opacity="0.07"/>'
for i in range(6):
    s += f'<line x1="620" y1="{228+i*48}" x2="1060" y2="{228+i*48}" stroke="{a}" stroke-opacity="0.07"/>'
# SoC
s += f'<rect x="770" y="290" width="120" height="110" rx="4" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += txt(830, 352, "FSW", 22, C["txt"], anchor="middle", ls="0.1em", w=600)
for i in range(7):
    s += f'<rect x="{778+i*16}" y="278" width="6" height="12" fill="{C["line2"]}"/>'
    s += f'<rect x="{778+i*16}" y="400" width="6" height="12" fill="{C["line2"]}"/>'
# header pins
for i in range(20):
    s += f'<rect x="{648+i*20}" y="216" width="8" height="8" rx="1" fill="{C["line2"]}"/>'
# packets travelling left to right
s += f'<path d="M120 345 H600" stroke="{C["line"]}" stroke-width="2"/>'
for i, x in enumerate([150, 240, 330, 420, 510]):
    col = C["orange"] if i == 2 else a
    s += f'<rect x="{x}" y="330" width="56" height="30" rx="3" fill="{col}" fill-opacity="0.16" stroke="{col}" stroke-opacity="0.8"/>'
    s += txt(x + 28, 350, "CRC" if i == 2 else "PKT", 11, col, anchor="middle", ls="0.08em")
s += txt(360, 300, "BINARY COMMAND / TELEMETRY OVER UDP", 13, C["dim"], anchor="middle", ls="0.14em")
s += txt(438, 396, "FAULT INJECTED", 11, C["orange"], anchor="middle", ls="0.12em")
# telemetry waveform returning
pts = " ".join(f"{120 + i*24},{560 - (18 if i % 3 else 40) * math.sin(i*0.8)*0.9:.0f}" for i in range(41))
s += f'<polyline points="{pts}" fill="none" stroke="{a}" stroke-width="2" stroke-opacity="0.75"/>'
s += txt(120, 600, "TELEMETRY @ 10 Hz", 12, C["faint"], ls="0.16em")
s += foot(a, "PRJ-02 / ASTRA-OS", "NATIVE TARGET EXECUTION / NOT HARDWARE-IN-THE-LOOP")
write("astrasim.svg", s)

# ------------------------------------------------------------------ ROCKET GNC
a = C["orange"]
s = head(a, "Rocket Landing GNC", "Exploratory point-mass descent prototype; evidence pending")
s += f'<circle cx="620" cy="600" r="420" fill="url(#glow)"/>'
# horizon + pad
s += f'<line x1="0" y1="600" x2="{W}" y2="600" stroke="{C["line2"]}" stroke-opacity="0.7"/>'
s += f'<ellipse cx="620" cy="600" rx="230" ry="34" fill="none" stroke="{a}" stroke-opacity="0.30"/>'
s += f'<ellipse cx="620" cy="600" rx="140" ry="21" fill="none" stroke="{a}" stroke-opacity="0.45"/>'
s += f'<ellipse cx="620" cy="600" rx="58" ry="9" fill="{a}" fill-opacity="0.16" stroke="{a}" stroke-opacity="0.7"/>'
# descent trajectory
s += f'<path d="M170 120 C 330 300, 520 380, 620 520" fill="none" stroke="{a}" stroke-width="2.5" stroke-opacity="0.5" stroke-dasharray="10 7"/>'
# booster
s += f'<g transform="translate(620,470) rotate(9)">'
s += f'<rect x="-27" y="-190" width="54" height="230" rx="7" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<path d="M-27 -190 L0 -240 L27 -190 Z" fill="url(#metal)" stroke="{C["line2"]}"/>'
for gy in (-150, -100, -50):
    s += f'<line x1="-27" y1="{gy}" x2="27" y2="{gy}" stroke="{C["line"]}" stroke-opacity="0.8"/>'
s += f'<path d="M-27 20 L-52 62 L-30 62 Z" fill="#1B2432" stroke="{C["line2"]}"/>'
s += f'<path d="M27 20 L52 62 L30 62 Z" fill="#1B2432" stroke="{C["line2"]}"/>'
# plume
s += f'<path d="M-20 44 C -34 108, -14 172, 0 214 C 14 172, 34 108, 20 44 Z" fill="{a}" fill-opacity="0.55" filter="url(#soft2)"/>'
s += f'<path d="M-10 46 C -16 96, -6 140, 0 166 C 6 140, 16 96, 10 46 Z" fill="#FFD9A8" fill-opacity="0.85"/>'
s += '</g>'
# evidence-status readouts; these are scope labels, not simulated telemetry
for i, (lab, val) in enumerate([("PLANT", "POINT MASS"), ("RUNS", "1 NOMINAL"), ("DATA", "PENDING")]):
    y = 200 + i * 44
    s += txt(980, y, lab, 12, C["faint"], ls="0.18em")
    s += txt(1150, y, val, 15, C["txt"], anchor="end", ls="0.06em", w=500)
    s += f'<line x1="980" y1="{y+12}" x2="1150" y2="{y+12}" stroke="{C["line"]}"/>'
s += txt(620, 656, "SINGLE-RUN PROTOTYPE / NO DISPERSION DATA", 12, a, anchor="middle", ls="0.14em")
s += foot(a, "PROTOTYPE / ROCKET LANDING GNC", "POINT-MASS DESCENT / EVIDENCE PENDING / NO ACCURACY CLAIM")
write("rocket.svg", s)

# ------------------------------------------------------------------ AEROFRAME-DT
a = C["violet"]
s = head(a, "AeroFrame-DT", "Synthetic fitting stress substantiation; educational non-OEM")
s += f'<circle cx="600" cy="330" r="360" fill="url(#glow)"/>'
s += f'<defs><linearGradient id="stress" x1="0" y1="0" x2="1" y2="0">' \
     f'<stop offset="0%" stop-color="{C["orange"]}" stop-opacity="0.75"/>' \
     f'<stop offset="35%" stop-color="{a}" stop-opacity="0.45"/>' \
     f'<stop offset="100%" stop-color="{C["cyan"]}" stop-opacity="0.20"/></linearGradient></defs>'
# fuselage
s += f'<rect x="120" y="316" width="960" height="44" rx="22" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<path d="M1080 316 C 1130 320, 1150 330, 1160 338 C 1150 346, 1130 356, 1080 360 Z" fill="url(#metal)" stroke="{C["line2"]}"/>'
# wings with stress gradient
s += f'<path d="M560 330 L360 190 L440 186 L640 322 Z" fill="url(#stress)" stroke="{C["line2"]}"/>'
s += f'<path d="M560 346 L360 486 L440 490 L640 354 Z" fill="url(#stress)" stroke="{C["line2"]}"/>'
# tail
s += f'<path d="M1010 320 L940 226 L980 224 L1058 316 Z" fill="url(#stress)" stroke="{C["line2"]}"/>'
# ribs
for i in range(7):
    t = i / 6
    s += f'<line x1="{560-200*t:.0f}" y1="{330-140*t:.0f}" x2="{600-160*t:.0f}" y2="{326-116*t:.0f}" stroke="{C["bg0"]}" stroke-opacity="0.5"/>'
    s += f'<line x1="{560-200*t:.0f}" y1="{346+140*t:.0f}" x2="{600-160*t:.0f}" y2="{350+116*t:.0f}" stroke="{C["bg0"]}" stroke-opacity="0.5"/>'
# hotspots
for cx, cy, lab in [(556, 330, "HS-1"), (412, 214, "HS-2"), (1004, 318, "HS-3")]:
    s += f'<circle cx="{cx}" cy="{cy}" r="26" fill="{C["orange"]}" fill-opacity="0.16"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="11" fill="none" stroke="{C["orange"]}" stroke-width="2"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="3" fill="{C["orange"]}"/>'
    s += txt(cx, cy - 34, lab, 12, C["orange"], anchor="middle", ls="0.12em")
# load arrows
for x in (400, 470, 700, 780):
    s += f'<line x1="{x}" y1="560" x2="{x}" y2="500" stroke="{a}" stroke-opacity="0.6" stroke-width="2"/>'
    s += f'<path d="M{x-5} 506 L{x} 496 L{x+5} 506 Z" fill="{a}" fill-opacity="0.8"/>'
s += txt(600, 592, "2.5 g LIMIT MANOEUVRE, DISTRIBUTED LIFT", 12, a, anchor="middle", ls="0.16em")
s += foot(a, "PRJ-03 / AEROFRAME-DT", "SYNTHETIC FITTING / STATIC + FE + LIFE / NON-OEM")
write("md11.svg", s)

# ------------------------------------------------------------------ INTERCEPTOR
a = C["blue"]
s = head(a, "Interception Robot", "Reported perception-to-actuation prototype; public artifacts unavailable")
s += f'<circle cx="380" cy="340" r="300" fill="url(#glow)"/>'
# camera FOV
s += f'<path d="M300 340 L1100 150 L1100 530 Z" fill="{a}" fill-opacity="0.06" stroke="{a}" stroke-opacity="0.25"/>'
for r in (220, 380, 540):
    s += f'<path d="M{300+r} {340-r*0.238:.0f} A {r} {r} 0 0 1 {300+r} {340+r*0.238:.0f}" fill="none" stroke="{a}" stroke-opacity="0.14"/>'
# turret
s += f'<rect x="228" y="392" width="150" height="46" rx="6" fill="url(#metal)" stroke="{C["line2"]}"/>'
for i in range(6):
    s += f'<circle cx="{252+i*24}" cy="{438}" r="13" fill="#131A25" stroke="{C["line2"]}"/>'
s += f'<rect x="268" y="330" width="72" height="64" rx="5" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<rect x="330" y="348" width="86" height="16" rx="4" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<circle cx="304" cy="356" r="14" fill="#0A0F16" stroke="{a}" stroke-width="2"/>'
s += f'<circle cx="304" cy="356" r="5" fill="{a}"/>'
# detection box on target
s += f'<rect x="880" y="250" width="150" height="150" fill="none" stroke="{C["green"]}" stroke-width="2"/>'
for cx2, cy2 in [(880, 250), (1030, 250), (880, 400), (1030, 400)]:
    s += f'<rect x="{cx2-4}" y="{cy2-4}" width="8" height="8" fill="{C["green"]}"/>'
s += f'<rect x="880" y="222" width="112" height="22" fill="{C["green"]}" fill-opacity="0.9"/>'
s += txt(886, 238, "CONCEPT TARGET", 11, "#04120B", ls="0.01em", w=600)
s += f'<circle cx="955" cy="325" r="30" fill="{C["green"]}" fill-opacity="0.12"/>'
# predicted position
s += f'<rect x="1000" y="270" width="150" height="150" fill="none" stroke="{a}" stroke-width="2" stroke-dasharray="7 6"/>'
s += txt(1075, 448, "PREDICTED @ t+Δ", 12, a, anchor="middle", ls="0.12em")
# latency bar
s += f'<rect x="228" y="560" width="740" height="26" rx="3" fill="#101722" stroke="{C["line"]}"/>'
segs = [(0.09, C["line2"], ""), (0.72, a, "INFERENCE"), (0.05, C["cyan"], ""), (0.05, C["green"], ""), (0.09, C["orange"], "")]
x0 = 228
for frac, col, lab in segs:
    w = 740 * frac
    s += f'<rect x="{x0:.0f}" y="560" width="{w:.0f}" height="26" fill="{col}" fill-opacity="0.45"/>'
    if lab:
        s += txt(x0 + w / 2, 578, lab, 12, "#E9F1FF", anchor="middle", ls="0.14em")
    x0 += w
s += txt(228, 546, "END-TO-END BUDGET", 12, C["faint"], ls="0.16em")
s += txt(968, 546, "&lt; 100 ms", 13, C["green"], anchor="end", ls="0.08em", w=600)
s += foot(a, "REPORTED / INTERCEPTION ROBOT", "DESIGN BUDGET / NO PUBLIC TIMING TRACE")
write("interceptor.svg", s)

# ------------------------------------------------------------------ SPIRIT
a = C["cyan"]
s = head(a, "TAMU-SPIRIT", "ISS payload systems engineering")
s += f'<circle cx="900" cy="480" r="420" fill="url(#glow)"/>'
# earth limb
s += f'<defs><linearGradient id="limb" x1="0" y1="0" x2="0" y2="1">' \
     f'<stop offset="0%" stop-color="{a}" stop-opacity="0.55"/>' \
     f'<stop offset="18%" stop-color="{C["blue"]}" stop-opacity="0.22"/>' \
     f'<stop offset="60%" stop-color="#050A14" stop-opacity="1"/></linearGradient></defs>'
s += f'<ellipse cx="600" cy="1180" rx="1120" ry="640" fill="url(#limb)"/>'
s += f'<ellipse cx="600" cy="1180" rx="1120" ry="640" fill="none" stroke="{a}" stroke-opacity="0.5"/>'
# stars
for sx, sy, r in [(140,120,1.6),(260,80,1.1),(420,160,1.3),(980,110,1.5),(1120,190,1.1),(760,90,1.2),(60,240,1.0),(1160,60,1.4)]:
    s += f'<circle cx="{sx}" cy="{sy}" r="{r}" fill="#FFFFFF" fill-opacity="0.65"/>'
# truss
s += f'<rect x="170" y="300" width="700" height="26" fill="url(#metal)" stroke="{C["line2"]}"/>'
for i in range(14):
    x = 176 + i * 50
    s += f'<path d="M{x} 326 L{x+25} 300 L{x+50} 326" fill="none" stroke="{C["line2"]}" stroke-opacity="0.75"/>'
# solar arrays
for ax, ay in [(150, 190), (150, 350), (760, 190), (760, 350)]:
    s += f'<rect x="{ax}" y="{ay}" width="200" height="86" rx="3" fill="#0E1A2E" stroke="{C["blue"]}" stroke-opacity="0.55"/>'
    for k in range(7):
        s += f'<line x1="{ax+k*28+14}" y1="{ay}" x2="{ax+k*28+14}" y2="{ay+86}" stroke="{C["blue"]}" stroke-opacity="0.22"/>'
    s += f'<line x1="{ax}" y1="{ay+43}" x2="{ax+200}" y2="{ay+43}" stroke="{C["blue"]}" stroke-opacity="0.22"/>'
# module + payload
s += f'<rect x="470" y="256" width="180" height="114" rx="14" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<circle cx="560" cy="313" r="26" fill="#0A121C" stroke="{a}" stroke-opacity="0.7"/>'
s += f'<circle cx="560" cy="313" r="13" fill="{a}" fill-opacity="0.35"/>'
s += f'<rect x="612" y="380" width="118" height="80" rx="6" fill="#101A24" stroke="{a}" stroke-width="2"/>'
s += txt(671, 426, "DASH", 17, a, anchor="middle", ls="0.14em", w=600)
s += f'<line x1="671" y1="370" x2="671" y2="380" stroke="{a}" stroke-opacity="0.8"/>'
s += txt(671, 486, "PAYLOAD", 12, C["faint"], anchor="middle", ls="0.18em")
# thermal band
s += f'<rect x="880" y="250" width="270" height="1" fill="{C["line2"]}"/>'
s += txt(880, 238, "LEO THERMAL CYCLE", 12, C["faint"], ls="0.16em")
s += txt(880, 288, "&#8722;120 &#176;C", 20, C["blue"], ls="0.04em", w=600)
s += txt(1150, 288, "+120 &#176;C", 20, C["orange"], anchor="end", ls="0.04em", w=600)
s += f'<defs><linearGradient id="tband" x1="0" y1="0" x2="1" y2="0">' \
     f'<stop offset="0%" stop-color="{C["blue"]}"/><stop offset="100%" stop-color="{C["orange"]}"/></linearGradient></defs>'
s += f'<rect x="880" y="304" width="270" height="8" rx="4" fill="url(#tband)" fill-opacity="0.8"/>'
s += foot(a, "PRJ-06 / TAMU-SPIRIT", "ISS PAYLOAD SYSTEMS ENGINEERING")
write("spirit.svg", s)

# ------------------------------------------------------------------ KESTREL
a = C["faint"]
s = head(C["dim"], "Project KESTREL", "Archived design study; reported CDR readiness")
s += f'<circle cx="600" cy="360" r="330" fill="url(#glow)"/>'
s += f'<line x1="0" y1="580" x2="{W}" y2="580" stroke="{C["line2"]}" stroke-opacity="0.6"/>'
# launch arc
s += f'<path d="M150 520 C 380 210, 700 210, 940 470" fill="none" stroke="{C["line2"]}" stroke-width="2" stroke-dasharray="9 7"/>'
s += f'<circle cx="150" cy="520" r="7" fill="{C["dim"]}"/>'
s += txt(150, 552, "HAND LAUNCH", 12, C["faint"], anchor="middle", ls="0.14em")
# pad
s += f'<ellipse cx="960" cy="520" rx="120" ry="20" fill="none" stroke="{C["dim"]}" stroke-opacity="0.5"/>'
s += f'<ellipse cx="960" cy="520" rx="58" ry="10" fill="none" stroke="{C["dim"]}" stroke-opacity="0.7"/>'
s += f'<rect x="944" y="512" width="32" height="16" fill="none" stroke="{C["dim"]}" stroke-opacity="0.8"/>'
s += txt(960, 560, "&lt; 5 cm CEP DESIGN TARGET", 12, C["faint"], anchor="middle", ls="0.14em")
# airframe
s += f'<g transform="translate(560,262) rotate(-8)">'
s += f'<path d="M-104 0 L74 0 L104 12 L74 24 L-104 24 Z" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<path d="M-24 2 L-70 -74 L-40 -74 L10 2 Z" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<path d="M-24 22 L-70 96 L-40 96 L10 22 Z" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<path d="M-104 2 L-128 -34 L-108 -34 L-86 2 Z" fill="url(#metal)" stroke="{C["line2"]}"/>'
s += f'<circle cx="86" cy="12" r="6" fill="#0A0F16" stroke="{C["dim"]}"/>'
s += '</g>'
# archived stamp
s += f'<g transform="translate(1010,150) rotate(-9)">'
s += f'<rect x="-118" y="-30" width="236" height="60" rx="5" fill="none" stroke="{C["faint"]}" stroke-width="3"/>'
s += txt(0, 10, "ARCHIVED", 30, C["faint"], anchor="middle", ls="0.14em", w=700)
s += '</g>'
s += foot(C["dim"], "ARCHIVED / KESTREL", "REPORTED CDR READINESS / NO FLIGHT TEST")
write("kestrel.svg", s)
