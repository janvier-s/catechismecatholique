/**
 * Sidebar entry matching — pulled out of SidebarItem.svelte so the multiple
 * match shapes are unit-testable. activeHref often carries a scroll-spy
 * heading hash like "/cec/x/y/chapter#some-heading" while the tree entries
 * are stored without the hash. Three match shapes have to work for the
 * sidebar to highlight correctly across page kinds:
 *
 *   (a) exact match, or item is the bare URL parent of a hashed target
 *   (b) target lives inside item's scope (item is an ancestor)
 *   (c) hash match across paths: heading and en_bref entries are prefixed at
 *       one structural level (e.g. chapter for en_bref, article for headings)
 *       while activeHref may be produced by scroll-spy at another level. Match
 *       when the hashes agree and the two paths are along the same chapter
 *       prefix — i.e. one is an ancestor of the other.
 */
export function itemMatches(itemHref: string, target: string): boolean {
	const base = target.replace(/#.*$/, '');
	if (itemHref === target || itemHref === base) return true;
	if (itemHref + '#' === target.slice(0, itemHref.length + 1)) return true;
	const iIdx = itemHref.indexOf('#');
	const aIdx = target.indexOf('#');
	if (iIdx >= 0 && aIdx >= 0) {
		const iHash = itemHref.slice(iIdx + 1);
		const aHash = target.slice(aIdx + 1);
		if (iHash === aHash) {
			const iPath = itemHref.slice(0, iIdx);
			const aPath = target.slice(0, aIdx);
			if (iPath === aPath) return true;
			if (iPath.startsWith(aPath) || aPath.startsWith(iPath)) return true;
		}
	}
	return false;
}
