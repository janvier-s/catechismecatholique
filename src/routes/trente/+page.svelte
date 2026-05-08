<script lang="ts">
	type PartCard = {
		kicker: string;
		title: string;
		range: string;
		href: string;
		lede: string;
	};

	const PROLOGUE = {
		range: '1–28',
		href: '/trente/preface-auteurs',
		lede: "Plan d'ensemble du Catéchisme et méthode d'instruction des pasteurs."
	};

	const PARTS: PartCard[] = [
		{
			kicker: 'Première partie',
			title: 'Le Symbole de Foi',
			range: '29–381',
			href: '/trente/1-foi-et-symbole',
			lede: "Les douze articles du Credo des Apôtres exposent les vérités fondamentales de la foi chrétienne : la Trinité, l'Incarnation, la Rédemption, l'Église et la vie éternelle."
		},
		{
			kicker: 'Deuxième partie',
			title: 'Les Sacrements',
			range: '382–991',
			href: '/trente/14-sacrements',
			lede: 'Les sept sacrements institués par le Christ sont présentés un à un : leur institution, leur matière et leur forme, leurs effets, et les dispositions requises pour les recevoir.'
		},
		{
			kicker: 'Troisième partie',
			title: 'Les Commandements de Dieu',
			range: '992–1399',
			href: '/trente/28-commandements',
			lede: 'Le Décalogue est commenté commandement par commandement, montrant comment la loi divine oriente toute la vie morale du chrétien vers Dieu et vers le prochain.'
		},
		{
			kicker: 'Quatrième partie',
			title: "L'Oraison Dominicale",
			range: '1400–1787',
			href: '/trente/38-priere-general',
			lede: 'La prière est présentée dans sa nature et ses conditions, puis chacune des sept demandes du Notre Père est expliquée en détail comme modèle de toute prière chrétienne.'
		}
	];
</script>

<svelte:head>
	<title>Catéchisme du Concile de Trente · Édition française complète</title>
	<meta
		name="description"
		content="Lisez le Catéchisme du Concile de Trente (1566) en français : prologue, quatre parties, 1 787 paragraphes sur la foi, les sacrements, les commandements et la prière."
	/>
</svelte:head>

<main class="trente-index">
	<header class="hero">
		<p class="hero-kicker">Édition française · 1566</p>
		<h1 class="hero-title">Catéchisme du Concile de Trente</h1>
		<p class="hero-lede">
			Commandé par le Concile de Trente et publié sous Pie&nbsp;V en 1566, ce catéchisme expose en
			1&nbsp;787 paragraphes la foi catholique à l'usage des pasteurs&nbsp;:<br />
			le Symbole des Apôtres, les Sacrements, le Décalogue et l'Oraison Dominicale.
		</p>
	</header>

	<section class="prologue" aria-labelledby="prologue-title">
		<a href={PROLOGUE.href} class="prologue-link">
			<span class="prologue-kicker">Prologue · {PROLOGUE.range}</span>
			<span id="prologue-title" class="prologue-lede">{PROLOGUE.lede}</span>
			<span class="prologue-arrow" aria-hidden="true">→</span>
		</a>
	</section>

	<section class="parts" aria-label="Les quatre parties du Catéchisme de Trente">
		{#each PARTS as p (p.kicker)}
			<a class="part-card" href={p.href}>
				<span class="part-kicker">{p.kicker} · {p.range}</span>
				<h2 class="part-title">{p.title}</h2>
				<p class="part-lede">{p.lede}</p>
			</a>
		{/each}
	</section>

	<nav class="quick-links" aria-label="Navigation complémentaire">
		<a href="/trente/sommaire" class="quick-link">Sommaire complet</a>
	</nav>
</main>

<style>
	.trente-index {
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
</style>
