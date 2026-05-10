<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>DH {data.n} introuvable · Denzinger</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="missing">
	<p class="kicker">Denzinger</p>
	<h1 class="title">DH {data.n}</h1>
	<p class="lede">
		Ce numéro existe dans l'édition originale du Denzinger, mais il n'est pas reproduit dans la
		présente édition (catho.org / Ictus 3, 37<sup>e</sup>
		édition, qui couvre les numéros 1 à 3930 avec quelques lacunes).
	</p>
	<a class="back" href="/denzinger">← Retour au sommaire</a>
</main>

<style>
	.missing {
		max-width: 44rem;
		margin: 0 auto;
		padding: clamp(2rem, 6vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
		text-align: center;
		font-family: var(--font-body);
		color: var(--color-fg);
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 1rem;
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		line-height: 1;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.lede {
		max-width: 40ch;
		margin: 1.5rem auto 0;
		font-style: italic;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}
	.back {
		display: inline-block;
		margin-top: 2rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
	}
	.back:hover {
		text-decoration: underline;
	}
</style>
