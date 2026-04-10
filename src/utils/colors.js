export const EVENT_CONFIG = {
  Position:      { color: "#3b82f6", label: "Human path",    radius: 2,  layer: "paths"  },
  BotPosition:   { color: "#6b7280", label: "Bot path",      radius: 1.5,layer: "paths"  },
  Kill:          { color: "#f59e0b", label: "Kill",          radius: 7,  layer: "combat" },
  Killed:        { color: "#ef4444", label: "Death",         radius: 7,  layer: "combat" },
  BotKill:       { color: "#f97316", label: "Bot kill",      radius: 6,  layer: "combat" },
  BotKilled:     { color: "#dc2626", label: "Killed by bot", radius: 6,  layer: "combat" },
  KilledByStorm: { color: "#8b5cf6", label: "Storm death",   radius: 7,  layer: "combat" },
  Loot:          { color: "#10b981", label: "Loot",          radius: 5,  layer: "loot"   },
};

export const PLAYER_COLORS = [
  "#3b82f6","#06b6d4","#0ea5e9","#22d3ee","#38bdf8",
  "#818cf8","#a78bfa","#c084fc","#e879f9","#f472b6",
  "#34d399","#4ade80","#86efac","#bef264","#fde047",
  "#fb923c","#f87171","#94a3b8","#cbd5e1","#e2e8f0",
];

export function playerColor(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export const HEATMAP_GRADIENT = [
  [0,   "rgba(0,0,255,0)"],
  [0.2, "rgba(0,0,255,0.4)"],
  [0.4, "rgba(0,255,255,0.5)"],
  [0.6, "rgba(0,255,0,0.5)"],
  [0.8, "rgba(255,255,0,0.6)"],
  [1.0, "rgba(255,0,0,0.8)"],
];

export function heatColor(t) {
  const stops = HEATMAP_GRADIENT;
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const lo = stops[i - 1];
      const hi = stops[i];
      const frac = (t - lo[0]) / (hi[0] - lo[0]);
      return interpolateColor(lo[1], hi[1], frac);
    }
  }
  return stops[stops.length - 1][1];
}

function interpolateColor(a, b, t) {
  const pa = parseRgba(a);
  const pb = parseRgba(b);
  return `rgba(${Math.round(pa[0]+(pb[0]-pa[0])*t)},${Math.round(pa[1]+(pb[1]-pa[1])*t)},${Math.round(pa[2]+(pb[2]-pa[2])*t)},${(pa[3]+(pb[3]-pa[3])*t).toFixed(2)})`;
}

function parseRgba(str) {
  const m = str.match(/[\d.]+/g).map(Number);
  return [m[0], m[1], m[2], m[3] ?? 1];
}
