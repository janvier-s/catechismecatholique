import { describe, it, expect } from 'vitest';
import { scanHtml } from '../../../scripts/prepare/compendium/html';

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
		expect(events.map((e) => e.kind)).toEqual([
			'section', 'question', 'section', 'question'
		]);
		expect(events[0]).toEqual({ kind: 'section', anchor: 'p1' });
		expect(events[1]).toMatchObject({ kind: 'question', number: 1, question: 'Q one?', answer: 'Answer one.' });
		expect(events[2]).toEqual({ kind: 'section', anchor: 'p2' });
		expect(events[3]).toMatchObject({ kind: 'question', number: 2, question: 'Q two?', answer: 'Answer two.' });
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
		expect(events[0]).toMatchObject({ kind: 'question', number: 20, question: 'Qu\'est-ce que le canon?', answer: 'An answer.' });
	});
});
