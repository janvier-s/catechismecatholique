// Catho.org thematic concordance integration.
// Source: catho.org/9.php?d=f0 — "2000 Thèmes" concordance (scraped 2026-05-11).
// 255 themes, 6 292 CEC refs.
//
// CATHO_SLUG_MAP  → maps every catho theme name to an existing glossary slug
//                   (enrichment only) or null (skip glossary, keep in index).
// CATHO_NEW_ENTRIES → genuinely missing concepts, added as new glossary entries.
// getCathoThemes()  → loads catho-themes.json (source data).
// buildCathoIndex() → inverted index: paragraph number → [{name, slug}].

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ClusterId } from './glossary-clusters.ts';

const __dir = dirname(fileURLToPath(import.meta.url));

export interface CathoTheme {
	theme: string;
	cec: number[];
}

export interface CathoNewEntry {
	term: string;
	slug: string;
	directRefs: number[];
	clusters: ClusterId[];
}

export interface CathoThemeRef {
	name: string;
	slug: string;
}

// ─── Slug map ──────────────────────────────────────────────────────────────
// Maps each catho theme name to an existing glossary slug for ref enrichment.
// null = include in the paragraph-themes inverted index using the theme's own
// generated slug, but don't try to merge refs into an existing entry.
export const CATHO_SLUG_MAP: Record<string, string | null> = {
	// ── Strict exact matches ────────────────────────────────────────────────
	Abel: 'abel',
	Abraham: 'abraham',
	Accomplissement: 'accomplissement',
	Adoration: 'adoration',
	Alliance: 'alliance',
	Amour: 'amour',
	Apostolat: 'apostolat',
	Argent: 'argent',
	Ascèse: 'ascese',
	Assemblée: 'assemblee',
	Baptême: 'bapteme',
	Bonheur: 'bonheur',
	'Bonté de Dieu': 'bonte-de-dieu',
	Bénédiction: 'benediction',
	Charité: 'charite',
	Chasteté: 'chastete',
	Choix: 'choix',
	Ciel: 'ciel',
	Commandement: 'commandement',
	Condamnation: 'condamnation',
	Conversion: 'conversion',
	Corps: 'corps',
	'Corps du Christ': 'corps-du-christ',
	Croire: 'croire',
	Croissance: 'croissance',
	Croix: 'croix',
	Créateur: 'createur',
	Culte: 'culte',
	Célibat: 'celibat',
	Dieu: 'dieu',
	Désespoir: 'desespoir',
	Egalité: 'egalite',
	Eglise: 'eglise',
	Egoïsme: 'egoisme',
	Engagement: 'engagement',
	Eschatologie: 'eschatologie',
	Espérance: 'esperance',
	Eternité: 'eternite',
	Eucharistie: 'eucharistie',
	Evangélisation: 'evangelisation',
	Evénement: 'evenement',
	Famille: 'famille',
	Femme: 'femme',
	Feu: 'feu',
	"Fils de l'homme": 'fils-de-lhomme',
	Foi: 'foi',
	Grâce: 'grace',
	Guerre: 'guerre',
	Guérison: 'guerison',
	Histoire: 'histoire',
	Homme: 'homme',
	Humilité: 'humilite',
	Incarnation: 'incarnation',
	Infidélité: 'infidelite',
	Injustice: 'injustice',
	Intercession: 'intercession',
	Jeûne: 'jeune',
	Joie: 'joie',
	Jour: 'jour',
	Justification: 'justification',
	Libération: 'liberation',
	Liturgie: 'liturgie',
	Loi: 'loi',
	Mal: 'mal',
	Maladie: 'maladie',
	Mariage: 'mariage',
	Marie: 'marie',
	Messie: 'messie',
	Miséricorde: 'misericorde',
	Monde: 'monde',
	Mystère: 'mystere',
	Mémoire: 'memoire',
	Nature: 'nature',
	Obéissance: 'obeissance',
	Orgueil: 'orgueil',
	Pain: 'pain',
	Pardon: 'pardon',
	'Parole de Dieu': 'parole-de-dieu',
	Personne: 'personne',
	Persécution: 'persecution',
	Persévérance: 'perseverance',
	'Peuple de Dieu': 'peuple-de-dieu',
	Pierre: 'pierre',
	Plénitude: 'plenitude',
	Prière: 'priere',
	Prochain: 'prochain',
	Providence: 'providence',
	'Présence de Dieu': 'presence-de-dieu',
	Prêtre: 'pretre',
	'Puissance de Dieu': 'puissance-de-dieu',
	Pâque: 'paque',
	Père: 'pere',
	Péché: 'peche',
	Pélerinage: 'pelerinage',
	Pénitence: 'penitence',
	Repentir: 'repentir',
	Repos: 'repos',
	Responsabilité: 'responsabilite',
	'Royaume de Dieu': 'royaume-de-dieu',
	Réconciliation: 'reconciliation',
	Rédemption: 'redemption',
	Révélation: 'revelation',
	Sabbat: 'sabbat',
	Sainteté: 'saintete',
	Sang: 'sang',
	Satan: 'satan',
	Sauveur: 'sauveur',
	Seigneur: 'seigneur',
	Serviteur: 'serviteur-2',
	Sexualité: 'sexualite',
	Silence: 'silence',
	Temple: 'temple',
	Temps: 'temps',
	Tentation: 'tentation',
	Trinité: 'trinite',
	Témoignage: 'temoignage',
	Ténèbres: 'tenebres',
	Univers: 'univers',
	Vigilance: 'vigilance',
	Violence: 'violence',
	Vocation: 'vocation',
	'Volonté de Dieu': 'volonte-de-dieu',

	// ── Manual fuzzy matches ────────────────────────────────────────────────
	Accueil: 'accueil-accueillir',
	'Action de grâce': 'action-de-graces',
	'Adam Eve': 'adam',
	'Aimer par Dieu': 'amour',
	"Aimer l'autre": 'amour',
	Anges: 'ange',
	'Annonce de la Bonne Nouvelle': 'annonce-de-levangile',
	'Appel - vocation': 'appel',
	Apôtres: 'apotre',
	'Banquet - repas': 'eucharistie',
	'Béatitudes et béatitude': 'beatitudes',
	'Bonne Nouvelle': 'annonce-de-levangile',
	'Combat du croyant': 'combat',
	'Communauté, communion': 'communaute',
	'Confiance en Dieu': 'confiance',
	'Désir de Dieu': 'desir',
	"Dignité de l'homme": 'dignite',
	Disciples: 'disciple',
	'Dieu Abba': 'dieu',
	'Dieu Trois': 'trinite',
	'Dieu Un': 'dieu',
	Ecritures: 'ecriture-sainte',
	'Eglise corps du Christ': 'eglise',
	'Eglise naissance': 'eglise',
	'Eglise, Temple nouveau': 'eglise',
	'Eglise, peuple de Dieu': 'peuple-de-dieu',
	'Eglise, signe de salut': 'eglise',
	'Eglise, épouse': 'eglise',
	Enfant: 'enfant',
	'Esprit de Dieu': 'esprit-saint',
	Evangile: 'evangile',
	'Exil Retour': 'israel',
	'Fidélité Infidélité': 'fidelite',
	Fils: 'fils-de-dieu',
	'Fin du monde': 'eschatologie',
	'Foi , confession': 'foi',
	'Foi et acte': 'foi',
	'Force du croyant': 'force',
	'Fête-Assemblée': 'liturgie',
	'Gloire de Dieu': 'gloire',
	'Homme Femme': 'homme',
	'Homme, Image': 'homme',
	'Homme, humain': 'homme',
	Idoles: 'idolatrie',
	Image: null,
	'JC, Fils de Dieu': 'jesus-christ',
	'JC, Grand Prêtre': 'jesus-christ',
	'JC, Messie': 'jesus-christ',
	'JC, Pasteur': 'jesus-christ',
	'JC, Seigneur': 'jesus-christ',
	'JC, cet homme': 'jesus-christ',
	"JC, fils de l'homme": 'jesus-christ',
	'JC, médiateur': 'jesus-christ',
	'JC, prophète': 'jesus-christ',
	'JC, sauveur': 'jesus-christ',
	'JC, serviteur': 'jesus-christ',
	'JC, textes': 'jesus-christ',
	'Jalousie, J. de Dieu': 'dieu',
	"Jospeh l'époux de Marie": 'joseph',
	'Jugement de Dieu': 'jugement',
	Juifs: 'israel',
	Juste: 'juste',
	'Justice Injustice': 'justice',
	Louange: 'louange',
	'Lumière Ténèbres': 'lumiere',
	'Ministère (le)': 'ministere',
	Ministères: 'ministere',
	Mission: 'mission',
	'Mort A.T': 'mort',
	'Mort Résurrection': 'mort',
	'Mort de Jésus': 'mort',
	'Mort et Résur. (notre)': 'mort',
	'Mort le drame': 'mort',
	'Nom de Dieu et de Jésus': 'nom',
	'Nourriture-Jeûne': 'jeune',
	Offrande: 'sacrifice',
	'Paix Guerre': 'guerre',
	Passion: 'redemption',
	'Pauvres et Petits': 'pauvres',
	'Prière intercession': 'intercession',
	Prophètes: 'prophete',
	Repas: 'eucharistie',
	'Respect de la personne': 'personne',
	Résurrection: 'resurrection-du-christ',
	'Sacerdoce du peuple de Dieu': 'sacerdoce',
	Sacrement: 'sacrement',
	Sacrifice: 'sacrifice',
	'Sagesse Folie': 'sagesse',
	'Salut - Justification': 'salut',
	"Sens de la vie, de l'histoire": 'histoire',
	'Signes du Royaume': 'signes',
	'Souffrance - Maladie': 'souffrance',
	'Suivre Jésus Christ': 'disciple',
	'Travail Repos': 'travail',
	Tritesse: 'tristesse',
	'Universalité du salut': 'salut',
	'Unité Division': null,
	'Venue du Seigneur': 'parousie',
	'Victoire du Christ': 'victoire',
	'Vie - vie éternelle': 'vie',
	Vieillesse: 'vieillards-vieillesse',
	'Vérité Mensonge': 'verite',

	// ── Skip (too small, too specific, or covered by new entries below) ───
	Detresse: null,
	Epreuve: null,
	'Faim - soif': null,
	Faiblesse: null,
	'Gestes du Christ': null,
	Naissance: null,
	Nuit: null,
	Oecuménisme: null,
	Paraboles: null,
	'Patience de Dieu': null,
	"Philippe l'un des sept": null,
	Recherche: null,
	'Réformes religieuses': null,
	Renouveau: null,
	'Terre promise': null,
	Vin: null

	// ── Covered by CATHO_NEW_ENTRIES ────────────────────────────────────────
	// (leave undefined so buildGlossary knows to use the new entry's slug)
};

// ─── New entries ────────────────────────────────────────────────────────────
// Themes genuinely missing from the glossary that deserve their own entry.
// Refs come from catho-themes.json (loaded by getCathoThemes below).
// No definition yet — the field is optional; pages handle that gracefully.
export const CATHO_NEW_ENTRY_NAMES: string[] = [
	'Connaître Dieu', // 158 refs — most referenced theme in the whole index
	'Coeur', // 60 refs
	'Dessein de Dieu', // 56 refs
	'Médiation', // 12 refs — distinct from existing Intercession
	'Charismes', // 12 refs
	'Pasteur', // 14 refs
	'Condition humaine' // 22 refs
];

// Explicit cluster overrides for new entries (clusterFor() would fail or
// produce a wrong result for these abstract terms).
export const CATHO_NEW_ENTRY_CLUSTERS: Record<string, ClusterId[]> = {
	'Connaître Dieu': ['trinite'],
	Coeur: ['morale', 'priere'],
	'Dessein de Dieu': ['trinite'],
	Médiation: ['christ'],
	Charismes: ['esprit-saint'],
	Pasteur: ['eglise'],
	'Condition humaine': ['creation-homme']
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getCathoThemes(): CathoTheme[] {
	const raw = readFileSync(join(__dir, 'catho-themes.json'), 'utf-8');
	return JSON.parse(raw) as CathoTheme[];
}

function themeToSlug(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/['']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Build the inverted index for the study panel.
 * Returns: { paragraphNumber: [{name, slug}, ...] }
 * slug = the glossary entry slug for this theme (either an existing one from
 * CATHO_SLUG_MAP or the new entry's slug from CATHO_NEW_ENTRY_NAMES).
 */
export function buildParagraphThemesIndex(
	newEntrySlugs: Map<string, string>
): Record<string, CathoThemeRef[]> {
	const themes = getCathoThemes();
	const index: Record<string, CathoThemeRef[]> = {};

	for (const t of themes) {
		// Resolve slug
		let slug: string;
		const mapped = CATHO_SLUG_MAP[t.theme];
		if (mapped !== undefined) {
			// null means skip the glossary link but still include in index
			slug = mapped ?? themeToSlug(t.theme);
		} else {
			// Might be a new entry
			slug = newEntrySlugs.get(t.theme) ?? themeToSlug(t.theme);
		}

		for (const n of t.cec) {
			const key = String(n);
			if (!index[key]) index[key] = [];
			// Avoid duplicates when multiple catho themes map to the same slug
			if (!index[key]!.some((x) => x.slug === slug)) {
				index[key]!.push({ name: t.theme, slug });
			}
		}
	}

	// Sort themes within each paragraph alphabetically for stable output
	for (const refs of Object.values(index)) {
		refs.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	}

	return index;
}
