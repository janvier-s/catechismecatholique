"""Renderer helpers: edge-tts argv builder, jitter state, ffmpeg helpers."""
from __future__ import annotations

import random
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

VOICES = {
    "gerard": "fr-BE-GerardNeural",
    "remy": "fr-FR-RemyMultilingualNeural",
    "fabrice": "fr-CH-FabriceNeural",
}
BASE_OPTS = {
    "gerard":  ["--volume=-10%"],
    "remy":    ["--rate=-10%"],
    "fabrice": ["--volume=-5%", "--rate=-20%"],
}


@dataclass
class JitterState:
    """Per-render-run jitter state for Gerard's V1 'Paragraphe N.' announces.

    Pitch in [-8, +8] Hz with max step 4. Rate in [-5, +5] % with max step 2.
    """
    seed: int | None = None
    last_pitch: int | None = None
    last_rate: int | None = None

    def __post_init__(self) -> None:
        self._rng = random.Random(self.seed)

    def next_announce(self) -> tuple[int, int]:
        if self.last_pitch is None:
            pitch = self._rng.randint(-8, 8)
        else:
            lo = max(-8, self.last_pitch - 4)
            hi = min(8, self.last_pitch + 4)
            pitch = self._rng.randint(lo, hi)
        if self.last_rate is None:
            rate = self._rng.randint(-5, 5)
        else:
            lo = max(-5, self.last_rate - 2)
            hi = min(5, self.last_rate + 2)
            rate = self._rng.randint(lo, hi)
        self.last_pitch = pitch
        self.last_rate = rate
        return pitch, rate


def build_edge_tts_argv(
    voice: str,
    text: str,
    out_path: Path,
    extra_pitch_hz: int | None = None,
    extra_rate_pct: int | None = None,
) -> list[str]:
    argv = ["edge-tts", "--voice", VOICES[voice]]
    argv.extend(BASE_OPTS[voice])
    if extra_pitch_hz is not None:
        argv.append(f"--pitch={extra_pitch_hz:+d}Hz")
    if extra_rate_pct is not None:
        argv.append(f"--rate={extra_rate_pct:+d}%")
    argv.extend(["--text", text, "--write-media", str(out_path)])
    return argv


from mutagen.mp3 import MP3


def generate_silence(duration_ms: int, out_path: Path) -> bool:
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "anullsrc=r=24000:cl=mono",
        "-t", str(duration_ms / 1000.0),
        "-acodec", "libmp3lame",
        str(out_path),
    ]
    return subprocess.run(cmd, capture_output=True, text=True).returncode == 0


def concat_mp3s(inputs: list[Path], out_path: Path) -> bool:
    listing = "\n".join(f"file '{p}'" for p in inputs)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write(listing)
        list_path = f.name
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
           "-i", list_path, "-c", "copy", str(out_path)]
    rc = subprocess.run(cmd, capture_output=True, text=True).returncode
    Path(list_path).unlink(missing_ok=True)
    return rc == 0


def probe_duration_ms(path: Path) -> int:
    """Return MP3 duration in milliseconds via mutagen."""
    audio = MP3(str(path))
    return int(audio.info.length * 1000)


import shutil


def _segments_for_target(entry: dict, target: str) -> list[dict]:
    return [s for s in entry["segments"] if target in s["targets"]]


def render_entry(
    *,
    entry: dict,
    target: str,
    out_path: Path,
    jitter: JitterState,
    gap_ms: int,
    skip_existing: bool = False,
) -> bool:
    """Render one manifest entry to a single MP3 at out_path. Returns True on success."""
    if skip_existing and out_path.exists():
        return True

    segments = _segments_for_target(entry, target)
    if not segments:
        return False

    out_path.parent.mkdir(parents=True, exist_ok=True)

    if len(segments) == 1:
        seg = segments[0]
        pitch, rate = (None, None)
        if seg["voice"] == "gerard" and seg["text"].startswith("Paragraphe "):
            pitch, rate = jitter.next_announce()
        argv = build_edge_tts_argv(seg["voice"], seg["text"], out_path,
                                    extra_pitch_hz=pitch, extra_rate_pct=rate)
        return subprocess.run(argv, capture_output=True, text=True).returncode == 0

    # Multi-segment: render each, glue with silence, concat.
    tmpdir = Path(tempfile.mkdtemp(prefix=f"ccc_{entry['seq']}_"))
    try:
        files: list[Path] = []
        for i, seg in enumerate(segments):
            seg_file = tmpdir / f"seg_{i:02d}.mp3"
            pitch, rate = (None, None)
            if seg["voice"] == "gerard" and seg["text"].startswith("Paragraphe "):
                pitch, rate = jitter.next_announce()
            argv = build_edge_tts_argv(seg["voice"], seg["text"], seg_file,
                                        extra_pitch_hz=pitch, extra_rate_pct=rate)
            if subprocess.run(argv, capture_output=True, text=True).returncode != 0:
                return False
            files.append(seg_file)
            if i < len(segments) - 1:
                gap_file = tmpdir / f"gap_{i:02d}.mp3"
                if not generate_silence(gap_ms, gap_file):
                    return False
                files.append(gap_file)
        return concat_mp3s(files, out_path)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


from mutagen.id3 import ID3, TIT2, TALB, TPE1, TRCK, TCON, COMM, ID3NoHeaderError


def tag_mp3(
    path: Path,
    *,
    title: str,
    album: str,
    track: int,
    comment: str = "",
) -> None:
    try:
        tags = ID3(str(path))
    except ID3NoHeaderError:
        tags = ID3()
    tags.delall("TIT2")
    tags.delall("TALB")
    tags.delall("TPE1")
    tags.delall("TRCK")
    tags.delall("TCON")
    tags.delall("COMM")
    tags.add(TIT2(encoding=3, text=title))
    tags.add(TALB(encoding=3, text=album))
    tags.add(TPE1(encoding=3, text="Catechisme de l'Eglise catholique"))
    tags.add(TRCK(encoding=3, text=f"{track:04d}"))
    tags.add(TCON(encoding=3, text="Speech"))
    if comment:
        tags.add(COMM(encoding=3, lang="fra", desc="", text=comment))
    tags.save(str(path))
