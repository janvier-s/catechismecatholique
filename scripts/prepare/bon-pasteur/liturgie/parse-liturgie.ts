#!/usr/bin/env node
/**
 * Parser for "Chapitre N. Title.docx" in CUSTODIO/IBP/La Liturgie.
 *
 * The .docx files don't use Word's "Heading 1/2/3" styles; the editorial
 * hierarchy is encoded purely in run font sizes. We read document.xml
 * directly and map sizes to block kinds:
 *
 *   sz=40  →  chapter title (skip; we use the filename title)
 *   sz=36  →  h2 ("À Retenir" headings are detected by text and emitted
 *             as a `callout-heading` instead — they group the trailing
 *             summary section into its own styled aside)
 *   sz=32  →  h3
 *   sz=28 italic-majority + leading « → quote
 *   sz=28 plain with "Term : short body" (total < 80c) → h4
 *   sz=28 + drawing → image block
 *   sz=28 plain → paragraph (with inline bold/italic preserved)
 *
 * Images are pulled from word/media/, resized, and written as webp.
 *
 *   npx tsx scripts/prepare/bon-pasteur/liturgie/parse-liturgie.ts
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../../../..');
const SRC =
	'/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/CUSTODIO/IBP/La Liturgie';
const OUT_DATA = join(REPO, 'static/data/bon-pasteur/liturgie');
const OUT_IMG = join(REPO, 'static/img/bon-pasteur/liturgie');
const IMG_URL_PREFIX = '/img/bon-pasteur/liturgie';

type Block =
	| { kind: 'heading'; level: 2 | 3 | 4; title: string; anchor: string }
	| { kind: 'callout-heading'; title: string; anchor: string }
	| { kind: 'paragraph'; html: string }
	| { kind: 'quote'; html: string }
	| { kind: 'definition'; term: string; html: string }
	| { kind: 'image'; src: string; alt: string };

interface Chapter {
	slug: string;
	n: number;
	title: string;
	blocks: Block[];
}

const FN_RE = /^Chapitre\s+(\d+)\.\s+(.+)\.docx$/;
const A_RETENIR_RE = /^(?:À|A)\s*retenir\s*!?\s*$/i;
const ETYMOLOGY_RE =
	/^([A-ZÀ-ÖØ-Þ][\wÀ-ÖØ-öø-ÿ'’\- ]+?)\s*\((?:du|de la|de l['’])\s*(grec|latin|hébreu)\b/;

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

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── XML parsing ────────────────────────────────────────────────────────────

type Run = { bold: boolean; italic: boolean; sz: number; text: string };
type ImgRef = { rId: string };
type Para = {
	sz: number; // dominant size (half-points; 28 = 14pt)
	bold: boolean; // first non-empty run bold
	italic: boolean; // first non-empty run italic
	majorityItalic: boolean;
	runs: Run[]; // all runs in order
	text: string; // joined plain text
	images: ImgRef[];
};

function readRuns(paraXml: string): Run[] {
	const runs: Run[] = [];
	const re = /<w:r[ >][\s\S]*?<\/w:r>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(paraXml)) !== null) {
		const r = m[0];
		const szMatch = r.match(/<w:sz w:val="(\d+)"/);
		const sz = szMatch ? Number(szMatch[1]) : 0;
		const bold = /<w:b\s*\/>/.test(r) || /<w:b\s/.test(r);
		const italic = /<w:i\s*\/>/.test(r) || /<w:i\s/.test(r);
		const text = [...r.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join('');
		runs.push({ bold, italic, sz, text });
	}
	return runs;
}

function readImages(paraXml: string): ImgRef[] {
	const out: ImgRef[] = [];
	const re = /<a:blip\s+[^>]*r:embed="([^"]+)"/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(paraXml)) !== null) {
		out.push({ rId: m[1]! });
	}
	return out;
}

function parsePara(paraXml: string): Para {
	const runs = readRuns(paraXml);
	const text = runs
		.map((r) => r.text)
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
	const images = readImages(paraXml);
	// Dominant size: the most frequent non-zero sz across runs.
	const sizeCounts = new Map<number, number>();
	for (const r of runs) {
		if (!r.sz || !r.text.trim()) continue;
		sizeCounts.set(r.sz, (sizeCounts.get(r.sz) ?? 0) + r.text.length);
	}
	let sz = 0;
	let best = 0;
	for (const [k, v] of sizeCounts) {
		if (v > best) {
			best = v;
			sz = k;
		}
	}
	const firstSig = runs.find((r) => r.text.trim().length > 0);
	const italicChars = runs.reduce((s, r) => s + (r.italic ? r.text.length : 0), 0);
	const totalChars = runs.reduce((s, r) => s + r.text.length, 0);
	return {
		sz,
		bold: firstSig?.bold ?? false,
		italic: firstSig?.italic ?? false,
		majorityItalic: totalChars > 0 && italicChars / totalChars > 0.6,
		runs,
		text,
		images
	};
}

function readRelMap(unzipDir: string): Map<string, string> {
	const relsPath = join(unzipDir, 'word/_rels/document.xml.rels');
	const xml = readFileSync(relsPath, 'utf-8');
	const map = new Map<string, string>();
	const re = /<Relationship\s+([^>]+)\/>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(xml)) !== null) {
		const attrs = m[1]!;
		const id = attrs.match(/Id="([^"]+)"/)?.[1];
		const target = attrs.match(/Target="([^"]+)"/)?.[1];
		if (id && target) map.set(id, target);
	}
	return map;
}

// ── Block emission ─────────────────────────────────────────────────────────

function renderRunsToHtml(runs: Run[]): string {
	// Merge adjacent runs of the same formatting, escape text, emit
	// <strong>/<em>/<strong><em>/plain. Word fragments runs aggressively
	// (often one per word) so the merge keeps the HTML compact.
	let html = '';
	let curBold = false;
	let curItalic = false;
	let buffer = '';
	const flush = () => {
		if (!buffer) return;
		let out = esc(buffer);
		if (curBold && curItalic) out = `<strong><em>${out}</em></strong>`;
		else if (curBold) out = `<strong>${out}</strong>`;
		else if (curItalic) out = `<em>${out}</em>`;
		html += out;
		buffer = '';
	};
	for (const r of runs) {
		if (!r.text) continue;
		if (r.bold !== curBold || r.italic !== curItalic) {
			flush();
			curBold = r.bold;
			curItalic = r.italic;
		}
		buffer += r.text;
	}
	flush();
	return html.replace(/\s+/g, ' ').trim();
}

function isShortHeadingPara(text: string): boolean {
	// Pattern: "Term : Body." short enough to be a sub-heading rather
	// than a paragraph with an inline lead-in.
	if (text.length > 80) return false;
	const m = text.match(/^([^:]{1,40}?)\s*:\s*(.+?)\s*\.?\s*$/);
	if (!m) return false;
	const body = m[2]!;
	// Body must be brief and contain no internal sentence breaks.
	return body.length < 60 && !/[.!?].+/.test(body);
}

// ── Main per-chapter processing ────────────────────────────────────────────

async function processChapter(n: number, fileTitle: string, docxPath: string): Promise<Chapter> {
	const chDir = `ch-${String(n).padStart(2, '0')}`;
	const outImgDir = join(OUT_IMG, chDir);
	rmSync(outImgDir, { recursive: true, force: true });
	mkdirSync(outImgDir, { recursive: true });

	// Unzip docx to a temp directory.
	const tmpRoot = join(tmpdir(), `liturgie-${chDir}-${Date.now()}`);
	rmSync(tmpRoot, { recursive: true, force: true });
	mkdirSync(tmpRoot, { recursive: true });
	execSync(`unzip -qq -o "${docxPath}" -d "${tmpRoot}"`);

	const docXml = readFileSync(join(tmpRoot, 'word/document.xml'), 'utf-8');
	const relMap = readRelMap(tmpRoot);
	const paraXmls = [...docXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((m) => m[0]);

	const blocks: Block[] = [];
	const seenAnchors = new Set<string>();
	let title = fileTitle;
	let inBody = false;
	let calloutOpen = false;
	let imgIdx = 0;

	const headingAnchor = (t: string): string => {
		let a = slugify(t);
		let i = 2;
		while (seenAnchors.has(a)) a = `${slugify(t)}-${i++}`;
		seenAnchors.add(a);
		return a;
	};

	for (const px of paraXmls) {
		const p = parsePara(px);
		const text = p.text;
		const hasImage = p.images.length > 0;

		// Pre-body chrome: page numbers, repeated book title, author,
		// institute, the Roman + 40pt arabic chapter headers. The body
		// starts at the first paragraph at sz=36 — typically "Introduction".
		if (!inBody) {
			if (p.sz === 36 && p.bold && !A_RETENIR_RE.test(text)) {
				inBody = true;
				// fall through to emit this paragraph as the first h2
			} else {
				// Track and discard pre-body content (including the
				// initial IBP page-1 illustration).
				continue;
			}
		}

		// ── Images ────────────────────────────────────────────────────────
		// Some image-bearing paragraphs also have text; we emit text first
		// (since the docx places images at paragraph boundaries) then the
		// images. Most are empty paragraphs containing only the drawing.
		if (hasImage) {
			for (const ref of p.images) {
				imgIdx++;
				const target = relMap.get(ref.rId);
				if (!target) continue;
				const srcFile = join(tmpRoot, 'word', target);
				try {
					const buf = readFileSync(srcFile);
					const slug = `img-${String(imgIdx).padStart(2, '0')}`;
					await sharp(buf, { failOn: 'none' })
						.resize({ width: 1200, withoutEnlargement: true })
						.webp({ quality: 82 })
						.toFile(join(outImgDir, `${slug}.webp`));
					blocks.push({
						kind: 'image',
						src: `${IMG_URL_PREFIX}/${chDir}/${slug}.webp`,
						alt: ''
					});
				} catch (err) {
					console.warn(`[liturgie] ch-${n} image ${ref.rId} failed:`, (err as Error).message);
				}
			}
			if (!text) continue;
		}

		// Empty paragraph (no text and no image) → skip.
		if (!text) continue;

		// Defensive: any further "Chapitre …" lines in the body are noise.
		if (/^Chapitre\s+(?:\d+|[IVXLCDM]+)\s*:/i.test(text) && p.sz >= 36) continue;

		// ── À Retenir callout heading ────────────────────────────────────
		if (p.sz === 36 && p.bold && A_RETENIR_RE.test(text)) {
			const anchor = headingAnchor('À retenir');
			blocks.push({ kind: 'callout-heading', title: 'À retenir', anchor });
			calloutOpen = true;
			continue;
		}

		// ── Section headings (size-driven) ───────────────────────────────
		if (p.sz === 36 && p.bold) {
			const t = stripTrailingColon(text);
			blocks.push({ kind: 'heading', level: 2, title: t, anchor: headingAnchor(t) });
			calloutOpen = false; // a new H2 outside À retenir closes the callout
			continue;
		}
		if (p.sz === 32 && p.bold) {
			const t = stripTrailingColon(text);
			// Inside À retenir, a sz=32 acts as a sub-grouping under the
			// callout; keep level 3 so it nests under the callout heading.
			blocks.push({ kind: 'heading', level: 3, title: t, anchor: headingAnchor(t) });
			continue;
		}

		// ── Quote: paragraph that's mostly italic, often opening with « ─
		if (p.sz === 28 && (p.majorityItalic || (p.italic && text.startsWith('«')))) {
			blocks.push({ kind: 'quote', html: `<p>${renderRunsToHtml(p.runs)}</p>` });
			continue;
		}

		// ── "Term : short body" → h4 sub-heading ─────────────────────────
		if (p.sz === 28 && isShortHeadingPara(text)) {
			const m = text.match(/^([^:]{1,40}?)\s*:\s*(.+?)\s*\.?\s*$/);
			if (m) {
				const t = m[1]!.trim();
				blocks.push({ kind: 'heading', level: 4, title: t, anchor: headingAnchor(t) });
				// Render the body of the lead-in as a brief paragraph
				// (often "La dévotion et la prière.") so we keep that info.
				const body = m[2]!.trim();
				if (body) {
					blocks.push({ kind: 'paragraph', html: `<p>${esc(body)}.</p>` });
				}
				continue;
			}
		}

		// ── Etymological definition: "Term (du grec/latin …) est …" ──────
		if (p.sz === 28) {
			const em = text.match(ETYMOLOGY_RE);
			if (em) {
				const term = em[1]!.trim();
				const rest = renderRunsToHtml(p.runs).replace(
					new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`),
					''
				);
				blocks.push({ kind: 'definition', term, html: `<p>${rest}</p>` });
				continue;
			}
		}

		// ── Dash bullet (gathered into <ul> in post) ──────────────────────
		if (p.sz === 28 && /^-\s+/.test(text)) {
			blocks.push({
				kind: 'paragraph',
				html: `<p>- ${esc(text.replace(/^-\s+/, '').replace(/,$/, ''))}</p>`
			});
			continue;
		}

		// ── Default: paragraph with inline formatting preserved ──────────
		if (p.sz === 28 || p.sz === 0) {
			blocks.push({ kind: 'paragraph', html: `<p>${renderRunsToHtml(p.runs)}</p>` });
			continue;
		}

		// Anything else (e.g. sz=24 chrome that slipped through) → drop.
	}

	// Stitch dash-bullets into <ul>.
	const merged = mergeDashLists(blocks);

	// Hint: callouts swallow everything from the callout-heading onward —
	// that's how the renderer styles the "À retenir" block. We don't need
	// special markers in the data; the renderer will detect the heading
	// kind.
	void calloutOpen;

	// Cleanup temp dir.
	rmSync(tmpRoot, { recursive: true, force: true });

	return { slug: chDir, n, title, blocks: merged };
}

function mergeDashLists(blocks: Block[]): Block[] {
	const out: Block[] = [];
	let buf: string[] = [];
	const flush = () => {
		if (buf.length >= 2) {
			const items = buf.map((s) => `<li>${s}</li>`).join('');
			out.push({ kind: 'paragraph', html: `<ul>${items}</ul>` });
		} else {
			for (const s of buf) out.push({ kind: 'paragraph', html: `<p>- ${s}</p>` });
		}
		buf = [];
	};
	for (const b of blocks) {
		if (b.kind === 'paragraph') {
			const m = b.html.match(/^<p>-\s+([\s\S]+?)\s*<\/p>$/);
			if (m) {
				buf.push(m[1]!.replace(/,$/, '').trim());
				continue;
			}
		}
		flush();
		out.push(b);
	}
	flush();
	return out;
}

// ── Drive ──────────────────────────────────────────────────────────────────

mkdirSync(join(OUT_DATA, 'chapters'), { recursive: true });
mkdirSync(OUT_IMG, { recursive: true });

const files = readdirSync(SRC)
	.filter((f) => FN_RE.test(f))
	.sort();

const chapters: Chapter[] = [];
for (const f of files) {
	const m = f.match(FN_RE)!;
	const n = Number(m[1]);
	const fileTitle = m[2].trim();
	const ch = await processChapter(n, fileTitle, join(SRC, f));
	chapters.push(ch);
	const counts = {
		h2: ch.blocks.filter((b) => b.kind === 'heading' && b.level === 2).length,
		h3: ch.blocks.filter((b) => b.kind === 'heading' && b.level === 3).length,
		h4: ch.blocks.filter((b) => b.kind === 'heading' && b.level === 4).length,
		quote: ch.blocks.filter((b) => b.kind === 'quote').length,
		def: ch.blocks.filter((b) => b.kind === 'definition').length,
		callout: ch.blocks.filter((b) => b.kind === 'callout-heading').length,
		img: ch.blocks.filter((b) => b.kind === 'image').length,
		p: ch.blocks.filter((b) => b.kind === 'paragraph').length
	};
	console.log(
		`[liturgie] ch-${String(n).padStart(2, '0')} "${ch.title}" — h2=${counts.h2} h3=${counts.h3} h4=${counts.h4} quote=${counts.quote} def=${counts.def} callout=${counts.callout} img=${counts.img} p=${counts.p}`
	);
}
chapters.sort((a, b) => a.n - b.n);

for (const ch of chapters) {
	writeFileSync(join(OUT_DATA, 'chapters', `${ch.slug}.json`), JSON.stringify(ch));
}
writeFileSync(
	join(OUT_DATA, 'structure.json'),
	JSON.stringify({
		chapters: chapters.map((c) => ({ slug: c.slug, n: c.n, title: c.title }))
	})
);

console.log(`[liturgie] wrote ${chapters.length} chapters → ${OUT_DATA}`);
