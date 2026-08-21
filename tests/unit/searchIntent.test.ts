import { describe, it, expect } from 'vitest';
import { detectIntent } from '../../src/lib/utils/searchIntent';

describe('detectIntent', () => {
	it('detects a paragraph number', () => {
		expect(detectIntent('27')).toEqual({ kind: 'paragraph', href: '/cec/27' });
		expect(detectIntent('§27')).toEqual({ kind: 'paragraph', href: '/cec/27' });
		expect(detectIntent('§ 27')).toEqual({ kind: 'paragraph', href: '/cec/27' });
	});

	it('detects a paragraph range', () => {
		expect(detectIntent('27-30')).toEqual({ kind: 'paragraph', href: '/cec/27-30' });
		expect(detectIntent('27 – 30')).toEqual({ kind: 'paragraph', href: '/cec/27-30' });
	});

	it('detects a comma-separated list of paragraphs', () => {
		expect(detectIntent('1,3,240')).toEqual({ kind: 'paragraph', href: '/cec/1,3,240' });
		expect(detectIntent('§1, §3, §240')).toEqual({ kind: 'paragraph', href: '/cec/1,3,240' });
	});

	it('detects a list mixing single paragraphs and ranges', () => {
		const href = '/cec/268,279-280,290-295';
		expect(detectIntent('268,279-280,290-295')).toEqual({ kind: 'paragraph', href });
		expect(detectIntent('268, 279-280, 290-295')).toEqual({ kind: 'paragraph', href });
		expect(detectIntent('268; 279-280; 290-295')).toEqual({ kind: 'paragraph', href });
	});

	it('accepts whitespace and newlines as separators', () => {
		const href = '/cec/268,279-280,290-295';
		expect(detectIntent('268 279-280 290-295')).toEqual({ kind: 'paragraph', href });
		expect(detectIntent('268\n279-280\n290-295')).toEqual({ kind: 'paragraph', href });
		expect(detectIntent('§268 §279-280 §290-295')).toEqual({ kind: 'paragraph', href });
	});

	it('does not read a bible reference as a paragraph list', () => {
		expect(detectIntent('Jn 1, 14').kind).toBe('bible');
		expect(detectIntent('1 Co 13, 4').kind).toBe('bible');
	});

	it('detects a bible reference (colon)', () => {
		const r = detectIntent('Jn 1:14');
		expect(r.kind).toBe('bible');
		expect(r).toMatchObject({ kind: 'bible', href: '/bible/jean/1/14' });
	});

	it('detects a bible reference (comma, French)', () => {
		const r = detectIntent('Jn 1, 14');
		expect(r.kind).toBe('bible');
		expect(r).toMatchObject({ kind: 'bible', href: '/bible/jean/1/14' });
	});

	it('detects a verse range — redirects to first verse', () => {
		const r = detectIntent('Mt 5:33-34');
		expect(r.kind).toBe('bible');
		expect(r).toMatchObject({ kind: 'bible', href: '/bible/matthieu/5/33' });
	});

	it('falls back to text on unknown', () => {
		expect(detectIntent("L'Église")).toEqual({ kind: 'text', q: "L'Église" });
	});

	it('falls back to text when book unknown', () => {
		expect(detectIntent('Xyz 1:1')).toEqual({ kind: 'text', q: 'Xyz 1:1' });
	});
});
