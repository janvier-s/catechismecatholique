// Transform ALL CAPS French titles into sentence case while preserving
// proper nouns, Roman numerals, opening guillemets, and punctuation patterns.
//
// Examples:
//   "LA PROFESSION DE LA FOI"         → "La profession de la foi"
//   "« JE CROIS » – « NOUS CROYONS »" → "« Je crois » – « Nous croyons »"
//   "L'HOMME EST « CAPABLE » DE DIEU" → "L'homme est « capable » de Dieu"
//   "LE SACREMENT DU BAPTÊME"         → "Le sacrement du Baptême"

// Multi-word phrases applied first so they don't get clobbered by single-word rules.
// The replacement is the canonical form (e.g. normalizes "saint esprit" → "Saint-Esprit").
const PHRASES: [RegExp, string][] = [
	[/\bsaint[\s-]esprit\b/giu, 'Saint-Esprit'],
	[/\besprit[\s-]saint\b/giu, 'Esprit-Saint'],
	[/\bsainte\s+vierge\b/giu, 'Sainte Vierge'],
	[/\bsainte\s+trinité\b/giu, 'Sainte Trinité'],
	[/\bnotre\s+père\b/giu, 'Notre Père']
];

// Single-word proper nouns. In CCC titles these almost always refer to the
// Trinity persons / canonical proper nouns, so we accept occasional over-capitalization.
const PROPER_NOUNS = [
	'Dieu',
	'Seigneur',
	'Christ',
	'Jésus',
	'Marie',
	'Père',
	'Fils',
	'Trinité',
	'Évangile',
	'Évangiles',
	'Église',
	'Bible',
	'Verbe',
	'Pâque',
	'Pâques',
	'Magnificat',
	'Décalogue'
];

// Sort longest first so multi-word names match before their shorter parts.
const ORDERED_NOUNS = [...PROPER_NOUNS].sort((a, b) => b.length - a.length);

const ROMAN_RE = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i;

function isMostlyUpper(text: string): boolean {
	const letters = text.match(/\p{L}/gu) ?? [];
	if (letters.length === 0) return false;
	const upper = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
	return upper / letters.length >= 0.7;
}

function capitalizeFirst(s: string): string {
	return s.replace(/^(\W*)(\p{Ll})/u, (_, w: string, c: string) => w + c.toUpperCase());
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sentenceCase(text: string): string {
	if (!isMostlyUpper(text)) return text;

	// Step 1: lowercase everything
	let result = text.toLowerCase();

	// Step 2: capitalize first letter of the string
	result = capitalizeFirst(result);

	// Step 3: capitalize after sentence-end punctuation (period, exclam, question, colon).
	// Note: we do NOT capitalize after a mid-sentence `«` — words inside guillemets keep
	// their natural case ("L'homme est « capable » de Dieu", not "« Capable »").
	// We DO capitalize after dashes that follow a period (sentence boundary).
	result = result.replace(/([.!?:]\s+)(\p{Ll})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
	result = result.replace(/([.!?]\s+[–—]\s+)(\p{Ll})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());

	// Step 4a: multi-word phrases first
	for (const [re, replacement] of PHRASES) {
		result = result.replace(re, replacement);
	}
	// Step 4b: restore single-word proper nouns. Use Unicode-aware "boundary" via lookarounds
	// because JS's \b is ASCII-only — `\bÉglise\b` won't match `église` at the start.
	for (const noun of ORDERED_NOUNS) {
		const re = new RegExp('(?<![\\p{L}\\p{N}])' + escapeRegex(noun) + '(?![\\p{L}\\p{N}])', 'giu');
		result = result.replace(re, noun);
	}

	// Step 5: uppercase Roman numerals followed by a period (e.g. "i. " → "I. ")
	result = result.replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)(\.)/giu, (m, num: string, dot: string) => {
		if (ROMAN_RE.test(num)) return num.toUpperCase() + dot;
		return m;
	});

	return result;
}
