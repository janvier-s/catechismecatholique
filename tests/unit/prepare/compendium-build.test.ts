import { describe, it, expect } from 'vitest';
import { buildCompendium } from '../../../scripts/prepare/compendium/build';
import type { TocEntry } from '../../../scripts/prepare/compendium/toc';
import type { HtmlEvent } from '../../../scripts/prepare/compendium/html';

const SOURCE_QS = [
	{
		paragraph_number: '1',
		paragraph_question: 'Q1?',
		ccc_refs: ['27'],
		paragraph: 'A1.',
		verses: []
	},
	{
		paragraph_number: '2',
		paragraph_question: 'Q2?',
		ccc_refs: ['28', '29'],
		paragraph: 'A2.',
		verses: ['Mt 1:1']
	},
	{
		paragraph_number: '3',
		paragraph_question: 'Q3?',
		ccc_refs: ['100'],
		paragraph: 'A3.',
		verses: []
	}
];

const TOC: TocEntry[] = [
	{ depth: 2, file: '000.htm', anchor: 'p1', label: 'PART 1' },
	{ depth: 3, file: '000.htm', anchor: 'p10', label: 'SECTION A' },
	{ depth: 2, file: '001.htm', anchor: 'p20', label: 'PART 2' }
];

const FILES: { file: string; events: HtmlEvent[] }[] = [
	{
		file: '000.htm',
		events: [
			{ kind: 'section', anchor: 'p1' },
			{ kind: 'section', anchor: 'p10' },
			{ kind: 'question', number: 1, question: 'Q1?', answer: 'A1.' },
			{ kind: 'question', number: 2, question: 'Q2?', answer: 'A2.' }
		]
	},
	{
		file: '001.htm',
		events: [
			{ kind: 'section', anchor: 'p20' },
			{ kind: 'question', number: 3, question: 'Q3?', answer: 'A3.' }
		]
	}
];

describe('buildCompendium', () => {
	it('groups questions under their part and section', () => {
		const out = buildCompendium({ sourceJson: SOURCE_QS, toc: TOC, files: FILES });
		expect(out.structure.parts).toHaveLength(2);
		expect(out.structure.parts[0]).toMatchObject({ slug: '1-part-1', number: 1, title: 'Part 1' });
		expect(out.structure.parts[0]?.sections[0]?.q_range).toEqual([1, 2]);
		expect(out.structure.parts[1]?.sections[0]?.q_range).toEqual([3, 3]);
	});

	it('emits one bundle per part with ordered flow', () => {
		const out = buildCompendium({ sourceJson: SOURCE_QS, toc: TOC, files: FILES });
		expect(Object.keys(out.parts).sort()).toEqual(['1-part-1', '2-part-2']);
		const flow = out.parts['1-part-1']!.flow;
		expect(flow.map((n) => n.kind)).toEqual(['heading', 'question', 'question']);
	});

	it('builds reverse index ccc -> compendium qs', () => {
		const out = buildCompendium({ sourceJson: SOURCE_QS, toc: TOC, files: FILES });
		expect(out.citedBy[27]).toEqual([1]);
		expect(out.citedBy[28]).toEqual([2]);
		expect(out.citedBy[100]).toEqual([3]);
	});

	it('emits q-ranges aligned to parts', () => {
		const out = buildCompendium({ sourceJson: SOURCE_QS, toc: TOC, files: FILES });
		expect(out.qRanges).toEqual([
			{ part: '1-part-1', from: 1, to: 2 },
			{ part: '2-part-2', from: 3, to: 3 }
		]);
	});

	it('parses bible refs from source verses field', () => {
		const out = buildCompendium({ sourceJson: SOURCE_QS, toc: TOC, files: FILES });
		const q2 = out.parts['1-part-1']!.flow.find(
			(n) => n.kind === 'question' && n.data.number === 2
		);
		expect(q2 && q2.kind === 'question' && q2.data.bible_refs[0]?.text).toBe('Mt 1:1');
	});

	it('throws if a question in source JSON has no matching HTML event', () => {
		const bad = SOURCE_QS.concat([
			{ paragraph_number: '99', paragraph_question: '?', ccc_refs: [], paragraph: '.', verses: [] }
		]);
		expect(() => buildCompendium({ sourceJson: bad, toc: TOC, files: FILES })).toThrow(/Q99/);
	});
});
