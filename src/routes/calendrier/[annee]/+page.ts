import { error } from '@sveltejs/kit';
import { loadCalendrierIndex, loadCalendrierYear } from '$lib/data/loaders';
import type { CalendrierFeast, CalendrierFixedFeast, CalendrierYearKey } from '$lib/data/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const annee = params.annee;
	if (annee === 'solennites') {
		const index = await loadCalendrierIndex(fetch);
		return {
			mode: 'fixed' as const,
			feasts: index.fixed_feasts as (CalendrierFeast | CalendrierFixedFeast)[],
			title: 'Solennités principales',
			kicker: 'Calendrier liturgique · dates fixes'
		};
	}
	if (annee === 'a' || annee === 'b' || annee === 'c') {
		const year = await loadCalendrierYear(annee as CalendrierYearKey, fetch);
		const evangelist =
			annee === 'a' ? 'saint Matthieu' : annee === 'b' ? 'saint Marc' : 'saint Luc';
		return {
			mode: 'year' as const,
			feasts: year.feasts as (CalendrierFeast | CalendrierFixedFeast)[],
			title: `Année ${annee.toUpperCase()}`,
			kicker: `L'Évangile selon ${evangelist}`,
			yearKey: annee as CalendrierYearKey
		};
	}
	throw error(404, 'Année introuvable');
};
