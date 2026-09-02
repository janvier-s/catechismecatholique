import { loadParagraph, loadAbbreviations, loadSourcesIndex } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';
import type { AbbreviationMap } from '$lib/data/types';

export interface ApiSourceRef {
	type: string;
	raw: string;
	/** `raw` with its leading abbreviation expanded, e.g. "GS 19" to "Gaudium et Spes 19". */
	display: string;
}

export interface ApiSourceDocument {
	category: string;
	doc_name: string;
	location: string;
}

export interface ApiSources {
	refs: ApiSourceRef[];
	documents: ApiSourceDocument[];
}

// Same rule the Sources tab applies · scripture refs are already served in
// `bible_refs`, so they would be duplicated noise here.
const SOURCE_TYPES = new Set(['magisterial', 'patristic', 'liturgical']);

function expand(raw: string, abbrs: AbbreviationMap): string {
	const m = raw.match(/^([A-Z][A-Za-z]*)\b/);
	if (!m) return raw;
	const full = abbrs[m[1]!];
	if (!full) return raw;
	return raw.replace(m[1]!, full);
}

export async function sourcesBlock(n: number, fetcher: Fetch): Promise<ApiSources> {
	const [paragraph, abbrs, index] = await Promise.all([
		loadParagraph(n, fetcher),
		loadAbbreviations(fetcher),
		loadSourcesIndex(fetcher)
	]);

	const refs = paragraph.magisterial_refs
		.filter((r) => SOURCE_TYPES.has(r.type))
		.map((r) => ({ type: r.type, raw: r.raw, display: expand(r.raw, abbrs) }));

	const documents = index
		.filter((e) => e.paragraphs.includes(n))
		.map((e) => ({ category: e.category, doc_name: e.doc_name, location: e.location }));

	return { refs, documents };
}
