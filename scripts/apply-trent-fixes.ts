#!/usr/bin/env tsx
/**
 * Apply structural fixes to the Trent catechism data based on the user's
 * review of the EPUB merge dry-run report.
 *
 *   1. Delete 22 paragraphs that don't exist in the Saint-Siège EPUB
 *      (transcription artefacts in our source).
 *   2. Split 4 paragraphs that combine two EPUB paragraphs back into two.
 *   3. Insert 6 paragraphs from the EPUB that our source missed.
 *   4. Merge §815+§816 and §1645+§1646 into single paragraphs.
 *   5. Add specific italics to §1083, §1645+§1646.
 *   6. Renumber paragraphs globally so the result is a clean 1..N sequence.
 *   7. Update structure.json paragraph_range fields.
 *
 * Run after merge-trent-epub.ts --apply.
 *   npx tsx scripts/apply-trent-fixes.ts --dry      # preview
 *   npx tsx scripts/apply-trent-fixes.ts --apply    # write changes
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA_DIR = join(ROOT, 'static/data/trent');
const EPUB_DIR = '/tmp/trent-epub';
const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry') || !APPLY;

// ─── Operations ────────────────────────────────────────────────────────────────

const DELETIONS = [
	73, 122, 254, 290, 374, 488, 635, 694, 808, 811, 820, 863, 986, 1007, 1008, 1009, 1068, 1071,
	1124, 1302, 1379, 1431
];

interface SplitOp {
	number: number;
	marker: string; // text snippet that begins the second half
}
const SPLITS: SplitOp[] = [
	{ number: 612, marker: 'C’est pourquoi il était' },
	// §673 was already merged with EPUB-only-first-half during --apply, so its
	// second half text is no longer in our data; treat it as an insertion.
	{ number: 689, marker: 'De ces sacrifices les Prophètes' },
	{ number: 1199, marker: 'Par la même raison' }
];

interface InsertOp {
	afterNumber: number;
	snippet: string; // text near the start of the new paragraph (used to locate it in the EPUB)
}
const INSERTIONS: InsertOp[] = [
	{ afterNumber: 673, snippet: 'Cet usage ayant paru' },
	{ afterNumber: 1001, snippet: 'Qu’est-ce que l' },
	{ afterNumber: 1228, snippet: 'Souvenez-vous de vos fins' },
	{ afterNumber: 1254, snippet: 'Les entretiens' },
	{ afterNumber: 1310, snippet: 'Tout homme' },
	{ afterNumber: 1531, snippet: 'Bienheureux les' },
	{ afterNumber: 1741, snippet: 'Je Vous prie' }
];

interface MergeOp {
	numbers: [number, number];
	italicizePhrases?: string[]; // verbatim phrases to wrap in <i>...</i>
}
const MERGES: MergeOp[] = [
	{ numbers: [815, 816] },
	{
		numbers: [1645, 1646],
		italicizePhrases: ['Dieu', 'ne laissera point le juste dans une éternelle agitation']
	}
];

interface ItalicizeOp {
	number: number;
	phrases: string[];
}
const MANUAL_ITALICS: ItalicizeOp[] = [
	{
		number: 1083,
		phrases: [
			'affirmation',
			'Je prends Dieu à témoin que je ne mens pas.',
			'de promesse, ou de menace'
		]
	}
];

// ─── Section file model ────────────────────────────────────────────────────────

interface Footnote {
	n: number;
	text: string;
}
interface Para {
	number: number;
	html: string;
}
interface SectionFile {
	corpus: string;
	chapter_number: number;
	chapter_slug: string;
	chapter_title: string;
	part_slug: string;
	part_title: string;
	slug: string;
	title: string;
	ordinal: number;
	paragraph_numbers: number[];
	paragraphs: Para[];
	footnotes: Footnote[];
	prev?: { href: string; title: string };
	next?: { href: string; title: string };
}

interface SectionInfo {
	path: string;
	data: SectionFile;
}

// ─── EPUB helpers (copy from merge-trent-epub.ts) ──────────────────────────────

function findEpubFile(chapterNumber: number): string {
	if (chapterNumber === 0) return join(EPUB_DIR, 'preface.html');
	const pad = String(chapterNumber).padStart(2, '0');
	const matches = readdirSync(EPUB_DIR).filter(
		(f) => f.startsWith(`ch${pad}-`) && f.endsWith('.html')
	);
	if (matches.length !== 1) {
		throw new Error(
			`expected 1 EPUB chapter for ${pad}, got ${matches.length}: ${matches.join(', ')}`
		);
	}
	return join(EPUB_DIR, matches[0]!);
}

function extractEpubParagraphs(html: string): string[] {
	const out: string[] = [];
	const re = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) out.push(m[1]!.trim());
	return out;
}

function stripHtml(s: string): string {
	return s
		.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function normalizeForMatch(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9 ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

// Find the EPUB paragraph index whose stripped text starts with `snippet`.
function findEpubParagraphBySnippet(epubParagraphs: string[], snippet: string): number {
	const normSnip = normalizeForMatch(snippet);
	for (let i = 0; i < epubParagraphs.length; i++) {
		const text = stripHtml(epubParagraphs[i]!);
		const norm = normalizeForMatch(text);
		if (norm.startsWith(normSnip)) return i;
	}
	for (let i = 0; i < epubParagraphs.length; i++) {
		const text = stripHtml(epubParagraphs[i]!);
		const norm = normalizeForMatch(text);
		if (norm.includes(normSnip)) return i;
	}
	return -1;
}

// ─── Footnote splice (subset of merge-trent-epub.ts) ───────────────────────────

interface FootnoteSplice {
	html: string;
	rawTextBefore: string;
}

function extractFootnotes(html: string): FootnoteSplice[] {
	const splices: FootnoteSplice[] = [];
	const re = /<sup\b[^>]*>[\s\S]*?<\/sup>/g;
	let lastEnd = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) {
		splices.push({ html: m[0], rawTextBefore: stripHtml(html.slice(lastEnd, m.index)) });
		lastEnd = m.index + m[0].length;
	}
	return splices;
}

function buildTextHtmlMap(html: string): { textToHtml(textPos: number): number } {
	const segments: { textPos: number; htmlPos: number }[] = [{ textPos: 0, htmlPos: 0 }];
	let textPos = 0;
	let i = 0;
	const ENTITY_RE = /^&(?:#\d+|#x[\da-f]+|[a-z]+);/i;
	while (i < html.length) {
		const c = html[i]!;
		if (c === '<') {
			const tagEnd = html.indexOf('>', i);
			if (tagEnd < 0) break;
			i = tagEnd + 1;
			segments.push({ textPos, htmlPos: i });
		} else if (c === '&') {
			const m = html.slice(i).match(ENTITY_RE);
			if (m) {
				i += m[0].length;
				textPos += 1;
				segments.push({ textPos, htmlPos: i });
			} else {
				i++;
				textPos++;
			}
		} else {
			i++;
			textPos++;
		}
	}
	return {
		textToHtml(target: number): number {
			let lo = 0;
			let hi = segments.length - 1;
			while (lo < hi) {
				const mid = (lo + hi + 1) >> 1;
				if (segments[mid]!.textPos <= target) lo = mid;
				else hi = mid - 1;
			}
			const seg = segments[lo]!;
			return seg.htmlPos + (target - seg.textPos);
		}
	};
}

function normalizeWithMap(s: string): { norm: string; charMap: number[] } {
	let norm = '';
	const charMap: number[] = [];
	let prev = true;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i]!;
		const decomposed = ch.normalize('NFD');
		for (const d of decomposed) {
			if (/[̀-ͯ]/.test(d)) continue;
			const lc = d.toLowerCase();
			if (/[a-z0-9]/.test(lc)) {
				norm += lc;
				charMap.push(i);
				prev = false;
			} else if (!prev) {
				norm += ' ';
				charMap.push(i);
				prev = true;
			}
		}
	}
	return { norm, charMap };
}

function advanceTrailingPunct(s: string, pos: number): number {
	if (pos < s.length && /\s/.test(s[pos]!)) {
		const punct = pos + 1 < s.length && /[.,;:!?»)\]'"]/.test(s[pos + 1]!);
		if (punct) pos++;
	}
	while (pos < s.length && /[.,;:!?»)\]'"]/.test(s[pos]!)) pos++;
	return pos;
}

function findAnchorEnd(haystack: string, needle: string): number {
	const direct = haystack.indexOf(needle);
	if (direct >= 0) return advanceTrailingPunct(haystack, direct + needle.length);
	const { norm: normH, charMap } = normalizeWithMap(haystack);
	const { norm: normN } = normalizeWithMap(needle);
	const trimmedN = normN.trim();
	if (trimmedN.length === 0) return -1;
	const idx = normH.indexOf(trimmedN);
	if (idx < 0) return -1;
	const lastNormIdx = idx + trimmedN.length - 1;
	const lastH = charMap[lastNormIdx];
	if (lastH === undefined) return -1;
	return advanceTrailingPunct(haystack, lastH + 1);
}

function advancePastItalic(html: string, htmlPos: number): number {
	const before = html.slice(0, htmlPos);
	const lastOpen = before.lastIndexOf('<i>');
	const lastClose = before.lastIndexOf('</i>');
	if (lastOpen <= lastClose) return htmlPos;
	const nextClose = html.indexOf('</i>', htmlPos);
	if (nextClose < 0) return htmlPos;
	const between = html.slice(htmlPos, nextClose);
	if (/[\p{L}\p{N}]/u.test(between)) return htmlPos;
	return nextClose + 4;
}

function spliceFootnotes(splices: FootnoteSplice[], epubHtml: string): string {
	if (splices.length === 0) return epubHtml;
	const epubText = stripHtml(epubHtml);
	const map = buildTextHtmlMap(epubHtml);
	const targets: number[] = [];
	let cursor = 0;
	for (const s of splices) {
		const slice = epubText.slice(cursor);
		const trimmed = s.rawTextBefore.trimEnd();
		if (trimmed.length === 0) {
			targets.push(cursor);
			continue;
		}
		const tail = trimmed.split(/\s+/);
		let pos = -1;
		for (let len = Math.min(10, tail.length); len >= 2; len--) {
			const anchor = tail.slice(-len).join(' ');
			const end = findAnchorEnd(slice, anchor);
			if (end >= 0) {
				pos = cursor + end;
				break;
			}
		}
		if (pos < 0) targets.push(-1);
		else {
			targets.push(pos);
			cursor = pos;
		}
	}
	let merged = epubHtml;
	const ordered = splices
		.map((s, k) => ({ s, t: targets[k]! }))
		.filter((x) => x.t >= 0)
		.sort((a, b) => b.t - a.t);
	for (const { s, t } of ordered) {
		let htmlPos = map.textToHtml(t);
		htmlPos = advancePastItalic(merged, htmlPos);
		merged = merged.slice(0, htmlPos) + s.html + merged.slice(htmlPos);
	}
	return merged;
}

// ─── Italic phrase wrapping ────────────────────────────────────────────────────

// Wrap the first occurrence of `phrase` in the HTML's text with <i>...</i>.
// Skips matches that fall inside a tag or are already italicised. Match is
// case-sensitive on the literal phrase as it should appear post-merge.
function italicizePhrase(html: string, phrase: string): string {
	const stripped = stripHtml(html);
	const idxText = stripped.indexOf(phrase);
	if (idxText < 0) return html; // phrase not found — caller will warn
	// Map idxText to position in html
	const map = buildTextHtmlMap(html);
	const startHtml = map.textToHtml(idxText);
	const endHtml = map.textToHtml(idxText + phrase.length);
	const before = html.slice(0, startHtml);
	const middle = html.slice(startHtml, endHtml);
	const after = html.slice(endHtml);
	// Don't double-wrap if already inside <i>
	const lastOpenI = before.lastIndexOf('<i>');
	const lastCloseI = before.lastIndexOf('</i>');
	if (lastOpenI > lastCloseI) return html;
	return before + '<i>' + middle + '</i>' + after;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function loadAllSections(): SectionInfo[] {
	const all: SectionInfo[] = [];
	const sectionsDir = join(DATA_DIR, 'sections');
	for (const chDir of readdirSync(sectionsDir)) {
		const chPath = join(sectionsDir, chDir);
		for (const sf of readdirSync(chPath)) {
			if (!sf.endsWith('.json')) continue;
			const path = join(chPath, sf);
			const data: SectionFile = JSON.parse(readFileSync(path, 'utf8'));
			all.push({ path, data });
		}
	}
	// Sort by chapter then ordinal so paragraphs stay in document order
	all.sort((a, b) => {
		if (a.data.chapter_number !== b.data.chapter_number) {
			return a.data.chapter_number - b.data.chapter_number;
		}
		return a.data.ordinal - b.data.ordinal;
	});
	return all;
}

function findParagraph(
	sections: SectionInfo[],
	number: number
): { section: SectionInfo; index: number } | null {
	for (const s of sections) {
		const idx = s.data.paragraphs.findIndex((p) => p.number === number);
		if (idx >= 0) return { section: s, index: idx };
	}
	return null;
}

interface OpResult {
	op: string;
	target: number | string;
	status: 'ok' | 'skipped' | 'error';
	detail?: string;
}

function runOps(sections: SectionInfo[]): OpResult[] {
	const results: OpResult[] = [];

	// 1. Deletions
	for (const num of DELETIONS) {
		const found = findParagraph(sections, num);
		if (!found) {
			results.push({ op: 'delete', target: num, status: 'error', detail: 'not found' });
			continue;
		}
		const { section, index } = found;
		section.data.paragraphs.splice(index, 1);
		section.data.paragraph_numbers = section.data.paragraph_numbers.filter((n) => n !== num);
		results.push({ op: 'delete', target: num, status: 'ok' });
	}

	// 2. Splits
	for (const op of SPLITS) {
		const found = findParagraph(sections, op.number);
		if (!found) {
			results.push({ op: 'split', target: op.number, status: 'error', detail: 'not found' });
			continue;
		}
		const { section, index } = found;
		const para = section.data.paragraphs[index]!;

		// Find the marker in our raw text
		const ourText = stripHtml(para.html);
		const markerIdx = ourText.indexOf(op.marker);
		if (markerIdx < 0) {
			results.push({
				op: 'split',
				target: op.number,
				status: 'error',
				detail: `marker not found in §${op.number}`
			});
			continue;
		}

		// Load EPUB chapter and find the two paragraphs
		const epubFile = findEpubFile(section.data.chapter_number);
		const epubHtml = readFileSync(epubFile, 'utf8');
		const epubParas = extractEpubParagraphs(epubHtml);
		// First half: EPUB paragraph that aligns with text BEFORE the marker
		const firstSnippet = ourText.slice(0, Math.min(80, markerIdx));
		const firstIdx = findEpubParagraphBySnippet(epubParas, firstSnippet);
		// Second half: EPUB paragraph that aligns with the marker
		const secondIdx = findEpubParagraphBySnippet(epubParas, op.marker);
		if (firstIdx < 0 || secondIdx < 0 || secondIdx <= firstIdx) {
			results.push({
				op: 'split',
				target: op.number,
				status: 'error',
				detail: `epub indices firstIdx=${firstIdx} secondIdx=${secondIdx}`
			});
			continue;
		}

		// Split footnotes by their position in our raw text
		const footnotes = extractFootnotes(para.html);
		// We need to know the rawTextBefore for each footnote relative to the FULL text
		// extractFootnotes gives us the text BETWEEN consecutive footnotes. To get the
		// cumulative position, we add up.
		let cumulativePos = 0;
		const fnPositions: number[] = [];
		for (const fn of footnotes) {
			cumulativePos += fn.rawTextBefore.length;
			fnPositions.push(cumulativePos);
		}
		const firstFns: FootnoteSplice[] = [];
		const secondFns: FootnoteSplice[] = [];
		// For first half: collect footnotes with cumulative pos < markerIdx (in raw text)
		// For each footnote, its rawTextBefore is relative to the previous footnote's end,
		// but we want the splice to be against the new EPUB text. So we need to recompute.
		// Simplest: for first half, take the footnotes that fall BEFORE markerIdx in our text,
		// and use their original rawTextBefore (relative to the previous fn or start).
		let cumSecond = 0;
		let inSecondHalf = false;
		for (let k = 0; k < footnotes.length; k++) {
			const pos = fnPositions[k]!;
			if (pos < markerIdx) {
				firstFns.push(footnotes[k]!);
			} else {
				if (!inSecondHalf) {
					// First footnote in second half: its rawTextBefore should be relative to
					// the start of the second half, not from the previous footnote in our text.
					const tailFromMarker = ourText.slice(markerIdx, pos);
					secondFns.push({ html: footnotes[k]!.html, rawTextBefore: tailFromMarker });
					inSecondHalf = true;
				} else {
					secondFns.push(footnotes[k]!);
				}
				cumSecond += footnotes[k]!.rawTextBefore.length;
			}
		}
		void cumSecond;

		const firstMerged = spliceFootnotes(firstFns, epubParas[firstIdx]!);
		const secondMerged = spliceFootnotes(secondFns, epubParas[secondIdx]!);

		// Replace para with first half, insert new para after with second half
		const newSecondNumber = -op.number; // sentinel — will be renumbered later
		para.html = firstMerged;
		const newPara: Para = { number: newSecondNumber, html: secondMerged };
		section.data.paragraphs.splice(index + 1, 0, newPara);
		// paragraph_numbers: insert sentinel right after op.number's position
		const pnIdx = section.data.paragraph_numbers.indexOf(op.number);
		section.data.paragraph_numbers.splice(pnIdx + 1, 0, newSecondNumber);

		results.push({
			op: 'split',
			target: op.number,
			status: 'ok',
			detail: `epub ${firstIdx}+${secondIdx}, fns ${firstFns.length}+${secondFns.length}`
		});
	}

	// 3. Insertions (truly missing paragraphs from EPUB)
	let nextSentinel = -10000; // distinct from split sentinels
	for (const op of INSERTIONS) {
		const found = findParagraph(sections, op.afterNumber);
		if (!found) {
			results.push({
				op: 'insert',
				target: op.afterNumber,
				status: 'error',
				detail: 'after-paragraph not found'
			});
			continue;
		}
		const { section, index } = found;
		const epubFile = findEpubFile(section.data.chapter_number);
		const epubHtml = readFileSync(epubFile, 'utf8');
		const epubParas = extractEpubParagraphs(epubHtml);
		const epubIdx = findEpubParagraphBySnippet(epubParas, op.snippet);
		if (epubIdx < 0) {
			results.push({
				op: 'insert',
				target: op.afterNumber,
				status: 'error',
				detail: `epub paragraph not found by snippet "${op.snippet}"`
			});
			continue;
		}
		const sentinel = nextSentinel--;
		const newPara: Para = { number: sentinel, html: epubParas[epubIdx]! };
		section.data.paragraphs.splice(index + 1, 0, newPara);
		const pnIdx = section.data.paragraph_numbers.indexOf(op.afterNumber);
		section.data.paragraph_numbers.splice(pnIdx + 1, 0, sentinel);
		results.push({
			op: 'insert',
			target: op.afterNumber,
			status: 'ok',
			detail: `epub idx ${epubIdx}`
		});
	}

	// 4. Merges
	for (const op of MERGES) {
		const [a, b] = op.numbers;
		const fa = findParagraph(sections, a);
		const fb = findParagraph(sections, b);
		if (!fa || !fb) {
			results.push({
				op: 'merge',
				target: `${a}+${b}`,
				status: 'error',
				detail: 'one or both not found'
			});
			continue;
		}
		if (fa.section.path !== fb.section.path) {
			results.push({
				op: 'merge',
				target: `${a}+${b}`,
				status: 'error',
				detail: 'paragraphs in different sections'
			});
			continue;
		}
		const sec = fa.section;
		// Concatenate HTML
		let combined = sec.data.paragraphs[fa.index]!.html + ' ' + sec.data.paragraphs[fb.index]!.html;
		if (op.italicizePhrases) {
			for (const phrase of op.italicizePhrases) combined = italicizePhrase(combined, phrase);
		}
		sec.data.paragraphs[fa.index]!.html = combined;
		sec.data.paragraphs.splice(fb.index, 1);
		sec.data.paragraph_numbers = sec.data.paragraph_numbers.filter((n) => n !== b);
		results.push({ op: 'merge', target: `${a}+${b}`, status: 'ok' });
	}

	// 5. Manual italics
	for (const op of MANUAL_ITALICS) {
		const found = findParagraph(sections, op.number);
		if (!found) {
			results.push({ op: 'italics', target: op.number, status: 'error', detail: 'not found' });
			continue;
		}
		const para = found.section.data.paragraphs[found.index]!;
		let html = para.html;
		const missed: string[] = [];
		for (const phrase of op.phrases) {
			const before = html;
			html = italicizePhrase(html, phrase);
			if (html === before) missed.push(phrase);
		}
		para.html = html;
		results.push({
			op: 'italics',
			target: op.number,
			status: missed.length === 0 ? 'ok' : 'skipped',
			detail: missed.length > 0 ? `missed phrases: ${missed.join(' | ')}` : undefined
		});
	}

	return results;
}

// ─── Renumbering ──────────────────────────────────────────────────────────────

function renumber(sections: SectionInfo[]) {
	let next = 1;
	const oldToNew = new Map<number, number>();
	for (const s of sections) {
		for (let i = 0; i < s.data.paragraphs.length; i++) {
			const oldNum = s.data.paragraphs[i]!.number;
			oldToNew.set(oldNum, next);
			s.data.paragraphs[i]!.number = next;
			s.data.paragraph_numbers[i] = next;
			next++;
		}
	}
	return { totalParagraphs: next - 1, oldToNew };
}

interface StructureFile {
	parts: {
		slug: string;
		title: string;
		chapters: {
			number: number;
			slug: string;
			title: string;
			paragraph_range: [number, number];
			sections: {
				slug: string;
				title: string;
				ordinal: number;
				paragraph_range: [number, number];
			}[];
		}[];
	}[];
	total_paragraphs: number;
}

function rebuildStructure(sections: SectionInfo[], total: number): StructureFile {
	const structurePath = join(DATA_DIR, 'structure.json');
	const structure: StructureFile = JSON.parse(readFileSync(structurePath, 'utf8'));

	// Index sections by chapter_slug + slug for lookup
	const secMap = new Map<string, SectionInfo>();
	for (const s of sections) secMap.set(`${s.data.chapter_slug}/${s.data.slug}`, s);

	for (const part of structure.parts) {
		for (const ch of part.chapters) {
			let chMin = Infinity;
			let chMax = -Infinity;
			for (const sec of ch.sections) {
				const key = `${ch.slug}/${sec.slug}`;
				const info = secMap.get(key);
				if (!info) continue;
				const nums = info.data.paragraph_numbers;
				if (nums.length === 0) continue;
				sec.paragraph_range = [nums[0]!, nums[nums.length - 1]!];
				chMin = Math.min(chMin, nums[0]!);
				chMax = Math.max(chMax, nums[nums.length - 1]!);
			}
			if (chMin !== Infinity) ch.paragraph_range = [chMin, chMax];
		}
	}
	structure.total_paragraphs = total;
	return structure;
}

// ─── Driver ────────────────────────────────────────────────────────────────────

function main() {
	const sections = loadAllSections();
	const startCount = sections.reduce((s, x) => s + x.data.paragraphs.length, 0);
	const results = runOps(sections);
	const renumberResult = renumber(sections);
	const structure = rebuildStructure(sections, renumberResult.totalParagraphs);

	const okCount = results.filter((r) => r.status === 'ok').length;
	const failCount = results.filter((r) => r.status !== 'ok').length;
	console.log(`operations: ${okCount} ok, ${failCount} failed`);
	for (const r of results.filter((x) => x.status !== 'ok')) {
		console.log(`  ${r.op} ${r.target}: ${r.status} — ${r.detail}`);
	}
	console.log();
	console.log(`paragraphs: ${startCount} → ${renumberResult.totalParagraphs}`);
	console.log(`structure.total_paragraphs: ${structure.total_paragraphs}`);

	if (DRY) {
		console.log('\n(dry run — pass --apply to write changes)');
		return;
	}

	for (const s of sections) {
		writeFileSync(s.path, JSON.stringify(s.data));
	}
	writeFileSync(join(DATA_DIR, 'structure.json'), JSON.stringify(structure, null, 2));

	// Also write an old→new mapping for reference
	const mapping = Array.from(renumberResult.oldToNew.entries())
		.map(([o, n]) => `${o}\t${n}`)
		.join('\n');
	writeFileSync('/tmp/trent-renumber-map.tsv', mapping);
	console.log(`\nApplied. Old→new mapping written to /tmp/trent-renumber-map.tsv`);
}

main();
