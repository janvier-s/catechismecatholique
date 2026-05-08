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
