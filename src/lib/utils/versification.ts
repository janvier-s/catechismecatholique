/**
 * Where a reference the Catechism gives lands in the reader's Crampon.
 *
 * The Catechism numbers verses the standard way · the Vulgate and the Hebrew
 * agree on the places that matter here. Crampon occasionally does not: it
 * merges the four short commandments of the Decalogue into one verse, and it
 * places the Greek additions to Esther in their own chapters. A reference the
 * Catechism gives correctly can therefore land on the wrong text.
 *
 * The reference itself is never rewritten · a reader holding a printed
 * Catechism must see the same citation the book gives. Only the text is
 * resolved through this map, so the label stays faithful and the passage is
 * right.
 *
 * Keep this table evidence-led and small. An entry belongs here only where
 * Crampon demonstrably addresses a passage differently, never where a
 * reference is simply wrong · that is what bibleRefCorrections is for.
 */

export type VersificationRule =
	| {
			kind: 'merge';
			book: string;
			chapter: number;
			/** Verse span in the Catechism's numbering. */
			from: [number, number];
			/** The single Crampon verse that carries all of them. */
			toVerse: number;
			reason: string;
	  }
	| {
			kind: 'shift';
			book: string;
			chapter: number;
			from: [number, number];
			/** Added to the verse number to reach Crampon's. */
			delta: number;
			reason: string;
	  }
	| {
			kind: 'move';
			book: string;
			chapter: number;
			from: [number, number];
			toChapter: number;
			to: [number, number];
			reason: string;
	  };

export const VERSIFICATION_RULES: VersificationRule[] = [
	{
		kind: 'merge',
		book: 'DEU',
		chapter: 5,
		from: [17, 20],
		toVerse: 17,
		reason:
			'Crampon carries "Tu ne tueras pas", the adultery, theft and false-witness commandments in a single verse 17, marking the others inline as (Vulgate 18)-(Vulg. 20).'
	},
	{
		kind: 'shift',
		book: 'DEU',
		chapter: 5,
		from: [21, 33],
		delta: -3,
		reason:
			"Everything after the merged commandments sits three verses earlier: the Catechism's Dt 5:22 is Crampon 5:19."
	},
	{
		kind: 'move',
		book: 'EST',
		chapter: 4,
		from: [17, 17],
		toChapter: 13,
		to: [9, 11],
		reason:
			'The prayer of Mardochée is a Greek addition. The Catechism numbers it as part of Est 4:17; Crampon gives it its own chapter, and its 4:17 carries a note pointing there.'
	}
];

export interface ResolvedAddress {
	chapter: number;
	verseStart: number;
	verseEnd: number;
	/** Why the text sits somewhere other than the reference says. */
	reason: string;
}

/**
 * Resolve a Catechism reference to the Crampon address carrying its text.
 * Returns null when the two agree, which is the overwhelming majority.
 */
export function resolveToCrampon(
	book: string,
	chapter: number,
	verseStart: number,
	verseEnd: number = verseStart
): ResolvedAddress | null {
	const rules = VERSIFICATION_RULES.filter((r) => r.book === book && r.chapter === chapter);
	if (rules.length === 0) return null;

	const hit = (v: number) => rules.find((r) => v >= r.from[0] && v <= r.from[1]);
	const startRule = hit(verseStart);
	const endRule = hit(verseEnd);
	if (!startRule && !endRule) return null;

	const mapOne = (v: number, side: 'start' | 'end'): { chapter: number; verse: number } => {
		const r = hit(v);
		if (!r) return { chapter, verse: v };
		if (r.kind === 'merge') return { chapter, verse: r.toVerse };
		if (r.kind === 'shift') return { chapter, verse: v + r.delta };
		return { chapter: r.toChapter, verse: side === 'start' ? r.to[0] : r.to[1] };
	};

	const s = mapOne(verseStart, 'start');
	const e = mapOne(verseEnd, 'end');
	// A range straddling two chapters cannot be shown as one span; the start
	// wins, which is where the reader is being sent.
	const outChapter = s.chapter;
	return {
		chapter: outChapter,
		verseStart: s.verse,
		verseEnd: e.chapter === outChapter ? Math.max(s.verse, e.verse) : s.verse,
		reason: (startRule ?? endRule)!.reason
	};
}
