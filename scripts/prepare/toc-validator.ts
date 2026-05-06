import { parseStringPromise } from 'xml2js';
import type { BuiltStructure } from './structure';

export interface TocPoint {
	label: string;
	src: string;
}

export async function extractTocStructure(xml: string): Promise<TocPoint[]> {
	const parsed = await parseStringPromise(xml);
	const points: TocPoint[] = [];
	type NavPoint = {
		navLabel?: { text?: string[] }[];
		content?: { $?: { src?: string } }[];
		navPoint?: NavPoint[];
	};
	function walk(navPoints: NavPoint[] | undefined): void {
		for (const np of navPoints ?? []) {
			const label = np.navLabel?.[0]?.text?.[0] ?? '';
			const src = np.content?.[0]?.$?.src ?? '';
			points.push({ label: String(label).trim(), src });
			if (np.navPoint) walk(np.navPoint);
		}
	}
	walk(parsed.ncx.navMap?.[0]?.navPoint);
	return points;
}

// Loose validator: confirm the major part labels in our structure are present in the TOC.
export function validateAgainstToc(_structure: BuiltStructure, points: TocPoint[]): void {
	const tocLabels = new Set(points.map((p) => p.label.toUpperCase()));

	const requiredLabels = [
		'PROLOGUE',
		'PREMIÈRE PARTIE',
		'DEUXIÈME PARTIE',
		'TROISIÈME PARTIE',
		'QUATRIÈME PARTIE'
	];
	const missing = requiredLabels.filter(
		(label) => !Array.from(tocLabels).some((l) => l.startsWith(label))
	);
	if (missing.length > 0) {
		throw new Error(`toc-validator: missing labels in toc.ncx: ${missing.join(', ')}`);
	}
}
