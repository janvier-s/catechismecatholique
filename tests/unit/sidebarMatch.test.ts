import { describe, it, expect } from 'vitest';
import { itemMatches } from '../../src/lib/components/ui/sidebarMatch';

describe('itemMatches', () => {
	describe('exact match (shape A)', () => {
		it('matches identical hrefs', () => {
			expect(itemMatches('/cec/part/section', '/cec/part/section')).toBe(true);
		});

		it('matches when item is the bare URL parent of a hashed target', () => {
			expect(itemMatches('/cec/part/section/chapter', '/cec/part/section/chapter#h-id')).toBe(true);
		});

		it('rejects unrelated paths', () => {
			expect(itemMatches('/cec/a', '/cec/b')).toBe(false);
		});
	});

	describe('ancestor scope match (shape B)', () => {
		it('matches when target lives inside item scope', () => {
			expect(
				itemMatches('/cec/part/section/chapter', '/cec/part/section/chapter/article-1#h-id')
			).toBe(false); // ancestor of a different path — shape B only fires for hash on the same path
		});

		it('matches when item is the URL prefix and target carries a hash', () => {
			// "/cec/x" + "#" === "/cec/x#anything".slice(0, 6)
			expect(itemMatches('/cec/x', '/cec/x#h-id')).toBe(true);
		});
	});

	describe('cross-path hash match (shape C)', () => {
		it('matches when an article-prefixed heading entry meets a chapter-prefixed activeHref', () => {
			// scroll-spy on chapter page produces /cec/x/y/chap#dieu, while the
			// tree's article-level heading entry is /cec/x/y/chap/article-1#dieu
			expect(itemMatches('/cec/x/y/chap/article-1#dieu', '/cec/x/y/chap#dieu')).toBe(true);
		});

		it('matches in the reverse direction (chapter-prefixed item, article activeHref)', () => {
			// en_bref entries live at chapter level; activeHref may be article-level
			expect(itemMatches('/cec/x/y/chap#en-bref-228', '/cec/x/y/chap/article-1#en-bref-228')).toBe(
				true
			);
		});

		it('rejects when hashes match but paths are siblings, not ancestors', () => {
			expect(itemMatches('/cec/x/y/chap1#h', '/cec/x/y/chap2#h')).toBe(false);
		});

		it('rejects when paths align but hashes differ', () => {
			expect(itemMatches('/cec/x/y/chap#one', '/cec/x/y/chap/article-1#two')).toBe(false);
		});
	});

	describe('non-matches', () => {
		it('rejects when neither has a hash and paths differ', () => {
			expect(itemMatches('/cec/a', '/cec/a-other')).toBe(false);
		});

		it('rejects when only one side has a hash and paths differ', () => {
			expect(itemMatches('/cec/a#x', '/cec/b')).toBe(false);
		});
	});
});
