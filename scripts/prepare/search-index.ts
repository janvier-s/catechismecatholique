import MiniSearch from 'minisearch';
import { searchTokenizer, processTerm } from '../../src/lib/utils/searchTokenizer';
import type { Paragraph, Chapter, ParagraphContext } from '../../src/lib/data/types';

export interface SearchDoc {
	id: string;
	kind: 'paragraph' | 'heading';
	number?: number;
	text: string;
	title?: string; // breadcrumb / chapter title
	paragraph_start?: number; // for heading hits — link target
	chapter_slug?: string;
}

const OPTIONS = {
	fields: ['text', 'title'],
	storeFields: ['kind', 'number', 'text', 'title', 'paragraph_start', 'chapter_slug'],
	tokenize: searchTokenizer,
	processTerm
};

function stripHtml(s: string): string {
	return s
		.replace(/<sup[^>]*>[^<]*<\/sup>/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function buildSearchIndex(
	paragraphs: Paragraph[],
	chapters: Chapter[],
	contexts: Record<number, ParagraphContext> // eslint-disable-line @typescript-eslint/no-unused-vars
): { documents: SearchDoc[]; serialized: string } {
	const docs: SearchDoc[] = [];

	for (const p of paragraphs) {
		// Don't index the breadcrumb (Part › Section › Chapter › Article) in
		// the searchable `title` field. The breadcrumb is navigation context,
		// not content; indexing it lets a query like "image de Dieu" pick up
		// every paragraph inside an article titled "Je crois en Dieu le Père"
		// just because the breadcrumb contains "Dieu". Body text alone is
		// the right unit.
		docs.push({
			id: `p:${p.number}`,
			kind: 'paragraph',
			number: p.number,
			text: stripHtml(p.text_html),
			title: ''
		});
	}

	for (const ch of chapters) {
		const collect = (h: { id: string; title: string; paragraph_start: number }) =>
			docs.push({
				id: `h:${ch.slug}#${h.id}`,
				kind: 'heading',
				text: h.title,
				title: ch.title,
				paragraph_start: h.paragraph_start,
				chapter_slug: ch.slug
			});
		for (const h of ch.headings) collect(h);
		for (const a of ch.articles) for (const h of a.headings) collect(h);
	}

	const ms = new MiniSearch(OPTIONS);
	ms.addAll(docs);
	return { documents: docs, serialized: JSON.stringify(ms.toJSON()) };
}
