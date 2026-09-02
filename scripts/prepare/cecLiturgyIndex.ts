import type {
	CalendrierFeast,
	CalendrierFixedFeast,
	LiturgicalColor,
	SeasonKey
} from './calendrier.ts';

/**
 * One day a CEC paragraph is proposed for meditation on: the feast, plus every
 * theme that day groups paragraphs under · a day cited for one paragraph still
 * carries its whole programme, the way the feast page shows it.
 */
export interface CecLiturgyOccasion {
	slug: string;
	title: string;
	season: SeasonKey;
	color: LiturgicalColor;
	/** 'a' | 'b' | 'c' for a Sunday/feast of the three-year cycle · absent for fixed feasts and the propre. */
	cycle?: 'a' | 'b' | 'c';
	/** Fixed feasts only, e.g. "2 Février". */
	date?: string;
	/** Fixed feasts only · lets the frontend order them by calendar month. */
	monthIndex?: number;
	/** Every cluster of the day, in source order, whether or not it cites the paragraph looked up. */
	clusters: CecLiturgyCluster[];
	/** Absent when no AELF reading was ever fetched for this day. */
	readingsKey?: string;
	/**
	 * Just the scripture references, so the panel can list them without
	 * fetching the reading file · that file carries the full text and runs
	 * 30-60KB, far too much to pull for every occasion on a paragraph.
	 * The full text is fetched lazily, by `readingsKey`, only when expanded.
	 */
	readings?: CecLiturgyReadingRef[];
}

export interface CecLiturgyCluster {
	theme: string;
	/** The whole cluster, in source order · deduped, a range may overlap a loose number. */
	paragraphs: number[];
}

export interface CecLiturgyReadingRef {
	type: string;
	ref: string;
}

/**
 * A shard of the reverse index. Occasions live in one table and paragraphs
 * point at them by index: a day of 40 paragraphs would otherwise store its own
 * cluster list 40 times over, which inflated the whole index to 1.6MB.
 */
export interface CecLiturgyBucket {
	occasions: CecLiturgyOccasion[];
	/** Paragraph number (string key) to indices into `occasions`, in source order. */
	paragraphs: Record<string, number[]>;
}

export interface CecLiturgySource {
	feast: CalendrierFeast | CalendrierFixedFeast;
	cycle?: 'a' | 'b' | 'c';
	/** Pass undefined when the day has no readings file. */
	readingsKey?: string;
	readings?: CecLiturgyReadingRef[];
}

/**
 * Which shard a paragraph lives in. Sharding by hundred keeps the panel's
 * fetch small (~15KB) without adding 2865 files to static/, which is already
 * close enough to Cloudflare Pages' 20000-file deployment cap to matter.
 */
export function cecLiturgyBucket(paragraph: number): number {
	return Math.floor(paragraph / 100);
}

function isFixed(f: CalendrierFeast | CalendrierFixedFeast): f is CalendrierFixedFeast {
	return 'date' in f;
}

/**
 * Identity of a liturgical day. A slug alone is not unique: the same Sunday
 * appears in cycles a, b and c with different clusters, so the cycle is part
 * of the key.
 */
export function occasionKey(cycle: string | undefined, slug: string): string {
	return `${cycle ?? ''}:${slug}`;
}

/**
 * Derive the occasion record a source feast maps to. Shared by both builders
 * below so the paragraph-keyed shards and the slug-keyed index cannot drift.
 */
export function toCecLiturgyOccasion(source: CecLiturgySource): CecLiturgyOccasion {
	const { feast, cycle, readingsKey, readings } = source;
	const fixed = isFixed(feast);
	return {
		slug: feast.slug,
		title: feast.title,
		season: feast.season,
		color: feast.liturgicalColor,
		...(cycle ? { cycle } : {}),
		...(fixed ? { date: feast.date, monthIndex: feast.month_index } : {}),
		// A cluster may list the same paragraph twice (a range overlapping a
		// loose number in the same "CEC ..." line) · dedupe here so the
		// frontend can key on the number.
		clusters: feast.clusters.map((c) => ({
			theme: c.theme,
			paragraphs: [...new Set(c.paragraphs)]
		})),
		...(readingsKey ? { readingsKey } : {}),
		...(readings && readings.length > 0 ? { readings } : {})
	};
}

/**
 * Inverts the calendar's feast/cluster/paragraph nesting into a paragraph to
 * occasions map, sharded by `cecLiturgyBucket`.
 *
 * Source order is preserved: callers pass années a, b, c then the propre then
 * fixed feasts, and each paragraph's occasion list comes back in that order,
 * so the frontend can section it without re-sorting.
 */
export function buildCecLiturgyIndex(sources: CecLiturgySource[]): Map<number, CecLiturgyBucket> {
	const buckets = new Map<number, CecLiturgyBucket>();
	// Per shard, where a given day already sits in its occasion table.
	const seen = new Map<number, Map<string, number>>();

	for (const source of sources) {
		const { feast, cycle } = source;
		const occasion = toCecLiturgyOccasion(source);
		const identity = occasionKey(cycle, feast.slug);

		// One entry per day, however many of its clusters cite the paragraph.
		for (const n of new Set(feast.clusters.flatMap((c) => c.paragraphs))) {
			const b = cecLiturgyBucket(n);
			let bucket = buckets.get(b);
			if (!bucket) {
				bucket = { occasions: [], paragraphs: {} };
				buckets.set(b, bucket);
				seen.set(b, new Map());
			}
			const table = seen.get(b)!;
			let at = table.get(identity);
			if (at === undefined) {
				at = bucket.occasions.push(occasion) - 1;
				table.set(identity, at);
			}
			(bucket.paragraphs[String(n)] = bucket.paragraphs[String(n)] ?? []).push(at);
		}
	}

	return buckets;
}

/**
 * Occasion-keyed view of the same data. The bucketed index above is keyed by
 * paragraph, which serves the study panel but makes a date lookup impossible
 * without scanning every shard · /api/liturgie/{date} needs this direction.
 *
 * Keyed by `occasionKey`, not by slug alone: the same Sunday recurs in cycles
 * a, b and c with different clusters, so a slug-only key would collide and
 * serve the wrong year's paragraphs.
 */
export function buildCecLiturgyByOccasion(
	sources: CecLiturgySource[]
): Record<string, CecLiturgyOccasion> {
	const out: Record<string, CecLiturgyOccasion> = {};
	for (const source of sources) {
		const occasion = toCecLiturgyOccasion(source);
		if (!occasion.clusters.some((c) => c.paragraphs.length > 0)) continue;
		out[occasionKey(source.cycle, source.feast.slug)] = occasion;
	}
	return out;
}
