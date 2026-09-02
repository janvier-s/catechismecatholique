import { loadStructureToc } from '$lib/data/loaders';
import { apiJson } from '$lib/server/api/http';
import { trimStructure } from '$lib/server/api/structureDepth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const raw = url.searchParams.get('depth');
	// An unparseable depth is treated as "no limit" rather than an error · the
	// parameter is a convenience, not a contract the client can get wrong.
	const depth = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
	const toc = await loadStructureToc(fetch);
	return apiJson(trimStructure(toc, depth));
};
