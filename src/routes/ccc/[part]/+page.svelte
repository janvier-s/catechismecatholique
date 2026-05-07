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
	<h1 class="font-heading text-4xl font-semibold mt-1 mb-6 text-heading">{data.part.title}</h1>

	{#if data.part.sections.length > 0}
		<div class="panorama-trigger-row">
			<button
				type="button"
				class="panorama-trigger-btn"
				aria-haspopup="dialog"
				onclick={() => (panoramaOpen = true)}
			>
				<svg
					class="panorama-trigger-icon"
					width="14"
					height="14"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect x="1.5" y="1.5" width="6" height="6" rx="0.5" />
					<rect x="8.5" y="1.5" width="6" height="6" rx="0.5" />
					<rect x="1.5" y="8.5" width="6" height="6" rx="0.5" />
					<rect x="8.5" y="8.5" width="6" height="6" rx="0.5" />
				</svg>
				<span>Panorama de cette partie</span>
			</button>
		</div>
	{/if}

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
		<h2 class="font-ui text-sm uppercase tracking-wider text-muted mt-12 mb-3 max-md:px-4">
			Sections
		</h2>
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
	.panorama-trigger-row {
		margin: 0 0 2.5rem;
	}
	.panorama-trigger-btn {
		appearance: none;
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.95rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: transparent;
		color: var(--color-fg);
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			border-color 150ms ease,
			color 150ms ease;
	}
	.panorama-trigger-btn:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	.panorama-trigger-icon {
		flex: 0 0 auto;
	}
	@media (max-width: 640px) {
		.panorama-trigger-row {
			padding: 0 1rem;
		}
	}
</style>
