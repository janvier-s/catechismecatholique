import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true
	},
	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		inlineStyleThreshold: 2048,
		// Prerender resolves page.url.origin against this URL, so canonical
		// and og:url tags emitted from the layout point at the live host
		// instead of the "https://sveltekit-prerender/" placeholder.
		prerender: {
			origin: 'https://catechismecatholique.fr'
		},
		// Emit a per-page <meta http-equiv="Content-Security-Policy"> with
		// auto-generated hashes for SvelteKit's inline hydration scripts.
		// Layered on top of the HTTP CSP in _headers, this lets the meta
		// policy be tighter (no 'unsafe-inline' in script-src) while the
		// HTTP header keeps a permissive baseline that works on every asset.
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'static.cloudflareinsights.com'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:'],
				'font-src': ['self'],
				'connect-src': ['self', 'cloudflareinsights.com'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'object-src': ['none']
			}
		},
		alias: {
			$lib: 'src/lib',
			$data: 'static/data'
		}
	}
};

export default config;
