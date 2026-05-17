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


def test_fix_saint_liaison():
    # Case-preserving: only swap the t→te, not the leading capitalization.
    assert ccc_audio.fix_saint_liaison("saint Augustin") == "sainte Augustin"
    assert ccc_audio.fix_saint_liaison("saint Hippolyte") == "sainte Hippolyte"
    assert ccc_audio.fix_saint_liaison("Saint Augustin") == "Sainte Augustin"
    assert ccc_audio.fix_saint_liaison("saint Pierre") == "saint Pierre"  # P is not vowel/h


def test_apply_text_replace_for_1513():
    src = '« Per istam sanctam unctionem et suam piissimam misericordiam adiuvet te Dominus gratia Spiritus Sancti, ut a peccatis liberatum te salvet atque propitius allevet »'
    out = ccc_audio.apply_text_replace(src, 1513)
    assert "Par cette onction sainte" in out
    assert "Latin" not in out.lower() or "Per istam" not in out


def test_apply_text_replace_for_2854():
    src = "Libera nos, quæsumus, Domine, ab omnibus malis, da propitius pacem in diebus nostris, ut, ope misericordiæ tuæ adiuti, et a peccatis simus semper liberi et ab omni perturbatione securi : exspectantes beatam spem et adventum Salvatoris nostri Iesu Christi"
    out = ccc_audio.apply_text_replace(src, 2854)
    assert out.startswith("Délivre-nous de tout mal, Seigneur")


def test_apply_general_replacements_greek():
    src = "le kyrios est le ekklèsia"
    out = ccc_audio.apply_general_replacements(src)
    assert "κύριος" in out
    assert "ἐκκλησία" in out
    assert "kyrios" not in out


def test_strip_annotations_removes_voir():
    src = "Un texte (voir DV 2) qui continue."
    assert ccc_audio.strip_annotations(src) == "Un texte qui continue."


def test_strip_annotations_removes_doc_sigla_parens():
    assert ccc_audio.strip_annotations("Texte (DV 10) ici.") == "Texte ici."
    assert ccc_audio.strip_annotations("Texte (saint Augustin, PG 35, 980) ici.") == "Texte ici."


def test_strip_annotations_removes_bible_parens():
    assert ccc_audio.strip_annotations("Le verbe (Jn 1:1) divin.") == "Le verbe divin."


def test_strip_annotations_preserves_normal_parens():
    src = "Le verbe (la Parole) divin."
    assert ccc_audio.strip_annotations(src) == "Le verbe (la Parole) divin."


def test_expand_bible_refs():
    assert ccc_audio.expand_bible_refs("voir Mt 28:19") == "voir Matthieu 28:19"
    assert ccc_audio.expand_bible_refs("voir 1 Co 13") == "voir 1 Corinthiens 13"


def test_expand_bible_refs_ignores_isolated_abbr():
    # "Si" without trailing number is not a Bible ref
    assert ccc_audio.expand_bible_refs("Si tu veux") == "Si tu veux"
