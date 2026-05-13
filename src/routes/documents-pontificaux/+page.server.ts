import { readdirSync } from 'fs';
import { join } from 'path';
import type { PageServerLoad } from './$types';

export const prerender = true;

// Enumerate cover files that exist on disk at build time so the page only
// emits <img src> attributes for images that actually ship. Without this,
// SvelteKit's prerender visits each <img> link and fails the build on
// missing assets (the in-browser onerror fallback runs too late).
export const load: PageServerLoad = () => {
	const dir = join(process.cwd(), 'static/img/bibliotheque');
	let available: string[] = [];
	try {
		available = readdirSync(dir)
			.filter((f) => f.startsWith('dp-') && f.endsWith('.webp'))
			.map((f) => f.slice('dp-'.length, -'.webp'.length));
	} catch {
		// Directory missing in unusual environments · degrade to empty.
	}
	return { availableSlugs: available };
};
