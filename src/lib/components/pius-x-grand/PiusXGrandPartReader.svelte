<script lang="ts">
	import type { PiusXGrandChapterFile, PiusXGrandStructurePart } from '$lib/data/types';
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { prefs } from '$lib/stores/prefs';
	import { getFontById } from '$lib/data/fonts';

	let {
		part,
		chapters,
		prevPart,
		nextPart
	}: {
		part: PiusXGrandStructurePart;
		chapters: PiusXGrandChapterFile[];
		prevPart?: PiusXGrandStructurePart;
		nextPart?: PiusXGrandStructurePart;
	} = $props();

	const readerFont = $derived(getFontById($prefs.fontFamily));

	const ORDINALS = ['Premier', 'Deuxième', 'Troisième', 'Quatrième', 'Cinquième'];
	const partOrdinalLabel = $derived(ORDINALS[part.ordinal - 1] ?? `Partie ${part.ordinal}`);
</script>

<main
	class="mx-auto max-w-reader px-6 max-md:px-4 py-10"
	data-corpus="pius-x-grand"
	style:font-family={readerFont?.stack ?? undefined}
	use:scrollSpy
>
	<header class="mb-8">
		<BreadcrumbRail
			crumbs={[
				{ href: '/grand-catechisme', title: 'Grand Catéchisme' },
				{
					href: `/grand-catechisme/${part.slug}`,
					kicker: partOrdinalLabel + ' partie',
					title: part.title
				}
			]}
		/>
		<p class="font-ui text-sm uppercase tracking-wider text-muted">
			{partOrdinalLabel} partie · {chapters[0]?.qa_range[0]}–{chapters[chapters.length - 1]
				?.qa_range[1]}
		</p>
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{part.title}</h1>
	</header>

	{#each chapters as chapter (chapter.slug)}
		<section class="chapter-block">
			<h2 class="chapter-heading" id="c-{chapter.slug}">
				{chapter.title}
			</h2>

			{#each chapter.sections as section, si (si)}
				{#if section.title !== null}
					<h3 class="section-heading" id="c-{chapter.slug}-s-{si}">{section.title}</h3>
				{/if}
				{#each section.qa as qa (qa.n)}
					<article class="qa-item" id="q-{qa.n}">
						<div class="qa-grid">
							<div class="number-wrap">
								<span class="number-col font-ui font-semibold tabular-nums">{qa.n}</span>
							</div>
							<div class="content-col">
								{#if qa.q}
									<p class="pius-question">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html qa.q}
									</p>
								{/if}
								<div class="pius-answer">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html qa.a}
								</div>
							</div>
						</div>
					</article>
				{/each}
			{/each}
		</section>
	{/each}

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Partie précédente ou suivante"
	>
		{#if prevPart}
			<NavCard
				direction="prev"
				href="/grand-catechisme/{prevPart.slug}"
				eyebrow={prevPart.ordinal === 0 ? '← Leçon préliminaire' : '← Partie précédente'}
				title={prevPart.title}
			/>
		{:else}
			<span class="nav-spacer"></span>
		{/if}
		{#if nextPart}
			<NavCard
				direction="next"
				href="/grand-catechisme/{nextPart.slug}"
				eyebrow={nextPart.ordinal === 0 ? 'Leçon préliminaire →' : 'Partie suivante →'}
				title={nextPart.title}
			/>
		{:else}
			<span class="nav-spacer"></span>
		{/if}
	</nav>
</main>

<style>
	.chapter-block {
		margin-bottom: 3.5rem;
	}

	.chapter-heading {
		font-family: var(--font-heading);
		font-size: 1.55rem;
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-heading, var(--color-fg));
		margin: 0 0 1.5rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--color-border);
	}

	.section-heading {
		font-family: var(--font-ui);
		font-size: 1rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-muted);
		margin: 2.5rem 0 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.qa-item {
		margin-bottom: 1.75rem;
	}

	.qa-grid {
		display: flex;
		gap: 1rem;
	}

	.number-wrap {
		flex: none;
		width: 3rem;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		padding-top: 0.15rem;
	}

	.number-col {
		color: var(--color-accent);
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.content-col {
		flex: 1;
		min-width: 0;
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.6);
	}

	.pius-question {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-muted);
		margin: 0 0 0.3em;
		line-height: 1.55;
	}

	.pius-answer :global(p) {
		margin-bottom: 0.75em;
		line-height: 1.65;
	}

	.pius-answer :global(p:last-child) {
		margin-bottom: 0;
	}

	.pius-answer :global(p.list) {
		padding-left: 1.25em;
		margin-bottom: 0.4em;
	}

	.nav-spacer {
		flex: 1;
	}

	@media (max-width: 640px) {
		.qa-grid {
			flex-direction: column;
			gap: 0.2rem;
		}

		.number-wrap {
			width: auto;
			justify-content: flex-start;
			padding-top: 0;
		}

		.content-col {
			font-size: 1rem;
			line-height: 1.6;
		}
	}
</style>
