import { describe, it, expect } from 'vitest';
import { readingsKey } from '../../../scripts/prepare/calendrier';

describe('readingsKey', () => {
	it('returns the bare slug with no cycle key', () => {
		expect(readingsKey('la-solennite-de-saint-joseph')).toBe('la-solennite-de-saint-joseph');
	});

	it('prefixes with the année key for Sunday/feast slugs', () => {
		expect(readingsKey('deuxieme-dimanche-de-lavent', 'b')).toBe('b:deuxieme-dimanche-de-lavent');
	});

	it('prefixes with the weekday cycle key for ferial slugs', () => {
		expect(readingsKey('ordinaire-22-lundi', 'I')).toBe('I:ordinaire-22-lundi');
		expect(readingsKey('ordinaire-22-lundi', 'II')).toBe('II:ordinaire-22-lundi');
	});
});
