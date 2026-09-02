import { describe, it, expect } from 'vitest';
import { assembleBlocks } from '$lib/server/api/blocks';
import { parseInclude } from '$lib/server/api/include';

// ONE shared double for the whole file. loadCecAiExplanation memoises both
// its manifest and its per-paragraph results at module level.
//
// The manifest is not optional: loadCecAiExplanation reads
// /data/cec/ai/manifest.json first and returns null for any paragraph the
// manifest does not list, without ever fetching the explanation file. A
// double that omits it makes every lookup return null.
const ROUTES: Record<string, unknown> = {
	'/cec/ai/manifest.json': [1],
	'/cec/ai/1.json': { md: 'Ce paragraphe enseigne…' }
};

const fetcher = (async (input: RequestInfo | URL) => {
	const url = String(input);
	for (const [frag, payload] of Object.entries(ROUTES)) {
		if (url.includes(frag)) {
			return { ok: true, status: 200, json: async () => payload, text: async () => '' };
		}
	}
	return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
}) as unknown as typeof fetch;

describe('ai block', () => {
	it('labels the payload as generated and carries a provenance notice', async () => {
		const r = await assembleBlocks(1, ['ai'], fetcher);
		expect(r.data.ai).toEqual({
			generated: true,
			notice:
				'Commentaire généré automatiquement. Ce texte n’appartient pas au Catéchisme et n’a aucune autorité magistérielle.',
			markdown: 'Ce paragraphe enseigne…'
		});
	});

	it('returns null when no explanation exists for the paragraph', async () => {
		const r = await assembleBlocks(2, ['ai'], fetcher);
		expect(r.data.ai).toBeNull();
		expect(r.partial).toEqual([]);
	});

	// The fence: generated commentary must never reach a consumer that did not
	// name it. If `ai` were added to DEFAULT_ALL, tools would re-cite AI prose
	// as if it were the Catechism.
	it('is never produced by include=all', () => {
		const parsed = parseInclude('all');
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.blocks).not.toContain('ai');
		expect(parsed.blocks).toHaveLength(9);
	});

	it('is produced only when named explicitly', () => {
		const parsed = parseInclude('all,ai');
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.blocks).toContain('ai');
	});
});
