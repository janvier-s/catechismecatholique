<script lang="ts">
	import type { PiusXPetitChapterFile, PiusXPetitQA } from '$lib/data/types';
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import OraisonBlock from '$lib/components/ui/OraisonBlock.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { prefs } from '$lib/stores/prefs';
	import { getFontById } from '$lib/data/fonts';
	import { linkifyVerseRefs } from '$lib/utils/bibleBookSlug';
	import { frenchPunct } from '$lib/utils/typography';

	let { chapter }: { chapter: PiusXPetitChapterFile } = $props();

	const readerFont = $derived(getFontById($prefs.fontFamily));
</script>

<main
	class="mx-auto max-w-reader px-6 max-md:px-4 py-10"
	data-corpus="pius-x-petit"
	style:font-family={readerFont?.stack ?? undefined}
	use:scrollSpy
>
	<header class="mb-8">
		<BreadcrumbRail
			crumbs={[
				{ href: '/petit-catechisme', title: 'Petit Catéchisme' },
				{
					href: `/petit-catechisme/${chapter.part_slug}`,
					kicker: chapter.part_title,
					title: chapter.title
				}
			]}
		/>
		<p class="font-ui text-sm uppercase tracking-wider text-muted">
			{chapter.qa_range[0]}–{chapter.qa_range[1]}
		</p>
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{chapter.title}</h1>
		{#if chapter.epigraph}
			<blockquote class="epigraph">
				{@html frenchPunct(linkifyVerseRefs(chapter.epigraph.text))}
			</blockquote>
		{/if}
	</header>

	{#each chapter.sections as section, si (si)}
		{#if section.title !== null}
			<h2 class="section-heading" id="s-{si}">{section.title}</h2>
		{/if}

		{#if section.commandments && section.commandments.length > 0}
			{#each section.commandments as cmd (cmd.ordinal)}
				<div class="commandment-block" id="cmd-{cmd.ordinal}">
					<h3 class="commandment-head">
						<span class="commandment-roman">{cmd.roman}</span>
						<span class="commandment-text">{cmd.biblical_text}</span>
					</h3>
					{#each cmd.qa as qa (qa.n)}
						{@render qaRow(qa)}
					{/each}
				</div>
			{/each}
		{:else}
			{#each section.qa as qa (qa.n)}
				{@render qaRow(qa)}
			{/each}
		{/if}
	{/each}

	{#if chapter.oraisons && chapter.oraisons.length > 0}
		<div class="oraisons">
			{#each chapter.oraisons as or, oi (oi)}
				<OraisonBlock html={or.html} cite={or.cite} />
			{/each}
		</div>
	{/if}

	{#if chapter.footnotes && chapter.footnotes.length > 0}
		<footer class="footnotes">
			<ol class="footnote-list">
				{#each chapter.footnotes as fn (fn.n)}
					<li id="fn-{fn.n}" class="footnote-item">
						<span class="footnote-n">{fn.n}.</span>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html frenchPunct(linkifyVerseRefs(fn.text))}
					</li>
				{/each}
			</ol>
		</footer>
	{/if}

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Chapitre précédent ou suivant"
	>
		{#if chapter.prev}
			<NavCard
				direction="prev"
				href={chapter.prev.href}
				eyebrow={chapter.prev.kind === 'part' ? '← Partie précédente' : '← Chapitre précédent'}
				title={chapter.prev.title}
			/>
		{:else}
			<span class="nav-spacer"></span>
		{/if}
		{#if chapter.next}
			<NavCard
				direction="next"
				href={chapter.next.href}
				eyebrow={chapter.next.kind === 'part' ? 'Partie suivante →' : 'Chapitre suivant →'}
				title={chapter.next.title}
			/>
		{:else}
			<span class="nav-spacer"></span>
		{/if}
	</nav>
</main>

{#snippet qaRow(qa: PiusXPetitQA)}
	<article class="qa-item" id="q-{qa.n}" class:qa-required={qa.required}>
		<div class="qa-grid">
			<div class="number-wrap">
				<span class="number-col font-ui font-semibold tabular-nums">
					{qa.n}
				</span>
			</div>
			<div class="content-col">
				{#if qa.q}
					<p class="pius-question">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html frenchPunct(qa.q)}
					</p>
				{/if}
				<div class="pius-answer">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html frenchPunct(qa.a)}
				</div>
			</div>
		</div>
	</article>
{/snippet}

<style>
	.epigraph {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--color-subtle);
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
		margin: 1.25rem 0 2rem;
		padding: 0.5rem 0 0.5rem 1.25rem;
	}

	.section-heading {
		font-family: var(--font-ui);
		font-size: 0.9rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-muted);
		margin: 2.5rem 0 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.commandment-block {
		margin: 2rem 0;
		padding: 1rem 1.25rem;
		background: color-mix(in srgb, var(--color-border) 20%, transparent);
		border-radius: 4px;
		border-left: 3px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
	}

	.commandment-head {
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
		margin: 0 0 1.1rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--color-border);
	}

	.commandment-roman {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.commandment-text {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.97rem;
		color: var(--color-subtle);
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
		width: 3.5rem;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		padding-top: 0.15rem;
	}

	.number-col {
		color: var(--color-accent);
		font-size: 0.85rem;
		line-height: 1.6;
		display: flex;
		align-items: baseline;
		gap: 0.2rem;
	}

	.content-col {
		flex: 1;
		min-width: 0;
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

	.pius-answer :global(sup.piusPetitRef) {
		font-size: 0.72em;
		color: var(--color-accent);
		cursor: default;
	}

	.oraisons {
		margin-top: 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.footnotes {
		margin-top: 2.5rem;
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
		font-size: 0.85rem;
		letter-spacing: 0.4px;
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
	.epigraph :global(a.verse-ref) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.15em;
		transition: color 120ms ease;
	}
	.epigraph :global(a.verse-ref:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
		text-decoration-thickness: 1px;
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

		.commandment-head {
			flex-direction: column;
			gap: 0.25rem;
		}
	}
</style>
