#!/usr/bin/env tsx
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logHeader, logStep, endStep, assert } from './prepare/validators.ts';

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

	// Subsequent tasks plug in their step here.

	const elapsed = ((performance.now() - start) / 1000).toFixed(2);
	process.stdout.write(`\nprepare-data complete in ${elapsed}s\n`);
}

main().catch((err) => {
	console.error(`\nprepare-data FAILED: ${err.message}`);
	process.exit(1);
});

export { ROOT, SOURCES, OUT };
