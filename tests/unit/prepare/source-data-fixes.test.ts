import { describe, it, expect } from 'vitest';
import {
	capitalizeFirstWord,
	fixCccParaSourceTypos,
	mergeBibleRefContinuations,
	normalizeGuillemets
} from '../../../scripts/prepare/source-data-fixes';

describe('capitalizeFirstWord', () => {
	it('capitalizes the first letter of plain text', () => {
		expect(capitalizeFirstWord('saint Paul affirme')).toBe('Saint Paul affirme');
	});

	it('skips into the first text inside a leading <span> wrapper', () => {
		expect(capitalizeFirstWord('<span>saint Paul affirme</span>')).toBe(
			'<span>Saint Paul affirme</span>'
		);
	});

	it('skips through multiple opening tags', () => {
		expect(capitalizeFirstWord('<span><i>« saint Paul »</i></span>')).toBe(
			'<span><i>« Saint Paul »</i></span>'
		);
	});

	it('leaves already-capitalized text alone', () => {
		expect(capitalizeFirstWord('<span>Le désir de Dieu</span>')).toBe(
			'<span>Le désir de Dieu</span>'
		);
	});

	it('leaves text starting with a digit alone', () => {
		expect(capitalizeFirstWord('1234')).toBe('1234');
	});

	it('capitalizes after leading guillemets', () => {
		expect(capitalizeFirstWord('« saint Paul »')).toBe('« Saint Paul »');
	});
});

describe('mergeBibleRefContinuations', () => {
	it('inherits book from previous when missing', () => {
		const refs = [{ text: 'Mt 5:33-34' }, { text: '5:37' }];
		expect(mergeBibleRefContinuations(refs)).toEqual([{ text: 'Mt 5:33-34' }, { text: 'Mt 5:37' }]);
	});

	it('handles full books with no continuation', () => {
		const refs = [{ text: 'Mt 5:33' }, { text: 'Lc 6:4' }];
		expect(mergeBibleRefContinuations(refs)).toEqual([{ text: 'Mt 5:33' }, { text: 'Lc 6:4' }]);
	});

	it('passes through a leading entry that itself has no book', () => {
		const refs = [{ text: '5:37' }];
		expect(mergeBibleRefContinuations(refs)).toEqual([{ text: '5:37' }]);
	});
});

describe('normalizeGuillemets', () => {
	it('adds NBSP after opening guillemet missing space', () => {
		expect(normalizeGuillemets('«être tenté»')).toBe('« être tenté »');
	});

	it('replaces regular space after « with NBSP', () => {
		expect(normalizeGuillemets('« être tenté »')).toBe('« être tenté »');
	});

	it('is idempotent on already-correct text', () => {
		const input = '« être tenté »';
		expect(normalizeGuillemets(input)).toBe(input);
	});

	it('handles HTML tags adjacent to guillemets', () => {
		expect(normalizeGuillemets('«<i>être tenté</i>»')).toBe('« <i>être tenté</i> »');
	});

	it('handles only the opening guillemet missing space', () => {
		expect(normalizeGuillemets('«être tenté »')).toBe('« être tenté »');
	});

	it('handles only the closing guillemet missing space', () => {
		expect(normalizeGuillemets('« être tenté»')).toBe('« être tenté »');
	});

	it('handles multiple guillemet pairs in same string', () => {
		expect(normalizeGuillemets('« A» et «B »')).toBe('« A » et « B »');
	});
});

describe('fixCccParaSourceTypos', () => {
	it('renumbers the duplicate §2275 to §2775 when alongside §2774', () => {
		const tree = [
			{
				type: 'part',
				children: [
					{
						type: 'en_bref',
						children: [
							{ type: 'paragraph', number: 2773, text_html: '<span>x</span>' },
							{ type: 'paragraph', number: 2774, text_html: '<span>y</span>' },
							{
								type: 'paragraph',
								number: 2275,
								text_html: '<span>Maître et modèle de notre prière.</span>'
							},
							{ type: 'paragraph', number: 2776, text_html: '<span>z</span>' }
						]
					}
				]
			}
		];
		fixCccParaSourceTypos(tree as Parameters<typeof fixCccParaSourceTypos>[0]);
		const kids = (tree[0] as { children: { children: { number: number; text_html: string }[] }[] })
			.children[0]!.children;
		expect(kids.map((k) => k.number)).toEqual([2773, 2774, 2775, 2776]);
		expect(kids[2]!.text_html).toContain('Maître et Modèle');
	});

	it('leaves the real §2275 untouched (no §2774/§2776 sibling)', () => {
		const tree = [
			{
				type: 'part',
				children: [
					{
						type: 'article',
						children: [
							{ type: 'paragraph', number: 2274, text_html: '<span>a</span>' },
							{ type: 'paragraph', number: 2275, text_html: '<span>b</span>' }
						]
					}
				]
			}
		];
		fixCccParaSourceTypos(tree as Parameters<typeof fixCccParaSourceTypos>[0]);
		const kids = (tree[0] as { children: { children: { number: number }[] }[] }).children[0]!
			.children;
		expect(kids.map((k) => k.number)).toEqual([2274, 2275]);
	});
});
