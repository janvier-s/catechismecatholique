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

export interface SearchSuggestion {
	term: string;
	slug: string;
}

export const load: PageLoad = async ({ url, fetch }) => {
	const raw = url.searchParams.get('q')?.trim() ?? '';
	const empty = {
		q: '',
		hits: [] as SearchHit[],
		mode: 'and' as 'and' | 'or',
		matchedTokens: [] as string[],
		tokens: [] as string[],
		suggestions: [] as SearchSuggestion[]
	};
	if (!raw) return empty;

	const intent = detectIntent(raw);
	if (intent.kind === 'paragraph' || intent.kind === 'bible') {
		throw redirect(303, intent.href);
	}

	const q = intent.q;
	if (q.length < 2) return { ...empty, q };

	const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
	if (!r.ok) return { ...empty, q };
	const data = (await r.json()) as {
		hits: SearchHit[];
		mode?: 'and' | 'or';
		tokens?: string[];
		matchedTokens?: string[];
		suggestions?: SearchSuggestion[];
	};

	return {
		q,
		hits: data.hits,
		mode: data.mode ?? 'and',
		tokens: data.tokens ?? [],
		matchedTokens: data.matchedTokens ?? [],
		suggestions: data.suggestions ?? []
	};
};
