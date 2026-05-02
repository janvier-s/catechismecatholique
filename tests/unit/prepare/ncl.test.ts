import { describe, it, expect } from 'vitest';
import { parseUSFX } from '../../../scripts/prepare/ncl';

describe('parseUSFX', () => {
	it("extracts verse text by book/chapter/verse, stripping Strong's tags", async () => {
		const xml = `<usfx>
			<book id="GEN">
				<c id="1"/>
				<p style="p"><v id="1" bcv="GEN.1.1"/><w s="H7225">Au Commencement</w>
				<w s="H0430">Dieu</w>
				<w s="H1254">créa</w>
				<ve/></p>
				<p style="p"><v id="2" bcv="GEN.1.2"/><w>La</w> <w>terre</w><ve/></p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['GEN']!['1']!['1']).toMatch(/Au Commencement/);
		expect(result['GEN']!['1']!['1']).toMatch(/Dieu/);
		expect(result['GEN']!['1']!['2']).toMatch(/terre/);
	});

	it('handles multiple chapters and verses', async () => {
		const xml = `<usfx>
			<book id="MAT">
				<c id="28"/>
				<p style="p"><v id="19" bcv="MAT.28.19"/><w>Allez</w> <w>donc</w><ve/></p>
				<v id="20" bcv="MAT.28.20"/><w>enseignant</w><ve/>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['MAT']!['28']!['19']).toMatch(/Allez/);
		expect(result['MAT']!['28']!['20']).toMatch(/enseignant/);
	});
});
