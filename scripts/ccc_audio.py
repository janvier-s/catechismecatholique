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
