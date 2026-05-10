<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Sommaire · Catéchisme illustré des vérités nécessaires</title>
	<meta
		name="description"
		content="Table des matières du Catéchisme illustré des vérités nécessaires : préface, introduction, douze leçons et annexes."
	/>
</svelte:head>

<main class="toc">
	<header class="toc-head">
		<p class="eyebrow">Catéchisme illustré des vérités nécessaires</p>
		<h1 class="title">Sommaire</h1>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>
		<p class="lede">
			{data.structure.subtitle}.<br />Préface, introduction, {data.structure.chapters.length} leçons,
			deux annexes.
		</p>
		<div class="toc-actions">
			<a class="index-link" href="/catechisme-illustre">← Retour à l'accueil</a>
		</div>
	</header>

	<div class="parts">
		{#if data.structure.front_matter.length > 0}
			<article class="part">
				<header class="part-head">
					<h2 class="part-title">Avant-propos</h2>
				</header>
				<div class="chapters">
					{#each data.structure.front_matter as page (page.slug)}
						<a class="row row-chapter" href="/catechisme-illustre/{page.slug}">
							<span class="row-label">
								<span class="label-title">{page.title}</span>
							</span>
							<span class="dotleader" aria-hidden="true"></span>
						</a>
					{/each}
				</div>
			</article>
		{/if}

		<article class="part">
			<header class="part-head">
				<h2 class="part-title">Les douze leçons</h2>
			</header>
			<div class="chapters">
				{#each data.structure.chapters as ch (ch.slug)}
					<a class="row row-chapter" href="/catechisme-illustre/{ch.slug}">
						<span class="row-label">
							<span class="label-title">{ch.roman}. {ch.title}</span>
						</span>
						<span class="dotleader" aria-hidden="true"></span>
					</a>
				{/each}
			</div>
		</article>

		{#if data.structure.back_matter.length > 0}
			<article class="part">
				<header class="part-head">
					<h2 class="part-title">Annexes</h2>
				</header>
				<div class="chapters">
					{#each data.structure.back_matter as page (page.slug)}
						<a class="row row-chapter" href="/catechisme-illustre/{page.slug}">
							<span class="row-label">
								<span class="label-title">{page.title}</span>
							</span>
							<span class="dotleader" aria-hidden="true"></span>
						</a>
					{/each}
				</div>
			</article>
		{/if}
	</div>

	<footer class="toc-foot" aria-hidden="true">
		<span class="fleuron">✠</span>
	</footer>
</main>

<style>
	.toc {
		--rh: 1.5rem;
		--hover-tint: color-mix(in srgb, var(--color-accent) 6%, transparent);
		max-width: 920px;
		margin: 0 auto;
		padding: calc(var(--rh) * 2.5) clamp(1.25rem, 4vw, 2.5rem) calc(var(--rh) * 4);
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	.toc-head {
		text-align: center;
		margin-bottom: calc(var(--rh) * 4);
	}
	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 calc(var(--rh) * 0.75);
	}
	.title {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: clamp(3rem, 7vw, 4.75rem);
		line-height: 1;
		letter-spacing: -0.01em;
		color: var(--color-heading, var(--color-fg));
		margin: 0;
	}
	.ornament {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		margin-top: calc(var(--rh) * 0.85);
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
	}
	.rule {
		display: block;
		width: 88px;
		height: 1px;
	}
	.rule-l {
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent)
		);
	}
	.rule-r {
		background: linear-gradient(
			to left,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent)
		);
	}
	.lede {
		max-width: 36ch;
		margin: calc(var(--rh) * 1.1) auto 0;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}
	.toc-actions {
		margin-top: calc(var(--rh) * 1.25);
	}
	.index-link {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
	}
	.index-link:hover {
		text-decoration: underline;
	}

	.parts {
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 4);
	}
	.part-head {
		margin-bottom: calc(var(--rh) * 1.25);
		padding-bottom: calc(var(--rh) * 0.5);
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.chapters {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-left: clamp(0.85rem, 2.4vw, 1.5rem);
	}
	.row {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		text-decoration: none;
		color: var(--color-fg);
		padding: 0.3rem 0.5rem 0.3rem 0;
		margin-left: -0.5rem;
		padding-left: 0.5rem;
		border-radius: 2px;
		transition:
			background-color 140ms ease,
			color 140ms ease;
	}
	.row:hover {
		background-color: var(--hover-tint);
	}
	.row:hover .label-title {
		color: var(--color-accent);
	}
	.label-title {
		font-family: var(--font-ui);
		font-size: 1rem;
		font-weight: 500;
	}
	.dotleader {
		flex: 1 1 auto;
		min-width: 1.5rem;
		align-self: end;
		height: 1px;
		margin-bottom: 0.5em;
		background-image: radial-gradient(
			circle,
			color-mix(in srgb, var(--color-fg) 28%, transparent) 0.5px,
			transparent 1px
		);
		background-size: 6px 2px;
		background-repeat: repeat-x;
		background-position: 0 50%;
		opacity: 0.7;
	}

	.toc-foot {
		text-align: center;
		margin-top: calc(var(--rh) * 4);
		opacity: 0.6;
	}
	.toc-foot .fleuron {
		font-size: 1rem;
	}
</style>
