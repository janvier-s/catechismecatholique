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

	// Expand the first abbreviation token (e.g. "GS 19, § 1" → "Gaudium et Spes 19, § 1").
	function expand(raw: string): string {
		const m = raw.match(/^([A-Z][A-Za-z]*)\b/);
		if (!m) return raw;
		const exp = abbrs[m[1]!];
		if (!exp) return raw;
		return raw.replace(m[1]!, exp);
	}

	// Uppercase the first letter, preserving the rest. Skips a leading
	// quote/paren/dash if present.
	function capitalizeFirst(s: string): string {
		const m = s.match(/^([\s"«'\-(]*)([\p{L}])(.*)$/u);
		if (!m) return s;
		return m[1] + m[2]!.toLocaleUpperCase('fr-FR') + m[3];
	}

	function display(raw: string): string {
		return capitalizeFirst(expand(raw));
	}
</script>

<div class="font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune source.</p>
	{:else}
		<ul class="space-y-2">
			{#each refs as ref, i (i)}
				<li class="flex gap-2">
					{#if ref.idx}
						<span
							class="flex-none w-5 text-right pt-0.5 text-xs font-semibold text-accent tabular-nums"
						>
							{ref.idx}
						</span>
					{:else}
						<span class="flex-none w-5" aria-hidden="true"></span>
					{/if}
					<span class="flex-1 font-body text-[15px] leading-[1.5]">{display(ref.raw)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
