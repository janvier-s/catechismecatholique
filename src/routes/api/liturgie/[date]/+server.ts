import { loadCalendrierDatesIndex, loadCecLiturgyByOccasion } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import type { RequestHandler } from './$types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Must match `occasionKey` in scripts/prepare/cecLiturgyIndex.ts. Duplicated
 * rather than imported: scripts/ is build-time tooling outside the app graph,
 * and importing it here would pull it into the Worker bundle.
 */
function occasionKey(cycle: string | undefined, slug: string): string {
	return `${cycle ?? ''}:${slug}`;
}

/** Seconds until the next midnight in Europe/Paris, clamped to 60..3600. */
function secondsUntilParisMidnight(now: Date): number {
	const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
	const midnight = new Date(paris);
	midnight.setHours(24, 0, 0, 0);
	const seconds = Math.ceil((midnight.getTime() - paris.getTime()) / 1000);
	return Math.max(60, Math.min(3600, seconds));
}

function todayInParis(now: Date): string {
	// en-CA formats as YYYY-MM-DD, which is exactly the index key format.
	return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

export const GET: RequestHandler = async ({ params, fetch }) => {
	const raw = params.date;
	const isToday = raw === 'today';
	const date = isToday ? todayInParis(new Date()) : raw;

	if (!ISO_DATE.test(date)) {
		return apiError(
			`Date invalide : « ${raw} ». Format attendu : AAAA-MM-JJ, ou « today ».`,
			'bad_date'
		);
	}

	const index = await loadCalendrierDatesIndex(fetch);
	const row = index.rows.find((r) => r.date === date);
	if (!row) {
		return apiError(
			`Aucune célébration au calendrier pour le ${date}. Le calendrier couvre ${index.rangeStart} à ${index.rangeEnd}.`,
			'bad_date',
			404
		);
	}

	const byOccasion = await loadCecLiturgyByOccasion(fetch);
	// A day of the three-year cycle carries `yearKey`; a fixed feast or a
	// date-proper day carries none, and was indexed with an empty segment.
	const occasion =
		byOccasion[occasionKey(row.yearKey, row.slug)] ??
		byOccasion[occasionKey(undefined, row.slug)] ??
		null;

	const body = {
		date,
		slug: row.slug,
		corpus: row.corpus,
		cycle: row.yearKey ?? null,
		liturgical_color: row.liturgicalColor ?? null,
		celebration: occasion
			? {
					title: occasion.title,
					season: occasion.season,
					color: occasion.color,
					...(occasion.cycle ? { cycle: occasion.cycle } : {})
				}
			: null,
		// CEC paragraphs are proposed for meditation alongside the day's
		// readings · they are not read at Mass. Keep this wording.
		meditation: occasion
			? occasion.clusters.map((c) => ({ theme: c.theme, paragraphs: c.paragraphs }))
			: []
	};

	// "today" must expire at the date rollover; a fixed date is immutable.
	return apiJson(body, isToday ? secondsUntilParisMidnight(new Date()) : 3600);
};
