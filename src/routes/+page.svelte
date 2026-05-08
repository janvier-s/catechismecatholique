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

	const teaserHtml = $derived(data.paragraph ? cleanTeaserHtml(data.paragraph.text_html) : '');

	const jsonLdScript = $derived(
		`<${'script'} type="application/ld+json">${JSON.stringify({
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
		})}</${'script'}>`
	);
</script>

<svelte:head>
	<title>Catéchisme de l'Église Catholique · Édition française définitive</title>
	<meta
		name="description"
		content="Édition française définitive du Catéchisme de l'Église Catholique. Lecture, recherche et navigation par paragraphe, référence biblique et thème."
	/>
	<meta
		property="og:title"
		content="Catéchisme de l'Église Catholique · Édition française définitive"
	/>
	<meta
		property="og:description"
		content="Édition française définitive du Catéchisme de l'Église Catholique. Lecture, recherche et navigation par paragraphe, référence biblique et thème."
	/>
	<meta property="og:image" content="{page.url.origin}/img/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="Catéchisme de l'Église Catholique — Édition française définitive"
	/>
	{@html jsonLdScript}
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

		<!-- Founding quotation -->
		<figure class="founding-quote reveal r-quote">
			<blockquote>
				«&nbsp;Garder le dépôt de la foi, telle est la mission que le Seigneur a confiée à son
				Église et qu'elle accomplit en tout temps.&nbsp;»
			</blockquote>
			<figcaption>
				<img
					src="/img/popes/john-paul-ii-signature.svg"
					alt="Signature de Jean-Paul II."
					class="founding-signature"
					loading="lazy"
					width="1864"
					height="410"
				/>
				<span class="founding-attr">
					<strong>Saint Jean-Paul&nbsp;II</strong>,
					<a
						href="https://www.vatican.va/content/john-paul-ii/fr/apost_constitutions/documents/hf_jp-ii_apc_19921011_fidei-depositum.html"
						target="_blank"
						rel="noopener noreferrer"
					>
						<em>Fidei depositum</em>
					</a>
				</span>
			</figcaption>
		</figure>

		<!-- Daily paragraph -->
		{#if data.paragraph}
			<section class="daily reveal r-daily" aria-labelledby="daily-heading">
				<div class="daily-row">
					<h2 id="daily-heading" class="daily-eyebrow">Paragraphe du jour</h2>
					<a
						href="/cec/{data.dailyNumber}"
						class="daily-mark"
						aria-label="Lire le paragraphe {data.dailyNumber} dans son contexte"
					>
						<span class="section-num">{data.dailyNumber}</span>
					</a>
					<div class="daily-text">
						<div class="prose-teaser">{@html teaserHtml}</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- Primary CTA -->
		<a class="cta-primary reveal r-cta" href="/cec">
			Lire le Catéchisme
			<span class="cta-arrow" aria-hidden="true">→</span>
		</a>
	</div>

	<!-- Printer's mark -->
	<aside class="imprint reveal r-imprint" aria-hidden="true">MMXXVI · Édition française</aside>
</main>

<style>
	.home {
		position: relative;
		min-height: calc(100vh - 80px);
		min-height: calc(100dvh - 80px);
		padding: clamp(2rem, 5vh, 3.5rem) 1.5rem clamp(3rem, 6vh, 4.5rem);
		background: var(--color-bg);
		color: var(--color-fg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
	}

	.home-inner {
		width: 100%;
		max-width: 1100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(2rem, 4vh, 3rem);
		flex: 1;
		justify-content: flex-start;
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
		grid-area: eyebrow;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.75rem;
		padding-left: 0.28em; /* compensate trailing tracking */
		text-align: left;
	}
	.daily-row {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-areas:
			'. eyebrow'
			'mark prose';
		column-gap: 1.25rem;
		align-items: start;
	}
	.daily-mark {
		grid-area: mark;
		display: flex;
		align-self: start;
		gap: 0.35em;
		font-family: var(--font-heading);
		color: var(--color-accent);
		text-decoration: none;
		line-height: 1;
		transition: color 120ms ease;
	}
	.daily-mark:hover {
		color: var(--color-accent-text);
	}
	.daily-mark:hover .section-num {
		text-decoration: underline;
		text-underline-offset: 4px;
		text-decoration-thickness: 1px;
	}
	.section-num {
		font-size: 1.2rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		font-variant-numeric: oldstyle-nums;
		/* Align cap-height with the first line of prose-teaser
		   (1rem * 1.7 line-height ≈ 1.7rem; nudge to visual cap top). */
		margin-top: 0.32rem;
	}

	.daily-text {
		grid-area: prose;
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

	/* Founding quotation — quiet epigraph with a small inked signature.
	   Sits between the daily paragraph and the nav row. */
	.founding-quote {
		max-width: 38rem;
		margin: 0 auto 1.5rem;
		text-align: center;
	}
	.founding-quote blockquote {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: clamp(0.95rem, 1.6vw, 1.05rem);
		line-height: 1.6;
		color: var(--color-fg);
		margin: 0 0 0.75rem;
		padding: 0 0.5rem;
	}
	.founding-quote figcaption {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.founding-signature {
		display: block;
		height: 32px;
		width: auto;
		max-width: 180px;
		opacity: 0.7;
	}
	/* Dark-mode signature inversion is in app.css so it covers
	   data-theme=dark, oled, and auto+OS-dark uniformly. */
	.founding-attr {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-subtle);
	}
	.founding-attr strong {
		font-weight: 600;
		color: var(--color-fg);
	}
	.founding-attr a {
		color: inherit;
		text-decoration-color: var(--color-border);
		text-underline-offset: 2px;
	}
	.founding-attr a:hover {
		color: var(--color-accent);
	}

	/* Primary CTA — accent-coloured pill that takes the visual focus
	   previously held by the secondary nav row. */
	.cta-primary {
		align-self: center;
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.95rem 2rem;
		background: var(--color-accent);
		color: #fff;
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		text-decoration: none;
		border-radius: 4px;
		transition:
			background 150ms ease,
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.cta-primary:hover {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
	}
	.cta-primary:hover .cta-arrow {
		transform: translateX(4px);
	}
	.cta-arrow {
		display: inline-block;
		line-height: 1;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
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
		color: color-mix(in srgb, var(--color-fg) 60%, transparent);
		pointer-events: none;
		user-select: none;
	}

	/* Reveal — gentle slide-up, all elements together. Avoids opacity fade so
	   the hero title is eligible as the page's LCP candidate (an opacity:0
	   element is skipped by browser LCP detection, which made Lighthouse pick
	   the topbar search placeholder instead). */
	.reveal {
		transform: translateY(6px);
		animation: reveal-in 280ms ease-out forwards;
	}

	@keyframes reveal-in {
		to {
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal {
			animation: none;
			transform: none;
		}
	}

	/* Small viewports --------------------------------------------------- */
	@media (max-width: 640px) {
		.home {
			padding-top: 0.5rem;
			padding-bottom: 1.75rem;
		}
		.tagline {
			margin-top: 1rem;
			font-size: 0.68rem;
			letter-spacing: 0.28em;
			text-align: center;
			width: 100%;
		}
		.title {
			margin-top: 0.5rem;
		}
		.line-1,
		.line-3 {
			font-size: clamp(1.75rem, 9vw, 2.5rem);
		}
		.line-2 {
			font-size: clamp(0.9rem, 3vw, 1.1rem);
			margin: 0.25em 0;
		}
		.ornament {
			margin-top: 0.85rem;
			margin-bottom: 0;
		}
		.daily {
			margin-top: 0.5rem;
		}
		.daily-eyebrow {
			margin-bottom: 0.6rem;
		}
		.daily-row {
			grid-template-columns: 1fr;
			grid-template-areas:
				'eyebrow'
				'mark'
				'prose';
			gap: 0.4rem;
			justify-items: center;
			text-align: center;
		}
		.daily-mark {
			justify-content: center;
			margin-top: 0;
		}
		.daily-text {
			text-align: left;
		}
		.section-num {
			font-size: 1rem;
			margin-top: 0;
		}
		.prose-teaser {
			font-size: 0.95rem;
			line-height: 1.62;
		}
		.imprint {
			position: static;
			margin-top: 1.25rem;
			text-align: center;
		}
		.founding-quote blockquote {
			font-size: 0.92rem;
			padding: 0 0.25rem;
		}
		.founding-signature {
			height: 28px;
		}
		.founding-attr {
			font-size: 0.62rem;
			letter-spacing: 0.16em;
		}
	}

	/* Short viewports — keep it on one screen at 1280×800. */
	@media (max-height: 820px) {
		.line-1,
		.line-3 {
			font-size: clamp(2rem, 5vw, 3.5rem);
		}
		.line-2 {
			font-size: clamp(1rem, 2.1vw, 1.4rem);
		}
		.prose-teaser {
			font-size: 0.95rem;
			line-height: 1.65;
		}
		.founding-quote blockquote {
			font-size: 0.95rem;
		}
		.founding-signature {
			height: 28px;
		}
	}
	@media (max-height: 720px) {
		.line-1,
		.line-3 {
			font-size: clamp(1.75rem, 4.5vw, 3rem);
		}
		.line-2 {
			font-size: clamp(0.95rem, 1.9vw, 1.25rem);
		}
		.prose-teaser {
			font-size: 0.9rem;
			line-height: 1.6;
		}
	}
</style>
