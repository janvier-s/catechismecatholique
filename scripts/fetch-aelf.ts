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

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
	CalendrierDatesIndexFile,
	CalendrierIndexFile,
	CalendrierReadingsFile,
	CalendrierYearFile
} from './prepare/calendrier.ts';
import { readingsKey } from './prepare/calendrier.ts';
import { DATE_RANGE_START_YEAR, DATE_RANGE_END_YEAR } from './prepare/calendrierDates.ts';
import { buildWeekdayTargets } from './prepare/weekdayFeasts.ts';
import { pickReadingDateCandidates } from './aelf/pickReadingDate.ts';
import { pickMesse, type AelfMesse } from './aelf/pickMesse.ts';
import { KNOWN_AELF_GAPS } from './aelf/knownGaps.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'static', 'data', 'calendrier');
const OUT = join(HERE, 'data-sources', 'calendrier', 'readings.json');
const ZONE = 'romain';
const REQUEST_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AelfResponseBody {
	messes: AelfMesse[];
	informations?: { fete?: string; jour_liturgique_nom?: string };
}

const datesIndex: CalendrierDatesIndexFile = JSON.parse(
	readFileSync(join(DATA_DIR, 'dates-index.json'), 'utf8')
);
const index: CalendrierIndexFile = JSON.parse(readFileSync(join(DATA_DIR, 'index.json'), 'utf8'));
const yearFiles: CalendrierYearFile[] = (['a', 'b', 'c'] as const).map((key) =>
	JSON.parse(readFileSync(join(DATA_DIR, `annee-${key}.json`), 'utf8'))
);

const targets: { slug: string; yearKey?: 'a' | 'b' | 'c' }[] = [];
for (const yf of yearFiles)
	for (const feast of yf.feasts) targets.push({ slug: feast.slug, yearKey: yf.key });
for (const ff of index.fixed_feasts) targets.push({ slug: ff.slug });

/**
 * AELF's `informations.jour_liturgique_nom` for a date matching one of
 * these names means AELF's "romain" zone put that transferred solemnity on
 * this date - verified live: 2026-01-06 (Epiphany's fixed date) itself
 * comes back as a ferial "Mardi après l'Épiphanie", because Epiphany moved
 * to the preceding Sunday even under `zone: 'romain'`; same for Corpus
 * Christi moving from its Thursday to the following Sunday. This project's
 * romcal-computed dates do not apply that transfer, so a slug matching
 * `TRANSFERRED_SLUG_RE` must see one of these names, and every other slug
 * must NOT - either direction means the wrong day's content is en route.
 */
const TRANSFERRED_NAME_RE = /épiphanie|saint sacrement du corps et du sang du christ/i;
const TRANSFERRED_SLUG_RE = /epiphanie|corps-et-du-sang-du-christ/i;

/**
 * The date to actually ask AELF for, given a romcal-computed fixed date for
 * one of the two transferred solemnities - Epiphany moves to the Sunday
 * between Jan 2 and Jan 8; Corpus Christi moves from its Thursday to the
 * following Sunday. Verified live for both (see KNOWN_AELF_GAPS' comments).
 * Returns the input date unchanged for every other slug.
 */
function aelfQueryDate(romcalDate: string, slug: string): string {
	if (/epiphanie/i.test(slug)) {
		const year = Number(romcalDate.slice(0, 4));
		for (let day = 2; day <= 8; day++) {
			const candidate = new Date(Date.UTC(year, 0, day));
			if (candidate.getUTCDay() === 0) return candidate.toISOString().slice(0, 10);
		}
	}
	if (/corps-et-du-sang-du-christ/i.test(slug)) {
		const d = new Date(romcalDate + 'T00:00:00Z');
		d.setUTCDate(d.getUTCDate() + 3);
		return d.toISOString().slice(0, 10);
	}
	return romcalDate;
}

const today = new Date().toISOString().slice(0, 10);
const output: CalendrierReadingsFile = {};
const failures: string[] = [];

for (const { slug, yearKey } of targets) {
	const key = readingsKey(slug, yearKey);
	const candidates = pickReadingDateCandidates(datesIndex.rows, slug, today, yearKey);
	if (candidates.length === 0) {
		failures.push(`${key}: no past occurrence in the date index`);
		continue;
	}

	const weAreTransferredSolemnity = TRANSFERRED_SLUG_RE.test(slug);
	const attempted: string[] = [];
	let matchedDate: string | null = null;
	let matchedBody: AelfResponseBody | null = null;

	for (const romcalDate of candidates) {
		const date = aelfQueryDate(romcalDate, slug);
		attempted.push(date);
		let res: Response;
		try {
			res = await fetch(`https://api.aelf.org/v1/messes/${date}/${ZONE}`);
		} catch {
			await sleep(REQUEST_DELAY_MS);
			continue;
		}
		await sleep(REQUEST_DELAY_MS);
		if (!res.ok) continue;

		let body: AelfResponseBody;
		try {
			body = (await res.json()) as AelfResponseBody;
		} catch {
			continue;
		}

		const aelfName = body.informations?.jour_liturgique_nom ?? '';
		const looksTransferred = TRANSFERRED_NAME_RE.test(aelfName);
		if (looksTransferred !== weAreTransferredSolemnity) {
			console.warn(
				`fetch-aelf: ${key} (${date}) looked like the wrong day (AELF shows "${aelfName || 'unknown'}") · trying an earlier date`
			);
			continue;
		}

		matchedDate = date;
		matchedBody = body;
		break;
	}

	if (!matchedDate || !matchedBody) {
		if (key in KNOWN_AELF_GAPS) {
			console.warn(
				`fetch-aelf: skipping ${key}, still unresolved after trying ${attempted.join(', ')} (${KNOWN_AELF_GAPS[key]})`
			);
		} else {
			failures.push(
				`${key}: tried ${attempted.join(', ')} - no request succeeded and matched the expected feast`
			);
		}
		continue;
	}

	try {
		const { messe, warning } = pickMesse(matchedBody.messes ?? [], key);
		if (warning) console.warn(warning);
		output[key] = { date: matchedDate, lectures: messe.lectures };
	} catch (err) {
		failures.push((err as Error).message);
	}
}

const weekdayTargets = await buildWeekdayTargets(DATE_RANGE_START_YEAR, DATE_RANGE_END_YEAR, today);

for (const { slug, cycle, representativeDate } of weekdayTargets) {
	const key = readingsKey(slug, cycle);
	let res: Response;
	try {
		res = await fetch(`https://api.aelf.org/v1/messes/${representativeDate}/${ZONE}`);
	} catch {
		failures.push(`${key}: network error fetching ${representativeDate}`);
		await sleep(REQUEST_DELAY_MS);
		continue;
	}
	await sleep(REQUEST_DELAY_MS);
	if (!res.ok) {
		failures.push(`${key}: AELF returned ${res.status} for ${representativeDate}`);
		continue;
	}

	let body: AelfResponseBody;
	try {
		body = (await res.json()) as AelfResponseBody;
	} catch {
		failures.push(`${key}: unparseable AELF response for ${representativeDate}`);
		continue;
	}

	try {
		const { messe, warning } = pickMesse(body.messes ?? [], key);
		if (warning) console.warn(warning);
		output[key] = { date: representativeDate, lectures: messe.lectures };
	} catch (err) {
		failures.push((err as Error).message);
	}
}

if (failures.length > 0) {
	console.error(`fetch-aelf: ${failures.length} feast(s) failed to resolve:`);
	for (const f of failures) console.error(`  - ${f}`);
	process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(output, null, '\t') + '\n', 'utf8');
console.log(`fetch-aelf: wrote ${Object.keys(output).length} feasts to ${OUT}`);
