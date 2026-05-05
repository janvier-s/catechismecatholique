<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Glossaire · Catéchisme</title>
	<meta
		name="description"
		content="Glossaire thématique du Catéchisme : {data.totalEntries} termes regroupés en {data.clusters.length} thèmes, du Christ aux fins dernières."
	/>
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<header class="mb-10">
		<h1 class="font-heading text-4xl font-semibold mb-2">Glossaire</h1>
		<p class="text-muted text-[15px] leading-relaxed">
			{data.totalEntries} termes du Catéchisme, avec définitions et renvois aux paragraphes.<br />
			Parcourez par thème ou commencez par les notions les plus citées.
		</p>
		<p class="mt-3 font-ui text-[13px]">
			<a href="/glossaire/tous" class="text-muted hover:text-accent">
				Voir tous les {data.totalEntries} termes <span aria-hidden="true">→</span>
			</a>
		</p>
	</header>

	<section class="mb-12">
		<h2 class="font-ui text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-4">
			Parcourir par thème
		</h2>
		<ul class="grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-fr">
			{#each data.clusters.sort((a, b) => a.order - b.order) as c (c.id)}
				<li class="h-full">
					<a
						href="/glossaire/c/{c.id}"
						class="cluster-card flex h-full flex-col p-4 rounded-md border border-border bg-panel hover:border-accent hover:bg-accent/5 transition-colors"
					>
						<div class="flex items-baseline justify-between gap-3 mb-2">
							<span class="font-heading text-[18px] font-semibold text-foreground">
								{c.label}
							</span>
							<span class="font-ui text-[12px] text-muted tabular-nums flex-none">
								{c.count} termes
							</span>
						</div>
						<p class="font-ui text-[13px] text-muted leading-snug">{c.description}</p>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	{#if data.featured.length > 0}
		<section class="mb-12">
			<h2 class="font-ui text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-4">
				Les plus citées
			</h2>
			<ul class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 auto-rows-fr">
				{#each data.featured.slice(0, 16) as e (e.slug)}
					<li class="h-full">
						<a
							href="/glossaire/{e.slug}"
							class="flex h-full flex-col px-3 py-2.5 rounded-md border border-border bg-panel hover:border-accent hover:bg-accent/5 transition-colors"
						>
							<span class="font-ui text-[14px] font-semibold text-foreground leading-tight">
								{e.term}
							</span>
							<span class="font-ui text-[11px] text-muted mt-auto pt-1 tabular-nums">
								{e.totalRefs} renvois
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>

<style>
	.cluster-card p {
		flex: 1;
	}
</style>
