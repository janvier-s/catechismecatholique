/**
 * Canon Law (CIC) — 1917 & 1983 — EPUB → JSON builder.
 *
 * Source: `Code-de-Droit-Canonique-17-83-Saint-Siege.epub` contains both
 * codes as paired HTML files, French + Latin parallel:
 *   - frXXl{N}.html / frXXl{N}_split{K}.html    French body, book N
 *   - ltXXl{N}.htm / .html                       Latin parallel
 *   where XX = 17 (1917 code) or 83 (1983 code).
 *
 * The French HTML is well-tagged with semantic classes — we walk it
 * linearly to extract the canon tree:
 *   <h1 class="livre" cc1="A" cc2="B">      — Livre N, canons A..B
 *   <h2 class="partie">                     — Partie (some books only)
 *   <h3 class="section">                    — Section (rare)
 *   <h4 class="titre" ti="…">               — Titre
 *   <h5 class="chap" ch="…">                — Chapitre
 *   <h6 class="art"  art="…">               — Article
 *   <p  class="cn"   cn="N" id="fX.N">      — canon-N marker (header)
 *   <p>body…</p>                            — canon body (until next cn)
 *
 * We emit per-book JSON with the nested heading tree, plus a flat
 * canon locator for deep-linking.
 */
import { slugify } from '../slug.ts';

export type CicCode = '1983' | '1917';

export interface CicCanon {
	n: number;
	html: string;
}

export type CicNode =
	| {
			kind: 'heading';
			level: 'partie' | 'section' | 'titre' | 'chapitre' | 'article';
			label?: string;
			title: string;
			anchor: string;
	  }
	| { kind: 'canon'; n: number; html: string };

export interface CicLivre {
	code: CicCode;
	n: number;
	slug: string;
	title: string;
	canonRange: [number, number];
	blocks: CicNode[];
}

export interface CicLivreRef {
	code: CicCode;
	n: number;
	slug: string;
	title: string;
	canonRange: [number, number];
	totalCanons: number;
}

export interface CicStructure {
	codes: { code: CicCode; livres: CicLivreRef[] }[];
}

export interface CicCanonLocator {
	code: CicCode;
	livreSlug: string;
}

export interface CicBuildResult {
	structure: CicStructure;
	livres: Record<string, CicLivre>;
	canons: Record<string, Record<string, CicCanonLocator>>; // code → n → locator
}

interface ContentFile {
	name: string; // e.g. fr83l1.html, fr83l2_split2.html
	html: string;
	code: CicCode;
	livreN: number;
	splitIdx: number; // 0 for main, 1.. for splits
}

// Headings come in two shapes — 1917 uses class-tagged headings
// (<h1 class="livre" cc1=…>), 1983 omits the class on the top-level <h1>
// and relies on the <span class="srt"> child for the label. We treat any
// class-tagged heading as structural; the H1 livre case is handled
// separately below (look for the first <h1>… and the <span class="srt">).
const HEADING_RE =
	/<h([1-6])[^>]*class="(livre|partie|section|titre|chap|art)"([^>]*)>([\s\S]*?)<\/h\1>/g;
const H1_TITLE_RE = /<h1\b([^>]*)>([\s\S]*?)<\/h1>/;

const ATTR_RE = (name: string) => new RegExp(`\\b${name}="([^"]*)"`);

const CANON_MARKER_RE = /<p\s+class="cn"\s+cn="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;

const PARAGRAPH_RE = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;

function plainText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&#160;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function decodeEntities(s: string): string {
	// Just strip the most common ones — we mostly preserve the source HTML
	// as-is (browser handles the rest at render time).
	return s
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/&#160;/g, ' ');
}

/** Strip the cross-link spans (LA / 17 / 83) the EPUB embeds in each cn
 *  marker — they reference internal anchors we don't render. */
function stripCrossLinks(html: string): string {
	return html.replace(/<a\s+class="(?:cl|cc|cr|cy)"[^>]*>[\s\S]*?<\/a>/g, '');
}

/**
 * Canon bodies contain cross-references encoded as EPUB-internal links —
 * `<a href="fr83l2_split1.html#f2.230">cf. can. 230</a>`. The href points
 * at a sibling EPUB file we don't ship; left untouched, the prerenderer
 * 404s on every one. Rewrite them to canonical deep-link URLs so the
 * references stay clickable, then drop any internal-file href we can't
 * resolve.
 *   fr17*.html#f1.N  →  /cic/1917/c/N
 *   fr83*.html#f2.N  →  /cic/1983/c/N
 */
function rewriteCanonLinks(html: string): string {
	return (
		html
			.replace(
				/<a\s+([^>]*?)href="fr(17|83)[^"]*?#f[12]\.(\d+)"([^>]*)>/g,
				(_m, pre, code, n, post) => {
					const target = code === '17' ? `/cic/1917/c/${n}` : `/cic/1983/c/${n}`;
					return `<a ${pre}href="${target}"${post}>`;
				}
			)
			// Bare same-file anchors — anchor prefix encodes the code (f1 = 1917,
			// f2 = 1983), so we can resolve without knowing the originating file.
			.replace(/<a\s+([^>]*?)href="#f([12])\.(\d+)"([^>]*)>/g, (_m, pre, fcode, n, post) => {
				const target = fcode === '1' ? `/cic/1917/c/${n}` : `/cic/1983/c/${n}`;
				return `<a ${pre}href="${target}"${post}>`;
			})
			.replace(/<a\s+[^>]*href="fr(?:17|83)[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '$1')
	);
}

/**
 * Parse one or more HTML files belonging to a single Livre and emit the
 * ordered block stream (headings + canons with bodies).
 */
function parseLivre(files: ContentFile[]): {
	title: string;
	canonRange: [number, number] | null;
	blocks: CicNode[];
} {
	const blocks: CicNode[] = [];
	const usedAnchors = new Set<string>();
	function uniqueAnchor(base: string): string {
		let a = base;
		let i = 2;
		while (usedAnchors.has(a)) a = `${base}-${i++}`;
		usedAnchors.add(a);
		return a;
	}

	let livreTitle = '';
	let canonRange: [number, number] | null = null;

	// Concatenate files in order so we can walk a single linear stream.
	const merged = files
		.sort((a, b) => a.splitIdx - b.splitIdx)
		.map((f) => f.html)
		.join('\n');

	// Pull the book title from the first <h1>: 1917 carries cc1/cc2 attrs,
	// 1983 uses `<span class="srt">LIVRE I</span> NORMES GÉNÉRALES`.
	const h1 = H1_TITLE_RE.exec(merged);
	if (h1) {
		const attrs = h1[1] ?? '';
		const inner = h1[2] ?? '';
		const text = plainText(stripCrossLinks(inner));
		// Drop the leading "LIVRE I" / "Livre Premier" — the rest is the
		// human title ("Normes Générales").
		livreTitle = text
			.replace(/^LIVRE\s+\S+\s*/i, '')
			.replace(/^Livre\s+\S+\s*/i, '')
			.trim();
		if (!livreTitle) livreTitle = text;
		const cc1 = ATTR_RE('cc1').exec(attrs)?.[1];
		const cc2 = ATTR_RE('cc2').exec(attrs)?.[1];
		if (cc1 && cc2) canonRange = [parseInt(cc1, 10), parseInt(cc2, 10)];
	}

	// First pass: collect every heading + canon-marker position in the
	// merged HTML so we can emit them in document order.
	type Marker =
		| {
				kind: 'heading';
				level: 'livre' | 'partie' | 'section' | 'titre' | 'chapitre' | 'article';
				label?: string;
				title: string;
				index: number;
		  }
		| { kind: 'canon-start'; n: number; index: number; endOfMarker: number };

	const markers: Marker[] = [];

	let hm: RegExpExecArray | null;
	const headingRe = new RegExp(HEADING_RE.source, HEADING_RE.flags);
	while ((hm = headingRe.exec(merged))) {
		const cls = hm[2]!;
		const attrs = hm[3] ?? '';
		const inner = hm[4] ?? '';
		const title = plainText(stripCrossLinks(inner));
		if (cls === 'livre') continue; // already handled via H1_TITLE_RE above
		const level =
			cls === 'partie'
				? 'partie'
				: cls === 'section'
					? 'section'
					: cls === 'titre'
						? 'titre'
						: cls === 'chap'
							? 'chapitre'
							: 'article';
		const labelAttr =
			level === 'titre'
				? ATTR_RE('ti').exec(attrs)?.[1]
				: level === 'chapitre'
					? ATTR_RE('ch').exec(attrs)?.[1]
					: level === 'article'
						? ATTR_RE('art').exec(attrs)?.[1]
						: undefined;
		markers.push({ kind: 'heading', level, label: labelAttr, title, index: hm.index });
	}

	const canonRe = new RegExp(CANON_MARKER_RE.source, CANON_MARKER_RE.flags);
	let cm: RegExpExecArray | null;
	while ((cm = canonRe.exec(merged))) {
		markers.push({
			kind: 'canon-start',
			n: parseInt(cm[1]!, 10),
			index: cm.index,
			endOfMarker: cm.index + cm[0].length
		});
	}
	markers.sort((a, b) => a.index - b.index);

	// Second pass: walk markers in order. For each canon-start, the body is
	// every <p>…</p> between the marker's end and the NEXT canon-start (or
	// the next heading, or EOF). We skip cn-marker paragraphs themselves.
	for (let i = 0; i < markers.length; i++) {
		const m = markers[i]!;
		if (m.kind === 'heading') {
			const labelPart = m.label ? `${m.label}-` : '';
			const anchor = uniqueAnchor(`h-${m.level}-${labelPart}${slugify(m.title).slice(0, 40)}`);
			blocks.push({
				kind: 'heading',
				level: m.level,
				...(m.label ? { label: m.label } : {}),
				title: m.title,
				anchor
			});
			continue;
		}
		// canon-start
		const nextIdx = markers[i + 1]?.index ?? merged.length;
		const slice = merged.substring(m.endOfMarker, nextIdx);
		// Collect all non-cn <p>…</p> bodies in the slice.
		const bodies: string[] = [];
		PARAGRAPH_RE.lastIndex = 0;
		let pm: RegExpExecArray | null;
		const pRe = new RegExp(PARAGRAPH_RE.source, PARAGRAPH_RE.flags);
		while ((pm = pRe.exec(slice))) {
			const attrs = pm[1] ?? '';
			if (/class="cn"/.test(attrs)) continue;
			const body = rewriteCanonLinks(decodeEntities(pm[2] ?? '')).trim();
			if (body) bodies.push(`<p>${body}</p>`);
		}
		blocks.push({ kind: 'canon', n: m.n, html: bodies.join('\n') });
	}

	// Prefer the canon range computed from the actual markers — the EPUB's
	// cc1/cc2 metadata has at least one typo (1917 Book III declares
	// cc2="1151" but Book III runs through canon 1551).
	const nums = blocks
		.filter((b): b is { kind: 'canon'; n: number; html: string } => b.kind === 'canon')
		.map((b) => b.n);
	if (nums.length > 0) canonRange = [Math.min(...nums), Math.max(...nums)];
	return { title: livreTitle, canonRange, blocks };
}

const LIVRE_RE = /^fr(17|83)l(\d+)(?:_split(\d+))?\.html?$/;

export function buildCic(args: { fileMap: Record<string, string> }): CicBuildResult {
	// Bucket files by (code, livreN) and parse each Livre once.
	const buckets = new Map<string, ContentFile[]>();
	for (const [name, html] of Object.entries(args.fileMap)) {
		const m = LIVRE_RE.exec(name);
		if (!m) continue;
		const code: CicCode = m[1] === '83' ? '1983' : '1917';
		const livreN = parseInt(m[2]!, 10);
		const splitIdx = m[3] ? parseInt(m[3]!, 10) : 0;
		const key = `${code}-${livreN}`;
		if (!buckets.has(key)) buckets.set(key, []);
		buckets.get(key)!.push({ name, html, code, livreN, splitIdx });
	}

	const livres: Record<string, CicLivre> = {};
	const canonsByCode: Record<string, Record<string, CicCanonLocator>> = { '1983': {}, '1917': {} };
	const livresByCode: Record<CicCode, CicLivreRef[]> = { '1983': [], '1917': [] };

	for (const [key, files] of buckets) {
		const [codeStr, livreNStr] = key.split('-');
		const code = codeStr as CicCode;
		const livreN = parseInt(livreNStr!, 10);
		const parsed = parseLivre(files);
		const slug = `${code === '1983' ? 'cic-1983' : 'cic-1917'}-livre-${livreN}`;
		const canonCount = parsed.blocks.filter((b) => b.kind === 'canon').length;
		const livre: CicLivre = {
			code,
			n: livreN,
			slug,
			title: parsed.title,
			canonRange: parsed.canonRange ?? [0, 0],
			blocks: parsed.blocks
		};
		livres[slug] = livre;
		livresByCode[code].push({
			code,
			n: livreN,
			slug,
			title: parsed.title,
			canonRange: livre.canonRange,
			totalCanons: canonCount
		});
		for (const b of parsed.blocks) {
			if (b.kind === 'canon') {
				canonsByCode[code]![String(b.n)] = { code, livreSlug: slug };
			}
		}
	}

	// Sort the per-code livre lists by book number.
	for (const code of ['1983', '1917'] as const) {
		livresByCode[code].sort((a, b) => a.n - b.n);
	}

	const structure: CicStructure = {
		codes: [
			{ code: '1983', livres: livresByCode['1983'] },
			{ code: '1917', livres: livresByCode['1917'] }
		]
	};

	return { structure, livres, canons: canonsByCode };
}
