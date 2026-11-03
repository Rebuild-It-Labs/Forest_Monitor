# Data schema — `data.json`

The app fetches this file at runtime (default `/data/data.json`; override with `VITE_DATA_URL`). It is laid out like a
data repository snapshot: registry + per-site imagery paths + yearly statistics + telemetry.

> The bundled file is **synthetic**. `meta.dataStatus: "SYNTHETIC_DEMO"` makes the UI show a "SIMULATED DEMO DATA" badge.
> Set it to any other value (e.g. `"LIVE"`) once real data is in place to remove the badge and panel disclaimer.

## Top level

```jsonc
{
  "meta": { … },
  "telemetry": { … },
  "locations": [ { … } ]
}
```

Required: `meta`, `telemetry`, `locations[]` (checked at load; a missing key shows "DATA LINK FAILURE").

## `meta`

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | string | informational |
| `title` | string | informational |
| `dataStatus` | string | `"SYNTHETIC_DEMO"` shows demo badges |
| `generatedAt` | ISO string | informational |
| `coordinateSystem` | string | WGS84 |
| `source` | object | repo / branch / rawBase, informational |
| `assetBase` | string | prefix for relative image `src`; `"/"` means the Vite base URL |
| `indiaTexture.url` | string \| null | optional real mosaic (square, equirectangular, cropped to `bbox`) |
| `indiaTexture.bbox` | `[w, s, e, n]` | default `[67, 6, 98.5, 37.5]`; keep the box square-ish |
| `years` | number[] | the 11 years 2016–2026 |

## `telemetry`

```jsonc
"system": {
  "uplink": "ONLINE",
  "modelVersion": "Swin-ViT-B · forest-v1.3",
  "lastCompositeUtc": "2026-10-28T06:40:00Z",
  "latencyMs":     { "base": 138, "jitter": 22 },   // displayed value = base ± jitter, refreshed each second
  "ingestRateMBs": { "base": 38.4, "jitter": 6.5 },
  "gpuLoadPct":    { "base": 64,  "jitter": 9 },
  "constellation": [ { "name": "SENTINEL-2A", "status": "NOMINAL", "nextPassMin": 42 } ]
},
"metrics": [ { "id": "alerts", "label": "ACTIVE ALERTS", "value": 5, "unit": "", "tone": "alert" } ],
"feed":    [ { "type": "ALERT", "text": "…", "locationId": "hasdeo-arand" } ]
```

- `metrics[].tone`: `neon` | `alert`. `id: "confidence"` renders with one decimal.
- `feed[].type`: `ALERT` | `PASS` | `MODEL` | `INFO`. `locationId` must exist in `locations`, and clicking the item selects that site.

## `locations[]`

```jsonc
{
  "id": "hasdeo-arand",              // unique slug, used for keys + image folder
  "index": 3,                        // display number "SITE // 03"
  "name": "Hasdeo Arand",
  "state": "Chhattisgarh",
  "biome": "Sal & mixed deciduous · coal belt",
  "lat": 22.62, "lng": 82.55,        // WGS84 decimal degrees
  "severity": "CRITICAL",            // CRITICAL | ELEVATED | STABLE

  "imagery": {
    "tenYearsAgo":  { "src": "images/hasdeo-arand/10y.svg",     "label": "10 YEARS AGO", "short": "T-10Y",
                      "date": "2016-11-04", "sensor": "Landsat-8 OLI", "resolutionM": 30, "cloudCover": 3 },
    "fiveYearsAgo": { "src": "…/5y.svg",      "label": "5 YEARS AGO", "short": "T-5Y", "…": "…" },
    "current":      { "src": "…/current.svg", "label": "CURRENT · 5-DAY COMPOSITE", "short": "NOW", "…": "…" },
    "heatmap":      { "src": "…/heatmap.svg", "label": "SWIN-VIT PREDICTION HEATMAP", "short": "AI",
                      "date": "2026-10-28", "model": "swin-vit-b · forest-v1.3",
                      "horizonMonths": 12, "confidence": 0.91 }
  },

  "series": [ { "year": 2016, "coverKha": 170.0, "lossHa": 0 }, … 11 rows … ],
  "forecast": { "year": 2027, "coverKha": 125.1, "lossHa": 1990 },

  "stats": {
    "coverNowKha": 127.09, "coverThenKha": 170, "changePct10y": -25.24,
    "totalLossHa10y": 40210, "peakLossYear": 2017, "peakLossHa": 8212,
    "mlRisk12m": 0.88, "mlPredictedLossHa12m": 1990
  }
}
```

All four `imagery` keys are required (the viewer iterates them). Any image format the browser supports works; SVG is used
for placeholders. Units: `coverKha` = thousand hectares, `lossHa` = hectares lost in that year. `mlRisk12m` is 0–1.

## Using a real GitHub repository

1. Commit `data.json` and an `images/` folder to a repo, e.g. `your-org/india-forest-watch-data`.
2. Set `VITE_DATA_URL=https://raw.githubusercontent.com/your-org/india-forest-watch-data/main/data/data.json`.
3. Either use absolute image URLs, or set `meta.assetBase` to the raw base (`…/main/data/`).
4. raw.githubusercontent.com sends permissive CORS headers, so no proxy is needed.

## Adding a site (checklist)

- [ ] unique `id`, valid `lat`/`lng`
- [ ] four imagery entries with working `src`
- [ ] `series` with one row per year and `forecast`
- [ ] `stats` consistent with `series`
- [ ] optional feed item whose `locationId` matches
