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
	| { kind: 'prose'; html: string };

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
			// <tr> row: extract first <td> only (French column)
			const firstTd = /<td\b[^>]*>([\s\S]*?)<\/td>/i.exec(m[2]);
			if (firstTd) {
				const cellHtml = firstTd[1] ?? '';
				// Collect all <p class="noind"> paragraphs inside this cell
				const pRe = /<p\s+class="noind"[^>]*>([\s\S]*?)<\/p>/gi;
				let pMatch: RegExpExecArray | null;
				const cellLines: string[] = [];
				while ((pMatch = pRe.exec(cellHtml)) !== null) {
					const text = cleanHtml(pMatch[1] ?? '');
					if (text) cellLines.push(text);
				}
				if (cellLines.length > 0) {
					out.push({ kind: 'prose', html: cellLines.join('\n') });
				}
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
