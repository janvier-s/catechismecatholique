import {
	loadCalendrierIndex,
	loadCalendrierDatesIndex,
	loadCalendrierYear,
	loadCalendrierFeries
} from '$lib/data/loaders';
import type { CalendrierFeast, CalendrierFixedFeast } from '$lib/data/types';
import type { PageLoad } from './$types';

function collectParagraphs(feasts: (CalendrierFeast | CalendrierFixedFeast)[], into: Set<number>) {
	for (const f of feasts) {
		for (const c of f.clusters) {
			for (const n of c.paragraphs) into.add(n);
		}
	}
}

export const load: PageLoad = async ({ fetch }) => {
	const [index, datesIndex, yearA, yearB, yearC, feriesI, feriesII] = await Promise.all([
		loadCalendrierIndex(fetch),
		loadCalendrierDatesIndex(fetch),
		loadCalendrierYear('a', fetch),
		loadCalendrierYear('b', fetch),
		loadCalendrierYear('c', fetch),
		loadCalendrierFeries('I', fetch),
		loadCalendrierFeries('II', fetch)
	]);

	// A given paragraph is often cited by several feasts/féries, so the
	// count worth publishing is the number of distinct CCC paragraphs
	// covered, not the sum of each theme's paragraph list.
	const paragraphs = new Set<number>();
	collectParagraphs(index.fixed_feasts, paragraphs);
	collectParagraphs(yearA.feasts, paragraphs);
	collectParagraphs(yearB.feasts, paragraphs);
	collectParagraphs(yearC.feasts, paragraphs);
	collectParagraphs(feriesI.feasts, paragraphs);
	collectParagraphs(feriesII.feasts, paragraphs);

	const totalCovered =
		yearA.feasts.length +
		yearB.feasts.length +
		yearC.feasts.length +
		feriesI.feasts.length +
		feriesII.feasts.length +
		index.fixed_feasts.length;

	return {
		index,
		datesIndex,
		totalParagraphs: paragraphs.size,
		totalCovered
	};
};
