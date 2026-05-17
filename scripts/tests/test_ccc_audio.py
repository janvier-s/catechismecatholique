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


def test_roman_to_arabic_basic():
    assert ccc_audio.roman_to_arabic("I") == 1
    assert ccc_audio.roman_to_arabic("IV") == 4
    assert ccc_audio.roman_to_arabic("IX") == 9
    assert ccc_audio.roman_to_arabic("XII") == 12
    assert ccc_audio.roman_to_arabic("MMXXVI") == 2026


def test_number_to_french_ordinal():
    assert ccc_audio.number_to_french_ordinal(1) == "premier"
    assert ccc_audio.number_to_french_ordinal(2) == "deuxième"
    assert ccc_audio.number_to_french_ordinal(5) == "cinquième"
    assert ccc_audio.number_to_french_ordinal(9) == "neuvième"
    assert ccc_audio.number_to_french_ordinal(21) == "vingt-et-unième"


def test_convert_roman_numerals_in_text():
    assert ccc_audio.convert_roman_numerals("Au IIe siècle") == "Au deuxième siècle"
    assert ccc_audio.convert_roman_numerals("Vatican II") == "Vatican 2"
    assert ccc_audio.convert_roman_numerals("voir I)") == "voir 1)"


def test_clean_text_strips_srcref_sups():
    html = 'Voir <sup class="srcRef docRef" data-idx="a">a</sup> ce texte.'
    assert ccc_audio.clean_text(html) == "Voir ce texte."


def test_clean_text_preserves_other_sups():
    html = 'E=mc<sup>2</sup>.'
    assert ccc_audio.clean_text(html) == "E=mc2."


def test_clean_text_normalizes_whitespace():
    html = '<span>Un texte   avec\nlignes.</span>'
    assert ccc_audio.clean_text(html) == "Un texte avec lignes."


def test_clean_text_french_punctuation_spacing():
    html = '<span>Phrase , bizarre . Et »attendue .»</span>'
    assert ccc_audio.clean_text(html) == "Phrase, bizarre. Et »attendue. »"
