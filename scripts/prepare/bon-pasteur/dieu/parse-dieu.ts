#!/usr/bin/env node
/**
 * Parser: converts "Dieu Juice/txt/Chapitre N. Title.txt" files into
 * structured JSON and writes them to static/data/bon-pasteur/dieu/.
 *
 * Run from repo root:
 *   npx tsx scripts/prepare/bon-pasteur/dieu/parse-dieu.ts
 *
 * Not wired into prepare-data.ts · `bon-pasteur` sits in its PRESERVE set, so
 * the committed output is authoritative and a normal build never regenerates
 * it. This is run by hand when the source text changes.
 *
 * The .txt sources carry no illustrations. The 55 images were positioned once
 * from the DOCX originals (4975ed8a) and inserted straight into the chapter
 * JSON, with nothing committed that could put them back · so re-running this
 * silently stripped every image from the committed data. images.json now
 * records where each one goes, in this parser's own coordinates, and the
 * insertion below restores them. See mergeImages.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import type { DieuBlock, DieuChapter } from '../../../../src/lib/data/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../../../..');
const SRC =
	'/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/sources/post-tradi/Dieu Juice/txt';
const OUT = join(REPO, 'static/data/bon-pasteur/dieu');

// ── Types ─────────────────────────────────────────────────────────────────

// DieuBlock and DieuChapter come from the frontend's types.ts rather than
// being redeclared · the local copies had no 'image' variant, which is part of
// how the images came to be dropped without anything complaining.

/** One illustration and where it belongs, in this parser's coordinates. */
interface ImagePlacement {
	/** Number of parsed blocks that precede it. */
	after: number;
	/** Short digest of the block at `after - 1`, or null when the image leads
	 *  the chapter. Verified on insert so a change to the source text that
	 *  shifts the blocks is reported rather than silently misplacing images. */
	afterAnchor: string | null;
	src: string;
	alt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/['']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function stripTrailingColon(s: string): string {
	return s.replace(/\s*:+\s*$/, '').trim();
}

// ── Parser ────────────────────────────────────────────────────────────────

const ROMAN_RE = /^([IVX]+)\)\s*(.+)$/;
const DECIMAL_RE = /^(\d+\.\d+)\)\s*(.+)$/;
const CHAPTER_RE = /^Chapitre\s+(\d+)\s*:\s*(.+?)(?:\s*:)?\s*$/;

function parseChapter(n: number, text: string): DieuChapter {
	// Normalize non-breaking space (U+00A0) to regular space throughout
	const normalized = text.replace(/\u00A0/g, ' ');
	const lines = normalized.split('\n');
	const blocks: DieuBlock[] = [];
	let title = `Chapitre ${n}`;
	let bulletBuffer: string[] = [];

	function flushBullets() {
		if (bulletBuffer.length === 0) return;
		const items = bulletBuffer.map((b) => `<li>${esc(b)}</li>`).join('');
		blocks.push({ kind: 'paragraph', html: `<ul>${items}</ul>` });
		bulletBuffer = [];
	}

	for (const raw of lines) {
		const stripped = raw.trim();

		// blank
		if (!stripped) {
			flushBullets();
			continue;
		}

		// chapter heading (first content line)
		const cm = stripped.match(CHAPTER_RE);
		if (cm) {
			title = stripTrailingColon(cm[2]!);
			continue;
		}

		// Roman numeral section (level 2)
		const rm = stripped.match(ROMAN_RE);
		if (rm) {
			flushBullets();
			const t = stripTrailingColon(rm[2]!);
			blocks.push({ kind: 'heading', level: 2, title: t, anchor: slugify(t) });
			continue;
		}

		// Decimal subsection (level 3)
		const dm = stripped.match(DECIMAL_RE);
		if (dm) {
			flushBullets();
			const t = stripTrailingColon(dm[2]!);
			blocks.push({ kind: 'heading', level: 3, title: t, anchor: slugify(t) });
			continue;
		}

		// Bullet
		if (stripped.startsWith('•')) {
			bulletBuffer.push(stripped.slice(1).trim());
			continue;
		}

		// Definition: "Term : definition" where term is ≤ 4 words and definition non-empty
		const colonIdx = stripped.indexOf(' : ');
		if (colonIdx !== -1) {
			const term = stripped.slice(0, colonIdx).trim();
			const rest = stripped.slice(colonIdx + 3).trim();
			if (rest && term.split(/\s+/).length <= 4) {
				flushBullets();
				blocks.push({ kind: 'definition', term, html: `<p>${esc(rest)}</p>` });
				continue;
			}
		}

		// Regular paragraph
		flushBullets();
		blocks.push({ kind: 'paragraph', html: `<p>${esc(stripped)}</p>` });
	}
	flushBullets();

	const slug = `ch-${String(n).padStart(2, '0')}`;
	return { slug, n, title, blocks };
}

// ── Illustrations ─────────────────────────────────────────────────────────

const IMAGES: Record<string, ImagePlacement[]> = JSON.parse(
	readFileSync(join(__dirname, 'images.json'), 'utf8')
);

function digest(block: DieuBlock): string {
	return createHash('sha256').update(JSON.stringify(block)).digest('hex').slice(0, 12);
}

/**
 * Splice this chapter's illustrations back into freshly parsed blocks.
 *
 * Placements are applied back to front so each `after` still refers to the
 * un-spliced array while it is being used. A mismatched anchor means the
 * source text moved under the recorded position: that is reported and the
 * image is placed anyway at its recorded index, because dropping it silently
 * is the exact failure this function exists to prevent.
 */
function mergeImages(slug: string, blocks: DieuBlock[]): DieuBlock[] {
	const placements = IMAGES[slug];
	if (!placements || placements.length === 0) return blocks;

	const out = [...blocks];
	for (const p of [...placements].sort((a, b) => b.after - a.after)) {
		const prev = p.after === 0 ? null : blocks[p.after - 1];
		const anchor = prev ? digest(prev) : null;
		if (anchor !== p.afterAnchor) {
			console.warn(
				`  ! ${slug}: ${p.src} expected to follow ${p.afterAnchor ?? 'the start'}, found ${anchor ?? 'the start'} · check its position`
			);
		}
		out.splice(p.after, 0, { kind: 'image', src: p.src, alt: p.alt });
	}
	return out;
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
	const files = readdirSync(SRC)
		.filter((f) => f.startsWith('Chapitre') && f.endsWith('.txt') && f !== 'All The Text.txt')
		.sort();

	const chapterRefs: Array<{ slug: string; n: number; title: string }> = [];
	mkdirSync(join(OUT, 'chapters'), { recursive: true });

	let images = 0;
	for (const file of files) {
		const m = file.match(/^Chapitre (\d+)\./);
		if (!m) continue;
		const n = parseInt(m[1]!, 10);
		const text = readFileSync(join(SRC, file), 'utf8');
		const chapter = parseChapter(n, text);
		const slug = `ch-${String(n).padStart(2, '0')}`;
		chapter.blocks = mergeImages(slug, chapter.blocks);
		writeFileSync(join(OUT, 'chapters', `${slug}.json`), JSON.stringify(chapter));
		chapterRefs.push({ slug, n, title: chapter.title });
		const paraCount = chapter.blocks.filter((b) => b.kind === 'paragraph').length;
		const defCount = chapter.blocks.filter((b) => b.kind === 'definition').length;
		const imgCount = chapter.blocks.filter((b) => b.kind === 'image').length;
		images += imgCount;
		console.log(`  ${slug}: ${chapter.title} (${paraCount}p ${defCount}def ${imgCount}img)`);
	}

	chapterRefs.sort((a, b) => a.n - b.n);
	writeFileSync(join(OUT, 'structure.json'), JSON.stringify({ chapters: chapterRefs }));
	console.log(
		`\nWrote ${chapterRefs.length} chapters (${images} images) + structure.json -> ${OUT}`
	);
}

// Only when run directly. This used to execute at import, so merely loading
// the module · a typecheck harness, a smoke test · rewrote the committed
// chapter JSON as a side effect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
