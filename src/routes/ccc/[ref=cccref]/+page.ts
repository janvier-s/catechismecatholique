import { error } from '@sveltejs/kit';
import { loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const ref = params.ref!;
	const isRange = ref.includes('-');
	if (isRange) {
		const parts = ref.split('-').map((s) => parseInt(s, 10));
		const from = parts[0]!;
		const to = parts[1]!;
		if (from < 1 || to < from || to > 2865) throw error(404, 'Plage invalide');
		const paragraphs = [];
		for (let n = from; n <= to; n++) {
			paragraphs.push(await loadParagraph(n, fetch));
		}
		return { kind: 'range' as const, from, to, paragraphs };
	}
	const n = parseInt(ref, 10);
	if (n < 1 || n > 2865) throw error(404, 'Paragraphe inconnu');
	const paragraph = await loadParagraph(n, fetch);
	return { kind: 'paragraph' as const, paragraph };
};
