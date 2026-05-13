<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import CollectionPage from '$lib/components/ui/CollectionPage.svelte';
	import type { CollectionGroup } from '$lib/components/ui/CollectionPage.svelte';
	import YoutubePlaylist from '$lib/components/bon-pasteur/YoutubePlaylist.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const groups: CollectionGroup[] = [
		{
			items: [
				{
					slug: 'catechisme-adultes-ibp',
					href: null,
					image: '/img/bibliotheque/ibp-catechisme-adultes.webp',
					eyebrow: '32 leçons',
					title: 'Cours de catéchisme pour adultes',
					subtitle: 'Séminaire Saint-Vincent de Courtalin',
					blurb: `De l'existence de Dieu aux sacrements, de la morale aux vertus cardinales.`
				},
				{
					slug: 'dieu',
					href: '/bon-pasteur/dieu/ch-01',
					image: '/img/bibliotheque/ibp-dieu.webp',
					eyebrow: '13 chapitres',
					title: 'Dieu',
					subtitle: 'Doctrine de la foi',
					blurb: `Dieu, la Trinité, la Création, les anges, le Péché originel, le Rédempteur, Marie, l'Église, les Fins dernières.`
				},
				{
					slug: 'liturgie',
					href: null,
					image: '/img/bibliotheque/ibp-liturgie.webp',
					eyebrow: '10 chapitres',
					title: 'La Liturgie',
					subtitle: 'Abbé Marin Cottard',
					blurb:
						'Actes du culte, lieux sacrés, autel, vases et vêtements liturgiques, année liturgique.'
				}
			]
		}
	];
</script>

<MetaTags
	title="Institut du Bon Pasteur · Catéchèse"
	description="Trois cours de catéchèse de l'Institut du Bon Pasteur : catéchisme pour adultes, doctrine de la foi et liturgie catholique."
/>

<CollectionPage kicker="Institut du Bon Pasteur" title="Catéchèse" {groups}>
	{#snippet lede()}
		Trois cours de catéchèse dispensés par des prêtres de l'Institut du Bon Pasteur.
	{/snippet}

	{#snippet footer()}
		<YoutubePlaylist
			playlist={data.playlist}
			heading="Enseignements par des prêtres"
			channel={{ name: 'CREDO', href: 'https://www.youtube.com/@credo_off' }}
		/>
	{/snippet}
</CollectionPage>
