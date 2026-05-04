import { error } from '@sveltejs/kit';
import { loadParagraph, loadParagraphContexts } from '$lib/data/loaders';
import type { PageLoad } from './$types';
import type { ParagraphContext } from '$lib/data/types';

export const load: PageLoad = async ({ params, fetch }) => {
	const ref = params.ref!;
	const isRange = ref.includes('-');
	const contexts = await loadParagraphContexts(fetch);

	if (isRange) {
		const parts = ref.split('-').map((s) => parseInt(s, 10));
		const from = parts[0]!;
		const to = parts[1]!;
		if (from < 1 || to < from || to > 2865) throw error(404, 'Plage invalide');
		const numbers: number[] = [];
		for (let n = from; n <= to; n++) numbers.push(n);
		const paragraphs = await Promise.all(numbers.map((n) => loadParagraph(n, fetch)));
		const context: ParagraphContext | undefined = contexts[from];
		return { kind: 'range' as const, from, to, paragraphs, context };
	}

	const n = parseInt(ref, 10);
	if (n < 1 || n > 2865) throw error(404, 'Paragraphe inconnu');
	const paragraph = await loadParagraph(n, fetch);
	const context: ParagraphContext | undefined = contexts[n];
	return { kind: 'paragraph' as const, paragraph, context };
};
