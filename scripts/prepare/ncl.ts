type Bible = Record<string, Record<string, Record<string, string>>>;

export function normalizeVerseText(s: string): string {
	// Collapse all whitespace to single spaces.
	let out = s.replace(/\s+/g, ' ').trim();
	// Strip spaces around apostrophes (both ASCII ' and typographic ’).
	out = out.replace(/\s*['’]\s*/g, '’');
	// Strip space before , . (no NBSP for these in French).
	out = out.replace(/\s+([,.])/g, '$1');
	// French rule: NBSP before : ! ? » (and remove existing spaces first).
	out = out.replace(/\s*([:;!?»])/g, ' $1');
	// French rule: NBSP after « (opening guillemet).
	out = out.replace(/(«)\s*/g, '« ');
	// Tighten parens: no space after ( or before ).
	out = out.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
	return out;
}

/**
 * Parse a Neo-Crampon Libre USFX (eBible.org Unified Scripture Format XML)
 * document into a `{ book: { chapter: { verse: text } } }` structure.
 *
 * USFX is irregular enough that xml2js's deep-nested array form is awkward
 * (mixed text + many self-closing markers, footnotes interleaved with verse
 * text). A tag-by-tag regex sweep with explicit state is simpler.
 *
 * Skipped containers:
 *   <f>...</f>   — footnotes (text MUST NOT enter the verse buffer)
 *   <x>...</x>   — cross-references (same)
 *   <s>...</s>   — section titles (e.g. "La faute et le châtiment") are
 *                  metadata, not verse text
 *   <d>...</d>   — descriptive psalm subscriptions (e.g. "Au maître de
 *                  chant. Psaume de David."). Some psalms encode these
 *                  with a <v> marker inside the <d>; that "verse" is
 *                  dropped (its text is empty after skipping).
 *   <p style="…">...</p>
 *                — paragraphs whose style is metadata (cross-references,
 *                  major section titles, descriptive subscriptions, etc.).
 *                  See the open-tag handler for the exact set.
 *
 * Markers consumed for state:
 *   <book id="…">  starts a book, resets chapter/verse
 *   <c id="…"/>    starts a chapter, commits any open verse
 *   <v id="…"/>    starts a verse, commits any previous verse
 *   <ve/>          (no-op; verse is committed when next <v>/<c>/</book> hits)
 *
 * `async` to keep callers compatible with a future swap to a streaming parser.
 */
export async function parseUSFX(xml: string): Promise<Bible> {
	const result: Bible = {};
	let currentBook = '';
	let currentChap = '';
	let currentVerse: string | null = null;
	let buf: string[] = [];
	// Depth of nested skip-containers (<f> / <x> / <s> / metadata <p>). Text
	// is buffered only when 0.
	let skipDepth = 0;
	// Tracks open metadata <p> containers specifically — needed because we
	// only skip <p> when its style attribute matches the metadata set, and
	// the close-tag handler has no access to the original opening attributes.
	let pMetadataDepth = 0;

	function commitVerse() {
		if (currentVerse !== null && currentBook && currentChap) {
			const text = normalizeVerseText(buf.join(' '));
			if (text) {
				if (!result[currentBook]) result[currentBook] = {};
				if (!result[currentBook]![currentChap]) result[currentBook]![currentChap] = {};
				result[currentBook]![currentChap]![currentVerse] = text;
			}
		}
		buf = [];
	}

	// Match: opening/self-closing tag, closing tag, or a run of text.
	// `\b` after the tag name + `[^>]*?` handles `<v id="1"/>` and `<v id="1" />`.
	const tagRe = /<(\w+)\b([^>]*?)(\/?)>|<\/(\w+)>|([^<]+)/g;
	let match: RegExpExecArray | null;
	while ((match = tagRe.exec(xml)) !== null) {
		const [, openTag, attrs, selfClose, closeTag, text] = match;

		if (openTag) {
			// Opening / self-closing element.
			if (openTag === 'book') {
				commitVerse();
				const idMatch = (attrs ?? '').match(/id="([^"]+)"/);
				currentBook = idMatch ? idMatch[1]! : '';
				currentChap = '';
				currentVerse = null;
				skipDepth = 0;
				pMetadataDepth = 0;
			} else if (openTag === 'id') {
				// `<id id="GEN" />` is informational; ignore (book is already set).
			} else if (openTag === 'c') {
				commitVerse();
				const idMatch = (attrs ?? '').match(/id="([^"]+)"/);
				currentChap = idMatch ? idMatch[1]! : '';
				currentVerse = null;
			} else if (openTag === 'v') {
				commitVerse();
				const idMatch = (attrs ?? '').match(/id="([^"]+)"/);
				currentVerse = idMatch ? idMatch[1]! : null;
			} else if (openTag === 've') {
				// Verse-end marker — no-op; commit happens at next verse boundary.
			} else if (openTag === 'f' || openTag === 'x' || openTag === 's' || openTag === 'd') {
				// Enter footnote / cross-ref / section-title / description skip
				// block (only if not self-closing).
				if (selfClose !== '/') skipDepth++;
			} else if (openTag === 'p') {
				// Skip non-content <p> styles. USFX uses these for metadata headings,
				// not verse content:
				//   r        - cross-reference parenthetical
				//   ms, ms1, ms2, ms3, ms4 - major section title
				//   mr       - major section reference
				//   d        - descriptive paragraph (e.g. Psalm subscriptions)
				//   sr       - section reference range
				// Content styles (kept transparent): p, m, mi, pi, pi1-pi3, q, q1-q4,
				//   b, li, li1-li4, sp, etc.
				const styleMatch = (attrs ?? '').match(/style="([^"]+)"/);
				const style = styleMatch?.[1] ?? '';
				const isMetadata =
					style === 'r' ||
					style === 'mr' ||
					style === 'd' ||
					style === 'sr' ||
					/^ms\d*$/.test(style);
				if (isMetadata && selfClose !== '/') {
					skipDepth++;
					pMetadataDepth++;
				}
			}
			// All other open tags (<w>, <h>, <toc>, <wj>, …) are transparent:
			// their text content is captured by the text branch.
		} else if (closeTag) {
			if (closeTag === 'f' || closeTag === 'x' || closeTag === 's' || closeTag === 'd') {
				if (skipDepth > 0) skipDepth--;
			} else if (closeTag === 'p' && pMetadataDepth > 0) {
				pMetadataDepth--;
				skipDepth--;
			}
		} else if (text !== undefined) {
			if (skipDepth > 0) continue;
			const cleaned = text.replace(/\s+/g, ' ').trim();
			if (cleaned) buf.push(cleaned);
		}
	}
	commitVerse();
	return result;
}
