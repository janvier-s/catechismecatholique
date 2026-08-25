<script lang="ts">
	const PDF_1992_URL =
		'https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-1992.pdf';
	const PDF_2012_URL =
		'https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-2012.pdf';

	const faqJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: "Quelle est la différence entre l'édition de 1992 et celle de 2012 ?",
				acceptedAnswer: {
					'@type': 'Answer',
					text: "L'édition de 1992 est le texte français provisoire original. L'édition de 2012 reprend le texte définitif de 1997/1998, qui comporte une centaine de corrections mineures et un changement notable au paragraphe 2267 sur la peine de mort."
				}
			},
			{
				'@type': 'Question',
				name: 'Peut-on lire le Catéchisme en ligne sans le télécharger ?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Oui, l'intégralité du texte est consultable directement sur ce site, paragraphe par paragraphe, depuis le sommaire."
				}
			}
		]
	};

	const editionsJsonLd = [
		{
			'@context': 'https://schema.org',
			'@type': 'DigitalDocument',
			name: "Catéchisme de l'Église catholique (édition 1992)",
			datePublished: '1992',
			publisher: 'Mame / Plon',
			inLanguage: 'fr',
			encodingFormat: 'application/pdf',
			url: PDF_1992_URL
		},
		{
			'@context': 'https://schema.org',
			'@type': 'DigitalDocument',
			name: "Catéchisme de l'Église catholique (édition 2012)",
			datePublished: '2012',
			publisher: 'Bayard / Cerf / Fleurus-Mame',
			inLanguage: 'fr',
			encodingFormat: 'application/pdf',
			url: PDF_2012_URL
		}
	];

	function jsonLdScriptTag(data: unknown): string {
		const open = '<' + 'script type="application/ld+json">';
		const close = '<' + '/script>';
		return `${open}${JSON.stringify(data)}${close}`;
	}
</script>

<svelte:head>
	<title>Télécharger le Catéchisme de l'Église catholique en PDF gratuit (1992, 2012)</title>
	<meta
		name="description"
		content="Téléchargez gratuitement le Catéchisme de l'Église catholique en PDF : édition originale de 1992 et réédition du texte définitif de 2012. Lecture en ligne ou hors ligne, sans inscription."
	/>
	<link rel="canonical" href="https://catechismecatholique.fr/telecharger" />
	<meta property="og:type" content="website" />
	<meta
		property="og:title"
		content="Télécharger le Catéchisme de l'Église catholique en PDF gratuit (1992, 2012)"
	/>
	<meta
		property="og:description"
		content="Téléchargez gratuitement le Catéchisme de l'Église catholique en PDF : édition originale de 1992 et réédition du texte définitif de 2012. Lecture en ligne ou hors ligne, sans inscription."
	/>
	<meta property="og:url" content="https://catechismecatholique.fr/telecharger" />
	{@html jsonLdScriptTag(faqJsonLd)}
	{#each editionsJsonLd as doc (doc.name)}
		{@html jsonLdScriptTag(doc)}
	{/each}
</svelte:head>

<main class="page">
	<div class="page-inner">
		<header class="title-block">
			<p class="eyebrow">Éditions imprimées · Gratuit</p>
			<h1 class="title">Télécharger le Catéchisme de l'Église catholique en PDF</h1>
			<p class="subhead">
				Le texte intégral du Catéchisme de l'Église catholique à télécharger gratuitement en PDF,
				pour le lire en ligne ou hors ligne, imprimer ou consulter hors connexion. Deux éditions
				françaises disponibles&nbsp;: 1992 et 2012.
			</p>
			<div class="ornament" aria-hidden="true">
				<span class="fleuron">✠</span>
				<span class="rule"></span>
			</div>
		</header>

		<section class="cards" aria-label="Éditions disponibles">
			<article class="card">
				<p class="card-label">Édition française originale · 1992</p>
				<h2 class="card-title">Catéchisme de l'Église catholique (1992)</h2>
				<p class="card-desc">
					Première édition française du Catéchisme de l'Église catholique, publiée par Mame et Plon.
					Texte provisoire, antérieur à l'<i>editio typica</i> latine de 1997.
				</p>
				<p class="card-meta">PDF · téléchargement gratuit · 33,6 Mo</p>
				<a
					class="card-button"
					href={PDF_1992_URL}
					download="catechisme-eglise-catholique-1992.pdf"
					rel="noopener"
				>
					Télécharger le PDF (édition 1992)
				</a>
			</article>

			<article class="card">
				<p class="card-label">Réédition du texte définitif · 2012</p>
				<h2 class="card-title">Catéchisme de l'Église catholique (2012)</h2>
				<p class="card-desc">
					Réédition Bayard/Cerf/Fleurus-Mame du texte définitif de 1997/1998, publiée à l'occasion
					de l'Année de la Foi, avec guide de lecture.
				</p>
				<p class="card-meta">PDF · téléchargement gratuit · 42,3 Mo</p>
				<a
					class="card-button"
					href={PDF_2012_URL}
					download="catechisme-eglise-catholique-2012.pdf"
					rel="noopener"
				>
					Télécharger le PDF (édition 2012)
				</a>
			</article>
		</section>

		<section class="prose" aria-labelledby="changes-heading">
			<h2 id="changes-heading" class="section-label">
				Qu'est-ce qui a changé entre 1992 et le texte définitif ?
			</h2>
			<p>
				Le texte français de 1992 était provisoire. L'<i>editio typica</i> latine a suivi en 1997
				(lettre apostolique <i>Laetamur magnopere</i>), avec le texte français définitif en 1998.
				L'édition de 2012 reprend ce texte définitif de 1998, et non une nouvelle révision.
			</p>
			<p>
				Environ 103 modifications séparent 1992 du texte définitif, la plupart mineures
				(vocabulaire, références, formulations plus claires). Le cardinal Ratzinger, alors préfet de
				la Congrégation pour la doctrine de la foi, avait précisé qu'il ne s'agissait pas d'un «
				nouveau catéchisme » et que les possesseurs de l'édition de 1992 n'avaient pas besoin de la
				remplacer.
			</p>
			<p>
				Le changement le plus notable porte sur le paragraphe 2267 (peine de mort), qui intègre
				l'enseignement d'<i>Evangelium vitae</i> (1995)&nbsp;: les cas de « nécessité absolue » justifiant
				la peine de mort sont désormais décrits comme rares ou pratiquement inexistants, grâce aux moyens
				modernes de rendre un coupable inoffensif.
			</p>
			<ul>
				<li>
					Anges gardiens (§336)&nbsp;: ils accompagnent la vie humaine « dès son commencement », et
					non plus seulement dès la naissance.
				</li>
				<li>
					Salut des non-baptisés de bonne volonté (§1281)&nbsp;: formulation en « peuvent être
					sauvés » plutôt que « sont sauvés. »
				</li>
				<li>
					Précisions mineures sur le pouvoir sacré et le ministère diaconal (§875), les mariages
					mixtes (§1635) et l'observance du dimanche (§2042).
				</li>
			</ul>
			<p class="note">
				La reformulation de 2018 du paragraphe 2267, qui qualifie la peine de mort d'« inadmissible
				», est un changement ultérieur et distinct, non repris dans les deux éditions proposées ici
				(1992 et 2012).
			</p>
		</section>

		<section class="prose" aria-labelledby="faq-heading">
			<h2 id="faq-heading" class="section-label">Questions fréquentes</h2>

			<h3>Quelle est la différence entre l'édition de 1992 et celle de 2012 ?</h3>
			<p>
				Voir la section <a href="#changes-heading">« Qu'est-ce qui a changé »</a> ci-dessus : le texte
				de 2012 reprend la version définitive de 1997/1998, avec environ 103 corrections par rapport à
				1992.
			</p>

			<h3>Peut-on lire le Catéchisme en ligne sans le télécharger ?</h3>
			<p>
				Oui, l'intégralité du texte est aussi consultable directement sur ce site, paragraphe par
				paragraphe, depuis le <a href="/cec/sommaire">sommaire</a>.
			</p>
		</section>

		<div class="rights">
			<p>
				Texte © Libreria Editrice Vaticana, Cité du Vatican. Reproduit dans un cadre non commercial.
			</p>
		</div>
	</div>
</main>

<style>
	.page {
		min-height: calc(100vh - 80px);
		padding: clamp(1.5rem, 4vh, 3rem) 1.5rem clamp(3rem, 6vh, 4rem);
		background: var(--color-bg);
		color: var(--color-fg);
		display: flex;
		justify-content: center;
	}
	.page-inner {
		width: 100%;
		max-width: 720px;
		display: flex;
		flex-direction: column;
		gap: clamp(2rem, 4vh, 3rem);
	}

	/* Title block */
	.title-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}
	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
		padding-left: 0.28em;
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(1.75rem, 4.5vw, 2.5rem);
		font-weight: 700;
		line-height: 1.15;
		color: var(--color-heading, var(--color-fg));
		margin: 0.5rem 0 0;
	}
	.subhead {
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-muted);
		max-width: 560px;
		margin: 0;
	}
	.ornament {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.5rem;
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		color: var(--color-accent);
		line-height: 1;
	}
	.rule {
		width: 56px;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent),
			transparent
		);
	}

	/* Cards */
	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.5rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-panel);
	}
	.card-label {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-accent-text);
		margin: 0;
	}
	.card-title {
		font-family: var(--font-heading);
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--color-fg);
		margin: 0;
	}
	.card-desc {
		font-family: var(--font-body);
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--color-muted);
		margin: 0;
	}
	.card-meta {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		color: var(--color-subtle);
		margin: 0.25rem 0 0;
	}
	.card-button {
		display: inline-flex;
		justify-content: center;
		margin-top: 0.75rem;
		padding: 0.65rem 1rem;
		border-radius: 4px;
		background: var(--color-accent);
		color: white;
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 600;
		text-decoration: none;
		transition: opacity 120ms ease;
	}
	.card-button:hover {
		opacity: 0.85;
	}

	/* Prose sections */
	.prose {
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.75;
		color: var(--color-fg);
	}
	.prose :global(p) {
		margin: 0 0 1rem;
	}
	.prose :global(h3) {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		font-weight: 600;
		margin: 1.5rem 0 0.5rem;
	}
	.prose :global(ul) {
		margin: 0 0 1rem;
		padding-left: 1.25rem;
	}
	.prose :global(li) {
		margin-bottom: 0.5rem;
	}
	.prose :global(.note) {
		font-size: 0.88rem;
		color: var(--color-subtle);
	}
	.section-label {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-accent-text);
		margin: 0 0 1rem;
	}

	/* Rights */
	.rights {
		border-top: 1px solid var(--color-border);
		padding-top: 1rem;
	}
	.rights p {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		letter-spacing: 0.4px;
		color: var(--color-subtle);
		margin: 0;
	}

	@media (max-width: 640px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}
</style>
