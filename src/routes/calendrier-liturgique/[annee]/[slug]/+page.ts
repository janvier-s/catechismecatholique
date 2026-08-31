import { error } from '@sveltejs/kit';
import { loadCalendrierIndex, loadCalendrierYear } from '$lib/data/loaders';
import type { CalendrierFeast, CalendrierFixedFeast, CalendrierYearKey } from '$lib/data/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const annee = params.annee;

	if (annee === 'solennites') {
		const index = await loadCalendrierIndex(fetch);
		const feast = index.fixed_feasts.find((f) => f.slug === params.slug);
		if (!feast) throw error(404, 'Fête introuvable');
		return {
			feast: feast as CalendrierFeast | CalendrierFixedFeast,
			isWeekday: false,
			yearKey: undefined,
			backHref: '/calendrier-liturgique/solennites',
			backLabel: 'solennités principales'
		};
	}

	if (annee === 'a' || annee === 'b' || annee === 'c') {
		const year = await loadCalendrierYear(annee as CalendrierYearKey, fetch);
		const feast = year.feasts.find((f) => f.slug === params.slug);
		if (!feast) throw error(404, 'Fête introuvable');
		return {
			feast: feast as CalendrierFeast | CalendrierFixedFeast,
			isWeekday: false,
			yearKey: annee as CalendrierYearKey,
			backHref: `/calendrier-liturgique/${annee}`,
			backLabel: `année ${annee.toUpperCase()}`
		};
	}

	throw error(404, 'Année introuvable');
};
