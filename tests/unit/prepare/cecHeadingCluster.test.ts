import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
	buildHeadingLevels,
	clusterCitations,
	type CecStructureFile
} from '../../../scripts/prepare/cecHeadingCluster';

const HERE = dirname(fileURLToPath(import.meta.url));
const structure: CecStructureFile = JSON.parse(
	readFileSync(join(HERE, 'cec-structure-fixture.json'), 'utf8')
);
const levels = buildHeadingLevels(structure);

describe('clusterCitations - variable granularity', () => {
	it('resolves a range spanning multiple fine headings to the containing article title', () => {
		const clusters = clusterCitations([{ from: 1716, to: 1729 }], levels);
		expect(clusters).toHaveLength(1);
		expect(clusters[0]!.theme).toBe('Notre vocation à la béatitude');
		expect(clusters[0]!.paragraphs).toEqual(
			Array.from({ length: 1729 - 1716 + 1 }, (_, i) => 1716 + i)
		);
	});

	it('resolves a narrow range to its fine heading, not the coarser article', () => {
		const clusters = clusterCitations([{ from: 1716, to: 1716 }], levels);
		expect(clusters[0]!.theme).toBe('I. Les béatitudes');
	});

	it('groups scattered single-paragraph citations that share a heading, keeps others separate', () => {
		const clusters = clusterCitations(
			[
				{ from: 1716, to: 1716 },
				{ from: 1723, to: 1723 },
				{ from: 1, to: 1 }
			],
			levels
		);
		expect(clusters.map((c) => c.theme).sort()).toEqual(
			["I. La vie de l'homme", 'I. Les béatitudes', 'II. Le désir du bonheur'].sort()
		);
	});

	it('falls back to the chapter title when a range has no fine or article heading', () => {
		const clusters = clusterCitations([{ from: 2700, to: 2750 }], levels);
		expect(clusters[0]!.theme).toBe("La prière de l'Église");
	});

	it('caps the number of clusters, keeping the largest groups', () => {
		const manyScattered = [
			{ from: 1716, to: 1729 },
			{ from: 1, to: 1 },
			{ from: 2700, to: 2700 }
		];
		const clusters = clusterCitations(manyScattered, levels, 2);
		expect(clusters).toHaveLength(2);
		expect(clusters[0]!.paragraphs.length).toBe(14);
		expect(clusters[1]!.paragraphs.length).toBe(1);
	});

	it('formats the refs string as compact CEC ranges', () => {
		const clusters = clusterCitations([{ from: 1716, to: 1729 }], levels);
		expect(clusters[0]!.refs).toBe('1716-1729');
	});

	it("stops a chapter's own headings at its first article", () => {
		// 426 is inside the chapter's intro headings, so it keeps that title.
		expect(clusterCitations([{ from: 427, to: 427 }], levels)[0]!.theme).toBe(
			'Au cœur de la catéchèse : le Christ'
		);
		// 440 is inside an article · it must resolve to that article's fine
		// heading, not to the chapter intro heading that precedes it.
		expect(clusterCitations([{ from: 440, to: 440 }], levels)[0]!.theme).toBe('II. Christ');
	});

	it('resolves a citation in a heading-less article to the article title', () => {
		expect(clusterCitations([{ from: 600, to: 600 }], levels)[0]!.theme).toBe(
			'« Jésus-Christ a souffert sous Ponce Pilate »'
		);
	});

	it('prefers the narrowest containing span when spans overlap', () => {
		const overlapping = buildHeadingLevels({
			parts: [
				{
					title: 'Partie',
					sections: [
						{
							chapters: [
								{
									title: 'Chapitre',
									range: { from: 100, to: 200 },
									headings: [{ title: 'Intro large', paragraph_start: 100 }],
									articles: []
								}
							]
						}
					]
				}
			]
		});
		// The chapter has no articles, so its heading legitimately runs to 200.
		// Splice in a narrower overlapping span to prove the tie-break.
		overlapping.fine.push({ start: 150, end: 160, title: 'Fine étroite' });
		overlapping.fine.sort((a, b) => a.start - b.start);
		expect(clusterCitations([{ from: 155, to: 155 }], overlapping)[0]!.theme).toBe('Fine étroite');
	});

	it('returns an empty array for no citations', () => {
		expect(clusterCitations([], levels)).toEqual([]);
	});
});
