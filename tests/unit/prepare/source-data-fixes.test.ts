import { describe, it, expect } from 'vitest';
import {
	capitalizeFirstWord,
	fixCccParaSourceTypos,
	groupConsecutiveBibleSups,
	mergeBibleRefContinuations,
	normalizeFrenchPunctuationSpacing,
	normalizeGuillemets,
	markVulgateRefs
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

describe('normalizeFrenchPunctuationSpacing', () => {
	it('replaces the regular space before a colon with NBSP', () => {
		expect(normalizeFrenchPunctuationSpacing('texte : suite')).toBe('texte : suite');
	});

	it('replaces the regular space before a semicolon with NBSP', () => {
		expect(normalizeFrenchPunctuationSpacing('texte ; suite')).toBe('texte ; suite');
	});

	it('replaces the regular space before an exclamation mark with NBSP', () => {
		expect(normalizeFrenchPunctuationSpacing('Alléluia !')).toBe('Alléluia !');
	});

	it('replaces the regular space before a question mark with NBSP', () => {
		expect(normalizeFrenchPunctuationSpacing('Pourquoi ?')).toBe('Pourquoi ?');
	});

	it('is idempotent on already-correct text', () => {
		const input = 'texte : suite ; fin ?';
		expect(normalizeFrenchPunctuationSpacing(input)).toBe(input);
	});

	it('leaves punctuation with no preceding space untouched', () => {
		expect(normalizeFrenchPunctuationSpacing('http://example.com')).toBe('http://example.com');
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

describe('groupConsecutiveBibleSups', () => {
	const sup = (idx: number) => `<sup class="srcRef bibleRef" data-idx="${idx}">${idx}</sup>`;
	const cccSup = (n: number) => `<sup class="srcRef cccRef">§${n}</sup>`;

	it('leaves a paragraph with one bibleRef sup unchanged', () => {
		const html = `<span>texte ${sup(1)}.</span>`;
		const refs = [{ type: 'bible' as const, raw: 'voir Mt 5:1', idx: 1 }];
		const result = groupConsecutiveBibleSups({ html, refs });
		expect(result.html).toBe(html);
		expect(result.refs[0]!.display_idx).toBe(1);
		expect(result.refs[0]!.marker_idx).toBeUndefined();
	});

	it('collapses two consecutive sups, marking the second member', () => {
		const html = `<span>texte ${sup(1)}${sup(2)}.</span>`;
		const refs = [
			{ type: 'bible' as const, raw: 'voir 2 Co 5:8', idx: 1 },
			{ type: 'bible' as const, raw: 'Ph 1:23', idx: 2 }
		];
		const result = groupConsecutiveBibleSups({ html, refs });
		expect(result.html).toBe(`<span>texte ${sup(1)}.</span>`);
		expect(result.refs[0]!.marker_idx).toBeUndefined();
		expect(result.refs[0]!.display_idx).toBe(1);
		expect(result.refs[1]!.marker_idx).toBe(1);
		expect(result.refs[1]!.display_idx).toBe(1);
	});

	it('collapses a 4-sup cluster (§1021 case)', () => {
		const html = `<span>${sup(4)}${sup(5)}${sup(6)}${sup(7)} parlent.</span>`;
		const refs = [
			{ type: 'bible' as const, raw: 'voir 2 Co 5:8', idx: 4 },
			{ type: 'bible' as const, raw: 'Ph 1:23', idx: 5 },
			{ type: 'bible' as const, raw: 'He 9:27', idx: 6 },
			{ type: 'bible_continuation' as const, raw: '12:23', idx: 7 }
		];
		const result = groupConsecutiveBibleSups({ html, refs });
		// Surviving leader's inner text is renumbered to 1 (only bibleRef sup left).
		expect(result.html).toBe(
			`<span><sup class="srcRef bibleRef" data-idx="4">1</sup> parlent.</span>`
		);
		expect(result.refs[0]!.marker_idx).toBeUndefined();
		expect(result.refs[0]!.display_idx).toBe(1);
		expect(result.refs[1]!.marker_idx).toBe(4);
		expect(result.refs[1]!.display_idx).toBe(1);
		expect(result.refs[2]!.marker_idx).toBe(4);
		expect(result.refs[2]!.display_idx).toBe(1);
		expect(result.refs[3]!.marker_idx).toBe(4);
		expect(result.refs[3]!.display_idx).toBe(1);
	});

	it('handles two non-adjacent clusters in the same paragraph', () => {
		const html = `<span>A ${sup(1)}${sup(2)}. B ${sup(3)}. C ${sup(4)}${sup(5)}${sup(6)}.</span>`;
		const refs = [
			{ type: 'bible' as const, raw: 'voir Mc 1:1', idx: 1 },
			{ type: 'bible' as const, raw: 'Mc 1:2', idx: 2 },
			{ type: 'bible' as const, raw: 'voir Lc 1:1', idx: 3 },
			{ type: 'bible' as const, raw: 'voir Jn 1:1', idx: 4 },
			{ type: 'bible' as const, raw: 'Jn 1:2', idx: 5 },
			{ type: 'bible' as const, raw: 'Jn 1:3', idx: 6 }
		];
		const result = groupConsecutiveBibleSups({ html, refs });
		// Surviving sups in order: idx=1, idx=3, idx=4 → renumbered 1, 2, 3.
		expect(result.html).toBe(
			`<span>A <sup class="srcRef bibleRef" data-idx="1">1</sup>. B <sup class="srcRef bibleRef" data-idx="3">2</sup>. C <sup class="srcRef bibleRef" data-idx="4">3</sup>.</span>`
		);
		expect(result.refs.map((r) => r.marker_idx)).toEqual([
			undefined,
			1,
			undefined,
			undefined,
			4,
			4
		]);
		// Leader 1 → 1; member 2 inherits 1. Solo 3 → 2. Leader 4 → 3; members 5,6 inherit 3.
		expect(result.refs.map((r) => r.display_idx)).toEqual([1, 1, 2, 3, 3, 3]);
	});

	it('does NOT cluster across a non-bibleRef sup (cccRef breaks the run)', () => {
		const html = `<span>${sup(1)}${cccSup(42)}${sup(2)}.</span>`;
		const refs = [
			{ type: 'bible' as const, raw: 'Mt 1:1', idx: 1 },
			{ type: 'bible' as const, raw: 'Mt 1:2', idx: 2 }
		];
		const result = groupConsecutiveBibleSups({ html, refs });
		expect(result.html).toBe(html);
		expect(result.refs.every((r) => r.marker_idx === undefined)).toBe(true);
		// Both bibleRef sups are renumbered 1, 2 (matching their original idx, no
		// visible change), and display_idx is set on both refs.
		expect(result.refs.map((r) => r.display_idx)).toEqual([1, 2]);
	});

	it('does NOT cluster sups separated by literal text', () => {
		const html = `<span>${sup(1)} et ${sup(2)}.</span>`;
		const refs = [
			{ type: 'bible' as const, raw: 'Mt 1:1', idx: 1 },
			{ type: 'bible' as const, raw: 'Mt 1:2', idx: 2 }
		];
		const result = groupConsecutiveBibleSups({ html, refs });
		expect(result.html).toBe(html);
		expect(result.refs.every((r) => r.marker_idx === undefined)).toBe(true);
		expect(result.refs.map((r) => r.display_idx)).toEqual([1, 2]);
	});

	it('treats whitespace + NBSP between sups as consecutive', () => {
		const html = `<span>${sup(1)}  ${sup(2)}.</span>`;
		const refs = [
			{ type: 'bible' as const, raw: 'voir Mt 1:1', idx: 1 },
			{ type: 'bible' as const, raw: 'Mt 1:2', idx: 2 }
		];
		const result = groupConsecutiveBibleSups({ html, refs });
		expect(result.html).toBe(`<span>${sup(1)}.</span>`);
		// Strip-range invariant: no whitespace gap survives between the leader sup
		// and the trailing punctuation. A buggy strip range that only consumed the
		// trailing <sup> elements would leave "<sup1>  ." here.
		expect(result.html).not.toMatch(/<\/sup>\s+\./);
		expect(result.refs[1]!.marker_idx).toBe(1);
		// Surviving leader is renumbered to 1; member inherits 1.
		expect(result.refs[0]!.display_idx).toBe(1);
		expect(result.refs[1]!.display_idx).toBe(1);
	});
});

describe('markVulgateRefs', () => {
	it('flags the reference the Catechism marked "vulg."', () => {
		const out = markVulgateRefs(
			[{ text: 'Gn 45:8' }, { text: 'Tb 2:12-18' }, { text: 'Rm 5:20' }],
			[
				{ type: 'bible', raw: 'Gn 45:8' },
				{ type: 'bible', raw: 'voir Tb 2:12-18 vulg.' },
				{ type: 'bible', raw: 'voir Rm 5:20' }
			]
		);
		expect(out).toEqual([
			{ text: 'Gn 45:8' },
			{ text: 'Tb 2:12-18', vulgate: true },
			{ text: 'Rm 5:20' }
		]);
	});

	it('handles the bracketed spelling', () => {
		const out = markVulgateRefs(
			[{ text: '1 Jn 2:16' }],
			[{ type: 'bible', raw: 'voir 1 Jn 2:16 [Vulg.]' }]
		);
		expect(out[0]).toEqual({ text: '1 Jn 2:16', vulgate: true });
	});

	it('returns the array untouched when nothing is marked', () => {
		const refs = [{ text: 'Jn 3:16' }];
		expect(markVulgateRefs(refs, [{ type: 'bible', raw: 'Jn 3:16' }])).toBe(refs);
	});

	it('ignores a "vulg." marker on a non-bible reference', () => {
		const refs = [{ text: 'Jn 3:16' }];
		expect(markVulgateRefs(refs, [{ type: 'patristic', raw: 'Jn 3:16 vulg.' }])).toBe(refs);
	});
});
