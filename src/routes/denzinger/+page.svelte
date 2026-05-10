<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Denzinger — Enchiridion Symbolorum · Catéchisme</title>
	<meta
		name="description"
		content="Édition française du Denzinger, Enchiridion Symbolorum — recueil canonique des symboles, définitions et déclarations magistérielles de l'Église catholique des origines à 1959."
	/>
</svelte:head>

<main class="dz-index">
	<header class="hero">
		<p class="hero-kicker">Édition française · Source : catho.org · 37e édition</p>
		<h1 class="hero-title">
			Denzinger<br /><em class="hero-em">Enchiridion Symbolorum</em>
		</h1>
		<p class="hero-lede">
			{data.structure.subtitle} — {data.structure.total_entries.toLocaleString('fr-FR')} entrées canoniques
			(DH {data.structure.all_numbers[0]}–DH {data.structure.all_numbers[
				data.structure.all_numbers.length - 1
			]}), groupées en {data.structure.total_units} sections : symboles de foi, conciles, pontificats.
		</p>
		<a class="hero-toc" href="/denzinger/sommaire">Sommaire complet →</a>
	</header>

	<section class="parts" aria-label="Parties">
		{#each data.structure.parts as part (part.slug)}
			{@const firstUnit = part.units[0]}
			<a class="part-card" href="/denzinger/{firstUnit?.slug ?? ''}">
				<span class="part-kicker">
					{part.unit_count} sections · DH {part.first_n}–{part.last_n}
				</span>
				<h2 class="part-title">{part.title}</h2>
				<span class="part-arrow" aria-hidden="true">→</span>
			</a>
		{/each}
	</section>

	<section class="quick" aria-label="Accès rapide à une entrée">
		<h2 class="quick-eyebrow">Accès direct par numéro</h2>
		<form
			method="get"
			action="/denzinger/n/"
			onsubmit={(e: SubmitEvent) => {
				e.preventDefault();
				const form = e.currentTarget as HTMLFormElement;
				const n = (form.elements.namedItem('n') as HTMLInputElement).value;
				if (n) location.assign(`/denzinger/n/${n}`);
			}}
		>
			<label>
				<span class="sr-only">Numéro DH</span>
				<input
					type="number"
					name="n"
					min={data.structure.all_numbers[0]}
					max={data.structure.all_numbers[data.structure.all_numbers.length - 1]}
					placeholder="Numéro DH (ex. 1500)"
					required
				/>
			</label>
			<button type="submit">Voir</button>
		</form>
	</section>
</main>

<style>
	.dz-index {
		max-width: 900px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(2.5rem, 5vw, 4rem);
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(2.4rem, 6vw, 4rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.hero-em {
		font-style: italic;
		font-weight: 600;
		font-size: 0.7em;
	}
	.hero-lede {
		max-width: 56ch;
		margin: 1.25rem auto 0;
		font-style: italic;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}
	.hero-toc {
		display: inline-block;
		margin-top: 1.5rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
	}
	.hero-toc:hover {
		text-decoration: underline;
	}

	.parts {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 3rem;
	}
	.part-card {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.4rem 1rem;
		padding: 1.25rem 1.5rem;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		text-decoration: none;
		color: inherit;
		transition:
			border-color 150ms ease,
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.part-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
		transform: translateY(-1px);
	}
	.part-kicker {
		grid-column: 1;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.part-title {
		grid-column: 1;
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.part-arrow {
		grid-row: 1 / span 2;
		grid-column: 2;
		align-self: center;
		font-size: 1.1rem;
		color: var(--color-accent);
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.part-card:hover .part-arrow {
		transform: translateX(4px);
	}

	.quick {
		text-align: center;
	}
	.quick-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 1rem;
	}
	form {
		display: inline-flex;
		gap: 0.5rem;
	}
	input[type='number'] {
		font-family: var(--font-ui);
		font-size: 1rem;
		padding: 0.55rem 0.85rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-panel);
		color: var(--color-fg);
		width: 14rem;
	}
	input[type='number']:focus {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}
	button {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.55rem 1.25rem;
		border: 0;
		border-radius: 4px;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
	}
	button:hover {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
	}
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
</style>
