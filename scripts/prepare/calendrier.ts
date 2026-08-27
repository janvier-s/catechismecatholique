import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { slugify } from './slug.ts';
import {
	buildCalendrierDates,
	DATE_RANGE_START_YEAR,
	DATE_RANGE_END_YEAR
} from './calendrierDates.ts';

export type SeasonKey = 'avent' | 'noel' | 'careme' | 'pascal' | 'solennite' | 'ordinaire';
export type LiturgicalColor = 'violet' | 'white' | 'red' | 'green' | 'rose';

export interface CalendrierCluster {
	i: number;
	theme: string;
	refs: string;
	paragraphs: number[];
}

export interface CalendrierFeast {
	slug: string;
	title: string;
	season: SeasonKey;
	clusters: CalendrierCluster[];
	liturgicalColor: LiturgicalColor;
}

export interface CalendrierFixedFeast extends CalendrierFeast {
	date: string;
	month_index: number;
}

export interface CalendrierYearFile {
	key: 'a' | 'b' | 'c';
	feasts: CalendrierFeast[];
}

export interface CalendrierDateRow {
	date: string; // ISO yyyy-mm-dd
	slug: string;
	corpus: 'year' | 'fixed';
	yearKey?: 'a' | 'b' | 'c'; // present when corpus === 'year'
}

export interface CalendrierDatesIndexFile {
	rangeStart: string; // ISO yyyy-mm-dd
	rangeEnd: string; // ISO yyyy-mm-dd
	rows: CalendrierDateRow[];
}

export interface CalendrierIndexFile {
	years: { key: 'a' | 'b' | 'c'; total_feasts: number; total_clusters: number }[];
	fixed_feasts: CalendrierFixedFeast[];
	total_feasts: number;
	total_clusters: number;
}

export interface CalendrierReading {
	type: 'lecture_1' | 'psaume' | 'lecture_2' | 'evangile';
	ref: string;
	titre?: string;
	intro_lue?: string;
	contenu: string;
	refrain_psalmique?: string;
	ref_refrain?: string;
	verset_evangile?: string;
}

export interface CalendrierReadingsFile {
	[slug: string]: {
		date: string; // ISO yyyy-mm-dd - the past date AELF was queried with
		lectures: CalendrierReading[];
	};
}

const YEAR_RE = /^ANNEE\s+([ABC])\s*$/;
const FIXED_MARK_RE = /^AUTRES\s+FÊTES/i;
const MONTHS = [
	'Janvier',
	'Février',
	'Mars',
	'Avril',
	'Mai',
	'Juin',
	'Juillet',
	'Août',
	'Septembre',
	'Octobre',
	'Novembre',
	'Décembre'
];
const DATE_RE = new RegExp(`^(\\d{1,2})\\s+(${MONTHS.join('|')})\\s*:\\s*(.+)$`);
const FEAST_RE =
	/(Dimanche|Solennité|Sainte\s+Famille|Sainte\s+Marie|Jeudi\s+Saint|Vendredi\s+Saint|Samedi\s+Saint|Christ\s+Roi|Pâques|Pentecôte|Trinité|Corpus|Sacré|Avent|Carême|Noël|Épiphanie|Epiphanie)/;

function classifySeason(title: string): SeasonKey {
	const t = title.toLowerCase();
	if (t.includes('avent')) return 'avent';
	if (
		t.includes('noël') ||
		t.includes('noel') ||
		t.includes('épiphanie') ||
		t.includes('epiphanie') ||
		t.includes('sainte famille') ||
		t.includes('mère de dieu') ||
		t.includes('après noël')
	) {
		return 'noel';
	}
	if (t.includes('carême') || t.includes('rameaux')) return 'careme';
	if (
		t.includes('jeudi saint') ||
		t.includes('vendredi saint') ||
		t.includes('samedi saint') ||
		t.includes('pâques') ||
		t.includes('paques') ||
		t.includes('ascension') ||
		t.includes('pentecôte') ||
		t.includes('pentecote')
	) {
		return 'pascal';
	}
	if (
		t.includes('sainte trinité') ||
		t.includes('corps et du sang') ||
		t.includes('sacré-cœur') ||
		t.includes('sacre-coeur') ||
		t.includes('christ roi')
	) {
		return 'solennite';
	}
	return 'ordinaire';
}

function isLineMarker(line: string): boolean {
	return (
		YEAR_RE.test(line) || FIXED_MARK_RE.test(line) || DATE_RE.test(line) || FEAST_RE.test(line)
	);
}

// Some source CEC lines lack the leading space, sit at column 0, or use the
// "CCC" typo. Match all variants here so the merge step doesn't mistake them
// for wrap continuations.
const CLUSTER_LINE_RE = /^\s*(?:CEC|CCC)\s*\d/i;

// Source-file lines that wrap from a previous CEC entry sit at column 0 with
// no feast keywords. We pre-process them by joining each wrap with the last
// non-empty line. Without this, "Pierre" would be read as a feast title.
function mergeWraps(rawLines: string[]): string[] {
	const out: string[] = [];
	for (const line of rawLines) {
		if (line.length === 0) {
			out.push('');
			continue;
		}
		if (CLUSTER_LINE_RE.test(line)) {
			out.push(line);
			continue;
		}
		if (/^\s/.test(line)) {
			out.push(line);
			continue;
		}
		// col-0, not a CEC line: marker or wrap continuation
		if (isLineMarker(line)) {
			out.push(line);
		} else {
			let i = out.length - 1;
			while (i >= 0 && out[i] === '') i--;
			if (i < 0) out.push(line);
			else out[i] = (out[i] ?? '') + ' ' + line.trim();
		}
	}
	return out;
}

function expandRefs(refsStr: string): number[] {
	const out: number[] = [];
	for (const part of refsStr.split(',')) {
		const trimmed = part.trim();
		const m = trimmed.match(/^(\d+)(?:-(\d+))?$/);
		if (!m) continue;
		const start = parseInt(m[1]!, 10);
		if (!m[2]) {
			out.push(start);
			continue;
		}
		let end = parseInt(m[2]!, 10);
		// Truncated form: "1427-29" → 1427-1429
		if (end < start) {
			const startStr = m[1]!;
			const endStr = m[2]!;
			const padLen = startStr.length - endStr.length;
			if (padLen > 0) end = parseInt(startStr.slice(0, padLen) + endStr, 10);
		}
		for (let i = start; i <= end; i++) out.push(i);
	}
	return out;
}

function parseClusterLine(rest: string): { theme: string; refs: string; paragraphs: number[] } {
	const idx = rest.indexOf(':');
	if (idx < 0) {
		return { theme: rest.trim(), refs: '', paragraphs: [] };
	}
	const refs = rest.slice(0, idx).trim();
	const theme = rest.slice(idx + 1).trim();
	return { theme, refs, paragraphs: expandRefs(refs) };
}

function disambiguateSlug(base: string, taken: Set<string>): string {
	if (!taken.has(base)) {
		taken.add(base);
		return base;
	}
	let i = 2;
	while (taken.has(`${base}-${i}`)) i++;
	const final = `${base}-${i}`;
	taken.add(final);
	return final;
}

interface ParseResult {
	years: Map<'a' | 'b' | 'c', CalendrierFeast[]>;
	fixed: CalendrierFixedFeast[];
}

function parseAll(text: string): ParseResult {
	const rawLines = text.split(/\r?\n/);
	const lines = mergeWraps(rawLines);

	const years = new Map<'a' | 'b' | 'c', CalendrierFeast[]>();
	const fixed: CalendrierFixedFeast[] = [];
	let currentYear: 'a' | 'b' | 'c' | null = null;
	let inFixed = false;
	let currentFeast: CalendrierFeast | CalendrierFixedFeast | null = null;
	const slugTaken = new Map<string, Set<string>>();
	slugTaken.set('a', new Set());
	slugTaken.set('b', new Set());
	slugTaken.set('c', new Set());
	const fixedSlugTaken = new Set<string>();

	function flushFeast() {
		if (!currentFeast) return;
		if (inFixed) {
			fixed.push(currentFeast as CalendrierFixedFeast);
		} else if (currentYear) {
			years.get(currentYear)!.push(currentFeast);
		}
		currentFeast = null;
	}

	for (const line of lines) {
		if (line.trim() === '') continue;

		const ym = line.match(YEAR_RE);
		if (ym) {
			flushFeast();
			currentYear = ym[1]!.toLowerCase() as 'a' | 'b' | 'c';
			years.set(currentYear, []);
			inFixed = false;
			continue;
		}

		if (FIXED_MARK_RE.test(line)) {
			flushFeast();
			inFixed = true;
			currentYear = null;
			continue;
		}

		const dm = line.match(DATE_RE);
		if (dm) {
			flushFeast();
			const day = dm[1]!;
			const month = dm[2]!;
			const title = dm[3]!.trim();
			const slug = disambiguateSlug(slugify(title), fixedSlugTaken);
			currentFeast = {
				slug,
				title,
				season: 'solennite',
				clusters: [],
				date: `${day} ${month}`,
				month_index: MONTHS.indexOf(month),
				liturgicalColor: 'white' // overwritten in Task 6's join step; never reaches output unchecked
			};
			continue;
		}

		const cm = line.match(/^\s*(?:CEC|CCC)\s*(.+)$/i);
		if (cm) {
			if (!currentFeast) continue;
			const parsed = parseClusterLine(cm[1]!);
			currentFeast.clusters.push({
				i: currentFeast.clusters.length,
				theme: parsed.theme,
				refs: parsed.refs,
				paragraphs: parsed.paragraphs
			});
			continue;
		}

		if (FEAST_RE.test(line)) {
			flushFeast();
			const title = line.trim();
			const season = classifySeason(title);
			const taken = currentYear ? slugTaken.get(currentYear)! : fixedSlugTaken;
			const slug = disambiguateSlug(slugify(title), taken);
			currentFeast = { slug, title, season, clusters: [], liturgicalColor: 'white' }; // see comment above
			continue;
		}

		console.warn(`calendrier: unrecognized line: ${JSON.stringify(line)}`);
	}

	flushFeast();
	return { years, fixed };
}

export async function prepareCalendrier(args: { sourceDir: string; outDir: string }): Promise<{
	totalFeasts: number;
	totalClusters: number;
	totalFixed: number;
}> {
	const { sourceDir, outDir } = args;
	mkdirSync(outDir, { recursive: true });

	const text = readFileSync(join(sourceDir, 'CCC_Liturgy_List.txt'), 'utf8');
	const { years, fixed } = parseAll(text);

	const yearKeys: ('a' | 'b' | 'c')[] = ['a', 'b', 'c'];
	const yearFiles: CalendrierYearFile[] = yearKeys.map((key) => ({
		key,
		feasts: years.get(key) ?? []
	}));

	const { rows, colorsBySlug } = await buildCalendrierDates(yearFiles, fixed);

	for (const yf of yearFiles) {
		for (const feast of yf.feasts) {
			const color = colorsBySlug.get(feast.slug);
			if (!color) {
				throw new Error(
					`calendrier: no liturgicalColor resolved for "${feast.title}" (${feast.slug}) ` +
						`across ${DATE_RANGE_START_YEAR}-${DATE_RANGE_END_YEAR}.`
				);
			}
			feast.liturgicalColor = color;
		}
	}
	for (const ff of fixed) {
		const color = colorsBySlug.get(ff.slug);
		if (!color) {
			throw new Error(`calendrier: no liturgicalColor resolved for "${ff.title}" (${ff.slug}).`);
		}
		ff.liturgicalColor = color;
	}

	const yearStats: { key: 'a' | 'b' | 'c'; total_feasts: number; total_clusters: number }[] = [];
	let totalFeasts = 0;
	let totalClusters = 0;
	for (const yf of yearFiles) {
		writeFileSync(join(outDir, `annee-${yf.key}.json`), JSON.stringify(yf));
		const yearClusters = yf.feasts.reduce((s, f) => s + f.clusters.length, 0);
		yearStats.push({ key: yf.key, total_feasts: yf.feasts.length, total_clusters: yearClusters });
		totalFeasts += yf.feasts.length;
		totalClusters += yearClusters;
	}

	const fixedClusters = fixed.reduce((s, f) => s + f.clusters.length, 0);
	const index: CalendrierIndexFile = {
		years: yearStats,
		fixed_feasts: fixed,
		total_feasts: totalFeasts + fixed.length,
		total_clusters: totalClusters + fixedClusters
	};
	writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));

	const datesIndex: CalendrierDatesIndexFile = {
		rangeStart: `${DATE_RANGE_START_YEAR}-01-01`,
		rangeEnd: `${DATE_RANGE_END_YEAR}-12-31`,
		rows
	};
	writeFileSync(join(outDir, 'dates-index.json'), JSON.stringify(datesIndex));

	return {
		totalFeasts: totalFeasts + fixed.length,
		totalClusters: totalClusters + fixedClusters,
		totalFixed: fixed.length
	};
}
