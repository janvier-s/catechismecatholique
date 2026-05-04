import type { NclSection, NclSectionMap } from '../../src/lib/data/types';

const BOOK_RE = /<book\s+[^>]*id="([A-Z0-9]+)"[^>]*>([\s\S]*?)<\/book>/gi;
const CHAPTER_RE = /<c\s+[^>]*id="(\d+)"[^>]*\/?>/gi;
const SECTION_RE = /<s\s+style="s1"[^>]*>([\s\S]*?)<\/s>/gi;
const VERSE_RE = /<v\s+[^>]*id="(\d+)"[^>]*\/?>/gi;

export function parseNclSections(xml: string): NclSectionMap {
	const out: NclSectionMap = {};

	let bookMatch: RegExpExecArray | null;
	BOOK_RE.lastIndex = 0;
	while ((bookMatch = BOOK_RE.exec(xml))) {
		const bookId = bookMatch[1]!;
		const inner = bookMatch[2]!;
		const sections: NclSection[] = [];

		type Tok = { kind: 'c' | 's' | 'v'; pos: number; value: string };
		const toks: Tok[] = [];
		for (const re of [CHAPTER_RE, SECTION_RE, VERSE_RE]) {
			re.lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = re.exec(inner))) {
				const kind = re === CHAPTER_RE ? 'c' : re === SECTION_RE ? 's' : 'v';
				toks.push({ kind, pos: m.index, value: m[1]! });
			}
		}
		toks.sort((a, b) => a.pos - b.pos);

		let curCh = 0;
		for (let i = 0; i < toks.length; i++) {
			const t = toks[i]!;
			if (t.kind === 'c') {
				curCh = parseInt(t.value, 10);
			} else if (t.kind === 's') {
				let nextV: number | null = null;
				for (let j = i + 1; j < toks.length; j++) {
					if (toks[j]!.kind === 'v') {
						nextV = parseInt(toks[j]!.value, 10);
						break;
					}
					if (toks[j]!.kind === 'c') {
						// Section appears before the next chapter marker — keep curCh
						break;
					}
				}
				if (curCh > 0 && nextV !== null) {
					const title = t.value.replace(/\s+/g, ' ').trim();
					if (title) {
						sections.push({ ch: curCh, startV: nextV, title });
					}
				}
			}
		}
		sections.sort((a, b) => a.ch - b.ch || a.startV - b.startV);
		if (sections.length > 0) out[bookId] = sections;
	}

	return out;
}
