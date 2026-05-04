<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import {
		OT_BOOKS,
		NT_BOOKS,
		bookTestament,
		type Testament
	} from '$lib/utils/bibleBookSlug';

	let {
		bookSlug,
		chapterNum,
		chapterCounts,
		buildHref,
		onClose,
		topOffset = '80px'
	}: {
		bookSlug: string;
		chapterNum: number;
		chapterCounts: Record<string, number>;
		buildHref: (slug: string, chapter: number) => string;
		onClose: () => void;
		/** CSS top offset to position the dropdown below the page header. */
		topOffset?: string;
	} = $props();

	// Component remounts every time the dropdown opens (wrapped in {#if navOpen}),
	// so seeding state from props on init is intentional and fresh per open.
	// svelte-ignore state_referenced_locally
	let activeTestament = $state<Testament>(bookTestament(bookSlug));
	// svelte-ignore state_referenced_locally
	let expandedBooks = $state<Set<string>>(new Set([bookSlug]));

	function toggleBook(slug: string) {
		const next = new Set(expandedBooks);
		if (next.has(slug)) next.delete(slug);
		else next.add(slug);
		expandedBooks = next;
	}

	let otContainer: HTMLElement | undefined = $state();
	let ntContainer: HTMLElement | undefined = $state();

	onMount(async () => {
		await tick();
		const container = activeTestament === 'OT' ? otContainer : ntContainer;
		const active = container?.querySelector('[data-active-book]') as HTMLElement | null;
		active?.scrollIntoView({ block: 'center', behavior: 'instant' });
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function focusTrap(node: HTMLElement) {
		const FOCUSABLE =
			'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const first = () => node.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
		const last = () => {
			const els = node.querySelectorAll<HTMLElement>(FOCUSABLE);
			return els[els.length - 1];
		};

		function onKeydown(e: KeyboardEvent) {
			if (e.key !== 'Tab') return;
			if (e.shiftKey) {
				if (document.activeElement === first()) {
					e.preventDefault();
					last()?.focus();
				}
			} else {
				if (document.activeElement === last()) {
					e.preventDefault();
					first()?.focus();
				}
			}
		}

		node.addEventListener('keydown', onKeydown);
		first()?.focus();
		return { destroy: () => node.removeEventListener('keydown', onKeydown) };
	}

	function chaptersOf(usfx: string): number {
		return chapterCounts[usfx] ?? 0;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed left-1/2 -translate-x-1/2 z-[65] bg-panel border border-border rounded-sm shadow-xl w-80 max-h-[72vh] flex flex-col font-ui"
	style="top: {topOffset};"
	role="dialog"
	aria-label="Navigation biblique"
	aria-modal="true"
	transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
	use:focusTrap
>
	<!-- AT / NT tabs -->
	<div class="flex border-b border-border shrink-0" role="tablist" aria-label="Testament">
		{#each ['OT', 'NT'] as Testament[] as t}
			<button
				role="tab"
				aria-selected={activeTestament === t}
				tabindex={activeTestament === t ? 0 : -1}
				class="flex-1 py-[15px] text-[12px] uppercase tracking-[0.15em] font-medium transition-colors
            {activeTestament === t
					? 'bg-background text-accent border-b-2 border-accent'
					: 'text-subtle hover:text-foreground'}"
				onclick={() => (activeTestament = t)}
			>
				{#if t === 'OT'}Ancien<br />Testament{:else}Nouveau<br />Testament{/if}
			</button>
		{/each}
	</div>

	<!-- Both lists always in DOM — hidden preserves each testament's scroll position -->
	<div class="flex-1 flex flex-col min-h-0">
		<div
			bind:this={otContainer}
			class="overflow-y-auto flex-1 py-[6px] nav-scroll"
			class:hidden={activeTestament !== 'OT'}
		>
			{#each OT_BOOKS as book (book.slug)}
				<div>
					<button
						data-active-book={book.slug === bookSlug ? 'true' : undefined}
						aria-expanded={expandedBooks.has(book.slug)}
						class="w-full text-left px-[16px] py-[9px] text-[16px] font-medium transition-colors
              {book.slug === bookSlug
							? 'text-accent bg-background hover:bg-border'
							: 'text-foreground hover:bg-border hover:text-accent'}"
						onclick={() => toggleBook(book.slug)}
					>
						{book.frenchName}
					</button>
					{#if expandedBooks.has(book.slug)}
						{@const total = chaptersOf(book.usfx)}
						<div
							transition:slide={{ duration: 180 }}
							class="px-[16px] pb-[10px] pt-[4px] gap-[4px] grid grid-cols-7"
						>
							{#each Array.from({ length: total }, (_, i) => i + 1) as ch (ch)}
								<a
									href={buildHref(book.slug, ch)}
									onclick={onClose}
									class="py-[8px] rounded-[2px] hover:bg-accent hover:text-white transition-colors text-center block tabular-nums font-medium leading-tight
                    {book.slug === bookSlug && ch === chapterNum
										? 'bg-accent text-white'
										: 'text-subtle'}"
								>
									<span class="block text-[14px]">{ch}</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div
			bind:this={ntContainer}
			class="overflow-y-auto flex-1 py-[6px] nav-scroll"
			class:hidden={activeTestament !== 'NT'}
		>
			{#each NT_BOOKS as book (book.slug)}
				<div>
					<button
						data-active-book={book.slug === bookSlug ? 'true' : undefined}
						aria-expanded={expandedBooks.has(book.slug)}
						class="w-full text-left px-[16px] py-[9px] text-[16px] font-medium transition-colors
              {book.slug === bookSlug
							? 'text-accent bg-background hover:bg-border'
							: 'text-foreground hover:bg-border hover:text-accent'}"
						onclick={() => toggleBook(book.slug)}
					>
						{book.frenchName}
					</button>
					{#if expandedBooks.has(book.slug)}
						{@const total = chaptersOf(book.usfx)}
						<div
							transition:slide={{ duration: 180 }}
							class="px-[16px] pb-[10px] pt-[4px] gap-[4px] grid grid-cols-7"
						>
							{#each Array.from({ length: total }, (_, i) => i + 1) as ch (ch)}
								<a
									href={buildHref(book.slug, ch)}
									onclick={onClose}
									class="py-[8px] rounded-[2px] hover:bg-accent hover:text-white transition-colors text-center block tabular-nums font-medium leading-tight
                    {book.slug === bookSlug && ch === chapterNum
										? 'bg-accent text-white'
										: 'text-subtle'}"
								>
									<span class="block text-[14px]">{ch}</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.nav-scroll {
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
	}
	.nav-scroll::-webkit-scrollbar {
		width: 4px;
	}
	.nav-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.nav-scroll::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 2px;
	}
	.nav-scroll::-webkit-scrollbar-thumb:hover {
		background: var(--color-subtle);
	}
</style>
