<script lang="ts">
	import PatReader from '$lib/components/patristique/PatReader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<PatReader structure={data.structure} chapter={data.chapter} />
