import { loadGlossary } from '$lib/data/loaders';
import { firstLetter } from '$lib/utils/firstLetter';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const glossary = await loadGlossary(fetch);

	const entries = [...glossary.entries].sort((a, b) =>
		a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' })
	);

	// Group by first letter for the in-page jump bar. Diacritics fold to base
	// letter (É → E, À → A), ligatures map to their dominant base (Œ → O),
	// and leading guillemets/quotes are skipped so `« aujourd'hui »` lands in A.
	const byLetter = new Map<string, typeof entries>();
	for (const e of entries) {
		const letter = firstLetter(e.term);
		if (!byLetter.has(letter)) byLetter.set(letter, []);
		byLetter.get(letter)!.push(e);
	}
	const grouped = [...byLetter.entries()]
		.map(([letter, es]) => ({ letter, entries: es }))
		.sort((a, b) => a.letter.localeCompare(b.letter));

	return { grouped, total: entries.length };
};
