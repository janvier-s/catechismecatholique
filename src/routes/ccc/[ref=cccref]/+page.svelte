<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function chapterUrl(c: NonNullable<typeof data.context>): string {
		if (!c.section || !c.chapter) return '';
		return `/ccc/${c.part.slug}/${c.section.slug}/${c.chapter.slug}`;
	}
	function fmtRange(r: { from: number; to: number } | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`;
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
		<nav class="mb-8 font-ui text-sm" aria-label="Fil d'Ariane">
			<ol class="space-y-1">
				<li>
					<a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a>
				</li>
				<li class="pl-5">
					<a href="/ccc/{c.part.slug}" class="text-muted hover:text-accent">
						<span class="font-semibold">
							{c.part.number ? `Partie ${c.part.number}` : 'Prologue'}{' '}:
						</span>
						{c.part.title}
						{#if c.part.range}
							<span class="text-subtle">({fmtRange(c.part.range)})</span>
						{/if}
					</a>
				</li>
				{#if c.section}
					<li class="pl-5">
						<a href="/ccc/{c.part.slug}/{c.section.slug}" class="text-muted hover:text-accent">
							<span class="font-semibold">
								{c.section.number ? `Section ${c.section.number}` : 'Section'}{' '}:
							</span>
							{c.section.title}
							{#if c.section.range}
								<span class="text-subtle">({fmtRange(c.section.range)})</span>
							{/if}
						</a>
					</li>
				{/if}
				{#if c.chapter}
					<li class="pl-10">
						<a href={chapterUrl(c)} class="text-muted hover:text-accent">
							<span class="font-semibold">
								{c.chapter.number ? `Chapitre ${c.chapter.number}` : 'Chapitre'}{' '}:
							</span>
							{c.chapter.title}
							{#if c.chapter.range}
								<span class="text-subtle">({fmtRange(c.chapter.range)})</span>
							{/if}
						</a>
					</li>
				{/if}
				{#if c.article}
					<li class="pl-[3.75rem]">
						<a href="{chapterUrl(c)}#{c.article.slug}" class="text-muted hover:text-accent">
							<span class="font-semibold">
								{c.article.number ? `Article ${c.article.number}` : 'Article'}{' '}:
							</span>
							{c.article.title}
							{#if c.article.range}
								<span class="text-subtle">({fmtRange(c.article.range)})</span>
							{/if}
						</a>
					</li>
				{/if}
			</ol>
		</nav>

		{#if c.heading}
			<h2 class="font-ui text-lg font-semibold text-accent mt-2 mb-4">
				<a href="{chapterUrl(c)}#{c.heading.id}" class="hover:underline">
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
					Lire le chapitre complet&nbsp;: {c.chapter.title} →
				</a>
			</p>
		{/if}
	{:else}
		{#if data.kind === 'paragraph'}
			<ParagraphView paragraph={data.paragraph} />
		{:else}
			{#each data.paragraphs as p (p.number)}
				<ParagraphView paragraph={p} />
			{/each}
		{/if}
	{/if}
</main>
