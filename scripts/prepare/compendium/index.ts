import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseToc } from './toc';
import { scanHtml } from './html';
import { buildCompendium, type SourceQuestion } from './build';
import { logStep, endStep, assert } from '../validators';

export interface PrepareCompendiumArgs {
	epubPath: string;
	sourceJsonPath: string;
	outDir: string;
}

export function prepareCompendium(args: PrepareCompendiumArgs): {
	citedBy: Record<number, number[]>;
	questionDocs: { number: number; question: string; answer: string; partSlug: string }[];
} {
	logStep('compendium: extracting EPUB');
	const tmp = mkdtempSync(join(tmpdir(), 'compendium-epub-'));
	execSync(`unzip -q "${args.epubPath}" -d "${tmp}"`);
	endStep('extracted');

	logStep('compendium: parsing toc.ncx');
	const tocXml = readFileSync(join(tmp, 'OEBPS/toc.ncx'), 'utf8');
	const toc = parseToc(tocXml);
	assert(toc.length > 0, 'compendium: empty TOC');
	endStep(`${toc.length} entries`);

	logStep('compendium: scanning HTML files');
	const fileNames = ['000.htm', '001.htm', '002.htm', '003.htm', '004.htm'];
	const files = fileNames.map((file) => ({
		file: `Text/${file}`,
		events: scanHtml(readFileSync(join(tmp, 'OEBPS/Text', file), 'utf8'))
	}));
	endStep(`${files.reduce((s, f) => s + f.events.length, 0)} events`);

	logStep('compendium: loading source JSON');
	const sourceJson = JSON.parse(readFileSync(args.sourceJsonPath, 'utf8')) as SourceQuestion[];
	assert(sourceJson.length === 598, `compendium: expected 598 questions, got ${sourceJson.length}`);
	endStep(`${sourceJson.length} questions`);

	logStep('compendium: building outputs');
	// TOC entries from parseToc already use file: 'Text/000.htm' (with prefix); files above also use 'Text/' prefix. Pass through unchanged.
	const out = buildCompendium({ sourceJson, toc, files });
	assert(out.structure.parts.length === 4, `compendium: expected 4 parts, got ${out.structure.parts.length}`);

	mkdirSync(join(args.outDir, 'parts'), { recursive: true });
	writeFileSync(join(args.outDir, 'structure.json'), JSON.stringify(out.structure));
	for (const [slug, bundle] of Object.entries(out.parts)) {
		writeFileSync(join(args.outDir, 'parts', `${slug}.json`), JSON.stringify(bundle));
	}
	writeFileSync(join(args.outDir, 'cited-by.json'), JSON.stringify(out.citedBy));
	writeFileSync(join(args.outDir, 'q-ranges.json'), JSON.stringify(out.qRanges));

	const totalQ = Object.values(out.parts).reduce(
		(sum, p) => sum + p.flow.filter((n) => n.kind === 'question').length,
		0
	);
	endStep(`${totalQ} Qs, ${out.structure.parts.length} parts`);

	const questionDocs: { number: number; question: string; answer: string; partSlug: string }[] = [];
	for (const part of Object.values(out.parts)) {
		for (const node of part.flow) {
			if (node.kind !== 'question') continue;
			questionDocs.push({
				number: node.data.number,
				question: node.data.question,
				answer: node.data.answer_html.replace(/<[^>]+>/g, ''),
				partSlug: part.slug
			});
		}
	}
	return { citedBy: out.citedBy, questionDocs };
}
