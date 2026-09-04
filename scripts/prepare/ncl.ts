type Bible = Record<string, Record<string, Record<string, string>>>;

/** One open skip-container. */
interface SkipFrame {
	/** Element name, so the close-tag branch pops the right frame. */
	tag: string;
	/**
	 * Whether a `<v>` marker inside this container means scripture has
	 * resumed. True for headings, which this source lets verses follow inside
	 * the same element; false for footnotes and for `<d>`, where the verse
	 * marker *is* the psalm superscription.
	 */
	yieldsToVerse: boolean;
	/** Set by a yielding `<v>`; text flows again until the close tag. */
	suspended: boolean;
}

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
 * Heading containers yield to a verse marker. This source does not always
 * close a heading before scripture resumes: Mt 11:7-15 and Mt 24:36 follow a
 * cross-reference parenthetical *inside* its <p style="r">, Tb 3:16-17 sit
 * inside a <p style="ms1">, and Sg 7:7-14 inside an <s>. Skipping to the
 * close tag dropped all 20 verses. A <v> therefore suspends the open heading
 * frames, which stay on the stack until their close tag but stop suppressing
 * text.
 *
 * <d> is the deliberate exception, and <f>/<x> likewise: there a verse marker
 * is not scripture resuming, so 58 psalm superscriptions keep being dropped
 * as before.
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
	// Open skip-containers, innermost last. A frame stays on the stack until
	// its close tag, but stops suppressing text once suspended · see the <v>
	// handler. A stack rather than a counter because the close-tag branch has
	// no access to the opening attributes, and because suspending is not the
	// same as closing.
	const skipStack: SkipFrame[] = [];
	const suppressing = () => skipStack.some((f) => !f.suspended);

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
				skipStack.length = 0;
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
				// Scripture has resumed, so any heading containers still open
				// stop suppressing text. Only when *every* open frame yields:
				// a verse marker nested in a footnote, or in the <d> that
				// carries a psalm superscription, is not scripture resuming.
				if (skipStack.length > 0 && skipStack.every((f) => f.yieldsToVerse)) {
					for (const f of skipStack) f.suspended = true;
				}
			} else if (openTag === 've') {
				// Verse-end marker — no-op; commit happens at next verse boundary.
			} else if (openTag === 'f' || openTag === 'x' || openTag === 's' || openTag === 'd') {
				// Enter footnote / cross-ref / section-title / description skip
				// block (only if not self-closing). <s> yields to a verse
				// marker · Sg 7:7-14 sit inside one. <f>, <x> and <d> never do.
				if (selfClose !== '/') {
					skipStack.push({ tag: openTag, yieldsToVerse: openTag === 's', suspended: false });
				}
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
					// Every metadata <p> except "d" yields to a verse marker:
					// Mt 11:7-15 and Mt 24:36 sit inside a "r", Tb 3:16-17
					// inside an "ms1".
					skipStack.push({ tag: 'p', yieldsToVerse: style !== 'd', suspended: false });
				}
			}
			// All other open tags (<w>, <h>, <toc>, <wj>, …) are transparent:
			// their text content is captured by the text branch.
		} else if (closeTag) {
			// Pop only when this close tag matches the innermost open frame.
			// A content <p> pushes nothing, so its </p> must not pop a frame
			// opened by something else.
			if (skipStack[skipStack.length - 1]?.tag === closeTag) skipStack.pop();
		} else if (text !== undefined) {
			if (suppressing()) continue;
			const cleaned = text.replace(/\s+/g, ' ').trim();
			if (cleaned) buf.push(cleaned);
		}
	}
	commitVerse();
	return result;
}

/** A verse the source declares but the parse did not keep. */
export interface DroppedVerse {
	book: string;
	chapter: string;
	verse: string;
}

/**
 * Verses the source carries that the parse did not keep.
 *
 * Some loss is intended · a psalm superscription lives inside `<d>` under its
 * own `<v>` marker and is deliberately not verse text, and Mrc 4:41 is an
 * empty marker in this source (its text is folded into verse 40). Everything
 * else means the parser has started swallowing scripture again, which is what
 * hid 20 verses behind heading containers until it was found by hand.
 */
export function findDroppedVerses(xml: string, parsed: Bible): DroppedVerse[] {
	const out: DroppedVerse[] = [];
	const bookRe = /<book id="([A-Z0-9]{3})"/g;
	const bounds: { id: string; start: number }[] = [];
	let m: RegExpExecArray | null;
	while ((m = bookRe.exec(xml)) !== null) bounds.push({ id: m[1]!, start: m.index });

	for (let i = 0; i < bounds.length; i++) {
		const { id, start } = bounds[i]!;
		const body = xml.slice(start, bounds[i + 1]?.start ?? xml.length);
		const chapRe = /<c id="(\d+)"/g;
		const chaps: { id: string; start: number }[] = [];
		while ((m = chapRe.exec(body)) !== null) chaps.push({ id: m[1]!, start: m.index });

		for (let c = 0; c < chaps.length; c++) {
			const { id: chId, start: cStart } = chaps[c]!;
			const seg = body.slice(cStart, chaps[c + 1]?.start ?? body.length);
			const got = parsed[id]?.[chId] ?? {};
			const verseRe = /<v id="(\d+)"/g;
			while ((m = verseRe.exec(seg)) !== null) {
				const v = m[1]!;
				if (!got[v]) out.push({ book: id, chapter: chId, verse: v });
			}
		}
	}
	return out;
}
