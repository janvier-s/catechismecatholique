<script lang="ts">
	import TrentReader from '$lib/components/trent/TrentReader.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const breadcrumbJsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Catéchisme de Trente',
					item: `${page.url.origin}/trente`
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: data.section.part_title,
					item: `${page.url.origin}/trente`
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: data.section.chapter_title,
					item: `${page.url.origin}/trent/${data.section.chapter_slug}`
				},
				{ '@type': 'ListItem', position: 4, name: data.section.title }
			]
		})
	);
	const breadcrumbJsonLdScript = $derived(
		`<${'script'} type="application/ld+json">${breadcrumbJsonLd}</${'script'}>`
	);
</script>

<svelte:head>
	<title>{data.section.title} · Catéchisme du Concile de Trente</title>
	<meta
		name="description"
		content={`${data.section.chapter_title} · Section ${data.section.ordinal} : ${data.section.title}. Catéchisme du Concile de Trente.`}
	/>
	{@html breadcrumbJsonLdScript}
</svelte:head>

<TrentReader section={data.section} />
