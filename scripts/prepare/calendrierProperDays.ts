import type { SeasonKey } from './calendrier.ts';

export interface ProperDay {
	slug: string;
	title: string;
	romcalId: string;
	season: SeasonKey;
}

/**
 * Calendar days that would otherwise have no card at all: each has a
 * stable, year-invariant romcal id (verified against romcal@3.0.0-dev.138's
 * generateCalendar output for 2000-2035) and Mass readings fixed by the day
 * itself - or, for the three Ordinary Time entries, by the feast that
 * occasionally displaces a numbered Sunday - rather than by week position.
 * That means one calendar occurrence's content is correct for every year
 * the day occurs, unlike the generic {season}-{week}-{weekday} ferial
 * slugs. See weekdayFeasts.ts's isDateProperWeekday for why late Advent and
 * all of Christmas Time were previously skipped outright rather than given
 * their own row; Easter's octave and the Ordinary Time collisions never
 * went through that exclusion at all and were simply absent.
 *
 * Holy Saturday (romcal id `holy_saturday`) has no Mass during the day -
 * only the Easter Vigil that night (a distinct liturgy, dated as part of
 * Easter Sunday) - so AELF's own entry for it has an empty lecture list.
 * It's still listed here rather than left absent, so the day at least
 * shows the explanatory title instead of no card at all.
 */
export const PROPER_DAYS: ProperDay[] = [
	{
		slug: '17-decembre-o-sagesse',
		title: '17 décembre : Ô Sagesse',
		romcalId: 'advent_december_17',
		season: 'avent'
	},
	{
		slug: '18-decembre-o-adonai',
		title: '18 décembre : Ô Adonaï',
		romcalId: 'advent_december_18',
		season: 'avent'
	},
	{
		slug: '19-decembre-o-racine-de-jesse',
		title: '19 décembre : Ô Racine de Jessé',
		romcalId: 'advent_december_19',
		season: 'avent'
	},
	{
		slug: '20-decembre-o-cle-de-david',
		title: '20 décembre : Ô Clé de David',
		romcalId: 'advent_december_20',
		season: 'avent'
	},
	{
		slug: '21-decembre-o-orient',
		title: '21 décembre : Ô Orient',
		romcalId: 'advent_december_21',
		season: 'avent'
	},
	{
		slug: '22-decembre-o-roi-des-nations',
		title: '22 décembre : Ô Roi des nations',
		romcalId: 'advent_december_22',
		season: 'avent'
	},
	{
		slug: '23-decembre-o-emmanuel',
		title: '23 décembre : Ô Emmanuel',
		romcalId: 'advent_december_23',
		season: 'avent'
	},
	{
		slug: '24-decembre-veille-de-noel',
		title: '24 décembre : veille de Noël',
		romcalId: 'advent_december_24',
		season: 'avent'
	},
	{
		slug: '26-decembre-saint-etienne',
		title: '26 décembre : Saint Étienne, premier martyr',
		romcalId: 'stephen_the_first_martyr',
		season: 'noel'
	},
	{
		slug: '27-decembre-saint-jean-apotre',
		title: '27 décembre : Saint Jean, apôtre et évangéliste',
		romcalId: 'john_apostle',
		season: 'noel'
	},
	{
		slug: '28-decembre-saints-innocents',
		title: '28 décembre : les Saints Innocents',
		romcalId: 'holy_innocents_martyrs',
		season: 'noel'
	},
	{
		slug: '29-decembre-octave-de-noel',
		title: '29 décembre : dans l’octave de Noël',
		romcalId: 'christmas_octave_day_5',
		season: 'noel'
	},
	{
		slug: '30-decembre-octave-de-noel',
		title: '30 décembre : dans l’octave de Noël',
		romcalId: 'christmas_octave_day_6',
		season: 'noel'
	},
	{
		slug: '31-decembre-octave-de-noel',
		title: '31 décembre : dans l’octave de Noël',
		romcalId: 'christmas_octave_day_7',
		season: 'noel'
	},
	{
		slug: '2-janvier-saint-basile-et-saint-gregoire',
		title: '2 janvier : saints Basile le Grand et Grégoire de Naziance',
		romcalId: 'basil_the_great_and_gregory_nazianzen_bishops',
		season: 'noel'
	},
	{
		slug: '3-janvier',
		title: '3 janvier : temps de Noël',
		romcalId: 'christmas_time_january_3',
		season: 'noel'
	},
	{
		slug: '4-janvier',
		title: '4 janvier : temps de Noël',
		romcalId: 'christmas_time_january_4',
		season: 'noel'
	},
	{
		slug: '5-janvier',
		title: '5 janvier : temps de Noël',
		romcalId: 'christmas_time_january_5',
		season: 'noel'
	},
	{
		slug: 'lundi-apres-lepiphanie',
		title: 'Lundi après l’Épiphanie',
		romcalId: 'monday_after_epiphany',
		season: 'noel'
	},
	{
		slug: 'mardi-apres-lepiphanie',
		title: 'Mardi après l’Épiphanie',
		romcalId: 'tuesday_after_epiphany',
		season: 'noel'
	},
	{
		slug: 'mercredi-apres-lepiphanie',
		title: 'Mercredi après l’Épiphanie',
		romcalId: 'wednesday_after_epiphany',
		season: 'noel'
	},
	{
		slug: 'jeudi-apres-lepiphanie',
		title: 'Jeudi après l’Épiphanie',
		romcalId: 'thursday_after_epiphany',
		season: 'noel'
	},
	{
		slug: 'vendredi-apres-lepiphanie',
		title: 'Vendredi après l’Épiphanie',
		romcalId: 'friday_after_epiphany',
		season: 'noel'
	},
	{
		slug: 'samedi-apres-lepiphanie',
		title: 'Samedi après l’Épiphanie',
		romcalId: 'saturday_after_epiphany',
		season: 'noel'
	},
	{
		slug: 'bapteme-du-seigneur',
		title: 'Le baptême du Seigneur',
		romcalId: 'baptism_of_the_lord',
		season: 'noel'
	},
	{
		slug: 'samedi-saint',
		title: 'Samedi saint',
		romcalId: 'holy_saturday',
		season: 'pascal'
	},
	{
		slug: 'lundi-de-paques',
		title: 'Lundi de Pâques',
		romcalId: 'easter_monday',
		season: 'pascal'
	},
	{
		slug: 'mardi-de-paques',
		title: 'Mardi de Pâques',
		romcalId: 'easter_tuesday',
		season: 'pascal'
	},
	{
		slug: 'mercredi-de-paques',
		title: 'Mercredi de Pâques',
		romcalId: 'easter_wednesday',
		season: 'pascal'
	},
	{
		slug: 'jeudi-de-paques',
		title: 'Jeudi de Pâques',
		romcalId: 'easter_thursday',
		season: 'pascal'
	},
	{
		slug: 'vendredi-de-paques',
		title: 'Vendredi de Pâques',
		romcalId: 'easter_friday',
		season: 'pascal'
	},
	{
		slug: 'samedi-de-paques',
		title: 'Samedi dans l’octave de Pâques',
		romcalId: 'easter_saturday',
		season: 'pascal'
	},
	{
		slug: 'transfiguration-du-seigneur',
		title: 'La Transfiguration du Seigneur',
		romcalId: 'transfiguration_of_the_lord',
		season: 'ordinaire'
	},
	{
		slug: 'exaltation-de-la-sainte-croix',
		title: 'L’Exaltation de la Sainte Croix',
		romcalId: 'exaltation_of_the_holy_cross',
		season: 'ordinaire'
	},
	{
		slug: 'dedicace-de-la-basilique-du-latran',
		title: 'La Dédicace de la basilique du Latran',
		romcalId: 'dedication_of_the_lateran_basilica',
		season: 'ordinaire'
	}
];

export const PROPER_DAY_ROMCAL_IDS = new Set(PROPER_DAYS.map((p) => p.romcalId));
