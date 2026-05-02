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
		const result = buildStructure(fixture as any);
		expect(result.parts).toHaveLength(2);
		expect(result.parts[0]!.slug).toBe('prologue');
		expect(result.parts[1]!.slug).toMatch(/profession/);
	});

	it('builds chapter slugs that strip "CHAPITRE PREMIER" prefix', () => {
		const result = buildStructure(fixture as any);
		const part = result.parts[1]!;
		const chapter = part.sections[0]!.chapters[0]!;
		expect(chapter.slug).toBe('lhomme-est-capable-de-dieu');
	});

	it('records paragraph numbers per chapter', () => {
		const result = buildStructure(fixture as any);
		const chapter = result.parts[1]!.sections[0]!.chapters[0]!;
		expect(chapter.paragraphs).toContain(27);
	});

	it('throws on slug collision within parent', () => {
		const colliding = [
			{ type: 'part', title: 'A', children: [] },
			{ type: 'part', title: 'A', children: [] }
		];
		expect(() => buildStructure(colliding as any)).toThrow(/Slug collision/);
	});
});
