import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildWeekdayFeast, formatWeekdayTitle } from '../../../scripts/prepare/weekdayReadings';
import {
	buildHeadingLevels,
	type CecStructureFile
} from '../../../scripts/prepare/cecHeadingCluster';
import type { CalendrierReading } from '../../../scripts/prepare/calendrier';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONCORDANCE_DIR = join(HERE, 'concordance-matcher-fixtures');
const structure: CecStructureFile = JSON.parse(
	readFileSync(join(HERE, 'cec-structure-fixture.json'), 'utf8')
);
const levels = buildHeadingLevels(structure);

function reading(type: CalendrierReading['type'], ref: string): CalendrierReading {
	return { type, ref, contenu: '' };
}

describe('formatWeekdayTitle', () => {
	it('formats an ordinary-time weekday', () => {
		expect(formatWeekdayTitle('ordinaire', 4, 1)).toBe('Lundi de la 4e semaine du Temps Ordinaire');
	});

	it('formats week 1 with the French "1re" ordinal, not "1e"', () => {
		expect(formatWeekdayTitle('avent', 1, 3)).toBe("Mercredi de la 1re semaine de l'Avent");
	});

	it('formats Lent', () => {
		expect(formatWeekdayTitle('careme', 2, 2)).toBe('Mardi de la 2e semaine de Carême');
	});

	it('formats Easter time', () => {
		expect(formatWeekdayTitle('pascal', 3, 6)).toBe('Samedi de la 3e semaine du Temps Pascal');
	});
});

describe('buildWeekdayFeast', () => {
	it('produces clusters from matched readings', () => {
		const feast = buildWeekdayFeast(
			'ordinaire-4-lundi',
			'ordinaire',
			4,
			1,
			'green',
			[reading('lecture_1', 'Ep 1, 1-10'), reading('evangile', 'Lc 4, 18-19')],
			CONCORDANCE_DIR,
			levels
		);
		expect(feast.slug).toBe('ordinaire-4-lundi');
		expect(feast.season).toBe('ordinaire');
		expect(feast.liturgicalColor).toBe('green');
		expect(feast.title).toBe('Lundi de la 4e semaine du Temps Ordinaire');
		expect(feast.clusters.length).toBeGreaterThan(0);
		expect(feast.clusters.every((c) => c.paragraphs.length > 0)).toBe(true);
	});

	it('produces an empty clusters array when nothing matches, without throwing', () => {
		const feast = buildWeekdayFeast(
			'ordinaire-4-mardi',
			'ordinaire',
			4,
			2,
			'green',
			[reading('lecture_1', 'Gn 999, 1-5')],
			CONCORDANCE_DIR,
			levels
		);
		expect(feast.clusters).toEqual([]);
	});

	it('ignores readings with unparseable refs rather than failing the whole feast', () => {
		const feast = buildWeekdayFeast(
			'ordinaire-4-mercredi',
			'ordinaire',
			4,
			3,
			'green',
			[reading('lecture_1', 'not a real ref'), reading('evangile', 'Lc 4, 24')],
			CONCORDANCE_DIR,
			levels
		);
		expect(feast.clusters.length).toBeGreaterThan(0);
	});
});
