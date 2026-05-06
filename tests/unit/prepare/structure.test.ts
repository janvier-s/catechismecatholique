import { describe, it, expect } from 'vitest';
import { buildStructure } from '../../../scripts/prepare/structure';

describe('buildStructure', () => {
	const fixture = [
		{
			type: 'part',
			title: 'PROLOGUE',
			children: [
				{
					type: 'paragraph',
					number: 1,
					text_html: '<span>Dieu, infiniment Parfait...</span>',
					cross_refs: [],
					bible_refs: [],
					citations: []
				}
			]
		},
		{
			type: 'part',
			title: 'PREMIÈRE PARTIE : LA PROFESSION DE LA FOI',
			children: [
				{
					type: 'section',
					title: 'PREMIÈRE SECTION : « JE CROIS » – « NOUS CROYONS »',
					children: [
						{
							type: 'chapter',
							title: "CHAPITRE PREMIER : L'HOMME EST « CAPABLE » DE DIEU",
							children: [
								{
									type: 'heading',
									title: 'I. Le désir de Dieu',
									children: [
										{
											type: 'paragraph',
											number: 27,
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
			]
		}
	];

	it('produces parts with slugs', () => {
		const result = buildStructure(fixture as Parameters<typeof buildStructure>[0]);
		expect(result.parts).toHaveLength(2);
		expect(result.parts[0]!.slug).toBe('prologue');
		expect(result.parts[1]!.slug).toMatch(/profession/);
	});

	it('builds chapter slugs that strip "CHAPITRE PREMIER" prefix', () => {
		const result = buildStructure(fixture as Parameters<typeof buildStructure>[0]);
		const part = result.parts[1]!;
		const chapter = part.sections[0]!.chapters[0]!;
		expect(chapter.slug).toBe('lhomme-est-capable-de-dieu');
	});

	it('records paragraph numbers per chapter', () => {
		const result = buildStructure(fixture as Parameters<typeof buildStructure>[0]);
		const chapter = result.parts[1]!.sections[0]!.chapters[0]!;
		expect(chapter.paragraphs).toContain(27);
	});

	it('throws on slug collision within parent', () => {
		const colliding = [
			{ type: 'part', title: 'A', children: [] },
			{ type: 'part', title: 'A', children: [] }
		];
		expect(() => buildStructure(colliding as Parameters<typeof buildStructure>[0])).toThrow(
			/Slug collision/
		);
	});

	describe('intro_paragraphs capture', () => {
		// Section 2 of Part 1 has §§185-197 as a "Symboles de la foi" preamble
		// nested under headings ("I. La transmission de la foi") that sit
		// directly under the section, not inside any chapter.
		const sectionIntroFixture = [
			{
				type: 'part',
				title: 'PREMIÈRE PARTIE : LA PROFESSION DE LA FOI',
				children: [
					{
						type: 'section',
						title: 'DEUXIÈME SECTION : SYMBOLES',
						children: [
							{
								type: 'heading',
								title: 'I. La transmission de la foi',
								children: [
									{
										type: 'paragraph',
										number: 185,
										text_html: '',
										cross_refs: [],
										bible_refs: [],
										citations: []
									}
								]
							},
							{
								type: 'chapter',
								title: 'CHAPITRE PREMIER : Je crois en Dieu le Père',
								children: [
									{
										type: 'paragraph',
										number: 198,
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

		it('captures section-level intro paragraphs that sit outside any chapter', () => {
			const result = buildStructure(sectionIntroFixture as Parameters<typeof buildStructure>[0]);
			const section = result.parts[0]!.sections[0]!;
			expect(section.intro_paragraphs).toEqual([185]);
		});

		it('captures section-level intro headings with paragraph_start', () => {
			const result = buildStructure(sectionIntroFixture as Parameters<typeof buildStructure>[0]);
			const section = result.parts[0]!.sections[0]!;
			expect(section.intro_headings).toBeDefined();
			expect(section.intro_headings![0]!.title).toBe('I. La transmission de la foi');
			expect(section.intro_headings![0]!.paragraph_start).toBe(185);
		});

		it('captures the prologue Roman-numeral headings as part-level intro', () => {
			const prologueFixture = [
				{
					type: 'part',
					title: 'PROLOGUE',
					children: [
						{
							type: 'heading',
							title: 'I. La vie de l’homme',
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
							title: 'II. Transmettre la foi',
							children: [
								{
									type: 'paragraph',
									number: 4,
									text_html: '',
									cross_refs: [],
									bible_refs: [],
									citations: []
								}
							]
						}
					]
				}
			];
			const result = buildStructure(prologueFixture as Parameters<typeof buildStructure>[0]);
			const prologue = result.parts[0]!;
			expect(prologue.intro_paragraphs).toEqual([1, 4]);
			expect(prologue.intro_headings).toHaveLength(2);
			expect(prologue.intro_headings![0]!.paragraph_start).toBe(1);
			expect(prologue.intro_headings![1]!.paragraph_start).toBe(4);
		});
	});

	describe('section-level en_bref capture', () => {
		// The Décalogue section has §§2075-2082 as a section-level En Bref
		// block that sits between the section's intro (§§2052-2074) and its
		// "Tu aimeras le Seigneur ton Dieu" / "Tu aimeras ton prochain"
		// chapters. It must be captured separately from intro_paragraphs so
		// the section page can render it as a styled block.
		const decalogueFixture = [
			{
				type: 'part',
				title: 'TROISIÈME PARTIE : LA VIE DANS LE CHRIST',
				children: [
					{
						type: 'section',
						title: 'DEUXIÈME SECTION : LES DIX COMMANDEMENTS',
						children: [
							{
								type: 'paragraph',
								number: 2052,
								text_html: '',
								cross_refs: [],
								bible_refs: [],
								citations: []
							},
							{
								type: 'en_bref',
								children: [
									{
										type: 'paragraph',
										number: 2075,
										text_html: '',
										cross_refs: [],
										bible_refs: [],
										citations: []
									},
									{
										type: 'paragraph',
										number: 2082,
										text_html: '',
										cross_refs: [],
										bible_refs: [],
										citations: []
									}
								]
							},
							{
								type: 'chapter',
								title: 'CHAPITRE PREMIER : Tu aimeras le Seigneur',
								children: [
									{
										type: 'paragraph',
										number: 2083,
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

		it('groups section-level en_bref blocks separately from intro_paragraphs', () => {
			const result = buildStructure(decalogueFixture as Parameters<typeof buildStructure>[0]);
			const section = result.parts[0]!.sections[0]!;
			expect(section.en_brefs).toBeDefined();
			expect(section.en_brefs).toHaveLength(1);
			expect(section.en_brefs![0]!.paragraphs).toEqual([2075, 2082]);
		});

		it('does not include en_bref paragraphs in section.intro_paragraphs', () => {
			const result = buildStructure(decalogueFixture as Parameters<typeof buildStructure>[0]);
			const section = result.parts[0]!.sections[0]!;
			expect(section.intro_paragraphs).toEqual([2052]);
		});

		it('omits en_brefs when section has none', () => {
			const noEnBref = [
				{
					type: 'part',
					title: 'PARTIE',
					children: [
						{
							type: 'section',
							title: 'SECTION',
							children: [
								{
									type: 'chapter',
									title: 'Chap',
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
				}
			];
			const result = buildStructure(noEnBref as Parameters<typeof buildStructure>[0]);
			expect(result.parts[0]!.sections[0]!.en_brefs).toBeUndefined();
		});
	});
});
