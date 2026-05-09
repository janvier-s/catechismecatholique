import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { numberedSlug } from './slug.ts';

// ─── Raw line shape (from extract.py) ─────────────────────────────────────────

interface RawRun {
	text: string;
	bold: boolean;
	italic: boolean;
}

interface RawLine {
	page_idx: number;
	page_label: string;
	y: number;
	x: number;
	is_running_header: boolean;
	has_diamond: boolean;
	has_dagger: boolean;
	has_bodoni_orn: boolean;
	is_bold: boolean;
	is_italic: boolean;
	dom_font: string;
	max_size: number;
	runs: RawRun[];
}

// ─── Output types ─────────────────────────────────────────────────────────────

interface Footnote {
	n: number;
	text: string;
}

interface Oraison {
	html: string;
	cite?: string;
}

interface QA {
	n: number;
	q: string;
	a: string;
	required: boolean;
}

interface Commandment {
	roman: string; // "Ier", "IIe", … "Xe"
	ordinal: number; // 1..10
	biblical_text: string; // italic text below the divider
	qa: QA[];
}

interface Section {
	title: string | null; // null = chapter has no Roman-numeral subdivision
	qa?: QA[]; // present when section has flat Q&As
	commandments?: Commandment[]; // present for the Décalogue section only
}

interface ChapterFile {
	corpus: 'pius-x-petit';
	part_slug: string;
	part_title: string;
	part_ordinal: number;
	section_slug?: string; // Part III is split into 2 sections
	section_title?: string;
	slug: string;
	title: string;
	ordinal: number;
	epigraph?: { text: string; cite?: string };
	sections: Section[];
	oraisons: Oraison[];
	footnotes: Footnote[];
	qa_range: [number, number];
	prev?: { href: string; title: string; kind: 'chapter' | 'section' | 'part' };
	next?: { href: string; title: string; kind: 'chapter' | 'section' | 'part' };
}

interface IntroFile {
	corpus: 'pius-x-petit';
	part_slug: '0-intro';
	slug: 'premieres-notions';
	title: string;
	epigraph?: { text: string; cite?: string };
	sections: Section[];
	oraisons: Oraison[];
	footnotes: Footnote[];
	qa_range: [number, number];
	next?: { href: string; title: string; kind: 'chapter' | 'part' };
}

interface StructureChapter {
	slug: string;
	title: string;
	ordinal: number;
	qa_range: [number, number];
}

interface StructureSection {
	slug: string;
	title: string;
	chapters: StructureChapter[];
}

interface StructurePart {
	slug: string;
	ordinal: number;
	title: string;
	subtitle?: string;
	chapters?: StructureChapter[];
	sections?: StructureSection[];
	qa_range: [number, number];
}

interface Structure {
	corpus: 'pius-x-petit';
	intro: {
		slug: 'premieres-notions';
		title: string;
		qa_range: [number, number];
		part_slug: '0-intro';
	};
	parts: StructurePart[];
	total_qa: number;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function lineText(l: RawLine): string {
	return l.runs.map((r) => r.text).join('');
}

function lineTrim(l: RawLine): string {
	return lineText(l).trim();
}

function normalizeWs(s: string): string {
	return s.replace(/\s+/g, ' ').trim();
}

// Apply soft-hyphen / line-break joining for answer-body lines.
function joinTextLines(parts: string[]): string {
	let out = '';
	for (let i = 0; i < parts.length; i++) {
		const cur = parts[i]!.replace(/\s+$/, '');
		if (out.length === 0) {
			out = cur;
			continue;
		}
		const last = out[out.length - 1];
		if (last === '-') {
			const next = parts[i]!.replace(/^\s+/, '');
			// Soft hyphen at line break — drop the hyphen and concat.
			if (next.length > 0 && next[0] === next[0]!.toLowerCase()) {
				out = out.slice(0, -1) + next;
				continue;
			}
		}
		out += ' ' + cur.replace(/^\s+/, '');
	}
	return normalizeWs(out);
}

// Sentence-case fixups for the dropcap-lowercased start of every answer.
// The PDF lower-cases the first letter of each answer (typographic effect).
// We restore proper sentence case for the leading word and any obvious
// proper nouns.
const PROPER_NOUN_SUBS: Array<[RegExp, string]> = [
	[/\bdieu\b/g, 'Dieu'],
	[/\bjésus-christ\b/g, 'Jésus-Christ'],
	[/\bjésus\b/g, 'Jésus'],
	[/\bchrist\b/g, 'Christ'],
	[/\bsaint-esprit\b/g, 'Saint-Esprit'],
	[/\béglise\b/g, 'Église'],
	[/\bvierge\b/g, 'Vierge'],
	[/\bmarie\b/g, 'Marie'],
	[/\bsainte trinité\b/g, 'sainte Trinité'],
	[/\btrinité\b/g, 'Trinité'],
	[/\béglise catholique\b/g, 'Église catholique'],
	[/\béglises\b/g, 'Églises'],
	[/\bbéatitudes\b/g, 'Béatitudes'],
	[/\bsaints\b/g, 'Saints'],
	[/\bdécalogue\b/g, 'Décalogue'],
	[/\banges\b/g, 'Anges']
];

function restoreCase(s: string): string {
	let out = s;
	// Proper-noun substitutions (the PDF lower-cases mid-sentence too).
	for (const [re, r] of PROPER_NOUN_SUBS) out = out.replace(re, r);
	// Capitalise the very first letter of the answer (drop-cap effect in PDF).
	if (out.length > 0) {
		// Skip any leading <em> tag.
		const m = out.match(/^(<em>)?(.)(.*)$/s);
		if (m) {
			const [, em, first, rest] = m;
			out = (em ?? '') + first!.toUpperCase() + rest;
		}
	}
	// Capitalise after sentence-final punctuation followed by a space.
	out = out.replace(/([.!?»])\s+([a-zà-ÿ])/g, (_m, p, c) => `${p} ${c.toUpperCase()}`);
	return out;
}

// Merge adjacent <em> tags split by a line-break hyphen.
// • lowercase continuation → soft hyphen: drop it and fuse the two spans
// • uppercase continuation → real compound (e.g. Tout-Puissant): keep hyphen, fuse
function mergeHyphenatedEm(html: string): string {
	return html
		.replace(/-<\/em>\s*<em>([a-zà-ÿœæ])/g, (_m, c) => c) // soft: drop hyphen
		.replace(/-<\/em>\s*<em>([A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ])/g, (_m, c) => '-' + c); // real: keep
}

// Build HTML span for a list of runs, merging adjacent same-italic runs.
function runsToHtml(runs: RawRun[]): string {
	let out = '';
	let italicOpen = false;
	let buf = '';
	const flush = () => {
		if (!buf) return;
		const escaped = escapeHtml(buf);
		out += italicOpen ? `<em>${escaped}</em>` : escaped;
		buf = '';
	};
	for (const r of runs) {
		if (!r.text) continue;
		if (r.italic !== italicOpen) {
			flush();
			italicOpen = r.italic;
		}
		buf += r.text;
	}
	flush();
	return out;
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Detect a footnote reference inside a text snippet — the petit catechism
// uses asterisks (single, double, triple) tied to a footnote at the bottom of
// the page (or below the answer) in Cheltenham-Light italic. We treat each
// asterisk as a sequential footnote reference number per-chapter.
const FOOTNOTE_MARK_RE = /(\*+)/g;

interface FootnoteContext {
	counter: number;
	collected: Footnote[];
}

function ingestRefs(ctx: FootnoteContext, html: string): string {
	// Replace runs of asterisks with footnote sups. Each contiguous run of
	// asterisks consumes one footnote number.
	return html.replace(FOOTNOTE_MARK_RE, () => {
		ctx.counter += 1;
		const n = ctx.counter;
		return `<sup class="piusPetitRef" data-n="${n}">${n}</sup>`;
	});
}

// ─── Line classifier ─────────────────────────────────────────────────────────

type LineKind =
	| 'partDivider' // Futura size>=30: "I" / "II" / "III"
	| 'partTitle' // Formata-Bold size 18 on a Part page
	| 'partSubsectionLabel' // "I. LES SACREMENTS …" / "II. LA PRIÈRE …" (Part III only)
	| 'chapterTitle' // Formata-Medium size ~15.6 (chapter opener)
	| 'romanSection' // "I. LES VERTUS EN GÉNÉRAL", "II. LA DOULEUR…" (Roman + caps body)
	| 'commandment' // "IER COMMANDEMENT", "IIE COMMANDEMENT", …
	| 'oraisonLabel' // "Oraison :" / "Oraisons :" (with dagger)
	| 'oraisonAttribution' // italic Formata-LightItalic line below an oraison
	| 'epigraphMarker' // BodoniOrnaments line — opens an epigraph
	| 'epigraphText' // Cheltenham-italic line right after Bodoni-orn
	| 'qHead' // bold Formata "N. …" question head
	| 'qHead153' // special-case missing-period Q153 ("153 Les péchés…")
	| 'answer' // Cheltenham body line
	| 'answerBullet' // Cheltenham line that starts with •
	| 'footnote' // Cheltenham-Light at the page bottom (asterisk-prefixed)
	| 'header' // running header (already flagged)
	| 'unknown';

// Roman-numeral commandment matcher. Source uses "IER" "IIE" "IIIE" "IVE" "VE"
// "VIE" "VIIE" "VIIIE" "IXE" "XE" + "COMMANDEMENT".
const COMMANDMENT_RE = /^([IVX]+)(?:ER|E|ÈRE|ÈME)?\s+COMMANDEMENT$/i;

const ROMAN_LATIN: Record<string, number> = {
	I: 1,
	II: 2,
	III: 3,
	IV: 4,
	V: 5,
	VI: 6,
	VII: 7,
	VIII: 8,
	IX: 9,
	X: 10
};

const ROMAN_ORDINAL_DISPLAY: Record<string, string> = {
	I: 'Ier',
	II: 'IIe',
	III: 'IIIe',
	IV: 'IVe',
	V: 'Ve',
	VI: 'VIe',
	VII: 'VIIe',
	VIII: 'VIIIe',
	IX: 'IXe',
	X: 'Xe'
};

// Header form for the "I. LE SACREMENT : SON INSTITUTION, SA FIN…" rows
// inside a single chapter, AND for the "I. LES VERTUS EN GÉNÉRAL …" rows.
// These are Formata-Regular size 12-13.5, all caps, NOT bold.
const ROMAN_SECTION_RE = /^\s*([IVX]+)\.\s+(.+)$/;

// Q-head: bold Formata "N. text".
const Q_HEAD_RE = /^(\d{1,3})\.\s+(.+)$/;
// Special: Q153 in this PDF lacks the period — "153 Les péchés…".
const Q_HEAD_NOPERIOD_RE = /^(\d{1,3})\s+(.+)$/;

function classifyLine(l: RawLine): LineKind {
	if (l.is_running_header) return 'header';
	const text = lineTrim(l);

	// Part divider: huge Futura "I"/"II"/"III"/"3" (yes, page Sec2:135 uses "3")
	if (l.dom_font === 'Futura' && l.max_size >= 30) return 'partDivider';

	// Part-page title: Formata-Bold, size >= 18 (and not a 15.6 chapter).
	if (l.dom_font === 'Formata' && l.is_bold && l.max_size >= 17 && l.max_size < 30)
		return 'partTitle';

	// Part-III subsection label: large all-caps Formata-Regular size ~16, NOT bold.
	if (l.dom_font === 'Formata' && !l.is_bold && l.max_size >= 15 && l.max_size <= 17) {
		const m = ROMAN_SECTION_RE.exec(text);
		if (m && /^[A-ZÀ-Ý ]/.test(m[2]!)) return 'partSubsectionLabel';
	}

	// Commandment divider — Formata-Regular size ~12.4, ALL CAPS, NOT bold.
	if (l.dom_font === 'Formata' && !l.is_bold && l.max_size >= 11.5 && l.max_size <= 13.5) {
		if (COMMANDMENT_RE.test(text)) return 'commandment';
	}

	// Roman-section header (within a single chapter) — Formata-Regular size 12-13.5
	if (l.dom_font === 'Formata' && !l.is_bold && l.max_size >= 11.5 && l.max_size <= 13.8) {
		const m = ROMAN_SECTION_RE.exec(text);
		if (m && m[2] && m[2].length > 3 && /[A-ZÀ-Ý]/.test(m[2][0]!)) {
			return 'romanSection';
		}
	}

	// Chapter title — Formata-Bold, size 13-16.
	if (l.dom_font === 'Formata' && l.is_bold && l.max_size >= 13.5 && l.max_size < 17) {
		return 'chapterTitle';
	}

	// Oraison label.
	if (l.has_dagger || /^Oraisons?\s*:?\s*$/i.test(text)) {
		if (/^Oraisons?\s*:?\s*$/i.test(text)) return 'oraisonLabel';
	}

	// Epigraph marker (Bodoni ornament).
	if (l.has_bodoni_orn) return 'epigraphMarker';

	// Question head (bold Formata, "N. …").
	if (l.dom_font === 'Formata' && l.is_bold && l.max_size < 12.5) {
		if (Q_HEAD_RE.test(text)) return 'qHead';
		if (Q_HEAD_NOPERIOD_RE.test(text) && /^\d{1,3}\s/.test(text)) return 'qHead153';
	}

	// Footnote line — small Cheltenham at page bottom, prefixed by asterisks.
	if (l.dom_font === 'Cheltenham' && l.max_size <= 9.2 && /^\s*\*/.test(text)) {
		return 'footnote';
	}

	// Bullet answer line — bullet + Cheltenham text.
	if (l.dom_font === 'Cheltenham' && /^•/.test(text)) return 'answerBullet';

	// Default: any Cheltenham line that's not a header → answer body.
	if (l.dom_font === 'Cheltenham' && l.max_size >= 9.5) return 'answer';

	// Oraison body lines use Formata-Light (NOT Cheltenham). We can't tell
	// from the classifier alone whether we're inside an oraison, so the state
	// machine treats Formata-Light text-body lines as oraison content when
	// `inOraison` is set; otherwise they're skipped.
	if (
		l.dom_font === 'Formata' &&
		!l.is_bold &&
		l.max_size >= 9.5 &&
		l.max_size <= 11 &&
		text.length > 2
	) {
		return 'answer';
	}
	// Small italic Formata — oraison attribution lines ("Oraison du VIIIe…")
	// or footnote references. The state machine routes by context.
	if (
		l.dom_font === 'Formata' &&
		l.is_italic &&
		l.max_size >= 7 &&
		l.max_size <= 9 &&
		text.length > 2
	) {
		return 'answer';
	}

	return 'unknown';
}

// ─── State machine ───────────────────────────────────────────────────────────

interface RawSection {
	title: string | null;
	qa: QA[];
	commandments?: Commandment[];
}

interface RawChapter {
	title: string;
	epigraph?: { text: string; cite?: string };
	sections: RawSection[];
	oraisons: Oraison[];
	footnotes: Footnote[];
}

interface RawPart {
	ordinal: number; // 0=intro, 1=credo, 2=morale, 3=moyens
	title: string; // primary title of the part
	subtitle?: string; // 18pt secondary title (e.g. "Principales vérités …")
	chapters: RawChapter[];
	// For Part III only — chapters split into 2 sub-sections.
	sectionMap?: Map<number, string>; // chapter index → subsection title
}

function buildCorpus(lines: RawLine[]): {
	intro: RawChapter;
	parts: RawPart[];
} {
	// State.
	let mode: 'intro' | 'part' = 'intro';
	const introChapter: RawChapter = {
		title: 'Premières notions de la Foi chrétienne',
		sections: [],
		oraisons: [],
		footnotes: []
	};
	const parts: RawPart[] = [];

	// Per-chapter accumulators.
	let curChapter: RawChapter = introChapter;
	let curSection: RawSection | null = null;
	let curCommandment: Commandment | null = null;
	let curPart: RawPart | null = null;
	let pendingChapterTitleParts: string[] = [];
	let pendingPartTitleParts: string[] = [];
	let pendingPartSubsectionTitle: string | null = null;
	let pendingEpigraphLines: string[] = [];
	let pendingEpigraphCite: string | null = null;
	let inEpigraph = false;
	let inOraison = false;
	let pendingOraison: { lines: string[]; cite?: string } | null = null;
	// True until we see the first Q in the current part — all bold Formata
	// title lines on the part-divider page belong to the part title, not to
	// a chapter.
	let onPartDividerPage = false;

	// Accumulator for the current Q's answer.
	let curQA: QA | null = null;
	let curAnswerLines: string[] = []; // each entry is a finished line's text
	let curAnswerInBullets = false;
	let curAnswerBullets: string[] = []; // open <ul> items being collected
	let curAnswerBulletBuffer: string[] = []; // current item's wrapped lines

	const ftCtx: FootnoteContext = { counter: 0, collected: [] };

	// Helpers --------------------------------------------------------------

	function ensureSection(title: string | null): RawSection {
		if (!curSection || curSection.title !== title) {
			curSection = { title, qa: [], commandments: [] };
			curChapter.sections.push(curSection);
		}
		return curSection;
	}

	function flushBulletBuffer() {
		if (curAnswerBulletBuffer.length > 0) {
			curAnswerBullets.push(joinTextLines(curAnswerBulletBuffer));
			curAnswerBulletBuffer = [];
		}
	}

	function closeBulletList(): string {
		flushBulletBuffer();
		const items = curAnswerBullets.map((b) => `<li>${ingestRefs(ftCtx, b)}</li>`).join('');
		curAnswerBullets = [];
		curAnswerInBullets = false;
		return `<ul>${items}</ul>`;
	}

	function flushAnswer() {
		if (!curQA) return;
		const parts: string[] = [];
		// Body before bullets / between bullet groups.
		if (curAnswerLines.length > 0) {
			const joined = joinTextLines(curAnswerLines);
			parts.push(`<p>${ingestRefs(ftCtx, restoreCase(joined))}</p>`);
			curAnswerLines = [];
		}
		if (curAnswerInBullets) {
			parts.push(closeBulletList());
		}
		curQA.a = mergeHyphenatedEm(parts.join(''));
		curQA = null;
	}

	function startQ(n: number, qHtml: string, required: boolean) {
		flushAnswer();
		const sec = ensureSection(curSection?.title ?? null);
		const qa: QA = { n, q: qHtml, a: '', required };
		if (curCommandment) {
			curCommandment.qa.push(qa);
		} else {
			(sec.qa ??= []).push(qa);
		}
		curQA = qa;
	}

	function appendAnswerLine(line: RawLine, isBullet: boolean) {
		const html = runsToHtml(line.runs);
		if (isBullet) {
			// Strip the leading "•" (and any following spaces).
			const cleaned = html.replace(/^\s*•\s*/, '');
			if (!curAnswerInBullets) {
				curAnswerInBullets = true;
			}
			// Bullets are always one-per-line in this PDF (rarely multi-line).
			flushBulletBuffer();
			curAnswerBulletBuffer.push(cleaned);
		} else {
			if (curAnswerInBullets) {
				// Bullet list is broken by a non-bullet answer line — close it.
				if (curQA) {
					// Force-flush the bullets as part of the answer.
					curQA.a += closeBulletList();
				}
			}
			curAnswerLines.push(html);
		}
	}

	function startChapter(title: string) {
		// Close any open commandment / section state.
		curCommandment = null;
		flushAnswer();
		// Push chapter into current part (or intro).
		if (mode === 'intro') {
			// All intro content already lives in introChapter — chapterTitle
			// inside the intro is unexpected.
			curChapter = introChapter;
			curChapter.title = title; // overwrite if upstream gave a real title
		} else if (curPart) {
			const ch: RawChapter = { title, sections: [], oraisons: [], footnotes: [] };
			curPart.chapters.push(ch);
			curChapter = ch;
			// Reset footnote counter per chapter.
			ftCtx.counter = 0;
			ftCtx.collected = curChapter.footnotes;
			// Apply pending part-subsection title to this chapter (Part III).
			if (curPart.ordinal === 3 && pendingPartSubsectionTitle) {
				curPart.sectionMap ??= new Map();
				const idx = curPart.chapters.length - 1;
				curPart.sectionMap.set(idx, pendingPartSubsectionTitle);
				// Don't clear yet — the same section may have multiple chapters
				// inheriting it. The next partSubsectionLabel will overwrite.
			}
		}
		curSection = null;
		pendingEpigraphLines = [];
		pendingEpigraphCite = null;
		inEpigraph = false;
	}

	function startPart(ordinal: number) {
		flushAnswer();
		mode = 'part';
		curPart = { ordinal, title: '', chapters: [] };
		parts.push(curPart);
		curChapter = null as unknown as RawChapter; // gets set on next chapterTitle
		curSection = null;
		curCommandment = null;
		pendingPartTitleParts = [];
		pendingChapterTitleParts = [];
		pendingPartSubsectionTitle = null;
		pendingEpigraphLines = [];
		pendingEpigraphCite = null;
		inEpigraph = false;
		ftCtx.counter = 0;
		ftCtx.collected = [];
	}

	// Initialize footnote ctx target for the intro.
	ftCtx.collected = introChapter.footnotes;

	// Two-pass flush helpers for chapter titles --------------------------

	function flushPendingChapterTitle() {
		if (pendingChapterTitleParts.length === 0) return;
		// Strip any embedded "C H A P I T R E  N" markers and "CHAPITRE UNIQUE".
		const cleaned = pendingChapterTitleParts
			.map((p) =>
				p
					.replace(/C\s*H\s*A\s*P\s*I\s*T\s*R\s*E\s*U\s*N\s*I\s*Q\s*U\s*E/gi, '')
					.replace(/C\s*H\s*A\s*P\s*I\s*T\s*R\s*E\s*[A-Z0-9]+/gi, '')
					.trim()
			)
			.filter((p) => p.length > 0);
		// A line ending in " - " marks a subject break: insert " — " between
		// the current line's body and the next. Otherwise lines join with a
		// plain space (continuation of the same clause).
		let title = '';
		for (let k = 0; k < cleaned.length; k++) {
			const part = cleaned[k]!;
			const endsBreak = /\s-\s*$/.test(part);
			const body = part.replace(/\s*-\s*$/, '').trim();
			if (k === 0) {
				title = body;
			} else {
				title += ' ' + body;
			}
			if (endsBreak && k < cleaned.length - 1) {
				title += ' —';
			}
		}
		// Replace common PDF ligatures.
		title = title
			.replace(/\u{fb01}/gu, 'fi')
			.replace(/\u{fb02}/gu, 'fl')
			.replace(/\u{fb00}/gu, 'ff')
			.replace(/\u{fb03}/gu, 'ffi')
			.replace(/\u{fb04}/gu, 'ffl');
		title = normalizeWs(title);
		// Hyphen normalisation: " - " between two letters becomes "-"
		title = title.replace(/(\p{L})\s+-\s+(\p{L})/gu, '$1-$2');
		startChapter(title);
		pendingChapterTitleParts = [];
	}

	function flushPendingPartTitle() {
		if (!curPart) return;
		const titleParts = pendingPartTitleParts.map((p) => normalizeWs(p)).filter(Boolean);
		if (titleParts.length === 0) return;
		// Canonical part titles — overrides whatever the layout produced.
		const CANONICAL: Record<number, { title: string; subtitle?: string }> = {
			1: { title: 'Credo', subtitle: 'Principales vérités de la Foi chrétienne' },
			2: { title: 'La morale chrétienne' },
			3: { title: 'Les moyens de la grâce' }
		};
		const canon = CANONICAL[curPart.ordinal];
		if (canon) {
			curPart.title = canon.title;
			if (canon.subtitle) curPart.subtitle = canon.subtitle;
		} else {
			curPart.title = titleParts[0]!;
			if (titleParts.length > 1) curPart.subtitle = titleParts.slice(1).join(' ');
		}
		pendingPartTitleParts = [];
	}

	// Main loop -----------------------------------------------------------

	for (let i = 0; i < lines.length; i++) {
		const l = lines[i]!;
		const text = lineTrim(l);
		const kind = classifyLine(l);

		// Skip empty lines.
		if (kind === 'header' && !text) continue;
		if (text === '' && !l.has_diamond && !l.has_bodoni_orn && !l.has_dagger) continue;

		// A new chapterTitle / partDivider means we leave any pending epigraph
		// and commit any pending oraison.
		if (kind === 'partDivider' || kind === 'chapterTitle' || kind === 'partTitle') {
			inEpigraph = false;
			if (inOraison && pendingOraison) commitOraison();
			// Apply any pending epigraph to current chapter.
			if (pendingEpigraphLines.length > 0 && curChapter) {
				curChapter.epigraph = {
					text: pendingEpigraphLines.join(' '),
					...(pendingEpigraphCite ? { cite: pendingEpigraphCite } : {})
				};
				pendingEpigraphLines = [];
				pendingEpigraphCite = null;
			}
		}

		switch (kind) {
			case 'partDivider': {
				flushAnswer();
				if (inOraison && pendingOraison) commitOraison();
				const newOrd =
					parseInt(text, 10) || (text === 'I' ? 1 : text === 'II' ? 2 : text === 'III' ? 3 : 0);
				// The petit catechism Part III uses TWO 44pt dividers: "III" for
				// section I (Sacraments) and "3" for section II (Prière).
				// Treat the second occurrence as a section-divider page, not a
				// new part — but keep onPartDividerPage active so the
				// partSubsectionLabel that follows attaches to the next chapter.
				if (newOrd >= 1 && newOrd <= 3 && (!curPart || curPart.ordinal !== newOrd)) {
					flushPendingPartTitle();
					startPart(newOrd);
					onPartDividerPage = true;
				} else if (curPart && curPart.ordinal === 3) {
					// Same-part section-divider page (only Part III has this).
					onPartDividerPage = true;
				}
				break;
			}

			case 'partTitle': {
				if (onPartDividerPage) {
					pendingPartTitleParts.push(text);
				}
				break;
			}

			case 'partSubsectionLabel': {
				// "I. LES SACREMENTS …" / "II. LA PRIÈRE …" — store as pending,
				// will be applied to the next chapter started.
				const m = ROMAN_SECTION_RE.exec(text);
				const body = m ? m[2]!.trim() : text;
				// A new Roman-prefixed line starts a fresh subsection title;
				// continuation lines (no Roman prefix on this page) extend it.
				if (m) {
					pendingPartSubsectionTitle = sentenceCaseSection(body);
				} else if (pendingPartSubsectionTitle != null) {
					pendingPartSubsectionTitle += ' ' + sentenceCaseSection(body);
				}
				break;
			}

			case 'chapterTitle': {
				// While we're still on the part-divider page, treat
				// chapter-title-sized lines as part-title continuation.
				if (onPartDividerPage) {
					// If the page changed since the divider, leave divider mode.
					if (curPart && pendingPartTitleParts.length > 0 && i > 0) {
						const partDividerPageLabel = lines
							.slice(0, i)
							.reverse()
							.find((ll) => classifyLine(ll) === 'partDivider')?.page_label;
						if (partDividerPageLabel && l.page_label !== partDividerPageLabel) {
							flushPendingPartTitle();
							onPartDividerPage = false;
						}
					}
				}
				if (onPartDividerPage) {
					pendingPartTitleParts.push(text);
					break;
				}
				// Multi-line chapter titles — collect parts on the same page.
				flushPendingPartTitle();
				pendingChapterTitleParts.push(text);
				// Look ahead, skipping headers / empty lines / "C H A P I T R E"
				// kicker labels. Flush only when the next *content* line on the
				// same page isn't another chapterTitle.
				let k = i + 1;
				while (k < lines.length) {
					const nl = lines[k]!;
					if (nl.is_running_header) {
						k++;
						continue;
					}
					if (lineTrim(nl) === '') {
						k++;
						continue;
					}
					break;
				}
				const next = k < lines.length ? lines[k] : undefined;
				const nextKind = next ? classifyLine(next) : null;
				const samePage = next && next.page_label === l.page_label;
				if (nextKind !== 'chapterTitle' || !samePage) {
					flushPendingChapterTitle();
				}
				break;
			}

			case 'romanSection': {
				flushAnswer();
				const m = ROMAN_SECTION_RE.exec(text);
				const body = m ? m[2]!.trim() : text;
				// Multi-line (e.g. "I. LE SACREMENT : SON INSTITUTION, SA FIN" + next line).
				let title = body;
				let j = i + 1;
				while (
					j < lines.length &&
					classifyLine(lines[j]!) === 'romanSection' &&
					!ROMAN_SECTION_RE.exec(lineTrim(lines[j]!))?.[1]
				) {
					title += ' ' + lineTrim(lines[j]!);
					j++;
				}
				// If next line is plain Formata-Regular continuation (no Roman prefix), absorb it.
				while (j < lines.length) {
					const nl = lines[j]!;
					const ntext = lineTrim(nl);
					if (
						nl.dom_font === 'Formata' &&
						!nl.is_bold &&
						nl.max_size >= 11.5 &&
						nl.max_size <= 13.8 &&
						!ROMAN_SECTION_RE.test(ntext) &&
						/^[A-ZÀ-Ý ,'’-]+$/.test(ntext)
					) {
						title += ' ' + ntext;
						j++;
					} else break;
				}
				i = j - 1; // resume after consumed lines
				curSection = null; // force new section creation
				ensureSection(sentenceCaseSection(title));
				curCommandment = null;
				break;
			}

			case 'commandment': {
				flushAnswer();
				const m = COMMANDMENT_RE.exec(text);
				if (!m) break;
				const roman = m[1]!.toUpperCase();
				const ordinal = ROMAN_LATIN[roman] ?? 0;
				// Collect biblical-text lines that follow (Cheltenham-italic).
				let bibText = '';
				let j = i + 1;
				while (j < lines.length) {
					const nl = lines[j]!;
					if (nl.is_running_header) {
						j++;
						continue;
					}
					if (nl.dom_font === 'Cheltenham' && nl.is_italic) {
						bibText += (bibText ? ' ' : '') + lineTrim(nl);
						j++;
					} else break;
				}
				i = j - 1;
				const cmd: Commandment = {
					roman: ROMAN_ORDINAL_DISPLAY[roman] ?? roman,
					ordinal,
					biblical_text: normalizeWs(bibText),
					qa: []
				};
				const sec = ensureSection(curSection?.title ?? null);
				(sec.commandments ??= []).push(cmd);
				curCommandment = cmd;
				break;
			}

			case 'oraisonLabel': {
				flushAnswer();
				inOraison = true;
				pendingOraison = { lines: [] };
				break;
			}

			case 'epigraphMarker': {
				inEpigraph = true;
				pendingEpigraphLines = [];
				pendingEpigraphCite = null;
				break;
			}

			case 'qHead':
			case 'qHead153': {
				// Coming from an oraison section ends it.
				if (inOraison && pendingOraison) {
					commitOraison();
				}
				inEpigraph = false;
				if (onPartDividerPage) {
					flushPendingPartTitle();
					onPartDividerPage = false;
				}
				const re = kind === 'qHead' ? Q_HEAD_RE : Q_HEAD_NOPERIOD_RE;
				const m = re.exec(text);
				if (!m) break;
				const n = parseInt(m[1]!, 10);
				// Build the q HTML from runs (skip the leading "N." chunk).
				const qHtml = buildQuestionHtml(l, n);
				const required = l.has_diamond;
				startQ(n, qHtml, required);
				break;
			}

			case 'answerBullet':
			case 'answer': {
				if (inOraison && pendingOraison) {
					if (l.is_italic && l.max_size <= 9) {
						// Small italic attribution line (Formata-LightItalic ~8pt).
						const attrText = normalizeWs(lineTrim(l));
						pendingOraison.cite = pendingOraison.cite
							? pendingOraison.cite + ' ' + attrText
							: attrText;
					} else {
						// After a cite was attached, a fresh body line opens a
						// new oraison (multi-oraison pages mark "Oraisons :"
						// with plural and stack 2-3 prayers).
						if (pendingOraison.cite && pendingOraison.lines.length > 0) {
							commitOraison();
							inOraison = true;
							pendingOraison = { lines: [] };
						}
						pendingOraison.lines.push(runsToHtml(l.runs));
					}
					break;
				}
				if (inEpigraph) {
					if (l.is_italic && l.max_size >= 9.5) {
						pendingEpigraphLines.push(lineTrim(l));
						// Attribution often appears as a small italic citation
						// "(He 11, 6)" mid-line — already part of text.
					} else {
						inEpigraph = false;
					}
					if (inEpigraph) break;
				}
				// Outside an oraison/epigraph, Formata-Light bodies are noise
				// (other Q&A pages don't have them); only Cheltenham counts as
				// answer text.
				if (l.dom_font !== 'Cheltenham') break;
				if (curQA) {
					appendAnswerLine(l, kind === 'answerBullet');
				}
				break;
			}

			case 'footnote': {
				// Cheltenham-Light asterisk note — collect as footnote text.
				// Numbering: append sequentially; the inline refs in answer
				// HTML use independent counter (ingestRefs) — they line up by
				// page-order assumption, which holds for this petit catechism.
				const ftext = normalizeWs(text.replace(/^\s*\*+\s*/, ''));
				if (ftext) {
					const n = (ftCtx.collected.at(-1)?.n ?? 0) + 1;
					ftCtx.collected.push({ n, text: ftext });
				}
				break;
			}

			case 'header':
			case 'unknown':
			default:
				break;
		}
	}

	// Final flush.
	flushAnswer();
	if (inOraison && pendingOraison) {
		commitOraison();
	}
	flushPendingPartTitle();

	function commitOraison() {
		if (!pendingOraison) return;
		const html = pendingOraison.lines.join(' ');
		if (html.trim()) {
			const o: Oraison = { html: normalizeWs(html) };
			if (pendingOraison.cite) o.cite = normalizeWs(pendingOraison.cite);
			(curChapter?.oraisons ?? introChapter.oraisons).push(o);
		}
		pendingOraison = null;
		inOraison = false;
	}

	return { intro: introChapter, parts };
}

// Format the question HTML from a qHead RawLine.
function buildQuestionHtml(l: RawLine, n: number): string {
	// Drop the leading "N." (and the surrounding wingdings/space chars) from
	// the runs, then run the rest through runsToHtml.
	const flat = lineText(l);
	const idx = flat.indexOf(`${n}.`);
	if (idx === -1) {
		// Fallback: special-case the no-period form (e.g. Q153).
		const idx2 = flat.indexOf(`${n} `);
		if (idx2 === -1) return runsToHtml(l.runs);
		return strHtmlAfterOffset(l, idx2 + String(n).length);
	}
	return strHtmlAfterOffset(l, idx + String(n).length + 1); // +1 for the "."
}

// Re-emit run HTML, skipping the first `offset` characters of concatenated text.
function strHtmlAfterOffset(l: RawLine, offset: number): string {
	let consumed = 0;
	const out: RawRun[] = [];
	for (const r of l.runs) {
		if (!r.text) {
			out.push(r);
			continue;
		}
		if (consumed >= offset) {
			out.push(r);
			continue;
		}
		const remaining = offset - consumed;
		if (r.text.length <= remaining) {
			consumed += r.text.length;
			continue;
		}
		out.push({ ...r, text: r.text.slice(remaining) });
		consumed = offset;
	}
	// Trim leading whitespace.
	while (out.length && (!out[0]!.text || /^\s*$/.test(out[0]!.text))) out.shift();
	if (out.length) out[0] = { ...out[0]!, text: out[0]!.text.replace(/^\s+/, '') };
	return runsToHtml(out);
}

// Sentence-case helper for section titles ("LES VERTUS EN GÉNÉRAL" -> "Les vertus en général").
function sentenceCaseSection(s: string): string {
	const trimmed = normalizeWs(s.replace(/[.\s]+$/, ''));
	if (!trimmed) return trimmed;
	const lower = trimmed.toLowerCase();
	const cased = lower.charAt(0).toUpperCase() + lower.slice(1);
	// Restore proper nouns.
	let out = cased;
	for (const [re, r] of PROPER_NOUN_SUBS) out = out.replace(re, r);
	out = out
		.replace(/\bjésus\b/gi, 'Jésus')
		.replace(/\bsacrement\b/g, 'sacrement')
		.replace(/\bmesse\b/g, 'Messe');
	return out;
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function preparePiusXPetit(args: { rawDir: string; outDir: string }): {
	totalQA: number;
	perPart: Record<string, number>;
	missing: number[];
} {
	const { rawDir, outDir } = args;
	const linesPath = join(rawDir, 'lines.json');
	const lines = JSON.parse(readFileSync(linesPath, 'utf8')) as RawLine[];

	const { intro, parts } = buildCorpus(lines);

	// Validate Q numbering ----------------------------------------------------
	const allQ: { n: number; partOrdinal: number; chapterIdx: number }[] = [];
	const collectQ = (sec: RawSection, partOrd: number, chIdx: number) => {
		for (const q of sec.qa ?? []) allQ.push({ n: q.n, partOrdinal: partOrd, chapterIdx: chIdx });
		for (const cmd of sec.commandments ?? [])
			for (const q of cmd.qa) allQ.push({ n: q.n, partOrdinal: partOrd, chapterIdx: chIdx });
	};
	for (const sec of intro.sections) collectQ(sec, 0, 0);
	for (const part of parts) {
		for (let ci = 0; ci < part.chapters.length; ci++) {
			for (const sec of part.chapters[ci]!.sections) collectQ(sec, part.ordinal, ci);
		}
	}
	allQ.sort((a, b) => a.n - b.n);
	const numbersFound = new Set(allQ.map((q) => q.n));
	const missing: number[] = [];
	const totalExpected = allQ.length > 0 ? Math.max(...allQ.map((q) => q.n)) : 0;
	for (let i = 1; i <= totalExpected; i++) if (!numbersFound.has(i)) missing.push(i);

	// Validate Part III has 2 sections (sub-section labels).
	const partIII = parts.find((p) => p.ordinal === 3);
	if (partIII && partIII.sectionMap) {
		const distinctSectionTitles = new Set(partIII.sectionMap.values());
		if (distinctSectionTitles.size !== 2) {
			throw new Error(
				`Part III expected 2 sections, found ${distinctSectionTitles.size}: ${[...distinctSectionTitles].join(' | ')}`
			);
		}
	} else if (partIII) {
		throw new Error(`Part III has no sectionMap`);
	}

	// Slug assignment ---------------------------------------------------------
	const PART_SLUG: Record<number, string> = {
		0: '0-intro',
		1: '1-credo',
		2: '2-morale',
		3: '3-moyens-grace'
	};

	mkdirSync(outDir, { recursive: true });

	// Write intro chapter.
	const introQs = collectAllQ(intro);
	const introQRange: [number, number] = [introQs[0]?.n ?? 0, introQs[introQs.length - 1]?.n ?? 0];
	const introDir = join(outDir, '0-intro');
	mkdirSync(introDir, { recursive: true });
	const introFile: IntroFile = {
		corpus: 'pius-x-petit',
		part_slug: '0-intro',
		slug: 'premieres-notions',
		title: intro.title,
		...(intro.epigraph ? { epigraph: intro.epigraph } : {}),
		sections: rawSectionsToOutput(intro.sections),
		oraisons: intro.oraisons,
		footnotes: intro.footnotes,
		qa_range: introQRange
	};

	// Build chapter file list per part.
	interface NavTarget {
		href: string;
		title: string;
		partSlug: string;
	}
	const navTargets: NavTarget[] = [
		{
			href: `/pius-x-petit/0-intro/premieres-notions`,
			title: intro.title,
			partSlug: '0-intro'
		}
	];

	const structureParts: StructurePart[] = [];
	const chapterFiles: { path: string; data: ChapterFile }[] = [];

	for (const part of parts) {
		const partSlug = PART_SLUG[part.ordinal] ?? `${part.ordinal}-part`;
		const partDir = join(outDir, partSlug);
		mkdirSync(partDir, { recursive: true });
		const chapterSlugs = new Set<string>();

		// Compute QA-range per chapter.
		const partQs: number[] = [];

		// Build section groups for Part III.
		const sectionTitles: string[] = [];
		const chapterToSectionIndex: number[] = [];
		if (part.ordinal === 3 && part.sectionMap) {
			// Determine ordered unique section titles by chapter index.
			const seen = new Map<string, number>();
			for (let i = 0; i < part.chapters.length; i++) {
				const t = part.sectionMap.get(i);
				if (!t) continue;
				if (!seen.has(t)) seen.set(t, sectionTitles.push(t) - 1);
				chapterToSectionIndex.push(seen.get(t)!);
			}
			// Carry-forward: if a chapter has no explicit section, inherit the previous one.
			for (let i = 0; i < part.chapters.length; i++) {
				if (chapterToSectionIndex[i] === undefined) {
					chapterToSectionIndex[i] = chapterToSectionIndex[i - 1] ?? 0;
				}
			}
		}

		const partChapters: StructureChapter[] = [];
		const partSections: { slug: string; title: string; chapters: StructureChapter[] }[] = [];
		if (part.ordinal === 3) {
			for (const t of sectionTitles) {
				const slug = numberedSlug(partSections.length + 1, t, 20, new Set());
				partSections.push({ slug, title: t, chapters: [] });
			}
		}

		for (let ci = 0; ci < part.chapters.length; ci++) {
			const ch = part.chapters[ci]!;
			const ordinal = ci + 1;
			const slug = numberedSlug(ordinal, ch.title, 20, chapterSlugs);
			const chQs = collectAllQ(ch);
			const qa_range: [number, number] = [chQs[0]?.n ?? 0, chQs[chQs.length - 1]?.n ?? 0];
			for (const q of chQs) partQs.push(q.n);

			const sectionMeta: { section_slug?: string; section_title?: string } = {};
			if (part.ordinal === 3 && chapterToSectionIndex[ci] !== undefined) {
				const sec = partSections[chapterToSectionIndex[ci]!]!;
				sectionMeta.section_slug = sec.slug;
				sectionMeta.section_title = sec.title;
				sec.chapters.push({ slug, title: ch.title, ordinal, qa_range });
			} else {
				partChapters.push({ slug, title: ch.title, ordinal, qa_range });
			}

			const file: ChapterFile = {
				corpus: 'pius-x-petit',
				part_slug: partSlug,
				part_title: part.title,
				part_ordinal: part.ordinal,
				...sectionMeta,
				slug,
				title: ch.title,
				ordinal,
				...(ch.epigraph ? { epigraph: ch.epigraph } : {}),
				sections: rawSectionsToOutput(ch.sections),
				oraisons: ch.oraisons,
				footnotes: ch.footnotes,
				qa_range
			};
			const path = join(partDir, `${slug}.json`);
			chapterFiles.push({ path, data: file });

			navTargets.push({
				href: `/pius-x-petit/${partSlug}/${slug}`,
				title: ch.title,
				partSlug
			});
		}

		const partQaRange: [number, number] = [Math.min(...partQs), Math.max(...partQs)];
		const structPart: StructurePart = {
			slug: partSlug,
			ordinal: part.ordinal,
			title: part.title,
			...(part.subtitle ? { subtitle: part.subtitle } : {}),
			qa_range: partQaRange
		};
		if (part.ordinal === 3) {
			structPart.sections = partSections;
		} else {
			structPart.chapters = partChapters;
		}
		structureParts.push(structPart);
	}

	// Set prev/next on each chapter file using navTargets.
	for (let i = 0; i < chapterFiles.length; i++) {
		const targetIdx = i + 1; // navTargets[0] is the intro
		const file = chapterFiles[i]!.data;
		const prev = navTargets[targetIdx - 1];
		const next = navTargets[targetIdx + 1];
		if (prev) {
			file.prev = {
				href: prev.href,
				title: prev.title,
				kind: prev.partSlug !== file.part_slug ? 'part' : 'chapter'
			};
		}
		if (next) {
			file.next = {
				href: next.href,
				title: next.title,
				kind: next.partSlug !== file.part_slug ? 'part' : 'chapter'
			};
		}
	}

	// Set next on the intro file.
	const firstAfterIntro = navTargets[1];
	if (firstAfterIntro) {
		introFile.next = {
			href: firstAfterIntro.href,
			title: firstAfterIntro.title,
			kind: 'part'
		};
	}

	// Write intro and chapter files.
	writeFileSync(join(introDir, 'premieres-notions.json'), JSON.stringify(introFile));
	for (const { path, data } of chapterFiles) writeFileSync(path, JSON.stringify(data));

	// Write structure.json.
	const totalQA = totalExpected;
	const structure: Structure = {
		corpus: 'pius-x-petit',
		intro: {
			slug: 'premieres-notions',
			title: intro.title,
			qa_range: introQRange,
			part_slug: '0-intro'
		},
		parts: structureParts,
		total_qa: totalQA
	};
	writeFileSync(join(outDir, 'structure.json'), JSON.stringify(structure, null, 2));

	const perPart: Record<string, number> = {};
	for (const sp of structureParts) {
		perPart[sp.slug] = sp.qa_range[1] - sp.qa_range[0] + 1;
	}
	perPart['0-intro'] = introQRange[1] - introQRange[0] + 1;

	return { totalQA, perPart, missing };
}

function collectAllQ(ch: RawChapter): QA[] {
	const out: QA[] = [];
	for (const sec of ch.sections) {
		for (const q of sec.qa ?? []) out.push(q);
		for (const cmd of sec.commandments ?? []) for (const q of cmd.qa) out.push(q);
	}
	out.sort((a, b) => a.n - b.n);
	return out;
}

function rawSectionsToOutput(secs: RawSection[]): Section[] {
	return secs
		.map((s) => {
			const out: Section = { title: s.title };
			if (s.commandments && s.commandments.length > 0) {
				out.commandments = s.commandments;
			}
			if (s.qa && s.qa.length > 0) {
				out.qa = s.qa;
			}
			return out;
		})
		.filter((s) => (s.qa?.length ?? 0) > 0 || (s.commandments?.length ?? 0) > 0 || s.title);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
	const root = new URL('../..', import.meta.url).pathname;
	const rawDir = join(root, 'static/data/pius-x-petit/_raw');
	const outDir = join(root, 'static/data/pius-x-petit');
	const r = preparePiusXPetit({ rawDir, outDir });
	console.log(`Total Q&A: ${r.totalQA}`);
	console.log('Per part:', r.perPart);
	if (r.missing.length > 0) {
		console.warn(`MISSING Q numbers (${r.missing.length}):`, r.missing);
	}
}
