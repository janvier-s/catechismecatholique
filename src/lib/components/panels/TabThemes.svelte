<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraphThemes } from '$lib/data/loaders';

	type ParagraphThemeRef = { name: string; slug: string };

	let themes: ParagraphThemeRef[] = $state([]);
	let loading: boolean = $state(false);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'paragraph') return;
		const n = ctx.paragraph;
		loading = true;
		themes = [];
		(async () => {
			const all = await loadParagraphThemes();
			themes = all[String(n)] ?? [];
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
		{themes.length === 1 ? 'thème' : 'thèmes'} :
	</p>
	<ul class="flex flex-wrap gap-2" role="list">
		{#each themes as theme (theme.slug)}
			<li>
				<a
					href="/glossaire/{theme.slug}"
					class="inline-block rounded-full border border-border px-3 py-1 text-xs font-ui text-fg hover:border-accent hover:text-accent transition-colors"
				>
					{theme.name}
				</a>
			</li>
		{/each}
	</ul>
{/if}
