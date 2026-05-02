<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.section.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-12">
	<p class="font-ui text-sm text-muted">
		<a href="/ccc/{data.part.slug}" class="hover:underline">
			{data.part.number ? `Partie ${data.part.number}: ` : ''}{data.part.title}
		</a>
	</p>
	<p class="font-ui text-xs uppercase tracking-wider text-muted mt-3">
		{data.section.number ? `Section ${data.section.number}` : 'Section'}
	</p>
	<h1 class="font-ui text-3xl font-bold mt-1 mb-8">{data.section.title}</h1>

	{#if data.section.chapters.length > 0}
		<h2 class="font-ui text-sm uppercase tracking-wider text-muted mb-3">Chapitres</h2>
		<ol class="space-y-4 mb-10">
			{#each data.section.chapters as chapter (chapter.slug)}
				<li>
					<a href="/ccc/{data.part.slug}/{data.section.slug}/{chapter.slug}" class="block group">
						<h3 class="font-ui text-xl font-semibold group-hover:text-accent">
							<span class="text-accent">Chapitre {chapter.number}:</span>
							{chapter.title}
						</h3>
						<p class="text-muted text-sm">{chapter.paragraphs.length} paragraphes</p>
					</a>
				</li>
			{/each}
		</ol>
	{/if}

	{#if data.section.articles_direct && data.section.articles_direct.length > 0}
		<h2 class="font-ui text-sm uppercase tracking-wider text-muted mb-3">Articles</h2>
		<ol class="space-y-4">
			{#each data.section.articles_direct as article (article.slug)}
				{@const firstPara = article.paragraphs[0]}
				{#if firstPara}
					<li>
						<a href="/ccc/{firstPara}-{article.paragraphs[article.paragraphs.length - 1]}" class="block group">
							<h3 class="font-ui text-xl font-semibold group-hover:text-accent">
								{#if article.number}<span class="text-accent">Article {article.number}:</span>{/if}
								{article.title}
							</h3>
							<p class="text-muted text-sm">{article.paragraphs.length} paragraphes (§§ {firstPara}–{article.paragraphs[article.paragraphs.length - 1]})</p>
						</a>
					</li>
				{/if}
			{/each}
		</ol>
	{/if}
</main>
