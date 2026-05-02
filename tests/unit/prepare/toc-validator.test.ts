import { describe, it, expect } from 'vitest';
import { extractTocStructure } from '../../../scripts/prepare/toc-validator';

describe('extractTocStructure', () => {
	it('extracts navPoint labels from a minimal toc.ncx', async () => {
		const xml = `<?xml version='1.0' encoding='UTF-8'?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/">
	<navMap>
		<navPoint><navLabel><text>PROLOGUE</text></navLabel><content src="x.xhtml"/></navPoint>
		<navPoint><navLabel><text>PREMIÈRE PARTIE</text></navLabel><content src="y.xhtml"/></navPoint>
	</navMap>
</ncx>`;
		const points = await extractTocStructure(xml);
		expect(points).toContainEqual(expect.objectContaining({ label: 'PROLOGUE' }));
		expect(points).toContainEqual(expect.objectContaining({ label: 'PREMIÈRE PARTIE' }));
	});
});
