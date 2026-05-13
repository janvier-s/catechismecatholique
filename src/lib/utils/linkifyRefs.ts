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
// Vatican II Bible refs
// ---------------------------------------------------------------------------

const ROMAN_VAL: Record<string, number> = {
	i: 1,
	v: 5,
	x: 10,
	l: 50,
	c: 100,
	d: 500,
	m: 1000
};

function romanToInt(roman: string): number | null {
	const s = roman.trim().toLowerCase();
	if (!s || !/^[ivxlcdm]+$/.test(s)) return null;
	let total = 0;
	let prev = 0;
	for (let i = s.length - 1; i >= 0; i--) {
		const v = ROMAN_VAL[s[i]!]!;
		if (v < prev) total -= v;
		else {
			total += v;
			prev = v;
		}
	}
	return total > 0 ? total : null;
}

type VatTok = { kind: 'book' | 'chap' | 'verse'; text: string; start: number; end: number };

function tokenizeVatIIRef(inner: string): VatTok[] {
	const re = /<span class="(ss|ssc|ssv)">([^<]+)<\/span>/g;
	const out: VatTok[] = [];
	let m;
	while ((m = re.exec(inner)) !== null) {
		const cls = m[1]!;
		const kind: 'book' | 'chap' | 'verse' =
			cls === 'ss' ? 'book' : cls === 'ssc' ? 'chap' : 'verse';
		out.push({ kind, text: m[2]!, start: m.index, end: m.index + m[0].length });
	}
	return out;
}

type VatCluster = { chNum: number; verses: number[]; openIdx: number; closeIdx: number };

function parseChapter(text: string): number | null {
	const t = text.trim();
	if (/^\d+$/.test(t)) {
		const n = parseInt(t, 10);
		return Number.isFinite(n) && n > 0 ? n : null;
	}
	return romanToInt(t);
}

function parseVatIIClusters(inner: string): VatCluster[] {
	const toks = tokenizeVatIIRef(inner);
	const clusters: VatCluster[] = [];
	let cur: VatCluster | null = null;

	for (let i = 0; i < toks.length; i++) {
		const t = toks[i]!;
		if (t.kind === 'book') continue;

		const prev = i > 0 ? toks[i - 1]! : null;
		const sep = prev ? inner.slice(prev.end, t.start) : '';

		if (t.kind === 'chap') {
			const ch = parseChapter(t.text);
			if (ch === null) continue;
			if (cur) clusters.push(cur);
			cur = { chNum: ch, verses: [], openIdx: t.start, closeIdx: t.end };
			continue;
		}

		// verse token
		if (!cur) continue;
		const vNum = parseInt(t.text, 10);
		if (!Number.isFinite(vNum)) continue;

		// Verse range endpoint: prev separator is `-` / `–`
		if (/^\s*[-–]\s*$/.test(sep) && cur.verses.length > 0) {
			const last = cur.verses[cur.verses.length - 1]!;
			if (vNum > last && vNum - last <= 60) {
				for (let v = last + 1; v <= vNum; v++) cur.verses.push(v);
			} else {
				cur.verses.push(vNum);
			}
			cur.closeIdx = t.end;
			continue;
		}

		// `X et Y, Z` pattern: ssv after ` et ` followed by `, ssv` means Y
		// is a new chapter (often arabic). Open a new cluster.
		const next = i + 1 < toks.length ? toks[i + 1]! : null;
		const isChapterLikeAfterEt =
			/^\s*et\s*$/.test(sep) &&
			next?.kind === 'verse' &&
			/^\s*,\s*$/.test(inner.slice(t.end, next.start));
		if (isChapterLikeAfterEt) {
			if (cur) clusters.push(cur);
			cur = { chNum: vNum, verses: [], openIdx: t.start, closeIdx: t.end };
			continue;
		}

		// Otherwise: additional verse in current cluster.
		cur.verses.push(vNum);
		cur.closeIdx = t.end;
	}
	if (cur) clusters.push(cur);
	return clusters;
}

/**
 * Linkify Bible references in Vatican II prose. The source HTML encodes refs as
 *   <span class="emphasis"><em>
 *     <span class="ss">{Abbr}</span> <span class="ssc">{ChapRoman}</span>,
 *     <span class="ssv">{Verse}</span>[-<span class="ssv">{Verse2}</span>]
 *   </em></span>
 *
 * Abbreviations are concatenated for numbered books ("1Tm", "2P", "2Co"); a
 * handful of sources split the digit prefix into a separate emphasis block
 * (`<em>1</em></span> <span...><em><span class="ss">Jn</span>...`); those are
 * merged before parsing so the abbr resolves correctly.
 *
 * Compound refs like `Jn xiv, 26 ; xvi, 12-13 ; vii, 39` are split into one
 * <a class="vat-ii-bible-ref"> anchor per chapter cluster. Each anchor carries
 * the full verse list as data-verses so the BibleRefTooltip can show every
 * cited verse in a single preview.
 */
export function linkifyVaticanIIBibleRefs(html: string): string {
	// Merge split-prefix emphasis blocks ("1" in its own <em>, then book ref)
	// into a single emphasis block with "{digit} {abbr}" inside the ss span.
	const merged = html.replace(
		/<span class="emphasis"><em>\s*([123])\s*<\/em><\/span>[\s ]+<span class="emphasis"><em><span class="ss">([A-Za-z]+)<\/span>/g,
		(_m, digit: string, abbr: string) =>
			`<span class="emphasis"><em><span class="ss">${digit} ${abbr}</span>`
	);

	return merged.replace(
		/<span class="emphasis"><em>(<span class="ss">([^<]+)<\/span>[\s\S]*?)<\/em><\/span>/g,
		(match, inner: string, abbrRaw: string) => {
			const trimmed = abbrRaw.trim();
			const abbrNorm = /^[1-3][A-Za-z]/.test(trimmed)
				? `${trimmed[0]} ${trimmed.slice(1)}`
				: trimmed;
			const book = bookByAbbr(abbrNorm);
			if (!book) return match;

			const clusters = parseVatIIClusters(inner);
			if (clusters.length === 0) return match;

			// Extend the first cluster's anchor to include the book ss span and
			// any leading text so the whole `{Abbr} {Chap}, {Verse}` reads as one
			// clickable unit.
			clusters[0]!.openIdx = 0;

			let body = '';
			let pos = 0;
			for (const c of clusters) {
				body += inner.slice(pos, c.openIdx);
				const content = inner.slice(c.openIdx, c.closeIdx);
				const firstV = c.verses[0];
				const href =
					firstV !== undefined
						? `/bible/${book.slug}/${c.chNum}/${firstV}`
						: `/bible/${book.slug}/${c.chNum}`;
				const dataVerse = firstV !== undefined ? ` data-verse="${firstV}"` : '';
				const dataVerses = c.verses.length > 1 ? ` data-verses="${c.verses.join(',')}"` : '';
				body += `<a class="vat-ii-bible-ref" href="${href}" data-slug="${book.slug}" data-chapter="${c.chNum}"${dataVerse}${dataVerses}>${content}</a>`;
				pos = c.closeIdx;
			}
			body += inner.slice(pos);
			return `<span class="emphasis"><em>${body}</em></span>`;
		}
	);
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
