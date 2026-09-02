import { API_ROUTES } from '$lib/server/api/spec';
import type { PageServerLoad } from './$types';

// spec.ts lives under $lib/server, so it cannot be imported into the page
// component. The route table is rendered from this data instead, which keeps
// the docs and /api/openapi.json reading from one source.
export const load: PageServerLoad = () => ({ routes: API_ROUTES });
