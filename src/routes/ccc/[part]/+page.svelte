<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import Panorama from '$lib/components/ui/Panorama.svelte';
	import PanoramaModal from '$lib/components/ui/PanoramaModal.svelte';
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

	let panoramaOpen = $state(false);
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

<main class="mx-auto max-w-reader px-6 max-md:px-0 py-10" use:scrollSpy>
	<nav class="breadcrumb-rail mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li>
				<a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a>
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
	<h1 class="font-heading text-4xl font-semibold mt-1 mb-8 text-heading">{data.part.title}</h1>

	{#if data.introParagraphs.length > 0}
		{#each data.introParagraphs as p (p.number)}
			{@const heading = headingByPara.get(p.number)}
			{#if heading}
				{#if heading.level <= 2}
					<h2
						id={heading.id}
						class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent"
					>
						{heading.title}
					</h2>
				{:else}
					<h3
						id={heading.id}
						class="font-ui text-lg font-semibold mt-8 mb-3 scroll-mt-24 text-heading"
					>
						{heading.title}
					</h3>
				{/if}
			{/if}
			<ParagraphView paragraph={p} />
		{/each}
	{/if}

	{#if data.part.sections.length > 0}
		<div class="flex items-center justify-between gap-4 mt-12 mb-3 max-md:px-4">
			<h2 class="font-ui text-sm uppercase tracking-wider text-muted">Sections</h2>
			<button
				type="button"
				class="panorama-trigger"
				aria-haspopup="dialog"
				onclick={() => (panoramaOpen = true)}
			>
				Voir le panorama <span class="panorama-trigger-arrow" aria-hidden="true">→</span>
			</button>
		</div>
		<ol class="space-y-6">
			{#each data.part.sections as section (section.slug)}
				<li>
					<a href="/ccc/{data.part.slug}/{section.slug}" class="block group">
						<h3 class="font-ui text-2xl font-semibold group-hover:text-accent">
							<span class="font-semibold">Section {section.number} :</span>
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
			<NavCard direction="prev" href="/ccc" eyebrow="← Catéchisme" title="Sommaire complet" />
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

{#if data.part.sections.length > 0}
	<PanoramaModal bind:open={panoramaOpen} title={data.part.title}>
		<Panorama parts={[data.part]} headingLevel={3} />
	</PanoramaModal>
{/if}

<style>
	.panorama-trigger {
		appearance: none;
		background: transparent;
		border: none;
		padding: 0;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		cursor: pointer;
	}
	.panorama-trigger:hover {
		color: var(--color-accent-text);
	}
	.panorama-trigger:hover .panorama-trigger-arrow {
		transform: translateX(3px);
	}
	.panorama-trigger-arrow {
		display: inline-block;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
</style>
