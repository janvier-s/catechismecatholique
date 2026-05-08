#!/usr/bin/env tsx
import {
	mkdirSync,
	rmSync,
	existsSync,
	lstatSync,
	statSync,
	readFileSync,
	writeFileSync,
	readdirSync,
	unlinkSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logHeader, logStep, endStep, assert } from './prepare/validators.ts';
import { buildStructure } from './prepare/structure.ts';
import { extractTocStructure, validateAgainstToc } from './prepare/toc-validator.ts';
import { extractParagraphs } from './prepare/paragraphs.ts';
import { extractParagraphes } from './prepare/paragraphes.ts';
import { fixCccParaSourceTypos, patchParagraph2267 } from './prepare/source-data-fixes.ts';
import { buildChapterFiles } from './prepare/chapters.ts';
import { extractEnBref, trimEnBrefsAtParagrapheBoundaries } from './prepare/enbref.ts';
import { parseSigles } from './prepare/abbreviations.ts';
import { processBibleIndex } from './prepare/bible-index.ts';
import { parseUSFX } from './prepare/ncl.ts';
import { buildParagraphContext } from './prepare/paragraph-context.ts';
import { buildCitedBy } from './prepare/cited-by.ts';
import { parseSourceTable } from './prepare/sources-index.ts';
import { prepareCompendium } from './prepare/compendium/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SOURCES = join(ROOT, 'scripts/data-sources');
const OUT = join(ROOT, 'static/data');

// CI sets SKIP_PREPARE_DATA=true because static/data is committed and
// there are no source symlinks to rebuild from. Bail immediately so we
// don't pay even the source-check overhead on every build.
if (process.env.SKIP_PREPARE_DATA === 'true') {
	console.log('prepare-data: SKIP_PREPARE_DATA set — using committed static data.');
	process.exit(0);
}

async function main() {
	const start = performance.now();
	logHeader('prepare-data');

	// Validate sources BEFORE wiping the output directory. CI environments
	// (and fresh clones without per-developer source symlinks) won't have
	// these files; in that case, if generated data is already on disk we use
	// it as-is and skip the rebuild. Only error if neither sources nor
	// generated data exist.
	logStep('checking sources');
	const expected = [
		'ccc_paras_processed.json',
		'ccc_bible_index_clean.json',
		'ccc_cross_refs_bidirectional.json',
		'sigles.xhtml',
		'toc.ncx',
		'thematic_cross-refs',
		'ncl/francl_usfx.xml',
		'compendium/Compendium.epub',
		'compendium/compendium_ccc.json'
	];
	const missing = expected.filter((f) => !existsSync(join(SOURCES, f)));
	if (missing.length > 0) {
		const hasGeneratedData =
			existsSync(join(OUT, 'cec/structure.json')) &&
			existsSync(join(OUT, 'cec/paragraphs')) &&
			readdirSync(join(OUT, 'cec/paragraphs')).length > 0;
		if (hasGeneratedData) {
			console.log(
				`prepare-data: source files missing (${missing.join(', ')}), but generated data exists at ${OUT} — skipping rebuild.`
			);
			return;
		}
		assert(false, `missing source: ${missing[0]}`);
	}
	endStep(`${expected.length} sources OK`);

	// Wipe + recreate output dir. If OUT is a symlink (e.g. when
	// bin/use-local-data-cache.sh has been used to escape iCloud
	// eviction), preserve the link and clear its target's contents
	// instead of deleting the link itself.
	if (existsSync(OUT)) {
		if (lstatSync(OUT).isSymbolicLink()) {
			for (const f of readdirSync(OUT)) rmSync(join(OUT, f), { recursive: true });
		} else {
			rmSync(OUT, { recursive: true });
		}
	}
	mkdirSync(join(OUT, 'cec'), { recursive: true });
	mkdirSync(join(OUT, 'cec/paragraphs'), { recursive: true });
	mkdirSync(join(OUT, 'cec/chapters'), { recursive: true });
	mkdirSync(join(OUT, 'cec/chapters-full'), { recursive: true });
	mkdirSync(join(OUT, 'cec/guide-de-lecture'), { recursive: true });
	mkdirSync(join(OUT, 'bible'), { recursive: true });

	logStep('building structure');
	const rawParts = JSON.parse(readFileSync(join(SOURCES, 'ccc_paras_processed.json'), 'utf8'));
	fixCccParaSourceTypos(rawParts);
	const structure = buildStructure(rawParts);
	writeFileSync(join(OUT, 'cec/structure.json'), JSON.stringify(structure, null, 2));
	// Slim variant for /cec/sommaire: full structure tree minus the
	// `paragraphs: number[]` arrays at chapter/article/etc levels (the sommaire
	// renders titles + headings, not paragraph numbers). Cuts the SSR HTML
	// payload of /cec/sommaire roughly in half.
	const stripParagraphArrays = (obj: unknown): unknown => {
		if (Array.isArray(obj)) return obj.map(stripParagraphArrays);
		if (obj && typeof obj === 'object') {
			const out: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(obj)) {
				if (k === 'paragraphs' && Array.isArray(v) && v.every((x) => typeof x === 'number'))
					continue;
				out[k] = stripParagraphArrays(v);
			}
			return out;
		}
		return obj;
	};
	writeFileSync(
		join(OUT, 'cec/structure-toc.json'),
		JSON.stringify(stripParagraphArrays(structure))
	);
	endStep(`${structure.parts.length} parts`);

	logStep('validating against toc.ncx');
	const tocXml = readFileSync(join(SOURCES, 'toc.ncx'), 'utf8');
	const tocPoints = await extractTocStructure(tocXml);
	validateAgainstToc(structure, tocPoints);
	endStep(`${tocPoints.length} navPoints`);

	logStep('extracting paragraphs');
	const paragraphs = extractParagraphs(rawParts);
	patchParagraph2267(paragraphs);
	for (const [n, p] of paragraphs) {
		writeFileSync(join(OUT, `cec/paragraphs/${n}.json`), JSON.stringify(p));
	}
	endStep(`${paragraphs.size} paragraphs`);

	logStep('building cited-by');
	const citedBy = buildCitedBy(paragraphs);
	writeFileSync(join(OUT, 'cec/cited-by.json'), JSON.stringify(citedBy));
	endStep(`${Object.keys(citedBy).length} paragraphs cited`);

	logStep('extracting en bref');
	const rawEnbref = extractEnBref(rawParts);
	endStep(`${rawEnbref.length} blocks`);

	logStep('extracting Paragraphes (mid-level wrappers)');
	const paragraphes = extractParagraphes(join(SOURCES, 'ccc_paras'));
	endStep(`${paragraphes.length} Paragraphes`);

	logStep('trimming en_bref blocks at Paragraphe boundaries');
	const enbref = trimEnBrefsAtParagrapheBoundaries(rawEnbref, paragraphes);
	const trimmedCount = enbref.filter(
		(b, i) => b.paragraphs.length !== rawEnbref[i]!.paragraphs.length
	).length;
	endStep(`${trimmedCount} blocks trimmed`);

	logStep('building chapters');
	const chapters = buildChapterFiles(structure, enbref, paragraphes);
	for (const ch of chapters) {
		writeFileSync(join(OUT, `cec/chapters/${ch.slug}.json`), JSON.stringify(ch));
	}
	endStep(`${chapters.length} chapters`);

	// Per-chapter bundle: chapter + ordered full paragraphs + en_bref map.
	// Lets the chapter route do ONE fetch instead of N+1 (was hitting the
	// Cloudflare Worker subrequest limit on chapters with 200+ paragraphs).
	logStep('building chapters-full bundles');
	let chaptersFullBytes = 0;
	for (const ch of chapters) {
		const enBrefNumbers = new Set<number>();
		for (const block of ch.en_brefs) for (const n of block.paragraphs) enBrefNumbers.add(n);
		const orderedParagraphs = ch.paragraphs
			.map((n) => paragraphs.get(n))
			.filter((p): p is NonNullable<typeof p> => Boolean(p));
		const enBrefParagraphMap: Record<number, (typeof orderedParagraphs)[number]> = {};
		for (const p of orderedParagraphs) {
			if (enBrefNumbers.has(p.number)) enBrefParagraphMap[p.number] = p;
		}
		// Some en_bref paragraphs may sit outside ch.paragraphs (data quirks).
		for (const n of enBrefNumbers) {
			if (!enBrefParagraphMap[n]) {
				const p = paragraphs.get(n);
				if (p) enBrefParagraphMap[n] = p;
			}
		}
		const bundle = { chapter: ch, paragraphs: orderedParagraphs, enBrefParagraphMap };
		const json = JSON.stringify(bundle);
		chaptersFullBytes += json.length;
		writeFileSync(join(OUT, `cec/chapters-full/${ch.slug}.json`), json);
	}
	endStep(`${chapters.length} bundles, ${(chaptersFullBytes / 1024 / 1024).toFixed(1)} MB total`);

	logStep('building headings index (autocomplete)');
	const { buildHeadingsIndex } = await import('./prepare/headings-index.ts');
	const headings = buildHeadingsIndex(structure, chapters);
	writeFileSync(join(OUT, 'cec/headings.json'), JSON.stringify(headings));
	endStep(`${headings.length} entries`);

	logStep('building paragraph context');
	const paragraphContext = buildParagraphContext(rawParts, structure);
	mkdirSync(join(OUT, 'cec/paragraph-context'), { recursive: true });
	for (const [n, ctx] of Object.entries(paragraphContext)) {
		writeFileSync(join(OUT, `cec/paragraph-context/${n}.json`), JSON.stringify(ctx));
	}
	endStep(`${Object.keys(paragraphContext).length} paragraphs mapped (sharded)`);

	logStep('parsing abbreviations');
	const sigles = readFileSync(join(SOURCES, 'sigles.xhtml'), 'utf8');
	const abbrs = parseSigles(sigles);
	writeFileSync(join(OUT, 'cec/abbreviations.json'), JSON.stringify(abbrs, null, 2));
	endStep(`${Object.keys(abbrs).length} entries`);

	logStep('building glossary');
	const { buildGlossary } = await import('./prepare/glossary.ts');
	const enGlossXml = readFileSync(join(SOURCES, 'ccc_glossary_en.xhtml'), 'utf8');
	const frGlossDir = join(SOURCES, 'thematic_cross-refs/index_thematique');
	const frGlossFiles = readdirSync(frGlossDir).filter((f) => f.endsWith('.xhtml'));
	const frGlossXml = new Map<string, string>();
	for (const f of frGlossFiles) frGlossXml.set(f, readFileSync(join(frGlossDir, f), 'utf8'));
	const glossary = buildGlossary(enGlossXml, frGlossXml);
	writeFileSync(join(OUT, 'cec/glossary.json'), JSON.stringify(glossary));
	// Slim variant for /glossaire index: just clusters + featured entries
	// (slug/term/totalRefs) + total count. The detail page (/glossaire/[term])
	// still loads the full glossary.json. Cuts the SSR HTML payload of
	// /glossaire from ~775 KB inline glossary down to a few KB.
	const featuredBySlug = new Map(glossary.entries.map((e) => [e.slug, e]));
	const slimGlossary = {
		totalEntries: glossary.entries.length,
		clusters: glossary.clusters,
		featured: glossary.featured
			.map((s) => featuredBySlug.get(s))
			.filter((e): e is NonNullable<typeof e> => Boolean(e))
			.map((e) => ({ slug: e.slug, term: e.term, totalRefs: e.totalRefs }))
	};
	writeFileSync(join(OUT, 'cec/glossary-index.json'), JSON.stringify(slimGlossary));
	endStep(
		`${glossary.entries.length} entries, ${glossary.clusters.length} clusters, ${glossary.featured.length} featured`
	);

	logStep('building search suggestions (related topics)');
	const { buildSearchSuggestions } = await import('./prepare/search-suggestions.ts');
	const searchSuggestions = buildSearchSuggestions(glossary);
	writeFileSync(join(OUT, 'cec/search-suggestions.json'), JSON.stringify(searchSuggestions));
	endStep(
		`${Object.keys(searchSuggestions.lookup).length} lookup keys, ${Object.keys(searchSuggestions.suggestions).length} entries`
	);

	logStep('parsing sources index');
	const sourcesDir = join(SOURCES, 'thematic_cross-refs/index_citations');
	const sourceFiles = readdirSync(sourcesDir).filter((f) => f.endsWith('.xhtml'));
	const sourceEntries = sourceFiles.flatMap((f) =>
		parseSourceTable(readFileSync(join(sourcesDir, f), 'utf8'))
	);
	writeFileSync(join(OUT, 'cec/sources-index.json'), JSON.stringify(sourceEntries, null, 2));
	endStep(`${sourceEntries.length} entries`);

	logStep('processing bible index');
	const knownParas = new Set(paragraphs.keys());
	const rawBibleIdx = JSON.parse(
		readFileSync(join(SOURCES, 'ccc_bible_index_clean.json'), 'utf8')
	) as Record<string, number[]>;
	const bibleIdx = processBibleIndex(rawBibleIdx, knownParas);
	writeFileSync(join(OUT, 'cec/bible-index.json'), JSON.stringify(bibleIdx));
	endStep(`${Object.keys(bibleIdx).length} bible refs`);

	logStep('parsing NCL bible');
	const nclXml = readFileSync(join(SOURCES, 'ncl/francl_usfx.xml'), 'utf8');
	const ncl = await parseUSFX(nclXml);

	// Per-book shards: each book gets its own /data/bible/ncl/{usfx}.json so
	// the Bible reader only fetches the book the user is on. The companion
	// manifest lists which USFX codes exist so callers can skip 404s.
	const nclDir = join(OUT, 'bible/ncl');
	mkdirSync(nclDir, { recursive: true });
	const nclUsfxCodes: string[] = [];
	for (const [usfx, bookData] of Object.entries(ncl)) {
		writeFileSync(join(nclDir, `${usfx}.json`), JSON.stringify(bookData));
		nclUsfxCodes.push(usfx);
	}
	nclUsfxCodes.sort();
	writeFileSync(join(nclDir, 'manifest.json'), JSON.stringify(nclUsfxCodes));
	endStep(`${Object.keys(ncl).length} books, ${nclUsfxCodes.length} shards`);

	logStep('building chapter counts');
	{
		const counts: Record<string, number> = {};
		for (const [usfx, chapters] of Object.entries(ncl)) {
			const max = Object.keys(chapters)
				.map(Number)
				.reduce((m, n) => Math.max(m, n), 0);
			counts[usfx] = max;
		}
		writeFileSync(join(OUT, 'bible/chapter-counts.json'), JSON.stringify(counts));
		endStep(`${Object.keys(counts).length} books`);
	}

	logStep('extracting NCL section titles');
	{
		const { parseNclSections } = await import('./prepare/ncl-sections.ts');
		const sections = parseNclSections(nclXml);
		writeFileSync(join(OUT, 'bible/ncl-sections.json'), JSON.stringify(sections));
		const total = Object.values(sections).reduce((t, arr) => t + arr.length, 0);
		endStep(`${Object.keys(sections).length} books, ${total} sections`);
	}

	logStep('building bible verse index');
	const { buildBibleVerseIndex } = await import('./prepare/bible-verse-index.ts');
	const { BOOKS } = await import('../src/lib/utils/bibleBookSlug.ts');
	const verseIdx = buildBibleVerseIndex(ncl, bibleIdx, BOOKS);
	writeFileSync(join(OUT, 'cec/bible-verse-index.json'), JSON.stringify(verseIdx));
	const verseCount = Object.values(verseIdx).reduce(
		(t, byCh) => t + Object.values(byCh).reduce((c, byV) => c + Object.keys(byV).length, 0),
		0
	);
	endStep(`${verseCount} verses indexed`);

	logStep('building concordance pericopes');
	{
		const { buildConcordancePericopes } = await import('./prepare/concordance.ts');
		const sourceDir =
			process.env.DIDACHE_SOURCE_DIR ?? join(ROOT, '..', 'DOCTRINA', 'sources', 'didache');

		const htmlFiles: string[] = [];
		try {
			const stat = statSync(sourceDir);
			if (!stat.isDirectory()) throw new Error(`not a directory: ${sourceDir}`);
			const entries = readdirSync(sourceDir, { withFileTypes: true, recursive: true });
			for (const ent of entries) {
				if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
					htmlFiles.push(readFileSync(join(ent.parentPath, ent.name), 'utf8'));
				}
			}
		} catch (e) {
			const err = e as NodeJS.ErrnoException;
			if (err.code === 'ENOENT' || err.message?.startsWith('not a directory:')) {
				console.warn(`  (no DIDACHE_SOURCE_DIR at ${sourceDir} — emitting empty concordance)`);
			} else {
				throw e;
			}
		}

		const nclSections = JSON.parse(readFileSync(join(OUT, 'bible/ncl-sections.json'), 'utf8'));
		const { byBook, byParagraph, manifest, stats } = buildConcordancePericopes(
			htmlFiles,
			ncl,
			knownParas,
			BOOKS,
			nclSections
		);

		const concordanceDir = join(OUT, 'concordance');
		mkdirSync(concordanceDir, { recursive: true });
		for (const [usfx, byCh] of Object.entries(byBook)) {
			const slug = BOOKS.find((b) => b.usfx === usfx)!.slug;
			const bookDir = join(concordanceDir, slug);
			mkdirSync(bookDir, { recursive: true });
			for (const [ch, chapter] of Object.entries(byCh)) {
				writeFileSync(join(bookDir, `${ch}.json`), JSON.stringify(chapter));
			}
		}
		writeFileSync(join(concordanceDir, 'manifest.json'), JSON.stringify(manifest));
		writeFileSync(join(concordanceDir, 'by-paragraph.json'), JSON.stringify(byParagraph));

		// Per-paragraph shards: each paragraph with concordance data gets its
		// own /data/concordance/by-paragraph/{n}.json so the panel only fetches
		// the entries it needs. The companion manifest lists which paragraph
		// numbers exist so callers can skip 404s.
		const byParagraphDir = join(concordanceDir, 'by-paragraph');
		mkdirSync(byParagraphDir, { recursive: true });
		const byParagraphNumbers: number[] = [];
		for (const [pNumStr, entries] of Object.entries(byParagraph)) {
			writeFileSync(join(byParagraphDir, `${pNumStr}.json`), JSON.stringify(entries));
			byParagraphNumbers.push(parseInt(pNumStr, 10));
		}
		byParagraphNumbers.sort((a, b) => a - b);
		writeFileSync(
			join(concordanceDir, 'by-paragraph-manifest.json'),
			JSON.stringify(byParagraphNumbers)
		);

		// Drop the old verse-index file if it still exists
		try {
			unlinkSync(join(OUT, 'cec/concordance-verse-index.json'));
		} catch {
			// File already gone — ignore.
		}

		if (stats.unknownBooks.length > 0)
			console.warn('  unknown books:', stats.unknownBooks.join(', '));
		if (stats.unknownParagraphs.length > 0)
			console.warn(`  ${stats.unknownParagraphs.length} unknown CCC paragraphs (dropped)`);
		if (stats.unparseableRanges.length > 0)
			console.warn(`  ${stats.unparseableRanges.length} unparseable ranges`);
		if (stats.booksWithZeroEntries.length > 0)
			console.warn(
				`  ${stats.booksWithZeroEntries.length} books with zero entries: ${stats.booksWithZeroEntries.join(', ')}`
			);
		if (stats.pericopesWithoutTitle > 0)
			console.warn(`  ${stats.pericopesWithoutTitle} pericopes without NCL title (kept titleless)`);
		endStep(`${stats.commentaryFiles} files, ${stats.pericopesEmitted} pericopes`);
	}

	logStep('building compendium');
	const COMPENDIUM_OUT = join(OUT, 'compendium');
	mkdirSync(COMPENDIUM_OUT, { recursive: true });
	const compendium = prepareCompendium({
		epubPath: join(SOURCES, 'compendium/Compendium.epub'),
		sourceJsonPath: join(SOURCES, 'compendium/compendium_ccc.json'),
		outDir: COMPENDIUM_OUT
	});
	endStep(`${compendium.questionDocs.length} compendium docs ready`);

	logStep('building search index');
	mkdirSync(join(OUT, 'search'), { recursive: true });
	const allParagraphs: import('../src/lib/data/types').Paragraph[] = [];
	for (const f of readdirSync(join(OUT, 'cec/paragraphs'))) {
		if (!f.endsWith('.json')) continue;
		allParagraphs.push(JSON.parse(readFileSync(join(OUT, 'cec/paragraphs', f), 'utf8')));
	}
	const allChapters: import('../src/lib/data/types').Chapter[] = [];
	for (const f of readdirSync(join(OUT, 'cec/chapters'))) {
		if (!f.endsWith('.json')) continue;
		allChapters.push(JSON.parse(readFileSync(join(OUT, 'cec/chapters', f), 'utf8')));
	}
	const { buildSearchIndex } = await import('./prepare/search-index.ts');
	const search = buildSearchIndex(
		allParagraphs,
		allChapters,
		paragraphContext,
		compendium.questionDocs
	);
	writeFileSync(join(OUT, 'search/search-index.json'), search.serialized);
	endStep(`${search.documents.length} docs (${(search.serialized.length / 1024).toFixed(1)} KB)`);

	const elapsed = ((performance.now() - start) / 1000).toFixed(2);
	process.stdout.write(`\nprepare-data complete in ${elapsed}s\n`);
}

main().catch((err) => {
	console.error(`\nprepare-data FAILED: ${err.message}`);
	process.exit(1);
});

export { ROOT, SOURCES, OUT };
