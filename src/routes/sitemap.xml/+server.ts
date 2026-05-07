import type { RequestHandler } from './$types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BOOKS } from '$lib/utils/bibleBookSlug';

export const prerender = true;

const SITE = 'https://catechismecatholique.fr';

export const GET: RequestHandler = () => {
	const chapterCounts: Record<string, number> = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/bible/chapter-counts.json'), 'utf-8')
	);
	const glossary: { entries: { slug: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/ccc/glossary.json'), 'utf-8')
	);
	const glossaryIndex: { clusters: { id: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/ccc/glossary-index.json'), 'utf-8')
	);

	const staticPages = [
		'/',
		'/ccc',
		'/ccc/sommaire',
		'/ccc/panorama',
		'/bible',
		'/glossaire',
		'/glossaire/tous',
		'/recherche',
		'/a-propos',
		'/mentions-legales'
	];

	const paragraphUrls = Array.from({ length: 2865 }, (_, i) => `/ccc/${i + 1}`);

	const bibleUrls: string[] = [];
	for (const book of BOOKS) {
		bibleUrls.push(`/bible/${book.slug}`);
		const chapCount = chapterCounts[book.usfx] ?? 0;
		for (let ch = 1; ch <= chapCount; ch++) {
			bibleUrls.push(`/bible/${book.slug}/${ch}`);
		}
	}

	const glossaryUrls = [
		...glossaryIndex.clusters.map((c) => `/glossaire/c/${c.id}`),
		...glossary.entries.map((e) => `/glossaire/${e.slug}`)
	];

	const allUrls = [...staticPages, ...paragraphUrls, ...bibleUrls, ...glossaryUrls];

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...allUrls.map((url) => `  <url><loc>${SITE}${url}</loc></url>`),
		'</urlset>'
	].join('\n');

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
