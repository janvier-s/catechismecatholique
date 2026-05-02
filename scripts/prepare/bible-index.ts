export function processBibleIndex(
	raw: Record<string, number[]>,
	knownParagraphs: Set<number>
): Record<string, number[]> {
	const out: Record<string, number[]> = {};
	const dropped: string[] = [];
	for (const [ref, paragraphs] of Object.entries(raw)) {
		const valid = paragraphs.filter((n) => knownParagraphs.has(n));
		if (valid.length === 0) {
			dropped.push(ref);
			continue;
		}
		out[ref] = valid;
	}
	if (dropped.length > 0) {
		process.stderr.write(
			`  warn: bible-index dropped ${dropped.length} refs with no valid paragraphs\n`
		);
	}
	return out;
}
