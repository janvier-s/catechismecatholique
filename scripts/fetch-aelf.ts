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

/**
 * When set, read `{date}_{zone}.json` files from this directory instead of
 * hitting the live API - each file must have the exact shape AELF's own
 * `/v1/messes/{date}/{zone}` endpoint returns. Lets this script run fully
 * offline against a pre-fetched local mirror, useful in sandboxed
 * environments with no network access. Cache reads skip the rate-limit
 * sleep and the weekday loop's retry/backoff entirely, since neither is
 * meaningful for a local disk read.
 */
const AELF_CACHE_DIR = process.env.AELF_CACHE_DIR;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AelfResponseBody {
	messes: AelfMesse[];
	informations?: { fete?: string; jour_liturgique_nom?: string };
}

interface AelfFetchResult {
	ok: boolean;
	status: number;
	json: () => Promise<AelfResponseBody>;
}

/**
 * Fetches one date/zone's AELF response, from `AELF_CACHE_DIR` when set, or
 * the live API otherwise. Mimics just enough of `fetch()`'s `Response`
 * shape (`ok`/`status`/`json()`) that both loops below work unchanged
 * regardless of source.
 */
async function aelfFetch(date: string, zone: string): Promise<AelfFetchResult> {
	if (AELF_CACHE_DIR) {
		try {
			const raw = readFileSync(join(AELF_CACHE_DIR, `${date}_${zone}.json`), 'utf8');
			return { ok: true, status: 200, json: async () => JSON.parse(raw) as AelfResponseBody };
		} catch {
			return {
				ok: false,
				status: 404,
				json: async () => {
					throw new Error(`fetch-aelf: no cached body for ${date}_${zone}`);
				}
			};
		}
	}
	const res = await fetch(`https://api.aelf.org/v1/messes/${date}/${zone}`);
	return { ok: res.ok, status: res.status, json: () => res.json() as Promise<AelfResponseBody> };
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
// The previous run's file, if any · only used to carry a weekday entry over
// when this run couldn't refetch it (see the weekday loop below).
function readExistingReadings(): CalendrierReadingsFile {
	try {
		return JSON.parse(readFileSync(OUT, 'utf8')) as CalendrierReadingsFile;
	} catch {
		return {};
	}
}
const existingReadings = readExistingReadings();
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
		let res: AelfFetchResult;
		try {
			res = await aelfFetch(date, ZONE);
		} catch {
			if (!AELF_CACHE_DIR) await sleep(REQUEST_DELAY_MS);
			continue;
		}
		if (!AELF_CACHE_DIR) await sleep(REQUEST_DELAY_MS);
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
		} else if (existingReadings[key]) {
			// Every candidate date was unresolvable this run (e.g. AELF_CACHE_DIR
			// doesn't reach back far enough for this feast's most recent past
			// occurrence) - keep the previous run's text rather than discarding
			// already-good data over a coverage gap in this run specifically.
			output[key] = existingReadings[key];
			console.warn(
				`fetch-aelf: ${key} unresolved this run (tried ${attempted.join(', ')}) · kept the previous run's text`
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

/**
 * Weekday targets are ~632 extra live requests on top of the Sunday pass, so a
 * single blip must not cost the whole run: `failures` is fatal (it exits
 * before anything is written), which would discard the Sunday data too.
 * Transport-level trouble (network error, 5xx, unparseable body) is retried
 * with a short backoff. A weekday target has only one candidate date (no
 * fallback the way the Sunday loop's multi-candidate retry has), so a non-5xx
 * failure - typically AELF answering 404 because it has no archived content
 * for that specific past date - is a permanent, un-fixable-by-retry gap for
 * this one target, not evidence the target itself is wrong. Both cases are
 * therefore only warned about and the target is left out of this run, picked
 * up by a later one. `pickMesse` throwing (the response came back ok but had
 * no usable messe) is the one case still recorded as a real failure, since
 * that points at an actual bug in our own matching logic, not a data gap.
 */
const WEEKDAY_ATTEMPTS = 3;
const WEEKDAY_RETRY_BACKOFF_MS = 1000;
const skippedWeekdays: string[] = [];

for (const { slug, cycle, representativeDate } of weekdayTargets) {
	const key = readingsKey(slug, cycle);
	let body: AelfResponseBody | null = null;
	let lastTransientReason = '';

	const attempts = AELF_CACHE_DIR ? 1 : WEEKDAY_ATTEMPTS;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		if (attempt > 1) await sleep(WEEKDAY_RETRY_BACKOFF_MS * (attempt - 1));
		let res: AelfFetchResult;
		try {
			res = await aelfFetch(representativeDate, ZONE);
		} catch {
			lastTransientReason = `network error fetching ${representativeDate}`;
			if (!AELF_CACHE_DIR) await sleep(REQUEST_DELAY_MS);
			continue;
		}
		if (!AELF_CACHE_DIR) await sleep(REQUEST_DELAY_MS);
		if (!res.ok) {
			if (!AELF_CACHE_DIR && res.status >= 500) {
				lastTransientReason = `AELF returned ${res.status} for ${representativeDate}`;
				continue;
			}
			// Unlike the Sunday loop, a weekday target has exactly one candidate
			// date (romcal already picked an unambiguous representative
			// occurrence) - a non-5xx failure here (typically 404, AELF simply
			// has no archived content for that specific past date) is therefore
			// a permanent, un-fixable-by-retry gap for this target, not evidence
			// that the target itself is wrong. Treat it as skippable, the same
			// as any other unresolved weekday target, rather than aborting the
			// whole run the way a genuine Sunday mismatch would.
			lastTransientReason = AELF_CACHE_DIR
				? `not in local cache for ${representativeDate}`
				: `AELF returned ${res.status} for ${representativeDate}`;
			break;
		}
		try {
			body = (await res.json()) as AelfResponseBody;
		} catch {
			lastTransientReason = `unparseable AELF response for ${representativeDate}`;
			continue;
		}
		break;
	}

	if (!body) {
		// Carry the previous run's text over rather than silently dropping a key
		// the output file already had · the whole file is rewritten from scratch.
		const previous = existingReadings[key];
		if (previous) output[key] = previous;
		skippedWeekdays.push(
			`${key}: ${lastTransientReason}${previous ? ' (kept the previous run’s text)' : ''}`
		);
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

if (skippedWeekdays.length > 0) {
	console.warn(
		`fetch-aelf: ${skippedWeekdays.length} weekday target(s) skipped after ${WEEKDAY_ATTEMPTS} attempts · rerun to pick them up:`
	);
	for (const s of skippedWeekdays) console.warn(`  - ${s}`);
}

if (failures.length > 0) {
	console.error(`fetch-aelf: ${failures.length} feast(s) failed to resolve:`);
	for (const f of failures) console.error(`  - ${f}`);
	process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(output, null, '\t') + '\n', 'utf8');
console.log(`fetch-aelf: wrote ${Object.keys(output).length} feasts to ${OUT}`);
