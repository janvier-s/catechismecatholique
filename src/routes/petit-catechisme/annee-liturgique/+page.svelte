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

	function fp(html: string): string {
		return frenchPunct(linkifyVerseRefs(html));
	}
</script>

<svelte:head>
	<title>{appendix.title} — Petit Catéchisme</title>
	<meta
		name="description"
		content="L’année liturgique et la discipline ecclésiastique : fêtes, jours d’abstinence, jeûne, indulgences, en appendice au Petit Catéchisme de saint Pie X."
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
				{
					href: '/petit-catechisme/annee-liturgique',
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

	{#each appendix.chapters as chapter (chapter.roman)}
		<section class="al-chapter">
			<header class="al-chapter-header">
				<p class="al-chapter-eyebrow">Chapitre {chapter.roman}</p>
				<h2 class="al-chapter-title" id="ch-{chapter.roman}">{chapter.title}</h2>
				{#if chapter.subtitle}
					<p class="al-chapter-subtitle">{chapter.subtitle}</p>
				{/if}
			</header>

			{#each chapter.sections as section (section.n)}
				<section class="al-section">
					<h3 class="al-section-heading" id="ch-{chapter.roman}-s-{section.n}">
						<span class="al-section-num">§ {section.n}</span>
						<span class="al-section-title">{section.title}</span>
					</h3>

					{#each section.blocks as block, bi (bi)}
						{#if block.kind === 'h'}
							<h4 class="al-h">{block.text}</h4>
						{:else if block.kind === 'intro'}
							<div class="al-prose">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html fp(block.html)}
							</div>
						{:else if block.kind === 'para'}
							<article
								class="al-para"
								id={block.n != null ? `p-${chapter.roman}-${section.n}-${block.n}` : undefined}
							>
								<div class="al-grid">
									{#if block.n != null}
										<div class="al-num-wrap">
											<span class="al-num font-ui font-semibold tabular-nums">{block.n}</span>
										</div>
									{/if}
									<div class="al-content">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html fp(block.html)}
									</div>
								</div>
							</article>
						{:else if block.kind === 'ol_roman'}
							<ol class="al-ol-roman">
								{#each block.items as item (item.roman)}
									<li>
										<span class="al-roman">{item.roman}.</span>
										<span class="al-roman-text">
											<!-- eslint-disable-next-line svelte/no-at-html-tags -->
											{@html fp(item.html)}
										</span>
									</li>
								{/each}
							</ol>
						{:else if block.kind === 'ol'}
							<ol class="al-ol">
								{#each block.items as item (item.n)}
									<li>
										<span class="al-ol-num">{item.label ?? `${item.n}.`}</span>
										<div class="al-ol-body">
											<!-- eslint-disable-next-line svelte/no-at-html-tags -->
											{@html fp(item.html)}
											{#if item.sub && item.sub.length > 0}
												<ul class="al-sub">
													{#each item.sub as s, si (si)}
														<!-- eslint-disable-next-line svelte/no-at-html-tags -->
														<li>{@html fp(s)}</li>
													{/each}
												</ul>
											{/if}
										</div>
									</li>
								{/each}
							</ol>
						{:else if block.kind === 'ul'}
							<ul class="al-ul">
								{#each block.items as item, ii (ii)}
									<li>
										<div class="al-ul-main">
											<!-- eslint-disable-next-line svelte/no-at-html-tags -->
											{@html fp(item.html)}
										</div>
										{#if item.note}
											<div class="al-note">
												<!-- eslint-disable-next-line svelte/no-at-html-tags -->
												{@html fp(item.note)}
											</div>
										{/if}
										{#if item.sub && item.sub.length > 0}
											<ul class="al-sub">
												{#each item.sub as s, si (si)}
													<!-- eslint-disable-next-line svelte/no-at-html-tags -->
													<li>{@html fp(s)}</li>
												{/each}
											</ul>
										{/if}
									</li>
								{/each}
							</ul>
						{:else if block.kind === 'concession'}
							<article class="al-concession">
								<div class="al-grid">
									<div class="al-num-wrap">
										<span class="al-num font-ui font-semibold tabular-nums">{block.n}</span>
									</div>
									<div class="al-content">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										<div class="al-concession-rule">{@html fp(block.html)}</div>
										{#if block.note}
											<div class="al-note">
												<!-- eslint-disable-next-line svelte/no-at-html-tags -->
												{@html fp(block.note)}
											</div>
										{/if}
									</div>
								</div>
							</article>
						{:else if block.kind === 'oraison'}
							<OraisonBlock html={block.html} cite={block.cite} />
						{:else if block.kind === 'quote'}
							<OraisonBlock html={block.html} cite={block.cite} eyebrow="Magistère" />
						{:else if block.kind === 'prayer'}
							<aside class="al-prayer">
								<p class="al-prayer-title">‡ {block.title}</p>
								<div class="al-prayer-body">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html fp(block.html)}
								</div>
							</aside>
						{/if}
					{/each}
				</section>
			{/each}
		</section>
	{/each}
</main>

<style>
	.al-chapter {
		margin-bottom: 4rem;
	}

	.al-chapter-header {
		text-align: center;
		margin: 3rem 0 2.5rem;
		padding-bottom: 1.25rem;
		border-bottom: 2px solid var(--color-accent);
	}
	.al-chapter:first-of-type .al-chapter-header {
		margin-top: 0;
	}
	.al-chapter-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.5rem;
	}
	.al-chapter-title {
		font-family: var(--font-heading);
		font-size: clamp(1.5rem, 3.2vw, 2rem);
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-heading, var(--color-fg));
		margin: 0;
	}
	.al-chapter-subtitle {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.9rem;
		color: var(--color-subtle);
		margin: 0.5rem 0 0;
	}

	.al-section {
		margin-bottom: 5rem;
	}
	.al-section + .al-section {
		padding-top: 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
	}

	.al-section-heading {
		font-family: var(--font-ui);
		font-size: 0.95rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-heading, var(--color-fg));
		margin: 2rem 0 1.25rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--color-border);
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
	}
	.al-section-num {
		flex: none;
		color: var(--color-accent);
	}
	.al-section-title {
		flex: 1;
	}

	.al-h {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-accent);
		margin: 1.75rem 0 0.85rem;
	}

	.al-prose,
	.al-content {
		font-family: var(--font-body);
		line-height: 1.75;
	}
	/* Intros sit at the same left edge as numbered paragraph bodies so the
	   bullet lists nest visibly underneath. */
	.al-prose {
		padding-left: 3rem;
		margin-bottom: 1.25rem;
	}
	.al-prose :global(p),
	.al-content :global(p) {
		margin: 0 0 0.75em;
	}
	.al-prose :global(p:last-child),
	.al-content :global(p:last-child) {
		margin-bottom: 0;
	}
	.al-prose :global(em),
	.al-content :global(em),
	.al-content :global(em) {
		font-style: italic;
	}

	.al-para,
	.al-concession {
		margin-bottom: 1.25rem;
	}

	.al-grid {
		display: flex;
		gap: 1rem;
	}

	.al-num-wrap {
		flex: none;
		width: 2rem;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		padding-top: 0.2rem;
	}

	.al-num {
		color: var(--color-accent);
		font-size: 0.78rem;
		line-height: 1.6;
	}

	.al-content {
		flex: 1;
		min-width: 0;
	}

	/* Roman ordered list (liturgical seasons) */
	.al-ol-roman {
		list-style: none;
		margin: 0 0 1.5rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.al-ol-roman li {
		display: flex;
		gap: 0.85rem;
		font-family: var(--font-body);
		line-height: 1.65;
	}
	.al-roman {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-accent);
		min-width: 2rem;
		padding-top: 0.2rem;
	}
	.al-roman-text {
		flex: 1;
	}

	/* Numbered ol */
	.al-ol {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.al-ol > li {
		display: flex;
		gap: 0.85rem;
		font-family: var(--font-body);
		line-height: 1.65;
	}
	.al-ol-num {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-accent);
		min-width: 2.25rem;
		padding-top: 0.05rem;
	}
	.al-ol-body {
		flex: 1;
	}
	.al-ol-body :global(strong) {
		color: var(--color-accent);
		font-weight: 600;
	}

	/* Bullet list — indented to nest visually under the preceding numbered
	   paragraph (whose body sits ~3rem in from the section's left edge). */
	.al-ul {
		list-style: none;
		margin: 0 0 1.25rem;
		padding: 0 0 0 4.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.al-ul > li {
		font-family: var(--font-body);
		line-height: 1.65;
		padding-left: 1rem;
		position: relative;
	}
	.al-ul > li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-accent);
	}
	.al-ul-main :global(em) {
		font-style: italic;
	}

	.al-sub {
		list-style: none;
		margin: 0.4rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.al-sub > li {
		font-family: var(--font-body);
		font-size: 0.92rem;
		line-height: 1.6;
		color: var(--color-subtle);
		padding-left: 1rem;
		position: relative;
	}
	.al-sub > li::before {
		content: '–';
		position: absolute;
		left: 0;
		color: var(--color-muted);
	}

	.al-note {
		font-family: var(--font-body);
		font-size: 0.88rem;
		font-style: italic;
		line-height: 1.6;
		color: var(--color-subtle);
		margin-top: 0.4rem;
	}

	/* Concession block */
	.al-concession-rule {
		font-family: var(--font-body);
		line-height: 1.7;
	}

	/* Closing prayer box */
	.al-prayer {
		margin-top: 2.5rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-accent) 5%, transparent);
	}
	.al-prayer-title {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.75rem;
	}
	.al-prayer-body {
		font-family: var(--font-body);
		font-style: italic;
		line-height: 1.75;
		color: var(--color-fg);
	}

	/* Verse-ref styles inside prose */
	.al-content :global(a.verse-ref),
	.al-prose :global(a.verse-ref),
	.al-ul :global(a.verse-ref),
	.al-ol :global(a.verse-ref),
	.al-note :global(a.verse-ref) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.15em;
		transition: color 120ms ease;
	}
	.al-content :global(a.verse-ref:hover),
	.al-prose :global(a.verse-ref:hover),
	.al-ul :global(a.verse-ref:hover),
	.al-ol :global(a.verse-ref:hover),
	.al-note :global(a.verse-ref:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
	}

	@media (max-width: 640px) {
		.al-grid {
			flex-direction: column;
			gap: 0.2rem;
		}
		.al-num-wrap {
			width: auto;
			justify-content: flex-start;
			padding-top: 0;
		}
		.al-content {
			font-size: 1rem;
		}
		.al-ul {
			padding-left: 1.5rem;
		}
		.al-prose {
			padding-left: 0;
		}
		.al-ol > li,
		.al-ol-roman li {
			flex-direction: column;
			gap: 0.2rem;
		}
		.al-ol-num,
		.al-roman {
			padding-top: 0;
		}
	}
</style>
