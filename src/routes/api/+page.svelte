<script lang="ts">
	import ProseLayout from '$lib/components/ui/ProseLayout.svelte';
	import ApiPlayground from '$lib/components/api/ApiPlayground.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>API du Catéchisme de l'Église Catholique · JSON gratuit, sans clé</title>
	<meta
		name="description"
		content="API publique et gratuite du Catéchisme de l'Église catholique : paragraphes, recherche plein texte, versets bibliques, calendrier liturgique, thèmes et glossaire."
	/>
</svelte:head>

<ProseLayout
	title="API du Catéchisme"
	subtitle="Points d'accès en lecture seule, sans clé ni authentification."
	description="API publique et gratuite du Catéchisme de l'Église catholique : paragraphes, recherche plein texte, versets bibliques, calendrier liturgique, thèmes et glossaire."
>
	<p>
		Le site expose une petite API JSON en lecture seule, sans clé ni inscription. Elle sert à
		afficher les pages du Catéchisme et alimente également ce site : c'est la même API que vous
		pouvez appeler directement.
	</p>

	<h2>Points d'accès</h2>

	<div class="route-table">
		<table>
			<thead>
				<tr><th>Route</th><th>Description</th><th>Exemple</th></tr>
			</thead>
			<tbody>
				{#each data.routes as route (route.path)}
					<tr>
						<td><code>GET {route.path}</code></td>
						<td>{route.summary}</td>
						<td><a href={route.example}><code>{route.example}</code></a></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p>
		Le document <a href="/api/openapi.json"><code>/api/openapi.json</code></a> décrit l'ensemble au format
		OpenAPI 3.1, utilisable par un générateur de client ou par un agent.
	</p>

	<h2>Essayer</h2>

	<p>
		Choisissez une route, modifiez l'adresse si vous le souhaitez, puis envoyez la requête. L'appel
		part de votre navigateur vers cette même API, sans clé ni intermédiaire.
	</p>

	<ApiPlayground routes={data.routes} />

	<h2>Paragraphe par numéro</h2>

	<p>
		<code>GET /api/cec/[number]</code> renvoie un paragraphe du Catéchisme, de 1 à 2865, avec son contexte
		(partie, section, article, intertitre) et ses renvois.
	</p>

	<pre><code>GET /api/cec/2559</code></pre>

	<pre><code
			>{`{
  "number": 2559,
  "corpus": "ccc",
  "text_html": "<span>« La prière est l'élévation de l'âme vers Dieu…",
  "text": "« La prière est l'élévation de l'âme vers Dieu…",
  "cross_refs": ["2613", "2736"],
  "bible_refs": [{ "text": "Ps 130:14" }, { "text": "Lc 18:9-14" }],
  "citations": [],
  "magisterial_refs": [
    { "type": "patristic", "raw": "saint Jean Damascène, de fide orthodoxa 3:24 : PG 94:1089D", "idx": "a" },
    { "type": "bible", "raw": "Ps 130:14", "idx": 1, "display_idx": 1 }
  ],
  "breadcrumb": {
    "part": { "slug": "4-priere-chretienne", "title": "La prière chrétienne", "number": 4,
              "range": { "from": 2558, "to": 2865 } },
    "section": { "slug": "1-priere-dans-la-vie-chretienne", "title": "La prière dans la vie chrétienne",
                 "number": 1, "range": { "from": 2558, "to": 2758 } },
    "article": { "slug": "quest-ce-que-la-priere", "title": "Qu'est-ce que la prière ?",
                 "range": { "from": 2559, "to": 2565 } },
    "heading": { "id": "la-priere-comme-don-de-dieu", "title": "La prière comme don de Dieu" }
  },
  "prev": 2558,
  "next": 2560,
  "permalink": "https://catechismecatholique.fr/cec/2559"
}`}</code
		></pre>

	<p>
		Les niveaux de <code>breadcrumb</code> sont facultatifs : le Prologue n'a ni
		<code>section</code> ni <code>article</code>, et un paragraphe hors intertitre n'a pas de
		<code>heading</code>. Les numéros de <code>cross_refs</code> sont des chaînes, non des entiers.
	</p>

	<p>Un numéro hors de 1..2865 répond <code>404</code> avec un champ <code>error</code>.</p>

	<h2>Plusieurs paragraphes</h2>

	<p>
		<code>GET /api/cec</code> sert plusieurs paragraphes en une requête, soit par liste (<code
			>numbers=1,2,3</code
		>), soit par plage (<code>range=10-25</code>). Chaque élément de
		<code>items</code> a exactement la forme d'une réponse unitaire.
	</p>

	<pre><code>GET /api/cec?range=1-3</code></pre>

	<pre><code
			>{`{
  "count": 3,
  "items": [
    {
      "number": 1,
      "corpus": "ccc",
      "text": "Dieu, infiniment Parfait et Bienheureux en Lui-même…",
      "cross_refs": [],
      "bible_refs": [],
      "breadcrumb": {
        "part": { "slug": "prologue", "title": "Prologue", "range": { "from": 1, "to": 25 } },
        "heading": { "id": "i-la-vie-de-lhomme-connaitre-et-aimer-dieu",
                     "title": "I. La vie de l'homme – connaître et aimer Dieu" }
      },
      "prev": null,
      "next": 2,
      "permalink": "https://catechismecatholique.fr/cec/1"
    }
  ]
}`}</code
		></pre>

	<p>
		Au plus 50 paragraphes par requête. Si <code>numbers</code> et <code>range</code> sont donnés
		tous les deux, <code>range</code> l'emporte. Un <code>include</code> large sur une plage large est
		refusé : le produit du nombre de paragraphes par le nombre de blocs ne peut dépasser 100 lectures.
	</p>

	<h2>Recherche</h2>

	<p>
		<code>GET /api/search?q=…</code> effectue une recherche plein texte sur le Catéchisme, le Compendium
		et le Compendium de la doctrine sociale.
	</p>

	<pre><code>GET /api/search?q=eucharistie</code></pre>

	<pre><code
			>{`{
  "q": "eucharistie",
  "hits": [
    {
      "id": "p:1327",
      "kind": "paragraph",
      "number": 1327,
      "text": "Bref, l'Eucharistie est le résumé et la somme de notre foi…",
      "title": "",
      "score": 21.99,
      "match": { "eucharistie": ["text"] }
    }
  ],
  "mode": "and",
  "tokens": ["eucharistie"],
  "matchedTokens": ["eucharistie"],
  "suggestions": []
}`}</code
		></pre>

	<p>
		<code>mode</code> vaut <code>"and"</code> quand tous les mots de la requête ont été trouvés dans
		chaque résultat, ou <code>"or"</code> quand la recherche est retombée sur au moins un mot en cas
		d'échec du mode strict. Si <code>hits</code> est vide, <code>suggestions</code> peut proposer des
		entrées du glossaire proches de la requête.
	</p>

	<h2>Références bibliques</h2>

	<p>
		<code>GET /api/bible/[book]/[chapter]/[verse]</code> prend le problème dans l'autre sens : quels
		paragraphes du Catéchisme citent ce verset. Le livre s'écrit en slug français (<code>jean</code
		>) ou en code USFX (<code>JHN</code>).
	</p>

	<pre><code>GET /api/bible/jean/3/16</code></pre>

	<pre><code
			>{`{
  "book": "JHN",
  "book_slug": "jean",
  "book_name": "Jean",
  "chapter": 3,
  "verse": 16,
  "paragraphs": [219, 444, 454, 458, 706]
}`}</code
		></pre>

	<p>
		Sans le verset, la route renvoie le chapitre entier : <code>verse</code> vaut
		<code>null</code>, <code>paragraphs</code> réunit tout le chapitre, et un objet
		<code>verses</code> détaille le découpage verset par verset.
	</p>

	<pre><code
			>{`GET /api/bible/jean/3

{
  "book": "JHN",
  "book_slug": "jean",
  "book_name": "Jean",
  "chapter": 3,
  "verse": null,
  "paragraphs": [161, 219, 423, 432, 440, 444, "…"],
  "verses": {
    "5": [432, 720, 728, 1215, 1225, 1238, "…"],
    "16": [219, 444, 454, 458, 706]
  }
}`}</code
		></pre>

	<h2>Calendrier liturgique</h2>

	<p>
		<code>GET /api/liturgie/[date]</code> donne la célébration du jour et les paragraphes du
		Catéchisme proposés à la méditation avec les lectures, groupés par thème. La date s'écrit
		<code>AAAA-MM-JJ</code>, ou <code>today</code>.
	</p>

	<pre><code>GET /api/liturgie/2026-12-13</code></pre>

	<pre><code
			>{`{
  "date": "2026-12-13",
  "slug": "troisieme-dimanche-de-lavent",
  "calendar_source": "year",
  "cycle": "b",
  "liturgical_color": "rose",
  "celebration": {
    "title": "Troisième Dimanche de l'Avent",
    "season": "avent",
    "color": "rose",
    "cycle": "b"
  },
  "meditation": [
    { "theme": "la joie", "paragraphs": [30, 163, 301, 736, 1829, 1832, 2015, 2362] },
    { "theme": "les caractéristiques du Messie attendu", "paragraphs": [713, 714] }
  ]
}`}</code
		></pre>

	<p>
		<code>cycle</code> est déterminant : le même dimanche revient en années A, B et C et le même
		jour de semaine en années paires et impaires (cycles <code>I</code> et <code>II</code>), avec
		des paragraphes différents. <code>calendar_source</code> indique d'où vient le jour :
		<code>year</code> pour un dimanche ou une fête mobile, <code>weekday</code> pour un jour de
		semaine du temps ordinaire, <code>proper</code> pour un jour fixé à une date. Un jour propre à
		une date n'a pas de cycle et <code>cycle</code> vaut alors <code>null</code>.
	</p>

	<h2>Thèmes</h2>

	<p>
		<code>GET /api/themes</code> liste le vocabulaire thématique complet, et
		<code>GET /api/themes/[slug]</code> donne les paragraphes portant un thème.
	</p>

	<pre><code
			>{`GET /api/themes

{
  "count": 208,
  "themes": [
    { "name": "Abraham", "slug": "abraham", "count": 22, "glossary_url": "/glossaire/abraham" },
    { "name": "Accomplissement", "slug": "accomplissement", "count": 41,
      "glossary_url": "/glossaire/accomplissement" }
  ]
}`}</code
		></pre>

	<pre><code
			>{`GET /api/themes/priere

{
  "slug": "priere",
  "name": "Prière",
  "glossary_url": "/glossaire/priere",
  "count": 52,
  "paragraphs": [28, 122, 197, 249, 307, 435, "…"]
}`}</code
		></pre>

	<h2>Structure</h2>

	<p>
		<code>GET /api/structure</code> renvoie l'arborescence du Catéchisme. Le paramètre
		<code>depth</code> la tronque : <code>1</code> aux parties, <code>2</code> aux sections,
		<code>3</code> aux chapitres. Sans <code>depth</code>, l'arbre est complet jusqu'aux articles.
	</p>

	<pre><code
			>{`GET /api/structure?depth=1

{
  "corpus": "ccc",
  "parts": [
    {
      "slug": "prologue",
      "title": "Prologue",
      "prologue": true,
      "range": { "from": 1, "to": 25 },
      "intro_paragraphs": [1, 2, 3, "…"],
      "intro_headings": [
        { "id": "i-la-vie-de-lhomme-connaitre-et-aimer-dieu", "level": 2,
          "title": "I. La vie de l'homme – connaître et aimer Dieu", "paragraph_start": 1 }
      ]
    },
    {
      "slug": "1-profession-de-la-foi",
      "title": "La profession de la foi",
      "number": 1,
      "prologue": false,
      "range": { "from": 26, "to": 1065 }
    }
  ]
}`}</code
		></pre>

	<p>
		<code>intro_paragraphs</code> et <code>intro_headings</code> n'apparaissent que sur les niveaux qui
		ouvrent sur un texte avant leur première subdivision.
	</p>

	<h2>Glossaire</h2>

	<p>
		<code>GET /api/glossary</code> liste les entrées et leurs grappes thématiques,
		<code>GET /api/glossary/[slug]</code> sert une entrée. Les slugs sont les mêmes que ceux des thèmes.
	</p>

	<pre><code
			>{`GET /api/glossary/priere

{
  "slug": "priere",
  "term": "Prière",
  "latin": "Oratio",
  "definition": "Élévation de l'âme vers Dieu, demande adressée à Dieu…",
  "directRefs": [28, 122, 197, "…"],
  "subEntries": [
    { "label": "Définition de la prière", "refs": [2559] },
    { "label": "Dieu exauce notre prière", "refs": [1127, 2737] }
  ],
  "seeAlso": ["Notre Père", "Psaumes", "Liturgie des Heures"],
  "clusters": ["priere"],
  "totalRefs": 294,
  "refsCovered": [28, 122, 197, "…"],
  "standalone": false,
  "url": "/glossaire/priere"
}`}</code
		></pre>

	<p>
		Cette route est la seule dont les champs sont en <code>camelCase</code> : elle sert l'entrée du
		glossaire telle qu'elle est stockée. <code>directRefs</code> réunit les paragraphes cités par
		l'entrée elle-même, <code>refsCovered</code> y ajoute ceux des sous-entrées.
	</p>

	<h2>Blocs d'étude</h2>

	<p>
		<code>/api/cec/[number]</code> et <code>/api/cec</code> acceptent un paramètre
		<code>include</code> qui joint les données du panneau d'étude à la réponse :
		<code>cited_by</code>, <code>themes</code>, <code>sources</code>, <code>liturgy</code>,
		<code>compendium</code>, <code>en_bref</code>, <code>bible</code>, <code>cdse</code>,
		<code>denzinger</code>. La valeur <code>all</code> les joint tous.
	</p>

	<pre><code>GET /api/cec/2559?include=cited_by,themes,sources</code></pre>

	<pre><code
			>{`{
  "number": 2559,
  "text": "« La prière est l'élévation de l'âme vers Dieu…",

  "cited_by": [2613, 2628, 2733, 2736],

  "themes": [
    { "name": "Dieu", "slug": "dieu", "glossary_url": "/glossaire/dieu" },
    { "name": "Humilité", "slug": "humilite", "glossary_url": "/glossaire/humilite" }
  ],

  "sources": {
    "refs": [
      { "type": "patristic",
        "raw": "saint Jean Damascène, de fide orthodoxa 3:24 : PG 94:1089D",
        "display": "saint Jean Damascène, de fide orthodoxa 3:24 : PG 94:1089D" }
    ],
    "documents": []
  }
}`}</code
		></pre>

	<p>
		Chaque bloc apparaît comme une clé de premier niveau. Sans <code>include</code>, la réponse est
		exactement celle documentée plus haut. Un bloc qui échoue vaut <code>null</code> et son nom
		apparaît dans <code>partial</code> : le texte du paragraphe reste servi.
	</p>

	<p>
		Un bloc sans données pour ce paragraphe se distingue d'un bloc en échec : les blocs de liste (<code
			>cited_by</code
		>, <code>themes</code>, <code>compendium</code>, <code>cdse</code>,
		<code>denzinger</code>, <code>liturgy</code>) renvoient un tableau vide, et
		<code>en_bref</code> renvoie <code>null</code> pour les paragraphes qu'aucun encadré « En bref » ne
		résume.
	</p>

	<p>
		Le bloc <code>ai</code> se demande explicitement et n'est jamais inclus par <code>all</code>. Il
		sert un commentaire généré automatiquement, marqué <code>"generated": true</code>, qui
		n'appartient pas au Catéchisme et n'a aucune autorité magistérielle.
	</p>

	<h2>Données brutes</h2>

	<p>
		Les fichiers JSON qui alimentent le site sont servis tels quels et lisibles depuis un autre
		domaine. Par exemple <a href="/data/cec/cited-by.json"><code>/data/cec/cited-by.json</code></a>
		contient la relation complète des renvois inverses, paragraphe par paragraphe.
	</p>

	<h2>Usage</h2>

	<p>
		Pas de clé, pas d'authentification, pas de quota annoncé : merci simplement d'un usage
		raisonnable. Les réponses sont mises en cache à l'édge Cloudflare, donc les requêtes répétées
		sur un même paragraphe ou une même recherche sont peu coûteuses.
	</p>

	<p>
		Toutes les réponses portent l'en-tête <code>Access-Control-Allow-Origin: *</code> : l'API est
		donc appelable depuis un navigateur, sur n'importe quel domaine. Les erreurs portent un champ
		<code>code</code> stable (par exemple <code>paragraph_out_of_range</code>) à tester de
		préférence au message, qui est rédigé en français et peut être reformulé.
	</p>

	<p>
		L'API est fournie telle quelle, sans garantie de disponibilité. Les champs documentés ici sont
		stables : de nouveaux champs peuvent s'ajouter, mais aucun champ documenté n'est retiré ni
		renommé. Une rupture de compatibilité passerait par <code>/api/v2</code>.
	</p>
</ProseLayout>

<style>
	:global(.prose-body code) {
		font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace;
		font-size: 0.85em;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.1em 0.4em;
	}

	:global(.prose-body pre) {
		font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace;
		font-size: 0.82rem;
		line-height: 1.6;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 1rem 1.1rem;
		margin: 0 0 20px;
		overflow-x: auto;
	}

	:global(.prose-body pre code) {
		background: none;
		border: none;
		padding: 0;
		font-size: 1em;
	}

	/* The route table is wider than the prose column on narrow screens · let it
	   scroll inside its own box rather than forcing the page to scroll. */
	.route-table {
		overflow-x: auto;
		margin: 0 0 20px;
	}

	.route-table table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}

	.route-table th,
	.route-table td {
		text-align: left;
		vertical-align: top;
		padding: 0.5rem 0.7rem;
		border-bottom: 1px solid var(--color-border);
	}

	.route-table th {
		font-weight: 600;
		white-space: nowrap;
	}

	.route-table td:first-child,
	.route-table td:last-child {
		white-space: nowrap;
	}
</style>
