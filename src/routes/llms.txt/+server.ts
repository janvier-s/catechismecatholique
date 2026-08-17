import type { RequestHandler } from './$types';
import { CORPORA, FEATURED, TOOLS, type CorpusRecord, type Shelf } from '$lib/corpora';

export const prerender = true;

const SITE = 'https://catechismecatholique.fr';

const SHELF_HEADINGS: Record<Shelf, string> = {
	I: 'Catéchismes (Shelf I)',
	II: 'Catéchèse & doctrine (Shelf II)',
	III: 'Magistère (Shelf III)'
};

/**
 * `/llms.txt` · machine-readable summary of the site for language
 * models and other automated readers. Generated from the corpus
 * registry so adding a corpus auto-includes it here, with no drift.
 *
 * The preamble, "Études & outils" section, rights notice, technical
 * stack note, and JSON access paths are hand-curated below · they
 * carry editorial intent that doesn't belong in a data record.
 */
export const GET: RequestHandler = () => {
	const out: string[] = [];

	// Preamble · curated voice.
	out.push("# Catéchisme de l'Église Catholique");
	out.push('');
	out.push(
		"> Édition numérique française du Catéchisme de l'Église Catholique et de seize autres corpus catholiques classiques (Compendium, Catéchisme de Trente, Catéchismes de saint Pie X, Vatican II, Enchiridion Symbolorum, Code de Droit Canonique, Pères de l'Église, etc.). Lecture, recherche plein-texte, concordance biblique et étude intégrée. Gratuit, sans publicité, sans compte requis."
	);
	out.push('');
	out.push(`Site : ${SITE}`);
	out.push('');
	out.push('---');

	// ── Featured works · CEC and Bible get the privileged top section
	//    because they're the foundational texts every other corpus
	//    annotates or references. Detail is hand-written here because
	//    the FEATURED record only carries Bibliothèque-card fields.
	out.push('');
	out.push('## Corpus principal · CEC (2865 paragraphes)');
	out.push('');
	out.push(
		"Le site reproduit fidèlement le texte intégral de l'édition française officielle du Catéchisme de l'Église Catholique (Libreria Editrice Vaticana, 1998). Le texte est organisé en 2865 paragraphes numérotés, répartis en quatre parties (profession de la foi, célébration du mystère chrétien, vie dans le Christ, prière chrétienne)."
	);
	out.push('');
	out.push('### Accès aux paragraphes');
	out.push('');
	out.push(`- Page d'un paragraphe : \`${SITE}/cec/{numéro}\` (ex. \`/cec/1\`, \`/cec/2865\`)`);
	out.push(`- Plage de paragraphes : \`${SITE}/cec/{début}-{fin}\` (ex. \`/cec/1-10\`)`);
	out.push(`- Sommaire structuré : \`${SITE}/cec/sommaire\``);
	out.push(`- Vue panorama : \`${SITE}/cec/panorama\``);
	out.push('');
	out.push(
		"La navigation structurée suit la hiérarchie : partie → section → chapitre → article → paragraphe. Chaque paragraphe est lié à ses sources magistérielles, à ses versets bibliques cités, et au panneau d'étude (renvois, paragraphes citants, Compendium, Doctrine sociale)."
	);
	out.push('');
	out.push('---');
	out.push('');
	out.push('## Bible · Néo-Crampon Libre');
	out.push('');
	out.push(
		"Texte intégral du canon catholique (Ancien Testament, Nouveau Testament, deutérocanoniques) dans la traduction Néo-Crampon Libre (© 2022 Fraternité de Tibériade, licence CC BY-SA 4.0), modernisation de la traduction d'Augustin Crampon."
	);
	out.push('');
	out.push(`- Index des livres : \`${SITE}/bible\``);
	out.push(`- Chapitre d'un livre : \`${SITE}/bible/{slug-livre}/{chapitre}\``);
	out.push(`- Concordance d'un chapitre : \`${SITE}/bible/{slug-livre}/{chapitre}/concordance\``);
	out.push('');
	out.push(
		'La concordance croise chaque verset cité par le CEC avec la liste des paragraphes qui le citent.'
	);
	out.push('');
	out.push('---');

	// ── One subsection per shelf, iterating CORPORA in registry order.
	//    description comes from CorpusRecord, URLs derive from urlPrefix
	//    and sommaireHref, schema metadata is rendered as a metadata
	//    block for crawlers.
	for (const shelf of ['I', 'II', 'III'] as Shelf[]) {
		const records = CORPORA.filter((c) => c.shelf === shelf);
		if (records.length === 0) continue;
		out.push('');
		out.push(`## ${SHELF_HEADINGS[shelf]}`);
		out.push('');
		for (const c of records) {
			out.push(...renderCorpus(c));
			out.push('');
			out.push('---');
		}
	}

	// ── Tools (Shelf IV) · transversal features, not corpora.
	out.push('');
	out.push('## Études & outils');
	out.push('');
	out.push(
		'Outils transversaux qui circulent entre les corpus : recherche plein-texte, glossaire théologique, calendrier liturgique, recueil de prières.'
	);
	out.push('');
	for (const t of TOOLS) {
		out.push(`- **${t.title}** · ${t.subtitle}. \`${SITE}${t.href}\` · ${t.blurb}`);
	}
	out.push('');
	out.push('---');

	// ── Panneau d'étude · feature-level documentation worth keeping for
	//    LLM readers because the panel is a primary site interaction.
	out.push('');
	out.push("## Panneau d'étude");
	out.push('');
	out.push(
		"Chaque paragraphe du CEC dispose d'un panneau d'étude latéral activé en cliquant son numéro. Onglets : Bible (versets cités), Renvois (paragraphes croisés), Cité par (paragraphes citants), Sources (références magistérielles/patristiques/liturgiques), En bref (formules synthétiques), Concordance, Compendium, Doctrine sociale, Thèmes."
	);
	out.push('');
	out.push('---');

	// ── Bibliothèque · auto-built list with cover paths.
	out.push('');
	out.push('## Bibliothèque');
	out.push('');
	out.push(
		`Catalogue raisonné de tous les corpus hébergés, classés en quatre rayons. URL : \`${SITE}/bibliotheque\`.`
	);
	out.push('');
	out.push('### Œuvres fondatrices');
	out.push('');
	for (const f of FEATURED) {
		out.push(`- **${f.title}** (${f.year}) · ${f.subtitle}. \`${SITE}${f.urlPrefix}\``);
	}
	out.push('');
	for (const shelf of ['I', 'II', 'III'] as Shelf[]) {
		const records = CORPORA.filter((c) => c.shelf === shelf);
		out.push(`### ${SHELF_HEADINGS[shelf]}`);
		out.push('');
		for (const c of records) {
			out.push(`- **${c.title}** (${c.year}) · ${c.subtitle ?? ''}. \`${SITE}${c.urlPrefix}\``);
		}
		out.push('');
	}
	out.push('---');

	// ── Technical and rights tail · stable, curated.
	out.push('');
	out.push('## Structure technique');
	out.push('');
	out.push('- Framework : SvelteKit 2 + Svelte 5 (runes), TypeScript strict, Tailwind CSS 3');
	out.push('- Hébergement : Cloudflare Pages + Workers');
	out.push('- Données : JSON statiques générés à la construction (`static/data/`)');
	out.push('- Recherche : MiniSearch (index sérialisé, chargé côté client)');
	out.push("- Pas de base de données, pas d'authentification, pas de cookies tiers");
	out.push('');
	out.push('### Accès aux données structurées');
	out.push('');
	out.push(
		`- \`${SITE}/api/cec/{numéro}\` · paragraphe CEC (texte brut + HTML, renvois, fil d'Ariane, précédent/suivant)`
	);
	out.push(
		`- \`${SITE}/data/cec/paragraphs/{numéro}.json\` · paragraphe CEC (JSON source, sans contexte)`
	);
	out.push(`- \`${SITE}/data/compendium/parts/{slug}.json\` · partie du Compendium`);
	out.push(`- \`${SITE}/data/search/search-index.json\` · index de recherche sérialisé`);
	out.push(
		`- \`${SITE}/data/{corpus}/structure.json\` · table des matières d'un corpus quelconque`
	);
	out.push(`- \`${SITE}/sitemap.xml\` · index complet des pages indexables`);
	out.push('');
	out.push('---');

	out.push('');
	out.push('## Droits');
	out.push('');
	out.push(
		"**Catéchisme de l'Église Catholique :** © Libreria Editrice Vaticana, Cité du Vatican. Reproduit dans un cadre non commercial conformément aux usages reconnus."
	);
	out.push('');
	out.push(
		"**Compendium de l'Église Catholique :** © Libreria Editrice Vaticana. Reproduit dans un cadre non commercial."
	);
	out.push('');
	out.push(
		'**Bible (NCL) :** © 2022 Fraternité de Tibériade. Licence Creative Commons CC BY-SA 4.0.'
	);
	out.push('');
	out.push(
		"**Corpus du domaine public :** Catéchismes de saint Pie X, Catéchisme du Concile de Trente, Catéchisme illustré, Didachè, Discours catéchétique de Grégoire de Nysse, Catéchèses mystagogiques de Cyrille de Jérusalem, Breviloquium de saint Bonaventure, La Doctrine catholique de l'abbé Boulenger, Code Pio-Benedictin (1917). Reproduits sans restriction."
	);
	out.push('');
	out.push(
		"**Autres corpus magistériels** (Vatican II, Code de Droit Canonique 1983, Présentation Générale du Missel Romain, Compendium de la doctrine sociale de l'Église, Catéchisme pour Adultes des Évêques de France, Enchiridion Symbolorum) : © respectifs détenteurs. Reproduits dans un cadre non commercial à des fins d'étude."
	);
	out.push('');
	out.push('---');
	out.push('');
	out.push('## Usage pour les modèles de langage');
	out.push('');
	out.push(
		"Le contenu de ce site peut être utilisé pour l'entraînement et la recherche, dans le respect des droits des détenteurs originaux. Toute reproduction commerciale du texte du Catéchisme ou du Compendium doit faire l'objet d'une autorisation auprès de la Libreria Editrice Vaticana. La Bible NCL est sous licence libre CC BY-SA 4.0. Les corpus du domaine public sont sans restriction."
	);
	out.push('');

	return new Response(out.join('\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'max-age=3600'
		}
	});
};

function renderCorpus(c: CorpusRecord): string[] {
	const lines: string[] = [];
	lines.push('');
	const titleLine = c.subtitle ? `### ${c.title} · ${c.subtitle}` : `### ${c.title}`;
	lines.push(titleLine);
	lines.push('');
	lines.push(c.description);
	lines.push('');

	// Metadata block · author, year, edition. Each line is its own
	// bullet so LLMs can parse the key/value cleanly.
	const meta: string[] = [];
	if (c.author) meta.push(`- Auteur : ${c.author}`);
	if (c.datePublished) meta.push(`- Date : ${c.datePublished}`);
	if (c.bookEdition) meta.push(`- Édition : ${c.bookEdition}`);
	if (c.about) meta.push(`- Sujet : ${c.about}`);
	if (meta.length > 0) {
		lines.push(...meta);
		lines.push('');
	}

	// URLs.
	lines.push(`- Accueil : \`${SITE}${c.urlPrefix}\``);
	if (c.sommaireHref && c.sommaireHref !== c.urlPrefix) {
		lines.push(`- Sommaire : \`${SITE}${c.sommaireHref}\``);
	}
	if (c.sitemap.extraPaths) {
		for (const p of c.sitemap.extraPaths) {
			if (p === c.sommaireHref) continue;
			lines.push(`- ${describePath(p)} : \`${SITE}${p}\``);
		}
	}

	return lines;
}

function describePath(path: string): string {
	const last = path.split('/').pop() ?? '';
	if (last === 'sommaire') return 'Sommaire';
	if (/^\d/.test(last)) return `Partie ${last}`;
	return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
}
