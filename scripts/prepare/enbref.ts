import { slugify } from './slug';

interface RawNode {
	type: string;
	title?: string;
	number?: number;
	children?: RawNode[];
}

const CHAPITRE_PREFIX =
	/^CHAPITRE\s+(PREMIER|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME|HUITIÈME|NEUVIÈME|DIXIÈME)?\s*[:.\s-]*/iu;
const SECTION_PREFIX =
	/^(PREMIÈRE|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME)\s+SECTION\s*[:.\s-]*/iu;

export interface ExtractedEnBref {
	parent_kind: 'chapter' | 'section';
	parent_slug: string;
	paragraphs: number[];
}

export function extractEnBref(parts: RawNode[]): ExtractedEnBref[] {
	const out: ExtractedEnBref[] = [];

	function collectParagraphs(n: RawNode, into: number[]) {
		if (n.type === 'paragraph' && typeof n.number === 'number') into.push(n.number);
		for (const c of n.children ?? []) collectParagraphs(c, into);
	}

	function walk(node: RawNode, chapterSlug: string | undefined, sectionSlug: string | undefined) {
		if (node.type === 'chapter' && node.title) {
			chapterSlug = slugify(node.title.replace(CHAPITRE_PREFIX, '').trim());
		}
		if (node.type === 'section' && node.title) {
			sectionSlug = slugify(node.title.replace(SECTION_PREFIX, '').trim());
		}
		if (node.type === 'en_bref') {
			const paragraphs: number[] = [];
			collectParagraphs(node, paragraphs);
			if (paragraphs.length > 0) {
				if (chapterSlug) {
					out.push({ parent_kind: 'chapter', parent_slug: chapterSlug, paragraphs });
				} else if (sectionSlug) {
					out.push({ parent_kind: 'section', parent_slug: sectionSlug, paragraphs });
				}
			}
			return;
		}
		for (const c of node.children ?? []) walk(c, chapterSlug, sectionSlug);
	}

	for (const p of parts) walk(p, undefined, undefined);
	return out;
}
