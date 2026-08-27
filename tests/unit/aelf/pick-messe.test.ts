import { describe, it, expect } from 'vitest';
import { pickMesse } from '../../../scripts/aelf/pickMesse';

describe('pickMesse', () => {
	it('uses the only messe when there is exactly one', () => {
		const messes = [{ nom: 'Messe du jour', lectures: [] }];
		const result = pickMesse(messes, 'deuxieme-dimanche-du-temps-ordinaire');
		expect(result.messe.nom).toBe('Messe du jour');
		expect(result.warning).toBeNull();
	});

	it('prefers "Messe du jour" among several', () => {
		const messes = [
			{ nom: 'Messe de la veille au soir', lectures: [] },
			{ nom: 'Messe de la nuit', lectures: [] },
			{ nom: "Messe de l'aurore", lectures: [] },
			{ nom: 'Messe du jour', lectures: [] }
		];
		const result = pickMesse(messes, 'la-solennite-de-noel');
		expect(result.messe.nom).toBe('Messe du jour');
		expect(result.warning).toBeNull();
	});

	it('falls back to the first messe with a warning when none is named "Messe du jour"', () => {
		const messes = [
			{ nom: 'Messe A', lectures: [] },
			{ nom: 'Messe B', lectures: [] }
		];
		const result = pickMesse(messes, 'mystery-feast');
		expect(result.messe.nom).toBe('Messe A');
		expect(result.warning).toContain('mystery-feast');
		expect(result.warning).toContain('Messe A, Messe B');
	});

	it('throws when AELF returns no messes at all', () => {
		expect(() => pickMesse([], 'mystery-feast')).toThrow(/mystery-feast/);
	});
});
