#!/usr/bin/env node
/**
 * One-time parser: converts "La Liturgie Juice/txt/Chapitre N. Title.txt"
 * files into structured JSON for /bon-pasteur/liturgie. Text only · pass 2
 * will handle images extracted from the .docx sources.
 *
 *   npx tsx scripts/prepare/bon-pasteur/liturgie/parse-liturgie.ts
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../../../..');
const SRC =
	'/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/sources/post-tradi/La Liturgie Juice/txt';
const OUT = join(REPO, 'static/data/bon-pasteur/liturgie');

type Block =
	| { kind: 'heading'; level: 2 | 3; title: string; anchor: string }
	| { kind: 'paragraph'; html: string };

interface Chapter {
	slug: string;
	n: number;
	title: string;
	blocks: Block[];
}

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/['’‘]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function stripTrailingColon(s: string): string {
	return s.replace(/\s*:+\s*$/, '').trim();
}

// Source filenames look like: "Chapitre 10. L'année liturgique - Le temps de l'Avent.txt"
const FN_RE = /^Chapitre\s+(\d+)\.\s+(.+)\.txt$/;
// First-content "Chapitre 2 : ..." line · used to confirm the chapter title.
const CHAPTER_LINE_RE = /^Chapitre\s+(\d+)\s*:\s*(.+?)(?:\s*:)?\s*$/;
// A standalone heading: a non-empty trimmed line that ends in ` :` and
// whose pre-colon text has < 80 chars (so we don't capture long paragraphs
// that happen to end with a colon).
const HEADING_RE = /^(.{1,80}?)\s*:\s*$/;
// Lead-in pattern: "Term : body text" on a single paragraph line. We bold
// the term in the rendered HTML so the sub-section reads visually.
const LEADIN_RE = /^(.{1,80}?)\s*:\s+(.+)$/;

function isBullet(line: string): boolean {
	return /^\s*[•·\-]\s/.test(line) || /^\t[•·]\t/.test(line);
}

function cleanBullet(line: string): string {
	return line
		.replace(/^\t[•·]\t/, '')
		.replace(/^\s*[•·\-]\s*/, '')
		.replace(/,$/, '')
		.trim();
}

function paragraphHtml(text: string): string {
	// Detect lead-in "Term : body" only on lines short enough that the
	// term reads like a phrase rather than a sentence with a stray colon.
	const m = text.match(LEADIN_RE);
	if (m && m[1].length <= 60 && !m[1].includes('.')) {
		return `<p><strong>${esc(m[1])} :</strong> ${esc(m[2])}</p>`;
	}
	return `<p>${esc(text)}</p>`;
}

function parseChapter(n: number, srcTitle: string, text: string): Chapter {
	const normalized = text.replace(/ /g, ' ').replace(/\r/g, '');
	const lines = normalized.split('\n');

	const blocks: Block[] = [];
	let title = srcTitle;
	let pendingPara: string[] = [];
	let pendingBullets: string[] = [];
	// Skip the front-matter block (book title, author, institute, duplicated
	// chapter headers). We treat anything before the first "Chapitre N :" line
	// as front-matter.
	let sawChapter = false;

	function flushBullets() {
		if (pendingBullets.length === 0) return;
		const items = pendingBullets.map((b) => `<li>${esc(b)}</li>`).join('');
		blocks.push({ kind: 'paragraph', html: `<ul>${items}</ul>` });
		pendingBullets = [];
	}
	function flushPara() {
		flushBullets();
		if (pendingPara.length === 0) return;
		const joined = pendingPara.join(' ').replace(/\s+/g, ' ').trim();
		if (joined) blocks.push({ kind: 'paragraph', html: paragraphHtml(joined) });
		pendingPara = [];
	}

	for (const raw of lines) {
		const stripped = raw.trim();

		if (!stripped) {
			flushPara();
			continue;
		}

		// Pre-chapter front-matter: skip until we see the canonical
		// "Chapitre N : ..." line. We keep the filename title (which is
		// often more complete than the inline one).
		if (!sawChapter) {
			const cm = stripped.match(CHAPTER_LINE_RE);
			if (cm && Number(cm[1]) === n) {
				sawChapter = true;
			}
			continue;
		}

		// Bullets · the txt file uses "\t•\t" or " • " markers.
		if (isBullet(raw) || isBullet(stripped)) {
			flushPara();
			pendingBullets.push(cleanBullet(raw));
			continue;
		}

		// Standalone heading: short line that's *just* "X :".
		const hm = stripped.match(HEADING_RE);
		if (hm && pendingPara.length === 0) {
			flushPara();
			const t = stripTrailingColon(hm[1]);
			// Indent-prefixed lines (tab in raw) → h3; flush flat → h2.
			const level = raw.startsWith('\t') ? 3 : 2;
			blocks.push({ kind: 'heading', level, title: t, anchor: slugify(t) });
			continue;
		}

		pendingPara.push(stripped);
	}
	flushPara();

	return {
		slug: `ch-${String(n).padStart(2, '0')}`,
		n,
		title,
		blocks
	};
}

// ── Drive ────────────────────────────────────────────────────────────────

mkdirSync(join(OUT, 'chapters'), { recursive: true });

const files = readdirSync(SRC).filter(
	(f) => FN_RE.test(f) && !f.toLowerCase().startsWith('all the text')
);

const chapters: Chapter[] = [];
for (const f of files) {
	const m = f.match(FN_RE)!;
	const n = Number(m[1]);
	const fileTitle = m[2].trim();
	const text = readFileSync(join(SRC, f), 'utf-8');
	chapters.push(parseChapter(n, fileTitle, text));
}
chapters.sort((a, b) => a.n - b.n);

// Per-chapter JSON
for (const ch of chapters) {
	writeFileSync(join(OUT, 'chapters', `${ch.slug}.json`), JSON.stringify(ch));
}

// structure.json
const structure = {
	chapters: chapters.map((c) => ({ slug: c.slug, n: c.n, title: c.title }))
};
writeFileSync(join(OUT, 'structure.json'), JSON.stringify(structure));

console.log(`[liturgie] wrote ${chapters.length} chapters → ${OUT}`);
