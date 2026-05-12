<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
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
	<title>{appendix.title} · Petit Catéchisme</title>
	<meta
		name="description"
		content="Très bref résumé de l’histoire de la Révélation divine, en appendice au Petit Catéchisme de saint Pie X."
	/>
</svelte:head>

<main
	class="mx-auto max-w-reader px-6 max-md:px-4 py-10"
	data-corpus="pius-x-petit"
	style:font-family={readerFont?.stack ?? undefined}
	use:scrollSpy
>
	<header class="mb-10">
		<BreadcrumbRail
			crumbs={[
				{ href: '/petit-catechisme', title: 'Petit Catéchisme' },
				{
					href: '/petit-catechisme/histoire-revelation',
					kicker: appendix.kicker,
					title: appendix.title
				}
			]}
		/>
		<p class="font-ui text-sm uppercase tracking-wider text-muted">
			{appendix.kicker}
		</p>
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{appendix.title}</h1>
	</header>

	{#each appendix.sections as section (section.roman)}
		<section class="hr-section">
			<h2 class="hr-section-heading" id="s-{section.roman}">
				<span class="hr-roman">{section.roman}.</span>
				<span class="hr-section-title">{section.title}</span>
			</h2>
			{#each section.paragraphs as p (p.n)}
				<article class="hr-para" id="p-{p.n}">
					<div class="hr-grid">
						<div class="hr-num-wrap">
							<span class="hr-num font-ui font-semibold tabular-nums">{p.n}</span>
						</div>
						<div class="hr-content">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html frenchPunct(linkifyVerseRefs(p.html))}
						</div>
					</div>
				</article>
			{/each}
		</section>
	{/each}

	{#if appendix.footnotes.length > 0}
		<footer class="footnotes">
			<ol class="footnote-list">
				{#each appendix.footnotes as fn (fn.n)}
					<li id="fn-{fn.n}" class="footnote-item">
						<span class="footnote-n">{fn.n}.</span>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html frenchPunct(linkifyVerseRefs(fn.text))}
					</li>
				{/each}
			</ol>
		</footer>
	{/if}
</main>

<style>
	.hr-section {
		margin-bottom: 3rem;
	}

	.hr-section-heading {
		font-family: var(--font-ui);
		font-size: 0.95rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-heading, var(--color-fg));
		margin: 2.5rem 0 1.5rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--color-border);
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
	}

	.hr-roman {
		flex: none;
		color: var(--color-accent);
	}

	.hr-section-title {
		flex: 1;
	}

	.hr-para {
		margin-bottom: 1.25rem;
	}

	.hr-grid {
		display: flex;
		gap: 1rem;
	}

	.hr-num-wrap {
		flex: none;
		width: 3.5rem;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		padding-top: 0.2rem;
	}

	.hr-num {
		color: var(--color-accent);
		font-size: 0.85rem;
		line-height: 1.6;
	}

	.hr-content {
		flex: 1;
		min-width: 0;
	}

	.hr-content :global(p) {
		font-family: var(--font-body);
		line-height: 1.75;
		margin: 0 0 0.75em;
	}

	.hr-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.hr-content :global(em) {
		font-style: italic;
	}

	.hr-content :global(a.verse-ref) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.15em;
		transition: color 120ms ease;
	}
	.hr-content :global(a.verse-ref:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
	}

	.footnotes {
		margin-top: 3rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.footnote-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.footnote-item {
		font-family: var(--font-body);
		font-size: 0.85rem;
		line-height: 1.55;
		color: var(--color-subtle);
		display: flex;
		gap: 0.5rem;
	}

	.footnote-n {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-accent);
		min-width: 1.25rem;
	}

	.footnote-item :global(a.verse-ref) {
		color: var(--color-accent);
		text-decoration: none;
		border-bottom: 1px dotted color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.footnote-item :global(a.verse-ref:hover) {
		border-bottom-style: solid;
	}

	@media (max-width: 640px) {
		.hr-grid {
			flex-direction: column;
			gap: 0.2rem;
		}

		.hr-num-wrap {
			width: auto;
			justify-content: flex-start;
			padding-top: 0;
		}

		.hr-content {
			font-size: 1rem;
		}
	}
</style>
