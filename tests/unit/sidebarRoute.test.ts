import { describe, it, expect } from 'vitest';
import { needsCecStructure } from '../../src/lib/sidebarRoute';

describe('needsCecStructure', () => {
	it('keeps the rail on the CCC reading surfaces', () => {
		expect(needsCecStructure('/cec')).toBe(true);
		expect(needsCecStructure('/cec/1324')).toBe(true);
		expect(needsCecStructure('/cec/1322-1419')).toBe(true);
		expect(needsCecStructure('/cec/1-profession-de-la-foi')).toBe(true);
	});

	it('hides the rail on the full-size tables of contents', () => {
		expect(needsCecStructure('/cec/sommaire')).toBe(false);
		expect(needsCecStructure('/cec/panorama')).toBe(false);
	});

	it('hides the rail on a multi-paragraph selection', () => {
		expect(needsCecStructure('/cec/268,279-280,290-295')).toBe(false);
		expect(needsCecStructure('/cec/1,3,240')).toBe(false);
	});

	it('ignores paths outside the catechism', () => {
		expect(needsCecStructure('/bible/genese/1')).toBe(false);
		expect(needsCecStructure('/recherche')).toBe(false);
	});
});
