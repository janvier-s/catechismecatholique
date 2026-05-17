import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = Path(__file__).parent / "fixtures"


def test_build_manifest_cli_writes_manifest(tmp_path):
    result = subprocess.run(
        [
            sys.executable, str(ROOT / "build-ccc-manifest.py"),
            "--chapters-full", str(FIXTURES / "chapters-full"),
            "--paragraphs", str(FIXTURES / "paragraphs"),
            "--out", str(tmp_path / "manifest.json"),
            "--audit", str(tmp_path / "audit.csv"),
            "--leakage", str(tmp_path / "leakage.txt"),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    assert (tmp_path / "manifest.json").exists()
    data = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert data["version"] == 1
    assert len(data["entries"]) == 2
    assert (tmp_path / "audit.csv").exists()
    assert (tmp_path / "leakage.txt").exists()


def test_build_manifest_cli_lint_clean_returns_zero(tmp_path):
    result = subprocess.run(
        [
            sys.executable, str(ROOT / "build-ccc-manifest.py"),
            "--chapters-full", str(FIXTURES / "chapters-full"),
            "--paragraphs", str(FIXTURES / "paragraphs"),
            "--out", str(tmp_path / "manifest.json"),
            "--audit", str(tmp_path / "audit.csv"),
            "--leakage", str(tmp_path / "leakage.txt"),
            "--lint",
        ],
        capture_output=True,
        text=True,
    )
    # With clean fixtures + intentional allowlist, lint should pass (rc=0).
    assert result.returncode == 0, result.stderr
