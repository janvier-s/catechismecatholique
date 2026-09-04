import { describe, it, expect } from 'vitest';
import { parseUSFX, findDroppedVerses } from '../../../scripts/prepare/ncl';

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

/**
 * The heading containers above all close before the next verse opens. This
 * source also nests verses *inside* them · the heading is the element's first
 * text node and scripture follows it, still within the same element. Skipping
 * to the close tag swallowed those verses: 20 of them, across Mt 11, Mt 24,
 * Tb 3 and Sg 7.
 *
 * A <v> marker means scripture has resumed, so a heading container yields to
 * it. <d> is the deliberate exception: there the verse marker *is* the psalm
 * superscription.
 */
describe('parseUSFX · verses nested inside heading containers', () => {
	it('keeps verses that follow the parenthetical inside <p style="r">', async () => {
		// Mt 11:7-15 · the shape that dropped nine verses.
		const xml = `<usfx>
			<book id="MAT">
				<c id="11"/>
				<p style="p"><v id="6" bcv="MAT.11.6"/><w>Heureux celui</w><ve/></p>
				<p sfm="r" style="r">(Luc 7,24-28)
					<v id="7" bcv="MAT.11.7"/><w>Comme ils s’en allaient</w><ve/>
					<v id="8" bcv="MAT.11.8"/><w>Qu’êtes-vous allés voir</w><ve/>
				</p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['MAT']!['11']!['7']).toMatch(/Comme ils s’en allaient/);
		expect(result['MAT']!['11']!['8']).toMatch(/Qu’êtes-vous allés voir/);
		// The parenthetical itself is still metadata and belongs to no verse.
		expect(result['MAT']!['11']!['6']).not.toMatch(/Luc 7/);
		expect(result['MAT']!['11']!['7']).not.toMatch(/Luc 7/);
	});

	it('keeps verses nested inside an <s> section title', async () => {
		// Sg 7:7-14 · eight verses inside a single <s style="s1">.
		const xml = `<usfx>
			<book id="WIS">
				<c id="7"/>
				<p style="p"><v id="6" bcv="WIS.7.6"/><w>une seule manière</w><ve/></p>
				<s style="s1">Éloge de la sagesse
					<v id="7" bcv="WIS.7.7"/><w>j’ai prié</w><ve/>
					<v id="8" bcv="WIS.7.8"/><w>je l’ai préférée aux royaumes</w><ve/>
				</s>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['WIS']!['7']!['7']).toMatch(/j’ai prié/);
		expect(result['WIS']!['7']!['8']).toMatch(/préférée aux royaumes/);
		expect(result['WIS']!['7']!['7']).not.toMatch(/Éloge/);
		expect(result['WIS']!['7']!['6']).not.toMatch(/Éloge/);
	});

	it('keeps verses nested inside <p style="ms1">', async () => {
		// Tb 3:16-17 · the two verses that made "Tb 3, 11-16" look like a bad
		// reference in paragraph 2585.
		const xml = `<usfx>
			<book id="TOB">
				<c id="3"/>
				<p style="p"><v id="15" bcv="TOB.3.15"/><w>je ne supporte plus</w><ve/></p>
				<p sfm="ms" style="ms1">Deuxième partie
					<v id="16" bcv="TOB.3.16"/><w>la prière de chacun d’eux</w><ve/>
					<v id="17" bcv="TOB.3.17"/><w>Raphaël fut envoyé</w><ve/>
				</p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['TOB']!['3']!['16']).toMatch(/prière de chacun/);
		expect(result['TOB']!['3']!['17']).toMatch(/Raphaël/);
		expect(result['TOB']!['3']!['16']).not.toMatch(/Deuxième partie/);
	});

	it('still drops the psalm superscription carried by <d>', async () => {
		// The <d> exception: verse 1 *is* the superscription, and 58 psalms
		// depend on it staying out of the text.
		const xml = `<usfx>
			<book id="PSA">
				<c id="3"/>
				<d style="d"><v id="1" bcv="PSA.3.1"/><w>Chant de David</w><ve/></d>
				<q style="q1"><v id="2" bcv="PSA.3.2"/><w>Yahweh, que mes ennemis sont nombreux</w><ve/></q>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['PSA']!['3']!['1']).toBeUndefined();
		expect(result['PSA']!['3']!['2']).toMatch(/mes ennemis sont nombreux/);
	});

	it('reports a verse the source declares but the parse lost', async () => {
		const xml = `<usfx>
			<book id="MAT">
				<c id="11"/>
				<p style="p"><v id="6" bcv="MAT.11.6"/><w>Heureux celui</w><ve/></p>
				<p sfm="r" style="r">(Luc 7,24-28)
					<v id="7" bcv="MAT.11.7"/><w>Comme ils s’en allaient</w><ve/>
				</p>
			</book>
		</usfx>`;
		const parsed = await parseUSFX(xml);
		expect(findDroppedVerses(xml, parsed)).toEqual([]);

		// Simulate the regression the guard exists to catch.
		delete parsed['MAT']!['11']!['7'];
		expect(findDroppedVerses(xml, parsed)).toEqual([{ book: 'MAT', chapter: '11', verse: '7' }]);
	});

	it('still drops footnote text that carries a verse-like marker', async () => {
		const xml = `<usfx>
			<book id="MAT">
				<c id="11"/>
				<p style="p"><v id="10" bcv="MAT.11.10"/><w>mon messager</w><f caller="+"><fr>11:10</fr><ft>a le sens de messager</ft></f><ve/></p>
			</book>
		</usfx>`;
		const result = await parseUSFX(xml);
		expect(result['MAT']!['11']!['10']).toMatch(/mon messager/);
		expect(result['MAT']!['11']!['10']).not.toMatch(/le sens de messager/);
	});
});
