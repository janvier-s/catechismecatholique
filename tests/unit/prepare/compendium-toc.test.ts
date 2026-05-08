import { describe, it, expect } from 'vitest';
import { parseToc } from '../../../scripts/prepare/compendium/toc';

const FIXTURE = `<?xml version="1.0" encoding="utf-8" ?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/">
<navMap>
  <navPoint id="n1"><navLabel><text>ROOT</text></navLabel><content src="Text/000.htm"/>
    <navPoint id="n2"><navLabel><text>PART 1</text></navLabel><content src="Text/000.htm#p1"/>
      <navPoint id="n3"><navLabel><text>SECTION A</text></navLabel><content src="Text/000.htm#p6"/></navPoint>
    </navPoint>
  </navPoint>
</navMap></ncx>`;

describe('parseToc', () => {
	it('flattens nav-points to depth/file/anchor/label tuples', () => {
		const out = parseToc(FIXTURE);
		expect(out).toEqual([
			{ depth: 1, file: 'Text/000.htm', anchor: undefined, label: 'ROOT' },
			{ depth: 2, file: 'Text/000.htm', anchor: 'p1', label: 'PART 1' },
			{ depth: 3, file: 'Text/000.htm', anchor: 'p6', label: 'SECTION A' }
		]);
	});

	it('decodes HTML entities and trims labels', () => {
		const xml = `<ncx xmlns="x"><navMap><navPoint><navLabel><text>  A &amp; B  </text></navLabel><content src="x.htm#a"/></navPoint></navMap></ncx>`;
		expect(parseToc(xml)[0]?.label).toBe('A & B');
	});
});
