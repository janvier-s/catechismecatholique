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
								{
									type: 'heading',
									title: 'I. Un',
									children: [
										{
											type: 'paragraph',
											number: 1,
											text_html: '',
											cross_refs: [],
											bible_refs: [],
											citations: []
										}
									]
								},
								{
									type: 'heading',
									title: 'II. Deux',
									children: [
										{
											type: 'paragraph',
											number: 2,
											text_html: '',
											cross_refs: [],
											bible_refs: [],
											citations: []
										}
									]
								}
							]
						},
						{
							type: 'chapter',
							title: 'Chapitre-B',
							children: [
								{
									type: 'paragraph',
									number: 3,
									text_html: '',
									cross_refs: [],
									bible_refs: [],
									citations: []
								}
							]
						}
					]
				}
			]
		}
	];

	it('generates one record per chapter with prev/next links', () => {
		const structure = buildStructure(minimal as Parameters<typeof buildStructure>[0]);
		const chapters = buildChapterFiles(structure, []);
		const names = chapters.map((c) => c.slug);
		expect(names).toEqual(['chapitre-a', 'chapitre-b']);
		expect(chapters[0]!.next?.title).toBe('Chapitre-B');
		expect(chapters[0]!.next?.kind).toBe('chapter');
		expect(chapters[0]!.next?.href).toBe('/ccc/test/alpha/chapitre-b');
		expect(chapters[0]!.prev).toBeUndefined();
		expect(chapters[1]!.prev?.title).toBe('Chapitre-A');
		expect(chapters[1]!.prev?.kind).toBe('chapter');
	});

	it('records headings with paragraph_start', () => {
		const structure = buildStructure(minimal as Parameters<typeof buildStructure>[0]);
		const chapters = buildChapterFiles(structure, []);
		expect(chapters[0]!.headings).toHaveLength(2);
		expect(chapters[0]!.headings[0]!.paragraph_start).toBe(1);
	});

	describe('cross-boundary adjacency', () => {
		// Two sections in one part. Section 2 has intro paragraphs. The last
		// chapter of Section 1 should link to the SECTION page (not the next
		// chapter directly) so the linear reader doesn't skip the intro.
		const fixture = [
			{
				type: 'part',
				title: 'PREMIÈRE PARTIE : TEST',
				children: [
					{
						type: 'section',
						title: 'PREMIÈRE SECTION : ALPHA',
						children: [
							{
								type: 'chapter',
								title: 'Chap-A',
								children: [
									{
										type: 'paragraph',
										number: 1,
										text_html: '',
										cross_refs: [],
										bible_refs: [],
										citations: []
									}
								]
							}
						]
					},
					{
						type: 'section',
						title: 'DEUXIÈME SECTION : BETA',
						children: [
							// Section-direct paragraph — becomes intro_paragraphs for BETA.
							{
								type: 'paragraph',
								number: 50,
								text_html: '',
								cross_refs: [],
								bible_refs: [],
								citations: []
							},
							{
								type: 'chapter',
								title: 'Chap-B',
								children: [
									{
										type: 'paragraph',
										number: 100,
										text_html: '',
										cross_refs: [],
										bible_refs: [],
										citations: []
									}
								]
							}
						]
					}
				]
			}
		];

		it("routes through the section page when the next chapter's section has intro paragraphs", () => {
			const structure = buildStructure(fixture as Parameters<typeof buildStructure>[0]);
			const chapters = buildChapterFiles(structure, []);
			const chapA = chapters.find((c) => c.slug === 'chap-a')!;
			expect(chapA.next?.kind).toBe('section');
			expect(chapA.next?.href).toBe('/ccc/test/beta');
			expect(chapA.next?.title).toBe('Beta');
		});

		it('routes the prev link through the section page in the reverse direction', () => {
			const structure = buildStructure(fixture as Parameters<typeof buildStructure>[0]);
			const chapters = buildChapterFiles(structure, []);
			const chapB = chapters.find((c) => c.slug === 'chap-b')!;
			// chap-b's section IS the one with intro paragraphs, but the PREV
			// chapter (chap-a) lives in another section without an intro.
			// chap-b's prev points back to chap-a as a normal chapter link.
			expect(chapB.prev?.kind).toBe('chapter');
			expect(chapB.prev?.href).toBe('/ccc/test/alpha/chap-a');
		});

		it('routes through the part page when crossing parts AND target part has intro', () => {
			const partIntroFixture = [
				{
					type: 'part',
					title: 'PREMIÈRE PARTIE : ONE',
					children: [
						{
							type: 'section',
							title: 'PREMIÈRE SECTION : S1',
							children: [
								{
									type: 'chapter',
									title: 'Chap-A',
									children: [
										{
											type: 'paragraph',
											number: 1,
											text_html: '',
											cross_refs: [],
											bible_refs: [],
											citations: []
										}
									]
								}
							]
						}
					]
				},
				{
					type: 'part',
					title: 'DEUXIÈME PARTIE : TWO',
					children: [
						// Part-direct paragraph — becomes part-level intro_paragraphs.
						{
							type: 'paragraph',
							number: 1066,
							text_html: '',
							cross_refs: [],
							bible_refs: [],
							citations: []
						},
						{
							type: 'section',
							title: 'PREMIÈRE SECTION : S2',
							children: [
								{
									type: 'chapter',
									title: 'Chap-B',
									children: [
										{
											type: 'paragraph',
											number: 1100,
											text_html: '',
											cross_refs: [],
											bible_refs: [],
											citations: []
										}
									]
								}
							]
						}
					]
				}
			];
			const structure = buildStructure(partIntroFixture as Parameters<typeof buildStructure>[0]);
			const chapters = buildChapterFiles(structure, []);
			const chapA = chapters.find((c) => c.slug === 'chap-a')!;
			expect(chapA.next?.kind).toBe('part');
			expect(chapA.next?.href).toBe('/ccc/two');
			expect(chapA.next?.title).toBe('Two');
		});
	});
});
