import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logStep, endStep } from './validators.ts';

interface RawEntry {
	catechism_paragraph_number?: string;
	catechism_article_number?: string;
	explanation_html: string;
	explanation_md?: string;
}

export function prepareCecAi(args: { sourceDir: string; outDir: string }): { count: number } {
	logStep('building CEC AI explanations');

	mkdirSync(args.outDir, { recursive: true });

	const files = readdirSync(args.sourceDir).filter((f) => f.endsWith('.json'));

	const manifest: number[] = [];

	for (const file of files) {
		const raw: RawEntry[] = JSON.parse(readFileSync(join(args.sourceDir, file), 'utf8'));
		for (const entry of raw) {
			const numStr = entry.catechism_paragraph_number;
			if (!numStr) continue; // skip article-keyed entries (10 commandements)
			const md = entry.explanation_md;
			if (!md) continue;
			const n = parseInt(numStr, 10);
			if (!Number.isFinite(n)) continue;
			writeFileSync(join(args.outDir, `${n}.json`), JSON.stringify({ md }));
			manifest.push(n);
		}
	}

	manifest.sort((a, b) => a - b);
	writeFileSync(join(args.outDir, 'manifest.json'), JSON.stringify(manifest));

	endStep(`${manifest.length} explanations`);
	return { count: manifest.length };
}
