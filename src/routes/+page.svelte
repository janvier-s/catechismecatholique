<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// The daily paragraph is a teaser, not the reader. Strip the inline sup
	// markers (cccRef/bibleRef/docRef) so the prose reads as flowing text
	// and remains plain, selectable HTML — no interactive buttons.
	function cleanTeaserHtml(html: string): string {
		return html
			.replace(/<sup\s[^>]*>[^<]*<\/sup>/gi, '')
			.replace(/\s+([,.;:!?»)])/g, '$1')
			.replace(/\s{2,}/g, ' ');
	}

	const teaserHtml = $derived(
		data.paragraph ? cleanTeaserHtml(data.paragraph.text_html) : ''
	);

	// The homepage is laid out to fit one screen at typical viewport heights.
	// Hide the body scrollbar while it's mounted so a one-pixel overflow
	// doesn't trigger a phantom track. The CSS below restores scroll for
	// short viewports where the content genuinely won't fit.
	$effect(() => {
		document.body.classList.add('home-route');
		return () => document.body.classList.remove('home-route');
	});
</script>

<svelte:head>
	<title>Catéchisme de l'Église Catholique | Édition française définitive</title>
	<meta
		name="description"
		content="Édition française définitive du Catéchisme de l'Église Catholique. Lecture, recherche et navigation par paragraphe, référence biblique et thème."
	/>
	<meta property="og:title" content="Catéchisme de l'Église Catholique | Édition française définitive" />
	<meta property="og:description" content="Édition française définitive du Catéchisme de l'Église Catholique. Lecture, recherche et navigation par paragraphe, référence biblique et thème." />
	<meta property="og:image" content="{page.url.origin}/img/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Catéchisme de l'Église Catholique — Édition française définitive" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: "Catéchisme de l'Église Catholique",
		description: "Édition française définitive du Catéchisme de l'Église Catholique",
		url: page.url.origin,
		inLanguage: 'fr',
		publisher: {
			'@type': 'Organization',
			name: "Catéchisme de l'Église Catholique",
			url: page.url.origin,
			logo: {
				'@type': 'ImageObject',
				url: page.url.origin + '/img/logo/logo-128.png'
			}
		},
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: page.url.origin + '/recherche?q={search_term_string}'
			},
			'query-input': 'required name=search_term_string'
		}
	})}</script>`}
</svelte:head>

<main class="home">
	<div class="home-inner">
		<!-- Set-piece title block -->
		<header class="title-block">
			<p class="tagline reveal">Édition française définitive</p>

			<h1 class="title" aria-label="Catéchisme de l'Église Catholique">
				<span class="line line-1 reveal">Catéchisme</span>
				<span class="line line-2 reveal">
					<span class="flank" aria-hidden="true"></span>
					<i>de</i>
					<span class="flank" aria-hidden="true"></span>
				</span>
				<span class="line line-3 reveal">l'Église Catholique</span>
			</h1>

			<div class="ornament reveal" aria-hidden="true">
				<span class="fleuron">✠</span>
				<span class="rule"></span>
			</div>
		</header>

		<!-- Daily paragraph -->
		{#if data.paragraph}
			<section class="daily reveal r-daily" aria-labelledby="daily-heading">
				<h2 id="daily-heading" class="daily-eyebrow">Paragraphe du jour</h2>
				<div class="daily-row">
					<a
						href="/ccc/{data.dailyNumber}"
						class="daily-mark"
						aria-label="Lire le paragraphe {data.dailyNumber} dans son contexte"
					>
						<span class="section-mark">§</span>
						<span class="section-num">{data.dailyNumber}</span>
					</a>
					<div class="daily-text">
						<div class="prose-teaser">{@html teaserHtml}</div>
						<a class="daily-link" href="/ccc/{data.dailyNumber}">
							Lire le contexte <span aria-hidden="true">→</span>
						</a>
					</div>
				</div>
			</section>
		{/if}

		<!-- Secondary nav row -->
		<nav class="nav-row reveal r-nav" aria-label="Navigation principale">
			<a href="/ccc/sommaire">Sommaire</a>
			<span class="bullet" aria-hidden="true">·</span>
			<a href="/recherche">Recherche</a>
			<span class="bullet" aria-hidden="true">·</span>
			<a href="/bible">Bible</a>
			<span class="bullet" aria-hidden="true">·</span>
			<a href="/glossaire">Glossaire</a>
		</nav>
	</div>

	<!-- Printer's mark -->
	<aside class="imprint reveal r-imprint" aria-hidden="true">
		MMXXVI · Édition française
	</aside>
</main>

<style>
	.home {
		position: relative;
		min-height: calc(100vh - 80px);
		min-height: calc(100dvh - 80px);
		padding: clamp(0.75rem, 2vh, 2rem) 1.5rem clamp(2.25rem, 5vh, 3rem);
		background: var(--color-bg);
		color: var(--color-fg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		overflow: hidden;
	}

	/* Suppress the body scrollbar while the homepage is mounted. The layout
	   is sized to fit one screen; if a one-pixel rounding pushes content past
	   the viewport, no scrollbar appears. Short viewports below 600px tall
	   restore scrolling so nothing gets clipped. */
	:global(body.home-route) {
		overflow-y: hidden;
	}
	@media (max-height: 600px) {
		:global(body.home-route) {
			overflow-y: auto;
		}
	}
	.home-inner {
		width: 100%;
		max-width: 1100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.85rem, 2vh, 1.75rem);
		flex: 1;
		justify-content: space-between;
	}

	/* Title block ------------------------------------------------------- */
	.title-block {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.5rem, 1.4vh, 1rem);
	}
	.tagline {
		font-family: var(--font-ui);
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 3rem 0 0;
		padding-left: 0.32em; /* visually compensate trailing tracking */
	}
	.title {
		margin: 1.2rem 0 0;
		font-family: 'Libre Baskerville', Georgia, serif;
		color: var(--color-heading, var(--color-fg));
		text-align: center;
		line-height: 1.05;
	}
	.line {
		display: block;
	}
	.line-1,
	.line-3 {
		font-weight: 700;
		font-size: clamp(2rem, 5vw, 3.5rem);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.line-2 {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75em;
		font-weight: 400;
		font-size: clamp(1rem, 2.1vw, 1.4rem);
		color: var(--color-muted);
		margin: 0.35em 0;
	}
	.line-2 i {
		font-style: italic;
	}
	.flank {
		display: inline-block;
		width: clamp(2.25rem, 5vw, 4rem);
		height: 1px;
		background: currentColor;
		opacity: 0.55;
	}

	.ornament {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		margin-top: 2rem;
		margin-bottom: -0.5rem;
	}
	.fleuron {
		font-family: 'Libre Baskerville', Georgia, serif;
		font-size: 1.25rem;
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
	}
	.rule {
		display: block;
		width: 64px;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent),
			transparent
		);
	}

	/* Daily paragraph --------------------------------------------------- */
	.daily {
		width: 100%;
		max-width: 720px;
	}
	.daily-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 1rem;
		padding-left: 0.28em; /* compensate trailing tracking */
		text-align: center;
	}
	.daily-row {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1.25rem;
		align-items: start;
	}
	.daily-mark {
		display: flex;
		align-items: baseline;
		gap: 0.35em;
		font-family: var(--font-heading);
		color: var(--color-accent);
		text-decoration: none;
		line-height: 1;
		padding-top: 0.05em;
		transition: color 120ms ease;
	}
	.daily-mark:hover {
		color: var(--color-accent-text);
	}
	.section-mark {
		font-size: 1.5rem;
		font-weight: 400;
		font-style: italic;
		letter-spacing: -0.02em;
	}
	.section-num {
		font-size: 1.2rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		font-variant-numeric: oldstyle-nums;
	}

	.daily-text {
		min-width: 0;
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-fg);
	}
	.prose-teaser {
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-fg);
		hyphens: auto;
	}
	/* The Catechism HTML wraps the body in a <span>. Make it block-level so
	   it can lay out as a paragraph and respect line-height. */
	.prose-teaser :global(span) {
		display: inline;
	}
	.daily-link {
		display: inline-block;
		margin-top: 0.85rem;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
		transition: opacity 120ms ease;
	}
	.daily-link:hover {
		opacity: 0.75;
	}

	/* Nav row ----------------------------------------------------------- */
	.nav-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.65rem 0.85rem;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.nav-row a {
		color: inherit;
		text-decoration: none;
		padding: 0.15rem 0;
		border-bottom: 1px solid transparent;
		transition: color 120ms ease, border-color 120ms ease;
	}
	.nav-row a:hover {
		color: var(--color-accent);
		border-bottom-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	.bullet {
		color: color-mix(in srgb, var(--color-fg) 35%, transparent);
		user-select: none;
	}

	/* Imprint ----------------------------------------------------------- */
	.imprint {
		position: absolute;
		right: 1.5rem;
		bottom: 1rem;
		font-family: var(--font-ui);
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-fg) 38%, transparent);
		pointer-events: none;
		user-select: none;
	}


	/* Reveal — simple fade, all elements together. */
	.reveal {
		opacity: 0;
		animation: reveal-in 280ms ease-out forwards;
	}

	@keyframes reveal-in {
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal {
			animation: none;
			opacity: 1;
		}
	}

	/* Small viewports --------------------------------------------------- */
	@media (max-width: 640px) {
		.daily-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		.section-mark { font-size: 2.1rem; }
		.section-num { font-size: 1.1rem; }
		.imprint {
			position: static;
			margin-top: 1.5rem;
			text-align: center;
		}
	}

	/* Short viewports — keep it on one screen at 1280×800. */
	@media (max-height: 820px) {
		.line-1,
		.line-3 { font-size: clamp(2rem, 5vw, 3.5rem); }
		.line-2 { font-size: clamp(1rem, 2.1vw, 1.4rem); }
		.prose-teaser { font-size: 0.95rem; line-height: 1.65; }
	}
	@media (max-height: 720px) {
		.line-1,
		.line-3 { font-size: clamp(1.75rem, 4.5vw, 3rem); }
		.line-2 { font-size: clamp(0.95rem, 1.9vw, 1.25rem); }
		.prose-teaser { font-size: 0.9rem; line-height: 1.6; }
	}
</style>
