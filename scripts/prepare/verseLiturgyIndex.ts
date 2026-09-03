import { parseAelfRef } from './concordanceRefParser.ts';
import type { SeasonKey, LiturgicalColor } from './calendrier.ts';

/**
 * A psalm or cantique reading names its book in its `type`, not in its `ref`
 * ("79 (80), 2ac.3bc, 15-16a, 18-19"), which `parseAelfRef` cannot resolve on
 * its own. Restore the implied book so the ref parses like any other.
 *
 * Only these two types, and only when the ref opens on a digit that is not
 * already followed by a book abbreviation: "2 S 7, 4-5a" also opens on a digit
 * but that digit belongs to the book's name.
 */
export function normalizeReadingRef(ref: string, type: string): string {
	if (type !== 'psaume' && type !== 'cantique') return ref;
	const trimmed = ref.trim();
	if (!/^\d/.test(trimmed)) return ref;
	// "2 S 7, ..." · a digit, then a letter word before the chapter number.
	if (/^\d\s+[A-Za-zÀ-ÿ]/.test(trimmed)) return ref;
	return `Ps ${trimmed}`;
}

/**
 * One day the panel can show for a verse. Deliberately carries no CEC clusters:
 * the verse tab gets its paragraph programme from the CEC liturgy index
 * instead, and leaving clusters out is most of why the shards stay small.
 */
export interface VerseLiturgyDay {
	slug: string;
	title: string;
	season: SeasonKey;
	color: LiturgicalColor;
	/**
	 * Stated rather than derived. `CecLiturgyOccasion` infers the day type from
	 * the presence of `cycle` / `date`, which weekdays break: they carry a cycle
	 * that is I or II rather than a, b or c.
	 */
	kind: 'year' | 'fixed' | 'proper' | 'weekday';
	/** Sundays and solemnities of the three-year cycle. */
	cycle?: 'a' | 'b' | 'c';
	/** Ferial days, the two-year first-reading cycle. */
	weekdayCycle?: 'I' | 'II';
	/** Fixed feasts only, e.g. "2 Février". */
	date?: string;
	/** Fixed feasts only, so the frontend can order them by calendar month. */
	monthIndex?: number;
	/** Absent when no AELF reading was ever fetched for this day. */
	readingsKey?: string;
	/** References only. The full text is fetched lazily by `readingsKey`. */
	readings: { type: string; ref: string }[];
}

export interface VerseLiturgySource {
	day: VerseLiturgyDay;
	readings: { type: string; ref: string }[];
}

/** Chapter number to verse number to indices into the day table. */
export type VerseLiturgyBookShard = Record<string, Record<string, number[]>>;

export interface VerseLiturgyIndex {
	days: VerseLiturgyDay[];
	/** Keyed by book slug, the form `parseAelfRef` returns. */
	books: Record<string, VerseLiturgyBookShard>;
	/** Refs that could not be parsed, so the build can report a regression. */
	skipped: number;
}

/**
 * Inverts every day's Mass readings into a verse to days index.
 *
 * A day enters the table only once one of its refs parses, so days whose
 * readings are all unparseable leave no empty row behind. Source order is
 * preserved: callers pass années a/b/c, then fixed feasts, then the propre,
 * then the ferial cycles, and each verse's day list comes back in that order.
 */
export function buildVerseLiturgyIndex(sources: VerseLiturgySource[]): VerseLiturgyIndex {
	const days: VerseLiturgyDay[] = [];
	const books: Record<string, VerseLiturgyBookShard> = {};
	let skipped = 0;

	for (const { day, readings } of sources) {
		// Assigned on the first ref that parses, so an all-unparseable day
		// never reaches the table.
		let at = -1;
		for (const r of readings) {
			const parsed = parseAelfRef(normalizeReadingRef(r.ref, r.type));
			if (!parsed) {
				skipped++;
				continue;
			}
			if (at === -1) at = days.push(day) - 1;
			const shard = (books[parsed.slug] ??= {});
			const chapter = (shard[String(parsed.chapter)] ??= {});
			for (const [from, to] of parsed.ranges) {
				for (let v = from; v <= to; v++) {
					const list = (chapter[String(v)] ??= []);
					// Two readings of the same day may overlap on a verse.
					if (list[list.length - 1] !== at) list.push(at);
				}
			}
		}
	}

	return { days, books, skipped };
}
