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
