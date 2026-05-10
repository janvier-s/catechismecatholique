<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const byPart = $derived.by(() => {
		const out: Record<string, number[]> = {};
		for (const part of data.structure.parts) out[part.slug] = [];
		for (const n of data.structure.all_numbers) {
			const slug = data.index[String(n)]?.part_slug;
			if (slug && slug in out) out[slug]!.push(n);
		}
		return out;
	});
</script>

<svelte:head>
	<title>Sommaire · Denzinger</title>
	<meta
		name="description"
		content="Sommaire complet du Denzinger — toutes les entrées numérotées de l'Enchiridion Symbolorum, classées par parties."
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
			{data.structure.all_numbers.length.toLocaleString('fr-FR')} entrées numérotées de DH {data
				.structure.all_numbers[0]} à DH
			{data.structure.all_numbers[data.structure.all_numbers.length - 1]}.
		</p>
		<div class="toc-actions">
			<a class="index-link" href="/denzinger">← Retour à l'accueil</a>
		</div>
	</header>

	<div class="parts">
		{#each data.structure.parts as part (part.slug)}
			<article class="part" id={part.slug}>
				<header class="part-head">
					<p class="part-eyebrow">
						{part.range[0]}–{part.range[1]} · {part.count.toLocaleString('fr-FR')} entrées
					</p>
					<h2 class="part-title">{part.title}</h2>
				</header>
				<div class="entries">
					{#each byPart[part.slug] ?? [] as n (n)}
						{@const meta = data.index[String(n)]}
						<a class="row" href="/denzinger/n/{n}">
							<span class="row-num">{n}</span>
							<span class="row-title">{meta?.title || '—'}</span>
						</a>
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
	.index-link:hover {
		text-decoration: underline;
	}

	.parts {
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 4);
	}
	.part {
		scroll-margin-top: 5rem;
	}
	.part-head {
		margin-bottom: calc(var(--rh) * 1.25);
		padding-bottom: calc(var(--rh) * 0.5);
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		text-align: center;
	}
	.part-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.entries {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.row {
		display: grid;
		grid-template-columns: 4rem 1fr;
		gap: 0.85rem;
		align-items: baseline;
		padding: 0.35rem 0.6rem;
		text-decoration: none;
		color: var(--color-fg);
		border-radius: 3px;
		transition: background-color 120ms ease;
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.55;
	}
	.row:hover {
		background: var(--hover-tint);
	}
	.row:hover .row-title {
		color: var(--color-accent);
	}
	.row-num {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.04em;
		color: var(--color-accent);
		text-align: right;
	}
	.row-title {
		min-width: 0;
		overflow-wrap: anywhere;
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
