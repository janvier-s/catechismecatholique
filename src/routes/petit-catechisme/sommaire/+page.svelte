<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function fmtRange(r: [number, number]): string {
		return r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`;
	}
</script>

<svelte:head>
	<title>Sommaire · Petit Catéchisme de saint Pie X</title>
	<meta
		name="description"
		content="Table des matières du Petit Catéchisme de saint Pie X : introduction, trois parties et {data
			.structure.total_qa} questions."
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
			Introduction, trois parties, {data.structure.total_qa} questions et réponses.<br />
			Le Credo, la Morale, les Sacrements et la Prière.
		</p>
		<div class="toc-actions">
			<a class="index-link" href="/petit-catechisme">← Retour à l'accueil</a>
		</div>
	</header>

	<div class="parts">
		<article class="part">
			<header class="part-head">
				<h2 class="part-title">{data.structure.intro.title}</h2>
			</header>
			<div class="chapters">
				<div class="chapter-block">
					<a class="row row-chapter" href="/petit-catechisme/{data.structure.intro.part_slug}">
						<span class="row-label">
							<span class="label-title">{data.structure.intro.title}</span>
						</span>
						<span class="dotleader" aria-hidden="true"></span>
						<span class="row-range">{fmtRange(data.structure.intro.qa_range)}</span>
					</a>
				</div>
			</div>
		</article>

		{#each data.structure.parts as part (part.slug)}
			<article class="part">
				<header class="part-head">
					<h2 class="part-title">{part.title}</h2>
					{#if part.subtitle}
						<p class="part-subtitle">{part.subtitle}</p>
					{/if}
				</header>

				<div class="chapters">
					{#if part.chapters}
						{#each part.chapters as ch (ch.slug)}
							<div class="chapter-block">
								<a class="row row-chapter" href="/petit-catechisme/{part.slug}/{ch.slug}">
									<span class="row-label">
										<span class="label-title">{ch.title}</span>
									</span>
									<span class="dotleader" aria-hidden="true"></span>
									<span class="row-range">{fmtRange(ch.qa_range)}</span>
								</a>
								{#if ch.sections && ch.sections.length > 0}
									<div class="sub-sections">
										{#each ch.sections as csec, si (si)}
											<a
												class="row row-section"
												href="/petit-catechisme/{part.slug}/{ch.slug}#s-{si}"
											>
												<span class="row-label">
													<span class="label-title">{csec.title}</span>
												</span>
												<span class="dotleader" aria-hidden="true"></span>
											</a>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					{:else if part.sections}
						{#each part.sections as sec (sec.slug)}
							<div class="section-group">
								<p class="section-label">{sec.title}</p>
								{#each sec.chapters as ch (ch.slug)}
									<div class="chapter-block">
										<a class="row row-chapter" href="/petit-catechisme/{part.slug}/{ch.slug}">
											<span class="row-label">
												<span class="label-title">{ch.title}</span>
											</span>
											<span class="dotleader" aria-hidden="true"></span>
											<span class="row-range">{fmtRange(ch.qa_range)}</span>
										</a>
										{#if ch.sections && ch.sections.length > 0}
											<div class="sub-sections">
												{#each ch.sections as csec, si (si)}
													<a
														class="row row-section"
														href="/petit-catechisme/{part.slug}/{ch.slug}#s-{si}"
													>
														<span class="row-label">
															<span class="label-title">{csec.title}</span>
														</span>
														<span class="dotleader" aria-hidden="true"></span>
													</a>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/each}
					{/if}
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
		letter-spacing: -0.005em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.part-subtitle {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.95rem;
		color: var(--color-subtle);
		margin: 0.3rem 0 0;
	}

	.chapters {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-left: clamp(0.85rem, 2.4vw, 1.5rem);
	}

	.section-group {
		margin-bottom: 0.5rem;
	}

	.section-label {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0.75rem 0 0.35rem;
	}

	.chapter-block {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.sub-sections {
		display: flex;
		flex-direction: column;
		padding-left: 1.25rem;
		border-left: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
		margin-left: 0.25rem;
		margin-bottom: 0.15rem;
	}

	.row-section .label-title {
		font-size: 0.87rem;
		color: var(--color-subtle);
	}
	.row-section:hover .label-title {
		color: var(--color-accent);
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
	.label-title {
		font-family: var(--font-body);
		font-size: 0.97rem;
	}
	.row:hover .label-title {
		color: var(--color-accent);
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
	.row-chapter {
		font-family: var(--font-ui);
		font-size: 1rem;
		font-weight: 500;
	}

	.toc-foot {
		text-align: center;
		margin-top: calc(var(--rh) * 4);
		opacity: 0.6;
	}
	.toc-foot .fleuron {
		font-size: 1rem;
	}

	.row:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

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
			width: 4.5rem;
			text-align: left;
			font-size: 0.72rem;
		}
		.chapters {
			padding-left: 0.4rem;
		}
	}
</style>
