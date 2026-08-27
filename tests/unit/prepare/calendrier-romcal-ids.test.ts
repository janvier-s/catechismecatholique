import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareCalendrier } from '../../../scripts/prepare/calendrier';
import { NAMED_FEAST_ROMCAL_ID } from '../../../scripts/prepare/calendrierRomcalIds';
import { parseFrenchOrdinal } from '../../../scripts/prepare/calendrierFrenchOrdinal';

describe('NAMED_FEAST_ROMCAL_ID coverage', () => {
	it('every real feast slug resolves via the id map or the ordinal parser', () => {
		const outDir = mkdtempSync(join(tmpdir(), 'calendrier-coverage-'));
		try {
			prepareCalendrier({ sourceDir: 'scripts/data-sources/calendrier', outDir });

			const unresolved: string[] = [];
			for (const key of ['a', 'b', 'c'] as const) {
				const yearFile = JSON.parse(readFileSync(join(outDir, `annee-${key}.json`), 'utf8'));
				for (const feast of yearFile.feasts) {
					if (NAMED_FEAST_ROMCAL_ID[feast.slug]) continue;
					if (parseFrenchOrdinal(feast.title) !== null) continue;
					unresolved.push(`${key}: ${feast.slug} (${feast.title})`);
				}
			}
			const index = JSON.parse(readFileSync(join(outDir, 'index.json'), 'utf8'));
			for (const ff of index.fixed_feasts) {
				if (!NAMED_FEAST_ROMCAL_ID[ff.slug]) unresolved.push(`fixed: ${ff.slug} (${ff.title})`);
			}

			expect(unresolved).toEqual([]);
		} finally {
			rmSync(outDir, { recursive: true, force: true });
		}
	});
});
