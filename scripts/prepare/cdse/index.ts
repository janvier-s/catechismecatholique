import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCdse, type CdseBuildResult } from './build.ts';
import { logStep, endStep, assert } from '../validators.ts';

export interface PrepareCdseArgs {
	epubPath: string;
	outDir: string;
}

const CONTENT_FILES = [
	'ch01.xhtml',
	'ch01s02.xhtml',
	'ch01s03.xhtml',
	'ch01s04.xhtml',
	'ch01s05.xhtml',
	'ch01s06.xhtml',
	'ch01s07.xhtml',
	'ch01s08.xhtml'
];

export function prepareCdse(args: PrepareCdseArgs): CdseBuildResult {
	logStep('CDSE: extracting EPUB');
	const tmp = mkdtempSync(join(tmpdir(), 'cdse-epub-'));
	try {
		execSync(`unzip -q "${args.epubPath}" -d "${tmp}"`);
		endStep('extracted');

		logStep('CDSE: parsing content');
		const contentFiles = CONTENT_FILES.map((file) => ({
			file,
			contents: readFileSync(join(tmp, file), 'utf8')
		}));
		const out = buildCdse({ contentFiles });
		const paraCount = Object.keys(out.paragraphs).length;
		assert(paraCount === 583, `CDSE: expected 583 numbered paragraphs, got ${paraCount}`);
		const partsWithChapters = out.structure.parts.filter((p) => p.kind === 'part').length;
		assert(partsWithChapters === 3, `CDSE: expected 3 numbered parts, got ${partsWithChapters}`);
		endStep(`${paraCount} paragraphs, ${Object.keys(out.chapters).length} chapters`);

		logStep('CDSE: writing output');
		mkdirSync(join(args.outDir, 'chapters'), { recursive: true });
		writeFileSync(join(args.outDir, 'structure.json'), JSON.stringify(out.structure));
		for (const [slug, ch] of Object.entries(out.chapters)) {
			writeFileSync(join(args.outDir, 'chapters', `${slug}.json`), JSON.stringify(ch));
		}
		writeFileSync(join(args.outDir, 'paragraphs.json'), JSON.stringify(out.paragraphs));
		writeFileSync(join(args.outDir, 'cited-by-ccc.json'), JSON.stringify(out.citedByCcc));
		const cccKeys = Object.keys(out.citedByCcc).length;
		endStep(`structure + ${Object.keys(out.chapters).length} shards + ${cccKeys} CCC citers`);

		return out;
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
}
