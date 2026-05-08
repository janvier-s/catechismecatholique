<script lang="ts">
	type PartCard = {
		slug: string;
		kicker: string;
		title: string;
		range: string;
		lede: string;
	};

	const PARTS: PartCard[] = [
		{
			slug: '1-profession-de-la-foi',
			kicker: 'Première partie',
			title: 'La profession de la foi',
			range: '1–217',
			lede:
				"Ce que l'Église croit. La première partie présente, à travers le Symbole des Apôtres, " +
				"la révélation de Dieu, la foi de l'Église, le mystère trinitaire, le Christ Sauveur, " +
				"l'Esprit Saint et l'Église."
		},
		{
			slug: '2-celebration-du-mystere',
			kicker: 'Deuxième partie',
			title: 'La célébration du mystère chrétien',
			range: '218–356',
			lede:
				"Ce que l'Église célèbre. La deuxième partie est consacrée à la liturgie et aux sept " +
				'sacrements, par lesquels le mystère pascal du Christ rejoint la vie des fidèles.'
		},
		{
			slug: '3-vie-dans-le-christ',
			kicker: 'Troisième partie',
			title: 'La vie dans le Christ',
			range: '357–533',
			lede:
				"Ce que l'Église vit. La troisième partie expose la vie morale du chrétien, sa vocation " +
				"à la béatitude et l'observance du Décalogue à la lumière de l'Évangile."
		},
		{
			slug: '4-priere-chretienne',
			kicker: 'Quatrième partie',
			title: 'La prière chrétienne',
			range: '534–598',
			lede:
				"Ce que l'Église prie. La quatrième partie est consacrée à la prière chrétienne et " +
				'culmine dans la méditation du Notre Père, la prière que le Seigneur lui-même a ' +
				'enseignée à ses disciples.'
		}
	];
</script>

<svelte:head>
	<title>Compendium · Catéchisme de l'Église catholique</title>
	<meta
		name="description"
		content="Le Compendium du Catéchisme de l'Église catholique en français : 598 questions et réponses qui présentent l'essentiel de la foi catholique."
	/>
</svelte:head>

<main class="compendium-index">
	<header class="hero">
		<p class="hero-kicker">Édition française</p>
		<h1 class="hero-title">Compendium du Catéchisme</h1>
		<p class="hero-lede">
			Promulgué par Benoît&nbsp;XVI en 2005, le Compendium présente l'essentiel de la foi catholique
			en 598 questions et réponses,<br />
			fidèles à la structure du Catéchisme : ce que l'Église croit, célèbre, vit et prie.
		</p>
	</header>

	<section class="parts" aria-label="Les quatre parties du Compendium">
		{#each PARTS as p (p.slug)}
			<a class="part-card" href="/compendium/{p.slug}">
				<span class="part-kicker">{p.kicker} · {p.range}</span>
				<h2 class="part-title">{p.title}</h2>
				<p class="part-lede">{p.lede}</p>
			</a>
		{/each}
	</section>

	<nav class="quick-links" aria-label="Navigation complémentaire">
		<a href="/compendium/sommaire" class="quick-link">Sommaire complet</a>
	</nav>
</main>

<style>
	.compendium-index {
		max-width: 56rem;
		margin: 0 auto;
		padding: 2.75rem 1.5rem 3.5rem;
	}

	.hero {
		text-align: center;
		max-width: 44rem;
		margin: 0 auto 3rem;
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(1.15rem, 4.5vw, 2.6rem);
		font-weight: 600;
		line-height: 1.1;
		color: var(--color-fg);
		margin: 0 0 1.25rem;
	}
	.hero-lede {
		font-family: var(--font-body);
		font-size: clamp(1rem, 1.5vw, 1.1rem);
		line-height: 1.65;
		color: var(--color-subtle);
		margin: 0;
	}

	.parts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}
	@media (max-width: 720px) {
		.parts {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}

	.part-card {
		display: flex;
		flex-direction: column;
		padding: 1.5rem 1.5rem 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
		text-decoration: none;
		color: inherit;
		transition:
			border-color 150ms ease,
			background-color 150ms ease;
	}
	.part-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.part-card:hover .part-title {
		color: var(--color-accent);
	}
	.part-kicker {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin-bottom: 0.4rem;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: 1.4rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--color-fg);
		margin: 0 0 0.85rem;
		transition: color 150ms ease;
	}
	.part-lede {
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-subtle);
		margin: 0;
	}

	.quick-links {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.6rem;
		padding-top: 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}
	.quick-link {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}
	.quick-link:hover {
		color: var(--color-accent);
	}
</style>
