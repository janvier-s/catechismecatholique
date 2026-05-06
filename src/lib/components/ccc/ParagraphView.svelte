<script lang="ts">
	import { get } from 'svelte/store';
	import type { Paragraph } from '$lib/data/types';
	import ParagraphRenderer from './ParagraphRenderer.svelte';
	import CitationBlock from './CitationBlock.svelte';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { prefs } from '$lib/stores/prefs';
	let { paragraph }: { paragraph: Paragraph } = $props();

	function onNumberClick() {
		const s = get(studyPanel);
		openPanel({ kind: 'paragraph', paragraph: paragraph.number }, s.activeTab ?? 'cross-refs');
	}

	const showSideRefs = $derived(
		$prefs.crossRefsLayout === 'side' && paragraph.cross_refs.length > 0
	);
</script>

<article class="mb-8 ccc-paragraph" class:has-side-refs={showSideRefs}>
	<div class="paragraph-grid">
		<a
			href="/ccc/{paragraph.number}"
			onclick={onNumberClick}
			class="number-col flex-none w-12 text-right pt-1 font-ui font-semibold text-accent tabular-nums hover:underline"
			aria-label="Lien vers le paragraphe {paragraph.number}"
		>
			{paragraph.number}
		</a>
		<div class="content-col text-lg">
			<ParagraphRenderer
				html={paragraph.text_html}
				bibleRefs={paragraph.magisterial_refs}
				paragraphNumber={paragraph.number}
			/>
			{#each paragraph.citations as cite, i (i)}
				<CitationBlock html={cite.text_html} />
			{/each}
			{#if paragraph.superseded_text_html}
				<div class="superseded-block">
					<p class="superseded-label">Rédaction antérieure (édition 1992)</p>
					<div class="superseded-text">
						{@html paragraph.superseded_text_html}
					</div>
				</div>
			{/if}
		</div>
		{#if showSideRefs}
			<aside class="ccc-side-refs">
				<p class="label">Renvois</p>
				<ul>
					{#each paragraph.cross_refs as n (n)}
						<li>
							<a href="/ccc/{n}" class="cross-ref-link">§&nbsp;{n}</a>
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
		color: var(--color-accent);
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
		color: color-mix(in srgb, var(--color-fg) 55%, transparent);
		line-height: 1.7;
	}
	.superseded-text :global(span) {
		display: block;
		margin-bottom: 0.5rem;
	}
	.superseded-text :global(span:last-child) {
		margin-bottom: 0;
	}

	/* On small screens, stack the refs box below the paragraph. Phase 4 will
	   revisit mobile layout. */
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
</style>
