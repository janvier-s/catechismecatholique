<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import Wordmark from './Wordmark.svelte';
	import ModeToggle from './ModeToggle.svelte';
	import NavDrawer from './NavDrawer.svelte';
	import SearchSuggest from './SearchSuggest.svelte';
	import { goto, afterNavigate } from '$app/navigation';
	import { chromeHidden, revealChrome } from '$lib/stores/chrome';
	import { page } from '$app/state';
	import { detectIntent } from '$lib/utils/searchIntent';

	// Hide the global search on /recherche · the page owns its own input there
	// and we don't want two affordances competing for the same query.
	const onRecherche = $derived(page.url.pathname === '/recherche');

	let topbarQ = $state('');
	let topbarSuggestOpen = $state(false);
	let topbarSuggestEl: SearchSuggest | undefined = $state();

	// The browser's caret-into-view algorithm fires on every keystroke and
	// scrolls the page ~56px upward because scroll-padding-top:6rem makes it
	// think the topbar input is inside the "obscured" zone. CSS alone
	// (scroll-margin-top:-6rem) doesn't reliably stop it. Record scrollY
	// before each input event and restore on the next frame if it changed.
	function lockScrollOnInput() {
		if (typeof window === 'undefined') return;
		const y = window.scrollY;
		requestAnimationFrame(() => {
			if (window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' });
		});
	}

	// Reveal-on-scroll · the reducer lives in $lib/stores/chrome so its
	// behaviour is unit-tested without a DOM. Here we only mirror it onto
	// <html>, the same way prefs.ts publishes data-theme and friends, and let
	// CSS do the moving. This replaces the old mobile-only shrink-on-scroll.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.dataset.chromeHidden = String($chromeHidden);
	});

	// A new page should never open with its header already tucked away.
	afterNavigate(() => revealChrome());
</script>

<header class="topbar border-b border-border bg-background sticky top-0 z-[var(--z-modal)]">
	<div class="relative px-4 md:px-6 h-[47px] md:h-[51px] flex items-center gap-3 md:gap-6">
		<a
			href="/"
			class="flex items-center gap-3 flex-none"
			title="Accueil"
			aria-label="Accueil · Catéchisme de l'Église Catholique"
		>
			<LogoMark />
			<Wordmark />
		</a>

		<div class="flex-1"></div>

		{#if !onRecherche}
			<!-- Search sits between the two flexible spacers, so it reads as
			     centered when the row has room and gives ground to the nav
			     when it doesn't · it used to be absolutely centered on the
			     viewport, which put it under the nav around 1200px. Only
			     renders at lg+ where there's room at all. -->
			<form
				class="hidden lg:block w-[460px] min-w-0"
				onsubmit={(e) => {
					e.preventDefault();
					topbarSuggestOpen = false;
					const q = topbarQ.trim();
					if (!q) return;
					const intent = detectIntent(q);
					if (intent.kind === 'paragraph' || intent.kind === 'bible') {
						void goto(intent.href);
					} else {
						void goto(`/recherche?q=${encodeURIComponent(intent.q)}`);
					}
					topbarQ = '';
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
						class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
						aria-hidden="true"
					>
						<circle cx="11" cy="11" r="7" />
						<path d="m21 21-4.3-4.3" />
					</svg>
					<input
						bind:value={topbarQ}
						type="search"
						name="q"
						placeholder="Rechercher : Eucharistie ou 1324-1327"
						class="search-input w-full h-9 pl-10 pr-3 rounded-md border border-border bg-panel text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-border focus:border-transparent"
						role="combobox"
						aria-label="Recherche"
						aria-autocomplete="list"
						aria-controls="search-suggest-list"
						aria-expanded={topbarSuggestOpen}
						autocomplete="off"
						onfocus={() => (topbarSuggestOpen = true)}
						onblur={() => setTimeout(() => (topbarSuggestOpen = false), 150)}
						onkeydown={(e) => topbarSuggestEl?.handleKeydown(e)}
						oninput={lockScrollOnInput}
					/>
					<span class="search-placeholder" aria-hidden="true">
						Rechercher : <i>Eucharistie</i> ou 1324-1327
					</span>
					{#if topbarSuggestOpen}
						<div class="topbar-suggest">
							<SearchSuggest
								bind:this={topbarSuggestEl}
								query={topbarQ}
								onSelect={(href) => {
									topbarSuggestOpen = false;
									topbarQ = '';
									void goto(href);
								}}
							/>
						</div>
					{/if}
				</div>
			</form>
		{/if}

		<div class="flex-1"></div>

		<nav
			class="hidden md:flex items-center gap-6 font-ui text-sm font-semibold flex-none relative z-[1]"
			aria-label="Navigation principale"
		>
			<a href="/cec" class="hover:text-accent">Catéchisme</a>
			<a href="/bible" class="hover:text-accent">Bible</a>
			<a href="/bibliotheque" class="hover:text-accent">Bibliothèque</a>
		</nav>
		<a
			href="/recherche"
			class="md:hidden inline-flex items-center justify-center w-10 h-10 text-foreground hover:text-accent"
			aria-label="Ouvrir la recherche"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="w-[18px] h-[18px]"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="7" />
				<path d="m21 21-4.3-4.3" />
			</svg>
		</a>
		<ModeToggle />
		<NavDrawer />
	</div>
</header>

<style>
	.topbar-suggest {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: calc(var(--z-modal) + 1);
	}
	/* Native placeholder is always hidden · the styled overlay below shows in
	   its place so we can italicize the keyword example. */
	.search-input::placeholder {
		color: transparent;
	}
	.search-placeholder {
		position: absolute;
		left: 2.5rem; /* matches input pl-10 */
		right: 0.75rem; /* matches input pr-3 */
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--color-muted);
		font-family: var(--font-ui);
		font-size: 0.875rem; /* text-sm */
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: opacity 80ms ease;
	}
	.search-placeholder i {
		font-style: italic;
	}
	.search-input:focus ~ .search-placeholder,
	.search-input:not(:placeholder-shown) ~ .search-placeholder {
		opacity: 0;
	}
</style>
