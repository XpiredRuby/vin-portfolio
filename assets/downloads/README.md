# Downloadable CAD and analysis packages

The download panel on a project page is driven by `assets/data/downloads.json`.
Each entry names a file that should live in this directory. The page runs a
`HEAD` request per file at load: files that are present offer a download, files
that are absent show an honest "available on request" state instead of a broken
link. Nothing needs rebuilding when a file is added — drop it in and it goes
live on the next deploy.

## What to add

| Put this file here | Comes from |
|---|---|
| `md11-cad-package.zip` | The four retained MD-11 artifacts: `Assem1.SLDASM`, `MD11.SLDPRT`, `MD11_Drawing.SLDDRW`, `MD-11 Plane.x_t` |
| `md11-plane.x_t` | The neutral Parasolid export on its own, for reviewers without SolidWorks |
| `md11-drawing.pdf` | A PDF print of `MD11_Drawing.SLDDRW`, so the drawing can be read with no CAD seat at all |
| `aeroframe-dt-geometry.step` | The AF-DT-1000 pylon fitting as a neutral STEP solid |
| `aeroframe-dt-report.pdf` | The structural substantiation write-up, if it is cleared for public release |

## Before adding anything

These are synthetic, non-OEM, non-certified artifacts, which is what makes them
safe to publish. Do not add anything derived from proprietary or export-
controlled geometry.

## Keeping the manifest honest

`assets/evidence/md11/source-manifest.json` already records the SHA-256 and byte
count of each retained MD-11 artifact. If you publish a zip, regenerate the
hashes so a reviewer can verify what they downloaded:

```bash
sha256sum assets/downloads/md11-cad-package.zip
```

then update the matching `sha256` and `bytes` fields in
`assets/data/downloads.json`.
