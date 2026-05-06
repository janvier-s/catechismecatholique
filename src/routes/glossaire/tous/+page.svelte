<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Glossaire A-Z | Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Liste alphabétique des {data.total} termes du glossaire du Catéchisme."
	/>
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<nav class="mb-6 font-ui text-sm">
		<a href="/glossaire" class="inline-flex items-center gap-1 text-muted hover:text-accent">
			<span aria-hidden="true">←</span>
			<span>Retour au glossaire</span>
		</a>
	</nav>

	<header class="mb-8">
		<h1 class="font-heading text-3xl font-semibold mb-2">Glossaire — A-Z</h1>
		<p class="text-muted text-[15px] leading-relaxed mb-3">
			Tous les termes du glossaire, classés par ordre alphabétique.
		</p>
		<p class="font-ui text-xs text-muted tabular-nums">{data.total} termes</p>
	</header>

	{#if data.grouped.length > 1}
		<nav class="alpha-bar mb-8 -mx-6 px-6 py-2 border-b border-border">
			<ul class="flex flex-wrap gap-x-2 gap-y-1 font-ui text-[13px]">
				{#each data.grouped as g (g.letter)}
					<li>
						<a
							href="#letter-{g.letter}"
							class="text-muted hover:text-accent font-semibold tabular-nums"
						>
							{g.letter}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}

	<div class="space-y-8">
		{#each data.grouped as group (group.letter)}
			<section id="letter-{group.letter}" class="letter-section">
				<h2 class="font-heading text-2xl font-semibold text-accent mb-3 tabular-nums">
					{group.letter}
				</h2>
				<ul class="space-y-1">
					{#each group.entries as e (e.slug)}
						<li>
							<a
								href="/glossaire/{e.slug}"
								class="flex items-baseline gap-3 px-2 py-1.5 -mx-2 rounded hover:bg-accent/5 group"
							>
								<span class="font-body text-[16px] text-foreground group-hover:text-accent">
									{e.term}
									{#if e.latin}<span class="text-muted italic text-[13px] ml-1">({e.latin})</span
										>{/if}
								</span>
								<span class="flex-1 border-b border-dotted border-border self-end mb-1"></span>
								<span class="font-ui text-[12px] text-muted tabular-nums flex-none">
									{#if e.totalRefs > 0}
										{e.totalRefs}
										{e.totalRefs > 1 ? 'renvois' : 'renvoi'}{#if e.seeAlso?.length}<span
												aria-hidden="true">&nbsp;•&nbsp;</span
											>{e.seeAlso.length}
											{e.seeAlso.length > 1 ? 'liens' : 'lien'}{/if}
									{:else if e.seeAlso?.length}
										{e.seeAlso.length} {e.seeAlso.length > 1 ? 'liens' : 'lien'}
									{:else}
										<span aria-hidden="true">—</span>
									{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
</main>

<style>
	/* Header is 80px tall + sticky. Park the alphabet bar flush to its bottom
	   edge. Use a solid background (no opacity / backdrop-blur) so Firefox
	   doesn't show the scrolled content bleeding through. */
	.alpha-bar {
		position: sticky;
		top: 80px;
		background: var(--color-bg);
		z-index: 5;
	}
	/* Anchor scroll respects the sticky header + alphabet bar so jumping to
	   "C" doesn't leave the heading hidden underneath them. */
	.letter-section {
		scroll-margin-top: 140px;
	}
</style>
