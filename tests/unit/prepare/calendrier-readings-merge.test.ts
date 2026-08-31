import { describe, it, expect, vi } from 'vitest';
import type {
	CalendrierFixedFeast,
	CalendrierReadingsFile,
	CalendrierYearFile
} from '../../../scripts/prepare/calendrier';
import type { WeekdayTarget } from '../../../scripts/prepare/weekdayFeasts';

vi.mock('../../../scripts/aelf/knownGaps', () => ({
	KNOWN_AELF_GAPS: { 'a:neuvieme-dimanche-du-temps-ordinaire': 'test-only gap' }
}));
const { mergeReadings } = await import('../../../scripts/prepare/calendrierReadingsMerge');

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

	it('tolerates a missing reading for a key on the known AELF gap allowlist, without throwing or emitting it', () => {
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

	it('copies weekday reading entries keyed by slug and cycle, without the throw-on-missing guard', () => {
		const weekdayTargets: WeekdayTarget[] = [
			{
				slug: 'ordinaire-2-lundi',
				season: 'ordinaire',
				weekOfSeason: 2,
				dayOfWeek: 1,
				cycle: 'II',
				representativeDate: '2026-01-12'
			}
		];
		const readingsWithWeekday: CalendrierReadingsFile = {
			...readingsFile,
			'II:ordinaire-2-lundi': { date: '2026-01-12', lectures: [] }
		};
		const result = mergeReadings(yearFiles, fixed, readingsWithWeekday, weekdayTargets);
		expect(Object.keys(result).sort()).toEqual([
			'II:ordinaire-2-lundi',
			'b:deuxieme-dimanche-du-temps-ordinaire',
			'la-solennite-de-saint-pierre-et-saint-paul-apotres'
		]);
	});

	it('omits a weekday target with no reading rather than writing an undefined entry', () => {
		const weekdayTargets: WeekdayTarget[] = [
			{
				slug: 'ordinaire-2-lundi',
				season: 'ordinaire',
				weekOfSeason: 2,
				dayOfWeek: 1,
				cycle: 'II',
				representativeDate: '2026-01-12'
			},
			{
				slug: 'ordinaire-3-mardi',
				season: 'ordinaire',
				weekOfSeason: 3,
				dayOfWeek: 2,
				cycle: 'I',
				representativeDate: '2025-01-21'
			}
		];
		const readingsWithWeekday: CalendrierReadingsFile = {
			...readingsFile,
			'II:ordinaire-2-lundi': { date: '2026-01-12', lectures: [] }
		};
		const result = mergeReadings(yearFiles, fixed, readingsWithWeekday, weekdayTargets);
		expect(Object.keys(result)).toContain('II:ordinaire-2-lundi');
		expect(Object.keys(result)).not.toContain('I:ordinaire-3-mardi');
		expect(Object.values(result).every((v) => v !== undefined)).toBe(true);
	});

	it('warns when an allowlisted key now has a reading, so it can be removed from the allowlist', () => {
		const withResolvedGap: CalendrierReadingsFile = {
			...readingsFile,
			'a:neuvieme-dimanche-du-temps-ordinaire': { date: '2029-06-03', lectures: [] }
		};
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mergeReadings(yearFiles, fixed, withResolvedGap);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('a:neuvieme-dimanche-du-temps-ordinaire')
		);
		warnSpy.mockRestore();
	});
});
