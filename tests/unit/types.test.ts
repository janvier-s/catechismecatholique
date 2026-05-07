import { describe, it, expect } from 'vitest';
import type { Paragraph, Corpus, CompendiumQuestion, CompendiumPart } from '$lib/data/types';

describe('data types', () => {
	it('Paragraph type compiles', () => {
		const p: Paragraph = {
			corpus: 'ccc',
			number: 27,
			text_html: '<span>...</span>',
			cross_refs: ['355', '1701'],
			bible_refs: [],
			citations: [],
			magisterial_refs: []
		};
		expect(p.corpus).toBe('ccc');
	});
});

describe('Compendium types', () => {
	it('Corpus accepts both ccc and compendium', () => {
		const ccc: Corpus = 'ccc';
		const comp: Corpus = 'compendium';
		expect(ccc).toBe('ccc');
		expect(comp).toBe('compendium');
	});

	it('CompendiumQuestion shape compiles', () => {
		const q: CompendiumQuestion = {
			corpus: 'compendium',
			number: 1,
			question: 'Q?',
			answer_html: '<p>A</p>',
			ccc_refs: [27, 28],
			bible_refs: []
		};
		expect(q.number).toBe(1);
	});

	it('CompendiumPart flow accepts heading, epigraph and question nodes', () => {
		const part: CompendiumPart = {
			slug: 'profession-foi',
			number: 1,
			title: 'La profession de la foi',
			flow: [
				{ kind: 'heading', level: 2, id: 'h1', title: 'H' },
				{ kind: 'epigraph', text: 'quote', attribution: 'St Augustin' },
				{
					kind: 'question',
					data: {
						corpus: 'compendium',
						number: 1,
						question: '?',
						answer_html: '<p>.</p>',
						ccc_refs: [],
						bible_refs: []
					}
				}
			]
		};
		expect(part.flow).toHaveLength(3);
	});
});
