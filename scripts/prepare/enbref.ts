import { slugify } from './slug';
import type { EnBrefBlock } from '../../src/lib/data/types';

interface RawNode {
	type: string;
	title?: string;
	number?: number;
	children?: RawNode[];
}

const CHAPITRE_PREFIX =
	/^CHAPITRE\s+(PREMIER|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME|HUITIÈME|NEUVIÈME|DIXIÈME)?\s*[:.\s-]*/iu;

export function extractEnBref(parts: RawNode[]): EnBrefBlock[] {
	const bySlug = new Map<string, number[]>();
	const order: string[] = [];

	function collectParagraphs(n: RawNode, into: number[]) {
		if (n.type === 'paragraph' && typeof n.number === 'number') into.push(n.number);
		for (const c of n.children ?? []) collectParagraphs(c, into);
	}

	function walk(node: RawNode, currentChapterSlug: string | undefined) {
		let chapterSlug = currentChapterSlug;
		if (node.type === 'chapter' && node.title) {
			chapterSlug = slugify(node.title.replace(CHAPITRE_PREFIX, '').trim());
		}
		if (node.type === 'en_bref' && chapterSlug) {
			const paragraphs: number[] = [];
			collectParagraphs(node, paragraphs);
			if (!bySlug.has(chapterSlug)) {
				bySlug.set(chapterSlug, []);
				order.push(chapterSlug);
			}
			bySlug.get(chapterSlug)!.push(...paragraphs);
			return; // don't descend further into en_bref (paragraphs already collected)
		}
		for (const c of node.children ?? []) walk(c, chapterSlug);
	}

	for (const p of parts) walk(p, undefined);
	return order.map((slug) => ({ chapter_slug: slug, paragraphs: bySlug.get(slug)! }));
}
