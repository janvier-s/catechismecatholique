<script lang="ts">
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	let { books }: { books: BookInfo[] } = $props();
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
	{#each books as book (book.slug)}
		<a
			href="/bible/{book.slug}"
			class="block p-2 text-sm rounded border border-border hover:border-accent hover:text-accent"
		>
			{book.frenchName}
		</a>
	{/each}
</div>
