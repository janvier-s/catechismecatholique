import { describe, it, expect } from 'vitest';
import { parseFrenchOrdinal } from '../../../scripts/prepare/calendrierFrenchOrdinal';

describe('parseFrenchOrdinal', () => {
	it('parses simple ordinals', () => {
		expect(parseFrenchOrdinal('Deuxième Dimanche du Temps Ordinaire')).toBe(2);
		expect(parseFrenchOrdinal('Premier Dimanche de l\'Avent')).toBe(1);
		expect(parseFrenchOrdinal('Cinquième Dimanche de Carême')).toBe(5);
	});

	it('parses compound ordinals', () => {
		expect(parseFrenchOrdinal('Dix-septième Dimanche du Temps Ordinaire')).toBe(17);
		expect(parseFrenchOrdinal('Vingt-et-unième Dimanche du Temps Ordinaire')).toBe(21);
		expect(parseFrenchOrdinal('Trente-troisième Dimanche du Temps Ordinaire')).toBe(33);
	});

	it('ignores trailing subtitle text after the season name', () => {
		expect(
			parseFrenchOrdinal('Septième Dimanche de Pâques : la prière et la vie spirituelle')
		).toBe(7);
	});

	it('returns null for titles with no leading ordinal', () => {
		expect(parseFrenchOrdinal('La Solennité de Noël')).toBeNull();
		expect(parseFrenchOrdinal('Jeudi Saint- La Cène du Seigneur')).toBeNull();
		expect(parseFrenchOrdinal('Second Dimanche après Noël')).toBe(2); // "Second" alone still parses; named-feast routing (Task 3) is what keeps this off the ordinal path, not this function.
	});
});
