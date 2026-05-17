<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import SidebarItem from '$lib/components/ui/SidebarItem.svelte';
	import type { PageData } from './$types';
	import type { LiturgieBlock } from '$lib/data/types';

	let { data }: { data: PageData } = $props();
	const ch = $derived(data.chapter);

	// ── Block grouping ───────────────────────────────────────────────────
	// Callout sections ("À retenir") wrap blocks from the callout-heading
	// until the next h2 into a styled aside. We pre-group so the template
	// can emit the wrapping element cleanly.
	type NormalGroup = { kind: 'normal'; blocks: LiturgieBlock[] };
	type CalloutGroup = { kind: 'callout'; title: string; anchor: string; blocks: LiturgieBlock[] };
	type RenderGroup = NormalGroup | CalloutGroup;

	const renderGroups = $derived.by((): RenderGroup[] => {
		const groups: RenderGroup[] = [];
		let cur: RenderGroup = { kind: 'normal', blocks: [] };
		groups.push(cur);
		for (const b of ch.blocks) {
			if (b.kind === 'callout-heading') {
				cur = { kind: 'callout', title: b.title, anchor: b.anchor, blocks: [] };
				groups.push(cur);
			} else if (b.kind === 'heading' && b.level === 2 && cur.kind === 'callout') {
				cur = { kind: 'normal', blocks: [b] };
				groups.push(cur);
			} else {
				cur.blocks.push(b);
			}
		}
		return groups;
	});

	// ── Sidebar heading tree ─────────────────────────────────────────────
	type H2Group = { anchor: string; title: string; children: { anchor: string; title: string }[] };

	const h2Groups = $derived.by((): H2Group[] => {
		const groups: H2Group[] = [];
		let cur: H2Group | null = null;
		for (const b of ch.blocks) {
			if (b.kind === 'callout-heading') {
				cur = { anchor: b.anchor, title: b.title, children: [] };
				groups.push(cur);
			} else if (b.kind === 'heading') {
				if (b.level === 2) {
					cur = { anchor: b.anchor, title: b.title, children: [] };
					groups.push(cur);
				} else if (b.level === 3 && cur) {
					cur.children.push({ anchor: b.anchor, title: b.title });
				}
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
			href: `/bon-pasteur/liturgie/${slug}#${g.anchor}`,
			children:
				g.children.length > 0
					? g.children.map((s) => ({
							title: s.title,
							href: `/bon-pasteur/liturgie/${slug}#${s.anchor}`
						}))
					: undefined
		}));
		return data.chapters.map((c) => ({
			title: c.title,
			kicker: `Chapitre ${c.n}`,
			href: `/bon-pasteur/liturgie/${c.slug}`,
			children: c.slug === slug && headingItems.length > 0 ? headingItems : undefined
		}));
	});

	// ── Scroll sync ──────────────────────────────────────────────────────
	let activeAnchor = $state('');

	$effect(() => {
		void ch.slug;
		const first = document.querySelector<HTMLElement>('.liturgie-body h2[id]');
		activeAnchor = first?.id ?? '';
	});

	$effect(() => {
		const onScroll = () => {
			const headings = Array.from(
				document.querySelectorAll<HTMLElement>('.liturgie-body h2[id], .liturgie-body h3[id]')
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
		`/bon-pasteur/liturgie/${ch.slug}${activeAnchor ? '#' + activeAnchor : ''}`
	);
</script>

<svelte:head>
	<title>{ch.title} · La Liturgie · Institut du Bon Pasteur</title>
	<meta
		name="description"
		content="Chapitre {ch.n} : {ch.title} — cours de catéchèse de l'Institut du Bon Pasteur."
	/>
</svelte:head>

<div class="liturgie-layout">
	<!-- ── Sidebar ───────────────────────────────────────────────────────── -->
	<aside
		class="liturgie-sidebar-rail hidden lg:flex sticky top-[80px] h-[calc(100vh-80px)] bg-panel border-r border-border z-20 flex-none flex-col"
		aria-label="Plan du cours Liturgie"
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
	<div class="liturgie-outer">
		<div class="back-row">
			<a class="back-to-biblio" href="/bibliotheque#shelf-I">
				<span class="back-arrow" aria-hidden="true">←</span>
				Retour à la Bibliothèque
			</a>
		</div>
		<div class="liturgie-main">
			<div class="liturgie-content">
				<header class="head">
					<BreadcrumbRail
						crumbs={[
							{ href: '/bon-pasteur', title: 'Institut du Bon Pasteur' },
							{ href: `/bon-pasteur/liturgie/${ch.slug}`, kicker: `Ch. ${ch.n}`, title: ch.title }
						]}
					/>
					<p class="kicker">Chapitre {ch.n}</p>
					<h1 class="title">{ch.title}</h1>
				</header>

				{#snippet blockView(block: import('$lib/data/types').LiturgieBlock)}
					{#if block.kind === 'heading'}
						{#if block.level === 2}
							<h2 class="section-heading" id={block.anchor}>{block.title}</h2>
						{:else if block.level === 3}
							<h3 class="sub-heading" id={block.anchor}>{block.title}</h3>
						{:else}
							<h4 class="sub-sub-heading">{block.title}</h4>
						{/if}
					{:else if block.kind === 'quote'}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<blockquote class="liturgie-quote">{@html block.html}</blockquote>
					{:else if block.kind === 'definition'}
						<div class="definition">
							<span class="definition-term">{block.term}</span>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<div class="definition-body">{@html block.html}</div>
						</div>
					{:else if block.kind === 'image'}
						<figure class="illus">
							<img src={block.src} alt={block.alt} loading="lazy" />
						</figure>
					{:else if block.kind === 'paragraph'}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<div class="prose-block">{@html block.html}</div>
					{/if}
				{/snippet}

				<article class="liturgie-body reader-prose">
					{#each renderGroups as group, gi (gi)}
						{#if group.kind === 'callout'}
							<aside class="a-retenir" id={group.anchor}>
								<p class="a-retenir-label">{group.title}</p>
								{#each group.blocks as block, i (i)}
									{@render blockView(block)}
								{/each}
							</aside>
						{:else}
							{#each group.blocks as block, i (i)}
								{@render blockView(block)}
							{/each}
						{/if}
					{/each}
				</article>

				<nav class="pager" aria-label="Navigation entre chapitres">
					{#if data.prev}
						<NavCard
							href="/bon-pasteur/liturgie/{data.prev.slug}"
							eyebrow="Ch. {data.prev.n}"
							title={data.prev.title}
							direction="prev"
						/>
					{:else}
						<span></span>
					{/if}
					{#if data.next}
						<NavCard
							href="/bon-pasteur/liturgie/{data.next.slug}"
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
	.liturgie-layout {
		display: flex;
		min-height: calc(100vh - 80px);
	}

	.liturgie-sidebar-rail {
		width: 320px;
		overflow: hidden;
	}

	.liturgie-outer {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.liturgie-main {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.liturgie-content {
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
	.liturgie-body {
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

	.sub-sub-heading {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1.3;
		letter-spacing: 0.01em;
		margin: 1.75rem 0 0.5rem;
		color: var(--color-fg);
	}

	/* ── Quote ─────────────────────────────────────────────────────────── */
	.liturgie-quote {
		margin: 1.5rem 0;
		padding: 0.75rem 1.25rem;
		border-left: 3px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
		font-style: italic;
		color: var(--color-subtle);
		font-size: 0.97rem;
		line-height: 1.65;
	}

	.liturgie-quote :global(p) {
		margin: 0;
	}

	/* ── À retenir callout ──────────────────────────────────────────────── */
	.a-retenir {
		margin: 2.5rem 0 1.5rem;
		padding: 1.25rem 1.5rem 1.25rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-accent) 6%, var(--color-panel, transparent));
		border: 1px solid color-mix(in srgb, var(--color-accent) 20%, transparent);
	}

	.a-retenir-label {
		font-family: var(--font-ui);
		font-size: 0.67rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 1rem;
	}

	.a-retenir :global(.section-heading) {
		margin-top: 1.25rem;
		border-bottom-color: color-mix(in srgb, var(--color-accent) 15%, transparent);
	}

	.a-retenir :global(.sub-heading) {
		margin-top: 1rem;
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
		margin: 1rem 0;
	}

	.definition-term {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin-bottom: 0.35rem;
	}

	.definition-body {
		font-size: 0.92rem;
		line-height: 1.55;
		color: var(--color-subtle);
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
		padding-left: 0.85rem;
	}

	.definition-body :global(p) {
		margin: 0;
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
