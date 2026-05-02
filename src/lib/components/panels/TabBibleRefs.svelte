<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph } from '$lib/data/loaders';
	import { bookByAbbr } from '$lib/utils/bibleBookSlug';
	import type { BibleRef } from '$lib/data/types';

	let refs: BibleRef[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const p = await loadParagraph(ctx.paragraph);
			refs = p.bible_refs;
		})();
	});

	function bibleHref(text: string): string | null {
		const m = text.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s+(\d+):(\d+)/);
		if (!m) return null;
		const book = bookByAbbr(m[1]!.trim());
		if (!book) return null;
		return `/bible/${book.slug}/${m[2]}/${m[3]}`;
	}
</script>

<div class="space-y-2 font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune référence biblique.</p>
	{:else}
		<ul class="space-y-1">
			{#each refs as ref, i (i)}
				{@const href = bibleHref(ref.text)}
				<li>
					{#if href}
						<a {href} class="text-accent hover:underline">{ref.text}</a>
					{:else}
						<span>{ref.text}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
