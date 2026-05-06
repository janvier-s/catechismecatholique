import { error, redirect } from '@sveltejs/kit';
import { loadChapterFull, loadStructure } from '$lib/data/loaders';
import type { Structure } from '$lib/data/types';
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
	let bundle;
	try {
		bundle = await loadChapterFull(params.chapter!, fetch);
	} catch {
		await maybeRedirectArticlesDirect(params.part!, params.section!, params.chapter!, fetch);
		throw error(404, 'Chapitre introuvable');
	}
	const { chapter } = bundle;
	if (chapter.part_slug !== params.part || chapter.section_slug !== params.section) {
		await maybeRedirectArticlesDirect(params.part!, params.section!, params.chapter!, fetch);
		throw error(404, 'Chapitre introuvable');
	}

	return {
		chapter,
		paragraphs: bundle.paragraphs,
		enBrefParagraphMap: bundle.enBrefParagraphMap
	};
};
