<script lang="ts">
	type Anchor = { label: string; href: string };
	type PartCard = {
		slug: string;
		kicker: string;
		title: string;
		range: string;
		lede: string;
		anchors: Anchor[];
	};

	const PARTS: PartCard[] = [
		{
			slug: '1-profession-de-la-foi',
			kicker: 'Première partie',
			title: 'La profession de la foi',
			range: '26–1065',
			lede:
				"Ce que l'Église croit. La première partie expose, sous la conduite du Symbole des " +
				'Apôtres, le contenu de la foi catholique : la révélation, le mystère trinitaire, le ' +
				"Christ, l'Esprit Saint et l'Église.",
			anchors: [
				{
					label: 'Le Symbole des Apôtres',
					href: '/cec/1-profession-de-la-foi/2-profession-de-la-foi'
				},
				{
					label: 'Je crois en Dieu le Père',
					href: '/cec/1-profession-de-la-foi/2-profession-de-la-foi/1-je-crois-en-dieu-le-pere'
				},
				{
					label: 'Je crois en Jésus-Christ',
					href: '/cec/1-profession-de-la-foi/2-profession-de-la-foi/2-je-crois-en-jesus-christ-le'
				}
			]
		},
		{
			slug: '2-celebration-du-mystere',
			kicker: 'Deuxième partie',
			title: 'La célébration du mystère chrétien',
			range: '1066–1690',
			lede:
				"Ce que l'Église célèbre. La deuxième partie est consacrée à la liturgie et aux sept " +
				'sacrements, par lesquels le mystère pascal du Christ se rend présent dans la vie des ' +
				'fidèles.',
			anchors: [
				{
					label: 'Les sept sacrements',
					href: '/cec/2-celebration-du-mystere/2-sept-sacrements-de-leglise'
				},
				{
					label: "Les sacrements de l'initiation chrétienne",
					href: '/cec/2-celebration-du-mystere/2-sept-sacrements-de-leglise/1-sacrements-de-linitiation'
				}
			]
		},
		{
			slug: '3-vie-dans-le-christ',
			kicker: 'Troisième partie',
			title: 'La vie dans le Christ',
			range: '1691–2557',
			lede:
				"Ce que l'Église vit. La troisième partie présente la vie morale du chrétien, sa vocation " +
				"à la béatitude et l'observance du Décalogue à la lumière de l'Évangile.",
			anchors: [
				{
					label: 'Les Dix commandements',
					href: '/cec/3-vie-dans-le-christ/2-dix-commandements'
				},
				{
					label: 'La dignité de la personne humaine',
					href: '/cec/3-vie-dans-le-christ/1-vocation-de-lhomme-la-vie-dans/1-dignite-de-la-personne-humaine'
				}
			]
		},
		{
			slug: '4-priere-chretienne',
			kicker: 'Quatrième partie',
			title: 'La prière chrétienne',
			range: '2558–2865',
			lede:
				"Ce que l'Église prie. La quatrième partie est consacrée à la prière chrétienne et " +
				"culmine dans l'explication du Notre Père, la prière que le Seigneur lui-même a " +
				'enseignée à ses disciples.',
			anchors: [
				{
					label: 'Le Notre Père',
					href: '/cec/4-priere-chretienne/2-priere-du-seigneur-notre-pere'
				},
				{
					label: 'La prière dans la vie chrétienne',
					href: '/cec/4-priere-chretienne/1-priere-dans-la-vie-chretienne'
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Catéchisme de l'Église Catholique · Lire l'édition française complète</title>
	<meta
		name="description"
		content="Lisez le Catéchisme de l'Église Catholique en français : prologue, quatre parties, 2865 paragraphes. Recherche par mot-clé, référence biblique et thème."
	/>
</svelte:head>

<main class="ccc-index">
	<header class="hero">
		<p class="hero-kicker">Édition française</p>
		<h1 class="hero-title">Catéchisme de l'Église Catholique</h1>
		<p class="hero-lede">
			Promulgué par saint Jean-Paul&nbsp;II en 1992, le Catéchisme expose, en 2865 paragraphes
			organisés en quatre parties, l'ensemble de la foi catholique :<br />
			ce qu'elle croit, ce qu'elle célèbre, comment elle vit et comment elle prie.
		</p>
		<nav class="hero-tools" aria-label="Outils du Catéchisme">
			<a href="/cec/sommaire">Sommaire complet</a>
			<span aria-hidden="true">·</span>
			<a href="/cec/panorama">Panorama</a>
			<span aria-hidden="true">·</span>
			<a href="/glossaire">Glossaire</a>
			<span aria-hidden="true">·</span>
			<a href="/recherche">Recherche</a>
		</nav>
	</header>

	<section class="prologue" aria-labelledby="prologue-title">
		<a href="/cec/prologue" class="prologue-link">
			<span class="prologue-kicker">Prologue · 1–25</span>
			<span id="prologue-title" class="prologue-lede">
				Plan d'ensemble du Catéchisme et transmission de la foi.
			</span>
			<span class="prologue-arrow" aria-hidden="true">→</span>
		</a>
	</section>

	<section class="parts" aria-label="Les quatre parties du Catéchisme">
		{#each PARTS as p (p.slug)}
			<article class="part-card">
				<a href="/cec/{p.slug}" class="part-head">
					<span class="part-kicker">{p.kicker} · {p.range}</span>
					<h2 class="part-title">{p.title}</h2>
				</a>
				<p class="part-lede">{p.lede}</p>
				{#if p.anchors.length > 0}
					<ul class="part-anchors">
						{#each p.anchors as a (a.href)}
							<li>
								<a href={a.href} class="anchor-link">
									<span class="anchor-arrow" aria-hidden="true">›</span>
									<span>{a.label}</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</article>
		{/each}
	</section>

	<nav class="quick-links" aria-label="Navigation complémentaire">
		<a href="/cec/sommaire" class="quick-link">Sommaire complet</a>
		<span class="quick-sep" aria-hidden="true">·</span>
		<a href="/cec/panorama" class="quick-link">Panorama</a>
		<span class="quick-sep" aria-hidden="true">·</span>
		<a href="/glossaire" class="quick-link">Glossaire</a>
		<span class="quick-sep" aria-hidden="true">·</span>
		<a href="/recherche" class="quick-link">Recherche</a>
	</nav>
</main>

<style>
	.ccc-index {
		max-width: 56rem;
		margin: 0 auto;
		padding: 2.75rem 1.5rem 3.5rem;
	}

	/* Hero ------------------------------------------------------------- */
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
		white-space: nowrap;
	}
	.hero-lede {
		font-family: var(--font-body);
		font-size: clamp(1rem, 1.5vw, 1.1rem);
		line-height: 1.65;
		color: var(--color-subtle);
		margin: 0;
	}
	.hero-tools {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: baseline;
		gap: 0.5rem 0.65rem;
		margin: 1.5rem auto 0;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.hero-tools a {
		color: var(--color-accent);
		text-decoration: none;
		border-bottom: 1px solid transparent;
		padding-bottom: 0.1rem;
		transition: border-color 140ms ease;
	}
	.hero-tools a:hover,
	.hero-tools a:focus-visible {
		border-bottom-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}

	/* Prologue --------------------------------------------------------- */
	.prologue {
		max-width: 44rem;
		margin: 0 auto 2.5rem;
	}
	.prologue-link {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 0.85rem 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
		transition: border-color 150ms ease;
	}
	.prologue-link:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.prologue-kicker {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.prologue-lede {
		flex: 1;
		font-family: var(--font-body);
		font-size: 0.95rem;
		font-style: italic;
		color: var(--color-subtle);
	}
	.prologue-arrow {
		flex: none;
		font-family: var(--font-heading);
		font-size: 1.05rem;
		color: var(--color-muted);
		transition:
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
			color 150ms ease;
	}
	.prologue-link:hover .prologue-arrow {
		color: var(--color-accent);
		transform: translateX(3px);
	}

	/* Parts grid ------------------------------------------------------- */
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
		transition: border-color 150ms ease;
	}
	.part-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	.part-head {
		display: block;
		text-decoration: none;
		color: inherit;
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
	.part-head:hover .part-title {
		color: var(--color-accent);
	}
	.part-lede {
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-subtle);
		margin: 0 0 1.1rem;
	}
	.part-anchors {
		list-style: none;
		padding: 0;
		margin: auto 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
		padding-top: 0.85rem;
	}
	.anchor-link {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		font-family: var(--font-ui);
		font-size: 0.85rem;
		color: var(--color-fg);
		text-decoration: none;
		padding: 0.15rem 0;
	}
	.anchor-arrow {
		color: var(--color-muted);
		flex: none;
		transition:
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
			color 150ms ease;
	}
	.anchor-link:hover {
		color: var(--color-accent);
	}
	.anchor-link:hover .anchor-arrow {
		color: var(--color-accent);
		transform: translateX(2px);
	}

	/* Quick links ------------------------------------------------------ */
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
	@media (max-width: 640px) {
		.hero-title {
			white-space: normal;
			text-wrap: balance;
		}
		.prologue-link {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
			padding: 0.85rem 0.25rem;
		}
		.prologue-arrow {
			align-self: flex-end;
		}
	}

	.quick-sep {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		color: var(--color-border);
	}
</style>
