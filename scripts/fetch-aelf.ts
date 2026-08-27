#!/usr/bin/env tsx
// scripts/fetch-aelf.ts
// Fetches Mass reading text from the AELF API (api.aelf.org) for every
// curated feast/Sunday in the calendrier data, and writes the result to
// scripts/data-sources/calendrier/readings.json.
//
// Run manually, occasionally (e.g. when a new feast is added to
// CCC_Liturgy_List.txt, or to pick up a text correction upstream) · not part
// of the normal prebuild, since AELF only serves real content for dates that
// have already occurred and this project's date range runs to 2035. Every
// Sunday/solemnity's readings are locked to its liturgical cycle or its
// fixed calendar date, not to the specific civil year, so one past
// occurrence per feast is enough.
//
// Usage:  npm run fetch-aelf
//
// Requires static/data/calendrier/{dates-index,index,annee-a,annee-b,annee-c}.json
// to already exist (run `npm run prepare-data` first if they don't).

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
	CalendrierDatesIndexFile,
	CalendrierIndexFile,
	CalendrierReadingsFile,
	CalendrierYearFile
} from './prepare/calendrier.ts';
import { pickReadingDate } from './aelf/pickReadingDate.ts';
import { pickMesse, type AelfMesse } from './aelf/pickMesse.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'static', 'data', 'calendrier');
const OUT = join(HERE, 'data-sources', 'calendrier', 'readings.json');
const ZONE = 'romain';
const REQUEST_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const datesIndex: CalendrierDatesIndexFile = JSON.parse(
	readFileSync(join(DATA_DIR, 'dates-index.json'), 'utf8')
);
const index: CalendrierIndexFile = JSON.parse(readFileSync(join(DATA_DIR, 'index.json'), 'utf8'));
const yearFiles: CalendrierYearFile[] = (['a', 'b', 'c'] as const).map((key) =>
	JSON.parse(readFileSync(join(DATA_DIR, `annee-${key}.json`), 'utf8'))
);

const slugs: string[] = [];
for (const yf of yearFiles) for (const feast of yf.feasts) slugs.push(feast.slug);
for (const ff of index.fixed_feasts) slugs.push(ff.slug);

const today = new Date().toISOString().slice(0, 10);
const output: CalendrierReadingsFile = {};
const failures: string[] = [];

for (const slug of slugs) {
	const date = pickReadingDate(datesIndex.rows, slug, today);
	if (!date) {
		failures.push(`${slug}: no past occurrence in the date index`);
		continue;
	}

	let res: Response;
	try {
		res = await fetch(`https://api.aelf.org/v1/messes/${date}/${ZONE}`);
	} catch (err) {
		failures.push(`${slug} (${date}): request failed · ${(err as Error).message}`);
		continue;
	}
	if (!res.ok) {
		failures.push(`${slug} (${date}): AELF returned ${res.status}`);
		continue;
	}

	let body: { messes: AelfMesse[] };
	try {
		body = (await res.json()) as { messes: AelfMesse[] };
	} catch {
		failures.push(`${slug} (${date}): AELF response was not valid JSON`);
		continue;
	}

	try {
		const { messe, warning } = pickMesse(body.messes ?? [], slug);
		if (warning) console.warn(warning);
		output[slug] = { date, lectures: messe.lectures };
	} catch (err) {
		failures.push((err as Error).message);
		continue;
	}

	await sleep(REQUEST_DELAY_MS);
}

if (failures.length > 0) {
	console.error(`fetch-aelf: ${failures.length} feast(s) failed to resolve:`);
	for (const f of failures) console.error(`  - ${f}`);
	process.exit(1);
}

writeFileSync(OUT, JSON.stringify(output, null, '\t') + '\n', 'utf8');
console.log(`fetch-aelf: wrote ${Object.keys(output).length} feasts to ${OUT}`);
