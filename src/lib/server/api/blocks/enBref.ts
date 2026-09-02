import { loadEnBrefsIndex } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiEnBref {
	first: number;
	last: number;
	paragraphs: number[];
	parent_kind?: string;
	parent_slug?: string;
}

/** The "En Bref" summary block whose range covers this paragraph, if any. */
export async function enBrefBlock(n: number, fetcher: Fetch): Promise<ApiEnBref | null> {
	const index = await loadEnBrefsIndex(fetcher);
	const hit = index.find((e) => n >= e.first && n <= e.last);
	if (!hit) return null;
	return {
		first: hit.first,
		last: hit.last,
		paragraphs: hit.paragraphs,
		...(hit.parent_kind ? { parent_kind: hit.parent_kind } : {}),
		...(hit.parent_slug ? { parent_slug: hit.parent_slug } : {})
	};
}
