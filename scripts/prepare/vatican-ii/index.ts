import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	writeFileSync,
	rmSync,
	existsSync
} from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildVatIIDoc, type VatIIBlock, type VatIIFootnote } from './build.ts';
import { VATICAN_II_REGISTRY, type VatIIDocKind } from './registry.ts';
import { logStep, endStep } from '../validators.ts';
import { sanitizeExternalHrefs } from '../sanitize-external-hrefs.ts';

const KNOWN_VAT_II_SLUGS = new Set(
	VATICAN_II_REGISTRY.filter((d) => d.file !== null).map((d) => d.slug)
);

export interface VatIIDocRef {
	slug: string;
	abbr: string;
	kind: VatIIDocKind;
	date: string;
	title: string;
	subtitle: string;
	totalParagraphs: number;
	present: boolean; // false for the 3 missing decrees
}

export interface VatIIStructure {
	docs: VatIIDocRef[];
}

export interface VatIIDoc {
	slug: string;
	abbr: string;
	kind: VatIIDocKind;
	date: string;
	title: string;
	subtitle: string;
	blocks: VatIIBlock[];
	footnotes: VatIIFootnote[];
}

export interface PrepareVatIIArgs {
	epubDir: string;
	outDir: string;
}

export interface PrepareVatIIResult {
	structure: VatIIStructure;
	docs: Record<string, VatIIDoc>;
}

export function prepareVaticanII(args: PrepareVatIIArgs): PrepareVatIIResult {
	const docs: Record<string, VatIIDoc> = {};
	const refs: VatIIDocRef[] = [];

	for (const spec of VATICAN_II_REGISTRY) {
		if (!spec.file) {
			refs.push({
				slug: spec.slug,
				abbr: spec.abbr,
				kind: spec.kind,
				date: spec.date,
				title: spec.title,
				subtitle: spec.subtitle,
				totalParagraphs: 0,
				present: false
			});
			continue;
		}
		const epubPath = join(args.epubDir, spec.file);
		if (!existsSync(epubPath)) {
			refs.push({
				slug: spec.slug,
				abbr: spec.abbr,
				kind: spec.kind,
				date: spec.date,
				title: spec.title,
				subtitle: spec.subtitle,
				totalParagraphs: 0,
				present: false
			});
			continue;
		}
		logStep(`Vatican II: ${spec.title}`);
		const tmp = mkdtempSync(join(tmpdir(), `vat-ii-${spec.slug}-`));
		try {
			execSync(`unzip -q "${epubPath}" -d "${tmp}"`);
			const contentFiles = readdirSync(tmp)
				.filter((f) => /^ch.*\.xhtml$/.test(f))
				.sort()
				.map((f) => readFileSync(join(tmp, f), 'utf8'));
			const out = buildVatIIDoc({ contentFiles });
			// Sanitize external vatican.va hrefs: rewrite cross-doc refs to
			// our internal /vatican-ii/<slug> routes, strip non-Vatican-II
			// archive/holy_father/roman_curia links (prerender would 404).
			for (const b of out.blocks) {
				if (b.kind === 'paragraph') {
					b.html = sanitizeExternalHrefs(b.html, KNOWN_VAT_II_SLUGS);
				}
			}
			for (const fn of out.footnotes) {
				fn.html = sanitizeExternalHrefs(fn.html, KNOWN_VAT_II_SLUGS);
			}
			const doc: VatIIDoc = {
				slug: spec.slug,
				abbr: spec.abbr,
				kind: spec.kind,
				date: spec.date,
				title: spec.title,
				subtitle: spec.subtitle,
				blocks: out.blocks,
				footnotes: out.footnotes
			};
			docs[spec.slug] = doc;
			refs.push({
				slug: spec.slug,
				abbr: spec.abbr,
				kind: spec.kind,
				date: spec.date,
				title: spec.title,
				subtitle: spec.subtitle,
				totalParagraphs: out.totalParagraphs,
				present: true
			});
			endStep(`${out.totalParagraphs} paragraphs`);
		} finally {
			rmSync(tmp, { recursive: true, force: true });
		}
	}

	logStep('Vatican II: writing output');
	mkdirSync(join(args.outDir, 'docs'), { recursive: true });
	for (const [slug, doc] of Object.entries(docs)) {
		writeFileSync(join(args.outDir, 'docs', `${slug}.json`), JSON.stringify(doc));
	}
	const structure: VatIIStructure = { docs: refs };
	writeFileSync(join(args.outDir, 'structure.json'), JSON.stringify(structure));
	const present = refs.filter((r) => r.present).length;
	endStep(
		`${present}/${refs.length} docs ready (${Object.values(docs).reduce((s, d) => s + d.blocks.filter((b) => b.kind === 'paragraph').length, 0)} paragraphs total)`
	);

	return { structure, docs };
}
