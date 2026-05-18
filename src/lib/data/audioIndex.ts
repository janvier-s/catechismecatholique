// Audio index for the CCC reader's per-paragraph and en-bref audio.
// Built by scripts/render-ccc-audio.py and served from static/audio/cec/index.json.

export interface AudioParagraphEntry {
	file: string; // relative to /audio/cec/
	duration_ms: number;
	has_citation: boolean;
	is_en_bref: boolean;
}

export interface AudioEnBrefCombinedEntry {
	file: string;
	duration_ms: number;
	paragraphs: number[]; // [first, last] of the en-bref cluster
}

export interface AudioIndex {
	paragraphs: Record<string, AudioParagraphEntry>;
	en_bref_combined: Record<string, AudioEnBrefCombinedEntry>;
}

type Fetch = typeof fetch;

let indexPromise: Promise<AudioIndex | null> | null = null;

export function loadAudioIndex(fetcher: Fetch = fetch): Promise<AudioIndex | null> {
	if (indexPromise) return indexPromise;
	indexPromise = fetcher('/audio/cec/index.json')
		.then(async (r) => {
			if (!r.ok) return null;
			return (await r.json()) as AudioIndex;
		})
		.catch(() => null);
	return indexPromise;
}

export function audioUrlForParagraph(index: AudioIndex, n: number): string | null {
	const e = index.paragraphs[String(n)];
	return e ? `/audio/cec/${e.file}` : null;
}

export function audioUrlForEnBref(index: AudioIndex, chapterSlug: string): string | null {
	const e = index.en_bref_combined[chapterSlug];
	return e ? `/audio/cec/${e.file}` : null;
}
