<script lang="ts">
	type Crumb = { href: string; kicker?: string; title: string };
	let { crumbs, trailing }: { crumbs: Crumb[]; trailing?: import('svelte').Snippet } = $props();
</script>

<div class="breadcrumb-row mb-4">
	<nav class="breadcrumb-rail font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			{#each crumbs as crumb, i (crumb.href + i)}
				<li class={i === 0 ? '' : i === 1 ? 'pl-5' : 'pl-10'}>
					<a href={crumb.href} class="text-muted hover:text-accent">
						{#if crumb.kicker}
							<span class="font-semibold bc-kicker">{crumb.kicker}</span>
							<span class="bc-title">&nbsp;: {crumb.title}</span>
						{:else}
							{crumb.title}
						{/if}
					</a>
				</li>
			{/each}
		</ol>
	</nav>
	{#if trailing}{@render trailing()}{/if}
</div>

<style>
	.breadcrumb-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.breadcrumb-row .breadcrumb-rail {
		flex: 1 1 auto;
		min-width: 0;
	}
	@media (max-width: 640px) {
		.breadcrumb-row {
			padding: 0 1rem;
		}
	}
</style>
