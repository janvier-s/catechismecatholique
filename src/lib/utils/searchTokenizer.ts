// French-aware tokenizer & term-processor for MiniSearch. Used by both the
// build script (scripts/prepare/search-index.ts) and the runtime
// (/api/search). MUST be a pure function with no SvelteKit imports so the
// build script can `import { ... }` it directly.

// Strip diacritics: 'présupposé' → 'presuppose', 'œcuménisme' → 'oecumenisme'.
// Known limitation: œ expands to 'oe', so a user who types 'ecumenisme'
// (modern French spelling without ligature) won't match 'oecumenisme'.
// Fixing this requires changing processTerm AND rebuilding the search index.
export function stripDiacritics(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/œ/g, 'oe')
		.replace(/Œ/g, 'OE')
		.replace(/æ/g, 'ae')
		.replace(/Æ/g, 'AE');
}

// MiniSearch tokenize hook
export function searchTokenizer(text: string): string[] {
	return stripDiacritics(text)
		.toLowerCase()
		.replace(/[’']/g, ' ') // apostrophes are word boundaries in fr-FR
		.split(/[^a-z0-9]+/)
		.filter((t) => t.length > 1);
}

// MiniSearch processTerm hook (applied to both indexed terms and query terms)
export function processTerm(term: string): string | null {
	const t = stripDiacritics(term).toLowerCase();
	if (t.length < 2) return null;
	return t;
}

// Common French stop words. Used at query time only — paragraphs are still
// indexed in full so phrase queries like "le Père" can find the literal
// match. The set is the diacritic-stripped/lowercased form (matching what
// `processTerm` produces) so membership checks line up with the tokenizer
// output. Conservative on purpose: words like "vie", "mort", "dieu" are
// content-bearing and stay searchable.
export const FR_STOP_WORDS = new Set([
	'le',
	'la',
	'les',
	'l',
	'un',
	'une',
	'des',
	'du',
	'de',
	'd',
	'a',
	'au',
	'aux',
	'et',
	'ou',
	'ni',
	'mais',
	'donc',
	'or',
	'car',
	'si',
	'en',
	'dans',
	'sur',
	'par',
	'pour',
	'avec',
	'sans',
	'ce',
	'cet',
	'cette',
	'ces',
	'mon',
	'ma',
	'mes',
	'ton',
	'ta',
	'tes',
	'son',
	'sa',
	'ses',
	'notre',
	'nos',
	'votre',
	'vos',
	'leur',
	'leurs',
	'je',
	'tu',
	'il',
	'elle',
	'on',
	'nous',
	'vous',
	'ils',
	'elles',
	'me',
	'te',
	'se',
	'lui',
	'eux',
	'qui',
	'que',
	'quoi',
	'dont',
	'ou',
	'ne',
	'pas',
	'plus',
	'est',
	'sont',
	'etait',
	'etre',
	'ete',
	'avoir',
	'eu',
	'comme',
	'tout',
	'tous',
	'toute',
	'toutes'
]);
