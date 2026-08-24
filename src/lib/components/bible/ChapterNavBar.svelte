<script lang="ts">
	import { type BookInfo, getPrevBook, getNextBook } from '$lib/utils/bibleBookSlug';
	import BookNavLink from './BookNavLink.svelte';
	import ChapterNavLink from './ChapterNavLink.svelte';
	import FloatingNav from './FloatingNav.svelte';
	import ChapterFilterBar from './ChapterFilterBar.svelte';
	import { prefs, updatePref } from '$lib/stores/prefs';
	import { suspendChrome } from '$lib/stores/chrome';

	let {
		book,
		chapter,
		totalChapters,
		chapterCounts = {},
		citedVerseCount = 0,
		hasConcordance = false,
		variant = 'reader',
		concordanceManifest = {}
	}: {
		book: BookInfo;
		chapter: number;
		totalChapters: number;
		chapterCounts?: Record<string, number>;
		citedVerseCount?: number;
		hasConcordance?: boolean;
		variant?: 'reader' | 'concordance';
		/** Book slug → chapters with CCC cross-references. Only meaningful for
		 *  variant="concordance", where it flags chapters with nothing to show
		 *  in the FloatingNav picker (see isChapterUnavailable below). */
		concordanceManifest?: Record<string, number[]>;
	} = $props();

	function isChapterUnavailable(slug: string, ch: number): boolean {
		if (variant !== 'concordance') return false;
		return !(concordanceManifest[slug] ?? []).includes(ch);
	}

	// Paragraph mode renders no citation sidebar, and a chapter with no
	// citations has nothing to annotate. Disable rather than hide, so the nav
	// row keeps the same contents while paging between chapters.
	const toggleDisabled = $derived(citedVerseCount === 0 || $prefs.bibleLayout === 'paragraph');

	function buildHref(slug: string, ch: number): string {
		return variant === 'concordance' ? `/bible/${slug}/${ch}/concordance` : `/bible/${slug}/${ch}`;
	}

	const readerHref = $derived(`/bible/${book.slug}/${chapter}`);
	const concordanceHref = $derived(`/bible/${book.slug}/${chapter}/concordance`);

	const prevHref = $derived(chapter > 1 ? buildHref(book.slug, chapter - 1) : null);
	const nextHref = $derived(chapter < totalChapters ? buildHref(book.slug, chapter + 1) : null);

	const prevBook = $derived(getPrevBook(book.slug) ?? null);
	const nextBook = $derived(getNextBook(book.slug) ?? null);

	let navOpen = $state(false);

	// Reveal-on-hover: the chapter-nav (unlike the topbar, which now always
	// stays visible) still tucks away on scroll-down. When it's tucked away,
	// its own hoverable box has translated off with it, so a mouseenter on the
	// bar itself can never fire to bring it back · track the cursor against
	// the viewport instead and hold the bar open via the same suspendChrome
	// mechanism the prefs popover / nav drawer use, so hovering the strip of
	// page where the bar normally lives reveals it.
	$effect(() => {
		if (variant !== 'reader' || typeof window === 'undefined') return;
		const topbarHeight =
			parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) ||
			52;
		const threshold = topbarHeight + 50;
		let hovering = false;
		function onMouseMove(e: MouseEvent) {
			const next = e.clientY <= threshold;
			if (next === hovering) return;
			hovering = next;
			suspendChrome('bible-chapter-nav-hover', hovering);
		}
		window.addEventListener('mousemove', onMouseMove, { passive: true });
		return () => {
			window.removeEventListener('mousemove', onMouseMove);
			if (hovering) suspendChrome('bible-chapter-nav-hover', false);
		};
	});
</script>

{#if variant === 'concordance'}
	<header
		class="sticky top-0 z-[var(--z-topbar)] bg-glass backdrop-blur-sm border-b border-border font-ui"
	>
		<div class="px-6 max-md:px-4 flex items-center gap-3" style="height: 50px;">
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

			<div class="ml-auto shrink-0">
				<ChapterFilterBar mode="concordance" hasConcordance={true} {readerHref} {concordanceHref} />
			</div>
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
			<ChapterFilterBar
				mode={$prefs.bibleStudyMode ? 'etude' : 'lecture'}
				{hasConcordance}
				{concordanceHref}
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
		{isChapterUnavailable}
	/>
	<div
		class="fixed inset-0 z-[var(--z-overlay)]"
		role="presentation"
		onclick={() => (navOpen = false)}
	></div>
{/if}
