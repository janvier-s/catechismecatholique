import { describe, it, expect } from 'vitest';
import { parseSourceTable } from '../../../scripts/prepare/sources-index';

describe('parseSourceTable', () => {
	it('extracts entries from a citation table with category heading', () => {
		const xml = `<html><body><div class="level1"><h1>Documents pontificaux</h1>
			<table>
				<tbody>
					<tr><td>Damase I er</td><td>lettre aux évêques</td><td>149</td></tr>
					<tr><td>Léon le Grand</td><td>« Quam laudabiliter »</td><td>284 285</td></tr>
				</tbody>
			</table>
		</div></body></html>`;
		const result = parseSourceTable(xml);
		expect(result.length).toBeGreaterThanOrEqual(2);
		expect(result[0]!.category).toBe('Documents pontificaux');
		expect(result[0]!.doc_name).toContain('Damase');
		expect(result[1]!.paragraphs).toEqual([284, 285]);
	});

	it('returns empty array when table has no useful rows', () => {
		const xml = `<html><body><table></table></body></html>`;
		expect(parseSourceTable(xml)).toEqual([]);
	});
});
