#!/usr/bin/env tsx
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
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

	// Wipe + recreate output dir
	if (existsSync(OUT)) rmSync(OUT, { recursive: true });
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
