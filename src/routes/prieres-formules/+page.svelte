<script lang="ts">
	import CompendiumReader from '$lib/components/compendium/CompendiumReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Prières & formules · Catéchisme de l'Église catholique</title>
	<meta
		name="description"
		content="Prières communes et formules de la doctrine catholique : Pater noster, Credo, Confiteor, Décalogue, vertus, dons du Saint-Esprit."
	/>
</svelte:head>

<CompendiumReader part={data.part} standalone />
