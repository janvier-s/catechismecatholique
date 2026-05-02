import { describe, it, expect } from 'vitest';
import { extractEnBref } from '../../../scripts/prepare/enbref';

describe('extractEnBref', () => {
	it('finds en_bref blocks under chapters', () => {
		const fixture = [
			{
				type: 'part',
				title: 'X',
				children: [
					{
						type: 'section',
						title: 'Y',
						children: [
							{
								type: 'chapter',
								title: 'Z',
								children: [
									{ type: 'paragraph', number: 1 },
									{
										type: 'en_bref',
										title: 'EN BREF',
										children: [
											{ type: 'paragraph', number: 44 },
											{ type: 'paragraph', number: 45 }
										]
									}
								]
							}
						]
					}
				]
			}
		];
		const result = extractEnBref(fixture as any);
		expect(result).toHaveLength(1);
		expect(result[0]!.parent_kind).toBe('chapter');
		expect(result[0]!.parent_slug).toBe('z');
		expect(result[0]!.paragraphs).toEqual([44, 45]);
	});

	it('finds en_bref blocks nested under articles and headings', () => {
		const fixture = [
			{
				type: 'part',
				title: 'X',
				children: [
					{
						type: 'section',
						title: 'Y',
						children: [
							{
								type: 'chapter',
								title: 'Z',
								children: [
									{
										type: 'article',
										title: 'A',
										children: [
											{
												type: 'heading',
												title: 'H',
												children: [
													{ type: 'paragraph', number: 10 },
													{
														type: 'en_bref',
														children: [{ type: 'paragraph', number: 99 }]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			}
		];
		const result = extractEnBref(fixture as any);
		expect(result).toHaveLength(1);
		expect(result[0]!.parent_kind).toBe('chapter');
		expect(result[0]!.paragraphs).toEqual([99]);
	});
});
