<script lang="ts">
	import type { MagisterialRefRecord } from '$lib/data/types';
	import { openPanel } from '$lib/stores/studyPanel';
	import { goto } from '$app/navigation';
	let {
		html,
		bibleRefs = [],
		paragraphNumber,
		inPanel = false
	}: {
		html: string;
		bibleRefs?: MagisterialRefRecord[];
		paragraphNumber: number;
		// When rendered inside the study panel, cccRef sup clicks also navigate
		// the main view to the target paragraph (so the reader follows along).
		// In the main view, sup clicks just update the panel context.
		inPanel?: boolean;
	} = $props();
	let containerEl: HTMLDivElement | undefined = $state();

	// "Mt 28:19-20" → "Mt 28, 19-20"
	function formatBibleRef(raw: string): string {
		const cleaned = raw.replace(/^voir\s+/i, '').trim();
		return cleaned.replace(':', ', ');
	}

	function makeInlineRef(raw: string): HTMLButtonElement {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.textContent = ' (' + formatBibleRef(raw) + ')';
		btn.className = 'bible-inline';
		return btn;
	}

	$effect(() => {
		if (!containerEl) return;
		void html;
		void bibleRefs;
		const refsByIdx = new Map<string, MagisterialRefRecord>();
		for (const r of bibleRefs) {
			if (r.idx !== undefined && r.idx !== null) refsByIdx.set(String(r.idx), r);
		}

		// Pass 1: inline non-"voir" bibleRefs as clickable buttons that open the panel.
		const allBibleSups = Array.from(
			containerEl.querySelectorAll<HTMLElement>('sup.srcRef.bibleRef')
		);
		for (const sup of allBibleSups) {
			const idx = sup.getAttribute('data-idx') ?? sup.textContent ?? '';
			const ref = refsByIdx.get(idx);
			if (!ref || !ref.raw) continue;
			if (ref.type === 'bible_continuation') {
				const prev = sup.previousSibling;
				if (prev instanceof HTMLButtonElement && prev.classList.contains('bible-inline')) {
					prev.textContent = (prev.textContent ?? '').replace(/\)\s*$/, '');
					prev.textContent += ' ; ' + formatBibleRef(ref.raw) + ')';
					sup.remove();
				} else if (prev instanceof Text) {
					const txt = prev.nodeValue ?? '';
					const closeParen = txt.lastIndexOf(')');
					if (closeParen >= 0) {
						prev.nodeValue =
							txt.slice(0, closeParen) + ' ; ' + formatBibleRef(ref.raw) + txt.slice(closeParen);
						sup.remove();
					}
				}
				continue;
			}
			if (!/^voir\s/i.test(ref.raw)) {
				sup.replaceWith(makeInlineRef(ref.raw));
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

		// Click handler:
		// - inline bible ref button → open panel on Bible tab for the current paragraph
		// - cccRef sup → open the panel showing the TARGET paragraph (no navigation)
		// - bibleRef / docRef sup → open panel on the matching tab for the current paragraph
		const onClick = (e: MouseEvent) => {
			if (!(e.target instanceof Element)) return;

			const inline = e.target.closest('button.bible-inline');
			if (inline) {
				e.preventDefault();
				openPanel({ paragraph: paragraphNumber }, 'bible');
				return;
			}

			const sup = e.target.closest('sup.srcRef') as HTMLElement | null;
			if (!sup) return;
			e.preventDefault();

			if (sup.classList.contains('cccRef')) {
				const m = (sup.textContent ?? '').match(/(\d+)/);
				const target = m ? parseInt(m[1]!, 10) : NaN;
				if (Number.isFinite(target)) {
					openPanel({ paragraph: target }, 'cross-refs');
					if (inPanel) void goto(`/ccc/${target}`);
					return;
				}
			}

			const isBible = sup.classList.contains('bibleRef');
			const isDoc = sup.classList.contains('docRef');
			const tab = isBible ? 'bible' : isDoc ? 'sources' : 'cross-refs';
			openPanel({ paragraph: paragraphNumber }, tab);
		};
		containerEl.addEventListener('click', onClick);
		return () => containerEl?.removeEventListener('click', onClick);
	});
</script>

<div bind:this={containerEl} class="prose-paragraph leading-relaxed">
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
	.prose-paragraph :global(button.bible-inline) {
		color: var(--color-accent);
		background: transparent;
		border: 0;
		padding: 0;
		font: inherit;
		cursor: pointer;
		text-decoration: none;
	}
	.prose-paragraph :global(button.bible-inline:hover) {
		text-decoration: underline;
	}
</style>
