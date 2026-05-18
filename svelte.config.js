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
			// Cloudflare Pages enforces ≤100 routing rules and ≤100 chars per
			// rule. The `<all>` auto-expansion blows past both (a Boulanger
			// lesson filename produces a 103-char rule). List wildcards for
			// every static dir/file served directly by Pages instead.
			routes: {
				include: ['/*'],
				exclude: [
					'/_app/*',
					'/data/*',
					'/img/*',
					'/fonts/*',
					'/favicon.ico',
					'/favicon.svg',
					'/favicon-96x96.png',
					'/apple-touch-icon.png',
					'/web-app-manifest-192x192.png',
					'/web-app-manifest-512x512.png',
					'/site.webmanifest',
					'/llms.txt',
					'/robots.txt',
					'/theme-init.js',
					'/service-worker.js'
				]
			}
		}),
		inlineStyleThreshold: 2048,
		// Prerender resolves page.url.origin against this URL, so canonical
		// and og:url tags emitted from the layout point at the live host
		// instead of the "https://sveltekit-prerender/" placeholder.
		prerender: {
			origin: 'https://catechismecatholique.fr',
			// Some imported corpora (PGMR, Vatican II) contain footnote hrefs
			// inherited from vatican.va that point at `/archive/…`,
			// `/holy_father/…`, `/roman_curia/…`. The prerender crawler treats
			// these as same-origin and 404s. Silently ignore those prefixes —
			// any real same-origin miss still fails the build.
			handleHttpError: ({ path, referrer, message }) => {
				if (
					path.startsWith('/archive/') ||
					path.startsWith('/holy_father/') ||
					path.startsWith('/roman_curia/')
				) {
					return;
				}
				throw new Error(`${path} (referrer: ${referrer ?? 'unknown'}): ${message}`);
			}
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
				'img-src': ['self', 'data:', 'https://i.ytimg.com', 'https://*.ytimg.com'],
				'font-src': ['self'],
				'connect-src': ['self', 'cloudflareinsights.com', 'https://audio.catechismecatholique.fr'],
				'media-src': ['self', 'https://audio.catechismecatholique.fr'],
				'frame-src': ['https://www.youtube-nocookie.com'],
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
