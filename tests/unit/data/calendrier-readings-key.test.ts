import { describe, it, expect } from 'vitest';
import { readingsKey, readingsFilename } from '$lib/data/calendrierReadingsKey';

describe('readingsKey', () => {
	it('prefixes the year key for a year-scoped feast', () => {
		expect(readingsKey('premier-dimanche-de-lavent', 'a')).toBe('a:premier-dimanche-de-lavent');
	});

	it('returns the bare slug for a fixed feast', () => {
		expect(readingsKey('la-solennite-de-noel')).toBe('la-solennite-de-noel');
	});
});

describe('readingsFilename', () => {
	it('replaces the colon in a year-scoped key with a double dash', () => {
		expect(readingsFilename('a:premier-dimanche-de-lavent')).toBe('a--premier-dimanche-de-lavent');
	});

	it('leaves a bare fixed-feast slug unchanged', () => {
		expect(readingsFilename('la-solennite-de-noel')).toBe('la-solennite-de-noel');
	});
});
