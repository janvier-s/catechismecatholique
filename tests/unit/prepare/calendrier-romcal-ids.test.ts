import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareCalendrier } from '../../../scripts/prepare/calendrier';
import { NAMED_FEAST_ROMCAL_ID } from '../../../scripts/prepare/calendrierRomcalIds';
import { parseFrenchOrdinal } from '../../../scripts/prepare/calendrierFrenchOrdinal';

// CCC_Liturgy_List.txt is gitignored (not checked in) and thus absent in CI.
// TODO: remove this guard once the source file is committed or fetched in CI.
const sourceFile = join('scripts/data-sources/calendrier', 'CCC_Liturgy_List.txt');

describe.skipIf(!existsSync(sourceFile))('NAMED_FEAST_ROMCAL_ID coverage', () => {
	it('every real feast slug resolves via the id map or the ordinal parser', async () => {
		const outDir = mkdtempSync(join(tmpdir(), 'calendrier-coverage-'));
		try {
			await prepareCalendrier({ sourceDir: 'scripts/data-sources/calendrier', outDir });

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
