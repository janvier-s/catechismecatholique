import { error } from '@sveltejs/kit';
import { loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

// The prologue contains paragraphs §§ 1-25 (verified against scripts/data-sources/ccc_paras_processed.json).
// structure.json marks the prologue with `prologue: true` but its `sections` array is empty,
// so we cannot derive paragraph numbers from structure alone. The range is stable for the CCC.
const PROLOGUE_PARAGRAPHS = Array.from({ length: 25 }, (_, i) => i + 1);

export const load: PageLoad = async ({ fetch }) => {
	const paragraphs = await Promise.all(PROLOGUE_PARAGRAPHS.map((n) => loadParagraph(n, fetch)));
	if (paragraphs.length === 0) throw error(404);
	return { paragraphs };
};
