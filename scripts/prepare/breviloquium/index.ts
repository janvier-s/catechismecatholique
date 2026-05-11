import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildBreviloquium, type BrevBuildResult } from './build.ts';
import { logStep, endStep, assert } from '../validators.ts';

export interface PrepareBreviloquiumArgs {
	htmlPath: string;
	outDir: string;
}

export function prepareBreviloquium(args: PrepareBreviloquiumArgs): BrevBuildResult {
	logStep('Breviloquium: parsing HTML');
	const html = readFileSync(args.htmlPath, 'utf8');
	const out = buildBreviloquium({ html });
	const chCount = Object.keys(out.chapters).length;
	const partCount = out.structure.parts.length;
	assert(chCount > 70, `Breviloquium: only ${chCount} chapters parsed — pattern broke?`);
	assert(
		partCount >= 8,
		`Breviloquium: expected ≥8 parts (prologue + 7 + conclusion), got ${partCount}`
	);
	endStep(`${partCount} parts, ${chCount} chapters`);

	logStep('Breviloquium: writing output');
	mkdirSync(join(args.outDir, 'chapters'), { recursive: true });
	writeFileSync(join(args.outDir, 'structure.json'), JSON.stringify(out.structure));
	for (const [slug, ch] of Object.entries(out.chapters)) {
		writeFileSync(join(args.outDir, 'chapters', `${slug}.json`), JSON.stringify(ch));
	}
	endStep(`structure + ${chCount} shards`);

	return out;
}
