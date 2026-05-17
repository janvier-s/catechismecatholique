import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import ccc_audio


def test_module_exposes_version():
    assert ccc_audio.__version__ == "0.1.0"


import pytest


@pytest.mark.parametrize("n,expected", [
    (1, "un"),
    (7, "sept"),
    (10, "dix"),
    (17, "dix-sept"),
    (21, "vingt-et-un"),
    (75, "soixante-quinze"),
    (80, "quatre-vingts"),
    (81, "quatre-vingt-un"),
    (92, "quatre-vingt-douze"),
    (100, "cent"),
    (200, "deux-cents"),
    (201, "deux-cent-un"),
    (1000, "mille"),
    (2865, "deux-mille-huit-cent-soixante-cinq"),
])
def test_number_to_french(n, expected):
    assert ccc_audio.number_to_french(n) == expected


def test_should_spell_paragraph_number():
    # tens digit ∈ {7, 8, 9} → spelled out
    assert ccc_audio.should_spell_paragraph_number(75)
    assert ccc_audio.should_spell_paragraph_number(289)  # 8 in tens
    assert ccc_audio.should_spell_paragraph_number(91)
    assert not ccc_audio.should_spell_paragraph_number(27)
    assert not ccc_audio.should_spell_paragraph_number(100)  # 0 in tens
