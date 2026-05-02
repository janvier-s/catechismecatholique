import { redirect, error } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const n = params.n!;
	const idx = parseInt(n, 10);
	if (!Number.isInteger(idx) || idx < 1 || idx > 4) throw error(404, 'Partie inconnue');
	const struct = (await loadStructure(fetch)) as { parts: Array<{ slug: string; prologue?: boolean }> };
	const nonPrologue = struct.parts.filter((p) => !p.prologue);
	const target = nonPrologue[idx - 1];
	if (!target) throw error(404, 'Partie inconnue');
	throw redirect(308, `/ccc/${target.slug}`);
};
