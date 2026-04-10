import { useEffect, useRef, useMemo, useCallback } from "react";
import { worldToPixel, scalePixel } from "../utils/coordinates";
import { EVENT_CONFIG, playerColor, heatColor } from "../utils/colors";

const CANVAS_SIZE = 800;
const HEATMAP_GRID = 128;

export default function MapCanvas({ matchData, layers, currentTs }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const mapIdRef   = useRef(null);
  const heatRef    = useRef(null);

  const playerColors = useMemo(() => {
    if (!matchData) return {};
    const map = {};
    matchData.players.forEach((pid, i) => { map[pid] = playerColor(i); });
    return map;
  }, [matchData]);

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
    img.onerror = () => { console.warn("Minimap not found:", img.src); };
  }, [matchData?.map_id]);

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
        ctx.fillStyle = heatColor(Math.sqrt(v / max));
        ctx.fillRect(x * cellSize, y * cellSize, cellSize + 1, cellSize + 1);
      }
    }
    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = CANVAS_SIZE;
    const tctx = tmp.getContext("2d");
    tctx.filter = "blur(8px)";
    tctx.drawImage(oc, 0, 0);
    return tmp;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matchData) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_SIZE * dpr) {
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      canvas.style.width = CANVAS_SIZE + "px";
      canvas.style.height = CANVAS_SIZE + "px";
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const { map_id: mapId, events, players, bots } = matchData;

    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    } else {
      ctx.fillStyle = "#1a2332";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = "#334155";
      ctx.font = "18px sans-serif";
      ctx.fillText(`Map: ${mapId} (minimap loading...)`, 20, 40);
    }

    const visible = events.filter((e) => e.ts <= currentTs);

    if (layers.heatmap) {
      if (!heatRef.current) heatRef.current = buildHeatmap(events, mapId);
      if (heatRef.current) {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(heatRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.globalAlpha = 1.0;
      }
    }

    const pathsByPlayer = {};
    for (const ev of visible) {
      if (ev.ev !== "Position" && ev.ev !== "BotPosition") continue;
      if (ev.ev === "Position"    && !layers.paths) continue;
      if (ev.ev === "BotPosition" && !layers.bots)  continue;
      if (!pathsByPlayer[ev.uid]) pathsByPlayer[ev.uid] = [];
      pathsByPlayer[ev.uid].push(ev);
    }

    ctx.lineJoin = "round";
    for (const [uid, pts] of Object.entries(pathsByPlayer)) {
      if (pts.length < 2) continue;
      const isBot = bots.includes(uid);
      ctx.strokeStyle = isBot ? "#6b728066" : (playerColors[uid] ?? "#3b82f6") + "99";
      ctx.lineWidth = isBot ? 1 : 1.5;
      ctx.beginPath();
      pts.forEach((pt, i) => {
        const { px, py } = worldToPixel(pt.x, pt.z, mapId);
        const { sx, sy } = scalePixel(px, py, CANVAS_SIZE);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
    }

    const lastPos = {};
    for (const ev of visible) {
      if (ev.ev === "Position" || ev.ev === "BotPosition") lastPos[ev.uid] = ev;
    }
    for (const [uid, ev] of Object.entries(lastPos)) {
      const isBot = bots.includes(uid);
      if (isBot && !layers.bots)   continue;
      if (!isBot && !layers.paths) continue;
      const { px, py } = worldToPixel(ev.x, ev.z, mapId);
      const { sx, sy } = scalePixel(px, py, CANVAS_SIZE);
      ctx.beginPath();
      ctx.arc(sx, sy, isBot ? 3 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isBot ? "#9ca3af" : (playerColors[uid] ?? "#3b82f6");
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const NON_POS = ["Kill","Killed","BotKill","BotKilled","KilledByStorm","Loot"];
    for (const ev of visible) {
      if (!NON_POS.includes(ev.ev)) continue;
      const cfg = EVENT_CONFIG[ev.ev];
      if (!cfg) continue;
      if (cfg.layer === "combat" && !layers.combat) continue;
      if (cfg.layer === "loot"   && !layers.loot)   continue;
      const { px, py } = worldToPixel(ev.x, ev.z, mapId);
      const { sx, sy } = scalePixel(px, py, CANVAS_SIZE);
      drawMarker(ctx, ev.ev, sx, sy, cfg);
    }

    drawLegend(ctx, layers);
  }, [matchData, layers, currentTs, playerColors, buildHeatmap]);

  const tooltipRef = useRef(null);
  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / CANVAS_SIZE) * 1024;
    const my = ((e.clientY - rect.top)  / CANVAS_SIZE) * 1024;
    if (!matchData) return;
    const visible = matchData.events.filter((ev) => ev.ts <= currentTs);
    let best = null, bestDist = 15;
    for (const ev of visible) {
      if (ev.ev === "Position" || ev.ev === "BotPosition") continue;
      const { px, py } = worldToPixel(ev.x, ev.z, matchData.map_id);
      const d = Math.hypot(px - mx, py - my);
      if (d < bestDist) { bestDist = d; best = ev; }
    }
    const tip = tooltipRef.current;
    if (!tip) return;
    if (best) {
      tip.style.display = "block";
      tip.style.left = (e.clientX - rect.left + 12) + "px";
      tip.style.top  = (e.clientY - rect.top  + 12) + "px";
      tip.textContent = `${EVENT_CONFIG[best.ev]?.label ?? best.ev} · ${best.uid.slice(0,8)}...`;
    } else {
      tip.style.display = "none";
    }
  }

  return (
    <div className="canvas-wrapper">
      <canvas ref={canvasRef} className="map-canvas" onMouseMove={handleMouseMove}
        onMouseLeave={() => { if (tooltipRef.current) tooltipRef.current.style.display = "none"; }} />
      <div ref={tooltipRef} className="canvas-tooltip" style={{ display: "none" }} />
    </div>
  );
}

function drawMarker(ctx, evType, sx, sy, cfg) {
  const r = cfg.radius;
  ctx.save();
  switch (evType) {
    case "Kill": case "BotKill":
      ctx.strokeStyle = cfg.color; ctx.lineWidth = 2;
      [[sx-r,sy,sx+r,sy],[sx,sy-r,sx,sy+r],[sx-r*0.7,sy-r*0.7,sx+r*0.7,sy+r*0.7],[sx+r*0.7,sy-r*0.7,sx-r*0.7,sy+r*0.7]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      }); break;
    case "Killed": case "BotKilled":
      ctx.strokeStyle = cfg.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx-r,sy-r); ctx.lineTo(sx+r,sy+r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx+r,sy-r); ctx.lineTo(sx-r,sy+r); ctx.stroke(); break;
    case "KilledByStorm":
      ctx.fillStyle = cfg.color + "cc"; ctx.strokeStyle = cfg.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx,sy-r); ctx.lineTo(sx+r,sy); ctx.lineTo(sx,sy+r); ctx.lineTo(sx-r,sy); ctx.closePath();
      ctx.fill(); ctx.stroke(); break;
    case "Loot":
      ctx.fillStyle = cfg.color + "99"; ctx.strokeStyle = cfg.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI*2); ctx.fill(); break;
    default:
      ctx.fillStyle = cfg.color; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawLegend(ctx, layers) {
  const items = [];
  if (layers.paths)  items.push({ color: "#3b82f6", label: "Human" });
  if (layers.bots)   items.push({ color: "#6b7280", label: "Bot" });
  if (layers.combat) items.push({ color: "#f59e0b", label: "Kill" }, { color: "#ef4444", label: "Death" }, { color: "#8b5cf6", label: "Storm" });
  if (layers.loot)   items.push({ color: "#10b981", label: "Loot" });
  if (!items.length) return;
  const pad = 8, h = 20, w = 100, totalH = items.length * h + pad * 2;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(800 - w - pad, 800 - totalH - pad, w, totalH, 6);
  ctx.fill();
  items.forEach(({ color, label }, i) => {
    const y = 800 - totalH - pad + pad + i * h + 10;
    const x = 800 - w - pad + 10;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "11px sans-serif"; ctx.fillText(label, x + 10, y + 4);
  });
  ctx.restore();
}
