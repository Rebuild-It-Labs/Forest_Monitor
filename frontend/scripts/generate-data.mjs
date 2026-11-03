/**
 * generate-data.mjs
 * ---------------------------------------------------------------
 * Builds public/data/data.json — a *synthetic* dataset that mimics the layout of a
 * real GitHub data repository (index file + per-site imagery paths + yearly stats).
 *
 *   node scripts/generate-data.mjs
 *
 * ⚠  Every number produced here is SIMULATED demo data. Site names and coordinates are real
 *    places in India, but cover/loss figures, dates, sensors and model scores are invented
 *    so the UI has something realistic to render. Replace public/data/data.json (or point
 *    VITE_DATA_URL at your own repo) with real pipeline output.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/data/data.json');

// ---- deterministic PRNG -------------------------------------------------------------
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

// ---- site definitions ---------------------------------------------------------------
// cover0: simulated forest cover in 2016 (thousand hectares)
// pace:   simulated average annual loss as % of remaining cover (higher = worse)
// risk:   simulated 12-month ML risk score 0..1
const SITES = [
  { id: 'wayanad', name: 'Wayanad Plateau', state: 'Kerala', biome: 'Tropical moist evergreen · Western Ghats', lat: 11.685, lng: 76.132, cover0: 312, pace: 0.55, risk: 0.41 },
  { id: 'sundarbans', name: 'Sundarbans Delta', state: 'West Bengal', biome: 'Mangrove · tidal delta', lat: 21.95, lng: 88.9, cover0: 421, pace: 0.4, risk: 0.37 },
  { id: 'hasdeo-arand', name: 'Hasdeo Arand', state: 'Chhattisgarh', biome: 'Sal & mixed deciduous · coal belt', lat: 22.62, lng: 82.55, cover0: 170, pace: 2.3, risk: 0.88 },
  { id: 'great-nicobar', name: 'Great Nicobar', state: 'Andaman & Nicobar Islands', biome: 'Tropical rainforest · island', lat: 7.0, lng: 93.85, cover0: 96, pace: 1.7, risk: 0.72 },
  { id: 'dehing-patkai', name: 'Dehing Patkai', state: 'Assam', biome: 'Lowland rainforest · Brahmaputra valley', lat: 27.33, lng: 95.55, cover0: 111, pace: 1.35, risk: 0.63 },
  { id: 'similipal', name: 'Similipal Hills', state: 'Odisha', biome: 'Moist deciduous · biosphere reserve', lat: 21.85, lng: 86.35, cover0: 275, pace: 0.95, risk: 0.54 },
  { id: 'nallamala', name: 'Nallamala Range', state: 'Andhra Pradesh · Telangana', biome: 'Dry deciduous · Eastern Ghats', lat: 15.9, lng: 78.9, cover0: 238, pace: 1.2, risk: 0.58 },
  { id: 'bastar', name: 'Bastar Highlands', state: 'Chhattisgarh', biome: 'Sal forest · Deccan plateau', lat: 19.1, lng: 81.95, cover0: 354, pace: 1.85, risk: 0.79 },
  { id: 'garhwal', name: 'Garhwal Himalaya', state: 'Uttarakhand', biome: 'Temperate oak & pine · Himalaya', lat: 30.3, lng: 78.8, cover0: 190, pace: 0.7, risk: 0.34 },
  { id: 'namdapha', name: 'Namdapha Basin', state: 'Arunachal Pradesh', biome: 'Eastern Himalayan evergreen', lat: 27.5, lng: 96.4, cover0: 205, pace: 0.45, risk: 0.29 },
];

const YEARS = Array.from({ length: 11 }, (_, i) => 2016 + i); // 2016..2026

function buildSeries(site) {
  const rnd = mulberry32(hash(site.id));
  const rows = [];
  let cover = site.cover0;
  for (const year of YEARS) {
    let lossHa = 0;
    if (year > YEARS[0]) {
      // mild acceleration for high-risk sites + noise + occasional spike
      const accel = 1 + (site.risk - 0.4) * 0.35 * ((year - 2016) / 10);
      const noise = 0.7 + rnd() * 0.7;
      const spike = rnd() > 0.86 ? 1.6 : 1;
      const pct = (site.pace / 100) * accel * noise * spike;
      const lossKha = cover * pct;
      const regrow = lossKha * (0.04 + rnd() * 0.05);
      cover = cover - lossKha + regrow;
      lossHa = Math.round(lossKha * 1000);
    }
    rows.push({ year, coverKha: +cover.toFixed(2), lossHa });
  }
  // 1-year ML forecast
  const last = rows[rows.length - 1];
  const fcLoss = Math.round(last.lossHa * (0.9 + site.risk * 0.5));
  const forecast = { year: 2027, coverKha: +(last.coverKha - fcLoss / 1000).toFixed(2), lossHa: fcLoss };
  return { rows, forecast };
}

function buildSite(site, index) {
  const rnd = mulberry32(hash(site.id + ':meta'));
  const { rows, forecast } = buildSeries(site);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const peak = rows.reduce((a, b) => (b.lossHa > a.lossHa ? b : a), rows[1]);
  const sum = rows.reduce((s, r) => s + r.lossHa, 0);
  const severity = site.risk >= 0.75 ? 'CRITICAL' : site.risk >= 0.55 ? 'ELEVATED' : 'STABLE';
  const dir = `images/${site.id}`;
  return {
    id: site.id,
    index: index + 1,
    name: site.name,
    state: site.state,
    biome: site.biome,
    lat: site.lat,
    lng: site.lng,
    severity,
    imagery: {
      tenYearsAgo: {
        src: `${dir}/10y.svg`, label: '10 YEARS AGO', short: 'T-10Y', date: '2016-11-04',
        sensor: 'Landsat-8 OLI', resolutionM: 30, cloudCover: Math.round(rnd() * 6),
      },
      fiveYearsAgo: {
        src: `${dir}/5y.svg`, label: '5 YEARS AGO', short: 'T-5Y', date: '2021-11-02',
        sensor: 'Sentinel-2B MSI', resolutionM: 10, cloudCover: Math.round(rnd() * 5),
      },
      current: {
        src: `${dir}/current.svg`, label: 'CURRENT · 5-DAY COMPOSITE', short: 'NOW', date: '2026-10-23/2026-10-28',
        sensor: 'Sentinel-2A/B + Landsat-9', resolutionM: 10, cloudCover: Math.round(rnd() * 4),
      },
      heatmap: {
        src: `${dir}/heatmap.svg`, label: 'SWIN-VIT PREDICTION HEATMAP', short: 'AI', date: '2026-10-28',
        model: 'swin-vit-b · forest-v1.3', horizonMonths: 12, confidence: +(0.86 + rnd() * 0.1).toFixed(3),
      },
    },
    series: rows,
    forecast,
    stats: {
      coverNowKha: last.coverKha,
      coverThenKha: first.coverKha,
      changePct10y: +(((last.coverKha - first.coverKha) / first.coverKha) * 100).toFixed(2),
      totalLossHa10y: sum,
      peakLossYear: peak.year,
      peakLossHa: peak.lossHa,
      mlRisk12m: site.risk,
      mlPredictedLossHa12m: fcLoss(forecast),
    },
  };
}
const fcLoss = (f) => f.lossHa;

const locations = SITES.map(buildSite);

// ---- telemetry (left-hand overlays) -------------------------------------------------
const alerts = locations.filter((l) => l.severity !== 'STABLE');
const loss30d = Math.round(locations.reduce((s, l) => s + l.series[l.series.length - 1].lossHa / 12, 0));
const avgConf = +(
  (locations.reduce((s, l) => s + l.imagery.heatmap.confidence, 0) / locations.length) * 100
).toFixed(1);

const byId = Object.fromEntries(locations.map((l) => [l.id, l]));
const feed = [
  { type: 'ALERT', text: 'Canopy gap expanding along access road', locationId: 'hasdeo-arand' },
  { type: 'PASS', text: 'Sentinel-2A pass ingested · tile 44QLK', locationId: 'bastar' },
  { type: 'MODEL', text: 'Swin-ViT inference complete · 214 patches', locationId: 'dehing-patkai' },
  { type: 'ALERT', text: 'New clearing signature near coastal works', locationId: 'great-nicobar' },
  { type: 'INFO', text: 'Cloud mask refreshed · composite rebuilt', locationId: 'wayanad' },
  { type: 'PASS', text: 'Landsat-9 pass ingested · path 143 row 044', locationId: 'nallamala' },
  { type: 'MODEL', text: 'Risk map updated · 12-month horizon', locationId: 'similipal' },
  { type: 'INFO', text: 'Mangrove edge stable · no change detected', locationId: 'sundarbans' },
  { type: 'ALERT', text: 'Slope-failure scar adjacent to logging track', locationId: 'garhwal' },
  { type: 'PASS', text: 'Sentinel-2B pass ingested · tile 46RGU', locationId: 'namdapha' },
].filter((f) => byId[f.locationId]);

const data = {
  meta: {
    schemaVersion: '1.0.0',
    title: 'India Forest Watch — Satellite Deforestation Monitor',
    dataStatus: 'SYNTHETIC_DEMO',
    notice: 'All statistics, dates and model scores in this file are simulated demo data.',
    generatedAt: '2026-11-01T00:00:00Z',
    coordinateSystem: 'WGS84 (EPSG:4326)',
    source: {
      type: 'github-repository',
      repository: 'your-org/india-forest-watch-data',
      branch: 'main',
      path: 'data/',
      rawBase: 'https://raw.githubusercontent.com/your-org/india-forest-watch-data/main/data/',
    },
    // Image `src` values are resolved against this base unless they are absolute URLs.
    assetBase: '/',
    // Optional: a real satellite mosaic, cropped to `bbox`, to texture India instead of the procedural one.
    indiaTexture: { url: null, bbox: [67, 6, 98.5, 37.5] },
    years: YEARS,
  },
  telemetry: {
    system: {
      uplink: 'ONLINE',
      modelVersion: 'Swin-ViT-B · forest-v1.3',
      lastCompositeUtc: '2026-10-28T06:40:00Z',
      latencyMs: { base: 138, jitter: 22 },
      ingestRateMBs: { base: 38.4, jitter: 6.5 },
      gpuLoadPct: { base: 64, jitter: 9 },
      constellation: [
        { name: 'SENTINEL-2A', status: 'NOMINAL', nextPassMin: 42 },
        { name: 'SENTINEL-2B', status: 'NOMINAL', nextPassMin: 118 },
        { name: 'LANDSAT-9', status: 'NOMINAL', nextPassMin: 76 },
        { name: 'RESOURCESAT-2A', status: 'STANDBY', nextPassMin: 203 },
      ],
    },
    metrics: [
      { id: 'sites', label: 'SITES MONITORED', value: locations.length, unit: '', tone: 'neon' },
      { id: 'alerts', label: 'ACTIVE ALERTS', value: alerts.length, unit: '', tone: 'alert' },
      { id: 'loss30d', label: 'CANOPY LOSS · 30D', value: loss30d, unit: 'ha', tone: 'alert' },
      { id: 'confidence', label: 'MODEL CONFIDENCE', value: avgConf, unit: '%', tone: 'neon' },
    ],
    feed,
  },
  locations,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
console.log(`✔ wrote ${OUT} (${locations.length} locations)`);
