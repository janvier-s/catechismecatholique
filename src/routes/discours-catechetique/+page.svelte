<script lang="ts">
	import PatIndex from '$lib/components/patristique/PatIndex.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const lede =
		"Composé vers 385 par saint Grégoire de Nysse, l'un des trois Pères cappadociens, le Discours catéchétique (Oratio catechetica magna) expose en quarante chapitres la doctrine chrétienne : la Trinité, la création, l'Incarnation et la Rédemption, le baptême et l'Eucharistie. Manuel d'instruction destiné aux catéchistes, il est l'un des plus anciens traités systématiques de théologie.";
</script>

<PatIndex structure={data.structure} {lede} />
