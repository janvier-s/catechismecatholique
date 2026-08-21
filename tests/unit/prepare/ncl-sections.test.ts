import { describe, it, expect } from 'vitest';
import { parseNclSections } from '../../../scripts/prepare/ncl-sections';

describe('parseNclSections', () => {
	it('extracts a section title with chapter and start verse', () => {
		const xml = `
      <book id="GEN">
        <c id="3" />
        <s style="s1">La faute et le châtiment</s>
        <p style="p"><v id="1" bcv="GEN.3.1" />Le serpent…</p>
      </book>`;
		expect(parseNclSections(xml)).toEqual({
			GEN: [
				{
					ch: 3,
					startV: 1,
					title: 'La faute et le châtiment',
					titleHtml: 'La faute et le châtiment',
					level: 'section'
				}
			]
		});
	});

	it('handles section before chapter marker (uses prior chapter)', () => {
		const xml = `
      <book id="GEN">
        <c id="2" />
        <s style="s1">Création de l'homme et de la femme</s>
        <p><v id="4" bcv="GEN.2.4" />…</p>
      </book>`;
		expect(parseNclSections(xml)).toEqual({
			GEN: [
				{
					ch: 2,
					startV: 4,
					title: "Création de l'homme et de la femme",
					titleHtml: "Création de l'homme et de la femme",
					level: 'section'
				}
			]
		});
	});

	it('strips trailing whitespace and newlines from the title', () => {
		const xml = `
      <book id="GEN">
        <c id="1" />
        <s style="s1">Création du monde
</s>
        <p><v id="1" bcv="GEN.1.1" />Au commencement…</p>
      </book>`;
		expect(parseNclSections(xml).GEN![0]!.title).toBe('Création du monde');
	});

	it('handles multiple sections in a chapter', () => {
		const xml = `
      <book id="GEN">
        <c id="4" />
        <s style="s1">Caïn et Abel</s>
        <p><v id="1" bcv="GEN.4.1" />…</p>
        <s style="s1">Seth et ses descendants</s>
        <p><v id="25" bcv="GEN.4.25" />…</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.GEN).toEqual([
			{ ch: 4, startV: 1, title: 'Caïn et Abel', titleHtml: 'Caïn et Abel', level: 'section' },
			{
				ch: 4,
				startV: 25,
				title: 'Seth et ses descendants',
				titleHtml: 'Seth et ses descendants',
				level: 'section'
			}
		]);
	});

	it('handles multiple books', () => {
		const xml = `
      <book id="GEN">
        <c id="1" /><s style="s1">Création</s>
        <p><v id="1" bcv="GEN.1.1" /></p>
      </book>
      <book id="EXO">
        <c id="1" /><s style="s1">Les Hébreux en Égypte</s>
        <p><v id="1" bcv="EXO.1.1" /></p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.GEN).toHaveLength(1);
		expect(result.EXO).toEqual([
			{
				ch: 1,
				startV: 1,
				title: 'Les Hébreux en Égypte',
				titleHtml: 'Les Hébreux en Égypte',
				level: 'section'
			}
		]);
	});

	it('skips sections that are not s1/s2 style (cross-references etc.)', () => {
		const xml = `
      <book id="GEN">
        <c id="1" />
        <s style="r">(Job 38)</s>
        <s style="s1">Création</s>
        <p><v id="1" bcv="GEN.1.1" /></p>
      </book>`;
		expect(parseNclSections(xml).GEN).toEqual([
			{ ch: 1, startV: 1, title: 'Création', titleHtml: 'Création', level: 'section' }
		]);
	});

	it('extracts ms1 major-section headers as level "major"', () => {
		const xml = `
      <book id="GEN">
        <c id="1" />
        <p sfm="ms" style="ms1">LES ORIGINES</p>
        <s style="s1">Création du monde</s>
        <p sfm="r" style="r">(2,4b-25 ; Job 38-39)</p>
        <p style="p"><v id="1" bcv="GEN.1.1" />Au commencement...</p>
      </book>`;
		const result = parseNclSections(xml);
		// Both major + section start at verse 1 of chapter 1; both are emitted.
		expect(result.GEN).toEqual([
			{ ch: 1, startV: 1, title: 'LES ORIGINES', titleHtml: 'LES ORIGINES', level: 'major' },
			{
				ch: 1,
				startV: 1,
				title: 'Création du monde',
				titleHtml: 'Création du monde',
				level: 'section'
			}
		]);
	});

	it('strips nested <w> tags from ms1 titles', () => {
		const xml = `
      <book id="EXO">
        <c id="19" />
        <p sfm="ms" style="ms1"><w s="H8147">DEUXIÈME</w>
<w s="H4481">PARTIE</w>
<w s="H3117">DU</w> SINAÏ A CADÈS.</p>
        <p style="p"><v id="1" bcv="EXO.19.1" />text</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.EXO![0]).toEqual({
			ch: 19,
			startV: 1,
			title: 'DEUXIÈME PARTIE DU SINAÏ A CADÈS.',
			titleHtml: 'DEUXIÈME PARTIE DU SINAÏ A CADÈS.',
			level: 'major'
		});
	});

	it('extracts s2 sub-section headers, stripping <sc> tags from the plain title', () => {
		const xml = `
      <book id="LEV">
        <c id="27" />
        <s level="2" style="s2"><sc>3. Chap. xxvii, 30-34 : Les dîmes.</sc> — Fruits (xxvii, 30, 31).</s>
        <p style="p"><v id="30" bcv="LEV.27.30" />text</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.LEV![0]!.title).toBe(
			'3. Chap. xxvii, 30-34 : Les dîmes. — Fruits (xxvii, 30, 31).'
		);
	});

	it('preserves <sc> as a <span class="sc"> in titleHtml', () => {
		const xml = `
      <book id="LEV">
        <c id="27" />
        <s level="2" style="s2"><sc>3. Chap. xxvii, 30-34 : Les dîmes.</sc> — Fruits (xxvii, 30, 31).</s>
        <p style="p"><v id="30" bcv="LEV.27.30" />text</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.LEV![0]!.titleHtml).toBe(
			'<span class="sc">3. Chap. xxvii, 30-34 : Les dîmes.</span> — Fruits (xxvii, 30, 31).'
		);
	});

	it('drops a nested <sup> inside <sc> from both title and titleHtml, same as plainText elsewhere', () => {
		const xml = `
      <book id="EZR">
        <c id="7" />
        <s level="2" style="s2"><sc>Chap. vii, 11-28<sup>a</sup></sc></s>
        <p style="p"><v id="11" bcv="EZR.7.11" />text</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.EZR![0]!.title).toBe('Chap. vii, 11-28a');
		expect(result.EZR![0]!.titleHtml).toBe('<span class="sc">Chap. vii, 11-28a</span>');
	});

	it('extracts s3 outline headers as level "subsection"', () => {
		const xml = `
      <book id="EZR">
        <c id="1" />
        <s level="3" style="s3">1.
<sc>Chap. i, 1-11 : Édit de Cyrus.</sc> — Permission d'aller rebâtir le Temple.</s>
        <p style="p"><v id="1" bcv="EZR.1.1" />text</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.EZR![0]).toEqual({
			ch: 1,
			startV: 1,
			title: "1. Chap. i, 1-11 : Édit de Cyrus. — Permission d'aller rebâtir le Temple.",
			titleHtml:
				'1. <span class="sc">Chap. i, 1-11 : Édit de Cyrus.</span> — Permission d\'aller rebâtir le Temple.',
			level: 'subsection'
		});
	});

	it('does not extract <p style="r"> cross-refs', () => {
		const xml = `
      <book id="GEN">
        <c id="1" />
        <s style="s1">Création du monde</s>
        <p sfm="r" style="r">(2,4b-25 ; Job 38-39)</p>
        <p style="p"><v id="1" bcv="GEN.1.1" />Au commencement...</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.GEN).toHaveLength(1);
		expect(result.GEN![0]).not.toHaveProperty('crossRefs');
		expect(result.GEN![0]!.title).toBe('Création du monde');
	});
});
