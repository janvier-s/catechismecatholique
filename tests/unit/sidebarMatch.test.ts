import { describe, it, expect } from 'vitest';
import { itemMatches } from '../../src/lib/components/ui/sidebarMatch';

describe('itemMatches', () => {
	describe('exact match (shape A)', () => {
		it('matches identical hrefs', () => {
			expect(itemMatches('/ccc/part/section', '/ccc/part/section')).toBe(true);
		});

		it('matches when item is the bare URL parent of a hashed target', () => {
			expect(itemMatches('/ccc/part/section/chapter', '/ccc/part/section/chapter#h-id')).toBe(true);
		});

		it('rejects unrelated paths', () => {
			expect(itemMatches('/ccc/a', '/ccc/b')).toBe(false);
		});
	});

	describe('ancestor scope match (shape B)', () => {
		it('matches when target lives inside item scope', () => {
			expect(
				itemMatches('/ccc/part/section/chapter', '/ccc/part/section/chapter/article-1#h-id')
			).toBe(false); // ancestor of a different path — shape B only fires for hash on the same path
		});

		it('matches when item is the URL prefix and target carries a hash', () => {
			// "/ccc/x" + "#" === "/ccc/x#anything".slice(0, 6)
			expect(itemMatches('/ccc/x', '/ccc/x#h-id')).toBe(true);
		});
	});

	describe('cross-path hash match (shape C)', () => {
		it('matches when an article-prefixed heading entry meets a chapter-prefixed activeHref', () => {
			// scroll-spy on chapter page produces /ccc/x/y/chap#dieu, while the
			// tree's article-level heading entry is /ccc/x/y/chap/article-1#dieu
			expect(itemMatches('/ccc/x/y/chap/article-1#dieu', '/ccc/x/y/chap#dieu')).toBe(true);
		});

		it('matches in the reverse direction (chapter-prefixed item, article activeHref)', () => {
			// en_bref entries live at chapter level; activeHref may be article-level
			expect(itemMatches('/ccc/x/y/chap#en-bref-228', '/ccc/x/y/chap/article-1#en-bref-228')).toBe(
				true
			);
		});

		it('rejects when hashes match but paths are siblings, not ancestors', () => {
			expect(itemMatches('/ccc/x/y/chap1#h', '/ccc/x/y/chap2#h')).toBe(false);
		});

		it('rejects when paths align but hashes differ', () => {
			expect(itemMatches('/ccc/x/y/chap#one', '/ccc/x/y/chap/article-1#two')).toBe(false);
		});
	});

	describe('non-matches', () => {
		it('rejects when neither has a hash and paths differ', () => {
			expect(itemMatches('/ccc/a', '/ccc/a-other')).toBe(false);
		});

		it('rejects when only one side has a hash and paths differ', () => {
			expect(itemMatches('/ccc/a#x', '/ccc/b')).toBe(false);
		});
	});
});
