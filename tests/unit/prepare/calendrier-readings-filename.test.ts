import { describe, it, expect } from 'vitest';
import { readingsFilename, readingsKey } from '../../../scripts/prepare/calendrier';

describe('readingsFilename', () => {
	it('replaces the colon in a year-scoped key with a double dash', () => {
		expect(readingsFilename('a:premier-dimanche-de-lavent')).toBe(
			'a--premier-dimanche-de-lavent'
		);
	});

	it('leaves a bare fixed-feast slug unchanged', () => {
		expect(readingsFilename('la-solennite-de-noel')).toBe('la-solennite-de-noel');
	});

	it('round-trips through readingsKey for a year-scoped feast', () => {
		const key = readingsKey('deuxieme-dimanche-du-temps-ordinaire', 'b');
		expect(readingsFilename(key)).toBe('b--deuxieme-dimanche-du-temps-ordinaire');
	});
});
