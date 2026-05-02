#!/usr/bin/env tsx
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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
	mkdirSync(join(OUT, 'ccc/en-bref'), { recursive: true });
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

	logStep('building chapters');
	const chapters = buildChapterFiles(structure);
	for (const ch of chapters) {
		writeFileSync(join(OUT, `ccc/chapters/${ch.slug}.json`), JSON.stringify(ch));
	}
	endStep(`${chapters.length} chapters`);

	logStep('extracting en bref');
	const enbref = extractEnBref(rawParts);
	for (const block of enbref) {
		writeFileSync(join(OUT, `ccc/en-bref/${block.chapter_slug}.json`), JSON.stringify(block));
	}
	endStep(`${enbref.length} blocks`);

	logStep('parsing abbreviations');
	const sigles = readFileSync(join(SOURCES, 'sigles.xhtml'), 'utf8');
	const abbrs = parseSigles(sigles);
	writeFileSync(join(OUT, 'ccc/abbreviations.json'), JSON.stringify(abbrs, null, 2));
	endStep(`${Object.keys(abbrs).length} entries`);

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

	const elapsed = ((performance.now() - start) / 1000).toFixed(2);
	process.stdout.write(`\nprepare-data complete in ${elapsed}s\n`);
}

main().catch((err) => {
	console.error(`\nprepare-data FAILED: ${err.message}`);
	process.exit(1);
});

export { ROOT, SOURCES, OUT };
