import { describe, it, expect } from 'vitest';
import { parseSigles } from '../../../scripts/prepare/abbreviations';

describe('parseSigles', () => {
	it('extracts abbreviation → expansion pairs from XHTML table', () => {
		const xml = `<html><body>
			<table>
				<tbody>
					<tr><td>AA</td><td>Apostolicam actuositatem</td></tr>
					<tr><td>LG</td><td>Lumen Gentium</td></tr>
				</tbody>
			</table>
		</body></html>`;
		const map = parseSigles(xml);
		expect(map['AA']).toBe('Apostolicam actuositatem');
		expect(map['LG']).toBe('Lumen Gentium');
	});

	it('skips empty rows', () => {
		const xml = `<table><tr><td>AA</td><td>X</td></tr><tr><td> </td><td>Y</td></tr></table>`;
		const map = parseSigles(xml);
		expect(Object.keys(map)).toEqual(['AA']);
	});
});
