import { describe, it, expect } from 'vitest';
import type { Paragraph } from '$lib/data/types';

describe('data types', () => {
	it('Paragraph type compiles', () => {
		const p: Paragraph = {
			corpus: 'ccc',
			number: 27,
			text_html: '<span>...</span>',
			cross_refs: ['355', '1701'],
			bible_refs: [],
			citations: [],
			magisterial_refs: []
		};
		expect(p.corpus).toBe('ccc');
	});
});
