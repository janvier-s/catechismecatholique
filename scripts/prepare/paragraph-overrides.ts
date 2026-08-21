/**
 * Manual paragraph-break overrides for chapters whose source XML has no
 * `<p>` markers at all — confirmed against both francl_usfx.xml and the
 * independent francl_usfm source (same edition, same absence of markup):
 * these 11 chapters parse as one giant prose block. The breaks below are
 * editorially chosen (not derived from any source file) so paragraph mode
 * reads naturally for them too. Each entry lists the verse numbers where a
 * new paragraph starts.
 */
export const PARAGRAPH_OVERRIDES: Record<string, Record<string, number[]>> = {
	'1CO': { '13': [1, 4, 8] },
	'2CO': {
		'2': [1, 5, 12, 14],
		'5': [1, 6, 11, 16],
		'7': [1, 2, 5, 8, 13]
	},
	COL: { '2': [1, 6, 16, 20] },
	EPH: { '2': [1, 11, 14, 19] },
	HEB: { '6': [1, 4, 9, 13] },
	ISA: { '20': [1, 2, 5] },
	MAT: { '2': [1, 13, 16, 19] },
	REV: {
		'9': [1, 7, 13],
		'20': [1, 4, 7, 11]
	}
};
