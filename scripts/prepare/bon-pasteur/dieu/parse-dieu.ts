#!/usr/bin/env node
/**
 * One-time parser: converts "Dieu Juice/txt/Chapitre N. Title.txt" files
 * into structured JSON and writes them to static/data/bon-pasteur/dieu/.
 *
 * Run from repo root:
 *   npx tsx scripts/prepare/bon-pasteur/dieu/parse-dieu.ts
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../../../..');
const SRC =
	'/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/sources/post-tradi/Dieu Juice/txt';
const OUT = join(REPO, 'static/data/bon-pasteur/dieu');

// ── Types ─────────────────────────────────────────────────────────────────

type DieuBlock =
	| { kind: 'heading'; level: 2 | 3; title: string; anchor: string }
	| { kind: 'paragraph'; html: string }
	| { kind: 'definition'; term: string; html: string };

interface DieuChapter {
	slug: string;
	n: number;
	title: string;
	blocks: DieuBlock[];
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
	const normalized = text.replace(/ /g, ' ');
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
			title = stripTrailingColon(cm[2]);
			continue;
		}

		// Roman numeral section (level 2)
		const rm = stripped.match(ROMAN_RE);
		if (rm) {
			flushBullets();
			const t = stripTrailingColon(rm[2]);
			blocks.push({ kind: 'heading', level: 2, title: t, anchor: slugify(t) });
			continue;
		}

		// Decimal subsection (level 3)
		const dm = stripped.match(DECIMAL_RE);
		if (dm) {
			flushBullets();
			const t = stripTrailingColon(dm[2]);
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

// ── Main ──────────────────────────────────────────────────────────────────

const files = readdirSync(SRC)
	.filter((f) => f.startsWith('Chapitre') && f.endsWith('.txt') && f !== 'All The Text.txt')
	.sort();

const chapterRefs: Array<{ slug: string; n: number; title: string }> = [];
mkdirSync(join(OUT, 'chapters'), { recursive: true });

for (const file of files) {
	const m = file.match(/^Chapitre (\d+)\./);
	if (!m) continue;
	const n = parseInt(m[1], 10);
	const text = readFileSync(join(SRC, file), 'utf8');
	const chapter = parseChapter(n, text);
	const slug = `ch-${String(n).padStart(2, '0')}`;
	writeFileSync(join(OUT, 'chapters', `${slug}.json`), JSON.stringify(chapter));
	chapterRefs.push({ slug, n, title: chapter.title });
	const paraCount = chapter.blocks.filter((b) => b.kind === 'paragraph').length;
	const defCount = chapter.blocks.filter((b) => b.kind === 'definition').length;
	console.log(`  ${slug}: ${chapter.title} (${paraCount}p ${defCount}def)`);
}

chapterRefs.sort((a, b) => a.n - b.n);
writeFileSync(join(OUT, 'structure.json'), JSON.stringify({ chapters: chapterRefs }));
console.log(`\nWrote ${chapterRefs.length} chapters + structure.json -> ${OUT}`);
