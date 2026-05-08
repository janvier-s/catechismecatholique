import { describe, it, expect } from 'vitest';
import { buildSearchIndex } from '../../../scripts/prepare/search-index';

describe('buildSearchIndex', () => {
	it('indexes paragraphs and headings', () => {
		const paragraphs = [
			{ number: 27, text_html: '<p>Le désir de Dieu</p>' },
			{ number: 28, text_html: '<p>Toujours et partout</p>' }
		];
		const chapters = [
			{
				slug: 'lhomme-est-capax-dei',
				title: "L'homme est capable de Dieu",
				paragraphs: [27, 28],
				headings: [{ id: 'le-desir', title: 'Le désir de Dieu', paragraph_start: 27, level: 2 }],
				articles: []
			}
		];
		const ctxs = {
			27: {
				part: { slug: 'foi', title: 'La profession de la foi' },
				chapter: { slug: 'lhomme-est-capax-dei', title: "L'homme est capable de Dieu" }
			},
			28: {
				part: { slug: 'foi', title: 'La profession de la foi' },
				chapter: { slug: 'lhomme-est-capax-dei', title: "L'homme est capable de Dieu" }
			}
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = buildSearchIndex(paragraphs as any, chapters as any, ctxs as any);
		const docs = result.documents;
		expect(docs.length).toBe(3); // 2 paragraphs + 1 heading
		const p27 = docs.find((d) => d.id === 'p:27')!;
		expect(p27.kind).toBe('paragraph');
		expect(p27.text).toContain('désir de Dieu');
		const h = docs.find((d) => d.id.startsWith('h:'))!;
		expect(h.kind).toBe('heading');
		expect(h.text).toBe('Le désir de Dieu');
		// Serialized index payload
		expect(typeof result.serialized).toBe('string');
		expect(result.serialized.length).toBeGreaterThan(50);
	});

	it('indexes compendium questions when provided', () => {
		const out = buildSearchIndex([], [], {}, [
			{
				number: 1,
				question: 'Quel est le dessein de Dieu',
				answer: 'Dieu a créé',
				partSlug: '1-profession-de-la-foi'
			}
		]);
		const cdoc = out.documents.find((d) => d.id === 'c:1');
		expect(cdoc).toMatchObject({
			kind: 'compendium-question',
			number: 1,
			corpus: 'compendium',
			compendium_part: '1-profession-de-la-foi'
		});
	});
});
