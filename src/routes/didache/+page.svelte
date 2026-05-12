<script lang="ts">
	import PatPage from '$lib/components/patristique/PatPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const lede =
		"Plus ancien document catéchétique de l'Église chrétienne, la Didachè (« Doctrine des douze Apôtres ») rassemble en seize courts chapitres l'enseignement moral, liturgique et disciplinaire transmis aux premiers fidèles : les deux voies, le baptême, la prière, l'Eucharistie, le ministère et le retour du Seigneur.";
</script>

<PatPage full={data.full} {lede} />
