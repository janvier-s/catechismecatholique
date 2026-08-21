import { describe, it, expect } from 'vitest';
import { parseUSFXParagraphs, splitIntoProseBlocks } from '../../../scripts/prepare/ncl-paragraphs';

describe('parseUSFXParagraphs', () => {
	it('groups verses into prose blocks on <p style="p">', async () => {
		const xml = `<usfx>
			<book id="MAT">
				<c id="1" />
				<p style="p"><v id="1" bcv="MAT.1.1" /><w>Généalogie</w><ve /></p>
				<v id="2" bcv="MAT.1.2" /><w>Abraham</w><ve />
				<p style="p"><v id="3" bcv="MAT.1.3" /><w>Juda</w><ve /></p>
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		const blocks = result['MAT']!['1']!.blocks;
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual({
			kind: 'prose',
			verses: [
				{ v: 1, html: 'Généalogie' },
				{ v: 2, html: 'Abraham' }
			]
		});
		expect(blocks[1]).toEqual({ kind: 'prose', verses: [{ v: 3, html: 'Juda' }] });
	});

	it('groups verses into poetry blocks by <q> level, including a verse with no fresh <q> marker', async () => {
		// Mirrors Psalm 2:2-3 in the real source: verse 3 continues inside
		// verse 2's still-open <q style="q2"> with no marker of its own.
		const xml = `<usfx>
			<book id="PSA">
				<c id="2" />
				<q style="q1"><v id="1" bcv="PSA.2.1" /><w>Pourquoi</w><ve /></q>
				<q level="2" style="q2"><v id="2" bcv="PSA.2.2" /><w>Les rois</w><ve />
				<v id="3" bcv="PSA.2.3" />« <w>Brisons</w><ve /></q>
				<q style="q1"><v id="4" bcv="PSA.2.4" /><w>Celui</w><ve /></q>
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		const blocks = result['PSA']!['2']!.blocks;
		expect(blocks).toHaveLength(3);
		expect(blocks[0]).toEqual({ kind: 'poetry', level: 1, verses: [{ v: 1, html: 'Pourquoi' }] });
		expect(blocks[1]).toEqual({
			kind: 'poetry',
			level: 2,
			verses: [
				{ v: 2, html: 'Les rois' },
				// normalizeVerseText puts an NBSP after an opening guillemet (French rule).
				{ v: 3, html: '« Brisons' }
			]
		});
		expect(blocks[2]).toEqual({ kind: 'poetry', level: 1, verses: [{ v: 4, html: 'Celui' }] });
	});

	it('attaches a stanza break to the block following <b/>', async () => {
		const xml = `<usfx>
			<book id="PSA">
				<c id="33" />
				<q style="q1"><v id="1" bcv="PSA.33.1" /><w>Justes</w><ve /></q>
				<b style="b" />
				<q style="q1"><v id="2" bcv="PSA.33.2" /><w>Louez</w><ve /></q>
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		const blocks = result['PSA']!['33']!.blocks;
		expect(blocks[0]!.kind).toBe('poetry');
		expect((blocks[0] as { stanzaBreak?: boolean }).stanzaBreak).toBeUndefined();
		expect((blocks[1] as { stanzaBreak?: boolean }).stanzaBreak).toBe(true);
	});

	it('ignores a self-closing <q style="q1" /> (no content)', async () => {
		const xml = `<usfx>
			<book id="PSA">
				<c id="3" />
				<q style="q1" />
				<d style="d"><v id="1" bcv="PSA.3.1" /><w>Chant de David</w><ve /></d>
				<q style="q1"><v id="2" bcv="PSA.3.2" /><w>Yahweh</w><ve /></q>
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		const chapter = result['PSA']!['3']!;
		expect(chapter.superscription).toBe('Chant de David');
		expect(chapter.blocks).toHaveLength(1);
		expect(chapter.blocks[0]).toEqual({
			kind: 'poetry',
			level: 1,
			verses: [{ v: 2, html: 'Yahweh' }]
		});
	});

	it('recovers a superscription from <p style="d"> (alternate encoding)', async () => {
		const xml = `<usfx>
			<book id="PSA">
				<c id="51" />
				<p style="d"><v id="1" bcv="PSA.51.1" /><w>Psaume de David</w><ve /></p>
				<p style="p"><v id="2" bcv="PSA.51.2" /><w>Aie pitié</w><ve /></p>
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		const chapter = result['PSA']!['51']!;
		expect(chapter.superscription).toBe('Psaume de David');
		expect(chapter.blocks).toEqual([{ kind: 'prose', verses: [{ v: 2, html: 'Aie pitié' }] }]);
	});

	it('wraps <nd>, <add>, and <qs> as inline spans in the verse html', async () => {
		const xml = `<usfx>
			<book id="EXO">
				<c id="3" />
				<p style="p"><v id="2" bcv="EXO.3.2" /><w>L’ange de</w> <nd><w>Yahweh</w></nd> <w>lui apparut</w><add>, dit-il,</add><ve /></p>
			</book>
			<book id="PSA">
				<c id="3" />
				<q style="q1"><v id="3" bcv="PSA.3.3" /><w>Nombreux</w> <qs>— Séla.</qs><ve /></q>
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		expect(result['EXO']!['3']!.blocks[0]!.verses[0]!.html).toBe(
			`L’ange de <span class="dn">Yahweh</span> lui apparut<em class="add">, dit-il,</em>`
		);
		expect(result['PSA']!['3']!.blocks[0]!.verses[0]!.html).toBe(
			`Nombreux <span class="selah">— Séla.</span>`
		);
	});

	it('wraps <qt> as small-caps and <it> as italic in the verse html', async () => {
		const xml = `<usfx>
			<book id="MAT">
				<c id="1" />
				<p style="p"><v id="23" bcv="MAT.1.23" />« <qt><w>Voici</w> <w>Emmanuel</w></qt>, <it>c’est</it>-à-dire.<ve /></p>
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		expect(result['MAT']!['1']!.blocks[0]!.verses[0]!.html).toBe(
			'« <span class="qt">Voici Emmanuel</span>, <em class="it">c’est</em>-à-dire.'
		);
	});

	it('keeps a verse that arrives before any <p>/<q> opens a block', async () => {
		const xml = `<usfx>
			<book id="MAT">
				<c id="1" />
				<v id="1" bcv="MAT.1.1" /><w>Orpheline</w><ve />
				<p style="p"><v id="2" bcv="MAT.1.2" /><w>Abraham</w><ve /></p>
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		const blocks = result['MAT']!['1']!.blocks;
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual({ kind: 'prose', verses: [{ v: 1, html: 'Orpheline' }] });
		expect(blocks[1]).toEqual({ kind: 'prose', verses: [{ v: 2, html: 'Abraham' }] });
	});

	it('skips <s> section titles and <p style="r"/"ms1"> metadata without breaking blocks', async () => {
		const xml = `<usfx>
			<book id="MAT">
				<c id="1" />
				<p style="ms1">PREMIÈRE PARTIE</p>
				<s style="s2">Généalogie</s>
				<p style="p"><v id="1" bcv="MAT.1.1" /><w>Généalogie</w><ve /></p>
				<p style="r">(Luc 3,23-38)</p>
				<v id="2" bcv="MAT.1.2" /><w>Isaac</w><ve />
			</book>
		</usfx>`;
		const result = await parseUSFXParagraphs(xml);
		const blocks = result['MAT']!['1']!.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'prose',
			verses: [
				{ v: 1, html: 'Généalogie' },
				{ v: 2, html: 'Isaac' }
			]
		});
	});
});

describe('splitIntoProseBlocks', () => {
	it('splits a flat verse list into prose blocks at the given break verses', () => {
		const verses = [
			{ v: 1, html: 'a' },
			{ v: 2, html: 'b' },
			{ v: 3, html: 'c' },
			{ v: 4, html: 'd' }
		];
		expect(splitIntoProseBlocks(verses, [1, 3])).toEqual([
			{
				kind: 'prose',
				verses: [
					{ v: 1, html: 'a' },
					{ v: 2, html: 'b' }
				]
			},
			{
				kind: 'prose',
				verses: [
					{ v: 3, html: 'c' },
					{ v: 4, html: 'd' }
				]
			}
		]);
	});

	it('ignores a break verse that is not the first verse of a chapter (ch2 v1 vs a global v1)', () => {
		const verses = [
			{ v: 5, html: 'a' },
			{ v: 6, html: 'b' },
			{ v: 7, html: 'c' }
		];
		expect(splitIntoProseBlocks(verses, [1, 6])).toEqual([
			{ kind: 'prose', verses: [{ v: 5, html: 'a' }] },
			{
				kind: 'prose',
				verses: [
					{ v: 6, html: 'b' },
					{ v: 7, html: 'c' }
				]
			}
		]);
	});
});
