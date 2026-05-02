<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.section.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-12">
	<p class="font-ui text-sm text-muted">
		<a href="/ccc/{data.part.slug}" class="hover:underline">{data.part.title}</a>
	</p>
	<h1 class="font-ui text-4xl font-bold mt-2 mb-8">{data.section.title}</h1>
	<ol class="space-y-4">
		{#each data.section.chapters as chapter (chapter.slug)}
			<li>
				<a href="/ccc/{data.part.slug}/{data.section.slug}/{chapter.slug}" class="block group">
					<h2 class="font-ui text-xl font-semibold group-hover:text-accent">{chapter.title}</h2>
					<p class="text-muted text-sm">{chapter.paragraphs.length} paragraphes</p>
				</a>
			</li>
		{/each}
	</ol>
</main>
