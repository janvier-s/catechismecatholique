import { describe, it, expect } from 'vitest';
import { extractParagraphs, splitCrossRefs } from '../../../scripts/prepare/paragraphs';

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
		const result = extractParagraphs(fixture as Parameters<typeof extractParagraphs>[0]);
		expect(result.size).toBe(2);
		expect(result.get(1)?.cross_refs).toEqual(['2']);
		expect(result.get(2)?.magisterial_refs[0]?.raw).toBe('GS 19');
	});

	it('propagates marker_idx for consecutive bibleRef sups (§1021 case)', () => {
		const sup = (idx: number) => `<sup class="srcRef bibleRef" data-idx="${idx}">${idx}</sup>`;
		const html = `<span>texte ${sup(4)}${sup(5)}${sup(6)}${sup(7)} parlent.</span>`;
		const fixture = [
			{
				type: 'part',
				children: [
					{
						type: 'paragraph',
						number: 1021,
						text_html: html,
						cross_refs: [],
						bible_refs: [
							{ text: '2 Co 5:8' },
							{ text: 'Ph 1:23' },
							{ text: 'He 9:27' },
							{ text: 'He 12:23' }
						],
						citations: [],
						refs: [
							{ type: 'bible', raw: 'voir 2 Co 5:8', idx: 4 },
							{ type: 'bible', raw: 'Ph 1:23', idx: 5 },
							{ type: 'bible', raw: 'He 9:27', idx: 6 },
							{ type: 'bible_continuation', raw: '12:23', idx: 7 }
						]
					}
				]
			}
		];
		const result = extractParagraphs(fixture as Parameters<typeof extractParagraphs>[0]);
		const p = result.get(1021);
		// Surviving sup is renumbered to 1 (only bibleRef sup left in the paragraph).
		expect(p?.text_html).toBe(
			`<span>Texte <sup class="srcRef bibleRef" data-idx="4">1</sup> parlent.</span>`
		);
		expect(p?.magisterial_refs.map((r) => r.marker_idx)).toEqual([undefined, 4, 4, 4]);
		expect(p?.magisterial_refs.map((r) => r.display_idx)).toEqual([1, 1, 1, 1]);
	});
});

describe('splitCrossRefs', () => {
	it('leaves a plain reference alone', () => {
		expect(splitCrossRefs(['2613', '2736'])).toEqual(['2613', '2736']);
	});

	// The source writes a pair of renvois as one marker. Consumers parseInt the
	// value, so an unsplit "1656-2658" resolves to 1656 and silently loses 2658.
	it('splits a hyphenated pair into two references', () => {
		expect(splitCrossRefs(['1656-2658'])).toEqual(['1656', '2658']);
	});

	it('does not expand the span between the two numbers', () => {
		expect(splitCrossRefs(['512-560'])).toEqual(['512', '560']);
	});

	it('splits an adjacent pair too', () => {
		expect(splitCrossRefs(['2676-2677'])).toEqual(['2676', '2677']);
	});

	it('preserves order and mixes split and plain values', () => {
		expect(splitCrossRefs(['722', '2676-2677', '146'])).toEqual(['722', '2676', '2677', '146']);
	});

	it('passes anything that is not a hyphenated pair straight through', () => {
		expect(splitCrossRefs(['', 'abc', '12-', '-12', '1-2-3'])).toEqual([
			'',
			'abc',
			'12-',
			'-12',
			'1-2-3'
		]);
	});
});
