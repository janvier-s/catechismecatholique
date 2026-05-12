<script lang="ts">
	import { get } from 'svelte/store';
	import type { Paragraph, CompendiumQuestion } from '$lib/data/types';
	import ParagraphRenderer from './ParagraphRenderer.svelte';
	import CitationBlock from './CitationBlock.svelte';
	import { studyPanel, openPanel, closePanel } from '$lib/stores/studyPanel';
	import { prefs } from '$lib/stores/prefs';
	import { linkifyCompendiumBibleRefs } from '$lib/utils/linkifyRefs';

	type Unit =
		| { kind: 'ccc-paragraph'; data: Paragraph }
		| { kind: 'compendium-question'; data: CompendiumQuestion };

	let { unit }: { unit: Unit } = $props();

	function onNumberClick(e: MouseEvent) {
		// Cmd/Ctrl/Shift/middle-click: let the browser handle it (open in new tab,
		// new window, etc.) · no panel. <button> doesn't navigate by default, but
		// the guard is kept for symmetry / safety if the handler is reused on an
		// <a> element.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
		if (unit.kind !== 'ccc-paragraph') return;
		e.preventDefault();
		const s = get(studyPanel);
		// Toggle: clicking the number again while the panel is already open for
		// this paragraph closes it.
		if (s.open && s.context?.kind === 'paragraph' && s.context.paragraph === unit.data.number) {
			closePanel();
			return;
		}
		openPanel({ kind: 'paragraph', paragraph: unit.data.number }, s.activeTab ?? 'cross-refs');
	}

	// Group consecutive integers into compact range strings: [1,2,3,5,7,8] →
	// ["1-3", "5", "7-8"]. The /cec/[ref=cecref] route accepts both forms.
	function compactRanges(numbers: number[]): string[] {
		const sorted = [...new Set(numbers)].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
		const out: string[] = [];
		let i = 0;
		while (i < sorted.length) {
			let j = i;
			while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
			out.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`);
			i = j + 1;
		}
		return out;
	}

	// CCC paragraphs surface cross-refs inline (sup markers in the text) when in
	// 'inline' mode, so the aside is gated on the 'side' layout preference. The
	// Compendium answer is plain prose with no inline marker mechanism, so its
	// refs are always rendered · the aside gracefully falls back to a static
	// block below the answer when the user is in 'inline' mode.
	const sideRefs = $derived.by(() => {
		if (unit.kind === 'ccc-paragraph') {
			if ($prefs.crossRefsLayout !== 'side') return null;
			if (unit.data.cross_refs.length === 0) return null;
			const nums = unit.data.cross_refs
				.map((r) => parseInt(r, 10))
				.filter((n) => Number.isFinite(n));
			return { label: 'Renvois', refs: compactRanges(nums), hrefPrefix: '/cec/' };
		}
		if (unit.data.ccc_refs.length === 0) return null;
		return {
			label: 'CEC',
			refs: compactRanges(unit.data.ccc_refs),
			hrefPrefix: '/cec/'
		};
	});

	const numberHref = $derived(
		unit.kind === 'ccc-paragraph' ? `/cec/${unit.data.number}` : `#q-${unit.data.number}`
	);
	const anchorId = $derived(
		unit.kind === 'compendium-question' ? `q-${unit.data.number}` : undefined
	);
</script>

<article class="mb-8 ccc-paragraph" class:has-side-refs={sideRefs !== null} id={anchorId}>
	<div class="paragraph-grid">
		<div class="number-wrap flex-none w-12 flex items-start justify-end">
			{#if unit.kind === 'ccc-paragraph'}
				<span class="number-stack">
					<a
						href={numberHref}
						class="number-link"
						title={`Ouvrir §${unit.data.number} dans sa propre page`}
						aria-label={`Voir le paragraphe ${unit.data.number} dans une page dédiée`}
					>
						<svg class="link-icon" viewBox="0 0 256 256" aria-hidden="true">
							<path
								d="M137.54,186.36a8,8,0,0,1,0,11.31l-9.94,10A56,56,0,0,1,48.38,128.4L72.5,104.28A56,56,0,0,1,149.31,102a8,8,0,1,1-10.64,12,40,40,0,0,0-54.85,1.63L59.7,139.72a40,40,0,0,0,56.57,56.56l9.94-9.94A8,8,0,0,1,137.54,186.36Zm70.08-138a56.08,56.08,0,0,0-79.22,0l-9.94,9.95a8,8,0,0,0,11.32,11.31l9.94-9.94a40,40,0,0,1,56.56,56.56L172.16,140.4A40,40,0,0,1,117.31,142,8,8,0,1,0,106.67,154a56,56,0,0,0,76.81-2.26l24.12-24.12A56.08,56.08,0,0,0,207.62,48.38Z"
							/>
						</svg>
					</a>
					<button
						type="button"
						class="number-col font-ui font-semibold text-accent tabular-nums hover:underline"
						onclick={onNumberClick}
						title={`Ouvrir le panneau d'étude · §${unit.data.number}`}
						aria-label={`Ouvrir le panneau d'étude pour le paragraphe ${unit.data.number}`}
					>
						{unit.data.number}
					</button>
				</span>
			{:else}
				<a
					href={numberHref}
					class="number-col font-ui font-semibold text-accent tabular-nums hover:underline"
					aria-label={`Question ${unit.data.number}`}
				>
					{unit.data.number}
				</a>
			{/if}
		</div>
		<div class="content-col text-lg">
			{#if unit.kind === 'ccc-paragraph'}
				<ParagraphRenderer
					html={unit.data.text_html}
					bibleRefs={unit.data.magisterial_refs}
					paragraphNumber={unit.data.number}
				/>
				{#each unit.data.citations as cite, i (i)}
					<CitationBlock>
						<ParagraphRenderer
							html={cite.text_html}
							bibleRefs={unit.data.magisterial_refs}
							paragraphNumber={unit.data.number}
						/>
					</CitationBlock>
				{/each}
				{#if unit.data.superseded_text_html}
					<div class="superseded-block">
						<p class="superseded-label">Rédaction antérieure (édition 1992)</p>
						<div class="superseded-text">{@html unit.data.superseded_text_html}</div>
					</div>
				{/if}
			{:else}
				<p class="compendium-question">{unit.data.question}</p>
				<div class="compendium-answer">
					{@html linkifyCompendiumBibleRefs(unit.data.answer_html)}
				</div>
			{/if}
		</div>
		{#if sideRefs}
			<aside class="ccc-side-refs">
				<p class="label">{sideRefs.label}</p>
				<ul>
					{#each sideRefs.refs as n (n)}
						<li>
							<a
								href={`${sideRefs.hrefPrefix}${n}`}
								class="cross-ref-link"
								data-cec={n.includes('-') ? undefined : n}>{n}</a
							>
						</li>
					{/each}
				</ul>
			</aside>
		{/if}
	</div>
</article>

<style>
	.paragraph-grid {
		display: flex;
		gap: 1rem;
	}
	.content-col {
		flex: 1;
		min-width: 0;
	}
	/* Most CCC paragraphs render as a single <span>; a few (e.g. §2267 patched
	   to the 2018 Vatican revision) contain multiple <p> blocks. Tailwind's
	   preflight zeroes <p> margins, so restore vertical spacing here. Scoped
	   to .prose-paragraph (ParagraphRenderer's container) so superseded-block
	   labels and other in-content <p>s aren't affected. */
	.content-col :global(.prose-paragraph p) {
		margin-bottom: 0.85em;
	}
	.content-col :global(.prose-paragraph p:last-child) {
		margin-bottom: 0;
	}
	/* En-marge: keep the prose column at its natural width and reserve the
	   right gutter for refs. The padding applies to *every* paragraph in
	   side-mode (not just those with refs) so the text column width is
	   consistent regardless of which paragraphs have cross-refs. The aside
	   itself only renders when there are refs to show. */
	:global(html[data-cross-refs-layout='side']) .ccc-paragraph {
		position: relative;
		padding-right: 6rem;
	}
	/* Default placement: static block below the answer (used by Compendium
	   questions in 'inline' mode, since they have no inline marker
	   mechanism). The 'side' selector below pulls it into the right gutter. */
	.ccc-side-refs {
		margin-top: 0.5rem;
		margin-left: 4rem;
		font-family: var(--font-ui);
		font-size: 0.75rem;
		line-height: 1.4;
		padding: 0.5rem 0.75rem;
		background: color-mix(in srgb, var(--color-fg) 4%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
		border-radius: 0.375rem;
	}
	@media (min-width: 901px) {
		:global(html[data-cross-refs-layout='side']) .ccc-side-refs {
			position: absolute;
			top: 0.25rem;
			right: 0;
			width: 5rem;
			margin-top: 0;
			margin-left: 0;
		}
	}
	.ccc-side-refs .label {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-weight: 600;
		color: var(--color-muted);
		margin-bottom: 0.25rem;
	}
	.ccc-side-refs ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.5rem;
	}
	.ccc-side-refs .cross-ref-link {
		/* Use the lighter accent variant · accent-text is tuned per theme to
		   reach AA against the page background, while plain accent is tuned
		   to be a bg colour with white text. */
		color: var(--color-accent-text);
		font-weight: 500;
		white-space: nowrap;
	}
	.ccc-side-refs .cross-ref-link:hover {
		text-decoration: underline;
	}

	.superseded-block {
		margin-top: 1.5rem;
		padding: 0.875rem 1rem;
		border-left: 3px solid color-mix(in srgb, var(--color-fg) 15%, transparent);
		background: color-mix(in srgb, var(--color-fg) 3%, transparent);
		border-radius: 0 0.25rem 0.25rem 0;
	}
	.superseded-label {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin-bottom: 0.5rem;
	}
	.superseded-text {
		font-size: 0.875rem;
		color: var(--color-muted);
		line-height: 1.7;
	}
	.superseded-text :global(span),
	.superseded-text :global(p) {
		display: block;
		margin-bottom: 0.5rem;
	}
	.superseded-text :global(span:last-child),
	.superseded-text :global(p:last-child) {
		margin-bottom: 0;
	}

	/* On medium-small screens, stack the refs box below the paragraph. */
	@media (max-width: 900px) {
		:global(html[data-cross-refs-layout='side']) .ccc-paragraph {
			padding-right: 0;
		}
		.ccc-side-refs {
			position: static;
			width: auto;
			margin-top: 0.5rem;
			margin-left: 4rem;
		}
	}

	/* Phone: number rides above the text instead of beside it; cross-refs
	   sit flush left under the body so nothing is left margin-orphaned.
	   Hide the permalink icon on mobile (irrelevant) and left-align the
	   number with the prose. */
	@media (max-width: 640px) {
		.paragraph-grid {
			flex-direction: column;
			gap: 0.25rem;
		}
		.paragraph-grid :global(.number-wrap) {
			width: auto;
			justify-content: flex-start;
			padding-top: 0;
		}
		.paragraph-grid :global(.number-link) {
			display: none;
		}
		.paragraph-grid :global(.number-col) {
			width: auto;
			text-align: left;
			padding-top: 0;
		}
		.content-col {
			font-size: 1rem;
			line-height: 1.6;
		}
		.ccc-side-refs {
			margin-left: 0;
		}
		:global(html[data-cross-refs-layout='side']) .ccc-paragraph {
			padding-right: 0;
		}
	}

	.compendium-question {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 600;
		font-size: 1.05em;
		margin-bottom: 0.6rem;
		color: var(--color-heading);
	}
	.compendium-answer :global(p) {
		margin-bottom: 0.85em;
	}
	.compendium-answer :global(p:last-child) {
		margin-bottom: 0;
	}
	.compendium-answer :global(a.compendium-bible-ref) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.15em;
		transition: color 120ms ease;
	}
	.compendium-answer :global(a.compendium-bible-ref:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
		text-decoration-thickness: 1px;
	}

	/* Link icon: hidden by default, revealed when the number column is hovered.
	   Anchored to the LEFT edge of the visible digit (not the wrap), so the
	   gap stays constant whether the number is "1" or "2865". */
	.number-wrap {
		align-self: flex-start;
	}
	.number-stack {
		position: relative;
		display: inline-block;
		margin-right: 10px;
	}
	.number-link {
		position: absolute;
		right: 100%;
		top: 0;
		margin-right: 4px;
		opacity: 0;
		transition: opacity 120ms ease;
		color: var(--color-muted);
		display: flex;
		align-items: center;
	}
	.number-wrap:hover .number-link,
	.number-link:focus-visible {
		opacity: 1;
	}
	.number-link:hover,
	.number-link:focus-visible {
		color: var(--color-accent);
	}
	.link-icon {
		width: 1em;
		height: 1em;
		fill: currentColor;
		margin-top: 2px;
	}
</style>
