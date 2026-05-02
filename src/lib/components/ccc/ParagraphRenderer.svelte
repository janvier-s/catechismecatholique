<script lang="ts">
	import type { MagisterialRefRecord } from '$lib/data/types';
	import { openPanel } from '$lib/stores/studyPanel';
	import { bookByAbbr } from '$lib/utils/bibleBookSlug';
	let {
		html,
		bibleRefs = [],
		paragraphNumber
	}: { html: string; bibleRefs?: MagisterialRefRecord[]; paragraphNumber: number } = $props();
	let containerEl: HTMLDivElement | undefined = $state();

	// "Mt 28:19-20" → "Mt 28, 19-20"
	function formatBibleRef(raw: string): string {
		const cleaned = raw.replace(/^voir\s+/i, '').trim();
		return cleaned.replace(':', ', ');
	}

	// "Mt 28:19" or "Mt 28:19-20" → "/bible/matthieu/28/19" (range → first verse)
	function bibleHrefForRaw(raw: string): string | null {
		const cleaned = raw.replace(/^voir\s+/i, '').trim();
		const m = cleaned.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s+(\d+):(\d+)/);
		if (!m) return null;
		const book = bookByAbbr(m[1]!.trim());
		if (!book) return null;
		return `/bible/${book.slug}/${m[2]}/${m[3]}`;
	}

	function makeInlineLink(raw: string): HTMLAnchorElement {
		const a = document.createElement('a');
		a.textContent = ' (' + formatBibleRef(raw) + ')';
		const href = bibleHrefForRaw(raw);
		if (href) {
			a.href = href;
			a.className = 'bible-inline';
		}
		return a;
	}

	$effect(() => {
		if (!containerEl) return;
		void html;
		void bibleRefs;
		const refsByIdx = new Map<string, MagisterialRefRecord>();
		for (const r of bibleRefs) {
			if (r.idx !== undefined && r.idx !== null) refsByIdx.set(String(r.idx), r);
		}

		// Pass 1: inline non-"voir" bibleRefs as clickable <a> elements
		const allBibleSups = Array.from(
			containerEl.querySelectorAll<HTMLElement>('sup.srcRef.bibleRef')
		);
		for (const sup of allBibleSups) {
			const idx = sup.getAttribute('data-idx') ?? sup.textContent ?? '';
			const ref = refsByIdx.get(idx);
			if (!ref || !ref.raw) continue;
			if (ref.type === 'bible_continuation') {
				const prev = sup.previousSibling;
				if (prev instanceof HTMLAnchorElement && prev.classList.contains('bible-inline')) {
					prev.textContent = (prev.textContent ?? '').replace(/\)\s*$/, '');
					prev.textContent += ' ; ' + formatBibleRef(ref.raw) + ')';
					sup.remove();
				} else if (prev instanceof Text) {
					const txt = prev.nodeValue ?? '';
					const closeParen = txt.lastIndexOf(')');
					if (closeParen >= 0) {
						prev.nodeValue =
							txt.slice(0, closeParen) +
							' ; ' +
							formatBibleRef(ref.raw) +
							txt.slice(closeParen);
						sup.remove();
					}
				}
				continue;
			}
			if (!/^voir\s/i.test(ref.raw)) {
				sup.replaceWith(makeInlineLink(ref.raw));
			}
		}

		// Pass 2: remaining sups (cccRef + footnote-only bibleRef) — strip leading §,
		// add .lead class on the first sup of a run, comma-separate consecutive sups
		// regardless of subtype.
		const remaining = Array.from(containerEl.querySelectorAll<HTMLElement>('sup.srcRef'));
		for (const sup of remaining) {
			if (sup.classList.contains('cccRef')) {
				sup.textContent = (sup.textContent ?? '').replace(/^§/, '');
			}
			const prev = sup.previousSibling;
			const isContinuation = prev instanceof Element && prev.matches('sup.srcRef');
			if (isContinuation) {
				sup.before(document.createTextNode(', '));
			} else if (sup.classList.contains('cccRef')) {
				sup.classList.add('lead');
			}
		}

		// Click handler: any remaining sup opens the panel with the right tab.
		const onClick = (e: MouseEvent) => {
			if (!(e.target instanceof Element)) return;
			const sup = e.target.closest('sup.srcRef') as HTMLElement | null;
			if (!sup) return;
			e.preventDefault();
			const isCcc = sup.classList.contains('cccRef');
			const isBible = sup.classList.contains('bibleRef');
			const isDoc = sup.classList.contains('docRef');
			const tab = isCcc ? 'cross-refs' : isBible ? 'bible' : isDoc ? 'sources' : 'cross-refs';
			openPanel({ paragraph: paragraphNumber }, tab);
		};
		containerEl.addEventListener('click', onClick);
		return () => containerEl?.removeEventListener('click', onClick);
	});
</script>

<div bind:this={containerEl} class="prose-paragraph leading-relaxed text-lg">
	{@html html}
</div>

<style>
	.prose-paragraph :global(sup.srcRef) {
		color: var(--color-accent);
		font-size: 0.7em;
		margin-left: 0.1em;
		cursor: pointer;
	}
	.prose-paragraph :global(sup.srcRef.cccRef.lead::before) {
		content: '§';
		font-size: 0.7em;
		margin-right: 0.05em;
		vertical-align: 0.1em;
	}
	.prose-paragraph :global(a.bible-inline) {
		color: var(--color-accent);
		text-decoration: none;
	}
	.prose-paragraph :global(a.bible-inline:hover) {
		text-decoration: underline;
	}
</style>
