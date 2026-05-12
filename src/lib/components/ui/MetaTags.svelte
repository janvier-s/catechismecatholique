<script lang="ts">
	import { page } from '$app/state';

	type BookSchema = {
		kind: 'book';
		name: string;
		author?: string;
		datePublished?: string; // YYYY or YYYY-MM-DD
		translator?: string;
		bookEdition?: string;
		about?: string;
	};
	type ArticleSchema = {
		kind: 'article';
		headline: string;
		datePublished?: string;
		isPartOf?: string; // parent book title
	};
	export type Schema = BookSchema | ArticleSchema;

	let {
		title,
		description,
		image,
		// Defaults true when title/description point at a single canonical
		// page so og:title and og:description align with the visible tab title.
		emitTitle = true,
		emitDescription = true,
		schema
	}: {
		title: string;
		description: string;
		image?: string; // absolute path under /, e.g. /img/bibliotheque/<slug>.webp
		emitTitle?: boolean;
		emitDescription?: boolean;
		schema?: Schema;
	} = $props();

	const origin = $derived(page.url.origin);
	const ogImage = $derived(image ? `${origin}${image}` : `${origin}/img/og-image.png`);

	const ld = $derived.by(() => {
		if (!schema) return null;
		if (schema.kind === 'book') {
			return {
				'@context': 'https://schema.org',
				'@type': 'Book',
				name: schema.name,
				inLanguage: 'fr',
				isAccessibleForFree: true,
				...(schema.author ? { author: { '@type': 'Person', name: schema.author } } : {}),
				...(schema.translator
					? { translator: { '@type': 'Person', name: schema.translator } }
					: {}),
				...(schema.datePublished ? { datePublished: schema.datePublished } : {}),
				...(schema.bookEdition ? { bookEdition: schema.bookEdition } : {}),
				...(schema.about ? { about: schema.about } : {}),
				...(image ? { image: ogImage } : {}),
				url: `${origin}${page.url.pathname}`
			};
		}
		return {
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: schema.headline,
			inLanguage: 'fr',
			isAccessibleForFree: true,
			...(schema.datePublished ? { datePublished: schema.datePublished } : {}),
			...(schema.isPartOf ? { isPartOf: { '@type': 'Book', name: schema.isPartOf } } : {}),
			...(image ? { image: ogImage } : {}),
			url: `${origin}${page.url.pathname}`
		};
	});
</script>

<svelte:head>
	{#if emitTitle}<title>{title}</title>{/if}
	{#if emitDescription}<meta name="description" content={description} />{/if}

	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content={image ? '800' : '1200'} />
	<meta property="og:image:height" content={image ? '800' : '630'} />
	<meta property="og:image:alt" content={title} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />

	{#if ld}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html `<` + `script type="application/ld+json">${JSON.stringify(ld)}<` + `/script>`}
	{/if}
</svelte:head>
