import { loadDenzingerRefs, loadDenzingerIndex } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiDenzingerRef {
	number: number;
	unit_slug: string | null;
	url: string | null;
}

/**
 * Enchiridion Symbolorum entries this CCC paragraph cites.
 *
 * `refs.json` is keyed by CCC paragraph; `cited-by.json` is the inverse,
 * keyed by Denzinger number. Using the wrong one silently returns plausible
 * but incorrect numbers, so this is deliberate.
 */
export async function denzingerBlock(n: number, fetcher: Fetch): Promise<ApiDenzingerRef[]> {
	const [refs, index] = await Promise.all([
		loadDenzingerRefs(fetcher),
		loadDenzingerIndex(fetcher)
	]);
	const numbers = refs[String(n)] ?? [];
	return numbers.map((num) => {
		const slug = index[String(num)]?.unit_slug ?? null;
		return {
			number: num,
			unit_slug: slug,
			url: slug ? `/enchiridion/${slug}` : null
		};
	});
}
