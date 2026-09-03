import { describe, it, expect } from 'vitest';
import { stripHtml } from '../../src/lib/utils/html';

describe('stripHtml', () => {
	it('drops footnote markers entirely, not just the tag', () => {
		expect(stripHtml('Texte<sup class="srcRef docRef" data-idx="a">a</sup>.')).toBe('Texte.');
	});

	it('strips remaining tags and collapses whitespace', () => {
		expect(stripHtml('<span>Bonjour</span><br/><span>le monde</span>')).toBe('Bonjour le monde');
	});

	// The Catechism writes a space before its note markers, so removing the
	// marker used to leave the space stranded against the punctuation: two
	// paragraphs in three came out with "pour son fils ."
	it('closes the gap a removed marker leaves before a full stop', () => {
		expect(stripHtml('pour son fils <sup class="srcRef bibleRef" data-idx="1">1</sup>.')).toBe(
			'pour son fils.'
		);
	});

	it('closes the gap a removed marker leaves before a comma', () => {
		expect(stripHtml('ses enfants <sup data-idx="2">2</sup>, et Dieu')).toBe(
			'ses enfants, et Dieu'
		);
	});

	// French typography puts a space before these · collapsing it would be a
	// different bug from the one being fixed.
	it('keeps the French space before a semicolon, colon and closing guillemet', () => {
		expect(stripHtml('bien-aimée <sup data-idx="3">3</sup> ; cet amour')).toBe(
			'bien-aimée ; cet amour'
		);
		expect(stripHtml('précieux <sup data-idx="4">4</sup> : « Dieu')).toBe('précieux : « Dieu');
		expect(stripHtml('unique <sup data-idx="5">5</sup> »')).toBe('unique »');
	});

	it('keeps the French space before a question and an exclamation mark', () => {
		expect(stripHtml('Qui donc <sup data-idx="6">6</sup> ?')).toBe('Qui donc ?');
		expect(stripHtml('Voici <sup data-idx="7">7</sup> !')).toBe('Voici !');
	});

	it('closes the gap a stripped tag leaves inside parentheses', () => {
		expect(stripHtml('(<a href="/cec/849">⇒</a> CIC, can. 1199)')).toBe('(⇒ CIC, can. 1199)');
	});

	it('closes the gap a stripped tag leaves before a closing parenthesis', () => {
		expect(stripHtml('(voir <em>DS</em> 1314 <sup data-idx="8">8</sup>)')).toBe('(voir DS 1314)');
	});
});
