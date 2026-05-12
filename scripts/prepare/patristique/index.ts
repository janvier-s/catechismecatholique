import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildPatristiqueWork, type PatBuildResult, type PatWorkConfig } from './build.ts';
import { logStep, endStep, assert } from '../validators.ts';

export const PATRISTIQUE_WORKS: PatWorkConfig[] = [
	{
		slug: 'didache',
		title: 'La Didachè',
		subtitle: 'Doctrine des douze Apôtres',
		author: 'Auteur anonyme',
		date: 'vers 80–100',
		translator: 'Hippolyte Hemmer, 1907',
		htmlPath: 'didache.html'
	},
	{
		slug: 'discours-catechetique',
		title: 'Discours catéchétique',
		subtitle: 'Oratio catechetica magna',
		author: 'Saint Grégoire de Nysse',
		date: 'vers 385',
		translator: 'Louis Méridier, 1908',
		htmlPath: 'discours-catechetique.html'
	}
];

export interface PreparePatristiqueArgs {
	sourcesDir: string;
	outDirRoot: string; // e.g. static/data — each work writes into outDirRoot/<slug>/
}

export function preparePatristique(args: PreparePatristiqueArgs): Record<string, PatBuildResult> {
	const results: Record<string, PatBuildResult> = {};
	for (const work of PATRISTIQUE_WORKS) {
		const src = join(args.sourcesDir, work.htmlPath);
		if (!existsSync(src)) {
			logStep(`Patristique: ${work.slug}`);
			endStep('source missing — skipped');
			continue;
		}
		logStep(`Patristique: ${work.slug}`);
		const html = readFileSync(src, 'utf8');
		const out = buildPatristiqueWork({ html, config: work });
		const expected = work.slug === 'didache' ? 16 : 40;
		assert(
			out.structure.totalChapters === expected,
			`Patristique ${work.slug}: expected ${expected} chapters, got ${out.structure.totalChapters}`
		);
		const outDir = join(args.outDirRoot, work.slug);
		mkdirSync(outDir, { recursive: true });
		// Single-page reader loads `full.json` (structure + ordered chapters
		// with full content) — works are small enough that one fetch is
		// faster than a 40-shard fan-out.
		writeFileSync(join(outDir, 'full.json'), JSON.stringify(out.full));
		writeFileSync(join(outDir, 'structure.json'), JSON.stringify(out.structure));
		endStep(`${out.structure.totalChapters} chapters`);
		results[work.slug] = out;
	}
	return results;
}
