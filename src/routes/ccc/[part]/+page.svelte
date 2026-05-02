<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.part.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-12">
	<p class="font-ui text-xs uppercase tracking-wider text-muted">
		{data.part.number ? `Partie ${data.part.number}` : 'Prologue'}
	</p>
	<h1 class="font-ui text-4xl font-bold mt-1 mb-10">{data.part.title}</h1>

	<ol class="space-y-6">
		{#each data.part.sections as section (section.slug)}
			<li>
				<a href="/ccc/{data.part.slug}/{section.slug}" class="block group">
					<h2 class="font-ui text-2xl font-semibold group-hover:text-accent">
						<span class="text-accent">Section {section.number}:</span>
						{section.title}
					</h2>
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
</main>
