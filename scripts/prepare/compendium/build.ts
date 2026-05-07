import type { HtmlEvent } from './html';
import type { TocEntry } from './toc';
import { slugify } from '../slug';
import type {
	CompendiumPart,
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
}

export interface BuildOutput {
	structure: CompendiumStructure;
	parts: Record<string, CompendiumPart>;
	citedBy: CompendiumCitedBy;
	qRanges: CompendiumQRange[];
}

const TITLE_CASE_EXCEPTIONS = new Set(['de', 'la', 'le', 'du', 'des', 'à', 'au', 'aux', 'en', 'et', 'a']);

function titleCase(label: string): string {
	const lower = label.toLowerCase();
	return lower
		.split(/(\s+|[—–-])/)
		.map((tok, i) => {
			if (/^\s+$/.test(tok) || /^[—–-]$/.test(tok)) return tok;
			if (i > 0 && TITLE_CASE_EXCEPTIONS.has(tok)) return tok;
			return tok.charAt(0).toUpperCase() + tok.slice(1);
		})
		.join('');
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
		| { kind: 'heading'; level: 1 | 2 | 3; id: string; title: string; partSlug: string }
		| { kind: 'epigraph'; text: string; attribution?: string; partSlug: string }
		| { kind: 'question'; number: number; partSlug: string; sectionTitle: string };

	const flowItems: FlowItem[] = [];
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
					// Push a level-1 heading into the part flow
					flowItems.push({
						kind: 'heading',
						level: 1,
						id: `p-${slug}`,
						title,
						partSlug: slug
					});
				} else if (tocEntry.depth >= 3 && currentPart) {
					pushSectionIfClosed();
					pushPartDirectIfAny();
					currentSection = { title: titleCase(tocEntry.label), from: 0, to: 0 };
					const headingLevel: 2 | 3 = tocEntry.depth === 3 ? 2 : 3;
					flowItems.push({
						kind: 'heading',
						level: headingLevel,
						id: `s-${slugify(tocEntry.label)}`,
						title: titleCase(tocEntry.label),
						partSlug: currentPart.slug
					});
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
				level: item.level as 2 | 3,
				id: item.id,
				title: item.title
			});
		} else if (item.kind === 'epigraph') {
			partBundle.flow.push({
				kind: 'epigraph',
				text: item.text,
				attribution: item.attribution
			});
		} else if (item.kind === 'question') {
			const src = sourceByNumber.get(item.number);
			if (!src) throw new Error(`buildCompendium: Q${item.number} appears in HTML but not in source JSON`);
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

	return { structure, parts, citedBy, qRanges };
}
