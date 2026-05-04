<script lang="ts">
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
</script>

<svelte:head>
	<title>Le Catéchisme — Catéchisme de l'Église catholique en français</title>
	<meta
		name="description"
		content="Édition française définitive du Catéchisme de l'Église catholique. Lecture, recherche et navigation par paragraphe, référence biblique et thème."
	/>
</svelte:head>

<main class="home">
	<div class="home-inner">
		<!-- Set-piece title block -->
		<header class="title-block">
			<p class="tagline reveal r-tagline">Édition française définitive</p>

			<h1 class="title" aria-label="Catéchisme de l'Église Catholique">
				<svg
					viewBox="0 0 1000 620"
					xmlns="http://www.w3.org/2000/svg"
					preserveAspectRatio="xMidYMid meet"
					class="title-svg"
					role="img"
					aria-hidden="true"
					focusable="false"
				>
					<text
						class="line line-1 reveal r-line-1"
						x="500"
						y="160"
						text-anchor="middle"
						textLength="940"
						lengthAdjust="spacingAndGlyphs"
						font-size="170"
						font-weight="700"
					>Catéchisme</text>
					<text
						class="line line-2 reveal r-line-2"
						x="500"
						y="350"
						text-anchor="middle"
						textLength="940"
						lengthAdjust="spacingAndGlyphs"
						font-size="170"
						font-weight="400"
					>de l'Église</text>
					<text
						class="line line-3 reveal r-line-3"
						x="500"
						y="540"
						text-anchor="middle"
						textLength="940"
						lengthAdjust="spacingAndGlyphs"
						font-size="170"
						font-weight="700"
					>Catholique</text>
				</svg>
			</h1>

			<div class="ornament reveal r-ornament" aria-hidden="true">
				<span class="fleuron">✠</span>
				<span class="rule"></span>
			</div>
		</header>

		<!-- Daily paragraph -->
		{#if data.paragraph}
			<section class="daily reveal r-daily" aria-labelledby="daily-heading">
				<h2 id="daily-heading" class="sr-only">Paragraphe du jour</h2>
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
		margin: 1.25rem 0 0;
		padding-left: 0.32em; /* visually compensate trailing tracking */
	}
	.title {
		width: clamp(300px, 38%, 520px);
		margin: 0;
		line-height: 1;
		color: var(--color-heading, var(--color-fg));
	}
	.title-svg {
		display: block;
		width: 100%;
		height: auto;
		font-family: 'Libre Baskerville', Georgia, serif;
		fill: currentColor;
	}
	.title-svg text {
		font-family: inherit;
	}
	/* Per-line reveal: each <text> animates its own opacity + translate. */
	.line {
		opacity: 0;
		transform: translateY(8px);
	}

	.ornament {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.1rem;
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

	/* sr-only helper ---------------------------------------------------- */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Reveal animation -------------------------------------------------- */
	.reveal {
		opacity: 0;
		transform: translateY(4px);
		animation: reveal-in 360ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
	.r-tagline  { animation-delay: 0ms; }
	.r-line-1   { animation-delay: 60ms; }
	.r-line-2   { animation-delay: 120ms; }
	.r-line-3   { animation-delay: 180ms; }
	.r-ornament { animation-delay: 240ms; }
	.r-daily    { animation-delay: 300ms; }
	.r-nav      { animation-delay: 360ms; }
	.r-imprint  { animation-delay: 420ms; }

	@keyframes reveal-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal,
		.line {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	/* Small viewports --------------------------------------------------- */
	@media (max-width: 640px) {
		.title { width: 88%; }
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
		.title { width: clamp(280px, 34%, 460px); }
		.prose-teaser { font-size: 0.95rem; line-height: 1.65; }
	}
	@media (max-height: 720px) {
		.title { width: clamp(260px, 30%, 420px); }
		.prose-teaser { font-size: 0.9rem; line-height: 1.6; }
	}
</style>
