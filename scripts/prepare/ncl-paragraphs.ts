import { normalizeVerseText } from './ncl.ts';

export type RichVerse = { v: number; html: string };

export type Block =
	| { kind: 'prose'; verses: RichVerse[] }
	| { kind: 'poetry'; level: 1 | 2 | 3; verses: RichVerse[]; stanzaBreak?: boolean };

export type ChapterBlocks = { superscription?: string; blocks: Block[] };

/** USFX book code -> chapter number (string) -> chapter blocks. */
type AllParagraphs = Record<string, Record<string, ChapterBlocks>>;

/**
 * Re-partition a flat, already-in-order verse list into prose blocks,
 * starting a new block at each verse in `breakVerses`. Used for manual
 * paragraph-break overrides on chapters whose source XML has no `<p>`
 * markers at all — such a chapter parses as one giant prose block, which
 * this re-splits using editorially-chosen break points instead.
 */
export function splitIntoProseBlocks(verses: RichVerse[], breakVerses: number[]): Block[] {
	const breaks = new Set(breakVerses);
	const blocks: Block[] = [];
	let current: RichVerse[] = [];
	for (const v of verses) {
		if (breaks.has(v.v) && current.length > 0) {
			blocks.push({ kind: 'prose', verses: current });
			current = [];
		}
		current.push(v);
	}
	if (current.length > 0) blocks.push({ kind: 'prose', verses: current });
	return blocks;
}

// <p style="…"> values that are pure metadata, never verse content. Mirrors
// ncl.ts's own skip list, minus 'd' — a Psalm/Canticle superscription IS
// wanted here (as ChapterBlocks.superscription), just routed separately
// from ordinary verse text.
const P_SKIP_STYLES = new Set(['r', 'mr', 'sr']);
function isMsStyle(style: string): boolean {
	return /^ms\d*$/.test(style);
}

/**
 * Parse the same USFX Bible source `ncl.ts` reads, preserving paragraph/
 * poetry block structure, Psalm/Canticle superscriptions, and a small set
 * of inline markers (divine name, translator-added words, Selah) as
 * lightweight HTML — all of which the plain-text parser discards.
 */
export async function parseUSFXParagraphs(xml: string): Promise<AllParagraphs> {
	const result: AllParagraphs = {};

	let currentBook = '';
	let currentChap = '';
	let currentVerse: string | null = null;

	let buf: string[] = []; // current verse's text (or superscription text)
	let inSuperscription = false; // true while inside <d> / <p style="d">
	let chapterSuperscription: string | undefined;

	let openBlock: Block | null = null;
	let chapterBlocks: Block[] = [];
	let pendingStanzaBreak = false;

	let skipDepth = 0; // inside <f>/<x>/<s> — verse buffer must not see this text
	const pStack: string[] = []; // styles of currently-open <p> elements
	let dDepth = 0; // inside <d>…</d> (standalone superscription form)

	function closeBlock() {
		if (openBlock && openBlock.verses.length > 0) chapterBlocks.push(openBlock);
		openBlock = null;
	}

	function openProseBlock() {
		closeBlock();
		openBlock = { kind: 'prose', verses: [] };
	}

	function openPoetryBlock(level: 1 | 2 | 3) {
		closeBlock();
		const block: Block = { kind: 'poetry', level, verses: [] };
		if (pendingStanzaBreak) {
			block.stanzaBreak = true;
			pendingStanzaBreak = false;
		}
		openBlock = block;
	}

	function commitVerse() {
		if (currentVerse === null || !currentBook || !currentChap) {
			buf = [];
			return;
		}
		// Joined with '' because the source's own text nodes already carry the
		// spacing between inline elements; ' ' would push spaces inside the tags.
		const joined = buf.join('');
		buf = [];

		// Safe to run over the tags too: every rule in normalizeVerseText targets
		// punctuation ('’,.():;!?»«) that never occurs inside the emitted markup.
		const text = normalizeVerseText(joined);

		if (!text) return;
		if (inSuperscription) {
			chapterSuperscription = chapterSuperscription ? `${chapterSuperscription} ${text}` : text;
			return;
		}
		// Defensive: a verse arriving with no open block (source omits a
		// leading <p>/<q>) still keeps its text instead of silently dropping it.
		if (!openBlock) openBlock = { kind: 'prose', verses: [] };
		openBlock.verses.push({ v: parseInt(currentVerse, 10), html: text });
	}

	function commitChapter() {
		commitVerse();
		closeBlock();
		if (currentBook && currentChap && (chapterBlocks.length > 0 || chapterSuperscription)) {
			if (!result[currentBook]) result[currentBook] = {};
			result[currentBook]![currentChap] = {
				...(chapterSuperscription ? { superscription: chapterSuperscription } : {}),
				blocks: chapterBlocks
			};
		}
		chapterBlocks = [];
		chapterSuperscription = undefined;
		pendingStanzaBreak = false;
	}

	const tagRe = /<(\w+)\b([^>]*?)(\/?)>|<\/(\w+)>|([^<]+)/g;
	let match: RegExpExecArray | null;
	while ((match = tagRe.exec(xml)) !== null) {
		const [, openTag, attrs, selfClose, closeTag, text] = match;

		if (openTag) {
			if (openTag === 'book') {
				commitChapter();
				const idMatch = (attrs ?? '').match(/id="([^"]+)"/);
				currentBook = idMatch ? idMatch[1]! : '';
				currentChap = '';
				currentVerse = null;
				skipDepth = 0;
				pStack.length = 0;
				dDepth = 0;
				inSuperscription = false;
			} else if (openTag === 'c') {
				commitChapter();
				const idMatch = (attrs ?? '').match(/id="([^"]+)"/);
				currentChap = idMatch ? idMatch[1]! : '';
				currentVerse = null;
			} else if (openTag === 'v') {
				commitVerse();
				const idMatch = (attrs ?? '').match(/id="([^"]+)"/);
				currentVerse = idMatch ? idMatch[1]! : null;
			} else if (openTag === 've') {
				// no-op; commit happens at the next verse/chapter/book boundary
			} else if (openTag === 'f' || openTag === 'x' || openTag === 's') {
				if (selfClose !== '/') skipDepth++;
			} else if (openTag === 'd') {
				if (selfClose !== '/') {
					commitVerse();
					dDepth++;
					inSuperscription = true;
				}
			} else if (openTag === 'b') {
				pendingStanzaBreak = true;
			} else if (openTag === 'p') {
				const styleMatch = (attrs ?? '').match(/style="([^"]+)"/);
				const style = styleMatch?.[1] ?? '';
				if (selfClose === '/') {
					// self-closing <p/> carries no content
				} else if (style === 'd') {
					commitVerse();
					pStack.push(style);
					dDepth++;
					inSuperscription = true;
				} else if (P_SKIP_STYLES.has(style) || isMsStyle(style)) {
					pStack.push(style);
					skipDepth++;
				} else {
					commitVerse();
					pStack.push(style);
					openProseBlock();
				}
			} else if (openTag === 'q') {
				const styleMatch = (attrs ?? '').match(/style="([^"]+)"/);
				const style = styleMatch?.[1] ?? '';
				const level = style === 'q1' ? 1 : style === 'q2' ? 2 : style === 'q3' ? 3 : null;
				if (selfClose !== '/' && level) {
					commitVerse();
					openPoetryBlock(level);
				}
			} else if (openTag === 'nd') {
				if (skipDepth === 0 && !inSuperscription) buf.push('<span class="dn">');
			} else if (openTag === 'add') {
				if (skipDepth === 0 && !inSuperscription) buf.push('<em class="add">');
			} else if (openTag === 'qs') {
				if (skipDepth === 0 && !inSuperscription) buf.push('<span class="selah">');
			} else if (openTag === 'qt') {
				if (skipDepth === 0 && !inSuperscription) buf.push('<span class="qt">');
			} else if (openTag === 'it') {
				if (skipDepth === 0 && !inSuperscription) buf.push('<em class="it">');
			}
			// All other open tags (<w>, <h>, <toc>, …) are transparent.
		} else if (closeTag) {
			if (closeTag === 'f' || closeTag === 'x' || closeTag === 's') {
				if (skipDepth > 0) skipDepth--;
			} else if (closeTag === 'd') {
				commitVerse();
				if (dDepth > 0) dDepth--;
				if (dDepth === 0) inSuperscription = false;
			} else if (closeTag === 'p') {
				const style = pStack.pop();
				if (style === 'd') {
					commitVerse();
					if (dDepth > 0) dDepth--;
					if (dDepth === 0) inSuperscription = false;
				} else if (style !== undefined && (P_SKIP_STYLES.has(style) || isMsStyle(style))) {
					if (skipDepth > 0) skipDepth--;
				}
			} else if (closeTag === 'q') {
				// A block stays open until the next <p>/<q>/<c>/<book> — a bare
				// </q> does not end it, matching the source leaving a <q> open
				// across a verse boundary (e.g. Psalm 2:2-3 share one q2 line).
			} else if (closeTag === 'nd' || closeTag === 'qs' || closeTag === 'qt') {
				if (skipDepth === 0 && !inSuperscription) buf.push('</span>');
			} else if (closeTag === 'add' || closeTag === 'it') {
				if (skipDepth === 0 && !inSuperscription) buf.push('</em>');
			}
		} else if (text !== undefined) {
			if (skipDepth > 0) continue;
			// Whitespace-only nodes are kept: they are the spacing between inline elements.
			buf.push(text.replace(/\s+/g, ' '));
		}
	}
	commitChapter();
	return result;
}
