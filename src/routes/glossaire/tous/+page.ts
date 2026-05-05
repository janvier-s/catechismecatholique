import { loadGlossary } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const glossary = await loadGlossary(fetch);

	const entries = [...glossary.entries].sort((a, b) =>
		a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' })
	);

	// Group by first letter for the in-page jump bar. Diacritics fold to base
	// letter (É → E, À → A) so the alphabet bar reads cleanly.
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

	return { grouped, total: entries.length };
};
