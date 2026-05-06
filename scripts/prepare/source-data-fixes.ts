// Normalize spacing around French guillemets « ». Source CCC HTML is
// inconsistent: some paragraphs have «X (no space) or X», others use a
// regular U+0020 space instead of the typographic NBSP (U+00A0). Unify
// both sides to a non-breaking space, including the tag-adjacent case
// like «<i>X</i>» which has no whitespace at all.
export function normalizeGuillemets(html: string): string {
	return html
		// Collapse any whitespace right after « into a single NBSP.
		.replace(/«[ \t ]*/g, '« ')
		// Collapse any whitespace right before » into a single NBSP.
		.replace(/[ \t ]*»/g, ' »')
		// Tag-adjacent: «<tag> and </tag>» have no whitespace to match above.
		.replace(/«(<[^>]+>)/g, '« $1')
		.replace(/(<\/[^>]+>)»/g, '$1 »');
}

// Strip the leading/trailing colon markers that the upstream JSON wraps
// around Bible refs (and a few Latin terms) inside parentheses. The source
// XHTML has e.g. `(<a class="bibRef">2 Tm 1, 12</a>)` and the processed
// JSON renders this as `( : 2 Tm 1, 12 : )` — readable, but the colons are
// noise. Restore the natural `(2 Tm 1, 12)` form for headings/titles.
export function stripBibRefColonMarkers(s: string): string {
	return s.replace(/\(\s*:\s*(.+?)\s*:\s*\)/g, '($1)');
}

// Walk past leading HTML tags + opening punctuation (« quotes, etc.) to find
// the first letter, then uppercase it. Returns the modified string.
export function capitalizeFirstWord(html: string): string {
	let i = 0;
	while (i < html.length) {
		const ch = html[i]!;
		if (ch === '<') {
			const end = html.indexOf('>', i);
			if (end < 0) return html;
			i = end + 1;
			continue;
		}
		if (/[\s«»‹›"'„“”‘’.,;:!?–— ]/.test(ch)) {
			i++;
			continue;
		}
		const upper = ch.toUpperCase();
		if (upper !== ch && /\p{L}/u.test(ch)) {
			return html.slice(0, i) + upper + html.slice(i + 1);
		}
		return html;
	}
	return html;
}

// When `bible_refs[i]` lacks a book prefix, inherit from `bible_refs[i-1]`.
// Recurring data quality bug — a continuation entry like "5:37" should be
// rewritten to "Mt 5:37" if the previous ref started with "Mt ...".
const BOOK_PREFIX_RE = /^([1-3]\s*)?[A-ZÉÈÊÂÄÔÎÏÜÇ][a-zéèêâäôîïüç]+/;

export function mergeBibleRefContinuations(
	refs: { text: string }[]
): { text: string }[] {
	const out: { text: string }[] = [];
	let lastBook: string | null = null;
	for (const r of refs) {
		const text = r.text.trim();
		const match = text.match(BOOK_PREFIX_RE);
		if (match) {
			lastBook = match[0].trim();
			out.push({ text });
		} else if (lastBook) {
			out.push({ text: `${lastBook} ${text}` });
		} else {
			out.push({ text });
		}
	}
	return out;
}

// `ccc_paras_processed.json` mistypes §2775 as a duplicate §2275: an
// "Oraison dominicale" intro line is dropped into the en_bref block that
// holds §§ 2773-2774-2776. The duplicate would otherwise overwrite the
// real §2275 and leave §2775 absent.
//
// Detect by sibling neighbourhood (a `2275` paragraph alongside `2774` or
// `2776`) and rewrite in-place to `2775`. Also restores the capital
// "Modèle" used in the Vatican French edition.
interface RawTreeNode {
	type: string;
	number?: number;
	text_html?: string;
	children?: RawTreeNode[];
}

export function fixCccParaSourceTypos(parts: RawTreeNode[]): void {
	function walk(node: RawTreeNode) {
		const kids = node.children;
		if (kids && kids.length > 0) {
			const numbers = new Set<number | undefined>();
			for (const c of kids) if (c.type === 'paragraph') numbers.add(c.number);
			if (numbers.has(2275) && (numbers.has(2774) || numbers.has(2776))) {
				for (const c of kids) {
					if (c.type === 'paragraph' && c.number === 2275) {
						c.number = 2775;
						if (c.text_html) {
							c.text_html = c.text_html.replace(
								'Maître et modèle',
								'Maître et Modèle'
							);
						}
					}
				}
			}
			for (const c of kids) walk(c);
		}
	}
	for (const p of parts) walk(p);
}
