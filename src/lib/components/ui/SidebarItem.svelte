<script lang="ts">
	import Self from './SidebarItem.svelte';

	type Item = {
		title: string;
		href: string;
		number?: number;
		typeLabel?: string;
		children?: Item[];
	};
	let {
		item,
		activeHref,
		depth = 0
	}: { item: Item; activeHref: string; depth?: number } = $props();

	function itemMatches(itemHref: string, target: string): boolean {
		// activeHref often carries a scroll-spy heading hash like
		// "/ccc/x/y/chapter#some-heading" while the matching tree entries
		// are stored without the hash. Several match shapes have to work:
		const base = target.replace(/#.*$/, '');
		// (a) exact match, or item is the bare URL parent of a hashed target
		if (itemHref === target || itemHref === base) return true;
		// (b) target lives inside item's scope (item is an ancestor)
		if (itemHref + '#' === target.slice(0, itemHref.length + 1)) return true;
		// (c) hash match across paths: heading entries use article-prefixed
		//     hrefs (chapter/article-1#h) but on the chapter page scroll-spy
		//     produces chapter#h. Match when the hashes agree and the item's
		//     path is a deeper version of the target's path.
		const [iPath, iHash] = itemHref.split('#');
		const [aPath, aHash] = target.split('#');
		if (iHash && aHash && iHash === aHash && iPath !== aPath && iPath.startsWith(aPath)) {
			return true;
		}
		return false;
	}

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
	// /ccc/x/y/chapter/article-1#h-id) but on a chapter page the scroll-spy
	// produces activeHref = /ccc/x/y/chapter#h-id (no article slug). When
	// the hash matches and the item's path is a deeper version of the
	// active path, treat it as the active entry. This is what lets the
	// Roman headings sync as the reader scrolls a chapter page.
	const isHashMatch = $derived.by(() => {
		const [iPath, iHash] = item.href.split('#');
		const [aPath, aHash] = activeHref.split('#');
		if (!iHash || !aHash || iHash !== aHash) return false;
		return iPath !== aPath && iPath.startsWith(aPath);
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
			class="flex-1 py-1 px-1.5 rounded text-[13px] leading-snug hover:bg-accent/10 hover:text-accent"
			class:bg-accent={isActive}
			class:!text-white={isActive}
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
