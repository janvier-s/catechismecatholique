#!/usr/bin/env tsx
// Standalone glossary build — runs just the glossary step from prepare-data
// and writes static/data/ccc/glossary.json. Useful for iterating on the
// glossary without re-running the entire data pipeline.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGlossary } from './prepare/glossary.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SOURCES = join(ROOT, 'scripts/data-sources');
const OUT = join(ROOT, 'static/data/ccc');

function main() {
	const start = performance.now();
	const enXml = readFileSync(join(SOURCES, 'ccc_glossary_en.xhtml'), 'utf8');
	const frDir = join(SOURCES, 'thematic_cross-refs/index_thematique');
	const frFiles = readdirSync(frDir).filter((f) => f.endsWith('.xhtml'));
	const frXml = new Map<string, string>();
	for (const f of frFiles) frXml.set(f, readFileSync(join(frDir, f), 'utf8'));

	const g = buildGlossary(enXml, frXml);

	if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
	writeFileSync(join(OUT, 'glossary.json'), JSON.stringify(g));

	const ms = (performance.now() - start).toFixed(0);
	console.log(
		`glossary built in ${ms}ms — ${g.entries.length} entries, ${g.clusters.length} clusters, ${g.featured.length} featured`
	);
}

main();
