<script lang="ts">
	import ProseLayout from '$lib/components/ui/ProseLayout.svelte';
</script>

<svelte:head>
	<title>À propos · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Le Catéchisme de l'Église Catholique en français, avec recherche plein texte, concordance biblique et glossaire théologique. Gratuit, sans compte, sans publicité."
	/>
	<link rel="canonical" href="https://catechismecatholique.fr/a-propos" />
	<meta property="og:title" content="À propos · Catéchisme de l'Église Catholique" />
	<meta
		property="og:description"
		content="Le Catéchisme de l'Église Catholique en français, avec recherche plein texte, concordance biblique et glossaire théologique. Gratuit, sans compte, sans publicité."
	/>
	<meta property="og:image" content="https://catechismecatholique.fr/img/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
</svelte:head>

<ProseLayout
	title="À propos de ce site"
	subtitle="Le Catéchisme de l'Église Catholique en français, conçu pour le web : navigation structurée, recherche plein texte et concordance biblique."
	description="Le Catéchisme de l'Église Catholique en français, avec recherche plein texte, concordance biblique et glossaire théologique. Gratuit, sans compte, sans publicité."
>
	<h2>Le Catéchisme et la lacune en ligne</h2>

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
		peut les lire, pas vraiment les chercher ni les croiser avec d'autres sources. En anglais,
		<a
			href="https://www.catholiccrossreference.online/catechism/"
			target="_blank"
			rel="noopener noreferrer">catholiccrossreference.online</a
		>
		offre une lecture fluide avec concordance biblique, mais en anglais seulement.
	</p>

	<p>Le monde francophone méritait mieux.</p>

	<h2>Cette édition</h2>

	<p>
		Ce site reproduit fidèlement le texte de l'édition française officielle du Catéchisme de
		l'Église catholique (1998). Aucune modification éditoriale n'a été apportée : ni ajout, ni
		omission, ni reformulation. Ce que le Catéchisme dit, ce site le dit.
	</p>

	<p>
		La traduction de la Bible utilisée pour les références scripturaires est le
		<a
			href="https://pacificbibles.org/details.php?id=francl"
			target="_blank"
			rel="noopener noreferrer"><em>Néo-Crampon Libre</em></a
		>, une modernisation soigneuse de la traduction catholique française d'Augustin Crampon, mise à
		disposition par la Fraternité de Tibériade sous licence libre.
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

	<h2>Ce que le site permet</h2>

	<ul>
		<li>
			<strong>Navigation structurée</strong> : les 2&nbsp;865 paragraphes organisés en parties, sections,
			chapitres et articles, avec un sommaire hiérarchique. Chaque paragraphe affiche ses références bibliques
			et doctrinales.
		</li>
		<li>
			<strong>Recherche</strong> : par mot ou expression, par numéro de paragraphe (taper &laquo;&nbsp;27&nbsp;&raquo;
			ouvre directement le paragraphe&nbsp;27), ou par référence scripturaire (taper &laquo;&nbsp;Jn&nbsp;1,&nbsp;14&nbsp;&raquo;
			renvoie à tous les paragraphes qui citent ce verset).
		</li>
		<li>
			<strong>Concordance biblique</strong> : à partir de n'importe quel verset de la Bible, retrouver
			les paragraphes du Catéchisme qui le citent. Une façon de lire l'Écriture à la lumière de l'enseignement
			de l'Église.
		</li>
		<li>
			<strong>Références en contexte</strong> : dans chaque paragraphe, les citations scripturaires et
			les renvois doctrinaux s'ouvrent sans quitter la lecture.
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
		<li>
			<strong>Cinq thèmes d'affichage</strong> : clair, sépia, sombre, OLED et automatique (suit le réglage
			du système).
		</li>
	</ul>

	<h2>Libre et sans traçage</h2>

	<p>
		Ce site ne contient aucune publicité et ne dépose aucun cookie de traçage. La fréquentation est
		mesurée par Cloudflare Web Analytics, un outil sans cookie et sans collecte de données
		personnelles. Aucun compte n'est requis pour accéder à l'intégralité du contenu.
	</p>

	<p>
		Le code source est publié sur
		<a
			href="https://github.com/janvier-s/catechismecatholique"
			target="_blank"
			rel="noopener noreferrer">GitHub</a
		>.
	</p>

	<h2>Une idée simple</h2>

	<p>
		Ce projet est né d'un constat : il n'existait pas de bonne édition du Catéchisme accessible en
		ligne en français. Une page de lecture d'abord, sobre et lisible. Puis la recherche s'est
		imposée, puis la concordance biblique, puis le glossaire. Chaque chose appelait la suivante.
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
		<a href="/ccc" class="cta-btn">Lire le Catéchisme →</a>
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

	.cta-btn {
		display: inline-block;
		padding: 10px 26px;
		border: 1px solid var(--color-accent);
		border-radius: 3px;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent-text);
		text-decoration: none;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.cta-btn:hover {
		background: var(--color-accent);
		color: var(--color-panel);
	}
</style>
