import { error } from '@sveltejs/kit';
import { loadChapter, loadParagraph } from '$lib/data/loaders';
import type { Paragraph } from '$lib/data/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	let chapter;
	try {
		chapter = await loadChapter(params.chapter!, fetch);
	} catch {
		throw error(404, 'Chapitre introuvable');
	}
	if (chapter.part_slug !== params.part || chapter.section_slug !== params.section) {
		throw error(404, 'Chapitre introuvable');
	}

	// Load all paragraphs in the chapter (including those that belong to en_bref blocks).
	const paragraphs = await Promise.all(chapter.paragraphs.map((n) => loadParagraph(n, fetch)));

	// Resolve en_bref paragraph records (so the renderer doesn't need a second round trip per block).
	const enBrefParagraphMap = new Map<number, Paragraph>();
	const enBrefNumbers = new Set<number>();
	for (const block of chapter.en_brefs) for (const n of block.paragraphs) enBrefNumbers.add(n);
	for (const p of paragraphs) {
		if (enBrefNumbers.has(p.number)) enBrefParagraphMap.set(p.number, p);
	}
	// Some en_bref paragraphs might not be in chapter.paragraphs (data quirks). Fetch any missing.
	for (const n of enBrefNumbers) {
		if (!enBrefParagraphMap.has(n)) {
			try {
				enBrefParagraphMap.set(n, await loadParagraph(n, fetch));
			} catch {
				// skip
			}
		}
	}

	return { chapter, paragraphs, enBrefParagraphMap: Object.fromEntries(enBrefParagraphMap) };
};
