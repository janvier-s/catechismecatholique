import { describe, it, expect } from 'vitest';
import { secondsUntilParisMidnight, todayInParis } from '$lib/server/api/parisTime';

// Paris is UTC+2 in September (CEST) and UTC+1 in January (CET). The fixtures
// below are expressed in UTC and the expected values account for the offset,
// so a regression in the timezone handling shows up as a wrong number rather
// than silently passing.
describe('secondsUntilParisMidnight', () => {
	it('returns a large value early in the Paris day, capped at one hour', () => {
		// 06:00 UTC on 2 Sep is 08:00 Paris · 16 hours to midnight, so clamped.
		expect(secondsUntilParisMidnight(new Date('2026-09-02T06:00:00Z'))).toBe(3600);
	});

	it('returns the real remainder when under an hour is left', () => {
		// 21:30 UTC on 2 Sep is 23:30 Paris · 30 minutes to midnight.
		expect(secondsUntilParisMidnight(new Date('2026-09-02T21:30:00Z'))).toBe(1800);
	});

	it('never returns less than the floor, even seconds before midnight', () => {
		// 21:59:50 UTC is 23:59:50 Paris · 10 seconds, below the 60s floor.
		expect(secondsUntilParisMidnight(new Date('2026-09-02T21:59:50Z'))).toBe(60);
	});

	it('accounts for the winter offset, not a fixed one', () => {
		// 23:30 UTC on 1 Jan is 00:30 Paris on 2 Jan (CET, UTC+1), so nearly a
		// full day remains and the value clamps to the ceiling. Under a naive
		// UTC calculation this would be 1800 instead.
		expect(secondsUntilParisMidnight(new Date('2026-01-01T23:30:00Z'))).toBe(3600);
	});

	it('stays within the clamp for every hour of a day', () => {
		for (let h = 0; h < 24; h++) {
			const v = secondsUntilParisMidnight(
				new Date(`2026-09-02T${String(h).padStart(2, '0')}:00:00Z`)
			);
			expect(v).toBeGreaterThanOrEqual(60);
			expect(v).toBeLessThanOrEqual(3600);
		}
	});
});

describe('todayInParis', () => {
	it('formats as YYYY-MM-DD', () => {
		expect(todayInParis(new Date('2026-09-02T06:00:00Z'))).toBe('2026-09-02');
	});

	it('rolls to the next day once Paris has passed midnight but UTC has not', () => {
		// 22:30 UTC on 2 Sep is 00:30 Paris on 3 Sep.
		expect(todayInParis(new Date('2026-09-02T22:30:00Z'))).toBe('2026-09-03');
	});

	it('does not roll early in the Paris day', () => {
		expect(todayInParis(new Date('2026-09-02T21:30:00Z'))).toBe('2026-09-02');
	});
});
