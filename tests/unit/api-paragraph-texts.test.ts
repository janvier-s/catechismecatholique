import { describe, it, expect, vi } from 'vitest';
import { MAX_TEXTS, parseTextsInclude, loadParagraphTexts } from '$lib/server/api/paragraphTexts';

const ORIGIN = 'https://catechismecatholique.fr';

/** Serves every paragraph shard, so the cap and ordering cases have data. */
function shardFetcher() {
	return vi.fn(async (input: RequestInfo | URL) => {
		const n = Number(String(input).match(/paragraphs\/(\d+)\.json$/)?.[1]);
		if (!Number.isInteger(n)) return { ok: false, status: 404, json: async () => ({}) };
		return {
			ok: true,
			status: 200,
			json: async () => ({
				corpus: 'ccc',
				number: n,
				text_html: `<span>Paragraphe ${n}</span>`,
				cross_refs: [],
				bible_refs: [],
				citations: [],
				magisterial_refs: []
			})
		};
	}) as unknown as typeof fetch;
}

describe('parseTextsInclude', () => {
	it('treats an absent include as not requested', () => {
		expect(parseTextsInclude(null)).toEqual({ ok: true, texts: false });
	});

	it('treats an empty include as not requested', () => {
		expect(parseTextsInclude('  ')).toEqual({ ok: true, texts: false });
	});

	it('accepts texts', () => {
		expect(parseTextsInclude('texts')).toEqual({ ok: true, texts: true });
	});

	// The CEC block vocabulary is a different namespace · accepting `themes`
	// here would promise data this route never returns.
	it('rejects a CEC study block', () => {
		const r = parseTextsInclude('themes');
		expect(r).toMatchObject({ ok: false, code: 'unknown_include' });
	});

	it('names the accepted value in the error message', () => {
		const r = parseTextsInclude('bogus');
		expect(r.ok === false && r.message).toContain('texts');
	});
});

describe('loadParagraphTexts', () => {
	it('returns the stripped text and a permalink for each number', async () => {
		const r = await loadParagraphTexts([2559], ORIGIN, shardFetcher());
		expect(r).toEqual({
			texts: [
				{
					number: 2559,
					text: 'Paragraphe 2559',
					citations: [],
					permalink: `${ORIGIN}/cec/2559`
				}
			],
			truncated: false
		});
	});

	it('returns nothing for an empty list without fetching', async () => {
		const f = shardFetcher();
		const r = await loadParagraphTexts([], ORIGIN, f);
		expect(r).toEqual({ texts: [], truncated: false });
		expect(f).not.toHaveBeenCalled();
	});

	it('keeps the paragraphs in numeric order', async () => {
		const r = await loadParagraphTexts([444, 219, 706], ORIGIN, shardFetcher());
		expect(r.texts.map((t) => t.number)).toEqual([219, 444, 706]);
	});

	// /api/pericope takes up to 50 references, each resolving to dozens of
	// paragraphs · without a cap one request could fan out to thousands of
	// shard fetches.
	it('caps the list at MAX_TEXTS and says so', async () => {
		const numbers = Array.from({ length: MAX_TEXTS + 10 }, (_, i) => i + 1);
		const f = shardFetcher();
		const r = await loadParagraphTexts(numbers, ORIGIN, f);
		expect(r.texts).toHaveLength(MAX_TEXTS);
		expect(r.truncated).toBe(true);
		expect(f).toHaveBeenCalledTimes(MAX_TEXTS);
	});

	it('keeps the lowest numbers when it truncates', async () => {
		const numbers = Array.from({ length: MAX_TEXTS + 10 }, (_, i) => i + 1);
		const r = await loadParagraphTexts(numbers, ORIGIN, shardFetcher());
		expect(r.texts[r.texts.length - 1]!.number).toBe(MAX_TEXTS);
	});

	// Same failure-isolation contract as assembleBlocks · one missing shard
	// must not cost the caller the other answers. Uses numbers no other case in
	// this file touches: loadParagraph memoises at module level, so a shard
	// already resolved by an earlier test would never reach this double.
	it('skips a shard that fails instead of throwing', async () => {
		const f = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('/paragraphs/2802.json')) {
				return { ok: false, status: 404, json: async () => ({}) };
			}
			return {
				ok: true,
				status: 200,
				json: async () => ({ corpus: 'ccc', number: 2801, text_html: '<span>Bon</span>' })
			};
		}) as unknown as typeof fetch;

		const r = await loadParagraphTexts([2801, 2802], ORIGIN, f);
		expect(r.texts.map((t) => t.number)).toEqual([2801]);
	});
});

describe('loadParagraphTexts citations', () => {
	/** Fresh numbers each time · loadParagraph memoises across cases in a file. */
	function citingFetcher(number: number, citations: string[]) {
		return (async () => ({
			ok: true,
			status: 200,
			json: async () => ({
				corpus: 'ccc',
				number,
				text_html: '<span>Nous appelons divine providence les dispositions :</span>',
				cross_refs: [],
				bible_refs: [],
				citations: citations.map((c) => ({ text_html: c })),
				magisterial_refs: []
			})
		})) as unknown as typeof fetch;
	}

	// 307 paragraphs end on a colon the quotation completes · a client reading
	// only `text` would get a dangling sentence and no way to reach the rest.
	it('carries the quoted sources and the joined passage', async () => {
		const f = citingFetcher(2810, ['<span>Dieu garde et gouverne.</span>']);
		const r = await loadParagraphTexts([2810], ORIGIN, f);

		expect(r.texts[0]).toEqual({
			number: 2810,
			text: 'Nous appelons divine providence les dispositions :',
			citations: [
				{ text_html: '<span>Dieu garde et gouverne.</span>', text: 'Dieu garde et gouverne.' }
			],
			text_full: 'Nous appelons divine providence les dispositions :\n\nDieu garde et gouverne.',
			permalink: `${ORIGIN}/cec/2810`
		});
	});

	it('omits text_full for a paragraph that quotes nothing', async () => {
		const f = citingFetcher(2811, []);
		const r = await loadParagraphTexts([2811], ORIGIN, f);

		expect(r.texts[0]).not.toHaveProperty('text_full');
		expect(r.texts[0]!.citations).toEqual([]);
	});
});
