<script lang="ts">
	import type { CompendiumPart } from '$lib/data/types';
	import ReadableUnit from '$lib/components/cec/ReadableUnit.svelte';
	import CitationBlock from '$lib/components/cec/CitationBlock.svelte';
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';

	// `standalone` is true when this part is rendered at its own top-level
	// route (e.g. /prieres-formules) rather than under /compendium/[part].
	// In that case we drop the "Compendium >" parent crumb and use a tailored
	// eyebrow + title.
	let { part, standalone = false }: { part: CompendiumPart; standalone?: boolean } = $props();

	const headerTitle = $derived(standalone ? 'Prières & formules' : part.title);
	const headerEyebrow = $derived(
		standalone ? 'Annexe' : part.number ? `Partie ${part.number}` : 'Annexe'
	);
</script>

<main class="mx-auto max-w-reader px-6 max-md:px-0 py-10" use:scrollSpy>
	<header class="mb-8">
		{#if standalone}
			<BreadcrumbRail crumbs={[{ href: '/prieres-formules', title: headerTitle }]} />
		{:else}
			<BreadcrumbRail
				crumbs={[
					{ href: '/compendium', title: 'Compendium' },
					part.number
						? {
								href: `/compendium/${part.slug}`,
								kicker: `Partie ${part.number}`,
								title: part.title
							}
						: { href: `/compendium/${part.slug}`, title: part.title }
				]}
			/>
		{/if}
		<p class="font-ui text-sm uppercase tracking-wider text-muted">{headerEyebrow}</p>
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{headerTitle}</h1>
	</header>

	{#each part.flow as node, i (i)}
		{#if node.kind === 'heading'}
			{#if node.level === 2}
				<h2
					id={node.id}
					class="font-heading text-3xl font-semibold mt-16 mb-6 pb-2 border-b border-border scroll-mt-24 text-heading"
				>
					{node.title}
				</h2>
			{:else if node.level === 3}
				<div class="mt-12 mb-4 scroll-mt-24" id={node.id}>
					{#if node.kicker}
						<p class="font-ui text-[11px] uppercase tracking-[0.18em] text-muted mb-1">
							{node.kicker}
						</p>
					{/if}
					<h3 class="font-ui text-xl font-semibold text-accent">{node.title}</h3>
				</div>
			{:else}
				<h4
					id={node.id}
					class="font-ui text-xs font-semibold mt-8 mb-3 scroll-mt-24 uppercase tracking-[0.18em] text-muted"
				>
					{node.title}
				</h4>
			{/if}
		{:else if node.kind === 'epigraph'}
			<div class="epigraph-wrap">
				<CitationBlock
					html={`<em>${node.text}</em>${node.attribution ? ` — <span class='attrib'>${node.attribution}</span>` : ''}`}
				/>
			</div>
		{:else if node.kind === 'prose'}
			<div class="compendium-prose mb-6">{@html node.html}</div>
		{:else}
			<ReadableUnit unit={{ kind: 'compendium-question', data: node.data }} />
		{/if}
	{/each}
</main>

<style>
	/* Align epigraph quote with the question/answer text column rather than
	   the number gutter. The number col is w-12 (3rem) + a 1rem gap = 4rem
	   left offset; on mobile the layout stacks so the offset collapses. */
	.epigraph-wrap {
		padding-left: 4rem;
	}
	@media (max-width: 640px) {
		.epigraph-wrap {
			padding-left: 0;
		}
	}
</style>
