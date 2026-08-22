import { describe, it, expect } from 'vitest';
import { bionicHtml } from '$lib/utils/bionic';

const opts = { fixation: 3, saccade: 0 };

describe('bionicHtml', () => {
	it('bolds the leading fraction of each word', () => {
		expect(bionicHtml('salut monde', opts)).toBe('<b>sal</b>ut <b>mon</b>de');
	});

	it('leaves tags completely untouched, so existing markup survives', () => {
		const html = '<span class="qt">salut</span> monde';
		const out = bionicHtml(html, opts);
		expect(out).toContain('<span class="qt">');
		expect(out).toContain('</span>');
		// The attribute text must never be bolded.
		expect(out).not.toContain('<b>cla');
		expect(out).not.toContain('<b>spa');
	});

	it('bolds inside a tag’s text content, not the tag itself', () => {
		expect(bionicHtml('<em>monde</em>', opts)).toBe('<em><b>mon</b>de</em>');
	});

	it('never splits an HTML entity', () => {
		// &nbsp; must survive whole; bolding "&nb" would corrupt it.
		const out = bionicHtml('salut&nbsp;monde', opts);
		expect(out).toContain('&nbsp;');
		expect(out).not.toContain('<b>&nb');
	});

	it('preserves the original text exactly once the <b> tags are stripped', () => {
		const src = '<p>Au commencement, Dieu créa le ciel &amp; la terre.</p>';
		const stripped = bionicHtml(src, opts).replace(/<\/?b>/g, '');
		expect(stripped).toBe(src);
	});

	it('bolds more of each word at higher fixation strength', () => {
		const low = bionicHtml('commencement', { fixation: 1, saccade: 0 });
		const high = bionicHtml('commencement', { fixation: 5, saccade: 0 });
		const boldLen = (s: string) => (s.match(/<b>([^<]*)<\/b>/)?.[1] ?? '').length;
		expect(boldLen(high)).toBeGreaterThan(boldLen(low));
	});

	it('skips words according to the saccade setting', () => {
		// saccade 1 bolds every other word.
		const out = bionicHtml('un deux trois quatre', { fixation: 3, saccade: 1 });
		expect((out.match(/<b>/g) ?? []).length).toBe(2);
	});

	it('bolds every word when saccade is 0', () => {
		const out = bionicHtml('un deux trois quatre', { fixation: 3, saccade: 0 });
		expect((out.match(/<b>/g) ?? []).length).toBe(4);
	});

	it('handles single-character words without producing an empty bold', () => {
		const out = bionicHtml('a b', opts);
		expect(out).not.toContain('<b></b>');
	});

	it('leaves punctuation and digits alone rather than bolding them', () => {
		const out = bionicHtml('1324-1327', opts);
		expect(out).not.toContain('<b>');
	});

	it('returns the input unchanged when there is no word text', () => {
		expect(bionicHtml('<br /><hr />', opts)).toBe('<br /><hr />');
		expect(bionicHtml('', opts)).toBe('');
	});
});
