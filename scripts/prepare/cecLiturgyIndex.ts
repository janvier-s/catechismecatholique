import type {
	CalendrierFeast,
	CalendrierFixedFeast,
	LiturgicalColor,
	SeasonKey
} from './calendrier.ts';

/**
 * One reason a CEC paragraph is read on one day: the feast, and the cluster
 * theme the Homiletic Directory files it under. A feast that cites the same
 * paragraph under two themes produces two of these.
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
	theme: string;
	/** The whole cluster, current paragraph included, in source order. */
	paragraphs: number[];
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

export interface CecLiturgyReadingRef {
	type: string;
	ref: string;
}

/**
 * A shard of the reverse index. Occasions live in one table and paragraphs
 * point at them by index: a cluster of 20 paragraphs would otherwise store its
 * own 20-number `paragraphs` array 20 times over, which inflated the whole
 * index to 1.6MB.
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
 * Inverts the calendar's feast/cluster/paragraph nesting into a paragraph to
 * occasions map, sharded by `cecLiturgyBucket`.
 *
 * Source order is preserved: callers pass années a, b, c then the propre then
 * fixed feasts, and each paragraph's occasion list comes back in that order,
 * so the frontend can section it without re-sorting.
 */
export function buildCecLiturgyIndex(sources: CecLiturgySource[]): Map<number, CecLiturgyBucket> {
	const buckets = new Map<number, CecLiturgyBucket>();
	// Per shard, where a given feast+cluster already sits in its occasion table.
	const seen = new Map<number, Map<string, number>>();

	for (const { feast, cycle, readingsKey, readings } of sources) {
		const fixed = isFixed(feast);
		for (const cluster of feast.clusters) {
			const occasion: CecLiturgyOccasion = {
				slug: feast.slug,
				title: feast.title,
				season: feast.season,
				color: feast.liturgicalColor,
				...(cycle ? { cycle } : {}),
				...(fixed ? { date: feast.date, monthIndex: feast.month_index } : {}),
				theme: cluster.theme,
				paragraphs: cluster.paragraphs,
				...(readingsKey ? { readingsKey } : {}),
				...(readings && readings.length > 0 ? { readings } : {})
			};
			const identity = `${cycle ?? ''}:${feast.slug}:${cluster.i}`;

			// A cluster listing the same paragraph twice (e.g. a range that
			// overlaps a loose number in the same "CEC ..." line) must not yield
			// the occasion twice.
			for (const n of new Set(cluster.paragraphs)) {
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
	}

	return buckets;
}
