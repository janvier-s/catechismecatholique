<script lang="ts">
	import type { MagisterialRefRecord } from '$lib/data/types';
	let {
		html,
		bibleRefs = []
	}: { html: string; bibleRefs?: MagisterialRefRecord[] } = $props();
	let containerEl: HTMLDivElement | undefined = $state();

	function formatBibleRef(raw: string): string {
		// "Mt 28:19-20" → "Mt 28, 19-20"
		const cleaned = raw.replace(/^voir\s+/i, '').trim();
		return cleaned.replace(':', ', ');
	}

	$effect(() => {
		if (!containerEl) return;
		void html;
		void bibleRefs;
		const refsByIdx = new Map<string, MagisterialRefRecord>();
		for (const r of bibleRefs) {
			if (r.idx !== undefined && r.idx !== null) refsByIdx.set(String(r.idx), r);
		}

		// Pass 1: inline non-"voir" bibleRefs and their continuations.
		const allBibleSups = Array.from(
			containerEl.querySelectorAll<HTMLElement>('sup.srcRef.bibleRef')
		);
		for (const sup of allBibleSups) {
			const idx = sup.getAttribute('data-idx') ?? sup.textContent ?? '';
			const ref = refsByIdx.get(idx);
			if (!ref || !ref.raw) continue;
			if (ref.type === 'bible_continuation') {
				const prev = sup.previousSibling;
				if (prev instanceof Text) {
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
				sup.replaceWith(document.createTextNode(' (' + formatBibleRef(ref.raw) + ')'));
			}
		}

		// Pass 2: any remaining sups (cccRef + footnote-only bibleRef) — strip leading §,
		// add .lead class on the first sup of a run (so CSS shows §), and insert commas
		// between any two consecutive sups regardless of subtype (mixed runs allowed).
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
		cursor: help;
	}
	.prose-paragraph :global(sup.srcRef.cccRef.lead::before) {
		content: '§';
		font-size: 0.7em;
		margin-right: 0.05em;
		vertical-align: 0.1em;
	}
</style>
