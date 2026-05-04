<script lang="ts">
	import {
		type BookInfo,
		getPrevBook,
		getNextBook
	} from '$lib/utils/bibleBookSlug';
	import BookNavLink from '../BookNavLink.svelte';
	import ChapterNavLink from '../ChapterNavLink.svelte';
	import FloatingNav from '../FloatingNav.svelte';

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

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}/concordance` : null);
	const nextHref = $derived(
		chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}/concordance` : null
	);

	const prevBook = $derived(getPrevBook(book.slug) ?? null);
	const nextBook = $derived(getNextBook(book.slug) ?? null);

	let navOpen = $state(false);

	function buildHref(slug: string, ch: number): string {
		return `/bible/${slug}/${ch}/concordance`;
	}
</script>

<header class="sticky top-0 z-30 bg-glass backdrop-blur-sm border-b border-border font-ui">
	<div class="px-6 max-md:px-2 flex items-center gap-3" style="height: 50px;">
		<a
			href="/bible/{book.slug}/{chapter}"
			class="text-[12px] uppercase tracking-[0.15em] text-subtle hover:text-accent transition-colors shrink-0"
		>
			← Lecture
		</a>

		<!-- Center: chapter button with chevrons -->
		<div
			class="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 md:flex-none flex justify-center relative items-center"
		>
			<!-- Left chevrons -->
			<div
				class="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 items-center gap-[8px] pr-[8px]"
			>
				{#if prevBook}
					<BookNavLink
						href={`/bible/${prevBook.slug}/1/concordance`}
						direction="prev"
						label={prevBook.frenchName}
					/>
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
				{#if prevHref}
					<ChapterNavLink href={prevHref} direction="prev" chapter={chapter - 1} />
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
			</div>

			<button
				type="button"
				class="flex items-center gap-[5px] px-[12px] md:px-[17px] py-[8px] md:py-[10px] rounded-[3px] transition-colors
					{navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
				aria-expanded={navOpen}
				aria-haspopup="dialog"
				onclick={() => (navOpen = !navOpen)}
			>
				<span class="text-[14px] md:text-[16px] font-medium">{book.frenchName} {chapter}</span>
				<span class="text-[10px] md:text-[11px] opacity-80 leading-none" aria-hidden="true"
					>{navOpen ? '▲' : '▼'}</span
				>
			</button>

			<!-- Right chevrons -->
			<div
				class="hidden md:flex absolute left-full top-1/2 -translate-y-1/2 items-center gap-[8px] pl-[8px]"
			>
				{#if nextHref}
					<ChapterNavLink href={nextHref} direction="next" chapter={chapter + 1} />
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
				{#if nextBook}
					<BookNavLink
						href={`/bible/${nextBook.slug}/1/concordance`}
						direction="next"
						label={nextBook.frenchName}
					/>
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
			</div>
		</div>

		<span class="shrink-0 w-[60px] hidden md:block"></span>
	</div>
</header>

{#if navOpen}
	<FloatingNav
		bookSlug={book.slug}
		chapterNum={chapter}
		{chapterCounts}
		{buildHref}
		onClose={() => (navOpen = false)}
		topOffset="130px"
	/>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="fixed inset-0 z-[57]" role="presentation" onclick={() => (navOpen = false)}></div>
{/if}
