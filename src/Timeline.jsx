import { useEffect, useRef } from "react";

export default function Timeline({ minTs, maxTs, currentTs, onSeek, playing, onPlayPause, speed, onSpeedChange }) {
  const rafRef = useRef(null);
  const lastRef = useRef(null);
  const currentRef = useRef(currentTs);
  currentRef.current = currentTs;

  // Animate forward when playing
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
      return;
    }

    function tick(now) {
      if (lastRef.current !== null) {
        const wall = now - lastRef.current;
        const gameDelta = wall * speed;
        const next = Math.min(currentRef.current + gameDelta, maxTs);
        onSeek(next);
        if (next >= maxTs) {
          onPlayPause(false); // auto-stop at end
          return;
        }
      }
      lastRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, maxTs]);

  const duration = maxTs - minTs || 1;
  const pct = ((currentTs - minTs) / duration) * 100;

  function handleSlider(e) {
    const val = minTs + (Number(e.target.value) / 100) * duration;
    onSeek(val);
  }

  return (
    <div className="timeline">
      <button className="play-btn" onClick={() => onPlayPause(!playing)}>
        {playing ? "â¸" : "â–¶"}
      </button>

      <div className="timeline-track">
        <input
          type="range"
          min={0}
          max={100}
          step={0.05}
          value={pct.toFixed(2)}
          onChange={handleSlider}
          className="timeline-slider"
        />
      </div>

      <span className="timeline-time">{formatMs(currentTs - minTs)}</span>
      <span className="timeline-sep">/</span>
      <span className="timeline-time">{formatMs(duration)}</span>

      <label className="speed-label">Speed</label>
      <select
        className="speed-select"
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
      >
        <option value={1}>1Ã—</option>
        <option value={5}>5Ã—</option>
        <option value={20}>20Ã—</option>
        <option value={50}>50Ã—</option>
        <option value={100}>100Ã—</option>
      </select>
    </div>
  );
}

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
