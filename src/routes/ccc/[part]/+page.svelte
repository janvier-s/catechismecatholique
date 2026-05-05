<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type IntroHeading = NonNullable<typeof data.part.intro_headings>[number];
	const headingByPara = $derived.by(() => {
		const m = new Map<number, IntroHeading>();
		for (const h of data.part.intro_headings ?? []) m.set(h.paragraph_start, h);
		return m;
	});
</script>

<svelte:head><title>{data.part.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-reader px-6 py-10" use:scrollSpy>
	<nav class="mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li>
				<a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a>
			</li>
			<li class="pl-5">
				<span class="font-semibold">
					{data.part.number ? `Partie ${data.part.number} :` : 'Prologue :'}
				</span>
				{data.part.title}
			</li>
		</ol>
	</nav>

	<p class="font-ui text-sm uppercase tracking-wider text-muted mt-4">
		{data.part.number ? `Partie ${data.part.number}` : 'Prologue'}
	</p>
	<h1 class="font-heading text-4xl font-semibold mt-1 mb-8 text-heading">{data.part.title}</h1>

	{#if data.introParagraphs.length > 0}
		{#each data.introParagraphs as p (p.number)}
			{@const heading = headingByPara.get(p.number)}
			{#if heading}
				{#if heading.level <= 2}
					<h3
						id={heading.id}
						class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent"
					>
						{heading.title}
					</h3>
				{:else}
					<h4
						id={heading.id}
						class="font-ui text-lg font-semibold mt-8 mb-3 scroll-mt-24 text-heading"
					>
						{heading.title}
					</h4>
				{/if}
			{/if}
			<ParagraphView paragraph={p} />
		{/each}
	{/if}

	<h2 class="font-ui text-sm uppercase tracking-wider text-muted mt-12 mb-3">Sections</h2>
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

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Navigation"
	>
		{#if data.prev}
			<a class="part-nav-link prev" href={data.prev.href}>
				<span class="part-nav-eyebrow">{data.prev.label}</span>
				<span class="part-nav-title">{data.prev.title}</span>
			</a>
		{:else}
			<a class="part-nav-link prev" href="/ccc">
				<span class="part-nav-eyebrow">← Catéchisme</span>
				<span class="part-nav-title">Sommaire complet</span>
			</a>
		{/if}
		{#if data.next}
			<a class="part-nav-link next" href={data.next.href}>
				<span class="part-nav-eyebrow">{data.next.label}</span>
				<span class="part-nav-title">{data.next.title}</span>
			</a>
		{/if}
	</nav>
</main>

<style>
	.part-nav-link {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.85rem 1rem;
		background: var(--color-panel);
		border: 1px solid color-mix(in srgb, var(--color-fg) 22%, transparent);
		border-radius: 4px;
		color: var(--color-fg);
		text-decoration: none;
		transition:
			border-color 140ms ease,
			background 140ms ease,
			color 140ms ease;
	}
	.part-nav-link:hover {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent-text);
	}
	.part-nav-link.prev {
		text-align: left;
	}
	.part-nav-link.next {
		text-align: right;
	}
	.part-nav-eyebrow {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted);
	}
	.part-nav-title {
		font-family: var(--font-heading);
		font-size: 15px;
		line-height: 1.3;
		color: var(--color-fg);
	}
	.part-nav-link:hover .part-nav-title {
		color: var(--color-accent-text);
	}
</style>
