/**
 * One-time script: add explanation_md to every CEC AI explanation JSON.
 * Converts existing explanation_html → markdown using turndown.
 * Run: node scripts/add-explanation-md.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import TurndownService from 'turndown';

const SRC_DIR =
	'/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/JSON/CCC_AI';

const td = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	strongDelimiter: '**',
	emDelimiter: '_'
});

// Keep <strong> inside list items as bold (default behaviour is fine,
// but be explicit so round-trip is stable).
td.keep([]);

const files = [
	'PROLOGUE.json',
	'Part_1_Sect_1.json',
	'Part_1_Sect_2_Ch_1.json',
	'Part_1_Sect_2_Ch_2.json',
	'Part_1_Sect_2_Ch_3.json',
	'Part_2_Sect_1_Ch_1.json',
	'Part_2_Sect_1_Ch_2.json',
	'Part_2_Sect_2_Ch_1.json',
	'Part_2_Sect_2_Ch_2.json',
	'Part_2_Sect_2_Ch_3.json',
	'Part_2_Sect_2_Ch_4.json',
	'Part_3_Sect_1_Ch_1.json',
	'Part_3_Sect_1_Ch_2.json',
	'Part_3_Sect_1_Ch_3.json',
	'Part_3_Sect_2_Ch_1.json',
	'Part_4_Sect_1_Ch_1.json',
	'Part_4_Sect_1_Ch_2.json',
	'Part_4_Sect_1_Ch_3.json',
	'10_commandements_ai.json'
];

let total = 0;

for (const file of files) {
	const path = join(SRC_DIR, file);
	const entries = JSON.parse(readFileSync(path, 'utf8'));
	let changed = 0;
	for (const entry of entries) {
		if (entry.explanation_md) continue; // already done
		if (!entry.explanation_html) continue;
		entry.explanation_md = td.turndown(entry.explanation_html);
		changed++;
	}
	writeFileSync(path, JSON.stringify(entries, null, 2) + '\n');
	console.log(`${file}: +${changed} entries`);
	total += changed;
}

console.log(`\nDone. ${total} entries updated.`);
