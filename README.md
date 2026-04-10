
# LILA BLACK – Player Journey Visualizer

**Live Demo:** https://lila-visualizer-m7yo1p1i3-subramanya-ravis-projects.vercel.app/

A web-based tool for Level Designers to explore player behavior across LILA BLACK maps — player paths, kill/death zones, loot hotspots, storm deaths, heatmaps, and match playback.

---

## Tech Stack

| Layer        | Technology         |

|--------------|--------------------|

| Frontend     | React 18 + Vite    |

| Rendering    | Canvas 2D API      |

| Styling      | Plain CSS variables|

| Data pipeline| Python + PyArrow   |

| Hosting      | Vercel             |

---

## Setup

### 1. Install Python dependencies

```bash

pip install pyarrow pandas

```

### 2. Run the preprocessor

```bash

python scripts/preprocess.py --input ./player_data --output ./public/data

```

### 3. Add minimap images

Place these in `public/minimaps/`:
### 4. Install and run

```bash

npm install

npm run dev

```

Open http://localhost:5174

---

## Deployment

```bash

npm run build

npx vercel --prod

```

---

## Environment Variables

None required. All data is served as static files from `public/data/`.

---

## Features

- Minimap rendering with exact coordinate mapping (x/z to pixel)

- Human vs bot visual distinction

- Event markers: Kill, Death, Storm death, Loot

- Cascading filters: map, date, match

- Timeline playback at 1x to 100x speed

- Heatmap density overlay

- Hover tooltips on event markers

- Match stats in sidebar

