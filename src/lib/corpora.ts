/**
 * Corpus registry · one record per work the site hosts.
 *
 * Every cross-cutting concern (sidebar selector, layout, sitemap, footer,
 * NavDrawer, Bibliothèque, BackToBibliotheque, llms.txt, MetaTags) consumes
 * this table. Adding a corpus means adding one record here.
 *
 * Internal `id` is the stable corpus tag used by JSON data records and the
 * Sidebar's typed dispatch. `urlPrefix` is the public-facing route slug;
 * the two intentionally diverge for several works (Denzinger → /enchiridion,
 * Boulenger → /doctrine-catholique, etc.) to keep editorial titles in the
 * URL without renaming internal references.
 */
import type { Corpus } from './data/types';

export type Shelf = 'I' | 'II' | 'III';
export type NavGroup = 'catechismes' | 'catechese' | 'magistere';
export type CoverFocus = 'top' | 'center' | 'bottom';

export interface CorpusRecord {
	/** Stable internal id, matches the `Corpus` discriminated union. */
	id: Corpus;
	/** Public-facing route segment, leading slash, no trailing slash. */
	urlPrefix: string;
	/** Bibliothèque shelf this work lives on. */
	shelf: Shelf;
	/** NavDrawer + Footer grouping. */
	navGroup: NavGroup;

	/** Public title (the line you see on the page tab). */
	title: string;
	/** Bibliothèque card subtitle and meta description prefix. */
	subtitle?: string;
	/** NavDrawer eyebrow (date or short qualifier). */
	eyebrow?: string;
	/** Bibliothèque card blurb (one-liner). */
	blurb: string;
	/** Year string for the Bibliothèque card. */
	year: string;
	/** Cover image path under /static. */
	cover: string;
	/** Image crop anchor inside the 3:4 card. */
	coverFocus?: CoverFocus;

	/** Sidebar header sommaire link target. */
	sommaireHref: string;

	/** Long-form description used by llms.txt and meta tags. */
	description: string;

	/** Schema.org Book fields. */
	author?: string;
	datePublished?: string;
	about?: string;
	bookEdition?: string;

	/**
	 * Sitemap enumeration. `extraPaths` are added verbatim (sommaire,
	 * sub-landings). `units` returns reader URLs derived from the corpus's
	 * structure JSON · supplied as a sync reader so this module stays
	 * server-only side-effect-free.
	 */
	sitemap: {
		landing: string;
		extraPaths?: string[];
		structureFile?: string;
		units?: (structure: unknown) => string[];
	};
}

/**
 * Bibliothèque "featured" works · live above the four shelves on the
 * library page. CEC and Bible aren't shelved corpora (the CEC is the site's
 * primary text, the Bible is an apparatus), so they share fewer fields
 * than `CorpusRecord` and are kept in a separate list.
 */
export interface FeaturedWork {
	id: 'cec' | 'bible';
	urlPrefix: string;
	title: string;
	subtitle: string;
	blurb: string;
	year: string;
	cover: string;
}

export const FEATURED: FeaturedWork[] = [
	{
		id: 'cec',
		urlPrefix: '/cec',
		title: "Catéchisme de l'Église Catholique",
		subtitle: 'Catechismus Catholicae Ecclesiae, édition française',
		blurb: '2865 paragraphes en quatre parties. Le texte de référence.',
		year: '1992',
		cover: '/img/bibliotheque/cec.webp'
	},
	{
		id: 'bible',
		urlPrefix: '/bible',
		title: 'Bible',
		subtitle: 'Édition catholique en français',
		blurb: 'Texte intégral, lu chapitre par chapitre, croisé verset par verset au Catéchisme.',
		year: 'Écritures',
		cover: '/img/bibliotheque/bible.webp'
	}
];

export const CORPORA: CorpusRecord[] = [
	// ─── Shelf I · Catéchismes ──────────────────────────────────────────
	{
		id: 'compendium',
		urlPrefix: '/compendium',
		shelf: 'I',
		navGroup: 'catechismes',
		title: 'Compendium',
		subtitle: "Abrégé officiel du Catéchisme de l'Église Catholique",
		eyebrow: '2005',
		blurb: '598 questions reprises de la grande édition de 1992.',
		year: '2005',
		cover: '/img/bibliotheque/compendium.webp',
		coverFocus: 'top',
		sommaireHref: '/compendium/sommaire',
		description:
			"Le Compendium du Catéchisme de l'Église catholique en français : 598 questions et réponses qui présentent l'essentiel de la foi catholique.",
		author: 'Benoît XVI',
		datePublished: '2005',
		about: "Synthèse du Catéchisme de l'Église catholique en questions et réponses",
		sitemap: {
			landing: '/compendium',
			extraPaths: [
				'/compendium/sommaire',
				'/compendium/1-profession-de-la-foi',
				'/compendium/2-celebration-du-mystere',
				'/compendium/3-vie-dans-le-christ',
				'/compendium/4-priere-chretienne'
			]
		}
	},
	{
		id: 'trent',
		urlPrefix: '/trente',
		shelf: 'I',
		navGroup: 'catechismes',
		title: 'Catéchisme du Concile de Trente',
		subtitle: 'Catechismus ex decreto Concilii Tridentini',
		eyebrow: '1566',
		blurb: 'Le catéchisme romain promulgué après le Concile de Trente, en quatre parties.',
		year: '1566',
		cover: '/img/bibliotheque/trente.webp',
		coverFocus: 'top',
		sommaireHref: '/trente/sommaire',
		description:
			'Lisez le Catéchisme du Concile de Trente (1566) en français : prologue, quatre parties, 1787 paragraphes sur la foi, les sacrements, les commandements et la prière.',
		author: 'Saint Pie V',
		datePublished: '1566',
		about: "Catéchisme romain commandé par le concile de Trente à l'usage des pasteurs",
		sitemap: { landing: '/trente', extraPaths: ['/trente/sommaire'] }
	},
	{
		id: 'pius-x-petit',
		urlPrefix: '/petit-catechisme',
		shelf: 'I',
		navGroup: 'catechismes',
		title: 'Petit Catéchisme',
		subtitle: 'Catéchisme de la Doctrine Chrétienne',
		eyebrow: '1912',
		blurb: "L'abrégé pour les fidèles, ordonné par saint Pie X pour les premiers enseignements.",
		year: '1912',
		cover: '/img/bibliotheque/petit-catechisme.webp',
		sommaireHref: '/petit-catechisme/sommaire',
		description:
			"Le Catéchisme de la Doctrine Chrétienne de saint Pie X (1912) en questions et réponses : les vérités fondamentales de la foi catholique à l'usage de toute la jeunesse chrétienne.",
		author: 'Saint Pie X',
		datePublished: '1912',
		about: 'Catéchisme abrégé en questions et réponses',
		sitemap: {
			landing: '/petit-catechisme',
			extraPaths: [
				'/petit-catechisme/sommaire',
				'/petit-catechisme/0-intro',
				'/petit-catechisme/1-credo',
				'/petit-catechisme/2-morale',
				'/petit-catechisme/3-moyens-grace',
				'/petit-catechisme/annee-liturgique',
				'/petit-catechisme/educateurs',
				'/petit-catechisme/histoire-revelation'
			]
		}
	},
	{
		id: 'pius-x-grand',
		urlPrefix: '/grand-catechisme',
		shelf: 'I',
		navGroup: 'catechismes',
		title: 'Grand Catéchisme',
		subtitle: 'Catéchisme de saint Pie X, version étendue',
		eyebrow: '1905',
		blurb: "989 questions et réponses sur l'ensemble de la doctrine.",
		year: '1905',
		cover: '/img/bibliotheque/grand-catechisme.webp',
		sommaireHref: '/grand-catechisme/sommaire',
		description:
			'Le Grand Catéchisme de saint Pie X en questions et réponses sur la foi catholique : le Credo, la prière, les commandements, les sacrements et les vertus.',
		author: 'Saint Pie X',
		datePublished: '1905',
		about: 'Catéchisme romain en questions et réponses',
		sitemap: { landing: '/grand-catechisme', extraPaths: ['/grand-catechisme/sommaire'] }
	},
	{
		id: 'catechisme-adultes',
		urlPrefix: '/catechisme-adultes',
		shelf: 'I',
		navGroup: 'catechismes',
		title: 'Catéchisme pour Adultes',
		subtitle: 'Catéchisme des Évêques de France',
		eyebrow: '1991',
		blurb: 'Exposé thématique en quarante sept sections, adressé aux fidèles adultes.',
		year: '1991',
		cover: '/img/bibliotheque/catechisme-adultes.webp',
		coverFocus: 'top',
		sommaireHref: '/catechisme-adultes',
		description:
			'Le Catéchisme pour Adultes publié par les Évêques de France en 1991, exposé thématique de la foi catholique en quarante sept sections.',
		author: 'Conférence des Évêques de France',
		datePublished: '1991',
		about: 'Exposé thématique de la foi catholique',
		sitemap: { landing: '/catechisme-adultes' }
	},
	{
		id: 'catechisme-illustre',
		urlPrefix: '/catechisme-illustre',
		shelf: 'I',
		navGroup: 'catechismes',
		title: 'Catéchisme illustré',
		subtitle: 'Les vérités nécessaires en douze leçons',
		eyebrow: '1897',
		blurb: 'Douze leçons accompagnées de gravures sur bois, pour la catéchèse populaire.',
		year: '1897',
		cover: '/img/bibliotheque/catechisme-illustre.webp',
		sommaireHref: '/catechisme-illustre/sommaire',
		description:
			"Catéchisme illustré des vérités nécessaires (1897), par A. L. R. (Wikisource) : 12 images, 12 leçons. La foi catholique enseignée par l'image et la parole.",
		author: 'A. L. R.',
		datePublished: '1897',
		about: 'Catéchisme imagé pour catéchumènes et fidèles',
		sitemap: {
			landing: '/catechisme-illustre',
			extraPaths: [
				'/catechisme-illustre/sommaire',
				'/catechisme-illustre/preface',
				'/catechisme-illustre/introduction',
				'/catechisme-illustre/1-dieu',
				'/catechisme-illustre/2-homme',
				'/catechisme-illustre/3-homme-apres-le-peche',
				'/catechisme-illustre/4-sauveur',
				'/catechisme-illustre/5-enseignement-du-sauveur',
				'/catechisme-illustre/6-rachat-du-monde',
				'/catechisme-illustre/7-mission-des-apotres',
				'/catechisme-illustre/8-bapteme',
				'/catechisme-illustre/9-deux-routes',
				'/catechisme-illustre/10-fin',
				'/catechisme-illustre/11-enfer',
				'/catechisme-illustre/12-ciel',
				'/catechisme-illustre/avis',
				'/catechisme-illustre/prieres'
			]
		}
	},

	// ─── Shelf II · Catéchèse & doctrine ────────────────────────────────
	{
		id: 'didache',
		urlPrefix: '/didache',
		shelf: 'II',
		navGroup: 'catechese',
		title: 'La Didachè',
		subtitle: 'Doctrine des douze Apôtres',
		eyebrow: 'Iᵉʳ siècle',
		blurb: 'Plus ancien document catéchétique chrétien, en seize courts chapitres.',
		year: 'Iᵉʳ siècle',
		cover: '/img/bibliotheque/didache.webp',
		coverFocus: 'top',
		sommaireHref: '/didache',
		description:
			"La Didachè (« Doctrine des douze Apôtres ») : plus ancien document catéchétique de l'Église chrétienne, en seize courts chapitres.",
		author: 'Auteur anonyme',
		datePublished: 'vers 80-100',
		about: 'Catéchèse apostolique primitive',
		sitemap: { landing: '/didache' }
	},
	{
		id: 'catecheses-mystagogiques',
		urlPrefix: '/catecheses-mystagogiques',
		shelf: 'II',
		navGroup: 'catechese',
		title: 'Catéchèses mystagogiques',
		subtitle: 'Saint Cyrille de Jérusalem, aux nouveaux baptisés',
		eyebrow: 'vers 350',
		blurb: "Cinq instructions sur les sacrements de l'initiation, données vers 350.",
		year: 'vers 350',
		cover: '/img/bibliotheque/catecheses-mystagogiques.webp',
		coverFocus: 'bottom',
		sommaireHref: '/catecheses-mystagogiques',
		description:
			"Catéchèses mystagogiques de saint Cyrille de Jérusalem (vers 350), instructions sur les sacrements de l'initiation données aux nouveaux baptisés.",
		author: 'Saint Cyrille de Jérusalem',
		datePublished: 'vers 350',
		about: "Mystagogie patristique sur les sacrements de l'initiation",
		sitemap: { landing: '/catecheses-mystagogiques' }
	},
	{
		id: 'discours-catechetique',
		urlPrefix: '/discours-catechetique',
		shelf: 'II',
		navGroup: 'catechese',
		title: 'Discours catéchétique',
		subtitle: 'Saint Grégoire de Nysse, Oratio catechetica magna',
		eyebrow: 'IVᵉ siècle',
		blurb: 'Manuel théologique patristique en quarante chapitres, par un Père cappadocien.',
		year: 'IVᵉ siècle',
		cover: '/img/bibliotheque/discours-catechetique.webp',
		coverFocus: 'top',
		sommaireHref: '/discours-catechetique',
		description:
			'Discours catéchétique (Oratio catechetica magna) de saint Grégoire de Nysse, manuel théologique patristique en quarante chapitres.',
		author: 'Saint Grégoire de Nysse',
		datePublished: 'vers 385',
		about: 'Catéchèse théologique patristique',
		sitemap: { landing: '/discours-catechetique' }
	},
	{
		id: 'breviloquium',
		urlPrefix: '/breviloquium',
		shelf: 'II',
		navGroup: 'catechese',
		title: 'Breviloquium',
		subtitle: 'Saint Bonaventure, somme théologique abrégée',
		eyebrow: '1257',
		blurb: 'Sept parties, soixante dix neuf chapitres : un compendium de la théologie.',
		year: '1257',
		cover: '/img/bibliotheque/breviloquium.webp',
		coverFocus: 'top',
		sommaireHref: '/breviloquium',
		description:
			'Le Breviloquium de saint Bonaventure (1257), somme de théologie en sept parties, traduite en français, présentée chapitre par chapitre.',
		author: 'Saint Bonaventure',
		datePublished: '1257',
		about: 'Somme abrégée de la théologie chrétienne',
		sitemap: {
			landing: '/breviloquium',
			structureFile: 'static/data/breviloquium/structure.json',
			units: (s) =>
				(s as { parts: { chapters: { slug: string }[] }[] }).parts.flatMap((p) =>
					p.chapters.map((c) => `/breviloquium/${c.slug}`)
				)
		}
	},
	{
		id: 'boulanger',
		urlPrefix: '/doctrine-catholique',
		shelf: 'II',
		navGroup: 'catechese',
		title: 'La Doctrine Catholique',
		subtitle: 'Abbé Boulenger, en 53 leçons',
		eyebrow: '1927',
		blurb: 'Une pédagogie de la doctrine pour adultes, organisée en trois tomes.',
		year: '1927',
		cover: '/img/bibliotheque/doctrine-catholique.webp',
		coverFocus: 'top',
		sommaireHref: '/doctrine-catholique/sommaire',
		description:
			"La Doctrine catholique de l'Abbé Boulenger (Vitte, 1927) : 53 leçons en trois tomes (Dogme, Morale, Moyens de sanctification).",
		author: 'Abbé A. Boulenger',
		datePublished: '1927',
		about: "Cours élémentaire d'instruction religieuse en 53 leçons",
		sitemap: {
			landing: '/doctrine-catholique',
			extraPaths: ['/doctrine-catholique/sommaire'],
			structureFile: 'static/data/boulanger/structure.json',
			units: (s) =>
				(s as { tomes: { lessons: { slug: string }[] }[] }).tomes.flatMap((t) =>
					t.lessons.map((l) => `/doctrine-catholique/${l.slug}`)
				)
		}
	},
	{
		id: 'cdse',
		urlPrefix: '/doctrine-sociale',
		shelf: 'II',
		navGroup: 'catechese',
		title: 'Doctrine sociale',
		subtitle: "Compendium de la doctrine sociale de l'Église",
		eyebrow: '2004',
		blurb: '583 paragraphes en trois parties.',
		year: '2004',
		cover: '/img/bibliotheque/doctrine-sociale.webp',
		sommaireHref: '/doctrine-sociale',
		description:
			"Compendium de la doctrine sociale de l'Église (2004) : 583 paragraphes en trois parties, du Conseil pontifical Justice et Paix.",
		author: 'Conseil pontifical Justice et Paix',
		datePublished: '2004',
		about: "Synthèse de l'enseignement social de l'Église catholique",
		sitemap: {
			landing: '/doctrine-sociale',
			structureFile: 'static/data/cdse/structure.json',
			units: (s) =>
				(s as { parts: { chapters: { slug: string }[] }[] }).parts.flatMap((p) =>
					p.chapters.map((c) => `/doctrine-sociale/${c.slug}`)
				)
		}
	},

	// ─── Shelf III · Magistère ──────────────────────────────────────────
	{
		id: 'vatican-ii',
		urlPrefix: '/vatican-ii',
		shelf: 'III',
		navGroup: 'magistere',
		title: 'Vatican II',
		subtitle: 'Les seize documents du Concile œcuménique',
		eyebrow: '1962-1965',
		blurb: 'Quatre constitutions, neuf décrets et trois déclarations.',
		year: '1962 à 1965',
		cover: '/img/bibliotheque/vatican-ii.webp',
		sommaireHref: '/vatican-ii',
		description:
			'Les seize documents du concile Vatican II (1962-1965) : 4 constitutions, 9 décrets et 3 déclarations.',
		datePublished: '1965',
		about:
			"Constitutions, décrets et déclarations du XXIᵉ concile œcuménique de l'Église catholique",
		sitemap: {
			landing: '/vatican-ii',
			structureFile: 'static/data/vatican-ii/structure.json',
			units: (s) =>
				(s as { docs: { slug: string; present?: boolean }[] }).docs
					.filter((d) => d.present !== false)
					.map((d) => `/vatican-ii/${d.slug}`)
		}
	},
	{
		id: 'denzinger',
		urlPrefix: '/enchiridion',
		shelf: 'III',
		navGroup: 'magistere',
		title: 'Enchiridion Symbolorum',
		subtitle: 'Denzinger',
		eyebrow: 'Denzinger',
		blurb: 'Recueil canonique des symboles, définitions et déclarations du Magistère.',
		year: 'Recueil',
		cover: '/img/bibliotheque/enchiridion.webp',
		sommaireHref: '/enchiridion/sommaire',
		description:
			"Édition française de l'Enchiridion Symbolorum (Denzinger) : recueil canonique des symboles, définitions et déclarations magistérielles de l'Église catholique des origines à 1959.",
		author: 'Heinrich Denzinger',
		bookEdition: '37ᵉ édition',
		about: "Symboles, définitions et déclarations du Magistère de l'Église catholique",
		sitemap: {
			landing: '/enchiridion',
			extraPaths: ['/enchiridion/sommaire'],
			structureFile: 'static/data/enchiridion/structure.json',
			units: (s) =>
				(s as { parts: { units: { slug: string }[] }[] }).parts.flatMap((p) =>
					p.units.map((u) => `/enchiridion/${u.slug}`)
				)
		}
	},
	{
		id: 'documents-pontificaux',
		urlPrefix: '/documents-pontificaux',
		shelf: 'III',
		navGroup: 'magistere',
		title: 'Documents pontificaux',
		subtitle: 'Encycliques, exhortations, constitutions et notes doctrinales',
		eyebrow: 'Depuis 1879',
		blurb: 'Recueil des documents majeurs du Magistère pontifical, de Léon XIII à nos jours.',
		year: 'Depuis 1879',
		cover: '/img/bibliotheque/documents-pontificaux.webp',
		sommaireHref: '/documents-pontificaux',
		description:
			'Encycliques, exhortations apostoliques, constitutions apostoliques et notes doctrinales du Magistère pontifical, de Léon XIII à nos jours, ainsi que les sessions du concile de Trente.',
		about: 'Documents majeurs du Magistère pontifical',
		sitemap: {
			landing: '/documents-pontificaux'
		}
	},
	{
		id: 'cic',
		urlPrefix: '/cic',
		shelf: 'III',
		navGroup: 'magistere',
		title: 'Code de Droit Canonique',
		subtitle: 'Codex Iuris Canonici, 1917 et 1983',
		eyebrow: '1983',
		blurb: '1752 canons. Promulgué par saint Jean Paul II.',
		year: '1983',
		cover: '/img/bibliotheque/cic-1983.webp',
		sommaireHref: '/cic',
		description:
			"Les deux codes de droit canonique de l'Église latine : le Code de 1983 promulgué par saint Jean-Paul II, et le Code Pio-Benedictin de 1917.",
		datePublished: '1983',
		about: "Droit canonique de l'Église latine",
		sitemap: {
			landing: '/cic',
			extraPaths: ['/cic/1983', '/cic/1917'],
			structureFile: 'static/data/cic/structure.json',
			units: (s) =>
				(s as { codes: { code: string; livres: { slug: string }[] }[] }).codes.flatMap((code) =>
					code.livres.map((livre) => `/cic/${code.code}/${livre.slug}`)
				)
		}
	},
	{
		id: 'pgmr',
		urlPrefix: '/pgmr',
		shelf: 'III',
		navGroup: 'magistere',
		title: 'Présentation Générale du Missel Romain',
		subtitle: 'Norme liturgique en neuf chapitres',
		eyebrow: '2002',
		blurb: 'Le texte de référence pour la célébration ordinaire de la messe romaine.',
		year: '2002',
		cover: '/img/bibliotheque/pgmr.webp',
		sommaireHref: '/pgmr',
		description:
			"Présentation Générale du Missel Romain (PGMR, 2002) : 399 paragraphes en 9 chapitres précédés d'un préambule.",
		author: 'Congrégation pour le Culte divin',
		datePublished: '2002',
		about: 'Document normatif accompagnant le Missel romain',
		sitemap: {
			landing: '/pgmr',
			structureFile: 'static/data/pgmr/structure.json',
			units: (s) => (s as { chapters: { slug: string }[] }).chapters.map((c) => `/pgmr/${c.slug}`)
		}
	}
];

/**
 * Bibliothèque shelf IV · transversal tools (search, glossary, calendar,
 * prayers). Not corpora; rendered with a distinct flat-tile layout. Kept
 * here so /bibliotheque/+page.svelte stops carrying the inline list too.
 */
export interface ToolRecord {
	slug: string;
	href: string;
	title: string;
	subtitle: string;
	blurb: string;
	cover?: string;
}

export const TOOLS: ToolRecord[] = [
	{
		slug: 'recherche',
		href: '/recherche',
		title: 'Recherche',
		subtitle: 'Un champ pour tout retrouver',
		blurb: 'Mot, paragraphe, ou référence biblique : un seul champ pour tout.'
	},
	{
		slug: 'glossaire',
		href: '/glossaire',
		title: 'Glossaire',
		subtitle: 'Les termes théologiques classés',
		blurb: 'Définitions, renvois croisés, regroupement par grands thèmes doctrinaux.'
	},
	{
		slug: 'bible',
		href: '/bible',
		title: 'Concordance biblique',
		subtitle: 'Chaque verset croisé avec le Catéchisme',
		blurb: 'Lecture intégrale et concordance verset par verset avec les paragraphes du CEC.',
		cover: '/img/bibliotheque/bible.webp'
	},
	{
		slug: 'calendrier',
		href: '/calendrier',
		title: 'Calendrier liturgique',
		subtitle: 'Calendrier romain croisé au Catéchisme',
		blurb: 'Pour chaque jour du temps liturgique, les paragraphes du CEC à méditer.'
	},
	{
		slug: 'prieres',
		href: '/prieres-formules',
		title: 'Prières & Formules',
		subtitle: 'Recueil des prières et formules essentielles',
		blurb: 'Pater, Ave, Credo, actes de foi, Salve Regina, et autres prières usuelles.'
	}
];

// ──────────────────────────────────────────────────────────────────────
//  Lookups · derived helpers consumed by layout, sidebar, sitemap, etc.
// ──────────────────────────────────────────────────────────────────────

const CORPORA_BY_ID = new Map<Corpus, CorpusRecord>(CORPORA.map((c) => [c.id, c]));

/** Find the corpus that owns a given pathname (longest urlPrefix wins). */
export function corpusForPath(path: string): CorpusRecord | null {
	let best: CorpusRecord | null = null;
	for (const c of CORPORA) {
		if (path === c.urlPrefix || path.startsWith(c.urlPrefix + '/')) {
			if (!best || c.urlPrefix.length > best.urlPrefix.length) best = c;
		}
	}
	return best;
}

export function corpusById(id: Corpus): CorpusRecord | undefined {
	return CORPORA_BY_ID.get(id);
}

export function corporaInShelf(shelf: Shelf): CorpusRecord[] {
	return CORPORA.filter((c) => c.shelf === shelf);
}

export function corporaInNavGroup(group: NavGroup): CorpusRecord[] {
	return CORPORA.filter((c) => c.navGroup === group);
}
