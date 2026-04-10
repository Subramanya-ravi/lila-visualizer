export const MAP_CONFIG = {
  AmbroseValley: { scale: 900,  originX: -370, originZ: -473 },
  GrandRift:     { scale: 581,  originX: -290, originZ: -290 },
  Lockdown:      { scale: 1000, originX: -500, originZ: -500 },
};

export const MINIMAP_SIZE = 1024;

export function worldToPixel(x, z, mapId) {
  const cfg = MAP_CONFIG[mapId];
  if (!cfg) return { px: 0, py: 0 };
  const u = (x - cfg.originX) / cfg.scale;
  const v = (z - cfg.originZ) / cfg.scale;
  return { px: u * MINIMAP_SIZE, py: (1 - v) * MINIMAP_SIZE };
}

export function scalePixel(px, py, canvasSize) {
  const s = canvasSize / MINIMAP_SIZE;
  return { sx: px * s, sy: py * s };
}
