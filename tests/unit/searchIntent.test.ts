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
