import { describe, it, expect } from 'vitest';
import {
	buildCecLiturgyByOccasion,
	occasionKey,
	toCecLiturgyOccasion
} from '../../scripts/prepare/cecLiturgyIndex.ts';

const source = (slug: string, cycle: 'a' | 'b' | 'c' | undefined, paragraphs: number[]) => ({
	feast: {
		slug,
		title: `Titre ${slug}`,
		season: 'avent',
		liturgicalColor: 'rose',
		clusters: [{ theme: 'la joie', paragraphs }]
	},
	cycle
});

describe('occasionKey', () => {
	it('joins cycle and slug', () => {
		expect(occasionKey('b', 'avent-3')).toBe('b:avent-3');
	});

	it('uses an empty cycle segment when there is none', () => {
		expect(occasionKey(undefined, 'noel')).toBe(':noel');
	});

	it('distinguishes the same slug across cycles', () => {
		expect(occasionKey('a', 'avent-3')).not.toBe(occasionKey('b', 'avent-3'));
	});
});

describe('toCecLiturgyOccasion', () => {
	it('dedupes paragraphs within a cluster', () => {
		const o = toCecLiturgyOccasion(source('avent-3', 'a', [30, 30, 163]) as never);
		expect(o.clusters[0]!.paragraphs).toEqual([30, 163]);
	});

	it('omits cycle entirely when the source has none', () => {
		const o = toCecLiturgyOccasion(source('noel', undefined, [525]) as never);
		expect(o.cycle).toBeUndefined();
	});
});

describe('buildCecLiturgyByOccasion', () => {
	// The whole reason this index is cycle-keyed. A slug-only key would collide
	// here and serve one year's paragraphs for all three.
	it('keeps the three cycles of one slug apart', () => {
		const out = buildCecLiturgyByOccasion([
			source('avent-3', 'a', [30]),
			source('avent-3', 'b', [163]),
			source('avent-3', 'c', [301])
		] as never);
		expect(Object.keys(out).sort()).toEqual(['a:avent-3', 'b:avent-3', 'c:avent-3']);
		expect(out['a:avent-3']!.clusters[0]!.paragraphs).toEqual([30]);
		expect(out['b:avent-3']!.clusters[0]!.paragraphs).toEqual([163]);
		expect(out['c:avent-3']!.clusters[0]!.paragraphs).toEqual([301]);
	});

	it('keys a cycle-less feast with an empty cycle segment', () => {
		const out = buildCecLiturgyByOccasion([source('noel', undefined, [525])] as never);
		expect(Object.keys(out)).toEqual([':noel']);
	});

	it('skips an occasion whose clusters cite no paragraph', () => {
		const out = buildCecLiturgyByOccasion([source('vide', 'a', [])] as never);
		expect(out).toEqual({});
	});
});
