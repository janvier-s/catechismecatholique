<script lang="ts">
	import type { PageData } from './$types';
	import FeastBlock from '$lib/components/calendrier/FeastBlock.svelte';

	let { data }: { data: PageData } = $props();

	const description = $derived(
		`Les paragraphes du Catéchisme de l'Église catholique à méditer avec les lectures de la messe pour ${data.feast.title}.`
	);
</script>

<svelte:head>
	<title>{data.feast.title} · Calendrier liturgique · Catéchisme</title>
	<meta name="description" content={description} />
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10 max-md:px-4">
	<a href="/calendrier-liturgique" class="back-link">
		<span aria-hidden="true">←</span>
		<span>Retour au calendrier liturgique</span>
	</a>
	<FeastBlock feast={data.feast} isProper />
</main>

<style>
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 1.5rem;
		font-family: var(--font-ui);
		font-size: 0.85rem;
		color: var(--color-muted);
		text-decoration: none;
	}
	.back-link:hover {
		color: var(--color-accent);
	}
</style>
