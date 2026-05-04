<script lang="ts">
	import type { CccRange } from '$lib/data/types';

	let { range }: { range: CccRange } = $props();

	const label = $derived(range.from === range.to ? `§${range.from}` : `§${range.from}-${range.to}`);
	const href = $derived(
		range.from === range.to ? `/ccc/${range.from}` : `/ccc/${range.from}-${range.to}`
	);
</script>

<a
	{href}
	class="font-ui text-[11px] text-accent border border-accent/30 rounded-[3px] px-[6px] py-[1px] hover:bg-accent/10 transition-colors whitespace-nowrap"
>
	{label}
</a>
