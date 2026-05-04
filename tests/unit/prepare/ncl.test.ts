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

	it('skips <s> section titles so they do not contaminate the previous verse', async () => {
		const xml = `<usfx>
			<book id="GEN">
				<c id="2"/>
				<p style="p"><v id="25" bcv="GEN.2.25"/><w>Or</w> <w>tous deux étaient nus</w><ve/></p>
				<s style="s1">La faute et le châtiment</s>
				<c id="3"/>
				<p style="p"><v id="1" bcv="GEN.3.1"/><w>Le serpent</w> <w>était rusé</w><ve/></p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['GEN']!['2']!['25']).not.toMatch(/faute/);
		expect(result['GEN']!['2']!['25']).not.toMatch(/châtiment/);
		expect(result['GEN']!['3']!['1']).toMatch(/serpent/);
		expect(result['GEN']!['3']!['1']).not.toMatch(/faute/);
	});

	it('skips <p style="r"> cross-reference paragraphs', async () => {
		const xml = `<usfx>
			<book id="JOB">
				<c id="38"/>
				<p style="p"><v id="1" bcv="JOB.38.1"/><w>Alors</w> <w>Yahweh répondit</w><ve/></p>
				<p style="r">(Job 38)</p>
				<p style="p"><v id="2" bcv="JOB.38.2"/><w>Quel est</w> <w>celui-ci</w><ve/></p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['JOB']!['38']!['1']).toMatch(/Yahweh/);
		expect(result['JOB']!['38']!['1']).not.toMatch(/\(Job 38\)/);
		expect(result['JOB']!['38']!['2']).toMatch(/celui-ci/);
	});

	it('skips <p style="ms1"> major section titles between verses', async () => {
		const xml = `<usfx>
			<book id="TIT">
				<c id="1"/>
				<p style="p"><v id="4" bcv="TIT.1.4"/><w>contenu de v4</w><ve/></p>
				<p style="ms1">I. INSTRUCTIONS CONCERNANT...</p>
				<p style="p"><v id="5" bcv="TIT.1.5"/><w>contenu de v5</w><ve/></p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['TIT']!['1']!['4']).toMatch(/contenu de v4/);
		expect(result['TIT']!['1']!['4']).not.toMatch(/INSTRUCTIONS/);
		expect(result['TIT']!['1']!['5']).toMatch(/contenu de v5/);
	});

	it('skips <p style="d"> descriptive subscriptions (e.g. Psalm headers)', async () => {
		const xml = `<usfx>
			<book id="PSA">
				<c id="51"/>
				<p style="d">Psaume de David, lorsque le prophète Nathan vint le trouver</p>
				<p style="p"><v id="1" bcv="PSA.51.1"/><w>Aie pitié de moi</w><ve/></p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['PSA']!['51']!['1']).toMatch(/Aie pitié de moi/);
		expect(result['PSA']!['51']!['1']).not.toMatch(/Psaume de David/);
		expect(result['PSA']!['51']!['1']).not.toMatch(/Nathan/);
	});

	it('keeps non-"r" <p> styles transparent', async () => {
		const xml = `<usfx>
			<book id="GEN">
				<c id="1"/>
				<p style="p"><v id="1" bcv="GEN.1.1"/><w>Au commencement</w><ve/></p>
				<p style="q1"><w>poetic line</w></p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		// poetic-line text should still flow into verse 1 (last open verse).
		expect(result['GEN']!['1']!['1']).toMatch(/poetic line/);
	});
});
