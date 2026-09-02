import { apiJson } from '$lib/server/api/http';
import { buildOpenApi } from '$lib/server/api/spec';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => apiJson(buildOpenApi(url.origin));
