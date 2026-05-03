// French-aware tokenizer & term-processor for MiniSearch. Used by both the
// build script (scripts/prepare/search-index.ts) and the runtime
// (/api/search). MUST be a pure function with no SvelteKit imports so the
// build script can `import { ... }` it directly.

// Strip diacritics: 'présupposé' → 'presuppose', 'œcuménisme' → 'oecumenisme'
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
