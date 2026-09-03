import { describe, it, expect } from 'vitest';
import { apiCitations, textFull } from '$lib/server/api/paragraphShape';
import type { Paragraph } from '$lib/data/types';

function paragraph(text_html: string, citations: string[] = []): Paragraph {
	return {
		corpus: 'ccc',
		number: 302,
		text_html,
		cross_refs: [],
		bible_refs: [],
		citations: citations.map((c) => ({ text_html: c })),
		magisterial_refs: []
	};
}

const PROSE = '<span>Nous appelons divine providence les dispositions :</span>';
const QUOTE = '<span>Dieu garde et gouverne <sup data-idx="1">1</sup>, par sa providence.</span>';

describe('apiCitations', () => {
	// The rule the rest of the API follows: every *_html field has a plain twin.
	// Citations shipped only the HTML, so a plain-text client had no way in.
	it('gives each citation a plain twin of its html', () => {
		expect(apiCitations(paragraph(PROSE, [QUOTE]))).toEqual([
			{ text_html: QUOTE, text: 'Dieu garde et gouverne, par sa providence.' }
		]);
	});

	it('returns an empty list when the paragraph quotes nothing', () => {
		expect(apiCitations(paragraph(PROSE))).toEqual([]);
	});

	it('preserves the order the citations are stored in', () => {
		const p = paragraph(PROSE, ['<span>Premier</span>', '<span>Second</span>']);
		expect(apiCitations(p).map((c) => c.text)).toEqual(['Premier', 'Second']);
	});
});

describe('textFull', () => {
	// 2513 of 2865 paragraphs quote nothing · they must not carry a second copy
	// of `text` for no reason, and its absence is the signal that there is
	// nothing quoted.
	it('is null when the paragraph quotes nothing, so the key can be omitted', () => {
		expect(textFull(paragraph(PROSE))).toBeNull();
	});

	// 307 paragraphs end on a colon the quotation completes · joined with a
	// blank line because they are separate blocks, which is the only way plain
	// text can carry that boundary.
	it('joins the prose and the quotation with a blank line', () => {
		expect(textFull(paragraph(PROSE, [QUOTE]))).toBe(
			'Nous appelons divine providence les dispositions :\n\nDieu garde et gouverne, par sa providence.'
		);
	});

	it('keeps every quotation when a paragraph carries more than one', () => {
		const p = paragraph(PROSE, ['<span>Premier</span>', '<span>Second</span>']);
		expect(textFull(p)).toBe(
			'Nous appelons divine providence les dispositions :\n\nPremier\n\nSecond'
		);
	});
});

// apiCitations runs over every paragraph of a 50-item batch. A shard without
// the field would throw, and the caller's catch would drop the whole paragraph
// rather than serve it without its quotations · degrade, don't disappear.
describe('a paragraph shard with no citations field', () => {
	const legacy = { corpus: 'ccc', number: 302, text_html: PROSE } as unknown as Paragraph;

	it('reads as quoting nothing rather than throwing', () => {
		expect(apiCitations(legacy)).toEqual([]);
	});

	it('has no joined passage rather than throwing', () => {
		expect(textFull(legacy)).toBeNull();
	});
});
