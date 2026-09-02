import { loadCecAiExplanation } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiAiExplanation {
	/** Always true. Present so a consumer cannot mistake this for source text. */
	generated: true;
	notice: string;
	markdown: string;
}

const NOTICE =
	'Commentaire généré automatiquement. Ce texte n’appartient pas au Catéchisme et n’a aucune autorité magistérielle.';

/**
 * Generated commentary on a paragraph. Deliberately excluded from
 * `include=all` and absent by default: a consuming tool must opt in by name,
 * and every payload says what it is.
 */
export async function aiBlock(n: number, fetcher: Fetch): Promise<ApiAiExplanation | null> {
	const md = await loadCecAiExplanation(n, fetcher);
	if (!md) return null;
	return { generated: true, notice: NOTICE, markdown: md };
}
