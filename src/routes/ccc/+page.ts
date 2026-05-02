import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const structure = (await loadStructure(fetch)) as {
		parts: Array<{ slug: string; title: string; prologue?: boolean }>;
	};
	const parts = structure.parts.filter((p) => !p.prologue);
	return { parts };
};
