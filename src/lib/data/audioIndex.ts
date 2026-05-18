// Audio index for the CCC reader's per-paragraph and en-bref audio.
// Built by scripts/render-ccc-audio.py and uploaded to Cloudflare R2 via
// scripts/upload-audio-to-r2.sh. The bucket is public on audio.catechismecatholique.fr
// with object keys under cec/.

const AUDIO_ORIGIN = 'https://audio.catechismecatholique.fr/cec';

export interface AudioParagraphEntry {
	file: string; // relative to AUDIO_ORIGIN
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
	indexPromise = fetcher(`${AUDIO_ORIGIN}/index.json`)
		.then(async (r) => {
			if (!r.ok) return null;
			return (await r.json()) as AudioIndex;
		})
		.catch(() => null);
	return indexPromise;
}

export function audioUrlForParagraph(index: AudioIndex, n: number): string | null {
	const e = index.paragraphs[String(n)];
	return e ? `${AUDIO_ORIGIN}/${e.file}` : null;
}

export function audioUrlForEnBref(index: AudioIndex, chapterSlug: string): string | null {
	const e = index.en_bref_combined[chapterSlug];
	return e ? `${AUDIO_ORIGIN}/${e.file}` : null;
}
