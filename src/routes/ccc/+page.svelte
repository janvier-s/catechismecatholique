<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Catéchisme de l'Église Catholique | Lire l'édition française complète</title>
	<meta
		name="description"
		content="Lisez le Catéchisme de l'Église Catholique en français : prologue, quatre parties, 2865 paragraphes. Recherche par mot-clé, référence biblique et thème."
	/>
</svelte:head>

<main class="mx-auto max-w-4xl px-6 py-10 md:py-16">
	<h1 class="font-heading text-[2.25rem] sm:text-5xl md:text-6xl font-semibold mb-3 md:mb-4 leading-[1.08]">
		Catéchisme de l'Église Catholique
	</h1>
	<p class="text-base md:text-lg text-muted mb-8 md:mb-12">
		Édition française complète, recherche par paragraphe, référence biblique et thème.
	</p>

	<div class="grid sm:grid-cols-2 gap-6">
		{#each data.parts as p (p.slug)}
			<a href="/ccc/{p.slug}" class="block p-6 border border-border rounded-lg hover:border-accent">
				<h2 class="font-ui text-xl font-semibold">{p.title}</h2>
			</a>
		{/each}
	</div>

	<p class="mt-12">
		<a href="/ccc/sommaire" class="text-accent hover:underline font-ui">Sommaire complet →</a>
	</p>
</main>
