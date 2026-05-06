import { error } from '@sveltejs/kit';
import { loadParagraph, loadParagraphContext } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const ref = params.ref!;
	const isRange = ref.includes('-');

	if (isRange) {
		const parts = ref.split('-').map((s) => parseInt(s, 10));
		const from = parts[0]!;
		const to = parts[1]!;
		if (from < 1 || to < from || to > 2865) throw error(404, 'Plage invalide');
		const numbers: number[] = [];
		for (let n = from; n <= to; n++) numbers.push(n);
		const [paragraphs, context] = await Promise.all([
			Promise.all(numbers.map((n) => loadParagraph(n, fetch))),
			loadParagraphContext(from, fetch)
		]);
		return { kind: 'range' as const, from, to, paragraphs, context: context ?? undefined };
	}

	const n = parseInt(ref, 10);
	if (n < 1 || n > 2865) throw error(404, 'Paragraphe inconnu');
	const [paragraph, context] = await Promise.all([
		loadParagraph(n, fetch),
		loadParagraphContext(n, fetch)
	]);
	return { kind: 'paragraph' as const, paragraph, context: context ?? undefined };
};
