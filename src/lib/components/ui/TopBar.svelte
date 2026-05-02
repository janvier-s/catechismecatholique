<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import Wordmark from './Wordmark.svelte';
	import ModeToggle from './ModeToggle.svelte';
</script>

<header class="border-b border-border bg-background sticky top-0 z-30">
	<div class="mx-auto max-w-7xl px-6 py-3 flex items-center gap-6 min-h-[80px]">
		<a href="/" class="flex items-center gap-3 flex-none" aria-label="Accueil">
			<LogoMark />
			<Wordmark />
		</a>

		<div class="flex-1"></div>
		<div class="hidden lg:block w-full max-w-[460px]">
			<input
				type="search"
				placeholder="Chercher § 27, Mt 28:19, péché originel…"
				class="w-full h-10 px-4 rounded-md border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
				disabled
				aria-label="Recherche (à venir)"
			/>
		</div>
		<div class="flex-1"></div>

		<nav class="hidden md:flex items-center gap-6 font-ui text-sm font-semibold flex-none">
			<a href="/ccc" class="hover:text-accent">Catéchisme</a>
			<a href="/bible" class="hover:text-accent">Bible</a>
			<a href="/ccc/sommaire" class="hover:text-accent">Sommaire</a>
			<a href="/a-propos" class="hover:text-accent">À propos</a>
		</nav>
		<ModeToggle />
	</div>
</header>
