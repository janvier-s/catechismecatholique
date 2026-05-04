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
			GEN: [{ ch: 3, startV: 1, title: 'La faute et le châtiment', crossRefs: null }]
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
			GEN: [{ ch: 2, startV: 4, title: "Création de l'homme et de la femme", crossRefs: null }]
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
			{ ch: 4, startV: 1, title: 'Caïn et Abel', crossRefs: null },
			{ ch: 4, startV: 25, title: 'Seth et ses descendants', crossRefs: null }
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
			{ ch: 1, startV: 1, title: 'Les Hébreux en Égypte', crossRefs: null }
		]);
	});

	it('skips sections that are not s1 style (cross-references etc.)', () => {
		const xml = `
      <book id="GEN">
        <c id="1" />
        <s style="r">(Job 38)</s>
        <s style="s1">Création</s>
        <p><v id="1" bcv="GEN.1.1" /></p>
      </book>`;
		expect(parseNclSections(xml).GEN).toEqual([
			{ ch: 1, startV: 1, title: 'Création', crossRefs: null }
		]);
	});

	it('captures the cross-ref <p style="r"> after a section title', () => {
		const xml = `
      <book id="GEN">
        <c id="1" />
        <s style="s1">Création du monde</s>
        <p sfm="r" style="r">(2,4b-25 ; Job 38-39 ; Psa 8 ; 104 ; Jn 1,1-3)</p>
        <p style="p"><v id="1" bcv="GEN.1.1" />Au commencement...</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.GEN![0]).toEqual({
			ch: 1,
			startV: 1,
			title: 'Création du monde',
			crossRefs: '(2,4b-25 ; Job 38-39 ; Psa 8 ; 104 ; Jn 1,1-3)'
		});
	});

	it('sets crossRefs to null when no <p style="r"> follows the section', () => {
		const xml = `
      <book id="GEN">
        <c id="3" />
        <s style="s1">La faute et le châtiment</s>
        <p style="p"><v id="1" bcv="GEN.3.1" />Le serpent...</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.GEN![0]!.crossRefs).toBeNull();
	});

	it('does not capture a cross-ref that belongs to the next section', () => {
		// Section A has no <r>; section B does. The <r> after B should attach to B, not A.
		const xml = `
      <book id="GEN">
        <c id="3" />
        <s style="s1">La faute et le châtiment</s>
        <p style="p"><v id="1" bcv="GEN.3.1" />text</p>
        <c id="4" />
        <s style="s1">Caïn et Abel</s>
        <p sfm="r" style="r">(parallel)</p>
        <p style="p"><v id="1" bcv="GEN.4.1" />text</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.GEN![0]!.crossRefs).toBeNull();
		expect(result.GEN![1]!.crossRefs).toBe('(parallel)');
	});
});
