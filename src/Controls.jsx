import { useMemo } from "react";
import { EVENT_CONFIG } from "../utils/colors";

export default function Controls({
  index,
  filters,
  onFilterChange,
  layers,
  onLayerToggle,
  matchMeta,
  loading,
}) {
  const maps  = useMemo(() => [...new Set((index || []).map((m) => m.map_id))].sort(), [index]);
  const dates = useMemo(() => {
    const all = (index || [])
      .filter((m) => !filters.map || m.map_id === filters.map)
      .map((m) => m.date);
    return [...new Set(all)].sort();
  }, [index, filters.map]);

  const matches = useMemo(() => {
    return (index || []).filter((m) => {
      if (filters.map  && m.map_id !== filters.map)  return false;
      if (filters.date && m.date   !== filters.date) return false;
      return true;
    });
  }, [index, filters.map, filters.date]);

  function set(key, val) {
    const next = { ...filters, [key]: val };
    // cascading reset
    if (key === "map")  { next.date = ""; next.match = ""; }
    if (key === "date") { next.match = ""; }
    onFilterChange(next);
  }

  const layerGroups = [
    { key: "paths",  label: "Player paths" },
    { key: "bots",   label: "Bot paths" },
    { key: "combat", label: "Combat events" },
    { key: "loot",   label: "Loot events" },
    { key: "heatmap",label: "Heatmap" },
  ];

  return (
    <aside className="controls-panel">
      <div className="panel-section">
        <h2 className="panel-title">LILA BLACK</h2>
        <p className="panel-sub">Player Journey Visualizer</p>
      </div>

      {/* â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="panel-section">
        <h3 className="section-heading">Filters</h3>

        <label className="field-label">Map</label>
        <select className="select" value={filters.map} onChange={(e) => set("map", e.target.value)}>
          <option value="">All maps</option>
          {maps.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <label className="field-label">Date</label>
        <select className="select" value={filters.date} onChange={(e) => set("date", e.target.value)}>
          <option value="">All dates</option>
          {dates.map((d) => <option key={d} value={d}>{d.replace("_", " ")}</option>)}
        </select>

        <label className="field-label">Match ({matches.length} available)</label>
        <select className="select" value={filters.match} onChange={(e) => set("match", e.target.value)}>
          <option value="">Select a matchâ€¦</option>
          {matches.map((m) => (
            <option key={m.match_id} value={m.match_id}>
              {m.match_id.slice(0, 8)}â€¦ Â· {m.map_id} Â· {m.player_count}p {m.bot_count}b
            </option>
          ))}
        </select>
      </div>

      {/* â”€â”€ Layers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="panel-section">
        <h3 className="section-heading">Layers</h3>
        {layerGroups.map(({ key, label }) => (
          <label key={key} className="toggle-row">
            <input
              type="checkbox"
              checked={!!layers[key]}
              onChange={() => onLayerToggle(key)}
            />
            <span className="toggle-dot" style={{ background: layerDotColor(key) }} />
            {label}
          </label>
        ))}
      </div>

      {/* â”€â”€ Match stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {matchMeta && (
        <div className="panel-section">
          <h3 className="section-heading">Match Info</h3>
          <div className="stat-grid">
            <Stat label="Map"     value={matchMeta.map_id} />
            <Stat label="Date"    value={matchMeta.date?.replace("_", " ")} />
            <Stat label="Humans"  value={matchMeta.player_count} />
            <Stat label="Bots"    value={matchMeta.bot_count} />
            <Stat label="Events"  value={matchMeta.event_count?.toLocaleString()} />
            <Stat label="Duration" value={formatMs(matchMeta.duration_ms)} />
          </div>
          {matchMeta.ev_counts && (
            <div className="ev-counts">
              {Object.entries(matchMeta.ev_counts)
                .filter(([k]) => k !== "Position" && k !== "BotPosition")
                .map(([k, v]) => (
                  <span key={k} className="ev-pill" style={{ background: EVENT_CONFIG[k]?.color + "33", color: EVENT_CONFIG[k]?.color }}>
                    {EVENT_CONFIG[k]?.label ?? k}: {v}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {loading && <div className="loading-bar">Loading matchâ€¦</div>}
    </aside>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? "â€”"}</span>
    </div>
  );
}

function formatMs(ms) {
  if (!ms) return "â€”";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function layerDotColor(key) {
  const map = {
    paths:  "#3b82f6",
    bots:   "#6b7280",
    combat: "#ef4444",
    loot:   "#10b981",
    heatmap:"#f59e0b",
  };
  return map[key] || "#fff";
}
