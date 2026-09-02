import { loadCdseCitedByCcc } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiCdseRef {
	paragraph: number;
	url: string;
}

/** Compendium de la doctrine sociale paragraphs that cite this CCC paragraph. */
export async function cdseBlock(n: number, fetcher: Fetch): Promise<ApiCdseRef[]> {
	const index = await loadCdseCitedByCcc(fetcher);
	const paragraphs = index[String(n)] ?? [];
	return paragraphs.map((p) => ({ paragraph: p, url: `/doctrine-sociale/${p}` }));
}
