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
	return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
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
