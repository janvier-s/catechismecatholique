import { error } from '@sveltejs/kit';
import { loadGlossary } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const glossary = await loadGlossary(fetch);
	const entry = glossary.entries.find((e) => e.slug === params.term);
	if (!entry) throw error(404, `Terme inconnu: ${params.term}`);

	// Resolve seeAlso targets to actual entries when they exist. The source
	// uses ALL CAPS labels that may include parens (Sacrement(s)) or extra
	// qualifiers (Notes de l'Église). Match in 4 progressively looser ways:
	//   1) exact (after normalisation)
	//   2) singular/plural (drop trailing 's' or strip "(s)" suffix)
	//   3) first significant word ("Notes de l'Église" → "Notes" or "Église")
	//   4) any glossary term contained inside the label
	const norm = (s: string) =>
		s
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/œ/g, 'oe')
			.replace(/æ/g, 'ae')
			.toLowerCase()
			.replace(/[’']/g, ' ')
			.replace(/[^a-z0-9 ]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();

	const bySlug = new Map(glossary.entries.map((e) => [norm(e.term), e]));
	function resolveLabel(label: string) {
		const k = norm(label);
		// 1) exact
		if (bySlug.has(k)) return bySlug.get(k)!;
		// 2) singular/plural
		const stripParenS = k
			.replace(/\s*s\s*$/, '')
			.replace(/\(\s*s\s*\)/g, '')
			.trim();
		if (stripParenS && bySlug.has(stripParenS)) return bySlug.get(stripParenS)!;
		const plural = k + 's';
		if (bySlug.has(plural)) return bySlug.get(plural)!;
		// 3) try the LAST capitalised-looking word (in source labels like
		//    "Notes de l'Église" the meaningful term is the last noun).
		const words = k.split(' ').filter((w) => w.length > 2);
		for (let i = words.length - 1; i >= 0; i--) {
			const w = words[i]!;
			if (bySlug.has(w)) return bySlug.get(w)!;
			if (bySlug.has(w + 's')) return bySlug.get(w + 's')!;
			if (bySlug.has(w.replace(/s$/, ''))) return bySlug.get(w.replace(/s$/, ''))!;
		}
		// 4) any glossary term that appears as a substring of the label
		for (const [termKey, e] of bySlug) {
			if (termKey.length >= 4 && k.includes(termKey)) return e;
		}
		return undefined;
	}
	const seeAlsoLinks = entry.seeAlso.map((label) => {
		const target = resolveLabel(label);
		return { label, slug: target?.slug, term: target?.term ?? label };
	});

	const clusterMeta = entry.clusters
		.map((cid) => glossary.clusters.find((c) => c.id === cid))
		.filter((c) => c !== undefined);

	return { entry, seeAlsoLinks, clusters: clusterMeta, cluster: clusterMeta[0] };
};
