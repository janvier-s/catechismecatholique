// cited-by[N] = list of paragraph numbers whose `cross_refs` include `N`.
// Reverse direction of the existing per-paragraph `cross_refs`.
export function buildCitedBy(
	paragraphs: Map<number, { cross_refs: string[] }>
): Record<number, number[]> {
	const out: Record<number, number[]> = {};
	for (const [from, p] of paragraphs) {
		for (const targetStr of p.cross_refs) {
			const target = parseInt(targetStr, 10);
			if (!Number.isFinite(target)) continue;
			if (!paragraphs.has(target)) continue;
			if (!out[target]) out[target] = [];
			// A paragraph can carry two markers pointing at the same target
			// (§671 cites 1043 twice). The reverse index is a set of citers,
			// so the second marker must not produce a second entry.
			if (!out[target]!.includes(from)) out[target]!.push(from);
		}
	}
	for (const k of Object.keys(out)) {
		out[Number(k)]!.sort((a, b) => a - b);
	}
	return out;
}
