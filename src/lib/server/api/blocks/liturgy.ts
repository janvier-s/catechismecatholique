import { loadCecLiturgy } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiLiturgyOccasion {
	slug: string;
	title: string;
	season: string;
	color: string;
	cycle?: string;
	date?: string;
	/** Only the themes whose cluster actually contains this paragraph. */
	themes: string[];
}

/**
 * Liturgical days on which this paragraph is proposed for meditation
 * alongside the readings. CEC paragraphs are not read at Mass · the wording
 * here must stay "proposé à la méditation", never "lu" or "proclamé".
 */
export async function liturgyBlock(n: number, fetcher: Fetch): Promise<ApiLiturgyOccasion[]> {
	const occasions = await loadCecLiturgy(n, fetcher);
	return occasions.map((o) => ({
		slug: o.slug,
		title: o.title,
		season: o.season,
		color: o.color,
		...(o.cycle ? { cycle: o.cycle } : {}),
		...(o.date ? { date: o.date } : {}),
		themes: o.clusters.filter((c) => c.paragraphs.includes(n)).map((c) => c.theme)
	}));
}
