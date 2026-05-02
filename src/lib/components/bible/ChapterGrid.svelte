<script lang="ts">
	let { bookSlug, chapters }: { bookSlug: string; chapters: number[] } = $props();
</script>

<div class="flex flex-wrap gap-2 font-ui text-sm">
	{#each chapters as ch (ch)}
		<a
			href="/bible/{bookSlug}/{ch}"
			class="px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent"
		>
			{ch}
		</a>
	{/each}
</div>
