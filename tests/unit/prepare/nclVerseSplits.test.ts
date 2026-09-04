import { describe, it, expect } from 'vitest';
import {
	NCL_VERSE_SPLITS,
	applyVerseSplits,
	applyVerseSplitsToParagraphs
} from '../../../scripts/prepare/nclVerseSplits';
import type { ChapterBlocks } from '../../../scripts/prepare/ncl-paragraphs';

const MRK_440 =
	'Et il leur dit : « Pourquoi êtes-vous effrayés ? N’avez-vous pas encore la foi ? » ' +
	'Et ils furent saisis d’une grande crainte, et ils se disaient l’un à l’autre : ' +
	'« Qui donc est celui-ci, que le vent et la mer lui obéissent ? »';

const split = NCL_VERSE_SPLITS[0]!;

describe('applyVerseSplits', () => {
	it('moves the tail onto the empty verse number', () => {
		const bible: Record<string, Record<string, Record<string, string>>> = {
			MRK: { '4': { '39': 'un grand calme.', '40': MRK_440 } }
		};
		applyVerseSplits(bible);
		expect(bible['MRK']!['4']!['40']).toBe(
			'Et il leur dit : « Pourquoi êtes-vous effrayés ? N’avez-vous pas encore la foi ? »'
		);
		expect(bible['MRK']!['4']!['41']).toMatch(/^Et ils furent saisis d’une grande crainte/);
		expect(bible['MRK']!['4']!['41']!.endsWith('obéissent ? »')).toBe(true);
		// Verse 39 is untouched.
		expect(bible['MRK']!['4']!['39']).toBe('un grand calme.');
	});

	it('refuses to split when the target verse already has text', () => {
		const bible: Record<string, Record<string, Record<string, string>>> = {
			MRK: { '4': { '40': MRK_440, '41': 'already here' } }
		};
		expect(() => applyVerseSplits(bible)).toThrow(/already has text/);
	});

	it('refuses to split when the marker is absent', () => {
		const bible: Record<string, Record<string, Record<string, string>>> = {
			MRK: { '4': { '40': 'Et il leur dit : « Pourquoi êtes-vous effrayés ? »' } }
		};
		expect(() => applyVerseSplits(bible)).toThrow(/does not contain/);
	});

	it('refuses to split when the marker is ambiguous', () => {
		const bible: Record<string, Record<string, Record<string, string>>> = {
			MRK: { '4': { '40': `${split.splitBefore} … ${split.splitBefore} …` } }
		};
		expect(() => applyVerseSplits(bible)).toThrow(/more than once/);
	});

	it('refuses to split when the chapter was never parsed', () => {
		expect(() => applyVerseSplits({})).toThrow(/not parsed/);
	});
});

describe('applyVerseSplitsToParagraphs', () => {
	it('inserts the new verse after its source, in the same block', () => {
		const paragraphs: Record<string, Record<string, ChapterBlocks>> = {
			MRK: {
				'4': {
					blocks: [
						{
							kind: 'prose',
							verses: [
								{ v: 39, html: 'un grand calme.' },
								{ v: 40, html: MRK_440 }
							]
						}
					]
				}
			}
		};
		applyVerseSplitsToParagraphs(paragraphs);
		const verses = paragraphs['MRK']!['4']!.blocks[0]!.verses;
		expect(verses.map((v) => v.v)).toEqual([39, 40, 41]);
		expect(verses[1]!.html.endsWith('N’avez-vous pas encore la foi ? »')).toBe(true);
		expect(verses[2]!.html).toMatch(/^Et ils furent saisis/);
	});

	it('throws when the verse is in no block', () => {
		const paragraphs: Record<string, Record<string, ChapterBlocks>> = {
			MRK: { '4': { blocks: [{ kind: 'prose', verses: [{ v: 39, html: 'x' }] }] } }
		};
		expect(() => applyVerseSplitsToParagraphs(paragraphs)).toThrow(/not found in blocks/);
	});
});
