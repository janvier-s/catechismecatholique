import { error } from '@sveltejs/kit';
import { loadDenzingerEntry, loadDenzingerStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const n = parseInt(params.number, 10);
	if (!Number.isFinite(n) || n < 1) throw error(404, 'Numéro invalide');
	const [structure, entry] = await Promise.all([
		loadDenzingerStructure(fetch),
		loadDenzingerEntry(n, fetch)
	]);
	if (!entry) throw error(404, `Entrée DH ${n} introuvable`);

	const all = structure.all_numbers;
	const idx = all.indexOf(n);
	const prev = idx > 0 ? all[idx - 1] : null;
	const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
	const part = structure.parts.find((p) => p.slug === entry.part_slug) ?? null;

	return { entry, structure, part, prev, next };
};
