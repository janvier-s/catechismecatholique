type Node = Record<string, unknown>;

const LEVELS = ['parts', 'sections', 'chapters', 'articles'] as const;

/**
 * Trim the table-of-contents tree to `depth` levels. Depth 1 is parts only,
 * 2 adds sections, 3 adds chapters. Depth 0 (or anything past the deepest
 * level) returns the tree untouched. Never mutates the input.
 */
export function trimStructure(toc: unknown, depth: number): unknown {
	if (depth <= 0) return toc;
	if (toc === null || typeof toc !== 'object') return toc;

	const clone: Node = { ...(toc as Node) };
	trimLevel(clone, 0, depth);
	return clone;
}

function trimLevel(node: Node, levelIndex: number, depth: number): void {
	if (levelIndex >= LEVELS.length) return;
	const key = LEVELS[levelIndex]!;
	const children = node[key];
	if (!Array.isArray(children)) return;

	if (levelIndex + 1 >= depth) {
		// This level is the last one kept · strip each child's own children.
		node[key] = children.map((c) => {
			if (c === null || typeof c !== 'object') return c;
			const copy: Node = { ...(c as Node) };
			for (const deeper of LEVELS.slice(levelIndex + 1)) delete copy[deeper];
			return copy;
		});
		return;
	}

	node[key] = children.map((c) => {
		if (c === null || typeof c !== 'object') return c;
		const copy: Node = { ...(c as Node) };
		trimLevel(copy, levelIndex + 1, depth);
		return copy;
	});
}
