<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.part.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-10">
	<nav class="mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li>
				<a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a>
			</li>
			<li class="pl-5">
				<span class="font-semibold"
					>{data.part.number ? `Partie ${data.part.number} :` : 'Prologue :'}</span
				>
				{data.part.title}
			</li>
		</ol>
	</nav>

	<ol class="space-y-6">
		{#each data.part.sections as section (section.slug)}
			<li>
				<a href="/ccc/{data.part.slug}/{section.slug}" class="block group">
					<h2 class="font-ui text-2xl font-semibold group-hover:text-accent">
						<span class="font-semibold">Section {section.number} :</span>
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
