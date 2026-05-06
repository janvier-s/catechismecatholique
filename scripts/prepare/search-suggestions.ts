import type { GlossaryBundle } from '../../src/lib/data/types.ts';

export interface SuggestionsBundle {
	/** Normalized term/word → glossary slug. Populated with both full
	 *  phrase matches (highest priority) and individual significant words. */
	lookup: Record<string, string>;
	/** Glossary slug → up to 5 related slugs (seeAlso first, then cluster siblings). */
	suggestions: Record<string, string[]>;
	/** Glossary slug → display term, for all slugs referenced in suggestions. */
	terms: Record<string, string>;
}

function normalize(s: string): string {
	return s
		.replace(/œ/g, 'oe')
		.replace(/Œ/g, 'OE')
		.replace(/æ/g, 'ae')
		.replace(/Æ/g, 'AE')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[''–—-]/g, ' ')
		.replace(/[^a-z0-9 ]+/gi, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

export function buildSearchSuggestions(glossary: GlossaryBundle): SuggestionsBundle {
	const { entries } = glossary;
	const bySlug = new Map(entries.map((e) => [e.slug, e]));

	// Cluster siblings: per cluster, sorted by totalRefs desc
	const clusterSiblings = new Map<string, typeof entries>();
	for (const e of entries) {
		for (const c of e.clusters) {
			if (!clusterSiblings.has(c)) clusterSiblings.set(c, []);
			clusterSiblings.get(c)!.push(e);
		}
	}
	for (const arr of clusterSiblings.values()) arr.sort((a, b) => b.totalRefs - a.totalRefs);

	// Suggestions: seeAlso first, then top cluster siblings
	const suggestions: Record<string, string[]> = {};
	for (const e of entries) {
		const related = [...e.seeAlso];
		for (const clusterId of e.clusters) {
			for (const sib of clusterSiblings.get(clusterId) ?? []) {
				if (sib.slug !== e.slug && !related.includes(sib.slug)) related.push(sib.slug);
				if (related.length >= 5) break;
			}
			if (related.length >= 5) break;
		}
		if (related.length > 0) suggestions[e.slug] = related.slice(0, 5);
	}

	// Lookup: full normalized term → slug (pass 1), then individual significant
	// words → slug (pass 2, prefer higher totalRefs on conflict, don't override
	// exact full-term matches)
	const lookup: Record<string, string> = {};
	for (const e of entries) lookup[normalize(e.term)] = e.slug;

	const wordBest = new Map<string, { refs: number; slug: string }>();
	for (const e of entries) {
		for (const word of normalize(e.term).split(' ')) {
			if (word.length <= 3 || word in lookup) continue;
			const cur = wordBest.get(word);
			if (!cur || e.totalRefs > cur.refs) wordBest.set(word, { refs: e.totalRefs, slug: e.slug });
		}
	}
	for (const [word, { slug }] of wordBest) lookup[word] = slug;

	// Terms: slug → display name for all referenced slugs
	const allReferenced = new Set([
		...Object.keys(suggestions),
		...Object.values(suggestions).flat()
	]);
	const terms: Record<string, string> = {};
	for (const slug of allReferenced) {
		const e = bySlug.get(slug);
		if (e) terms[slug] = e.term;
	}

	return { lookup, suggestions, terms };
}
