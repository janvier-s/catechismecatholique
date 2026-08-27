import { describe, it, expect } from 'vitest';
import { Romcal } from 'romcal';

describe('romcal dependency smoke test', () => {
	it('generates a calendar with the expected LiturgicalDay shape', async () => {
		const calendar = await new Romcal().generateCalendar(2024);
		const jan1 = calendar['2024-01-01']?.[0];
		expect(jan1).toBeDefined();
		expect(jan1!.id).toBe('mary_mother_of_god');
		expect(jan1!.rank).toBe('SOLEMNITY');
		expect(jan1!.colors).toEqual(['WHITE']);
		expect(jan1!.seasons).toEqual(['CHRISTMAS_TIME']);
		expect(jan1!.calendar.dayOfWeek).toBe(1); // Monday
	});

	it('flags Sundays via calendar.dayOfWeek === 0', async () => {
		const calendar = await new Romcal().generateCalendar(2024);
		const jan14 = calendar['2024-01-14']?.[0];
		expect(jan14).toBeDefined();
		expect(jan14!.id).toBe('ordinary_time_2_sunday');
		expect(jan14!.calendar.dayOfWeek).toBe(0);
		expect(jan14!.calendar.weekOfSeason).toBe(2);
		expect(jan14!.cycles.sundayCycle).toBe('YEAR_B');
		expect(jan14!.colors).toEqual(['GREEN']);
	});

	it('does not transfer Épiphanie/Ascension/Corpus Christi to Sunday by default', async () => {
		const calendar = await new Romcal().generateCalendar(2024);
		const epiphany = Object.values(calendar)
			.flat()
			.find((d) => d.id === 'epiphany_of_the_lord')!;
		expect(epiphany.date).toBe('2024-01-06');
		expect(epiphany.calendar.dayOfWeek).toBe(6); // Saturday, not transferred
	});
});
