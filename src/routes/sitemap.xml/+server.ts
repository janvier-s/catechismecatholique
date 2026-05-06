import type { RequestHandler } from './$types';
import type { Structure, GlossaryBundle } from '$lib/data/types';

function url(origin: string, path: string): string {
	return `<url><loc>${origin}${path}</loc></url>`;
}

export const GET: RequestHandler = async ({ fetch, url: reqUrl }) => {
	const origin = reqUrl.origin;

	const [struct, glossary]: [Structure, GlossaryBundle] = await Promise.all([
		fetch('/data/ccc/structure.json').then((r) => r.json()),
		fetch('/data/ccc/glossary.json').then((r) => r.json())
	]);

	const urls: string[] = [];

	// Static pages
	urls.push(url(origin, '/'));
	urls.push(url(origin, '/ccc'));
	urls.push(url(origin, '/ccc/sommaire'));
	urls.push(url(origin, '/glossaire'));
	urls.push(url(origin, '/glossaire/tous'));

	// CCC structural hierarchy
	for (const part of struct.parts) {
		urls.push(url(origin, `/ccc/${part.slug}`));
		for (const section of part.sections ?? []) {
			urls.push(url(origin, `/ccc/${part.slug}/${section.slug}`));
			for (const chapter of section.chapters ?? []) {
				urls.push(url(origin, `/ccc/${part.slug}/${section.slug}/${chapter.slug}`));
			}
			for (const article of section.articles_direct ?? []) {
				urls.push(url(origin, `/ccc/${part.slug}/${section.slug}/${article.slug}`));
			}
		}
	}

	// Chapter articles — loaded lazily via the chapter JSON files
	// (skipped here to avoid fetching every chapter file at sitemap build time;
	//  they're reachable through the chapter pages above)

	// Glossary clusters
	for (const cluster of glossary.clusters ?? []) {
		urls.push(url(origin, `/glossaire/c/${cluster.id}`));
	}

	// Glossary terms
	for (const entry of glossary.entries ?? []) {
		urls.push(url(origin, `/glossaire/${entry.slug}`));
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
