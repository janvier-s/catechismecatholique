/**
 * Psalm numbering differs between the two traditions. The Néo-Crampon Libre
 * follows the Hebrew/Masoretic text; the Vulgate follows the Septuagint. Only
 * 12 of the 150 psalms carry the same number in both.
 *
 * Three kinds of divergence:
 *   - a straight offset of one across the long middle stretches
 *   - psalms the Vulgate merged  (Hebrew 9+10 = Vg 9, Hebrew 114+115 = Vg 113)
 *   - psalms the Vulgate split   (Hebrew 116 = Vg 114+115, Hebrew 147 = Vg 146+147)
 *
 * This is a display helper only. Verse numbering diverges too, because the
 * Vulgate counts the Hebrew superscription as verse 1, which puts 57 psalms a
 * row out of step even where the psalm numbers agree. Resolving references
 * across the two systems would need a per-verse audit of all 150 psalms and is
 * deliberately out of scope here.
 */
export function vulgatePsalmLabel(heb: number): string | null {
	if (!Number.isInteger(heb) || heb < 1 || heb > 150) return null;

	// The two traditions agree at both ends of the psalter.
	if (heb <= 8) return null;
	if (heb >= 148) return null;

	// Merged: one Vulgate psalm covers two Hebrew ones. Hebrew 9 keeps the
	// digit 9, so a label there would read as a no-op even though Vulgate 9 is
	// the longer psalm; only its partner gets one.
	if (heb === 9) return null;
	if (heb === 10) return '9';
	if (heb === 114 || heb === 115) return '113';

	// Split: one Hebrew psalm became two Vulgate ones.
	if (heb === 116) return '114-115';
	if (heb === 147) return '146-147';

	// Everything else is the straight offset.
	return String(heb - 1);
}
