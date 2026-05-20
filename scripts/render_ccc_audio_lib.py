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
    "fabrice": ["--volume=-5%", "--rate=-15%"],
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
    override_volume_pct: int | None = None,
) -> list[str]:
    argv = ["edge-tts", "--voice", VOICES[voice]]
    opts = BASE_OPTS[voice]
    if override_volume_pct is not None:
        opts = [o for o in opts if not o.startswith("--volume=")]
        opts = list(opts) + [f"--volume={override_volume_pct:+d}%"]
    argv.extend(opts)
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

    def _opts_for(seg: dict) -> tuple[int | None, int | None, int | None]:
        """Return (pitch, rate, override_volume_pct) for a single segment.

        Gérard's 'Paragraphe N.' announces get pitch/rate jitter and the
        base -10% volume. Gérard's citation/en-bref announces sit at -20%
        — quieter than the body voices so they read as a label, not a
        spoken sentence.
        """
        is_gerard = seg["voice"] == "gerard"
        is_paragraph = is_gerard and seg["text"].startswith("Paragraphe ")
        if is_paragraph:
            p, r = jitter.next_announce()
            return p, r, None
        if is_gerard:
            # Citation / En bref announce — override volume to -20%.
            return None, None, -20
        return None, None, None

    if len(segments) == 1:
        seg = segments[0]
        pitch, rate, vol = _opts_for(seg)
        argv = build_edge_tts_argv(seg["voice"], seg["text"], out_path,
                                    extra_pitch_hz=pitch, extra_rate_pct=rate,
                                    override_volume_pct=vol)
        return subprocess.run(argv, capture_output=True, text=True).returncode == 0

    # Multi-segment: render each, glue with silence, concat.
    tmpdir = Path(tempfile.mkdtemp(prefix=f"ccc_{entry['seq']}_"))
    try:
        files: list[Path] = []
        for i, seg in enumerate(segments):
            seg_file = tmpdir / f"seg_{i:02d}.mp3"
            pitch, rate, vol = _opts_for(seg)
            argv = build_edge_tts_argv(seg["voice"], seg["text"], seg_file,
                                        extra_pitch_hz=pitch, extra_rate_pct=rate,
                                        override_volume_pct=vol)
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


def render_segment_macos(
    voice_name: str,
    text: str,
    out_path: Path,
    rate_wpm: int | None = None,
    volume_db: float = 0.0,
) -> bool:
    """Render one segment with macOS say, convert to MP3 via ffmpeg."""
    aiff_path = out_path.with_suffix(".aiff")
    try:
        argv = ["say", "-v", voice_name, "-o", str(aiff_path)]
        if rate_wpm is not None:
            argv.extend(["-r", str(rate_wpm)])
        argv.extend(["--", text])
        if subprocess.run(argv, capture_output=True, text=True).returncode != 0:
            return False
        ff = ["ffmpeg", "-y", "-i", str(aiff_path)]
        if volume_db != 0.0:
            ff.extend(["-af", f"volume={volume_db:.1f}dB"])
        ff.extend(["-codec:a", "libmp3lame", "-q:a", "4", str(out_path)])
        return subprocess.run(ff, capture_output=True, text=True).returncode == 0
    finally:
        aiff_path.unlink(missing_ok=True)


def _v2_opts_for(seg: dict) -> tuple[int | None, int | None, int | None]:
    """Return (extra_pitch_hz, extra_rate_pct, override_volume_pct) for a V2 segment."""
    if seg["voice"] != "gerard":
        return None, None, None
    text = seg["text"]
    # Range announces and citation labels are structural cues — slightly quieter.
    if text.startswith("Paragraphes ") or text.startswith("Paragraphe "):
        return None, None, -20
    if text.startswith("Citation"):
        return None, None, -20
    # Chapter / article titles and heading2/3 labels: normal Gerard volume.
    return None, None, None


def _seg_type(seg: dict, entry: dict) -> str:
    """Classify a v2 segment for chapter_map / SYLT consumers."""
    text  = seg["text"]
    voice = seg["voice"]
    if entry["kind"] == "heading":
        if text.startswith(("Paragraphes ", "Paragraphe ")):
            return "range_announce"
        level = entry.get("level") or "heading"
        return f"heading_{level}"
    # paragraph entry
    if voice == "gerard" and text.startswith("Paragraphe "):
        return "paragraph_announce"
    if voice == "gerard" and text.startswith("Citation"):
        return "citation_announce"
    if voice == "fabrice":
        return "citation"
    return "body"


def render_v2_group(
    *,
    group: dict,
    out_path: Path,
    gap_ms: int,
    section_gap_ms: int = 600,
    skip_existing: bool = False,
    macos_gerard_voice: str | None = None,
    macos_gerard_rate_wpm: int | None = None,
) -> tuple[bool, list[dict] | None]:
    """Render all v2-targeted segments from a file group into one MP3.

    Returns `(success, chapter_map)`. `chapter_map` is a list of dicts:
        {start_ms, end_ms, type, voice, text, paragraph?, level?}
    sorted in playback order, suitable for CHAP/CTOC, SYLT, and karaoke
    timing. `None` when skipped or on failure.
    """
    if skip_existing and out_path.exists():
        return True, None

    tagged: list[tuple[dict, dict, bool]] = []
    for entry in group["entries"]:
        is_heading = entry["kind"] == "heading"
        for seg in entry["segments"]:
            if "v2" in seg["targets"]:
                tagged.append((seg, entry, is_heading))

    if not tagged:
        return False, None

    out_path.parent.mkdir(parents=True, exist_ok=True)

    def _render_seg(seg: dict, dest: Path) -> bool:
        if macos_gerard_voice and seg["voice"] == "gerard":
            text = seg["text"]
            is_label = (text.startswith("Paragraphes ") or
                        text.startswith("Paragraphe ") or
                        text.startswith("Citation"))
            vol_db = -2.0 if is_label else 0.0
            return render_segment_macos(
                macos_gerard_voice, text, dest,
                rate_wpm=macos_gerard_rate_wpm, volume_db=vol_db,
            )
        pitch, rate, vol = _v2_opts_for(seg)
        argv = build_edge_tts_argv(seg["voice"], seg["text"], dest,
                                    extra_pitch_hz=pitch, extra_rate_pct=rate,
                                    override_volume_pct=vol)
        return subprocess.run(argv, capture_output=True, text=True).returncode == 0

    def _seg_entry(seg: dict, entry: dict, start_ms: int, end_ms: int) -> dict:
        out: dict = {
            "start_ms": start_ms,
            "end_ms":   end_ms,
            "type":     _seg_type(seg, entry),
            "voice":    seg["voice"],
            "text":     seg["text"],
        }
        if entry.get("level"):
            out["level"] = entry["level"]
        if "number" in entry:
            out["paragraph"] = entry["number"]
        return out

    if len(tagged) == 1:
        seg, entry, _ = tagged[0]
        if not _render_seg(seg, out_path):
            return False, None
        dur_ms = int(MP3(str(out_path)).info.length * 1000)
        return True, [_seg_entry(seg, entry, 0, dur_ms)]

    tmpdir = Path(tempfile.mkdtemp(prefix="ccc_v2_"))
    try:
        files: list[Path] = []
        chapter_map: list[dict] = []
        cursor_ms = 0
        for i, (seg, entry, is_heading) in enumerate(tagged):
            seg_file = tmpdir / f"seg_{i:04d}.mp3"
            if not _render_seg(seg, seg_file):
                return False, None
            seg_ms = int(MP3(str(seg_file)).info.length * 1000)
            chapter_map.append(_seg_entry(seg, entry, cursor_ms, cursor_ms + seg_ms))
            cursor_ms += seg_ms
            files.append(seg_file)
            if i < len(tagged) - 1:
                this_gap = section_gap_ms if is_heading else gap_ms
                gap_file = tmpdir / f"gap_{i:04d}.mp3"
                if not generate_silence(this_gap, gap_file):
                    return False, None
                files.append(gap_file)
                cursor_ms += this_gap
        if not concat_mp3s(files, out_path):
            return False, None
        return True, chapter_map
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
