import { describe, it, expect } from 'vitest';
import { extractEnBref, trimEnBrefsAtParagrapheBoundaries } from '../../../scripts/prepare/enbref';

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
		const result = extractEnBref(fixture as Parameters<typeof extractEnBref>[0]);
		expect(result).toHaveLength(1);
		expect(result[0]!.parent_kind).toBe('chapter');
		expect(result[0]!.parent_slug).toBe('z');
		expect(result[0]!.paragraphs).toEqual([44, 45]);
	});

	it('attaches en_bref blocks to the section when no chapter wraps them', () => {
		// The Décalogue's §§2075-2082 sit at section level — between the
		// section's intro and its chapters.
		const fixture = [
			{
				type: 'part',
				title: 'TROISIÈME PARTIE',
				children: [
					{
						type: 'section',
						title: 'DEUXIÈME SECTION : Les dix commandements',
						children: [
							{ type: 'paragraph', number: 2052 },
							{
								type: 'en_bref',
								children: [
									{ type: 'paragraph', number: 2075 },
									{ type: 'paragraph', number: 2082 }
								]
							}
						]
					}
				]
			}
		];
		const result = extractEnBref(fixture as Parameters<typeof extractEnBref>[0]);
		expect(result).toHaveLength(1);
		expect(result[0]!.parent_kind).toBe('section');
		expect(result[0]!.parent_slug).toBe('les-dix-commandements');
		expect(result[0]!.paragraphs).toEqual([2075, 2082]);
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
		const result = extractEnBref(fixture as Parameters<typeof extractEnBref>[0]);
		expect(result).toHaveLength(1);
		expect(result[0]!.parent_kind).toBe('chapter');
		expect(result[0]!.paragraphs).toEqual([99]);
	});
});

describe('trimEnBrefsAtParagrapheBoundaries', () => {
	// Real-world bug: the upstream tree concatenates the en_bref of "Paragraphe
	// 2. Le Père" (§§261-267) with the regular content of "Paragraphe 3. Le
	// Tout-Puissant" (§§268-274) into a single 261-274 block. Trimming should
	// cut the block at the next Paragraphe's start so only the actual summary
	// lines stay inside the En Bref box.
	it('trims a block that spills past the next Paragraphe boundary', () => {
		const blocks = [
			{
				parent_kind: 'chapter' as const,
				parent_slug: 'je-crois-en-dieu-le-pere',
				paragraphs: [261, 262, 263, 264, 265, 266, 267, 268, 269, 270]
			}
		];
		const paragraphes = [
			{ number: 2, title: 'Le Père', paragraph_start: 232 },
			{ number: 3, title: 'Le Tout-Puissant', paragraph_start: 268 }
		];
		const result = trimEnBrefsAtParagrapheBoundaries(blocks, paragraphes);
		expect(result[0]!.paragraphs).toEqual([261, 262, 263, 264, 265, 266, 267]);
	});

	it('leaves blocks unchanged when no next Paragraphe boundary follows', () => {
		const blocks = [
			{
				parent_kind: 'chapter' as const,
				parent_slug: 'x',
				paragraphs: [500, 501, 502]
			}
		];
		const paragraphes = [{ number: 1, title: 'P1', paragraph_start: 232 }];
		const result = trimEnBrefsAtParagrapheBoundaries(blocks, paragraphes);
		expect(result[0]!.paragraphs).toEqual([500, 501, 502]);
	});

	it('leaves blocks unchanged when the boundary lies after the block', () => {
		const blocks = [
			{
				parent_kind: 'chapter' as const,
				parent_slug: 'x',
				paragraphs: [261, 262, 263]
			}
		];
		const paragraphes = [
			{ number: 1, title: 'P1', paragraph_start: 232 },
			{ number: 2, title: 'P2', paragraph_start: 500 }
		];
		const result = trimEnBrefsAtParagrapheBoundaries(blocks, paragraphes);
		expect(result[0]!.paragraphs).toEqual([261, 262, 263]);
	});
});
