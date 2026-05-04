<script lang="ts">
	let {
		direction,
		double = true
	}: {
		direction: 'prev' | 'next';
		/** true = double chevron (book jump «»), false = single chevron (chapter step ‹›) */
		double?: boolean;
	} = $props();
</script>

<svg
	width="15"
	height="15"
	viewBox="0 0 15 15"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if direction === 'prev'}
		{#if double}
			<polyline points="11,2.5 7,7.5 11,12.5" />
			<polyline points="6.5,2.5 2.5,7.5 6.5,12.5" />
		{:else}
			<polyline points="9.5,2.5 4.5,7.5 9.5,12.5" />
		{/if}
	{:else if double}
		<polyline points="4,2.5 8,7.5 4,12.5" />
		<polyline points="8.5,2.5 12.5,7.5 8.5,12.5" />
	{:else}
		<polyline points="5.5,2.5 10.5,7.5 5.5,12.5" />
	{/if}
</svg>
