<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import OraisonBlock from '$lib/components/ui/OraisonBlock.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { prefs } from '$lib/stores/prefs';
	import { getFontById } from '$lib/data/fonts';
	import { linkifyVerseRefs } from '$lib/utils/bibleBookSlug';
	import { frenchPunct } from '$lib/utils/typography';

	let { data } = $props();
	const appendix = $derived(data.appendix);
	const readerFont = $derived(getFontById($prefs.fontFamily));
</script>

<svelte:head>
	<title>{appendix.title} — Petit Catéchisme</title>
	<meta
		name="description"
		content="Instructions aux parents et aux éducateurs chrétiens, en appendice au Petit Catéchisme de saint Pie X."
	/>
</svelte:head>

<main
	class="mx-auto max-w-reader px-6 max-md:px-0 py-10"
	data-corpus="pius-x-petit"
	style:font-family={readerFont?.stack ?? undefined}
	use:scrollSpy
>
	<header class="mb-10">
		<BreadcrumbRail
			crumbs={[
				{ href: '/petit-catechisme', title: 'Petit Catéchisme' },
				{ href: '/petit-catechisme/educateurs', kicker: appendix.kicker, title: appendix.title }
			]}
		/>
		<p class="font-ui text-sm uppercase tracking-wider text-muted">{appendix.kicker}</p>
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{appendix.title}</h1>
	</header>

	{#each appendix.paragraphs as p (p.n)}
		<article class="ed-para" id="p-{p.n}">
			<div class="ed-grid">
				<div class="ed-num-wrap">
					<span class="ed-num font-ui font-semibold tabular-nums">{p.n}</span>
				</div>
				<div class="ed-content">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html frenchPunct(linkifyVerseRefs(p.html))}
				</div>
			</div>
		</article>
	{/each}

	{#if appendix.oraison}
		<OraisonBlock html={linkifyVerseRefs(appendix.oraison.html)} cite={appendix.oraison.cite} />
	{/if}
</main>

<style>
	.ed-para {
		margin-bottom: 1.5rem;
	}

	.ed-grid {
		display: flex;
		gap: 1rem;
	}

	.ed-num-wrap {
		flex: none;
		width: 3.5rem;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		padding-top: 0.25rem;
	}

	.ed-num {
		color: var(--color-accent);
		font-size: 0.85rem;
		line-height: 1.6;
	}

	.ed-content {
		flex: 1;
		min-width: 0;
		font-family: var(--font-body);
		line-height: 1.75;
	}

	.ed-content :global(p) {
		margin: 0 0 0.75em;
	}
	.ed-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.ed-content :global(a.verse-ref) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.15em;
		transition: color 120ms ease;
	}
	.ed-content :global(a.verse-ref:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
	}

	@media (max-width: 640px) {
		.ed-grid {
			flex-direction: column;
			gap: 0.2rem;
		}
		.ed-num-wrap {
			width: auto;
			justify-content: flex-start;
			padding-top: 0;
		}
		.ed-content {
			font-size: 1rem;
		}
	}
</style>
