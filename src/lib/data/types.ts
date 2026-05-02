export type Corpus = 'ccc';

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
	type: 'magisterial' | 'patristic' | 'liturgical';
	abbr?: string;
	raw: string;
	idx?: string;
	doc_raw?: string;
}

export interface Paragraph {
	corpus: Corpus;
	number: number;
	text_html: string;
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
	prev?: { slug: string; title: string };
	next?: { slug: string; title: string };
}

export interface ChapterArticle {
	slug: string;
	title: string;
	number?: number;
	paragraphs: number[];
	headings: ChapterHeading[];
}

export interface ChapterHeading {
	id: string;
	level: number;
	title: string;
	paragraph_start: number;
}

export type StructureNodeType = 'part' | 'section' | 'chapter' | 'article' | 'heading' | 'sub_heading';

export interface StructureNode {
	type: StructureNodeType | 'paragraph';
	title?: string;
	slug?: string;
	number?: number;
	children?: StructureNode[];
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
	doc_abbr?: string;
	citations: SourceCitation[];
}

export interface SourceCitation {
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
