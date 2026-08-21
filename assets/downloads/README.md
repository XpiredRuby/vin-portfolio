# Downloadable CAD and analysis packages

The download panel on a project page is driven by `assets/data/downloads.json`.
Each entry names a file in this directory. The page runs a `HEAD` request per
file at load: files that are present offer a download, files that are absent
show an honest "available on request" state instead of a broken link. Nothing
needs rebuilding when a file is added or removed — the panel reports whatever
is actually on the server.

## Published

| File | What it is |
|---|---|
| `md11-cad-package.zip` | The four retained MD-11 artifacts: `Assem1.SLDASM`, `MD11.SLDPRT`, `MD11_Drawing.SLDDRW`, `MD-11 Plane.x_t` |
| `md11-plane.x_t` | The MD-11 Parasolid export on its own, for reviewers without a SolidWorks seat |
| `aeroframe-dt-pylon-attachment.x_t` | AF-DT-2000 attachment assembly as neutral solid geometry |
| `aeroframe-dt-fitting-drawing.pdf` | AF-DT-1000 fitting drawing, B-size sheet |

Every MD-11 SHA-256 in `downloads.json` was verified against
`assets/evidence/md11/source-manifest.json` before publishing: all four match,
so the hashes already on the site were correct.

## Not published

Anything over roughly 50 MB. GitHub warns above 50 MB and hard-rejects above
100 MB per file, and a repository that carries large binaries stays slow to
clone forever. Options for the bigger artifacts, in order of preference:

1. **Attach them to a GitHub Release** rather than committing them. Releases
   allow files up to 2 GB and do not bloat the clone. Add the release URL to
   `downloads.json` as an absolute link and the panel will use it.
2. **Export a lighter representation** — a Parasolid or STEP body is usually a
   fraction of a native assembly, and a PDF of a drawing is smaller again.
3. **Git LFS**, if the file genuinely has to live in the tree. This needs LFS
   enabled on the repository and counts against a bandwidth quota.

## Before adding anything

These are synthetic, non-OEM, non-certified artifacts, which is what makes them
safe to publish. Do not add anything derived from proprietary or export-
controlled geometry.

## Keeping the hashes honest

After adding or replacing a file, regenerate its record:

```bash
python3 - <<'PY'
import hashlib, pathlib
for f in sorted(pathlib.Path('assets/downloads').iterdir()):
    if f.suffix == '.md':
        continue
    b = f.read_bytes()
    print('%-40s %9d  %s' % (f.name, len(b), hashlib.sha256(b).hexdigest()))
PY
```

then update the matching `bytes` and `sha256` fields in
`assets/data/downloads.json`.
