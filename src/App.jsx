import { useState, useMemo, useCallback } from "react";
import { useIndex, useMatch } from "./hooks/useMatchData";
import Controls from "./components/Controls";
import MapCanvas from "./components/MapCanvas";
import Timeline  from "./components/Timeline";

const DEFAULT_LAYERS = {
  paths: true, bots: false, combat: true, loot: true, heatmap: false,
};

export default function App() {
  const { index, error: indexError } = useIndex();
  const [filters,   setFilters]   = useState({ map: "", date: "", match: "" });
  const [layers,    setLayers]    = useState(DEFAULT_LAYERS);
  const [playing,   setPlaying]   = useState(false);
  const [speed,     setSpeed]     = useState(20);
  const [currentTs, setCurrentTs] = useState(0);

  const { data: matchData, loading } = useMatch(filters.match);

  const { minTs, maxTs } = useMemo(() => {
    if (!matchData?.events?.length) return { minTs: 0, maxTs: 1 };
    const ts = matchData.events.map((e) => e.ts);
    return { minTs: Math.min(...ts), maxTs: Math.max(...ts) };
  }, [matchData]);

  const prevMatchRef = useMemo(() => ({ id: null }), []);
  if (matchData && matchData.match_id !== prevMatchRef.id) {
    prevMatchRef.id = matchData.match_id;
    setTimeout(() => setCurrentTs(minTs), 0);
  }

  const handleLayerToggle = useCallback((key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const matchMeta = useMemo(() => {
    if (!filters.match || !index) return null;
    return index.find((m) => m.match_id === filters.match) ?? null;
  }, [filters.match, index]);

  if (indexError) {
    return (
      <div className="error-screen">
        <h2>Could not load data/index.json</h2>
        <p>Make sure you ran the preprocessor first:</p>
        <pre>python scripts/preprocess.py --input ./player_data --output ./public/data</pre>
        <p className="error-detail">{indexError.message}</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Controls
        index={index}
        filters={filters}
        onFilterChange={setFilters}
        layers={layers}
        onLayerToggle={handleLayerToggle}
        matchMeta={matchMeta}
        loading={loading}
      />
      <main className="main-area">
        {!filters.match ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <h2>Select a match to begin</h2>
            <p>Use the filters on the left to pick a map, date, and match.</p>
            {index && <p className="empty-hint">{index.length} matches available across {[...new Set(index.map((m) => m.map_id))].length} maps</p>}
          </div>
        ) : loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>Loading match data...</p>
          </div>
        ) : matchData ? (
          <>
            <MapCanvas matchData={matchData} layers={layers} currentTs={currentTs} />
            <Timeline minTs={minTs} maxTs={maxTs} currentTs={currentTs} onSeek={setCurrentTs} playing={playing} onPlayPause={setPlaying} speed={speed} onSpeedChange={setSpeed} />
          </>
        ) : null}
      </main>
    </div>
  );
}
