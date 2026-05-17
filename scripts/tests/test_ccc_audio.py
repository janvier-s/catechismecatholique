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


def test_strip_ref_parens_body():
    src = "Le verbe est divin (Symbole de Nicée-Constantinople)."
    # body-level uses a stricter regex aimed at trailing refs
    assert ccc_audio.strip_ref_parens(src) == "Le verbe est divin."


def test_strip_trailing_parens_default():
    src = "Citation texte (sermones 241, 2 : PL 38, 1134)"
    cleaned, captured = ccc_audio.strip_trailing_parens(src, paragraph_number=32)
    assert cleaned == "Citation texte"
    assert captured is None


def test_strip_trailing_parens_keep_for_260():
    src = "Citation texte (Prière de la Bienheureuse Élisabeth de la Trinité)"
    cleaned, captured = ccc_audio.strip_trailing_parens(src, paragraph_number=260)
    assert cleaned == "Citation texte"
    assert captured == "Prière de la Bienheureuse Élisabeth de la Trinité"


def test_strip_trailing_parens_no_parens():
    cleaned, captured = ccc_audio.strip_trailing_parens("Pas de parenthèse.", paragraph_number=1)
    assert cleaned == "Pas de parenthèse."
    assert captured is None


def test_is_en_bref_true_for_italic_wrap():
    assert ccc_audio.is_en_bref({
        "number": 44,
        "text_html": '<span><i class="typo_italic">Tout ce qui est dans le ciel.</i></span>',
    })


def test_is_en_bref_false_for_normal_paragraph():
    assert not ccc_audio.is_en_bref({
        "number": 1,
        "text_html": '<span>Dieu, infiniment <i class="typo_italic">parfait</i>.</span>',
    })


def test_is_en_bref_false_for_22_meta_paragraph():
    # §22 is wholly italic but is the meta-paragraph describing what
    # en brefs are, not an en-bref itself.
    assert not ccc_audio.is_en_bref({
        "number": 22,
        "text_html": '<span><i class="typo_italic">À la fin de chaque unité.</i></span>',
    })


def test_match_citations_simple():
    citations = [{"text_html": "<span>cit text</span>"}]
    mrefs = [{"type": "patristic", "raw": "saint Augustin, confessiones 1:1", "idx": "a"}]
    body_html = "<span>body</span>"
    matched = ccc_audio.match_citations(citations, mrefs, body_html)
    assert len(matched) == 1
    cit, ref = matched[0]
    assert cit == citations[0]
    assert ref == mrefs[0]


def test_match_citations_skips_inline_docrefs():
    # If mref idx appears as data-idx in body, it's inline (footnote), not the citation's source.
    citations = [{"text_html": "<span>cit text</span>"}]
    mrefs = [
        {"type": "magisterial", "raw": "DV 2", "idx": "a"},
        {"type": "patristic", "raw": "adversus hæreses 3:20", "idx": "b"},
    ]
    body_html = 'see <sup class="srcRef docRef" data-idx="a">a</sup> here'
    matched = ccc_audio.match_citations(citations, mrefs, body_html)
    cit, ref = matched[0]
    assert ref["idx"] == "b"


def test_match_citations_excludes_bible_types():
    citations = [{"text_html": "<span>cit text</span>"}]
    mrefs = [
        {"type": "bible", "raw": "Mt 5:1", "idx": "1"},
        {"type": "patristic", "raw": "saint Paul", "idx": "a"},
    ]
    matched = ccc_audio.match_citations(citations, mrefs, "<span></span>")
    cit, ref = matched[0]
    assert ref["type"] == "patristic"


def test_sigla_expand():
    assert ccc_audio.expand_sigla("DV") == "constitution dogmatique Dei Verbum"
    assert ccc_audio.expand_sigla("CIC") == "Code de droit canonique"
    assert ccc_audio.expand_sigla("XYZ") is None  # unknown


def test_apply_intro_phonetic_dei_verbum():
    src = "Citation de la constitution dogmatique Dei Verbum :"
    out = ccc_audio.apply_intro_phonetic(src)
    assert "Déi Vèrboum" in out
    assert "Dei Verbum" not in out


def test_apply_intro_phonetic_centesimus():
    out = ccc_audio.apply_intro_phonetic("Citation de Centesimus Annus :")
    assert "Tchènntézimousse Annousse" in out


def test_apply_intro_phonetic_passthrough():
    out = ccc_audio.apply_intro_phonetic("Citation de saint Augustin :")
    assert out == "Citation de saint Augustin :"


def test_derive_intro_patristic_saint_in_raw():
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "patristic", "raw": "saint Augustin, confessiones 1:1"},
        body_text="",
    )
    # Lowercase "saint" in source → lowercase "sainte" after liaison fix.
    assert intro == "Citation de sainte Augustin :"
    assert tier == 1


def test_derive_intro_author_map_exact():
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "patristic", "raw": "Augustin de Dace"},
        body_text="",
    )
    assert intro == "Citation d'Augustin de Dace :"
    assert tier == 1


def test_derive_intro_sigla_dv():
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "magisterial", "raw": "DV 10"},
        body_text="",
    )
    assert intro == "Citation de la constitution dogmatique Déi Vèrboum :"
    assert tier == 1


def test_derive_intro_conciliar():
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "conciliar", "raw": "concile de Trente : DS 1525"},
        body_text="",
    )
    assert intro == "Citation du concile de Trente :"
    assert tier == 1


def test_derive_intro_canon_law():
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "canon_law", "raw": "voir CIC, can. 847, § 1"},
        body_text="",
    )
    assert intro == "Citation du Code de droit canonique :"
    assert tier == 1


def test_derive_intro_tier3_fallback_for_poes_9():
    # §227 trap: raw="Poes. 9" must NOT match Grégoire — it falls through.
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "patristic", "raw": "Poes. 9"},
        body_text="Texte sans mention de saint.",
    )
    assert intro == "Citation patristique :"
    assert tier == 3


def test_derive_intro_no_mref():
    intro, tier = ccc_audio.derive_citation_intro(mref=None, body_text="")
    assert intro == "Citation :"
    assert tier == 3


def test_tier2_finds_saint_paul_in_body():
    body = "saint Paul affirme au sujet des païens : "
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "patristic", "raw": "sermones 241:2 : PL 38:1134"},
        body_text=body,
    )
    assert intro == "Citation de saint Paul :"
    assert tier == 2


def test_tier2_finds_saint_irenee_de_lyon():
    body = "Saint Irénée de Lyon parle à maintes reprises : "
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "patristic", "raw": "adversus hæreses 3:20, 2"},
        body_text=body,
    )
    assert intro == "Citation de Sainte Irénée de Lyon :"
    assert tier == 2


def test_tier2_not_triggered_when_tier1_already_authored():
    body = "saint Pierre dit : "
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "patristic", "raw": "saint Augustin, confessiones 1:1"},
        body_text=body,
    )
    assert intro == "Citation de sainte Augustin :"
    assert tier == 1


def test_tier2_falls_to_tier3_when_no_saint_in_body():
    intro, tier = ccc_audio.derive_citation_intro(
        mref={"type": "patristic", "raw": "Poes. 9"},
        body_text="Pas de mention pertinente ici.",
    )
    assert intro == "Citation patristique :"
    assert tier == 3


def test_build_paragraph_entry_no_citation():
    paragraph = {
        "number": 1,
        "text_html": "<span>Dieu, infiniment Parfait.</span>",
        "citations": [],
        "magisterial_refs": [],
    }
    location = {"chapter_title": "Prologue"}
    entry, _audit = ccc_audio.build_paragraph_entry(seq=3, paragraph=paragraph, location=location)
    assert entry["seq"] == 3
    assert entry["kind"] == "paragraph"
    assert entry["number"] == 1
    assert entry["file_number"] == "0001"
    segments = entry["segments"]
    assert segments[0] == {"voice": "gerard", "text": "Paragraphe 1.", "targets": ["v1"]}
    assert segments[1]["voice"] == "remy"
    assert "Dieu, infiniment Parfait" in segments[1]["text"]
    assert segments[1]["targets"] == ["v1", "v2"]


def test_build_paragraph_entry_75_spelled_out():
    paragraph = {
        "number": 75, "text_html": "<span>Texte.</span>",
        "citations": [], "magisterial_refs": [],
    }
    entry, _ = ccc_audio.build_paragraph_entry(seq=80, paragraph=paragraph, location={})
    assert entry["segments"][0]["text"] == "Paragraphe soixante-quinze."


def test_build_paragraph_entry_with_citation():
    paragraph = {
        "number": 30,
        "text_html": "<span>Saint Augustin écrit alors :</span>",
        "citations": [{"text_html": "<span>Tu es grand, Seigneur.</span>"}],
        "magisterial_refs": [{"type": "patristic", "raw": "saint Augustin, confessiones 1:1", "idx": "a"}],
    }
    entry, audit = ccc_audio.build_paragraph_entry(seq=40, paragraph=paragraph, location={})
    voices = [s["voice"] for s in entry["segments"]]
    assert voices == ["gerard", "remy", "gerard", "fabrice"]
    assert entry["segments"][2]["text"] == "Citation de sainte Augustin :"
    assert entry["segments"][3]["text"] == "Tu es grand, Seigneur."
    assert len(audit) == 1
    assert audit[0]["paragraph"] == 30
    assert audit[0]["tier_used"] == 1


def test_build_paragraph_entry_empty_body_skipped():
    # §21 / §118 case
    paragraph = {
        "number": 21, "text_html": "<span></span>",
        "citations": [{"text_html": "<span>Citation only.</span>"}],
        "magisterial_refs": [{"type": "patristic", "raw": "saint Augustin", "idx": "a"}],
    }
    entry, _ = ccc_audio.build_paragraph_entry(seq=25, paragraph=paragraph, location={})
    voices = [s["voice"] for s in entry["segments"]]
    assert voices == ["gerard", "gerard", "fabrice"]  # no remy body


def test_build_paragraph_entry_dup_number_suffix():
    paragraph = {
        "number": 100, "text_html": "<span>X.</span>",
        "citations": [], "magisterial_refs": [],
    }
    # Caller provides occurrence_index for duplicates.
    entry, _ = ccc_audio.build_paragraph_entry(seq=120, paragraph=paragraph, location={}, occurrence_index=2)
    assert entry["file_number"] == "0100_2"


def test_build_en_bref_combined_entry():
    paragraphs = [
        {"number": 44, "text_html": '<span><i class="typo_italic">Premier point.</i></span>',
         "citations": [], "magisterial_refs": []},
        {"number": 45, "text_html": '<span><i class="typo_italic">Deuxième point.</i></span>',
         "citations": [], "magisterial_refs": []},
    ]
    location = {"chapter_title": "Test", "chapter_slug": "test-chap"}
    entry = ccc_audio.build_en_bref_combined_entry(
        seq=300,
        chapter_slug="test-chap",
        en_bref_paragraphs=paragraphs,
        location=location,
    )
    assert entry["kind"] == "en_bref_combined"
    assert entry["chapter_slug"] == "test-chap"
    assert entry["file_number"] == "eb_test-chap"
    assert entry["paragraph_range"] == [44, 45]
    segments = entry["segments"]
    assert segments[0] == {"voice": "gerard", "text": "En bref.", "targets": ["v1"]}
    assert segments[1]["voice"] == "remy"
    assert "Premier point" in segments[1]["text"]
    assert segments[2]["voice"] == "remy"
    assert "Deuxième point" in segments[2]["text"]
    # All segments V1-only.
    assert all(s["targets"] == ["v1"] for s in segments)


from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"


def test_load_corpus_walks_in_order():
    corpus = ccc_audio.load_corpus(
        chapters_full_dir=FIXTURES / "chapters-full",
        paragraphs_dir=FIXTURES / "paragraphs",
    )
    assert len(corpus) == 2
    p27, p28 = corpus
    assert p27["paragraph"]["number"] == 27
    assert p27["location"]["chapter_slug"] == "test-chapter"
    assert p28["paragraph"]["number"] == 28
