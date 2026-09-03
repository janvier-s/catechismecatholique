import type { ApiErrorCode } from './http';
import { ALL_BLOCKS, DEFAULT_ALL, MAX_EXPLICIT_BLOCKS } from './include';
import type { ApiParam, ApiRoute as PublicApiRoute } from '$lib/api-types';

export type { ApiParam };

/**
 * The public shape, narrowed: on the server a route's error codes are known
 * members of ApiErrorCode, while the component-facing type in $lib/api-types
 * widens them to strings so it stays clear of $lib/server.
 */
export interface ApiRoute extends PublicApiRoute {
	codes: ApiErrorCode[];
}

const INCLUDE_PARAM: ApiParam = {
	name: 'include',
	in: 'query',
	required: false,
	description: `Blocs d'étude à joindre, séparés par des virgules. Valeurs : ${ALL_BLOCKS.join(', ')}. « all » développe les ${DEFAULT_ALL.length} blocs hors « ai ». Au plus ${MAX_EXPLICIT_BLOCKS} blocs nommés explicitement.`
};

/**
 * The single source of truth for the public API surface. /api/openapi.json
 * serialises it, and the /api page renders its reference table from it, so a
 * route documented in one place is documented in both. tests/unit/api-spec
 * fails the build if this list and the actual routes ever disagree.
 */
export const API_ROUTES: ApiRoute[] = [
	{
		path: '/api/cec/{number}',
		summary: 'Un paragraphe du Catéchisme, de 1 à 2865, avec son contexte et ses renvois.',
		params: [
			{
				name: 'number',
				in: 'path',
				required: true,
				description: 'Numéro de paragraphe, 1 à 2865.'
			},
			INCLUDE_PARAM
		],
		codes: ['paragraph_out_of_range', 'unknown_include', 'too_many_blocks'],
		example: '/api/cec/2559?include=themes,sources'
	},
	{
		path: '/api/cec',
		summary: 'Plusieurs paragraphes en une requête, par liste ou par plage.',
		params: [
			{ name: 'numbers', in: 'query', required: false, description: 'Liste, par exemple 1,2,3.' },
			{
				name: 'range',
				in: 'query',
				required: false,
				description: 'Plage inclusive, par exemple 10-25.'
			},
			INCLUDE_PARAM
		],
		codes: ['paragraph_out_of_range', 'too_many_paragraphs', 'unknown_include', 'too_many_blocks'],
		example: '/api/cec?range=1-5'
	},
	{
		path: '/api/search',
		summary: 'Recherche plein texte sur le Catéchisme, le Compendium et la doctrine sociale.',
		params: [
			{ name: 'q', in: 'query', required: true, description: 'Requête, 2 caractères au minimum.' }
		],
		// A query under two characters returns 200 with empty hits, not an
		// error, so this route emits no code at all.
		codes: [],
		example: '/api/search?q=eucharistie'
	},
	{
		path: '/api/bible/{book}/{chapter}',
		summary: 'Paragraphes du Catéchisme citant un chapitre biblique, détaillés par verset.',
		params: [
			{
				name: 'book',
				in: 'path',
				required: true,
				description: 'Slug français (jean) ou code USFX (JHN).'
			},
			{ name: 'chapter', in: 'path', required: true, description: 'Numéro de chapitre.' }
		],
		codes: ['unknown_book', 'bad_reference'],
		example: '/api/bible/jean/3'
	},
	{
		path: '/api/bible/{book}/{chapter}/{verse}',
		summary: 'Paragraphes du Catéchisme citant un verset précis.',
		params: [
			{
				name: 'book',
				in: 'path',
				required: true,
				description: 'Slug français (jean) ou code USFX (JHN).'
			},
			{ name: 'chapter', in: 'path', required: true, description: 'Numéro de chapitre.' },
			{ name: 'verse', in: 'path', required: true, description: 'Numéro de verset.' }
		],
		codes: ['unknown_book', 'bad_reference'],
		example: '/api/bible/jean/3/16'
	},
	{
		path: '/api/liturgie/{date}',
		summary:
			'Célébration du jour et paragraphes du Catéchisme proposés à la méditation avec les lectures.',
		params: [
			{ name: 'date', in: 'path', required: true, description: 'Date AAAA-MM-JJ, ou « today ».' }
		],
		codes: ['bad_date'],
		example: '/api/liturgie/today'
	},
	{
		path: '/api/pericope',
		summary:
			'Paragraphes du Catéchisme citant un péricope, par référence liturgique. Plusieurs références par requête.',
		params: [
			{
				name: 'ref',
				in: 'query',
				required: true,
				description:
					'Référence, par exemple « Lc 7, 11-16 ». Répétable, ou plusieurs séparées par un point-virgule. Au plus 50.'
			}
		],
		codes: ['bad_reference', 'too_many_refs'],
		example: '/api/pericope?ref=Lc 7, 11-16'
	},
	{
		path: '/api/themes',
		summary: 'Vocabulaire thématique complet, avec le nombre de paragraphes par thème.',
		params: [],
		codes: [],
		example: '/api/themes'
	},
	{
		path: '/api/themes/{slug}',
		summary: 'Paragraphes portant un thème donné.',
		params: [
			{
				name: 'slug',
				in: 'path',
				required: true,
				description: 'Slug du thème, partagé avec le glossaire.'
			}
		],
		codes: ['unknown_slug'],
		example: '/api/themes/priere'
	},
	{
		path: '/api/structure',
		summary: 'Arborescence complète du Catéchisme : parties, sections, chapitres, articles.',
		params: [
			{
				name: 'depth',
				in: 'query',
				required: false,
				description: '1 parties, 2 sections, 3 chapitres. Absent : tout.'
			}
		],
		codes: [],
		example: '/api/structure?depth=2'
	},
	{
		path: '/api/glossary',
		summary: 'Liste des entrées du glossaire, groupées par grappe thématique.',
		params: [],
		codes: [],
		example: '/api/glossary'
	},
	{
		path: '/api/glossary/{slug}',
		summary: 'Une entrée du glossaire.',
		params: [
			{
				name: 'slug',
				in: 'path',
				required: true,
				description: 'Slug de l’entrée, partagé avec les thèmes.'
			}
		],
		codes: ['unknown_slug'],
		example: '/api/glossary/priere'
	},
	{
		path: '/api/openapi.json',
		summary: 'Ce document OpenAPI.',
		params: [],
		codes: [],
		example: '/api/openapi.json'
	}
];

const ERROR_SCHEMA = {
	type: 'object',
	required: ['error', 'code'],
	properties: {
		error: { type: 'string', description: 'Message lisible, en français.' },
		code: { type: 'string', description: 'Code stable, à tester par le client.' }
	}
};

export function buildOpenApi(origin: string): Record<string, unknown> {
	const paths: Record<string, unknown> = {};
	for (const route of API_ROUTES) {
		const responses: Record<string, unknown> = {
			'200': { description: 'Succès' }
		};
		if (route.codes.length > 0) {
			responses['400'] = {
				description: `Requête invalide. Codes possibles : ${route.codes.join(', ')}.`,
				content: { 'application/json': { schema: ERROR_SCHEMA } }
			};
			responses['404'] = {
				description: 'Ressource introuvable.',
				content: { 'application/json': { schema: ERROR_SCHEMA } }
			};
		}
		paths[route.path] = {
			get: {
				summary: route.summary,
				parameters: route.params.map((p) => ({
					name: p.name,
					in: p.in,
					required: p.required,
					description: p.description,
					schema: { type: 'string' }
				})),
				responses
			}
		};
	}

	return {
		openapi: '3.1.0',
		info: {
			title: "API du Catéchisme de l'Église catholique",
			version: '1.0.0',
			description:
				"API publique en lecture seule, sans clé ni authentification. Les champs documentés sont stables : de nouveaux champs peuvent s'ajouter, aucun n'est retiré ni renommé."
		},
		servers: [{ url: origin }],
		paths
	};
}
