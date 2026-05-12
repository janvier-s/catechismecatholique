import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildCpa, type CpaBuildResult } from './build.ts';
import { logStep, endStep, assert } from '../validators.ts';

export interface PrepareCpaArgs {
	markdownPath: string;
	outDir: string;
}

export function prepareCpa(args: PrepareCpaArgs): CpaBuildResult {
	logStep('CPA: parsing markdown');
	if (!existsSync(args.markdownPath)) {
		endStep('source missing — skipped');
		return null as unknown as CpaBuildResult;
	}
	const markdown = readFileSync(args.markdownPath, 'utf8');
	const out = buildCpa({ markdown });
	const chCount = out.structure.totalChapters;
	const pCount = out.structure.totalParagraphs;
	assert(chCount > 400, `CPA: only ${chCount} chapters parsed — pattern broke?`);
	assert(pCount > 600, `CPA: only ${pCount} numbered paragraphs — pattern broke?`);
	endStep(`${chCount} chapters, ${pCount} paragraphs`);

	logStep('CPA: writing output');
	mkdirSync(join(args.outDir, 'chapters'), { recursive: true });
	writeFileSync(join(args.outDir, 'structure.json'), JSON.stringify(out.structure));
	for (const [slug, ch] of Object.entries(out.chapters)) {
		writeFileSync(join(args.outDir, 'chapters', `${slug}.json`), JSON.stringify(ch));
	}
	endStep(`structure + ${chCount} shards`);
	return out;
}
