import type { RequestHandler } from './$types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BOOKS } from '$lib/utils/bibleBookSlug';
import { CORPORA } from '$lib/corpora';

export const prerender = true;

const SITE = 'https://catechismecatholique.fr';

/**
 * Build the URL list for every page worth indexing:
 *  · site-level statics (home, à-propos, /cec landing/sommaire/panorama, …)
 *  · /cec/{n} 1-2865 and /compendium/q/{n} 1-598 (the two largest
 *    paragraph-keyed corpora · not in CORPORA because their "unit"
 *    URLs are numeric ids generated independently of a structure file)
 *  · every Bible book + chapter
 *  · glossary clusters + entries
 *  · every shelved corpus' landing, extras, and structure-derived units
 *    (driven entirely by `src/lib/corpora.ts`)
 */
export const GET: RequestHandler = () => {
	const chapterCounts: Record<string, number> = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/bible/chapter-counts.json'), 'utf-8')
	);
	const glossary: { entries: { slug: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/cec/glossary.json'), 'utf-8')
	);
	const glossaryIndex: { clusters: { id: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/cec/glossary-index.json'), 'utf-8')
	);

	// Site-level static pages that aren't a corpus and aren't derivable.
	const sitePages = [
		'/',
		'/cec',
		'/cec/sommaire',
		'/cec/panorama',
		'/bible',
		'/glossaire',
		'/glossaire/tous',
		'/recherche',
		'/calendrier-liturgique',
		'/calendrier-liturgique/a',
		'/calendrier-liturgique/b',
		'/calendrier-liturgique/c',
		'/calendrier-liturgique/solennites',
		'/prieres-formules',
		'/bibliotheque',
		'/a-propos',
		'/mentions-legales'
	];

	// Every CCC paragraph (1..2865) and Compendium question (1..598).
	// Counts are stable promulgated figures; not derived from structure
	// because the structure JSONs don't expose a flat length and walking
	// the tree per build adds cost for zero practical benefit.
	const paragraphUrls = Array.from({ length: 2865 }, (_, i) => `/cec/${i + 1}`);
	const compendiumUrls = Array.from({ length: 598 }, (_, i) => `/compendium/q/${i + 1}`);

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

	// Every shelved corpus contributes (landing + extras + units). The
	// structure-file read is gated so a corpus that hasn't shipped data
	// yet doesn't fail the prerender.
	const corpusUrls: string[] = [];
	for (const c of CORPORA) {
		corpusUrls.push(c.sitemap.landing);
		if (c.sitemap.extraPaths) corpusUrls.push(...c.sitemap.extraPaths);
		if (c.sitemap.structureFile && c.sitemap.units) {
			const path = join(process.cwd(), c.sitemap.structureFile);
			try {
				const struct = JSON.parse(readFileSync(path, 'utf-8'));
				corpusUrls.push(...c.sitemap.units(struct));
			} catch (err) {
				console.warn(`[sitemap] skipping ${c.id} units: ${(err as Error).message}`);
			}
		}
	}

	// CPA's section list is small enough to keep inline · its structure
	// shape differs from every other corpus (a flat `sections` array
	// rather than a parts/chapters tree).
	const cpaStructure: { sections: { slug: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/catechisme-adultes/structure.json'), 'utf-8')
	);
	const cpaUrls = cpaStructure.sections.map((s) => `/catechisme-adultes/${s.slug}`);

	// Every calendrier feast/férie also has its own standalone page (see
	// /calendrier-liturgique/[annee]/[slug] and /calendrier-liturgique/feries)
	// distinct from the per-année listing pages already in sitePages above.
	const calendrierIndex: { fixed_feasts: { slug: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/calendrier/index.json'), 'utf-8')
	);
	const calendrierUrls: string[] = calendrierIndex.fixed_feasts.map(
		(f) => `/calendrier-liturgique/solennites/${f.slug}`
	);
	for (const key of ['a', 'b', 'c'] as const) {
		const yearFile: { feasts: { slug: string }[] } = JSON.parse(
			readFileSync(join(process.cwd(), `static/data/calendrier/annee-${key}.json`), 'utf-8')
		);
		calendrierUrls.push(...yearFile.feasts.map((f) => `/calendrier-liturgique/${key}/${f.slug}`));
	}
	for (const cycle of ['i', 'ii'] as const) {
		const feriesFile: { feasts: { slug: string }[] } = JSON.parse(
			readFileSync(join(process.cwd(), `static/data/calendrier/feries-${cycle}.json`), 'utf-8')
		);
		calendrierUrls.push(
			...feriesFile.feasts.map((f) => `/calendrier-liturgique/feries/${cycle}/${f.slug}`)
		);
	}

	const allUrls = [
		...sitePages,
		...paragraphUrls,
		...compendiumUrls,
		...bibleUrls,
		...glossaryUrls,
		...corpusUrls,
		...cpaUrls,
		...calendrierUrls
	];

	// Dedupe (corpus landings can overlap with sitePages).
	const unique = Array.from(new Set(allUrls));

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...unique.map((url) => `  <url><loc>${SITE}${url}</loc></url>`),
		'</urlset>'
	].join('\n');

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
