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
	/**
	 * Required when `from` resolves to a verse that exists.
	 *
	 * Such a reference is not visibly broken · the reader follows it and lands
	 * somewhere · so "it does not resolve" cannot justify the change and the
	 * entry would otherwise be an editorial rewrite. Quote the paragraph's own
	 * words here: the test checks they match `to` and not `from`, which is the
	 * only evidence that makes the correction a fact rather than a preference.
	 */
	quote?: string;
	/**
	 * A third way to justify correcting a resolving reference: another
	 * paragraph cites the same passage under the target's numbering. Give its
	 * number here. The test checks that paragraph really does cite the target's
	 * book and chapter, so the Catechism is corroborating itself rather than
	 * me asserting it.
	 */
	corroboration?: number;
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
	},

	// The entries below correct references that DO resolve · they simply
	// resolve to the wrong verse, which is worse than failing, because nothing
	// signals it to the reader. Each carries the paragraph's own quotation as
	// evidence. Found by matching every quotation in the Catechism against the
	// text at the addresses its paragraph cites.
	{
		paragraph: 208,
		from: 'Os 10:9',
		to: 'Os 11:9',
		reason:
			'The paragraph quotes "je ne donnerai pas cours à l’ardeur de ma colère … car je suis Dieu et non pas homme", which is Osée 11:9. Osée 10:9 is the sin of Gabaa.',
		quote: 'Je ne donnerai pas cours à l’ardeur de ma colère'
	},
	{
		paragraph: 662,
		from: 'He 7:24',
		to: 'He 7:25',
		reason:
			'"toujours vivant pour intercéder en faveur de ceux qui par lui s’avancent vers Dieu" is He 7:25. He 7:24 is the sacerdoce that does not pass on.',
		quote: 'toujours vivant pour intercéder'
	},
	{
		paragraph: 1858,
		from: 'Mc 10:18',
		to: 'Mc 10:19',
		reason:
			'The paragraph quotes the commandments Jesus lists, which is Mc 10:19. Mc 10:18 is "Pourquoi m’appelles-tu bon ?".',
		quote: 'ne commets pas d’adultère, ne vole pas, ne porte pas de faux témoignage'
	},
	{
		paragraph: 370,
		from: 'Ps 130:2-3',
		to: 'Ps 131:2-3',
		reason:
			'Cited for "celles d’une mère", alongside two maternal Isaiah texts. Ps 130 is the De profundis; the weaned child at its mother’s breast is Ps 131:2. Paragraph 239, which cross-references this one, cites the same image as Ps 131:2.',
		quote: 'mère',
		corroboration: 239
	},
	{
		paragraph: 2133,
		from: 'Dt 5:6',
		to: 'Dt 6:5',
		reason:
			'The paragraph is nothing but the Shema, "Tu aimeras le Seigneur ton Dieu, de tout ton cœur", which is Dt 6:5. Dt 5:6 is "Je suis Yahweh, ton Dieu, qui t’ai fait sortir du pays d’Égypte".',
		quote: 'de tout ton cœur, de toute ton âme'
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
