/**
 * Group paragraph numbers into compact range strings: [1,2,3,5,7,8] →
 * ["1-3", "5", "7-8"]. Input needn't be sorted or deduped · the
 * `/cec/[ref=cecref]` route accepts both single numbers and ranges,
 * comma-joined.
 */
export function compactRanges(numbers: number[]): string[] {
	const sorted = [...new Set(numbers)].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
	const out: string[] = [];
	let i = 0;
	while (i < sorted.length) {
		let j = i;
		while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
		out.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`);
		i = j + 1;
	}
	return out;
}
