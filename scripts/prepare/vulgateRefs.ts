/**
 * Vulgate text for the three citations the Catechism marks "vulg.".
 *
 * The reader's Bible is the Neo-Crampon, translated from the Greek. Where the
 * Catechism cites the Vulgate on purpose, resolving the reference against
 * Crampon shows the reader a different passage, or one that contradicts the
 * paragraph:
 *
 *   Tb 2:12-18  · Crampon's Greek Tobit has no counterpart at all. The
 *                 Vulgate verses are the trial permitted so Tobit's patience
 *                 would be an example "comme celle du saint homme Job", which
 *                 is exactly what paragraph 312 argues.
 *   Ga 5:22-23  · the Vulgate lists twelve fruits of the Spirit, the Greek
 *                 nine. Paragraph 1832 says "la tradition de l'Église en
 *                 énumère douze" and lists all twelve.
 *   1 Jn 2:16   · here the two agree; included so the rule is "a vulg. marker
 *                 shows the Vulgate", with no exception to remember.
 *
 * Ten verses, vendored rather than generated. The Fillion edition they come
 * from (1888-1904, public domain) lives outside the repo, and a build-time
 * dependency on an external source for ten verses would be a fragile trade
 * for no benefit · the text of a 19th-century edition does not change.
 *
 * These are NOT spliced into the Crampon chapters. Grafting Vulgate verses
 * into a Greek-recension chapter would produce a passage that reads as one
 * text while being two, under verse numbers that mean different things in
 * each half. They are served alongside the reference, labelled.
 */

export interface VulgateRef {
	/** The reference exactly as `bible_refs[].text` carries it. */
	ref: string;
	/** USFX book code, for the reader's book naming. */
	book: string;
	chapter: number;
	verses: Record<string, string>;
}

/** Source: Fillion (1888-1904), translated from the Vulgate · public domain. */
export const VULGATE_EDITION = 'Fillion (1888-1904), d’après la Vulgate';

export const VULGATE_REFS: VulgateRef[] = [
	{
		ref: 'Tb 2:12-18',
		book: 'TOB',
		chapter: 2,
		verses: {
			'12': 'Dieu permit que cette épreuve lui arrivât, pour que sa patience servît d’exemple à la postérité, comme celle du saint homme Job.',
			'13': 'Car, ayant toujours craint Dieu dès son enfance, et ayant gardé Ses commandements, il ne s’attrista pas contre Dieu de ce qu’Il l’avait affligé par cette cécité ;',
			'14': 'mais il demeura immobile dans la crainte du Seigneur, rendant grâces à Dieu tous les jours de sa vie.',
			'15': 'Et de même que des rois insultaient au bienheureux Job, ainsi ses parents et ses proches se raillaient de sa conduite, en disant :',
			'16': 'Où est votre espérance pour laquelle vous faisiez tant d’aumônes et de sépultures ?',
			'17': 'Mais Tobie, les reprenant, leur disait : Ne parlez pas ainsi ;',
			'18': 'car nous sommes enfants des Saints, et nous attendons cette vie que Dieu doit donner à ceux qui ne changent jamais leur foi envers lui.'
		}
	},
	{
		ref: 'Ga 5:22-23',
		book: 'GAL',
		chapter: 5,
		verses: {
			'22': 'Mais les fruits de l’esprit sont la charité, la joie, la paix, la patience, la bénignité, la bonté, la longanimité,',
			'23': 'la douceur, la foi, la modestie, la continence, la chasteté. Contre de pareilles choses il n’y a pas de loi.'
		}
	},
	{
		ref: '1 Jn 2:16',
		book: '1JN',
		chapter: 2,
		verses: {
			'16': 'car tout ce qui est dans le monde est concupiscence de la chair, et concupiscence des yeux, et orgueil de la vie ; et cela ne vient pas du Père, mais du monde.'
		}
	}
];
