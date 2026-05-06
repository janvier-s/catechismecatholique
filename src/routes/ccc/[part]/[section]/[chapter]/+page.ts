import { error, redirect } from '@sveltejs/kit';
import { loadChapter, loadParagraph, loadStructure } from '$lib/data/loaders';
import type { Paragraph, Structure } from '$lib/data/types';
import type { PageLoad } from './$types';

// When `chapter` doesn't resolve, the third path segment may be an
// articles_direct slug (sections like "Notre Père" expose articles directly,
// no enclosing chapter). Look it up in the structure and redirect to the
// canonical paragraph-range URL the cccref route handles.
async function maybeRedirectArticlesDirect(
	part: string,
	section: string,
	slug: string,
	fetcher: typeof fetch
): Promise<never | null> {
	const struct = (await loadStructure(fetcher)) as Structure;
	const sec = struct.parts.find((p) => p.slug === part)?.sections?.find((s) => s.slug === section);
	const article = sec?.articles_direct?.find((a) => a.slug === slug);
	if (article && article.paragraphs.length > 0) {
		const from = article.paragraphs[0]!;
		const to = article.paragraphs[article.paragraphs.length - 1]!;
		throw redirect(307, from === to ? `/ccc/${from}` : `/ccc/${from}-${to}`);
	}
	return null;
}

export const load: PageLoad = async ({ params, fetch }) => {
	let chapter;
	try {
		chapter = await loadChapter(params.chapter!, fetch);
	} catch {
		await maybeRedirectArticlesDirect(params.part!, params.section!, params.chapter!, fetch);
		throw error(404, 'Chapitre introuvable');
	}
	if (chapter.part_slug !== params.part || chapter.section_slug !== params.section) {
		await maybeRedirectArticlesDirect(params.part!, params.section!, params.chapter!, fetch);
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
