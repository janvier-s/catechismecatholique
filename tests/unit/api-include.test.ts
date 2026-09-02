import { describe, it, expect } from 'vitest';
import { parseInclude, ALL_BLOCKS, DEFAULT_ALL } from '$lib/server/api/include';

describe('parseInclude', () => {
	it('returns no blocks when the parameter is absent', () => {
		const r = parseInclude(null);
		expect(r).toEqual({ ok: true, blocks: [] });
	});

	it('returns no blocks for an empty string', () => {
		expect(parseInclude('')).toEqual({ ok: true, blocks: [] });
	});

	it('parses a comma-separated list', () => {
		const r = parseInclude('themes,sources');
		expect(r).toEqual({ ok: true, blocks: ['themes', 'sources'] });
	});

	it('trims whitespace and deduplicates', () => {
		const r = parseInclude(' themes , themes,  sources ');
		expect(r).toEqual({ ok: true, blocks: ['themes', 'sources'] });
	});

	it('expands all to the nine non-ai blocks', () => {
		const r = parseInclude('all');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.blocks).toEqual([...DEFAULT_ALL]);
		expect(r.blocks).not.toContain('ai');
		expect(r.blocks).toHaveLength(9);
	});

	it('lets ai be requested alongside all', () => {
		const r = parseInclude('all,ai');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.blocks).toContain('ai');
		expect(r.blocks).toHaveLength(10);
	});

	it('rejects an unknown block by name', () => {
		const r = parseInclude('themes,trent');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('unknown_include');
		expect(r.message).toContain('trent');
	});

	it('rejects more than eight explicitly named blocks', () => {
		const r = parseInclude(ALL_BLOCKS.slice(0, 9).join(','));
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('too_many_blocks');
	});

	it('does not apply the explicit cap to all', () => {
		expect(parseInclude('all').ok).toBe(true);
	});

	it('exempts all from the cap even when many blocks are also named', () => {
		const r = parseInclude(['all', ...ALL_BLOCKS].join(','));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.blocks).toHaveLength(10);
	});

	it('accepts exactly eight explicitly named blocks', () => {
		const r = parseInclude(ALL_BLOCKS.slice(0, 8).join(','));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.blocks).toHaveLength(8);
	});
});
