<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import { refreshBionic } from '$lib/utils/bionic-dom';
	import { tick } from 'svelte';
	import { get } from 'svelte/store';
	import TopBar from '$lib/components/ui/TopBar.svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import { needsCecStructure } from '$lib/sidebarRoute';
	import SidebarToggle from '$lib/components/ui/SidebarToggle.svelte';
	import SidebarMobileToggle from '$lib/components/ui/SidebarMobileToggle.svelte';
	import StudyPanel from '$lib/components/panels/StudyPanel.svelte';
	import Footer from '$lib/components/ui/Footer.svelte';
	import BibleRefTooltip from '$lib/components/ui/BibleRefTooltip.svelte';
	import BackToBibliotheque from '$lib/components/ui/BackToBibliotheque.svelte';
	import { corpusForPath } from '$lib/corpora';
	import { resolveOgImage } from '$lib/og-image';
	import type { Corpus } from '$lib/data/types';
	import { closePanel, studyPanel } from '$lib/stores/studyPanel';

	let { children, data } = $props();

	// Restart the page-fade animation on every client navigation by toggling
	// the class off and on, instead of remounting the wrapper subtree via
	// {#key}. This avoids destroying long paragraph lists and the StudyPanel
	// state on every link click.
	let fadeKey = $state(0);
	let contentEl: HTMLElement | undefined = $state();

	// Sidebar corpus dispatch · the registry handles 14 of 15 cases;
	// /cec (CCC) and /calendrier-liturgique aren't in the registry (CCC is implicit,
	// calendrier is a feature not a corpus), so they're resolved inline.
	const sidebarCorpus = $derived.by((): Corpus => {
		const p = page.url.pathname;
		const c = corpusForPath(p);
		if (c) return c.id;
		if (p.startsWith('/calendrier-liturgique')) return 'calendrier';
		return 'ccc';
	});

	// og:image inheritance · every page (reader or landing) emits a
	// share-card image inferred from the corpus that owns its path.
	// MetaTags emits its own og:image on landings when used; multiple
	// tags are harmless (crawlers pick · for shared inference both
	// resolve to the same image anyway). See src/lib/og-image.ts.
	const ogImage = $derived.by(() => {
		const r = resolveOgImage(page.url.pathname);
		return { ...r, url: `${page.url.origin}${r.path}` };
	});

	const showSidebar = $derived.by(() => {
		const p = page.url.pathname;
		// Sidebar is the catechism's structural TOC. Show only inside the
		// CCC reading surfaces; hide on the index, sommaire, bible, search,
		// about, and the bare home page.
		// Shared with +layout.ts, which uses the same predicate to decide
		// whether to server-render the tree · they must not disagree.
		if (p.startsWith('/cec')) return needsCecStructure(p);
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
		if (p.startsWith('/enchiridion/')) {
			if (p.startsWith('/enchiridion/sommaire')) return false;
			return true;
		}
		// Boulanger reader (hide on landing and sommaire)
		if (p.startsWith('/doctrine-catholique/')) {
			if (p.startsWith('/doctrine-catholique/sommaire')) return false;
			return true;
		}
		// CDSE landing + chapter reader
		if (p === '/doctrine-sociale' || p === '/doctrine-sociale/') return true;
		if (p.startsWith('/doctrine-sociale/')) {
			return true;
		}
		// PGMR chapter reader (hide on landing)
		if (p.startsWith('/pgmr/')) {
			return true;
		}
		// Vatican II + CIC landings function as catalog pages (the
		// body already lists every doc/code as cards); the sidebar
		// would just duplicate that. Show sidebar only on reader pages.
		if (p.startsWith('/vatican-ii/')) {
			return true;
		}
		if (p.startsWith('/cic/') && !p.startsWith('/cic/c/')) {
			return true;
		}
		// Breviloquium chapter reader (hide on landing)
		if (p.startsWith('/breviloquium/')) {
			return true;
		}
		// Patristic catecheses · single-page reader, sidebar tracks chapters
		// via scroll-spy, so show on the landing too.
		if (p === '/didache' || p === '/discours-catechetique' || p === '/catecheses-mystagogiques') {
			return true;
		}
		// Catéchisme pour Adultes · chapter reader (hide on landing index).
		if (p.startsWith('/catechisme-adultes/')) {
			return true;
		}
		// Liturgical calendar year/solennites listing pages (hide on the
		// landing, and on the per-feast dedicated pages one level deeper -
		// those are lean permalink pages, not a reading surface the sidebar's
		// TOC is useful for).
		if (p.startsWith('/calendrier-liturgique/')) {
			return p.split('/').filter(Boolean).length === 2;
		}
		return false;
	});

	// Close the StudyPanel when its context becomes irrelevant: leaving the
	// /cec or /bible reading surfaces.
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
		const fromOnCalendrier = fromPath.startsWith('/calendrier-liturgique');
		const toOnCalendrier = toPath.startsWith('/calendrier-liturgique');

		if (
			(fromOnCcc && !toOnCcc) ||
			(fromOnBible && !toOnBible) ||
			(fromOnTrent && !toOnTrent) ||
			(fromOnGrandCatechisme && !toOnGrandCatechisme) ||
			(fromOnPetitCatechisme && !toOnPetitCatechisme) ||
			(fromOnCalendrier && !toOnCalendrier)
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

	// Bionic reading runs here, once, over the whole page rather than inside
	// each reader. Two reasons: it has to happen after mount, because Svelte
	// reuses the server's DOM for `{@html}` during hydration and never
	// re-evaluates it (a render-time transform simply never appears on a fresh
	// load); and walking text nodes leaves every corpus's inline markup intact
	// by construction. Re-runs on pref change and after each navigation.
	$effect(() => {
		const enabled = $prefs.bionicReading;
		const fixation = $prefs.bionicFixation;
		const saccade = $prefs.bionicSaccade;
		void page.url.pathname;
		let cancelled = false;
		void tick().then(() => {
			if (cancelled || typeof document === 'undefined') return;
			refreshBionic(document.body, enabled, { fixation, saccade });
		});
		return () => {
			cancelled = true;
		};
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
	<meta property="og:image" content={ogImage.url} />
	<meta property="og:image:width" content={String(ogImage.width)} />
	<meta property="og:image:height" content={String(ogImage.height)} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:image" content={ogImage.url} />
</svelte:head>

<a href="#main-content" class="skip-link">Aller au contenu</a>

<TopBar />
<div class="flex">
	{#if showSidebar}
		<Sidebar
			corpus={sidebarCorpus}
			initialStructure={data.cecStructure}
			initialEnBrefs={data.cecEnBrefs}
		/>
		<SidebarToggle />
		<SidebarMobileToggle />
	{/if}
	<div
		bind:this={contentEl}
		id="main-content"
		class="flex-1 min-w-0 page-fade"
		data-fade-key={fadeKey}
	>
		<BackToBibliotheque />
		{@render children()}
	</div>
	<StudyPanel />
</div>
<Footer />
<BibleRefTooltip />

<style>
	/* Visible only when focused · first-Tab affordance for keyboard / AT users
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
