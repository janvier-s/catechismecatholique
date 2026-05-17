export type Corpus =
	| 'ccc'
	| 'compendium'
	| 'trent'
	| 'pius-x-grand'
	| 'pius-x-petit'
	| 'catechisme-illustre'
	| 'denzinger'
	| 'boulanger'
	| 'cdse'
	| 'pgmr'
	| 'vatican-ii'
	| 'cic'
	| 'breviloquium'
	| 'didache'
	| 'discours-catechetique'
	| 'catecheses-mystagogiques'
	| 'catechisme-adultes'
	| 'documents-pontificaux'
	| 'calendrier';

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
	 * source preserves them). Optional · only the long doctrinal articles
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
 * headings · paragraphs that live directly under them rather than inside any
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
	 *  Only some sections have these · the Décalogue's §§2075-2082 block is
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

// Paragraph-level thematic refs from the catho.org concordance.
// Shape of /data/cec/paragraph-themes.json: paragraphNumber → [{name, slug}].
export interface ParagraphThemeRef {
	name: string; // Display name of the catho theme
	slug: string; // Glossary entry slug (may or may not exist as an entry)
}

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
	 * 2 = section (under a Part · large serif h2 with rule)
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

/** Bilingual prayer block · French and Latin laid out side by side.
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

// ─── Trent ───────────────────────────────────────────────────────────────────

export interface TrentParagraph {
	number: number;
	html: string;
}

export interface TrentFootnote {
	n: number;
	text: string;
}

export interface TrentNav {
	href: string;
	title: string;
	kind: 'section' | 'chapter';
}

export interface TrentSectionFile {
	corpus: 'trent';
	chapter_number: number;
	chapter_slug: string;
	chapter_title: string;
	part_slug: string;
	part_title: string;
	slug: string;
	title: string;
	ordinal: number;
	paragraph_numbers: number[];
	paragraphs: TrentParagraph[];
	footnotes: TrentFootnote[];
	prev?: TrentNav;
	next?: TrentNav;
}

export interface TrentChapterSection {
	slug: string;
	title: string;
	ordinal: number;
	paragraph_range: [number, number];
}

export interface TrentChapterFile {
	corpus: 'trent';
	number: number;
	slug: string;
	title: string;
	part_slug: string;
	part_title: string;
	sections: TrentChapterSection[];
	prev?: TrentNav;
	next?: TrentNav;
}

export interface TrentStructureSection {
	slug: string;
	title: string;
	ordinal: number;
	paragraph_range: [number, number];
}

export interface TrentStructureChapter {
	number: number;
	slug: string;
	title: string;
	paragraph_range: [number, number];
	sections: TrentStructureSection[];
}

export interface TrentStructurePart {
	slug: string;
	title: string;
	chapters: TrentStructureChapter[];
}

export interface TrentStructure {
	parts: TrentStructurePart[];
	total_paragraphs: number;
}

export interface TrentParagraphContext {
	corpus: 'trent';
	part: { slug: string; title: string };
	chapter: { number: number; slug: string; title: string };
	section: { slug: string; title: string; ordinal: number };
}

// ─── Grand Catéchisme (Pie X) ─────────────────────────────────────────────

export interface PiusXGrandQA {
	n: number;
	q: string;
	a: string;
}

export interface PiusXGrandSection {
	title: string | null;
	qa: PiusXGrandQA[];
}

export interface PiusXGrandNav {
	href: string;
	title: string;
	kind: 'chapter' | 'part';
}

export interface PiusXGrandChapterFile {
	corpus: 'pius-x-grand';
	part_slug: string;
	part_title: string;
	part_ordinal: number;
	slug: string;
	title: string;
	ordinal: number;
	sections: PiusXGrandSection[];
	qa_range: [number, number];
	prev?: PiusXGrandNav;
	next?: PiusXGrandNav;
}

export interface PiusXGrandStructureChapter {
	slug: string;
	title: string;
	ordinal: number;
	qa_range: [number, number];
	sections: { title: string | null; qa_range: [number, number] }[];
}

export interface PiusXGrandStructurePart {
	slug: string;
	title: string;
	ordinal: number;
	chapters: PiusXGrandStructureChapter[];
}

export interface PiusXGrandStructure {
	parts: PiusXGrandStructurePart[];
	total_qa: number;
}

// ─── Petit Catéchisme (Pie X 1912) ───────────────────────────────────────────

export interface PiusXPetitQA {
	n: number;
	q: string;
	a: string;
	required: boolean;
}

export interface PiusXPetitCommandment {
	roman: string;
	ordinal: number;
	biblical_text: string;
	qa: PiusXPetitQA[];
}

export interface PiusXPetitSection {
	title: string | null;
	qa: PiusXPetitQA[];
	commandments?: PiusXPetitCommandment[];
}

export interface PiusXPetitFootnote {
	n: number;
	text: string;
}

export interface PiusXPetitOraison {
	html: string;
	cite?: string;
}

export interface PiusXPetitEpigraph {
	text: string;
}

export interface PiusXPetitNav {
	href: string;
	title: string;
	kind: 'chapter' | 'part';
}

export interface PiusXPetitChapterFile {
	corpus: 'pius-x-petit';
	part_slug: string;
	part_title?: string;
	part_ordinal?: number;
	slug: string;
	title: string;
	ordinal?: number;
	epigraph?: PiusXPetitEpigraph;
	sections: PiusXPetitSection[];
	oraisons: PiusXPetitOraison[];
	footnotes: PiusXPetitFootnote[];
	qa_range: [number, number];
	prev?: PiusXPetitNav;
	next?: PiusXPetitNav;
}

export interface PiusXPetitStructureChapterSection {
	title: string;
	commandments?: { roman: string; ordinal: number; text: string }[];
}

export interface PiusXPetitStructureChapter {
	slug: string;
	title: string;
	ordinal: number;
	qa_range: [number, number];
	sections?: PiusXPetitStructureChapterSection[];
}

export interface PiusXPetitStructureSection {
	slug: string;
	title: string;
	chapters: PiusXPetitStructureChapter[];
}

export interface PiusXPetitStructurePart {
	slug: string;
	ordinal: number;
	title: string;
	subtitle?: string;
	qa_range: [number, number];
	chapters?: PiusXPetitStructureChapter[];
	sections?: PiusXPetitStructureSection[];
}

export interface PiusXPetitStructureIntro {
	slug: string;
	title: string;
	qa_range: [number, number];
	part_slug: string;
}

export interface PiusXPetitStructure {
	corpus: 'pius-x-petit';
	total_qa: number;
	intro: PiusXPetitStructureIntro;
	parts: PiusXPetitStructurePart[];
}

// ─── Liturgical calendar (calendrier) ──────────────────────────────────────

export type CalendrierSeason = 'avent' | 'noel' | 'careme' | 'pascal' | 'solennite' | 'ordinaire';
export type CalendrierYearKey = 'a' | 'b' | 'c';

export interface CalendrierCluster {
	i: number;
	theme: string;
	refs: string;
	paragraphs: number[];
}

export interface CalendrierFeast {
	slug: string;
	title: string;
	season: CalendrierSeason;
	clusters: CalendrierCluster[];
}

export interface CalendrierFixedFeast extends CalendrierFeast {
	date: string;
	month_index: number;
}

export interface CalendrierYearFile {
	key: CalendrierYearKey;
	feasts: CalendrierFeast[];
}

export interface CalendrierIndexFile {
	years: { key: CalendrierYearKey; total_feasts: number; total_clusters: number }[];
	fixed_feasts: CalendrierFixedFeast[];
	total_feasts: number;
	total_clusters: number;
}

// ─── Catéchisme illustré des vérités nécessaires (1897) ────────────────────

export interface CatIllustreImage {
	src: string;
	alt: string;
	caption: string;
}

export interface CatIllustreBlock {
	kind: 'para';
	n: number;
	html: string;
}

export interface CatIllustreQA {
	n: number;
	q: string;
	a: string;
}

export interface CatIllustreChapter {
	kind: 'chapter';
	ordinal: number;
	roman: string;
	slug: string;
	title: string;
	subtitle: string;
	image: CatIllustreImage | null;
	blocks: CatIllustreBlock[];
	questions: CatIllustreQA[];
	image_explanation_html: string;
}

export interface CatIllustreFlatPage {
	slug: string;
	title: string;
	kind: 'flat';
	html: string;
}

export interface CatIllustreStructureChapter {
	slug: string;
	ordinal: number;
	roman: string;
	title: string;
	subtitle: string;
	image_url: string | null;
}

export interface CatIllustreStructureFlat {
	slug: string;
	title: string;
}

export interface CatIllustreStructure {
	corpus: 'catechisme-illustre';
	title: string;
	subtitle: string;
	author: string;
	year: number;
	front_matter: CatIllustreStructureFlat[];
	chapters: CatIllustreStructureChapter[];
	back_matter: CatIllustreStructureFlat[];
}

// ─── Denzinger · Enchiridion Symbolorum (FR, JesusMarie 2006) ───────────────

export interface DenzingerEntry {
	n: number;
	anchor: string;
	html: string;
	section: string | null;
	chapter: string | null;
	document: string | null;
}

export interface DenzingerUnitChapter {
	title: string;
	anchor: string;
	first_n: number;
	last_n: number;
}

export interface DenzingerUnitSection {
	title: string;
	anchor: string;
	first_n: number;
	last_n: number;
	chapters: DenzingerUnitChapter[];
}

export interface DenzingerUnit {
	slug: string;
	title: string;
	breadcrumb: string[];
	part_slug: string | null;
	part_title: string | null;
	entries: DenzingerEntry[];
	sections: DenzingerUnitSection[];
	prev: { slug: string; title: string } | null;
	next: { slug: string; title: string } | null;
}

export interface DenzingerStructureUnit {
	slug: string;
	title: string;
	breadcrumb: string[];
	entry_count: number;
	first_n: number | null;
	last_n: number | null;
	sections: DenzingerUnitSection[];
}

export interface DenzingerStructurePart {
	slug: string;
	title: string;
	units: DenzingerStructureUnit[];
	unit_count: number;
	entry_count: number;
	first_n: number | null;
	last_n: number | null;
}

export interface DenzingerStructure {
	corpus: 'denzinger';
	title: string;
	subtitle: string;
	parts: DenzingerStructurePart[];
	all_numbers: number[];
	total_entries: number;
	total_units: number;
}

export interface DenzingerEntryIndex {
	[n: string]: { unit_slug: string };
}

// ─── Catéchisme Boulanger · La Doctrine catholique (1927) ───────────────────

export interface BoulangerBlock {
	section: 'mots' | 'developpement' | 'conclusion' | 'lectures' | 'questionnaire' | 'devoirs';
	/** `roman-heading`/`sub-heading` = pre-rendered h2/h3 chrome; `list` = <ol>;
	 *  `paragraph` = plain prose. Older `heading` blocks are stripped at build. */
	kind: 'paragraph' | 'roman-heading' | 'sub-heading' | 'list';
	html: string;
}

export interface BoulangerMiniTocChild {
	n: number;
	label: string;
	anchor: string;
}

export interface BoulangerMiniTocItem {
	n: number;
	roman: string;
	label: string;
	anchor: string;
	children: BoulangerMiniTocChild[];
}

export interface BoulangerLesson {
	slug: string;
	tome: number;
	tome_title: string;
	n: number;
	title: string;
	mini_toc: BoulangerMiniTocItem[];
	blocks: BoulangerBlock[];
}

export interface BoulangerStructureLessonRef {
	slug: string;
	n: number;
	title: string;
}

export interface BoulangerSommaireLesson {
	slug: string;
	mini_toc: BoulangerMiniTocItem[];
}

export interface BoulangerSommaireTome {
	n: number;
	title: string;
	lessons: BoulangerSommaireLesson[];
}

export interface BoulangerSommaire {
	tomes: BoulangerSommaireTome[];
}

export interface BoulangerStructureTome {
	n: number;
	title: string;
	lessons: BoulangerStructureLessonRef[];
}

export interface BoulangerStructure {
	tomes: BoulangerStructureTome[];
}

// ─── CDSE · Compendium de la doctrine sociale de l'Église (2004) ──────────

export type CdseBlock =
	| { kind: 'heading'; level: number; anchor: string; title: string }
	| { kind: 'paragraph'; n: number; anchor: string; html: string; footnoteRefs: number[] };

export interface CdseFootnote {
	n: number;
	html: string;
	cccRefs: number[];
}

export interface CdseChapter {
	slug: string;
	n: number | null;
	title: string;
	partSlug: string;
	partTitle: string;
	blocks: CdseBlock[];
	footnotes: CdseFootnote[];
}

export interface CdseChapterRef {
	slug: string;
	n: number | null;
	title: string;
	paragraphRange: [number, number] | null;
}

export interface CdsePartRef {
	slug: string;
	kind: 'front' | 'intro' | 'part' | 'conclusion' | 'index';
	title: string;
	chapters: CdseChapterRef[];
}

export interface CdseStructure {
	parts: CdsePartRef[];
	totalParagraphs: number;
}

export interface CdseParagraphLocator {
	chapterSlug: string;
	partSlug: string;
}

// ─── PGMR · Présentation Générale du Missel Romain (2002) ─────────────────

export type PgmrBlock =
	| { kind: 'heading'; level: number; anchor: string; title: string }
	| { kind: 'paragraph'; n: number; anchor: string; html: string; footnoteRefs: number[] };

export interface PgmrFootnote {
	n: number;
	html: string;
	cccRefs: number[];
}

export interface PgmrChapter {
	slug: string;
	n: number | null;
	title: string;
	blocks: PgmrBlock[];
	footnotes: PgmrFootnote[];
}

export interface PgmrChapterRef {
	slug: string;
	n: number | null;
	title: string;
	paragraphRange: [number, number] | null;
}

export interface PgmrStructure {
	chapters: PgmrChapterRef[];
	totalParagraphs: number;
}

export interface PgmrParagraphLocator {
	chapterSlug: string;
}

// ─── Vatican II (1962-1965) ────────────────────────────────────────────────

export type VatIIDocKind = 'constitution' | 'declaration' | 'decree';

export type VatIIBlock =
	| { kind: 'heading'; level: number; anchor: string; title: string }
	| {
			kind: 'paragraph';
			n: number;
			anchor: string;
			title?: string;
			html: string;
			footnoteRefs: number[];
	  };

export interface VatIIFootnote {
	n: number;
	html: string;
}

export interface VatIITocEntry {
	level: number;
	anchor: string;
	title: string;
	n?: number;
}

export interface VatIIDocRef {
	slug: string;
	abbr: string;
	kind: VatIIDocKind;
	date: string;
	title: string;
	subtitle: string;
	totalParagraphs: number;
	present: boolean;
}

export interface VatIIStructure {
	docs: VatIIDocRef[];
}

export interface VatIIDoc {
	slug: string;
	abbr: string;
	kind: VatIIDocKind;
	date: string;
	title: string;
	subtitle: string;
	blocks: VatIIBlock[];
	footnotes: VatIIFootnote[];
	toc: VatIITocEntry[];
}

// ─── Code de Droit Canonique (CIC, 1917 + 1983) ──────────────────────────

export type CicCode = '1983' | '1917';

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

// ─── Patristique (Didachè, Discours catéchétique, …) ──────────────────────

export type PatBlock =
	| { kind: 'paragraph'; n?: number; html: string }
	| { kind: 'subheading'; anchor: string; text: string }
	| { kind: 'epigraph'; html: string };

export interface PatChapterRef {
	slug: string;
	ordinal: number;
	roman: string;
	label: string;
	title?: string;
	subheadings?: { anchor: string; text: string }[];
}

export interface PatStructure {
	slug: string;
	title: string;
	subtitle?: string;
	author: string;
	date: string;
	translator: string;
	chapters: PatChapterRef[];
	totalChapters: number;
}

export interface PatChapter {
	slug: string;
	workSlug: string;
	workTitle: string;
	ordinal: number;
	roman: string;
	label: string;
	title?: string;
	blocks: PatBlock[];
	prev?: { slug: string; label: string };
	next?: { slug: string; label: string };
}

export interface PatFull {
	structure: PatStructure;
	chapters: PatChapter[];
}

// ─── Catéchisme pour Adultes des Évêques de France (1991) ─────────────────

export type CpaBlock = { kind: 'paragraph'; n?: number; html: string };

export interface CpaChapter {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number];
	blocks: CpaBlock[];
}

export interface CpaChapterRef {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number];
}

export interface CpaSection {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number] | null;
	chapters: CpaChapterRef[];
}

export interface CpaSectionFull {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number] | null;
	chapters: CpaChapter[];
	prev?: { slug: string; title: string };
	next?: { slug: string; title: string };
}

export interface CpaStructure {
	slug: 'catechisme-adultes';
	title: string;
	subtitle: string;
	author: string;
	date: string;
	source: string;
	sections: CpaSection[];
	totalChapters: number;
	totalParagraphs: number;
}

// ─── Breviloquium (Saint Bonaventure, 1257) ────────────────────────────────

export type BrevPartKind = 'prologue' | 'partie' | 'conclusion';

export interface BrevChapterRef {
	slug: string;
	title: string;
	ordinal: number;
	label: string;
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

// ─── IBP · Dieu ────────────────────────────────────────────────────────────

export type DieuBlock =
	| { kind: 'heading'; level: 2 | 3; title: string; anchor: string }
	| { kind: 'paragraph'; html: string }
	| { kind: 'definition'; term: string; html: string }
	| { kind: 'image'; src: string; alt: string };

export interface DieuChapterRef {
	slug: string;
	n: number;
	title: string;
}

export interface DieuStructure {
	chapters: DieuChapterRef[];
}

export interface DieuChapter {
	slug: string;
	n: number;
	title: string;
	blocks: DieuBlock[];
}

export type LiturgieBlock =
	| { kind: 'heading'; level: 2 | 3 | 4; title: string; anchor: string }
	| { kind: 'callout-heading'; title: string; anchor: string }
	| { kind: 'paragraph'; html: string }
	| { kind: 'quote'; html: string }
	| { kind: 'definition'; term: string; html: string }
	| { kind: 'image'; src: string; alt: string };

export interface LiturgieChapter {
	slug: string;
	n: number;
	title: string;
	blocks: LiturgieBlock[];
}

export interface BonPasteurPlaylistVideo {
	id: string;
	title: string;
	thumbnail: string;
	duration: string;
	views: string;
}

export interface BonPasteurPlaylist {
	playlistId: string;
	playlistTitle: string;
	fetchedAt: string;
	videos: BonPasteurPlaylistVideo[];
}
