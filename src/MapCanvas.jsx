import { useEffect, useRef, useMemo, useCallback } from "react";
import { worldToPixel, scalePixel } from "../utils/coordinates";
import { EVENT_CONFIG, playerColor, heatColor } from "../utils/colors";

const CANVAS_SIZE = 800; // display size in px (scales to actual DPR)
const HEATMAP_GRID = 128; // grid cells for heatmap

export default function MapCanvas({ matchData, layers, currentTs }) {
  const canvasRef   = useRef(null);
  const bgRef       = useRef(null); // offscreen: minimap image
  const heatRef     = useRef(null); // offscreen: heatmap
  const imgRef      = useRef(null); // loaded minimap image
  const mapIdRef    = useRef(null);

  // Build per-player colour map
  const playerColors = useMemo(() => {
    if (!matchData) return {};
    const map = {};
    matchData.players.forEach((pid, i) => { map[pid] = playerColor(i); });
    return map;
  }, [matchData]);

  // Load minimap image when map changes
  useEffect(() => {
    if (!matchData) return;
    const mapId = matchData.map_id;
    if (mapIdRef.current === mapId && imgRef.current) return;
    mapIdRef.current = mapId;
    imgRef.current = null;
    heatRef.current = null;

    const ext = mapId === "Lockdown" ? "jpg" : "png";
    const img = new Image();
    img.src = `/minimaps/${mapId}_Minimap.${ext}`;
    img.onload = () => { imgRef.current = img; };
    img.onerror = () => { console.warn(`Minimap not found: ${img.src}`); };
  }, [matchData?.map_id]);

  // Build heatmap offscreen canvas (position density)
  const buildHeatmap = useCallback((events, mapId) => {
    const grid = new Float32Array(HEATMAP_GRID * HEATMAP_GRID);
    let max = 0;

    for (const ev of events) {
      if (ev.ev !== "Position" && ev.ev !== "BotPosition") continue;
      const { px, py } = worldToPixel(ev.x, ev.z, mapId);
      const cx = Math.floor((px / 1024) * HEATMAP_GRID);
      const cy = Math.floor((py / 1024) * HEATMAP_GRID);
      if (cx < 0 || cx >= HEATMAP_GRID || cy < 0 || cy >= HEATMAP_GRID) continue;
      const idx = cy * HEATMAP_GRID + cx;
      grid[idx]++;
      if (grid[idx] > max) max = grid[idx];
    }

    if (max === 0) return null;

    const oc = document.createElement("canvas");
    oc.width = oc.height = CANVAS_SIZE;
    const ctx = oc.getContext("2d");
    const cellSize = CANVAS_SIZE / HEATMAP_GRID;

    for (let y = 0; y < HEATMAP_GRID; y++) {
      for (let x = 0; x < HEATMAP_GRID; x++) {
        const v = grid[y * HEATMAP_GRID + x];
        if (v === 0) continue;
        const t = Math.sqrt(v / max); // sqrt scale for better visual
        ctx.fillStyle = heatColor(t);
        ctx.fillRect(x * cellSize, y * cellSize, cellSize + 1, cellSize + 1);
      }
    }

    // Blur for smooth look
    ctx.filter = "blur(6px)";
    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = CANVAS_SIZE;
    const tctx = tmp.getContext("2d");
    tctx.filter = "blur(8px)";
    tctx.drawImage(oc, 0, 0);

    return tmp;
  }, []);

  // Main draw function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matchData) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_SIZE * dpr) {
      canvas.width  = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      canvas.style.width  = CANVAS_SIZE + "px";
      canvas.style.height = CANVAS_SIZE + "px";
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const { map_id: mapId, events, players, bots } = matchData;

    // â”€â”€ Background: minimap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    } else {
      ctx.fillStyle = "#1a2332";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = "#334155";
      ctx.font = "18px sans-serif";
      ctx.fillText(`Map: ${mapId} (minimap loadingâ€¦)`, 20, 30);
    }

    // Filter events to currentTs window
    const visible = events.filter((e) => e.ts <= currentTs);

    // â”€â”€ Heatmap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (layers.heatmap) {
      if (!heatRef.current) {
        heatRef.current = buildHeatmap(events, mapId);
      }
      if (heatRef.current) {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(heatRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.globalAlpha = 1.0;
      }
    }

    // Group positions by player for path drawing
    const pathsByPlayer = {};
    if (layers.paths || layers.bots) {
      for (const ev of visible) {
        if (ev.ev !== "Position" && ev.ev !== "BotPosition") continue;
        if (ev.ev === "Position"    && !layers.paths) continue;
        if (ev.ev === "BotPosition" && !layers.bots)  continue;
        if (!pathsByPlayer[ev.uid]) pathsByPlayer[ev.uid] = [];
        pathsByPlayer[ev.uid].push(ev);
      }
    }

    // â”€â”€ Player paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ctx.lineWidth = 1.5;
    ctx.lineJoin  = "round";
    for (const [uid, pts] of Object.entries(pathsByPlayer)) {
      if (pts.length < 2) continue;
      const isBot = bots.includes(uid);
      const color = isBot ? "#6b728088" : (playerColors[uid] ?? "#3b82f688") + "99";
      ctx.strokeStyle = color;
      ctx.lineWidth   = isBot ? 1 : 1.5;
      ctx.beginPath();
      pts.forEach((pt, i) => {
        const { px, py } = worldToPixel(pt.x, pt.z, mapId);
        const { sx, sy } = scalePixel(px, py, CANVAS_SIZE);
        if (i === 0) ctx.moveTo(sx, sy);
        else         ctx.lineTo(sx, sy);
      });
      ctx.stroke();
    }

    // â”€â”€ Current position dots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Show last known position per player as a bright dot
    const lastPos = {};
    for (const ev of visible) {
      if (ev.ev === "Position" || ev.ev === "BotPosition") {
        lastPos[ev.uid] = ev;
      }
    }
    for (const [uid, ev] of Object.entries(lastPos)) {
      const isBot = bots.includes(uid);
      if (isBot && !layers.bots)   continue;
      if (!isBot && !layers.paths) continue;
      const { px, py } = worldToPixel(ev.x, ev.z, mapId);
      const { sx, sy } = scalePixel(px, py, CANVAS_SIZE);
      const color = isBot ? "#9ca3af" : (playerColors[uid] ?? "#3b82f6");
      ctx.beginPath();
      ctx.arc(sx, sy, isBot ? 3 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // â”€â”€ Combat & loot events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const NON_POS_EVENTS = ["Kill","Killed","BotKill","BotKilled","KilledByStorm","Loot"];
    for (const ev of visible) {
      if (!NON_POS_EVENTS.includes(ev.ev)) continue;
      const cfg = EVENT_CONFIG[ev.ev];
      if (!cfg) continue;
      const layer = cfg.layer;
      if (layer === "combat" && !layers.combat) continue;
      if (layer === "loot"   && !layers.loot)   continue;

      const { px, py } = worldToPixel(ev.x, ev.z, mapId);
      const { sx, sy } = scalePixel(px, py, CANVAS_SIZE);

      drawEventMarker(ctx, ev.ev, sx, sy, cfg);
    }

    // â”€â”€ Legend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawLegend(ctx, layers);

  }, [matchData, layers, currentTs, playerColors, buildHeatmap]);

  // Tooltip on hover
  const tooltipRef = useRef(null);
  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / CANVAS_SIZE) * 1024;
    const my = ((e.clientY - rect.top)  / CANVAS_SIZE) * 1024;

    if (!matchData) return;
    const { map_id: mapId, events } = matchData;
    const visible = events.filter((ev) => ev.ts <= currentTs);

    // find nearest non-position event within 15px (in 1024 space)
    let best = null, bestDist = 15;
    for (const ev of visible) {
      if (ev.ev === "Position" || ev.ev === "BotPosition") continue;
      const { px, py } = worldToPixel(ev.x, ev.z, mapId);
      const d = Math.hypot(px - mx, py - my);
      if (d < bestDist) { bestDist = d; best = ev; }
    }

    const tip = tooltipRef.current;
    if (!tip) return;
    if (best) {
      tip.style.display = "block";
      tip.style.left    = (e.clientX - rect.left + 12) + "px";
      tip.style.top     = (e.clientY - rect.top  + 12) + "px";
      tip.textContent   = `${EVENT_CONFIG[best.ev]?.label ?? best.ev} Â· ${best.uid.slice(0, 8)}â€¦`;
    } else {
      tip.style.display = "none";
    }
  }

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="map-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { if (tooltipRef.current) tooltipRef.current.style.display = "none"; }}
      />
      <div ref={tooltipRef} className="canvas-tooltip" style={{ display: "none" }} />
    </div>
  );
}

// â”€â”€ Drawing helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function drawEventMarker(ctx, evType, sx, sy, cfg) {
  const r = cfg.radius;
  ctx.save();

  switch (evType) {
    case "Kill":
    case "BotKill":
      // Star / crosshair
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx - r*0.7, sy - r*0.7); ctx.lineTo(sx + r*0.7, sy + r*0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + r*0.7, sy - r*0.7); ctx.lineTo(sx - r*0.7, sy + r*0.7); ctx.stroke();
      break;

    case "Killed":
    case "BotKilled":
      // X marker
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx - r, sy - r); ctx.lineTo(sx + r, sy + r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + r, sy - r); ctx.lineTo(sx - r, sy + r); ctx.stroke();
      break;

    case "KilledByStorm":
      // Diamond
      ctx.fillStyle = cfg.color + "cc";
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy - r);
      ctx.lineTo(sx + r, sy);
      ctx.lineTo(sx, sy + r);
      ctx.lineTo(sx - r, sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case "Loot":
      // Circle with dot
      ctx.fillStyle = cfg.color + "99";
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
  }

  ctx.restore();
}

function drawLegend(ctx, layers) {
  const items = [];
  if (layers.paths)  items.push({ color: "#3b82f6", label: "Human" });
  if (layers.bots)   items.push({ color: "#6b7280", label: "Bot" });
  if (layers.combat) items.push({ color: "#f59e0b", label: "Kill", sym: "âœ•" });
  if (layers.combat) items.push({ color: "#ef4444", label: "Death" });
  if (layers.combat) items.push({ color: "#8b5cf6", label: "Storm" });
  if (layers.loot)   items.push({ color: "#10b981", label: "Loot" });
  if (items.length === 0) return;

  const pad = 8, h = 20, w = 100;
  const totalH = items.length * h + pad * 2;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, CANVAS_SIZE - w - pad, CANVAS_SIZE - totalH - pad, w, totalH, 6);
  ctx.fill();
  items.forEach(({ color, label }, i) => {
    const y = CANVAS_SIZE - totalH - pad + pad + i * h + 10;
    const x = CANVAS_SIZE - w - pad + 10;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.fillText(label, x + 10, y + 4);
  });
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
