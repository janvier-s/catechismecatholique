export interface BookInfo {
	usfx: string; // 3-letter ID
	slug: string; // URL slug
	frenchName: string; // Display name
	abbrs: string[]; // French abbreviations used by the CCC
}

export const BOOKS: BookInfo[] = [
	{ usfx: 'GEN', slug: 'genese', frenchName: 'Genèse', abbrs: ['Gn', 'Gen', 'Genesis'] },
	{ usfx: 'EXO', slug: 'exode', frenchName: 'Exode', abbrs: ['Ex', 'Exo', 'Exod'] },
	{ usfx: 'LEV', slug: 'levitique', frenchName: 'Lévitique', abbrs: ['Lv', 'Lev'] },
	{ usfx: 'NUM', slug: 'nombres', frenchName: 'Nombres', abbrs: ['Nb', 'Num'] },
	{ usfx: 'DEU', slug: 'deuteronome', frenchName: 'Deutéronome', abbrs: ['Dt', 'Deut'] },
	{ usfx: 'JOS', slug: 'josue', frenchName: 'Josué', abbrs: ['Jos', 'Josh'] },
	{ usfx: 'JDG', slug: 'juges', frenchName: 'Juges', abbrs: ['Jg', 'Jdg', 'Judg'] },
	{ usfx: 'RUT', slug: 'ruth', frenchName: 'Ruth', abbrs: ['Rt'] },
	{ usfx: '1SA', slug: '1-samuel', frenchName: '1 Samuel', abbrs: ['1 S', '1 Sm', '1 Sam'] },
	{ usfx: '2SA', slug: '2-samuel', frenchName: '2 Samuel', abbrs: ['2 S', '2 Sm', '2 Sam'] },
	{ usfx: '1KI', slug: '1-rois', frenchName: '1 Rois', abbrs: ['1 R', '1 Kgs'] },
	{ usfx: '2KI', slug: '2-rois', frenchName: '2 Rois', abbrs: ['2 R', '2 Kgs'] },
	{ usfx: '1CH', slug: '1-chroniques', frenchName: '1 Chroniques', abbrs: ['1 Ch', '1 Chr'] },
	{ usfx: '2CH', slug: '2-chroniques', frenchName: '2 Chroniques', abbrs: ['2 Ch', '2 Chr'] },
	{ usfx: 'EZR', slug: 'esdras', frenchName: 'Esdras', abbrs: ['Esd', 'Ezra'] },
	{ usfx: 'NEH', slug: 'nehemie', frenchName: 'Néhémie', abbrs: ['Ne', 'Néh', 'Neh'] },
	{ usfx: 'TOB', slug: 'tobie', frenchName: 'Tobie', abbrs: ['Tb', 'Tob'] },
	{ usfx: 'JDT', slug: 'judith', frenchName: 'Judith', abbrs: ['Jdt'] },
	{ usfx: 'EST', slug: 'esther', frenchName: 'Esther', abbrs: ['Est', 'Esth'] },
	{ usfx: '1MA', slug: '1-maccabees', frenchName: '1 Maccabées', abbrs: ['1 M', '1 Macc'] },
	{ usfx: '2MA', slug: '2-maccabees', frenchName: '2 Maccabées', abbrs: ['2 M', '2 Macc'] },
	{ usfx: 'JOB', slug: 'job', frenchName: 'Job', abbrs: ['Jb', 'Job'] },
	{ usfx: 'PSA', slug: 'psaumes', frenchName: 'Psaumes', abbrs: ['Ps', 'Psalm', 'Psalms'] },
	{ usfx: 'PRO', slug: 'proverbes', frenchName: 'Proverbes', abbrs: ['Pr', 'Prov', 'Proverbs'] },
	{ usfx: 'ECC', slug: 'qoheleth', frenchName: 'Qohélet', abbrs: ['Qo', 'Eccl'] },
	{ usfx: 'SNG', slug: 'cantique', frenchName: 'Cantique des cantiques', abbrs: ['Ct', 'Song'] },
	{ usfx: 'WIS', slug: 'sagesse', frenchName: 'Sagesse', abbrs: ['Sg', 'Wis'] },
	{ usfx: 'SIR', slug: 'siracide', frenchName: 'Siracide', abbrs: ['Si', 'Sir'] },
	{ usfx: 'ISA', slug: 'isaie', frenchName: 'Isaïe', abbrs: ['Is', 'Isa', 'Isaiah'] },
	{ usfx: 'JER', slug: 'jeremie', frenchName: 'Jérémie', abbrs: ['Jr', 'Jer'] },
	{ usfx: 'LAM', slug: 'lamentations', frenchName: 'Lamentations', abbrs: ['Lm', 'Lam'] },
	{ usfx: 'BAR', slug: 'baruch', frenchName: 'Baruch', abbrs: ['Ba', 'Bar'] },
	{ usfx: 'EZK', slug: 'ezechiel', frenchName: 'Ézéchiel', abbrs: ['Ez', 'Ezek', 'Ezekiel'] },
	{ usfx: 'DAN', slug: 'daniel', frenchName: 'Daniel', abbrs: ['Dn', 'Dan'] },
	{ usfx: 'HOS', slug: 'osee', frenchName: 'Osée', abbrs: ['Os', 'Hos'] },
	{ usfx: 'JOL', slug: 'joel', frenchName: 'Joël', abbrs: ['Jl', 'Joel'] },
	{ usfx: 'AMO', slug: 'amos', frenchName: 'Amos', abbrs: ['Am', 'Amos'] },
	{ usfx: 'OBA', slug: 'abdias', frenchName: 'Abdias', abbrs: ['Ab'] },
	{ usfx: 'JON', slug: 'jonas', frenchName: 'Jonas', abbrs: ['Jon', 'Jonah'] },
	{ usfx: 'MIC', slug: 'michee', frenchName: 'Michée', abbrs: ['Mi', 'Mic'] },
	{ usfx: 'NAM', slug: 'nahum', frenchName: 'Nahum', abbrs: ['Na'] },
	{ usfx: 'HAB', slug: 'habacuc', frenchName: 'Habacuc', abbrs: ['Ha', 'Hab'] },
	{ usfx: 'ZEP', slug: 'sophonie', frenchName: 'Sophonie', abbrs: ['So', 'Zeph'] },
	{ usfx: 'HAG', slug: 'aggee', frenchName: 'Aggée', abbrs: ['Ag', 'Hag'] },
	{ usfx: 'ZEC', slug: 'zacharie', frenchName: 'Zacharie', abbrs: ['Za', 'Zech'] },
	{ usfx: 'MAL', slug: 'malachie', frenchName: 'Malachie', abbrs: ['Ml', 'Mal'] },
	{ usfx: 'MAT', slug: 'matthieu', frenchName: 'Matthieu', abbrs: ['Mt', 'Matt', 'Matthew'] },
	{ usfx: 'MRK', slug: 'marc', frenchName: 'Marc', abbrs: ['Mc', 'Mk', 'Mark', 'Marc'] },
	{ usfx: 'LUK', slug: 'luc', frenchName: 'Luc', abbrs: ['Lc', 'Lk', 'Luke'] },
	{ usfx: 'JHN', slug: 'jean', frenchName: 'Jean', abbrs: ['Jn', 'John'] },
	{ usfx: 'ACT', slug: 'actes', frenchName: 'Actes des Apôtres', abbrs: ['Ac', 'Acts'] },
	{ usfx: 'ROM', slug: 'romains', frenchName: 'Romains', abbrs: ['Rm', 'Rom'] },
	{ usfx: '1CO', slug: '1-corinthiens', frenchName: '1 Corinthiens', abbrs: ['1 Co', '1 Cor'] },
	{ usfx: '2CO', slug: '2-corinthiens', frenchName: '2 Corinthiens', abbrs: ['2 Co', '2 Cor'] },
	{ usfx: 'GAL', slug: 'galates', frenchName: 'Galates', abbrs: ['Ga', 'Gal'] },
	{ usfx: 'EPH', slug: 'ephesiens', frenchName: 'Éphésiens', abbrs: ['Ep', 'Eph'] },
	{ usfx: 'PHP', slug: 'philippiens', frenchName: 'Philippiens', abbrs: ['Ph', 'Phil'] },
	{ usfx: 'COL', slug: 'colossiens', frenchName: 'Colossiens', abbrs: ['Col'] },
	{
		usfx: '1TH',
		slug: '1-thessaloniciens',
		frenchName: '1 Thessaloniciens',
		abbrs: ['1 Th', '1 Thess']
	},
	{
		usfx: '2TH',
		slug: '2-thessaloniciens',
		frenchName: '2 Thessaloniciens',
		abbrs: ['2 Th', '2 Thess']
	},
	{ usfx: '1TI', slug: '1-timothee', frenchName: '1 Timothée', abbrs: ['1 Tm', '1 Tim'] },
	{ usfx: '2TI', slug: '2-timothee', frenchName: '2 Timothée', abbrs: ['2 Tm', '2 Tim'] },
	{ usfx: 'TIT', slug: 'tite', frenchName: 'Tite', abbrs: ['Tt', 'Titus'] },
	{ usfx: 'PHM', slug: 'philemon', frenchName: 'Philémon', abbrs: ['Phm', 'Phlm'] },
	{ usfx: 'HEB', slug: 'hebreux', frenchName: 'Hébreux', abbrs: ['He', 'Heb'] },
	{ usfx: 'JAS', slug: 'jacques', frenchName: 'Jacques', abbrs: ['Jc', 'Jas', 'James'] },
	{ usfx: '1PE', slug: '1-pierre', frenchName: '1 Pierre', abbrs: ['1 P', '1 Pet'] },
	{ usfx: '2PE', slug: '2-pierre', frenchName: '2 Pierre', abbrs: ['2 P', '2 Pet'] },
	{ usfx: '1JN', slug: '1-jean', frenchName: '1 Jean', abbrs: ['1 Jn', '1 John'] },
	{ usfx: '2JN', slug: '2-jean', frenchName: '2 Jean', abbrs: ['2 Jn', '2 John'] },
	{ usfx: '3JN', slug: '3-jean', frenchName: '3 Jean', abbrs: ['3 Jn', '3 John'] },
	{ usfx: 'JUD', slug: 'jude', frenchName: 'Jude', abbrs: ['Jude'] },
	{
		usfx: 'REV',
		slug: 'apocalypse',
		frenchName: 'Apocalypse',
		abbrs: ['Ap', 'Rev', 'Revelation', 'Revelations']
	}
];

export function bookBySlug(slug: string): BookInfo | undefined {
	return BOOKS.find((b) => b.slug === slug);
}
export function bookByUsfx(usfx: string): BookInfo | undefined {
	return BOOKS.find((b) => b.usfx === usfx);
}
export function bookByAbbr(abbr: string): BookInfo | undefined {
	const lower = abbr.trim().toLowerCase();
	return BOOKS.find(
		(b) => b.abbrs.some((a) => a.toLowerCase() === lower) || b.frenchName.toLowerCase() === lower
	);
}

export type Testament = 'OT' | 'NT';

/**
 * Testament boundary: the first NT book is Matthieu (MAT). All books
 * before it in BOOKS are OT, all from MAT onward are NT.
 */
const NT_START_INDEX = BOOKS.findIndex((b) => b.usfx === 'MAT');

export function bookTestament(slug: string): Testament {
	const idx = BOOKS.findIndex((b) => b.slug === slug);
	return idx >= NT_START_INDEX ? 'NT' : 'OT';
}

export const OT_BOOKS: BookInfo[] = BOOKS.slice(0, NT_START_INDEX);
export const NT_BOOKS: BookInfo[] = BOOKS.slice(NT_START_INDEX);

// ─── Verse-ref linkifier ──────────────────────────────────────────────────────
// Builds maps and regex once at module load time.
const ABBR_TO_SLUG = new Map<string, string>();
const ABBR_TO_FULL = new Map<string, string>();
for (const book of BOOKS) {
	for (const abbr of book.abbrs) {
		ABBR_TO_SLUG.set(abbr, book.slug);
		ABBR_TO_FULL.set(abbr, book.frenchName);
	}
}

// Sort longest-first so multi-word abbreviations ("1 Tm") match before their
// short counterparts ("Tm") in the alternation.
const SORTED_ABBRS = [...ABBR_TO_SLUG.keys()].sort((a, b) => b.length - a.length);
const ABBR_PATTERN = SORTED_ABBRS.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const VERSE_REF_RE = new RegExp(`(${ABBR_PATTERN})\\s+(\\d+),\\s*(\\d+(?:[–-]\\d+)?)`, 'g');

export function linkifyVerseRefs(text: string): string {
	return text.replace(VERSE_REF_RE, (match, abbr: string, chapter: string, verse: string) => {
		const slug = ABBR_TO_SLUG.get(abbr);
		if (!slug) return match;
		return `<a href="/bible/${slug}/${chapter}" class="verse-ref" data-slug="${slug}" data-chapter="${chapter}" data-verse="${verse}">${match}</a>`;
	});
}

/** Previous book in canonical order, or undefined at Genesis. */
export function getPrevBook(slug: string): BookInfo | undefined {
	const idx = BOOKS.findIndex((b) => b.slug === slug);
	return idx > 0 ? BOOKS[idx - 1] : undefined;
}

/** Next book in canonical order, or undefined at Apocalypse. */
export function getNextBook(slug: string): BookInfo | undefined {
	const idx = BOOKS.findIndex((b) => b.slug === slug);
	return idx >= 0 && idx < BOOKS.length - 1 ? BOOKS[idx + 1] : undefined;
}
