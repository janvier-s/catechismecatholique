<script lang="ts">
	// Bibliothèque: a bibliographic register of every corpus the site
	// hosts. Visual language draws from medieval scriptoria (rubrics,
	// fleurons, hanging Roman numerals) but the typography and grid are
	// fully modern. Page is static; no `data` from +page.ts is consumed.

	type Work = {
		slug: string;
		href: string;
		title: string;
		subtitle?: string;
		blurb: string;
		year: string;
		image: string;
		/** Which edge of the cover to anchor when cropping inside the 3:4
		 *  card. Defaults to centre. Use 'top' for a head-anchored
		 *  illustration, 'bottom' for a footer plate. */
		focus?: 'top' | 'center' | 'bottom';
	};
	type Shelf = {
		roman: 'I' | 'II' | 'III' | 'IV';
		title: string;
		kicker: string;
		works: Work[];
	};

	const PLACEHOLDER = '/img/bibliotheque/placeholder.png';

	// The two foundational works the rest of the library serves: the
	// Catéchisme de l'Église Catholique (the site's primary text) and the
	// Bible. Rendered as larger featured cards above the four shelves.
	const featured: Work[] = [
		{
			slug: 'cec',
			href: '/cec',
			title: "Catéchisme de l'Église Catholique",
			subtitle: 'Catechismus Catholicae Ecclesiae, édition française',
			blurb:
				'Deux mille huit cent soixante cinq paragraphes en quatre parties. Le texte de référence.',
			year: '1992',
			image: '/img/bibliotheque/cec.webp'
		},
		{
			slug: 'bible',
			href: '/bible',
			title: 'Bible',
			subtitle: 'Édition catholique en français',
			blurb: 'Texte intégral, lu chapitre par chapitre, croisé verset par verset au Catéchisme.',
			year: 'Écritures',
			image: '/img/bibliotheque/bible.webp'
		}
	];

	const shelves: Shelf[] = [
		{
			roman: 'I',
			title: 'Catéchismes',
			kicker: 'Exposés systématiques de la foi',
			works: [
				{
					slug: 'compendium',
					focus: 'top',
					href: '/compendium',
					title: 'Compendium',
					subtitle: "Abrégé officiel du Catéchisme de l'Église Catholique",
					blurb: 'Cinq cent quatre vingt dix huit questions reprises de la grande édition de 1992.',
					year: '2005',
					image: '/img/bibliotheque/compendium.webp'
				},
				{
					slug: 'trente',
					focus: 'top',
					href: '/trente',
					title: 'Catéchisme du Concile de Trente',
					subtitle: 'Catechismus ex decreto Concilii Tridentini',
					blurb: 'Le catéchisme romain promulgué après le Concile de Trente, en quatre parties.',
					year: '1566',
					image: '/img/bibliotheque/trente.webp'
				},
				{
					slug: 'petit-catechisme',
					focus: 'top',
					href: '/petit-catechisme',
					title: 'Petit Catéchisme',
					subtitle: 'Catéchisme de la Doctrine Chrétienne',
					blurb:
						"L'abrégé pour les fidèles, ordonné par saint Pie X pour les premiers enseignements.",
					year: '1912',
					image: '/img/bibliotheque/petit-catechisme.webp'
				},
				{
					slug: 'grand-catechisme',
					href: '/grand-catechisme',
					title: 'Grand Catéchisme',
					subtitle: 'Catéchisme de saint Pie X, version étendue',
					blurb: "Neuf cent quatre vingt neuf questions et réponses sur l'ensemble de la doctrine.",
					year: '1905',
					image: '/img/bibliotheque/grand-catechisme.webp'
				},
				{
					slug: 'catechisme-adultes',
					focus: 'top',
					href: '/catechisme-adultes',
					title: 'Catéchisme pour Adultes',
					subtitle: 'Catéchisme des Évêques de France',
					blurb: 'Exposé thématique en quarante sept sections, adressé aux fidèles adultes.',
					year: '1991',
					image: '/img/bibliotheque/catechisme-adultes.webp'
				},
				{
					slug: 'catechisme-illustre',
					href: '/catechisme-illustre',
					title: 'Catéchisme illustré',
					subtitle: 'Les vérités nécessaires en douze leçons',
					blurb: 'Douze leçons accompagnées de gravures sur bois, pour la catéchèse populaire.',
					year: '1897',
					image: '/img/bibliotheque/catechisme-illustre.webp'
				}
			]
		},
		{
			roman: 'II',
			title: 'Catéchèse & doctrine',
			kicker: 'Synthèses doctrinales et catéchèses patristiques',
			works: [
				{
					slug: 'didache',
					href: '/didache',
					title: 'La Didachè',
					subtitle: 'Doctrine des douze Apôtres',
					blurb: 'Plus ancien document catéchétique chrétien, en seize courts chapitres.',
					year: 'Iᵉʳ siècle',
					image: '/img/bibliotheque/didache.webp'
				},
				{
					slug: 'catecheses-mystagogiques',
					focus: 'bottom',
					href: '/catecheses-mystagogiques',
					title: 'Catéchèses mystagogiques',
					subtitle: 'Saint Cyrille de Jérusalem, aux nouveaux baptisés',
					blurb: "Cinq instructions sur les sacrements de l'initiation, données vers 350.",
					year: 'vers 350',
					image: '/img/bibliotheque/catecheses-mystagogiques.webp'
				},
				{
					slug: 'discours-catechetique',
					focus: 'top',
					href: '/discours-catechetique',
					title: 'Discours catéchétique',
					subtitle: 'Saint Grégoire de Nysse, Oratio catechetica magna',
					blurb: 'Manuel théologique patristique en quarante chapitres, par un Père cappadocien.',
					year: 'IVᵉ siècle',
					image: '/img/bibliotheque/discours-catechetique.webp'
				},
				{
					slug: 'breviloquium',
					focus: 'top',
					href: '/breviloquium',
					title: 'Breviloquium',
					subtitle: 'Saint Bonaventure, somme théologique abrégée',
					blurb: 'Sept parties, soixante dix neuf chapitres : un compendium de la théologie.',
					year: '1257',
					image: '/img/bibliotheque/breviloquium.webp'
				},
				{
					slug: 'doctrine-catholique',
					href: '/doctrine-catholique',
					title: 'La Doctrine Catholique',
					subtitle: 'Abbé Boulenger, en cinquante trois leçons',
					blurb: 'Une pédagogie de la doctrine pour adultes, organisée en trois tomes.',
					year: '1927',
					image: '/img/bibliotheque/doctrine-catholique.webp'
				},
				{
					slug: 'doctrine-sociale',
					href: '/doctrine-sociale',
					title: 'Doctrine sociale',
					subtitle: "Compendium de la doctrine sociale de l'Église",
					blurb: 'Cinq cent quatre vingt trois paragraphes en trois parties.',
					year: '2004',
					image: '/img/bibliotheque/doctrine-sociale.webp'
				}
			]
		},
		{
			roman: 'III',
			title: 'Magistère',
			kicker: 'Documents conciliaires, canoniques et liturgiques',
			works: [
				{
					slug: 'vatican-ii',
					href: '/vatican-ii',
					title: 'Vatican II',
					subtitle: 'Les seize documents du Concile œcuménique',
					blurb: 'Quatre constitutions, neuf décrets et trois déclarations.',
					year: '1962 à 1965',
					image: '/img/bibliotheque/vatican-ii.webp'
				},
				{
					slug: 'denzinger',
					href: '/denzinger',
					title: 'Denzinger',
					subtitle: 'Enchiridion Symbolorum',
					blurb: 'Recueil canonique des symboles, définitions et déclarations du Magistère.',
					year: 'Recueil',
					image: '/img/bibliotheque/denzinger.webp'
				},
				{
					slug: 'cic-1983',
					href: '/cic/1983',
					title: 'Code de Droit Canonique',
					subtitle: 'Codex Iuris Canonici en vigueur',
					blurb: 'Mille sept cent cinquante deux canons. Promulgué par saint Jean Paul II.',
					year: '1983',
					image: '/img/bibliotheque/cic-1983.webp'
				},
				{
					slug: 'cic-1917',
					href: '/cic/1917',
					title: 'Code Pio Benedictin',
					subtitle: 'Codex Iuris Canonici précédent',
					blurb: "Premier code unifié du droit de l'Église latine, en vigueur jusqu'en 1983.",
					year: '1917',
					image: '/img/bibliotheque/cic-1917.webp'
				},
				{
					slug: 'pgmr',
					href: '/pgmr',
					title: 'Présentation Générale du Missel Romain',
					subtitle: 'Norme liturgique en neuf chapitres',
					blurb: 'Le texte de référence pour la célébration ordinaire de la messe romaine.',
					year: '2002',
					image: '/img/bibliotheque/pgmr.webp'
				},
				{
					slug: 'encycliques',
					href: '/encycliques',
					title: 'Encycliques',
					subtitle: 'Lettres pontificales hors Vatican II',
					blurb: 'Recueil des encycliques majeures du Magistère pontifical (à venir).',
					year: 'Recueil',
					image: PLACEHOLDER
				}
			]
		},
		{
			roman: 'IV',
			title: 'Études & outils',
			kicker: 'Outils transversaux pour la lecture du Catéchisme',
			works: [
				{
					slug: 'recherche',
					href: '/recherche',
					title: 'Recherche',
					subtitle: 'Un champ pour tout retrouver',
					blurb: 'Mot, paragraphe, ou référence biblique : un seul champ pour tout.',
					year: 'Outil',
					image: PLACEHOLDER
				},
				{
					slug: 'glossaire',
					href: '/glossaire',
					title: 'Glossaire',
					subtitle: 'Les termes théologiques classés',
					blurb: 'Définitions, renvois croisés, regroupement par grands thèmes doctrinaux.',
					year: 'Outil',
					image: PLACEHOLDER
				},
				{
					slug: 'bible',
					href: '/bible',
					title: 'Concordance biblique',
					subtitle: 'Chaque verset croisé avec le Catéchisme',
					blurb: 'Lecture intégrale et concordance verset par verset avec les paragraphes du CEC.',
					year: 'Outil',
					image: '/img/bibliotheque/bible.webp'
				},
				{
					slug: 'calendrier',
					href: '/calendrier',
					title: 'Calendrier liturgique',
					subtitle: 'Calendrier romain croisé au Catéchisme',
					blurb: 'Pour chaque jour du temps liturgique, les paragraphes du CEC à méditer.',
					year: 'Outil',
					image: PLACEHOLDER
				},
				{
					slug: 'prieres',
					href: '/prieres-formules',
					title: 'Prières & Formules',
					subtitle: 'Recueil des prières et formules essentielles',
					blurb: 'Pater, Ave, Credo, actes de foi, Salve Regina, et autres prières usuelles.',
					year: 'Outil',
					image: PLACEHOLDER
				}
			]
		}
	];

	const totalWorks = $derived(
		featured.length + shelves.reduce((sum, shelf) => sum + shelf.works.length, 0)
	);
	const totalShelves = $derived(shelves.length);
</script>

<svelte:head>
	<title>Bibliothèque · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Tous les textes hébergés sur le site, en quatre rayons : catéchismes, catéchèse et doctrine, magistère, études et outils. Vingt deux œuvres au total."
	/>
</svelte:head>

<main class="biblio">
	<header class="hero">
		<span class="hero-ornament" aria-hidden="true">
			<span class="rule"></span>
			<span class="fleuron">✠</span>
			<span class="rule"></span>
		</span>
		<p class="hero-kicker">Catalogue général</p>
		<h1 class="hero-title">Bibliothèque</h1>
		<p class="hero-lede">
			Un catalogue raisonné de tous les textes que ce site reproduit. Catéchismes officiels, écrits
			patristiques et doctrinaux, documents du Magistère, et les outils transversaux qui permettent
			de circuler entre les corpus.
		</p>
		<p class="hero-stats">
			<span>{totalWorks} œuvres</span>
			<span aria-hidden="true">·</span>
			<span>{totalShelves} rayons</span>
		</p>
	</header>

	<!-- Featured: the two foundational works the rest of the library serves. -->
	<section class="featured" aria-label="Œuvres fondatrices">
		{#each featured as work, fi (work.slug)}
			<a class="card card-featured" href={work.href} style="--card-index: {fi}">
				<figure class="cover">
					<img
						src={work.image}
						alt={`${work.title}, couverture`}
						loading="lazy"
						style={`object-position: 50% ${work.focus === 'top' ? '0%' : work.focus === 'bottom' ? '100%' : '50%'}`}
					/>
					<span class="cover-shine" aria-hidden="true"></span>
				</figure>
				<div class="card-body">
					<p class="card-year">{work.year}</p>
					<h3 class="card-title card-title-featured">{work.title}</h3>
					{#if work.subtitle}
						<p class="card-sub">{work.subtitle}</p>
					{/if}
					<p class="card-blurb">{work.blurb}</p>
					<span class="card-cta">
						Lire<span class="card-cta-arrow" aria-hidden="true">→</span>
					</span>
				</div>
			</a>
		{/each}
	</section>

	{#each shelves as shelf, si (shelf.roman)}
		<section class="shelf" style="--shelf-index: {si}" aria-labelledby={`shelf-${shelf.roman}`}>
			<header class="shelf-head">
				<h2 id={`shelf-${shelf.roman}`} class="shelf-title">{shelf.title}</h2>
				<p class="shelf-sub">{shelf.kicker}</p>
				<span class="shelf-rule" aria-hidden="true"></span>
			</header>

			{#if shelf.roman === 'IV'}
				<!-- Études & outils: not "books". Rendered as flat compact tiles
				     with a small accent rule, no cover image, no Lire CTA. -->
				<ul class="tools-grid">
					{#each shelf.works as work, wi (work.slug)}
						<li class="tool-wrap" style="--card-index: {wi}">
							<a class="tool" href={work.href}>
								<span class="tool-mark" aria-hidden="true">✠</span>
								<span class="tool-body">
									<h3 class="tool-title">{work.title}</h3>
									{#if work.subtitle}
										<p class="tool-sub">{work.subtitle}</p>
									{/if}
									<p class="tool-blurb">{work.blurb}</p>
								</span>
								<span class="tool-arrow" aria-hidden="true">→</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<ul class="grid">
					{#each shelf.works as work, wi (work.slug)}
						<li class="card-wrap" style="--card-index: {wi}">
							<a class="card" href={work.href}>
								<figure class="cover">
									<img
										src={work.image}
										alt={`${work.title}, couverture`}
										loading="lazy"
										style={`object-position: 50% ${work.focus === 'top' ? '0%' : work.focus === 'bottom' ? '100%' : '50%'}`}
									/>
									<span class="cover-shine" aria-hidden="true"></span>
								</figure>
								<div class="card-body">
									<p class="card-year">{work.year}</p>
									<h3 class="card-title">{work.title}</h3>
									{#if work.subtitle}
										<p class="card-sub">{work.subtitle}</p>
									{/if}
									<p class="card-blurb">{work.blurb}</p>
									<span class="card-cta">
										Lire<span class="card-cta-arrow" aria-hidden="true">→</span>
									</span>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}

	<footer class="colophon">
		<p>
			<em
				>Catalogue mis à jour au fur et à mesure des ajouts. Les couvertures réelles remplaceront
				progressivement le visuel transitoire.</em
			>
		</p>
	</footer>
</main>

<style>
	/* Layout & atmosphere ----------------------------------------------- */
	.biblio {
		max-width: 1120px;
		margin: 0 auto;
		padding: clamp(2rem, 4vw, 4rem) clamp(1.25rem, 4vw, 2.5rem) 6rem;
		color: var(--color-fg);
		font-family: var(--font-body);
		position: relative;
	}
	/* Subtle warm-parchment vignette behind the hero, fading out before the
	   first shelf. Uses tinted accent at very low opacity so it never reads
	   as a coloured wash. */
	.biblio::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 480px;
		background: radial-gradient(
			ellipse at 50% 0%,
			color-mix(in srgb, var(--color-accent) 4%, transparent),
			transparent 70%
		);
		pointer-events: none;
		z-index: -1;
	}

	/* Hero -------------------------------------------------------------- */
	.hero {
		text-align: center;
		padding: 1rem 0 clamp(3rem, 6vw, 5rem);
	}
	.hero-ornament {
		display: inline-flex;
		align-items: center;
		gap: 0.85rem;
		max-width: 320px;
		width: 100%;
		margin: 0 auto 1.5rem;
	}
	.rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 22%, transparent),
			transparent
		);
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 1.15rem;
		color: var(--color-accent);
		line-height: 1;
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.34em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.6rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: clamp(3rem, 8vw, 5.5rem);
		line-height: 1;
		letter-spacing: -0.005em;
		margin: 0;
		color: var(--color-fg);
	}
	.hero-lede {
		max-width: 54ch;
		margin: 1.5rem auto 0;
		font-size: 1.02rem;
		line-height: 1.7;
		color: var(--color-subtle);
	}
	.hero-stats {
		display: inline-flex;
		gap: 0.7rem;
		margin: 1.75rem 0 0;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Shelf section ----------------------------------------------------- */
	.shelf {
		position: relative;
		margin-top: clamp(2.5rem, 5vw, 4rem);
		opacity: 0;
		animation: shelf-in 720ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--shelf-index) * 120ms + 80ms);
	}
	@keyframes shelf-in {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.shelf-head {
		margin-bottom: 1.75rem;
		position: relative;
	}
	.shelf-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: clamp(1.85rem, 3.5vw, 2.4rem);
		line-height: 1.1;
		margin: 0;
		text-wrap: balance;
	}
	.shelf-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.94rem;
		color: var(--color-subtle);
		margin: 0.4rem 0 0;
	}
	.shelf-rule {
		display: block;
		height: 1px;
		margin-top: 1.1rem;
		background: linear-gradient(
			to right,
			color-mix(in srgb, var(--color-accent) 40%, transparent),
			color-mix(in srgb, var(--color-fg) 14%, transparent) 40%,
			transparent
		);
	}

	/* Card grid --------------------------------------------------------- */
	/* Fixed 3 columns on desktop avoids orphan single-card last rows that
	   `auto-fit` produces at wide viewports. Drops to 2 on tablet and 1
	   on phone via plain media queries. */
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.6rem 1.4rem;
	}
	@media (max-width: 880px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 560px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	/* Featured row: the two foundational works, side by side. */
	.featured {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.6rem 1.4rem;
		margin-bottom: clamp(2.5rem, 5vw, 4rem);
		padding-bottom: clamp(2rem, 5vw, 3.5rem);
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
	}
	@media (max-width: 560px) {
		.featured {
			grid-template-columns: 1fr;
		}
	}

	.card-wrap {
		display: flex;
		opacity: 0;
		animation: card-in 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--card-index) * 40ms + var(--shelf-index, 0) * 120ms + 200ms);
	}
	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		text-decoration: none;
		color: var(--color-fg);
		padding: 0.5rem 0.5rem 0.85rem;
		border-radius: 4px;
		position: relative;
		width: 100%;
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			color 160ms ease;
	}
	/* Featured cards in the top row stretch full width of their grid cell
	   and use the same stretch behaviour as shelf cards. */
	.card-featured {
		opacity: 0;
		animation: card-in 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--card-index) * 60ms + 100ms);
	}
	.card::after {
		content: '';
		position: absolute;
		left: 0.6rem;
		right: 0.6rem;
		bottom: 0.55rem;
		height: 1px;
		background: var(--color-accent);
		transform: scaleX(0);
		transform-origin: left center;
		transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.card:hover,
	.card:focus-visible {
		transform: translateY(-2px);
		color: var(--color-accent);
		outline: none;
	}
	.card:hover::after,
	.card:focus-visible::after {
		transform: scaleX(1);
	}

	/* Cover: 3:4 like a small octavo. */
	.cover {
		position: relative;
		aspect-ratio: 3 / 4;
		margin: 0;
		overflow: hidden;
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-accent) 6%, var(--color-panel)),
			var(--color-panel)
		);
		border: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		border-radius: 2px;
		box-shadow: 0 1px 0 color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.card:hover .cover img {
		transform: scale(1.015);
	}
	/* Light highlight sweep on the cover, suggesting the curve of a printed
	   spine. Pure decoration. */
	.cover-shine {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			115deg,
			transparent 40%,
			color-mix(in srgb, white 6%, transparent) 50%,
			transparent 60%
		);
		pointer-events: none;
		mix-blend-mode: overlay;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0 0.1rem;
		position: relative;
		flex: 1 1 auto;
	}
	.card-year {
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.1rem;
	}
	.card-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: 1.18rem;
		line-height: 1.18;
		margin: 0;
		text-wrap: balance;
		color: var(--color-fg);
	}
	.card:hover .card-title,
	.card:focus-visible .card-title {
		color: var(--color-accent);
	}
	.card-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.86rem;
		color: var(--color-subtle);
		margin: 0.05rem 0 0.3rem;
		line-height: 1.4;
	}
	.card-blurb {
		font-family: var(--font-body);
		font-size: 0.86rem;
		line-height: 1.55;
		color: var(--color-muted);
		margin: 0;
	}
	/* CTA: same visual register as the homepage's primary CTA. Accent
	   colour, ui font, letter-spaced caps, arrow that translates on
	   hover. Sized down to a card-appropriate scale. Pushed to the
	   bottom of the body via margin-top auto so it lines up across
	   cards regardless of how long each blurb is. */
	.card-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: auto;
		padding-top: 0.65rem;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
	}
	.card-cta-arrow {
		display: inline-block;
		line-height: 1;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.card:hover .card-cta-arrow,
	.card:focus-visible .card-cta-arrow {
		transform: translateX(4px);
	}

	.card-title-featured {
		font-size: clamp(1.45rem, 2.6vw, 1.85rem);
	}

	/* Études & outils ------------------------------------------------- */
	/* The fourth shelf carries tools rather than books, so it deliberately
	   skips the cover-image treatment. A flat 2-column tile list with a
	   small fleuron marker keeps the visual language consistent (italic
	   titles, accent rule on hover) without misrepresenting these as
	   bound works. */
	.tools-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.6rem 1.2rem;
	}
	@media (max-width: 720px) {
		.tools-grid {
			grid-template-columns: 1fr;
		}
	}
	.tool-wrap {
		display: flex;
		opacity: 0;
		animation: card-in 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--card-index) * 40ms + var(--shelf-index, 0) * 120ms + 200ms);
	}
	.tool {
		display: grid;
		grid-template-columns: 1.5rem 1fr auto;
		align-items: start;
		gap: 0.85rem;
		width: 100%;
		padding: 0.95rem 1rem 1rem;
		text-decoration: none;
		color: var(--color-fg);
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		transition:
			background-color 160ms ease,
			color 160ms ease;
	}
	.tool:hover,
	.tool:focus-visible {
		background: color-mix(in srgb, var(--color-accent) 5%, transparent);
		color: var(--color-accent);
		outline: none;
	}
	.tool-mark {
		font-family: var(--font-heading);
		color: var(--color-accent);
		font-size: 0.95rem;
		line-height: 1.4;
		text-align: center;
	}
	.tool-body {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}
	.tool-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: 1.05rem;
		line-height: 1.25;
		margin: 0;
		color: inherit;
		text-wrap: balance;
	}
	.tool-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.84rem;
		color: var(--color-subtle);
		margin: 0;
		line-height: 1.4;
	}
	.tool-blurb {
		font-family: var(--font-body);
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-muted);
		margin: 0.15rem 0 0;
	}
	.tool-arrow {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		color: color-mix(in srgb, var(--color-fg) 35%, transparent);
		align-self: center;
		transition:
			color 160ms ease,
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.tool:hover .tool-arrow,
	.tool:focus-visible .tool-arrow {
		color: var(--color-accent);
		transform: translateX(3px);
	}

	/* Colophon ---------------------------------------------------------- */
	.colophon {
		margin-top: clamp(3rem, 6vw, 4.5rem);
		text-align: center;
		font-family: var(--font-body);
		font-size: 0.82rem;
		color: var(--color-muted);
		line-height: 1.6;
	}
	.colophon p {
		margin: 0;
	}

	/* Motion preferences ----------------------------------------------- */
	@media (prefers-reduced-motion: reduce) {
		.shelf,
		.card-wrap {
			animation: none;
			opacity: 1;
			transform: none;
		}
		.card,
		.card::after,
		.cover img,
		.card-cta-arrow {
			transition: none;
		}
	}
</style>
