#!/usr/bin/env tsx
// One-off preview run: parse both glossary sources, attempt to match the
// English head-words to the French ones, and write a JSON report so we can
// review coverage before investing in translation work.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGlossaryEn, type GlossaryEnEntry } from './prepare/glossary-en.ts';
import { parseGlossaryFr, type GlossaryFrEntry } from './prepare/glossary-fr.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SOURCES = join(ROOT, 'scripts/data-sources');
const OUT = join(ROOT, 'scripts/glossary-preview');

function readFr(): Map<string, string> {
	const dir = join(SOURCES, 'thematic_cross-refs/index_thematique');
	const files = readdirSync(dir).filter((f) => f.endsWith('.xhtml'));
	const m = new Map<string, string>();
	for (const f of files) m.set(f, readFileSync(join(dir, f), 'utf8'));
	return m;
}

// Diacritic-insensitive lowercase normalization for matching English ↔ French
// head-words. Also handles a few obvious English→French swaps where the
// surface form differs (e.g. "Apostles' Creed" ↔ "Symbole des apôtres").
function normForMatch(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[’']/g, ' ')
		.replace(/[^a-z0-9 ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

// Best-effort English→French head-word equivalences. These are obvious
// 1-to-1 mappings; trickier ones are left for a later manual pass.
const EN_TO_FR_HINTS: Record<string, string[]> = {
	abortion: ['avortement'],
	abraham: ['abraham'],
	absolution: ['absolution'],
	acolyte: ['acolyte'],
	adam: ['adam'],
	adoration: ['adoration'],
	adultery: ['adultere'],
	advent: ['avent'],
	almsgiving: ['aumone'],
	altar: ['autel'],
	amen: ['amen'],
	angel: ['ange', 'anges'],
	anger: ['colere'],
	annunciation: ['annonciation'],
	anointing: ['onction'],
	'anointing of the sick': ['onction des malades'],
	antichrist: ['antichrist'],
	apostasy: ['apostasie'],
	apostle: ['apotre', 'apotres'],
	'apostles creed': ['symbole des apotres'],
	apostolate: ['apostolat'],
	'apostolic succession': ['succession apostolique']
	// (the rest will be matched by literal lemma when possible; non-matches
	// are reported in the preview output for manual mapping later)
};

interface PreviewMatch {
	en: GlossaryEnEntry;
	frTerm?: string; // matched french term, if any
	frLetter?: string;
	matchKind: 'exact' | 'hinted' | 'unmatched';
}

function buildFrIndex(fr: GlossaryFrEntry[]): Map<string, GlossaryFrEntry> {
	const m = new Map<string, GlossaryFrEntry>();
	for (const e of fr) m.set(normForMatch(e.term), e);
	return m;
}

function matchEn(en: GlossaryEnEntry[], fr: GlossaryFrEntry[]): PreviewMatch[] {
	const frByKey = buildFrIndex(fr);
	const out: PreviewMatch[] = [];
	for (const e of en) {
		const key = normForMatch(e.term);
		// 1) exact match
		const direct = frByKey.get(key);
		if (direct) {
			out.push({ en: e, frTerm: direct.term, frLetter: direct.letter, matchKind: 'exact' });
			continue;
		}
		// 2) hinted match
		const hints = EN_TO_FR_HINTS[key] ?? [];
		const hit = hints.map((h) => frByKey.get(h)).find(Boolean);
		if (hit) {
			out.push({ en: e, frTerm: hit.term, frLetter: hit.letter, matchKind: 'hinted' });
			continue;
		}
		out.push({ en: e, matchKind: 'unmatched' });
	}
	return out;
}

function main() {
	mkdirSync(OUT, { recursive: true });
	const enXml = readFileSync(join(SOURCES, 'ccc_glossary_en.xhtml'), 'utf8');
	const en = parseGlossaryEn(enXml);
	const fr = parseGlossaryFr(readFr());

	const matches = matchEn(en, fr);
	const exact = matches.filter((m) => m.matchKind === 'exact');
	const hinted = matches.filter((m) => m.matchKind === 'hinted');
	const unmatched = matches.filter((m) => m.matchKind === 'unmatched');

	// Stats: total sub-entries and total ref count for the French index.
	const totalSubEntries = fr.reduce((acc, e) => acc + e.subEntries.length, 0);
	const totalRefs = fr.reduce(
		(acc, e) => acc + e.directRefs.length + e.subEntries.reduce((a, s) => a + s.refs.length, 0),
		0
	);

	const summary = {
		englishEntries: en.length,
		frenchHeadWords: fr.length,
		frenchSubEntries: totalSubEntries,
		frenchTotalRefs: totalRefs,
		matchedExact: exact.length,
		matchedHinted: hinted.length,
		unmatchedEnglishCount: unmatched.length,
		topFrenchByRefCount: fr
			.map((e) => ({
				term: e.term,
				refs: e.directRefs.length + e.subEntries.reduce((a, s) => a + s.refs.length, 0),
				subEntries: e.subEntries.length
			}))
			.sort((a, b) => b.refs - a.refs)
			.slice(0, 30)
	};

	writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
	writeFileSync(
		join(OUT, 'unmatched-en.json'),
		JSON.stringify(
			unmatched.map((m) => ({ term: m.en.term, refs: m.en.refs })),
			null,
			2
		)
	);
	writeFileSync(join(OUT, 'fr-all.json'), JSON.stringify(fr, null, 2));
	writeFileSync(
		join(OUT, 'matches.json'),
		JSON.stringify(
			matches.map((m) => ({
				en: m.en.term,
				fr: m.frTerm ?? null,
				kind: m.matchKind
			})),
			null,
			2
		)
	);

	console.log('=== Glossary preview ===');
	console.log('English entries:           ', summary.englishEntries);
	console.log('French head-words:         ', summary.frenchHeadWords);
	console.log('French sub-entries:        ', summary.frenchSubEntries);
	console.log('French total refs:         ', summary.frenchTotalRefs);
	console.log('Matched exact:             ', summary.matchedExact);
	console.log('Matched via hint:          ', summary.matchedHinted);
	console.log('Unmatched English entries: ', summary.unmatchedEnglishCount);
	console.log(`\nWrote ${OUT}/summary.json, fr-all.json, matches.json, unmatched-en.json`);
	console.log('\nTop 10 French head-words by ref count:');
	for (const t of summary.topFrenchByRefCount.slice(0, 10)) {
		console.log(`  ${t.term}  —  ${t.refs} refs / ${t.subEntries} sub-entries`);
	}
}

main();
