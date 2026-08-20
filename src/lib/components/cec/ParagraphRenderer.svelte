<script lang="ts">
	import type { MagisterialRefRecord } from '$lib/data/types';
	import { openPanel } from '$lib/stores/studyPanel';
	import { prefs } from '$lib/stores/prefs';
	import { goto } from '$app/navigation';
	import { bibleRefUrl } from '$lib/utils/linkifyRefs';
	import { frenchPunct } from '$lib/utils/typography';
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
		const url = bibleRefUrl(raw);
		if (url) {
			const m = url.match(/^\/bible\/([^/]+)\/(\d+)(?:\/(\d+))?/);
			if (m) {
				btn.dataset.slug = m[1]!;
				btn.dataset.chapter = m[2]!;
				if (m[3]) btn.dataset.verse = m[3];
			}
		}
		frag.appendChild(btn);
		return frag;
	}

	$effect(() => {
		if (!containerEl) return;
		// Re-run when these prefs change so the rendering tracks them.
		const inlineAsMarkers = $prefs.inlineAsMarkers;
		const sideRefs = $prefs.crossRefsLayout === 'side' && !inPanel;
		// Reset to the source HTML each pass so transformations are idempotent
		// · toggling a pref re-applies the right rules from scratch instead of
		// compounding on already-mutated DOM (which would corrupt the markup
		// the second time the effect runs).
		// eslint-disable-next-line svelte/no-dom-manipulating
		containerEl.innerHTML = frenchPunct(html);
		void bibleRefs;

		// Plain Map is fine here · refsByIdx is local to this $effect, never reactive.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const refsByIdx = new Map<string, MagisterialRefRecord>();
		for (const r of bibleRefs) {
			if (r.idx !== undefined && r.idx !== null) refsByIdx.set(String(r.idx), r);
		}

		// Pass 0: bibRef anchors · these appear in some paragraphs as
		// <a class="bibRef">Sg 13:5</a> directly in the prose, with no href or
		// data attributes set by the data pipeline. Resolve the URL here so
		// they navigate correctly and pick up the hover tooltip.
		for (const a of containerEl.querySelectorAll<HTMLAnchorElement>('a.bibRef')) {
			const raw = a.textContent?.trim() ?? '';
			const url = bibleRefUrl(raw);
			if (!url) continue;
			a.href = url;
			const m = url.match(/^\/bible\/([^/]+)\/(\d+)(?:\/(\d+))?/);
			if (m) {
				a.dataset.slug = m[1]!;
				a.dataset.chapter = m[2]!;
				if (m[3]) a.dataset.verse = m[3];
			}
			// Match to magisterial_refs by raw content to get idx for panel scroll
			for (const [idxStr, ref] of refsByIdx) {
				if (ref.raw === raw) {
					a.dataset.idx = idxStr;
					break;
				}
			}
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
		// from cccRef text, drop cross-refs entirely when the side-margin
		// layout is on, and make every clickable sup keyboard-reachable so
		// the panel can be opened without a pointer (WCAG 2.1.1).
		const remaining = Array.from(containerEl.querySelectorAll<HTMLElement>('sup.srcRef'));
		for (const sup of remaining) {
			if (sup.classList.contains('cccRef')) {
				if (sideRefs) {
					sup.remove();
					continue;
				}
				const numMatch = (sup.textContent ?? '').match(/(\d+)/);
				if (numMatch) {
					sup.dataset.href = `/cec/${numMatch[1]}`;
					sup.dataset.cec = numMatch[1];
				}
				sup.textContent = (sup.textContent ?? '').replace(/^§/, '');
			}
			if (sup.classList.contains('bibleRef')) {
				const idx = sup.getAttribute('data-idx') ?? '';
				const ref = refsByIdx.get(idx);
				if (ref?.raw) {
					const url = bibleRefUrl(ref.raw);
					if (url) {
						sup.dataset.href = url;
						const m = url.match(/^\/bible\/([^/]+)\/(\d+)(?:\/(\d+))?/);
						if (m) {
							sup.dataset.slug = m[1]!;
							sup.dataset.chapter = m[2]!;
							if (m[3]) sup.dataset.verse = m[3];
						}
					}
				}
			}
			// All sup.srcRef variants (cccRef / bibleRef / docRef) are clickable.
			// Tag them as buttons for AT and accept Enter/Space · actual click
			// dispatch is handled by the container delegate further below.
			sup.setAttribute('tabindex', '0');
			sup.setAttribute('role', 'button');
			if (!sup.getAttribute('aria-label')) {
				const label = sup.classList.contains('cccRef')
					? `Voir le paragraphe ${sup.textContent?.trim() ?? ''}`
					: sup.classList.contains('bibleRef')
						? `Voir la référence biblique`
						: `Voir la source`;
				sup.setAttribute('aria-label', label);
			}
		}

		// Pass 3: wrap each marker (sup or inline button) along with its
		// leading whitespace / comma separator, so hiding the marker via the
		// reading prefs also hides the separator. Without this, toggling
		// "hide cross-refs" leaves dangling commas and spaces (notably the
		// space before the next "." that follows a removed marker).
		// For inline bible-ref buttons we also pull any IMMEDIATELY-following
		// punctuation (period, comma, etc.) into the wrap. Otherwise the
		// browser may break between the inline-block button and the trailing
		// "." · leaving a period orphaned at the start of the next line.
		// (Buttons are always atomic inline-block per UA stylesheet, so a CSS
		// `display: inline` override is ineffective in practice.)
		const markers = containerEl.querySelectorAll<HTMLElement>('sup.srcRef, button.bible-inline');
		for (const marker of markers) {
			if (marker.parentElement?.classList.contains('ref-wrap')) continue;
			const wrap = document.createElement('span');
			wrap.className = 'ref-wrap';
			const isInlineBible = marker.tagName !== 'SUP';
			if (marker.tagName === 'SUP') {
				if (marker.classList.contains('cccRef')) wrap.classList.add('ref-cccRef');
				else if (marker.classList.contains('bibleRef')) wrap.classList.add('ref-bibleRef');
				else if (marker.classList.contains('docRef')) wrap.classList.add('ref-docRef');
			} else {
				wrap.classList.add('ref-bible-inline');
			}
			// For sup markers, pull the leading whitespace/comma into the wrap
			// so toggling visibility cleanly removes the separator. For inline
			// bible buttons we leave the leading whitespace OUTSIDE: the wrap
			// gets white-space: nowrap (see app.css) to glue trailing
			// punctuation to the button, and a leading space inside a nowrap
			// span would lose its wrap-opportunity, causing overflow.
			if (!isInlineBible) {
				const prevNode = marker.previousSibling;
				if (prevNode instanceof Text) {
					const txt = prevNode.nodeValue ?? '';
					const sep = txt.match(/[\s,]+$/);
					if (sep) {
						prevNode.nodeValue = txt.slice(0, -sep[0].length);
						wrap.appendChild(document.createTextNode(sep[0]));
					}
				}
			}
			marker.parentNode!.insertBefore(wrap, marker);
			wrap.appendChild(marker);
			// Glue trailing punctuation to inline bible refs. The next sibling
			// is a text node like ". La plus grave..." · peel the leading
			// punctuation run into the wrap so the period can't break to its
			// own line. Buttons render as atomic inline-block per UA stylesheet
			// (CSS display: inline doesn't actually take effect on <button>),
			// which creates a wrap opportunity right after the closing paren.
			if (isInlineBible) {
				const nextNode = wrap.nextSibling;
				if (nextNode instanceof Text) {
					const txt = nextNode.nodeValue ?? '';
					const m = txt.match(/^[.,;:!?»)\]]+/);
					if (m) {
						nextNode.nodeValue = txt.slice(m[0].length);
						wrap.appendChild(document.createTextNode(m[0]));
					}
				}
			}
		}

		// Click handler · DR study-mode pattern: clicking ANY marker on a
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

			const bibRef = e.target.closest<HTMLAnchorElement>('a.bibRef');
			if (bibRef) {
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
				e.preventDefault();
				const idxAttr = bibRef.dataset.idx ?? '';
				const idx = parseInt(idxAttr, 10);
				openPanel(
					{
						kind: 'paragraph',
						paragraph: paragraphNumber,
						...(Number.isFinite(idx) ? { bibleRefIdx: idx } : {})
					},
					'bible'
				);
				return;
			}

			const inline = e.target.closest<HTMLButtonElement>('button.bible-inline');
			if (inline) {
				e.preventDefault();
				const idxAttr = inline.dataset.idx ?? '';
				const idx = parseInt(idxAttr, 10);
				openPanel(
					{
						kind: 'paragraph',
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

			// Ctrl/Cmd/middle-click: follow the direct navigation href if available.
			if ((e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) && sup.dataset.href) {
				window.open(sup.dataset.href, '_blank');
				return;
			}

			if (inPanel && sup.classList.contains('cccRef')) {
				const m = (sup.textContent ?? '').match(/(\d+)/);
				const target = m ? parseInt(m[1]!, 10) : NaN;
				if (Number.isFinite(target)) {
					void goto(`/cec/${target}`);
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
					kind: 'paragraph',
					paragraph: paragraphNumber,
					...(isBible && Number.isFinite(idx) ? { bibleRefIdx: idx } : {})
				},
				tab
			);
		};
		const onKeydown = (e: KeyboardEvent) => {
			if (e.key !== 'Enter' && e.key !== ' ') return;
			if (!(e.target instanceof Element)) return;
			if (e.target.closest('sup.srcRef, button.bible-inline')) {
				e.preventDefault();
				(e.target as HTMLElement).click();
			}
		};
		containerEl.addEventListener('click', onClick);
		containerEl.addEventListener('keydown', onKeydown);
		return () => {
			containerEl?.removeEventListener('click', onClick);
			containerEl?.removeEventListener('keydown', onKeydown);
		};
	});
</script>

<div
	bind:this={containerEl}
	class="prose-paragraph leading-relaxed"
	data-paragraph
	data-in-panel={inPanel ? 'true' : undefined}
>
	{@html html}
</div>

<style>
	.prose-paragraph :global(sup.srcRef) {
		font-family: var(--font-ui);
		font-weight: 500;
		font-style: normal;
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
	.prose-paragraph :global(a.bibRef) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.15em;
		transition: color 120ms ease;
	}
	.prose-paragraph :global(a.bibRef:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
		text-decoration-thickness: 1px;
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
	/* All clickable in-prose markers tint to accent on hover so the reader
	   feels they're interactive. Cursor is already pointer via the role/sup. */
	.prose-paragraph :global(sup.srcRef),
	.prose-paragraph :global(button.bible-inline) {
		cursor: pointer;
		transition: color 120ms ease;
	}
	.prose-paragraph :global(sup.srcRef:hover),
	.prose-paragraph :global(button.bible-inline:hover) {
		color: var(--color-accent);
	}
	.prose-paragraph :global(sup.srcRef:focus-visible),
	.prose-paragraph :global(button.bible-inline:focus-visible) {
		color: var(--color-accent);
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: 2px;
	}
</style>
