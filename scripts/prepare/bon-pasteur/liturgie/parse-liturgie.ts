#!/usr/bin/env node
/**
 * Parser for "Chapitre N. Title.docx" in CUSTODIO/IBP/La Liturgie. Uses
 * mammoth to recover paragraph structure, heading levels and inline image
 * positions from the Word documents, then emits the same block shape as
 * the Dieu corpus (heading | paragraph | image).
 *
 * Images are written to static/img/bon-pasteur/liturgie/ch-NN/ as webp,
 * referenced from each chapter's JSON. Run from repo root:
 *
 *   npx tsx scripts/prepare/bon-pasteur/liturgie/parse-liturgie.ts
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../../../..');
const SRC =
	'/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/CUSTODIO/IBP/La Liturgie';
const OUT_DATA = join(REPO, 'static/data/bon-pasteur/liturgie');
const OUT_IMG = join(REPO, 'static/img/bon-pasteur/liturgie');
const IMG_URL_PREFIX = '/img/bon-pasteur/liturgie';

type Block =
	| { kind: 'heading'; level: 2 | 3; title: string; anchor: string }
	| { kind: 'paragraph'; html: string }
	| { kind: 'image'; src: string; alt: string };

interface Chapter {
	slug: string;
	n: number;
	title: string;
	blocks: Block[];
}

const FN_RE = /^Chapitre\s+(\d+)\.\s+(.+)\.docx$/;

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

// Tokenize a flat HTML string emitted by mammoth into block elements.
// mammoth emits a sequence of <h1..6>, <p>, <ul>/<ol>, <img>; nested
// content stays within one block.
function tokenizeBlocks(html: string): { tag: string; inner: string; attrs: string }[] {
	const re = /<(h[1-6]|p|ul|ol|img)([^>]*)>([\s\S]*?)<\/\1>|<img([^>]*)\/?\s*>/g;
	const out: { tag: string; inner: string; attrs: string }[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) {
		if (m[4] !== undefined) {
			out.push({ tag: 'img', inner: '', attrs: m[4] });
		} else {
			out.push({ tag: m[1]!, inner: m[3] ?? '', attrs: m[2] ?? '' });
		}
	}
	return out;
}

function attrValue(attrs: string, name: string): string | undefined {
	const m = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'));
	return m?.[1];
}

function plainText(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

async function processChapter(n: number, fileTitle: string, docxPath: string): Promise<Chapter> {
	const chDir = `ch-${String(n).padStart(2, '0')}`;
	const outImgDir = join(OUT_IMG, chDir);
	rmSync(outImgDir, { recursive: true, force: true });
	mkdirSync(outImgDir, { recursive: true });
	let imgIdx = 0;

	const result = await mammoth.convertToHtml(
		{ path: docxPath },
		{
			convertImage: mammoth.images.imgElement(async (image) => {
				imgIdx++;
				const ext = (image.contentType || 'image/png').split('/')[1]!.split('+')[0]!;
				const buf = await image.read();
				const slug = `img-${String(imgIdx).padStart(2, '0')}`;
				const outFile = join(outImgDir, `${slug}.webp`);
				let pipeline = sharp(buf, { failOn: 'none' });
				if (ext === 'tiff' || ext === 'tif') {
					// TIFFs from these scans are often huge; downscale.
					pipeline = pipeline.resize({ width: 1200, withoutEnlargement: true });
				} else {
					pipeline = pipeline.resize({ width: 1200, withoutEnlargement: true });
				}
				await pipeline.webp({ quality: 82 }).toFile(outFile);
				return { src: `${IMG_URL_PREFIX}/${chDir}/${slug}.webp`, alt: '' };
			})
		}
	);

	const html = result.value;
	const tokens = tokenizeBlocks(html);

	const blocks: Block[] = [];
	let title = fileTitle;
	const seenAnchors = new Set<string>();
	// .docx files prepend page chrome (page number, book title, author,
	// institute) and repeat the chapter header twice (Roman + Arabic). We
	// skip all of that until we've seen the *Arabic* form, then skip any
	// further paragraphs whose plain text starts with "Chapitre". Body
	// content begins after.
	let inBody = false;

	function pushHeading(text: string) {
		const t = stripTrailingColon(text);
		if (!t) return;
		let anchor = slugify(t);
		let suffix = 2;
		while (seenAnchors.has(anchor)) anchor = `${slugify(t)}-${suffix++}`;
		seenAnchors.add(anchor);
		blocks.push({ kind: 'heading', level: 2, title: t, anchor });
	}

	for (const tok of tokens) {
		// Real semantic headings (h1..h6) coming from mammoth — these are rare
		// in this corpus (the docx uses bold rather than heading styles) but
		// support them anyway. They override the body-detection state.
		if (tok.tag.startsWith('h')) {
			const t = plainText(tok.inner);
			if (/^Chapitre\s+\d+/i.test(t)) {
				// Always prefer the filename title (canonical casing); docx
				// internal title is often lowercase or truncated.
				inBody = true;
				continue;
			}
			if (!inBody) continue;
			pushHeading(t);
			continue;
		}

		if (tok.tag === 'p') {
			const trimmed = tok.inner.trim();
			if (!trimmed) continue;
			const text = plainText(trimmed);

			// Pre-body chrome: page number, book title, author, institute,
			// the Roman-numeral chapter line. Skip until we see "Chapitre N"
			// in arabic digits.
			if (!inBody) {
				if (/^Chapitre\s+\d+\s*:/i.test(text)) {
					inBody = true;
				}
				continue;
			}

			// Defensive: any further "Chapitre …" lines in the body (the
			// duplicated header) are also dropped.
			if (/^Chapitre\s+(?:\d+|[IVX]+)\s*:/i.test(text)) continue;

			// A paragraph that contains *only* an image becomes an image block.
			const onlyImg = trimmed.match(/^<img([^>]*)\/?\s*>$/);
			if (onlyImg) {
				const src = attrValue(onlyImg[1]!, 'src');
				const alt = attrValue(onlyImg[1]!, 'alt') ?? '';
				if (src) blocks.push({ kind: 'image', src, alt });
				continue;
			}

			// A paragraph whose entire content is wrapped in <strong> is a
			// bold-as-heading section title. Emit as heading.
			const onlyStrong = trimmed.match(/^<strong>([\s\S]+?)<\/strong>$/);
			if (onlyStrong) {
				pushHeading(plainText(onlyStrong[1]!));
				continue;
			}

			// Otherwise: pull out any inline images first, then emit prose.
			let prose = trimmed;
			const imgRe = /<img([^>]*)\/?\s*>/g;
			let im: RegExpExecArray | null;
			const imgBlocks: Block[] = [];
			while ((im = imgRe.exec(trimmed)) !== null) {
				const src = attrValue(im[1]!, 'src');
				const alt = attrValue(im[1]!, 'alt') ?? '';
				if (src) imgBlocks.push({ kind: 'image', src, alt });
			}
			prose = prose.replace(imgRe, '').trim();
			blocks.push(...imgBlocks);
			if (prose && plainText(prose)) {
				blocks.push({ kind: 'paragraph', html: `<p>${prose}</p>` });
			}
			continue;
		}

		if (tok.tag === 'ul' || tok.tag === 'ol') {
			if (!inBody) continue;
			blocks.push({ kind: 'paragraph', html: `<${tok.tag}>${tok.inner}</${tok.tag}>` });
			continue;
		}

		if (tok.tag === 'img') {
			if (!inBody) continue;
			const src = attrValue(tok.attrs, 'src');
			const alt = attrValue(tok.attrs, 'alt') ?? '';
			if (src) blocks.push({ kind: 'image', src, alt });
			continue;
		}
	}

	return {
		slug: chDir,
		n,
		title: title.trim(),
		blocks: mergeDashLists(blocks)
	};
}

// The .docx files use literal "- " dashes rather than Word's list style
// for many bullet sequences, so mammoth emits each line as its own
// paragraph. Stitch consecutive dash-paragraphs back into a <ul>.
function mergeDashLists(blocks: Block[]): Block[] {
	const out: Block[] = [];
	let buffer: string[] = [];
	const flush = () => {
		if (buffer.length >= 2) {
			const items = buffer.map((s) => `<li>${s}</li>`).join('');
			out.push({ kind: 'paragraph', html: `<ul>${items}</ul>` });
		} else {
			for (const s of buffer) out.push({ kind: 'paragraph', html: `<p>- ${s}</p>` });
		}
		buffer = [];
	};
	for (const b of blocks) {
		if (b.kind === 'paragraph') {
			const m = b.html.match(/^<p>-\s+([\s\S]+?)\s*<\/p>$/);
			if (m) {
				buffer.push(m[1]!.replace(/,$/, '').trim());
				continue;
			}
		}
		flush();
		out.push(b);
	}
	flush();
	return out;
}

// ── Drive ────────────────────────────────────────────────────────────────

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
	console.log(
		`[liturgie] ch-${String(n).padStart(2, '0')} "${ch.title}" — ${ch.blocks.length} blocks`
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
