import { describe, it, expect } from 'vitest';
import { mergeReadings } from '../../../scripts/prepare/calendrierReadingsMerge';
import type {
	CalendrierFixedFeast,
	CalendrierReadingsFile,
	CalendrierYearFile
} from '../../../scripts/prepare/calendrier';

const yearFiles: CalendrierYearFile[] = [
	{
		key: 'b',
		feasts: [
			{
				slug: 'deuxieme-dimanche-du-temps-ordinaire',
				title: 'Deuxième Dimanche du Temps Ordinaire',
				season: 'ordinaire',
				clusters: [],
				liturgicalColor: 'green'
			}
		]
	}
];

const fixed: CalendrierFixedFeast[] = [
	{
		slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
		title: 'La Solennité de saint Pierre et saint Paul, Apôtres',
		season: 'solennite',
		clusters: [],
		liturgicalColor: 'red',
		date: '29 Juin',
		month_index: 5
	}
];

const readingsFile: CalendrierReadingsFile = {
	'b:deuxieme-dimanche-du-temps-ordinaire': { date: '2024-01-14', lectures: [] },
	'la-solennite-de-saint-pierre-et-saint-paul-apotres': { date: '2024-06-29', lectures: [] },
	'unrelated-slug-not-curated-anymore': { date: '2020-01-01', lectures: [] }
};

describe('mergeReadings', () => {
	it('keeps only the readings the current curated data actually needs', () => {
		const result = mergeReadings(yearFiles, fixed, readingsFile);
		expect(Object.keys(result).sort()).toEqual([
			'b:deuxieme-dimanche-du-temps-ordinaire',
			'la-solennite-de-saint-pierre-et-saint-paul-apotres'
		]);
	});

	it('throws, naming the feast, when a curated year feast has no reading', () => {
		const incomplete: CalendrierReadingsFile = { ...readingsFile };
		delete incomplete['b:deuxieme-dimanche-du-temps-ordinaire'];
		expect(() => mergeReadings(yearFiles, fixed, incomplete)).toThrow(
			/deuxieme-dimanche-du-temps-ordinaire/
		);
	});

	it('throws, naming the feast, when a curated fixed feast has no reading', () => {
		const incomplete: CalendrierReadingsFile = { ...readingsFile };
		delete incomplete['la-solennite-de-saint-pierre-et-saint-paul-apotres'];
		expect(() => mergeReadings(yearFiles, fixed, incomplete)).toThrow(
			/la-solennite-de-saint-pierre-et-saint-paul-apotres/
		);
	});

	it('tolerates a missing reading for a key on the known AELF archive gap allowlist, without throwing or emitting it', () => {
		const withGap: CalendrierYearFile[] = [
			{
				key: 'a',
				feasts: [
					{
						slug: 'neuvieme-dimanche-du-temps-ordinaire',
						title: 'Neuvième Dimanche du Temps Ordinaire',
						season: 'ordinaire',
						clusters: [],
						liturgicalColor: 'green'
					}
				]
			},
			...yearFiles
		];
		const result = mergeReadings(withGap, fixed, readingsFile);
		expect(Object.keys(result)).not.toContain('a:neuvieme-dimanche-du-temps-ordinaire');
		expect(Object.keys(result).sort()).toEqual([
			'b:deuxieme-dimanche-du-temps-ordinaire',
			'la-solennite-de-saint-pierre-et-saint-paul-apotres'
		]);
	});
});
