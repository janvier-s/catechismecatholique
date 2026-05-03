<script lang="ts">
	import type { MagisterialRefRecord } from '$lib/data/types';
	import { openPanel } from '$lib/stores/studyPanel';
	import { prefs } from '$lib/stores/prefs';
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

	function makeInlineRef(raw: string, idx: string): DocumentFragment {
		const frag = document.createDocumentFragment();
		frag.appendChild(document.createTextNode(' '));
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.textContent = '(' + formatBibleRef(raw) + ')';
		btn.className = 'bible-inline';
		btn.dataset.idx = idx;
		frag.appendChild(btn);
		return frag;
	}

	$effect(() => {
		if (!containerEl) return;
		// Re-run when these prefs change so the rendering tracks them.
		const inlineAsMarkers = $prefs.inlineAsMarkers;
		const sideRefs = $prefs.crossRefsLayout === 'side' && !inPanel;
		// Reset to the source HTML each pass so transformations are idempotent
		// — toggling a pref re-applies the right rules from scratch instead of
		// compounding on already-mutated DOM (which would corrupt the markup
		// the second time the effect runs).
		containerEl.innerHTML = html;
		void bibleRefs;

		const refsByIdx = new Map<string, MagisterialRefRecord>();
		for (const r of bibleRefs) {
			if (r.idx !== undefined && r.idx !== null) refsByIdx.set(String(r.idx), r);
		}

		// Pass 1: inline non-"voir" bibleRefs as clickable buttons. When the
		// "Réfs. bibliques en exposant" pref is on, leave them as sups so the
		// whole paragraph reads as flowing prose with footnote-style markers.
		const allBibleSups = Array.from(
			containerEl.querySelectorAll<HTMLElement>('sup.srcRef.bibleRef')
		);
		for (const sup of allBibleSups) {
			const idx = sup.getAttribute('data-idx') ?? sup.textContent ?? '';
			const ref = refsByIdx.get(idx);
			if (!ref || !ref.raw) continue;
			if (ref.type === 'bible_continuation') {
				if (inlineAsMarkers) continue; // no parent inline to merge into
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
			if (!inlineAsMarkers && !/^voir\s/i.test(ref.raw)) {
				// Only inline when the marker sits right after a closing guillemet
				// (citation). Bible refs that follow ordinary prose stay as
				// footnote-style sups so the text reads as continuous narrative.
				const prevText = sup.previousSibling instanceof Text ? sup.previousSibling.nodeValue : '';
				if (/»\s*$/.test(prevText ?? '')) {
					sup.replaceWith(makeInlineRef(ref.raw, idx));
				}
			}
		}

		// Pass 2: remaining sups (cccRef + footnote-only bibleRef). Strip leading §
		// from cccRef text and drop cross-refs entirely when the side-margin
		// layout is on. Consecutive sups get visual spacing via CSS margin
		// (rather than a "," text node) so that hiding one doesn't leave a
		// dangling comma behind.
		const remaining = Array.from(containerEl.querySelectorAll<HTMLElement>('sup.srcRef'));
		for (const sup of remaining) {
			if (sup.classList.contains('cccRef')) {
				if (sideRefs) {
					sup.remove();
					continue;
				}
				sup.textContent = (sup.textContent ?? '').replace(/^§/, '');
			}
		}

		// Pass 3: wrap each marker (sup or inline button) along with its
		// leading whitespace / comma separator, so hiding the marker via the
		// reading prefs also hides the separator. Without this, toggling
		// "hide cross-refs" leaves dangling commas and spaces (notably the
		// space before the next "." that follows a removed marker).
		const markers = containerEl.querySelectorAll<HTMLElement>(
			'sup.srcRef, button.bible-inline'
		);
		for (const marker of markers) {
			if (marker.parentElement?.classList.contains('ref-wrap')) continue;
			const wrap = document.createElement('span');
			wrap.className = 'ref-wrap';
			if (marker.tagName === 'SUP') {
				if (marker.classList.contains('cccRef')) wrap.classList.add('ref-cccRef');
				else if (marker.classList.contains('bibleRef')) wrap.classList.add('ref-bibleRef');
				else if (marker.classList.contains('docRef')) wrap.classList.add('ref-docRef');
			} else {
				wrap.classList.add('ref-bible-inline');
			}
			const prevNode = marker.previousSibling;
			if (prevNode instanceof Text) {
				const txt = prevNode.nodeValue ?? '';
				const sep = txt.match(/[\s,]+$/);
				if (sep) {
					prevNode.nodeValue = txt.slice(0, -sep[0].length);
					wrap.appendChild(document.createTextNode(sep[0]));
				}
			}
			marker.parentNode!.insertBefore(wrap, marker);
			wrap.appendChild(marker);
		}

		// Click handler — DR study-mode pattern: clicking ANY marker on a
		// paragraph opens the panel for that paragraph (not for the marker's
		// target). The marker class picks the tab.
		// - inline bible ref button → Bible tab
		// - cccRef sup → cross-refs tab
		// - bibleRef sup → Bible tab
		// - docRef sup → Sources tab
		// When inPanel=true (panel renvois entries), clicking a cccRef sup
		// follows the reference: navigate to the target paragraph in the
		// main view; the URL effect updates the panel context.
		const onClick = (e: MouseEvent) => {
			if (!(e.target instanceof Element)) return;

			const inline = e.target.closest<HTMLButtonElement>('button.bible-inline');
			if (inline) {
				e.preventDefault();
				const idxAttr = inline.dataset.idx ?? '';
				const idx = parseInt(idxAttr, 10);
				openPanel(
					{
						paragraph: paragraphNumber,
						...(Number.isFinite(idx) ? { bibleRefIdx: idx } : {})
					},
					'bible'
				);
				return;
			}

			const sup = e.target.closest('sup.srcRef') as HTMLElement | null;
			if (!sup) return;
			e.preventDefault();

			if (inPanel && sup.classList.contains('cccRef')) {
				const m = (sup.textContent ?? '').match(/(\d+)/);
				const target = m ? parseInt(m[1]!, 10) : NaN;
				if (Number.isFinite(target)) {
					void goto(`/ccc/${target}`);
					return;
				}
			}

			const isBible = sup.classList.contains('bibleRef');
			const isDoc = sup.classList.contains('docRef');
			const tab = isBible ? 'bible' : isDoc ? 'sources' : 'cross-refs';
			const idxAttr = sup.getAttribute('data-idx') ?? '';
			const idx = parseInt(idxAttr, 10);
			openPanel(
				{
					paragraph: paragraphNumber,
					...(isBible && Number.isFinite(idx) ? { bibleRefIdx: idx } : {})
				},
				tab
			);
		};
		containerEl.addEventListener('click', onClick);
		return () => containerEl?.removeEventListener('click', onClick);
	});
</script>

<div
	bind:this={containerEl}
	class="prose-paragraph leading-relaxed"
	data-paragraph
>
	{@html html}
</div>

<style>
	.prose-paragraph :global(sup.srcRef) {
		font-family: var(--font-ui);
		font-weight: 500;
		font-size: 0.7em;
		margin-left: 0.04em;
		cursor: pointer;
	}
	.prose-paragraph :global(sup.srcRef.cccRef) {
		color: var(--color-accent);
	}
	.prose-paragraph :global(sup.srcRef.bibleRef),
	.prose-paragraph :global(sup.srcRef.docRef) {
		color: var(--color-muted);
	}
	.prose-paragraph :global(button.bible-inline) {
		color: inherit;
		background: transparent;
		border: 0;
		padding: 0;
		font: inherit;
		cursor: pointer;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.15em;
	}
	.prose-paragraph :global(button.bible-inline:hover) {
		text-decoration: underline solid var(--color-accent);
		text-decoration-thickness: 1px;
		color: var(--color-accent);
	}
</style>
