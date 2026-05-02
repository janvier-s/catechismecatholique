<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraphContexts } from '$lib/data/loaders';
	import type { ParagraphContext } from '$lib/data/types';

	let context: ParagraphContext | null = $state(null);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const all = await loadParagraphContexts();
			context = all[ctx.paragraph] ?? null;
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if !context?.chapter}
		<p class="text-muted italic">Pas d'En Bref disponible.</p>
	{:else}
		<p class="text-muted">Voir l'En Bref dans le chapitre :</p>
		<p class="mt-2">
			<a
				href={`/ccc/${context.part.slug}/${context.section!.slug}/${context.chapter.slug}`}
				class="text-accent hover:underline"
			>
				{context.chapter.title} →
			</a>
		</p>
	{/if}
</div>
