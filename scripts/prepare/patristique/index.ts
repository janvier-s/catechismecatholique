import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildPatristiqueWork, type PatBuildResult, type PatWorkConfig } from './build.ts';
import { buildPatristiqueMarkdown } from './markdown-build.ts';
import { logStep, endStep, assert } from '../validators.ts';

type PatWorkConfigExt = PatWorkConfig & {
	format: 'wikisource-html' | 'markdown';
	expectedChapters: number;
};

export const PATRISTIQUE_WORKS: PatWorkConfigExt[] = [
	{
		slug: 'didache',
		title: 'La Didachè',
		subtitle: 'Doctrine des douze Apôtres',
		author: 'Auteur anonyme',
		date: 'vers 80–100',
		translator: 'Hippolyte Hemmer, 1907',
		htmlPath: 'didache.html',
		format: 'wikisource-html',
		expectedChapters: 16
	},
	{
		slug: 'discours-catechetique',
		title: 'Discours catéchétique',
		subtitle: 'Oratio catechetica magna',
		author: 'Saint Grégoire de Nysse',
		date: 'vers 385',
		translator: 'Louis Méridier, 1908',
		htmlPath: 'discours-catechetique.html',
		format: 'wikisource-html',
		expectedChapters: 40
	},
	{
		slug: 'catecheses-mystagogiques',
		title: 'Catéchèses mystagogiques',
		subtitle: 'Aux nouveaux baptisés',
		author: 'Saint Cyrille de Jérusalem',
		date: 'vers 350',
		translator: 'Traducteur ancien (XIXᵉ siècle)',
		htmlPath: 'catecheses-mystagogiques.md',
		format: 'markdown',
		expectedChapters: 5
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
		const raw = readFileSync(src, 'utf8');
		const out =
			work.format === 'markdown'
				? buildPatristiqueMarkdown({ markdown: raw, config: work })
				: buildPatristiqueWork({ html: raw, config: work });
		assert(
			out.structure.totalChapters === work.expectedChapters,
			`Patristique ${work.slug}: expected ${work.expectedChapters} chapters, got ${out.structure.totalChapters}`
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
