import { Season } from 'romcal';
import type { SeasonKey } from './calendrier.ts';

// Verified against romcal@3.0.0-dev.138's generateCalendar(2024) and
// generateCalendar(2022) output (2022 was needed to observe
// second_sunday_after_christmas, which doesn't occur every year).
//
// Ascension and Christ the King each have two slug spellings across the
// three curated années, because the source titles differ ("Solennité de..."
// in année A vs "La Solennité de..." in B/C), which produces different
// slugify() output for the same real-world feast.
export const NAMED_FEAST_ROMCAL_ID: Record<string, string> = {
	'la-solennite-de-noel': 'nativity_of_the_lord',
	'la-sainte-famille': 'holy_family_of_jesus_mary_and_joseph',
	'la-solennite-de-sainte-marie-mere-de-dieu': 'mary_mother_of_god',
	'second-dimanche-apres-noel': 'second_sunday_after_christmas',
	'la-solennite-de-lepiphanie-du-seigneur': 'epiphany_of_the_lord',
	'dimanche-des-rameaux-et-de-la-passion-du-seigneur': 'palm_sunday_of_the_passion_of_the_lord',
	'jeudi-saint-la-cene-du-seigneur': 'holy_thursday',
	'vendredi-saint-la-passion-du-seigneur': 'friday_of_the_passion_of_the_lord',
	'dimanche-de-paques-la-resurrection-du-seigneur': 'easter_sunday',
	'solennite-de-lascension-du-seigneur': 'ascension_of_the_lord',
	'la-solennite-de-lascension-du-seigneur': 'ascension_of_the_lord',
	'la-solennite-de-la-pentecote': 'pentecost_sunday',
	'la-solennite-de-la-sainte-trinite': 'most_holy_trinity',
	'la-solennite-du-corps-et-du-sang-du-christ': 'most_holy_body_and_blood_of_christ',
	'la-solennite-du-sacre-coeur-de-jesus': 'most_sacred_heart_of_jesus',
	'solennite-du-christ-roi-de-lunivers': 'our_lord_jesus_christ_king_of_the_universe',
	'la-solennite-du-christ-roi-de-lunivers': 'our_lord_jesus_christ_king_of_the_universe',

	// Fixed feasts (index.json fixed_feasts) · matched by id, not just by
	// month/day, so they get a liturgicalColor from the same code path as
	// everything else.
	'la-solennite-de-saint-joseph-epoux-de-la-vierge-marie': 'joseph_spouse_of_mary',
	'la-solennite-de-saint-pierre-et-saint-paul-apotres': 'peter_and_paul_apostles',
	'la-solennite-de-lassomption-de-la-vierge-marie': 'assumption_of_the_blessed_virgin_mary',
	'la-solennite-de-tous-les-saints': 'all_saints',
	'la-solennite-de-limmaculee-conception-de-la-vierge-marie':
		'immaculate_conception_of_the_blessed_virgin_mary',
	'la-solennite-de-lannonciation-du-seigneur': 'annunciation_of_the_lord',
	'la-nativite-de-saint-jean-baptiste': 'nativity_of_john_the_baptist',
	'la-commemoration-de-tous-les-fideles-defunts': 'commemoration_of_all_the_faithful_departed'
};

// Only the four seasons that contain plain "Nth Sunday" titles. `noel` and
// `solennite` feasts are always named · see NAMED_FEAST_ROMCAL_ID above.
export const SEASON_TO_ROMCAL: Partial<Record<SeasonKey, Season>> = {
	avent: Season.Advent,
	careme: Season.Lent,
	pascal: Season.EasterTime,
	ordinaire: Season.OrdinaryTime
};
