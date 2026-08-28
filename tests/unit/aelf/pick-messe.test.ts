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

	it('matches "jour" case-insensitively, as AELF actually sends it for some feasts', () => {
		const messes = [
			{ nom: 'MESSE DE LA VEILLE AU SOIR', lectures: [] },
			{ nom: 'MESSE DU JOUR', lectures: [] }
		];
		const result = pickMesse(messes, 'la-solennite-de-la-pentecote');
		expect(result.messe.nom).toBe('MESSE DU JOUR');
		expect(result.warning).toBeNull();
	});

	it('matches a "jour" variant that is not the exact string "Messe du jour"', () => {
		const messes = [
			{ nom: 'VEILLEE PASCALE', lectures: [] },
			{ nom: 'Messe du jour de Pâques', lectures: [] }
		];
		const result = pickMesse(messes, 'dimanche-de-paques-la-resurrection-du-seigneur');
		expect(result.messe.nom).toBe('Messe du jour de Pâques');
		expect(result.warning).toBeNull();
	});

	it('excludes the Chrism Mass and falls back to the evening Mass, with a warning', () => {
		const messes = [
			{ nom: 'Messe Chrismale', lectures: [] },
			{ nom: 'Messe du soir EN MÉMOIRE DE LA CÈNE DU SEIGNEUR', lectures: [] }
		];
		const result = pickMesse(messes, 'jeudi-saint-la-cene-du-seigneur');
		expect(result.messe.nom).toBe('Messe du soir EN MÉMOIRE DE LA CÈNE DU SEIGNEUR');
		expect(result.warning).toContain('jeudi-saint-la-cene-du-seigneur');
	});

	it('excludes the Palm procession and falls back to the Passion Mass, with a warning', () => {
		const messes = [
			{ nom: 'Procession des Rameaux', lectures: [] },
			{ nom: 'Messe de la Passion', lectures: [] }
		];
		const result = pickMesse(messes, 'dimanche-des-rameaux-et-de-la-passion-du-seigneur');
		expect(result.messe.nom).toBe('Messe de la Passion');
		expect(result.warning).toContain('dimanche-des-rameaux-et-de-la-passion-du-seigneur');
	});

	it('falls back to the last messe with a warning when none is named "Messe du jour" or excludable', () => {
		const messes = [
			{ nom: 'Messe A', lectures: [] },
			{ nom: 'Messe B', lectures: [] }
		];
		const result = pickMesse(messes, 'mystery-feast');
		expect(result.messe.nom).toBe('Messe B');
		expect(result.warning).toContain('mystery-feast');
		expect(result.warning).toContain('Messe A, Messe B');
	});

	it('throws when AELF returns no messes at all', () => {
		expect(() => pickMesse([], 'mystery-feast')).toThrow(/mystery-feast/);
	});
});
