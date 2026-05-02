import { describe, it, expect } from 'vitest';
import { extractParagraphs } from '../../../scripts/prepare/paragraphs';

describe('extractParagraphs', () => {
	it('flattens all paragraphs with metadata', () => {
		const fixture = [
			{
				type: 'part',
				title: 'A',
				children: [
					{
						type: 'paragraph',
						number: 1,
						text_html: '<span>x</span>',
						cross_refs: ['2'],
						bible_refs: [{ text: 'Mt 1:1' }],
						citations: []
					},
					{
						type: 'chapter',
						title: 'B',
						children: [
							{
								type: 'paragraph',
								number: 2,
								text_html: '<span>y</span>',
								cross_refs: [],
								bible_refs: [],
								citations: [],
								refs: [{ type: 'magisterial', raw: 'GS 19', idx: 'a' }]
							}
						]
					}
				]
			}
		];
		const result = extractParagraphs(fixture as any);
		expect(result.size).toBe(2);
		expect(result.get(1)?.cross_refs).toEqual(['2']);
		expect(result.get(2)?.magisterial_refs[0]?.raw).toBe('GS 19');
	});
});
