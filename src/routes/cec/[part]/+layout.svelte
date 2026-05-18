<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let panoramaOpen = $state(false);

	// Panorama + PanoramaModal are dynamically imported on first open so
	// their CSS isn't preloaded on every chapter reader page (they only
	// surface when the breadcrumb trigger is clicked).
	type PanoramaModalComponent =
		(typeof import('$lib/components/ui/PanoramaModal.svelte'))['default'];
	type PanoramaComponent = (typeof import('$lib/components/ui/Panorama.svelte'))['default'];
	let PanoramaModal: PanoramaModalComponent | null = $state(null);
	let Panorama: PanoramaComponent | null = $state(null);

	async function openPanorama() {
		if (!PanoramaModal || !Panorama) {
			const [modalMod, panoramaMod] = await Promise.all([
				import('$lib/components/ui/PanoramaModal.svelte'),
				import('$lib/components/ui/Panorama.svelte')
			]);
			PanoramaModal = modalMod.default;
			Panorama = panoramaMod.default;
		}
		panoramaOpen = true;
	}

	// Expose an `open()` + the part title to descendants so any breadcrumb
	// can wire up its trigger button without re-mounting the modal or
	// re-fetching the part. The title flows through to the trigger's
	// hover tooltip so users know exactly which partie's panorama they'll
	// see before clicking.
	setContext('part-panorama', {
		open: openPanorama,
		// Getters so descendants always read the live partie data · without
		// them the value would be captured at first render and go stale
		// when the user navigates between parties.
		get partTitle() {
			return data.partTree.title;
		},
		get partNumber() {
			return data.partTree.number;
		},
		get isPrologue() {
			return Boolean(data.partTree.prologue);
		}
	});

	// Resolve the active node from the URL so the panorama can highlight
	// where the reader currently is. Path segments under /cec/<part>/...
	const segments = $derived(page.url.pathname.split('/').filter(Boolean));
	const active = $derived({
		part: (segments[1] ?? null) as string | null,
		section: (segments[2] ?? null) as string | null,
		chapter: (segments[3] ?? null) as string | null,
		article: (segments[4] ?? null) as string | null
	});
</script>

{@render children()}

{#if PanoramaModal && Panorama}
	<PanoramaModal bind:open={panoramaOpen} eyebrow="Panorama" title={data.partTree.title}>
		<Panorama parts={[data.partTree]} headingLevel={3} {active} />
	</PanoramaModal>
{/if}
