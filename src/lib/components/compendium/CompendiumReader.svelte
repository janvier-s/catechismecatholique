<script lang="ts">
	import type { CompendiumPart } from '$lib/data/types';
	import ReadableUnit from '$lib/components/cec/ReadableUnit.svelte';
	import CitationBlock from '$lib/components/cec/CitationBlock.svelte';
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';

	let { part }: { part: CompendiumPart } = $props();
</script>

<main class="mx-auto max-w-reader px-6 max-md:px-0 py-10" use:scrollSpy>
	<header class="mb-8">
		<BreadcrumbRail
			crumbs={[
				{ href: '/compendium', title: 'Compendium' },
				part.number
					? { href: `/compendium/${part.slug}`, kicker: `Partie ${part.number}`, title: part.title }
					: { href: `/compendium/${part.slug}`, title: part.title }
			]}
		/>
		{#if part.number}
			<p class="font-ui text-sm uppercase tracking-wider text-muted">Partie {part.number}</p>
		{:else}
			<p class="font-ui text-sm uppercase tracking-wider text-muted">Annexe</p>
		{/if}
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{part.title}</h1>
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
				<h3 id={node.id} class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent">
					{node.title}
				</h3>
			{:else}
				<h4
					id={node.id}
					class="font-ui text-base font-semibold mt-8 mb-3 scroll-mt-24 uppercase tracking-wider text-muted"
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
