import { redirect } from '@sveltejs/kit';
import { detectIntent } from '$lib/utils/searchIntent';
import { loadParagraphContexts } from '$lib/data/loaders';
import type { ParagraphContext } from '$lib/data/types';
import type { PageLoad } from './$types';

export interface SearchHit {
	id: string;
	kind: 'paragraph' | 'heading';
	number?: number;
	text: string;
	title?: string;
	paragraph_start?: number;
	chapter_slug?: string;
	score: number;
	match: Record<string, string[]>;
}

export const load: PageLoad = async ({ url, fetch }) => {
	const raw = url.searchParams.get('q')?.trim() ?? '';
	if (!raw) return { q: '', hits: [] as SearchHit[], contexts: {} as Record<number, ParagraphContext> };

	// Run intent detection BEFORE search so bookmarked URLs with a numeric or
	// biblical query land on the right page (mirrors the TopBar form behavior).
	const intent = detectIntent(raw);
	if (intent.kind === 'paragraph' || intent.kind === 'bible') {
		throw redirect(303, intent.href);
	}

	const q = intent.q;
	if (q.length < 2)
		return { q, hits: [] as SearchHit[], contexts: {} as Record<number, ParagraphContext> };

	const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
	if (!r.ok)
		return { q, hits: [] as SearchHit[], contexts: {} as Record<number, ParagraphContext> };
	const data = (await r.json()) as { hits: SearchHit[] };

	// Paragraph contexts give each result row a Partie · Section · Chapitre
	// breadcrumb. The file is ~280 KB and module-cached after first fetch.
	let contexts: Record<number, ParagraphContext> = {};
	try {
		contexts = await loadParagraphContexts(fetch);
	} catch {
		contexts = {};
	}

	return { q, hits: data.hits, contexts };
};
