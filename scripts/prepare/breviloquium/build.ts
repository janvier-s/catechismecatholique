/**
 * Breviloquium of St Bonaventure (1257) — Word-export HTML → JSON builder.
 *
 * Source: `breviloquiumsaintbonaventure.html` is a Word "Save as HTML" dump
 * with a flat heading hierarchy:
 *   <h1>            — Prologue / Partie I-VII / (none for Conclusion)
 *   <h2>            — § N (prologue paragraphs) / Chapitre N / Conclusion
 *   <p class="MsoNormal">  — body paragraphs (peppered with Office cruft)
 *
 * We walk top to bottom: each h1 opens a new "part" bucket, each h2 opens
 * a new chapter inside the current bucket and collects its body paragraphs
 * until the next heading. The Conclusion is its own h2 inside an empty h1
 * at the end of the file, so we promote it to a synthetic top-level part.
 */
export type BrevPartKind = 'prologue' | 'partie' | 'conclusion';

const ROMAN: Record<number, string> = {
	1: 'I',
	2: 'II',
	3: 'III',
	4: 'IV',
	5: 'V',
	6: 'VI',
	7: 'VII'
};

/**
 * Partie titles arrive ALL CAPS from the Word export and are missing several
 * French accents ("TRINITE", "GRACE"). Map the source titles to clean
 * French title-case + restored diacritics. Keyed by the ordinal so the
 * mapping survives source-side capitalization changes.
 */
const PARTIE_TITLE_OVERRIDES: Record<number, string> = {
	1: 'La Trinité de Dieu',
	2: 'Le monde créature de Dieu',
	3: 'La corruption du péché',
	4: "L'Incarnation du Verbe",
	5: 'La grâce du Saint-Esprit',
	6: 'Les sept médicaments sacramentels',
	7: 'Les fins dernières'
};

export interface BrevChapterRef {
	slug: string;
	title: string;
	ordinal: number;
	label: string; // "§ 1", "Chapitre 3", "Conclusion"
}

export interface BrevPart {
	slug: string;
	kind: BrevPartKind;
	ordinal?: number;
	roman?: string;
	title: string;
	chapters: BrevChapterRef[];
}

export interface BrevStructure {
	parts: BrevPart[];
	totalChapters: number;
}

export type BrevBlock = { kind: 'paragraph'; html: string };

export interface BrevChapter {
	slug: string;
	partSlug: string;
	partKind: BrevPartKind;
	partRoman?: string;
	partOrdinal?: number;
	partTitle: string;
	label: string;
	title: string;
	ordinal: number;
	blocks: BrevBlock[];
	prev?: { slug: string; title: string; label: string };
	next?: { slug: string; title: string; label: string };
}

export interface BrevBuildResult {
	structure: BrevStructure;
	chapters: Record<string, BrevChapter>;
}

// ─── Parsing helpers ──────────────────────────────────────────────────────

const H_RE = /<h([12])\b[^>]*>([\s\S]*?)<\/h\1>/g;

function stripTags(s: string): string {
	return s
		.replace(/<o:p\b[\s\S]*?<\/o:p>/g, '')
		.replace(/<o:p\b[^>]*\/>/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&#160;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Clean a Word-export body paragraph: strip Office-only tags (`<o:p>`,
 *  empty `<span>`), drop inline color/font styles, normalize whitespace.
 *  Keep semantic emphasis (`<b>`, `<i>`, `<em>`, `<strong>`). */
function cleanBodyHtml(html: string): string {
	let h = html;
	h = h.replace(/<o:p\b[\s\S]*?<\/o:p>/g, '');
	h = h.replace(/<o:p\b[^>]*\/>/g, '');
	// Strip <span style="..."> wrappers (Word colorizes random spans), but
	// keep their inner content. Iterate to clear nested wrappers.
	for (let i = 0; i < 3; i++) {
		const next = h.replace(/<span\b[^>]*>([\s\S]*?)<\/span>/g, '$1');
		if (next === h) break;
		h = next;
	}
	// Drop style/class/lang/align/dir attrs from all remaining tags.
	h = h.replace(/<(\/?)(\w+)([^>]*)>/g, (_full, slash: string, tag: string, attrs: string) => {
		if (slash) return `</${tag}>`;
		// For <a>, preserve href; everything else loses all attrs.
		if (tag.toLowerCase() === 'a') {
			const m = /href="([^"]*)"/.exec(attrs);
			return m ? `<a href="${m[1]}">` : `<a>`;
		}
		return `<${tag}>`;
	});
	// Collapse <b></b>, <i></i> etc. (Word loves emitting empty bold spans).
	for (let i = 0; i < 3; i++) {
		const next = h.replace(/<(b|i|em|strong|u)>\s*<\/\1>/g, '');
		if (next === h) break;
		h = next;
	}
	// Normalize whitespace inside the paragraph: tame Word's line-wrap
	// newlines that break in the middle of words ("Ec-\nriture").
	h = h.replace(/\s+/g, ' ').trim();
	return h;
}

/** Detect a chapter label from an h2 title: "§ N. Title", "Chapitre N: Title",
 *  or "Conclusion: Title". Returns { label, title, ordinal } or null when
 *  the heading is junk. */
function parseChapterHeading(
	text: string,
	indexInPart: number
): { label: string; title: string; ordinal: number } | null {
	if (!text) return null;
	const t = text.trim();
	let m: RegExpMatchArray | null;
	if ((m = t.match(/^§\s*(\d+)\.\s*(.*)$/))) {
		return { label: `Chapitre ${m[1]}`, title: tidyTitle(m[2]!), ordinal: parseInt(m[1]!, 10) };
	}
	if ((m = t.match(/^Chapitre\s+(\d+)\s*[:.]\s*(.*)$/i))) {
		return {
			label: `Chapitre ${m[1]}`,
			title: tidyTitle(m[2]!),
			ordinal: parseInt(m[1]!, 10)
		};
	}
	if (/^Conclusion\b/i.test(t)) {
		const title = tidyTitle(t.replace(/^Conclusion\s*[:.]?\s*/i, '')) || 'Conclusion';
		return { label: 'Conclusion', title, ordinal: indexInPart + 1 };
	}
	return null;
}

/** Capitalize the first letter and drop a trailing period — the source
 *  is inconsistent (some titles start lowercase, some end with a period). */
function tidyTitle(s: string): string {
	let t = s.trim().replace(/\.$/, '').trim();
	if (t.length === 0) return t;
	t = t[0]!.toUpperCase() + t.slice(1);
	return t;
}

/** Detect a Partie heading from h1 text: returns `{ ordinal, roman, title }`
 *  or null for the empty / sentinel h1s the source uses to wrap the
 *  prologue and conclusion. */
function parsePartieHeading(
	text: string
): { kind: 'partie' | 'prologue'; ordinal?: number; roman?: string; title: string } | null {
	if (!text) return null;
	const t = text.trim();
	let m: RegExpMatchArray | null;
	if ((m = t.match(/^PARTIE\s+([IVX]+)\s*:?\s*(.*)$/i))) {
		const roman = m[1]!;
		const ordinal = Object.entries(ROMAN).find(([, r]) => r === roman)?.[0];
		return {
			kind: 'partie',
			roman,
			ordinal: ordinal ? parseInt(ordinal, 10) : undefined,
			title: m[2]!.trim()
		};
	}
	if (/^PROLOGUE\b/i.test(t)) {
		return { kind: 'prologue', title: 'Prologue' };
	}
	return null;
}

// ─── Slug helpers (kept inline so we don't need to import slug.ts here) ───

function slugify(s: string): string {
	return s
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[’‘'`]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');
}

// ─── Main build ───────────────────────────────────────────────────────────

export function buildBreviloquium(args: { html: string }): BrevBuildResult {
	const s = args.html;

	// Pass 1: find every h1/h2 with its character range so we can carve out
	// the body slice belonging to each heading.
	interface HeadingMatch {
		level: 1 | 2;
		text: string;
		start: number; // start of <h…>
		end: number; // end of </h…>
	}
	const headings: HeadingMatch[] = [];
	let hm: RegExpExecArray | null;
	const re = new RegExp(H_RE.source, H_RE.flags);
	while ((hm = re.exec(s))) {
		headings.push({
			level: parseInt(hm[1]!, 10) as 1 | 2,
			text: stripTags(hm[2] ?? ''),
			start: hm.index,
			end: hm.index + hm[0].length
		});
	}

	// Pass 2: stream through headings. Maintain a "current part" pointer.
	// On h1 open a new part (if it parses as one); on h2 open a chapter
	// inside the current part and collect every <p> between this h2 and
	// the next heading.
	const parts: BrevPart[] = [];
	const chapters: Record<string, BrevChapter> = {};
	// Keep part-slug and chapter-slug namespaces separate so a part named
	// "conclusion" doesn't push its lone chapter to "conclusion-2".
	const usedPartSlugs = new Set<string>();
	const usedChapterSlugs = new Set<string>();

	function uniqueSlug(base: string, set: Set<string>): string {
		let slug = base;
		let i = 2;
		while (set.has(slug)) slug = `${base}-${i++}`;
		set.add(slug);
		return slug;
	}

	let currentPart: BrevPart | null = null;

	for (let i = 0; i < headings.length; i++) {
		const h = headings[i]!;
		const next = headings[i + 1];
		const bodySlice = s.substring(h.end, next?.start ?? s.length);

		if (h.level === 1) {
			const parsed = parsePartieHeading(h.text);
			if (!parsed) {
				// Empty / non-matching h1: don't open a new part. (The
				// conclusion is detected from its h2 text directly below.)
				continue;
			}
			const partSlug =
				parsed.kind === 'prologue'
					? uniqueSlug('prologue', usedPartSlugs)
					: uniqueSlug(`partie-${parsed.ordinal ?? slugify(parsed.title)}`, usedPartSlugs);
			currentPart = {
				slug: partSlug,
				kind: parsed.kind,
				...(parsed.ordinal !== undefined ? { ordinal: parsed.ordinal } : {}),
				...(parsed.roman ? { roman: parsed.roman } : {}),
				title: parsed.title,
				chapters: []
			};
			parts.push(currentPart);
			continue;
		}

		// h2 — chapter or conclusion
		const indexInPart = currentPart?.chapters.length ?? 0;
		const parsedCh = parseChapterHeading(h.text, indexInPart);
		if (!parsedCh) continue; // skip empty/junk h2s

		// Promote a "Conclusion" h2 to its own top-level part. The source
		// emits it as a plain h2 at the end of Partie VII (no separating h1),
		// but logically it stands apart from the seven main partes.
		const isConclusion = parsedCh.label === 'Conclusion';
		let owningPart: BrevPart;
		if (isConclusion) {
			owningPart = {
				slug: uniqueSlug('conclusion', usedPartSlugs),
				kind: 'conclusion',
				title: 'Conclusion',
				chapters: []
			};
			parts.push(owningPart);
			currentPart = owningPart;
		} else if (currentPart) {
			owningPart = currentPart;
		} else {
			// Lone h2 with no part — synthesize a bucket so we don't lose
			// content. Shouldn't happen in this source.
			owningPart = {
				slug: uniqueSlug('autre', usedPartSlugs),
				kind: 'partie',
				title: 'Autre',
				chapters: []
			};
			parts.push(owningPart);
			currentPart = owningPart;
		}

		const chSlugBase =
			owningPart.kind === 'prologue'
				? `prologue-${parsedCh.ordinal}`
				: owningPart.kind === 'conclusion'
					? 'conclusion'
					: `p${owningPart.ordinal}-c${parsedCh.ordinal}`;
		const chSlug = uniqueSlug(chSlugBase, usedChapterSlugs);

		// Extract <p> blocks from the body slice.
		const blocks: BrevBlock[] = [];
		const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
		let pm: RegExpExecArray | null;
		while ((pm = pRe.exec(bodySlice))) {
			const inner = cleanBodyHtml(pm[1] ?? '');
			if (!inner || inner === '&nbsp;') continue;
			// Skip purely whitespace / decorative empties.
			if (!stripTags(inner)) continue;
			blocks.push({ kind: 'paragraph', html: inner });
		}

		const chapterRef: BrevChapterRef = {
			slug: chSlug,
			title: parsedCh.title,
			ordinal: parsedCh.ordinal,
			label: parsedCh.label
		};
		owningPart.chapters.push(chapterRef);

		chapters[chSlug] = {
			slug: chSlug,
			partSlug: owningPart.slug,
			partKind: owningPart.kind,
			...(owningPart.roman ? { partRoman: owningPart.roman } : {}),
			...(owningPart.ordinal !== undefined ? { partOrdinal: owningPart.ordinal } : {}),
			partTitle: owningPart.title,
			label: parsedCh.label,
			title: parsedCh.title,
			ordinal: parsedCh.ordinal,
			blocks
		};
	}

	// Normalize partie titles (the source ships them ALL CAPS and missing
	// diacritics — "TRINITE", "GRACE"). The override table is the canonical
	// French form.
	for (const part of parts) {
		if (part.kind === 'partie' && part.ordinal && PARTIE_TITLE_OVERRIDES[part.ordinal]) {
			part.title = PARTIE_TITLE_OVERRIDES[part.ordinal]!;
		}
	}

	// Renumber chapters sequentially within each partie. The source has
	// several typos (Partie III's mid-list "Chapitre 1" should be 9, Partie
	// IV starts with "Chapitre 12" then 1/3/4…, Partie VI ends with two
	// "Chapitre 12"). Sequential renumbering by document order is the
	// simplest fix and matches what the original work intends.
	//
	// Build a fresh chapter map keyed by new slugs. Snapshotting the old
	// map first avoids swap-collisions when two refs trade slugs
	// (e.g. P4: c12 ↔ c1).
	const originalChapters: Record<string, BrevChapter> = { ...chapters };
	const rebuilt: Record<string, BrevChapter> = {};
	for (const part of parts) {
		for (let i = 0; i < part.chapters.length; i++) {
			const ref = part.chapters[i]!;
			const ch = originalChapters[ref.slug];
			if (!ch) continue;
			if (part.kind === 'partie' && part.ordinal !== undefined) {
				const newOrdinal = i + 1;
				ref.ordinal = newOrdinal;
				ref.label = `Chapitre ${newOrdinal}`;
				ref.slug = `p${part.ordinal}-c${newOrdinal}`;
				ch.slug = ref.slug;
				ch.ordinal = ref.ordinal;
				ch.label = ref.label;
			}
			ch.partTitle = part.title;
			rebuilt[ref.slug] = ch;
		}
	}
	for (const key of Object.keys(chapters)) delete chapters[key];
	Object.assign(chapters, rebuilt);

	// Wire prev/next pointers across the flat chapter sequence so the
	// reader can render Navigation cards without rebuilding the order.
	const flat: BrevChapter[] = [];
	for (const part of parts) {
		for (const ref of part.chapters) flat.push(chapters[ref.slug]!);
	}
	for (let i = 0; i < flat.length; i++) {
		const c = flat[i]!;
		const prev = flat[i - 1];
		const nxt = flat[i + 1];
		if (prev) c.prev = { slug: prev.slug, title: prev.title, label: prev.label };
		if (nxt) c.next = { slug: nxt.slug, title: nxt.title, label: nxt.label };
	}

	return {
		structure: { parts, totalChapters: flat.length },
		chapters
	};
}
