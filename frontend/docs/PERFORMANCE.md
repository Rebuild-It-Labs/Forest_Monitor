# Performance notes

## Design choices that keep it light

| Area | Choice | Why |
|---|---|---|
| World borders | One `LineSegments` (single draw call), 110m data, edges subdivided at 2.5° | no per-country meshes |
| India border | 50m data, subdivided at 1.2°, drawn twice with drei `Line` (glow + crisp) | detail only where it is seen |
| Globe body | custom shader: fresnel + graticule from UVs | no textures, no grid geometry |
| Atmosphere | one back-face additive shell | no post-processing |
| Post-processing | **none** | glow is faked with additive sprites and shells |
| Markers | 10 small groups, animated by ref mutation in `useFrame` | zero React re-renders per frame |
| Marker glow | one shared 128² canvas texture | one texture upload |
| India texture | 1280² canvas, built once, time-sliced into 64-row chunks | boot screen stays responsive |
| Pixel ratio | `dpr={[1, 1.75]}`, drops to 1 when `PerformanceMonitor` reports a decline | protects low-end GPUs |
| Tone mapping | `flat` (off) | cheaper and keeps neon colours exact |
| Bundle | manual chunks for three, r3f/drei, recharts, framer-motion; world-atlas JSON is a lazy chunk | faster first paint |
| Fonts | self-hosted via `@fontsource` | no third-party requests |
| Chart | Recharts with ~12 points | trivial |
| Smooth scroll | one rAF loop only while a wheel scroll is settling | idle cost is zero |

## Tuning knobs

- `IndiaLayer` `textureSize` (default 1280): 1024 for phones, 2048 for sharper close-ups (4× memory).
- `InteractiveGlobe` `maxDpr` (1.75): lower to 1.25 on integrated GPUs.
- `Stars count` (1600) can be reduced.
- `SphereGeometry` segments for the India patch (160×160): 96 is visually indistinguishable at normal zoom.
- `CountryBorders` subdivide step (2.5°): larger = fewer vertices, slightly angular borders near the limb.

## Approximate budgets (design targets, not measured)

I could not run a real GPU benchmark in the environment that built this project, so treat these as targets to verify
on your hardware with the browser's Performance panel or `stats-gl`:

- Draw calls: roughly 60–80 (body, atmosphere, 2 border layers, India patch, ~6 per marker).
- Triangles: well under 150k.
- GPU memory: ~7 MB for the 1280² India texture plus mipmaps.

## Measuring

1. Chrome DevTools → Performance → record 5 s of idle rotation and 5 s of fly-to.
2. Look for long main-thread tasks during boot (texture painting) and any per-frame React commits (there should be none).
3. `renderer.info` (via `useThree(s => s.gl.info)`) reports calls and triangles.

## Responsive behaviour

- ≥ 1024 px: left telemetry stack, right 480 px panel, projection shifted so the selected marker clears the panel.
- < 1024 px: telemetry collapses to a header with an expandable section; the details panel becomes a 64 dvh bottom
  sheet with swipe-to-dismiss; the projection shifts upward instead of sideways.
- `prefers-reduced-motion`: CSS animations are neutralised and inertial scrolling is disabled.
