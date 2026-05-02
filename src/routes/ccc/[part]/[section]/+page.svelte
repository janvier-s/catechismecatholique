<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.section.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-10">
	<nav class="mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li>
				<a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a>
			</li>
			<li class="pl-5">
				<a href="/ccc/{data.part.slug}" class="text-muted hover:text-accent">
					<span class="font-semibold"
						>{data.part.number ? `Partie ${data.part.number} :` : 'Prologue :'}</span
					>
					{data.part.title}
				</a>
			</li>
			<li class="pl-10">
				<span class="font-semibold"
					>{data.section.number ? `Section ${data.section.number} :` : 'Section :'}</span
				>
				{data.section.title}
			</li>
		</ol>
	</nav>

	{#if data.section.chapters.length > 0}
		<h2 class="font-ui text-sm uppercase tracking-wider text-muted mb-3">Chapitres</h2>
		<ol class="space-y-4 mb-10">
			{#each data.section.chapters as chapter (chapter.slug)}
				<li>
					<a href="/ccc/{data.part.slug}/{data.section.slug}/{chapter.slug}" class="block group">
						<h3 class="font-ui text-xl font-semibold group-hover:text-accent">
							<span class="font-semibold">Chapitre {chapter.number} :</span>
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
						<a
							href="/ccc/{firstPara}-{article.paragraphs[article.paragraphs.length - 1]}"
							class="block group"
						>
							<h3 class="font-ui text-xl font-semibold group-hover:text-accent">
								{#if article.number}<span class="font-semibold"
										>Article {article.number} :</span
									>{/if}
								{article.title}
							</h3>
							<p class="text-muted text-sm">
								{article.paragraphs.length} paragraphes (§§ {firstPara}–{article.paragraphs[
									article.paragraphs.length - 1
								]})
							</p>
						</a>
					</li>
				{/if}
			{/each}
		</ol>
	{/if}
</main>
