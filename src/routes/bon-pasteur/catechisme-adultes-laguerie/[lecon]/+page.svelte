<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import SidebarItem from '$lib/components/ui/SidebarItem.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const lesson = $derived(data.lesson);

	// ── Sidebar heading tree ─────────────────────────────────────────────
	type H2Group = { anchor: string; title: string; children: { anchor: string; title: string }[] };

	const h2Groups = $derived.by((): H2Group[] => {
		const groups: H2Group[] = [];
		let cur: H2Group | null = null;
		for (const b of lesson.blocks) {
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

	type Item = {
		title: string;
		href: string;
		kicker?: string;
		children?: Item[];
		defaultExpanded?: boolean;
		disabled?: boolean;
	};

	const tree = $derived.by((): Item[] => {
		const slug = lesson.slug;
		const headingItems: Item[] = h2Groups.map((g) => ({
			title: g.title,
			href: `/bon-pasteur/catechisme-adultes-laguerie/${slug}#${g.anchor}`,
			children:
				g.children.length > 0
					? g.children.map((s) => ({
							title: s.title,
							href: `/bon-pasteur/catechisme-adultes-laguerie/${slug}#${s.anchor}`
						}))
					: undefined
		}));
		return data.lessons.map((l) => ({
			title: l.title,
			kicker: `Leçon ${l.n}`,
			href: `/bon-pasteur/catechisme-adultes-laguerie/${l.slug}`,
			disabled: !l.available,
			children: l.slug === slug && headingItems.length > 0 ? headingItems : undefined
		}));
	});

	// ── Scroll sync ──────────────────────────────────────────────────────
	let activeAnchor = $state('');

	$effect(() => {
		void lesson.slug;
		const first = document.querySelector<HTMLElement>('.cca-body h2[id]');
		activeAnchor = first?.id ?? '';
	});

	$effect(() => {
		const onScroll = () => {
			const headings = Array.from(
				document.querySelectorAll<HTMLElement>('.cca-body h2[id], .cca-body h3[id]')
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
		`/bon-pasteur/catechisme-adultes-laguerie/${lesson.slug}${activeAnchor ? '#' + activeAnchor : ''}`
	);
</script>

<svelte:head>
	<title>{lesson.title} · Cours de catéchisme pour adultes · Institut du Bon Pasteur</title>
	<meta
		name="description"
		content="Leçon {lesson.n} : {lesson.title}. Cours de catéchisme pour adultes du Séminaire Saint-Vincent de Courtalin (Institut du Bon Pasteur)."
	/>
</svelte:head>

<div class="cca-layout">
	<aside
		class="cca-sidebar-rail hidden lg:flex sticky top-[80px] h-[calc(100vh-80px)] bg-panel border-r border-border z-20 flex-none flex-col"
		aria-label="Plan du cours de catéchisme pour adultes"
	>
		<div class="flex items-center p-2 border-b border-border">
			<span class="font-ui text-xs uppercase tracking-wider text-muted ml-2">Sommaire</span>
		</div>
		<nav
			class="flex-1 overflow-y-auto p-3 font-ui styled-scroll styled-scroll-accent"
			aria-label="Leçons"
			style="scrollbar-gutter: stable;"
		>
			<ul class="space-y-0.5">
				{#each tree as item (item.href)}
					<SidebarItem {item} {activeHref} />
				{/each}
			</ul>
		</nav>
	</aside>

	<div class="cca-outer">
		<div class="cca-back-row">
			<a class="cca-back-link" href="/bon-pasteur">
				<span class="arrow" aria-hidden="true">←</span>
				Retour à l'Institut du Bon Pasteur
			</a>
		</div>
		<div class="cca-main">
			<div class="cca-content">
				<header class="head">
					<BreadcrumbRail
						crumbs={[
							{ href: '/bon-pasteur', title: 'Institut du Bon Pasteur' },
							{
								href: `/bon-pasteur/catechisme-adultes-laguerie/${lesson.slug}`,
								kicker: `Leçon ${lesson.n}`,
								title: lesson.title
							}
						]}
					/>
					<p class="kicker">Leçon {lesson.n}</p>
					<h1 class="title">{lesson.title}</h1>
				</header>

				<article class="cca-body reader-prose">
					{#each lesson.blocks as block, i (i)}
						{#if block.kind === 'heading'}
							{#if block.level === 2}
								<h2 class="section-heading" id={block.anchor}>{block.title}</h2>
							{:else}
								<h3 class="sub-heading" id={block.anchor}>{block.title}</h3>
							{/if}
						{:else if block.kind === 'definition'}
							<div class="definition">
								<span class="definition-term">{block.term}</span>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								<div class="definition-body">{@html block.html}</div>
							</div>
						{:else if block.kind === 'quote'}
							<blockquote class="cca-quote">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								<div class="cca-quote-body">{@html block.html}</div>
								{#if block.attribution}
									<cite class="cca-quote-attr">{block.attribution}</cite>
								{/if}
							</blockquote>
						{:else}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<div class="prose-block">{@html block.html}</div>
						{/if}
					{/each}
				</article>

				<nav class="pager" aria-label="Navigation entre leçons">
					{#if data.prev}
						<NavCard
							href="/bon-pasteur/catechisme-adultes-laguerie/{data.prev.slug}"
							eyebrow="Leçon {data.prev.n}"
							title={data.prev.title}
							direction="prev"
						/>
					{:else}
						<span></span>
					{/if}
					{#if data.next}
						<NavCard
							href="/bon-pasteur/catechisme-adultes-laguerie/{data.next.slug}"
							eyebrow="Leçon {data.next.n}"
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
	.cca-layout {
		display: flex;
		min-height: calc(100vh - 80px);
	}

	.cca-sidebar-rail {
		width: 320px;
		overflow: hidden;
	}

	.cca-outer {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.cca-back-row {
		padding: 0.85rem clamp(1rem, 4vw, 2.5rem) 0;
	}

	.cca-back-link {
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

	.cca-back-link:hover {
		color: var(--color-fg);
	}

	.cca-back-link .arrow {
		display: inline-block;
		line-height: 1;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.cca-back-link:hover .arrow {
		transform: translateX(-3px);
	}

	.cca-main {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.cca-content {
		width: 100%;
		max-width: 760px;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem) 4rem;
		color: var(--color-fg);
		font-family: var(--font-body);
	}

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

	.cca-body {
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

	.prose-block {
		margin: 0.8rem 0;
	}

	.prose-block :global(p) {
		margin: 0 0 0.8rem;
	}

	.prose-block :global(p:last-child) {
		margin-bottom: 0;
	}

	.prose-block :global(ul) {
		list-style: disc;
		margin: 0.5rem 0 0.5rem 1.5rem;
		padding: 0;
	}

	.prose-block :global(li) {
		margin-bottom: 0.35rem;
	}

	.definition {
		margin: 1rem 0;
	}

	.definition-term {
		display: block;
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
		margin: 0 0 0.4rem;
	}

	.definition-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.cca-quote {
		margin: 1.5rem 0;
		padding: 0.6rem 0 0.6rem 1.1rem;
		border-left: 3px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
		font-style: italic;
		color: var(--color-subtle);
	}

	.cca-quote-body :global(p) {
		margin: 0 0 0.5rem;
	}

	.cca-quote-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.cca-quote-attr {
		display: block;
		margin-top: 0.45rem;
		font-style: normal;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--color-muted);
	}

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
