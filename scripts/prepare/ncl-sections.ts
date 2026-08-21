import type { NclSection, NclSectionMap } from '../../src/lib/data/types';

const BOOK_RE = /<book\s+[^>]*id="([A-Z0-9]+)"[^>]*>([\s\S]*?)<\/book>/gi;
const CHAPTER_RE = /<c\s+[^>]*id="(\d+)"[^>]*\/?>/gi;
// Major-section header: <p sfm="ms" style="ms1">...</p>
const MAJOR_RE = /<p\b[^>]*style="ms1"[^>]*>([\s\S]*?)<\/p>/gi;
// Section heading: <s style="s1">...</s>
const SECTION_RE = /<s\b[^>]*style="s1"[^>]*>([\s\S]*?)<\/s>/gi;
// Sub-section heading: <s ... style="s2">...</s> (often with level="2", may contain <sc>)
const SUBSECTION_RE = /<s\b[^>]*style="s2"[^>]*>([\s\S]*?)<\/s>/gi;
// Deeper sub-section heading: <s ... style="s3">...</s> — same visual tier as
// s2, just a further outline nesting in the source; both map to 'subsection'.
const SUBSECTION3_RE = /<s\b[^>]*style="s3"[^>]*>([\s\S]*?)<\/s>/gi;
const VERSE_RE = /<v\s+[^>]*id="(\d+)"[^>]*\/?>/gi;

const HTML_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

function decodeEntities(s: string): string {
	return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, body: string) => {
		if (body.startsWith('#x') || body.startsWith('#X')) {
			const cp = parseInt(body.slice(2), 16);
			return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
		}
		if (body.startsWith('#')) {
			const cp = parseInt(body.slice(1), 10);
			return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
		}
		return HTML_ENTITIES[body] ?? full;
	});
}

/** Strip HTML/XML tags, decode common entities, collapse whitespace. */
function plainText(html: string): string {
	const stripped = html.replace(/<[^>]+>/g, '');
	const decoded = decodeEntities(stripped);
	return decoded.replace(/\s+/g, ' ').trim();
}

// Private-use-area code points: never occur in real text and aren't
// whitespace, so the strip/collapse/trim passes below treat them as
// ordinary characters — no whitespace is added or removed around them,
// unlike the <sc>/</sc> tags they stand in for.
const SC_OPEN = '';
const SC_CLOSE = '';

/**
 * Same cleanup as `plainText`, but keeps a source <sc> (small-caps) span as
 * <span class="sc">…</span> instead of stripping it.
 */
function markupText(html: string): string {
	const withPlaceholders = html.replace(/<sc>/g, SC_OPEN).replace(/<\/sc>/g, SC_CLOSE);
	const stripped = withPlaceholders.replace(/<[^>]+>/g, '');
	const decoded = decodeEntities(stripped);
	const collapsed = decoded.replace(/\s+/g, ' ').trim();
	return collapsed.replace(//g, '<span class="sc">').replace(//g, '</span>');
}

export function parseNclSections(xml: string): NclSectionMap {
	const out: NclSectionMap = {};

	let bookMatch: RegExpExecArray | null;
	BOOK_RE.lastIndex = 0;
	while ((bookMatch = BOOK_RE.exec(xml))) {
		const bookId = bookMatch[1]!;
		const inner = bookMatch[2]!;
		const sections: NclSection[] = [];

		type Tok = {
			kind: 'c' | 'major' | 'section' | 'subsection' | 'v';
			pos: number;
			value: string;
		};
		const toks: Tok[] = [];

		const collect = (re: RegExp, kind: Tok['kind']) => {
			re.lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = re.exec(inner))) {
				toks.push({ kind, pos: m.index, value: m[1]! });
			}
		};
		collect(CHAPTER_RE, 'c');
		collect(MAJOR_RE, 'major');
		collect(SECTION_RE, 'section');
		collect(SUBSECTION_RE, 'subsection');
		collect(SUBSECTION3_RE, 'subsection');
		collect(VERSE_RE, 'v');

		toks.sort((a, b) => a.pos - b.pos);

		let curCh = 0;
		for (let i = 0; i < toks.length; i++) {
			const t = toks[i]!;
			if (t.kind === 'c') {
				curCh = parseInt(t.value, 10);
				continue;
			}
			if (t.kind !== 'major' && t.kind !== 'section' && t.kind !== 'subsection') continue;

			// Find first verse that follows this heading. Stop at the next
			// chapter marker (a `<c>` belongs to a different chapter). Other
			// headings (major/section/subsection) may sit between this heading
			// and its first verse — e.g. an ms1 immediately followed by an s1
			// before any <v>. We just want the first verse ID we encounter.
			let nextV: number | null = null;
			for (let j = i + 1; j < toks.length; j++) {
				const next = toks[j]!;
				if (next.kind === 'c') break;
				if (next.kind === 'v') {
					nextV = parseInt(next.value, 10);
					break;
				}
			}

			if (curCh > 0 && nextV !== null) {
				const title = plainText(t.value);
				if (title) {
					sections.push({
						ch: curCh,
						startV: nextV,
						title,
						titleHtml: markupText(t.value),
						level: t.kind
					});
				}
			}
		}

		sections.sort((a, b) => a.ch - b.ch || a.startV - b.startV);
		if (sections.length > 0) out[bookId] = sections;
	}

	return out;
}
