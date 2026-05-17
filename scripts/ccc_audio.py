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
