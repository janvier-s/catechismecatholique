/**
 * Does this path render the CCC sidebar tree?
 *
 * Shared by the root layout's `showSidebar` (which decides whether to mount the
 * rail) and the root `+layout.ts` load (which decides whether to server-render
 * the tree data). Keeping the predicate in one place stops the two from
 * disagreeing — a mismatch would either ship 20 KB of unused JSON or bring back
 * the empty-rail flash on a route the load skipped.
 */
export function needsCecStructure(pathname: string): boolean {
	if (!pathname.startsWith('/cec')) return false;
	// /cec (the landing page) keeps the rail. It's the one page a newcomer
	// meets cold, and with nothing active the tree collapses to five rows —
	// prologue plus four parts, each with its range — which is exactly the
	// map of the book they need. Hiding it here meant the rail appeared
	// unannounced after the first click, so the front door was the only
	// screen in the corpus with no sense of the whole.
	//
	// /cec/sommaire and /cec/panorama stay excluded: they *are* the table of
	// contents at full size, and a second copy in a rail beside them is noise.
	if (pathname.startsWith('/cec/sommaire') || pathname.startsWith('/cec/panorama')) return false;
	// A multi-paragraph selection (/cec/268,279-280,290-295) is a gathered list
	// gathered from somewhere else, not a place in the book. The rail has no
	// single node to open against it, so it would sit alongside fully collapsed
	// and inert. Single paragraphs and plain ranges keep it — those do sit at a
	// known point in the tree.
	if (/^\/cec\/[\d,–-]+,/.test(pathname)) return false;
	return true;
}
