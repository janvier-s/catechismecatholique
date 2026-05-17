"""Shared helpers for CCC audio manifest + render pipelines.

See docs/superpowers/specs/2026-05-17-ccc-audio-design.md.
"""

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
