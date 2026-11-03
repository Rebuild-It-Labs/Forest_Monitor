/**
 * generate-placeholders.mjs
 * ---------------------------------------------------------------
 * Creates stand-in "satellite" imagery for every site in public/data/data.json:
 *
 *   public/images/<id>/10y.svg       10 years ago     (few clearings, softer 30 m look)
 *   public/images/<id>/5y.svg        5 years ago      (clearings growing)
 *   public/images/<id>/current.svg   current composite (largest clearings)
 *   public/images/<id>/heatmap.svg   Swin-ViT style risk heatmap + detection boxes
 *
 *   node scripts/generate-placeholders.mjs
 *
 * The images are procedural SVG (feTurbulence terrain + clearing polygons) so the repo stays tiny
 * and works offline. They are NOT real imagery — swap the files (any format) and update the `src`
 * paths in data.json to plug in real Sentinel-2 / Landsat chips and real model output.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(resolve(ROOT, 'public/data/data.json'), 'utf8'));

const W = 960;
const H = 600;

function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n) => +n.toFixed(1);

// ---- palettes (tableValues for R,G,B, dark → light) -----------------------------------
const PALETTES = {
  forest: { r: '0.02 0.04 0.07 0.12 0.22 0.36', g: '0.10 0.17 0.26 0.36 0.46 0.52', b: '0.04 0.06 0.08 0.10 0.15 0.18', freq: '0.007 0.011' },
  dry: { r: '0.06 0.10 0.17 0.28 0.42 0.55', g: '0.09 0.15 0.23 0.33 0.43 0.50', b: '0.03 0.05 0.07 0.11 0.16 0.20', freq: '0.008 0.012' },
  himalaya: { r: '0.03 0.06 0.12 0.24 0.42 0.72', g: '0.10 0.17 0.25 0.34 0.44 0.70', b: '0.05 0.08 0.10 0.17 0.30 0.70', freq: '0.010 0.016' },
  mangrove: { r: '0.01 0.03 0.05 0.09 0.15 0.24', g: '0.07 0.13 0.20 0.28 0.36 0.42', b: '0.06 0.10 0.13 0.16 0.20 0.23', freq: '0.012 0.016' },
};
const PALETTE_BY_SITE = { sundarbans: 'mangrove', garhwal: 'himalaya', namdapha: 'himalaya', nallamala: 'dry', similipal: 'forest' };

const PERIODS = {
  '10y': { frac: 0.18, grow: 0.5, blur: 1.1, tint: 'rgba(120,150,170,0.06)' },
  '5y': { frac: 0.55, grow: 0.78, blur: 0.4, tint: 'rgba(0,0,0,0)' },
  current: { frac: 1, grow: 1, blur: 0, tint: 'rgba(0,0,0,0)' },
};

// ---- geometry ---------------------------------------------------------------------------
function makePatches(site, rnd) {
  const n = Math.round(6 + site.stats.mlRisk12m * 9 + Math.abs(site.stats.changePct10y) / 4);
  const patches = [];
  for (let i = 0; i < n; i++) {
    const cx = 90 + rnd() * (W - 180);
    const cy = 80 + rnd() * (H - 160);
    const r = 28 + rnd() * 62;
    const rect = rnd() > 0.55;
    const rot = rnd() * Math.PI;
    const k = rect ? 4 : 7 + Math.floor(rnd() * 4);
    const verts = [];
    for (let v = 0; v < k; v++) {
      const a = (v / k) * Math.PI * 2 + (rect ? Math.PI / 4 + rot : (rnd() - 0.5) * 0.5);
      const rr = rect ? r * (v % 2 ? 0.65 : 1.05) * (0.92 + rnd() * 0.16) : r * (0.6 + rnd() * 0.65);
      verts.push([Math.cos(a) * rr * (rect ? 1.3 : 1), Math.sin(a) * rr]);
    }
    patches.push({ cx, cy, r, verts });
  }
  return patches;
}

function polyPoints(p, grow) {
  return p.verts.map(([x, y]) => `${f(p.cx + x * grow)},${f(p.cy + y * grow)}`).join(' ');
}

function roads(patches, rnd) {
  const out = [];
  for (let i = 1; i < patches.length; i++) {
    const a = patches[i - 1];
    const b = patches[i];
    const mx = (a.cx + b.cx) / 2 + (rnd() - 0.5) * 120;
    const my = (a.cy + b.cy) / 2 + (rnd() - 0.5) * 80;
    out.push(`M${f(a.cx)},${f(a.cy)} Q${f(mx)},${f(my)} ${f(b.cx)},${f(b.cy)}`);
  }
  return out;
}

function channels(rnd) {
  const out = [];
  for (let i = 0; i < 9; i++) {
    let x = rnd() * W;
    let y = rnd() * H;
    let d = `M${f(x)},${f(y)}`;
    for (let s = 0; s < 5; s++) {
      x += (rnd() - 0.5) * 260;
      y += (rnd() - 0.2) * 170;
      d += ` S${f(x - 40 + rnd() * 80)},${f(y - 40 + rnd() * 80)} ${f(x)},${f(y)}`;
    }
    out.push(`<path d="${d}" fill="none" stroke="#08222b" stroke-width="${f(2 + rnd() * 6)}" stroke-linecap="round" opacity="0.85"/>`);
  }
  return out.join('\n');
}

// ---- svg parts ---------------------------------------------------------------------------
function defs(seed, pal, blur) {
  return `
<defs>
  <filter id="terrain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${pal.freq}" numOctaves="5" seed="${seed}" result="n1"/>
    <feColorMatrix in="n1" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="g1"/>
    <feComponentTransfer in="g1" result="g1c">
      <feFuncR type="linear" slope="2.6" intercept="-0.78"/><feFuncG type="linear" slope="2.6" intercept="-0.78"/><feFuncB type="linear" slope="2.6" intercept="-0.78"/>
    </feComponentTransfer>
    <feComponentTransfer in="g1c" result="pal">
      <feFuncR type="table" tableValues="${pal.r}"/><feFuncG type="table" tableValues="${pal.g}"/><feFuncB type="table" tableValues="${pal.b}"/>
    </feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency="0.085" numOctaves="2" seed="${seed + 7}" result="n2"/>
    <feColorMatrix in="n2" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="g2"/>
    <feComposite in="pal" in2="g2" operator="arithmetic" k1="0.7" k2="0.62" k3="0" k4="0" result="grain"/>
    ${blur ? `<feGaussianBlur in="grain" stdDeviation="${blur}"/>` : ''}
  </filter>
  <filter id="soil" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="3" seed="${seed + 3}" result="s"/>
    <feColorMatrix in="s" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="sg"/>
    <feComponentTransfer in="sg" result="sp">
      <feFuncR type="table" tableValues="0.38 0.52 0.62 0.72 0.8"/><feFuncG type="table" tableValues="0.27 0.38 0.46 0.54 0.6"/><feFuncB type="table" tableValues="0.16 0.22 0.28 0.34 0.4"/>
    </feComponentTransfer>
    <feComposite in="sp" in2="SourceAlpha" operator="in" result="fill"/>
    <feMorphology in="SourceAlpha" operator="erode" radius="2" result="inner"/>
    <feGaussianBlur in="inner" stdDeviation="2" result="innerBlur"/>
    <feComposite in="fill" in2="innerBlur" operator="in"/>
  </filter>
  <filter id="mono" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturate" values="0.1"/>
    <feComponentTransfer><feFuncR type="linear" slope="0.5" intercept="0.02"/><feFuncG type="linear" slope="0.55" intercept="0.03"/><feFuncB type="linear" slope="0.55" intercept="0.03"/></feComponentTransfer>
  </filter>
  <radialGradient id="hot"><stop offset="0" stop-color="#ffd1e6" stop-opacity="0.95"/><stop offset="0.25" stop-color="#ff2e63" stop-opacity="0.85"/><stop offset="0.6" stop-color="#ff00aa" stop-opacity="0.4"/><stop offset="1" stop-color="#ff00aa" stop-opacity="0"/></radialGradient>
  <radialGradient id="warm"><stop offset="0" stop-color="#ff7a45" stop-opacity="0.75"/><stop offset="0.5" stop-color="#ff2e63" stop-opacity="0.35"/><stop offset="1" stop-color="#ff2e63" stop-opacity="0"/></radialGradient>
</defs>`;
}

function scene({ patches, roadPaths, grow, frac, mangrove, rnd }) {
  const shown = patches.slice(0, Math.max(1, Math.ceil(patches.length * frac)));
  const roadSvg = roadPaths
    .slice(0, Math.max(0, shown.length - 1))
    .map((d) => `<path d="${d}" fill="none" stroke="#2a2418" stroke-width="3.2" opacity="0.4"/><path d="${d}" fill="none" stroke="#d6c7a1" stroke-width="1.4" opacity="0.5"/>`)
    .join('\n');
  const polys = shown.map((p) => `<polygon points="${polyPoints(p, grow)}" fill="#000"/>`).join('\n');
  return `
<rect width="${W}" height="${H}" fill="#06140c" filter="url(#terrain)"/>
${mangrove ? channels(rnd) : ''}
${roadSvg}
<g filter="url(#soil)">${polys}</g>`;
}

function frame(content, tint) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
${content}
<rect width="${W}" height="${H}" fill="${tint}"/>
</svg>
`;
}

function heatmapOverlay(site, patches, rnd) {
  const risk = site.stats.mlRisk12m;
  const blobs = [];
  const boxes = [];
  patches.forEach((p, i) => {
    const a = rnd() * Math.PI * 2;
    const d = p.r * (1.0 + rnd() * 0.5);
    const x = p.cx + Math.cos(a) * d;
    const y = p.cy + Math.sin(a) * d;
    const rr = p.r * (0.7 + risk * 0.5);
    blobs.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="url(#${i % 3 === 0 ? 'hot' : 'warm'})"/>`);
  });
  const interior = 3 + Math.round(risk * 6);
  for (let i = 0; i < interior; i++) {
    const x = 70 + rnd() * (W - 140);
    const y = 60 + rnd() * (H - 120);
    const rr = 34 + rnd() * 54;
    blobs.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="url(#warm)" opacity="${f(0.55 + rnd() * 0.4)}"/>`);
    if (i < 3) {
      const s = rr * 1.1;
      const p = (0.74 + rnd() * 0.24).toFixed(2);
      boxes.push(`
<g>
  <rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s)}" fill="none" stroke="#00ff88" stroke-width="1.4" stroke-dasharray="7 4"/>
  <rect x="${f(x - s / 2)}" y="${f(y - s / 2 - 17)}" width="64" height="16" fill="#00170c" stroke="#00ff88" stroke-width="1"/>
  <text x="${f(x - s / 2 + 5)}" y="${f(y - s / 2 - 5)}" font-family="monospace" font-size="11" fill="#00ff88">P=${p}</text>
</g>`);
    }
  }
  return `<g opacity="0.85">${blobs.join('\n')}</g>${boxes.join('')}`;
}

// ---- main -------------------------------------------------------------------------------
let count = 0;
for (const site of data.locations) {
  const rnd = mulberry32(hash(site.id + ':img'));
  const seed = hash(site.id) % 9000;
  const palName = PALETTE_BY_SITE[site.id] || 'forest';
  const pal = PALETTES[palName];
  const patches = makePatches(site, rnd);
  const roadPaths = roads(patches, mulberry32(hash(site.id + ':roads')));
  const dir = resolve(ROOT, 'public/images', site.id);
  mkdirSync(dir, { recursive: true });

  for (const [key, p] of Object.entries(PERIODS)) {
    const body = scene({ patches, roadPaths, grow: p.grow, frac: p.frac, mangrove: palName === 'mangrove', rnd: mulberry32(hash(site.id + ':ch')) });
    writeFileSync(resolve(dir, `${key}.svg`), frame(defs(seed, pal, p.blur) + body, p.tint));
    count++;
  }

  // heatmap = desaturated "current" + risk blobs + detection boxes
  const cur = PERIODS.current;
  const base = scene({ patches, roadPaths, grow: cur.grow, frac: cur.frac, mangrove: palName === 'mangrove', rnd: mulberry32(hash(site.id + ':ch')) });
  const heat = `${defs(seed, pal, 0)}<g filter="url(#mono)">${base}</g><rect width="${W}" height="${H}" fill="#000" opacity="0.28"/>${heatmapOverlay(site, patches, mulberry32(hash(site.id + ':heat')))}`;
  writeFileSync(resolve(dir, 'heatmap.svg'), frame(heat, 'rgba(0,0,0,0)'));
  count++;
}
console.log(`✔ wrote ${count} placeholder images for ${data.locations.length} sites`);
