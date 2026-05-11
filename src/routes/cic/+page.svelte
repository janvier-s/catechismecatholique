<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const CODE_LABEL = { '1983': 'Code de 1983', '1917': 'Code de 1917' } as const;
	const CODE_SUBTITLE = {
		'1983': 'Promulgué par saint Jean-Paul II le 25 janvier 1983.',
		'1917': 'Promulgué par Benoît XV le 27 mai 1917 (Codex Pio-Benedictin).'
	} as const;
</script>

<svelte:head>
	<title>Code de Droit Canonique (1917 + 1983)</title>
	<meta
		name="description"
		content="Les deux codes de droit canonique de l'Église latine : 1917 (Codex Pio-Benedictin, 2 414 canons) et 1983 (1 752 canons)."
	/>
</svelte:head>

<main class="cic-index">
	<header class="hero">
		<p class="hero-kicker">Église latine · CODEX IURIS CANONICI</p>
		<h1 class="hero-title">Code de Droit Canonique</h1>
		<p class="hero-lede">
			Les deux codes de droit canonique en vigueur dans l'Église latine — la version actuelle
			promulguée par saint Jean-Paul II en 1983 (1 752 canons), et le code Pio-Benedictin de 1917
			qu'elle a remplacé (2 414 canons).
		</p>
	</header>

	{#each data.structure.codes as code (code.code)}
		<section class="code">
			<header class="code-head">
				<p class="code-kicker">{code.code}</p>
				<h2 class="code-title">{CODE_LABEL[code.code]}</h2>
				<p class="code-sub">{CODE_SUBTITLE[code.code]}</p>
			</header>
			<ul class="livres">
				{#each code.livres as livre (livre.slug)}
					<li>
						<a class="livre-row" href={`/cic/${code.code}/${livre.slug}`}>
							<span class="livre-num">Livre {livre.n}</span>
							<span class="livre-title">{livre.title}</span>
							<span class="livre-range">
								{livre.canonRange[0]}–{livre.canonRange[1]}
							</span>
							<span class="livre-arrow" aria-hidden="true">→</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</main>

<style>
	.cic-index {
		max-width: 900px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(2rem, 5vw, 3.5rem);
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(2.2rem, 5.5vw, 3.4rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.hero-lede {
		max-width: 52ch;
		margin: 1.25rem auto 0;
		font-style: italic;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}

	.code {
		margin-top: 3rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-top: 1.5rem;
	}
	.code-head {
		margin-bottom: 1.25rem;
	}
	.code-kicker {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.25rem;
	}
	.code-title {
		font-family: var(--font-heading);
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0;
	}
	.code-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.9rem;
		color: var(--color-subtle);
		margin: 0.35rem 0 0;
	}

	.livres {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.livre-row {
		display: grid;
		grid-template-columns: 5.5rem 1fr auto auto;
		gap: 0.85rem;
		align-items: baseline;
		padding: 0.7rem 0.85rem;
		text-decoration: none;
		color: var(--color-fg);
		border-radius: 4px;
		transition:
			background-color 120ms ease,
			color 120ms ease;
	}
	.livre-row:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent);
	}
	.livre-num {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.livre-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 600;
		font-size: 1.05rem;
	}
	.livre-range {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
	}
	.livre-arrow {
		color: var(--color-muted);
		font-size: 0.85rem;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.livre-row:hover .livre-arrow {
		transform: translateX(3px);
		color: var(--color-accent);
	}
</style>
