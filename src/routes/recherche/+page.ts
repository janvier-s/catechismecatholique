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
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 2) return { q, hits: [] as SearchHit[] };
	const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
	if (!r.ok) return { q, hits: [] as SearchHit[] };
	const data = (await r.json()) as { hits: SearchHit[] };
	return { q, hits: data.hits };
};
