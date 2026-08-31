import { describe, it, expect } from 'vitest';
import { buildWeekdayTargets } from '../../../scripts/prepare/weekdayFeasts';

describe('buildWeekdayTargets', () => {
	it('enumerates distinct weekday+cycle combinations with a past representative date', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2024-12-31');
		expect(targets.length).toBeGreaterThan(0);
		for (const t of targets) {
			expect(t.representativeDate.slice(0, 10) <= '2024-12-31').toBe(true);
			expect(['I', 'II']).toContain(t.cycle);
			expect(t.dayOfWeek).toBeGreaterThanOrEqual(1);
			expect(t.dayOfWeek).toBeLessThanOrEqual(6);
		}
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

	it('respects the today cutoff', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2023-06-01');
		for (const t of targets) {
			expect(t.representativeDate.slice(0, 10) <= '2023-06-01').toBe(true);
		}
	});
});
