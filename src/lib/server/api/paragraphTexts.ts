import { loadParagraph } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';
import { stripHtml } from '$lib/utils/html';
import { apiCitations, textFull, type ApiCitation } from './paragraphShape';
import type { ApiErrorCode } from './http';

/**
 * Paragraphs resolved in one request. Matches the batch route's own ceiling ·
 * `/api/pericope` accepts 50 references and a single Passion pericope already
 * resolves to some forty paragraphs, so without this a lectionary request
 * could fan out to thousands of shard fetches.
 */
export const MAX_TEXTS = 50;

/** The include token these routes accept · the CEC study blocks are a separate vocabulary. */
const TOKEN = 'texts';

export interface ApiParagraphText {
	number: number;
	/** The paragraph's own prose. The markup lives on /api/cec/{number}. */
	text: string;
	/** The sources the paragraph quotes · empty for most paragraphs. */
	citations: ApiCitation[];
	/** Prose and quotations as one passage. Absent when nothing is quoted. */
	text_full?: string;
	permalink: string;
}

export type TextsIncludeResult =
	| { ok: true; texts: boolean }
	| { ok: false; message: string; code: ApiErrorCode };

export function parseTextsInclude(raw: string | null): TextsIncludeResult {
	if (!raw || raw.trim() === '') return { ok: true, texts: false };
	if (raw.trim() === TOKEN) return { ok: true, texts: true };
	return {
		ok: false,
		code: 'unknown_include',
		message: `Bloc inconnu dans include : « ${raw.trim()} ». Cette route n'accepte que « ${TOKEN} ».`
	};
}

export interface ParagraphTexts {
	texts: ApiParagraphText[];
	/** True when the list was cut at MAX_TEXTS · the lowest numbers are kept. */
	truncated: boolean;
}

/**
 * Fetch the text of each paragraph, in numeric order.
 *
 * A shard that fails is dropped rather than failing the response, the same
 * isolation contract `assembleBlocks` applies: a caller resolving a whole
 * chapter must not lose forty good paragraphs to one missing file.
 */
export async function loadParagraphTexts(
	numbers: number[],
	origin: string,
	fetcher: Fetch
): Promise<ParagraphTexts> {
	const ordered = [...numbers].sort((a, b) => a - b);
	const kept = ordered.slice(0, MAX_TEXTS);

	const settled = await Promise.all(
		kept.map(async (n): Promise<ApiParagraphText | null> => {
			try {
				const p = await loadParagraph(n, fetcher);
				const full = textFull(p);
				return {
					number: n,
					text: stripHtml(p.text_html),
					citations: apiCitations(p),
					...(full ? { text_full: full } : {}),
					permalink: `${origin}/cec/${n}`
				};
			} catch {
				return null;
			}
		})
	);

	return {
		texts: settled.filter((t): t is ApiParagraphText => t !== null),
		truncated: ordered.length > kept.length
	};
}
