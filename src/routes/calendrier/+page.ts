import { loadCalendrierIndex, loadCalendrierDatesIndex } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [index, datesIndex] = await Promise.all([
		loadCalendrierIndex(fetch),
		loadCalendrierDatesIndex(fetch)
	]);
	return { index, datesIndex };
};
