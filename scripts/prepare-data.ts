#!/usr/bin/env tsx
import {
	mkdirSync,
	rmSync,
	existsSync,
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
import { prepareCdse } from './prepare/cdse/index.ts';
import { preparePgmr } from './prepare/pgmr/index.ts';
import { prepareBreviloquium } from './prepare/breviloquium/index.ts';
import { preparePatristique } from './prepare/patristique/index.ts';
import { prepareCpa } from './prepare/cpa/index.ts';
import { prepareVaticanII } from './prepare/vatican-ii/index.ts';
import { prepareCic } from './prepare/cic/index.ts';
import { prepareCecAi } from './prepare/cec-ai.ts';
import { prepareTrent } from './prepare/trent.ts';
import { preparePiusXGrand } from './prepare/pius-x-grand.ts';
import { preparePiusXPetit } from './prepare/pius-x-petit.ts';
import { prepareCalendrier } from './prepare/calendrier.ts';

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
	//
	// Preserve directories whose source isn't part of this repo and that we
	// commit as a snapshot. Without this, a `prepare-data` run on a machine
	// missing DIDACHE_SOURCE_DIR wipes the 3000-file concordance and the
	// build's "using committed snapshot" path has nothing to fall back to.
	const PRESERVE = new Set(['concordance', 'prieres', 'bon-pasteur', 'vatican-ii']);
	if (existsSync(OUT)) {
		// Same wipe strategy whether OUT is a symlink (clear target's
		// contents) or a real dir (here we used to rmSync the whole dir, but
		// that obliterated the preserved subtrees too).
		for (const f of readdirSync(OUT)) {
			if (PRESERVE.has(f)) continue;
			rmSync(join(OUT, f), { recursive: true });
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

	// Build catho paragraph-themes inverted index
	const { buildParagraphThemesIndex } = await import('./prepare/glossary-catho.ts');
	const paragraphThemes = buildParagraphThemesIndex(glossary.newEntrySlugs ?? new Map());
	writeFileSync(join(OUT, 'cec/paragraph-themes.json'), JSON.stringify(paragraphThemes));
	logStep(`paragraph-themes: ${Object.keys(paragraphThemes).length} paragraphs indexed`);

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
		let sourcePresent = true;
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
				sourcePresent = false;
			} else {
				throw e;
			}
		}

		// When the source dir is missing OR contains no HTML files, keep the
		// committed snapshot. Writing an empty concordance here used to clobber
		// the entire /data/concordance/ tree (3000+ files) on every dev build —
		// the link disappeared site-wide.
		if (!sourcePresent || htmlFiles.length === 0) {
			endStep(
				sourcePresent
					? 'no source files — using committed snapshot'
					: 'source not found — using committed snapshot'
			);
		} else {
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
				console.warn(
					`  ${stats.pericopesWithoutTitle} pericopes without NCL title (kept titleless)`
				);
			endStep(`${stats.commentaryFiles} files, ${stats.pericopesEmitted} pericopes`);
		}
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

	logStep('building Compendium de la doctrine sociale (CDSE)');
	const cdseEpub = join(SOURCES, 'cdse/CDSE.epub');
	const cdseOutDir = join(OUT, 'cdse');
	if (existsSync(cdseEpub)) {
		mkdirSync(cdseOutDir, { recursive: true });
		const cdse = prepareCdse({ epubPath: cdseEpub, outDir: cdseOutDir });
		endStep(
			`${cdse.structure.totalParagraphs} paragraphs, ${Object.keys(cdse.chapters).length} chapters`
		);
	} else if (existsSync(cdseOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	logStep('building Présentation Générale du Missel Romain (PGMR)');
	const pgmrHtml = join(SOURCES, 'pgmr/source.html');
	const pgmrOutDir = join(OUT, 'pgmr');
	if (existsSync(pgmrHtml)) {
		mkdirSync(pgmrOutDir, { recursive: true });
		const pgmr = preparePgmr({ htmlPath: pgmrHtml, outDir: pgmrOutDir });
		endStep(
			`${pgmr.structure.totalParagraphs} paragraphs, ${Object.keys(pgmr.chapters).length} chapters`
		);
	} else if (existsSync(pgmrOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	logStep('building Vatican II');
	const vatIIEpubDir = join(SOURCES, 'vatican-ii/epubs');
	const vatIIOutDir = join(OUT, 'vatican-ii');
	if (existsSync(vatIIEpubDir)) {
		mkdirSync(vatIIOutDir, { recursive: true });
		const vatII = prepareVaticanII({ epubDir: vatIIEpubDir, outDir: vatIIOutDir });
		const present = vatII.structure.docs.filter((d) => d.present).length;
		endStep(`${present}/${vatII.structure.docs.length} docs`);
	} else if (existsSync(vatIIOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	logStep('building patristic catecheses (Didachè + Discours)');
	const patSources = join(SOURCES, 'patristique');
	if (existsSync(patSources)) {
		preparePatristique({ sourcesDir: patSources, outDirRoot: OUT });
		endStep('done');
	} else {
		endStep('source dir not found — skipped');
	}

	logStep('building Catéchisme pour Adultes (Évêques de France)');
	const cpaMd = join(SOURCES, 'cpa/source.md');
	const cpaOutDir = join(OUT, 'catechisme-adultes');
	if (existsSync(cpaMd)) {
		mkdirSync(cpaOutDir, { recursive: true });
		const cpa = prepareCpa({ markdownPath: cpaMd, outDir: cpaOutDir });
		endStep(`${cpa.structure.totalChapters} chapters, ${cpa.structure.totalParagraphs} paragraphs`);
	} else if (existsSync(cpaOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	logStep('building Breviloquium (Saint Bonaventure)');
	const brevHtml = join(SOURCES, 'breviloquium/source.html');
	const brevOutDir = join(OUT, 'breviloquium');
	if (existsSync(brevHtml)) {
		mkdirSync(brevOutDir, { recursive: true });
		const brev = prepareBreviloquium({ htmlPath: brevHtml, outDir: brevOutDir });
		endStep(`${brev.structure.parts.length} parts, ${brev.structure.totalChapters} chapters`);
	} else if (existsSync(brevOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	logStep('building Code de Droit Canonique (1917 + 1983)');
	const cicEpub = join(SOURCES, 'cic/cic.epub');
	const cicOutDir = join(OUT, 'cic');
	if (existsSync(cicEpub)) {
		mkdirSync(cicOutDir, { recursive: true });
		const cic = prepareCic({ epubPath: cicEpub, outDir: cicOutDir });
		const livre83 = cic.structure.codes.find((c) => c.code === '1983')!.livres.length;
		const livre17 = cic.structure.codes.find((c) => c.code === '1917')!.livres.length;
		endStep(
			`1983: ${livre83} livres / ${Object.keys(cic.canons['1983']).length} canons · ` +
				`1917: ${livre17} livres / ${Object.keys(cic.canons['1917']).length} canons`
		);
	} else if (existsSync(cicOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	const cecAiDir = join(OUT, 'cec/ai');
	const cecAi = prepareCecAi({
		sourceDir: join(SOURCES, 'cec-ai'),
		outDir: cecAiDir
	});
	void cecAi;

	logStep('building Trent catechism');
	const trentSourceDir = join(SOURCES, 'trent');
	if (existsSync(trentSourceDir)) {
		const trentOutDir = join(OUT, 'trent');
		mkdirSync(trentOutDir, { recursive: true });
		const trent = prepareTrent({ sourceDir: trentSourceDir, outDir: trentOutDir });
		endStep(
			`${trent.totalChapters} chapters, ${trent.totalSections} sections, ${trent.totalParagraphs} paragraphs`
		);
	} else {
		endStep('source not found — skipped');
	}

	logStep('building Grand Catéchisme (Pie X)');
	const piusXGrandSourceDir = join(SOURCES, 'pius-x-grand');
	if (existsSync(piusXGrandSourceDir)) {
		const piusXGrandOutDir = join(OUT, 'pius-x-grand');
		mkdirSync(piusXGrandOutDir, { recursive: true });
		const piusX = preparePiusXGrand({ sourceDir: piusXGrandSourceDir, outDir: piusXGrandOutDir });
		endStep(`${piusX.totalParts} parts, ${piusX.totalChapters} chapters, ${piusX.totalQA} Q&A`);
	} else {
		endStep('source not found — skipped');
	}

	logStep('building Petit Catéchisme (Pie X 1912)');
	const piusXPetitRawDir = new URL('./prepare/pius-x-petit/_raw', import.meta.url).pathname;
	if (existsSync(piusXPetitRawDir)) {
		const piusXPetitOutDir = join(OUT, 'pius-x-petit');
		mkdirSync(piusXPetitOutDir, { recursive: true });
		const petit = preparePiusXPetit({ rawDir: piusXPetitRawDir, outDir: piusXPetitOutDir });
		endStep(`${petit.totalQA} Q&A`);
	} else {
		endStep('source not found — skipped');
	}

	// Copy the pre-extracted appendix JSONs (Histoire de la Révélation, Année
	// liturgique, Instructions aux éducateurs) into the live data dir. Source
	// of truth lives under scripts/prepare/pius-x-petit/_appendices/, generated
	// by the local extract-*.py scripts (which need the source PDF — not
	// available on CI, so we ship the JSON alongside the scripts).
	logStep('copying Petit Catéchisme appendices');
	const piusXPetitAppDir = new URL('./prepare/pius-x-petit/_appendices', import.meta.url).pathname;
	if (existsSync(piusXPetitAppDir)) {
		const dest = join(OUT, 'pius-x-petit', 'appendices');
		mkdirSync(dest, { recursive: true });
		let copied = 0;
		for (const f of readdirSync(piusXPetitAppDir)) {
			if (!f.endsWith('.json')) continue;
			writeFileSync(join(dest, f), readFileSync(join(piusXPetitAppDir, f)));
			copied++;
		}
		endStep(`${copied} appendices`);
	} else {
		endStep('source not found — skipped');
	}

	logStep('extracting Denzinger (Enchiridion Symbolorum — catho.org HTML)');
	const denzingerCacheDir = join(SOURCES, 'denzinger/cache');
	const denzingerOutDir = join(OUT, 'enchiridion');
	if (existsSync(denzingerCacheDir) || existsSync(join(SOURCES, 'denzinger'))) {
		mkdirSync(denzingerOutDir, { recursive: true });
		const script = new URL('./prepare/denzinger/extract.py', import.meta.url).pathname;
		const { spawnSync } = await import('node:child_process');
		const proc = spawnSync('python3', [script], { stdio: 'inherit' });
		if (proc.status !== 0) {
			throw new Error(`denzinger extract.py failed (exit ${proc.status})`);
		}
		endStep('entries written');
	} else if (existsSync(denzingerOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	logStep('extracting Catéchisme Boulanger (La Doctrine catholique)');
	const boulangerSourceDoc = join(SOURCES, 'boulanger/source.doc');
	const boulangerSourceHtml = join(SOURCES, 'boulanger/source.html');
	const boulangerOutDir = join(OUT, 'boulanger');
	if (existsSync(boulangerSourceDoc) || existsSync(boulangerSourceHtml)) {
		mkdirSync(boulangerOutDir, { recursive: true });
		const script = new URL('./prepare/boulanger/extract.py', import.meta.url).pathname;
		const { spawnSync } = await import('node:child_process');
		const proc = spawnSync('python3', [script], { stdio: 'inherit' });
		if (proc.status !== 0) {
			throw new Error(`boulanger extract.py failed (exit ${proc.status})`);
		}
		endStep('lessons written');
	} else if (existsSync(boulangerOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	logStep('extracting Catéchisme illustré (Wikisource EPUB)');
	const catIllustreEpub = join(SOURCES, 'catechisme-illustre/source.epub');
	const catIllustreOutDir = join(OUT, 'catechisme-illustre');
	if (existsSync(catIllustreEpub)) {
		mkdirSync(catIllustreOutDir, { recursive: true });
		const script = new URL('./prepare/catechisme-illustre/extract.py', import.meta.url).pathname;
		const { spawnSync } = await import('node:child_process');
		const proc = spawnSync('python3', [script], { stdio: 'inherit' });
		if (proc.status !== 0) {
			throw new Error(`extract.py failed (exit ${proc.status})`);
		}
		endStep('chapters + images written');
	} else if (existsSync(catIllustreOutDir)) {
		endStep('source not found — using committed snapshot');
	} else {
		endStep('source not found — skipped');
	}

	logStep('building liturgical calendar');
	const calendrierSourceDir = join(SOURCES, 'calendrier');
	if (existsSync(calendrierSourceDir)) {
		const calendrierOutDir = join(OUT, 'calendrier');
		mkdirSync(calendrierOutDir, { recursive: true });
		const cal = prepareCalendrier({ sourceDir: calendrierSourceDir, outDir: calendrierOutDir });
		endStep(`${cal.totalFeasts} feasts (${cal.totalFixed} fixed), ${cal.totalClusters} clusters`);
	} else {
		endStep('source not found — skipped');
	}

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
	// Collect CDSE paragraphs for the search index. If the CDSE shards exist
	// (built earlier in this run or already committed), flatten them into
	// {number, text, chapterSlug, chapterTitle} docs.
	const cdseSearchDocs: import('./prepare/search-index.ts').CdseSearchDoc[] = [];
	const cdseChaptersDir = join(OUT, 'cdse/chapters');
	if (existsSync(cdseChaptersDir)) {
		type CdseChapterShard = {
			slug: string;
			title: string;
			blocks: ({ kind: 'paragraph'; n: number; html: string } | { kind: 'heading' })[];
		};
		for (const f of readdirSync(cdseChaptersDir)) {
			if (!f.endsWith('.json')) continue;
			const ch = JSON.parse(readFileSync(join(cdseChaptersDir, f), 'utf8')) as CdseChapterShard;
			for (const b of ch.blocks) {
				if (b.kind !== 'paragraph') continue;
				const text = b.html
					.replace(/<sup[^>]*>[^<]*<\/sup>/g, '')
					.replace(/<[^>]+>/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();
				cdseSearchDocs.push({
					number: b.n,
					text,
					chapterSlug: ch.slug,
					chapterTitle: ch.title
				});
			}
		}
	}
	const search = buildSearchIndex(
		allParagraphs,
		allChapters,
		paragraphContext,
		compendium.questionDocs,
		cdseSearchDocs
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
