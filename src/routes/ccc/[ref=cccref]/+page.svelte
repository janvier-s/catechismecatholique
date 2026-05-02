<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function chapterUrl(c: NonNullable<typeof data.context>): string {
		if (!c.section || !c.chapter) return '';
		return `/ccc/${c.part.slug}/${c.section.slug}/${c.chapter.slug}`;
	}
</script>

<svelte:head>
	{#if data.kind === 'paragraph'}
		<title>§ {data.paragraph.number} — Catéchisme</title>
	{:else}
		<title>§ {data.from}–{data.to} — Catéchisme</title>
	{/if}
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	{#if data.context}
		{@const c = data.context}
		<nav class="font-ui text-xs uppercase tracking-wider text-muted mb-6 leading-relaxed" aria-label="Fil d'Ariane">
			<a href="/ccc/{c.part.slug}" class="hover:text-accent">{c.part.title}</a>
			{#if c.section}
				<span class="mx-2 text-subtle">›</span>
				<a href="/ccc/{c.part.slug}/{c.section.slug}" class="hover:text-accent">{c.section.title}</a>
			{/if}
			{#if c.chapter}
				<span class="mx-2 text-subtle">›</span>
				<a href={chapterUrl(c)} class="hover:text-accent">{c.chapter.title}</a>
			{/if}
		</nav>

		{#if c.article}
			<p class="font-ui text-sm uppercase tracking-wider text-muted mt-6">Article</p>
			<h1 class="font-ui text-2xl font-bold text-heading mt-1 mb-4">
				<a href="{chapterUrl(c)}#{c.article.slug}" class="hover:text-accent">
					{c.article.title}
				</a>
			</h1>
		{/if}

		{#if c.heading}
			<h2 class="font-ui text-lg font-semibold text-heading mt-6 mb-4">
				<a href="{chapterUrl(c)}#{c.heading.id}" class="hover:text-accent">
					{c.heading.title}
				</a>
			</h2>
		{/if}

		<div class="border-t border-border pt-6 mt-2">
			{#if data.kind === 'paragraph'}
				<ParagraphView paragraph={data.paragraph} />
			{:else}
				{#each data.paragraphs as p (p.number)}
					<ParagraphView paragraph={p} />
				{/each}
			{/if}
		</div>

		{#if c.chapter}
			<p class="mt-12 font-ui text-sm">
				<a href={chapterUrl(c)} class="text-accent hover:underline">
					Lire le chapitre complet : {c.chapter.title} →
				</a>
			</p>
		{/if}
	{:else}
		<!-- Prologue paragraphs and any without a context entry -->
		{#if data.kind === 'paragraph'}
			<ParagraphView paragraph={data.paragraph} />
		{:else}
			{#each data.paragraphs as p (p.number)}
				<ParagraphView paragraph={p} />
			{/each}
		{/if}
	{/if}
</main>
