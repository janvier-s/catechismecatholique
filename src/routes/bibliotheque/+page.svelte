<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import { CORPORA, FEATURED, TOOLS, type CorpusRecord } from '$lib/corpora';

	// Bibliothèque: a bibliographic register of every corpus the site
	// hosts. Visual language draws from medieval scriptoria (rubrics,
	// fleurons, hanging Roman numerals) but the typography and grid are
	// fully modern. Shelves I/II/III are derived from `$lib/corpora`;
	// Shelf IV (tools) is a flat-tile row from TOOLS.

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

	function workFromCorpus(c: CorpusRecord): Work {
		return {
			slug: c.id,
			href: c.urlPrefix,
			title: c.title,
			subtitle: c.subtitle,
			blurb: c.blurb,
			year: c.year,
			image: c.cover,
			focus: c.coverFocus
		};
	}

	function shelfWorks(shelf: 'I' | 'II' | 'III'): Work[] {
		return CORPORA.filter((c) => c.shelf === shelf).map(workFromCorpus);
	}

	// CIC 1917 ships its own Bibliothèque card alongside the 1983 code
	// (which is the canonical CIC record).
	const cic1917: Work = {
		slug: 'cic-1917',
		href: '/cic/1917',
		title: 'Code Pio Benedictin',
		subtitle: 'Codex Iuris Canonici précédent',
		blurb: "Premier code unifié du droit de l'Église latine, en vigueur jusqu'en 1983.",
		year: '1917',
		image: '/img/bibliotheque/cic-1917.webp'
	};

	const ibp: Work = {
		slug: 'bon-pasteur',
		href: '/bon-pasteur',
		title: 'Institut du Bon Pasteur',
		subtitle: 'Catéchisme, doctrine et liturgie',
		blurb:
			"Trois cours de catéchèse de l'Institut du Bon Pasteur : adultes, doctrine de la foi et liturgie.",
		year: 'IBP',
		image: '/img/bibliotheque/bon-pasteur.webp'
	};

	// The three foundational works: CEC (primary text), Compendium (its
	// official abridgement), and the Bible. Featured above the shelves.
	// Compendium is promoted out of shelf I so its shelf slot goes to IBP.
	const [cec, bible] = FEATURED.map((f) => ({
		slug: f.id,
		href: f.urlPrefix,
		title: f.title,
		subtitle: f.subtitle,
		blurb: f.blurb,
		year: f.year,
		image: f.cover
	}));
	const featured: Work[] = [
		cec!,
		workFromCorpus(CORPORA.find((c) => c.id === 'compendium')!),
		bible!
	];

	const shelves: Shelf[] = [
		{
			roman: 'I',
			title: 'Catéchismes',
			kicker: 'Exposés systématiques de la foi',
			works: (() => {
				const s = shelfWorks('I').filter((w) => w.slug !== 'compendium');
				return [...s.slice(0, 3), ibp, ...s.slice(3)];
			})()
		},
		{
			roman: 'II',
			title: 'Catéchèse & doctrine',
			kicker: 'Synthèses doctrinales et catéchèses patristiques',
			works: shelfWorks('II')
		},
		{
			roman: 'III',
			title: 'Magistère',
			kicker: 'Documents conciliaires, canoniques et liturgiques',
			works: (() => {
				const bySlug = new Map(shelfWorks('III').map((w) => [w.slug, w]));
				return [
					bySlug.get('vatican-ii')!,
					bySlug.get('denzinger')!,
					bySlug.get('documents-pontificaux')!,
					cic1917,
					bySlug.get('cic')!,
					bySlug.get('pgmr')!
				];
			})()
		},
		{
			roman: 'IV',
			title: 'Études & outils',
			kicker: 'Outils transversaux pour la lecture du Catéchisme',
			works: TOOLS.map((t) => ({
				slug: t.slug,
				href: t.href,
				title: t.title,
				subtitle: t.subtitle,
				blurb: t.blurb,
				year: 'Outil',
				image: t.cover ?? PLACEHOLDER
			}))
		}
	];

	const totalWorks = $derived(
		featured.length + shelves.reduce((sum, shelf) => sum + shelf.works.length, 0)
	);
</script>

<MetaTags
	title="Bibliothèque · Catéchisme de l'Église Catholique"
	description="Tous les textes hébergés sur le site, en quatre rayons : catéchismes, catéchèse et doctrine, magistère, études et outils."
/>

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
				<!-- Études & outils: not "books". Flat compact tiles with the
				     same uppercase CTA as the book cards, no cover image. -->
				<ul class="tools-grid">
					{#each shelf.works as work, wi (work.slug)}
						<li class="tool-wrap" style="--card-index: {wi}">
							<a class="tool" href={work.href}>
								<span class="tool-body">
									<h3 class="tool-title">{work.title}</h3>
									{#if work.subtitle}
										<p class="tool-sub">{work.subtitle}</p>
									{/if}
									<p class="tool-blurb">{work.blurb}</p>
									<span class="card-cta">
										Ouvrir<span class="card-cta-arrow" aria-hidden="true">→</span>
									</span>
								</span>
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

	/* Featured row: CEC, Compendium, Bible side by side. */
	.featured {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.6rem 1.4rem;
		margin-bottom: clamp(2.5rem, 5vw, 4rem);
		padding-bottom: clamp(2rem, 5vw, 3.5rem);
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
	}
	@media (max-width: 760px) {
		.featured {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 480px) {
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
		font-style: normal;
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
	/* Five tools in a 2-col grid leave the last tile (Prières & Formules)
	   alone in row 3. Span the tile full-width and re-grid its inner
	   layout so the mark + body sit centred horizontally, text-aligned
	   centre, rather than hard-left in a wide row. */
	.tools-grid .tool-wrap:last-child {
		grid-column: 1 / -1;
	}
	.tools-grid .tool-wrap:last-child .tool {
		text-align: center;
	}
	.tools-grid .tool-wrap:last-child .tool-body {
		align-items: center;
	}
	.tool-wrap {
		display: flex;
		opacity: 0;
		animation: card-in 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--card-index) * 40ms + var(--shelf-index, 0) * 120ms + 200ms);
	}
	.tool {
		display: block;
		width: 100%;
		padding: 0.95rem 1rem 1rem;
		text-decoration: none;
		color: var(--color-fg);
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
