import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveToCrampon } from '../../../src/lib/utils/versification';

describe('resolveToCrampon', () => {
	it('leaves alone the references where the two numberings agree', () => {
		expect(resolveToCrampon('JHN', 3, 16)).toBeNull();
		expect(resolveToCrampon('DEU', 6, 5)).toBeNull();
		// Same book and chapter as a rule, but before the divergence starts.
		expect(resolveToCrampon('DEU', 5, 16)).toBeNull();
		expect(resolveToCrampon('EST', 4, 16)).toBeNull();
	});

	it('folds the four short commandments onto Crampon 5:17', () => {
		for (const v of [17, 18, 19, 20]) {
			expect(resolveToCrampon('DEU', 5, v)).toMatchObject({ chapter: 5, verseStart: 17 });
		}
	});

	it('shifts the verses after the merge back by three', () => {
		expect(resolveToCrampon('DEU', 5, 21)).toMatchObject({ verseStart: 18, verseEnd: 18 });
		expect(resolveToCrampon('DEU', 5, 22)).toMatchObject({ verseStart: 19, verseEnd: 19 });
		expect(resolveToCrampon('DEU', 5, 23)).toMatchObject({ verseStart: 20 });
	});

	it('maps a range spanning the merge, from its start to its end', () => {
		// The Catechism's Dt 5:6-22 is Crampon 5:6-19.
		expect(resolveToCrampon('DEU', 5, 6, 22)).toMatchObject({
			chapter: 5,
			verseStart: 6,
			verseEnd: 19
		});
	});

	it('moves the prayer of Mardochée to its own chapter', () => {
		expect(resolveToCrampon('EST', 4, 17)).toMatchObject({
			chapter: 13,
			verseStart: 9,
			verseEnd: 11
		});
	});

	it('carries a reason a reader could be shown', () => {
		expect(resolveToCrampon('DEU', 5, 22)!.reason).toMatch(/three verses earlier/);
	});
});

describe('the rules against the shipped Crampon text', () => {
	const deu = JSON.parse(readFileSync('static/data/bible/ncl/DEU.json', 'utf8'));
	const est = JSON.parse(readFileSync('static/data/bible/ncl/EST.json', 'utf8'));

	it('lands Dt 5:22 on "Telles sont les paroles"', () => {
		const a = resolveToCrampon('DEU', 5, 22)!;
		expect(deu[String(a.chapter)][String(a.verseStart)]).toMatch(/Telles sont les paroles/);
	});

	it('lands Dt 5:19 on the commandment against theft', () => {
		const a = resolveToCrampon('DEU', 5, 19)!;
		expect(deu[String(a.chapter)][String(a.verseStart)]).toMatch(/ne déroberas pas/);
	});

	it('lands Est 4:17 on the prayer, not on Mardochée leaving', () => {
		const a = resolveToCrampon('EST', 4, 17)!;
		const text = est[String(a.chapter)][String(a.verseStart)];
		expect(text).toMatch(/tout-puissant/i);
		expect(est['4']['17']).toMatch(/Mardochée s’en alla/);
	});

	it('every rule points at verses the edition actually has', () => {
		for (const book of ['DEU', 'EST'] as const) {
			const data = book === 'DEU' ? deu : est;
			const chapter = book === 'DEU' ? 5 : 4;
			for (let v = 1; v <= 33; v++) {
				const a = resolveToCrampon(book, chapter, v);
				if (!a) continue;
				expect(data[String(a.chapter)]?.[String(a.verseStart)]).toBeTypeOf('string');
			}
		}
	});
});
