import { describe, it, expect } from 'vitest';
import {
	buildCecLiturgyIndex,
	cecLiturgyBucket,
	type CecLiturgyBucket,
	type CecLiturgyOccasion,
	type CecLiturgySource
} from '../../../scripts/prepare/cecLiturgyIndex';
import type { CalendrierFeast, CalendrierFixedFeast } from '../../../scripts/prepare/calendrier';

/** Resolves a paragraph's index references back into occasion objects. */
function occasionsFor(
	index: Map<number, CecLiturgyBucket>,
	paragraph: number
): CecLiturgyOccasion[] | undefined {
	const bucket = index.get(cecLiturgyBucket(paragraph));
	const refs = bucket?.paragraphs[String(paragraph)];
	return refs?.map((i) => bucket!.occasions[i]!);
}

function feast(
	slug: string,
	title: string,
	clusters: { theme: string; paragraphs: number[] }[]
): CalendrierFeast {
	return {
		slug,
		title,
		season: 'avent',
		liturgicalColor: 'violet',
		clusters: clusters.map((c, i) => ({
			i,
			theme: c.theme,
			refs: c.paragraphs.join(', '),
			paragraphs: c.paragraphs
		}))
	};
}

const advent = feast('premier-dimanche-de-lavent', 'Premier Dimanche de l’Avent', [
	{ theme: 'la venue du Christ dans la gloire', paragraphs: [668, 669, 769] },
	{ theme: '“Viens, Seigneur Jésus!”', paragraphs: [451, 671] }
]);

const sources: CecLiturgySource[] = [
	{ feast: advent, cycle: 'a', readingsKey: 'a:premier-dimanche-de-lavent' }
];

describe('cecLiturgyBucket', () => {
	it('buckets by paragraph hundred', () => {
		expect(cecLiturgyBucket(1)).toBe(0);
		expect(cecLiturgyBucket(99)).toBe(0);
		expect(cecLiturgyBucket(100)).toBe(1);
		expect(cecLiturgyBucket(2865)).toBe(28);
	});
});

describe('buildCecLiturgyIndex', () => {
	it('indexes every paragraph of a cluster, carrying the whole cluster as siblings', () => {
		const index = buildCecLiturgyIndex(sources);

		// 451 lives in bucket 4, 769 in bucket 7 · only the 6xx members land here.
		expect(Object.keys(index.get(6)!.paragraphs).sort()).toEqual(['668', '669', '671']);

		const [occ] = occasionsFor(index, 668)!;
		expect(occ).toMatchObject({
			slug: 'premier-dimanche-de-lavent',
			title: 'Premier Dimanche de l’Avent',
			season: 'avent',
			color: 'violet',
			cycle: 'a',
			theme: 'la venue du Christ dans la gloire',
			paragraphs: [668, 669, 769],
			readingsKey: 'a:premier-dimanche-de-lavent'
		});
	});

	it('files a paragraph into the bucket of its own hundred, not the cluster’s first', () => {
		const index = buildCecLiturgyIndex(sources);
		// 769 belongs to a cluster whose other members are in bucket 6.
		expect(index.get(6)!.paragraphs['769']).toBeUndefined();
		expect(occasionsFor(index, 769)).toHaveLength(1);
		expect(occasionsFor(index, 769)![0]!.paragraphs).toEqual([668, 669, 769]);
	});

	it('stacks both blocks when one feast cites a paragraph under two themes', () => {
		const twice = feast('noel', 'La Solennité de Noël', [
			{ theme: 'l’Incarnation', paragraphs: [461, 463] },
			{ theme: 'le mystère de Noël', paragraphs: [461, 526] }
		]);
		const index = buildCecLiturgyIndex([{ feast: twice, cycle: 'b', readingsKey: 'b:noel' }]);

		const entries = occasionsFor(index, 461)!;
		expect(entries).toHaveLength(2);
		expect(entries.map((e) => e.theme)).toEqual(['l’Incarnation', 'le mystère de Noël']);
	});

	it('does not duplicate an occasion when a cluster repeats a paragraph', () => {
		const dupe = feast('x', 'X', [{ theme: 't', paragraphs: [100, 100, 101] }]);
		const index = buildCecLiturgyIndex([{ feast: dupe, readingsKey: 'x' }]);
		expect(occasionsFor(index, 100)).toHaveLength(1);
	});

	it('carries the date of a fixed feast and omits the cycle', () => {
		const presentation: CalendrierFixedFeast = {
			...feast('la-presentation-du-seigneur', 'La Présentation du Seigneur', [
				{ theme: 'les mystères de l’enfance de Jésus', paragraphs: [527, 529] }
			]),
			season: 'noel',
			liturgicalColor: 'white',
			date: '2 Février',
			month_index: 1
		};
		const index = buildCecLiturgyIndex([
			{ feast: presentation, readingsKey: 'la-presentation-du-seigneur' }
		]);

		const occ = occasionsFor(index, 527)![0]!;
		expect(occ.date).toBe('2 Février');
		expect(occ.monthIndex).toBe(1);
		expect(occ.cycle).toBeUndefined();
	});

	it('omits readingsKey for a feast with no readings file', () => {
		const orphan = feast('neuvieme-dimanche', 'Neuvième Dimanche', [
			{ theme: 't', paragraphs: [2000] }
		]);
		const index = buildCecLiturgyIndex([{ feast: orphan, cycle: 'a' }]);
		expect(occasionsFor(index, 2000)![0]!.readingsKey).toBeUndefined();
	});

	it('preserves source order across cycles so années stay a, b, c', () => {
		const index = buildCecLiturgyIndex([
			{
				feast: feast('s', 'S', [{ theme: 'ta', paragraphs: [50] }]),
				cycle: 'a',
				readingsKey: 'a:s'
			},
			{
				feast: feast('s', 'S', [{ theme: 'tb', paragraphs: [50] }]),
				cycle: 'b',
				readingsKey: 'b:s'
			},
			{
				feast: feast('s', 'S', [{ theme: 'tc', paragraphs: [50] }]),
				cycle: 'c',
				readingsKey: 'c:s'
			}
		]);
		expect(occasionsFor(index, 50)!.map((e) => e.cycle)).toEqual(['a', 'b', 'c']);
	});
});
