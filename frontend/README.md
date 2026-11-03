# India Forest Watch — Satellite Deforestation Monitor

A fullscreen, cyberpunk-styled dashboard built on **React 19 + Vite + React Three Fiber**. A slowly rotating dark
wireframe globe shows India in satellite-style imagery, strictly masked to the national border. Pulsing neon markers sit
on monitored forest sites. Clicking one flies the camera in and slides open a details panel with a 10-year imagery
timeline, a Swin-ViT prediction heatmap and a forest-cover trend chart.

> **Data status.** Everything in `public/data/data.json` and `public/images/` is **simulated demo data**: site names and
> coordinates are real places, but cover figures, loss numbers, dates, sensors, model scores and imagery are
> procedurally generated. The UI labels this on screen. See [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md) to plug in real output.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve dist/ locally
```

Requirements: Node ≥ 18.18, a browser with WebGL2.

Optional data scripts (the generated files are already committed):

```bash
npm run data:json      # rebuild public/data/data.json
npm run data:images    # rebuild placeholder imagery in public/images/<site>/
npm run data:all       # both
```

---

## Inputs and outputs

| | What | Where |
|---|---|---|
| **Input** | Site registry, imagery paths, yearly stats, telemetry | `public/data/data.json` (or `VITE_DATA_URL`) |
| **Input** | Per-site imagery: `10y`, `5y`, `current`, `heatmap` | `public/images/<site-id>/` |
| **Input** | Country borders | `world-atlas` npm package (CDN fallback) |
| **Input (optional)** | Real India mosaic cropped to bbox | `meta.indiaTexture.url` |
| **Output** | Static site | `dist/` after `npm run build` |

Environment (`.env.example`): `VITE_DATA_URL` loads the dataset from any URL, e.g. a raw GitHub file. Relative image
paths are resolved against `meta.assetBase`.

---

## Project structure

```
india-forest-watch/
├── index.html
├── package.json · vite.config.js · tailwind.config.js · postcss.config.js
├── .env.example
├── public/
│   ├── data/data.json              ← the dataset (fetched at runtime)
│   ├── images/<site-id>/{10y,5y,current,heatmap}.svg
│   └── favicon.svg
├── scripts/
│   ├── generate-data.mjs           ← builds data.json (synthetic)
│   └── generate-placeholders.mjs   ← builds placeholder imagery
├── src/
│   ├── main.jsx · index.css · App.jsx
│   ├── components/
│   │   ├── InteractiveGlobe.jsx    ← R3F canvas + composition
│   │   ├── DetailsPanel.jsx        ← sliding panel (Framer Motion)
│   │   ├── TelemetryOverlay.jsx    ← left HUD
│   │   ├── BottomBar.jsx · BootScreen.jsx · ErrorBoundary.jsx
│   │   ├── globe/  GlobeBase · CountryBorders · IndiaLayer · PulsarMarker · CameraRig
│   │   ├── panel/  ImageryViewer · TrendChart · StatTile
│   │   └── ui/     HudCard · ScreenFX · AnimatedNumber · SignalBars
│   ├── hooks/      useMonitoringData · useGeoData · useLiveTelemetry · useSmoothScroll · useMediaQuery
│   └── lib/        geo · satelliteTexture · glowTexture · format
└── docs/           ARCHITECTURE.md · DATA_SCHEMA.md · PERFORMANCE.md
```

---

## Feature map

| Requirement | Implementation |
|---|---|
| Auto-rotating dark translucent globe | `GlobeBase` (fresnel rim, graticule shader, additive atmosphere) + OrbitControls `autoRotate` |
| Rest of world: wireframe only | `CountryBorders`: one `LineSegments` draw call of thin grey outlines, no textures |
| India: satellite imagery masked to border | `IndiaLayer` + `satelliteTexture.js`: bbox sphere patch, canvas painted then clipped with `destination-in` against India's polygon |
| Pulsar markers | `PulsarMarker`: double ring pulse, glow sprite, beam; hover scales and brightens; selected gets a rotating reticle |
| Click → fly-to → panel | `CameraRig` slerps around the globe with a pull-back arc; `App` opens `DetailsPanel` on selection |
| Orbit + zoom limits, idle return | `minDistance 1.35`, `maxDistance 4.6`, polar clamps; auto-rotate resumes 5.5 s after last interaction |
| Sliding glass panel | Framer Motion spring from right edge (bottom sheet with swipe-to-dismiss on mobile) |
| Momentum scrolling | `useSmoothScroll`: eased wheel scrolling, disabled for reduced-motion users |
| Header with LIVE status | Name, lat/long, severity chip, blinking "LIVE SATELLITE FEED TRACKING" |
| Imagery timeline | 10y / 5y / Current (≈5-day composite) / Swin-ViT heatmap: auto-playing cross-fade sequence **and** a before/after compare slider |
| Neon trend chart | Recharts: cover area, annual-loss line (right axis), dashed AI forecast |
| Close + ease back | ✕ button, `Esc`, swipe-down on mobile; camera eases back out |
| Data layer | `data.json` fetched via `useMonitoringData` as if remote |

---

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Orbit | drag | one-finger drag |
| Zoom | wheel | pinch |
| Inspect site | click a pulsar (or a feed item) | tap |
| Close panel | ✕, `Esc` | ✕ or swipe down |
| Back to India | **RECENTER** | **RECENTER** |

---

## Customising

- **Add a site:** append to `SITES` in `scripts/generate-data.mjs` and re-run `npm run data:all`, or add an object to
  `locations[]` by hand (see the schema doc).
- **Real imagery:** replace files under `public/images/` and/or set absolute URLs in `imagery.*.src`.
- **Real India texture:** export an equirectangular crop of bbox `[67, 6, 98.5, 37.5]` (square) and set
  `meta.indiaTexture.url`. The border mask is applied automatically.
- **Colours:** edit `theme.extend.colors` in `tailwind.config.js`; the 3D accent lives in the `NEON` constants.
- **Live telemetry:** `useLiveTelemetry` simulates jitter and a rolling feed; swap its intervals for a WebSocket/SSE source.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Black screen with "RENDER FAULT" | WebGL disabled/unsupported; enable hardware acceleration |
| "DATA LINK FAILURE" | `data.json` unreachable; check `VITE_DATA_URL` and CORS |
| Country borders missing | `world-atlas` import failed and CDN fallback is blocked; run `npm install` |
| Low frame rate | See [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md); lower `textureSize` or DPR cap |

Further reading: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md) · [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)
