#!/usr/bin/env node
/**
 * Render every social preview card from one template plus a manifest.
 *
 *   node tools/render_og.js              # write all cards
 *   node tools/render_og.js ghost        # write only cards whose path matches
 *   node tools/render_og.js --check      # fail if a card is missing or off-size
 *
 * Social scrapers never run JavaScript and crop to a 1.91:1 box, so each card
 * has to be a finished 1200x630 raster that carries its meaning at a glance.
 * Template: assets/og-card.src.html   Manifest: tools/og-cards.json
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'assets', 'og-card.src.html');
const MANIFEST = path.join(ROOT, 'tools', 'og-cards.json');
const W = 1200;
const H = 630;

function cards() {
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf-8')).cards;
}

/** PNG dimensions live in the IHDR chunk at a fixed offset. */
function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(24);
  const read = fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  if (read < 24 || head.toString('ascii', 1, 4) !== 'PNG') { return null; }
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

function check() {
  let bad = 0;
  for (const card of cards()) {
    const out = path.join(ROOT, card.out);
    if (!fs.existsSync(out)) {
      console.error(`missing ${card.out} — run: node tools/render_og.js`);
      bad += 1;
      continue;
    }
    const size = pngSize(out);
    if (!size || size.width !== W || size.height !== H) {
      console.error(`${card.out} is ${size ? size.width + 'x' + size.height : 'unreadable'}, expected ${W}x${H}`);
      bad += 1;
    }
  }
  if (!bad) { console.log(`social cards OK: ${cards().length} at ${W}x${H}`); }
  return bad ? 1 : 0;
}

/**
 * Chromium writes a fast, weakly-compressed PNG. Re-encoding losslessly takes
 * about 13% off with no colour drift. Palette quantization would save far more
 * but visibly shifts the accent markers, so it is deliberately not used.
 */
function optimize(file) {
  const q = JSON.stringify(file);
  const py = `from PIL import Image; Image.open(${q}).convert("RGB").save(${q}, optimize=True, compress_level=9)`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf-8' });
  if (r.status !== 0) {
    console.warn(`  (no lossless pass for ${path.basename(file)}: ${(r.stderr || '').trim().split('\n').pop()})`);
  }
}

async function render(filter) {
  // Required lazily: --check runs in CI, which has Node but no browser.
  const { chromium } = require('playwright');
  const wanted = cards().filter((c) => !filter || c.out.includes(filter));
  if (!wanted.length) {
    console.error(`no card in the manifest matches "${filter}"`);
    return 1;
  }
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const card of wanted) {
    const out = path.join(ROOT, card.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // addInitScript accumulates over a page's lifetime, so each card gets its
    // own page rather than stacking window.__CARD assignments.
    const page = await ctx.newPage();
    await page.addInitScript(`window.__CARD = ${JSON.stringify(card)};`);
    await page.goto('file://' + TEMPLATE, { waitUntil: 'load' });
    // Webfonts decide the layout; a card shot mid-swap ships with wrong metrics.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('html[data-card-ready]');
    await page.waitForTimeout(250);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
    await page.close();
    optimize(out);
    const size = pngSize(out);
    console.log(`${card.out.padEnd(38)} ${size.width}x${size.height}  ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
  }
  await browser.close();
  return 0;
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--check')) { process.exit(check()); }
  const code = await render(args.find((a) => !a.startsWith('-')));
  process.exit(code || check());
})().catch((err) => { console.error(err); process.exit(1); });
