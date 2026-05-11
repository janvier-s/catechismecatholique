/**
 * Sanitiser for HTML fragments imported from vatican.va exports (PGMR,
 * Vatican II, encyclicals). Their footnotes/cross-refs use absolute paths
 * like `/archive/hist_councils/...` and `/holy_father/...` that resolve to
 * the vatican.va hostname in the original document but become broken
 * same-origin links on our site (the prerender crawler tries to fetch them
 * and 404s, failing the deploy).
 *
 * Behavior:
 *   - Vatican II URLs (`vat-ii_(const|decree|decl)_YYYYMMDD_<slug>_fr.html`)
 *     are rewritten to our internal route `/vatican-ii/<slug>` so users
 *     navigate cleanly between corpora.
 *   - Other external-style absolute hrefs (`/archive/...`, `/holy_father/...`,
 *     `/roman_curia/...`) have their `<a>` wrapper unwrapped, keeping the
 *     visible text.
 */

const VAT_II_URL_RE =
	/\/archive\/hist_councils\/ii_vatican_council\/documents\/vat-ii_(?:const|decree|decl)_\d{8}_([a-z-]+)_fr\.html/g;

const EXTERNAL_HREF_PREFIXES = ['/archive/', '/holy_father/', '/roman_curia/'];

export function sanitizeExternalHrefs(html: string, knownVatIISlugs: Set<string>): string {
	// 1. Rewrite Vatican II URLs in-place.
	let out = html.replace(VAT_II_URL_RE, (match, slug: string) => {
		if (knownVatIISlugs.has(slug)) return `/vatican-ii/${slug}`;
		return match;
	});

	// 2. Unwrap any remaining `<a href="/archive/...">…</a>` or similar.
	out = out.replace(
		/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
		(full, href: string, inner: string) => {
			if (EXTERNAL_HREF_PREFIXES.some((p) => href.startsWith(p))) {
				return inner;
			}
			return full;
		}
	);
	return out;
}
