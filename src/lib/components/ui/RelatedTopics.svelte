<script lang="ts">
	interface SuggestionsBundle {
		lookup: Record<string, string>;
		suggestions: Record<string, string[]>;
		terms: Record<string, string>;
	}

	let { query }: { query: string } = $props();

	let bundle: SuggestionsBundle | null = null;
	let loadPromise: Promise<SuggestionsBundle> | null = null;

	async function load(): Promise<SuggestionsBundle> {
		if (bundle) return bundle;
		if (loadPromise) return loadPromise;
		loadPromise = fetch('/data/ccc/search-suggestions.json')
			.then((r) => r.json() as Promise<SuggestionsBundle>)
			.then((d) => {
				bundle = d;
				return d;
			});
		return loadPromise;
	}

	function normalizeTerm(s: string): string {
		return s
			.replace(/œ/g, 'oe')
			.replace(/æ/g, 'ae')
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[''–—\-]/g, ' ')
			.replace(/[^a-z0-9 ]+/gi, '')
			.toLowerCase()
			.replace(/\s+/g, ' ')
			.trim();
	}

	interface Related {
		slug: string;
		term: string;
	}

	let related: Related[] = $state([]);

	$effect(() => {
		const q = query.trim();
		if (q.length < 2) {
			related = [];
			return;
		}
		load().then((b) => {
			const nq = normalizeTerm(q);

			// 1. Try exact phrase match
			let slug = b.lookup[nq];

			// 2. Try individual significant words (longest first)
			if (!slug) {
				const words = nq
					.split(' ')
					.filter((w) => w.length > 3)
					.sort((a, b) => b.length - a.length);
				for (const w of words) {
					slug = b.lookup[w];
					if (slug) break;
				}
			}

			if (!slug || !b.suggestions[slug]) {
				related = [];
				return;
			}

			related = b.suggestions[slug]
				.map((s) => ({ slug: s, term: b.terms[s] ?? s }))
				.filter((r) => r.term);
		});
	});
</script>

{#if related.length > 0}
	<div class="related-topics">
		<span class="related-label">Sujets connexes :</span>
		<ul class="related-list">
			{#each related as r (r.slug)}
				<li>
					<a href="/glossaire/{r.slug}" class="related-chip">{r.term}</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.related-topics {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem 0.6rem;
		padding: 0.6rem 0;
	}
	.related-label {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--color-muted);
		white-space: nowrap;
		flex: none;
	}
	.related-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.related-chip {
		display: inline-block;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-fg);
		background: color-mix(in srgb, var(--color-fg) 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		border-radius: 999px;
		padding: 0.2rem 0.65rem;
		text-decoration: none;
		transition:
			background 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}
	.related-chip:hover {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
		color: var(--color-accent-text, var(--color-accent));
	}
</style>
