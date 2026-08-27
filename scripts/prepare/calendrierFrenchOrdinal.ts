// French ordinal words 1-33, lowercase. 33 is the highest that appears in the
// source data · Ordinary Time week 34 is always the id-mapped Christ the King
// solemnity (see calendrierRomcalIds.ts), never a plain numbered Sunday.
const ORDINAL_WORDS: Record<string, number> = {
	premier: 1,
	première: 1,
	second: 2,
	seconde: 2,
	deuxième: 2,
	troisième: 3,
	quatrième: 4,
	cinquième: 5,
	sixième: 6,
	septième: 7,
	huitième: 8,
	neuvième: 9,
	dixième: 10,
	onzième: 11,
	douzième: 12,
	treizième: 13,
	quatorzième: 14,
	quinzième: 15,
	seizième: 16,
	'dix-septième': 17,
	'dix-huitième': 18,
	'dix-neuvième': 19,
	vingtième: 20,
	'vingt-et-unième': 21,
	'vingt-deuxième': 22,
	'vingt-troisième': 23,
	'vingt-quatrième': 24,
	'vingt-cinquième': 25,
	'vingt-sixième': 26,
	'vingt-septième': 27,
	'vingt-huitième': 28,
	'vingt-neuvième': 29,
	trentième: 30,
	'trente-et-unième': 31,
	'trente-deuxième': 32,
	'trente-troisième': 33
};

const LEADING_WORD_RE = /^(\S+)\s+dimanche\b/i;

/**
 * Extracts the leading French ordinal word from a feast title, if the title
 * starts with "{ordinal} Dimanche ...". Returns null for titles that don't
 * start that way (named solemnities, Noël, Jeudi Saint, etc. · those are
 * matched by id instead, see calendrierRomcalIds.ts).
 */
export function parseFrenchOrdinal(title: string): number | null {
	const match = title.match(LEADING_WORD_RE);
	if (!match) return null;
	const word = match[1]!.toLowerCase();
	return ORDINAL_WORDS[word] ?? null;
}
