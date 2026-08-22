<script lang="ts">
	import { type BookInfo, getPrevBook, getNextBook } from '$lib/utils/bibleBookSlug';
	import BookNavLink from './BookNavLink.svelte';
	import ChapterNavLink from './ChapterNavLink.svelte';
	import FloatingNav from './FloatingNav.svelte';
	import ChapterFilterBar from './ChapterFilterBar.svelte';
	import { prefs, updatePref } from '$lib/stores/prefs';

	let {
		book,
		chapter,
		totalChapters,
		chapterCounts = {},
		citedVerseCount = 0,
		hasConcordance = false,
		variant = 'reader'
	}: {
		book: BookInfo;
		chapter: number;
		totalChapters: number;
		chapterCounts?: Record<string, number>;
		citedVerseCount?: number;
		hasConcordance?: boolean;
		variant?: 'reader' | 'concordance';
	} = $props();

	// Paragraph mode renders no citation sidebar, and a chapter with no
	// citations has nothing to annotate. Disable rather than hide, so the nav
	// row keeps the same contents while paging between chapters.
	const toggleDisabled = $derived(citedVerseCount === 0 || $prefs.bibleLayout === 'paragraph');

	function buildHref(slug: string, ch: number): string {
		return variant === 'concordance' ? `/bible/${slug}/${ch}/concordance` : `/bible/${slug}/${ch}`;
	}

	const prevHref = $derived(chapter > 1 ? buildHref(book.slug, chapter - 1) : null);
	const nextHref = $derived(chapter < totalChapters ? buildHref(book.slug, chapter + 1) : null);

	const prevBook = $derived(getPrevBook(book.slug) ?? null);
	const nextBook = $derived(getNextBook(book.slug) ?? null);

	let navOpen = $state(false);
</script>

{#if variant === 'concordance'}
	<header
		class="sticky top-0 z-[var(--z-topbar)] bg-glass backdrop-blur-sm border-b border-border font-ui"
	>
		<div class="px-6 max-md:px-4 flex items-center gap-3" style="height: 50px;">
			<a
				href="/bible/{book.slug}/{chapter}"
				class="text-[12px] uppercase tracking-[0.15em] text-subtle hover:text-accent transition-colors shrink-0"
			>
				← Lecture
			</a>

			<div
				class="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 md:flex-none flex justify-center relative items-center"
			>
				<div
					class="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 items-center gap-[8px] pr-[8px]"
				>
					{#if prevBook}
						<BookNavLink
							href={buildHref(prevBook.slug, 1)}
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
							href={buildHref(nextBook.slug, 1)}
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
{:else}
	<div
		class="bible-chapter-nav sticky top-[var(--topbar-height,52px)] z-[var(--z-sticky)] bg-glass backdrop-blur-sm border-b border-border px-6 max-md:px-4 flex items-center gap-[10px] font-ui"
		style="height: 50px;"
	>
		<div
			class="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 md:flex-none flex justify-center relative items-center"
		>
			<div
				class="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 items-center gap-[8px] pr-[8px]"
			>
				{#if prevBook}
					<BookNavLink
						href={buildHref(prevBook.slug, 1)}
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
						href={buildHref(nextBook.slug, 1)}
						direction="next"
						label={nextBook.frenchName}
					/>
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
			</div>
		</div>

		<div class="ml-auto shrink-0 flex items-center gap-3">
			{#if hasConcordance}
				<a
					href="/bible/{book.slug}/{chapter}/concordance"
					class="hidden sm:inline font-ui text-[11px] uppercase tracking-[0.15em] text-accent hover:underline whitespace-nowrap"
				>
					Concordance →
				</a>
			{/if}
			<ChapterFilterBar
				studyMode={$prefs.bibleStudyMode}
				disabled={toggleDisabled}
				onchange={(next) => updatePref('bibleStudyMode', next)}
			/>
		</div>
	</div>
{/if}

{#if navOpen}
	<FloatingNav
		bookSlug={book.slug}
		chapterNum={chapter}
		{chapterCounts}
		{buildHref}
		onClose={() => (navOpen = false)}
		topOffset="calc(var(--topbar-height, 52px) + 50px)"
	/>
	<div
		class="fixed inset-0 z-[var(--z-overlay)]"
		role="presentation"
		onclick={() => (navOpen = false)}
	></div>
{/if}
