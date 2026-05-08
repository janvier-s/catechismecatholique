// Normalize spacing around French guillemets « ». Source CCC HTML is
// inconsistent: some paragraphs have «X (no space) or X», others use a
// regular U+0020 space instead of the typographic NBSP (U+00A0). Unify
// both sides to a non-breaking space, including the tag-adjacent case
// like «<i>X</i>» which has no whitespace at all.
export function normalizeGuillemets(html: string): string {
	return (
		html
			// Collapse any whitespace right after « into a single NBSP.
			.replace(/«[ \t\u00A0]*/g, '«\u00A0')
			// Collapse any whitespace right before » into a single NBSP.
			.replace(/[ \t\u00A0]*»/g, '\u00A0»')
			// Tag-adjacent: «<tag> and </tag>» have no whitespace to match above.
			.replace(/«(<[^>]+>)/g, '« $1')
			.replace(/(<\/[^>]+>)»/g, '$1 »')
	);
}

// Strip the leading/trailing colon markers that the upstream JSON wraps
// around Bible refs (and a few Latin terms) inside parentheses. The source
// XHTML has e.g. `(<a class="bibRef">2 Tm 1, 12</a>)` and the processed
// JSON renders this as `( : 2 Tm 1, 12 : )` — readable, but the colons are
// noise. Restore the natural `(2 Tm 1, 12)` form for headings/titles.
export function stripBibRefColonMarkers(s: string): string {
	return s.replace(/\(\s*:\s*(.+?)\s*:\s*\)/g, '($1)');
}

// §2267 was officially revised in 2018 (Pope Francis, CDF declaration) to declare
// the death penalty inadmissible. The source data reflects the 1992 text.
// We preserve the original as `superseded_text_html` and replace `text_html`
// with the current Vatican wording so the reader sees the authoritative text
// while historians can still access the prior formulation.
export function patchParagraph2267(
	paragraphs: Map<number, { text_html: string; superseded_text_html?: string }>
): void {
	const p = paragraphs.get(2267);
	if (!p) return;
	p.superseded_text_html = p.text_html;
	const speechUrl =
		'http://www.vatican.va/content/francesco/fr/speeches/2017/october/documents/papa-francesco_20171011_convegno-nuova-evangelizzazione.html';
	const speechLink =
		`<a href="${speechUrl}" target="_blank" rel="noopener">` +
		'Discours aux Participants à la Rencontre organisée par le Conseil Pontifical pour la Promotion de la Nouvelle Évangélisation' +
		'</a>';
	p.text_html =
		'<p>Pendant longtemps, le recours à la peine de mort de la part de l’autorité légitime, après un procès régulier, fut considéré comme une réponse adaptée à la gravité de certains délits, et un moyen acceptable, bien qu’extrême, pour la sauvegarde du bien commun.</p>' +
		'<p>Aujourd’hui on est de plus en plus conscient que la personne ne perd pas sa dignité, même après avoir commis des crimes très graves. En outre, s’est répandue une nouvelle compréhension du sens de sanctions pénales de la part de l’État. On a également mis au point des systèmes de détention plus efficaces pour garantir la sécurité à laquelle les citoyens ont droit, et qui n’enlèvent pas définitivement au coupable la possibilité de se repentir.</p>' +
		'<p>C’est pourquoi l’Église enseigne, à la lumière de l’Évangile, que « la peine de mort est inadmissible car elle attente à l’inviolabilité et à la dignité de la personne » (<i class="typo_italic">François, ' +
		speechLink +
		', 11 octobre 2017</i>) et elle s’engage de façon déterminée, en vue de son abolition partout dans le monde.</p>';
}

// Walk past leading HTML tags + opening punctuation (« quotes, etc.) to find
// the first letter, then uppercase it. Returns the modified string.
export function capitalizeFirstWord(html: string): string {
	let i = 0;
	while (i < html.length) {
		const ch = html[i]!;
		if (ch === '<') {
			const end = html.indexOf('>', i);
			if (end < 0) return html;
			i = end + 1;
			continue;
		}
		if (/[\s«»‹›"'„“”‘’.,;:!?–— ]/.test(ch)) {
			i++;
			continue;
		}
		const upper = ch.toUpperCase();
		if (upper !== ch && /\p{L}/u.test(ch)) {
			return html.slice(0, i) + upper + html.slice(i + 1);
		}
		return html;
	}
	return html;
}

// When `bible_refs[i]` lacks a book prefix, inherit from `bible_refs[i-1]`.
// Recurring data quality bug — a continuation entry like "5:37" should be
// rewritten to "Mt 5:37" if the previous ref started with "Mt ...".
const BOOK_PREFIX_RE = /^([1-3]\s*)?[A-ZÉÈÊÂÄÔÎÏÜÇ][a-zéèêâäôîïüç]+/;

export function mergeBibleRefContinuations(refs: { text: string }[]): { text: string }[] {
	const out: { text: string }[] = [];
	let lastBook: string | null = null;
	for (const r of refs) {
		const text = r.text.trim();
		const match = text.match(BOOK_PREFIX_RE);
		if (match) {
			lastBook = match[0].trim();
			out.push({ text });
		} else if (lastBook) {
			out.push({ text: `${lastBook} ${text}` });
		} else {
			out.push({ text });
		}
	}
	return out;
}

// `ccc_paras_processed.json` mistypes §2775 as a duplicate §2275: an
// "Oraison dominicale" intro line is dropped into the en_bref block that
// holds §§ 2773-2774-2776. The duplicate would otherwise overwrite the
// real §2275 and leave §2775 absent.
//
// Detect by sibling neighbourhood (a `2275` paragraph alongside `2774` or
// `2776`) and rewrite in-place to `2775`. Also restores the capital
// "Modèle" used in the Vatican French edition.
interface RawTreeNode {
	type: string;
	number?: number;
	text_html?: string;
	children?: RawTreeNode[];
}

export function fixCccParaSourceTypos(parts: RawTreeNode[]): void {
	function walk(node: RawTreeNode) {
		const kids = node.children;
		if (kids && kids.length > 0) {
			const numbers = new Set<number | undefined>();
			for (const c of kids) if (c.type === 'paragraph') numbers.add(c.number);
			if (numbers.has(2275) && (numbers.has(2774) || numbers.has(2776))) {
				for (const c of kids) {
					if (c.type === 'paragraph' && c.number === 2275) {
						c.number = 2775;
						if (c.text_html) {
							c.text_html = c.text_html.replace('Maître et modèle', 'Maître et Modèle');
						}
					}
				}
			}
			for (const c of kids) walk(c);
		}
	}
	for (const p of parts) walk(p);
}

const BIBLE_SUP_RE = /<sup class="srcRef bibleRef" data-idx="(\d+)">\d+<\/sup>/g;

interface SupHit {
	idx: number;
	start: number;
	end: number;
}

interface RefLike {
	type: string;
	raw: string;
	idx?: string | number;
	[key: string]: unknown;
}

/**
 * Detect runs of consecutive `<sup class="srcRef bibleRef">` markers in the
 * paragraph html — runs of length ≥ 2 represent a single source footnote that
 * the upstream pipeline split per-verse. For each run, mark the trailing
 * members' magisterial-ref entries with `marker_idx = leader_idx` and strip
 * their `<sup>` element from the html. The leader's sup stays in place.
 *
 * "Consecutive" means whitespace-only (incl. NBSP) between two markers — any
 * other text or tag breaks the run. Pure function: returns a new html string
 * and a new refs array; inputs are not mutated.
 */
export function groupConsecutiveBibleSups<T extends RefLike>(input: {
	html: string;
	refs: T[];
}): { html: string; refs: (T & { marker_idx?: number })[] } {
	const { html, refs } = input;

	// Collect every bibleRef sup with its position. Plain regex over a known
	// canonical shape — the upstream emits exactly one variant of the tag.
	const hits: SupHit[] = [];
	BIBLE_SUP_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = BIBLE_SUP_RE.exec(html)) !== null) {
		hits.push({ idx: parseInt(m[1]!, 10), start: m.index, end: m.index + m[0].length });
	}
	if (hits.length < 2) return { html, refs: [...refs] };

	// Walk the hit list, growing maximal runs where the gap between two hits
	// is whitespace-only. Any non-whitespace character (including another sup
	// class like cccRef) breaks the run.
	const runs: SupHit[][] = [];
	let current: SupHit[] = [hits[0]!];
	for (let i = 1; i < hits.length; i++) {
		const gap = html.slice(hits[i - 1]!.end, hits[i]!.start);
		if (/^\s*$/.test(gap)) {
			current.push(hits[i]!);
		} else {
			if (current.length > 1) runs.push(current);
			current = [hits[i]!];
		}
	}
	if (current.length > 1) runs.push(current);

	if (runs.length === 0) return { html, refs: [...refs] };

	// Apply changes: refs first (cheap copy), then html (rebuild from slices
	// so we walk the string exactly once and never have to re-index after
	// edits invalidate offsets).
	const refsByIdx = new Map<number, number>();
	refs.forEach((r, i) => {
		if (r.idx !== undefined && r.idx !== null) {
			const n = typeof r.idx === 'number' ? r.idx : parseInt(String(r.idx), 10);
			if (Number.isFinite(n)) refsByIdx.set(n, i);
		}
	});

	const nextRefs = refs.map((r) => ({ ...r }));
	for (const run of runs) {
		const leader = run[0]!.idx;
		for (let i = 1; i < run.length; i++) {
			const ri = refsByIdx.get(run[i]!.idx);
			if (ri !== undefined) (nextRefs[ri] as RefLike).marker_idx = leader;
		}
	}

	// Build a Set of [start,end) ranges to strip. Then walk the string once.
	// Strip range for each trailing member extends back to the previous sup's
	// end, so whitespace between consecutive sups is consumed too — otherwise
	// a paragraph like `<sup1>  <sup2>.` would collapse to `<sup1>  .` with
	// dangling whitespace before the period.
	const stripRanges: { start: number; end: number }[] = [];
	for (const run of runs) {
		for (let i = 1; i < run.length; i++) {
			stripRanges.push({ start: run[i - 1]!.end, end: run[i]!.end });
		}
	}
	stripRanges.sort((a, b) => a.start - b.start);

	const out: string[] = [];
	let cursor = 0;
	for (const { start, end } of stripRanges) {
		out.push(html.slice(cursor, start));
		cursor = end;
	}
	out.push(html.slice(cursor));

	return { html: out.join(''), refs: nextRefs };
}
