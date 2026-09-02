import { describe, it, expect } from 'vitest';
import { trimStructure } from '$lib/server/api/structureDepth';

const TOC = {
	corpus: 'ccc',
	parts: [
		{
			slug: 'prologue',
			title: 'Prologue',
			range: { from: 1, to: 25 },
			sections: [
				{
					slug: 's1',
					title: 'Section 1',
					chapters: [{ slug: 'c1', title: 'Chapitre 1', articles: [{ slug: 'a1' }] }]
				}
			]
		}
	]
};

describe('trimStructure', () => {
	it('depth 1 keeps parts without their sections', () => {
		const out = trimStructure(TOC, 1) as { parts: Record<string, unknown>[] };
		expect(out.parts[0]!.slug).toBe('prologue');
		expect(out.parts[0]!.title).toBe('Prologue');
		expect(out.parts[0]!.sections).toBeUndefined();
	});

	it('depth 2 keeps sections without their chapters', () => {
		const out = trimStructure(TOC, 2) as {
			parts: { sections: Record<string, unknown>[] }[];
		};
		expect(out.parts[0]!.sections[0]!.slug).toBe('s1');
		expect(out.parts[0]!.sections[0]!.chapters).toBeUndefined();
	});

	it('depth 3 keeps chapters without their articles', () => {
		const out = trimStructure(TOC, 3) as {
			parts: { sections: { chapters: Record<string, unknown>[] }[] }[];
		};
		expect(out.parts[0]!.sections[0]!.chapters[0]!.slug).toBe('c1');
		expect(out.parts[0]!.sections[0]!.chapters[0]!.articles).toBeUndefined();
	});

	it('depth 4 keeps the whole tree, articles included', () => {
		const out = trimStructure(TOC, 4) as {
			parts: { sections: { chapters: { articles: unknown[] }[] }[] }[];
		};
		expect(out.parts[0]!.sections[0]!.chapters[0]!.articles).toEqual([{ slug: 'a1' }]);
	});

	it('depth 0 returns the tree untouched', () => {
		expect(trimStructure(TOC, 0)).toEqual(TOC);
	});

	it('preserves non-tree top-level fields', () => {
		const out = trimStructure(TOC, 1) as { corpus: string };
		expect(out.corpus).toBe('ccc');
	});

	it('does not mutate the input', () => {
		const before = JSON.stringify(TOC);
		trimStructure(TOC, 1);
		trimStructure(TOC, 2);
		expect(JSON.stringify(TOC)).toBe(before);
	});
});
