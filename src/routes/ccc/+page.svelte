<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Catéchisme de l'Église catholique</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-16">
	<h1 class="font-ui text-5xl font-bold mb-4">Catéchisme de l'Église catholique</h1>
	<p class="text-lg text-muted mb-12">Édition française complète, recherche par paragraphe, référence biblique et thème.</p>

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
