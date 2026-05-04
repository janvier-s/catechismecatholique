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
			<input
				type="search"
				name="q"
				placeholder="Chercher § 27, Mt 1, 14, péché originel…"
				class="w-full h-10 px-4 rounded-md border border-border bg-panel text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-accent"
				aria-label="Recherche"
			/>
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
