export type Corpus = 'ccc' | 'compendium';

export interface BibleRef {
	text: string;
	book?: string;
	chapter?: number;
	verseStart?: number;
	verseEnd?: number;
}

export interface CrossRef {
	target: number;
	idx?: string;
}

export interface Citation {
	text_html: string;
	source?: MagisterialRefRecord;
}

export interface MagisterialRefRecord {
	type: 'magisterial' | 'patristic' | 'liturgical' | 'bible' | 'bible_continuation';
	abbr?: string;
	raw: string;
	idx?: string | number;
	doc_raw?: string;
	/** Displayed marker number in text + side panel. For cluster members this
	 *  points to the cluster leader's idx so the side panel groups all verses
	 *  under one footnote number. Solo refs leave it undefined (display marker
	 *  equals their own idx). */
	marker_idx?: number;
	/** Sequential 1-based number to display in the marker (in prose AND in the
	 *  side panel). Differs from `idx` because clustering removes some sups, so
	 *  surviving sups are renumbered consecutively. Cluster members share their
	 *  leader's `display_idx`. */
	display_idx?: number;
}

export interface Paragraph {
	corpus: Corpus;
	number: number;
	text_html: string;
	/** Former text for paragraphs whose wording was officially revised after the
	 *  1992 edition (e.g. §2267 on the death penalty, updated 2018). Rendered
	 *  below the current text with a clear "Rédaction antérieure" label. */
	superseded_text_html?: string;
	cross_refs: string[];
	bible_refs: BibleRef[];
	citations: Citation[];
	magisterial_refs: MagisterialRefRecord[];
	parent_chapter_slug?: string;
}

export interface EnBrefBlock {
	parent_kind: 'chapter' | 'section';
	parent_slug: string;
	paragraphs: number[];
}

export interface Chapter {
	corpus: Corpus;
	slug: string;
	title: string;
	number?: number;
	part_slug: string;
	part_title: string;
	part_number?: number;
	section_slug: string;
	section_title: string;
	section_number?: number;
	paragraphs: number[];
	headings: ChapterHeading[];
	articles: ChapterArticle[];
	en_brefs: { paragraphs: number[] }[];
	prev?: ChapterAdjacent;
	next?: ChapterAdjacent;
}

/**
 * Pre-resolved navigation target for the chapter footer. The builder in
 * scripts/prepare/chapters.ts already routes through the section/part page
 * when crossing those boundaries AND the target page has its own intro
 * paragraphs (so the linear reader doesn't skip them). The consumer just
 * reads `href` / `title` and uses `kind` to pick the eyebrow label.
 */
export interface ChapterAdjacent {
	/** Already-routed link target. */
	href: string;
	/** Display title for the navigation card. */
	title: string;
	/** Selects the eyebrow label: "Chapitre suivant" / "Section suivante" /
	 *  "Partie suivante" (and the matching feminine prev forms). */
	kind: 'chapter' | 'section' | 'part';
}

/**
 * Eyebrow labels for chapter-footer navigation. Section/Partie are feminine
 * in French ("Section précédente"); Chapitre is masculine ("Chapitre précédent").
 */
export const ADJACENT_LABEL: Record<'prev' | 'next', Record<ChapterAdjacent['kind'], string>> = {
	prev: {
		chapter: '← Chapitre précédent',
		section: '← Section précédente',
		part: '← Partie précédente'
	},
	next: {
		chapter: 'Chapitre suivant →',
		section: 'Section suivante →',
		part: 'Partie suivante →'
	}
};

export interface ChapterArticle {
	slug: string;
	title: string;
	number?: number;
	paragraphs: number[];
	headings: ChapterHeading[];
	/**
	 * "Paragraphe N. TITLE" wrappers nested between an article and its
	 * Roman-numeral headings (when the upstream tree drops them but the raw
	 * source preserves them). Optional — only the long doctrinal articles
	 * carry these subdivisions.
	 */
	paragraphes?: ChapterParagraphe[];
}

export interface ChapterHeading {
	id: string;
	level: number;
	title: string;
	paragraph_start: number;
}

export interface ChapterParagraphe {
	number: number;
	title: string;
	paragraph_start: number;
}

export type StructureNodeType =
	| 'part'
	| 'section'
	| 'chapter'
	| 'article'
	| 'heading'
	| 'sub_heading';

export interface StructureNode {
	type: StructureNodeType | 'paragraph';
	title?: string;
	slug?: string;
	number?: number;
	children?: StructureNode[];
}

/**
 * Shapes produced by `scripts/prepare/structure.ts` and consumed by the
 * `+page.ts` route loaders. Sections and parts may carry intro paragraphs /
 * headings — paragraphs that live directly under them rather than inside any
 * chapter (e.g. §§185-197 for Section 2 of Part 1, Part 2's "Pourquoi la
 * Liturgie?" §§1066-1075). Articles_direct covers sections that expose
 * articles without an enclosing chapter (e.g. "Notre Père").
 */
export interface StructureArticle {
	slug: string;
	title: string;
	number?: number;
	paragraphs: number[];
}

export interface StructureChapter {
	slug: string;
	title: string;
	number?: number;
	paragraphs: number[];
}

export interface StructureSection {
	slug: string;
	title: string;
	number?: number;
	chapters: StructureChapter[];
	articles_direct?: StructureArticle[];
	intro_paragraphs?: number[];
	intro_headings?: ChapterHeading[];
	/** En Bref blocks nested directly under the section (outside any chapter).
	 *  Only some sections have these — the Décalogue's §§2075-2082 block is
	 *  the canonical example. */
	en_brefs?: { paragraphs: number[] }[];
}

export interface StructurePart {
	slug: string;
	title: string;
	number?: number;
	prologue?: boolean;
	sections: StructureSection[];
	intro_paragraphs?: number[];
	intro_headings?: ChapterHeading[];
}

export interface Structure {
	parts: StructurePart[];
}

export interface ThematicEntry {
	letter: string;
	term: string;
	subentries: ThematicSubEntry[];
}

export interface ThematicSubEntry {
	label: string;
	paragraphs: number[];
}

export interface SourceEntry {
	category: string;
	doc_name: string;
	location: string;
	paragraphs: number[];
}

export type AbbreviationMap = Record<string, string>;

export interface ParagraphRange {
	from: number;
	to: number;
}

export interface BreadcrumbLevel {
	slug: string;
	title: string;
	number?: number;
	range?: ParagraphRange;
}

export interface ParagraphContext {
	part: BreadcrumbLevel;
	section?: BreadcrumbLevel;
	chapter?: BreadcrumbLevel;
	article?: BreadcrumbLevel;
	heading?: { id: string; title: string };
}

// Per-verse CCC citation lookup, generated by scripts/prepare/bible-verse-index.ts.
// Shape: usfx → chapter → verse → paragraph numbers (sorted asc, deduped).
export type BibleVerseIndex = Record<string, Record<string, Record<string, number[]>>>;

// One NCL Bible book's verse text. Shape: chapter → verse → text.
export type NclBook = Record<string, Record<string, string>>;

// Full NCL Bible verse text. Shape: usfx → chapter → verse → text.
export type NclBible = Record<string, NclBook>;

/** A French section title from the NCL Bible (e.g. "La faute et le châtiment"). */
export interface NclSection {
	ch: number; // chapter where the section header appears
	startV: number; // first verse of the section
	title: string; // already-French native title
	/**
	 * Heading level:
	 * - 'major'      → <p style="ms1"> (e.g. "LES ORIGINES")
	 * - 'section'    → <s style="s1">  (e.g. "Création du monde")
	 * - 'subsection' → <s style="s2">  (detailed outline lines)
	 */
	level: 'major' | 'section' | 'subsection';
}

/** Per-book sections, sorted by (ch asc, startV asc). */
export type NclSectionMap = Record<string, NclSection[]>; // keyed by USFX

/**
 * A contiguous CCC paragraph range. A bare paragraph number is `{from: n, to: n}`.
 * Source ranges like `337-354` are preserved as a single entry so the UI can
 * render them as one "337-354" chip linking to `/cec/337-354`.
 */
export interface CccRange {
	from: number;
	to: number;
}

/**
 * A single Didache pericope: a verse range and its CCC paragraph references.
 * Title is the matching NCL section title (already French) or null.
 */
export interface ConcordancePericope {
	verseRef: string; // "Genèse 3:1-24"
	startCh: number;
	endCh: number;
	startVerse: number; // first verse in THIS chapter (for multi-chapter ranges, capped to chapter start)
	endVerse: number; // last verse in THIS chapter (capped to chapter end)
	pericopeTitle: string | null;
	cccRanges: CccRange[]; // contiguous CCC ranges, sorted by `from` asc
}

/** Per-chapter file shape, mirroring DR's FathersChapterFile. */
export interface ConcordanceChapter {
	pericopes: ConcordancePericope[];
	verseEntryCounts: Record<number, number>; // verse → number of pericopes that cover it
	totalEntries: number;
}

/** by-paragraph inverse: which Bible passages reference each CCC paragraph. */
export interface ConcordanceByParagraphEntry {
	slug: string; // bible book slug, e.g. "genese"
	usfx: string; // "GEN"
	bookFrenchName: string; // "Genèse"
	chapter: number;
	verseRef: string; // "Genèse 3:1-24"
	pericopeTitle: string | null;
	startCh: number;
	endCh: number;
	startVerse: number; // first verse of the pericope's first chapter
	endVerse: number; // last verse of the pericope's last chapter
	cccRanges: CccRange[]; // the pericope's full CCC ranges (post-filter, post-collapse)
}
export type ConcordanceByParagraph = Record<string, ConcordanceByParagraphEntry[]>;
// Keys are stringified paragraph numbers ("1850").

// Glossary (thematic index + Levada definitions). Built by
// scripts/prepare/glossary.ts.
export type GlossaryClusterId =
	| 'trinite'
	| 'christ'
	| 'esprit-saint'
	| 'eglise'
	| 'sacrements'
	| 'liturgie'
	| 'morale'
	| 'priere'
	| 'ecriture'
	| 'marie-saints'
	| 'fins-dernieres'
	| 'creation-homme';

export interface GlossarySubEntry {
	label: string;
	refs: number[];
}

export interface GlossaryEntry {
	slug: string;
	term: string;
	latin?: string;
	definition?: string;
	directRefs: number[];
	subEntries: GlossarySubEntry[];
	seeAlso: string[];
	clusters: GlossaryClusterId[];
	totalRefs: number;
	refsCovered: number[];
	standalone: boolean;
}

export interface GlossaryClusterMeta {
	id: GlossaryClusterId;
	label: string;
	short: string;
	description: string;
	order: number;
	count: number;
}

export interface GlossaryBundle {
	entries: GlossaryEntry[];
	clusters: GlossaryClusterMeta[];
	featured: string[]; // slugs of the top-cited entries
}

// ─── Compendium ───────────────────────────────────────────────────────────

export interface CompendiumQuestion {
	corpus: 'compendium';
	number: number;
	question: string;
	answer_html: string;
	ccc_refs: number[];
	bible_refs: BibleRef[];
}

export interface CompendiumHeadingNode {
	kind: 'heading';
	/**
	 * 2 = section (under a Part — large serif h2 with rule)
	 * 3 = subsection / "chapter" (medium ui h3 in accent)
	 * 4 = sub-subsection (smaller h4, muted)
	 */
	level: 2 | 3 | 4;
	id: string;
	title: string;
	/**
	 * Optional eyebrow rendered above/before the title. Used by the build
	 * pipeline to label Compendium chapters as "Chapitre I", "Chapitre II"
	 * etc. (level-3 entries get this; level-2 and level-4 don't).
	 */
	kicker?: string;
	/** First and last question numbers under this heading (range). */
	q_range?: [number, number];
}

export interface CompendiumEpigraphNode {
	kind: 'epigraph';
	text: string;
	attribution?: string;
}

export interface CompendiumQuestionNode {
	kind: 'question';
	data: CompendiumQuestion;
}

/** Static prose block (used by the appendix: doctrinal formulas, etc). */
export interface CompendiumProseNode {
	kind: 'prose';
	html: string;
}

/** Bilingual prayer block — French and Latin laid out side by side.
 *  `body` strings are plain text with `\n` between lines and `\n\n`
 *  between paragraphs; the renderer is responsible for line-break styling. */
export interface CompendiumPrayerNode {
	kind: 'prayer';
	fr: { title?: string; body: string };
	la: { title?: string; body: string };
}

export type CompendiumFlowNode =
	| CompendiumHeadingNode
	| CompendiumEpigraphNode
	| CompendiumQuestionNode
	| CompendiumProseNode
	| CompendiumPrayerNode;

export interface CompendiumPart {
	slug: string;
	number?: 1 | 2 | 3 | 4;
	title: string;
	flow: CompendiumFlowNode[];
}

export interface CompendiumStructureSection {
	title: string;
	subsections?: { title: string; q_range: [number, number] }[];
	q_range: [number, number];
}

export interface CompendiumStructurePart {
	slug: string;
	number: 1 | 2 | 3 | 4;
	title: string;
	sections: CompendiumStructureSection[];
}

export interface CompendiumStructure {
	parts: CompendiumStructurePart[];
	appendix?: { slug: 'annexe'; title: string };
}

export interface CompendiumQRange {
	part: string;
	from: number;
	to: number;
}

/** Reverse index: ccc paragraph number → compendium question numbers citing it. */
export type CompendiumCitedBy = Record<number, number[]>;
