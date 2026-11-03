# Architecture

## Component tree

```
App
├── InteractiveGlobe            (R3F <Canvas>, z-0)
│   ├── Stars
│   ├── GlobeBase               body shader + atmosphere
│   ├── CountryBorders          world outlines (1 draw call)
│   ├── IndiaLayer              masked satellite patch + neon border
│   ├── PulsarMarker × N
│   ├── OrbitControls (makeDefault)
│   └── CameraRig               fly-to, idle rotate, view-offset
├── ScreenFX                    scanlines / vignette / sweep (CSS)
├── TelemetryOverlay            left HUD (fixed, absolute-positioned)
├── BottomBar                   legend + recenter
├── DetailsPanel                right sliding panel
│   ├── ImageryViewer           sequence + compare modes
│   ├── StatTile × 4
│   └── TrendChart
└── BootScreen                  until data + geometry + texture are ready
```

## State

`App` owns the only cross-cutting state: `selectedId`, `recenterToken` and boot `stages`. There is no store library.
The globe never receives the whole dataset's heavy fields, only `locations`.

```
click pulsar ─► onSelect(id) ─► App.selectedId
                                 ├─► InteractiveGlobe → CameraRig flies to target, applies panel inset
                                 └─► DetailsPanel opens (AnimatePresence)
Esc / ✕ / swipe ─► selectedId = null ─► panel exits, camera eases back, auto-rotate resumes after idle
```

## Geometry conventions

`lib/geo.js` uses the three.js sphere UV convention:

```
phi = (90 − lat)°, theta = (lng + 180)°
x = −r·sinφ·cosθ,  y = r·cosφ,  z = r·sinφ·sinθ
```

Because `SphereGeometry(r, ws, hs, phiStart, phiLen, thetaStart, thetaLen)` uses the same convention, the India patch
(built from the lat/lng bbox) and every marker line up with no extra transform.

## India masking pipeline

1. `loadGeo()` reads `world-atlas` 110m (all other countries) and 50m (India) and converts them with `topojson-client`.
2. `buildIndiaTexture()` paints a square canvas covering `INDIA_BBOX = [67, 6, 98.5, 37.5]` (equirectangular).
   Either a real image (`meta.indiaTexture.url`) or the procedural painter (value-noise elevation, hillshade,
   forest/desert/farmland/Himalaya zones, rivers). Work is time-sliced in 64-row chunks so the boot screen stays animated.
3. The canvas is clipped with the India polygon (`destination-in`, even-odd fill), leaving everything else transparent.
4. `IndiaLayer` applies it to a sphere patch at radius 1.002 with `depthWrite: false`.
5. Layer order (radius / renderOrder): body 1.0 → patch 1.002 (1) → world lines 1.0012 (2) → India outline 1.0035 (2–3) →
   markers 1.0045 (4–6).

## Camera

`CameraRig` is the single owner of camera motion:

- **Fly-to:** OrbitControls is disabled for the flight. The camera direction is slerped from its current direction to the
  target normal with `easeInOutCubic`; distance is lerped to 1.72 with a sine "pull-back" bump so the move reads as an arc.
- **Panel inset:** `camera.setViewOffset` shifts the projection by half the panel width (or height on mobile) so the
  selected marker lands in the visible area. The offset is damped in and out and cleared when near zero.
- **Idle:** `autoRotate` is on only when nothing is selected, no flight is running and 5.5 s have passed since the last
  OrbitControls `start`/`end` event. Rotate speed scales with zoom.

## Marker animation

Per-frame work is done by mutating refs inside `useFrame`; React never re-renders for animation. Hover amount is a damped
0 → 1 value that drives scale, pulse speed and glow opacity. The hit target is an invisible, larger disc, and clicks with
`event.delta > 6` px are ignored so drags don't select. The planet body swallows pointer events so far-side markers can't
be hovered through the globe.

## Details panel

- Desktop: fixed right panel, spring slide from `x: 108%`. Mobile (< 1024 px): bottom sheet, `drag="y"` from the header
  only, dismiss on > 110 px or fast flick.
- `useSmoothScroll` eases wheel input toward a target scroll position each frame.
- Switching sites while open cross-fades the body (`AnimatePresence mode="wait"` keyed by `loc.id`); the chart is re-keyed
  so its draw-in animation replays.

## Data flow

`useMonitoringData` fetches `import.meta.env.VITE_DATA_URL || /data/data.json`, validates the top-level shape, and
holds the result for at least ~650 ms so the boot sequence is perceivable. Image paths are resolved by
`resolveAsset(meta.assetBase, src)`.

## Extending

| Goal | Where |
|---|---|
| Different globe look | `GlobeBase.jsx` shaders |
| More markers | add to `locations[]`; no code change |
| New panel section | add to `DetailsPanel.jsx` body; read from `loc.*` |
| Real-time feed | replace intervals in `useLiveTelemetry.js` |
| Clustering for hundreds of sites | swap `PulsarMarker` list for one `InstancedMesh` with a custom hit-test |
