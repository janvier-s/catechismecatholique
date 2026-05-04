<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadCitedBy } from '$lib/data/loaders';
	import { pluralFr } from '$lib/utils/i18n';
	import ParagraphList from './ParagraphList.svelte';

	let citers: number[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const all = await loadCitedBy();
			citers = all[ctx.paragraph] ?? [];
		})();
	});
</script>

{#if citers.length > 0}
	<p class="text-muted text-xs mb-3 font-ui">
		{citers.length}
		{pluralFr(citers.length, 'paragraphe')}
		{citers.length === 1 ? 'cite' : 'citent'} ce paragraphe :
	</p>
{/if}
<ParagraphList numbers={citers} emptyMessage="Aucun paragraphe ne cite ce paragraphe." />
