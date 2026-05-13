<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import Wordmark from './Wordmark.svelte';
	import ModeToggle from './ModeToggle.svelte';
	import NavDrawer from './NavDrawer.svelte';
	import SearchSuggest from './SearchSuggest.svelte';
	import { goto } from '$app/navigation';
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

	// Shrink-on-scroll (mobile only · desktop topbar stays as-is). The
	// .is-condensed class trims the bar height from 58 → 44 px once the user
	// has scrolled past ~40 px, recovering reading area in long catechism
	// chapters. CSS handles the transition.
	let condensed = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const onScroll = () => {
			condensed = window.scrollY > 40;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	// Sync the global --topbar-height variable so sticky elements outside
	// the topbar (e.g. the Bible chapter floatnav) stay flush with our
	// bottom edge, including the condensed-on-scroll mobile state.
	$effect(() => {
		if (typeof document === 'undefined') return;
		const html = document.documentElement;
		if (condensed) html.style.setProperty('--topbar-height', '46px');
		else html.style.removeProperty('--topbar-height');
	});
</script>

<header
	class="topbar border-b border-border bg-background sticky top-0 z-[var(--z-modal)]"
	class:is-condensed={condensed}
>
	<div
		class="relative px-4 md:px-6 py-2 md:py-3 flex items-center gap-3 md:gap-6 min-h-[58px] md:min-h-[80px]"
	>
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

		<nav
			class="hidden md:flex items-center gap-6 font-ui text-sm font-semibold flex-none relative z-[1]"
			aria-label="Navigation principale"
		>
			<a href="/cec" class="hover:text-accent">Catéchisme</a>
			<a href="/bible" class="hover:text-accent">Bible</a>
			<a href="/bon-pasteur" class="hover:text-accent">IBP</a>
			<a href="/encycliques" class="hover:text-accent">Encycliques</a>
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

		{#if !onRecherche}
			<!-- Search is absolutely positioned so it stays centered on the
			     page (left: 50%) regardless of how wide the logo or nav side
			     groups grow. Only renders at lg+ where there's room. -->
			<form
				class="hidden lg:block absolute left-1/2 -translate-x-1/2 w-full max-w-[460px]"
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
						class="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-muted pointer-events-none"
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
						class="search-input w-full h-10 pl-10 pr-3 rounded-md border border-border bg-panel text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-border focus:border-transparent"
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
	</div>
</header>

<style>
	.topbar {
		--topbar-height: 80px;
	}
	@media (max-width: 767px) {
		.topbar {
			--topbar-height: 58px;
		}
		.topbar > div {
			transition:
				min-height 200ms cubic-bezier(0.22, 1, 0.36, 1),
				padding 200ms cubic-bezier(0.22, 1, 0.36, 1);
		}
		.topbar :global(.logo-mark) {
			transition:
				width 200ms cubic-bezier(0.22, 1, 0.36, 1),
				height 200ms cubic-bezier(0.22, 1, 0.36, 1);
		}
		/* Condensed state · shrinks the bar but keeps the logo a clear tap target. */
		.topbar.is-condensed {
			--topbar-height: 46px;
		}
		.topbar.is-condensed > div {
			min-height: 46px !important;
			padding-top: 0.2rem;
			padding-bottom: 0.2rem;
		}
		.topbar.is-condensed :global(.logo-mark) {
			width: 30px !important;
			height: 30px !important;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.topbar > div,
		.topbar :global(.logo-mark) {
			transition: none;
		}
	}
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
