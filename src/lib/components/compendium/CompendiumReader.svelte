<script lang="ts">
	import type { CompendiumPart } from '$lib/data/types';
	import ReadableUnit from '$lib/components/ccc/ReadableUnit.svelte';
	import CitationBlock from '$lib/components/ccc/CitationBlock.svelte';
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';

	let { part }: { part: CompendiumPart } = $props();
</script>

<main class="mx-auto max-w-reader px-6 max-md:px-0 py-10" use:scrollSpy>
	<header class="mb-8">
		<BreadcrumbRail
			crumbs={[
				{ href: '/compendium', title: 'Compendium' },
				{ href: `/compendium/${part.slug}`, kicker: `Partie ${part.number}`, title: part.title }
			]}
		/>
		<p class="font-ui text-sm uppercase tracking-wider text-muted">Partie {part.number}</p>
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{part.title}</h1>
	</header>

	{#each part.flow as node, i (i)}
		{#if node.kind === 'heading'}
			{#if node.level === 2}
				<h2
					id={node.id}
					class="font-heading text-3xl font-semibold mt-16 mb-6 pb-2 border-b border-border scroll-mt-24 text-heading"
				>{node.title}</h2>
			{:else}
				<h3
					id={node.id}
					class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent"
				>{node.title}</h3>
			{/if}
		{:else if node.kind === 'epigraph'}
			<CitationBlock html={`<em>${node.text}</em>${node.attribution ? ` — <span class='attrib'>${node.attribution}</span>` : ''}`} />
		{:else if node.kind === 'prose'}
			<div class="compendium-prose mb-6">{@html node.html}</div>
		{:else}
			<ReadableUnit unit={{ kind: 'compendium-question', data: node.data }} />
		{/if}
	{/each}
</main>
