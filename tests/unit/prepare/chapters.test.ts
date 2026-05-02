import { describe, it, expect } from 'vitest';
import { buildChapterFiles } from '../../../scripts/prepare/chapters';
import { buildStructure } from '../../../scripts/prepare/structure';

describe('buildChapterFiles', () => {
	const minimal = [
		{
			type: 'part',
			title: 'PREMIÈRE PARTIE: TEST',
			children: [
				{
					type: 'section',
					title: 'PREMIÈRE SECTION: ALPHA',
					children: [
						{
							type: 'chapter',
							title: 'Chapitre-A',
							children: [
								{ type: 'heading', title: 'I. Un', children: [{ type: 'paragraph', number: 1, text_html: '', cross_refs: [], bible_refs: [], citations: [] }] },
								{ type: 'heading', title: 'II. Deux', children: [{ type: 'paragraph', number: 2, text_html: '', cross_refs: [], bible_refs: [], citations: [] }] }
							]
						},
						{
							type: 'chapter',
							title: 'Chapitre-B',
							children: [
								{ type: 'paragraph', number: 3, text_html: '', cross_refs: [], bible_refs: [], citations: [] }
							]
						}
					]
				}
			]
		}
	];

	it('generates one record per chapter with prev/next links', () => {
		const structure = buildStructure(minimal as any);
		const chapters = buildChapterFiles(structure);
		const names = chapters.map((c) => c.slug);
		expect(names).toEqual(['chapitre-a', 'chapitre-b']);
		expect(chapters[0]!.next?.slug).toBe('chapitre-b');
		expect(chapters[0]!.prev).toBeUndefined();
		expect(chapters[1]!.prev?.slug).toBe('chapitre-a');
	});

	it('records headings with paragraph_start', () => {
		const structure = buildStructure(minimal as any);
		const chapters = buildChapterFiles(structure);
		expect(chapters[0]!.headings).toHaveLength(2);
		expect(chapters[0]!.headings[0]!.paragraph_start).toBe(1);
	});
});
