# Architecture: LILA BLACK Player Journey Visualizer

## Tech Stack

| Layer        | Choice             | Why                                                                                  |
|--------------|--------------------|--------------------------------------------------------------------------------------|
| Frontend     | React 18 + Vite    | Fast HMR in dev, trivial Vercel deploy, component model suits complex UI state       |
| Rendering    | Canvas 2D API      | Handles thousands of points at 60fps; DOM/SVG collapses above ~500 elements          |
| Styling      | Plain CSS variables| No build step, no class purging surprises, easy to theme                             |
| Data format  | JSON (preprocessed)| Parquet can't be parsed in the browser; JSON is universal and cacheable by CDN       |
| Preprocessing| Python + PyArrow   | Native parquet support, fast, already in most data-science envs                      |
| Hosting      | Vercel             | Zero-config for Vite, edge CDN for JSON data files, instant preview URLs             |

## Data Flow

```
player_data/
  February_10/...  ← raw .nakama-0 parquet files
  February_11/...
  ...
        │
        ▼
scripts/preprocess.py
  • reads each parquet file with PyArrow
  • decodes event bytes → UTF-8 string
  • detects bot vs human (UUID vs numeric user_id)
  • downsamples Position events 1-in-3 (reduces JSON by ~65% while keeping path fidelity)
  • groups events by match_id (strip .nakama-0 suffix)
  • writes one JSON per match
        │
        ▼
public/data/
  index.json          ← match list with metadata (loaded once at startup)
  matches/{id}.json   ← per-match event array (loaded on demand)
        │
        ▼
React app (browser)
  useIndex()      → fetch /data/index.json once → populates filter dropdowns
  useMatch(id)    → fetch /data/matches/{id}.json on selection → in-memory cache
  MapCanvas.jsx   → Canvas 2D renders: minimap bg → heatmap → paths → event markers
  Timeline.jsx    → rAF loop advances currentTs at game speed × wall-clock ms
```

## Coordinate Mapping

The README specifies a world-to-UV conversion per map, then UV-to-pixel for a 1024×1024 image:

```
u = (x  - origin_x) / scale
v = (z  - origin_z) / scale      ← note: use z, not y (y = elevation)

pixel_x = u * 1024
pixel_y = (1 - v) * 1024         ← Y flipped: image origin is top-left
```

This is implemented in `src/utils/coordinates.js → worldToPixel()`.  
All canvas drawing calls pass through a secondary `scalePixel()` that maps the 1024-space pixel to the actual canvas display size (800px), so the same math works regardless of display resolution or DPR.

Per-map config:

| Map           | Scale | Origin X | Origin Z |
|---------------|-------|----------|----------|
| AmbroseValley | 900   | –370     | –473     |
| GrandRift     | 581   | –290     | –290     |
| Lockdown      | 1000  | –500     | –500     |

## Heatmap

A 128×128 grid is overlaid on the 1024-space coordinate system. For each `Position` / `BotPosition` event, the cell at `(floor(px/1024*128), floor(py/1024*128))` is incremented. Values are normalized by `sqrt(v/max)` (square-root scale gives better visual spread than linear), then mapped through a 6-stop gradient (transparent → blue → cyan → green → yellow → red). An 8px CSS blur smooths the grid into a continuous heat surface. The heatmap is built once per match load and cached as an offscreen canvas.

## Tradeoffs

| Decision                        | Considered               | Chose                    | Reason                                                                     |
|---------------------------------|--------------------------|--------------------------|----------------------------------------------------------------------------|
| Rendering engine                | SVG, D3, Three.js        | Canvas 2D                | Simplest path to 60fps with 5k+ points; no extra dependency                |
| Data serving                    | API server, DuckDB-WASM  | Static JSON files        | No server cost; Vercel CDN caches per-match files; simpler ops              |
| Parquet in browser              | DuckDB-WASM, parquet-wasm| Pre-process to JSON      | 5-10MB WASM payload + query latency vs instant JSON load; JSON wins for UX |
| Position downsampling           | Full fidelity            | 1-in-3 samples           | Paths are visually indistinguishable; cuts JSON size from ~15MB to ~5MB    |
| Heatmap resolution              | 64, 128, 256 grid        | 128                      | 64 is blocky; 256 is slow to build; 128 is smooth and <1ms to compute      |

## Assumptions

- The `ts` column represents milliseconds elapsed within the match (as described in README), not wall-clock Unix time. The epoch-looking dates in the sample rows (`1970-01-21`) are an artefact of the timestamp being stored as a duration.
- `y` (elevation) is not used for 2D rendering — only `x` and `z` map to the minimap plane.
- February 14 is partial — the visualizer treats it identically to other days; the match selector will show fewer matches for that date.
- Bots are identified by non-UUID `user_id` values (short integers). The README confirms this convention.
