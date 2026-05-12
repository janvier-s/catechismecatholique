<script lang="ts">
	import PatPage from '$lib/components/patristique/PatPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const lede =
		"Prononcées vers 350 par saint Cyrille, évêque de Jérusalem, ces cinq catéchèses « mystagogiques » introduisent les nouveaux baptisés aux mystères qu'ils viennent de recevoir : les renonciations baptismales, l'immersion, la chrismation, l'Eucharistie et la liturgie complète. C'est l'un des plus anciens témoignages détaillés de la pratique sacramentelle de l'Église ancienne.";
</script>

<PatPage full={data.full} {lede} />
