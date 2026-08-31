import { describe, it, expect } from 'vitest';
import { buildWeekdayTargets, isDateProperWeekday } from '../../../scripts/prepare/weekdayFeasts';

describe('isDateProperWeekday', () => {
	it('excludes all of Christmas Time and Advent from 17 December', () => {
		expect(isDateProperWeekday('noel', '2024-01-03')).toBe(true);
		expect(isDateProperWeekday('avent', '2024-12-17')).toBe(true);
		expect(isDateProperWeekday('avent', '2024-12-23')).toBe(true);
	});

	it('keeps the week-proper seasons and early Advent', () => {
		expect(isDateProperWeekday('avent', '2024-12-16')).toBe(false);
		expect(isDateProperWeekday('avent', '2024-12-02')).toBe(false);
		expect(isDateProperWeekday('ordinaire', '2024-07-01')).toBe(false);
		expect(isDateProperWeekday('careme', '2024-03-05')).toBe(false);
		expect(isDateProperWeekday('pascal', '2024-04-09')).toBe(false);
	});
});

describe('buildWeekdayTargets', () => {
	it('enumerates distinct weekday+cycle combinations with at least one past candidate date', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2024-12-31');
		expect(targets.length).toBeGreaterThan(0);
		for (const t of targets) {
			expect(t.candidates.length).toBeGreaterThan(0);
			for (const c of t.candidates) {
				expect(c.date <= '2024-12-31').toBe(true);
				expect(['WEEKDAY', 'MEMORIAL', 'OPTIONAL_MEMORIAL']).toContain(c.rank);
			}
			expect(['I', 'II']).toContain(t.cycle);
			expect(t.dayOfWeek).toBeGreaterThanOrEqual(1);
			expect(t.dayOfWeek).toBeLessThanOrEqual(6);
		}
	});

	it('orders candidates most recent first', async () => {
		const targets = await buildWeekdayTargets(2020, 2024, '2024-12-31');
		const multi = targets.find((t) => t.candidates.length > 1);
		expect(multi).toBeDefined();
		const dates = multi!.candidates.map((c) => c.date);
		expect(dates).toEqual([...dates].sort().reverse());
	});

	it('produces a stable, human-readable slug shape', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2024-12-31');
		const ordinaryMonday = targets.find((t) => /^ordinaire-\d+-lundi$/.test(t.slug));
		expect(ordinaryMonday).toBeDefined();
	});

	it('never produces a Sunday slug', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2024-12-31');
		expect(targets.some((t) => t.slug.endsWith('-dimanche'))).toBe(false);
	});

	it('produces no targets for Christmas Time or Advent from 17 December', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2024-12-31');
		expect(targets.some((t) => t.season === 'noel')).toBe(false);
		const lateAdvent = targets.filter(
			(t) => t.season === 'avent' && t.candidates.some((c) => c.date.slice(5, 10) >= '12-17')
		);
		expect(lateAdvent).toEqual([]);
		// The week-proper part of Advent is still enumerated.
		expect(targets.some((t) => t.season === 'avent')).toBe(true);
	});

	it('respects the today cutoff', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2023-06-01');
		for (const t of targets) {
			for (const c of t.candidates) {
				expect(c.date <= '2023-06-01').toBe(true);
			}
		}
	});

	it('accepts memorial and optional-memorial occurrences as candidates too, not just plain weekdays', async () => {
		const targets = await buildWeekdayTargets(2020, 2026, '2026-08-31');
		const anyNonWeekdayCandidate = targets.some((t) =>
			t.candidates.some((c) => c.rank !== 'WEEKDAY')
		);
		expect(anyNonWeekdayCandidate).toBe(true);
	});
});
