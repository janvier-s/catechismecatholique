"""Shared helpers for CCC audio manifest + render pipelines.

See docs/superpowers/specs/2026-05-17-ccc-audio-design.md.
"""

from pathlib import Path

__version__ = "0.1.0"

_UNITS = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
          "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
          "dix-sept", "dix-huit", "dix-neuf"]

_TENS = {2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante"}


def _hundreds(n: int) -> str:
    h, r = divmod(n, 100)
    parts: list[str] = []
    if h == 1:
        parts.append("cent")
    elif h > 1:
        parts.append(_UNITS[h] + ("-cent" if r > 0 else "-cents"))
    if r == 0:
        return "-".join(parts) if parts else ""
    if r < 20:
        parts.append(_UNITS[r])
    elif r < 70:
        t, u = divmod(r, 10)
        p = _TENS[t]
        if u == 1 and t != 8:
            p += "-et"
        if u > 0:
            p += "-" + _UNITS[u]
        parts.append(p)
    elif r < 80:
        u = r - 60
        p = "soixante"
        if u == 11:
            p += "-et"
        if u > 0:
            p += "-" + _UNITS[u]
        parts.append(p)
    elif r < 90:
        u = r - 80
        p = "quatre-vingt"
        p += "-" + _UNITS[u] if u > 0 else "s"
        parts.append(p)
    else:
        u = r - 90
        parts.append("quatre-vingt-" + _UNITS[10 + u])
    return "-".join(parts)


def number_to_french(n: int) -> str:
    """Convert 0-9999 to French words. Used for paragraph numbers and ranges."""
    if n == 0:
        return "zéro"
    if n >= 1000:
        m, r = divmod(n, 1000)
        parts = ["mille"] if m == 1 else [_hundreds(m) + "-mille"]
        if r > 0:
            parts.append(_hundreds(r))
        return "-".join(parts)
    return _hundreds(n)


def should_spell_paragraph_number(n: int) -> bool:
    """Spell out paragraph numbers whose tens digit is 7, 8, or 9.

    Gérard's Belgian French pronounces 70-99 ranges awkwardly when read as
    digits. Forcing spelled-out French for those keeps the cadence right.
    """
    tens = (n % 100) // 10
    return tens in (7, 8, 9)


import re

_ROMAN_VALUES = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
_ROMAN_NUM_RE = re.compile(r"\b[IVXLCDM]{2,}\b")
_ROMAN_ENUM_RE = re.compile(r"\b([IVX])([.)])")
_ROMAN_ORD_RE = re.compile(r"\b([IVXLCDM]{2,})e\b")
_ROMAN_SIECLE_RE = re.compile(r"\b([IVXLCDM]+)e?\s+siècle\b", re.IGNORECASE)


def roman_to_arabic(roman: str) -> int:
    total = 0
    prev = 0
    for c in reversed(roman.upper()):
        v = _ROMAN_VALUES.get(c, 0)
        if v < prev:
            total -= v
        else:
            total += v
        prev = v
    return total


def number_to_french_ordinal(n: int) -> str:
    if n == 1:
        return "premier"
    card = number_to_french(n)
    if n % 10 == 1 and n != 11:
        return card + "ième"
    if card.endswith("cinq"):
        return card[:-4] + "cinquième"
    if card.endswith("neuf"):
        return card[:-4] + "neuvième"
    if card.endswith("e"):
        card = card[:-1]
    card = card.rstrip("s")
    return card + "ième"


def convert_roman_numerals(text: str) -> str:
    """Replace Roman numerals in text with Arabic / French ordinals.

    "IIe siècle" → "deuxième siècle"
    "Vatican II"  → "Vatican 2"
    Single Roman in "I)" enumeration → "1)"
    """
    text = _ROMAN_SIECLE_RE.sub(
        lambda m: f"{number_to_french_ordinal(roman_to_arabic(m.group(1)))} siècle", text
    )
    text = _ROMAN_ORD_RE.sub(
        lambda m: number_to_french_ordinal(roman_to_arabic(m.group(1))), text
    )
    text = _ROMAN_NUM_RE.sub(lambda m: str(roman_to_arabic(m.group(0))), text)
    text = _ROMAN_ENUM_RE.sub(lambda m: str(roman_to_arabic(m.group(1))) + m.group(2), text)
    return text


_RE_SUP_SRC = re.compile(r'<sup[^>]*\bsrcRef\b[^>]*>.*?</sup>', re.DOTALL)
_RE_SUP_KEEP = re.compile(r'<sup[^>]*>(.*?)</sup>', re.DOTALL)
_RE_BR = re.compile(r'<br\s*/?>', re.IGNORECASE)
_RE_HTML = re.compile(r'<[^>]+>')
_RE_WS = re.compile(r'\s+')
_RE_SPACE_BEFORE_PUNCT = re.compile(r'\s+([.,])')
_RE_SPACE_BEFORE_GUILLEMET = re.compile(r'(\S)»')
_RE_GUILLEMET_PERIOD = re.compile(r'\s*»\s*\.')


def clean_text(html: str) -> str:
    """Strip HTML, collapse whitespace, fix French punctuation spacing."""
    text = _RE_SUP_SRC.sub("", html)
    text = _RE_SUP_KEEP.sub(r"\1", text)
    text = _RE_BR.sub(" ", text)
    text = _RE_HTML.sub("", text)
    text = text.replace(" ", " ")
    text = _RE_WS.sub(" ", text)
    text = _RE_SPACE_BEFORE_PUNCT.sub(r"\1", text)
    text = _RE_SPACE_BEFORE_GUILLEMET.sub(r"\1 »", text)
    text = _RE_GUILLEMET_PERIOD.sub(". »", text)
    return text.strip()


_RE_SAINT_VOWEL = re.compile(r"(?i)\bsaint\s+(?=[aeiouyh])")


def fix_saint_liaison(text: str) -> str:
    """`saint X` becomes `Sainte X` when X begins with a vowel or h.

    Wrong gender, right pronunciation: Gérard reads the "t" in "Sainte"
    where he'd otherwise drop it in "saint" before a consonant. Applied
    indiscriminately because the audio cost of the gender mismatch is
    lower than the cost of the missing liaison.
    """
    return _RE_SAINT_VOWEL.sub(
        lambda m: "Sainte " if m.group(0)[0].isupper() else "sainte ",
        text,
    )


# Per-paragraph pronunciation overrides.
# Keys are CCC §. Values map exact source substring → replacement.
TEXT_REPLACE: dict[int, dict[str, str]] = {
    10: {
        " (rapport final II B a 4)": "",
        " (Discours 7 décembre 1985)": "",
        "Evangelii nuntiandi": "Évannguélii nounncianndé",
        "Catechesi tradendæ": "Catékézi tradènndé",
    },
    19: {" (par « voir »)": " (par « C F »)"},
    84: {"depositum fidei": "dépozitoum fidéi"},
    168: {"Te Deum": "Té Déoum"},
    170: {
        "summa theologiæ": "Soumma Théologiè",
        "(saint Thomas d'Aquin, Soumma Théologiè 2-2, 1, 2, ad 2)": "",
    },
    190: {"(saint Irénée, demonstratio apostolica 100)": ""},
    192: {"Fides Damasi": "Fidèss Damazi"},
    235: {" (I),": " (1),", " (II),": " (2),", " (III)": " (3)"},
    243: {"(voir Jn 14:26)": "", " (Défenseur)": " (ou Défenseur)"},
    246: {"filioque": "filioquoué"},
    247: {"filioque": "filioquoué"},
    248: {"filioque": "filioquoué", " (concile de Florence en 1439 : DS 1302)": ""},
    291: {" » »), ": ", ", " (Liturgie byzantine, Tropaire des vêpres de Pentecôte)": ""},
    335: {
        "In Paradisum deducant te angeli... de la Liturgie des défunts [OEx 50], ou encore dans l'« Hymne chérubinique » de la Liturgie byzantine":
            "(ainsi dans In Paradissoum deducante té angeli... de la Liturgie des défunts, ou encore dans l'« Hymne chérubinique » de la Liturgie byzantine)",
    },
    647: {"Exsultet": "Egzoultète"},
    774: {"mysterium": "mysterioum", "sacramentum": "sacramentoum"},
    875: {"in persona Christi": "in persona Kristi"},
    1124: {"Lex orandi": "Lèx oranndi", "lex credendi": "lèx crédenndi"},
    1126: {"lex orandi": "lèx oranndi"},
    1128: {"ex opere operato": "ex opéré opérato"},
    1211: {"summa theologiæ": "Soumma Théologiè"},
    1305: {"summa theologiæ": "Soumma Théologiè"},
    1325: {"mysterium": "mysterioum"},
    1348: {"in persona Christi": "in persona Kristi"},
    1513: {
        "« Per istam sanctam unctionem et suam piissimam misericordiam adiuvet te Dominus gratia Spiritus Sancti, ut a peccatis liberatum te salvet atque propitius allevet »":
            "« Par cette onction sainte, que le Seigneur, en sa grande bonté vous réconforte par la grâce de l'Esprit Saint. Ainsi, vous ayant libéré de tous péchés, qu'Il vous sauve et vous relève. »",
    },
    1523: {"sacramentum": "sacramentoum"},
    1548: {"in persona Christi": "in persona Kristi", "summa theologiæ": "Soumma Théologiè"},
    2097: {"Magnificat": "Maggnificatte"},
    2622: {"Magnificat": "Maggnificatte"},
    2763: {"summa theologiæ": "Soumma Théologiè"},
    2854: {
        "Libera nos, quæsumus, Domine, ab omnibus malis, da propitius pacem in diebus nostris, ut, ope misericordiæ tuæ adiuti, et a peccatis simus semper liberi et ab omni perturbatione securi : exspectantes beatam spem et adventum Salvatoris nostri Iesu Christi":
            "Délivre-nous de tout mal, Seigneur, et donne la paix à notre temps ; par ta miséricorde, libère-nous du péché, rassure-nous devant les épreuves en cette vie où nous espérons le bonheur que Tu promets et l'avènement de Jésus-Christ, notre Sauveur",
    },
}


def apply_text_replace(text: str, paragraph_number: int) -> str:
    """Apply per-paragraph TEXT_REPLACE overrides for the given paragraph."""
    for src, dst in TEXT_REPLACE.get(paragraph_number, {}).items():
        text = text.replace(src, dst)
    return text


def apply_general_replacements(text: str) -> str:
    """Greek-script substitutions and corpus-wide Latin/French phonetic fixes."""
    text = text.replace("concupiscentia", "concupiskentia")
    text = text.replace("concupiscence", "concupissensse")
    text = re.sub(r"(?i)\bmaran\s+atha\b", "Maranne atha", text)
    text = re.sub(r"(?i)\bmarana\s+tha\b", "Maranne atha", text)
    text = text.replace("(« in statu viæ »)", "(« inn statou vié »)")
    text = text.replace("Chalcédoine", "Kalcédoine")
    text = text.replace(
        "« Non est enim aliud Dei mistériomm, nisi Christus »",
        "« Nonne esste énim alioud Déi mistérioum, nissi Christouss »",
    )
    text = re.sub(r"(?i)\bkyrios\b", "κύριος", text)
    text = re.sub(r"(?i)\bekklèsia\b", "ἐκκλησία", text)
    text = re.sub(r"(?i)\bmysterion\b", "μυστήριον", text)
    text = re.sub(r"(?i)\bapostoloi\b", "ἀπόστολοι", text)
    text = re.sub(r"(?i)\bbaptizein\b", "βαπτίζω", text)
    text = re.sub(r"(?i)\beucharistian\b", "εὐχαριστίαν", text)
    text = re.sub(r"(?i)\btaxeis\b", "τάξις", text)
    text = re.sub(r"(?i)\bsymbolon\b", "σύμβολον", text)
    text = re.sub(r"(?i)\btheologia\b", "θεολογία", text)
    text = text.replace("episcoporum", "épiscoporoum")
    text = text.replace("presbyterorum", "présbytéroroum")
    text = text.replace("diaconorum", "diaconoroum")
    text = text.replace("Théotokosse", "Θεοτόκος")
    text = text.replace("Théotokos", "Θεοτόκος")
    text = re.sub(r"(?i)\boikonomia\b", "Οἰκονομία", text)
    text = text.replace("(« omnipotens sempiterne Deus... »)", "(« omnipotènsse sèmpiterné Déousse... »)")
    return text


_DOC_SIGLA = [
    "DS", "LG", "GS", "DV", "SC", "CD", "AA", "AG", "OT", "PO",
    "SRS", "RH", "RP", "MF", "FC", "DeV", "CL", "CT", "IGLH",
    "OEx", "OP", "OCV", "OcM", "CCEO", "CDF", "NA", "IM", "LH", "MR",
    "PG", "PL", "CSEL", "CCL", "SPF", "CIC", "CA",
]
_DOC_SIGLA_PAT = "|".join(sorted(_DOC_SIGLA, key=len, reverse=True))

BIBLE_NAMES = {
    "Gn": "Genèse", "Ex": "Exode", "Lv": "Lévitique", "Nb": "Nombres",
    "Dt": "Deutéronome", "Jos": "Josué", "Jg": "Juges", "Rt": "Ruth",
    "Esd": "Esdras", "Tb": "Tobie", "Jdt": "Judith", "Jb": "Job",
    "Ps": "Psaumes", "Pr": "Proverbes", "Qo": "Qohéleth",
    "Ct": "Cantique des cantiques", "Sg": "Sagesse",
    "Si": "Siracide", "Ne": "Néhémie", "Est": "Esther",
    "Is": "Isaïe", "Jr": "Jérémie", "Lm": "Lamentations",
    "Ba": "Baruch", "Ez": "Ézékiel", "Dn": "Daniel",
    "Os": "Osée", "Jl": "Joël", "Am": "Amos", "Ab": "Abdias",
    "Jon": "Jonas", "Mi": "Michée", "Na": "Nahum", "Ha": "Habaquq",
    "So": "Sophonie", "Ag": "Aggée", "Za": "Zacharie", "Ml": "Malachie",
    "Mt": "Matthieu", "Mc": "Marc", "Lc": "Luc", "Jn": "Jean",
    "Ac": "Actes", "Rm": "Romains", "Ga": "Galates",
    "Ep": "Éphésiens", "Ph": "Philippiens", "Col": "Colossiens",
    "Tt": "Tite", "Phm": "Philémon", "He": "Hébreux",
    "Jc": "Jacques", "Jude": "Jude", "Ap": "Apocalypse",
}
_NUMBERED_BIBLE = {
    "S": "Samuel", "R": "Rois", "Ch": "Chroniques",
    "Co": "Corinthiens", "Th": "Thessaloniciens", "Tm": "Timothée",
    "P": "Pierre", "Jn": "Jean", "M": "Maccabées",
}
_AMBIGUOUS_BIBLE = {"Si", "Ne", "Est"}

_BIBLE_ANNOT_ABBR = "|".join(sorted(BIBLE_NAMES, key=len, reverse=True))


def strip_annotations(text: str) -> str:
    """Remove parenthesized reference annotations (DS, PG, PL, voir, bible refs)."""
    text = re.sub(r"\s*\(voir\s+[^)]*\)", "", text)
    text = re.sub(r"\s*\[(?:" + _DOC_SIGLA_PAT + r")\s*\d+[^\]]*\]", "", text)
    text = re.sub(r"\s*\([^)]*?(?:" + _DOC_SIGLA_PAT + r")\s+\d+[^)]*\)", "", text)
    text = re.sub(r"\s*\((?:" + _BIBLE_ANNOT_ABBR + r")\s*\d+(?::\d+(?:[–-]\d+)?)?\s*\)", "", text)
    text = re.sub(r"\s*\(saint(?:e)?\s+[^)]*\d+[^)]*\)", "", text)
    text = re.sub(r"\s*\(concile\s+[^)]*\d+[^)]*\)", "", text)
    text = re.sub(r"\s*\([^)]*\bp\.\s*\d+[^)]*\)", "", text)
    text = re.sub(r"\s*\(Symbole de Nicée-Constantinople\)", "", text)
    text = re.sub(r"\s+\.", ".", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


_RE_BIBLE_NUM = re.compile(
    r"\b([123])\s*(" + "|".join(re.escape(k) for k in sorted(_NUMBERED_BIBLE, key=len, reverse=True)) +
    r")\b(?=\s*\d|[,.]?\s*et\b|\s*[:;,]|\s*\))"
)
_SAFE_ABBR = sorted([k for k in BIBLE_NAMES if k not in _AMBIGUOUS_BIBLE], key=len, reverse=True)
_RE_BIBLE_SAFE = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in _SAFE_ABBR) + r")\b(?=\s*\d|[,.]?\s*et\b|\s*[:;,]|\s*\))"
)
_RE_BIBLE_AMBIG = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in sorted(_AMBIGUOUS_BIBLE, key=len, reverse=True)) +
    r")\b(?=\s*\d)"
)


def expand_bible_refs(text: str) -> str:
    text = _RE_BIBLE_NUM.sub(
        lambda m: f"{m.group(1)} {_NUMBERED_BIBLE[m.group(2)]}", text
    )
    text = _RE_BIBLE_SAFE.sub(lambda m: BIBLE_NAMES[m.group(1)], text)
    text = _RE_BIBLE_AMBIG.sub(lambda m: BIBLE_NAMES[m.group(1)], text)
    return text


# Paragraphs whose citation trailing-paren content is meaningful (an
# author or work title) and should be kept and surfaced as a Gérard
# attribution segment rather than silently stripped.
KEEP_TRAILING_PAREN: set[int] = {260, 469}


_RE_REF_TRAILING_BODY = re.compile(
    r"\s+\(([A-ZÄÀÂÇÉÈÊËÎÏÔŒÙÛÜŸ].*\d)\)(\.?)$"
)


def strip_ref_parens(text: str) -> str:
    """Strip trailing parenthesized reference from a body paragraph.

    Conservative: matches only `(Upper… number)` at end of string.
    Also delegates to strip_annotations for named annotation patterns.
    """
    text = strip_annotations(text)
    return _RE_REF_TRAILING_BODY.sub(r"\2", text)


def strip_trailing_parens(text: str, paragraph_number: int) -> tuple[str, str | None]:
    """Strip a citation's trailing parenthesized fragment.

    Returns (cleaned_text, captured_attribution).
    captured_attribution is non-None only when paragraph_number is in
    KEEP_TRAILING_PAREN — those parens are author/work attributions
    worth surfacing.
    """
    stripped = text.rstrip(". ")
    if not stripped.endswith(")"):
        return text, None
    depth = 0
    match_pos = -1
    for pos in range(len(stripped) - 1, -1, -1):
        if stripped[pos] == ")":
            depth += 1
        elif stripped[pos] == "(":
            depth -= 1
            if depth == 0:
                match_pos = pos
                break
    if match_pos < 0:
        return text, None
    before = stripped[:match_pos].rstrip()
    captured = stripped[match_pos + 1:-1].strip()
    after = text[len(stripped):]
    if paragraph_number in KEEP_TRAILING_PAREN:
        return before + after, captured
    return before + after, None


# Paragraphs that look italic-wrapped but are NOT en brefs.
EN_BREF_EXCLUSIONS: set[int] = {22}


def is_en_bref(paragraph: dict) -> bool:
    """True when the paragraph's text_html is wholly wrapped in <i class="typo_italic">."""
    if paragraph["number"] in EN_BREF_EXCLUSIONS:
        return False
    html = paragraph.get("text_html", "").strip()
    inner = re.sub(r"^<span>", "", html)
    inner = re.sub(r"</span>$", "", inner).strip()
    return inner.startswith('<i class="typo_italic">') and inner.endswith("</i>")


# Full-string-match overrides for citation announce. Keys must be the
# COMPLETE mref.raw value, not a prefix. Ambiguous bare work titles
# (e.g. "Poes. 9") are deliberately NOT keys here — the §227 trap.
AUTHOR_MAP: dict[str, str] = {
    "Catech. R. 1:5": "du Catéchisme Romain",
    "Catech. R. 3:37": "du Catéchisme Romain",
    "Catech. R. préface 10": "du Catéchisme Romain",
    "Catech. R. préface 11": "du Catéchisme Romain",
    "Didaché 2:2": "de la Didachè",
    "Epître à Diognète 5:5. 10": "de l'Épître à Diognète",
    "Epître à Diognète 5:8-9": "de l'Épître à Diognète",
    "Imitation du Christ 1:23": "de l'Imitation du Christ",
    "Kontakion de Romanos le Mélode": "de saint Romanos le Mélode",
    "Liturgia Byzantina. 2 oratio chirotoniæ presbyteralis": "de la Liturgie byzantine",
    "Liturgie byzantine": "de la Liturgie byzantine",
    "Pontificale Romanum": "du Pontifical romain",
    "Pontificale Romanum. De Ordinatione Episcopi": "du Pontifical romain",
    "Pontificale iuxta ritum Ecclesiæ Syrorum Occidentalium id est Antiochiæ": "du Pontifical syriaque",
    "Ste Césarie la Jeune": "de Sainte Césarie la Jeune",
    "Summa theologiæ 3:60": "de la Somme théologique",
    "Tertullien de resurrectione carnis 1:1": "de Tertullien",
    "Augustin de Dace": "d'Augustin de Dace",
}


# Doc sigla → full title (used by Tier 1 magisterial expansion).
SIGLA_MAP: dict[str, str] = {
    "DV": "constitution dogmatique Dei Verbum",
    "LG": "constitution dogmatique Lumen Gentium",
    "GS": "constitution pastorale Gaudium et Spes",
    "SC": "constitution Sacrosanctum Concilium",
    "NA": "déclaration Nostra Ætate",
    "CD": "décret Christus Dominus",
    "AA": "décret Apostolicam Actuositatem",
    "AG": "décret Ad Gentes",
    "OT": "décret Optatam Totius",
    "PO": "décret Presbyterorum Ordinis",
    "CT": "exhortation Catechesi tradendæ",
    "FC": "exhortation Familiaris Consortio",
    "RH": "encyclique Redemptor Hominis",
    "SRS": "encyclique Sollicitudo Rei Socialis",
    "CA": "encyclique Centesimus Annus",
    "CIC": "Code de droit canonique",
    "CCEO": "Code des canons des Églises orientales",
}


def expand_sigla(sigla: str) -> str | None:
    return SIGLA_MAP.get(sigla)


# Phonetic substitutions for Latin / foreign words that appear in
# Gérard-spoken announce strings (citation intros + V2 headings).
INTRO_LATIN_REPLACE: dict[str, str] = {
    "Dei Verbum": "Déi Vèrboum",
    "Denzinger": "Dènntzingueur",
    "Lumen Gentium": "Loumène Gènntsioum",
    "Sacrosanctum Concilium": "Sacrosannctoum Conntchilioum",
    "Gaudium et Spes": "Gaoudioum ète Spès",
    "Nostra Ætate": "Nostra Étaté",
    "Christus Dominus": "Kristousse Dominousse",
    "Apostolicam Actuositatem": "Apostolikame Actouositatème",
    "Ad Gentes": "Ade Gènntèsse",
    "Optatam Totius": "Optatame Totiousse",
    "Presbyterorum Ordinis": "Présbytéroroum Ordinisse",
    "Catechesi tradendæ": "Catékézi tradènndé",
    "Evangelii nuntiandi": "Évannguélii nounncianndé",
    "Sacram unctionem infirmorum": "Sacrame ounnktsionème innfirmoroum",
    "Humani Generis": "Houmani Génnérisse",
    "Pontificale Romanum": "Ponntifikalé Romanoum",
    "Donum Vitæ": "Donoume Vité",
    "Centesimus Annus": "Tchènntézimousse Annousse",
    "Redemptor Hominis": "Rédèmptor Hominisse",
    "Sollicitudo Rei Socialis": "Sollicitoudo Réi Sotsialisse",
    "Familiaris Consortio": "Familiarisse Conssortio",
}


def apply_intro_phonetic(text: str) -> str:
    """Substitute Latin/foreign tokens in announce strings with phonetic spellings."""
    # Longest first to avoid substring shadowing.
    for src in sorted(INTRO_LATIN_REPLACE, key=len, reverse=True):
        text = text.replace(src, INTRO_LATIN_REPLACE[src])
    return text


_PAPAL_NAMES = [
    "Benoît XII", "Benoît XIV", "Benoît XV", "Benoît XVI",
    "Léon XIII", "Pie IX", "Pie X", "Pie XI", "Pie XII",
    "Jean XXIII", "Paul VI", "Jean-Paul I", "Jean-Paul II",
    "François",
]
_PAPAL_DISPLAY: dict[str, str] = {
    "Jean-Paul II": "du pape saint Jean-Paul 2",
    "Paul VI": "du pape saint Paul 6",
    "Benoît XII": "du pape Benoît 12",
    "Pie XII": "du pape Pie 12",
    "Léon XIII": "du pape Léon 13",
    "Pie X": "du pape saint Pie 10",
    "Pie IX": "du pape Pie 9",
    "Jean XXIII": "du pape saint Jean 23",
}

_TIER3_GENERIC: dict[str, str] = {
    "patristic": "Citation patristique :",
    "magisterial": "Citation magistérielle :",
    "conciliar": "Citation conciliaire :",
    "liturgical": "Citation liturgique :",
    "ds": "Citation du Denzinger :",
    "canon_law": "Citation du Code de droit canonique :",
}


def _fmt_intro(prep: str) -> str:
    """Format the announce string from a 'de X' / 'du X' / 'd'X' fragment."""
    return f"Citation {prep} :"


def _tier1_patristic(raw: str) -> str | None:
    # Exact AUTHOR_MAP entry.
    if raw in AUTHOR_MAP:
        return _fmt_intro(AUTHOR_MAP[raw])
    # "saint X, work" or "Sainte X, work" or "saint X work".
    m = re.match(r"^(?P<name>(?:[Ss](?:ain)?t(?:e)?)\s+[A-ZÉÈÊÀÂÇÎÏÔŒÙÛ][\w\-']+(?:\s+(?:de|d')\s*[A-ZÉ][\w\-']+)?)", raw)
    if m:
        normalized = re.sub(r"^St\b", "saint", m.group("name"))
        normalized = re.sub(r"^Ste\b", "Sainte", normalized)
        return _fmt_intro(f"de {fix_saint_liaison(normalized)}")
    return None


def _tier1_magisterial(raw: str) -> str | None:
    # Exact AUTHOR_MAP entry.
    if raw in AUTHOR_MAP:
        return _fmt_intro(AUTHOR_MAP[raw])
    # Papal name at start.
    for name in sorted(_PAPAL_NAMES, key=len, reverse=True):
        if raw.startswith(name):
            display = _PAPAL_DISPLAY.get(name, f"du pape {name}")
            return _fmt_intro(display)
    # Sigla expansion (DV 10, GS 19, etc.).
    m = re.match(r"^(" + "|".join(SIGLA_MAP) + r")\b", raw)
    if m:
        return apply_intro_phonetic(_fmt_intro(f"de la {SIGLA_MAP[m.group(1)]}"))
    return None


def _tier1_conciliar(raw: str) -> str | None:
    if raw in AUTHOR_MAP:
        return _fmt_intro(AUTHOR_MAP[raw])
    m = re.match(
        r"^(?:voir\s+)?(?P<name>concile\s+(?:de|du|d')\s+[A-Za-zÉÈÊÀÂÇÎÏÔŒÙÛ\- ]+?)(?=\s*:|\s*,|\s+\d|$)",
        raw, re.IGNORECASE,
    )
    if not m:
        return None
    nm = convert_roman_numerals(m.group("name").strip())
    # Normalize to lowercase "concile" so the announce reads "du concile de Trente".
    nm = re.sub(r"^[Cc]oncile\b", "concile", nm)
    return _fmt_intro(f"du {nm}")


def _tier1_liturgical(raw: str) -> str | None:
    if raw in AUTHOR_MAP:
        return _fmt_intro(AUTHOR_MAP[raw])
    if raw.startswith("MR"):
        return _fmt_intro("du Missel romain")
    if raw.startswith("LH"):
        return _fmt_intro("de la Liturgie des heures")
    if raw.startswith("Pontificale Romanum"):
        return _fmt_intro("du Pontifical romain")
    if raw.startswith("Liturgie byzantine"):
        return _fmt_intro("de la Liturgie byzantine")
    return None


_TIER2_VERBS = r"(?:affirme|parle|écrit|dit|enseigne|raconte|s'écrie|déclare)"
_TIER2_NAME = r"(?P<name>(?:[Ss]aint(?:e)?)\s+[A-ZÉÈÊÀÂÇÎÏÔŒÙÛ][\w\-']+(?:\s+(?:de|d')\s*[A-ZÉ][\w\-']+)?)"
_RE_TIER2 = re.compile(
    rf"{_TIER2_NAME}\s+(?:[^.:!?]*\s+)?{_TIER2_VERBS}\b"
)


def _tier2_body_scan(body_text: str) -> str | None:
    """Return 'de saint X' fragment if a saint name + speech verb precedes citation in body."""
    match = None
    for m in _RE_TIER2.finditer(body_text):
        match = m  # take the LAST one (closest to citation start)
    if not match:
        return None
    name = match.group("name").strip()
    return f"de {fix_saint_liaison(name)}"


def derive_citation_intro(
    mref: dict | None,
    body_text: str,
) -> tuple[str, int]:
    """Return (announce_text, tier_used)."""
    if mref is None:
        # Tier 2 can still recover from body.
        prep = _tier2_body_scan(body_text)
        if prep:
            return apply_intro_phonetic(_fmt_intro(prep)), 2
        return "Citation :", 3
    typ = mref.get("type")
    raw = mref.get("raw", "")
    tier1: str | None = None
    if typ == "patristic":
        tier1 = _tier1_patristic(raw)
    elif typ == "magisterial":
        tier1 = _tier1_magisterial(raw)
    elif typ == "conciliar":
        tier1 = _tier1_conciliar(raw)
    elif typ == "liturgical":
        tier1 = _tier1_liturgical(raw)
    elif typ == "canon_law":
        return _TIER3_GENERIC["canon_law"], 1
    elif typ == "ds":
        return _TIER3_GENERIC["ds"], 1
    if tier1:
        return apply_intro_phonetic(tier1), 1
    # Tier 2: scan body for saint name + speech verb.
    prep = _tier2_body_scan(body_text)
    if prep:
        return apply_intro_phonetic(_fmt_intro(prep)), 2
    # Tier 3 fallback.
    return _TIER3_GENERIC.get(typ, "Citation :"), 3


def _docref_idxs(body_html: str) -> set[str]:
    return set(re.findall(r'docRef" data-idx="([^"]+)"', body_html))


def match_citations(
    citations: list[dict],
    magisterial_refs: list[dict],
    body_html: str,
) -> list[tuple[dict, dict | None]]:
    """Pair each citation with the most likely non-bible magisterial_ref.

    Strategy: drop mrefs whose idx appears inline in the body (those are
    footnotes, not citation sources). What remains is matched 1:1 with
    citations[] in array order.
    """
    non_bible = [r for r in magisterial_refs if r["type"] not in ("bible", "bible_continuation")]
    inline_idxs = _docref_idxs(body_html)
    remaining = [r for r in non_bible if r["idx"] not in inline_idxs]
    if len(remaining) < len(citations):
        remaining = non_bible  # fall back to all non-bible refs
    matched: list[tuple[dict, dict | None]] = []
    for i, cit in enumerate(citations):
        matched.append((cit, remaining[i] if i < len(remaining) else None))
    return matched


def _build_body_text(paragraph: dict) -> str:
    """Run the full body-cleaning pipeline on a source paragraph."""
    text = clean_text(paragraph["text_html"])
    text = fix_saint_liaison(text)
    text = apply_text_replace(text, paragraph["number"])
    text = apply_general_replacements(text)
    text = strip_annotations(text)
    text = expand_bible_refs(text)
    text = convert_roman_numerals(text)
    text = strip_ref_parens(text)
    return text


def _build_citation_text(citation: dict, paragraph_number: int) -> tuple[str, str | None]:
    text = clean_text(citation["text_html"])
    text = fix_saint_liaison(text)
    text = apply_text_replace(text, paragraph_number)
    text = apply_general_replacements(text)
    text = strip_annotations(text)
    text = expand_bible_refs(text)
    text = convert_roman_numerals(text)
    text, trailing = strip_trailing_parens(text, paragraph_number)
    return text, trailing


def build_paragraph_entry(
    seq: int,
    paragraph: dict,
    location: dict,
    occurrence_index: int = 1,
) -> tuple[dict, list[dict]]:
    """Build one paragraph entry + audit rows for its citations.

    `occurrence_index` only matters when the same paragraph number appears
    twice in the manifest (e.g. data quirks); for the canonical first
    occurrence pass 1.
    """
    n = paragraph["number"]
    suffix = f"_{occurrence_index}" if occurrence_index > 1 else ""
    file_number = f"{n:04d}{suffix}"

    announce_n = number_to_french(n) if should_spell_paragraph_number(n) else str(n)
    announce = f"Paragraphe {announce_n}."

    segments: list[dict] = [
        {"voice": "gerard", "text": announce, "targets": ["v1"]},
    ]

    body = _build_body_text(paragraph)
    if body:
        segments.append({"voice": "remy", "text": body, "targets": ["v1", "v2"]})

    audit_rows: list[dict] = []
    citations = paragraph.get("citations", [])
    mrefs = paragraph.get("magisterial_refs", [])
    matched = match_citations(citations, mrefs, paragraph["text_html"])

    for i, (cit, ref) in enumerate(matched):
        cit_text, trailing = _build_citation_text(cit, n)
        intro, tier = derive_citation_intro(ref, body_text=body)
        segments.append({"voice": "gerard", "text": intro, "targets": ["v1", "v2"]})
        segments.append({"voice": "fabrice", "text": cit_text, "targets": ["v1", "v2"]})
        if trailing:
            segments.append({"voice": "gerard", "text": trailing + ".", "targets": ["v1", "v2"]})
        audit_rows.append({
            "paragraph": n,
            "citation_index": i,
            "mref_type": ref.get("type") if ref else "",
            "mref_idx": ref.get("idx") if ref else "",
            "mref_raw": ref.get("raw") if ref else "",
            "tier_used": tier,
            "derived_intro": intro,
        })

    entry = {
        "seq": seq,
        "kind": "paragraph",
        "number": n,
        "file_number": file_number,
        "is_en_bref": is_en_bref(paragraph),
        "location": location,
        "segments": segments,
    }
    return entry, audit_rows


def build_en_bref_combined_entry(
    seq: int,
    chapter_slug: str,
    en_bref_paragraphs: list[dict],
    location: dict,
) -> dict:
    """Build a single combined entry for a chapter's en bref points (V1 only)."""
    segments: list[dict] = [
        {"voice": "gerard", "text": "En bref.", "targets": ["v1"]},
    ]
    nums: list[int] = []
    for p in en_bref_paragraphs:
        nums.append(p["number"])
        body = _build_body_text(p)
        if body:
            segments.append({"voice": "remy", "text": body, "targets": ["v1"]})
    return {
        "seq": seq,
        "kind": "en_bref_combined",
        "chapter_slug": chapter_slug,
        "file_number": f"eb_{chapter_slug}",
        "paragraph_range": [nums[0], nums[-1]] if nums else [],
        "location": location,
        "segments": segments,
    }


import json


def _chapter_part_order(chapter: dict) -> tuple[int, int, int]:
    """Sort key: (part_number, section_number, chapter_number)."""
    return (
        chapter.get("part_number") or 0,
        chapter.get("section_number") or 0,
        chapter.get("number") or 0,
    )


def load_corpus(
    chapters_full_dir: Path,
    paragraphs_dir: Path,
) -> list[dict]:
    """Walk chapters-full + paragraphs, yield {paragraph, location} in CCC order.

    `chapters_full_dir`: holds {slug}.json files with `{"chapter": {...}}` wrappers.
    `paragraphs_dir`: holds {n}.json files keyed by CCC paragraph number.

    Returns a flat list in the canonical reading order: paragraphs within
    a chapter follow the chapter's `paragraphs` array.
    """
    chapters: list[dict] = []
    for path in sorted(chapters_full_dir.glob("*.json")):
        with path.open(encoding="utf-8") as f:
            wrapper = json.load(f)
        chapters.append(wrapper["chapter"])
    chapters.sort(key=_chapter_part_order)

    out: list[dict] = []
    for ch in chapters:
        location_base = {
            "part_slug": ch.get("part_slug"),
            "part_title": ch.get("part_title"),
            "part_number": ch.get("part_number"),
            "section_slug": ch.get("section_slug"),
            "section_title": ch.get("section_title"),
            "section_number": ch.get("section_number"),
            "chapter_slug": ch.get("slug"),
            "chapter_title": ch.get("title"),
            "chapter_number": ch.get("number"),
            "article_number": None,
            "heading2_title": None,
        }
        # Map paragraph number to article info from ch["articles"].
        article_lookup: dict[int, dict] = {}
        for art in ch.get("articles", []):
            for n in art.get("paragraphs", []):
                article_lookup[n] = {"number": art.get("number"), "title": art.get("title")}
        for num in ch.get("paragraphs", []):
            ppath = paragraphs_dir / f"{num}.json"
            if not ppath.exists():
                continue
            with ppath.open(encoding="utf-8") as f:
                paragraph = json.load(f)
            location = dict(location_base)
            art = article_lookup.get(num)
            if art:
                location["article_number"] = art["number"]
                location["article_title"] = art["title"]
            out.append({"paragraph": paragraph, "location": location})
    return out


from datetime import datetime, timezone

VOICES = {
    "gerard": "fr-BE-GerardNeural",
    "remy": "fr-FR-RemyMultilingualNeural",
    "fabrice": "fr-CH-FabriceNeural",
}
VOICE_OPTS = {
    "gerard":  {"volume": "-10%"},
    "remy":    {"rate":   "-10%"},
    "fabrice": {"volume": "-10%", "rate": "-10%"},
}


def build_manifest(
    chapters_full_dir: Path,
    paragraphs_dir: Path,
) -> tuple[dict, list[dict]]:
    """Build full manifest dict + flat audit row list."""
    corpus = load_corpus(chapters_full_dir, paragraphs_dir)
    entries: list[dict] = []
    audit_rows: list[dict] = []
    seen_numbers: dict[int, int] = {}

    # Group en-bref paragraphs by chapter for combined entries.
    en_bref_by_chapter: dict[str, list[dict]] = {}

    seq = 0
    for item in corpus:
        paragraph = item["paragraph"]
        location = item["location"]
        n = paragraph["number"]
        seen_numbers[n] = seen_numbers.get(n, 0) + 1
        seq += 1
        entry, rows = build_paragraph_entry(
            seq=seq,
            paragraph=paragraph,
            location=location,
            occurrence_index=seen_numbers[n],
        )
        entries.append(entry)
        audit_rows.extend(rows)
        if is_en_bref(paragraph):
            slug = location.get("chapter_slug") or "_unknown"
            en_bref_by_chapter.setdefault(slug, []).append(paragraph)

    # Emit one en_bref_combined entry per chapter that has en brefs.
    for slug, paras in en_bref_by_chapter.items():
        seq += 1
        location = {"chapter_slug": slug}
        entries.append(build_en_bref_combined_entry(
            seq=seq, chapter_slug=slug, en_bref_paragraphs=paras, location=location,
        ))

    manifest = {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "static/data/cec/chapters-full",
        "voices": VOICES,
        "voice_opts": VOICE_OPTS,
        "entries": entries,
    }
    return manifest, audit_rows


import subprocess

# Greek block: U+0370 to U+03FF + extended.
_RE_GREEK = re.compile(r"[Ͱ-Ͽἀ-῿]+")

# Token splitter for words (Unicode letters + apostrophe).
_RE_WORD = re.compile(r"[A-Za-zÀ-ÿ'-]+")

# Default allowlist of vocabulary we expect to "be unknown to hunspell"
# but that's intentional / proper-noun. Extend via run_leakage_check's
# `allowlist` argument.
DEFAULT_LEAKAGE_ALLOWLIST: set[str] = {
    "Yahvé", "Jésus", "Marie", "Augustin", "Aquin", "Christ",
    "Esprit", "Saint", "Sainte", "Père", "Fils", "CCC",
    "Trinité", "Eucharistie", "Église", "Saintes", "Saints",
    "Paraclet", "Sauveur", "Verbe",
    # Phonetic substitution outputs we want to exempt.
    "Déi", "Vèrboum", "Loumène", "Gènntsioum",
    "Sacrosannctoum", "Conntchilioum",
    "Gaoudioum", "Spès",
    "Tchènntézimousse", "Annousse",
    "Rédèmptor", "Hominisse",
    "Sainte", "Soumma", "Théologiè",
    "Maranne", "atha",
    "concupiskentia", "concupissensse",
    "Kalcédoine",
    "Évannguélii", "nounncianndé",
    "Catékézi", "tradènndé",
    "Té", "Déoum",
    "Egzoultète", "Maggnificatte",
    "mysterioum", "sacramentoum",
    "Kristi", "filioquoué",
    "Lèx", "oranndi", "crédenndi",
    "épiscoporoum", "présbytéroroum", "diaconoroum",
    "dépozitoum", "fidéi",
    "Fidèss", "Damazi",
    "Pèr", "istam", "sanktam",  # in case any Latin literal slips through
}


def extract_words_for_leakage_check(text: str) -> list[str]:
    """Tokenize text and strip Greek-script content for hunspell lint."""
    text = _RE_GREEK.sub(" ", text)
    words = _RE_WORD.findall(text)
    return [w for w in words if w not in DEFAULT_LEAKAGE_ALLOWLIST]


def run_leakage_check(
    texts: list[str],
    allowlist: Path | None = None,
) -> list[tuple[int, str]]:
    """Return (text_index, unknown_word) tuples for words hunspell flags.

    Strips intentional Greek substitutions and known good vocabulary (default
    allowlist + user file). When hunspell isn't installed or the fr_FR dict
    is missing, returns an empty list (the renderer treats that as a soft skip).
    """
    allow = set(DEFAULT_LEAKAGE_ALLOWLIST)
    if allowlist and allowlist.exists():
        allow.update(allowlist.read_text(encoding="utf-8").split())
    try:
        proc = subprocess.run(
            ["hunspell", "-d", "fr_FR", "-l"],
            input="\n".join(texts),
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return []
    if proc.returncode != 0 and not proc.stdout:
        return []
    flagged_words = {_RE_WORD.search(w.strip()).group(0) for w in proc.stdout.splitlines() if w.strip() and _RE_WORD.search(w.strip())}
    flagged_words -= allow
    if not flagged_words:
        return []
    out: list[tuple[int, str]] = []
    for i, text in enumerate(texts):
        words = extract_words_for_leakage_check(text)
        for w in words:
            if w in flagged_words:
                out.append((i, w))
    return out
