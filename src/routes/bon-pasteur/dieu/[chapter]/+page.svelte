<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import SidebarItem from '$lib/components/ui/SidebarItem.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const ch = $derived(data.chapter);

	// ── Sidebar heading tree ─────────────────────────────────────────────
	type H2Group = { anchor: string; title: string; children: { anchor: string; title: string }[] };

	const h2Groups = $derived.by((): H2Group[] => {
		const groups: H2Group[] = [];
		let cur: H2Group | null = null;
		for (const b of ch.blocks) {
			if (b.kind !== 'heading') continue;
			if (b.level === 2) {
				cur = { anchor: b.anchor, title: b.title, children: [] };
				groups.push(cur);
			} else if (b.level === 3 && cur) {
				cur.children.push({ anchor: b.anchor, title: b.title });
			}
		}
		return groups;
	});

	// ── SidebarItem tree ─────────────────────────────────────────────────
	type Item = {
		title: string;
		href: string;
		kicker?: string;
		children?: Item[];
		defaultExpanded?: boolean;
	};

	const tree = $derived.by((): Item[] => {
		const slug = ch.slug;
		const headingItems: Item[] = h2Groups.map((g) => ({
			title: g.title,
			href: `/bon-pasteur/dieu/${slug}#${g.anchor}`,
			children:
				g.children.length > 0
					? g.children.map((s) => ({
							title: s.title,
							href: `/bon-pasteur/dieu/${slug}#${s.anchor}`
						}))
					: undefined
		}));
		return data.chapters.map((c) => ({
			title: c.title,
			kicker: `Chapitre ${c.n}`,
			href: `/bon-pasteur/dieu/${c.slug}`,
			children: c.slug === slug && headingItems.length > 0 ? headingItems : undefined
		}));
	});

	// ── Scroll sync ──────────────────────────────────────────────────────
	let activeAnchor = $state('');

	$effect(() => {
		void ch.slug;
		const first = document.querySelector<HTMLElement>('.dieu-body h2[id]');
		activeAnchor = first?.id ?? '';
	});

	$effect(() => {
		const onScroll = () => {
			const headings = Array.from(
				document.querySelectorAll<HTMLElement>('.dieu-body h2[id], .dieu-body h3[id]')
			);
			const threshold = window.innerHeight * 0.3;
			let current = '';
			for (const h of headings) {
				if (h.getBoundingClientRect().top <= threshold) current = h.id;
			}
			if (current) activeAnchor = current;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	const activeHref = $derived(
		`/bon-pasteur/dieu/${ch.slug}${activeAnchor ? '#' + activeAnchor : ''}`
	);
</script>

<svelte:head>
	<title>{ch.title} · Dieu · Institut du Bon Pasteur</title>
	<meta
		name="description"
		content="Chapitre {ch.n} : {ch.title} — cours de catéchèse de l'Institut du Bon Pasteur."
	/>
</svelte:head>

<div class="dieu-layout">
	<!-- ── Sidebar ───────────────────────────────────────────────────────── -->
	<aside
		class="dieu-sidebar-rail hidden lg:flex sticky top-[80px] h-[calc(100vh-80px)] bg-panel border-r border-border z-20 flex-none flex-col"
		aria-label="Plan du cours Dieu"
	>
		<!-- Header -->
		<div class="flex items-center p-2 border-b border-border">
			<span class="font-ui text-xs uppercase tracking-wider text-muted ml-2">Sommaire</span>
		</div>
		<!-- Nav -->
		<nav
			class="flex-1 overflow-y-auto p-3 font-ui styled-scroll styled-scroll-accent"
			aria-label="Chapitres"
			style="scrollbar-gutter: stable;"
		>
			<ul class="space-y-0.5">
				{#each tree as item (item.href)}
					<SidebarItem {item} {activeHref} />
				{/each}
			</ul>
		</nav>
	</aside>

	<!-- ── Content ───────────────────────────────────────────────────────── -->
	<div class="dieu-outer">
		<div class="back-row">
			<a class="back-to-biblio" href="/bibliotheque#shelf-I">
				<span class="back-arrow" aria-hidden="true">←</span>
				Retour à la Bibliothèque
			</a>
		</div>
		<div class="dieu-main">
			<div class="dieu-content">
				<header class="head">
					<BreadcrumbRail
						crumbs={[
							{ href: '/bon-pasteur', title: 'Institut du Bon Pasteur' },
							{ href: `/bon-pasteur/dieu/${ch.slug}`, kicker: `Ch. ${ch.n}`, title: ch.title }
						]}
					/>
					<p class="kicker">Chapitre {ch.n}</p>
					<h1 class="title">{ch.title}</h1>
				</header>

				<article class="dieu-body reader-prose">
					{#each ch.blocks as block, i (i)}
						{#if block.kind === 'heading'}
							{#if block.level === 2}
								<h2 class="section-heading" id={block.anchor}>{block.title}</h2>
							{:else}
								<h3 class="sub-heading" id={block.anchor}>{block.title}</h3>
							{/if}
						{:else if block.kind === 'definition'}
							<div class="definition" class:def-long={block.term.length > 10}>
								<span class="definition-term">{block.term}</span>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								<div class="definition-body">{@html block.html}</div>
							</div>
						{:else if block.kind === 'image'}
							<figure class="illus">
								<img src={block.src} alt={block.alt} loading="lazy" />
							</figure>
						{:else}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<div class="prose-block">{@html block.html}</div>
						{/if}
					{/each}
				</article>

				<nav class="pager" aria-label="Navigation entre chapitres">
					{#if data.prev}
						<NavCard
							href="/bon-pasteur/dieu/{data.prev.slug}"
							eyebrow="Ch. {data.prev.n}"
							title={data.prev.title}
							direction="prev"
						/>
					{:else}
						<span></span>
					{/if}
					{#if data.next}
						<NavCard
							href="/bon-pasteur/dieu/{data.next.slug}"
							eyebrow="Ch. {data.next.n}"
							title={data.next.title}
							direction="next"
						/>
					{:else}
						<span></span>
					{/if}
				</nav>
			</div>
		</div>
	</div>
</div>

<style>
	/* ── Back link ─────────────────────────────────────────────────────── */
	.back-row {
		padding: 0.85rem clamp(1rem, 4vw, 2.5rem) 0;
	}

	.back-to-biblio {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		padding: 0.25rem 0;
		transition: color 140ms ease;
	}

	.back-to-biblio:hover {
		color: var(--color-fg);
	}

	.back-arrow {
		display: inline-block;
		line-height: 1;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.back-to-biblio:hover .back-arrow {
		transform: translateX(-3px);
	}

	/* ── Layout ────────────────────────────────────────────────────────── */
	.dieu-layout {
		display: flex;
		min-height: calc(100vh - 80px);
	}

	.dieu-sidebar-rail {
		width: 320px;
		overflow: hidden;
	}

	.dieu-outer {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.dieu-main {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.dieu-content {
		width: 100%;
		max-width: 760px;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem) 4rem;
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	/* ── Header ────────────────────────────────────────────────────────── */
	.head {
		margin-bottom: 2.5rem;
	}

	.kicker {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 1.25rem 0 0.5rem;
	}

	.title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: clamp(1.9rem, 4.5vw, 2.9rem);
		font-weight: 700;
		line-height: 1.1;
		margin: 0;
	}

	/* ── Body ──────────────────────────────────────────────────────────── */
	.dieu-body {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.6);
	}

	.section-heading {
		font-family: var(--font-heading);
		font-size: clamp(1.45rem, 2.4vw, 1.7rem);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.005em;
		margin: 3rem 0 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
		scroll-margin-top: 80px;
		text-wrap: balance;
	}

	.sub-heading {
		font-family: var(--font-heading);
		font-size: 1.3rem;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.003em;
		margin: 2.5rem 0 0.9rem;
		scroll-margin-top: 80px;
		text-wrap: balance;
	}

	.sub-heading::before {
		content: '';
		display: block;
		width: 2.5rem;
		height: 2px;
		background: var(--color-accent);
		opacity: 0.55;
		margin-bottom: 0.65rem;
	}

	.prose-block :global(p) {
		margin: 0 0 0.8rem;
	}

	.prose-block :global(p:last-child) {
		margin-bottom: 0;
	}

	.prose-block {
		margin: 0.8rem 0;
	}

	.prose-block :global(ul) {
		list-style: disc;
		margin: 0.5rem 0 0.5rem 1.5rem;
		padding: 0;
	}

	.prose-block :global(li) {
		margin-bottom: 0.35rem;
	}

	/* ── Definition ────────────────────────────────────────────────────── */
	.definition {
		display: grid;
		grid-template-columns: 7.5rem 1fr;
		gap: 0 0.5rem;
		align-items: baseline;
		margin: 0.5rem 0;
		font-size: 0.92rem;
		line-height: 1.55;
	}

	.definition.def-long {
		grid-template-columns: 14rem 1fr;
	}

	.definition-term {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 600;
		color: var(--color-fg);
	}

	.definition-term::after {
		content: '\00a0:';
		font-style: normal;
		font-weight: 400;
		color: var(--color-muted);
	}

	.definition-body {
		color: var(--color-subtle);
		flex: 1;
	}

	.definition-body :global(p) {
		margin: 0;
	}

	@media (max-width: 480px) {
		.definition {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}
	}

	/* ── Illustrations ─────────────────────────────────────────────────── */
	.illus {
		margin: 2rem auto;
		text-align: center;
	}

	.illus img {
		max-width: min(480px, 100%);
		height: auto;
		border-radius: 2px;
		display: inline-block;
	}

	@media print {
		.illus {
			break-inside: avoid;
		}
	}

	/* ── Pager ─────────────────────────────────────────────────────────── */
	.pager {
		display: flex;
		gap: 1rem;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 14%, transparent);
	}

	.pager > * {
		flex: 1;
		min-width: 0;
	}
</style>
