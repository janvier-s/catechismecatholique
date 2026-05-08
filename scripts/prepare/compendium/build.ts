import type { HtmlEvent, AppendixEvent } from './html';
import type { TocEntry } from './toc';
import { slugify } from '../slug';
import type {
	CompendiumPart,
	CompendiumFlowNode,
	CompendiumStructure,
	CompendiumStructureSection,
	CompendiumQRange,
	CompendiumCitedBy,
	BibleRef
} from '../../../src/lib/data/types';

export interface SourceQuestion {
	paragraph_number: string;
	paragraph_question: string;
	ccc_refs: string[];
	paragraph: string;
	verses: string[];
}

export interface BuildInput {
	sourceJson: SourceQuestion[];
	toc: TocEntry[];
	files: { file: string; events: HtmlEvent[] }[];
	appendix?: AppendixEvent[];
}

export interface BuildOutput {
	structure: CompendiumStructure;
	parts: Record<string, CompendiumPart>;
	appendix?: CompendiumPart;
	citedBy: CompendiumCitedBy;
	qRanges: CompendiumQRange[];
}

// Religious proper nouns whose capitalization must be preserved even in
// otherwise lowercased prose ("Dieu", "Christ", etc.).
const PROPER_NOUNS = [
	'Dieu',
	'Christ',
	'Jésus',
	'Jésus-Christ',
	'Père',
	'Fils',
	'Esprit',
	'Saint-Esprit',
	'Esprit-Saint',
	'Marie',
	'Église',
	'Israël',
	'Sauveur',
	'Rédempteur',
	'Verbe',
	'Trinité',
	'Seigneur',
	'Évangile',
	'Évangiles',
	'Écriture',
	'Écritures',
	'Bible',
	'Ancien',
	'Nouveau',
	'Testament',
	'Royaume',
	'Apôtres',
	'Apôtre',
	'Pâque',
	'Pâques',
	'Pentecôte',
	'Avent',
	'Noël',
	'Décalogue',
	'Béatitudes',
	'Magnificat',
	'Pater',
	'Credo',
	'Confiteor'
];

/**
 * French sentence-case for an EPUB heading (typically all-caps).
 * Lowercase everything, then capitalize:
 *   - the first alphabetic character of the string
 *   - the first alphabetic character after sentence punctuation (. ! ?)
 *   - the first alphabetic character after a "phrase-opening" guillemet
 *     (« at start, or « following sentence punctuation / dash separator)
 *   - the first alphabetic character after a dash separator surrounded by spaces
 * Then restore the religious proper-noun lexicon above.
 */
function titleCase(label: string): string {
	let s = label.toLowerCase();
	// 1) First alphabetic char of the string (handles leading «, l', etc.)
	s = s.replace(/^([^a-zà-ÿ]*)([a-zà-ÿ])/u, (_, prefix, ch) => prefix + ch.toUpperCase());
	// 2) After phrase-opening guillemet (start, sentence punct, or dash separator)
	s = s.replace(
		/((?:^|[.!?]|\s[-—–])\s*«\s*)([a-zà-ÿ])/gu,
		(_, before, ch) => before + ch.toUpperCase()
	);
	// 3) After sentence-ending punctuation
	s = s.replace(/([.!?]\s+)([a-zà-ÿ])/gu, (_, before, ch) => before + ch.toUpperCase());
	// 4) After dash separator surrounded by spaces
	s = s.replace(/(\s[-—–]\s+)([a-zà-ÿ])/gu, (_, before, ch) => before + ch.toUpperCase());
	// 5) Restore proper nouns (whole-word, accent-aware boundaries)
	for (const noun of PROPER_NOUNS) {
		const re = new RegExp(`(?<![a-zà-ÿ])${noun.toLowerCase()}(?![a-zà-ÿ])`, 'giu');
		s = s.replace(re, noun);
	}
	return s;
}

function parseBibleRef(raw: string): BibleRef {
	const m = raw.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
	if (!m) return { text: raw };
	return {
		text: raw,
		book: m[1],
		chapter: parseInt(m[2]!, 10),
		verseStart: m[3] ? parseInt(m[3], 10) : undefined,
		verseEnd: m[4] ? parseInt(m[4], 10) : undefined
	};
}

function answerToHtml(answer: string): string {
	const trimmed = answer.trim();
	if (!trimmed) return '';
	return `<p>${trimmed}</p>`;
}

export function buildCompendium(input: BuildInput): BuildOutput {
	const { sourceJson, toc, files } = input;

	// Index source questions by number
	const sourceByNumber = new Map<number, SourceQuestion>();
	for (const q of sourceJson) sourceByNumber.set(parseInt(q.paragraph_number, 10), q);

	// Walk the HTML files in document order and assign each question to (part, section).
	type FlowItem =
		| {
				kind: 'heading';
				level: 2 | 3 | 4;
				id: string;
				title: string;
				kicker?: string;
				q_range?: [number, number];
				partSlug: string;
		  }
		| { kind: 'epigraph'; text: string; attribution?: string; partSlug: string }
		| { kind: 'question'; number: number; partSlug: string; sectionTitle: string };

	const flowItems: FlowItem[] = [];

	// Roman numerals for Compendium chapters (depth-4 / our level-3 entries)
	// within each section. Resets whenever a new depth-3 section opens.
	const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
	let chapterIdxInSection = 0;

	// Pointers to the most-recent heading at each level, so we can patch
	// their q_range as questions arrive.
	let openH2: FlowItem | null = null;
	let openH3: FlowItem | null = null;
	let openH4: FlowItem | null = null;

	const extendRange = (h: FlowItem | null, n: number) => {
		if (!h || h.kind !== 'heading') return;
		if (!h.q_range) h.q_range = [n, n];
		else h.q_range[1] = n;
	};
	const partOrder: { slug: string; number: 1 | 2 | 3 | 4; title: string }[] = [];
	const sectionsByPart = new Map<string, CompendiumStructureSection[]>();

	let currentPart: { slug: string; number: 1 | 2 | 3 | 4; title: string } | null = null;
	let currentSection: { title: string; from: number; to: number } | null = null;
	// Tracks questions that belong directly to the part (no depth>=3 section yet open)
	let partDirectFrom = 0;
	let partDirectTo = 0;

	const tocByAnchor = new Map<string, TocEntry>();
	for (const t of toc) {
		if (t.anchor) tocByAnchor.set(`${t.file}#${t.anchor}`, t);
	}

	const pushSectionIfClosed = () => {
		if (currentPart && currentSection && currentSection.from > 0) {
			const sections = sectionsByPart.get(currentPart.slug) ?? [];
			sections.push({
				title: currentSection.title,
				q_range: [currentSection.from, currentSection.to]
			});
			sectionsByPart.set(currentPart.slug, sections);
		}
		currentSection = null;
	};

	const pushPartDirectIfAny = () => {
		if (currentPart && partDirectFrom > 0) {
			const sections = sectionsByPart.get(currentPart.slug) ?? [];
			sections.push({
				title: currentPart.title,
				q_range: [partDirectFrom, partDirectTo]
			});
			sectionsByPart.set(currentPart.slug, sections);
		}
		partDirectFrom = 0;
		partDirectTo = 0;
	};

	for (const { file, events } of files) {
		for (const ev of events) {
			if (ev.kind === 'section') {
				const tocEntry = tocByAnchor.get(`${file}#${ev.anchor}`);
				if (!tocEntry) continue;
				if (tocEntry.depth === 2) {
					pushSectionIfClosed();
					pushPartDirectIfAny();
					const idx = partOrder.length;
					if (idx >= 4) {
						currentPart = null;
						continue;
					}
					const number = (idx + 1) as 1 | 2 | 3 | 4;
					const slug = slugify(tocEntry.label);
					const title = titleCase(tocEntry.label);
					currentPart = { slug, number, title };
					partOrder.push(currentPart);
					sectionsByPart.set(slug, []);
				} else if (tocEntry.depth >= 3 && currentPart) {
					pushSectionIfClosed();
					pushPartDirectIfAny();
					currentSection = { title: titleCase(tocEntry.label), from: 0, to: 0 };
					// EPUB depth 3 → section (h2), depth 4 → subsection (h3 = "Chapitre"),
					// depth 5+ → sub-subsection (h4). Cap at 4 so deeper trees
					// degrade gracefully rather than producing unstyled levels.
					const headingLevel: 2 | 3 | 4 = tocEntry.depth === 3 ? 2 : tocEntry.depth === 4 ? 3 : 4;
					// Reset chapter index when a new section (level 2) opens.
					if (headingLevel === 2) chapterIdxInSection = 0;
					const node: FlowItem = {
						kind: 'heading',
						level: headingLevel,
						id: `s-${slugify(tocEntry.label)}`,
						title: titleCase(tocEntry.label),
						partSlug: currentPart.slug
					};
					if (headingLevel === 3) {
						chapterIdxInSection++;
						const roman = ROMAN[chapterIdxInSection] ?? `${chapterIdxInSection}`;
						node.kicker = `Chapitre ${roman}`;
					}
					flowItems.push(node);
					if (headingLevel === 2) {
						openH2 = node;
						openH3 = null;
						openH4 = null;
					} else if (headingLevel === 3) {
						openH3 = node;
						openH4 = null;
					} else {
						openH4 = node;
					}
				}
			} else if (ev.kind === 'epigraph' && currentPart) {
				flowItems.push({
					kind: 'epigraph',
					text: ev.text,
					attribution: ev.attribution,
					partSlug: currentPart.slug
				});
			} else if (ev.kind === 'question' && currentPart) {
				if (currentSection) {
					if (currentSection.from === 0) currentSection.from = ev.number;
					currentSection.to = ev.number;
				} else {
					// Question directly under a part (no explicit sub-section)
					if (partDirectFrom === 0) partDirectFrom = ev.number;
					partDirectTo = ev.number;
				}
				// Patch q_range on each open heading so consumers (sommaire,
				// sidebar) can show "Q. N–M" next to a heading.
				extendRange(openH2, ev.number);
				extendRange(openH3, ev.number);
				extendRange(openH4, ev.number);
				flowItems.push({
					kind: 'question',
					number: ev.number,
					partSlug: currentPart.slug,
					sectionTitle: currentSection?.title ?? ''
				});
			}
		}
	}
	pushSectionIfClosed();
	pushPartDirectIfAny();

	// Build per-part flows
	const parts: Record<string, CompendiumPart> = {};
	for (const p of partOrder) {
		parts[p.slug] = { slug: p.slug, number: p.number, title: p.title, flow: [] };
	}

	for (const item of flowItems) {
		const partBundle = parts[item.partSlug];
		if (!partBundle) continue;
		if (item.kind === 'heading') {
			partBundle.flow.push({
				kind: 'heading',
				level: item.level,
				id: item.id,
				title: item.title,
				...(item.kicker ? { kicker: item.kicker } : {}),
				...(item.q_range ? { q_range: item.q_range } : {})
			});
		} else if (item.kind === 'epigraph') {
			partBundle.flow.push({
				kind: 'epigraph',
				text: item.text,
				attribution: item.attribution
			});
		} else if (item.kind === 'question') {
			const src = sourceByNumber.get(item.number);
			if (!src)
				throw new Error(`buildCompendium: Q${item.number} appears in HTML but not in source JSON`);
			partBundle.flow.push({
				kind: 'question',
				data: {
					corpus: 'compendium',
					number: item.number,
					question: src.paragraph_question.trim(),
					answer_html: answerToHtml(src.paragraph),
					ccc_refs: src.ccc_refs.map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n)),
					bible_refs: src.verses.map(parseBibleRef)
				}
			});
		}
	}

	// Validate: every source Q must appear in some part's flow.
	const seen = new Set<number>();
	for (const part of Object.values(parts)) {
		for (const node of part.flow) {
			if (node.kind === 'question') seen.add(node.data.number);
		}
	}
	for (const [number] of sourceByNumber) {
		if (!seen.has(number)) {
			throw new Error(`buildCompendium: Q${number} in source JSON but absent from EPUB flow`);
		}
	}

	// Build structure
	const structure: CompendiumStructure = {
		parts: partOrder.map((p) => ({
			slug: p.slug,
			number: p.number,
			title: p.title,
			sections: sectionsByPart.get(p.slug) ?? []
		}))
	};

	// q-ranges
	const qRanges: CompendiumQRange[] = [];
	for (const part of Object.values(parts)) {
		const numbers: number[] = [];
		for (const n of part.flow) if (n.kind === 'question') numbers.push(n.data.number);
		if (numbers.length === 0) continue;
		qRanges.push({ part: part.slug, from: Math.min(...numbers), to: Math.max(...numbers) });
	}
	qRanges.sort((a, b) => a.from - b.from);

	// cited-by
	const citedBy: CompendiumCitedBy = {};
	for (const part of Object.values(parts)) {
		for (const node of part.flow) {
			if (node.kind !== 'question') continue;
			for (const ref of node.data.ccc_refs) {
				if (!citedBy[ref]) citedBy[ref] = [];
				citedBy[ref]!.push(node.data.number);
			}
		}
	}
	for (const k of Object.keys(citedBy)) citedBy[Number(k)]!.sort((a, b) => a - b);

	let appendix: CompendiumPart | undefined;
	if (input.appendix && input.appendix.length > 0) {
		const flow: CompendiumFlowNode[] = [];
		for (const ev of input.appendix) {
			if (ev.kind === 'heading') {
				flow.push({
					kind: 'heading',
					level: ev.level,
					id: `s-${slugify(ev.text)}`,
					title: titleCase(ev.text)
				});
			} else {
				flow.push({ kind: 'prose', html: ev.html });
			}
		}
		appendix = { slug: 'annexe', title: 'Annexe', flow };
		structure.appendix = { slug: 'annexe', title: 'Annexe' };
	}

	return { structure, parts, appendix, citedBy, qRanges };
}
