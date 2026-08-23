<script lang="ts">
	import ReadableUnit from '$lib/components/cec/ReadableUnit.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { SvelteMap } from 'svelte/reactivity';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type IntroHeading = NonNullable<typeof data.part.intro_headings>[number];
	const headingByPara = $derived.by(() => {
		const m = new SvelteMap<number, IntroHeading>();
		for (const h of data.part.intro_headings ?? []) m.set(h.paragraph_start, h);
		return m;
	});
</script>

<svelte:head>
	<title>{data.part.title} · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content={data.part.number
			? `Partie ${data.part.number} : ${data.part.title}. ${data.part.sections.length} section${data.part.sections.length > 1 ? 's' : ''} | Catéchisme de l'Église Catholique.`
			: `${data.part.title} · Catéchisme de l'Église Catholique.`}
	/>
</svelte:head>

<main class="mx-auto max-w-reader px-6 max-md:px-4 py-10" use:scrollSpy>
	<nav class="breadcrumb-rail font-ui text-sm mb-6" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li>
				<a href="/cec" class="text-muted hover:text-accent">Catéchisme</a>
			</li>
			<li class="pl-5">
				{#if data.part.number}
					<span class="font-semibold bc-kicker">Partie {data.part.number}</span>
					<span class="bc-title">&nbsp;: {data.part.title}</span>
				{:else}
					<span class="font-semibold bc-kicker">{data.part.title}</span>
				{/if}
			</li>
		</ol>
	</nav>

	{#if data.part.number}
		<p class="font-ui text-sm uppercase tracking-wider text-muted mt-4">
			Partie {data.part.number}
		</p>
	{/if}
	<h1 class="font-heading text-4xl font-semibold mt-1 mb-6 text-heading">{data.part.title}</h1>

	{#if data.introParagraphs.length > 0}
		{#each data.introParagraphs as p (p.number)}
			{@const heading = headingByPara.get(p.number)}
			{#if heading}
				{#if heading.level <= 2}
					<h2 id={heading.id} class="font-ui text-xl font-semibold mt-12 mb-4 text-accent">
						{heading.title}
					</h2>
				{:else}
					<h3 id={heading.id} class="font-ui text-lg font-semibold mt-8 mb-3 text-heading">
						{heading.title}
					</h3>
				{/if}
			{/if}
			<ReadableUnit unit={{ kind: 'ccc-paragraph', data: p }} />
		{/each}
	{/if}

	{#if data.part.sections.length > 0}
		<h2 class="font-ui text-sm uppercase tracking-wider text-muted mt-12 mb-3 max-md:px-4">
			Sections
		</h2>
		<ol class="space-y-6">
			{#each data.part.sections as section (section.slug)}
				<li>
					<a href="/cec/{data.part.slug}/{section.slug}" class="block group">
						<h3 class="font-ui text-2xl font-semibold group-hover:text-accent">
							<span class="font-semibold">Section {section.number}&nbsp;:</span>
							{section.title}
						</h3>
						<p class="text-muted text-sm mt-1">
							{section.chapters.length}
							{section.chapters.length === 1 ? 'chapitre' : 'chapitres'}
							{#if section.articles_direct?.length}
								· {section.articles_direct.length}
								{section.articles_direct.length === 1 ? 'article' : 'articles'}
							{/if}
						</p>
					</a>
				</li>
			{/each}
		</ol>
	{/if}

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Partie précédente ou suivante"
	>
		{#if data.prev}
			<NavCard
				direction="prev"
				href={data.prev.href}
				eyebrow={data.prev.label}
				title={data.prev.title}
			/>
		{:else}
			<NavCard direction="prev" href="/cec" eyebrow="← Catéchisme" title="Sommaire complet" />
		{/if}
		{#if data.next}
			<NavCard
				direction="next"
				href={data.next.href}
				eyebrow={data.next.label}
				title={data.next.title}
			/>
		{/if}
	</nav>
</main>
