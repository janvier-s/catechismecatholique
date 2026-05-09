#!/usr/bin/env tsx
/**
 * Merge italicised text + typo fixes from the Saint-Siège EPUB into our
 * existing Trent section JSONs without losing footnote markers.
 *
 *   Strategy:
 *     1. Parse each EPUB chapter into ordered <p> inner-HTML strings.
 *     2. Gather our paragraphs in document order from all sections of that
 *        chapter (we may split a chapter into more sections than the EPUB,
 *        but paragraphs themselves correspond ~1:1).
 *     3. Greedy alignment by token-bigram Jaccard on the first ~80 chars.
 *     4. For each aligned pair: take EPUB HTML as the new body, then for
 *        every <sup data-n="N"> footnote marker in our original HTML, find
 *        the position in the EPUB raw text where the few words preceding
 *        the marker match, and splice the marker back in there.
 *
 *   Usage:
 *     npx tsx scripts/merge-trent-epub.ts            # dry-run, writes /tmp/trent-merge.html
 *     npx tsx scripts/merge-trent-epub.ts --apply    # overwrites the section JSONs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA_DIR = join(ROOT, 'static/data/trent');
const APPLY = process.argv.includes('--apply');

// ─── EPUB extraction ──────────────────────────────────────────────────────────

const EPUB_DIR = '/tmp/trent-epub';
const EPUB_PATH =
	'/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/sources/Catechisme de Trente/Catechisme-du-Concile-de-Trente-Saint-Siege.epub';

function ensureEpubExtracted() {
	if (existsSync(join(EPUB_DIR, 'preface.html'))) return;
	console.log('extracting epub…');
	execSync(`mkdir -p ${EPUB_DIR} && cd ${EPUB_DIR} && unzip -o "${EPUB_PATH}"`, {
		stdio: 'pipe'
	});
}

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

// Extract the inner HTML of every top-level <p> in the file (ignoring those
// inside <header>, <footer>, etc. — at the top level the EPUB always has
// <body><h1/><h2/><h3/><p/>… so a flat regex pass is fine).
function extractParagraphs(html: string): string[] {
	const out: string[] = [];
	const re = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) out.push(m[1]!.trim());
	return out;
}

// ─── Text normalisation for similarity ─────────────────────────────────────────

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

function normalize(s: string): string {
	return stripHtml(s)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9 ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function tokenBigrams(s: string, len = 100): Set<string> {
	const tokens = normalize(s).slice(0, len).split(/\s+/).filter(Boolean);
	const out = new Set<string>();
	for (let i = 0; i < tokens.length - 1; i++) out.add(`${tokens[i]} ${tokens[i + 1]}`);
	return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 1;
	if (a.size === 0 || b.size === 0) return 0;
	let inter = 0;
	for (const x of a) if (b.has(x)) inter++;
	return inter / (a.size + b.size - inter);
}

// ─── Greedy alignment ──────────────────────────────────────────────────────────

interface Pair {
	ourIdx: number;
	epubIdx: number;
	score: number;
}

function alignParagraphs(ours: string[], epub: string[]): { pairs: Pair[]; unaligned: number[] } {
	const oBigs = ours.map((p) => tokenBigrams(p));
	const eBigs = epub.map((p) => tokenBigrams(p));
	const pairs: Pair[] = [];
	const unaligned: number[] = [];
	let i = 0;
	let j = 0;
	const THRESHOLD = 0.55;

	while (i < ours.length && j < epub.length) {
		const sim = jaccard(oBigs[i]!, eBigs[j]!);
		if (sim >= THRESHOLD) {
			pairs.push({ ourIdx: i, epubIdx: j, score: sim });
			i++;
			j++;
			continue;
		}
		// Look ahead one slot on each side
		const simSkipOur = i + 1 < ours.length ? jaccard(oBigs[i + 1]!, eBigs[j]!) : -1;
		const simSkipEpub = j + 1 < epub.length ? jaccard(oBigs[i]!, eBigs[j + 1]!) : -1;
		if (simSkipOur >= THRESHOLD && simSkipOur >= simSkipEpub) {
			unaligned.push(i);
			i++;
		} else if (simSkipEpub >= THRESHOLD) {
			j++; // EPUB has an extra paragraph we don't have
		} else {
			// Neither side helps. Advance the shorter side.
			if (ours.length - i > epub.length - j) {
				unaligned.push(i);
				i++;
			} else {
				j++;
			}
		}
	}
	while (i < ours.length) {
		unaligned.push(i);
		i++;
	}
	return { pairs, unaligned };
}

// ─── Footnote splice ───────────────────────────────────────────────────────────

interface FootnoteSplice {
	html: string; // <sup ...>N</sup>
	rawTextBefore: string; // raw text appearing before this sup in our paragraph
	rawTextAfter: string; // raw text appearing right after this sup
}

// Walk our HTML, collect each <sup> with the raw text appearing before/after
// it (between the previous sup and this one, and from this sup onward).
function extractFootnotes(html: string): FootnoteSplice[] {
	const splices: FootnoteSplice[] = [];
	const re = /<sup\b[^>]*>[\s\S]*?<\/sup>/g;
	let lastEnd = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) {
		const before = html.slice(lastEnd, m.index);
		splices.push({
			html: m[0],
			rawTextBefore: stripHtml(before),
			rawTextAfter: '' // filled in second pass
		});
		lastEnd = m.index + m[0].length;
	}
	// Set rawTextAfter for each based on the next splice's "before"
	for (let k = 0; k < splices.length; k++) {
		const tailHtml =
			k + 1 < splices.length
				? (html
						.slice(0)
						.split(splices[k]!.html)[1]
						?.split(splices[k + 1]!.html)[0] ?? '')
				: '';
		// fallback: derive after text more simply
		void tailHtml;
	}
	return splices;
}

// Convert a position in the raw text of an HTML string to a position in the
// HTML string itself. We walk the HTML emitting (htmlPos, textPos) deltas
// each time a non-tag char is consumed, so we can binary-search any text pos
// to find where it sits in the HTML.
function buildTextHtmlMap(html: string): { textToHtml(textPos: number): number } {
	// Each entry: textPos at the start of this segment, htmlPos at start
	const segments: { textPos: number; htmlPos: number }[] = [{ textPos: 0, htmlPos: 0 }];
	let textPos = 0;
	let i = 0;
	const ENTITY_RE = /^&(?:#\d+|#x[\da-f]+|[a-z]+);/i;
	while (i < html.length) {
		const c = html[i]!;
		if (c === '<') {
			// Skip tag entirely
			const tagEnd = html.indexOf('>', i);
			if (tagEnd < 0) break;
			i = tagEnd + 1;
			segments.push({ textPos, htmlPos: i });
		} else if (c === '&') {
			const m = html.slice(i).match(ENTITY_RE);
			if (m) {
				// Treat the whole entity as 1 character
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
			// Find the segment whose textPos <= target
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

// Splice all our footnotes into the EPUB HTML based on their text-anchor
// positions. Returns the merged HTML.
function spliceFootnotes(
	ourHtml: string,
	epubHtml: string
): { merged: string; spliced: number; missed: number } {
	const splices = extractFootnotes(ourHtml);
	if (splices.length === 0) return { merged: epubHtml, spliced: 0, missed: 0 };

	const epubText = stripHtml(epubHtml);
	const map = buildTextHtmlMap(epubHtml);

	// Compute target text position for each splice. Track an advancing cursor
	// so multiple footnotes don't all collapse onto the same position when an
	// anchor phrase is short and ambiguous.
	const targets: number[] = [];
	let cursor = 0;
	let missed = 0;
	for (const s of splices) {
		const slice = epubText.slice(cursor);
		const trimBefore = s.rawTextBefore.trimEnd();
		if (trimBefore.length === 0) {
			targets.push(cursor);
			continue;
		}
		const tailWords = trimBefore.split(/\s+/);
		let pos = -1;
		for (let len = Math.min(10, tailWords.length); len >= 2; len--) {
			const anchor = tailWords.slice(-len).join(' ');
			const endInSlice = findAnchorEnd(slice, anchor);
			if (endInSlice >= 0) {
				pos = cursor + endInSlice;
				break;
			}
		}
		if (pos < 0) {
			missed++;
			targets.push(-1);
		} else {
			targets.push(pos);
			cursor = pos;
		}
	}

	// Now insert from end to beginning so earlier insertions don't shift later
	// indices.
	let merged = epubHtml;
	const insertions = splices
		.map((s, k) => ({ s, t: targets[k]! }))
		.filter((x) => x.t >= 0)
		.sort((a, b) => b.t - a.t);
	for (const { s, t } of insertions) {
		let htmlPos = map.textToHtml(t);
		htmlPos = advancePastItalic(merged, htmlPos);
		merged = merged.slice(0, htmlPos) + s.html + merged.slice(htmlPos);
	}

	return { merged, spliced: splices.length - missed, missed };
}

// If we're about to insert inside an open <i>...</i> span AND only
// whitespace/punctuation remains before </i>, advance past </i>. This
// keeps footnotes outside the closing italic when they belong to a single
// quotation, while preserving inline placement when multiple quotations
// (separated by " – ") share one italic span and each gets its own footnote.
function advancePastItalic(html: string, htmlPos: number): number {
	const before = html.slice(0, htmlPos);
	const lastOpen = before.lastIndexOf('<i>');
	const lastClose = before.lastIndexOf('</i>');
	if (lastOpen <= lastClose) return htmlPos;
	const nextClose = html.indexOf('</i>', htmlPos);
	if (nextClose < 0) return htmlPos;
	const between = html.slice(htmlPos, nextClose);
	// "Significant content" = any letter or digit. Mere punctuation/space → advance.
	if (/[\p{L}\p{N}]/u.test(between)) return htmlPos;
	return nextClose + 4;
}

// Build a per-char normalised view of `s` together with a charMap so a
// position in the normalised string maps back to a position in `s`.
// Runs of non-alphanumerics collapse to a single space to absorb punctuation
// drift between sources (e.g. our French guillemets vs. EPUB plain text).
function normalizeWithMap(s: string): { norm: string; charMap: number[] } {
	let norm = '';
	const charMap: number[] = [];
	let prevWasSpace = true;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i]!;
		const decomposed = ch.normalize('NFD');
		for (const d of decomposed) {
			if (/[̀-ͯ]/.test(d)) continue; // combining marks
			const lc = d.toLowerCase();
			if (/[a-z0-9]/.test(lc)) {
				norm += lc;
				charMap.push(i);
				prevWasSpace = false;
			} else if (!prevWasSpace) {
				norm += ' ';
				charMap.push(i);
				prevWasSpace = true;
			}
		}
	}
	return { norm, charMap };
}

// Advance past trailing closing punctuation so we splice AFTER the period /
// comma / closing-quote / French-spaced "?" that follows the matched text.
// Skips one leading non-breaking-style space (French typography "douté ?"),
// then any run of closing punctuation. Stops at the next alphanumeric.
function advanceTrailingPunct(s: string, pos: number): number {
	if (pos < s.length && /[\s]/.test(s[pos]!)) {
		// Lookahead: only consume the leading space if a punctuation char follows.
		const punct = pos + 1 < s.length && /[.,;:!?»)\]'"]/.test(s[pos + 1]!);
		if (punct) pos++;
	}
	while (pos < s.length && /[.,;:!?»)\]'"]/.test(s[pos]!)) pos++;
	return pos;
}

// Returns the position in `haystack` right AFTER an accent/case/punctuation
// -insensitive match of `needle`, or -1 if not found.
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
	const lastHaystackIdx = charMap[lastNormIdx];
	if (lastHaystackIdx === undefined) return -1;
	return advanceTrailingPunct(haystack, lastHaystackIdx + 1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface SectionFile {
	corpus: string;
	chapter_slug: string;
	slug: string;
	title: string;
	paragraphs: { number: number; html: string }[];
	[key: string]: unknown;
}

interface MergeReport {
	chapterNumber: number;
	chapterSlug: string;
	ours: number;
	epub: number;
	aligned: number;
	unalignedOurs: number;
	totalFootnotes: number;
	splicedFootnotes: number;
	missedFootnotes: number;
	paragraphs: {
		number: number;
		section: string;
		ourHtml: string;
		epubHtml: string;
		mergedHtml: string;
		score: number;
		status: 'aligned' | 'unaligned';
	}[];
}

function processChapter(
	part: { chapters: { number: number; slug: string }[] },
	ch: { number: number; slug: string }
): MergeReport {
	void part;
	const epubFile = findEpubFile(ch.number);
	const epubHtml = readFileSync(epubFile, 'utf8');
	const epubParagraphs = extractParagraphs(epubHtml);

	// Gather our paragraphs in order from all sections of this chapter
	const sectionDir = join(DATA_DIR, 'sections', ch.slug);
	const sectionFiles = readdirSync(sectionDir)
		.filter((f) => f.endsWith('.json'))
		.sort((a, b) => {
			// natural sort by leading number
			const na = parseInt(a.split('-')[0]!, 10);
			const nb = parseInt(b.split('-')[0]!, 10);
			return na - nb;
		});

	type OurEntry = {
		sectionFile: string;
		secIdx: number;
		pIdx: number;
		html: string;
		number: number;
	};
	const ours: OurEntry[] = [];
	const sectionData = new Map<string, SectionFile>();
	for (const f of sectionFiles) {
		const path = join(sectionDir, f);
		const data: SectionFile = JSON.parse(readFileSync(path, 'utf8'));
		sectionData.set(f, data);
		for (let p = 0; p < data.paragraphs.length; p++) {
			ours.push({
				sectionFile: f,
				secIdx: -1,
				pIdx: p,
				html: data.paragraphs[p]!.html,
				number: data.paragraphs[p]!.number
			});
		}
	}

	const ourHtmls = ours.map((o) => o.html);
	const { pairs, unaligned } = alignParagraphs(ourHtmls, epubParagraphs);

	const alignedSet = new Map<number, number>();
	for (const p of pairs) alignedSet.set(p.ourIdx, p.epubIdx);

	const reportParagraphs: MergeReport['paragraphs'] = [];
	let totalFootnotes = 0;
	let splicedFootnotes = 0;
	let missedFootnotes = 0;

	for (let i = 0; i < ours.length; i++) {
		const o = ours[i]!;
		if (alignedSet.has(i)) {
			const epubIdx = alignedSet.get(i)!;
			const epubP = epubParagraphs[epubIdx]!;
			const r = spliceFootnotes(o.html, epubP);
			const fnCount = (o.html.match(/<sup\b/g) ?? []).length;
			totalFootnotes += fnCount;
			splicedFootnotes += r.spliced;
			missedFootnotes += r.missed;
			reportParagraphs.push({
				number: o.number,
				section: o.sectionFile,
				ourHtml: o.html,
				epubHtml: epubP,
				mergedHtml: r.merged,
				score: pairs.find((p) => p.ourIdx === i)?.score ?? 0,
				status: 'aligned'
			});
			// Apply: write back to section data
			if (APPLY && r.missed === 0) {
				const data = sectionData.get(o.sectionFile)!;
				data.paragraphs[o.pIdx]!.html = r.merged;
			}
		} else {
			reportParagraphs.push({
				number: o.number,
				section: o.sectionFile,
				ourHtml: o.html,
				epubHtml: '(no match)',
				mergedHtml: o.html,
				score: 0,
				status: 'unaligned'
			});
		}
	}

	if (APPLY) {
		// Write back section files (only those touched)
		for (const [fname, data] of sectionData) {
			writeFileSync(join(sectionDir, fname), JSON.stringify(data, null, 0));
		}
	}

	return {
		chapterNumber: ch.number,
		chapterSlug: ch.slug,
		ours: ours.length,
		epub: epubParagraphs.length,
		aligned: pairs.length,
		unalignedOurs: unaligned.length,
		totalFootnotes,
		splicedFootnotes,
		missedFootnotes,
		paragraphs: reportParagraphs
	};
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderReport(reports: MergeReport[]): string {
	const head = `<!doctype html><html><head><meta charset="utf-8"><title>Trent EPUB merge report</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; max-width: none; margin: 1.5rem; }
  h1 { font-size: 1.4rem; margin: 0 0 1rem; }
  h2 { font-size: 1.05rem; margin: 1.5rem 0 0.5rem; padding: 0.4rem 0.6rem; background: #eee; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 0.35rem 0.5rem; border-top: 1px solid #ddd; font-size: 13px; line-height: 1.55; }
  td.num { width: 3rem; font-family: ui-monospace; color: #999; text-align: right; }
  td.sect { width: 8rem; font-family: ui-monospace; font-size: 11px; color: #666; }
  td.cell { font-family: 'Source Serif 4', Georgia, serif; }
  td.cell sup { color: #c00; font-size: 0.7em; padding: 0 0.1em; }
  td.cell i { color: #064; }
  tr.unaligned td { background: #fff4e0; }
  tr.missed td { background: #ffe6e6; }
  .summary { margin-bottom: 1rem; padding: 0.6rem 0.9rem; background: #f6f6f6; border-radius: 4px; font-family: ui-monospace; font-size: 12px; }
  thead th { font: 11px/1 -apple-system, sans-serif; text-align: left; text-transform: uppercase; letter-spacing: 0.06em; color: #666; padding: 0.4rem 0.5rem; border-bottom: 2px solid #ccc; }
  .col-our { width: 30%; }
  .col-epub { width: 30%; }
  .col-merged { width: 36%; background: #f8fffb; }
</style></head><body>
<h1>Trent EPUB merge — dry-run report</h1>`;

	const summary: string[] = [];
	let totalOurs = 0,
		totalEpub = 0,
		totalAligned = 0,
		totalUnaligned = 0,
		totalFn = 0,
		totalSpliced = 0,
		totalMissed = 0;
	for (const r of reports) {
		totalOurs += r.ours;
		totalEpub += r.epub;
		totalAligned += r.aligned;
		totalUnaligned += r.unalignedOurs;
		totalFn += r.totalFootnotes;
		totalSpliced += r.splicedFootnotes;
		totalMissed += r.missedFootnotes;
	}
	summary.push(
		`<div class="summary">paragraphs: ${totalOurs} ours / ${totalEpub} epub | aligned ${totalAligned} | unaligned ours ${totalUnaligned} | footnotes ${totalFn}: spliced ${totalSpliced}, MISSED ${totalMissed}</div>`
	);

	const sections: string[] = [];
	for (const r of reports) {
		sections.push(
			`<h2>ch${String(r.chapterNumber).padStart(2, '0')} — ${r.chapterSlug} (ours ${r.ours} / epub ${r.epub}, aligned ${r.aligned}, missed footnotes ${r.missedFootnotes})</h2>`
		);
		sections.push(
			`<table><thead><tr><th>#</th><th>section</th><th class="col-our">ours</th><th class="col-epub">epub</th><th class="col-merged">merged</th></tr></thead><tbody>`
		);
		for (const p of r.paragraphs) {
			const cls = p.status === 'unaligned' ? 'unaligned' : p.mergedHtml !== p.ourHtml ? '' : '';
			sections.push(
				`<tr class="${cls}"><td class="num">${p.number}</td><td class="sect">${escapeHtml(p.section)}</td><td class="cell col-our">${p.ourHtml}</td><td class="cell col-epub">${p.epubHtml}</td><td class="cell col-merged">${p.mergedHtml}</td></tr>`
			);
		}
		sections.push(`</tbody></table>`);
	}

	return head + summary.join('\n') + sections.join('\n') + '</body></html>';
}

function main() {
	ensureEpubExtracted();
	const structure = JSON.parse(readFileSync(join(DATA_DIR, 'structure.json'), 'utf8'));
	const reports: MergeReport[] = [];
	for (const part of structure.parts) {
		for (const ch of part.chapters) {
			const r = processChapter(part, ch);
			reports.push(r);
		}
	}
	const reportPath = '/tmp/trent-merge.html';
	writeFileSync(reportPath, renderReport(reports));

	// Console summary
	let totalOurs = 0,
		totalAligned = 0,
		totalUnaligned = 0,
		totalFn = 0,
		totalSpliced = 0,
		totalMissed = 0;
	for (const r of reports) {
		totalOurs += r.ours;
		totalAligned += r.aligned;
		totalUnaligned += r.unalignedOurs;
		totalFn += r.totalFootnotes;
		totalSpliced += r.splicedFootnotes;
		totalMissed += r.missedFootnotes;
	}
	console.log(`paragraphs: ${totalOurs} | aligned ${totalAligned} | unaligned ${totalUnaligned}`);
	console.log(`footnotes: ${totalFn} | spliced ${totalSpliced} | MISSED ${totalMissed}`);
	console.log(`report → ${reportPath}`);
	if (APPLY) console.log('APPLIED — section JSONs overwritten.');
	else console.log('(dry run — pass --apply to overwrite section JSONs)');

	// Touch a stat to satisfy lint
	void statSync;
}

main();
