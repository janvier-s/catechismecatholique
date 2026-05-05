// "Paragraphe" recovery for CCC articles.
//
// The catechism source has a structural level between `article` and the
// Roman-numeral `heading` that the upstream JSON tree (ccc_paras_processed)
// drops. Each long article (e.g. `Article 1 : « Je crois en Dieu le Père
// tout-puissant »`) is broken into "Paragraphe 1. JE CROIS EN DIEU",
// "Paragraphe 2. LE PÈRE", "Paragraphe 3. LE TOUT-PUISSANT", etc., and the
// Roman-numeral subdivisions reset (I., II., III., IV.) inside each one.
//
// This module re-parses the source xhtml chunks looking for those
// `<h2 class="level2_title">Paragraphe N. TITLE</h2>` markers and the first
// paragraph number that appears AFTER each marker, so the rendering layer
// can re-introduce the wrappers.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sentenceCase } from './sentence-case';
import { normalizeGuillemets } from './source-data-fixes';

export interface Paragraphe {
	number: number; // 1, 2, 3, …
	title: string; // canonical case ("JE CROIS EN DIEU" → "Je crois en Dieu")
	paragraph_start: number; // first §N appearing under this Paragraphe
}

const PARAGRAPHE_RE =
	/<h2[^>]*class="level2_title"[^>]*>\s*Paragraphe\s+(\d+)\s*\.\s*([^<]+?)\s*<\/h2>/giu;
const PARA_ID_RE = /<span\s+class="renvois_cible"\s+id="renvlnk_p(\d+)">/g;

function fileOrder(name: string): number {
	// chunk012_chapter_cut1 sorts before chunk012_chapter_cut2; preserve that.
	const m = name.match(/^chunk(\d+)(?:_[^.]+?)?(?:_cut(\d+))?\.xhtml$/);
	if (!m) return Number.MAX_SAFE_INTEGER;
	return Number(m[1]) * 100 + Number(m[2] ?? 0);
}

function titleCase(raw: string): string {
	// Source uses ALL CAPS. Reuse the same sentence-case + guillemet
	// normalization the rest of the structure applies, so Dieu/Père/etc.
	// re-capitalize and `«` lands paired with NBSPs.
	return normalizeGuillemets(sentenceCase(raw.replace(/\s+/g, ' ').trim()));
}

interface Marker {
	kind: 'paragraphe' | 'paragraph';
	at: number; // file offset
	number: number;
	title?: string;
}

export function extractParagraphes(chunksDir: string): Paragraphe[] {
	const files = readdirSync(chunksDir)
		.filter((f) => /^chunk.*\.xhtml$/.test(f))
		.sort((a, b) => fileOrder(a) - fileOrder(b));

	const out: Paragraphe[] = [];

	for (const f of files) {
		const xhtml = readFileSync(join(chunksDir, f), 'utf8');
		const markers: Marker[] = [];

		let m: RegExpExecArray | null;
		PARAGRAPHE_RE.lastIndex = 0;
		while ((m = PARAGRAPHE_RE.exec(xhtml)) !== null) {
			markers.push({
				kind: 'paragraphe',
				at: m.index,
				number: Number(m[1]!),
				title: titleCase(m[2]!)
			});
		}
		PARA_ID_RE.lastIndex = 0;
		while ((m = PARA_ID_RE.exec(xhtml)) !== null) {
			markers.push({ kind: 'paragraph', at: m.index, number: Number(m[1]!) });
		}
		markers.sort((a, b) => a.at - b.at);

		// Walk forward: each Paragraphe header takes the next paragraph's
		// number as its paragraph_start.
		for (let i = 0; i < markers.length; i++) {
			const here = markers[i]!;
			if (here.kind !== 'paragraphe') continue;
			let firstPara: number | undefined;
			for (let j = i + 1; j < markers.length; j++) {
				const next = markers[j]!;
				if (next.kind === 'paragraph') {
					firstPara = next.number;
					break;
				}
			}
			if (firstPara === undefined) continue;
			out.push({
				number: here.number,
				title: here.title ?? '',
				paragraph_start: firstPara
			});
		}
	}

	// Stable sort by paragraph_start so consumers can binary-search by §N.
	out.sort((a, b) => a.paragraph_start - b.paragraph_start);
	return out;
}
