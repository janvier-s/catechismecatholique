import { boldPrefix, WORD_RE, type BionicOptions } from './bionic';

/**
 * Client-side bionic reading.
 *
 * The transform has to run after mount rather than at render time. Every reader
 * on the site renders its text through `{@html}`, and Svelte reuses the
 * server's DOM for those blocks during hydration without re-evaluating them. A
 * render-time transform therefore never appears on a fresh page load: it only
 * shows up once some later client-side update happens to re-render the block.
 *
 * Walking text nodes has a second benefit. It cannot damage the surrounding
 * markup, because it never touches elements: the `.qt` Old Testament
 * quotations, `.sc` small caps, footnote `sup`s and cross-reference links all
 * survive untouched by construction.
 */

/** Containers whose prose gets the treatment, across every corpus. */
export const BIONIC_TARGETS =
	'.verse-text, .bible-prose, .bible-poetry-line, .prose-paragraph, .compendium-answer';

/** Marks a wrapper this module created, so a re-run can undo its own work. */
const MARK = 'data-bionic-b';

/**
 * Remove a previous pass, restoring the original text nodes. Without this a
 * second run would bold the already-bolded prefixes again, compounding on each
 * pref change.
 */
export function clearBionic(root: ParentNode): void {
	for (const b of Array.from(root.querySelectorAll(`b[${MARK}]`))) {
		b.replaceWith(...Array.from(b.childNodes));
	}
	// Adjacent text nodes left behind by unwrapping would otherwise split words
	// on the next pass ("com" + "mencement" reads as two words to the walker).
	for (const el of Array.from(root.querySelectorAll(BIONIC_TARGETS))) {
		el.normalize();
	}
}

function bionicTextNode(node: Text, opts: BionicOptions, state: { i: number }): void {
	const text = node.nodeValue ?? '';
	if (!text.trim()) return;

	const step = Math.max(1, opts.saccade + 1);
	const frag = document.createDocumentFragment();
	let last = 0;
	let matched = false;

	for (const m of text.matchAll(WORD_RE)) {
		const word = m[0];
		const start = m.index ?? 0;
		const bold = state.i % step === 0;
		state.i++;
		if (!bold) continue;

		matched = true;
		if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));

		const split = boldPrefix(word, opts.fixation);
		const b = document.createElement('b');
		b.setAttribute(MARK, '');
		b.textContent = split.head;
		frag.appendChild(b);
		if (split.tail) frag.appendChild(document.createTextNode(split.tail));
		last = start + word.length;
	}

	if (!matched) return;
	if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
	node.replaceWith(frag);
}

/** Apply bionic reading to every target container under `root`. */
export function applyBionic(root: ParentNode, opts: BionicOptions): void {
	const state = { i: 0 };
	for (const el of Array.from(root.querySelectorAll(BIONIC_TARGETS))) {
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		const texts: Text[] = [];
		let n = walker.nextNode();
		while (n) {
			texts.push(n as Text);
			n = walker.nextNode();
		}
		// Collected first: replacing nodes mid-walk invalidates the walker.
		for (const t of texts) bionicTextNode(t, opts, state);
	}
}

/** Re-apply from scratch, so repeated calls are idempotent. */
export function refreshBionic(root: ParentNode, enabled: boolean, opts: BionicOptions): void {
	clearBionic(root);
	if (enabled) applyBionic(root, opts);
}
