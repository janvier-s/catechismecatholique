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

	function isAncestorOrSelf(it: Item, target: string): boolean {
		if (it.href === target) return true;
		if (!it.children) return false;
		return it.children.some((c) => isAncestorOrSelf(c, target));
	}

	const isActive = $derived(item.href === activeHref);
	const isAncestor = $derived(
		item.children ? item.children.some((c) => isAncestorOrSelf(c, activeHref)) : false
	);

	let manualExpanded: boolean | null = $state(null);
	const expanded = $derived(manualExpanded ?? isAncestor);
	const hasChildren = $derived(Boolean(item.children && item.children.length > 0));
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
