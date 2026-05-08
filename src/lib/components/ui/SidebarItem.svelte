<script lang="ts">
	import Self from './SidebarItem.svelte';
	import { itemMatches } from './sidebarMatch';

	type Item = {
		title: string;
		href: string;
		number?: number;
		typeLabel?: string;
		/** Heading level for compendium entries (2, 3, 4). Drives per-row styling. */
		level?: 2 | 3 | 4;
		children?: Item[];
	};
	let {
		item,
		activeHref,
		depth = 0
	}: { item: Item; activeHref: string; depth?: number } = $props();

	function isAncestorOrSelf(it: Item, target: string): boolean {
		if (itemMatches(it.href, target)) return true;
		if (!it.children) return false;
		return it.children.some((c) => isAncestorOrSelf(c, target));
	}

	const isAncestor = $derived(
		item.children ? item.children.some((c) => isAncestorOrSelf(c, activeHref)) : false
	);
	// Activehref may carry a heading hash; the bare-URL parent (e.g. an
	// article entry) won't equal it but is still the visible context.
	const isActiveBase = $derived(activeHref.startsWith(item.href + '#'));
	// Heading entries in the sidebar use article-prefixed hrefs (e.g.
	// /cec/x/y/chapter/article-1#h-id) but on a chapter page the scroll-spy
	// produces activeHref = /cec/x/y/chapter#h-id (no article slug). When
	// the hash matches and the item's path is a deeper version of the
	// active path, treat it as the active entry. This is what lets the
	// Roman headings sync as the reader scrolls a chapter page.
	const isHashMatch = $derived.by(() => {
		const iIdx = item.href.indexOf('#');
		const aIdx = activeHref.indexOf('#');
		if (iIdx < 0 || aIdx < 0) return false;
		const iHash = item.href.slice(iIdx + 1);
		const aHash = activeHref.slice(aIdx + 1);
		if (iHash !== aHash) return false;
		const iPath = item.href.slice(0, iIdx);
		const aPath = activeHref.slice(0, aIdx);
		if (iPath === aPath) return false; // already covered by exact match
		return iPath.startsWith(aPath) || aPath.startsWith(iPath);
	});
	// Highlight the deepest entry whose href is a prefix of activeHref. An
	// exact match wins; otherwise this entry only highlights when none of
	// its descendants match (i.e. the active path lives inside this entry's
	// scope but no deeper item claims it).
	const isPrefixMatch = $derived(
		activeHref === item.href ||
			activeHref.startsWith(item.href + '#') ||
			activeHref.startsWith(item.href + '/')
	);
	const isActive = $derived((isPrefixMatch || isHashMatch) && !isAncestor);

	let manualExpanded: boolean | null = $state(null);
	const hasChildren = $derived(Boolean(item.children && item.children.length > 0));
	// Auto-expand wins when the item or one of its descendants is the active
	// route. Manual toggles only apply outside of that. Without this, a
	// previously-collapsed-then-revisited entry stayed collapsed even when
	// the URL navigated INTO it (e.g. clicking "Suivant" between articles).
	const onActivePath = $derived(isActive || isAncestor || isActiveBase);
	const expanded = $derived(onActivePath ? true : (manualExpanded ?? false));
</script>

<li>
	<div class="flex items-start gap-1 group">
		{#if hasChildren}
			<button
				type="button"
				onclick={() => (manualExpanded = !expanded)}
				class="w-4 h-5 flex items-center justify-center text-muted hover:text-accent text-[10px] flex-none mt-0.5"
				aria-label={expanded ? 'Réduire' : 'Développer'}
				aria-expanded={expanded}
			>
				{expanded ? '▼' : '▶'}
			</button>
		{:else}
			<span class="w-4 flex-none" aria-hidden="true"></span>
		{/if}
		<a
			href={item.href}
			class="flex-1 py-1 px-1.5 rounded leading-snug hover:bg-accent/10 hover:text-accent"
			class:is-active={isActive}
			class:lvl-2={item.level === 2}
			class:lvl-3={item.level === 3}
			class:lvl-4={item.level === 4}
			class:lvl-default={item.level === undefined}
		>
			{#if item.typeLabel}
				<span class="font-semibold">
					{item.typeLabel}
					{item.number ?? ''} :
				</span>
			{/if}
			{item.title}
		</a>
	</div>
	{#if item.children && expanded}
		<ul class="ml-3">
			{#each item.children as child (child.href)}
				<Self item={child} {activeHref} depth={depth + 1} />
			{/each}
		</ul>
	{/if}
</li>

<style>
	/* Default size for entries that don't carry a Compendium heading level
	   (CCC sidebar items, parts/sections by typeLabel). */
	.lvl-default {
		font-size: 13px;
	}
	/* Compendium heading levels — each step down the hierarchy reads as
	   smaller / lighter so the eye can scan a deep tree at a glance. */
	.lvl-2 {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-fg);
	}
	.lvl-3 {
		font-size: 12.5px;
		font-weight: 500;
		color: var(--color-fg);
	}
	.lvl-4 {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-subtle);
	}
	/* Slightly darker than the bare accent so white text clears WCAG AA
	   (4.5:1) — the raw accent in dark/oled themes is too light for white
	   foreground (Lighthouse measured 4.14:1). */
	.is-active {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
		color: #fff !important;
	}
	.is-active:hover {
		color: #fff !important;
	}
</style>
