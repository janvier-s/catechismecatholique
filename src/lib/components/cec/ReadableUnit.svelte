<script lang="ts">
	import { get } from 'svelte/store';
	import type { Paragraph, CompendiumQuestion } from '$lib/data/types';
	import ParagraphRenderer from './ParagraphRenderer.svelte';
	import CitationBlock from './CitationBlock.svelte';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { prefs } from '$lib/stores/prefs';

	type Unit =
		| { kind: 'ccc-paragraph'; data: Paragraph }
		| { kind: 'compendium-question'; data: CompendiumQuestion };

	let { unit }: { unit: Unit } = $props();

	function onNumberClick() {
		// Compendium tab opens in Phase 2; for now, only CCC paragraphs open the study panel.
		if (unit.kind !== 'ccc-paragraph') return;
		const s = get(studyPanel);
		openPanel({ kind: 'paragraph', paragraph: unit.data.number }, s.activeTab ?? 'cross-refs');
	}

	const sideRefs = $derived.by(() => {
		if ($prefs.crossRefsLayout !== 'side') return null;
		if (unit.kind === 'ccc-paragraph') {
			return unit.data.cross_refs.length > 0
				? { label: 'Renvois', refs: [...new Set(unit.data.cross_refs)], hrefPrefix: '/cec/' }
				: null;
		}
		return unit.data.ccc_refs.length > 0
			? {
					label: 'Renvois CEC',
					refs: [...new Set(unit.data.ccc_refs.map(String))],
					hrefPrefix: '/cec/'
				}
			: null;
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
		<a
			href={numberHref}
			onclick={onNumberClick}
			class="number-col flex-none w-12 text-right pt-1 font-ui font-semibold text-accent tabular-nums hover:underline"
			aria-label={unit.kind === 'ccc-paragraph'
				? `Lien vers le paragraphe ${unit.data.number}`
				: `Question ${unit.data.number}`}
		>
			{unit.data.number}
		</a>
		<div class="content-col text-lg">
			{#if unit.kind === 'ccc-paragraph'}
				<ParagraphRenderer
					html={unit.data.text_html}
					bibleRefs={unit.data.magisterial_refs}
					paragraphNumber={unit.data.number}
				/>
				{#each unit.data.citations as cite, i (i)}
					<CitationBlock html={cite.text_html} />
				{/each}
				{#if unit.data.superseded_text_html}
					<div class="superseded-block">
						<p class="superseded-label">Rédaction antérieure (édition 1992)</p>
						<div class="superseded-text">{@html unit.data.superseded_text_html}</div>
					</div>
				{/if}
			{:else}
				<p class="compendium-question">{unit.data.question}</p>
				<div class="compendium-answer">{@html unit.data.answer_html}</div>
			{/if}
		</div>
		{#if sideRefs}
			<aside class="ccc-side-refs">
				<p class="label">{sideRefs.label}</p>
				<ul>
					{#each sideRefs.refs as n (n)}
						<li>
							<a href={`${sideRefs.hrefPrefix}${n}`} class="cross-ref-link">{n}</a>
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
		padding-right: 12rem;
	}
	.ccc-side-refs {
		position: absolute;
		top: 0.25rem;
		right: 0;
		width: 10rem;
		font-family: var(--font-ui);
		font-size: 0.75rem;
		line-height: 1.4;
		padding: 0.5rem 0.75rem;
		background: color-mix(in srgb, var(--color-fg) 4%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
		border-radius: 0.375rem;
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
		/* Use the lighter accent variant — accent-text is tuned per theme to
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
	   sit flush left under the body so nothing is left margin-orphaned. */
	@media (max-width: 640px) {
		.paragraph-grid {
			flex-direction: column;
			gap: 0.25rem;
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
</style>
