/**
 * Bionic reading: bold the leading fraction of each word so the eye can fix on
 * a word's start and skim the rest.
 *
 * This operates on HTML strings rather than plain text, because every reader on
 * the site renders a single `{@html}` blob (Bible verses, CEC paragraphs,
 * Compendium answers) that already carries meaningful markup: `.qt` for Old
 * Testament quotations, `.sc` for small caps, footnote `sup`s, cross-reference
 * links. The input is split on tag boundaries and only the text between tags is
 * ever touched, so all of that markup survives by construction. Feeding raw
 * HTML to a plain-text bionic library would bold attribute names and corrupt
 * tags.
 *
 * Entities are skipped for the same reason: bolding the first three characters
 * of `&nbsp;` yields `<b>&nb</b>sp;`, which renders as literal text.
 */

export interface BionicOptions {
	/** 1-5. How much of each word is bolded. */
	fixation: number;
	/** 0-4. Bold only every (saccade + 1)-th word; 0 bolds every word. */
	saccade: number;
}

/** Proportion of a word bolded at each fixation strength. */
const FIXATION_RATIOS = [0.3, 0.4, 0.5, 0.6, 0.7];

/**
 * Words are runs of letters (including accented ones) and apostrophes. Digits
 * are excluded deliberately: bolding part of "1324-1327" makes a paragraph
 * reference harder to read, not easier.
 */
export const WORD_RE = /[\p{L}][\p{L}'’]*/gu;

/** An HTML tag, or an entity, neither of which may be split. */
const TAG_OR_ENTITY = /(<[^>]*>|&[a-zA-Z#][a-zA-Z0-9]*;)/;

/** Split a word into its bolded head and unbolded tail. */
export function boldPrefix(word: string, fixation: number): { head: string; tail: string } {
	const ratio = FIXATION_RATIOS[Math.min(4, Math.max(0, fixation - 1))] ?? 0.5;
	const n = Math.min(word.length, Math.max(1, Math.round(word.length * ratio)));
	return { head: word.slice(0, n), tail: word.slice(n) };
}

function boldPrefixHtml(word: string, fixation: number): string {
	const { head, tail } = boldPrefix(word, fixation);
	return `<b>${head}</b>${tail}`;
}

export function bionicHtml(html: string, { fixation, saccade }: BionicOptions): string {
	if (!html) return html;

	// Every other segment is a tag or entity, which passes through untouched.
	const segments = html.split(TAG_OR_ENTITY);
	let wordIndex = 0;
	const step = Math.max(1, saccade + 1);

	return segments
		.map((segment) => {
			if (!segment || TAG_OR_ENTITY.test(segment)) return segment;
			return segment.replace(WORD_RE, (word) => {
				const bold = wordIndex % step === 0;
				wordIndex++;
				return bold ? boldPrefixHtml(word, fixation) : word;
			});
		})
		.join('');
}
