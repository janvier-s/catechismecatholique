import { redirect } from '@sveltejs/kit';
import { detectIntent } from '$lib/utils/searchIntent';
import type { PageLoad } from './$types';

export interface SearchHit {
	id: string;
	kind: 'paragraph' | 'heading' | 'compendium-question';
	number?: number;
	text: string;
	title?: string;
	paragraph_start?: number;
	chapter_slug?: string;
	corpus?: 'ccc' | 'compendium';
	compendium_part?: string;
	score: number;
	match: Record<string, string[]>;
}

export const load: PageLoad = async ({ url, fetch }) => {
	const raw = url.searchParams.get('q')?.trim() ?? '';
	if (!raw) return { q: '', hits: [] as SearchHit[] };

	// Run intent detection BEFORE search so bookmarked URLs with a numeric or
	// biblical query land on the right page (mirrors the TopBar form behavior).
	const intent = detectIntent(raw);
	if (intent.kind === 'paragraph' || intent.kind === 'bible') {
		throw redirect(303, intent.href);
	}

	const q = intent.q;
	if (q.length < 2) return { q, hits: [] as SearchHit[] };

	const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
	if (!r.ok) return { q, hits: [] as SearchHit[] };
	const data = (await r.json()) as { hits: SearchHit[] };

	// Paragraph contexts (Partie · Section · Chapitre breadcrumbs) used to
	// load here, but inlining the 1.8 MB bundle into every search HTML
	// response was the largest payload on the site. The page now fetches
	// the bundle client-side after first paint and decorates rows
	// progressively — see +page.svelte.
	return { q, hits: data.hits };
};
