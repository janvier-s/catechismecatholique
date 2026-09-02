import { loadCitedBy } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

/** CCC paragraphs that cross-reference this one · the reverse of `cross_refs`. */
export async function citedByBlock(n: number, fetcher: Fetch): Promise<number[]> {
	const index = await loadCitedBy(fetcher);
	return (index as Record<string, number[]>)[String(n)] ?? [];
}
