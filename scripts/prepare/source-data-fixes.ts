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
