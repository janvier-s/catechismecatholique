export type HtmlEvent =
	| { kind: 'section'; anchor: string }
	| { kind: 'epigraph'; text: string; attribution?: string }
	| { kind: 'question'; number: number; question: string; answer: string };

const TOKEN = new RegExp(
	[
		// Section anchor: any element with id="pN"
		`<[a-z0-9]+\\b[^>]*\\bid="(p[0-9]+)"`,
		// Epigraph: <blockquote>…</blockquote>
		`<blockquote\\b[^>]*>([\\s\\S]*?)<\\/blockquote>`,
		// Question marker: <p class="preg">N. text</p> (allows other attributes like style)
		`<p\\b[^>]*\\bclass="preg"[^>]*>\\s*([0-9]+)\\.\\s*([\\s\\S]*?)<\\/p>`
	].join('|'),
	'gi'
);

const ANSWER_RE = /<p(?![^>]*\bclass=)[^>]*>([\s\S]*?)<\/p>/gi;

function stripTags(s: string): string {
	return s
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function parseEpigraph(inner: string): { text: string; attribution?: string } {
	// Inner shape (per EPUB): <p>«italic quote» (attribution).<br/></p>
	// Extract the LAST parenthesized block as the attribution; everything
	// before it (trimmed) is the quote text.
	const plain = stripTags(inner);
	const m = plain.match(/^(.*?)\s*\(([^()]+)\)\s*\.?\s*$/);
	if (!m) return { text: plain };
	return { text: (m[1] ?? '').trim(), attribution: (m[2] ?? '').trim() };
}

export type AppendixEvent =
	| { kind: 'heading'; level: 2 | 3; text: string }
	| { kind: 'prose'; html: string }
	/** Bilingual prayer pair extracted from a two-column <tr> in the prayers
	 *  section. Each side carries its title (bold first paragraph) plus the
	 *  body lines. The renderer lays them out side by side. */
	| {
			kind: 'prayer';
			fr: { title?: string; body: string };
			la: { title?: string; body: string };
	  };

const APPENDIX_START = /id="p114"/;
const APPENDIX_END = /id="p15"/;

/**
 * Extracts the appendix region (PRIÈRES COMMUNES + FORMULES DE LA DOCTRINE
 * CATHOLIQUE) from a Compendium EPUB HTML file and returns a stream of
 * heading/prose events for rendering.
 *
 * Real EPUB structure (verified against the source file):
 * - Both section titles use <h4 id="pN">
 * - PRIÈRES COMMUNES: content in a two-column <table> — only the first <td>
 *   (French text) is extracted, as a series of <p class="noind"> paragraphs.
 * - FORMULES DE LA DOCTRINE CATHOLIQUE: content in <p class="doct"> paragraphs.
 * - Stop at the first element carrying id="p15" (ABRÉVIATIONS BIBLIQUES).
 */
export function scanAppendixHtml(html: string): AppendixEvent[] {
	const startAttr = APPENDIX_START.exec(html);
	if (!startAttr) return [];
	// Walk back from the attribute match to find the opening angle bracket of the element
	let start = startAttr.index;
	while (start > 0 && html[start] !== '<') start--;
	// Find stop anchor after the start position
	const endMatch = APPENDIX_END.exec(html.slice(start));
	const end = endMatch ? start + endMatch.index : html.length;
	const body = html.slice(start, end);

	const out: AppendixEvent[] = [];

	// Tokenise: h4 section headings, first-column table cells, doct paragraphs.
	// We walk through the body sequentially using simple regex scanning.

	// Regex for the three token types in document order:
	// 1. <h4 ...>TEXT</h4>  — section heading
	// 2. <td>CONTENT</td>   — table cell (only take the first per <tr>)
	// 3. <p class="doct">TEXT</p> — formula paragraph
	const TOKEN_RE =
		/<h4\b[^>]*>([\s\S]*?)<\/h4>|<tr\b[^>]*>([\s\S]*?)<\/tr>|<p\s+class="doct"[^>]*>([\s\S]*?)<\/p>/gi;

	let m: RegExpExecArray | null;
	while ((m = TOKEN_RE.exec(body)) !== null) {
		if (m[1] !== undefined) {
			// h4 heading → level 2 section heading
			const text = stripTagsKeepInline(m[1]);
			if (text) out.push({ kind: 'heading', level: 2, text });
		} else if (m[2] !== undefined) {
			// <tr> row: bilingual prayer — extract BOTH <td> cells (FR | LA).
			// Each cell typically has a bold first <p> (title) followed by
			// body <p>'s. We split the title from the body so the renderer
			// can style them as a pair.
			const cells: string[] = [];
			const tdRe = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
			let tdMatch: RegExpExecArray | null;
			while ((tdMatch = tdRe.exec(m[2])) !== null) {
				cells.push(tdMatch[1] ?? '');
			}
			const fr = parsePrayerCell(cells[0] ?? '');
			const la = parsePrayerCell(cells[1] ?? '');
			if (fr.body || la.body || fr.title || la.title) {
				out.push({ kind: 'prayer', fr, la });
			}
		} else if (m[3] !== undefined) {
			// <p class="doct"> paragraph
			const text = cleanHtml(m[3]);
			if (text) out.push({ kind: 'prose', html: text });
		}
	}

	return out;
}

/** Collapse whitespace + br tags to space, keep meaningful inline markup. */
function cleanHtml(s: string): string {
	return s
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<\/?(?!em\b|strong\b|b\b|i\b|span\b|sup\b)[a-z][^>]*>/gi, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Strip every HTML tag (and entities). Used for title text where we don't
 *  want any inline markup — the renderer applies its own bold styling. */
function stripAllTags(s: string): string {
	return s
		.replace(/<[^>]+>/g, '')
		.replace(/&#160;|&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Convert <br> to literal newlines and strip block tags, keeping inline ones.
 *  Used for prayer body text where line breaks carry meaning. */
function cleanLines(s: string): string {
	return s
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/&#160;|&nbsp;/g, ' ')
		.replace(/<\/?(?!em\b|strong\b|b\b|i\b|span\b|sup\b)[a-z][^>]*>/gi, '')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n[ \t]+/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{2,}/g, '\n')
		.trim();
}

/** Parse one <td> from a bilingual prayer row. The first <p> in each cell
 *  is the prayer title (bold); subsequent <p>s are body lines. We treat
 *  any <p> whose stripped content is wrapped in <b>/<strong>/<span style="font-weight: bold"> as the title. */
function parsePrayerCell(cellHtml: string): { title?: string; body: string } {
	const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
	const paragraphs: { html: string; isTitle: boolean }[] = [];
	let pMatch: RegExpExecArray | null;
	while ((pMatch = pRe.exec(cellHtml)) !== null) {
		const inner = pMatch[1] ?? '';
		// Detect title: the entire content is bold (b, strong, or span style).
		const stripped = inner.replace(/<br\s*\/?>/gi, '').trim();
		const isTitle =
			/^<(?:b|strong)\b[^>]*>[\s\S]*?<\/(?:b|strong)>\s*$/i.test(stripped) ||
			/^<span\s+style="[^"]*font-weight:\s*bold[^"]*"[^>]*>[\s\S]*?<\/span>\s*$/i.test(stripped);
		paragraphs.push({ html: inner, isTitle });
	}

	if (paragraphs.length === 0) return { body: '' };

	// Take the first paragraph as title only if it's tagged bold; otherwise no title.
	// Title text is fully stripped (the renderer styles it as bold itself).
	let title: string | undefined;
	const start = paragraphs[0]!.isTitle ? 1 : 0;
	if (start === 1) {
		title = stripAllTags(paragraphs[0]!.html).trim();
	}
	const body = paragraphs
		.slice(start)
		.map((p) => cleanLines(p.html))
		.filter(Boolean)
		.join('\n\n');
	return { title, body };
}

/** Strip all tags (for heading text). */
function stripTagsKeepInline(s: string): string {
	return s
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function scanHtml(html: string): HtmlEvent[] {
	const out: HtmlEvent[] = [];
	let m: RegExpExecArray | null;
	const matches: { start: number; ev: HtmlEvent }[] = [];
	while ((m = TOKEN.exec(html))) {
		if (m[1]) {
			matches.push({ start: m.index, ev: { kind: 'section', anchor: m[1] } });
		} else if (m[2] !== undefined) {
			const { text, attribution } = parseEpigraph(m[2]);
			matches.push({
				start: m.index,
				ev: { kind: 'epigraph', text, ...(attribution ? { attribution } : {}) }
			});
		} else if (m[3] !== undefined && m[4] !== undefined) {
			// Question: pair with the next plain <p>…</p> as the answer.
			const number = parseInt(m[3], 10);
			const question = stripTags(m[4]);
			const after = TOKEN.lastIndex;
			ANSWER_RE.lastIndex = after;
			const ans = ANSWER_RE.exec(html);
			const answer = ans ? stripTags(ans[1] ?? '') : '';
			matches.push({
				start: m.index,
				ev: { kind: 'question', number, question, answer }
			});
		}
	}
	matches.sort((a, b) => a.start - b.start);
	for (const x of matches) out.push(x.ev);
	return out;
}
