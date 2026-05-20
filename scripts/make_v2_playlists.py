#!/usr/bin/env python3
"""Write a playlist.m3u8 in each V2 part directory, listing tracks in order.

Format: extended M3U with #EXTINF lines:
  #EXTM3U
  #PLAYLIST: Première partie — La profession de la foi
  #EXTINF:643,Article 1 : La révélation de Dieu
  01-1-je-crois-nous-croyons/03-article-1-la-revelation-de-dieu-0050-0067.mp3

Paths are relative to the playlist file (i.e. relative to the part dir).
Track order comes from TRCK/TPOS ID3 tags.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from mutagen.id3 import ID3
from mutagen.mp3 import MP3

DISC_TITLES = {
    "00-prologue":                 "Prologue",
    "01-1-profession-de-la-foi":   "Première partie — La profession de la foi",
    "02-2-celebration-du-mystere": "Deuxième partie — La célébration du mystère chrétien",
    "03-3-vie-dans-le-christ":     "Troisième partie — La vie dans le Christ",
    "04-4-priere-chretienne":      "Quatrième partie — La prière chrétienne",
}


def _trck(p: Path) -> int:
    try:
        tags = ID3(str(p))
        raw = str(tags.get("TRCK", "9999"))
        return int(raw.split("/")[0])
    except Exception:
        return 9999


def _title(p: Path) -> str:
    try:
        tags = ID3(str(p))
        return str(tags.get("TIT2", p.stem))
    except Exception:
        return p.stem


def _duration_s(p: Path) -> int:
    try:
        return int(round(MP3(str(p)).info.length))
    except Exception:
        return -1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--audio-dir", type=Path, required=True)
    args = ap.parse_args()

    total = 0
    for top in sorted(args.audio_dir.iterdir()):
        if not top.is_dir() or top.name not in DISC_TITLES:
            continue
        mp3s = sorted(top.rglob("*.mp3"), key=_trck)
        if not mp3s:
            continue
        lines = ["#EXTM3U", f"#PLAYLIST:{DISC_TITLES[top.name]}"]
        for p in mp3s:
            rel = p.relative_to(top)
            lines.append(f"#EXTINF:{_duration_s(p)},{_title(p)}")
            lines.append(str(rel).replace("\\", "/"))
        out = top / "playlist.m3u8"
        out.write_text("\n".join(lines) + "\n", encoding="utf-8")
        total += len(mp3s)
        print(f"  {out.relative_to(args.audio_dir)}  ({len(mp3s)} tracks)")

    print(f"\nDone. {total} tracks listed across {len(DISC_TITLES)} playlists.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
