import { error, redirect } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDenzingerIndex } from '$lib/data/loaders';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => {
	const index = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/denzinger/index.json'), 'utf-8')
	) as Record<string, { unit_slug: string }>;
	return Object.keys(index).map((n) => ({ number: n }));
};

export const load: PageLoad = async ({ params, fetch }) => {
	const n = parseInt(params.number, 10);
	if (!Number.isFinite(n) || n < 1) throw error(404, 'Numéro invalide');
	const index = await loadDenzingerIndex(fetch);
	const meta = index[String(n)];
	if (!meta) throw error(404, `Entrée DH ${n} introuvable`);
	throw redirect(308, `/denzinger/${meta.unit_slug}#dh-${n}`);
};
