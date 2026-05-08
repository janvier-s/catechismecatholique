import { bookByAbbr } from './bibleBookSlug';

/**
 * Parse a Bible ref string (raw from magisterial_refs, e.g. "Gn 9:9",
 * "voir Mt 5:3-4") and return /bible/{slug}/{chapter}/{verse} (or chapter
 * only when no verse is present), or null if unparseable.
 */
export function bibleRefUrl(raw: string): string | null {
	const cleaned = raw.replace(/^voir\s+/i, '').trim();
	// Continuation refs start with a digit and have no book prefix
	if (/^\d/.test(cleaned)) return null;
	// Match: optional "N " + abbreviation + chapter + optional verse
	const m = cleaned.match(/^(\d+\s+)?([A-Za-zÀ-ÿ]+)\s+(\d+)(?:[:, ]\s*(\d+))?/);
	if (!m || !m[2] || !m[3]) return null;
	const abbr = m[1] ? `${m[1].trim()} ${m[2]}` : m[2];
	const book = bookByAbbr(abbr);
	if (!book) return null;
	return m[4] ? `/bible/${book.slug}/${m[3]}/${m[4]}` : `/bible/${book.slug}/${m[3]}`;
}

/**
 * Linkify `<i>ABBR</i> CH,V` and `N <i>ABBR</i> CH,V` patterns in HTML.
 *
 * Used for Compendium answer_html where book abbreviations appear in italic
 * (e.g. `(<i>Gn</i> 17,5)` or `(1 <i>Tm</i> 2,4)`). Non-bible italic spans
 * (emphasis, proper names) are left untouched because bookByAbbr returns
 * undefined for anything that isn't a known abbreviation.
 *
 * When a verse number is present the link goes directly to the verse page
 * (/bible/{slug}/{ch}/{v}); chapter-only refs go to /bible/{slug}/{ch}#v1.
 * The <a> carries data-slug / data-chapter / data-verse for the hover tooltip.
 */
export function linkifyCompendiumBibleRefs(html: string): string {
	return html.replace(
		// Optional digit prefix (numbered books), then <i>Abbr</i>, then chapter[,verse][range]
		/(?<![A-Za-z0-9])(\d\s+)?<i>([A-Za-zÀ-ÿ]+)<\/i>(\s+\d+(?:[,:]\s*\d+(?:[-–]\d+)?)?)/g,
		(match, numPrefix: string | undefined, abbr: string, chapVerse: string) => {
			const fullAbbr = numPrefix ? `${numPrefix.trim()} ${abbr}` : abbr;
			const book = bookByAbbr(fullAbbr);
			if (!book) return match;
			const cv = chapVerse.trim();
			const chNum = cv.match(/^(\d+)/)?.[1];
			if (!chNum) return match;
			const verseNum = cv.match(/[,:]\s*(\d+)/)?.[1];
			const href = verseNum
				? `/bible/${book.slug}/${chNum}/${verseNum}`
				: `/bible/${book.slug}/${chNum}`;
			const dataVerse = verseNum ? ` data-verse="${verseNum}"` : '';
			return `<a class="compendium-bible-ref" href="${href}" data-slug="${book.slug}" data-chapter="${chNum}"${dataVerse}>${match}</a>`;
		}
	);
}

// ---------------------------------------------------------------------------
// Trent footnote linkification
// ---------------------------------------------------------------------------

// Latin abbreviation stems → Bible slug. Single-number-prefix books default
// to their "1st" form when no prefix is present (e.g. "Cor." → 1 Co).
const TRENT_ABBR: Record<string, string> = {
	Genes: 'genese',
	Gen: 'genese',
	Exod: 'exode',
	Lev: 'levitique',
	Num: 'nombres',
	Deut: 'deuteronome',
	Jos: 'josue',
	Josu: 'josue',
	Job: 'job',
	Psal: 'psaumes',
	Psalm: 'psaumes',
	Ps: 'psaumes',
	Prov: 'proverbes',
	Pr: 'proverbes',
	Eccl: 'qoheleth',
	Cant: 'cantique',
	Sap: 'sagesse',
	Is: 'isaie',
	Isa: 'isaie',
	Isai: 'isaie',
	Jer: 'jeremie',
	Jerem: 'jeremie',
	Thren: 'lamentations',
	Ezech: 'ezechiel',
	Dan: 'daniel',
	Os: 'osee',
	Amos: 'amos',
	Jonas: 'jonas',
	Mich: 'michee',
	Hab: 'habacuc',
	Zach: 'zacharie',
	Mal: 'malachie',
	Malach: 'malachie',
	Tob: 'tobie',
	Esth: 'esther',
	Matth: 'matthieu',
	Matt: 'matthieu',
	Math: 'matthieu',
	Marc: 'marc',
	Luc: 'luc',
	Joan: 'jean',
	Joann: 'jean',
	Jo: 'jean',
	Act: 'actes',
	Rom: 'romains',
	Cor: '1-corinthiens',
	Gal: 'galates',
	Eph: 'ephesiens',
	Philipp: 'philippiens',
	Col: 'colossiens',
	Colos: 'colossiens',
	Coloss: 'colossiens',
	Thess: '1-thessaloniciens',
	Tim: '1-timothee',
	Tit: 'tite',
	Hebr: 'hebreux',
	Heb: 'hebreux',
	Jac: 'jacques',
	Jacob: 'jacques',
	Pet: '1-pierre',
	Petr: '1-pierre',
	Ap: 'apocalypse',
	Apoc: 'apocalypse'
};

// Digit-prefixed books (Vulgate numbering: 1/2 Reg = 1/2 Sam, 3/4 Reg = 1/2 Kgs)
const TRENT_ABBR_NUMBERED: Record<string, Record<string, string>> = {
	'1': {
		Cor: '1-corinthiens',
		Thess: '1-thessaloniciens',
		Tim: '1-timothee',
		Pet: '1-pierre',
		Petr: '1-pierre',
		Joan: '1-jean',
		Joann: '1-jean',
		Reg: '1-samuel',
		Mach: '1-maccabees',
		Paral: '1-chroniques'
	},
	'2': {
		Cor: '2-corinthiens',
		Thess: '2-thessaloniciens',
		Tim: '2-timothee',
		Pet: '2-pierre',
		Petr: '2-pierre',
		Joan: '2-jean',
		Joann: '2-jean',
		Reg: '2-samuel',
		Mach: '2-maccabees',
		Paral: '2-chroniques'
	},
	'3': { Reg: '1-rois', Joan: '3-jean', Joann: '3-jean' },
	'4': { Reg: '2-rois' }
};

export interface TrentBibleRef {
	slug: string;
	chapter: number;
	verse?: number;
}

/**
 * Parse one Trent footnote text part (Latin format "Joan., 3, 6.") into
 * slug/chapter/verse, or null if not a recognisable Bible reference.
 */
export function parseTrentBibleRef(text: string): TrentBibleRef | null {
	const t = text.trim();
	// With single-digit prefix: "1 Cor., 1, 16."
	const m1 = t.match(/^(\d)\s+([A-Za-z]+)\.?\s*[,.]?\s*(\d+)\s*(?:,\s*(\d+))?/);
	if (m1?.[1] && m1?.[2] && m1?.[3]) {
		const slug = TRENT_ABBR_NUMBERED[m1[1]]?.[m1[2]];
		if (slug) {
			return {
				slug,
				chapter: parseInt(m1[3], 10),
				verse: m1[4] !== undefined ? parseInt(m1[4], 10) : undefined
			};
		}
	}
	// Without prefix: "Joan., 3, 6." or "Ezech. 36, 25."
	const m2 = t.match(/^([A-Za-z]+)\.?\s*[,.]?\s*(\d+)\s*(?:,\s*(\d+))?/);
	if (m2?.[1] && m2?.[2]) {
		const slug = TRENT_ABBR[m2[1]];
		if (slug) {
			return {
				slug,
				chapter: parseInt(m2[2], 10),
				verse: m2[3] !== undefined ? parseInt(m2[3], 10) : undefined
			};
		}
	}
	return null;
}

function escapeTrentText(t: string): string {
	return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Linkify a Trent footnote text. Single Bible refs like "Joan., 3, 6." become
 * <a class="trent-bible-ref"> links carrying data-slug/chapter/verse so the
 * BibleRefTooltip shows the verse text on hover.
 * Double refs joined by " = " (e.g. "Marc., 16, 15. = Matt., 28, 19.") are
 * each linkified independently.
 */
export function linkifyTrentFootnote(text: string): string {
	const parts = text.split(/\s*=\s*/);
	return parts
		.map((part) => {
			const ref = parseTrentBibleRef(part);
			if (!ref) return escapeTrentText(part);
			const href =
				ref.verse !== undefined
					? `/bible/${ref.slug}/${ref.chapter}/${ref.verse}`
					: `/bible/${ref.slug}/${ref.chapter}`;
			const dataVerse = ref.verse !== undefined ? ` data-verse="${ref.verse}"` : '';
			return `<a class="trent-bible-ref" href="${href}" data-slug="${ref.slug}" data-chapter="${ref.chapter}"${dataVerse}>${escapeTrentText(part)}</a>`;
		})
		.join(' = ');
}

// ---------------------------------------------------------------------------

/**
 * Linkify §NNN patterns to /cec/NNN links.
 * Used in corpus prose that embeds explicit CCC paragraph references.
 */
export function linkifyCecRefs(html: string): string {
	return html
		.split(/(<[^>]+>)/)
		.map((part) => {
			if (part.startsWith('<')) return part;
			return part.replace(
				/§\s*(\d+)/g,
				(_, num) => `<a class="cec-ref-inline" href="/cec/${num}">§${num}</a>`
			);
		})
		.join('');
}
