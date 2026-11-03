/**
 * satelliteTexture.js — builds the India-only surface texture.
 *
 * 1. Paint imagery into a square canvas that covers `bbox` (equirectangular, linear in lat & lng):
 *      • if `imageUrl` is given → that image (a real Sentinel-2 / Blue Marble crop of the same bbox)
 *      • otherwise → a procedural "satellite" mosaic (terrain relief, forests, plains, desert, Himalaya, rivers)
 * 2. Mask the canvas with India's boundary polygon so nothing outside the country is visible.
 *
 * The procedural painter works in time-sliced chunks so the UI (boot screen) stays responsive.
 */
import * as THREE from 'three';
import { polygonsOf } from './geo.js';

// ---- small math helpers -------------------------------------------------------------------------
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const nextFrame = () => new Promise((r) => setTimeout(r, 0));

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) vals[i] = rnd();

  const n2 = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const X = xi & 255;
    const Y = yi & 255;
    const a = vals[perm[perm[X] + Y]];
    const b = vals[perm[perm[X + 1] + Y]];
    const c = vals[perm[perm[X] + Y + 1]];
    const d = vals[perm[perm[X + 1] + Y + 1]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, oct) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let o = 0; o < oct; o++) {
      sum += amp * n2(x, y);
      norm += amp;
      x = x * 2.03 + 17.1;
      y = y * 2.03 + 9.7;
      amp *= 0.5;
    }
    return sum / norm;
  };
  const hash2 = (x, y) => vals[perm[perm[x & 255] + (y & 255)]];
  return { n2, fbm, hash2 };
}

// ---- regional layout of India (approximate, deliberately stylised) -------------------------------------
// Himalayan front: [lng, lat] of the southern edge of the high mountains
const HIMALAYA_ARC = [[70, 34.2], [73, 33], [77, 31.5], [80, 29.6], [84, 28.3], [88, 27.8], [92, 27.6], [96, 28.2], [99, 28.8]];
// Indo-Gangetic / Brahmaputra plain centre-line
const PLAIN_LINE = [[68, 29.5], [74, 29.5], [77, 28], [82, 26.2], [86, 25.3], [89, 25.2], [92, 26.2], [95, 27.3], [99, 27.6]];

function polyline(points, lng) {
  if (lng <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (lng <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return lerp(y0, y1, (lng - x0) / (x1 - x0));
    }
  }
  return points[points.length - 1][1];
}

// Forest "bumps": [lat, lng, sigmaLat, sigmaLng, amplitude]
const FOREST_BUMPS = [
  // Western Ghats
  [8.8, 77.2, 1.3, 0.55, 1], [11.5, 76.4, 1.3, 0.5, 1], [14.5, 74.8, 1.4, 0.5, 1], [17.5, 73.7, 1.5, 0.5, 0.95], [20.3, 73.4, 1.2, 0.5, 0.8],
  // Central India / Chhattisgarh / Odisha
  [21.8, 78.2, 1.3, 2.2, 0.75], [22.6, 81.8, 1.6, 1.6, 0.95], [19.2, 81.8, 2.1, 1.5, 1], [21.2, 83.6, 1.4, 1.6, 0.8], [22.4, 86.0, 1.4, 1.5, 0.85],
  [19.8, 84.6, 1.6, 1.2, 0.6], [24.2, 84.5, 1.3, 1.6, 0.55],
  // Eastern Ghats / Nallamala
  [16.6, 80.0, 1.8, 1.0, 0.55], [15.9, 78.9, 1.3, 1.0, 0.7],
  // Sundarbans
  [21.9, 89.0, 0.55, 0.95, 1],
  // North-east
  [26.0, 93.0, 2.0, 3.0, 0.95], [27.5, 95.5, 1.4, 1.6, 1], [27.5, 96.5, 1.0, 1.1, 1], [24.0, 92.6, 1.6, 1.0, 0.9],
  // Himalayan foothills / terai
  [30.0, 79.0, 1.0, 1.5, 0.9], [28.0, 84.0, 0.8, 2.6, 0.7], [27.0, 88.5, 0.8, 1.3, 0.9], [31.8, 77.2, 1.0, 1.1, 0.7],
  // Andaman & Nicobar
  [12.0, 92.9, 1.9, 0.5, 1], [7.5, 93.8, 1.8, 0.5, 1],
];

/** Pre-computes smooth regional weight fields on a coarse lat/lng grid. */
function buildFields(bbox, G = 160) {
  const [w, s, e, n] = bbox;
  const himalaya = new Float32Array(G * G);
  const desert = new Float32Array(G * G);
  const plain = new Float32Array(G * G);
  const forest = new Float32Array(G * G);
  for (let j = 0; j < G; j++) {
    const lat = n - ((j + 0.5) / G) * (n - s);
    for (let i = 0; i < G; i++) {
      const lng = w + ((i + 0.5) / G) * (e - w);
      const k = j * G + i;
      const dLat = lat - polyline(HIMALAYA_ARC, lng);
      const h = smooth(-0.6, 2.4, dLat) * smooth(69, 72, lng);
      himalaya[k] = h;
      // Thar desert + Kutch
      const dd = Math.exp(-(((lat - 27) / 2.6) ** 2 + ((lng - 71.6) / 2.6) ** 2)) + 0.6 * Math.exp(-(((lat - 23.6) / 1.2) ** 2 + ((lng - 69.6) / 1.5) ** 2));
      desert[k] = clamp(dd) * (1 - h);
      const pl = Math.exp(-(((lat - polyline(PLAIN_LINE, lng)) / 1.9) ** 2)) * smooth(73.5, 76.5, lng);
      plain[k] = clamp(pl * (1 - desert[k]) * (1 - smooth(0.2, 0.8, h)));
      let f = 0;
      for (const [bl, bg, sl, sg, a] of FOREST_BUMPS) {
        const dl = (lat - bl) / sl;
        const dg = (lng - bg) / sg;
        if (dl * dl + dg * dg > 9) continue;
        f += a * Math.exp(-(dl * dl + dg * dg) * 0.9);
      }
      forest[k] = clamp(f);
    }
  }
  const sample = (arr, u, v) => {
    const x = clamp(u) * (G - 1);
    const y = clamp(v) * (G - 1);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(G - 1, x0 + 1);
    const y1 = Math.min(G - 1, y0 + 1);
    const fx = x - x0;
    const fy = y - y0;
    const a = arr[y0 * G + x0];
    const b = arr[y0 * G + x1];
    const c = arr[y1 * G + x0];
    const d = arr[y1 * G + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return { himalaya, desert, plain, forest, sample };
}

// ---- palette (0-255) -----------------------------------------------------------------------------------
const C = {
  forestDeep: [7, 36, 17], forestMid: [20, 76, 33], forestLight: [48, 112, 46], forestDry: [84, 110, 46],
  scrubA: [128, 126, 70], scrubB: [168, 148, 94],
  desertA: [194, 164, 108], desertB: [228, 202, 150],
  crop: [[156, 178, 84], [200, 190, 118], [118, 156, 66], [180, 150, 92]],
  rockA: [78, 70, 62], rockB: [140, 130, 118], snow: [238, 243, 247],
  water: [20, 50, 66],
};
const mix3 = (a, b, t, out) => {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
};

async function paintProcedural(ctx, bbox, size, seed, onProgress) {
  const [w, s, e, n] = bbox;
  const lonSpan = e - w;
  const latSpan = n - s;
  const { fbm, n2, hash2 } = makeNoise(seed);
  const fields = buildFields(bbox);
  const elev = new Float32Array(size * size);
  const CHUNK = 64;

  // pass 1 — elevation
  for (let j0 = 0; j0 < size; j0 += CHUNK) {
    for (let j = j0; j < Math.min(size, j0 + CHUNK); j++) {
      const lat = n - ((j + 0.5) / size) * latSpan;
      const v = j / size;
      for (let i = 0; i < size; i++) {
        const lng = w + ((i + 0.5) / size) * lonSpan;
        const u = i / size;
        const h = fields.sample(fields.himalaya, u, v);
        const hill = fields.sample(fields.forest, u, v);
        const nx = lng * 0.62;
        const ny = lat * 0.62;
        const base = fbm(nx, ny, 6);
        const rid = 1 - Math.abs(2 * fbm(nx * 1.3 + 11, ny * 1.3 + 5, 5) - 1);
        elev[j * size + i] = lerp(base, rid, h * 0.75) * (0.35 + 0.65 * (h + 0.35 * hill)) + h * 0.55 + 0.12 * base;
      }
    }
    onProgress?.(0.5 * Math.min(1, (j0 + CHUNK) / size));
    await nextFrame();
  }

  // pass 2 — colour + hillshade
  const img = ctx.createImageData(size, size);
  const px = img.data;
  const col = [0, 0, 0];
  const tmp = [0, 0, 0];
  const tmp2 = [0, 0, 0];
  for (let j0 = 0; j0 < size; j0 += CHUNK) {
    for (let j = j0; j < Math.min(size, j0 + CHUNK); j++) {
      const lat = n - ((j + 0.5) / size) * latSpan;
      const v = j / size;
      for (let i = 0; i < size; i++) {
        const lng = w + ((i + 0.5) / size) * lonSpan;
        const u = i / size;
        const k = j * size + i;
        const E = elev[k];

        const h = fields.sample(fields.himalaya, u, v);
        const d = fields.sample(fields.desert, u, v);
        const p = fields.sample(fields.plain, u, v);
        let f = fields.sample(fields.forest, u, v);
        f = clamp(f * (0.78 + 0.5 * fbm(lng * 1.7 + 3, lat * 1.7 + 8, 3)) - 0.06);
        f *= 1 - smooth(0.3, 0.85, h);

        const c1 = fbm(lng * 3.2, lat * 3.2, 4);
        const c2 = n2(lng * 19, lat * 19);

        // base land: dry scrub
        mix3(C.scrubA, C.scrubB, c1, col);
        // desert
        mix3(C.desertA, C.desertB, c1 * 0.8 + c2 * 0.2, tmp);
        mix3(col, tmp, d, col);
        // farmland mosaic (plains)
        if (p > 0.02) {
          const wx = lng + (n2(lng * 6, lat * 6) - 0.5) * 0.06;
          const wy = lat + (n2(lng * 6 + 40, lat * 6) - 0.5) * 0.06;
          const cx = Math.floor(wx * 7);
          const cy = Math.floor(wy * 7);
          const cell = C.crop[Math.floor(hash2(cx, cy) * 4) % 4];
          const edge = Math.min(wx * 7 - cx, wy * 7 - cy);
          const shade = edge < 0.07 ? 0.72 : 0.92 + 0.12 * c2;
          tmp[0] = cell[0] * shade; tmp[1] = cell[1] * shade; tmp[2] = cell[2] * shade;
          mix3(col, tmp, p * 0.92, col);
        }
        // forest (wet evergreen in the west / north-east, drier olive elsewhere)
        const wet = clamp(smooth(78, 74.5, lng) + smooth(90, 93, lng));
        mix3(C.forestDeep, C.forestMid, c1 * 0.9 + c2 * 0.15, tmp);
        mix3(C.forestDry, C.forestLight, c1, tmp2);
        mix3(tmp2, tmp, wet * 0.8 + 0.2, tmp);
        mix3(col, tmp, clamp(f * 1.25), col);
        // high Himalaya: rock + snow
        if (h > 0.02) {
          mix3(C.rockA, C.rockB, clamp(c1 * 0.7 + E * 0.5), tmp);
          const snow = smooth(0.66, 0.9, E + (lat - 30) * 0.015);
          mix3(tmp, C.snow, snow, tmp);
          mix3(col, tmp, h * 0.95, col);
        }
        // rivers
        const river = Math.abs(fbm(lng * 0.9 + 40, lat * 0.9 + 9, 3) - 0.5);
        if (river < 0.012 && (p > 0.15 || f > 0.2) && h < 0.5) {
          mix3(col, C.water, (1 - river / 0.012) * 0.85, col);
        }

        // hillshade (light from north-west)
        const iw = i > 0 ? k - 1 : k;
        const ie = i < size - 1 ? k + 1 : k;
        const jn = j > 0 ? k - size : k;
        const js = j < size - 1 ? k + size : k;
        const shade = clamp(1 + ((elev[iw] - elev[ie]) + (elev[jn] - elev[js])) * 9, 0.55, 1.5);

        const o = k * 4;
        px[o] = clamp(col[0] * shade, 0, 255);
        px[o + 1] = clamp(col[1] * shade, 0, 255);
        px[o + 2] = clamp(col[2] * shade, 0, 255);
        px[o + 3] = 255;
      }
    }
    onProgress?.(0.5 + 0.5 * Math.min(1, (j0 + CHUNK) / size));
    await nextFrame();
  }
  ctx.putImageData(img, 0, 0);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load India texture: ${url}`));
    img.src = url;
  });
}

function drawMask(size, geometry, bbox) {
  const [w, s, e, n] = bbox;
  const mask = document.createElement('canvas');
  mask.width = mask.height = size;
  const m = mask.getContext('2d');
  m.fillStyle = '#fff';
  m.beginPath();
  for (const poly of polygonsOf(geometry)) {
    for (const ring of poly) {
      ring.forEach(([lng, lat], i) => {
        const x = ((lng - w) / (e - w)) * size;
        const y = ((n - lat) / (n - s)) * size;
        if (i === 0) m.moveTo(x, y);
        else m.lineTo(x, y);
      });
      m.closePath();
    }
  }
  m.fill('evenodd');
  return mask;
}

/**
 * @param {object} opts
 * @param {object} opts.geometry   India GeoJSON geometry
 * @param {number[]} opts.bbox     [west, south, east, north]
 * @param {number} [opts.size]     canvas edge in px (default 1280)
 * @param {string|null} [opts.imageUrl]  optional real imagery (cropped to bbox)
 * @param {(p:number)=>void} [opts.onProgress]
 * @returns {Promise<THREE.CanvasTexture>}
 */
export async function buildIndiaTexture({ geometry, bbox, size = 1280, imageUrl = null, seed = 20261101, onProgress }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  let painted = false;
  if (imageUrl) {
    try {
      const img = await loadImage(imageUrl);
      ctx.drawImage(img, 0, 0, size, size);
      painted = true;
    } catch (err) {
      console.warn('[india-texture] falling back to procedural imagery:', err.message);
    }
  }
  if (!painted) await paintProcedural(ctx, bbox, size, seed, onProgress);

  // mask to India's boundary
  const mask = drawMask(size, geometry, bbox);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
