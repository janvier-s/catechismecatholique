type Bible = Record<string, Record<string, Record<string, string>>>;

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
 *   <p style="r">...</p>
 *                — cross-reference paragraphs (e.g. "(Job 38)") are also
 *                  metadata; only this specific style is skipped
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
	// Depth of nested skip-containers (<f> / <x> / <s> / <p style="r">). Text
	// is buffered only when 0.
	let skipDepth = 0;
	// Tracks open <p style="r"> containers specifically — needed because we
	// only skip <p> when its style attribute is "r", and the close-tag handler
	// has no access to the original opening attributes.
	let pCrossRefDepth = 0;

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

	function normalizeVerseText(s: string): string {
		// Collapse all whitespace to single spaces.
		let out = s.replace(/\s+/g, ' ').trim();
		// Strip spaces around apostrophes (both ASCII ' and typographic ’).
		out = out.replace(/\s*['’]\s*/g, "’");
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
				pCrossRefDepth = 0;
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
			} else if (openTag === 'f' || openTag === 'x' || openTag === 's') {
				// Enter footnote / cross-ref / section-title skip block
				// (only if not self-closing).
				if (selfClose !== '/') skipDepth++;
			} else if (openTag === 'p') {
				// Cross-reference paragraphs <p style="r">...</p> are metadata,
				// not verse text. Other <p> styles remain transparent.
				const styleMatch = (attrs ?? '').match(/style="([^"]+)"/);
				if (styleMatch && styleMatch[1] === 'r' && selfClose !== '/') {
					skipDepth++;
					pCrossRefDepth++;
				}
			}
			// All other open tags (<w>, <h>, <toc>, <wj>, …) are transparent:
			// their text content is captured by the text branch.
		} else if (closeTag) {
			if (closeTag === 'f' || closeTag === 'x' || closeTag === 's') {
				if (skipDepth > 0) skipDepth--;
			} else if (closeTag === 'p' && pCrossRefDepth > 0) {
				pCrossRefDepth--;
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
