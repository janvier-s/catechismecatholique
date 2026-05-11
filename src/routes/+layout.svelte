<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { get } from 'svelte/store';
	import TopBar from '$lib/components/ui/TopBar.svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import SidebarToggle from '$lib/components/ui/SidebarToggle.svelte';
	import StudyPanel from '$lib/components/panels/StudyPanel.svelte';
	import Footer from '$lib/components/ui/Footer.svelte';
	import BibleRefTooltip from '$lib/components/ui/BibleRefTooltip.svelte';
	import { closePanel, studyPanel } from '$lib/stores/studyPanel';

	let { children } = $props();

	// Restart the page-fade animation on every client navigation by toggling
	// the class off and on, instead of remounting the wrapper subtree via
	// {#key}. This avoids destroying long paragraph lists and the StudyPanel
	// state on every link click.
	let fadeKey = $state(0);
	let contentEl: HTMLElement | undefined = $state();

	const showSidebar = $derived.by(() => {
		const p = page.url.pathname;
		// Sidebar is the catechism's structural TOC. Show only inside the
		// CCC reading surfaces; hide on the index, sommaire, bible, search,
		// about, and the bare home page.
		if (p.startsWith('/cec')) {
			if (p === '/cec' || p === '/cec/') return false;
			if (p.startsWith('/cec/sommaire') || p.startsWith('/cec/panorama')) return false;
			return true;
		}
		// Compendium part reader (not the landing or q-redirect)
		if (p.startsWith('/compendium/')) {
			if (p.startsWith('/compendium/q/')) return false;
			return true;
		}
		// Trent section reader (hide on landing and sommaire)
		if (p.startsWith('/trente/')) {
			if (p.startsWith('/trente/sommaire')) return false;
			return true;
		}
		// Grand Catéchisme chapter reader (hide on landing and sommaire)
		if (p.startsWith('/grand-catechisme/')) {
			if (p.startsWith('/grand-catechisme/sommaire')) return false;
			return true;
		}
		// Petit Catéchisme part reader (hide on landing and sommaire)
		if (p.startsWith('/petit-catechisme/')) {
			if (p.startsWith('/petit-catechisme/sommaire')) return false;
			return true;
		}
		// Catéchisme illustré chapter reader (hide on landing and sommaire)
		if (p.startsWith('/catechisme-illustre/')) {
			if (p.startsWith('/catechisme-illustre/sommaire')) return false;
			return true;
		}
		// Denzinger entry pages (hide on landing and sommaire)
		if (p.startsWith('/denzinger/')) {
			if (p.startsWith('/denzinger/sommaire')) return false;
			return true;
		}
		// Boulanger reader (hide on landing and sommaire)
		if (p.startsWith('/doctrine-catholique/')) {
			if (p.startsWith('/doctrine-catholique/sommaire')) return false;
			return true;
		}
		// Liturgical calendar year/solennites pages (hide on landing)
		if (p.startsWith('/calendrier/')) {
			return true;
		}
		return false;
	});

	// Close the StudyPanel when its context becomes irrelevant: leaving the
	// /cec or /bible reading surfaces, or entering a Bible concordance view
	// (which has its own resizable right pane and shouldn't render two panels).
	afterNavigate(({ from, to }) => {
		if (!from || !to) return;
		const fromPath = from.url.pathname;
		const toPath = to.url.pathname;

		const fromOnCcc = fromPath.startsWith('/cec');
		const toOnCcc = toPath.startsWith('/cec');
		const fromOnBible = fromPath.startsWith('/bible');
		const toOnBible = toPath.startsWith('/bible');
		const fromOnTrent = fromPath.startsWith('/trente');
		const toOnTrent = toPath.startsWith('/trente');
		const fromOnGrandCatechisme = fromPath.startsWith('/grand-catechisme');
		const toOnGrandCatechisme = toPath.startsWith('/grand-catechisme');
		const fromOnPetitCatechisme = fromPath.startsWith('/petit-catechisme');
		const toOnPetitCatechisme = toPath.startsWith('/petit-catechisme');
		const fromOnCalendrier = fromPath.startsWith('/calendrier');
		const toOnCalendrier = toPath.startsWith('/calendrier');
		const toOnConcordance = /\/bible\/[^/]+\/\d+\/concordance/.test(toPath);

		if (
			(fromOnCcc && !toOnCcc) ||
			(fromOnBible && !toOnBible) ||
			(fromOnTrent && !toOnTrent) ||
			(fromOnGrandCatechisme && !toOnGrandCatechisme) ||
			(fromOnPetitCatechisme && !toOnPetitCatechisme) ||
			(fromOnCalendrier && !toOnCalendrier) ||
			toOnConcordance
		) {
			if (get(studyPanel).open) closePanel();
		}

		// Hash anchor scroll: re-run after a layout frame so element positions
		// are settled, using instant so there's no animated slam over a long
		// page. scroll-padding-top on html clears the sticky topbar.
		const hash = to?.url.hash;
		if (hash) {
			const id = hash.slice(1);
			requestAnimationFrame(() => {
				document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
			});
		}

		// Re-trigger the page-fade by re-applying the class. Bump the key so
		// Svelte updates the attribute, then reflow before the keyframe runs.
		fadeKey++;
		if (contentEl) {
			contentEl.classList.remove('page-fade');
			void contentEl.offsetWidth;
			contentEl.classList.add('page-fade');
		}
	});
</script>

<svelte:head>
	<link rel="icon" type="image/x-icon" href="/favicon.ico" />
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="canonical" href="{page.url.origin}{page.url.pathname}" />
	<meta property="og:site_name" content="Catéchisme de l'Église Catholique" />
	<meta property="og:locale" content="fr_FR" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{page.url.origin}{page.url.pathname}" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<a href="#main-content" class="skip-link">Aller au contenu</a>

<TopBar />
<div class="flex">
	{#if showSidebar}
		<Sidebar
			corpus={page.url.pathname.startsWith('/compendium')
				? 'compendium'
				: page.url.pathname.startsWith('/trente')
					? 'trent'
					: page.url.pathname.startsWith('/grand-catechisme')
						? 'pius-x-grand'
						: page.url.pathname.startsWith('/petit-catechisme')
							? 'pius-x-petit'
							: page.url.pathname.startsWith('/catechisme-illustre')
								? 'catechisme-illustre'
								: page.url.pathname.startsWith('/denzinger')
									? 'denzinger'
									: page.url.pathname.startsWith('/doctrine-catholique')
										? 'boulanger'
										: page.url.pathname.startsWith('/doctrine-sociale')
											? 'cdse'
											: page.url.pathname.startsWith('/pgmr')
												? 'pgmr'
												: page.url.pathname.startsWith('/calendrier')
													? 'calendrier'
													: 'ccc'}
		/>
		<SidebarToggle />
	{/if}
	<div
		bind:this={contentEl}
		id="main-content"
		class="flex-1 min-w-0 page-fade"
		data-fade-key={fadeKey}
	>
		{@render children()}
	</div>
	<StudyPanel />
</div>
<Footer />
<BibleRefTooltip />

<style>
	/* Visible only when focused — first-Tab affordance for keyboard / AT users
	   to bypass the topbar on every page (WCAG 2.4.1 Bypass Blocks). */
	.skip-link {
		position: absolute;
		left: 0.5rem;
		top: -3rem;
		z-index: calc(var(--z-modal) + 10);
		padding: 0.55rem 0.95rem;
		background: var(--color-panel);
		color: var(--color-fg);
		border: 1px solid var(--color-accent);
		border-radius: 4px;
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		transition: top 150ms ease;
	}
	.skip-link:focus {
		top: 0.5rem;
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
