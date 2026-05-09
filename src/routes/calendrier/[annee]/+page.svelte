<script lang="ts">
	import CalendrierReader from '$lib/components/calendrier/CalendrierReader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.title} · Calendrier liturgique</title>
</svelte:head>

<CalendrierReader
	feasts={data.feasts}
	title={data.title}
	kicker={data.kicker}
	showSeasonGroups={data.mode === 'year'}
	showDates={data.mode === 'fixed'}
/>
