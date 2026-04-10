# Architecture: LILA BLACK Player Journey Visualizer

## Tech Stack

| Layer      | Choice          | Why                                                                 |
|------------|-----------------|---------------------------------------------------------------------|
| Frontend   | React 18 + Vite | Fast dev, trivial Vercel deploy, component model suits complex UI   |
| Rendering  | Canvas 2D API   | Handles thousands of points at 60fps; DOM/SVG collapses above ~500  |
| Styling    | Plain CSS vars  | No build step, no purging surprises, easy dark theme                |
| Data       | Static JSON     | Parquet cant be parsed in browser; JSON is universal and CDN-cached |
| Pipeline   | Python + PyArrow| Native parquet support, fast, standard in data environments         |
| Hosting    | Vercel          | Zero-config for Vite, edge CDN for JSON files, instant preview URLs |

---

## Data Flow
---

## Coordinate Mapping

The README specifies this conversion from world coordinates to minimap pixels:
Implemented in src/utils/coordinates.js -> worldToPixel().
A second function scalePixel() maps the 1024-space pixel to the canvas
display size (800px), so the math works at any resolution or DPR.

Per-map config:

| Map           | Scale | Origin X | Origin Z |
|---------------|-------|----------|----------|
| AmbroseValley | 900   | -370     | -473     |
| GrandRift     | 581   | -290     | -290     |
| Lockdown      | 1000  | -500     | -500     |

---

## Heatmap

A 128x128 grid overlaid on the 1024-space coordinate system.
Each Position/BotPosition event increments the cell at its location.
Values normalized by sqrt(v/max) for better visual spread than linear.
Mapped through a 6-stop gradient (transparent -> blue -> cyan -> green -> yellow -> red).
An 8px blur smooths the grid into a continuous heat surface.
Built once per match and cached as an offscreen canvas.

---

## Assumptions

- ts column is milliseconds elapsed within the match, not wall-clock Unix time.
  The 1970 dates in sample rows are an artefact of storing duration as timestamp.
- y column is elevation only. Only x and z are used for 2D minimap rendering.
- Bots are identified by non-UUID user_id values (short integers) as per README.
- February 14 is partial data. Treated identically to other days in the tool.

---

## Tradeoffs

| Decision              | Considered                  | Chose          | Reason                                          |
|-----------------------|-----------------------------|----------------|-------------------------------------------------|
| Rendering engine      | SVG, D3, Three.js           | Canvas 2D      | Simplest path to 60fps with 5000+ points        |
| Data in browser       | DuckDB-WASM, parquet-wasm   | Static JSON    | No 10MB WASM payload, instant load from CDN     |
| Position downsampling | Full fidelity               | 1-in-3 samples | Visually identical, cuts JSON size by 65%       |
| Heatmap resolution    | 64, 128, 256 grid           | 128            | 64 is blocky, 256 is slow, 128 is the sweet spot|
