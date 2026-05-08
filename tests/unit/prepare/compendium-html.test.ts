import { describe, it, expect } from 'vitest';
import { scanHtml } from '../../../scripts/prepare/compendium/html';
import { scanAppendixHtml } from '../../../scripts/prepare/compendium/html';

describe('scanHtml', () => {
	it('emits section anchors and question markers in document order', () => {
		const html = `
			<h4 id="p1">Heading 1</h4>
			<div class="blq"><div class="izq"><p class="preg">1. Q one?</p></div><div class="der"><p class="ref">5</p></div></div>
			<p>Answer one.</p>
			<h4 id="p2">Heading 2</h4>
			<div class="blq"><div class="izq"><p class="preg">2. Q two?</p></div><div class="der"><p class="ref">7-9</p></div></div>
			<p>Answer two.</p>
		`;
		const events = scanHtml(html);
		expect(events.map((e) => e.kind)).toEqual(['section', 'question', 'section', 'question']);
		expect(events[0]).toEqual({ kind: 'section', anchor: 'p1' });
		expect(events[1]).toMatchObject({
			kind: 'question',
			number: 1,
			question: 'Q one?',
			answer: 'Answer one.'
		});
		expect(events[2]).toEqual({ kind: 'section', anchor: 'p2' });
		expect(events[3]).toMatchObject({
			kind: 'question',
			number: 2,
			question: 'Q two?',
			answer: 'Answer two.'
		});
	});

	it('captures an epigraph blockquote following a section anchor', () => {
		const html = `
			<h4 id="p16">L'HOMME EST CAPABLE DE DIEU</h4>
			<blockquote><p><span style="font-style: italic;">« Tu es grand, Seigneur »</span> (saint Augustin).</p></blockquote>
			<div class="blq"><div class="izq"><p class="preg">2. Q?</p></div><div class="der"><p class="ref">27</p></div></div>
			<p>Answer.</p>
		`;
		const events = scanHtml(html);
		expect(events.map((e) => e.kind)).toEqual(['section', 'epigraph', 'question']);
		expect(events[1]).toMatchObject({
			kind: 'epigraph',
			text: '« Tu es grand, Seigneur »',
			attribution: 'saint Augustin'
		});
	});

	it('matches preg paragraphs with extra attributes (e.g. style="...")', () => {
		const html = `<p class="preg" style="orphans: 2; widows: 2;">20. Qu'est-ce que le canon?</p><p>An answer.</p>`;
		const events = scanHtml(html);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			kind: 'question',
			number: 20,
			question: "Qu'est-ce que le canon?",
			answer: 'An answer.'
		});
	});
});

describe('scanAppendixHtml', () => {
	it('emits headings, bilingual prayer pairs, and doct prose', () => {
		const html = `
			<h4 id="p114">PRIÈRES COMMUNES</h4>
			<table><tbody>
				<tr>
					<td><p class="noind"><span style="font-weight: bold;">Notre Père</span><br/></p>
					<p class="noind">Notre Père, qui es aux cieux…</p></td>
					<td><p class="noind"><b>Pater Noster</b></p>
					<p class="noind">Pater noster qui es in caelis…</p></td>
				</tr>
				<tr>
					<td><p class="noind"><b>Ave Maria</b></p>
					<p class="noind">Je vous salue, Marie…</p></td>
					<td><p class="noind"><b>Ave, Maríæ</b></p>
					<p class="noind">Ave, María, gratia plena…</p></td>
				</tr>
			</tbody></table>
			<h4 id="p14">FORMULES DE LA DOCTRINE CATHOLIQUE</h4>
			<p class="doct"><span style="font-weight: bold;">Les Béatitudes</span></p>
			<p class="doct">Heureux les pauvres de cœur…</p>
			<h3 id="p15">ABRÉVIATIONS BIBLIQUES</h3>
		`;
		const events = scanAppendixHtml(html);
		// Must not include anything after p15
		expect(events.find((e) => e.kind === 'heading' && e.text.includes('ABRÉV'))).toBeUndefined();
		// Two h4 section headings at level 2
		const headings = events.filter((e) => e.kind === 'heading');
		expect(headings.map((e) => e.text)).toEqual([
			'PRIÈRES COMMUNES',
			'FORMULES DE LA DOCTRINE CATHOLIQUE'
		]);
		// Two bilingual prayer pairs
		const prayers = events.filter((e) => e.kind === 'prayer');
		expect(prayers).toHaveLength(2);
		expect(prayers[0]).toMatchObject({
			kind: 'prayer',
			fr: { title: 'Notre Père' },
			la: { title: 'Pater Noster' }
		});
		expect(prayers[0]?.fr.body).toContain('Notre Père, qui es aux cieux');
		expect(prayers[0]?.la.body).toContain('Pater noster qui es in caelis');
		expect(prayers[1]).toMatchObject({
			kind: 'prayer',
			fr: { title: 'Ave Maria' },
			la: { title: 'Ave, Maríæ' }
		});
		// Prose from doct paragraphs
		const proses = events.filter((e) => e.kind === 'prose');
		expect(proses.length).toBeGreaterThanOrEqual(2);
	});

	it('returns empty array when appendix start anchor is absent', () => {
		expect(scanAppendixHtml('<h4 id="p15">ABRÉVIATIONS</h4>')).toEqual([]);
	});
});
