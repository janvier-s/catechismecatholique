<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.article.title} — Catéchisme</title>
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<nav class="mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li><a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a></li>
			<li class="pl-5">
				<a href="/ccc/{data.chapter.part_slug}" class="text-muted hover:text-accent">
					<span class="font-semibold"
						>{data.chapter.part_number
							? `Partie ${data.chapter.part_number} :`
							: 'Prologue :'}</span
					>
					{data.chapter.part_title}
				</a>
			</li>
			<li class="pl-10">
				<a
					href="/ccc/{data.chapter.part_slug}/{data.chapter.section_slug}"
					class="text-muted hover:text-accent"
				>
					<span class="font-semibold"
						>{data.chapter.section_number
							? `Section ${data.chapter.section_number} :`
							: 'Section :'}</span
					>
					{data.chapter.section_title}
				</a>
			</li>
			<li class="pl-[3.75rem]">
				<a
					href="/ccc/{data.chapter.part_slug}/{data.chapter.section_slug}/{data.chapter.slug}"
					class="text-muted hover:text-accent"
				>
					<span class="font-semibold"
						>{data.chapter.number
							? `Chapitre ${data.chapter.number} :`
							: 'Chapitre :'}</span
					>
					{data.chapter.title}
				</a>
			</li>
			<li class="pl-20">
				<span class="font-semibold"
					>{data.article.number
						? `Article ${data.article.number} :`
						: 'Article :'}</span
				>
				{data.article.title}
			</li>
		</ol>
	</nav>

	<p class="font-ui text-sm uppercase tracking-wider text-muted mt-4">
		{data.article.number ? `Article ${data.article.number}` : 'Article'}
	</p>
	<h1 class="font-ui text-3xl font-bold mt-1 mb-8 text-heading">{data.article.title}</h1>

	{#each data.paragraphs as p (p.number)}
		{@const heading = data.article.headings.find((h) => h.paragraph_start === p.number)}
		{#if heading}
			<h2
				id={heading.id}
				class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent"
			>
				{heading.title}
			</h2>
		{/if}
		<ParagraphView paragraph={p} />
	{/each}
</main>
