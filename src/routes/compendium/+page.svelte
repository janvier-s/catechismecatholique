<script lang="ts">
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Compendium · Catéchisme de l'Église catholique</title>
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<header class="mb-10">
		<p class="font-ui text-sm uppercase tracking-wider text-muted">Compendium</p>
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">
			Compendium du Catéchisme de l'Église catholique
		</h1>
		<p class="mt-4 text-lg leading-relaxed">
			Une présentation synthétique du Catéchisme en 598 questions et réponses, publiée par le
			Saint-Siège en 2005 sous le motu proprio de Benoît XVI.
		</p>
	</header>

	<section class="grid gap-4 md:grid-cols-2">
		{#each data.structure.parts as part (part.slug)}
			<NavCard
				direction="next"
				href={`/compendium/${part.slug}`}
				eyebrow={`Partie ${part.number}`}
				title={part.title}
			/>
		{/each}
		{#if data.structure.appendix}
			<NavCard
				direction="next"
				href={`/compendium/${data.structure.appendix.slug}`}
				eyebrow="Annexe"
				title={data.structure.appendix.title}
			/>
		{/if}
	</section>
</main>
