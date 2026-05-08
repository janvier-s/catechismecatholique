<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * Render a prayer body string into HTML.
	 * Bodies may contain:
	 *   - literal HTML spans/tags (e.g. <span style="font-style:italic">…</span>)
	 *   - plain text lines separated by \n (line break within stanza)
	 *   - \n\n between stanzas (paragraph break)
	 */
	function renderBody(raw: string): string {
		const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		const stanzas = text.split(/\n\n+/);
		return stanzas
			.map((stanza) => {
				const lines = stanza.split('\n');
				const inner = lines.join('<br />');
				return `<p class="prayer-stanza">${inner}</p>`;
			})
			.join('');
	}

	// Build the right-sticky TOC: each prayer + each section heading gets an
	// entry. Section headings stand alone; prayers nest under the most recent
	// heading. We render flat with section dividers.
	type TocEntry = { id: string; label: string; kind: 'section' | 'prayer' };
	// Map from flow index → element id. Headings already carry node.id; we
	// synthesise prayer-N-N ids for prayer cards.
	const idByFlowIdx: Record<number, string> = {};
	const tocItems: TocEntry[] = (() => {
		const out: TocEntry[] = [];
		let prayerIdx = 0;
		let lastHeadingPos = 0;
		for (let i = 0; i < data.part.flow.length; i++) {
			const node = data.part.flow[i]!;
			if (node.kind === 'heading') {
				idByFlowIdx[i] = node.id;
				lastHeadingPos = out.length;
				out.push({ id: node.id, label: node.title, kind: 'section' });
				prayerIdx = 0;
			} else if (node.kind === 'prayer' && node.fr.title) {
				prayerIdx++;
				const id = `prayer-${lastHeadingPos}-${prayerIdx}`;
				idByFlowIdx[i] = id;
				out.push({ id, label: node.fr.title, kind: 'prayer' });
			}
		}
		return out;
	})();

	// Track which TOC entry is in view (scroll-spy).
	let activeId = $state(tocItems[0]?.id ?? '');

	$effect(() => {
		if (typeof window === 'undefined') return;
		const onScroll = () => {
			const threshold = window.innerHeight * 0.25;
			let current = tocItems[0]?.id ?? '';
			for (const it of tocItems) {
				const el = document.getElementById(it.id);
				if (!el) continue;
				if (el.getBoundingClientRect().top <= threshold) current = it.id;
			}
			if (current !== activeId) activeId = current;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<svelte:head>
	<title>Prières & formules · Catéchisme de l'Église catholique</title>
	<meta
		name="description"
		content="Prières communes et formules de la doctrine catholique : Pater noster, Credo, Confiteor, Décalogue, vertus, dons du Saint-Esprit."
	/>
</svelte:head>

<main class="missal">
	<!-- ═══════════════════ PAGE HEADER ═══════════════════ -->
	<header class="missal-head">
		<p class="missal-eyebrow">Annexe</p>
		<h1 class="missal-title">Prières &amp; formules</h1>
		<div class="missal-ornament" aria-hidden="true">
			<span class="missal-rule missal-rule-l"></span>
			<span class="missal-fleuron">✠</span>
			<span class="missal-rule missal-rule-r"></span>
		</div>
		<p class="missal-lede">
			Le Pater, le Credo, le Confiteor, et les formules essentielles de la doctrine,
			en&nbsp;français et en&nbsp;latin.
		</p>
	</header>

	<!-- ═══════════════════ FLOW ═══════════════════ -->
	<div class="missal-body">
		{#each data.part.flow as node, i (i)}
			{#if node.kind === 'heading'}
				<!-- Section heading — both levels render the same here (all are h2) -->
				<div class="section-head" id={node.id}>
					<div class="section-rule" aria-hidden="true">
						<span class="section-rule-line"></span>
						<span class="section-fleuron">✠</span>
						<span class="section-rule-line"></span>
					</div>
					<h2 class="section-title">{node.title}</h2>
				</div>
			{:else if node.kind === 'prayer'}
				<!-- Bilingual prayer card -->
				<article
					class="prayer-pair"
					id={idByFlowIdx[i] || undefined}
					class:prayer-pair--separator={i > 0 && data.part.flow[i - 1]?.kind === 'prayer'}
				>
					<!-- French column -->
					<div class="prayer-col prayer-col--fr" lang="fr">
						{#if node.fr.title}
							<h3 class="prayer-title prayer-title--fr">{node.fr.title}</h3>
						{/if}
						<div class="prayer-body">{@html renderBody(node.fr.body)}</div>
					</div>

					<!-- Latin column -->
					<div class="prayer-col prayer-col--la" lang="la">
						{#if node.la?.title}
							<h3 class="prayer-title prayer-title--la">{node.la.title}</h3>
						{:else if node.fr.title}
							<!-- Preserve vertical alignment even when Latin has no title -->
							<span class="prayer-title-spacer" aria-hidden="true"></span>
						{/if}
						{#if node.la?.body}
							<div class="prayer-body prayer-body--la">{@html renderBody(node.la.body)}</div>
						{/if}
					</div>
				</article>
			{:else if node.kind === 'prose'}
				<!-- Doctrine formula block — monolingual, typographically careful -->
				<div
					class="doctrine-block"
					class:doctrine-heading={node.html.startsWith('<span style="font-weight: bold;')}
				>
					<div class="doctrine-html">{@html node.html}</div>
				</div>
			{/if}
		{/each}
	</div>

	<!-- Footer ornament -->
	<footer class="missal-foot" aria-hidden="true">
		<span class="missal-fleuron">✠</span>
	</footer>
</main>

{#if tocItems.length > 1}
	<aside class="missal-toc" aria-label="Sommaire des prières">
		<p class="toc-label">Sommaire</p>
		<ul class="toc-list">
			{#each tocItems as item (item.id)}
				<li class:toc-active={activeId === item.id} class:toc-section={item.kind === 'section'}>
					<a href="#{item.id}">{item.label}</a>
				</li>
			{/each}
		</ul>
	</aside>
{/if}

<style>
	/* ─────────────────────────────────────────────────────────────────
	   Layout tokens
	──────────────────────────────────────────────────────────────────── */
	.missal {
		--rh: 1.6rem; /* baseline rhythm unit */
		--col-gap: clamp(1.5rem, 4vw, 3.5rem);
		--page-max: 900px;
		--prayer-sep-color: color-mix(in srgb, var(--color-fg) 14%, transparent);
		--latin-color: var(--color-subtle);

		max-width: var(--page-max);
		margin: 0 auto;
		padding: calc(var(--rh) * 2) clamp(1.25rem, 5vw, 2.5rem) calc(var(--rh) * 5);
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	/* ─────────────────────────────────────────────────────────────────
	   Page header
	──────────────────────────────────────────────────────────────────── */
	.missal-head {
		text-align: center;
		margin-bottom: calc(var(--rh) * 3.5);
	}

	.missal-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 calc(var(--rh) * 0.6);
		padding-left: 0.32em;
	}

	.missal-title {
		font-family: var(--font-heading);
		font-size: clamp(2.4rem, 6vw, 4rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		color: var(--color-heading, var(--color-fg));
		margin: 0;
	}

	/* ── Fleuron ornament ── */
	.missal-ornament {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.9rem;
		margin: calc(var(--rh) * 0.75) 0;
	}

	.missal-fleuron,
	.section-fleuron {
		font-family: var(--font-heading);
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
		flex: none;
	}

	.missal-fleuron {
		font-size: 1.1rem;
	}

	.missal-rule {
		display: block;
		height: 1px;
		width: 88px;
	}

	.missal-rule-l {
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 28%, transparent)
		);
	}

	.missal-rule-r {
		background: linear-gradient(
			to left,
			transparent,
			color-mix(in srgb, var(--color-fg) 28%, transparent)
		);
	}

	.missal-lede {
		max-width: 42ch;
		margin: 0 auto;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-subtle);
	}

	/* ─────────────────────────────────────────────────────────────────
	   Section headings
	──────────────────────────────────────────────────────────────────── */
	.section-head {
		text-align: center;
		margin: calc(var(--rh) * 3) 0 calc(var(--rh) * 2);
	}

	.section-rule {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: calc(var(--rh) * 0.6);
	}

	.section-rule-line {
		flex: 1;
		height: 1px;
		background: color-mix(in srgb, var(--color-fg) 16%, transparent);
	}

	.section-fleuron {
		font-size: 0.85rem;
		opacity: 0.7;
	}

	.section-title {
		font-family: var(--font-heading);
		font-size: clamp(1rem, 2.5vw, 1.4rem);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-heading, var(--color-fg));
		margin: 0;
	}

	/* ─────────────────────────────────────────────────────────────────
	   Prayer pairs — bilingual side-by-side
	──────────────────────────────────────────────────────────────────── */
	.prayer-pair {
		display: grid;
		/* 10fr | 1px separator | 10fr — equal columns */
		grid-template-columns: 10fr 1px 10fr;
		column-gap: var(--col-gap);
		align-items: start;
		padding: calc(var(--rh) * 1.4) 0 calc(var(--rh) * 1.2);
		position: relative;
	}

	/* Hairline top separator between consecutive prayer pairs */
	.prayer-pair--separator {
		border-top: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
	}

	/* The 1px centre column renders as a vertical rule */
	.prayer-pair::after {
		content: '';
		display: block;
		/* Occupies the second grid column (the 1px gap column) */
		grid-column: 2;
		grid-row: 1;
		width: 1px;
		height: 100%;
		background: color-mix(in srgb, var(--color-border) 55%, transparent);
		align-self: stretch;
	}

	/* French column */
	.prayer-col--fr {
		grid-column: 1;
	}

	/* Latin column */
	.prayer-col--la {
		grid-column: 3;
	}

	/* ── Prayer column internals ── */
	.prayer-title {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		margin: 0 0 calc(var(--rh) * 0.7);
		line-height: 1.25;
	}

	.prayer-title--fr {
		color: var(--color-fg);
	}

	.prayer-title--la {
		color: var(--color-fg);
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 1.05rem;
	}

	/* Keep French and Latin titles vertically aligned when Latin title is absent */
	.prayer-title-spacer {
		display: block;
		/* Same height as .prayer-title + its margin */
		height: calc(1.05rem * 1.25 + var(--rh) * 0.7);
		margin-bottom: calc(var(--rh) * 0.7);
	}

	.prayer-body {
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.85;
		color: var(--color-fg);
	}

	.prayer-body--la {
		font-size: 1rem;
		line-height: 1.85;
		color: var(--color-fg);
	}

	/* Stanza paragraphs rendered by renderBody() */
	:global(.prayer-stanza) {
		margin: 0 0 calc(var(--rh) * 0.65);
	}

	:global(.prayer-stanza:last-child) {
		margin-bottom: 0;
	}

	/* Inline HTML in prayer bodies (e.g. <b>, <i>, <span style="...">) */
	:global(.prayer-body b),
	:global(.prayer-body strong) {
		font-weight: 700;
	}

	:global(.prayer-body i),
	:global(.prayer-body em) {
		font-style: italic;
	}

	/* ─────────────────────────────────────────────────────────────────
	   Doctrine section (prose nodes)
	──────────────────────────────────────────────────────────────────── */
	.doctrine-block {
		max-width: 52ch;
		margin: 0 auto calc(var(--rh) * 0.5);
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.75;
		color: var(--color-fg);
	}

	/* Bold-cap blocks are subheadings — add breathing room above */
	.doctrine-heading {
		margin-top: calc(var(--rh) * 1.75);
		margin-bottom: calc(var(--rh) * 0.1);
	}

	/* The raw HTML uses inline <span> + <b> for structure — normalise */
	:global(.doctrine-html b),
	:global(.doctrine-html strong) {
		font-weight: 700;
		color: var(--color-fg);
	}

	:global(.doctrine-html i),
	:global(.doctrine-html em) {
		font-style: italic;
		color: var(--color-subtle);
	}

	/* Non-breaking spaces before refs look better with a touch of letter-spacing */
	:global(.doctrine-html span[style*='font-weight: bold']) {
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	/* ─────────────────────────────────────────────────────────────────
	   Footer
	──────────────────────────────────────────────────────────────────── */
	.missal-foot {
		text-align: center;
		margin-top: calc(var(--rh) * 4);
		color: var(--color-muted);
		font-size: 1rem;
		opacity: 0.6;
	}

	/* ─────────────────────────────────────────────────────────────────
	   Responsive — stack columns below 700px
	──────────────────────────────────────────────────────────────────── */
	@media (max-width: 699px) {
		.prayer-pair {
			/* Stack: single column, no rule */
			grid-template-columns: 1fr;
			grid-template-rows: auto;
			padding: calc(var(--rh) * 1.2) 0;
		}

		/* Hide the centre rule column */
		.prayer-pair::after {
			display: none;
		}

		.prayer-col--fr {
			grid-column: 1;
			grid-row: 1;
		}

		.prayer-col--la {
			grid-column: 1;
			grid-row: 2;
			/* Visual separator: dotted rule above Latin */
			border-top: 1px dashed color-mix(in srgb, var(--color-border) 80%, transparent);
			padding-top: calc(var(--rh) * 0.75);
			margin-top: calc(var(--rh) * 0.75);
		}

		/* Suppress the title-spacer on mobile — no alignment needed */
		.prayer-title-spacer {
			display: none;
		}

		.doctrine-block {
			max-width: 100%;
		}
	}

	/* ─────────────────────────────────────────────────────────────────
	   Reduced motion
	──────────────────────────────────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		* {
			transition: none !important;
		}
	}

	/* ─────────────────────────────────────────────────────────────────
	   Right-sticky TOC (mirrors the /a-propos pattern)
	──────────────────────────────────────────────────────────────────── */
	.missal-toc {
		position: fixed;
		right: 24px;
		top: 100px;
		width: 220px;
		max-height: calc(100vh - 120px);
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
	}
	.toc-label {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.24em;
		color: var(--color-accent-text);
		margin: 0 0 12px;
		opacity: 0.85;
	}
	.toc-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.toc-list li a {
		display: block;
		font-family: var(--font-ui);
		/* Normalise the mixed-case source data ("DOXOLOGIE" vs "Notre Père"
		   vs "Angelus") to a uniform uppercase rhythm in the TOC. */
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 11px;
		line-height: 1.45;
		padding: 3px 0;
		color: var(--color-subtle);
		text-decoration: none;
		opacity: 0.8;
		transition:
			color 200ms ease,
			opacity 200ms ease;
	}
	.toc-list li a:hover {
		color: var(--color-fg);
		opacity: 1;
	}
	.toc-list li.toc-active a {
		color: var(--color-accent-text);
		opacity: 1;
		font-weight: 600;
	}
	.toc-list li.toc-section {
		margin-top: 0.7rem;
	}
	.toc-list li.toc-section:first-child {
		margin-top: 0;
	}
	.toc-list li.toc-section a {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: var(--color-accent-text);
		padding: 4px 0 4px;
		opacity: 1;
	}
	@media (max-width: 1100px) {
		.missal-toc {
			display: none;
		}
	}
</style>
