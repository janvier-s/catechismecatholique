<script lang="ts">
	import { getPrevBook, getNextBook, type BookInfo } from '$lib/utils/bibleBookSlug';

	let {
		book,
		chapter,
		totalChapters,
		chapterCounts = {}
	}: {
		book: BookInfo;
		chapter: number;
		totalChapters: number;
		chapterCounts?: Record<string, number>;
	} = $props();

	function chapterLabel(usfx: string, n: number): string {
		return usfx === 'PSA' ? `Ps. ${n}` : `Ch. ${n}`;
	}

	// Unlike the top ChapterNavBar's book-boundary arrows (which always land on
	// chapter 1 of the adjacent book, for browsing), this strip continues the
	// reading: crossing backward lands on the previous book's LAST chapter,
	// crossing forward lands on the next book's first · matching
	// douayrheimsbible's ChapterView nav.
	const prevBook = $derived(chapter <= 1 ? (getPrevBook(book.slug) ?? null) : null);
	const prevNav = $derived.by(() => {
		if (chapter > 1) {
			return { slug: book.slug, ch: chapter - 1, label: chapterLabel(book.usfx, chapter - 1) };
		}
		if (!prevBook) return null;
		const lastCh = chapterCounts[prevBook.usfx] ?? 1;
		return {
			slug: prevBook.slug,
			ch: lastCh,
			label: prevBook.frenchName,
			sub: chapterLabel(prevBook.usfx, lastCh)
		};
	});

	const nextBook = $derived(chapter >= totalChapters ? (getNextBook(book.slug) ?? null) : null);
	const nextNav = $derived.by(() => {
		if (chapter < totalChapters) {
			return { slug: book.slug, ch: chapter + 1, label: chapterLabel(book.usfx, chapter + 1) };
		}
		if (!nextBook) return null;
		return {
			slug: nextBook.slug,
			ch: 1,
			label: nextBook.frenchName,
			sub: chapterLabel(nextBook.usfx, 1)
		};
	});
</script>

{#if prevNav || nextNav}
	<nav
		class="chapter-prev-next flex justify-between items-center mb-8 font-ui"
		aria-label="Chapitre précédent / suivant"
	>
		{#if prevNav}
			<a
				href="/bible/{prevNav.slug}/{prevNav.ch}"
				class="flex items-center gap-[5px] text-subtle hover:text-accent transition-colors text-[12px] uppercase tracking-[0.15em]"
			>
				<span class="text-[16px] leading-none" aria-hidden="true">‹</span>
				<span class="flex flex-col leading-tight">
					<span>{prevNav.label}</span>
					{#if prevNav.sub}
						<span class="text-[10px] normal-case tracking-normal opacity-80">{prevNav.sub}</span>
					{/if}
				</span>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if nextNav}
			<a
				href="/bible/{nextNav.slug}/{nextNav.ch}"
				class="flex items-center gap-[5px] text-subtle hover:text-accent transition-colors text-[12px] uppercase tracking-[0.15em]"
			>
				<span class="flex flex-col items-end leading-tight">
					<span>{nextNav.label}</span>
					{#if nextNav.sub}
						<span class="text-[10px] normal-case tracking-normal opacity-80">{nextNav.sub}</span>
					{/if}
				</span>
				<span class="text-[16px] leading-none" aria-hidden="true">›</span>
			</a>
		{/if}
	</nav>
{/if}
