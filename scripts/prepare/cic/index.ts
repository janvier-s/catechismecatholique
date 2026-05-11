import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCic, type CicBuildResult } from './build.ts';
import { logStep, endStep, assert } from '../validators.ts';

export interface PrepareCicArgs {
	epubPath: string;
	outDir: string;
}

export function prepareCic(args: PrepareCicArgs): CicBuildResult {
	logStep('CIC: extracting EPUB');
	const tmp = mkdtempSync(join(tmpdir(), 'cic-epub-'));
	try {
		execSync(`unzip -q "${args.epubPath}" -d "${tmp}"`);
		endStep('extracted');

		logStep('CIC: parsing French HTML');
		const fileMap: Record<string, string> = {};
		for (const name of readdirSync(tmp)) {
			if (!/^fr(17|83)l\d+/.test(name)) continue;
			fileMap[name] = readFileSync(join(tmp, name), 'utf8');
		}
		const out = buildCic({ fileMap });
		const livreCount = Object.keys(out.livres).length;
		const canonCount83 = Object.keys(out.canons['1983'] ?? {}).length;
		const canonCount17 = Object.keys(out.canons['1917'] ?? {}).length;
		assert(livreCount > 0, 'CIC: no livres parsed');
		endStep(`${livreCount} livres, ${canonCount83} canons (1983), ${canonCount17} canons (1917)`);

		logStep('CIC: writing output');
		mkdirSync(join(args.outDir, 'livres'), { recursive: true });
		writeFileSync(join(args.outDir, 'structure.json'), JSON.stringify(out.structure));
		for (const [slug, livre] of Object.entries(out.livres)) {
			writeFileSync(join(args.outDir, 'livres', `${slug}.json`), JSON.stringify(livre));
		}
		writeFileSync(join(args.outDir, 'canons.json'), JSON.stringify(out.canons));
		endStep(`structure + ${livreCount} shards`);

		return out;
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
}
