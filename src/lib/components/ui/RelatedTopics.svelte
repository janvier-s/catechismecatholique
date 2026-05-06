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
			.replace(/[''–—-]/g, ' ')
			.replace(/[^a-z0-9 ]+/gi, '')
			.toLowerCase()
			.replace(/\s+/g, ' ')
			.trim();
	}

	interface Related {
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

			const suggestions = slug ? b.suggestions[slug] : undefined;
			if (!suggestions) {
				related = [];
				return;
			}

			related = suggestions.map((s) => ({ term: b.terms[s] ?? s })).filter((r) => r.term);
		});
	});
</script>

{#if related.length > 0}
	<div class="related-topics">
		<p class="related-label">Sujets connexes :</p>
		<div class="related-pills">
			{#each related as r (r.term)}
				<a href="/recherche?q={encodeURIComponent(r.term)}" class="related-pill">{r.term}</a>
			{/each}
		</div>
	</div>
{/if}

<style>
	.related-topics {
		text-align: center;
		margin-bottom: 1rem;
	}
	.related-label {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-muted);
		margin-bottom: 0.5rem;
	}
	.related-pills {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}
	.related-pill {
		display: inline-block;
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-muted);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.35rem 0.75rem;
		text-decoration: none;
		transition:
			color 120ms ease,
			border-color 120ms ease;
	}
	.related-pill:hover {
		color: var(--color-fg);
		border-color: color-mix(in srgb, var(--color-fg) 35%, transparent);
	}
</style>
