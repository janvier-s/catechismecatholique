import { describe, it, expect } from 'vitest';
import {
	buildCalendrierDates,
	DATE_RANGE_START_YEAR,
	DATE_RANGE_END_YEAR
} from '../../../scripts/prepare/calendrierDates';
import type {
	CalendrierFeast,
	CalendrierFixedFeast,
	CalendrierYearFile
} from '../../../scripts/prepare/calendrier';

// Real 2024 fixture, minimal fields (clusters aren't used by the join).
function feast(slug: string, title: string, season: CalendrierFeast['season']): CalendrierFeast {
	return { slug, title, season, clusters: [], liturgicalColor: 'white' };
}

const yearB: CalendrierYearFile = {
	key: 'b',
	feasts: [
		feast(
			'deuxieme-dimanche-du-temps-ordinaire',
			'Deuxième Dimanche du Temps Ordinaire',
			'ordinaire'
		),
		feast('troisieme-dimanche-de-lavent', "Troisième Dimanche de l'Avent", 'avent'),
		feast('quatrieme-dimanche-de-careme', 'Quatrième Dimanche de Carême', 'careme'),
		feast(
			'vendredi-saint-la-passion-du-seigneur',
			'Vendredi Saint – La Passion du Seigneur',
			'pascal'
		),
		feast(
			'dimanche-de-paques-la-resurrection-du-seigneur',
			'Dimanche de Pâques – La Résurrection du Seigneur',
			'pascal'
		),
		feast(
			'la-solennite-du-christ-roi-de-lunivers',
			"La Solennité du Christ Roi de l'univers",
			'solennite'
		),
		feast(
			'la-solennite-de-lascension-du-seigneur',
			'La Solennité de l’Ascension du Seigneur',
			'pascal'
		),
		feast(
			'treizieme-dimanche-du-temps-ordinaire',
			'Treizième Dimanche du Temps Ordinaire',
			'ordinaire'
		)
	]
};

// The real curated titles diverge between années, which is what makes the same
// real-world feast slugify differently per file · année A drops the leading
// "La", année C writes "du Carême" where A and B write "de Carême".
const yearA: CalendrierYearFile = {
	key: 'a',
	feasts: [
		feast('deuxieme-dimanche-de-careme', 'Deuxième Dimanche de Carême', 'careme'),
		feast('solennite-de-lascension-du-seigneur', 'Solennité de l’Ascension du Seigneur', 'pascal'),
		feast(
			'treizieme-dimanche-du-temps-ordinaire',
			'Treizième Dimanche du Temps Ordinaire',
			'ordinaire'
		)
	]
};

const yearC: CalendrierYearFile = {
	key: 'c',
	feasts: [
		feast('deuxieme-dimanche-du-careme', 'Deuxième Dimanche du Carême', 'careme'),
		feast(
			'la-solennite-de-lascension-du-seigneur',
			'La Solennité de l’Ascension du Seigneur',
			'pascal'
		),
		feast(
			'treizieme-dimanche-du-temps-ordinaire',
			'Treizième Dimanche du Temps Ordinaire',
			'ordinaire'
		)
	]
};

const fixedFeasts: CalendrierFixedFeast[] = [
	{
		slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
		title: 'La Solennité de saint Pierre et saint Paul, Apôtres',
		season: 'solennite',
		clusters: [],
		liturgicalColor: 'white',
		date: '29 Juin',
		month_index: 5
	}
];

const immaculee: CalendrierFixedFeast = {
	slug: 'la-solennite-de-limmaculee-conception-de-la-vierge-marie',
	title: 'La Solennité de l’Immaculée Conception de la Vierge Marie',
	season: 'solennite',
	clusters: [],
	liturgicalColor: 'white',
	date: '8 Décembre',
	month_index: 11
};

describe('buildCalendrierDates', () => {
	it('covers the configured range', () => {
		expect(DATE_RANGE_START_YEAR).toBe(2000);
		expect(DATE_RANGE_END_YEAR).toBe(2035);
	});

	it('resolves dates and colors correctly against known 2024 fixed points', async () => {
		const { rows, colorsBySlug } = await buildCalendrierDates([yearB], fixedFeasts);

		const row2024 = (slug: string) =>
			rows.find((r) => r.slug === slug && r.date.startsWith('2024'));

		expect(row2024('deuxieme-dimanche-du-temps-ordinaire')).toEqual({
			date: '2024-01-14',
			slug: 'deuxieme-dimanche-du-temps-ordinaire',
			corpus: 'year',
			yearKey: 'b',
			liturgicalColor: 'green'
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
			(r) =>
				r.slug === 'la-solennite-de-saint-pierre-et-saint-paul-apotres' && r.date === '2024-06-29'
		);
		expect(petersAndPaul2024).toEqual({
			date: '2024-06-29',
			slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
			corpus: 'fixed',
			liturgicalColor: 'red'
		});
		expect(colorsBySlug.get('la-solennite-de-saint-pierre-et-saint-paul-apotres')).toBe('red');
	});

	it('keeps each année file to its own cycle years when all three are joined together', async () => {
		const { rows } = await buildCalendrierDates([yearA, yearB, yearC], fixedFeasts);
		const slugsByYearKey = new Map(
			[yearA, yearB, yearC].map((yf) => [yf.key, new Set(yf.feasts.map((f) => f.slug))])
		);

		// A row whose slug isn't in its own yearKey's file is a dead end: the
		// frontend loads annee-{yearKey}.json and finds nothing.
		const orphans = rows.filter(
			(r) => r.corpus === 'year' && !slugsByYearKey.get(r.yearKey!)!.has(r.slug)
		);
		expect(orphans).toEqual([]);

		// Two rows on one date make findRow's `.find()` a coin toss.
		const byDate = new Map<string, typeof rows>();
		for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
		expect([...byDate.entries()].filter(([, v]) => v.length > 1)).toEqual([]);

		// 2027 is a year B cycle, so the Ascension row must carry année B's
		// spelling ("la-solennite-…"), not année A's ("solennite-…").
		expect(byDate.get('2027-05-06')).toEqual([
			{
				date: '2027-05-06',
				slug: 'la-solennite-de-lascension-du-seigneur',
				corpus: 'year',
				yearKey: 'b',
				liturgicalColor: 'white'
			}
		]);
	});

	it('gives a displaced Sunday to the solemnity that outranks it', async () => {
		const { rows } = await buildCalendrierDates([yearA, yearB, yearC], fixedFeasts);

		// 29 June 2025 is both Peter and Paul and, nominally, the 13th Sunday of
		// Ordinary Time. The solemnity wins, and the Sunday is not celebrated.
		expect(rows.filter((r) => r.date === '2025-06-29')).toEqual([
			{
				date: '2025-06-29',
				slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
				corpus: 'fixed',
				liturgicalColor: 'red'
			}
		]);
		const treizieme = rows.filter((r) => r.slug === 'treizieme-dimanche-du-temps-ordinaire');
		expect(treizieme.some((r) => r.date === '2025-06-29')).toBe(false);
		// It is still celebrated in the other year C years, just not that one.
		expect(treizieme.some((r) => r.yearKey === 'c')).toBe(true);
	});

	it('dates fixed feasts from romcal so transfers are respected', async () => {
		const { rows } = await buildCalendrierDates([yearA, yearB, yearC], [immaculee]);

		// 8 December 2019 is the 2nd Sunday of Advent, which outranks the
		// Immaculée · romcal moves her to the 9th.
		const immaculee2019 = rows.filter(
			(r) => r.slug === immaculee.slug && r.date.startsWith('2019')
		);
		expect(immaculee2019).toEqual([
			{
				date: '2019-12-09',
				slug: 'la-solennite-de-limmaculee-conception-de-la-vierge-marie',
				corpus: 'fixed',
				liturgicalColor: 'white'
			}
		]);
	});

	it('throws loudly when a feast title matches neither the id map nor the ordinal parser', async () => {
		const badYear: CalendrierYearFile = {
			key: 'a',
			feasts: [feast('mystery-feast', 'Un Mystère Non Reconnu', 'ordinaire')]
		};
		await expect(buildCalendrierDates([badYear], [])).rejects.toThrow(/mystery-feast/);
	});
}, 30000); // the full 18-year range takes a few seconds
