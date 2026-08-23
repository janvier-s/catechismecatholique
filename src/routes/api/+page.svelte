<script lang="ts">
	import ProseLayout from '$lib/components/ui/ProseLayout.svelte';
</script>

<svelte:head>
	<title>API · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="API publique et gratuite du Catéchisme de l'Église catholique : lecture d'un paragraphe par numéro, recherche plein texte."
	/>
</svelte:head>

<ProseLayout
	title="API"
	subtitle="Deux points d'accès en lecture seule, sans clé ni authentification."
	description="API publique et gratuite du Catéchisme de l'Église catholique : lecture d'un paragraphe par numéro, recherche plein texte."
>
	<p>
		Le site expose une petite API JSON en lecture seule, sans clé ni inscription. Elle sert à
		afficher les pages du Catéchisme et alimente également ce site : c'est la même API que vous
		pouvez appeler directement.
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

	<h2>Usage</h2>

	<p>
		Pas de clé, pas d'authentification, pas de quota annoncé : merci simplement d'un usage
		raisonnable. Les réponses sont mises en cache à l'édge Cloudflare, donc les requêtes répétées
		sur un même paragraphe ou une même recherche sont peu coûteuses.
	</p>

	<p>
		L'API est fournie telle quelle, sans garantie de disponibilité. Les champs documentés ici sont
		stables ; de nouveaux champs peuvent s'ajouter sans préavis.
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
</style>
