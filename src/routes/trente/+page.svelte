<script lang="ts">
	type Anchor = { label: string; href: string };
	type PartCard = {
		kicker: string;
		title: string;
		range: string;
		href: string;
		lede: string;
		anchors: Anchor[];
	};

	const PROLOGUE = {
		range: '1–28',
		href: '/trente/preface-des/1-introduction',
		lede: "Plan d'ensemble du Catéchisme et méthode d'instruction des pasteurs."
	};

	const PARTS: PartCard[] = [
		{
			kicker: 'Première partie',
			title: 'Le Symbole de Foi',
			range: '29–381',
			href: '/trente/1-foi-et-du/1-foi',
			lede: "Les douze articles du Credo des Apôtres exposent les vérités fondamentales de la foi chrétienne : la Trinité, l'Incarnation, la Rédemption, l'Église et la vie éternelle.",
			anchors: [
				{ label: 'Je crois en Dieu le Père', href: '/trente/2-premier-article/1-introduction' },
				{ label: 'Je crois en Jésus-Christ', href: '/trente/3-second-article/1-introduction' },
				{ label: 'Je crois au Saint-Esprit', href: '/trente/9-huitieme/1-introduction' },
				{ label: 'La sainte Église catholique', href: '/trente/10-neuvieme/1-introduction' }
			]
		},
		{
			kicker: 'Deuxième partie',
			title: 'Les Sacrements',
			range: '382–991',
			href: '/trente/14-sacrements-en/1-introduction',
			lede: 'Les sept sacrements institués par le Christ sont présentés un à un : leur institution, leur matière et leur forme, leurs effets, et les dispositions requises pour les recevoir.',
			anchors: [
				{ label: 'Le Baptême', href: '/trente/15-sacrement-de/1-introduction' },
				{ label: "L'Eucharistie", href: '/trente/18-sacrement-de/1-introduction' },
				{ label: 'La Pénitence', href: '/trente/21-sacrement-de/1-introduction' },
				{ label: 'Le Mariage', href: '/trente/27-sacrement-de/1-introduction' }
			]
		},
		{
			kicker: 'Troisième partie',
			title: 'Les Commandements de Dieu',
			range: '992–1399',
			href: '/trente/28-commandements/1-introduction',
			lede: 'Le Décalogue est commenté commandement par commandement, montrant comment la loi divine oriente toute la vie morale du chrétien vers Dieu et vers le prochain.',
			anchors: [
				{ label: 'Le premier commandement', href: '/trente/29-premier/1-introduction' },
				{ label: 'Le deuxième commandement', href: '/trente/30-second/1-introduction' },
				{ label: 'Le troisième commandement', href: '/trente/31-troisieme/1-introduction' }
			]
		},
		{
			kicker: 'Quatrième partie',
			title: "L'Oraison Dominicale",
			range: '1400–1787',
			href: '/trente/38-priere-en/1-introduction',
			lede: 'La prière est présentée dans sa nature et ses conditions, puis chacune des sept demandes du Notre Père est expliquée en détail comme modèle de toute prière chrétienne.',
			anchors: [
				{ label: "L'Oraison Dominicale", href: '/trente/39-loraison/1-introduction' },
				{ label: 'Que votre Nom soit sanctifié', href: '/trente/40-premiere/1-pourquoi-cette' },
				{ label: 'Que votre Règne arrive', href: '/trente/41-seconde-demande/1-introduction' }
			]
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
			<article class="part-card">
				<a href={p.href} class="part-head">
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
