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
	assert(chCount > 350, `CPA: only ${chCount} chapters parsed — pattern broke?`);
	assert(pCount > 600, `CPA: only ${pCount} numbered paragraphs — pattern broke?`);
	const sCount = out.structure.sections.length;
	endStep(`${sCount} sections, ${chCount} chapters, ${pCount} paragraphs`);

	logStep('CPA: writing output');
	mkdirSync(join(args.outDir, 'sections'), { recursive: true });
	writeFileSync(join(args.outDir, 'structure.json'), JSON.stringify(out.structure));
	for (const [slug, sec] of Object.entries(out.sections)) {
		writeFileSync(join(args.outDir, 'sections', `${slug}.json`), JSON.stringify(sec));
	}
	endStep(`structure + ${out.structure.sections.length} section shards`);
	return out;
}
