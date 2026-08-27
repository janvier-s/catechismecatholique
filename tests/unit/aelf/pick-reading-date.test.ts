import { describe, it, expect } from 'vitest';
import { pickReadingDate } from '../../../scripts/aelf/pickReadingDate';
import type { CalendrierDateRow } from '../../../scripts/prepare/calendrier';

const rows: CalendrierDateRow[] = [
	{
		date: '2018-01-14',
		slug: 'deuxieme-dimanche-du-temps-ordinaire',
		corpus: 'year',
		yearKey: 'b'
	},
	{
		date: '2021-01-17',
		slug: 'deuxieme-dimanche-du-temps-ordinaire',
		corpus: 'year',
		yearKey: 'b'
	},
	{
		date: '2024-01-14',
		slug: 'deuxieme-dimanche-du-temps-ordinaire',
		corpus: 'year',
		yearKey: 'b'
	},
	{
		date: '2027-01-17',
		slug: 'deuxieme-dimanche-du-temps-ordinaire',
		corpus: 'year',
		yearKey: 'b'
	},
	{
		date: '2024-06-29',
		slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
		corpus: 'fixed'
	},
	{
		date: '2019-12-01',
		slug: 'premier-dimanche-de-lavent',
		corpus: 'year',
		yearKey: 'a'
	},
	{
		date: '2022-11-27',
		slug: 'premier-dimanche-de-lavent',
		corpus: 'year',
		yearKey: 'a'
	},
	{
		date: '2020-11-29',
		slug: 'premier-dimanche-de-lavent',
		corpus: 'year',
		yearKey: 'c'
	},
	{
		date: '2023-12-03',
		slug: 'premier-dimanche-de-lavent',
		corpus: 'year',
		yearKey: 'c'
	}
];

describe('pickReadingDate', () => {
	it('picks the most recent row on or before today', () => {
		expect(pickReadingDate(rows, 'deuxieme-dimanche-du-temps-ordinaire', '2026-08-27')).toBe(
			'2024-01-14'
		);
	});

	it('excludes rows after today even if they are the latest in the array', () => {
		expect(pickReadingDate(rows, 'deuxieme-dimanche-du-temps-ordinaire', '2022-01-01')).toBe(
			'2021-01-17'
		);
	});

	it('does not depend on input order', () => {
		const shuffled = [...rows].reverse();
		expect(pickReadingDate(shuffled, 'deuxieme-dimanche-du-temps-ordinaire', '2026-08-27')).toBe(
			'2024-01-14'
		);
	});

	it('returns null when the slug has no past occurrence yet', () => {
		expect(pickReadingDate(rows, 'deuxieme-dimanche-du-temps-ordinaire', '2017-12-31')).toBeNull();
	});

	it('returns null for a slug with no rows at all', () => {
		expect(pickReadingDate(rows, 'unknown-slug', '2026-08-27')).toBeNull();
	});

	it('when yearKey is given, only considers that cycle rows for a slug shared across cycles', () => {
		expect(pickReadingDate(rows, 'premier-dimanche-de-lavent', '2026-08-27', 'a')).toBe(
			'2022-11-27'
		);
		expect(pickReadingDate(rows, 'premier-dimanche-de-lavent', '2026-08-27', 'c')).toBe(
			'2023-12-03'
		);
	});
});
