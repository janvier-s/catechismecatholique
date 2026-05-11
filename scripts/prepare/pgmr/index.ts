import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPgmr, type PgmrBuildResult } from './build.ts';
import { logStep, endStep, assert } from '../validators.ts';

export interface PreparePgmrArgs {
	htmlPath: string;
	outDir: string;
}

export function preparePgmr(args: PreparePgmrArgs): PgmrBuildResult {
	logStep('PGMR: parsing HTML');
	const html = readFileSync(args.htmlPath, 'utf8');
	const out = buildPgmr({ html });
	const paraCount = Object.keys(out.paragraphs).length;
	assert(paraCount > 200, `PGMR: only ${paraCount} paragraphs parsed — pattern broke?`);
	const chapterCount = Object.keys(out.chapters).length;
	assert(chapterCount === 10, `PGMR: expected 10 chapters (1 preamble + 9), got ${chapterCount}`);
	endStep(`${paraCount} paragraphs, ${chapterCount} chapters`);

	logStep('PGMR: writing output');
	mkdirSync(join(args.outDir, 'chapters'), { recursive: true });
	writeFileSync(join(args.outDir, 'structure.json'), JSON.stringify(out.structure));
	for (const [slug, ch] of Object.entries(out.chapters)) {
		writeFileSync(join(args.outDir, 'chapters', `${slug}.json`), JSON.stringify(ch));
	}
	writeFileSync(join(args.outDir, 'paragraphs.json'), JSON.stringify(out.paragraphs));
	writeFileSync(join(args.outDir, 'cited-by-ccc.json'), JSON.stringify(out.citedByCcc));
	const cccKeys = Object.keys(out.citedByCcc).length;
	endStep(`structure + ${chapterCount} shards + ${cccKeys} CCC citers`);

	return out;
}
