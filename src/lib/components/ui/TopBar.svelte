<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import Wordmark from './Wordmark.svelte';
	import ModeToggle from './ModeToggle.svelte';
	import CatechismDropdown from './CatechismDropdown.svelte';
	import { goto } from '$app/navigation';
	import { detectIntent } from '$lib/utils/searchIntent';
</script>

<header class="border-b border-border bg-background sticky top-0 z-30">
	<div class="mx-auto max-w-7xl px-6 py-3 flex items-center gap-6 min-h-[80px]">
		<a href="/" class="flex items-center gap-3 flex-none" aria-label="Accueil">
			<LogoMark />
			<Wordmark />
		</a>

		<div class="flex-1"></div>
		<form
			class="hidden lg:block w-full max-w-[460px]"
			onsubmit={(e) => {
				e.preventDefault();
				const q = (
					(new FormData(e.currentTarget as HTMLFormElement).get('q') as string) ?? ''
				).trim();
				if (!q) return;
				const intent = detectIntent(q);
				if (intent.kind === 'paragraph' || intent.kind === 'bible') {
					void goto(intent.href);
				} else {
					void goto(`/recherche?q=${encodeURIComponent(intent.q)}`);
				}
			}}
		>
			<div class="relative">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-muted pointer-events-none"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m21 21-4.3-4.3" />
				</svg>
				<input
					type="search"
					name="q"
					placeholder="Rechercher : Eucharistie ou 1324-1327"
					class="search-input w-full h-10 pl-10 pr-3 rounded-md border border-border bg-panel text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-border focus:border-transparent"
					aria-label="Recherche"
				/>
			</div>
		</form>
		<div class="flex-1"></div>

		<nav class="hidden md:flex items-center gap-6 font-ui text-sm font-semibold flex-none">
			<CatechismDropdown />
			<a href="/bible" class="hover:text-accent">Bible</a>
			<a href="/glossaire" class="hover:text-accent">Glossaire</a>
			<a href="/a-propos" class="hover:text-accent">À propos</a>
		</nav>
		<ModeToggle />
	</div>
</header>

<style>
	/* Hide the placeholder while the search input is focused. */
	.search-input:focus::placeholder {
		color: transparent;
	}
</style>
