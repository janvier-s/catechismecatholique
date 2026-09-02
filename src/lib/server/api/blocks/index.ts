import type { Fetch } from '$lib/data/loaders';
import type { BlockName } from '../include';
import { citedByBlock } from './citedBy';
import { themesBlock } from './themes';
import { sourcesBlock } from './sources';
import { enBrefBlock } from './enBref';
import { bibleBlock } from './bible';
import { liturgyBlock } from './liturgy';
import { compendiumBlock } from './compendium';
import { cdseBlock } from './cdse';
import { denzingerBlock } from './denzinger';

export type BlockFn = (n: number, fetcher: Fetch) => Promise<unknown>;

/**
 * One entry per include block. Adding a block is one module plus one line
 * here · nothing else in the routing layer changes.
 *
 * Not `const`: the unit tests swap an entry to exercise failure isolation.
 */
export const BLOCKS: Record<BlockName, BlockFn> = {
	cited_by: citedByBlock,
	themes: themesBlock,
	sources: sourcesBlock,
	liturgy: liturgyBlock,
	en_bref: enBrefBlock,
	bible: bibleBlock,
	compendium: compendiumBlock,
	cdse: cdseBlock,
	denzinger: denzingerBlock,
	// Filled in by Task 6.
	ai: notImplemented('ai')
};

function notImplemented(name: string): BlockFn {
	return async () => {
		throw new Error(`include block not yet implemented: ${name}`);
	};
}

export interface AssembledBlocks {
	data: Record<string, unknown>;
	/** Blocks that threw · their key is present but null. */
	partial: BlockName[];
}

/**
 * Resolve every requested block in parallel. A block that throws yields null
 * and is named in `partial` rather than failing the whole response: a client
 * asking for eight blocks must not lose the paragraph text because one shard
 * 404'd.
 */
export async function assembleBlocks(
	n: number,
	blocks: BlockName[],
	fetcher: Fetch
): Promise<AssembledBlocks> {
	const settled = await Promise.all(
		blocks.map(async (name) => {
			try {
				return { name, value: await BLOCKS[name](n, fetcher), failed: false };
			} catch {
				return { name, value: null, failed: true };
			}
		})
	);

	const data: Record<string, unknown> = {};
	const partial: BlockName[] = [];
	for (const { name, value, failed } of settled) {
		data[name] = value;
		if (failed) partial.push(name);
	}
	return { data, partial };
}
