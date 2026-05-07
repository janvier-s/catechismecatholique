<script lang="ts">
	import CCCReader from '$lib/components/ccc/CCCReader.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const breadcrumbJsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Catéchisme', item: `${page.url.origin}/ccc` },
				{
					'@type': 'ListItem',
					position: 2,
					name: data.chapter.part_title,
					item: `${page.url.origin}/ccc/${data.chapter.part_slug}`
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: data.chapter.section_title,
					item: `${page.url.origin}/ccc/${data.chapter.part_slug}/${data.chapter.section_slug}`
				},
				{ '@type': 'ListItem', position: 4, name: data.chapter.title }
			]
		})
	);
	const breadcrumbJsonLdScript = $derived(
		`<${'script'} type="application/ld+json">${breadcrumbJsonLd}</${'script'}>`
	);
</script>

<svelte:head>
	<title>{data.chapter.title} · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content={`${data.chapter.number ? `Chapitre ${data.chapter.number} : ` : ''}${data.chapter.title} | ${data.chapter.section_title}. Catéchisme de l'Église Catholique.`}
	/>
	{@html breadcrumbJsonLdScript}
</svelte:head>

<CCCReader
	chapter={data.chapter}
	paragraphs={data.paragraphs}
	enBrefParagraphMap={data.enBrefParagraphMap}
/>
