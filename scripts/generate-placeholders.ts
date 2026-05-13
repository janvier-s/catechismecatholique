#!/usr/bin/env node
/**
 * Generates placeholder cover images (WebP, 600×800) for Vatican II documents
 * and IBP courses. Run with: npx tsx scripts/generate-placeholders.ts
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../static/img/bibliotheque');
mkdirSync(OUT, { recursive: true });

// ── Palette (matches site design tokens, light mode) ────────────────────────
const BG_TOP = '#f7f1e8';
const BG_BOT = '#ede5d6';
const ACCENT = '#b91c1c';
const FG = '#2c1f10';
const MUTED = '#7a6a58';
const BORDER = '#c8b89a';

// ── Types ────────────────────────────────────────────────────────────────────
interface Doc {
	slug: string;
	title: string;
	kind: string; // displayed as uppercase label
	prefix: string; // filename prefix, e.g. "vii"
}

// ── Vatican II documents ─────────────────────────────────────────────────────
const vatiiStructure = JSON.parse(
	readFileSync(join(__dirname, '../static/data/vatican-ii/structure.json'), 'utf8')
) as { docs: Array<{ slug: string; title: string; kind: string; abbr: string }> };

const KIND_FR: Record<string, string> = {
	constitution: 'Constitution',
	decree: 'Décret',
	declaration: 'Déclaration'
};

const vatiiDocs: Doc[] = vatiiStructure.docs.map((d) => ({
	slug: d.slug,
	title: d.title,
	kind: KIND_FR[d.kind] ?? d.kind,
	prefix: 'vii'
}));

// ── IBP courses ───────────────────────────────────────────────────────────────
const ibpDocs: Doc[] = [
	{
		slug: 'catechisme-adultes',
		title: 'Cours de catéchisme pour adultes',
		kind: 'Catéchèse',
		prefix: 'ibp'
	},
	{
		slug: 'dieu',
		title: 'Dieu',
		kind: 'Doctrine de la foi',
		prefix: 'ibp'
	},
	{
		slug: 'liturgie',
		title: 'La Liturgie',
		kind: 'Liturgie catholique',
		prefix: 'ibp'
	}
];

const ALL: Doc[] = [...vatiiDocs, ...ibpDocs];

// ── Word-wrap helper ──────────────────────────────────────────────────────────
// Approximate char-width for SVG text. Returns array of lines.
function wrapText(text: string, maxChars: number): string[] {
	const words = text.split(' ');
	const lines: string[] = [];
	let current = '';
	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (candidate.length > maxChars && current) {
			lines.push(current);
			current = word;
		} else {
			current = candidate;
		}
	}
	if (current) lines.push(current);
	return lines;
}

// ── SVG builder ───────────────────────────────────────────────────────────────
function makeSvg(doc: Doc): string {
	const W = 600;
	const H = 800;

	// Font size + wrap based on title length
	let fontSize: number;
	let maxChars: number;
	if (doc.title.length <= 12) {
		fontSize = 58;
		maxChars = 14;
	} else if (doc.title.length <= 22) {
		fontSize = 46;
		maxChars = 18;
	} else {
		fontSize = 36;
		maxChars = 22;
	}

	const lines = wrapText(doc.title, maxChars);
	const lineHeight = fontSize * 1.25;
	const totalTextH = lines.length * lineHeight;
	// Centre block vertically between cross (y=220) and bottom rule (y=620)
	const midY = 415;
	const startY = midY - totalTextH / 2 + fontSize * 0.35;

	const titleTspans = lines
		.map((line, i) => {
			const y = startY + i * lineHeight;
			return `<tspan x="${W / 2}" y="${y}">${escXml(line)}</tspan>`;
		})
		.join('');

	// Kind label – upper
	const kindLabel = doc.kind.toUpperCase();

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="${BG_TOP}"/>
      <stop offset="100%" stop-color="${BG_BOT}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#g)"/>

  <!-- Outer border -->
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}"
        fill="none" stroke="${BORDER}" stroke-width="1" opacity="0.7"/>
  <!-- Inner border -->
  <rect x="30" y="30" width="${W - 60}" height="${H - 60}"
        fill="none" stroke="${BORDER}" stroke-width="0.5" opacity="0.4"/>

  <!-- Top rule -->
  <line x1="60" y1="110" x2="${W - 60}" y2="110"
        stroke="${ACCENT}" stroke-width="0.75" opacity="0.35"/>

  <!-- Cross ornament -->
  <text x="${W / 2}" y="175" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="44" fill="${ACCENT}" opacity="0.55">&#x2720;</text>

  <!-- Kind label -->
  <text x="${W / 2}" y="230" text-anchor="middle"
        font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="13" font-weight="600" letter-spacing="5"
        fill="${ACCENT}" opacity="0.65">${escXml(kindLabel)}</text>

  <!-- Title -->
  <text text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-style="italic" font-size="${fontSize}"
        fill="${FG}">${titleTspans}</text>

  <!-- Bottom rule -->
  <line x1="60" y1="620" x2="${W - 60}" y2="620"
        stroke="${BORDER}" stroke-width="0.75" opacity="0.5"/>

  <!-- Concile Vatican II / Institut du Bon Pasteur label -->
  <text x="${W / 2}" y="660" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-style="italic" font-size="16"
        fill="${MUTED}" opacity="0.65">${doc.prefix === 'vii' ? 'Concile Vatican II' : 'Institut du Bon Pasteur'}</text>
</svg>`;
}

function escXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

// ── Generate ──────────────────────────────────────────────────────────────────
let generated = 0;
for (const doc of ALL) {
	const outPath = join(OUT, `${doc.prefix}-${doc.slug}.webp`);
	const svg = Buffer.from(makeSvg(doc));
	await sharp(svg, { density: 144 }).resize(600, 800).webp({ quality: 85 }).toFile(outPath);
	console.log(`  ✓  ${doc.prefix}-${doc.slug}.webp`);
	generated++;
}

console.log(`\nGenerated ${generated} placeholder images → static/img/bibliotheque/`);
