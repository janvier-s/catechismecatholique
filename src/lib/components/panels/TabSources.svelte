<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph, loadAbbreviations } from '$lib/data/loaders';
	import type { MagisterialRefRecord, AbbreviationMap } from '$lib/data/types';

	let refs: MagisterialRefRecord[] = $state([]);
	let abbrs: AbbreviationMap = $state({});

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const [p, a] = await Promise.all([loadParagraph(ctx.paragraph), loadAbbreviations()]);
			refs = p.magisterial_refs.filter(
				(r) => r.type === 'magisterial' || r.type === 'patristic' || r.type === 'liturgical'
			);
			abbrs = a;
		})();
	});

	// Try to expand the first abbreviation token of `raw` (e.g. "GS 19, § 1" → "Gaudium et Spes 19, § 1")
	function expand(raw: string): string {
		const m = raw.match(/^([A-Z][A-Za-z]*)\b/);
		if (!m) return raw;
		const exp = abbrs[m[1]!];
		if (!exp) return raw;
		return raw.replace(m[1]!, exp);
	}
</script>

<div class="font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune source.</p>
	{:else}
		<ul class="space-y-2">
			{#each refs as ref, i (i)}
				<li>{expand(ref.raw)}</li>
			{/each}
		</ul>
	{/if}
</div>
