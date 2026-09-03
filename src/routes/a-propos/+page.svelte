<script lang="ts">
	import ProseLayout from '$lib/components/ui/ProseLayout.svelte';
</script>

<svelte:head>
	<title>À propos du Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Le Catéchisme de l'Église Catholique en français, avec recherche plein texte et glossaire théologique. Gratuit, sans compte, sans publicité."
	/>
	<meta property="og:title" content="À propos du Catéchisme de l'Église Catholique" />
	<meta
		property="og:description"
		content="Le Catéchisme de l'Église Catholique en français, avec recherche plein texte et glossaire théologique. Gratuit, sans compte, sans publicité."
	/>
</svelte:head>

<ProseLayout
	title="À propos de ce site"
	subtitle="Le Catéchisme de l'Église Catholique en français, conçu pour le web : navigation structurée et recherche plein texte."
	description="Le Catéchisme de l'Église Catholique en français, avec recherche plein texte et glossaire théologique. Gratuit, sans compte, sans publicité."
>
	<h2>Le Catéchisme et la lacune numérique</h2>

	<p>
		Le Catéchisme de l'Église catholique, promulgué le 11 octobre 1992 par saint Jean-Paul&nbsp;II
		et révisé en 1997, est le texte doctrinal de référence de l'Église universelle. En 2&nbsp;865
		paragraphes, il expose avec clarté et rigueur l'ensemble de la foi catholique : ce qu'elle
		croit, ce qu'elle célèbre, comment elle vit et comment elle prie.
	</p>

	<p>
		Pour qui souhaite le consulter en français sur le web, les options sont rares et imparfaites. Le
		site officiel
		<a
			href="https://www.vatican.va/archive/FRA0013/_INDEX.HTM"
			target="_blank"
			rel="noopener noreferrer">vatican.va</a
		>
		propose le texte intégral, mais dans une interface vieillissante, difficile à naviguer et peu lisible
		sur les appareils modernes. Des versions numériques existent, mais elles restent cloisonnées : on
		peut les lire, mais pas vraiment les chercher ni les croiser avec d'autres sources. Il existe un site
		très utile,
		<a
			href="https://www.catholiccrossreference.online/catechism/"
			target="_blank"
			rel="noopener noreferrer">catholiccrossreference.online</a
		>, qui offre une lecture fluide et claire, avec un moteur de recherche simple, mais en anglais
		seulement.
	</p>

	<p>Le monde francophone méritait mieux.</p>

	<h2>Pourquoi étudier le Catéchisme ?</h2>

	<figure class="why-study">
		<img
			src="/img/why-study-catechism-600.webp"
			srcset="/img/why-study-catechism-600.webp 1x, /img/why-study-catechism-1200.webp 2x"
			alt="Diagramme en croix des quatre parties du Catéchisme : Le Symbole des Apôtres (première partie), La célébration de la foi (deuxième partie, les sacrements), La vie dans le Christ (troisième partie, les commandements), La prière chrétienne (quatrième partie, le Notre Père) ; au centre, la Sainte Trinité, le Mystère pascal, le Christ et la personne humaine."
			width="600"
			height="547"
			loading="lazy"
		/>
		<figcaption>Les quatre parties du Catéchisme, articulées autour du Christ.</figcaption>
	</figure>

	<ul class="why-study-list">
		<li>Il enseigne la foi avec clarté, sans ambiguïté et dans son intégralité.</li>
		<li>Il conduit au Christ et à la vie en Lui.</li>
		<li>C'est un exposé sérieux, destiné à des adultes, d'une foi vivante pour notre temps.</li>
	</ul>

	<h2>De pape en pape</h2>

	<p>
		Depuis sa promulgation en 1992, le Catéchisme a été recommandé par chaque successeur de Saint
		Pierre.
	</p>

	<blockquote class="papal-quote">
		<img
			src="/img/popes/john-paul-ii-200.webp"
			srcset="/img/popes/john-paul-ii-200.webp 1x, /img/popes/john-paul-ii-400.webp 2x"
			alt="Portrait du pape Jean-Paul&nbsp;II."
			width="100"
			height="100"
			class="papal-portrait"
			loading="lazy"
		/>
		<p>
			«&nbsp;Je le reconnais comme un instrument valable et autorisé au service de la communion
			ecclésiale et comme une norme sûre pour l'enseignement de la foi.&nbsp;»
		</p>
		<footer>
			<img
				src="/img/popes/john-paul-ii-signature.svg"
				alt="Signature de Jean-Paul II."
				class="papal-signature"
				loading="lazy"
				width="1864"
				height="410"
			/>
			<strong>Saint Jean-Paul&nbsp;II</strong>, constitution apostolique
			<em>Fidei depositum</em>,
			<a
				href="https://www.vatican.va/content/john-paul-ii/fr/apost_constitutions/documents/hf_jp-ii_apc_19921011_fidei-depositum.html"
				target="_blank"
				rel="noopener noreferrer">11 octobre 1992</a
			>.
		</footer>
	</blockquote>

	<blockquote class="papal-quote">
		<img
			src="/img/popes/benedict-xvi-200.webp"
			srcset="/img/popes/benedict-xvi-200.webp 1x, /img/popes/benedict-xvi-400.webp 2x"
			alt="Portrait du pape Benoît&nbsp;XVI."
			width="100"
			height="100"
			class="papal-portrait"
			loading="lazy"
		/>
		<p>
			«&nbsp;Lisez le Catéchisme de l'Église catholique et redécouvrez ainsi la beauté d'être
			chrétiens, d'être Église, de vivre le grand “nous” que Jésus a formé autour de lui, pour
			évangéliser le monde.&nbsp;»
		</p>
		<footer>
			<img
				src="/img/popes/benedict-xvi-signature.svg"
				alt="Signature de Benoît XVI."
				class="papal-signature"
				loading="lazy"
				width="324"
				height="99"
			/>
			<strong>Benoît&nbsp;XVI</strong>, homélie à Frascati,
			<a
				href="https://www.vatican.va/content/benedict-xvi/fr/homilies/2012/documents/hf_ben-xvi_hom_20120715_frascati.html"
				target="_blank"
				rel="noopener noreferrer">15 juillet 2012</a
			>.
		</footer>
	</blockquote>

	<blockquote class="papal-quote">
		<img
			src="/img/popes/francis-200.webp"
			srcset="/img/popes/francis-200.webp 1x, /img/popes/francis-400.webp 2x"
			alt="Portrait du pape François."
			width="100"
			height="100"
			class="papal-portrait"
			loading="lazy"
		/>
		<p>
			«&nbsp;Ce Catéchisme entend s'adresser à nos contemporains, avec leurs questions à la fois
			diverses et nouvelles. C'est ainsi que l'Église s'engage à exposer la foi en tant que réponse
			significative pour l'existence humaine, dans le moment particulier de l'histoire que nous
			vivons.&nbsp;»
		</p>
		<footer>
			<img
				src="/img/popes/francis-signature.svg"
				alt="Signature de François."
				class="papal-signature"
				loading="lazy"
				width="740"
				height="180"
			/>
			<strong>François</strong>, discours pour le 25<sup>e</sup> anniversaire du Catéchisme,
			<a
				href="https://www.vatican.va/content/francesco/fr/speeches/2017/october/documents/papa-francesco_20171011_convegno-nuova-evangelizzazione.html"
				target="_blank"
				rel="noopener noreferrer">11 octobre 2017</a
			>.
		</footer>
	</blockquote>

	<blockquote class="papal-quote">
		<img
			src="/img/popes/leo-xiv-200.webp"
			srcset="/img/popes/leo-xiv-200.webp 1x, /img/popes/leo-xiv-400.webp 2x"
			alt="Portrait du pape Léon&nbsp;XIV."
			width="100"
			height="100"
			class="papal-portrait"
			loading="lazy"
		/>
		<p>
			«&nbsp;Le Catéchisme est le “guide de voyage” qui nous préserve de l'individualisme et des
			discordes, parce qu'il atteste la foi de toute l'Église catholique.&nbsp;»
		</p>
		<footer>
			<img
				src="/img/popes/leo-xiv-signature.svg"
				alt="Signature de Léon XIV."
				class="papal-signature"
				loading="lazy"
				width="850"
				height="208"
			/>
			<strong>Léon&nbsp;XIV</strong>, homélie pour le Jubilé des catéchistes,
			<a
				href="https://www.vatican.va/content/leo-xiv/fr/homilies/2025/documents/20250928-omelia-giubileo-catechisti.html"
				target="_blank"
				rel="noopener noreferrer">28 septembre 2025</a
			>.
		</footer>
	</blockquote>

	<h2>Cette édition</h2>

	<p>
		Ce site reproduit fidèlement le texte de l'édition française officielle du Catéchisme de
		l'Église Catholique. Aucune modification éditoriale n'a été apportée : ni ajout, ni omission, ni
		reformulation. Ce que le Catéchisme dit, ce site le dit.
	</p>

	<p>
		La traduction de la Bible utilisée pour les références scripturaires est celle de la
		<a
			href="https://pacificbibles.org/details.php?id=francl"
			target="_blank"
			rel="noopener noreferrer"><em>Néo-Crampon Libre</em></a
		>, une modernisation soigneuse de la traduction catholique française du chanoine Augustin
		Crampon, mise à disposition par la Fraternité de Tibériade sous licence libre.
	</p>

	<div class="rights-block">
		<p class="rights-title">
			<span class="rights-cross" aria-hidden="true">✠</span> Catéchisme de l'Église Catholique
		</p>
		<p class="rights-body">
			© Libreria Editrice Vaticana, Cité du Vatican. Reproduit dans un cadre non commercial, à des
			fins d'accès libre à l'enseignement de l'Église.
		</p>
		<a
			href="https://www.vatican.va/archive/FRA0013/_INDEX.HTM"
			target="_blank"
			rel="noopener noreferrer"
			class="rights-link"
		>
			Texte officiel sur vatican.va →
		</a>
	</div>

	<div class="rights-block">
		<p class="rights-title">
			<span class="rights-cross" aria-hidden="true">✠</span> Néo-Crampon Libre · traduction biblique
		</p>
		<p class="rights-body">
			© 2022 Fraternité de Tibériade. Mise à disposition sous licence
			<a
				href="https://creativecommons.org/licenses/by-sa/4.0/"
				target="_blank"
				rel="noopener noreferrer"
				>Creative Commons Attribution - Partage dans les mêmes conditions 4.0</a
			>
			(CC BY-SA 4.0).
		</p>
		<a
			href="https://pacificbibles.org/details.php?id=francl"
			target="_blank"
			rel="noopener noreferrer"
			class="rights-link"
		>
			Néo-Crampon Libre sur pacificbibles.org →
		</a>
	</div>

	<h2>Le logo</h2>

	<div class="logo-block">
		<picture class="logo-block-img">
			<img
				src="/img/logo/logo-128.png"
				srcset="/img/logo/logo-128.png 1x, /img/logo/logo-192.png 2x"
				alt="Logo du Catéchisme : un Bon Pasteur entouré d'une brebis et d'un agneau, jouant de la flûte sous un arbre stylisé."
				width="96"
				height="96"
				class="logo-light"
			/>
			<img
				src="/img/logo/logo-dark-128.png"
				srcset="/img/logo/logo-dark-128.png 1x, /img/logo/logo-dark-192.png 2x"
				alt=""
				aria-hidden="true"
				width="96"
				height="96"
				class="logo-dark"
			/>
		</picture>
		<div class="logo-block-text">
			<p>
				Le logo est dessiné d'après une pierre tombale chrétienne des catacombes de Domitilla, à
				Rome, datée de la fin du troisième siècle. Cette image bucolique, d'origine païenne, fut
				adoptée par les chrétiens pour symboliser le repos et le bonheur que l'âme du défunt trouve
				dans la vie éternelle.
			</p>
			<p>
				Elle suggère aussi plusieurs traits qui caractérisent ce Catéchisme : le Christ Bon Pasteur
				qui guide et protège ses fidèles (la brebis) par son autorité (le bâton), les attire par la
				symphonie mélodieuse de la vérité (la flûte) et les fait reposer à l'ombre de «&nbsp;l'arbre
				de la vie&nbsp;», sa Croix rédemptrice qui ouvre le paradis.
			</p>
		</div>
	</div>

	<h2>Ce que le site permet</h2>

	<ul>
		<li>
			<strong>Navigation structurée</strong> : les 2&nbsp;865 paragraphes organisés en parties, sections,
			chapitres et articles. Un sommaire hiérarchique s'affiche dans la marge gauche : il se déplie automatiquement
			au niveau du chapitre en cours et suit la lecture au fil du défilement.
		</li>
		<li>
			<strong>Recherche</strong> : par mot ou expression, par numéro de paragraphe (taper &laquo;&nbsp;27&nbsp;&raquo;
			ouvre directement le paragraphe&nbsp;27), ou par référence scripturaire (taper &laquo;&nbsp;Jn&nbsp;1,&nbsp;14&nbsp;&raquo;
			renvoie à tous les paragraphes qui citent ce verset).
		</li>
		<li>
			<strong>Panneau d'étude</strong> : chaque paragraphe est accompagné d'un panneau latéral à
			cinq onglets, accessible sans quitter la lecture.
			<ul class="study-panel-list">
				<li><strong>Bible</strong> : le texte intégral des versets cités dans le paragraphe.</li>
				<li>
					<strong>Renvois</strong> : les renvois internes inscrits dans le texte du Catéchisme. Le Catéchisme
					n'est pas une somme de paragraphes isolés : presque chacun en cite d'autres en référence, car
					il est conçu pour être lu comme un tout. Cet onglet regroupe ces liens et facilite la navigation
					telle que le texte la prescrit.
				</li>
				<li>
					<strong>Renvoyé par</strong> : les paragraphes qui mentionnent ce paragraphe en renvoi.
				</li>
				<li>
					<strong>Sources</strong> : les documents cités en référence : conciles, textes des Pères de
					l'Église, documents liturgiques.
				</li>
				<li>
					<strong>En Bref</strong> : l'En Bref de l'article auquel appartient le paragraphe lu. Chaque
					article du Catéchisme se clôt par une série de formules brèves qui en résument la doctrine.
				</li>
			</ul>
		</li>
		<li>
			<strong>Glossaire</strong> : les principaux termes de la théologie catholique, définis et classés
			par thème.
		</li>
		<li>
			<strong>Lecture sur mobile</strong> : aucune application à installer. Le site fonctionne sur téléphone,
			tablette et ordinateur.
		</li>
		<li>
			<strong>Paragraphe du jour</strong> : chaque jour, un paragraphe du Catéchisme mis en avant sur
			la page d'accueil, pour une lecture quotidienne progressive.
		</li>
	</ul>

	<h2>Options de lecture</h2>

	<p>
		Le panneau d'options, accessible depuis l'icône en haut de chaque page, propose trois onglets.
	</p>

	<p>
		<strong>Texte</strong> : taille du corps, interligne et police de caractères. Quatre thèmes
		d'affichage sont disponibles : <strong>Clair</strong> (fond blanc, contraste classique),
		<strong>Sépia</strong> (tons chauds proches du papier, pour une lecture prolongée),
		<strong>Sombre</strong> (fond sombre, pour les environnements peu éclairés) et
		<strong>OLED</strong> (fond noir pur, pour les écrans AMOLED, économe en énergie).
	</p>

	<p>
		<strong>Lecture</strong> : largeur de colonne (étroite, standard ou large), alignement du texte (à
		gauche ou justifié), disposition des renvois entre paragraphes (en ligne ou en marge) et affichage
		des références bibliques (en ligne ou en exposant).
	</p>

	<p>
		<strong>Notes</strong> : permet de masquer individuellement les annotations dans le texte : renvois
		(§), références bibliques en ligne, références en exposant, sources. Un interrupteur général masque
		tout d'un coup pour une lecture sans annotations.
	</p>

	<h2>Libre et sans traçage</h2>

	<p>
		Ce site ne contient aucune publicité et ne dépose aucun cookie de traçage. La fréquentation est
		mesurée par Cloudflare Web Analytics, un outil sans cookie et sans collecte de données
		personnelles. Aucun compte n'est requis pour accéder à l'intégralité du contenu.
	</p>

	<h2>Une idée simple</h2>

	<p>
		Ce projet est né d'un constat : il n'existait pas de bonne édition du Catéchisme accessible en
		ligne en français. Tout a commencé par une page de lecture, sobre et lisible. Puis la recherche
		s'est imposée, puis le glossaire. Chaque chose appelait la suivante.
	</p>

	<p>
		Ce site est le résultat. Offert librement, sans compte ni publicité, à quiconque veut lire,
		chercher ou approfondir sa foi à travers l'enseignement de l'Église. Pour la plus grande gloire
		de Dieu.
	</p>

	<p class="intercession">
		Saint Thomas d'Aquin, priez pour nous.<br />
		Saint Jean-Paul&nbsp;II, priez pour nous.<br />
		Saint Pie&nbsp;X, priez pour nous.
	</p>

	<p class="laus-deo"><em>Laus Deo.</em></p>

	<div class="cta-row">
		<a href="/cec" class="cta-btn">Lire le Catéchisme →</a>
	</div>
</ProseLayout>

<style>
	.rights-block {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 18px 22px;
		margin: 28px 0;
		background: color-mix(in srgb, var(--color-border) 25%, transparent);
	}

	.rights-title {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.1em;
		color: var(--color-accent-text);
		margin: 0 0 8px;
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.rights-cross {
		color: var(--color-accent);
	}

	.rights-body {
		font-family: var(--font-body);
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--color-fg);
		margin: 0 0 10px;
	}

	.rights-link {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-accent-text);
		text-decoration: none;
		letter-spacing: 0.04em;
	}

	.rights-link:hover {
		color: var(--color-accent);
	}

	.intercession {
		margin-top: 2.5rem;
		text-align: center;
		color: var(--color-subtle);
		font-size: 0.92rem;
		font-style: italic;
		line-height: 1.9;
	}

	.laus-deo {
		margin-top: 1.25rem;
		text-align: center;
		color: var(--color-accent-text);
		font-family: var(--font-heading);
		font-size: 1.4rem;
		letter-spacing: 0.06em;
	}

	.cta-row {
		display: flex;
		justify-content: center;
		margin-top: 2.5rem;
	}

	.cta-row a.cta-btn,
	.cta-row a.cta-btn:link,
	.cta-row a.cta-btn:visited {
		display: inline-block;
		padding: 11px 28px;
		border: 1px solid var(--color-accent);
		border-radius: 3px;
		background: var(--color-accent);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #fff;
		text-decoration: none;
		transition: background 150ms ease;
	}

	.cta-row a.cta-btn:hover {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
		color: #fff;
	}

	/* Logo block · logo above, prose below so the image can run larger
	   than a thumbnail. */
	.logo-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		margin: 1.5rem 0 2rem;
		padding: 1.75rem 1.4rem 1.5rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-border) 18%, transparent);
	}
	.logo-block-img {
		flex: 0 0 auto;
		width: 168px;
		height: 168px;
	}
	.logo-block-img :global(img) {
		width: 100%;
		height: 100%;
	}
	.logo-block-text {
		max-width: 60ch;
	}
	.logo-block-text p {
		margin: 0 0 0.8em;
		font-size: 0.92rem;
		line-height: 1.65;
	}
	.logo-block-text p:last-child {
		margin-bottom: 0;
	}

	/* Restore default disc bullets on the StudyPanel sub-list (Tailwind's
	   preflight strips list-style globally). */
	.study-panel-list {
		list-style: disc;
		padding-left: 1.4rem;
	}
	@media (max-width: 640px) {
		.logo-block {
			gap: 1.15rem;
			padding: 1.2rem 1rem;
		}
		.logo-block-img {
			width: 132px;
			height: 132px;
		}
	}

	/* Why-study figure · centred diagram of the four parts with a caption,
	   followed by a list of three reasons rendered as bigger, well-spaced
	   bullets that read as a manifesto rather than a checklist. */
	.why-study {
		margin: 1.5rem auto 1.75rem;
		max-width: 520px;
		text-align: center;
	}
	.why-study img {
		width: 100%;
		height: auto;
		max-width: 500px;
		display: block;
		margin: 0 auto;
		border-radius: 12px;
	}
	.why-study figcaption {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-style: italic;
		line-height: 1.5;
		color: var(--color-subtle);
		margin-top: 0.85rem;
	}
	.why-study-list {
		list-style: none;
		margin: 1rem 0 2.25rem;
		padding: 0;
		max-width: 560px;
	}
	.why-study-list li {
		position: relative;
		padding: 0.65rem 0 0.65rem 2rem;
		font-family: var(--font-body);
		font-size: 1.02rem;
		line-height: 1.6;
		color: var(--color-fg);
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}
	.why-study-list li:last-child {
		border-bottom: none;
	}
	.why-study-list li::before {
		content: '✠';
		position: absolute;
		left: 0.4rem;
		top: 0.65rem;
		color: var(--color-accent);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	/* Papal quote · round portrait at the left, quote and signed attribution
	   on the right. No left rule. Signature sits ABOVE the source line so
	   it reads as the visual seal of the citation. */
	.papal-quote {
		display: flex;
		flex-wrap: wrap;
		column-gap: 1.25rem;
		row-gap: 0.5rem;
		align-items: flex-start;
		margin: 1.75rem 0;
		padding: 0;
	}
	.papal-portrait {
		flex: 0 0 auto;
		width: 88px;
		height: 88px;
		border-radius: 50%;
		object-fit: cover;
		object-position: center 30%;
		filter: grayscale(0.15);
	}
	.papal-quote > p {
		flex: 1 1 calc(100% - 88px - 1.25rem);
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-fg);
		margin: 0;
	}
	.papal-quote > footer {
		flex: 1 1 calc(100% - 88px - 1.25rem);
		margin-left: calc(88px + 1.25rem);
		font-family: var(--font-ui);
		font-size: 0.78rem;
		line-height: 1.55;
		color: var(--color-subtle);
	}
	.papal-quote footer strong {
		color: var(--color-accent-text);
		font-weight: 600;
	}
	.papal-quote footer a {
		color: inherit;
		text-decoration-color: var(--color-border);
		text-underline-offset: 2px;
	}
	.papal-quote footer a:hover {
		color: var(--color-accent);
	}
	.papal-signature {
		display: block;
		height: 38px;
		width: auto;
		max-width: 200px;
		margin: 0 0 0.45rem;
		opacity: 0.7;
	}
	/* Dark-mode signature inversion is in app.css so it covers
	   data-theme=dark, oled, and auto+OS-dark uniformly. */
	@media (max-width: 640px) {
		.papal-quote {
			flex-direction: column;
			align-items: center;
			gap: 0.85rem;
			text-align: left;
		}
		.papal-quote > p,
		.papal-quote > footer {
			flex: 1 1 auto;
			margin-left: 0;
		}
		.papal-portrait {
			width: 96px;
			height: 96px;
		}
		.papal-signature {
			margin-left: auto;
			margin-right: auto;
		}
	}
</style>
