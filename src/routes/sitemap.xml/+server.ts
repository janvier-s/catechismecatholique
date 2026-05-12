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
		readFileSync(join(process.cwd(), 'static/data/cec/glossary.json'), 'utf-8')
	);
	const glossaryIndex: { clusters: { id: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/cec/glossary-index.json'), 'utf-8')
	);

	const staticPages = [
		'/',
		'/cec',
		'/cec/sommaire',
		'/cec/panorama',
		'/compendium',
		'/compendium/sommaire',
		'/compendium/1-profession-de-la-foi',
		'/compendium/2-celebration-du-mystere',
		'/compendium/3-vie-dans-le-christ',
		'/compendium/4-priere-chretienne',
		'/petit-catechisme',
		'/petit-catechisme/sommaire',
		'/petit-catechisme/0-intro',
		'/petit-catechisme/1-credo',
		'/petit-catechisme/2-morale',
		'/petit-catechisme/3-moyens-grace',
		'/petit-catechisme/annee-liturgique',
		'/petit-catechisme/educateurs',
		'/petit-catechisme/histoire-revelation',
		'/catechisme-illustre',
		'/catechisme-illustre/sommaire',
		'/catechisme-illustre/preface',
		'/catechisme-illustre/introduction',
		'/catechisme-illustre/1-dieu',
		'/catechisme-illustre/2-homme',
		'/catechisme-illustre/3-homme-apres-le-peche',
		'/catechisme-illustre/4-sauveur',
		'/catechisme-illustre/5-enseignement-du-sauveur',
		'/catechisme-illustre/6-rachat-du-monde',
		'/catechisme-illustre/7-mission-des-apotres',
		'/catechisme-illustre/8-bapteme',
		'/catechisme-illustre/9-deux-routes',
		'/catechisme-illustre/10-fin',
		'/catechisme-illustre/11-enfer',
		'/catechisme-illustre/12-ciel',
		'/catechisme-illustre/avis',
		'/catechisme-illustre/prieres',
		'/enchiridion',
		'/enchiridion/sommaire',
		'/prieres-formules',
		'/bible',
		'/glossaire',
		'/glossaire/tous',
		'/recherche',
		'/a-propos',
		'/mentions-legales',
		'/bibliotheque',
		'/encycliques',
		'/calendrier',
		'/grand-catechisme',
		'/grand-catechisme/sommaire',
		'/trente',
		'/trente/sommaire',
		'/doctrine-catholique',
		'/doctrine-sociale',
		'/pgmr',
		'/vatican-ii',
		'/cic',
		'/cic/1983',
		'/cic/1917',
		'/breviloquium',
		'/didache',
		'/discours-catechetique',
		'/catecheses-mystagogiques',
		'/catechisme-adultes'
	];

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

	const denzingerStructure: {
		parts: { units: { slug: string }[] }[];
	} = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/enchiridion/structure.json'), 'utf-8')
	);
	const denzingerUrls: string[] = [];
	for (const part of denzingerStructure.parts) {
		for (const unit of part.units) {
			denzingerUrls.push(`/enchiridion/${unit.slug}`);
		}
	}

	const boulangerStructure: {
		tomes: { lessons: { slug: string }[] }[];
	} = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/boulanger/structure.json'), 'utf-8')
	);
	const boulangerUrls: string[] = ['/doctrine-catholique', '/doctrine-catholique/sommaire'];
	for (const tome of boulangerStructure.tomes) {
		for (const lesson of tome.lessons) {
			boulangerUrls.push(`/doctrine-catholique/${lesson.slug}`);
		}
	}

	// CIC · both codes, every livre
	const cicStructure: { codes: { code: string; livres: { slug: string }[] }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/cic/structure.json'), 'utf-8')
	);
	const cicUrls: string[] = [];
	for (const code of cicStructure.codes) {
		for (const livre of code.livres) {
			cicUrls.push(`/cic/${code.code}/${livre.slug}`);
		}
	}

	// Vatican II · every document
	const vatIIStructure: { docs: { slug: string; present?: boolean }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/vatican-ii/structure.json'), 'utf-8')
	);
	const vatIIUrls = vatIIStructure.docs
		.filter((d) => d.present !== false)
		.map((d) => `/vatican-ii/${d.slug}`);

	// PGMR + Doctrine sociale (CDSE) · per-chapter pages
	const pgmrStructure: { chapters: { slug: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/pgmr/structure.json'), 'utf-8')
	);
	const pgmrUrls = pgmrStructure.chapters.map((c) => `/pgmr/${c.slug}`);

	const cdseStructure: { parts: { chapters: { slug: string }[] }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/cdse/structure.json'), 'utf-8')
	);
	const cdseUrls: string[] = [];
	for (const part of cdseStructure.parts) {
		for (const ch of part.chapters) cdseUrls.push(`/doctrine-sociale/${ch.slug}`);
	}

	// Breviloquium · every chapter
	const brevStructure: { parts: { chapters: { slug: string }[] }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/breviloquium/structure.json'), 'utf-8')
	);
	const brevUrls: string[] = [];
	for (const part of brevStructure.parts) {
		for (const ch of part.chapters) brevUrls.push(`/breviloquium/${ch.slug}`);
	}

	// Catéchisme pour Adultes · every section page
	const cpaStructure: { sections: { slug: string }[] } = JSON.parse(
		readFileSync(join(process.cwd(), 'static/data/catechisme-adultes/structure.json'), 'utf-8')
	);
	const cpaUrls = cpaStructure.sections.map((s) => `/catechisme-adultes/${s.slug}`);

	// Patristique single-page works: just the landing pages (already in
	// staticPages). Chapter anchors live under hash fragments and don't
	// need their own sitemap entries.

	const allUrls = [
		...staticPages,
		...paragraphUrls,
		...compendiumUrls,
		...bibleUrls,
		...glossaryUrls,
		...denzingerUrls,
		...boulangerUrls,
		...cicUrls,
		...vatIIUrls,
		...pgmrUrls,
		...cdseUrls,
		...brevUrls,
		...cpaUrls
	];

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
