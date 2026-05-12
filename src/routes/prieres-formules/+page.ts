import { error } from '@sveltejs/kit';
import { loadCompendiumPart } from '$lib/data/loaders';
import type { PageLoad } from './$types';
import type { CompendiumFlowNode } from '$lib/data/types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	// The Compendium ships the catechism's appendix prayers as a "part"
	// bundle (slug 'annexe'); the older route surfaces them here. We
	// concatenate them with the Pius X catechism prayer collection
	// hand-cleaned into static/data/prieres/flow.json so the page renders
	// one continuous, denser anthology.
	const [annexe, extraRes] = await Promise.all([
		loadCompendiumPart('annexe', fetch).catch(() => null),
		fetch('/data/prieres/flow.json').catch(() => null)
	]);
	if (!annexe) throw error(404, 'Annexe introuvable');
	let extra: CompendiumFlowNode[] = [];
	if (extraRes && extraRes.ok) {
		try {
			extra = (await extraRes.json()) as CompendiumFlowNode[];
		} catch {
			extra = [];
		}
	}
	// Merge: annexe (Compendium prayers) first, then the Pius X collection
	// under its own top-level rule.
	const part = {
		...annexe,
		flow: [...annexe.flow, ...extra]
	};
	return { part };
};
