export interface TocEntry {
	depth: number;
	file: string;
	anchor: string | undefined;
	label: string;
}

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&apos;': "'",
	'&#xa0;': ' ',
	'&nbsp;': ' '
};

function decode(s: string): string {
	return s.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/**
 * Walk navMap depth-first, emitting one TocEntry per navPoint in document order.
 * The XML is small (~40 KB) so a regex-based pass is sufficient — no DOM dep.
 */
export function parseToc(xml: string): TocEntry[] {
	const out: TocEntry[] = [];
	const stack: number[] = []; // depth tracker — push on <navPoint>, pop on </navPoint>
	const re = /<navPoint\b[^>]*>|<\/navPoint>|<navLabel>\s*<text>([\s\S]*?)<\/text>\s*<\/navLabel>|<content\s+src="([^"]+)"/g;

	let pendingLabel: string | undefined;
	let pendingSrc: string | undefined;
	let m: RegExpExecArray | null;
	while ((m = re.exec(xml))) {
		const tok = m[0];
		if (tok.startsWith('<navPoint')) {
			stack.push(stack.length + 1);
			pendingLabel = undefined;
			pendingSrc = undefined;
		} else if (tok === '</navPoint>') {
			if (pendingLabel !== undefined && pendingSrc !== undefined) {
				const [file, anchor] = pendingSrc.split('#');
				out.push({
					depth: stack.length,
					file: file ?? '',
					anchor,
					label: decode(pendingLabel.trim())
				});
				pendingLabel = undefined;
				pendingSrc = undefined;
			}
			stack.pop();
		} else if (m[1] !== undefined) {
			pendingLabel = m[1];
			if (pendingSrc !== undefined) flush();
		} else if (m[2] !== undefined) {
			pendingSrc = m[2];
			if (pendingLabel !== undefined) flush();
		}

		function flush() {
			if (pendingLabel === undefined || pendingSrc === undefined) return;
			const [file, anchor] = pendingSrc.split('#');
			out.push({
				depth: stack.length,
				file: file ?? '',
				anchor,
				label: decode(pendingLabel.trim())
			});
			pendingLabel = undefined;
			pendingSrc = undefined;
		}
	}
	return out;
}
