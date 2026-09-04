import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
	BIBLE_REF_CORRECTIONS,
	applyBibleRefCorrections
} from '../../../scripts/prepare/bibleRefCorrections';
import { parseBibleRefText } from '../../../src/lib/utils/bibleRefText';

describe('applyBibleRefCorrections', () => {
	it('rewrites a matching reference and reports it', () => {
		const r = applyBibleRefCorrections(630, [{ text: 'Ac 12:37' }]);
		expect(r.refs).toEqual([{ text: 'Ac 13:37' }]);
		expect(r.applied).toHaveLength(1);
	});

	it('leaves the same text alone in a paragraph the correction does not name', () => {
		const r = applyBibleRefCorrections(631, [{ text: 'Ac 12:37' }]);
		expect(r.refs).toEqual([{ text: 'Ac 12:37' }]);
		expect(r.applied).toEqual([]);
	});

	it('corrects only the listed reference, leaving its neighbours untouched', () => {
		const r = applyBibleRefCorrections(2465, [
			{ text: 'Pr 8:6' },
			{ text: '2 R 7:28' },
			{ text: 'Ps 119:90' }
		]);
		expect(r.refs.map((x) => x.text)).toEqual(['Pr 8:6', '2 S 7:28', 'Ps 119:90']);
	});

	it('passes a paragraph with no corrections through untouched', () => {
		const refs = [{ text: 'Jn 3:16' }];
		expect(applyBibleRefCorrections(1, refs).refs).toBe(refs);
	});
});

const norm = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
const wordSet = (s: string) => new Set(norm(s).split(' ').filter(Boolean));
const cover = (needle: string, hay: string) => {
	const n = [...wordSet(needle)];
	if (n.length === 0) return 0;
	const h = wordSet(hay);
	return n.filter((w) => h.has(w)).length / n.length;
};

/** The Crampon text at a reference, joined across its verse range. */
const at = (ref: string): string => {
	const q = parseBibleRefText(ref);
	if (!q.book || q.chapter === null || q.verse_start === null) return '';
	const path = `static/data/bible/ncl/${q.book}.json`;
	if (!existsSync(path)) return '';
	const b = JSON.parse(readFileSync(path, 'utf8'));
	const to = q.verse_end ?? q.verse_start;
	const out: string[] = [];
	for (let v = q.verse_start; v <= to; v++) {
		const t = b[String(q.chapter)]?.[String(v)];
		if (t) out.push(t);
	}
	return out.join(' ');
};

describe('the correction table itself', () => {
	it('never rewrites one entry into another entry, which would loop', () => {
		const froms = new Set(BIBLE_REF_CORRECTIONS.map((c) => `${c.paragraph}:${c.from}`));
		for (const c of BIBLE_REF_CORRECTIONS) {
			expect(froms.has(`${c.paragraph}:${c.to}`)).toBe(false);
		}
	});

	it('changes something in every entry, and explains itself', () => {
		for (const c of BIBLE_REF_CORRECTIONS) {
			expect(c.from).not.toBe(c.to);
			expect(c.reason.length).toBeGreaterThan(20);
		}
	});

	// The point of the table is that the corrected reference resolves. An entry
	// whose target is as unreachable as its source has fixed nothing.
	it('corrects every reference to a verse that exists in the reader', () => {
		const unresolved: string[] = [];
		for (const c of BIBLE_REF_CORRECTIONS) {
			const p = parseBibleRefText(c.to);
			const path = p.book ? `static/data/bible/ncl/${p.book}.json` : null;
			if (!path || !existsSync(path)) {
				unresolved.push(`${c.to} (book absent)`);
				continue;
			}
			const book = JSON.parse(readFileSync(path, 'utf8'));
			const verse = book[String(p.chapter)]?.[String(p.verse_start)];
			if (!verse) unresolved.push(`${c.to} (verse absent)`);
		}
		expect(unresolved).toEqual([]);
	});

	// And the source must be genuinely broken. A reference that already resolves
	// is not visibly broken, so changing it needs evidence · the paragraph's own
	// words, matching the target and not the source. Without that an entry would
	// be an editorial rewrite, which this table is explicitly not for.
	it('only corrects a resolving reference when a quotation proves it wrong', () => {
		const unjustified: string[] = [];
		for (const c of BIBLE_REF_CORRECTIONS) {
			const p = parseBibleRefText(c.from);
			if (!p.book || p.chapter === null || p.verse_start === null) continue;
			const path = `static/data/bible/ncl/${p.book}.json`;
			if (!existsSync(path)) continue;
			const book = JSON.parse(readFileSync(path, 'utf8'));
			if (!book[String(p.chapter)]?.[String(p.verse_start)]) continue; // did not resolve · fine

			if (!c.quote) {
				unjustified.push(`${c.from} (resolves, but carries no quote)`);
				continue;
			}

			// The quote has to be the paragraph's own words · otherwise any
			// string that happens to sit in the target would "prove" the change.
			const paraPath = `static/data/cec/paragraphs/${c.paragraph}.json`;
			if (existsSync(paraPath)) {
				const para = JSON.parse(readFileSync(paraPath, 'utf8'));
				const text = norm(String(para.text_html ?? '').replace(/<[^>]+>/g, ' '));
				if (cover(c.quote, text) < 0.9) {
					unjustified.push(`${c.from} → ${c.to} (quote is not the paragraph's own words)`);
					continue;
				}
			}

			const toScore = cover(c.quote, at(c.to));
			const fromScore = cover(c.quote, at(c.from));
			if (toScore < 0.8) {
				unjustified.push(`${c.from} → ${c.to} (quote absent from target)`);
				continue;
			}
			if (toScore - fromScore < 0.3) {
				unjustified.push(`${c.from} → ${c.to} (quote fits the source about as well)`);
				continue;
			}

			// A one-word quote is thin on its own · the Catechism has to
			// corroborate it by citing the same passage elsewhere under the
			// target's numbering.
			const words = [
				...new Set(
					norm(c.quote)
						.split(' ')
						.filter((w) => w.length > 3)
				)
			];
			if (words.length < 2) {
				if (c.corroboration === undefined) {
					unjustified.push(
						`${c.from} → ${c.to} (single-word quote with no corroborating paragraph)`
					);
					continue;
				}
				const sibPath = `static/data/cec/paragraphs/${c.corroboration}.json`;
				if (!existsSync(sibPath)) continue;
				const sib = JSON.parse(readFileSync(sibPath, 'utf8'));
				const target = parseBibleRefText(c.to);
				const corroborates = (sib.bible_refs ?? []).some((r: { text: string }) => {
					const q = parseBibleRefText(r.text);
					return q.book === target.book && q.chapter === target.chapter;
				});
				if (!corroborates) {
					unjustified.push(
						`${c.from} → ${c.to} (paragraph ${c.corroboration} does not cite ${target.book} ${target.chapter})`
					);
				}
			}
		}
		expect(unjustified).toEqual([]);
	});
});
