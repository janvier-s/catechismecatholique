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
import { buildChapterFiles } from './prepare/chapters.ts';
import { extractEnBref } from './prepare/enbref.ts';
import { parseSigles } from './prepare/abbreviations.ts';
import { processBibleIndex } from './prepare/bible-index.ts';
import { parseUSFX } from './prepare/ncl.ts';
import { buildParagraphContext } from './prepare/paragraph-context.ts';
import { buildCitedBy } from './prepare/cited-by.ts';
import { parseSourceTable } from './prepare/sources-index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SOURCES = join(ROOT, 'scripts/data-sources');
const OUT = join(ROOT, 'static/data');

async function main() {
	const start = performance.now();
	logHeader('prepare-data');

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
	mkdirSync(join(OUT, 'ccc'), { recursive: true });
	mkdirSync(join(OUT, 'ccc/paragraphs'), { recursive: true });
	mkdirSync(join(OUT, 'ccc/chapters'), { recursive: true });
	mkdirSync(join(OUT, 'ccc/guide-de-lecture'), { recursive: true });
	mkdirSync(join(OUT, 'bible'), { recursive: true });

	// Validate sources exist
	logStep('checking sources');
	const expected = [
		'ccc_paras_processed.json',
		'ccc_bible_index_clean.json',
		'ccc_cross_refs_bidirectional.json',
		'sigles.xhtml',
		'toc.ncx',
		'thematic_cross-refs',
		'ncl/francl_usfx.xml'
	];
	for (const f of expected) {
		assert(existsSync(join(SOURCES, f)), `missing source: ${f}`);
	}
	endStep(`${expected.length} sources OK`);

	logStep('building structure');
	const rawParts = JSON.parse(readFileSync(join(SOURCES, 'ccc_paras_processed.json'), 'utf8'));
	const structure = buildStructure(rawParts);
	writeFileSync(join(OUT, 'ccc/structure.json'), JSON.stringify(structure, null, 2));
	endStep(`${structure.parts.length} parts`);

	logStep('validating against toc.ncx');
	const tocXml = readFileSync(join(SOURCES, 'toc.ncx'), 'utf8');
	const tocPoints = await extractTocStructure(tocXml);
	validateAgainstToc(structure, tocPoints);
	endStep(`${tocPoints.length} navPoints`);

	logStep('extracting paragraphs');
	const paragraphs = extractParagraphs(rawParts);
	for (const [n, p] of paragraphs) {
		writeFileSync(join(OUT, `ccc/paragraphs/${n}.json`), JSON.stringify(p));
	}
	endStep(`${paragraphs.size} paragraphs`);

	logStep('building cited-by');
	const citedBy = buildCitedBy(paragraphs);
	writeFileSync(join(OUT, 'ccc/cited-by.json'), JSON.stringify(citedBy));
	endStep(`${Object.keys(citedBy).length} paragraphs cited`);

	logStep('extracting en bref');
	const enbref = extractEnBref(rawParts);
	endStep(`${enbref.length} blocks`);

	logStep('building chapters');
	const chapters = buildChapterFiles(structure, enbref);
	for (const ch of chapters) {
		writeFileSync(join(OUT, `ccc/chapters/${ch.slug}.json`), JSON.stringify(ch));
	}
	endStep(`${chapters.length} chapters`);

	logStep('building paragraph context');
	const paragraphContext = buildParagraphContext(structure);
	writeFileSync(join(OUT, 'ccc/paragraph-context.json'), JSON.stringify(paragraphContext));
	endStep(`${Object.keys(paragraphContext).length} paragraphs mapped`);

	logStep('parsing abbreviations');
	const sigles = readFileSync(join(SOURCES, 'sigles.xhtml'), 'utf8');
	const abbrs = parseSigles(sigles);
	writeFileSync(join(OUT, 'ccc/abbreviations.json'), JSON.stringify(abbrs, null, 2));
	endStep(`${Object.keys(abbrs).length} entries`);

	logStep('building glossary');
	const { buildGlossary } = await import('./prepare/glossary.ts');
	const enGlossXml = readFileSync(join(SOURCES, 'ccc_glossary_en.xhtml'), 'utf8');
	const frGlossDir = join(SOURCES, 'thematic_cross-refs/index_thematique');
	const frGlossFiles = readdirSync(frGlossDir).filter((f) => f.endsWith('.xhtml'));
	const frGlossXml = new Map<string, string>();
	for (const f of frGlossFiles) frGlossXml.set(f, readFileSync(join(frGlossDir, f), 'utf8'));
	const glossary = buildGlossary(enGlossXml, frGlossXml);
	writeFileSync(join(OUT, 'ccc/glossary.json'), JSON.stringify(glossary));
	endStep(
		`${glossary.entries.length} entries, ${glossary.clusters.length} clusters, ${glossary.featured.length} featured`
	);

	logStep('parsing sources index');
	const sourcesDir = join(SOURCES, 'thematic_cross-refs/index_citations');
	const sourceFiles = readdirSync(sourcesDir).filter((f) => f.endsWith('.xhtml'));
	const sourceEntries = sourceFiles.flatMap((f) =>
		parseSourceTable(readFileSync(join(sourcesDir, f), 'utf8'))
	);
	writeFileSync(join(OUT, 'ccc/sources-index.json'), JSON.stringify(sourceEntries, null, 2));
	endStep(`${sourceEntries.length} entries`);

	logStep('processing bible index');
	const knownParas = new Set(paragraphs.keys());
	const rawBibleIdx = JSON.parse(
		readFileSync(join(SOURCES, 'ccc_bible_index_clean.json'), 'utf8')
	) as Record<string, number[]>;
	const bibleIdx = processBibleIndex(rawBibleIdx, knownParas);
	writeFileSync(join(OUT, 'ccc/bible-index.json'), JSON.stringify(bibleIdx));
	endStep(`${Object.keys(bibleIdx).length} bible refs`);

	logStep('parsing NCL bible');
	const nclXml = readFileSync(join(SOURCES, 'ncl/francl_usfx.xml'), 'utf8');
	const ncl = await parseUSFX(nclXml);
	writeFileSync(join(OUT, 'bible/ncl.json'), JSON.stringify(ncl));
	endStep(`${Object.keys(ncl).length} books`);

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
	writeFileSync(join(OUT, 'ccc/bible-verse-index.json'), JSON.stringify(verseIdx));
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

		// Drop the old verse-index file if it still exists
		try {
			unlinkSync(join(OUT, 'ccc/concordance-verse-index.json'));
		} catch {}

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

	logStep('building search index');
	mkdirSync(join(OUT, 'search'), { recursive: true });
	const allParagraphs: import('../src/lib/data/types').Paragraph[] = [];
	for (const f of readdirSync(join(OUT, 'ccc/paragraphs'))) {
		if (!f.endsWith('.json')) continue;
		allParagraphs.push(JSON.parse(readFileSync(join(OUT, 'ccc/paragraphs', f), 'utf8')));
	}
	const allChapters: import('../src/lib/data/types').Chapter[] = [];
	for (const f of readdirSync(join(OUT, 'ccc/chapters'))) {
		if (!f.endsWith('.json')) continue;
		allChapters.push(JSON.parse(readFileSync(join(OUT, 'ccc/chapters', f), 'utf8')));
	}
	const ctxs = JSON.parse(readFileSync(join(OUT, 'ccc/paragraph-context.json'), 'utf8'));
	const { buildSearchIndex } = await import('./prepare/search-index.ts');
	const search = buildSearchIndex(allParagraphs, allChapters, ctxs);
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
