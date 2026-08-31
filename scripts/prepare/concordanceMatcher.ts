import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ParsedRef } from './concordanceRefParser.ts';

export interface CccCitation {
	from: number;
	to: number;
}

interface ConcordancePericope {
	startCh: number;
	endCh: number;
	startVerse: number;
	endVerse: number;
	cccRanges: { from: number; to: number }[];
}

interface ConcordanceChapterFile {
	pericopes: ConcordancePericope[];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
	return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Looks up every concordance pericope overlapping any of the ref's verse
 * ranges, in file order, and returns the union of their cccRanges · not
 * deduplicated or merged yet (the clusterer in Task 3 does that, since range
 * boundaries matter for the heading lookup).
 */
export function matchConcordance(ref: ParsedRef, concordanceDir: string): CccCitation[] {
	const path = join(concordanceDir, ref.slug, `${ref.chapter}.json`);
	if (!existsSync(path)) return [];

	const data = JSON.parse(readFileSync(path, 'utf8')) as ConcordanceChapterFile;
	const citations: CccCitation[] = [];
	for (const pericope of data.pericopes) {
		const matches = ref.ranges.some(([start, end]) =>
			overlaps(pericope.startVerse, pericope.endVerse, start, end)
		);
		if (matches) citations.push(...pericope.cccRanges);
	}
	return citations;
}
