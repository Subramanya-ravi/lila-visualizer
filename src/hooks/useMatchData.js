import { useState, useEffect } from "react";

const matchCache = {};

export function useIndex() {
  const [index, setIndex] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/index.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setIndex)
      .catch(setError);
  }, []);

  return { index, error };
}

export function useMatch(matchId) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!matchId) { setData(null); return; }
    if (matchCache[matchId]) { setData(matchCache[matchId]); return; }
    setLoading(true);
    setData(null);
    fetch(`/data/matches/${matchId}.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { matchCache[matchId] = d; setData(d); setLoading(false); })
      .catch((e) => { setError(e); setLoading(false); });
  }, [matchId]);

  return { data, loading, error };
}
