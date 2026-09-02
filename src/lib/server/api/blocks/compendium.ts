import { loadCompendiumCitedBy } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiCompendiumRef {
	question: number;
	url: string;
}

/** Compendium questions that draw on this CCC paragraph. */
export async function compendiumBlock(n: number, fetcher: Fetch): Promise<ApiCompendiumRef[]> {
	const index = await loadCompendiumCitedBy(fetcher);
	const questions = (index as unknown as Record<string, number[]>)[String(n)] ?? [];
	return questions.map((q) => ({ question: q, url: `/compendium/${q}` }));
}
