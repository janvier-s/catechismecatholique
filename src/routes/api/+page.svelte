<script lang="ts">
	import ProseLayout from '$lib/components/ui/ProseLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>API · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="API publique et gratuite du Catéchisme de l'Église catholique : paragraphes, recherche plein texte, versets bibliques, calendrier liturgique, thèmes et glossaire."
	/>
</svelte:head>

<ProseLayout
	title="API"
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

	<h2>Paragraphe par numéro</h2>

	<p>
		<code>GET /api/cec/[number]</code> renvoie un paragraphe du Catéchisme, de 1 à 2865, avec son contexte
		(partie, section, chapitre, article) et ses renvois.
	</p>

	<pre><code>GET /api/cec/2559</code></pre>

	<pre><code
			>{`{
  "number": 2559,
  "corpus": "ccc",
  "text_html": "<p>« La prière est l'élévation…",
  "text": "« La prière est l'élévation…",
  "cross_refs": [2098, 2098],
  "bible_refs": ["Ps 130,1"],
  "citations": ["Sainte Thérèse d'Avila"],
  "magisterial_refs": [],
  "breadcrumb": { "part": "Quatrième partie", "chapter": "…", "article": "…" },
  "prev": 2558,
  "next": 2560,
  "permalink": "https://catechismecatholique.fr/cec/2559"
}`}</code
		></pre>

	<p>Un numéro hors de 1..2865 répond <code>404</code> avec un champ <code>error</code>.</p>

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
      "id": "ccc-1324",
      "kind": "paragraph",
      "number": 1324,
      "text": "L'eucharistie est « source et sommet…",
      "corpus": "ccc",
      "score": 12.4,
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

	<h2>Blocs d'étude</h2>

	<p>
		<code>/api/cec/[number]</code> et <code>/api/cec</code> acceptent un paramètre
		<code>include</code> qui joint les données du panneau d'étude à la réponse :
		<code>cited_by</code>, <code>themes</code>, <code>sources</code>, <code>liturgy</code>,
		<code>compendium</code>, <code>en_bref</code>, <code>bible</code>, <code>cdse</code>,
		<code>denzinger</code>. La valeur <code>all</code> les joint tous.
	</p>

	<pre><code>GET /api/cec/2559?include=themes,liturgy</code></pre>

	<p>
		Chaque bloc apparaît comme une clé de premier niveau. Sans <code>include</code>, la réponse est
		exactement celle documentée plus haut. Un bloc qui échoue vaut <code>null</code> et son nom
		apparaît dans <code>partial</code> : le texte du paragraphe reste servi.
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
