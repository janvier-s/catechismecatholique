/**
 * Corrections to scripture references that arrive broken in
 * `ccc_paras_processed.json`.
 *
 * Each entry was found the same way: the reference does not resolve to a
 * verse that exists, and the paragraph quotes a verse that does. Nothing here
 * is a guess about a reference that already resolves · a citation the reader
 * can follow is left alone even where another verse might arguably fit
 * better, because a silent renumbering of correct references is a worse
 * failure than the one being fixed.
 *
 * Keep this list short. It is a patch over upstream data, not a place to
 * encode editorial preference · a fix belongs in the source when the source
 * can be corrected.
 */
export interface BibleRefCorrection {
	/** CCC paragraph the reference appears in. */
	paragraph: number;
	/** The stored text, matched exactly. */
	from: string;
	/** What it should be. */
	to: string;
	/** Why, in one line: what the paragraph quotes and why the stored form cannot be it. */
	reason: string;
}

export const BIBLE_REF_CORRECTIONS: BibleRefCorrection[] = [
	{
		paragraph: 603,
		from: 'Ps 22:1',
		to: 'Ps 22:2',
		reason:
			'The cry from the cross is Ps 22:2 where the superscription counts as verse 1; Ps 22 has no verse 1.'
	},
	{
		paragraph: 630,
		from: 'Ac 12:37',
		to: 'Ac 13:37',
		reason: '"n\'a pas vu la corruption" is Ac 13:37. Acts 12 ends at verse 25.'
	},
	{
		paragraph: 1034,
		from: 'Mt 14:50',
		to: 'Mt 13:50',
		reason:
			'The furnace of fire is Mt 13:50, the second half of the compound Mt 13, 42.50 the paragraph cites. Matthew 14 ends at verse 36.'
	},
	{
		paragraph: 2160,
		from: 'Ps 8:11',
		to: 'Ps 8:2',
		reason: '"que ton nom est glorieux sur toute la terre" is Ps 8:2. Psalm 8 ends at verse 10.'
	},
	{
		paragraph: 2465,
		from: '2 R 7:28',
		to: '2 S 7:28',
		reason:
			'"tes paroles sont vraies" is 2 Samuel 7:28. 2 Rois 7 ends at verse 20 · the book abbreviation is wrong.'
	},
	{
		paragraph: 2465,
		from: 'Ps 118:142',
		to: 'Ps 119:142',
		reason:
			'"ta loi est vérité" is Ps 119:142. Psalm 118 ends at verse 29, and the same paragraph already cites Ps 119:90 correctly.'
	},
	{
		paragraph: 2465,
		from: 'Ps 118:30',
		to: 'Ps 119:30',
		reason: '"J\'ai choisi la voie de la fidélité" is Ps 119:30. Psalm 118 ends at verse 29.'
	},
	{
		paragraph: 2559,
		from: 'Ps 130:14',
		to: 'Ps 130:1',
		reason:
			'The "profondeurs" the paragraph quotes is the De profundis, Ps 130:1. Psalm 130 ends at verse 8.'
	}
];

const BY_PARAGRAPH = new Map<number, BibleRefCorrection[]>();
for (const c of BIBLE_REF_CORRECTIONS) {
	const list = BY_PARAGRAPH.get(c.paragraph) ?? [];
	list.push(c);
	BY_PARAGRAPH.set(c.paragraph, list);
}

/**
 * Apply the corrections for one paragraph. Returns the references unchanged
 * when none apply, and reports which entries matched so the caller can fail
 * the build on a correction that no longer has anything to correct.
 */
export function applyBibleRefCorrections(
	paragraph: number,
	refs: { text: string }[]
): { refs: { text: string }[]; applied: BibleRefCorrection[] } {
	const corrections = BY_PARAGRAPH.get(paragraph);
	if (!corrections) return { refs, applied: [] };

	const applied: BibleRefCorrection[] = [];
	const out = refs.map((r) => {
		const hit = corrections.find((c) => c.from === r.text);
		if (!hit) return r;
		applied.push(hit);
		return { ...r, text: hit.to };
	});
	return { refs: out, applied };
}
