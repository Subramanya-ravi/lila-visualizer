"""
LILA BLACK - Parquet → JSON Preprocessor
=========================================
Run this once against the player_data/ folder to generate the JSON
files that the web app loads.

Usage:
    pip install pyarrow pandas
    python scripts/preprocess.py --input ./player_data --output ./public/data

Output structure:
    public/data/
    ├── index.json          # match list with metadata (for filters/dropdowns)
    └── matches/
        └── {match_id}.json # full event data for one match
"""

import os
import json
import argparse
import re
import uuid
from collections import defaultdict

import pandas as pd
import pyarrow.parquet as pq


# ── Coordinate config (mirrors src/utils/coordinates.js) ──────────────────────
MAP_CONFIG = {
    "AmbroseValley": {"scale": 900,  "origin_x": -370, "origin_z": -473},
    "GrandRift":     {"scale": 581,  "origin_x": -290, "origin_z": -290},
    "Lockdown":      {"scale": 1000, "origin_x": -500, "origin_z": -500},
}

POSITION_EVENTS = {"Position", "BotPosition"}
COMBAT_EVENTS   = {"Kill", "Killed", "BotKill", "BotKilled", "KilledByStorm"}
LOOT_EVENTS     = {"Loot"}


def is_bot(user_id: str) -> bool:
    """Bots have short numeric IDs; humans have UUIDs."""
    try:
        int(user_id)
        return True
    except ValueError:
        return False


def decode_event(val) -> str:
    if isinstance(val, bytes):
        return val.decode("utf-8")
    return str(val)


def load_file(path: str) -> pd.DataFrame | None:
    try:
        table = pq.read_table(path)
        df = table.to_pandas()
        df["event"] = df["event"].apply(decode_event)
        df["user_id"] = df["user_id"].astype(str)
        # ts may be timedelta or int; normalise to ms int
        if hasattr(df["ts"].dtype, "tz") or str(df["ts"].dtype).startswith("datetime"):
            df["ts"] = df["ts"].astype("int64") // 1_000_000  # ns → ms
        else:
            df["ts"] = pd.to_numeric(df["ts"], errors="coerce").fillna(0).astype("int64")
        return df
    except Exception as e:
        print(f"  [skip] {path}: {e}")
        return None


def process_day(day_folder: str, day_label: str, matches: dict):
    files = os.listdir(day_folder)
    print(f"  {day_label}: {len(files)} files")
    for fname in files:
        fpath = os.path.join(day_folder, fname)
        df = load_file(fpath)
        if df is None or df.empty:
            continue

        match_id = df["match_id"].iloc[0]
        # strip .nakama-0 suffix for cleaner key
        clean_match_id = re.sub(r"\.nakama-\d+$", "", match_id)

        if clean_match_id not in matches:
            matches[clean_match_id] = {
                "match_id":   clean_match_id,
                "map_id":     df["map_id"].iloc[0],
                "date":       day_label,
                "events":     [],
                "players":    set(),
                "bots":       set(),
            }

        m = matches[clean_match_id]
        user_id = df["user_id"].iloc[0]
        bot = is_bot(user_id)

        if bot:
            m["bots"].add(user_id)
        else:
            m["players"].add(user_id)

        # Downsample Position events to keep JSON lean (keep every 3rd)
        pos_mask   = df["event"].isin(POSITION_EVENTS)
        other_mask = ~pos_mask

        pos_rows   = df[pos_mask].iloc[::3]   # 1-in-3 positions
        other_rows = df[other_mask]            # keep all non-position events

        combined = pd.concat([pos_rows, other_rows]).sort_values("ts")

        for _, row in combined.iterrows():
            m["events"].append({
                "uid":   user_id,
                "bot":   bot,
                "x":     round(float(row["x"]), 2),
                "z":     round(float(row["z"]), 2),
                "ts":    int(row["ts"]),
                "ev":    row["event"],
            })


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="./player_data",  help="Path to player_data/ folder")
    parser.add_argument("--output", default="./public/data",  help="Output path for JSON files")
    args = parser.parse_args()

    os.makedirs(os.path.join(args.output, "matches"), exist_ok=True)

    day_folders = sorted([
        d for d in os.listdir(args.input)
        if os.path.isdir(os.path.join(args.input, d)) and d.startswith("February")
    ])

    matches: dict = {}

    print("Reading parquet files...")
    for day in day_folders:
        process_day(os.path.join(args.input, day), day, matches)

    print(f"\nWriting {len(matches)} match files...")
    index = []

    for clean_id, m in matches.items():
        # Sort events by timestamp
        m["events"].sort(key=lambda e: e["ts"])

        ts_values = [e["ts"] for e in m["events"]]
        duration  = max(ts_values) - min(ts_values) if ts_values else 0

        players = sorted(m["players"])
        bots    = sorted(m["bots"])

        # Count event types for the index
        ev_counts = defaultdict(int)
        for e in m["events"]:
            ev_counts[e["ev"]] += 1

        match_out = {
            "match_id":    clean_id,
            "map_id":      m["map_id"],
            "date":        m["date"],
            "players":     players,
            "bots":        bots,
            "duration_ms": duration,
            "events":      m["events"],
        }

        out_path = os.path.join(args.output, "matches", f"{clean_id}.json")
        with open(out_path, "w") as f:
            json.dump(match_out, f, separators=(",", ":"))

        index.append({
            "match_id":      clean_id,
            "map_id":        m["map_id"],
            "date":          m["date"],
            "player_count":  len(players),
            "bot_count":     len(bots),
            "event_count":   len(m["events"]),
            "duration_ms":   duration,
            "ev_counts":     dict(ev_counts),
        })

        print(f"  ✓ {clean_id[:8]}... ({m['map_id']}, {m['date']}, "
              f"{len(players)}p {len(bots)}b, {len(m['events'])} events)")

    index.sort(key=lambda x: (x["date"], x["match_id"]))
    with open(os.path.join(args.output, "index.json"), "w") as f:
        json.dump(index, f, indent=2)

    print(f"\nDone! index.json + {len(matches)} match files → {args.output}")
    print("\nNow place your minimap images in public/minimaps/:")
    print("  AmbroseValley_Minimap.png")
    print("  GrandRift_Minimap.png")
    print("  Lockdown_Minimap.jpg")


if __name__ == "__main__":
    main()
