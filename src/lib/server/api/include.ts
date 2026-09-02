import type { ApiErrorCode } from './http';

export type BlockName =
	| 'cited_by'
	| 'themes'
	| 'sources'
	| 'liturgy'
	| 'compendium'
	| 'en_bref'
	| 'bible'
	| 'cdse'
	| 'denzinger'
	| 'ai';

export const ALL_BLOCKS: readonly BlockName[] = [
	'cited_by',
	'themes',
	'sources',
	'liturgy',
	'compendium',
	'en_bref',
	'bible',
	'cdse',
	'denzinger',
	'ai'
];

/** What `include=all` expands to · everything except the generated commentary. */
export const DEFAULT_ALL: readonly BlockName[] = ALL_BLOCKS.filter((b) => b !== 'ai');

/**
 * Cap on explicitly enumerated blocks. `all` is deliberately exempt: it is one
 * token that expands to nine, and rejecting it would make the shorthand
 * useless.
 */
export const MAX_EXPLICIT_BLOCKS = 8;

export type IncludeResult =
	| { ok: true; blocks: BlockName[] }
	| { ok: false; message: string; code: ApiErrorCode };

function isBlockName(s: string): s is BlockName {
	return (ALL_BLOCKS as readonly string[]).includes(s);
}

export function parseInclude(raw: string | null): IncludeResult {
	if (!raw || raw.trim() === '') return { ok: true, blocks: [] };

	const tokens = raw
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

	const explicit: BlockName[] = [];
	let sawAll = false;

	for (const t of tokens) {
		if (t === 'all') {
			sawAll = true;
			continue;
		}
		if (!isBlockName(t)) {
			return {
				ok: false,
				code: 'unknown_include',
				message: `Bloc inconnu dans include : « ${t} ». Valeurs acceptées : ${ALL_BLOCKS.join(', ')}, all.`
			};
		}
		explicit.push(t);
	}

	const uniqueExplicit = [...new Set(explicit)];

	if (!sawAll && uniqueExplicit.length > MAX_EXPLICIT_BLOCKS) {
		return {
			ok: false,
			code: 'too_many_blocks',
			message: `include accepte au plus ${MAX_EXPLICIT_BLOCKS} blocs nommés (${uniqueExplicit.length} demandés). Utilisez include=all, ou répartissez la demande sur plusieurs requêtes.`
		};
	}

	// Preserve ALL_BLOCKS order for `all` so the response key order is stable,
	// and caller order for an explicit list so a client sees what it asked for.
	const merged = sawAll ? [...DEFAULT_ALL, ...uniqueExplicit] : uniqueExplicit;
	return { ok: true, blocks: [...new Set(merged)] };
}
