<script lang="ts">
	import { loadStructure } from '$lib/data/loaders';
	import { goto } from '$app/navigation';

	type Chapter = { slug: string; title: string; number?: number };
	type Section = { slug: string; title: string; number?: number; chapters: Chapter[] };
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
			if (!containerEl?.contains(e.target)) {
				open = false;
				activePart = null;
				activeSection = null;
			}
		};
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});

	function close() {
		open = false;
		activePart = null;
		activeSection = null;
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
			class="absolute top-full right-0 mt-2 bg-panel border border-border rounded-md shadow-xl z-40"
			role="menu"
			style="width: min(92vw, 920px);"
		>
			<div class="flex">
				<!-- Column 1: parts -->
				<div class="w-1/3 border-r border-border max-h-[60vh] overflow-y-auto">
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
							class="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent flex justify-between"
							class:bg-accent={activePart === part}
							class:!text-white={activePart === part}
							onmouseenter={() => {
								activePart = part;
								activeSection = null;
							}}
							onfocus={() => {
								activePart = part;
								activeSection = null;
							}}
							onclick={() => {
								// Navigating to a part takes user to /ccc/<part>
								goto(`/ccc/${part.slug}`);
								close();
							}}
						>
							<span>
								<span class="font-semibold">Partie {part.number} :</span>
								{part.title}
							</span>
							<span class="text-muted">›</span>
						</button>
					{/each}
				</div>

				<!-- Column 2: sections -->
				<div class="w-1/3 border-r border-border max-h-[60vh] overflow-y-auto">
					{#if activePart}
						{#each activePart.sections as section (section.slug)}
							<button
								type="button"
								class="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent flex justify-between"
								class:bg-accent={activeSection === section}
								class:!text-white={activeSection === section}
								onmouseenter={() => (activeSection = section)}
								onfocus={() => (activeSection = section)}
								onclick={() => {
									goto(`/ccc/${activePart!.slug}/${section.slug}`);
									close();
								}}
							>
								<span>
									<span class="font-semibold">Section {section.number} :</span>
									{section.title}
								</span>
								{#if section.chapters.length > 0}
									<span class="text-muted">›</span>
								{/if}
							</button>
						{/each}
					{:else}
						<p class="px-4 py-2 text-xs text-muted italic">Survolez une partie</p>
					{/if}
				</div>

				<!-- Column 3: chapters -->
				<div class="w-1/3 max-h-[60vh] overflow-y-auto">
					{#if activeSection}
						{#if activeSection.chapters.length === 0}
							<p class="px-4 py-2 text-xs text-muted italic">Cette section n'a pas de chapitres</p>
						{:else}
							{#each activeSection.chapters as chap (chap.slug)}
								<a
									href={`/ccc/${activePart!.slug}/${activeSection!.slug}/${chap.slug}`}
									onclick={close}
									class="block px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent"
									role="menuitem"
								>
									<span class="font-semibold">Chapitre {chap.number} :</span>
									{chap.title}
								</a>
							{/each}
						{/if}
					{:else}
						<p class="px-4 py-2 text-xs text-muted italic">Survolez une section</p>
					{/if}
				</div>
			</div>

			<div class="border-t border-border px-4 py-2">
				<a href="/ccc/sommaire" onclick={close} class="text-accent hover:underline text-sm">
					Sommaire complet →
				</a>
			</div>
		</div>
	{/if}
</div>
