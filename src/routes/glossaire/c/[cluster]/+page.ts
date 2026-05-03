import { error } from '@sveltejs/kit';
import { loadGlossary } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const glossary = await loadGlossary(fetch);
	const cluster = glossary.clusters.find((c) => c.id === params.cluster);
	if (!cluster) throw error(404, `Thème inconnu: ${params.cluster}`);

	const entries = glossary.entries
		.filter((e) => e.clusters.includes(cluster.id))
		.sort((a, b) =>
			a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' })
		);

	// Group by first letter for the in-page jump bar.
	const byLetter = new Map<string, typeof entries>();
	for (const e of entries) {
		const ch = e.term
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.charAt(0)
			.toUpperCase();
		const letter = /[A-Z]/.test(ch) ? ch : '#';
		if (!byLetter.has(letter)) byLetter.set(letter, []);
		byLetter.get(letter)!.push(e);
	}
	const grouped = [...byLetter.entries()]
		.map(([letter, es]) => ({ letter, entries: es }))
		.sort((a, b) => a.letter.localeCompare(b.letter));

	return { cluster, grouped, total: entries.length };
};
