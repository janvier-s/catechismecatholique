import { describe, it, expect } from 'vitest';
import { buildCalendrierDates, DATE_RANGE_START_YEAR, DATE_RANGE_END_YEAR } from '../../../scripts/prepare/calendrierDates';
import type { CalendrierFeast, CalendrierFixedFeast, CalendrierYearFile } from '../../../scripts/prepare/calendrier';

// Real 2024 fixture, minimal fields (clusters aren't used by the join).
function feast(slug: string, title: string, season: CalendrierFeast['season']): CalendrierFeast {
	return { slug, title, season, clusters: [], liturgicalColor: 'white' };
}

const yearB: CalendrierYearFile = {
	key: 'b',
	feasts: [
		feast('deuxieme-dimanche-du-temps-ordinaire', 'Deuxième Dimanche du Temps Ordinaire', 'ordinaire'),
		feast('troisieme-dimanche-de-lavent', "Troisième Dimanche de l'Avent", 'avent'),
		feast('quatrieme-dimanche-de-careme', 'Quatrième Dimanche de Carême', 'careme'),
		feast('vendredi-saint-la-passion-du-seigneur', 'Vendredi Saint – La Passion du Seigneur', 'pascal'),
		feast('dimanche-de-paques-la-resurrection-du-seigneur', 'Dimanche de Pâques – La Résurrection du Seigneur', 'pascal'),
		feast('la-solennite-du-christ-roi-de-lunivers', "La Solennité du Christ Roi de l'univers", 'solennite')
	]
};

const fixedFeasts: CalendrierFixedFeast[] = [
	{
		slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
		title: "La Solennité de saint Pierre et saint Paul, Apôtres",
		season: 'solennite',
		clusters: [],
		liturgicalColor: 'white',
		date: '29 Juin',
		month_index: 5
	}
];

describe('buildCalendrierDates', () => {
	it('covers the configured range', () => {
		expect(DATE_RANGE_START_YEAR).toBe(2018);
		expect(DATE_RANGE_END_YEAR).toBe(2035);
	});

	it('resolves dates and colors correctly against known 2024 fixed points', async () => {
		const { rows, colorsBySlug } = await buildCalendrierDates([yearB], fixedFeasts);

		const row2024 = (slug: string) => rows.find((r) => r.slug === slug && r.date.startsWith('2024'));

		expect(row2024('deuxieme-dimanche-du-temps-ordinaire')).toEqual({
			date: '2024-01-14',
			slug: 'deuxieme-dimanche-du-temps-ordinaire',
			corpus: 'year',
			yearKey: 'b'
		});
		expect(row2024('vendredi-saint-la-passion-du-seigneur')?.date).toBe('2024-03-29');
		expect(row2024('dimanche-de-paques-la-resurrection-du-seigneur')?.date).toBe('2024-03-31');

		expect(colorsBySlug.get('deuxieme-dimanche-du-temps-ordinaire')).toBe('green');
		expect(colorsBySlug.get('troisieme-dimanche-de-lavent')).toBe('rose');
		expect(colorsBySlug.get('quatrieme-dimanche-de-careme')).toBe('rose');
		expect(colorsBySlug.get('vendredi-saint-la-passion-du-seigneur')).toBe('red');
		expect(colorsBySlug.get('dimanche-de-paques-la-resurrection-du-seigneur')).toBe('white');
		expect(colorsBySlug.get('la-solennite-du-christ-roi-de-lunivers')).toBe('white');
	});

	it('resolves fixed feasts to a plain civil date every year, with a color', async () => {
		const { rows, colorsBySlug } = await buildCalendrierDates([yearB], fixedFeasts);
		const petersAndPaul2024 = rows.find(
			(r) => r.slug === 'la-solennite-de-saint-pierre-et-saint-paul-apotres' && r.date === '2024-06-29'
		);
		expect(petersAndPaul2024).toEqual({
			date: '2024-06-29',
			slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
			corpus: 'fixed'
		});
		expect(colorsBySlug.get('la-solennite-de-saint-pierre-et-saint-paul-apotres')).toBe('red');
	});

	it('throws loudly when a feast title matches neither the id map nor the ordinal parser', async () => {
		const badYear: CalendrierYearFile = {
			key: 'a',
			feasts: [feast('mystery-feast', 'Un Mystère Non Reconnu', 'ordinaire')]
		};
		await expect(buildCalendrierDates([badYear], [])).rejects.toThrow(/mystery-feast/);
	});
}, 30000); // the full 18-year range takes a few seconds
