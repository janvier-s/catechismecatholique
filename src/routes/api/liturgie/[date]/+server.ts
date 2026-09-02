import { loadCalendrierDatesIndex, loadCecLiturgyByOccasion } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { secondsUntilParisMidnight, todayInParis } from '$lib/server/api/parisTime';
import type { CalendrierDateRow } from '$lib/data/types';
import type { RequestHandler } from './$types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIXED_DATE_TTL = 3600;

/**
 * Must match `occasionKey` in scripts/prepare/cecLiturgyIndex.ts. Duplicated
 * rather than imported: scripts/ is build-time tooling outside the app graph,
 * and importing it here would pull it into the Worker bundle.
 */
function occasionKey(cycle: string | undefined, slug: string): string {
	return `${cycle ?? ''}:${slug}`;
}

/**
 * Which lectionary cycle a calendar row belongs to. Sundays and feasts of the
 * three-year cycle carry `yearKey` (a/b/c); ferial weekdays carry `cycle`
 * (I/II); fixed feasts and date-proper days carry neither and are indexed
 * with an empty cycle segment.
 */
function cycleFor(row: CalendrierDateRow): string | undefined {
	if (row.corpus === 'year') return row.yearKey;
	if (row.corpus === 'weekday') return row.cycle;
	return undefined;
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
	const cycle = cycleFor(row);
	// No cycle-less fallback: when `cycle` is undefined the key below already
	// evaluates to `:slug`, which is exactly how such days are indexed.
	const occasion = byOccasion[occasionKey(cycle, row.slug)] ?? null;

	const body = {
		date,
		slug: row.slug,
		// Named `calendar_source`, not `corpus`: on /api/cec `corpus` is the work
		// id ("ccc"), and reusing the word for the calendar's own partition
		// would make an agent try to resolve "weekday" against the corpus
		// registry.
		calendar_source: row.corpus,
		cycle: cycle ?? null,
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

	// "today" must expire at the date rollover, at the EDGE as well as in the
	// browser: Cloudflare's shared cache prefers s-maxage, so passing the
	// rollover only as max-age would let the edge serve yesterday's date all
	// morning. A fixed date is immutable and keeps the default shared TTL.
	if (isToday) {
		const ttl = secondsUntilParisMidnight(new Date());
		return apiJson(body, ttl, ttl);
	}
	return apiJson(body, FIXED_DATE_TTL);
};
