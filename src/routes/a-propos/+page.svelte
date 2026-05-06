<script lang="ts">
	import ProseLayout from '$lib/components/ui/ProseLayout.svelte';
</script>

<svelte:head>
	<title>À propos · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Comment et pourquoi ce site a été construit : la première édition française du Catéchisme librement lisible et consultable sur le web."
	/>
	<link rel="canonical" href="https://catechismecatholique.fr/a-propos" />
	<meta property="og:title" content="À propos · Catéchisme de l'Église Catholique" />
	<meta
		property="og:description"
		content="La première édition numérique française du Catéchisme de l'Église Catholique, librement lisible, consultable et croisable avec la Bible."
	/>
</svelte:head>

<ProseLayout
	title="À propos de ce site"
	subtitle="La première édition numérique française du Catéchisme de l'Église Catholique, librement lisible et consultable sur le web."
	description="Comment et pourquoi ce site a été construit : la première édition française du Catéchisme librement lisible et consultable sur le web."
>
	<h2>Le Catéchisme et la lacune numérique</h2>

	<p>
		Le Catéchisme de l'Église catholique, promulgué le 11 octobre 1992 par saint Jean-Paul&nbsp;II
		et révisé en 1997, est le texte doctrinal de référence de l'Église universelle. En
		2&nbsp;865 paragraphes, il expose avec clarté et rigueur l'ensemble de la foi catholique : ce
		qu'elle croit, ce qu'elle célèbre, comment elle vit et comment elle prie.
	</p>

	<p>
		Pour qui souhaite le consulter en français sur le web, les options sont rares et imparfaites. Le
		site officiel
		<a
			href="https://www.vatican.va/archive/FRA0013/_INDEX.HTM"
			target="_blank"
			rel="noopener noreferrer">vatican.va</a
		>
		propose le texte intégral, mais dans une interface vieillissante, difficile à naviguer et peu
		lisible sur les appareils modernes. Des PDF et des ePubs circulent librement, mais ils restent
		cloisonnés : on peut les lire, pas vraiment les chercher ni les croiser avec d'autres sources. En
		anglais,
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
		<a href="https://pacificbibles.org/details.php?id=francl" target="_blank" rel="noopener noreferrer"
			><em>Néo-Crampon Libre</em></a
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
			Lire les 2&nbsp;865 paragraphes en navigation structurée (parties, sections, chapitres,
			articles)
		</li>
		<li>
			Rechercher par mot, par numéro de paragraphe (§&nbsp;27) ou par référence biblique
			(Jn&nbsp;1,&nbsp;14)
		</li>
		<li>Croiser chaque verset de la Bible avec les paragraphes du Catéchisme qui le citent</li>
		<li>Explorer le glossaire des termes théologiques, classés par thème</li>
		<li>Choisir parmi cinq modes d'affichage : clair, sépia, sombre, OLED, automatique</li>
	</ul>

	<p>Les textes sont libres de lecture. Aucun compte n'est requis.</p>

	<h2>Une idée simple</h2>

	<p>
		Ce projet a commencé comme une page de lecture : un simple affichage du texte du Catéchisme,
		propre et lisible sur un écran. Il a grandi, comme ces choses-là grandissent. La lecture
		appelait la recherche, la recherche appelait la concordance biblique, la concordance appelait le
		glossaire. Chaque ajout découlait naturellement du précédent.
	</p>

	<p>
		Le résultat est ce site. Il est offert librement, à toute personne qui souhaite lire, étudier ou
		approfondir sa foi à travers ce que l'Église enseigne. Il n'est pas fait pour un seul lecteur,
		ni pour sa gloire. Il est fait pour Dieu et pour Son Église, afin que Son enseignement demeure
		accessible à tous ceux qui le cherchent.
	</p>

	<p class="intercession">
		Saint Thomas d'Aquin, priez pour nous.<br />
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
