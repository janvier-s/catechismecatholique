<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraphThemes } from '$lib/data/loaders';

	type ParagraphThemeRef = { name: string; slug: string };
	type ThemeWithCount = ParagraphThemeRef & { count: number };

	let themes: ThemeWithCount[] = $state([]);
	let loading: boolean = $state(false);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'paragraph') return;
		const n = ctx.paragraph;
		loading = true;
		themes = [];
		(async () => {
			const all = await loadParagraphThemes();
			const mine = all[String(n)] ?? [];
			// Invert the map once to count paragraphs per theme.
			const counts: Record<string, number> = {};
			for (const entries of Object.values(all)) {
				for (const t of entries) counts[t.slug] = (counts[t.slug] ?? 0) + 1;
			}
			themes = mine.map((t) => ({ ...t, count: counts[t.slug] ?? 0 }));
			loading = false;
		})();
	});
</script>

{#if loading}
	<p class="text-muted text-sm italic">Chargement…</p>
{:else if themes.length === 0}
	<p class="text-muted text-sm italic">Aucun thème trouvé pour ce paragraphe.</p>
{:else}
	<p class="text-muted text-xs mb-3 font-ui">
		{themes.length}
		{themes.length === 1 ? 'thème' : 'thèmes'}
	</p>
	<ul class="theme-grid" role="list">
		{#each themes as theme (theme.slug)}
			<li>
				<a href="/glossaire/{theme.slug}" class="theme-card">
					<span class="theme-name">{theme.name}</span>
					<span class="theme-count">
						{theme.count}
						{theme.count === 1 ? 'paragraphe' : 'paragraphes'}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.theme-card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 8px;
		min-height: 64px;
		padding: 10px 12px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-panel) 96%, var(--color-fg) 4%);
		color: var(--color-fg);
		text-decoration: none;
		transition:
			border-color 120ms ease,
			background-color 120ms ease,
			color 120ms ease;
	}
	.theme-card:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 6%, var(--color-panel));
	}
	.theme-name {
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 400;
		line-height: 1.25;
	}
	.theme-count {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		align-self: flex-end;
	}
	.theme-card:hover .theme-count {
		color: var(--color-accent);
	}
</style>
