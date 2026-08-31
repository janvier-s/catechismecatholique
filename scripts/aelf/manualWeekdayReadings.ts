// scripts/aelf/manualWeekdayReadings.ts

import type { CalendrierReadingsFile } from '../prepare/calendrier.ts';

/**
 * Weekday readings AELF cannot supply through any candidate date, entered
 * by hand and verified before being trusted - checked here so a maintainer
 * finds the reasoning next to the data, and applied by fetch-aelf.ts after
 * its own fetch loop so a future run can't silently lose it.
 *
 * `II:avent-3-vendredi` (Vendredi de la 3e semaine de l'Avent, année
 * impaire): the only (weekOfSeason 3, dayOfWeek Friday, cycle II,
 * before-17-December) occurrences in this project's 2000-2035 range are
 * 2005-12-16, 2011-12-16, and 2033-12-16 - the first two 404 against AELF's
 * live API (its archive starts around 2016-2017), and the third hasn't
 * happened yet. Copied verbatim from `I:avent-3-vendredi` (fetched from
 * 2022-12-16): Advent's weekday lectionary before 17 December repeats the
 * same Gospel, Psalm, and first reading across both cycles for this day -
 * confirmed by an exact match against a maintainer's own paper missal,
 * whose independently-transcribed Alleluia verse ("Viens, Seigneur : que ta
 * visite soit notre paix ! Que notre cœur trouve la joie parfaite en ta
 * présence !") is identical, word for word, to what AELF already returned
 * for the cycle I occurrence.
 */
export const MANUAL_WEEKDAY_READINGS: CalendrierReadingsFile = {
	'II:avent-3-vendredi': {
		date: '2022-12-16',
		lectures: [
			{
				type: 'lecture_1',
				refrain_psalmique: '',
				ref_refrain: null,
				titre: '« Ma maison s’appellera “Maison de prière pour tous les peuples” »',
				contenu:
					'<p>Ainsi parle le Seigneur :<br />\nObservez le droit,<br />\npratiquez la justice,<br />\ncar mon salut approche, il vient,<br />\net ma justice va se révéler.<br />\n    Heureux l’homme qui agit ainsi,<br />\nle fils d’homme qui s’y tient fermement ;<br />\nil observe le sabbat sans le profaner<br />\net se garde de toute mauvaise action.<br />\n    L’étranger qui s’est attaché au Seigneur,<br />\nqu’il n’aille pas dire :<br />\n« Le Seigneur va sûrement m’exclure de son peuple. »<br />\n    Les étrangers qui se sont attachés au Seigneur<br />\npour l’honorer, pour aimer son nom,<br />\npour devenir ses serviteurs,<br />\ntous ceux qui observent le sabbat sans le profaner<br />\net tiennent ferme à mon alliance,<br />\n    je les conduirai à ma montagne sainte<br />\nje les comblerai de joie dans ma maison de prière,<br />\nleurs holocaustes et leurs sacrifices<br />\nseront agréés sur mon autel,<br />\ncar ma maison s’appellera<br />\n« Maison de prière pour tous les peuples. »<br />\n    Oracle du Seigneur Dieu,<br />\nqui rassemble les exilés d’Israël :<br />\nJ’en ai déjà rassemblé,<br />\nj’en rassemblerai d’autres encore.</p>\n\n<p>            – Parole du Seigneur.</p>',
				ref: 'Is 56, 1-3a.6-8',
				intro_lue: 'Lecture du livre du prophète Isaïe',
				verset_evangile: '',
				ref_verset: null
			},
			{
				type: 'psaume',
				refrain_psalmique:
					'<p><strong>Que les peuples, Dieu, te rendent grâce ;<br />\nqu’ils te rendent grâce tous ensemble !</strong></p>',
				ref_refrain: 'Ps 66, 4',
				titre: null,
				contenu:
					'<p>Que Dieu nous prenne en grâce et nous bénisse,<br />\nque son visage s’illumine pour nous ;<br />\net ton chemin sera connu sur la terre,<br />\nton salut, parmi toutes les nations.</p>\n\n<p>Que les nations chantent leur joie,<br />\ncar tu gouvernes le monde avec justice ;<br />\ntu gouvernes les peuples avec droiture,<br />\nsur la terre, tu conduis les nations.</p>\n\n<p>La terre a donné son fruit ;<br />\nDieu, notre Dieu, nous bénit.<br />\nQue Dieu nous bénisse,<br />\net que la terre tout entière l’adore !</p>',
				ref: 'Ps 66 (67), 2-3, 5, 7-8',
				intro_lue: null,
				verset_evangile: '',
				ref_verset: null
			},
			{
				type: 'evangile',
				refrain_psalmique: '',
				ref_refrain: null,
				titre: '« Jean était la lampe qui brûle et qui brille »',
				contenu:
					'<p>    En ce temps-là,<br />\nJésus disait aux Juifs :<br />\n    « Vous avez envoyé une délégation auprès de Jean le Baptiste,<br />\net il a rendu témoignage à la vérité.<br />\n    Moi, ce n’est pas d’un homme que je reçois le témoignage,<br />\nmais je parle ainsi pour que vous soyez sauvés.<br />\n    Jean était la lampe qui brûle et qui brille,<br />\net vous avez voulu vous réjouir un moment à sa lumière.<br />\n    Mais j’ai pour moi un témoignage plus grand que celui de Jean :<br />\nce sont les œuvres que le Père m’a donné d’accomplir ;<br />\nles œuvres mêmes que je fais<br />\ntémoignent que le Père m’a envoyé. »</p>\n\n<p>            – Acclamons la Parole de Dieu.</p>',
				ref: 'Jn 5, 33-36',
				intro_lue: 'Évangile de Jésus Christ selon saint Jean',
				verset_evangile:
					'<p><strong>Alléluia, Alléluia.</strong><br />\nViens, Seigneur : que ta visite soit notre paix !<br />\nQue notre cœur trouve la joie parfaite en ta présence !<br /><strong>Alléluia.</strong></p>',
				ref_verset: null
			}
		]
	}
};
