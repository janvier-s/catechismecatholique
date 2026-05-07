<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import Panorama from '$lib/components/ui/Panorama.svelte';
	import PanoramaModal from '$lib/components/ui/PanoramaModal.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let panoramaOpen = $state(false);

	// Expose an `open()` + the part title to descendants so any breadcrumb
	// can wire up its trigger button without re-mounting the modal or
	// re-fetching the part. The title flows through to the trigger's
	// hover tooltip so users know exactly which partie's panorama they'll
	// see before clicking.
	setContext('part-panorama', {
		open: () => (panoramaOpen = true),
		partTitle: data.partTree.title
	});

	// Resolve the active node from the URL so the panorama can highlight
	// where the reader currently is. Path segments under /ccc/<part>/...
	const segments = $derived(page.url.pathname.split('/').filter(Boolean));
	const active = $derived({
		part: (segments[1] ?? null) as string | null,
		section: (segments[2] ?? null) as string | null,
		chapter: (segments[3] ?? null) as string | null,
		article: (segments[4] ?? null) as string | null
	});
</script>

{@render children()}

<PanoramaModal bind:open={panoramaOpen} eyebrow="Panorama" title={data.partTree.title}>
	<Panorama parts={[data.partTree]} headingLevel={3} {active} />
</PanoramaModal>
