<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import Wordmark from './Wordmark.svelte';
	import ModeToggle from './ModeToggle.svelte';
	import CatechismDropdown from './CatechismDropdown.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import SearchSuggest from './SearchSuggest.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { detectIntent } from '$lib/utils/searchIntent';

	// Hide the global search on /recherche — the page owns its own input there
	// and we don't want two affordances competing for the same query.
	const onRecherche = $derived(page.url.pathname === '/recherche');

	let topbarQ = $state('');
	let topbarSuggestOpen = $state(false);
	let topbarSuggestEl: SearchSuggest | undefined = $state();

	// Shrink-on-scroll (mobile only — desktop topbar stays as-is). The
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
</script>

<header
	class="topbar border-b border-border bg-background sticky top-0 z-[var(--z-modal)]"
	class:is-condensed={condensed}
>
	<div
		class="relative px-4 md:px-6 py-2 md:py-3 flex items-center gap-3 md:gap-6 min-h-[58px] md:min-h-[80px]"
	>
		<a href="/" class="flex items-center gap-3 flex-none" aria-label="Accueil">
			<LogoMark />
			<Wordmark />
		</a>

		<div class="flex-1"></div>

		<nav class="hidden md:flex items-center gap-6 font-ui text-sm font-semibold flex-none">
			<CatechismDropdown />
			<a href="/bible" class="hover:text-accent">Bible</a>
			<a href="/glossaire" class="hover:text-accent">Glossaire</a>
			<a href="/a-propos" class="hover:text-accent">À propos</a>
		</nav>
		<ModeToggle />
		<MobileMenu />

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
						aria-label="Recherche"
						aria-autocomplete="list"
						aria-expanded={topbarSuggestOpen}
						autocomplete="off"
						onfocus={() => (topbarSuggestOpen = true)}
						onblur={() => setTimeout(() => (topbarSuggestOpen = false), 150)}
						onkeydown={(e) => topbarSuggestEl?.handleKeydown(e)}
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
		/* Condensed state — shrinks the bar but keeps the logo a clear tap target. */
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
	/* Native placeholder is always hidden — the styled overlay below shows in
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
