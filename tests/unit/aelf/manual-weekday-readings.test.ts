import { describe, it, expect } from 'vitest';
import { MANUAL_WEEKDAY_READINGS } from '../../../scripts/aelf/manualWeekdayReadings';

describe('MANUAL_WEEKDAY_READINGS', () => {
	it('carries a well-formed entry for the Avent cycle II gap AELF cannot supply', () => {
		const entry = MANUAL_WEEKDAY_READINGS['II:avent-3-vendredi'];
		expect(entry).toBeDefined();
		expect(entry!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

		const types = entry!.lectures.map((l) => l.type);
		expect(types).toEqual(['lecture_1', 'psaume', 'evangile']);
		for (const lecture of entry!.lectures) {
			expect(lecture.ref).toBeTruthy();
			expect(lecture.contenu).toBeTruthy();
		}

		const gospel = entry!.lectures.find((l) => l.type === 'evangile')!;
		// The one piece of this entry independently verified against a second
		// source (a maintainer's paper missal) rather than only copied from the
		// cycle I occurrence - pinned so an edit here can't drift silently.
		expect(gospel.verset_evangile).toContain('Viens, Seigneur');
		expect(gospel.verset_evangile).toContain('que ta visite soit notre paix');
	});
});
