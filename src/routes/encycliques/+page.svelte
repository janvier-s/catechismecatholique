<svelte:head>
	<title>Encycliques · Bientôt disponible</title>
	<meta name="description" content="Recueil des encycliques pontificales · section à venir." />
</svelte:head>

<main class="stub">
	<p class="kicker">Magistère</p>
	<h1 class="title">Encycliques</h1>
	<p class="lede">
		Cette section accueillera prochainement le recueil des encycliques pontificales hors Vatican II.
	</p>
	<p class="back">
		<a href="/bibliotheque">← Retour à la Bibliothèque</a>
	</p>
</main>

<style>
	.stub {
		max-width: 640px;
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 6rem) 1.5rem;
		text-align: center;
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 1rem;
	}
	.title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: clamp(2.2rem, 5vw, 3rem);
		margin: 0;
	}
	.lede {
		max-width: 48ch;
		margin: 1.25rem auto 0;
		font-style: italic;
		color: var(--color-subtle);
		line-height: 1.65;
	}
	.back {
		margin-top: 2rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.12em;
	}
	.back a {
		color: var(--color-accent);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
		padding-bottom: 0.1rem;
	}
</style>
