<script lang="ts">
	import { loadStructure } from '$lib/data/loaders';
	import { goto } from '$app/navigation';

	type Article = { slug: string; title: string; number?: number };
	type Chapter = {
		slug: string;
		title: string;
		number?: number;
		articles?: Article[];
	};
	type Section = {
		slug: string;
		title: string;
		number?: number;
		chapters: Chapter[];
		articles_direct?: Article[];
	};
	type Part = {
		slug: string;
		title: string;
		number?: number;
		prologue?: boolean;
		sections: Section[];
	};

	let parts: Part[] = $state([]);
	let activePart: Part | null = $state(null);
	let activeSection: Section | null = $state(null);
	let activeChapter: Chapter | null = $state(null);
	let open = $state(false);
	let containerEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		(async () => {
			const struct = (await loadStructure()) as { parts: Part[] };
			parts = struct.parts.filter((p) => !p.prologue);
		})();
	});

	$effect(() => {
		if (!open) return;
		const onDocClick = (e: MouseEvent) => {
			if (!(e.target instanceof Element)) return;
			if (!containerEl?.contains(e.target)) close();
		};
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onEsc);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onEsc);
		};
	});

	function close() {
		open = false;
		activePart = null;
		activeSection = null;
		activeChapter = null;
	}

	// When the section's only structural children are articles_direct (no chapters),
	// show those in column 3 and skip the chapter level.
	function sectionItems(s: Section): {
		kind: 'chapters' | 'articles';
		chapters: Chapter[];
		articles: Article[];
	} {
		if (s.chapters.length > 0) {
			return { kind: 'chapters', chapters: s.chapters, articles: [] };
		}
		return { kind: 'articles', chapters: [], articles: s.articles_direct ?? [] };
	}
</script>

<div class="relative" bind:this={containerEl}>
	<button
		type="button"
		class="font-ui text-sm font-semibold hover:text-accent flex items-center gap-1"
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
	>
		Catéchisme
		<span class="text-xs text-muted">▾</span>
	</button>

	{#if open}
		<div
			class="fixed top-[80px] left-1/2 -translate-x-1/2 bg-panel border border-border border-t-0 rounded-b-md shadow-xl z-40"
			role="menu"
			style="width: min(96vw, 1200px);"
		>
			<div class="flex">
				<!-- Column 1: parts -->
				<div class="w-1/4 border-r border-border max-h-[60vh] overflow-y-auto styled-scroll">
					<a
						href="/ccc/prologue"
						onclick={close}
						class="block px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent"
						role="menuitem"
					>
						Prologue
					</a>
					{#each parts as part (part.slug)}
						<button
							type="button"
							class="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent flex justify-between gap-2"
							class:bg-accent={activePart === part}
							class:!text-white={activePart === part}
							onmouseenter={() => {
								activePart = part;
								activeSection = null;
								activeChapter = null;
							}}
							onfocus={() => {
								activePart = part;
								activeSection = null;
								activeChapter = null;
							}}
							onclick={() => {
								goto(`/ccc/${part.slug}`);
								close();
							}}
						>
							<span class="min-w-0">
								<span class="font-semibold">Partie {part.number} :</span>
								{part.title}
							</span>
							<span class="text-muted flex-none">›</span>
						</button>
					{/each}
				</div>

				<!-- Column 2: sections -->
				<div class="w-1/4 border-r border-border max-h-[60vh] overflow-y-auto styled-scroll">
					{#if activePart}
						{#each activePart.sections as section (section.slug)}
							<button
								type="button"
								class="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent flex justify-between gap-2"
								class:bg-accent={activeSection === section}
								class:!text-white={activeSection === section}
								onmouseenter={() => {
									activeSection = section;
									activeChapter = null;
								}}
								onfocus={() => {
									activeSection = section;
									activeChapter = null;
								}}
								onclick={() => {
									goto(`/ccc/${activePart!.slug}/${section.slug}`);
									close();
								}}
							>
								<span class="min-w-0">
									<span class="font-semibold">Section {section.number} :</span>
									{section.title}
								</span>
								<span class="text-muted flex-none">›</span>
							</button>
						{/each}
					{:else}
						<p class="px-4 py-2 text-xs text-muted italic">Survolez une partie</p>
					{/if}
				</div>

				<!-- Column 3: chapters (or articles_direct when section has no chapters) -->
				<div class="w-1/4 border-r border-border max-h-[60vh] overflow-y-auto styled-scroll">
					{#if activeSection}
						{@const items = sectionItems(activeSection)}
						{#if items.kind === 'chapters'}
							{#each items.chapters as chap (chap.slug)}
								<button
									type="button"
									class="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent flex justify-between gap-2"
									class:bg-accent={activeChapter === chap}
									class:!text-white={activeChapter === chap}
									onmouseenter={() => (activeChapter = chap)}
									onfocus={() => (activeChapter = chap)}
									onclick={() => {
										goto(`/ccc/${activePart!.slug}/${activeSection!.slug}/${chap.slug}`);
										close();
									}}
								>
									<span class="min-w-0">
										<span class="font-semibold">Chapitre {chap.number} :</span>
										{chap.title}
									</span>
									{#if (chap.articles?.length ?? 0) > 0}
										<span class="text-muted flex-none">›</span>
									{/if}
								</button>
							{/each}
						{:else if items.kind === 'articles'}
							{#each items.articles as art (art.slug)}
								<a
									href={`/ccc/${activePart!.slug}/${activeSection!.slug}/${art.slug}`}
									onclick={close}
									class="block px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent"
									role="menuitem"
								>
									<span class="font-semibold">Article {art.number} :</span>
									{art.title}
								</a>
							{/each}
						{/if}
					{:else}
						<p class="px-4 py-2 text-xs text-muted italic">Survolez une section</p>
					{/if}
				</div>

				<!-- Column 4: articles inside a chapter -->
				<div class="w-1/4 max-h-[60vh] overflow-y-auto styled-scroll">
					{#if activeChapter}
						{#if (activeChapter.articles?.length ?? 0) === 0}
							<p class="px-4 py-2 text-xs text-muted italic">Pas d'article</p>
						{:else}
							{#each activeChapter.articles ?? [] as art (art.slug)}
								<a
									href={`/ccc/${activePart!.slug}/${activeSection!.slug}/${activeChapter!.slug}/${art.slug}`}
									onclick={close}
									class="block px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent"
									role="menuitem"
								>
									<span class="font-semibold">Article {art.number} :</span>
									{art.title}
								</a>
							{/each}
						{/if}
					{:else}
						<p class="px-4 py-2 text-xs text-muted italic">Survolez un chapitre</p>
					{/if}
				</div>
			</div>

			<div class="border-t border-border px-4 py-2 flex items-center justify-between">
				<a href="/ccc/sommaire" onclick={close} class="text-accent hover:underline text-sm font-ui">
					Sommaire complet →
				</a>
				<button
					type="button"
					onclick={close}
					class="text-xs text-muted hover:text-accent font-ui"
					aria-label="Fermer"
				>
					Fermer (Esc)
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.styled-scroll {
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--color-accent) 50%, transparent)
			color-mix(in srgb, var(--color-border) 40%, transparent);
	}
	.styled-scroll::-webkit-scrollbar {
		width: 7px;
		-webkit-appearance: none;
	}
	.styled-scroll::-webkit-scrollbar-track {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
	}
	.styled-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 4px;
		border: 1px solid transparent;
		background-clip: padding-box;
		min-height: 40px;
	}
	.styled-scroll::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--color-accent) 70%, transparent);
		background-clip: padding-box;
	}
</style>
