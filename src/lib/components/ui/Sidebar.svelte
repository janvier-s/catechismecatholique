<script lang="ts">
	import { sidebarOpen } from '$lib/stores/sidebar';
	import { loadStructure } from '$lib/data/loaders';

	type Part = { slug: string; title: string; number?: number; prologue?: boolean };
	let parts: Part[] = $state([]);

	$effect(() => {
		(async () => {
			const struct = (await loadStructure()) as { parts: Part[] };
			parts = struct.parts;
		})();
	});
</script>

{#if $sidebarOpen}
	<aside
		class="hidden lg:block sticky top-[80px] h-[calc(100vh-80px)] w-[280px] bg-panel border-r border-border overflow-y-auto z-20 styled-scroll flex-none"
		aria-label="Plan du Catéchisme"
	>
		<nav class="p-3">
			<ul class="space-y-1 font-ui text-sm">
				{#each parts as part (part.slug)}
					<li>
						<a
							href={part.prologue ? '/ccc/prologue' : `/ccc/${part.slug}`}
							class="block py-2 px-2 rounded hover:bg-accent/10 hover:text-accent"
						>
							<span class="font-semibold">
								{part.prologue ? 'Prologue' : `Partie ${part.number}`}
							</span>
							<span class="block text-muted text-xs mt-0.5">{part.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>
{/if}

<style>
	.styled-scroll {
		scrollbar-width: thin;
	}
	.styled-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.styled-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 3px;
	}
</style>
