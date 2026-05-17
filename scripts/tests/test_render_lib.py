import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import random

import render_ccc_audio_lib as rlib


def test_jitter_state_first_pitch_in_range():
    state = rlib.JitterState(seed=42)
    pitch, rate = state.next_announce()
    assert -8 <= pitch <= 8
    assert -5 <= rate <= 5


def test_jitter_state_pitch_step_capped_at_4():
    state = rlib.JitterState(seed=1)
    p1, _ = state.next_announce()
    p2, _ = state.next_announce()
    assert abs(p2 - p1) <= 4


def test_jitter_state_rate_step_capped_at_2():
    state = rlib.JitterState(seed=1)
    _, r1 = state.next_announce()
    _, r2 = state.next_announce()
    assert abs(r2 - r1) <= 2


def test_build_edge_tts_argv_voice_opts_stacked():
    argv = rlib.build_edge_tts_argv(
        voice="gerard",
        text="Paragraphe 1.",
        out_path=Path("/tmp/x.mp3"),
        extra_pitch_hz=3,
        extra_rate_pct=-2,
    )
    assert "--voice" in argv
    assert "fr-BE-GerardNeural" in argv
    assert "--volume=-10%" in argv
    assert "--pitch=+3Hz" in argv
    assert "--rate=-2%" in argv


def test_build_edge_tts_argv_remy_no_jitter():
    argv = rlib.build_edge_tts_argv(
        voice="remy",
        text="Body.",
        out_path=Path("/tmp/y.mp3"),
        extra_pitch_hz=None,
        extra_rate_pct=None,
    )
    assert "fr-FR-RemyMultilingualNeural" in argv
    assert "--rate=-10%" in argv
    assert not any("--pitch=" in a for a in argv)


import shutil


def test_generate_silence_creates_file(tmp_path):
    if shutil.which("ffmpeg") is None:
        import pytest
        pytest.skip("ffmpeg not installed")
    out = tmp_path / "silence.mp3"
    assert rlib.generate_silence(200, out) is True
    assert out.exists()
    assert out.stat().st_size > 0


def test_concat_mp3s_joins_files(tmp_path):
    if shutil.which("ffmpeg") is None:
        import pytest
        pytest.skip("ffmpeg not installed")
    a = tmp_path / "a.mp3"
    b = tmp_path / "b.mp3"
    rlib.generate_silence(100, a)
    rlib.generate_silence(150, b)
    out = tmp_path / "out.mp3"
    assert rlib.concat_mp3s([a, b], out) is True
    assert out.exists()


def test_probe_duration_ms_returns_int(tmp_path):
    if shutil.which("ffmpeg") is None:
        import pytest
        pytest.skip("ffmpeg not installed")
    f = tmp_path / "tone.mp3"
    rlib.generate_silence(250, f)
    ms = rlib.probe_duration_ms(f)
    assert isinstance(ms, int)
    assert 200 < ms < 400


def test_tag_mp3_writes_id3(tmp_path):
    if shutil.which("ffmpeg") is None:
        import pytest
        pytest.skip("ffmpeg not installed")
    f = tmp_path / "tag.mp3"
    rlib.generate_silence(300, f)
    rlib.tag_mp3(
        f,
        title="CCC §1",
        album="L'homme est capable de Dieu",
        track=3,
        comment="Dieu, infiniment Parfait.",
    )
    from mutagen.id3 import ID3
    tags = ID3(str(f))
    assert str(tags["TIT2"]) == "CCC §1"
    assert str(tags["TALB"]) == "L'homme est capable de Dieu"
    assert str(tags["TRCK"]) == "0003"
    assert "Dieu" in str(tags["COMM::fra"])


def test_render_entry_produces_mp3(tmp_path):
    if shutil.which("ffmpeg") is None or shutil.which("edge-tts") is None:
        import pytest
        pytest.skip("ffmpeg or edge-tts not installed")
    entry = {
        "seq": 1,
        "kind": "paragraph",
        "number": 1,
        "file_number": "0001",
        "location": {"chapter_title": "Test"},
        "segments": [
            {"voice": "gerard", "text": "Paragraphe 1.", "targets": ["v1"]},
            {"voice": "remy", "text": "Dieu, infiniment Parfait.", "targets": ["v1", "v2"]},
        ],
    }
    state = rlib.JitterState(seed=42)
    out = tmp_path / "ccc_0001.mp3"
    rlib.render_entry(entry=entry, target="v1", out_path=out, jitter=state, gap_ms=200)
    assert out.exists()
    assert out.stat().st_size > 0


def test_render_cli_v1_creates_files(tmp_path):
    if shutil.which("ffmpeg") is None or shutil.which("edge-tts") is None:
        import pytest
        pytest.skip("ffmpeg or edge-tts not installed")
    manifest = {
        "version": 1,
        "voices": rlib.VOICES,
        "voice_opts": {},
        "entries": [
            {
                "seq": 1, "kind": "paragraph", "number": 1, "file_number": "0001",
                "location": {"chapter_title": "Test"},
                "segments": [
                    {"voice": "remy", "text": "Texte court.", "targets": ["v1", "v2"]},
                ],
            },
        ],
    }
    manifest_path = tmp_path / "m.json"
    import json
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    out_dir = tmp_path / "audio"
    import subprocess
    import sys
    from pathlib import Path as _P
    root = _P(__file__).resolve().parent.parent
    result = subprocess.run(
        [
            sys.executable, str(root / "render-ccc-audio.py"),
            "--target", "v1",
            "--manifest", str(manifest_path),
            "--out-dir", str(out_dir),
            "--seed", "42",
        ],
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    assert (out_dir / "ccc_0001.mp3").exists()
    assert (out_dir / "index.json").exists()
    index = json.loads((out_dir / "index.json").read_text(encoding="utf-8"))
    assert "1" in index["paragraphs"]
    assert index["paragraphs"]["1"]["file"] == "ccc_0001.mp3"
