// Build the merged glossary by combining the French thematic index with the
// English Levada glossary (translated overlay) and assigning each head-word
// to one or two clusters.
//
// Output shape per merged entry:
//   {
//     slug: 'abraham',          // url-safe slug
//     term: 'Abraham',          // display
//     latin?: '...',            // if any
//     definition?: '...',       // french definition (translated from EN)
//     directRefs: number[],     // refs on the head-word line itself (FR source)
//     subEntries: [{label, refs}],
//     seeAlso: string[],        // cross-refs to other head-words
//     clusters: ClusterId[],    // 1-2 cluster ids
//     totalRefs: number,        // for "most cited" sorting
//     refsCovered: number[],    // every paragraph this entry references (deduped, sorted)
//     standalone: boolean       // true if from EN-only (no FR head-word)
//   }
import { parseGlossaryEn, type GlossaryEnEntry } from './glossary-en.ts';
import { parseGlossaryFr, type GlossaryFrEntry } from './glossary-fr.ts';
import { EN_OVERLAY, type EnOverlay } from './glossary-en-overlay.ts';
import {
	CLUSTERS,
	clusterFor,
	type Cluster,
	type ClusterId
} from './glossary-clusters.ts';
import { GLOSSARY_EXTRAS } from './glossary-extras.ts';

export interface GlossaryEntry {
	slug: string;
	term: string;
	latin?: string;
	definition?: string;
	directRefs: number[];
	subEntries: { label: string; refs: number[] }[];
	seeAlso: string[];
	clusters: ClusterId[];
	totalRefs: number;
	refsCovered: number[];
	standalone: boolean;
}

export interface GlossaryClusterMeta extends Cluster {
	count: number; // how many head-words landed in it
}

export interface GlossaryBundle {
	entries: GlossaryEntry[];
	clusters: GlossaryClusterMeta[];
	featured: string[]; // slugs of the top ~24 by totalRefs
}

// Strip French inflection markers like `(s)`, `(e)`, `(se)` from a term so
// they don't pollute slugs or cross-comparison keys. The marker stays on the
// rendered `term` field — only normalization paths drop it.
const INFLECTION_SUFFIX = /\s*\((?:s|e|se|s\/e|s\/se|le)\)\s*/gi;
const stripInflection = (s: string): string => s.replace(INFLECTION_SUFFIX, '').trim();

const SLUG_FALLBACK = (s: string): string =>
	stripInflection(s)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

function normCompare(s: string): string {
	return stripInflection(s)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[’']/g, ' ')
		.replace(/[^a-z0-9 ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function dedupSort(ns: number[]): number[] {
	return [...new Set(ns)].sort((a, b) => a - b);
}

export function buildGlossary(
	enXml: string,
	frXmlByFile: Map<string, string>
): GlossaryBundle {
	const enRaw = parseGlossaryEn(enXml);
	const fr = parseGlossaryFr(frXmlByFile);

	// Index FR head-words by normalised name for overlay matching.
	const frByNorm = new Map<string, GlossaryFrEntry>();
	for (const e of fr) frByNorm.set(normCompare(e.term), e);

	// Index EN entries by id for overlay lookup.
	const enById = new Map<string, GlossaryEnEntry>();
	for (const e of enRaw) enById.set(e.id, e);

	// First pass: every French head-word becomes an entry. If the overlay
	// points an English entry at this French term, attach the translated
	// definition. Cluster from override / keyword auto-assignment.
	const slugUsed = new Set<string>();
	const out: GlossaryEntry[] = [];
	const usedEnIds = new Set<string>();

	for (const f of fr) {
		// Drop stub entries that have no refs, no sub-entries, and whose
		// only "Voir : X" target is a meta-instruction like "que cet adjectif
		// qualifie" — they're useless to the reader.
		const hasContent =
			f.directRefs.length > 0 ||
			f.subEntries.length > 0 ||
			f.seeAlso.some((s) => !/que\s+(?:cet|qualifie|les)/i.test(s));
		if (!hasContent) continue;
		const slug = uniqueSlug(SLUG_FALLBACK(f.term), slugUsed);
		// Find any EN overlay whose `fr` matches this French head-word.
		let definition: string | undefined;
		let clusterOverride: EnOverlay['cluster'];
		for (const [enId, ov] of Object.entries(EN_OVERLAY)) {
			if (normCompare(ov.fr) === normCompare(f.term)) {
				definition = ov.def;
				clusterOverride = ov.cluster;
				usedEnIds.add(enId);
				break;
			}
		}
		const subLabels = f.subEntries.map((s) => s.label);
		const allRefs = dedupSort([
			...f.directRefs,
			...f.subEntries.flatMap((s) => s.refs)
		]);
		const totalRefs = f.directRefs.length + f.subEntries.reduce((a, s) => a + s.refs.length, 0);
		const clusters = resolveClusters(f.term, subLabels, clusterOverride);
		out.push({
			slug,
			term: f.term,
			latin: f.latin,
			definition,
			directRefs: f.directRefs,
			subEntries: f.subEntries,
			seeAlso: f.seeAlso,
			clusters,
			totalRefs,
			refsCovered: allRefs,
			standalone: false
		});
	}

	// Second pass: every EN entry whose overlay points at a French term that
	// DOESN'T exist in the French index becomes a standalone entry.
	for (const [enId, ov] of Object.entries(EN_OVERLAY)) {
		if (usedEnIds.has(enId)) continue;
		// Skip if the FR target actually exists (matched in pass 1 — guard).
		if (frByNorm.has(normCompare(ov.fr))) continue;
		const en = enById.get(enId);
		if (!en) continue;
		const slug = uniqueSlug(SLUG_FALLBACK(ov.fr), slugUsed);
		const refs = dedupSort(en.refs);
		const clusters = resolveClusters(ov.fr, [], ov.cluster);
		out.push({
			slug,
			term: ov.fr,
			definition: ov.def,
			directRefs: refs,
			subEntries: [],
			seeAlso: en.seeAlso,
			clusters,
			totalRefs: refs.length,
			refsCovered: refs,
			standalone: true
		});
	}

	// Third pass: hand-curated extras that fill gaps in both indexes. Each
	// extra was checked against the FR thematic index to confirm no head-term
	// or sub-entry concept overlap. See scripts/prepare/glossary-extras.ts.
	const existingByNorm = new Set(out.map((e) => normCompare(e.term)));
	for (const x of GLOSSARY_EXTRAS) {
		if (existingByNorm.has(normCompare(x.term))) continue;
		const slug = uniqueSlug(SLUG_FALLBACK(x.slug || x.term), slugUsed);
		const allRefs = dedupSort([
			...x.directRefs,
			...x.subEntries.flatMap((s) => s.refs)
		]);
		const totalRefs = x.directRefs.length + x.subEntries.reduce((a, s) => a + s.refs.length, 0);
		out.push({
			slug,
			term: x.term,
			latin: x.latin,
			definition: x.definition,
			directRefs: x.directRefs,
			subEntries: x.subEntries,
			seeAlso: x.seeAlso,
			clusters: x.clusters,
			totalRefs,
			refsCovered: allRefs,
			standalone: true
		});
	}

	// Sort entries alphabetically by their normalised term.
	out.sort((a, b) => normCompare(a.term).localeCompare(normCompare(b.term)));

	// Cluster meta: count how many head-words landed in each cluster.
	const clusterCounts = new Map<ClusterId, number>();
	for (const e of out) {
		for (const c of e.clusters) clusterCounts.set(c, (clusterCounts.get(c) ?? 0) + 1);
	}
	const clusterMeta: GlossaryClusterMeta[] = CLUSTERS.map((c) => ({
		...c,
		count: clusterCounts.get(c.id) ?? 0
	}));

	// Featured = top entries by totalRefs (cap at 24, light pruning).
	const featured = [...out]
		.sort((a, b) => b.totalRefs - a.totalRefs)
		.slice(0, 24)
		.map((e) => e.slug);

	return { entries: out, clusters: clusterMeta, featured };
}

function uniqueSlug(seed: string, used: Set<string>): string {
	let s = seed || 'entry';
	let n = 2;
	while (used.has(s)) {
		s = `${seed}-${n++}`;
	}
	used.add(s);
	return s;
}

function resolveClusters(
	term: string,
	subLabels: string[],
	override: EnOverlay['cluster']
): ClusterId[] {
	if (override) return Array.isArray(override) ? override : [override];
	const auto = clusterFor(term, subLabels);
	if (auto.length > 0) return auto;
	// All current entries classify into one of the 12 clusters via either a
	// manual override or a keyword match. If a new source term slips through,
	// surface it loudly during the build so we can decide where it belongs.
	throw new Error(
		`Glossary build: term "${term}" has no cluster. Add a CLUSTER_OVERRIDES ` +
			`entry or extend CLUSTER_KEYWORDS in scripts/prepare/glossary-clusters.ts.`
	);
}
