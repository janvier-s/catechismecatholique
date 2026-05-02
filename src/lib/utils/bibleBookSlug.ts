export interface BookInfo {
	usfx: string; // 3-letter ID
	slug: string; // URL slug
	frenchName: string; // Display name
	abbrs: string[]; // French abbreviations used by the CCC
}

export const BOOKS: BookInfo[] = [
	{ usfx: 'GEN', slug: 'genese', frenchName: 'Genèse', abbrs: ['Gn', 'Gen'] },
	{ usfx: 'EXO', slug: 'exode', frenchName: 'Exode', abbrs: ['Ex', 'Exo'] },
	{ usfx: 'LEV', slug: 'levitique', frenchName: 'Lévitique', abbrs: ['Lv', 'Lev'] },
	{ usfx: 'NUM', slug: 'nombres', frenchName: 'Nombres', abbrs: ['Nb', 'Num'] },
	{ usfx: 'DEU', slug: 'deuteronome', frenchName: 'Deutéronome', abbrs: ['Dt', 'Deut'] },
	{ usfx: 'JOS', slug: 'josue', frenchName: 'Josué', abbrs: ['Jos'] },
	{ usfx: 'JDG', slug: 'juges', frenchName: 'Juges', abbrs: ['Jg', 'Jdg'] },
	{ usfx: 'RUT', slug: 'ruth', frenchName: 'Ruth', abbrs: ['Rt'] },
	{ usfx: '1SA', slug: '1-samuel', frenchName: '1 Samuel', abbrs: ['1 S', '1 Sm'] },
	{ usfx: '2SA', slug: '2-samuel', frenchName: '2 Samuel', abbrs: ['2 S', '2 Sm'] },
	{ usfx: '1KI', slug: '1-rois', frenchName: '1 Rois', abbrs: ['1 R'] },
	{ usfx: '2KI', slug: '2-rois', frenchName: '2 Rois', abbrs: ['2 R'] },
	{ usfx: '1CH', slug: '1-chroniques', frenchName: '1 Chroniques', abbrs: ['1 Ch'] },
	{ usfx: '2CH', slug: '2-chroniques', frenchName: '2 Chroniques', abbrs: ['2 Ch'] },
	{ usfx: 'EZR', slug: 'esdras', frenchName: 'Esdras', abbrs: ['Esd'] },
	{ usfx: 'NEH', slug: 'nehemie', frenchName: 'Néhémie', abbrs: ['Ne', 'Néh'] },
	{ usfx: 'TOB', slug: 'tobie', frenchName: 'Tobie', abbrs: ['Tb'] },
	{ usfx: 'JDT', slug: 'judith', frenchName: 'Judith', abbrs: ['Jdt'] },
	{ usfx: 'EST', slug: 'esther', frenchName: 'Esther', abbrs: ['Est'] },
	{ usfx: '1MA', slug: '1-maccabees', frenchName: '1 Maccabées', abbrs: ['1 M'] },
	{ usfx: '2MA', slug: '2-maccabees', frenchName: '2 Maccabées', abbrs: ['2 M'] },
	{ usfx: 'JOB', slug: 'job', frenchName: 'Job', abbrs: ['Jb'] },
	{ usfx: 'PSA', slug: 'psaumes', frenchName: 'Psaumes', abbrs: ['Ps'] },
	{ usfx: 'PRO', slug: 'proverbes', frenchName: 'Proverbes', abbrs: ['Pr', 'Prov'] },
	{ usfx: 'ECC', slug: 'qoheleth', frenchName: 'Qohélet', abbrs: ['Qo', 'Eccl'] },
	{ usfx: 'SNG', slug: 'cantique', frenchName: 'Cantique des cantiques', abbrs: ['Ct'] },
	{ usfx: 'WIS', slug: 'sagesse', frenchName: 'Sagesse', abbrs: ['Sg'] },
	{ usfx: 'SIR', slug: 'siracide', frenchName: 'Siracide', abbrs: ['Si'] },
	{ usfx: 'ISA', slug: 'isaie', frenchName: 'Isaïe', abbrs: ['Is'] },
	{ usfx: 'JER', slug: 'jeremie', frenchName: 'Jérémie', abbrs: ['Jr'] },
	{ usfx: 'LAM', slug: 'lamentations', frenchName: 'Lamentations', abbrs: ['Lm'] },
	{ usfx: 'BAR', slug: 'baruch', frenchName: 'Baruch', abbrs: ['Ba'] },
	{ usfx: 'EZK', slug: 'ezechiel', frenchName: 'Ézéchiel', abbrs: ['Ez'] },
	{ usfx: 'DAN', slug: 'daniel', frenchName: 'Daniel', abbrs: ['Dn'] },
	{ usfx: 'HOS', slug: 'osee', frenchName: 'Osée', abbrs: ['Os'] },
	{ usfx: 'JOL', slug: 'joel', frenchName: 'Joël', abbrs: ['Jl'] },
	{ usfx: 'AMO', slug: 'amos', frenchName: 'Amos', abbrs: ['Am'] },
	{ usfx: 'OBA', slug: 'abdias', frenchName: 'Abdias', abbrs: ['Ab'] },
	{ usfx: 'JON', slug: 'jonas', frenchName: 'Jonas', abbrs: ['Jon'] },
	{ usfx: 'MIC', slug: 'michee', frenchName: 'Michée', abbrs: ['Mi'] },
	{ usfx: 'NAM', slug: 'nahum', frenchName: 'Nahum', abbrs: ['Na'] },
	{ usfx: 'HAB', slug: 'habacuc', frenchName: 'Habacuc', abbrs: ['Ha'] },
	{ usfx: 'ZEP', slug: 'sophonie', frenchName: 'Sophonie', abbrs: ['So'] },
	{ usfx: 'HAG', slug: 'aggee', frenchName: 'Aggée', abbrs: ['Ag'] },
	{ usfx: 'ZEC', slug: 'zacharie', frenchName: 'Zacharie', abbrs: ['Za'] },
	{ usfx: 'MAL', slug: 'malachie', frenchName: 'Malachie', abbrs: ['Ml'] },
	{ usfx: 'MAT', slug: 'matthieu', frenchName: 'Matthieu', abbrs: ['Mt'] },
	{ usfx: 'MRK', slug: 'marc', frenchName: 'Marc', abbrs: ['Mc'] },
	{ usfx: 'LUK', slug: 'luc', frenchName: 'Luc', abbrs: ['Lc'] },
	{ usfx: 'JHN', slug: 'jean', frenchName: 'Jean', abbrs: ['Jn'] },
	{ usfx: 'ACT', slug: 'actes', frenchName: 'Actes des Apôtres', abbrs: ['Ac'] },
	{ usfx: 'ROM', slug: 'romains', frenchName: 'Romains', abbrs: ['Rm'] },
	{ usfx: '1CO', slug: '1-corinthiens', frenchName: '1 Corinthiens', abbrs: ['1 Co'] },
	{ usfx: '2CO', slug: '2-corinthiens', frenchName: '2 Corinthiens', abbrs: ['2 Co'] },
	{ usfx: 'GAL', slug: 'galates', frenchName: 'Galates', abbrs: ['Ga'] },
	{ usfx: 'EPH', slug: 'ephesiens', frenchName: 'Éphésiens', abbrs: ['Ep'] },
	{ usfx: 'PHP', slug: 'philippiens', frenchName: 'Philippiens', abbrs: ['Ph'] },
	{ usfx: 'COL', slug: 'colossiens', frenchName: 'Colossiens', abbrs: ['Col'] },
	{ usfx: '1TH', slug: '1-thessaloniciens', frenchName: '1 Thessaloniciens', abbrs: ['1 Th'] },
	{ usfx: '2TH', slug: '2-thessaloniciens', frenchName: '2 Thessaloniciens', abbrs: ['2 Th'] },
	{ usfx: '1TI', slug: '1-timothee', frenchName: '1 Timothée', abbrs: ['1 Tm'] },
	{ usfx: '2TI', slug: '2-timothee', frenchName: '2 Timothée', abbrs: ['2 Tm'] },
	{ usfx: 'TIT', slug: 'tite', frenchName: 'Tite', abbrs: ['Tt'] },
	{ usfx: 'PHM', slug: 'philemon', frenchName: 'Philémon', abbrs: ['Phm'] },
	{ usfx: 'HEB', slug: 'hebreux', frenchName: 'Hébreux', abbrs: ['He'] },
	{ usfx: 'JAS', slug: 'jacques', frenchName: 'Jacques', abbrs: ['Jc'] },
	{ usfx: '1PE', slug: '1-pierre', frenchName: '1 Pierre', abbrs: ['1 P'] },
	{ usfx: '2PE', slug: '2-pierre', frenchName: '2 Pierre', abbrs: ['2 P'] },
	{ usfx: '1JN', slug: '1-jean', frenchName: '1 Jean', abbrs: ['1 Jn'] },
	{ usfx: '2JN', slug: '2-jean', frenchName: '2 Jean', abbrs: ['2 Jn'] },
	{ usfx: '3JN', slug: '3-jean', frenchName: '3 Jean', abbrs: ['3 Jn'] },
	{ usfx: 'JUD', slug: 'jude', frenchName: 'Jude', abbrs: ['Jude'] },
	{ usfx: 'REV', slug: 'apocalypse', frenchName: 'Apocalypse', abbrs: ['Ap'] }
];

export function bookBySlug(slug: string): BookInfo | undefined {
	return BOOKS.find((b) => b.slug === slug);
}
export function bookByUsfx(usfx: string): BookInfo | undefined {
	return BOOKS.find((b) => b.usfx === usfx);
}
export function bookByAbbr(abbr: string): BookInfo | undefined {
	const norm = abbr.trim();
	return BOOKS.find((b) => b.abbrs.some((a) => a === norm));
}
