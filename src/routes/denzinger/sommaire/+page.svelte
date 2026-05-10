<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function fmtRange(first: number | null, last: number | null): string {
		if (first == null || last == null) return '';
		return first === last ? `${first}` : `${first}–${last}`;
	}
</script>

<svelte:head>
	<title>Sommaire · Denzinger</title>
	<meta
		name="description"
		content="Sommaire complet du Denzinger — toutes les sections de l'Enchiridion Symbolorum, classées par parties."
	/>
</svelte:head>

<main class="toc">
	<header class="toc-head">
		<p class="eyebrow">Denzinger — Enchiridion Symbolorum</p>
		<h1 class="title">Sommaire</h1>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>
		<p class="lede">
			{data.structure.total_entries.toLocaleString('fr-FR')} entrées (DH {data.structure
				.all_numbers[0]}–{data.structure.all_numbers[data.structure.all_numbers.length - 1]})<br
			/>en {data.structure.total_units} sections.
		</p>
		<div class="toc-actions">
			<a class="index-link" href="/denzinger">← Retour à l'accueil</a>
		</div>
	</header>

	<div class="parts">
		{#each data.structure.parts as part (part.slug)}
			<article class="part">
				<header class="part-head">
					<h2 class="part-title">{part.title}</h2>
					<p class="part-subtitle">
						{part.unit_count} sections · DH {part.first_n}–{part.last_n}
					</p>
				</header>
				<div class="units">
					{#each part.units as unit (unit.slug)}
						{@const context = unit.breadcrumb.slice(0, -1)}
						<div class="unit-block">
							{#if context.length > 0}
								<p class="unit-context">{context.join(' · ')}</p>
							{/if}
							<a class="row" href="/denzinger/{unit.slug}">
								<span class="row-label">
									<span class="label-title">{unit.title}</span>
								</span>
								<span class="dotleader" aria-hidden="true"></span>
								<span class="row-range">{fmtRange(unit.first_n, unit.last_n)}</span>
							</a>
							{#if unit.sections && unit.sections.length > 0}
								<div class="sections">
									{#each unit.sections as sec (sec.anchor)}
										{#if sec.title}
											<a class="row row-section" href="/denzinger/{unit.slug}#{sec.anchor}">
												<span class="row-label">
													<span class="label-title">{sec.title}</span>
												</span>
												<span class="dotleader" aria-hidden="true"></span>
												<span class="row-range">{fmtRange(sec.first_n, sec.last_n)}</span>
											</a>
										{/if}
										{#if sec.chapters && sec.chapters.length > 0}
											<div class="chapters">
												{#each sec.chapters as ch (ch.anchor)}
													<a class="row row-chapter" href="/denzinger/{unit.slug}#{ch.anchor}">
														<span class="row-label">
															<span class="label-title">{ch.title}</span>
														</span>
														<span class="dotleader" aria-hidden="true"></span>
														<span class="row-range">{fmtRange(ch.first_n, ch.last_n)}</span>
													</a>
												{/each}
											</div>
										{/if}
									{/each}
								</div>
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

	.parts {
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 4);
	}

	.part-head {
		margin-bottom: calc(var(--rh) * 1.25);
		padding-bottom: calc(var(--rh) * 0.5);
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		text-align: center;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.part-subtitle {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0.5rem 0 0;
	}

	.units {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding-left: clamp(0.85rem, 2.4vw, 1.5rem);
	}
	.unit-block {
		display: flex;
		flex-direction: column;
	}
	.unit-context {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 500;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0.6rem 0 0.05rem 0.5rem;
	}
	.row {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		text-decoration: none;
		color: var(--color-fg);
		padding: 0.3rem 0.5rem;
		margin-left: -0.5rem;
		border-radius: 2px;
		transition: background-color 120ms ease;
	}
	.row:hover {
		background: var(--hover-tint);
	}
	.row:hover .label-title {
		color: var(--color-accent);
	}
	.label-title {
		font-family: var(--font-body);
		font-size: 0.97rem;
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

	.sections,
	.chapters {
		display: flex;
		flex-direction: column;
		padding-left: 1.25rem;
		border-left: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
		margin-left: 0.25rem;
	}
	.row-section .label-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-fg);
	}
	.row-section:hover .label-title,
	.row-chapter:hover .label-title {
		color: var(--color-accent);
	}
	.row-chapter .label-title {
		font-size: 0.85rem;
		font-style: italic;
		color: var(--color-subtle);
	}

	.toc-foot {
		text-align: center;
		margin-top: calc(var(--rh) * 4);
		opacity: 0.6;
	}
	.toc-foot .fleuron {
		font-size: 1rem;
	}

	@media (max-width: 640px) {
		.dotleader {
			display: none;
		}
		.row-range {
			order: -1;
			flex: 0 0 auto;
			font-size: 0.7rem;
		}
	}
</style>
