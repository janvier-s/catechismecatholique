<script lang="ts">
	import type { PageData } from './$types';
	import type { TrentStructure } from '$lib/data/types';

	let { data }: { data: PageData } = $props();

	const structure = $derived(data.structure as TrentStructure);

	function fmtRange(r: [number, number]): string {
		return r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`;
	}
</script>

<svelte:head>
	<title>Sommaire · Catéchisme du Concile de Trente</title>
	<meta
		name="description"
		content="Table des matières du Catéchisme du Concile de Trente : prologue, quatre parties, 47 chapitres et 282 sections."
	/>
</svelte:head>

<main class="toc">
	<header class="toc-head">
		<p class="eyebrow">Table des matières</p>
		<h1 class="title">Sommaire</h1>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>
		<p class="lede">
			Un prologue, quatre parties.<br />
			La foi, les sacrements, les commandements et la prière.
		</p>
		<div class="toc-actions">
			<a class="index-link" href="/trente">← Retour à l'accueil</a>
		</div>
	</header>

	<div class="parts">
		{#each structure.parts as part, i (part.slug)}
			<article class="part" class:is-prologue={i === 0}>
				<header class="part-head">
					{#if i > 0}
						<p class="part-eyebrow">
							{['Première', 'Deuxième', 'Troisième', 'Quatrième'][i - 1]} partie
						</p>
					{/if}
					<h2 class="part-title">{part.title}</h2>
				</header>

				<div class="chapters">
					{#each part.chapters as ch (ch.slug)}
						<div class="chapter-block">
							<div class="row row-chapter">
								<span class="row-label">
									{#if ch.number > 0}
										<span class="label-tag">Chapitre {ch.number}</span>
									{/if}
									<span class="label-title">{ch.title}</span>
								</span>
								<span class="dotleader" aria-hidden="true"></span>
								<span class="row-range">{fmtRange(ch.paragraph_range)}</span>
							</div>

							{#if ch.sections.length > 1}
								<ul class="sections" role="list">
									{#each ch.sections as sec (sec.slug)}
										<li>
											<a class="row row-section" href="/trente/{ch.slug}/{sec.slug}">
												<span class="label-title">{sec.title}</span>
												<span class="dotleader" aria-hidden="true"></span>
												<span class="row-range">{fmtRange(sec.paragraph_range)}</span>
											</a>
										</li>
									{/each}
								</ul>
							{:else if ch.sections.length === 1}
								<ul class="sections" role="list">
									{#each ch.sections as sec (sec.slug)}
										<li>
											<a class="row row-section" href="/trente/{ch.slug}/{sec.slug}">
												<span class="label-title">{sec.title}</span>
												<span class="dotleader" aria-hidden="true"></span>
												<span class="row-range">{fmtRange(sec.paragraph_range)}</span>
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}
				</div>
			</article>
		{/each}
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

	/* ---- Title block ---------------------------------------------------- */
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
		padding-left: 0.32em;
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
		color: var(--color-accent-text);
	}

	/* ---- Parts ---------------------------------------------------------- */
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
	.part-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 calc(var(--rh) * 0.35);
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.005em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}

	.part.is-prologue .part-head {
		margin-bottom: calc(var(--rh) * 0.25);
		padding-bottom: 0;
		border-bottom: none;
	}
	.part.is-prologue .part-title {
		font-size: 1.2rem;
		font-weight: 600;
	}

	/* ---- Chapters ------------------------------------------------------- */
	.chapters {
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 1);
		padding-left: clamp(0.85rem, 2.4vw, 1.5rem);
	}
	.chapter-block {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	/* ---- Rows (shared) -------------------------------------------------- */
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
		line-height: 1.55;
		transition:
			background-color 140ms ease,
			color 140ms ease;
	}
	.row:hover {
		background-color: var(--hover-tint);
	}
	.row-label {
		display: inline;
		min-width: 0;
	}
	.label-tag {
		font-family: var(--font-ui);
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		transition: color 140ms ease;
	}
	.label-title {
		margin-left: 0.4em;
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
	.row-range {
		flex: 0 0 auto;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.04em;
		color: var(--color-subtle);
		white-space: nowrap;
	}

	/* ---- Chapter row ---------------------------------------------------- */
	.row-chapter {
		font-family: var(--font-ui);
		font-size: 1rem;
		font-weight: 500;
	}
	.row-chapter .label-tag {
		color: var(--color-accent);
		opacity: 0.85;
	}

	/* ---- Section row ---------------------------------------------------- */
	.sections {
		list-style: none;
		padding: 0;
		margin: 0;
		padding-left: 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}
	.row-section {
		font-family: var(--font-body);
		font-size: 0.93rem;
		color: var(--color-muted);
		line-height: 1.5;
		padding-top: 0.18rem;
		padding-bottom: 0.18rem;
	}
	.row-section:hover {
		color: var(--color-accent);
	}
	.row-section .label-title {
		margin-left: 0;
	}

	/* ---- Footer --------------------------------------------------------- */
	.toc-foot {
		text-align: center;
		margin-top: calc(var(--rh) * 4);
		opacity: 0.6;
	}
	.toc-foot .fleuron {
		font-size: 1rem;
	}

	/* ---- Focus ---------------------------------------------------------- */
	.row:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	/* ---- Small viewports ------------------------------------------------ */
	@media (max-width: 640px) {
		.toc {
			padding-top: calc(var(--rh) * 1.5);
			padding-bottom: calc(var(--rh) * 2);
		}
		.toc-head {
			margin-bottom: calc(var(--rh) * 2.5);
		}
		.parts {
			gap: calc(var(--rh) * 2.5);
		}
		.dotleader {
			display: none;
		}
		.row-range {
			order: -1;
			flex: 0 0 auto;
			width: 3.5rem;
			text-align: left;
			font-size: 0.72rem;
		}
		.row-label {
			flex: 1 1 auto;
			min-width: 0;
		}
		.chapters {
			padding-left: 0.4rem;
		}
		.sections {
			padding-left: 0.85rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.row {
			transition: none;
		}
	}
</style>
