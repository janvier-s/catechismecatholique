import { describe, it, expect } from 'vitest';
import { searchTokenizer, processTerm, stripDiacritics } from '../../src/lib/utils/searchTokenizer';

describe('searchTokenizer', () => {
	it('strips diacritics', () => {
		expect(stripDiacritics('présupposé')).toBe('presuppose');
		expect(stripDiacritics('cœur')).toBe('coeur');
	});

	it('treats apostrophes as boundaries', () => {
		expect(searchTokenizer("L'Église")).toEqual(['eglise']);
	});

	it('drops single-char tokens', () => {
		expect(searchTokenizer('a b cd ef')).toEqual(['cd', 'ef']);
	});

	it('processTerm normalizes a single term', () => {
		expect(processTerm('Évangile')).toBe('evangile');
		expect(processTerm('a')).toBeNull();
	});
});
