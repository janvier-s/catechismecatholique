import { loadParagraph } from '$lib/data/loaders';
import type { Paragraph } from '$lib/data/types';
import type { PageLoad } from './$types';

const TOTAL_PARAGRAPHS = 2865;

/**
 * Pick a paragraph deterministically from the current UTC date so the same
 * "paragraphe du jour" renders server-side and client-side, and rotates once
 * per day across timezones. Range: 1..TOTAL_PARAGRAPHS.
 */
function pickDailyParagraph(now: Date = new Date()): number {
	const start = Date.UTC(now.getUTCFullYear(), 0, 0);
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const dayOfYear = Math.floor((today - start) / 86_400_000);
	// Mix in the year so the rotation isn't identical year-over-year.
	const seed = dayOfYear + now.getUTCFullYear() * 7;
	return (((seed % TOTAL_PARAGRAPHS) + TOTAL_PARAGRAPHS) % TOTAL_PARAGRAPHS) + 1;
}

export const load: PageLoad = async ({ fetch }) => {
	const dailyNumber = pickDailyParagraph();
	let paragraph: Paragraph | null = null;
	try {
		paragraph = await loadParagraph(dailyNumber, fetch);
	} catch {
		// Fall back gracefully: page still renders without a daily quote.
		paragraph = null;
	}
	return { dailyNumber, paragraph };
};
