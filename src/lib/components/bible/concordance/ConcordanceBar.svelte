<script lang="ts">
	import type { BookInfo } from '$lib/utils/bibleBookSlug';

	let { book, chapter, totalChapters }: { book: BookInfo; chapter: number; totalChapters: number } =
		$props();

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}/concordance` : null);
	const nextHref = $derived(
		chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}/concordance` : null
	);
</script>

<header class="sticky top-0 z-30 bg-glass backdrop-blur-sm border-b border-border font-ui">
	<div class="px-lg py-3 flex items-center justify-between gap-3">
		<a
			href="/bible/{book.slug}/{chapter}"
			class="text-[12px] uppercase tracking-[0.15em] text-subtle hover:text-accent transition-colors"
		>
			← Lecture
		</a>
		<div class="flex items-center gap-3 flex-1 justify-center">
			{#if prevHref}
				<a href={prevHref} class="text-subtle hover:text-accent text-[12px]">‹ Ch. {chapter - 1}</a>
			{/if}
			<span class="text-foreground font-semibold text-[14px] text-center">
				{book.frenchName}
				{chapter}
			</span>
			{#if nextHref}
				<a href={nextHref} class="text-subtle hover:text-accent text-[12px]">Ch. {chapter + 1} ›</a>
			{/if}
		</div>
		<span class="w-[60px]"></span>
	</div>
</header>
