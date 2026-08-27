import type {
	CalendrierDateRow,
	CalendrierDatesIndexFile,
	CalendrierFeast,
	CalendrierFixedFeast,
	CalendrierYearKey
} from '$lib/data/types';
import { loadCalendrierYear } from '$lib/data/loaders';

export function toIsoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** The Sunday of the same week if `d` is a weekday, else `d` unchanged. */
export function nextSunday(d: Date): Date {
	const copy = new Date(d);
	if (copy.getDay() !== 0) copy.setDate(copy.getDate() + (7 - copy.getDay()));
	return copy;
}

/**
 * The Sunday of the same week if `d` is a weekday, or a full week earlier if
 * `d` is already a Sunday, walking back from a Sunday that isn't itself
 * covered by the dataset (a rare gap week) should reach last week's Sunday,
 * not repeat the same already-failed date.
 */
export function previousSunday(d: Date): Date {
	const copy = new Date(d);
	const daysBack = copy.getDay() === 0 ? 7 : copy.getDay();
	copy.setDate(copy.getDate() - daysBack);
	return copy;
}

export function findRow(index: CalendrierDatesIndexFile, isoDate: string): CalendrierDateRow | null {
	if (isoDate < index.rangeStart || isoDate > index.rangeEnd) return null;
	return index.rows.find((r) => r.date === isoDate) ?? null;
}

export type ResolvedDay =
	| { status: 'match'; row: CalendrierDateRow; label: 'today' | 'previous-sunday' | 'picked' }
	| { status: 'no-match' }
	| { status: 'out-of-range' };

export function resolveToday(index: CalendrierDatesIndexFile, now: Date = new Date()): ResolvedDay {
	const todayIso = toIsoDate(now);
	if (todayIso < index.rangeStart || todayIso > index.rangeEnd) return { status: 'out-of-range' };

	const todayRow = findRow(index, todayIso);
	if (todayRow) return { status: 'match', row: todayRow, label: 'today' };

	const prevRow = findRow(index, toIsoDate(previousSunday(now)));
	if (prevRow) return { status: 'match', row: prevRow, label: 'previous-sunday' };

	return { status: 'no-match' };
}

export function resolvePickedDate(index: CalendrierDatesIndexFile, picked: Date): ResolvedDay {
	const pickedIso = toIsoDate(picked);
	if (pickedIso < index.rangeStart || pickedIso > index.rangeEnd) return { status: 'out-of-range' };

	const exact = findRow(index, pickedIso);
	if (exact) return { status: 'match', row: exact, label: 'picked' };

	const snappedIso = toIsoDate(nextSunday(picked));
	if (snappedIso < index.rangeStart || snappedIso > index.rangeEnd) return { status: 'out-of-range' };

	const snapped = findRow(index, snappedIso);
	if (snapped) return { status: 'match', row: snapped, label: 'picked' };

	return { status: 'no-match' };
}

/** Fetches the full feast record (with clusters) a resolved row points to. */
export async function resolveFeastForRow(
	row: CalendrierDateRow,
	fixedFeasts: (CalendrierFeast | CalendrierFixedFeast)[]
): Promise<CalendrierFeast | CalendrierFixedFeast | null> {
	if (row.corpus === 'fixed') {
		return fixedFeasts.find((f) => f.slug === row.slug) ?? null;
	}
	const year = await loadCalendrierYear(row.yearKey as CalendrierYearKey);
	return year.feasts.find((f) => f.slug === row.slug) ?? null;
}
