<script lang="ts">
	import { page } from '$app/state';
	import Self from './SidebarItem.svelte';

	type Item = {
		title: string;
		href: string;
		number?: number;
		typeLabel?: string;
		children?: Item[];
	};
	let { item, depth = 0 }: { item: Item; depth?: number } = $props();

	function isAncestorOrSelf(it: Item, path: string): boolean {
		if (it.href === path) return true;
		if (!it.children) return false;
		return it.children.some((c) => isAncestorOrSelf(c, path));
	}

	const isActive = $derived(page.url.pathname === item.href);
	const isAncestor = $derived(
		item.children ? item.children.some((c) => isAncestorOrSelf(c, page.url.pathname)) : false
	);

	// Manual override: null means "follow isAncestor", true/false means user toggled
	let manualExpanded: boolean | null = $state(null);
	const expanded = $derived(manualExpanded ?? isAncestor);
</script>

<li>
	<div class="flex items-center gap-1">
		{#if item.children && item.children.length > 0}
			<button
				type="button"
				onclick={() => (manualExpanded = !expanded)}
				class="w-5 h-5 flex items-center justify-center text-muted hover:text-accent text-xs flex-none"
				aria-label={expanded ? 'Réduire' : 'Développer'}
				aria-expanded={expanded}
			>
				{expanded ? '▾' : '▸'}
			</button>
		{:else}
			<span class="w-5 flex-none" aria-hidden="true"></span>
		{/if}
		<a
			href={item.href}
			class="flex-1 py-1 px-2 rounded text-sm leading-snug hover:bg-accent/10 hover:text-accent"
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
				<Self item={child} depth={depth + 1} />
			{/each}
		</ul>
	{/if}
</li>
