import { error } from '@sveltejs/kit';
import { loadCompendiumPart } from '$lib/data/loaders';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const part = await loadCompendiumPart(params.part, fetch).catch(() => null);
	if (!part) throw error(404, `Partie inconnue : ${params.part}`);
	return { part };
};

// Crawl reaches the four parts via the landing page; the appendix has no
// inbound link from a prerendered page (we removed its card from /compendium),
// so list every slug explicitly. Reads the static structure file directly —
// fetch() in the prerender Node context can't resolve site-relative URLs.
export const entries: EntryGenerator = async () => {
	const { readFileSync } = await import('node:fs');
	const { join } = await import('node:path');
	const structurePath = join(process.cwd(), 'static/data/compendium/structure.json');
	const structure = JSON.parse(readFileSync(structurePath, 'utf8')) as {
		parts: { slug: string }[];
		appendix?: { slug: string };
	};
	const out = structure.parts.map((p) => ({ part: p.slug }));
	if (structure.appendix) out.push({ part: structure.appendix.slug });
	return out;
};
