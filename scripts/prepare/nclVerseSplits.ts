/**
 * Verses the NCL source runs together under one number.
 *
 * Distinct from a parser defect: the text is present and correct, but a `<v>`
 * marker sits in the wrong place, so one verse's span carries two verses'
 * words and the following number comes out empty. Mrc 4:41 is the case that
 * prompted this · its marker sits after the whole passage, immediately before
 * the `<ve/>`.
 *
 * Keep this list short and evidence-led. Each entry must name the words the
 * next verse starts with, and both appliers fail loudly if that marker is not
 * found exactly once · a silent no-op would leave the verse missing while
 * looking fixed.
 */
import type { Block, ChapterBlocks } from './ncl-paragraphs.ts';

export interface NclVerseSplit {
	book: string;
	chapter: string;
	/** The verse whose span carries both verses' text. */
	verse: string;
	/** The verse number the tail belongs to. Must be empty in the source. */
	into: string;
	/** Exact opening words of the tail. Must occur exactly once in the verse. */
	splitBefore: string;
	/** Why, in one line. */
	reason: string;
}

export const NCL_VERSE_SPLITS: NclVerseSplit[] = [
	{
		book: 'MRK',
		chapter: '4',
		verse: '40',
		into: '41',
		splitBefore: 'Et ils furent saisis',
		reason:
			'The <v id="41"/> marker sits after the passage, so 40 carries both. Verse 40 is the reproach ("Pourquoi êtes-vous effrayés ?"); the crowd\'s fear and question are verse 41.'
	}
];

/** Apply the splits to the plain `{book: {chapter: {verse: text}}}` form. */
export function applyVerseSplits(
	bible: Record<string, Record<string, Record<string, string>>>,
	splits: NclVerseSplit[] = NCL_VERSE_SPLITS
): void {
	for (const s of splits) {
		const chapter = bible[s.book]?.[s.chapter];
		if (!chapter) throw new Error(`verse split: ${s.book} ${s.chapter} not parsed`);
		const text = chapter[s.verse];
		if (text === undefined) {
			throw new Error(`verse split: ${s.book} ${s.chapter}:${s.verse} not parsed`);
		}
		if (chapter[s.into] !== undefined) {
			throw new Error(
				`verse split: ${s.book} ${s.chapter}:${s.into} already has text · the source may have been corrected upstream`
			);
		}
		const { head, tail } = cut(text, s);
		chapter[s.verse] = head;
		chapter[s.into] = tail;
	}
}

/** Apply the same splits to the paragraph/poetry block structure. */
export function applyVerseSplitsToParagraphs(
	paragraphs: Record<string, Record<string, ChapterBlocks>>,
	splits: NclVerseSplit[] = NCL_VERSE_SPLITS
): void {
	for (const s of splits) {
		const chapter = paragraphs[s.book]?.[s.chapter];
		if (!chapter) throw new Error(`verse split: ${s.book} ${s.chapter} has no blocks`);
		const from = parseInt(s.verse, 10);
		const into = parseInt(s.into, 10);

		let done = false;
		for (const block of chapter.blocks as Block[]) {
			const i = block.verses.findIndex((v) => v.v === from);
			if (i === -1) continue;
			if (block.verses.some((v) => v.v === into)) {
				throw new Error(`verse split: ${s.book} ${s.chapter}:${s.into} already present in blocks`);
			}
			const { head, tail } = cut(block.verses[i]!.html, s);
			block.verses[i]!.html = head;
			// The tail stays in the same block: the source keeps both inside one
			// <p>, so they belong to the same paragraph.
			block.verses.splice(i + 1, 0, { v: into, html: tail });
			done = true;
			break;
		}
		if (!done)
			throw new Error(`verse split: ${s.book} ${s.chapter}:${s.verse} not found in blocks`);
	}
}

function cut(text: string, s: NclVerseSplit): { head: string; tail: string } {
	const first = text.indexOf(s.splitBefore);
	if (first === -1) {
		throw new Error(
			`verse split: ${s.book} ${s.chapter}:${s.verse} does not contain "${s.splitBefore}"`
		);
	}
	if (text.indexOf(s.splitBefore, first + 1) !== -1) {
		throw new Error(
			`verse split: "${s.splitBefore}" occurs more than once in ${s.book} ${s.chapter}:${s.verse}`
		);
	}
	const head = text.slice(0, first).trim();
	const tail = text.slice(first).trim();
	if (!head || !tail) {
		throw new Error(`verse split: ${s.book} ${s.chapter}:${s.verse} split leaves an empty side`);
	}
	return { head, tail };
}
