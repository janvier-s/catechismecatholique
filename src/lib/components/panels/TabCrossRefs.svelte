<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph } from '$lib/data/loaders';
	import ParagraphList from './ParagraphList.svelte';

	let crossRefs: number[] = $state([]);
	let loaded = $state(false);

	$effect(() => {
		const ctx = $studyPanel.context;
		loaded = false;
		if (ctx?.kind !== 'paragraph') return;
		(async () => {
			const p = await loadParagraph(ctx.paragraph);
			crossRefs = p.cross_refs.map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n));
			loaded = true;
		})();
	});
</script>

<ParagraphList numbers={crossRefs} emptyMessage="Aucun renvoi." {loaded} />
